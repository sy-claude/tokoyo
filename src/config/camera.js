// カメラの設定（02 9.2 の表）。M0a は仮のカメラが使う行だけ。残りは M2b で写す。
/** @import {ConfigTable} from '../data/types.js' */

/** @satisfies {ConfigTable} */
export const camera = {
  camExploreDistM: { v: 5.0, min: 2, max: 12, step: 0.1, desc: '探索：距離（m）' },
  camExplorePivotHM: { v: 1.5, min: 0.5, max: 3, step: 0.05, desc: '探索：注視点の高さ（m）' },
  camPitchMinDeg: { v: -30, min: -80, max: 0, step: 1, desc: '縦角の下限（deg）' },
  camPitchMaxDeg: { v: 60, min: 0, max: 85, step: 1, desc: '縦角の上限（deg）' },
  camFovYDeg: { v: 55, min: 30, max: 90, step: 1, desc: '縦の視野角（deg）' },
  // ---- 仮（M0a）：描画距離。M1b で霧（07）の値に合わせて見直す ----
  camNearM: { v: 0.1, min: 0.01, max: 1, step: 0.01, desc: '仮：手前の描画限界（m）' },
  camFarM: { v: 400, min: 50, max: 2000, step: 10, desc: '仮：奥の描画限界（m）' },
};
