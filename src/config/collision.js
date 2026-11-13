// 衝突の設定（09 6章の表）。衝突そのものは M2a で作る。M0a で使うのは仮のカプセル寸法だけ。
/** @import {ConfigTable} from '../data/types.js' */

/** @satisfies {ConfigTable} */
export const collision = {
  terrainCellM: { v: 0.5, min: 0.25, max: 2, step: 0.25, desc: '高さ格子の間隔（m）' },
  shapeGridCellM: { v: 4, min: 1, max: 16, step: 1, desc: '静的形状の索引の升（m）' },
  stepUpM: { v: 0.4, min: 0, max: 1, step: 0.01, desc: '登れる段差（m）' },
  stepDownM: { v: 0.4, min: 0, max: 1, step: 0.01, desc: '下り坂で吸着する段差（m）' },
  collisionEpsM: { v: 0.000001, min: 0, max: 0.001, step: 0.000001, desc: '境界の比較の誤差（m）' },
  slopeMaxDeg: { v: 45, min: 10, max: 80, step: 1, desc: 'これを超える斜面は壁（deg）' },
  pushIterCount: { v: 3, min: 1, max: 8, step: 1, desc: '押し出しの反復（回）' },
  projStepM: { v: 0.25, min: 0.05, max: 1, step: 0.05, desc: '弾の刻み（m）' },
  camProbeRM: { v: 0.25, min: 0.05, max: 1, step: 0.05, desc: 'カメラの球の半径（m）' },
  camStepM: { v: 0.25, min: 0.05, max: 1, step: 0.05, desc: 'カメラの刻み（m）' },
  camThinPillarRM: { v: 0.4, min: 0, max: 2, step: 0.05, desc: 'これ未満の円柱はカメラを通す（m）' },
  seaFallDepthM: { v: 0.3, min: 0, max: 2, step: 0.05, desc: '足が水面よりこれだけ下で落下（m）' },
  safePointEveryF: { v: 30, min: 1, max: 300, step: 1, desc: '安全地点の記録間隔（実tick）' },
  safeEdgeDistM: { v: 1.5, min: 0, max: 5, step: 0.1, desc: '安全地点に必要な崖・海からの距離（m）' },
  knockbackEdgeStopM: { v: 1.0, min: 0, max: 5, step: 0.1, desc: '被弾の吹き飛びを止める崖・海からの距離（m）' },
  // ---- 仮（M0a）：キャラのデータが入る M2a で CharacterDef.capsule に置き換える。値は楓真（06 1.2）と同じ ----
  m0CapsuleRM: { v: 0.35, min: 0.1, max: 1, step: 0.01, desc: '仮：カプセルの半径（m）' },
  m0CapsuleHM: { v: 1.7, min: 0.5, max: 3, step: 0.01, desc: '仮：カプセルの高さ（m）' },
};
