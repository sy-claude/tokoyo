// 見た目の試作（V1。?scene=lookdev）。参考画像（design-notes/lookdev/reference.png）の構図を3Dで再現する場面。
// シムは試験場と同じ「平らな床の上を歩く」だけ。歩ける範囲＝この矩形（参道の平らな部分。鳥居の少し先まで）。
// 見た目（地形・鳥居・海など）は src/data/lookdev/ の記述から描画側が作る。原点は playerStart。
/** @import {StageDef} from '../types.js' */

/** @type {StageDef} */
export const lookdev = {
  id: 'lookdev',
  name: '見た目の試作',
  seed: 7,
  sizeM: [5.6, 16.3],
  cellM: 0.5,
  terrain: { gen: 'sandboxRects', params: { baseM: 0, rects: [], ramps: [] } },
  paths: [],
  seaLevelM: -3,
  zones: [],
  props: [],
  spawns: [],
  eseki: [],
  eiki: [],
  ryuketsu: [],
  bossId: '',
  bossGate: { pos: [2.8, 0, 14], yawDeg: 0, gaugeReq: 0 },
  bossArena: { center: [2.8, 0, 16], rM: 1 },
  checkpoints: [],
  playerStart: { pos: [2.8, 0, 7], yawDeg: 0 },
  // 参考画像の構図：主人公の後ろ姿が中央下、水平線は画面中央の少し上
  cameraView: { distM: 6.3, pivotHM: 2.2, pitchDeg: 3.2, fovYDeg: 55 },
};
