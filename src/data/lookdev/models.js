// 見た目の試作（lookdev）の形の表。部品（box・cyl・sph・lathe・tube・ribbon・fan・group・ref）を並べて1体を作る。
// 単位は m・度。模型の正面は +Z、足元（底面の中心）が原点。色は palette の名前か '#rrggbb'。
// fx＝[苔, 塗りのはげ, 石畳, 発光]。anim＝[動きの種類, 重み, 位相]（1=風 2・3=脚 4=腕 5=布）。
// 参考画像（design-notes/lookdev/reference.png）を見て決めた形（設計書に無い「見た目の創作部分」）。

const STONE_FX = [0.75, 0, 1, 0];
const TORII_FX = [0.3, 0.55, 0, 0];

export const models = {
  // ---- 朱の大鳥居（明神鳥居。笠木が反り、塗りがはげ、屋根に苔） ----
  toriiMain: {
    parts: [
      { s: 'cyl', r: [0.78, 0.64], h: 0.5, seg: 12, at: [2.3, 0, 0], col: 'stone', col2: 'stoneHi', fx: STONE_FX, jitter: 0.06, jfreq: 2 },
      { s: 'cyl', r: [0.78, 0.64], h: 0.5, seg: 12, at: [-2.3, 0, 0], col: 'stone', col2: 'stoneHi', fx: STONE_FX, jitter: 0.06, jfreq: 2, seed: 4 },
      { s: 'cyl', r: [0.48, 0.4], h: 5.5, seg: 14, hseg: 8, at: [2.3, 0.3, 0], rot: [0, 0, 1.8], col: 'toriiRedLo', col2: 'toriiRedHi', fx: TORII_FX, jitter: 0.03, jfreq: 1.2 },
      { s: 'cyl', r: [0.48, 0.4], h: 5.5, seg: 14, hseg: 8, at: [-2.3, 0.3, 0], rot: [0, 0, -1.8], col: 'toriiRedLo', col2: 'toriiRedHi', fx: TORII_FX, jitter: 0.03, jfreq: 1.2, seed: 9 },
      // 貫（柱を貫いて外へ出る）と楔
      { s: 'box', size: [6.9, 0.56, 0.42], at: [0, 4.02, 0], col: 'toriiRed', fx: TORII_FX, segs: [6, 1, 1] },
      { s: 'box', size: [0.2, 0.3, 0.6], at: [1.72, 4.6, 0], rot: [0, 0, 12], col: 'toriiRedLo', fx: TORII_FX },
      { s: 'box', size: [0.2, 0.3, 0.6], at: [-1.72, 4.6, 0], rot: [0, 0, -12], col: 'toriiRedLo', fx: TORII_FX },
      // 額束
      { s: 'box', size: [0.5, 0.82, 0.36], at: [0, 4.58, 0], col: 'toriiRed', fx: TORII_FX },
      // 島木と笠木（両端が反り上がる）、黒ずんだ屋根
      { s: 'box', size: [7.3, 0.5, 0.62], at: [0, 5.34, 0], col: 'toriiRed', col2: 'toriiRedHi', fx: TORII_FX, segs: [14, 1, 1], bendY: 0.34 },
      { s: 'box', size: [7.9, 0.36, 0.86], at: [0, 5.83, 0], col: 'toriiRedLo', col2: 'toriiRoof', fx: [0.75, 0.35, 0, 0], segs: [14, 1, 1], bendY: 0.44 },
      { s: 'box', size: [8.1, 0.1, 1.0], at: [0, 6.18, 0], col: 'toriiRoof', fx: [0.9, 0.2, 0, 0], segs: [14, 1, 1], bendY: 0.47 },
      // 柱に絡む蔦
      { s: 'tube', path: [[2.6, 0.4, 0.34], [2.1, 1.6, 0.42], [2.66, 2.8, 0.26], [2.2, 4.0, 0.36], [1.6, 4.5, 0.26]], r: [0.035, 0.015], col: 'vine' },
      { s: 'tube', path: [[-2.0, 4.4, 0.24], [-1.2, 4.1, 0.28], [-0.4, 4.05, 0.24]], r: [0.03, 0.012], col: 'vine' },
      { s: 'tube', path: [[-2.6, 0.5, -0.3], [-2.75, 1.8, -0.1], [-2.2, 2.9, 0.38], [-2.7, 3.9, 0.2]], r: [0.03, 0.012], col: 'vine' },
    ],
  },
  // ---- 千本鳥居の1基（遠景用の簡単な形） ----
  toriiSmall: {
    parts: [
      { s: 'box', size: [0.2, 2.5, 0.2], at: [0.95, 0, 0], col: 'toriiFar', fx: [0, 0.35, 0, 0] },
      { s: 'box', size: [0.2, 2.5, 0.2], at: [-0.95, 0, 0], col: 'toriiFar', fx: [0, 0.35, 0, 0] },
      { s: 'box', size: [2.5, 0.16, 0.16], at: [0, 1.95, 0], col: 'toriiFar', fx: [0, 0.35, 0, 0] },
      { s: 'box', size: [3.0, 0.24, 0.3], at: [0, 2.42, 0], col: 'toriiFar', col2: 'toriiRoof', fx: [0.3, 0.35, 0, 0] },
    ],
  },
  // ---- 石灯籠（大。小は scale で縮める） ----
  lantern: {
    parts: [
      { s: 'cyl', r: [0.62, 0.55], h: 0.22, seg: 6, at: [0, 0, 0], col: 'stone', fx: STONE_FX, jitter: 0.04, jfreq: 2 },
      { s: 'cyl', r: [0.45, 0.3], h: 0.24, seg: 6, at: [0, 0.22, 0], col: 'stone', fx: STONE_FX },
      { s: 'cyl', r: [0.21, 0.19], h: 0.95, seg: 8, hseg: 3, at: [0, 0.46, 0], col: 'stone', col2: 'stoneHi', fx: STONE_FX, jitter: 0.02, jfreq: 3 },
      { s: 'cyl', r: [0.3, 0.52], h: 0.2, seg: 6, at: [0, 1.41, 0], col: 'stone', fx: STONE_FX },
      { s: 'box', size: [0.56, 0.5, 0.56], at: [0, 1.61, 0], col: 'stoneHi', fx: [0.4, 0, 0, 0] },
      { s: 'box', size: [0.3, 0.32, 0.6], at: [0, 1.7, 0], col: 'lampGlow', fx: [0, 0, 0, 0.75] },
      { s: 'box', size: [0.6, 0.32, 0.3], at: [0, 1.7, 0], col: 'lampGlow', fx: [0, 0, 0, 0.75] },
      { s: 'cyl', r: [0.86, 0.2], h: 0.42, seg: 6, at: [0, 2.11, 0], col: 'stoneDark', col2: 'stone', fx: [0.6, 0, 0, 0], jitter: 0.04, jfreq: 2 },
      { s: 'cyl', r: [0.9, 0.86], h: 0.07, seg: 6, at: [0, 2.06, 0], col: 'stoneDark', fx: [0.6, 0, 0, 0] },
      { s: 'sph', r: [0.16, 0.2, 0.16], seg: 8, at: [0, 2.66, 0], col: 'stone', fx: STONE_FX },
    ],
  },
  // ---- 大きな石灯籠（苔むした石積みの上） ----
  lanternBig: {
    parts: [
      { s: 'sph', r: [1.0, 0.5, 0.95], seg: 16, at: [0, 0.2, 0], col: 'rockDark', col2: 'rockHi', fx: [0.6, 0, 1, 0], jitter: 0.3, jfreq: 1.4, seed: 61, joct: 5 },
      { s: 'sph', r: [0.6, 0.4, 0.55], seg: 12, at: [0.75, 0.15, -0.5], col: 'rock', col2: 'rockHi', fx: [0.55, 0, 1, 0], jitter: 0.22, jfreq: 1.8, seed: 63, joct: 5 },
      { s: 'sph', r: [0.5, 0.35, 0.5], seg: 12, at: [-0.7, 0.12, -0.45], col: 'rock', col2: 'rockHi', fx: [0.55, 0, 1, 0], jitter: 0.2, jfreq: 1.9, seed: 65, joct: 5 },
      { s: 'ref', model: 'lantern', at: [0, 0.52, 0] },
    ],
  },
  // ---- 注連縄の巨岩 ----
  iwakura: {
    parts: [
      { s: 'sph', r: [2.45, 2.5, 2.15], seg: 40, at: [0, 1.85, 0], col: 'rock', col2: 'rockHi', fx: [0.32, 0, 1, 0], jitter: 0.6, jfreq: 0.7, seed: 3, joct: 5 },
      { s: 'sph', r: [1.5, 1.0, 1.4], seg: 20, at: [1.9, 0.5, -1.3], col: 'rock', col2: 'rockHi', fx: [0.35, 0, 1, 0], jitter: 0.4, jfreq: 0.8, seed: 5, joct: 5 },
      { s: 'sph', r: [1.2, 0.8, 1.2], seg: 18, at: [-0.6, 0.4, -2.2], col: 'rock', col2: 'rockHi', fx: [0.35, 0, 1, 0], jitter: 0.35, jfreq: 0.9, seed: 7, joct: 5 },
      // 注連縄（岩を一周。手前で少したるむ）
      { s: 'tube', seg: 40, rseg: 7, r: 0.075, col: 'straw', col2: 'strawHi',
        path: [[2.62, 2.6, 0.2], [2.15, 2.3, -1.45], [0.9, 2.05, -2.33], [-0.8, 2.15, -2.33], [-2.2, 2.45, -1.25], [-2.58, 2.7, 0.3], [-1.75, 2.8, 1.75], [0, 2.85, 2.28], [1.85, 2.75, 1.62], [2.62, 2.6, 0.2]] },
      // 紙垂（白い紙。手前側に4枚）と房
      { s: 'ref', model: 'shide', at: [1.75, 2.08, -2.0], rot: [0, 40, 0] },
      { s: 'ref', model: 'shide', at: [0.75, 1.94, -2.46], rot: [0, 12, 0] },
      { s: 'ref', model: 'shide', at: [-0.35, 1.96, -2.5], rot: [0, -8, 0] },
      { s: 'ref', model: 'shide', at: [-1.5, 2.1, -2.1], rot: [0, -35, 0] },
    ],
  },
  shide: {
    parts: [
      { s: 'ribbon', smooth: false, w: 0.15, side: [1, 0, 0], col: 'paperWhite', anim: [1, 0.25, 0], animGrad: [0, 0.5],
        path: [[0, 0, 0], [0.0, -0.2, -0.02], [0.14, -0.2, -0.04], [0.14, -0.42, -0.05], [0.0, -0.42, -0.07], [0.0, -0.66, -0.08], [0.14, -0.66, -0.1], [0.14, -0.9, -0.1]] },
    ],
  },
  // ---- 岩（小。散らす用） ----
  rockA: { parts: [{ s: 'sph', r: [0.9, 0.6, 0.75], seg: 18, at: [0, 0.3, 0], col: 'rock', col2: 'rockHi', fx: [0.35, 0, 1, 0], jitter: 0.28, jfreq: 1.3, seed: 2, joct: 5 }] },
  rockB: { parts: [{ s: 'sph', r: [0.7, 0.75, 0.6], seg: 18, at: [0, 0.35, 0], col: 'rockDark', col2: 'rock', fx: [0.3, 0, 1, 0], jitter: 0.25, jfreq: 1.6, seed: 11, joct: 5 }] },
  rockC: { parts: [{ s: 'sph', r: [1.5, 0.85, 1.1], seg: 18, at: [0, 0.3, 0], col: 'rock', col2: 'rockHi', fx: [0.35, 0, 1, 0], jitter: 0.4, jfreq: 0.9, seed: 21, joct: 5 }] },
  rockShore: { parts: [{ s: 'sph', r: [1.3, 1.0, 1.1], seg: 18, at: [0, 0.2, 0], col: 'rockWet', col2: 'rock', fx: [0.15, 0, 1, 0], jitter: 0.45, jfreq: 1.0, seed: 31, joct: 5 }] },
  pebbleA: { parts: [{ s: 'sph', r: [0.9, 0.6, 0.75], seg: 9, at: [0, 0.3, 0], col: 'rock', col2: 'rockHi', fx: [0.35, 0, 1, 0], jitter: 0.28, jfreq: 1.3, seed: 2, joct: 4 }] },
  pebbleB: { parts: [{ s: 'sph', r: [0.7, 0.75, 0.6], seg: 9, at: [0, 0.35, 0], col: 'rockDark', col2: 'rockHi', fx: [0.3, 0, 1, 0], jitter: 0.25, jfreq: 1.6, seed: 11, joct: 4 }] },
  // ---- 茂み（枯れかけの低木・紅葉の残る低木） ----
  bush: { parts: [
    { s: 'sph', r: [0.9, 0.6, 0.8], seg: 12, at: [0, 0.45, 0], col: 'bushGreen', col2: 'bushGreenHi', jitter: 0.45, jfreq: 1.6, joct: 4, seed: 41 },
    { s: 'sph', r: [0.55, 0.45, 0.5], seg: 10, at: [0.6, 0.35, 0.3], col: 'bushGreen', col2: 'bushGreenHi', jitter: 0.3, jfreq: 2.2, joct: 4, seed: 43 },
  ] },
  bushRed: { parts: [
    { s: 'sph', r: [0.8, 0.65, 0.75], seg: 12, at: [0, 0.5, 0], col: 'bushRed', col2: 'bushRedHi', jitter: 0.5, jfreq: 1.7, joct: 4, seed: 51 },
    { s: 'sph', r: [0.5, 0.4, 0.5], seg: 10, at: [-0.55, 0.3, 0.2], col: 'bushRed', col2: 'bushRedHi', jitter: 0.3, jfreq: 2.3, joct: 4, seed: 53 },
  ] },
  // ---- 傾いた電柱 ----
  pole: {
    parts: [
      { s: 'cyl', r: [0.14, 0.1], h: 7.6, seg: 7, hseg: 4, at: [0, -0.4, 0], col: 'poleWood', col2: 'poleWoodHi', jitter: 0.015, jfreq: 2 },
      { s: 'box', size: [1.7, 0.1, 0.1], at: [0, 6.6, 0.1], col: 'poleWood' },
      { s: 'box', size: [1.2, 0.09, 0.09], at: [0, 6.0, 0.1], col: 'poleWood' },
      { s: 'cyl', r: 0.05, h: 0.14, seg: 5, at: [0.7, 6.7, 0.1], col: 'paperWhite' },
      { s: 'cyl', r: 0.05, h: 0.14, seg: 5, at: [-0.7, 6.7, 0.1], col: 'paperWhite' },
      { s: 'cyl', r: 0.05, h: 0.14, seg: 5, at: [0.1, 6.7, 0.1], col: 'paperWhite' },
      { s: 'cyl', r: [0.16, 0.16], h: 0.5, seg: 7, at: [0.22, 5.2, 0], col: 'poleMetal' },
    ],
  },
  // ---- 防波堤と消波ブロック ----
  breakwater: {
    parts: [
      { s: 'box', size: [11, 2.6, 1.6], at: [0, -1.2, 0], col: 'concrete', col2: 'concreteHi', fx: [0.25, 0, 0, 0] },
      { s: 'box', size: [11.3, 0.25, 1.9], at: [0, 1.4, 0], col: 'concreteHi', fx: [0.15, 0, 0, 0] },
      { s: 'box', size: [3.5, 2.2, 1.4], at: [-6.6, -1.2, 0.9], rot: [0, 24, 0], col: 'concrete', col2: 'concreteHi', fx: [0.25, 0, 0, 0] },
      { s: 'ref', model: 'tetra', at: [-4.2, -0.9, -1.6] },
      { s: 'ref', model: 'tetra', at: [-2.4, -1.0, -1.9], rot: [20, 70, 0] },
      { s: 'ref', model: 'tetra', at: [-5.8, -1.1, -1.2], rot: [-15, 140, 10] },
      { s: 'ref', model: 'tetra', at: [-7.6, -1.0, -0.4], rot: [10, 30, -20] },
      { s: 'ref', model: 'tetra', at: [-0.6, -1.1, -1.7], rot: [0, 200, 15] },
    ],
  },
  tetra: {
    parts: [
      { s: 'cyl', r: [0.42, 0.28], h: 1.0, seg: 6, col: 'concrete', col2: 'concreteHi' },
      { s: 'cyl', r: [0.42, 0.28], h: 1.0, seg: 6, at: [0, 0.2, 0], rot: [0, 0, 110], col: 'concrete' },
      { s: 'cyl', r: [0.42, 0.28], h: 1.0, seg: 6, at: [0, 0.2, 0], rot: [0, 120, 110], col: 'concrete' },
      { s: 'cyl', r: [0.42, 0.28], h: 1.0, seg: 6, at: [0, 0.2, 0], rot: [0, 240, 110], col: 'concrete' },
    ],
  },
  // ---- 灯台（遠景） ----
  lighthouse: {
    parts: [
      { s: 'cyl', r: [1.5, 1.05], h: 9, seg: 10, col: 'lighthouse', col2: 'paperWhite' },
      { s: 'cyl', r: [1.5, 1.5], h: 0.3, seg: 10, at: [0, 9, 0], col: 'stoneDark' },
      { s: 'cyl', r: [0.85, 0.85], h: 1.5, seg: 8, at: [0, 9.3, 0], col: 'lampGlow', fx: [0, 0, 0, 0.5] },
      { s: 'cyl', r: [1.15, 0.1], h: 1.1, seg: 8, at: [0, 10.8, 0], col: 'stoneDark' },
      { s: 'box', size: [3.5, 2.2, 2.6], at: [2.6, 0, 0], col: 'lighthouse' },
    ],
  },
  // ---- 石段の1段 ----
  step: { parts: [{ s: 'box', size: [4.4, 0.5, 1.15], at: [0, -0.32, 0], col: 'pave', col2: 'paveHi', fx: [0.5, 0, 1, 0], jitter: 0.03, jfreq: 2, segs: [4, 1, 1] }] },

  // ---- 主人公（後ろ姿。萌葱の羽織・墨色の袴・白い鉢巻の尾・長巻） ----
  hero: {
    parts: [
      // 脚（ひだのある袴。裾へ広がる）＋脚絆＋草鞋。kind 2＝左、3＝右
      { s: 'group', anim: [2, 0, 0], parts: [
        { s: 'cyl', r: [0.275, 0.15], h: 0.9, seg: 24, hseg: 3, at: [0.115, 0.12, 0], scale: [1, 1, 0.95], col: 'hakamaLo', col2: 'hakama', flute: [6, 0.17, 0.9], ao: 1.5 },
        { s: 'cyl', r: [0.045, 0.062], h: 0.18, seg: 6, at: [0.105, 0.02, 0], col: 'kyahan' },
        { s: 'box', size: [0.1, 0.04, 0.25], at: [0.105, 0, 0.03], col: 'straw' },
      ] },
      { s: 'group', anim: [3, 0, 0], parts: [
        { s: 'cyl', r: [0.275, 0.15], h: 0.9, seg: 24, hseg: 3, at: [-0.115, 0.12, 0], scale: [1, 1, 0.95], col: 'hakamaLo', col2: 'hakama', flute: [6, 0.17, 0.9], ao: 1.5 },
        { s: 'cyl', r: [0.045, 0.062], h: 0.18, seg: 6, at: [-0.105, 0.02, 0], col: 'kyahan' },
        { s: 'box', size: [0.1, 0.04, 0.25], at: [-0.105, 0, 0.03], col: 'straw' },
      ] },
      // 胴・帯・羽織（肩はなで肩、裾は腰まで）
      { s: 'group', anim: [6, 0, 0], parts: [
        { s: 'cyl', r: [0.2, 0.19], h: 0.16, seg: 10, at: [0, 0.9, 0], scale: [1.1, 1, 0.82], col: 'obi' },
        { s: 'lathe', seg: 18, at: [0, 0, 0], scale: [1.06, 1, 0.72], col: 'haoriLo', col2: 'haori', flute: [6, 0.07, 1], ao: 0.8,
          pts: [[0.31, 0.84], [0.29, 0.95], [0.252, 1.08], [0.236, 1.22], [0.226, 1.34], [0.16, 1.44], [0.075, 1.485]] },
        { s: 'sph', r: [0.31, 0.085, 0.15], seg: 12, at: [0, 1.39, 0], col: 'haori' },
        { s: 'box', size: [0.1, 0.5, 0.02], at: [0, 0.92, -0.215], col: 'haoriLo' },
        // 首・頭・髪（後ろへはねる毛束）
        { s: 'cyl', r: [0.055, 0.05], h: 0.1, seg: 6, at: [0, 1.46, 0], col: 'skin' },
        { s: 'sph', r: [0.105, 0.12, 0.11], seg: 10, at: [0, 1.61, 0.01], col: 'skin' },
        { s: 'sph', r: [0.13, 0.12, 0.135], seg: 12, at: [0, 1.662, -0.02], col: 'hair', jitter: 0.04, jfreq: 11, joct: 3, ao: 0 },
        { s: 'cyl', r: [0.045, 0.0], h: 0.13, seg: 4, at: [0, 1.7, -0.12], rot: [-95, 0, 0], col: 'hair' },
        { s: 'cyl', r: [0.04, 0.0], h: 0.12, seg: 4, at: [0.07, 1.66, -0.11], rot: [-100, 0, -30], col: 'hair' },
        { s: 'cyl', r: [0.04, 0.0], h: 0.12, seg: 4, at: [-0.07, 1.66, -0.11], rot: [-100, 0, 30], col: 'hair' },
        { s: 'cyl', r: [0.04, 0.0], h: 0.13, seg: 4, at: [0.04, 1.57, -0.11], rot: [-125, 0, -15], col: 'hair' },
        { s: 'cyl', r: [0.04, 0.0], h: 0.13, seg: 4, at: [-0.04, 1.57, -0.11], rot: [-125, 0, 15], col: 'hair' },
        // 鉢巻と結び目
        { s: 'cyl', r: [0.132, 0.132], h: 0.045, seg: 12, at: [0, 1.632, -0.005], scale: [1, 1, 1.05], col: 'paperWhite' },
        { s: 'sph', r: [0.04, 0.035, 0.03], seg: 6, at: [0.02, 1.647, -0.145], col: 'paperWhite' },
      ] },
      // 袖（広い袂。腕を少し開いて下げる）。左は風で少しはためく
      { s: 'cyl', r: [0.2, 0.085], h: 0.66, seg: 14, hseg: 3, at: [0.5, 0.79, 0], rot: [0, 0, 17], scale: [1, 1, 0.5], col: 'haoriLo', col2: 'haori', anim: [5, 0.1, 1], flute: [5, 0.1, 1], ao: 0.8 },
      { s: 'cyl', r: [0.19, 0.085], h: 0.64, seg: 14, hseg: 3, at: [-0.49, 0.81, 0.05], rot: [10, 0, -17], scale: [1, 1, 0.5], col: 'haoriLo', col2: 'haori', anim: [6, 0, 0], flute: [5, 0.1, 1], ao: 0.8 },
      { s: 'sph', r: 0.045, seg: 6, at: [0.52, 0.78, 0.02], col: 'skin', anim: [6, 0, 0] },
      { s: 'sph', r: 0.045, seg: 6, at: [-0.51, 0.8, 0.1], col: 'skin', anim: [6, 0, 0] },
      // 鉢巻の尾（2本。風で左へ長く流れる）
      { s: 'ribbon', w: [0.045, 0.075], side: [0, 1, 0.25], col: 'paperWhite', anim: [5, 1, 0], animGrad: [0, 1], seg: 18,
        path: [[0.02, 1.647, -0.15], [0.24, 1.62, -0.24], [0.5, 1.54, -0.27], [0.76, 1.55, -0.2], [1.0, 1.47, -0.16], [1.2, 1.48, -0.22], [1.36, 1.42, -0.18]] },
      { s: 'ribbon', w: [0.045, 0.07], side: [0, 1, -0.2], col: 'paperWhite', anim: [5, 1, 1.7], animGrad: [0, 1], seg: 18,
        path: [[0.02, 1.64, -0.15], [0.18, 1.55, -0.25], [0.38, 1.46, -0.3], [0.62, 1.45, -0.25], [0.84, 1.35, -0.3], [1.02, 1.34, -0.24]] },
      // 長巻（右手。長い柄と刃。刃先は右前の地面すれすれ）と赤い房
      { s: 'group', at: [-0.51, 0.8, 0.1], rot: [0, 30, 122], anim: [6, 0, 0], parts: [
        { s: 'cyl', r: 0.021, h: 0.5, seg: 6, at: [0, -0.14, 0], col: 'hilt', col2: 'hiltHi' },
        { s: 'cyl', r: 0.052, h: 0.022, seg: 8, at: [0, 0.36, 0], col: 'gold' },
        { s: 'box', size: [0.014, 1.02, 0.06], at: [0, 0.38, 0], col: 'steel', col2: 'steelHi' },
        { s: 'cyl', r: [0.03, 0.0], h: 0.11, seg: 4, at: [0, 1.4, 0], scale: [0.22, 1, 1], col: 'steelHi' },
        { s: 'ribbon', w: [0.03, 0.055], side: [1, 0, 0], col: 'tassel', path: [[0, 0.34, 0.03], [0.02, 0.24, 0.12], [0.0, 0.12, 0.2], [0.02, 0.0, 0.22]] },
        { s: 'ribbon', w: [0.03, 0.05], side: [0, 0, 1], col: 'tassel', path: [[0, 0.34, -0.02], [0.06, 0.22, 0.06], [0.1, 0.08, 0.1], [0.1, -0.04, 0.14]] },
      ] },
    ],
  },

  // ---- 提灯お化け（破れ提灯・一つ目・長い舌。鳥居から下がる） ----
  chochin: {
    parts: [
      { s: 'lathe', seg: 18, col: 'chochinLo', col2: 'chochin', fx: [0, 0, 0, 0.08],
        pts: [[0.2, 0.0], [0.47, 0.14], [0.6, 0.42], [0.64, 0.75], [0.6, 1.08], [0.45, 1.32], [0.22, 1.42]] },
      // 骨（横の輪）
      { s: 'cyl', r: [0.612, 0.624], h: 0.016, seg: 18, at: [0, 0.44, 0], col: 'chochinRib', open: true },
      { s: 'cyl', r: [0.64, 0.652], h: 0.016, seg: 18, at: [0, 0.6, 0], col: 'chochinRib', open: true },
      { s: 'cyl', r: [0.654, 0.654], h: 0.016, seg: 18, at: [0, 0.76, 0], col: 'chochinRib', open: true },
      { s: 'cyl', r: [0.645, 0.63], h: 0.016, seg: 18, at: [0, 0.92, 0], col: 'chochinRib', open: true },
      { s: 'cyl', r: [0.61, 0.59], h: 0.016, seg: 18, at: [0, 1.08, 0], col: 'chochinRib', open: true },
      { s: 'cyl', r: [0.52, 0.49], h: 0.016, seg: 18, at: [0, 1.24, 0], col: 'chochinRib', open: true },
      { s: 'cyl', r: [0.5, 0.52], h: 0.016, seg: 18, at: [0, 0.18, 0], col: 'chochinRib', open: true },
      { s: 'cyl', r: [0.56, 0.58], h: 0.016, seg: 18, at: [0, 0.3, 0], col: 'chochinRib', open: true },
      { s: 'cyl', r: [0.26, 0.23], h: 0.16, seg: 12, at: [0, 1.4, 0], col: 'ink' },
      { s: 'cyl', r: [0.21, 0.24], h: 0.12, seg: 12, at: [0, -0.1, 0], col: 'ink' },
      // 一つ目（重いまぶた）
      { s: 'sph', r: [0.25, 0.18, 0.07], seg: 12, at: [0, 0.95, 0.6], col: 'paperWhite' },
      { s: 'sph', r: [0.12, 0.12, 0.05], seg: 10, at: [0, 0.94, 0.65], col: 'eyeAmber', fx: [0, 0, 0, 0.35] },
      { s: 'sph', r: [0.055, 0.075, 0.04], seg: 6, at: [0, 0.94, 0.69], col: 'ink' },
      { s: 'sph', r: [0.27, 0.07, 0.08], seg: 10, at: [0, 1.1, 0.585], rot: [0, 0, -4], col: 'chochinRib' },
      // 裂けた口と舌
      { s: 'sph', r: [0.36, 0.09, 0.1], seg: 10, at: [0, 0.47, 0.56], col: 'mouth' },
      { s: 'tube', r: [0.14, 0.05], seg: 20, rseg: 8, col: 'tongue', col2: 'tongueHi',
        path: [[0, 0.46, 0.54], [0.02, 0.2, 0.72], [0.0, -0.3, 0.7], [0.08, -0.8, 0.6], [0.2, -1.08, 0.66], [0.34, -1.04, 0.8]] },
      // 破れた紙
      { s: 'fan', pts: [[0.5, 0.2, 0.3], [0.64, -0.24, 0.34], [0.42, -0.05, 0.42]], col: 'chochinLo' },
      { s: 'fan', pts: [[-0.5, 0.25, 0.25], [-0.68, -0.18, 0.2], [-0.4, 0.0, 0.38]], col: 'chochinLo' },
      { s: 'fan', pts: [[-0.3, 0.1, 0.42], [-0.34, -0.3, 0.46], [-0.14, -0.06, 0.5]], col: 'chochin' },
      // 吊り金具（鉤）
      { s: 'tube', r: 0.022, seg: 12, rseg: 5, col: 'ink', path: [[0, 1.52, 0], [0, 1.9, 0], [0.12, 2.12, 0], [0.3, 2.06, 0], [0.34, 1.9, 0]] },
    ],
  },
  // ---- 唐傘お化け（半ば畳んだ破れ傘・一つ目・舌・一本足・下駄） ----
  karakasa: {
    parts: [
      { s: 'lathe', seg: 32, at: [0, 0.72, 0], col: 'kasaLo', col2: 'kasa', flute: [16, 0.1, 0.9], ao: 1.1,
        pts: [[0.98, -0.1], [0.97, 0.12], [0.86, 0.5], [0.62, 0.92], [0.34, 1.26], [0.1, 1.47], [0.0, 1.53]] },
      { s: 'cyl', r: [0.05, 0.035], h: 0.24, seg: 6, at: [0, 2.22, 0], col: 'ink' },
      { s: 'cyl', r: [0.09, 0.07], h: 0.05, seg: 8, at: [0, 2.2, 0], col: 'getaWood' },
      // 破れて垂れた裾
      { s: 'fan', pts: [[0.62, 0.9, 0.56], [0.9, 0.42, 0.62], [0.44, 0.52, 0.8]], col: 'kasaLo' },
      { s: 'fan', pts: [[-0.62, 0.9, 0.56], [-0.96, 0.46, 0.44], [-0.58, 0.44, 0.8]], col: 'kasaLo' },
      { s: 'fan', pts: [[0.12, 0.86, 0.9], [0.28, 0.36, 1.0], [-0.18, 0.46, 0.98]], col: 'kasa' },
      { s: 'fan', pts: [[0.86, 0.86, -0.2], [1.1, 0.4, -0.32], [0.76, 0.46, -0.6]], col: 'kasaLo' },
      { s: 'fan', pts: [[-0.86, 0.86, -0.2], [-1.1, 0.36, -0.1], [-0.82, 0.42, -0.56]], col: 'kasa' },
      { s: 'fan', pts: [[0.3, 0.84, -0.84], [0.42, 0.36, -0.98], [-0.1, 0.46, -0.96]], col: 'kasaLo' },
      // 目（一つ）・口・舌
      { s: 'sph', r: [0.22, 0.17, 0.07], seg: 10, at: [0, 1.4, 0.6], rot: [-30, 0, 0], col: 'paperWhite' },
      { s: 'sph', r: [0.1, 0.1, 0.05], seg: 8, at: [0, 1.39, 0.655], rot: [-30, 0, 0], col: 'eyeAmber', fx: [0, 0, 0, 0.3] },
      { s: 'sph', r: [0.045, 0.06, 0.04], seg: 6, at: [0, 1.39, 0.69], rot: [-30, 0, 0], col: 'ink' },
      { s: 'sph', r: [0.26, 0.06, 0.06], seg: 8, at: [0, 1.06, 0.8], rot: [-30, 0, 0], col: 'mouth' },
      { s: 'tube', r: [0.08, 0.035], seg: 10, rseg: 6, col: 'tongue', col2: 'tongueHi', path: [[0, 1.05, 0.8], [0.03, 0.9, 0.95], [0.08, 0.7, 1.0], [0.14, 0.58, 0.96]] },
      // 一本足と下駄
      { s: 'cyl', r: [0.06, 0.09], h: 0.86, seg: 8, at: [0, 0.12, 0], col: 'skin' },
      { s: 'box', size: [0.26, 0.05, 0.42], at: [0, 0.11, 0.04], col: 'getaWood' },
      { s: 'box', size: [0.24, 0.11, 0.05], at: [0, 0, 0.15], col: 'getaWood' },
      { s: 'box', size: [0.24, 0.11, 0.05], at: [0, 0, -0.08], col: 'getaWood' },
    ],
  },
  // ---- 山犬（岩棚の上。頭を下げて唸る。逆立つ毛・光る目） ----
  yamainu: {
    parts: [
      // 胴（肩が高く、腰が低い）と首
      { s: 'sph', r: [0.27, 0.32, 0.62], seg: 12, at: [0, 0.98, -0.2], rot: [-10, 0, 0], col: 'wolfLo', col2: 'wolf', jitter: 0.08, jfreq: 5, joct: 3 },
      { s: 'sph', r: [0.3, 0.4, 0.4], seg: 12, at: [0, 1.08, 0.36], col: 'wolfLo', col2: 'wolf', jitter: 0.09, jfreq: 5, joct: 3 },
      { s: 'sph', r: [0.22, 0.26, 0.36], seg: 10, at: [0, 1.0, 0.78], rot: [28, 0, 0], col: 'wolfLo', col2: 'wolf', jitter: 0.06, jfreq: 6, joct: 3 },
      // 頭（下げて前へ突き出す）・鼻面・耳
      { s: 'sph', r: [0.17, 0.17, 0.23], seg: 10, at: [0, 0.84, 1.1], rot: [24, 0, 0], col: 'wolf' },
      { s: 'cyl', r: [0.1, 0.045], h: 0.36, seg: 6, at: [0, 0.76, 1.24], rot: [104, 0, 0], col: 'wolfLo' },
      { s: 'sph', r: [0.035, 0.03, 0.035], seg: 5, at: [0, 0.7, 1.6], col: 'ink' },
      { s: 'sph', r: [0.07, 0.025, 0.14], seg: 6, at: [0, 0.66, 1.42], rot: [14, 0, 0], col: 'mouth' },
      { s: 'cyl', r: [0.06, 0.0], h: 0.24, seg: 4, at: [0.11, 0.95, 1.0], rot: [-30, 0, -18], col: 'wolfLo' },
      { s: 'cyl', r: [0.06, 0.0], h: 0.24, seg: 4, at: [-0.11, 0.95, 1.0], rot: [-30, 0, 18], col: 'wolfLo' },
      // 目（青緑に光る）
      { s: 'sph', r: [0.04, 0.03, 0.04], seg: 5, at: [0.1, 0.88, 1.27], col: 'eyeCyan', fx: [0, 0, 0, 1] },
      { s: 'sph', r: [0.04, 0.03, 0.04], seg: 5, at: [-0.1, 0.88, 1.27], col: 'eyeCyan', fx: [0, 0, 0, 1] },
      // 脚（前脚は踏ん張り、後脚は曲げる）
      { s: 'cyl', r: [0.045, 0.085], h: 0.96, seg: 6, at: [0.2, 0, 0.56], rot: [8, 0, 3], col: 'wolfLo' },
      { s: 'cyl', r: [0.045, 0.085], h: 0.96, seg: 6, at: [-0.2, 0, 0.64], rot: [14, 0, -3], col: 'wolfLo' },
      { s: 'cyl', r: [0.05, 0.11], h: 0.52, seg: 6, at: [0.2, 0.42, -0.6], rot: [-22, 0, 0], col: 'wolfLo' },
      { s: 'cyl', r: [0.04, 0.06], h: 0.5, seg: 6, at: [0.2, 0, -0.52], rot: [12, 0, 0], col: 'wolfLo' },
      { s: 'cyl', r: [0.05, 0.11], h: 0.52, seg: 6, at: [-0.2, 0.42, -0.54], rot: [-22, 0, 0], col: 'wolfLo' },
      { s: 'cyl', r: [0.04, 0.06], h: 0.5, seg: 6, at: [-0.2, 0, -0.46], rot: [12, 0, 0], col: 'wolfLo' },
      // 尾（毛のふさ）
      { s: 'tube', r: [0.1, 0.15], seg: 8, rseg: 6, col: 'wolfLo', col2: 'wolf', path: [[0, 1.0, -0.74], [0.04, 1.02, -1.0], [0.1, 0.9, -1.26]], jitter: 0.05, jfreq: 6 },
      { s: 'cyl', r: [0.15, 0.0], h: 0.5, seg: 5, at: [0.1, 0.9, -1.24], rot: [-118, 0, -8], col: 'wolf' },
      // 逆立つ毛（首のまわりから背へ）
      { s: 'cyl', r: [0.1, 0.0], h: 0.5, seg: 4, at: [0, 1.4, 0.56], rot: [-22, 0, 0], col: 'wolf' },
      { s: 'cyl', r: [0.1, 0.0], h: 0.52, seg: 4, at: [0.12, 1.4, 0.4], rot: [-34, 0, -20], col: 'wolfLo' },
      { s: 'cyl', r: [0.1, 0.0], h: 0.52, seg: 4, at: [-0.12, 1.4, 0.4], rot: [-34, 0, 20], col: 'wolf' },
      { s: 'cyl', r: [0.1, 0.0], h: 0.5, seg: 4, at: [0, 1.42, 0.2], rot: [-44, 0, 0], col: 'wolfLo' },
      { s: 'cyl', r: [0.09, 0.0], h: 0.46, seg: 4, at: [0.1, 1.32, -0.02], rot: [-52, 0, -14], col: 'wolf' },
      { s: 'cyl', r: [0.09, 0.0], h: 0.46, seg: 4, at: [-0.1, 1.32, -0.02], rot: [-52, 0, 14], col: 'wolfLo' },
      { s: 'cyl', r: [0.09, 0.0], h: 0.4, seg: 4, at: [0, 1.24, -0.3], rot: [-58, 0, 0], col: 'wolf' },
      { s: 'cyl', r: [0.08, 0.0], h: 0.36, seg: 4, at: [0, 1.14, -0.56], rot: [-66, 0, 0], col: 'wolfLo' },
      { s: 'cyl', r: [0.08, 0.0], h: 0.36, seg: 4, at: [0.24, 1.18, 0.6], rot: [-26, 0, -58], col: 'wolf' },
      { s: 'cyl', r: [0.08, 0.0], h: 0.36, seg: 4, at: [-0.24, 1.18, 0.6], rot: [-26, 0, 58], col: 'wolf' },
      { s: 'cyl', r: [0.08, 0.0], h: 0.34, seg: 4, at: [0.26, 1.0, 0.44], rot: [-40, 0, -84], col: 'wolfLo' },
      { s: 'cyl', r: [0.08, 0.0], h: 0.34, seg: 4, at: [-0.26, 1.0, 0.44], rot: [-40, 0, 84], col: 'wolfLo' },
      { s: 'cyl', r: [0.07, 0.0], h: 0.3, seg: 4, at: [0.14, 1.18, 0.86], rot: [0, 0, -40], col: 'wolf' },
      { s: 'cyl', r: [0.07, 0.0], h: 0.3, seg: 4, at: [-0.14, 1.18, 0.86], rot: [0, 0, 40], col: 'wolf' },
      { s: 'cyl', r: [0.07, 0.0], h: 0.3, seg: 4, at: [0, 0.74, 0.7], rot: [150, 0, 0], col: 'wolfLo' },
    ],
  },
};
