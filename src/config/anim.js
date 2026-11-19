// キャラの手続きアニメ（07 §6.6 の表）と骨組みの設定。描画側だけが読む（シムに影響しない）。
/** @import {ConfigTable} from '../data/types.js' */

/** @satisfies {ConfigTable} */
export const anim = {
  walkStrideM: { v: 0.7, min: 0.2, max: 3, step: 0.05, desc: '歩きの1歩の長さ（m。位相の速さ＝速度÷歩幅×π）' },
  runStrideM: { v: 1.6, min: 0.5, max: 4, step: 0.05, desc: '走りの1歩の長さ（m）' },
  walkThighDeg: { v: 25, min: 0, max: 90, step: 1, desc: '歩きの太ももの振り（deg）' },
  runThighDeg: { v: 45, min: 0, max: 90, step: 1, desc: '走りの太ももの振り（deg）' },
  walkKneeDeg: { v: 10, min: 0, max: 120, step: 1, desc: '歩きの膝の最大の曲げ（deg）' },
  runKneeDeg: { v: 70, min: 0, max: 120, step: 1, desc: '走りの膝の最大の曲げ（deg）' },
  walkArmDeg: { v: 15, min: 0, max: 90, step: 1, desc: '歩きの腕の振り（deg。脚と逆位相）' },
  runArmDeg: { v: 35, min: 0, max: 90, step: 1, desc: '走りの腕の振り（deg）' },
  walkBobM: { v: 0.03, min: 0, max: 0.2, step: 0.005, desc: '歩きの腰の上下（m）' },
  runBobM: { v: 0.06, min: 0, max: 0.2, step: 0.005, desc: '走りの腰の上下（m）' },
  walkLeanDeg: { v: 3, min: 0, max: 30, step: 1, desc: '歩きの前傾（deg）' },
  runLeanDeg: { v: 12, min: 0, max: 30, step: 1, desc: '走りの前傾（deg）' },
  idleBreathDeg: { v: 1.5, min: 0, max: 10, step: 0.1, desc: '待機の呼吸：胸の前後の傾き（deg）' },
  idleBreathS: { v: 4, min: 0.5, max: 10, step: 0.1, desc: '待機の呼吸の1回の長さ（s）' },
  walkBlendFromMps: { v: 2.5, min: 0, max: 10, step: 0.1, desc: 'この速さ（歩き）から走りの速さまでで、歩き→走りの動きを混ぜる（m/s。00_core 6章の歩き 2.5）' },
  // 二次的な揺れ（07 §6.5）：θ'' = −k(θ−θ0) − c·θ' − a·gainMul·springInputMul。c＝2·減衰比·√k
  springKRatio: { v: 120, min: 10, max: 600, step: 5, desc: 'ばねの強さ k（1/s²）' },
  springDampingRatio: { v: 0.4, min: 0.05, max: 2, step: 0.05, desc: 'ばねの減衰比' },
  springInputMul: { v: 30, min: 0, max: 200, step: 1, desc: '揺れの入力（親の加速度）に掛ける倍率。07 §6.5 の式のままだと揺れが1〜3°で見えないため足した（見た目で決めた値）' },
  springCatchupMaxCount: { v: 120, min: 1, max: 600, step: 1, desc: '描画の間に進んだ tick がこれより多ければ、揺れは最後のこの数だけ計算する（テストで一気に進めたとき）' },
  animTwosEnabled: { v: true, desc: '待機と歩きは2tickに1回だけ姿勢を更新する（手描き感）' },
};
