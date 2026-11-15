// ポーズ（09 8.3、07 6.6・6.7）。poseAt は純関数：同じ入力なら同じ結果で、入力を書き換えない。
// M1a は待機だけ：待機の基本姿勢（RigDef.stance）＋呼吸（chest の X 回転）＋袴の追従。
// 歩き・走り（速さから位相）は M2a、技のポーズ（MoveDef.pose のキーフレーム）は M3a でここに足す。
/** @import {RigDef, MoveDef, V3} from '../../data/types.js' */
/** @import {Cfg} from '../../config/index.js' */
import { DEG2RAD } from '../../core/math.js';
import { TICK_RATE_HZ } from '../../core/units.js';

const QUAT = 4; // num-ok: 四元数の要素数
const XYZ = 3; // num-ok: 位置の要素数
const TAU = Math.PI * 2;

/**
 * ポーズの計算に要る情報（データだけ。three の物は持たない）。
 * @typedef {Object} PoseRig
 * @property {string[]} names                骨の名前（RigDef.bones と同じ順）
 * @property {Record<string, number>} index  骨の名前 → 番号
 * @property {Record<string, V3>} stance     待機の基本姿勢（度）
 * @property {[number, number, number][]} hakama  袴の追従：[袴の骨, 自分の太もも, 反対の太もも] の番号
 * @property {Cfg['anim']} anim              config/anim.js の値
 */

/**
 * 移動・待機の層への入力。M1a は時刻だけ（速さ・歩きの位相は M2a で足す）。
 * @typedef {{tF:number}} Loco  tF＝そのキャラの局所時間（f。描画側が前後tickで補間した小数）
 */

/**
 * @param {RigDef} rig @param {Cfg['anim']} anim
 * @returns {PoseRig}
 */
export function makePoseRig(rig, anim) {
  /** @type {Record<string, number>} */
  const index = {};
  rig.bones.forEach((b, i) => {
    index[b.name] = i;
  });
  /** @type {[number, number, number][]} */
  const hakama = [];
  for (const [side, other] of [['L', 'R'], ['R', 'L']]) {
    const h = index[`hakama${side}`];
    const own = index[`thigh${side}`];
    const opp = index[`thigh${other}`];
    if (h !== undefined && own !== undefined && opp !== undefined) hakama.push([h, own, opp]);
  }
  return { names: rig.bones.map((b) => b.name), index, stance: rig.stance ?? {}, hakama, anim };
}

/** poseAt の出力の長さ：骨数×4（四元数 x,y,z,w）＋根の位置のずれ3。 @param {PoseRig} rig */
export function poseSize(rig) {
  return rig.names.length * QUAT + XYZ;
}

/** Euler 'XYZ'（度）→ 四元数を out[o..o+3] に書く。 */
function eulerToQuat(xDeg, yDeg, zDeg, out, o) {
  const x = (xDeg * DEG2RAD) / 2;
  const y = (yDeg * DEG2RAD) / 2;
  const z = (zDeg * DEG2RAD) / 2;
  const c1 = Math.cos(x);
  const c2 = Math.cos(y);
  const c3 = Math.cos(z);
  const s1 = Math.sin(x);
  const s2 = Math.sin(y);
  const s3 = Math.sin(z);
  out[o] = s1 * c2 * c3 + c1 * s2 * s3;
  out[o + 1] = c1 * s2 * c3 - s1 * c2 * s3;
  out[o + 2] = c1 * c2 * s3 + s1 * s2 * c3;
  out[o + QUAT - 1] = c1 * c2 * c3 - s1 * s2 * s3;
}

/**
 * ある時刻のポーズ。out に、骨ごとの回転（バインド姿勢からの相対の四元数）と、根の位置のずれを書いて返す。
 * @param {PoseRig} rig
 * @param {MoveDef|null} move  技（M3a から。M1a は null）
 * @param {number} localF      技の局所f（M3a から）
 * @param {Loco} loco
 * @param {Float32Array} out   長さ poseSize(rig)
 * @returns {Float32Array} out
 */
export function poseAt(rig, move, localF, loco, out) {
  const an = rig.anim;
  const n = rig.names.length;
  // 関節角（度）。待機の基本姿勢から始める
  const deg = new Float64Array(n * XYZ);
  for (const name of Object.keys(rig.stance)) {
    const i = rig.index[name];
    const v = rig.stance[name];
    deg[i * XYZ] = v[0];
    deg[i * XYZ + 1] = v[1];
    deg[i * XYZ + 2] = v[2];
  }
  // 手続きの層：待機と歩きは2tickに1回だけ更新する（手描き感。07 6.6 の animTwosEnabled）
  const tF = an.animTwosEnabled ? Math.floor(loco.tF / an.animTwosF) * an.animTwosF : loco.tF;
  const chest = rig.index.chest;
  if (chest !== undefined) deg[chest * XYZ] += an.idleBreathDeg * Math.sin((TAU * tF) / TICK_RATE_HZ / an.idleBreathS);
  // 袴：自分の太もも50%＋両脚の平均50%（07 6.2-3）
  for (const [h, own, opp] of rig.hakama) {
    for (let k = 0; k < XYZ; k++) {
      const mean = (deg[own * XYZ + k] + deg[opp * XYZ + k]) / 2;
      deg[h * XYZ + k] = an.hakamaOwnRatio * deg[own * XYZ + k] + (1 - an.hakamaOwnRatio) * mean;
    }
  }
  for (let i = 0; i < n; i++) eulerToQuat(deg[i * XYZ], deg[i * XYZ + 1], deg[i * XYZ + 2], out, i * QUAT);
  out[n * QUAT] = 0;
  out[n * QUAT + 1] = 0;
  out[n * QUAT + 2] = 0;
  return out;
}
