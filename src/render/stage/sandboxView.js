// 試験場の灰色の表示（10 §4.5・M2a）。地形と小道具は、シムの衝突と同じステージのデータ（gen/terrain・data/props）から作る（不変条件6）。
// キャラは仮のカプセル＋向きの印。状態ごとの姿勢（跳躍の前傾・神通足の水平・ステップの後傾・着地の縮み・宙返り・海で沈む）を付ける。
/** @import {Cfg} from '../../config/index.js' */
/** @import {StageDef, PropDef} from '../../data/types.js' */
/** @import {Terrain} from '../../gen/terrain.js' */
import {
  BoxGeometry, BufferAttribute, BufferGeometry, CapsuleGeometry, Color, CylinderGeometry, Group, Matrix4, Mesh,
  MeshBasicMaterial, PlaneGeometry, ShaderMaterial,
} from 'three';
import { DEG2RAD, lerp, lerpDeg } from '../../core/math.js';
import { buildTerrain } from '../../gen/terrain.js';
import { heightAt } from '../../gen/terrainQuery.js';
import { props as propDefs } from '../../data/props.js';

const HALF = 0.5; // num-ok: 半分
const N3 = 3; // num-ok: 頂点の成分の数（x,y,z）
const CYL_SEG = 16; // num-ok: 円柱の周りの分割（部品に seg が無いとき）

/** 地形の描画用の形：高さ格子の頂点をそのまま使う（描画頂点の高さ＝格子の値。stageSource.test）。 @param {Terrain} t */
export function terrainGeometry(t) {
  const n = (t.nx + 1) * (t.nz + 1);
  const pos = new Float32Array(n * N3);
  for (let iz = 0; iz <= t.nz; iz++) {
    for (let ix = 0; ix <= t.nx; ix++) {
      const i = iz * (t.nx + 1) + ix;
      pos[i * N3] = ix * t.cellM;
      pos[i * N3 + 1] = t.heights[i];
      pos[i * N3 + 2] = iz * t.cellM;
    }
  }
  const idx = [];
  for (let iz = 0; iz < t.nz; iz++) {
    for (let ix = 0; ix < t.nx; ix++) {
      const a = iz * (t.nx + 1) + ix;
      const b = a + 1;
      const c = a + t.nx + 1;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, N3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** 小道具の見た目の形（部品 box・cyl を1つにまとめる。小道具の原点＝足元の中心）。 @param {PropDef} def */
export function propGeometry(def) {
  /** @type {BufferGeometry[]} */
  const parts = [];
  for (const part of def.parts) {
    const p = part.geo.p;
    let g;
    if (part.geo.type === 'box') g = new BoxGeometry(Number(p.w), Number(p.h), Number(p.d));
    else if (part.geo.type === 'cyl') g = new CylinderGeometry(Number(p.r), Number(p.r), Number(p.h), Number(p.seg ?? CYL_SEG));
    else throw new Error(`試験場の表示：知らない部品 ${part.geo.type}`);
    g.applyMatrix4(new Matrix4().makeRotationFromEuler(/** @type {any} */ ({ x: part.rotDeg[0] * DEG2RAD, y: part.rotDeg[1] * DEG2RAD, z: part.rotDeg[2] * DEG2RAD, order: 'YXZ', isEuler: true })));
    g.translate(part.pos[0], part.pos[1], part.pos[2]);
    parts.push(g.toNonIndexed());
  }
  // まとめる
  let count = 0;
  for (const g of parts) count += g.attributes.position.count;
  const pos = new Float32Array(count * N3);
  let o = 0;
  for (const g of parts) {
    pos.set(/** @type {Float32Array} */ (g.attributes.position.array), o);
    o += g.attributes.position.array.length;
    g.dispose();
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(pos, N3));
  out.computeVertexNormals();
  return out;
}

/** 配置（StageDef.props の1つ）→ 小道具の行列。地形の高さは同じ関数で決める。 */
export function placementMatrix(pl, terrain) {
  const x = pl.pos?.[0] ?? 0;
  const z = pl.pos?.[2] ?? 0;
  const y = pl.pos?.[1] ?? heightAt(terrain, x, z);
  const s = typeof pl.scale === 'number' ? [pl.scale, pl.scale, pl.scale] : pl.scale ?? [1, 1, 1];
  return new Matrix4().makeRotationY((pl.yawDeg ?? 0) * DEG2RAD).premultiply(new Matrix4().makeTranslation(x, y, z)).multiply(new Matrix4().makeScale(s[0], s[1], s[2]));
}

const GROUND_VERT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// 格子の線は画面上の太さ（px）で描き、遠くで細かくなりすぎたら床の色へ溶かす。急な面は崖の色、面の向きで淡い陰影
const GROUND_FRAG = /* glsl */ `
uniform vec3 uFloor;
uniform vec3 uCliff;
uniform vec3 uGrid;
uniform float uStepM;
uniform float uLinePx;
uniform float uCliffUp;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec3 n = normalize(vNormal);
  vec2 g = vWorld.xz / uStepM;
  vec2 fw = max(fwidth(g), vec2(1e-6));
  vec2 d = abs(fract(g - 0.5) - 0.5) / fw;
  float line = 1.0 - clamp(min(d.x, d.y) - (uLinePx * 0.5 - 0.5), 0.0, 1.0);
  float dense = max(fw.x, fw.y);
  float fade = 1.0 - clamp((dense - 0.12) / 0.38, 0.0, 1.0);
  vec3 base = n.y < uCliffUp ? uCliff : uFloor;
  float shade = 0.75 + 0.25 * clamp(dot(n, normalize(vec3(0.4, 1.0, 0.3))), 0.0, 1.0);
  gl_FragColor = vec4(mix(base * shade, uGrid, line * fade), 1.0);
  #include <colorspace_fragment>
}`;

/**
 * @param {Cfg} cfg
 */
export function createSandboxView(cfg) {
  const root = new Group();
  const groundMat = new ShaderMaterial({
    vertexShader: GROUND_VERT,
    fragmentShader: GROUND_FRAG,
    uniforms: {
      uFloor: { value: new Color() },
      uCliff: { value: new Color() },
      uGrid: { value: new Color() },
      uStepM: { value: 1 },
      uLinePx: { value: 1 },
      uCliffUp: { value: 1 },
    },
  });
  const propMat = new ShaderMaterial({ vertexShader: GROUND_VERT, fragmentShader: GROUND_FRAG, uniforms: groundMat.uniforms });
  const propSolid = new MeshBasicMaterial({ color: new Color() });
  const seaMat = new MeshBasicMaterial({ color: new Color(), transparent: true, opacity: 0.85 }); // num-ok: 海の透け（仮の表示）
  const capsuleMat = new MeshBasicMaterial({ color: new Color() });
  const noseMat = new MeshBasicMaterial({ color: new Color() });
  /** @type {BufferGeometry[]} */
  const geos = [];
  /** @type {Group|null} 姿勢を付ける体（足元が原点） */
  let body = null;
  let bodyHM = 0;

  function clear() {
    while (root.children.length) root.remove(root.children[0]);
    for (const g of geos) g.dispose();
    geos.length = 0;
    body = null;
  }

  return {
    root,
    /** @param {{stage:StageDef, player:{capsule:{rM:number, hM:number}}}} world */
    setWorld(world) {
      clear();
      const terrain = buildTerrain(world.stage, cfg.collision);
      const tg = terrainGeometry(terrain);
      geos.push(tg);
      root.add(new Mesh(tg, groundMat));
      // 海：水面の高さの板（地図より少し広く）
      const [sx, sz] = world.stage.sizeM;
      const sea = new PlaneGeometry(sx, sz);
      sea.rotateX(-Math.PI * HALF);
      geos.push(sea);
      const seaMesh = new Mesh(sea, seaMat);
      seaMesh.position.set(sx * HALF, world.stage.seaLevelM, sz * HALF);
      root.add(seaMesh);
      // 小道具：同じ小道具は形を共有
      /** @type {Map<string, BufferGeometry>} */
      const shared = new Map();
      for (const pl of world.stage.props) {
        let g = shared.get(pl.prop);
        if (!g) {
          g = propGeometry(propDefs[pl.prop]);
          shared.set(pl.prop, g);
          geos.push(g);
        }
        const m = new Mesh(g, propMat);
        m.matrixAutoUpdate = false;
        m.matrix.copy(placementMatrix(pl, terrain));
        root.add(m);
      }
      // キャラ：カプセル＋向きの印（体の中心を回転の中心にする）
      const { rM, hM } = world.player.capsule;
      const seg = cfg.debug.grayCapsuleSegCount;
      const cg = new CapsuleGeometry(rM, Math.max(0, hM - rM * 2), Math.ceil(seg * HALF), seg);
      const ng = new BoxGeometry(cfg.debug.grayNoseSizeM, cfg.debug.grayNoseSizeM, cfg.debug.grayNoseSizeM);
      geos.push(cg, ng);
      body = new Group();
      const pivot = new Group();
      pivot.position.y = hM * HALF;
      pivot.add(new Mesh(cg, capsuleMat));
      const nose = new Mesh(ng, noseMat);
      nose.position.set(0, hM * (HALF - HALF * HALF * HALF), rM); // 顔の高さ（体の中心より少し上）
      pivot.add(nose);
      body.add(pivot);
      bodyHM = hM;
      root.add(body);
      propSolid.color.set(cfg.debug.grayPropColor);
    },
    /** @param {any} world @param {number} alpha @param {number} pixelRatio */
    render(world, alpha, pixelRatio) {
      const d = cfg.debug;
      groundMat.uniforms.uFloor.value.set(d.grayFloorColor);
      groundMat.uniforms.uCliff.value.set(d.grayCliffColor);
      groundMat.uniforms.uGrid.value.set(d.grayGridColor);
      groundMat.uniforms.uStepM.value = d.grayGridStepM;
      groundMat.uniforms.uLinePx.value = d.grayGridLinePx * pixelRatio;
      groundMat.uniforms.uCliffUp.value = d.grayCliffSlopeRatio;
      seaMat.color.set(d.graySeaColor);
      capsuleMat.color.set(d.grayCapsuleColor);
      noseMat.color.set(d.grayNoseColor);
      if (!body) return;
      const p = world.player;
      body.position.set(lerp(p.prevPos[0], p.pos[0], alpha), lerp(p.prevPos[1], p.pos[1], alpha), lerp(p.prevPos[2], p.pos[2], alpha));
      body.rotation.y = lerpDeg(p.prevYawDeg, p.yawDeg, alpha) * DEG2RAD;
      const pivot = body.children[0];
      pivot.rotation.set(0, 0, 0);
      pivot.scale.set(1, 1, 1);
      pivot.position.y = bodyHM * HALF;
      // 状態ごとの姿勢（状態に入ってからの局所f。シムの値を読むだけ）
      const f = p.mv ? p.localF - p.mv.stateStart : 0;
      const mvc = cfg.movement;
      if (p.state === 'jumpRise' || p.state === 'jumpFall') pivot.rotation.x = d.poseJumpLeanDeg * DEG2RAD;
      else if (p.state === 'airDash') pivot.rotation.x = d.poseDashPitchDeg * DEG2RAD;
      else if (p.state === 'step') pivot.rotation.x = d.poseStepLeanDeg * DEG2RAD * Math.max(0, 1 - f / mvc.stepTotalF);
      else if (p.state === 'flip') pivot.rotation.x = -d.poseFlipTurnDeg * DEG2RAD * Math.min(1, f / mvc.flipF);
      else if (p.state === 'land' || p.state === 'landHeavy') {
        const total = p.state === 'land' ? mvc.landF : mvc.landHeavyF;
        const k = Math.min(1, f / Math.max(1, total));
        const sq = lerp(p.state === 'land' ? d.poseLandSquashRatio : d.poseLandHeavySquashRatio, 1, k);
        pivot.scale.set(1, sq, 1);
        pivot.position.y = bodyHM * HALF * sq;
      } else if (p.state === 'fallSea') body.position.y -= d.poseSeaSinkM * Math.min(1, f / mvc.seaSinkF);
    },
    dispose() {
      clear();
      for (const m of [groundMat, propMat, propSolid, seaMat, capsuleMat, noseMat]) m.dispose();
    },
  };
}
