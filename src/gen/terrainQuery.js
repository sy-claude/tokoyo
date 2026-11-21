// 高さ格子を読む関数（09 §6.1）。シムの衝突と描画の両方が使う純関数。
/** @import {Terrain} from './terrain.js' */
import { SURFACE } from './terrain.js';

const NORMAL_PROBE_RATIO = 0.5; // num-ok: 法線の中心差分の幅（升の何倍。09 §6.1 の ±0.25m）

/** 頂点の高さ（地図の外は端の値）。 */
function vh(t, ix, iz) {
  const cx = ix < 0 ? 0 : ix > t.nx ? t.nx : ix;
  const cz = iz < 0 ? 0 : iz > t.nz ? t.nz : iz;
  return t.heights[cz * (t.nx + 1) + cx];
}

/** (x,z) の地形の高さ：升の4頂点の双一次補間。 @param {Terrain} t */
export function heightAt(t, x, z) {
  const gx = x / t.cellM;
  const gz = z / t.cellM;
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  const fx = gx - ix;
  const fz = gz - iz;
  const a = vh(t, ix, iz);
  const b = vh(t, ix + 1, iz);
  const c = vh(t, ix, iz + 1);
  const d = vh(t, ix + 1, iz + 1);
  return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
}

/** (x,z) の地形の勾配 [dh/dx, dh/dz]（±0.25m の中心差分）。 @param {Terrain} t */
export function gradientAt(t, x, z) {
  const e = t.cellM * NORMAL_PROBE_RATIO;
  return [(heightAt(t, x + e, z) - heightAt(t, x - e, z)) / (2 * e), (heightAt(t, x, z + e) - heightAt(t, x, z - e)) / (2 * e)];
}

/** (x,z) の地形の傾き（度）。 @param {Terrain} t */
export function slopeDegAt(t, x, z) {
  const [gx, gz] = gradientAt(t, x, z);
  return (Math.atan(Math.hypot(gx, gz)) * 180) / Math.PI;
}

/** 升の番号（地図の外は −1）。 @param {Terrain} t */
export function cellIndexAt(t, x, z) {
  const ix = Math.floor(x / t.cellM);
  const iz = Math.floor(z / t.cellM);
  if (ix < 0 || iz < 0 || ix >= t.nx || iz >= t.nz) return -1;
  return iz * t.nx + ix;
}

/** (x,z) の面種別（地図の外は禁止）。 @param {Terrain} t */
export function surfaceAt(t, x, z) {
  const i = cellIndexAt(t, x, z);
  return i < 0 ? SURFACE.forbidden : t.surface[i];
}

/** (x,z) の崖・海までの距離（m）。 @param {Terrain} t */
export function edgeDistAt(t, x, z) {
  const i = cellIndexAt(t, x, z);
  return i < 0 ? 0 : t.edgeDist[i];
}
