// 開発用の設定（09 10章、10 §4.4）。灰色の仮表示（M0a）の色と寸法もここに置く（M1 で本物の材質に置き換える）。
/** @import {ConfigTable} from '../data/types.js' */

/** @satisfies {ConfigTable} */
export const debug = {
  devMenuOn: { v: true, desc: '試験メニューを出す（M9b まで true、M10a で false）' },
  eventRingCount: { v: 2000, min: 100, max: 10000, step: 100, desc: 'テスト用に保持するイベントの件数' },
  fpsWindowS: { v: 1, min: 0.25, max: 5, step: 0.25, desc: 'FPS 表示の中央値をとる区間（s）' },
  overlayRefreshS: { v: 0.25, min: 0.05, max: 2, step: 0.05, desc: '数値表示の更新間隔（s）' },
  // ---- 灰色の仮表示（M0a） ----
  grayBgColor: { v: '#d9d9d6', desc: '仮：背景の色' },
  grayFloorColor: { v: '#9a9a96', desc: '仮：床の色' },
  grayGridColor: { v: '#5c5c5a', desc: '仮：格子の線の色' },
  grayCapsuleColor: { v: '#2e2d33', desc: '仮：カプセルの色' },
  grayGridStepM: { v: 1, min: 0.5, max: 10, step: 0.5, desc: '仮：格子の間隔（m）' },
  grayGridLinePx: { v: 1.5, min: 0.5, max: 4, step: 0.25, desc: '仮：格子の線の太さ（px）' },
  grayCapsuleSegCount: { v: 12, min: 6, max: 32, step: 1, desc: '仮：カプセルの分割（個）' },
  // ---- 試験場の灰色の表示（M2a）：地形・小道具・海、状態ごとの姿勢（07 §6.6 の手続きアニメの代わり。楓真の形は描画の移し替えで） ----
  grayCliffColor: { v: '#77746f', desc: '仮：急な斜面（崖）の色' },
  grayPropColor: { v: '#b4b2ac', desc: '仮：小道具（台・壁・柱）の色' },
  graySeaColor: { v: '#6f8296', desc: '仮：海の色' },
  grayNoseColor: { v: '#e2452b', desc: '仮：向きの印の色' },
  grayCliffSlopeRatio: { v: 0.7, min: 0, max: 1, step: 0.05, desc: '仮：面の法線の上向き成分がこれ未満を崖の色に' },
  grayNoseSizeM: { v: 0.18, min: 0.05, max: 0.5, step: 0.01, desc: '仮：向きの印の大きさ（m）' },
  poseJumpLeanDeg: { v: 10, min: -45, max: 45, step: 1, desc: '仮：空中の前傾（度）' },
  poseDashPitchDeg: { v: 75, min: 0, max: 90, step: 1, desc: '仮：神通足の前傾（度。水平の姿勢）' },
  poseStepLeanDeg: { v: -18, min: -45, max: 45, step: 1, desc: '仮：ステップの後傾（度）' },
  poseLandSquashRatio: { v: 0.85, min: 0.3, max: 1, step: 0.05, desc: '仮：着地の縮み（縦の倍率）' },
  poseLandHeavySquashRatio: { v: 0.65, min: 0.3, max: 1, step: 0.05, desc: '仮：重い着地の縮み（縦の倍率）' },
  poseFlipTurnDeg: { v: 360, min: 0, max: 720, step: 10, desc: '仮：宙返りの回転（度）' },
  poseSeaSinkM: { v: 2.0, min: 0, max: 5, step: 0.1, desc: '仮：海で沈む深さ（m）' },
};
