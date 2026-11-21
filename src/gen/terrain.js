// 地形の生成（09 §6.1）。StageDef → 高さ格子・升ごとの面種別・崖と海からの距離。シムと描画が共用する純関数。
/** @import {StageDef} from '../data/types.js' */

/** 面種別の番号（09 §6.1）。 */
export const SURFACE = { grass: 0, sand: 1, stone: 2, rock: 3, cliff: 4, sea: 5, forbidden: 6 };

/**
 * @typedef {Object} Terrain
 * @property {number} cellM
 * @property {number} nx  升の数（x）
 * @property {number} nz
 * @property {Float32Array} heights  頂点 (nx+1)·(nz+1)、添字 iz·(nx+1)+ix
 * @property {Uint8Array} surface    升 nx·nz、添字 iz·nx+ix
 * @property {Float32Array} edgeDist 升ごとの崖・海の升までの距離（m。8近傍の歩数×cellM）
 * @property {number} seaLevelM
 */

/**
 * 試験場の地形（10 §4.5）：床の高さ baseM に、矩形と斜面を順に重ねる。
 * @param {StageDef} stage @param {number} nx @param {number} nz @param {Float32Array} heights
 */
function sandboxRects(stage, nx, nz, heights) {
  const p = /** @type {{baseM:number, rects:number[], ramps:number[]}} */ (stage.terrain.params);
  const cell = stage.cellM;
  heights.fill(p.baseM);
  // 矩形と斜面を、書かれた順に上書きする（斜面→矩形の順に書いた方が勝つよう、配列の並びを1本にする）
  /** @type {{kind:'rect'|'ramp', a:number[]}[]} */
  const ops = [];
  const RECT_N = 5; // num-ok: 矩形の欄の数 [x0,z0,x1,z1,h]
  const RAMP_N = 6; // num-ok: 斜面の欄の数 [x0,z0,x1,z1,h0,h1]
  for (let i = 0; i + RAMP_N <= p.ramps.length; i += RAMP_N) ops.push({ kind: 'ramp', a: p.ramps.slice(i, i + RAMP_N) });
  for (let i = 0; i + RECT_N <= p.rects.length; i += RECT_N) ops.push({ kind: 'rect', a: p.rects.slice(i, i + RECT_N) });
  for (const op of ops) {
    const [x0, z0, x1, z1] = op.a;
    for (let iz = 0; iz <= nz; iz++) {
      const z = iz * cell;
      if (z < z0 || z > z1) continue;
      for (let ix = 0; ix <= nx; ix++) {
        const x = ix * cell;
        if (x < x0 || x > x1) continue;
        heights[iz * (nx + 1) + ix] = op.kind === 'rect' ? op.a[4] : op.a[4] + ((op.a[5] - op.a[4]) * (z - z0)) / Math.max(z1 - z0, Number.EPSILON);
      }
    }
  }
}

/** 地形の作り方の一覧（StageDef.terrain.gen の名前）。 */
const GENERATORS = { sandboxRects };

/**
 * @param {StageDef} stage
 * @param {{slopeMaxDeg:number}} col config/collision の値
 * @returns {Terrain}
 */
export function buildTerrain(stage, col) {
  const cell = stage.cellM;
  const nx = Math.round(stage.sizeM[0] / cell);
  const nz = Math.round(stage.sizeM[1] / cell);
  const heights = new Float32Array((nx + 1) * (nz + 1));
  const gen = GENERATORS[/** @type {keyof typeof GENERATORS} */ (stage.terrain.gen)];
  if (!gen) throw new Error(`地形の作り方が無い：${stage.terrain.gen}`);
  gen(stage, nx, nz, heights);

  // 面種別：4頂点すべてが水面より下＝海、隣り合う頂点の高低差が cell·tan(slopeMax) を超える＝崖、それ以外＝石
  const surface = new Uint8Array(nx * nz);
  const cliffDiff = cell * Math.tan((col.slopeMaxDeg * Math.PI) / 180);
  const H = (ix, iz) => heights[iz * (nx + 1) + ix];
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const a = H(ix, iz);
      const b = H(ix + 1, iz);
      const c = H(ix, iz + 1);
      const d = H(ix + 1, iz + 1);
      let s = SURFACE.stone;
      if (a < stage.seaLevelM && b < stage.seaLevelM && c < stage.seaLevelM && d < stage.seaLevelM) s = SURFACE.sea;
      else if (Math.max(Math.abs(a - b), Math.abs(c - d), Math.abs(a - c), Math.abs(b - d)) > cliffDiff) s = SURFACE.cliff;
      surface[iz * nx + ix] = s;
    }
  }
  return { cellM: cell, nx, nz, heights, surface, edgeDist: edgeDistances(surface, nx, nz, cell), seaLevelM: stage.seaLevelM };
}

/** 崖・海・禁止の升から各升までの距離（8近傍の幅優先探索×cell）。 */
function edgeDistances(surface, nx, nz, cell) {
  const steps = new Int32Array(nx * nz).fill(-1);
  const queue = new Int32Array(nx * nz);
  let head = 0;
  let tail = 0;
  for (let i = 0; i < nx * nz; i++) {
    const s = surface[i];
    if (s === SURFACE.cliff || s === SURFACE.sea || s === SURFACE.forbidden) {
      steps[i] = 0;
      queue[tail++] = i;
    }
  }
  while (head < tail) {
    const i = queue[head++];
    const ix = i % nx;
    const iz = (i - ix) / nx;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const jx = ix + dx;
        const jz = iz + dz;
        if (jx < 0 || jz < 0 || jx >= nx || jz >= nz) continue;
        const j = jz * nx + jx;
        if (steps[j] >= 0) continue;
        steps[j] = steps[i] + 1;
        queue[tail++] = j;
      }
    }
  }
  const out = new Float32Array(nx * nz);
  // 崖も海も無い地図では、どこも十分遠い
  for (let i = 0; i < nx * nz; i++) out[i] = steps[i] < 0 ? Number.POSITIVE_INFINITY : steps[i] * cell;
  return out;
}
