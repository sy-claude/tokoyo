// 試験場（10 §4.5）。M0a は床（baseM）と開始点だけ。台・斜面・海などは M2a で足す。
/** @import {StageDef} from '../types.js' */

/** @type {StageDef} */
export const sandbox = {
  id: 'sandbox',
  name: '試験場',
  seed: 1,
  sizeM: [60, 60],
  cellM: 0.5,
  terrain: { gen: 'sandboxRects', params: { baseM: 0, rects: [], ramps: [] } },
  paths: [],
  seaLevelM: -3.5,
  zones: [],
  props: [],
  spawns: [],
  eseki: [],
  eiki: [],
  ryuketsu: [],
  bossId: '',
  // 夕日の方位（07 3.3）のためだけに置く。ゲームの機能は無い
  bossGate: { pos: [30, 0, 40], yawDeg: 0, gaugeReq: 0 },
  bossArena: { center: [30, 0, 58], rM: 1 },
  checkpoints: [],
  playerStart: { pos: [30, 0, 14], yawDeg: 0 },
};
