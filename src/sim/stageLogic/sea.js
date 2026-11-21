// 海への落下と復帰（02 §5）、安全地点の記録（09 §6.3）。
/** @import {World} from '../world.js' */
import { emit } from '../../core/events.js';
import { copyV3 } from '../../core/math.js';
import { edgeDistAt } from '../collision/heightfield.js';
import { resetCameraBehind } from '../camera.js';
import { enterState, stateF } from '../player/state.js';

const PCT = 100; // num-ok: % → 比
/** 安全地点を記録してよい状態。 */
const SAFE_STATES = new Set(['idle', 'walk', 'run', 'land']);

/**
 * 実tick で safePointEveryF ごとに、接地・移動状態・地形の上・崖と海から safeEdgeDistM 以上なら、位置と向きを新しい順に記録する。
 * 有効な穢域の外の条件は穢域を作る M6b で足す。
 * @param {World} world @param {any} p
 */
export function recordSafePoint(world, p) {
  const col = world.cfg.collision;
  if (world.tick % col.safePointEveryF !== 0) return;
  if (!p.grounded || !SAFE_STATES.has(p.state) || p.mv.onShape) return;
  if (edgeDistAt(world.collision.terrain, p.pos[0], p.pos[2]) < col.safeEdgeDistM) return;
  const sp = p.mv.safePoints;
  sp.unshift({ pos: copyV3(p.pos), yawDeg: p.yawDeg });
  if (sp.length > world.cfg.movement.safePointKeepCount) sp.length = world.cfg.movement.safePointKeepCount;
}

/** 海へ落ちた（どの状態からでも）。次の tick から fallSea。 @param {World} world @param {any} p */
export function startSeaFall(world, p) {
  p.mv.seaPos = copyV3(p.pos);
  p.vel = [0, 0, 0];
  p.mv.speed = 0;
  enterState(p, 'fallSea', false);
  world.camera.mode = 'sea';
  emit(world, 'seaFall', { pos: copyV3(p.pos) });
}

/**
 * fallSea（沈む seaSinkF ＋墨のワイプ seaWipeF）→ 安全地点へ戻して respawn（respawnF）→ idle（復帰の無敵 respawnInvulnF）。
 * @param {World} world @param {any} p @param {{hpMax:number}} ch
 */
export function stepSea(world, p, ch) {
  const mvc = world.cfg.movement;
  const f = stateF(p);
  if (p.state === 'fallSea') {
    if (f <= mvc.seaSinkF + mvc.seaWipeF) return;
    // 復帰先＝最新の安全地点（近くの敵の条件は敵が入る M4a で足す）。記録が無ければ開始点
    const sp = p.mv.safePoints[0] ?? { pos: world.stage.playerStart.pos, yawDeg: world.stage.playerStart.yawDeg };
    p.pos = copyV3(sp.pos);
    p.prevPos = copyV3(sp.pos);
    p.yawDeg = sp.yawDeg;
    p.prevYawDeg = sp.yawDeg;
    p.vel = [0, 0, 0];
    p.grounded = true;
    p.mv.airEvadeUsed = false;
    p.mv.dashUsed = false;
    p.mv.lastGround = [sp.pos[0], sp.pos[2]];
    p.mv.peakY = sp.pos[1];
    p.hp = Math.max(1, p.hp - Math.round((ch.hpMax * mvc.seaDamagePct) / PCT));
    world.camera.mode = 'explore';
    resetCameraBehind(world.camera, p, world.cfg);
    enterState(p, 'respawn');
    emit(world, 'respawn', { reason: 'sea', pos: copyV3(sp.pos) });
    return;
  }
  // respawn：入力を受けない。終われば idle と復帰の無敵（この tick を含めて局所 respawnInvulnF の間）
  if (f <= mvc.respawnF) return;
  enterState(p, 'idle');
  p.mv.invulnUntil = p.localF + mvc.respawnInvulnF;
}
