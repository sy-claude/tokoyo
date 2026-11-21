// 静的形状の幾何（09 §6.2・§6.3）：キャラの円（水平）と形状の押し出し、足場の判定。
/** @import {WorldShape} from '../../gen/props.js' */
import { DEG2RAD } from '../../core/math.js';

/** 形状の縦の範囲 [下, 上]。 @param {WorldShape} s @returns {[number, number]} */
export function shapeYRange(s) {
  return s.kind === 'sphere' ? [s.y - s.rM, s.y + s.rM] : [s.y, s.y + s.hM];
}

/** 箱の局所座標（右・前）。 */
function toLocal(s, x, z) {
  const c = Math.cos(s.yawDeg * DEG2RAD);
  const n = Math.sin(s.yawDeg * DEG2RAD);
  const dx = x - s.x;
  const dz = z - s.z;
  // 右=(cos, −sin)、前=(sin, cos)（F=(sin yaw, cos yaw) の約束）
  return [dx * c - dz * n, dx * n + dz * c];
}

/** 局所の押し出し量 → 世界。 @returns {[number, number]} */
function toWorld(s, lx, lz) {
  const c = Math.cos(s.yawDeg * DEG2RAD);
  const n = Math.sin(s.yawDeg * DEG2RAD);
  return [lx * c + lz * n, -lx * n + lz * c];
}

/**
 * 水平の円 (x,z,r) を形状の外へ押し出す量。重ならなければ null。
 * 球は、カプセルの縦の線分 [y0, y1] に最も近い高さで切った円として扱う。
 * @param {WorldShape} s @returns {[number, number]|null}
 */
export function pushOut(s, x, z, r, y0, y1) {
  if (s.kind === 'box') {
    const [lx, lz] = toLocal(s, x, z);
    const qx = Math.max(-s.hx, Math.min(s.hx, lx));
    const qz = Math.max(-s.hz, Math.min(s.hz, lz));
    if (qx === lx && qz === lz) {
      // 中にいる：最も近い面へ（半径の分だけ外へ）
      const cand = [[s.hx - lx, 1, 0], [lx + s.hx, -1, 0], [s.hz - lz, 0, 1], [lz + s.hz, 0, -1]];
      cand.sort((a, b) => a[0] - b[0]);
      const [d, ax, az] = cand[0];
      return toWorld(s, ax * (d + r), az * (d + r));
    }
    const ex = lx - qx;
    const ez = lz - qz;
    const d = Math.hypot(ex, ez);
    if (d >= r) return null;
    return toWorld(s, (ex / d) * (r - d), (ez / d) * (r - d));
  }
  let R = s.rM;
  if (s.kind === 'sphere') {
    const cy = Math.max(y0, Math.min(y1, s.y));
    const dy = Math.abs(cy - s.y);
    if (dy >= s.rM) return null;
    R = Math.sqrt(s.rM * s.rM - dy * dy);
  }
  const dx = x - s.x;
  const dz = z - s.z;
  const d = Math.hypot(dx, dz);
  if (d >= r + R) return null;
  if (d === 0) return [r + R, 0];
  return [(dx / d) * (r + R - d), (dz / d) * (r + R - d)];
}

/** 水平の円 (x,z,r) が形状の上面（真上から見た形）と重なるか。r=0 で点の判定。 @param {WorldShape} s */
export function overlapsFootprint(s, x, z, r) {
  if (s.kind === 'box') {
    const [lx, lz] = toLocal(s, x, z);
    const ex = Math.abs(lx) - s.hx;
    const ez = Math.abs(lz) - s.hz;
    return Math.hypot(Math.max(ex, 0), Math.max(ez, 0)) <= r;
  }
  return Math.hypot(x - s.x, z - s.z) <= s.rM + r;
}

/** 上面の高さ（球は頂点）。 @param {WorldShape} s */
export function topOf(s) {
  return shapeYRange(s)[1];
}
