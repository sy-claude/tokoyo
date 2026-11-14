// 入力の設定（09 5.4 と 01 2.11 の表）。重なるキーは 09 5.4 の名前が正本。
/** @import {ConfigTable} from '../data/types.js' */

/** @satisfies {ConfigTable} */
export const input = {
  // ---- 09 5.4 ----
  inputAgeMaxF: { v: 4, min: 0, max: 8, step: 1, desc: '押下の遡りの上限（f）' },
  attackCamSlidePx: { v: 28, min: 8, max: 80, step: 1, desc: '攻撃の指がカメラになる距離（px）' },
  ougiOutPx: { v: 72, min: 20, max: 200, step: 1, desc: '奥義の取消域に入る距離（px）' },
  ougiBackPx: { v: 56, min: 10, max: 200, step: 1, desc: '奥義の取消域から戻る距離（px）' },
  fuStartRadiusPx: { v: 44, min: 10, max: 100, step: 1, desc: '五芒星：始点の判定半径（px。M2.5）' },
  fuNextRadiusPx: { v: 40, min: 10, max: 100, step: 1, desc: '五芒星：次の点の判定半径（px。M2.5）' },
  fuMagnetRadiusPx: { v: 60, min: 10, max: 150, step: 1, desc: '五芒星：吸着の半径（px。M2.5）' },
  fuMagnetDeg: { v: 25, min: 0, max: 90, step: 1, desc: '五芒星：吸着の角度差（deg。M2.5）' },
  fuDirMinPx: { v: 12, min: 1, max: 60, step: 1, desc: '五芒星：進行方向を取る標本の最小距離（px。M2.5）' },
  keyCamDegPs: { v: 120, min: 30, max: 360, step: 5, desc: '矢印キーのカメラ速度（deg/s）' },
  // ---- 01 2.11 ----
  inputMaxPointersCount: { v: 4, min: 1, max: 10, step: 1, desc: '追跡する指の上限（本）' },
  attackDragCamMul: { v: 0.8, min: 0.1, max: 2, step: 0.05, desc: '攻撃ドラッグのカメラ感度（倍）' },
  tapMaxMovePx: { v: 12, min: 1, max: 60, step: 1, desc: 'タップの移動上限（px、未満）' },
  tapMaxS: { v: 0.25, min: 0.05, max: 1, step: 0.01, desc: 'タップの時間上限（s、未満）' },
  tapBtnClearancePx: { v: 24, min: 0, max: 80, step: 1, desc: 'タップ：ボタン判定の縁からの距離（px）' },
  flickWindowS: { v: 0.18, min: 0.05, max: 1, step: 0.01, desc: 'はじきの時間窓（s）' },
  flickMinPx: { v: 40, min: 5, max: 200, step: 1, desc: 'はじきの横移動（px）' },
  flickAxisMul: { v: 2.0, min: 1, max: 5, step: 0.1, desc: 'はじき：横÷縦の下限（倍）' },
  fuCancelTapMaxS: { v: 0.3, min: 0.05, max: 1, step: 0.01, desc: '構えの取消タップの時間（s。M2.5）' },
  fuCancelTapMovePx: { v: 16, min: 1, max: 60, step: 1, desc: '構えの取消タップの移動（px。M2.5）' },
  kbWalkMul: { v: 0.5, min: 0.1, max: 1, step: 0.05, desc: 'Shift 押下時のスティック量（倍）' },
  vibStarCaptureS: { v: 0.01, min: 0, max: 0.2, step: 0.005, desc: '振動：点を捕まえた（s、Android。M2.5）' },
  vibMikiriPatternS: { v: [0.02, 0.03, 0.02], desc: '振動：見切り（s の列。M4a）' },
  vibHurtS: { v: 0.03, min: 0, max: 0.2, step: 0.005, desc: '振動：被弾（s。M3b）' },
  vibFuhaS: { v: 0.04, min: 0, max: 0.2, step: 0.005, desc: '振動：封破（s。M5a）' },
  // ---- 試験用 ----
  refViewPx: { v: [844, 390], desc: '基準端末の画面（CSS px）。合成入力の viewPx の既定と、e2e の視点' },
};
