// 1フレームの描画。シムの状態を読み、補間して描くだけ（シムを import しない）。
// M1a：主人公は剛体スキンのトゥーン＋輪郭。床はまだ灰色の仮表示（1m格子）で、地形の材質・空・霧・紙墨パスは M1b。
/** @import {Cfg} from '../config/index.js' */
import { Color, Mesh, PlaneGeometry, Scene, ShaderMaterial } from 'three';
import { DEFAULT_CHAR_ID, characters } from '../data/characters.js';
import { faces } from '../data/rigs/faces.js';
import { createPlayerView } from './actors/playerView.js';
import { createCameraView } from './cameraView.js';
import { createOutlineShared } from './materials/outline.js';
import { createToonShared } from './materials/toon.js';
import { createFaceAtlas } from './rig/face.js';
import { mainLightDir } from './stage/light.js';

const GRID_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// 格子の線は画面上の太さ（px）で描き、遠くで細かくなりすぎたら床の色へ溶かす（ちらつき防止）
const GRID_FRAG = /* glsl */ `
uniform vec3 uFloor;
uniform vec3 uGrid;
uniform float uStepM;
uniform float uLinePx;
varying vec3 vWorld;
void main() {
  vec2 g = vWorld.xz / uStepM;
  vec2 fw = max(fwidth(g), vec2(1e-6));
  vec2 d = abs(fract(g - 0.5) - 0.5) / fw;
  float line = 1.0 - clamp(min(d.x, d.y) - (uLinePx * 0.5 - 0.5), 0.0, 1.0);
  float dense = max(fw.x, fw.y);
  float fade = 1.0 - clamp((dense - 0.12) / 0.38, 0.0, 1.0);
  gl_FragColor = vec4(mix(uFloor, uGrid, line * fade), 1.0);
  #include <colorspace_fragment>
}`;

/**
 * @param {ReturnType<typeof import('./renderer.js').createRenderer>} renderer
 * @param {Cfg} cfg
 * @param {Document} doc 顔アトラスの Canvas を作る
 */
export function createFrame(renderer, cfg, doc) {
  const scene = new Scene();
  const cameraView = createCameraView(cfg);
  const bg = new Color(cfg.debug.grayBgColor);
  scene.background = bg;

  const toonShared = createToonShared(cfg);
  const outlineShared = createOutlineShared(cfg);
  const faceAtlas = createFaceAtlas(doc, cfg, faces);
  const floorMat = new ShaderMaterial({
    vertexShader: GRID_VERT,
    fragmentShader: GRID_FRAG,
    uniforms: {
      uFloor: { value: new Color(cfg.debug.grayFloorColor) },
      uGrid: { value: new Color(cfg.debug.grayGridColor) },
      uStepM: { value: cfg.debug.grayGridStepM },
      uLinePx: { value: cfg.debug.grayGridLinePx },
    },
  });
  /** @type {any} */
  let floor = null;
  /** @type {ReturnType<typeof createPlayerView>|null} */
  let player = null;

  /** @param {string} charId @param {number} seed */
  function makePlayer(charId, seed) {
    const look = characters[charId] ?? characters[DEFAULT_CHAR_ID];
    return createPlayerView(look, { cfg, toonShared, outlineShared, faceTexture: faceAtlas.texture, seed });
  }

  // 事前コンパイル（09 8.7）：全ての材質の組合せを1体ずつ置いた場面を作って渡す。
  // ここで作った材質は捨てない（捨てると three がプログラムも捨て、次に使うとき作り直しになる）。
  const warmViews = Object.keys(characters).map((id) => makePlayer(id, 0));
  {
    const warmScene = new Scene();
    const warmFloor = new Mesh(new PlaneGeometry(1, 1), floorMat);
    warmScene.add(warmFloor);
    for (const v of warmViews) warmScene.add(v.object);
    cameraView.three.updateMatrixWorld();
    renderer.warmup(warmScene, cameraView.three);
    warmFloor.geometry.dispose();
    for (const v of warmViews) v.rig.dispose(); // 形は捨てる。材質は残す
  }

  function clear() {
    if (floor) {
      scene.remove(floor);
      floor.geometry.dispose();
      floor = null;
    }
    if (player) {
      scene.remove(player.object);
      player.dispose();
      player = null;
    }
  }

  return {
    /**
     * 場面の見た目を作り直す。床はステージのデータ（衝突と同じもの）から作る。
     * @param {{stage:import('../data/types.js').StageDef, charId:string, seed:number}} world
     */
    setWorld(world) {
      clear();
      const [sx, sz] = world.stage.sizeM;
      const baseM = Number(world.stage.terrain.params.baseM ?? 0);
      const floorGeo = new PlaneGeometry(sx, sz);
      floorGeo.rotateX(-Math.PI / 2);
      floor = new Mesh(floorGeo, floorMat);
      floor.position.set(sx / 2, baseM, sz / 2);
      scene.add(floor);

      player = makePlayer(world.charId, world.seed);
      scene.add(player.object);

      // 光：夕日の方位はステージのデータから（07 3.3）
      const light = mainLightDir(world.stage, cfg.render);
      toonShared.setLightDir(light);
      outlineShared.setLightDir(light);
    },
    /**
     * @param {any} world シムのワールド（読むだけ）
     * @param {number} alpha 前tick→今tickの補間（0〜1）
     */
    render(world, alpha) {
      if (!floor || !player) return;
      // 調整パネルで変えた値を反映する
      bg.set(cfg.debug.grayBgColor);
      floorMat.uniforms.uFloor.value.set(cfg.debug.grayFloorColor);
      floorMat.uniforms.uGrid.value.set(cfg.debug.grayGridColor);
      floorMat.uniforms.uStepM.value = cfg.debug.grayGridStepM;
      floorMat.uniforms.uLinePx.value = cfg.debug.grayGridLinePx * renderer.three.getPixelRatio();
      toonShared.refresh();
      outlineShared.refresh();
      const light = mainLightDir(world.stage, cfg.render);
      toonShared.setLightDir(light);
      outlineShared.setLightDir(light);

      player.update(world.player, alpha, world.tick);

      const [w, h] = renderer.viewPx();
      cameraView.update(world.camera, alpha, w / h);
      outlineShared.setView(cameraView.three.fov, h);
      renderer.draw(scene, cameraView.three);
    },
    /** 試験用：主人公の表示の状態（ばねの角度・描画命令の数）。 */
    playerSnapshot() {
      return player ? player.snapshot() : null;
    },
    /** 試験用：主人公の造形（rig.test と同じ中身をブラウザで確かめる）。 */
    get playerView() {
      return player;
    },
    dispose() {
      clear();
      floorMat.dispose();
      for (const v of warmViews) v.dispose();
      toonShared.dispose();
      faceAtlas.dispose();
    },
  };
}
