// 試験場（10 §4.5）。座標は原点＝北西の角、+X 東、+Z 南。台は床 y=0 に置く。
// 地形：rects＝[x0,z0,x1,z1,h,…]、ramps＝[x0,z0,x1,z1,h0,h1,…]（+z 方向に h0→h1）。頂点が範囲に入ればその高さ（後に書いたものが上書き）。
/** @import {StageDef} from '../types.js' */

/** S2 の隙間（台A の中心 x=16、台B の中心 x=20+隙間）。[隙間(m), z] */
const GAPS = [[2.5, 24], [3.9, 30], [6.0, 36], [8.3, 42], [10.0, 48]];

/** @type {StageDef} */
export const sandbox = {
  id: 'sandbox',
  name: '試験場',
  seed: 1,
  sizeM: [60, 60],
  cellM: 0.5,
  terrain: {
    gen: 'sandboxRects',
    params: {
      baseM: 0,
      rects: [
        0, 0, 60, 10, -6.0, // T1 海（水面 −3.5、縁は z=10）
        50, 10, 60, 60, -3.0, // T2 下段（落差3m、縁は x=50）
        2, 18, 6, 20, 3.86, // T3 44° の斜面の上の平ら
        8, 18, 12, 20, 4.14, // T3 46° の斜面の上の平ら
      ],
      ramps: [
        2, 14, 6, 18, 0, 3.86, // T3 44°
        8, 14, 12, 18, 0, 4.14, // T3 46°
      ],
    },
  },
  paths: [],
  seaLevelM: -3.5,
  zones: [],
  props: [
    // S1 段差
    { id: 's1a', prop: 'sbStep040', pos: [16, 0, 16], zone: 0 },
    { id: 's1b', prop: 'sbStep041', pos: [19, 0, 16], zone: 0 },
    { id: 's1c', prop: 'sbStep100', pos: [22, 0, 16], zone: 0 },
    { id: 's1d', prop: 'sbStep180', pos: [25, 0, 16], zone: 0 },
    { id: 's1e', prop: 'sbStep240', pos: [28, 0, 16], zone: 0 },
    // S2 隙間（台A・台B）
    ...GAPS.flatMap(([gap, z], i) => [
      { id: `s2a${i}`, prop: 'sbPlat', pos: /** @type {[number,number,number]} */ ([16, 0, z]), zone: 0 },
      { id: `s2b${i}`, prop: 'sbPlat', pos: /** @type {[number,number,number]} */ ([20 + gap, 0, z]), zone: 0 },
    ]),
    // S3 壁
    { id: 's3a', prop: 'sbWall340', pos: [41, 0, 20], zone: 0 },
    { id: 's3b', prop: 'sbWall360', pos: [41, 0, 26], zone: 0 },
    // S4 カメラ
    { id: 's4a', prop: 'sbBlock3', pos: [40, 0, 34], zone: 0 },
    { id: 's4b', prop: 'sbPillar03', pos: [40, 0, 40], zone: 0 },
    { id: 's4c', prop: 'sbPillar05', pos: [44, 0, 40], zone: 0 },
  ],
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
