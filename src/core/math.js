// 数学の補助（純関数）。向きの約束：yawDeg 0 が +Z（南）、F=(sin yaw, 0, cos yaw)（05 1.1）。
/** @import {V3} from '../data/types.js' */

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export function clamp(x, lo, hi) {
  return x < lo ? lo : x > hi ? hi : x;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** 角度を (−180, 180] に畳む。 */
export function wrapDeg(d) {
  let r = d % 360;
  if (r > 180) r -= 360;
  else if (r <= -180) r += 360;
  return r;
}

/** 角度の補間（近い側を回る）。 */
export function lerpDeg(a, b, t) {
  return a + wrapDeg(b - a) * t;
}

/** 水平の前方向。yaw 0 が +Z、90 が +X。 @returns {V3} */
export function forwardXZ(yawDeg) {
  const r = yawDeg * DEG2RAD;
  return [Math.sin(r), 0, Math.cos(r)];
}

/** 水平の右方向（前×上）。yaw 0 で −X（南を向くと右手は西）。 @returns {V3} */
export function rightXZ(yawDeg) {
  const r = yawDeg * DEG2RAD;
  return [-Math.cos(r), 0, Math.sin(r)];
}

/** 縦角つきの前方向。pitch は上から見下ろす向きが＋（02 6.2）。 @returns {V3} */
export function forwardYawPitch(yawDeg, pitchDeg) {
  const y = yawDeg * DEG2RAD;
  const p = pitchDeg * DEG2RAD;
  const c = Math.cos(p);
  return [Math.sin(y) * c, -Math.sin(p), Math.cos(y) * c];
}

/** 水平ベクトルの向き（度）。 */
export function yawOfXZ(x, z) {
  return Math.atan2(x, z) * RAD2DEG;
}

/** @param {V3} a @param {V3} b @returns {V3} */
export function lerpV3(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** @param {V3} v @returns {V3} */
export function copyV3(v) {
  return [v[0], v[1], v[2]];
}
