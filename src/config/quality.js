// 品質段階の設定（09 8.9 の表）。M0a は DPR の上限と描画命令の上限だけ。残りは M1b で写す。
/** @import {ConfigTable} from '../data/types.js' */

/** @satisfies {ConfigTable} */
export const quality = {
  dprMaxMul: { v: { high: 1.5, mid: 1.25, low: 1.0 }, desc: 'DPR の上限（倍。高／中／低）' },
  drawCallMaxCount: { v: 110, min: 10, max: 500, step: 1, desc: '戦闘中の描画命令の上限（回。テスト）' },
};
