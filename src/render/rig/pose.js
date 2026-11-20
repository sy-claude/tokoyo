// ポーズ（09 §8.3）：poseAt(rig, move, localF, loco, out) → out。純関数（入力を書き換えない）。
// out＝骨の数×4（各骨の回転の四元数 x,y,z,w。バインド姿勢からの相対）＋根（root）のずれ 3（m）。
// 今は移動・待機の手続きアニメ（07 §6.6）だけ。技のポーズ（MoveDef.pose、07 §6.7）は戦闘の M で足す。
/** @import {BoneDef} from '../../data/lookdev/rigs.js' */
import { Euler, Quaternion } from 'three';
import { DEG2RAD } from '../../core/math.js';
import { HALF, N3, N4, TAU } from '../lookdev/consts.js';

const e = new Euler();
const q = new Quaternion();
// まばたきの区間ごとのずらしを作る数（よく使われる簡単な疑似乱数の定数。調整値ではない）
const BLINK_HASH_A = 12.9898; // num-ok: 疑似乱数の定数
const BLINK_HASH_B = 43758.5453; // num-ok: 疑似乱数の定数
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const mix = (a, b, t) => a + (b - a) * t;

/**
 * 移動・待機の各関節の角度（度、Euler 'XYZ'）。
 * @param {{timeS:number, speedMps:number, runSpeedMps:number, tickRateHz:number, anim:Record<string, any>}} loco
 * @returns {{joints:Record<string,[number,number,number]>, rootY:number}}
 */
export function locomotion(loco) {
  const A = loco.anim;
  const speed = Math.max(0, loco.speedMps);
  // 待機と歩きは2tickに1回だけ更新する（手描き感）
  const t = A.animTwosEnabled ? (Math.floor((loco.timeS * loco.tickRateHz) / 2) * 2) / loco.tickRateHz : loco.timeS;
  const moving = clamp01(speed / A.walkBlendFromMps); // 止まっている 0 → 歩き 1
  const run = clamp01((speed - A.walkBlendFromMps) / Math.max(loco.runSpeedMps - A.walkBlendFromMps, Number.EPSILON)); // 歩き 0 → 走り 1
  const stride = mix(A.walkStrideM, A.runStrideM, run);
  const phase = (t * speed * Math.PI) / stride;
  const thigh = mix(A.walkThighDeg, A.runThighDeg, run) * moving;
  const knee = mix(A.walkKneeDeg, A.runKneeDeg, run) * moving;
  const arm = mix(A.walkArmDeg, A.runArmDeg, run) * moving;
  const bob = mix(A.walkBobM, A.runBobM, run) * moving;
  const lean = mix(A.walkLeanDeg, A.runLeanDeg, run) * moving;
  const s = Math.sin(phase);
  const thighL = -s * thigh;
  const thighR = s * thigh;
  const thighAvg = (thighL + thighR) * HALF;
  // 袴は後ろへの振り（X の正）だけ小さく：羽織の背の内に収める
  const back = (/** @type {number} */ x) => (x > 0 ? x * A.hakamaBackMul : x);
  // 角度の向き：骨は −Y に伸びるので、X の負の回転で足先が前（+Z）へ出る。膝は正で後ろへ曲がる
  return {
    joints: {
      thighL: [thighL, 0, 0],
      thighR: [thighR, 0, 0],
      shinL: [Math.max(0, Math.cos(phase)) * knee, 0, 0],
      shinR: [Math.max(0, -Math.cos(phase)) * knee, 0, 0],
      armL: [s * arm, 0, 0],
      // 武器を持つ右腕は振りを小さく。武器は腕の振りを打ち消して向きを保ち、動くほど刃先を後ろへ引く
      armR: [-s * arm * A.weaponArmSwingMul, 0, 0],
      weapon: [s * arm * A.weaponArmSwingMul * A.weaponHoldRatio + mix(A.weaponTrailWalkDeg, A.weaponTrailRunDeg, run) * moving, 0, A.weaponLiftRunDeg * run * moving],
      // 袴（ばね専用の骨。基準の向きは 07 §6.2：自分の太もも50%＋両脚の平均50%）
      hakamaL: [back(thighL * HALF + thighAvg * HALF), 0, 0],
      hakamaR: [back(thighR * HALF + thighAvg * HALF), 0, 0],
      spine: [lean, 0, 0],
      chest: [Math.sin((TAU * t) / A.idleBreathS) * A.idleBreathDeg * (1 - moving), 0, 0],
    },
    rootY: Math.abs(s) * bob,
  };
}

/**
 * @param {{bones:BoneDef[]}} rig
 * @param {null} move 技（まだ無い）
 * @param {number} localF 技の局所 f（まだ使わない）
 * @param {{timeS:number, speedMps:number, runSpeedMps:number, tickRateHz:number, anim:Record<string, any>}} loco
 * @param {Float32Array} out 長さ＝骨の数×4＋3
 */
export function poseAt(rig, move, localF, loco, out) {
  const n = rig.bones.length;
  const { joints, rootY } = locomotion(loco);
  for (let i = 0; i < n; i++) {
    const j = joints[rig.bones[i].name];
    if (j) {
      q.setFromEuler(e.set(j[0] * DEG2RAD, j[1] * DEG2RAD, j[2] * DEG2RAD, 'XYZ'));
      out[i * N4] = q.x;
      out[i * N4 + 1] = q.y;
      out[i * N4 + 2] = q.z;
      out[i * N4 + N3] = q.w;
    } else {
      out[i * N4] = 0;
      out[i * N4 + 1] = 0;
      out[i * N4 + 2] = 0;
      out[i * N4 + N3] = 1;
    }
  }
  out[n * N4] = 0;
  out[n * N4 + 1] = rootY;
  out[n * N4 + 2] = 0;
  return out;
}

/**
 * まばたき（07 §6.6）：目を閉じているなら 1。時刻だけで決まる（同じ tick なら同じ。乱数の代わりに区間の番号から作った値を使う）。
 * 区間の長さ＝(最短＋最長)/2、区間ごとに 0〜(最長−最短)/2 秒ずらして1回閉じる → 間隔は必ず 最短〜最長。
 * @param {number} timeS @param {{blinkMinS:number, blinkMaxS:number, blinkF:number}} A @param {number} tickRateHz @param {number} [seed]
 */
export function blinkAt(timeS, A, tickRateHz, seed = 0) {
  const len = (A.blinkMinS + A.blinkMaxS) * HALF;
  const k = Math.floor(timeS / len);
  const h = Math.sin((k + 1 + seed) * BLINK_HASH_A) * BLINK_HASH_B;
  const start = k * len + (h - Math.floor(h)) * (A.blinkMaxS - A.blinkMinS) * HALF;
  return timeS >= start && timeS < start + A.blinkF / tickRateHz ? 1 : 0;
}
