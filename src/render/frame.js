// 1フレームの描画。シムの状態を読み、補間して描くだけ（シムを import しない）。
// M0a は灰色の仮表示：床（灰色＋1m格子）とカプセル（単色）。本物の材質・地形・キャラは M1 以降。
/** @import {Cfg} from '../config/index.js' */
import { CapsuleGeometry, Color, Mesh, MeshBasicMaterial, PlaneGeometry, Scene, ShaderMaterial } from 'three';
import { DEG2RAD, lerp, lerpDeg } from '../core/math.js';
import { createCameraView } from './cameraView.js';

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
 */
export function createFrame(renderer, cfg) {
  const scene = new Scene();
  const cameraView = createCameraView(cfg);
  const bg = new Color(cfg.debug.grayBgColor);
  scene.background = bg;

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
  const capsuleMat = new MeshBasicMaterial({ color: new Color(cfg.debug.grayCapsuleColor) });
  /** @type {any} */
  let floor = null;
  /** @type {any} */
  let capsule = null;
  let capsuleHM = 0;

  function clear() {
    for (const m of [floor, capsule]) {
      if (m) {
        scene.remove(m);
        m.geometry.dispose();
      }
    }
    floor = null;
    capsule = null;
  }

  return {
    /**
     * 場面の見た目を作り直す。床はステージのデータ（衝突と同じもの）から作る。
     * @param {{stage:import('../data/types.js').StageDef, player:{capsule:{rM:number, hM:number}}}} world
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

      const { rM, hM } = world.player.capsule;
      const seg = cfg.debug.grayCapsuleSegCount;
      capsule = new Mesh(new CapsuleGeometry(rM, Math.max(0, hM - rM * 2), Math.ceil(seg / 2), seg), capsuleMat);
      capsuleHM = hM;
      scene.add(capsule);
    },
    /**
     * @param {any} world シムのワールド（読むだけ）
     * @param {number} alpha 前tick→今tickの補間（0〜1）
     */
    render(world, alpha) {
      if (!floor || !capsule) return;
      // 調整パネルで変えた値を反映する
      bg.set(cfg.debug.grayBgColor);
      floorMat.uniforms.uFloor.value.set(cfg.debug.grayFloorColor);
      floorMat.uniforms.uGrid.value.set(cfg.debug.grayGridColor);
      floorMat.uniforms.uStepM.value = cfg.debug.grayGridStepM;
      floorMat.uniforms.uLinePx.value = cfg.debug.grayGridLinePx * renderer.three.getPixelRatio();
      capsuleMat.color.set(cfg.debug.grayCapsuleColor);

      const p = world.player;
      capsule.position.set(
        lerp(p.prevPos[0], p.pos[0], alpha),
        lerp(p.prevPos[1], p.pos[1], alpha) + capsuleHM / 2,
        lerp(p.prevPos[2], p.pos[2], alpha),
      );
      capsule.rotation.y = lerpDeg(p.prevYawDeg, p.yawDeg, alpha) * DEG2RAD;

      const [w, h] = renderer.viewPx();
      cameraView.update(world.camera, alpha, w / h);
      renderer.draw(scene, cameraView.three);
    },
    dispose() {
      clear();
      floorMat.dispose();
      capsuleMat.dispose();
    },
  };
}
