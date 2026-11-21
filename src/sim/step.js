// 1tick の更新（09 4.3）。stepWorld(world, input) がシムの唯一の入口（不変条件4）。
/** @import {InputFrame} from '../data/types.js' */
/** @import {World} from './world.js' */
import { advanceTime } from '../core/time.js';
import { compactEntities, savePrev } from './entities.js';
import { snapCamera, stepCamera } from './camera.js';
import { stepPlayer } from './player/fsm.js';

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
  stepPlayer(world, input);
  // 4〜7. 敵・弾・攻撃判定・ステージの処理（M3a 以降で足す。海と安全地点は stepPlayer の中＝stageLogic/sea）
  // 8. カメラ（実tickで更新）
  // 海へ落ちている間は追従を止める（02 §5 の3。camera.mode='sea'）
  if (world.camera.mode !== 'sea') stepCamera(world.camera, world.player, input, world.cfg);
  // 9. 死んだエンティティを詰め、tick を進める
  compactEntities(world.entities);
  world.tick += 1;
}
