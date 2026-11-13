// 入力の設定（09 5.4 と 01 2.11 の表）。M0a はキーボードとテスト入力が使う行だけ。残りは M0b で写す。
/** @import {ConfigTable} from '../data/types.js' */

/** @satisfies {ConfigTable} */
export const input = {
  inputAgeMaxF: { v: 4, min: 0, max: 8, step: 1, desc: '押下の遡りの上限（f）' },
  keyCamDegPs: { v: 120, min: 30, max: 360, step: 5, desc: '矢印キーのカメラ速度（deg/s）' },
  kbWalkMul: { v: 0.5, min: 0.1, max: 1, step: 0.05, desc: 'Shift 押下時のスティック量（倍）' },
  refViewPx: { v: [844, 390], desc: '基準端末の画面（CSS px）。合成入力の viewPx の既定と、e2e の視点' },
};
