// キャラの造形と動きの設定（07 6章の表）。歩き・走りの行は M2a、技ポーズの入り抜けは M3a で使う。
/** @import {ConfigTable} from '../data/types.js' */

/** @satisfies {ConfigTable} */
export const anim = {
  // ---- 6.1 剛体スキンの分割 ----
  rigSegCount: { v: 8, min: 4, max: 24, step: 1, desc: '円柱・回転体の分割（個）' },
  rigPartSegs: { v: { torso: 10, head: 16, face: 16, hairBase: 16, hachimaki: 16 }, desc: '部品名ごとの分割（個）。胴は10。頭・顔・鉢巻は互いに突き抜けないよう細かくそろえる' },
  rigSphereRingCount: { v: 8, min: 3, max: 16, step: 1, desc: '球・顔の縦の分割（個）' },
  rigWeldEpsM: { v: 0.0001, min: 0.000001, max: 0.01, step: 0.0001, desc: '輪郭の法線を平均するとき、同じ位置とみなす距離（m）' },
  // ---- 6.5 二次的な揺れ ----
  springKRatio: { v: 120, min: 10, max: 400, step: 5, desc: 'ばねの強さ k（1/s²）' },
  springDampingRatio: { v: 0.4, min: 0, max: 2, step: 0.05, desc: 'ばねの減衰比' },
  springAccelMul: { v: 20, min: 0, max: 120, step: 1, desc: 'ばねへ入れる加速度の倍率（式どおりの1だと約2°しか揺れないため）' },
  springAccelMaxMps2: { v: 90, min: 1, max: 1000, step: 1, desc: 'ばねへ入れる加速度の上限（m/s²。瞬間移動で暴れないため）' },
  springResetGapF: { v: 600, min: 2, max: 3600, step: 1, desc: 'これより多くtickが飛んだら揺れを釣り合いへ戻す（f。それ以下なら飛んだ分を積分する）' },
  breezeAccelMps2: { v: 8, min: 0, max: 30, step: 0.5, desc: '待機のそよ風：揺れものへ掛ける加速度（m/s²）' },
  breezeAzimuthDeg: { v: 110, min: -180, max: 180, step: 5, desc: 'そよ風の吹いていく方位（deg。北から時計回り）' },
  breezeSwayS: { v: 2.6, min: 0.2, max: 20, step: 0.1, desc: 'そよ風の強弱の周期（s）' },
  breezeFlutterS: { v: 0.9, min: 0.1, max: 10, step: 0.05, desc: 'そよ風の細かなはためきの周期（s）' },
  breezeFlutterRatio: { v: 0.45, min: 0, max: 2, step: 0.05, desc: 'はためきの強さ（そよ風に対する割合）' },
  // ---- 6.6 手続きアニメ（移動・待機） ----
  walkStrideM: { v: 0.7, min: 0.1, max: 3, step: 0.05, desc: '歩き：1歩の長さ（m）' },
  runStrideM: { v: 1.6, min: 0.1, max: 4, step: 0.05, desc: '走り：1歩の長さ（m）' },
  walkThighDeg: { v: 25, min: 0, max: 90, step: 1, desc: '歩き：太ももの振り（deg）' },
  runThighDeg: { v: 45, min: 0, max: 90, step: 1, desc: '走り：太ももの振り（deg）' },
  walkKneeDeg: { v: 10, min: 0, max: 120, step: 1, desc: '歩き：膝の最大曲げ（deg）' },
  runKneeDeg: { v: 70, min: 0, max: 120, step: 1, desc: '走り：膝の最大曲げ（deg）' },
  walkArmDeg: { v: 15, min: 0, max: 90, step: 1, desc: '歩き：腕の振り（deg。脚と逆位相）' },
  runArmDeg: { v: 35, min: 0, max: 90, step: 1, desc: '走り：腕の振り（deg）' },
  walkBobM: { v: 0.03, min: 0, max: 0.3, step: 0.005, desc: '歩き：hips の上下（m）' },
  runBobM: { v: 0.06, min: 0, max: 0.3, step: 0.005, desc: '走り：hips の上下（m）' },
  walkLeanDeg: { v: 3, min: 0, max: 45, step: 1, desc: '歩き：前傾（deg）' },
  runLeanDeg: { v: 12, min: 0, max: 45, step: 1, desc: '走り：前傾（deg）' },
  idleBreathDeg: { v: 1.5, min: 0, max: 10, step: 0.1, desc: '待機：呼吸で chest を X 回転する幅（deg）' },
  idleBreathS: { v: 4.0, min: 0.5, max: 20, step: 0.1, desc: '待機：呼吸の周期（s）' },
  animTwosEnabled: { v: true, desc: '待機と歩きは2tickに1回更新（手描き感）' },
  animTwosF: { v: 2, min: 1, max: 8, step: 1, desc: '上の更新間隔（f）' },
  poseBlendInF: { v: 3, min: 0, max: 30, step: 1, desc: '技ポーズの入り（f）' },
  poseBlendOutF: { v: 6, min: 0, max: 30, step: 1, desc: '技ポーズの抜け（f）' },
  blinkMinS: { v: 3, min: 0.5, max: 20, step: 0.5, desc: 'まばたきの間隔の下限（s）' },
  blinkMaxS: { v: 5, min: 0.5, max: 20, step: 0.5, desc: 'まばたきの間隔の上限（s）' },
  blinkF: { v: 6, min: 1, max: 30, step: 1, desc: 'まばたきで目を閉じる長さ（f）' },
  hakamaOwnRatio: { v: 0.5, min: 0, max: 1, step: 0.05, desc: '袴の回転：自分の太ももの割合（残りは両脚の平均）' },
  // ---- 6.8 顔 ----
  faceLidUpperPx: { v: 7, min: 1, max: 20, step: 1, desc: '顔：上まぶたの線の太さ（px。128px のセルで）' },
  faceLidLowerPx: { v: 3, min: 1, max: 20, step: 1, desc: '顔：下まぶたの線の太さ（px）' },
  facePupilPx: { v: 14, min: 2, max: 40, step: 1, desc: '顔：瞳の直径（px）' },
  faceMouthPx: { v: 3, min: 1, max: 20, step: 1, desc: '顔：口の線の太さ（px）' },
  faceRowOpenCount: { v: 0, min: 0, max: 3, step: 1, desc: '顔アトラス：目を開いた顔の行（セル番号＋0）' },
  faceRowClosedCount: { v: 1, min: 0, max: 3, step: 1, desc: '顔アトラス：目を閉じた顔の行（セル番号＋4）' },
  faceRowPainCount: { v: 2, min: 0, max: 3, step: 1, desc: '顔アトラス：痛がる顔の行（セル番号＋8）' },
};
