// 移動の設定（02 9.1 の表）。M0a は走りの速さだけ。残りは M2a で写す。
/** @import {ConfigTable} from '../data/types.js' */

/** @satisfies {ConfigTable} */
export const movement = {
  runSpeedMps: { v: 6.5, min: 1, max: 15, step: 0.1, desc: '走りの速さ（m/s）' },
};
