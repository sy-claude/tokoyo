// 開発用の設定（09 10章、10 §4.4）。灰色の仮の床（M0a）の色と寸法もここに置く（M1b で地形の材質に置き換える）。
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
  grayGridStepM: { v: 1, min: 0.5, max: 10, step: 0.5, desc: '仮：格子の間隔（m）' },
  grayGridLinePx: { v: 1.5, min: 0.5, max: 4, step: 0.25, desc: '仮：格子の線の太さ（px）' },
};
