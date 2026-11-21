// 移動の試験の補助：試験場のワールドを作り、入力を流す（02 の受け入れ基準）。
import { makeCfg } from './cfg.js';
import { createSceneWorld, teleportPlayer } from '../../../src/sim/world.js';
import { stepWorld } from '../../../src/sim/step.js';
import { makeFrame } from '../../../src/input/synthetic.js';

export const cfg = makeCfg();

/** @param {string} [char] @param {[number, number, number]} [at] @param {number} [yawDeg] */
export function makeWorld(char = 'fuma', at = [30, 0, 14], yawDeg = 0) {
  const w = createSceneWorld('sandbox', { seed: 1, cfg, charId: char });
  teleportPlayer(w, at[0], at[1], at[2], yawDeg);
  return w;
}

/** ボタンの状態。 */
export const press = (id) => ({ [id]: { down: true, pressed: true, released: false, ageF: 0 } });
export const hold = (id) => ({ [id]: { down: true, pressed: false, released: false, ageF: 1 } });

/** 1tick 進める。o＝{stick, btn, camDeg}。 */
export function step(w, o = {}) {
  stepWorld(w, makeFrame(w.tick, o));
}

/** 水平の速さ。 */
export const hspeed = (w) => Math.hypot(w.player.vel[0], w.player.vel[2]);

/** 試験場の開始点から +Z へ走って最高速に。 */
export function runUp(w, n = 30) {
  for (let i = 0; i < n; i++) step(w, { stick: [0, 1] });
}
