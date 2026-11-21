// プレイヤーの状態機械（02 §1）：idle/walk/run/land/landHeavy/jumpRise/jumpFall/airDash/flip/step/fallSea/respawn。
// 攻撃・被弾（action/hitstun/launch/down/getup）・dead・event は各 M で足す。
// 時間：状態の f は局所時間（scale を掛ける）。先行入力は実tick（02 §0）。
/** @import {InputFrame} from '../../data/types.js' */
/** @import {World} from '../world.js' */
/** @import {Entity} from '../entities.js' */
import { emit } from '../../core/events.js';
import { characters } from '../../data/characters.js';
import { move } from '../collision/mover.js';
import { surfaceAt, SURFACE } from '../collision/heightfield.js';
import { airVelocity, dirOfYaw, groundVelocity, isRunning, stickDir, stopAtEdge } from './locomotion.js';
import { yawOfXZ } from '../../core/math.js';
import { recordSafePoint, startSeaFall, stepSea } from '../stageLogic/sea.js';
import { enterState, stateF } from './state.js';

export { enterState, stateF };

const PCT = 100; // num-ok: % → 比
const HALF = 0.5; // num-ok: 等加速度の式の ½
const NO_TICK = -1e9; // num-ok: 先行入力が無い印

/** 地上で自由に動ける状態（跳躍・回避・行動をすぐ受け付ける）。 */
const GROUND_FREE = new Set(['idle', 'walk', 'run', 'land']);
/** 空中の状態（回避は神通足／宙返り）。 */
const AIR = new Set(['jumpRise', 'jumpFall']);
/** 状態ごとの面種別 → 足音の面（09 §3.1 の footstep）。 */
const STEP_SURFACE = { [SURFACE.grass]: 'grass', [SURFACE.sand]: 'sand', [SURFACE.stone]: 'stone', [SURFACE.rock]: 'rock' };

/**
 * @typedef {Object} PlayerMove  移動の状態（02 §1〜§5）
 * @property {number} speed        地上の速さ（m/s）
 * @property {boolean} running
 * @property {boolean} quickTurn   切り返しの印（見た目用に1tick）
 * @property {number} stateStart   状態に入った局所時間（この tick を f1 とする）
 * @property {number} coyoteLeft   コヨーテの残り（局所f）
 * @property {boolean} releasePending 早離しの予約（12f 目に適用）
 * @property {boolean} releaseDone
 * @property {boolean} airEvadeUsed
 * @property {boolean} dashUsed     この滞空で神通足を使った（到達の安全弁を外す）
 * @property {[number, number]} lastGround 最後に接地した点（x,z）
 * @property {number} peakY        この滞空の最高点
 * @property {[number, number]} dir ステップ・神通足・宙返りの向き
 * @property {number} bufJump      跳躍を押した実tick（先行入力）
 * @property {number} bufDodge
 * @property {number} invulnUntil  復帰の無敵が切れる局所時間
 * @property {boolean} onShape     小道具の上に立っている
 * @property {number} stepAccM     足音までの距離の積算
 * @property {{pos:[number, number, number], yawDeg:number}[]} safePoints 新しい順
 * @property {[number, number, number]} seaPos 落ちた点
 */

/** @param {[number, number, number]} pos @returns {PlayerMove} */
export function createPlayerMove(pos) {
  return {
    speed: 0, running: false, quickTurn: false, stateStart: 0, coyoteLeft: 0, releasePending: false, releaseDone: false,
    airEvadeUsed: false, dashUsed: false, lastGround: [pos[0], pos[2]], peakY: pos[1], dir: [0, 1],
    bufJump: NO_TICK, bufDodge: NO_TICK, invulnUntil: 0, onShape: false, stepAccM: 0, safePoints: [], seaPos: [pos[0], pos[1], pos[2]],
  };
}

/** 無敵か（02 §4.2 の各区間・復帰後の無敵・海）。被弾の処理（M3a 以降）が使う。 @param {Entity & {mv:PlayerMove}} p @param {import('../../config/index.js').Cfg} cfg */
export function isInvulnerable(p, cfg) {
  const mv = cfg.movement;
  if (p.state === 'fallSea' || p.state === 'respawn') return true;
  if (p.localF < p.mv.invulnUntil) return true;
  const f = stateF(p);
  if (p.state === 'step') return f >= mv.stepInvulnStartF && f <= mv.stepInvulnEndF;
  if (p.state === 'airDash') return f >= mv.airDashInvulnStartF && f <= mv.airDashInvulnEndF;
  if (p.state === 'flip') return f >= mv.flipInvulnStartF && f <= mv.flipInvulnEndF;
  return false;
}

/** 接地の移動状態（入力で idle/walk/run）。 */
function groundStateOf(p, st, mvCfg) {
  if (!st) return p.mv.speed > 0 ? 'walk' : 'idle';
  return isRunning(st.m, p.mv.running, mvCfg) ? 'run' : 'walk';
}

/** 跳躍の重力と初速（02 §3.1）。 */
function jumpPhysics(mv) {
  const g = (2 * mv.jumpHeightM) / (mv.jumpRiseS * mv.jumpRiseS);
  return { g, v0: (2 * mv.jumpHeightM) / mv.jumpRiseS, gF: g * mv.fallGravityMul };
}

/**
 * 1tick（09 §4.3 の手順3）。
 * @param {World} world @param {InputFrame} input
 */
export function stepPlayer(world, input) {
  const p = /** @type {Entity & {mv:PlayerMove}} */ (world.player);
  const cfg = world.cfg;
  const mvc = cfg.movement;
  const col = cfg.collision;
  const cw = world.collision;
  const ch = characters[world.charId] ?? characters.fuma;
  const cm = mvc.charMove[/** @type {keyof typeof mvc.charMove} */ (world.charId)] ?? mvc.charMove.fuma;
  const mv = p.mv;
  const dt = p.scale / cfg.time.tickRateHz;
  const tick = world.tick;
  const { g, v0, gF } = jumpPhysics(mvc);

  // 海の落下と復帰は入力を受けない（02 §5）
  if (p.state === 'fallSea' || p.state === 'respawn') {
    stepSea(world, p, ch);
    return;
  }

  // 1. 先行入力（実tick）。空中で使い切った回避は保持しない（何も起きない。02受11）
  if (input.btn.jump.pressed) mv.bufJump = tick;
  if (input.btn.dodge.pressed && !(AIR.has(p.state) && mv.airEvadeUsed)) mv.bufDodge = tick;
  const buffered = (t) => tick - t < cfg.combat.inputBufferF;
  if (p.state === 'jumpRise' && !input.btn.jump.down && !mv.releaseDone) mv.releasePending = true;

  const st = stickDir(input, world.camera.yawDeg, mvc);
  let f = stateF(p);

  // 2. 時間で終わる状態
  if (p.state === 'land' && f > mvc.landF) enterState(p, groundStateOf(p, st, mvc));
  if (p.state === 'landHeavy' && f > mvc.landHeavyF) enterState(p, 'idle');
  if (p.state === 'step' && f > mvc.stepTotalF) {
    mv.speed = 0;
    enterState(p, groundStateOf(p, st, mvc));
  }
  if (p.state === 'airDash' && f > mvc.airDashF) {
    const fwd = dirOfYaw(p.yawDeg);
    const sp = mvc.runSpeedMps * cm.runSpeedMul;
    p.vel = [fwd[0] * sp, 0, fwd[1] * sp];
    enterState(p, 'jumpFall');
  }
  if (p.state === 'flip' && f > mvc.flipF) {
    p.vel[0] = 0;
    p.vel[2] = 0;
    enterState(p, 'jumpFall');
  }
  f = stateF(p);

  // 3. 窓が開いていれば、保持中で最も優先の高いもの1つだけを実行し、残りは捨てる（回避＞跳躍。02 §0）
  const free = GROUND_FREE.has(p.state) || (p.state === 'step' && f >= mvc.stepCancelF) || (p.state === 'landHeavy' && f >= mvc.landHeavyCancelF);
  const air = AIR.has(p.state);
  const canDodge = free || (air && !mv.airEvadeUsed && (ch.flags.canAirDash || ch.flags.canFlip));
  const canJump = free || (p.state === 'jumpFall' && mv.coyoteLeft > 0);
  if (buffered(mv.bufDodge) && canDodge) {
    mv.bufDodge = NO_TICK;
    mv.bufJump = NO_TICK;
    if (air) startAirEvade(world, p, st, ch, mvc);
    else startStep(world, p, st);
  } else if (buffered(mv.bufJump) && canJump) {
    mv.bufDodge = NO_TICK;
    mv.bufJump = NO_TICK;
    startJump(world, p, v0, mvc, cm, true);
  } else if ((p.state === 'step' && f >= mvc.stepCancelF && st) || (p.state === 'landHeavy' && f >= mvc.landHeavyCancelF && st)) {
    // 移動入力での取消
    mv.speed = 0;
    enterState(p, groundStateOf(p, st, mvc));
  }
  f = stateF(p);

  // 4. 状態ごとの速度
  let dy = 0;
  let vx = 0;
  let vz = 0;
  const s = p.state;
  if (GROUND_FREE.has(s)) {
    [vx, vz] = groundVelocity(p, st, dt, mvc, cm, Number.POSITIVE_INFINITY);
    // 歩きは縁で止める。走りは止めない（02 §2.3）
    if (!mv.running) [vx, vz] = stopAtEdge(cw, p.pos, p.capsule.rM, vx, vz, mvc, col);
    if (s !== 'land') p.state = st ? (mv.running ? 'run' : 'walk') : mv.speed > 0 ? 'walk' : 'idle';
    dy = 0; // 接地中（吸着は mover）
  } else if (s === 'landHeavy') {
    mv.speed = 0;
  } else if (s === 'step') {
    const d = (k) => mvc.stepDistM * (1 - (1 - Math.min(k, mvc.stepMoveF) / mvc.stepMoveF) ** 2);
    const dist = f <= mvc.stepMoveF ? d(f) - d(f - 1) : 0;
    [vx, vz] = stopAtEdge(cw, p.pos, p.capsule.rM, (mv.dir[0] * dist) / dt, (mv.dir[1] * dist) / dt, mvc, col);
  } else if (s === 'airDash') {
    const sp = mvc.airDashDistM / (mvc.airDashF / cfg.time.tickRateHz);
    vx = mv.dir[0] * sp;
    vz = mv.dir[1] * sp;
    p.vel[1] = 0;
  } else if (s === 'flip') {
    const T = mvc.flipF / 2 / cfg.time.tickRateHz;
    const gFlip = (2 * mvc.flipHeightM) / (T * T);
    const sp = mvc.flipDistM / (mvc.flipF / cfg.time.tickRateHz);
    vx = mv.dir[0] * sp;
    vz = mv.dir[1] * sp;
    dy = p.vel[1] * dt - HALF * gFlip * dt * dt;
    p.vel[1] -= gFlip * dt;
  } else if (AIR.has(s)) {
    // 早離し（離陸から jumpMinHoldF 未満の離しはその f に適用）
    if (s === 'jumpRise' && mv.releasePending && !mv.releaseDone && f >= mvc.jumpMinHoldF) {
      p.vel[1] *= mvc.jumpReleaseVelMul;
      mv.releaseDone = true;
    }
    [vx, vz] = airVelocity(p, st, dt, mvc, cm);
    if (s === 'jumpFall' && mv.coyoteLeft > 0) {
      // コヨーテ中は高さを保つ
      mv.coyoteLeft -= p.scale;
      p.vel[1] = 0;
    } else {
      const a = p.vel[1] > 0 ? -g : -gF;
      dy = p.vel[1] * dt + HALF * a * dt * dt;
      p.vel[1] = Math.max(-mvc.terminalFallMps, p.vel[1] + a * dt);
    }
  }
  // 神通足を使う前（宙返りしかないキャラは常に）の水平到達の安全弁（02 §3.4）
  if (!p.grounded && !mv.dashUsed) [vx, vz] = capAirReach(p, vx, vz, dt, mvc.airReachCapNoDashM);

  // 5. 動かす
  const plannedM = Math.hypot(vx, vz) * dt;
  const res = move(cw, p, vx * dt, vz * dt, dy, col);
  p.vel[0] = vx;
  p.vel[2] = vz;
  if (s === 'airDash' && res.movedM < plannedM * (mvc.airDashWallStopPct / PCT)) {
    p.vel = [0, 0, 0];
    enterState(p, 'jumpFall', false);
  }
  if (s === 'flip' && res.movedM < plannedM * (mvc.airDashWallStopPct / PCT)) mv.dir = [0, 0];

  // 6. 着地・足場の消失・海
  if (res.sea) {
    startSeaFall(world, p);
    return;
  }
  if (p.grounded) {
    mv.lastGround = [p.pos[0], p.pos[2]];
    mv.onShape = res.onShape;
    mv.airEvadeUsed = false;
    mv.dashUsed = false;
    if (res.landed || AIR.has(p.state) || p.state === 'flip') {
      const fallM = mv.peakY - p.pos[1];
      p.vel[1] = 0;
      emit(world, 'land', { fallM });
      mv.speed = Math.min(Math.hypot(vx, vz), mvc.runSpeedMps * cm.runSpeedMul);
      if (fallM >= mvc.landHeavyFallM) {
        mv.speed = 0;
        p.vel[0] = 0;
        p.vel[2] = 0;
        enterState(p, 'landHeavy', false);
      } else enterState(p, 'land', false);
      // 同じ tick の先行入力（着地の tick で跳ぶ。land を経ない）
      if (buffered(mv.bufDodge)) {
        mv.bufDodge = NO_TICK;
        mv.bufJump = NO_TICK;
        startStep(world, p, st, false);
      } else if (buffered(mv.bufJump) && p.state === 'land') {
        mv.bufDodge = NO_TICK;
        mv.bufJump = NO_TICK;
        startJump(world, p, v0, mvc, cm, false);
      }
    }
    mv.peakY = p.pos[1];
  } else {
    if (GROUND_FREE.has(p.state) || p.state === 'landHeavy' || p.state === 'step') {
      // 足場を失った：コヨーテ（02 §3.2）
      mv.speed = Math.min(mv.speed, mvc.runSpeedMps * cm.runSpeedMul);
      mv.coyoteLeft = mvc.coyoteF;
      p.vel[1] = 0;
      enterState(p, 'jumpFall', false);
    }
    if (p.state === 'jumpRise' && p.vel[1] <= 0) enterState(p, 'jumpFall', false);
    mv.peakY = Math.max(mv.peakY, p.pos[1]);
  }

  // 7. 安全地点（実tick）と足音
  recordSafePoint(world, p);
  footsteps(world, p, Math.hypot(vx, vz) * dt);
}

/** 跳躍を始める（02 §3）。 */
function startJump(world, p, v0, mvc, cm, now) {
  const mv = p.mv;
  const sp = Math.hypot(p.vel[0], p.vel[2]);
  const cap = mvc.runSpeedMps * cm.runSpeedMul;
  if (sp > cap) {
    p.vel[0] *= cap / sp;
    p.vel[2] *= cap / sp;
  }
  p.vel[1] = v0;
  p.grounded = false;
  mv.coyoteLeft = 0;
  mv.releasePending = false;
  mv.releaseDone = false;
  mv.peakY = Math.max(mv.peakY, p.pos[1]);
  enterState(p, 'jumpRise', now);
  emit(world, 'jump', {});
}

/** 地上の回避＝ステップ（02 §4）。入力あり：その向きへ即時に向く。中立：体の向きの真後ろ（向きは変えない）。 */
function startStep(world, p, st, now = true) {
  if (st) {
    p.mv.dir = [st.dir[0], st.dir[1]];
    p.yawDeg = yawOfXZ(st.dir[0], st.dir[1]);
  } else {
    const f = dirOfYaw(p.yawDeg);
    p.mv.dir = [-f[0], -f[1]];
  }
  p.mv.speed = 0;
  p.vel[0] = 0;
  p.vel[2] = 0;
  enterState(p, 'step', now);
  emit(world, 'dodge', { kind: 'step' });
}

/** 空中の回避＝神通足（canAirDash）または宙返り（canFlip）。1滞空1回（02 §4）。 */
function startAirEvade(world, p, st, ch, mvc) {
  const mv = p.mv;
  mv.airEvadeUsed = true;
  mv.coyoteLeft = 0;
  if (ch.flags.canAirDash) {
    mv.dir = st ? [st.dir[0], st.dir[1]] : dirOfYaw(p.yawDeg);
    p.yawDeg = yawOfXZ(mv.dir[0], mv.dir[1]);
    mv.dashUsed = true;
    p.vel[1] = 0;
    enterState(p, 'airDash');
    emit(world, 'dodge', { kind: 'airDash' });
    return;
  }
  // 宙返り：スティックを使わず体の向きの真後ろへ。上へ flipHeightM（flipF/2 で頂点）
  const f = dirOfYaw(p.yawDeg);
  mv.dir = [-f[0], -f[1]];
  const T = mvc.flipF / 2 / world.cfg.time.tickRateHz;
  p.vel[1] = (2 * mvc.flipHeightM) / T;
  enterState(p, 'flip');
  emit(world, 'dodge', { kind: 'flip' });
}

/** 最後の接地点から上限より外へは出さない（02 §3.4）：行き先が円の外なら、円の上へ引き戻した点へ向かう速度にする。 @returns {[number, number]} */
function capAirReach(p, vx, vz, dt, capM) {
  const [gx, gz] = p.mv.lastGround;
  const nx = p.pos[0] + vx * dt - gx;
  const nz = p.pos[2] + vz * dt - gz;
  const d = Math.hypot(nx, nz);
  if (d <= capM || dt <= 0) return [vx, vz];
  return [(gx + (nx / d) * capM - p.pos[0]) / dt, (gz + (nz / d) * capM - p.pos[2]) / dt];
}

/** 足音：接地で歩き・走りの1歩（config/anim の歩幅）ごとに footstep。 */
function footsteps(world, p, movedM) {
  const mv = p.mv;
  if (!p.grounded || (p.state !== 'walk' && p.state !== 'run')) {
    mv.stepAccM = 0;
    return;
  }
  mv.stepAccM += movedM;
  const stride = p.state === 'run' ? world.cfg.anim.runStrideM : world.cfg.anim.walkStrideM;
  if (mv.stepAccM < stride) return;
  mv.stepAccM -= stride;
  const sf = mv.onShape ? SURFACE.stone : surfaceAt(world.collision.terrain, p.pos[0], p.pos[2]);
  emit(world, 'footstep', { actorId: p.id, surface: /** @type {any} */ (STEP_SURFACE[sf] ?? 'stone') });
}
