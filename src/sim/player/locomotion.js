// 地上と空中の移動（02 §2・§3）。速度を決めるだけで、位置は mover（09 §6.3）が動かす。
/** @import {InputFrame} from '../../data/types.js' */
/** @import {Cfg} from '../../config/index.js' */
/** @import {CollisionWorld} from '../collision/queries.js' */
import { DEG2RAD, forwardXZ, rightXZ, wrapDeg, yawOfXZ } from '../../core/math.js';
import { groundAt, isSeaOrForbidden } from '../collision/queries.js';

const PCT = 100; // num-ok: % → 比

/**
 * スティック → カメラ基準の世界の向き（02 §2.1）。中立なら null。
 * @param {InputFrame} input @param {number} camYawDeg @param {Cfg['movement']} mv
 * @returns {{dir:[number, number], m:number}|null}
 */
export function stickDir(input, camYawDeg, mv) {
  const sx = input.stick[0];
  const sy = input.stick[1];
  const m = Math.min(1, Math.hypot(sx, sy));
  if (m < mv.stickMoveMinPct / PCT) return null;
  const f = forwardXZ(camYawDeg);
  const r = rightXZ(camYawDeg);
  const x = f[0] * sy + r[0] * sx;
  const z = f[2] * sy + r[2] * sx;
  const l = Math.hypot(x, z);
  return { dir: [x / l, z / l], m };
}

/** 走りか（入る 55%・戻る 50% のちらつき防止）。 */
export function isRunning(m, wasRunning, mv) {
  return wasRunning ? m >= mv.stickRunExitPct / PCT : m >= mv.stickRunEnterPct / PCT;
}

/** a を b へ、最大 step 度だけ回す。 */
export function turnToward(a, b, step) {
  const d = wrapDeg(b - a);
  return Math.abs(d) <= step ? b : wrapDeg(a + Math.sign(d) * step);
}

/**
 * 地上の移動（02 §2.2）：速さ v を目標へ近づけ、向きを回し、速度＝向き×v。切り返しは即時に向き、v×0.35。
 * @param {{yawDeg:number, mv:{speed:number, running:boolean, quickTurn:boolean}}} p
 * @param {{dir:[number, number], m:number}|null} st @param {number} dt @param {Cfg['movement']} mv
 * @param {{runSpeedMul:number, accelMul:number, turnMul:number}} cm @param {number} speedCapMps 最高速の上限（奥義の溜め中など。無ければ Infinity）
 * @returns {[number, number]} 水平速度
 */
export function groundVelocity(p, st, dt, mv, cm, speedCapMps) {
  p.mv.quickTurn = false;
  let vT = 0;
  if (st) {
    p.mv.running = isRunning(st.m, p.mv.running, mv);
    vT = Math.min(speedCapMps, (p.mv.running ? mv.runSpeedMps : mv.walkSpeedMps) * cm.runSpeedMul);
    const want = yawOfXZ(st.dir[0], st.dir[1]);
    if (Math.abs(wrapDeg(want - p.yawDeg)) > mv.quickTurnDeg && p.mv.speed > mv.walkSpeedMps) {
      p.yawDeg = want;
      p.mv.speed *= mv.quickTurnKeepMul;
      p.mv.quickTurn = true;
    } else {
      p.yawDeg = turnToward(p.yawDeg, want, mv.turnDegPs * cm.turnMul * dt);
    }
  } else {
    p.mv.running = false;
  }
  const accel = (mv.runSpeedMps / mv.runAccelS) * cm.accelMul;
  const decel = mv.runSpeedMps / mv.runDecelS;
  const v = p.mv.speed;
  p.mv.speed = v < vT ? Math.min(vT, v + accel * dt) : Math.max(vT, v - decel * dt);
  const f = forwardXZ(p.yawDeg);
  return [f[0] * p.mv.speed, f[2] * p.mv.speed];
}

/**
 * 空中の水平速度（02 §3.3）：入力があれば 目標＝向き×(歩き/走り) へ 加速×0.65 で近づける。中立は保つ。
 * 向きは水平速度が airTurnMinMps 以上なら速度の向きへ旋回×0.65。
 * @param {{yawDeg:number, vel:[number, number, number], mv:{running:boolean}}} p
 */
export function airVelocity(p, st, dt, mv, cm) {
  let vx = p.vel[0];
  let vz = p.vel[2];
  if (st) {
    p.mv.running = isRunning(st.m, p.mv.running, mv);
    const sp = (p.mv.running ? mv.runSpeedMps : mv.walkSpeedMps) * cm.runSpeedMul;
    const tx = st.dir[0] * sp - vx;
    const tz = st.dir[1] * sp - vz;
    const tl = Math.hypot(tx, tz);
    const a = (mv.runSpeedMps / mv.runAccelS) * cm.accelMul * mv.airControlMul * dt;
    if (tl <= a) {
      vx += tx;
      vz += tz;
    } else {
      vx += (tx / tl) * a;
      vz += (tz / tl) * a;
    }
  }
  if (Math.hypot(vx, vz) >= mv.airTurnMinMps) p.yawDeg = turnToward(p.yawDeg, yawOfXZ(vx, vz), mv.turnDegPs * cm.turnMul * mv.airTurnMul * dt);
  return [vx, vz];
}

/**
 * 縁か（02 §2.3）：探り点 pos+向き×(r+0.1) の足元が y−1.0 より低い、または海・禁止の升。
 * @param {CollisionWorld} cw @param {[number, number, number]} pos @param {number} r @param {[number, number]} dir
 */
export function isEdge(cw, pos, r, dir, mv, col) {
  const reach = r + mv.edgeProbeExtraM;
  const x = pos[0] + dir[0] * reach;
  const z = pos[2] + dir[1] * reach;
  if (isSeaOrForbidden(cw, x, z)) return true;
  return groundAt(cw, x, z, pos[1], 0, col.stepUpM, col.collisionEpsM).h < pos[1] - mv.edgeDropM;
}

/**
 * 縁で止める：向かう先が縁なら、x・z の成分ごとに探って、縁へ向かう成分を0にする（縁に沿う成分は残す）。
 * @returns {[number, number]}
 */
export function stopAtEdge(cw, pos, r, vx, vz, mv, col) {
  const l = Math.hypot(vx, vz);
  if (l === 0 || !isEdge(cw, pos, r, [vx / l, vz / l], mv, col)) return [vx, vz];
  const okX = vx === 0 || !isEdge(cw, pos, r, [Math.sign(vx), 0], mv, col);
  const okZ = vz === 0 || !isEdge(cw, pos, r, [0, Math.sign(vz)], mv, col);
  return [okX ? vx : 0, okZ ? vz : 0];
}

/** yaw（度）の向きの単位ベクトル [x, z]。 @returns {[number, number]} */
export function dirOfYaw(yawDeg) {
  return [Math.sin(yawDeg * DEG2RAD), Math.cos(yawDeg * DEG2RAD)];
}
