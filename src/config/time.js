// 時間の設定（09 4.2 の表）。
/** @import {ConfigTable} from '../data/types.js' */
import { TICK_RATE_HZ } from '../core/units.js';

/** @satisfies {ConfigTable} */
export const time = {
  tickRateHz: { v: TICK_RATE_HZ, min: TICK_RATE_HZ, max: TICK_RATE_HZ, step: 1, desc: '固定更新の回数（変更禁止）' },
  maxTicksPerFrameCount: { v: 5, min: 1, max: 10, step: 1, desc: '1描画で進める上限（回）' },
  frameDeltaClampS: { v: 0.25, min: 0.05, max: 1, step: 0.05, desc: '1描画で足す時間の上限（s）' },
  scaleQuantCount: { v: 4096, min: 4096, max: 4096, step: 1, desc: '倍率の量子化の分母（変更禁止）' },
  fuWorldMul: { v: 0.15, min: 0, max: 1, step: 0.01, desc: '符の構えの世界倍率' },
  mikiriSlowMul: { v: 0.3, min: 0, max: 1, step: 0.01, desc: '見切りの減速' },
};
