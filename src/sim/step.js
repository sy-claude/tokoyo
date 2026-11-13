// 1tick の更新（09 4.3）。stepWorld(world, input) がシムの唯一の入口（不変条件4）。
/** @import {InputFrame} from '../data/types.js' */
/** @import {World} from './world.js' */
import { advanceTime } from '../core/time.js';
import { clamp, forwardXZ, rightXZ, yawOfXZ } from '../core/math.js';
import { compactEntities, savePrev } from './entities.js';
import { snapCamera, stepCamera } from './camera.js';

/**
 * 仮の移動（M0a）：平面上を、カメラ基準のスティック方向へ runSpeedMps×スティック量で等速移動するだけ。
 * 加減速・重力・衝突・跳躍・回避は M2a（02）で sim/player/ に作る。
 * @param {World} world @param {InputFrame} input
 */
function stepPlayerProvisional(world, input) {
  const p = world.player;
  const cfg = world.cfg;
  let sx = input.stick[0];
  let sy = input.stick[1];
  const m = Math.hypot(sx, sy);
  if (m > 1) {
    sx /= m;
    sy /= m;
  }
  if (m > 0) {
    const f = forwardXZ(world.camera.yawDeg);
    const r = rightXZ(world.camera.yawDeg);
    const speed = cfg.movement.runSpeedMps;
    p.vel[0] = (f[0] * sy + r[0] * sx) * speed;
    p.vel[2] = (f[2] * sy + r[2] * sx) * speed;
    p.yawDeg = yawOfXZ(p.vel[0], p.vel[2]);
    p.state = 'run';
  } else {
    p.vel[0] = 0;
    p.vel[2] = 0;
    p.state = 'idle';
  }
  const dt = p.scale / cfg.time.tickRateHz;
  const r = p.capsule.rM;
  // 仮：地図の外へ出ないように端で止める（本物の衝突は M2a）
  p.pos[0] = clamp(p.pos[0] + p.vel[0] * dt, r, world.stage.sizeM[0] - r);
  p.pos[2] = clamp(p.pos[2] + p.vel[2] * dt, r, world.stage.sizeM[1] - r);
}

/**
 * @param {World} world
 * @param {InputFrame} input
 */
export function stepWorld(world, input) {
  // 1. 入力を保存。前tickの状態を写す（補間用）。位置履歴（見切りの遡り用）は M4a で足す
  world.eventsOut.length = 0;
  world.input = input;
  savePrev(world.entities);
  snapCamera(world.camera);
  // 2. 時間：世界倍率と各エンティティの scale を決める
  advanceTime(world, world.cfg.time);
  // 3. プレイヤー
  stepPlayerProvisional(world, input);
  // 4〜7. 敵・弾・攻撃判定・ステージの処理（M2a 以降で足す）
  // 8. カメラ（実tickで更新）
  stepCamera(world.camera, world.player, input, world.cfg);
  // 9. 死んだエンティティを詰め、tick を進める
  compactEntities(world.entities);
  world.tick += 1;
}
