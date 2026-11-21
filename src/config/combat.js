// 戦闘の設定（03 §13 の表）。M2a は跳躍の先行入力が使う inputBufferF だけ。残りは M3a で写す。
/** @import {ConfigTable} from '../data/types.js' */

/** @satisfies {ConfigTable} */
export const combat = {
  inputBufferF: { v: 8, min: 0, max: 30, step: 1, desc: '先行入力（実tick）' },
};
