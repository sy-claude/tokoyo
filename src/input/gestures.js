// タップとはじきの判定（01 2.5）。純関数。指の記録（PointerRec）と配置（Layout）と設定の値から決める。
/** @import {Layout} from './layout.js' */
import { MS_PER_S } from '../core/units.js';
import { buttonClearance } from './layout.js';

/**
 * @typedef {{tapMaxMovePx:number, tapMaxS:number, tapBtnClearancePx:number,
 *   flickWindowS:number, flickMinPx:number, flickAxisMul:number}} GestureCfg
 */

/**
 * カメラの指を離したときに、注目用のタップか（01 2.5 の4条件）。
 * @param {{maxMovePx:number, downT:number}} rec
 * @param {number} upX @param {number} upY @param {number} upT  離した時刻（ms、e.timeStamp）
 * @param {Layout} layout @param {GestureCfg} cfg
 * @param {boolean} [fuStance]  符の構え中
 */
export function isTap(rec, upX, upY, upT, layout, cfg, fuStance = false) {
  if (fuStance) return false;
  if (!(rec.maxMovePx < cfg.tapMaxMovePx)) return false;
  if (!(upT - rec.downT < cfg.tapMaxS * MS_PER_S)) return false;
  return buttonClearance(layout, upX, upY) >= cfg.tapBtnClearancePx;
}

/**
 * はじきの判定（01 2.5）。down から flickWindowS 以内に、横に flickMinPx 以上、かつ |dx| ≥ flickAxisMul×|dy|。
 * 1回のドラッグで1回まで（flickDone は呼ぶ側が持つ）。
 * @param {{downX:number, downY:number, downT:number, flickDone:boolean}} rec
 * @param {number} x @param {number} y @param {number} t  今の位置と時刻（ms）
 * @param {GestureCfg} cfg
 * @returns {-1|0|1}
 */
export function flickOf(rec, x, y, t, cfg) {
  if (rec.flickDone) return 0;
  if (t - rec.downT > cfg.flickWindowS * MS_PER_S) return 0;
  const dx = x - rec.downX;
  const dy = y - rec.downY;
  if (Math.abs(dx) < cfg.flickMinPx) return 0;
  if (Math.abs(dx) < cfg.flickAxisMul * Math.abs(dy)) return 0;
  return dx > 0 ? 1 : -1;
}
