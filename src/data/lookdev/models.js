// 見た目の試作（lookdev）の形の表。部品（box・cyl・sph・lathe・tube・ribbon・fan・group・ref）を並べて1体を作る。
// 単位は m・度。模型の正面は +Z、足元（底面の中心）が原点。色は palette の名前か '#rrggbb'。
// fx＝[苔, 塗りのはげ, 石畳, 発光]。anim＝[動きの種類, 重み, 位相]（1=風 2・3=脚 4=腕 5=布）。
// 参考画像（design-notes/lookdev/reference.png）を見て決めた形（設計書に無い「見た目の創作部分」）。

const STONE_FX = [0.75, 0, 0, 0];
const TORII_FX = [0.3, 0.55, 0, 0];

export const models = {
  // ---- 朱の大鳥居（塗りがはげ、笠木に苔） ----
  toriiMain: {
    parts: [
      { s: 'cyl', r: [0.75, 0.62], h: 0.5, seg: 10, at: [2.3, 0, 0], col: 'stone', fx: STONE_FX, jitter: 0.05, jfreq: 2 },
      { s: 'cyl', r: [0.75, 0.62], h: 0.5, seg: 10, at: [-2.3, 0, 0], col: 'stone', fx: STONE_FX, jitter: 0.05, jfreq: 2, seed: 4 },
      { s: 'cyl', r: [0.47, 0.4], h: 5.5, seg: 12, hseg: 6, at: [2.3, 0.3, 0], rot: [0, 0, 1.6], col: 'toriiRed', col2: 'toriiRedHi', fx: TORII_FX, jitter: 0.02, jfreq: 1.5 },
      { s: 'cyl', r: [0.47, 0.4], h: 5.5, seg: 12, hseg: 6, at: [-2.3, 0.3, 0], rot: [0, 0, -1.6], col: 'toriiRed', col2: 'toriiRedHi', fx: TORII_FX, jitter: 0.02, jfreq: 1.5, seed: 9 },
      // 貫・額束・島木・笠木
      { s: 'box', size: [6.7, 0.56, 0.42], at: [0, 4.05, 0], col: 'toriiRed', fx: TORII_FX },
      { s: 'box', size: [0.5, 0.8, 0.36], at: [0, 4.6, 0], col: 'toriiRed', fx: TORII_FX },
      { s: 'box', size: [5.2, 0.5, 0.62], at: [0, 5.36, 0], col: 'toriiRed', fx: TORII_FX },
      { s: 'box', size: [1.9, 0.5, 0.62], at: [3.3, 5.42, 0], rot: [0, 0, 7], col: 'toriiRed', fx: TORII_FX },
      { s: 'box', size: [1.9, 0.5, 0.62], at: [-3.3, 5.42, 0], rot: [0, 0, -7], col: 'toriiRed', fx: TORII_FX },
      { s: 'box', size: [5.4, 0.34, 0.9], at: [0, 5.84, 0], col: 'toriiRoof', fx: [0.9, 0.3, 0, 0] },
      { s: 'box', size: [2.2, 0.34, 0.9], at: [3.55, 5.92, 0], rot: [0, 0, 9], col: 'toriiRoof', fx: [0.9, 0.3, 0, 0] },
      { s: 'box', size: [2.2, 0.34, 0.9], at: [-3.55, 5.92, 0], rot: [0, 0, -9], col: 'toriiRoof', fx: [0.9, 0.3, 0, 0] },
      // 柱に絡む蔦
      { s: 'tube', path: [[2.55, 0.4, 0.3], [2.1, 1.6, 0.36], [2.6, 2.8, 0.2], [2.2, 4.0, 0.3], [1.6, 4.5, 0.2]], r: [0.035, 0.015], col: 'vine' },
      { s: 'tube', path: [[-2.0, 4.4, 0.2], [-1.2, 4.1, 0.24], [-0.4, 4.05, 0.2]], r: [0.03, 0.012], col: 'vine' },
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
  // ---- 注連縄の巨岩 ----
  iwakura: {
    parts: [
      { s: 'sph', r: [2.45, 2.5, 2.15], seg: 40, at: [0, 1.85, 0], col: 'rockDark', col2: 'rock', fx: [0.32, 0, 0, 0], jitter: 0.6, jfreq: 0.7, seed: 3, joct: 5 },
      { s: 'sph', r: [1.5, 1.0, 1.4], seg: 20, at: [1.9, 0.5, -1.3], col: 'rock', col2: 'rockHi', fx: [0.35, 0, 0, 0], jitter: 0.4, jfreq: 0.8, seed: 5, joct: 5 },
      { s: 'sph', r: [1.2, 0.8, 1.2], seg: 18, at: [-0.6, 0.4, -2.2], col: 'rock', col2: 'rockHi', fx: [0.35, 0, 0, 0], jitter: 0.35, jfreq: 0.9, seed: 7, joct: 5 },
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
  rockA: { parts: [{ s: 'sph', r: [0.9, 0.6, 0.75], seg: 18, at: [0, 0.3, 0], col: 'rock', col2: 'rockHi', fx: [0.35, 0, 0, 0], jitter: 0.28, jfreq: 1.3, seed: 2, joct: 5 }] },
  rockB: { parts: [{ s: 'sph', r: [0.7, 0.75, 0.6], seg: 18, at: [0, 0.35, 0], col: 'rockDark', col2: 'rock', fx: [0.3, 0, 0, 0], jitter: 0.25, jfreq: 1.6, seed: 11, joct: 5 }] },
  rockC: { parts: [{ s: 'sph', r: [1.5, 0.85, 1.1], seg: 18, at: [0, 0.3, 0], col: 'rock', col2: 'rockHi', fx: [0.35, 0, 0, 0], jitter: 0.4, jfreq: 0.9, seed: 21, joct: 5 }] },
  rockShore: { parts: [{ s: 'sph', r: [1.3, 1.0, 1.1], seg: 18, at: [0, 0.2, 0], col: 'rockWet', col2: 'rock', fx: [0.15, 0, 0, 0], jitter: 0.45, jfreq: 1.0, seed: 31, joct: 5 }] },
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
      // 脚（袴の筒＋脚絆＋草鞋）。kind 2＝左、3＝右
      { s: 'group', anim: [2, 0, 0], parts: [
        { s: 'cyl', r: [0.215, 0.15], h: 0.82, seg: 8, hseg: 2, at: [0.115, 0.2, 0], scale: [1, 1, 0.92], col: 'hakamaLo', col2: 'hakama' },
        { s: 'cyl', r: [0.05, 0.07], h: 0.24, seg: 6, at: [0.105, 0.03, 0], col: 'kyahan' },
        { s: 'box', size: [0.1, 0.045, 0.25], at: [0.105, 0, 0.03], col: 'straw' },
      ] },
      { s: 'group', anim: [3, 0, 0], parts: [
        { s: 'cyl', r: [0.215, 0.15], h: 0.82, seg: 8, hseg: 2, at: [-0.115, 0.2, 0], scale: [1, 1, 0.92], col: 'hakamaLo', col2: 'hakama' },
        { s: 'cyl', r: [0.05, 0.07], h: 0.24, seg: 6, at: [-0.105, 0.03, 0], col: 'kyahan' },
        { s: 'box', size: [0.1, 0.045, 0.25], at: [-0.105, 0, 0.03], col: 'straw' },
      ] },
      // 胴・帯・羽織（裾が広がる）
      { s: 'group', anim: [6, 0, 0], parts: [
        { s: 'cyl', r: [0.19, 0.17], h: 0.14, seg: 8, at: [0, 0.96, 0], scale: [1.1, 1, 0.8], col: 'obi' },
        { s: 'lathe', seg: 12, at: [0, 0, 0], scale: [1.12, 1, 0.74], col: 'haoriLo', col2: 'haori',
          pts: [[0.33, 0.74], [0.305, 0.86], [0.265, 1.02], [0.245, 1.22], [0.235, 1.36], [0.16, 1.45], [0.07, 1.48]] },
        // 首・頭・髪
        { s: 'cyl', r: [0.055, 0.05], h: 0.1, seg: 6, at: [0, 1.46, 0], col: 'skin' },
        { s: 'sph', r: [0.105, 0.12, 0.11], seg: 10, at: [0, 1.61, 0.01], col: 'skin' },
        { s: 'sph', r: [0.125, 0.115, 0.13], seg: 10, at: [0, 1.655, -0.02], col: 'hair', jitter: 0.03, jfreq: 9 },
        { s: 'cyl', r: [0.045, 0.0], h: 0.14, seg: 5, at: [0, 1.7, -0.1], rot: [-70, 0, 0], col: 'hair' },
        { s: 'cyl', r: [0.04, 0.0], h: 0.13, seg: 5, at: [0.07, 1.6, -0.1], rot: [-110, 0, -30], col: 'hair' },
        { s: 'cyl', r: [0.04, 0.0], h: 0.13, seg: 5, at: [-0.07, 1.6, -0.1], rot: [-110, 0, 30], col: 'hair' },
        // 鉢巻と結び目
        { s: 'cyl', r: [0.128, 0.128], h: 0.045, seg: 12, at: [0, 1.63, -0.005], scale: [1, 1, 1.05], col: 'paperWhite' },
        { s: 'sph', r: [0.04, 0.035, 0.03], seg: 6, at: [0.02, 1.645, -0.14], col: 'paperWhite' },
      ] },
      // 袖（広い袂）。左は風で少しはためく
      { s: 'cyl', r: [0.17, 0.085], h: 0.6, seg: 8, hseg: 3, at: [0.43, 0.82, 0], rot: [0, 0, 17], scale: [0.62, 1, 1.25], col: 'haoriLo', col2: 'haori', anim: [5, 0.1, 1] },
      { s: 'cyl', r: [0.16, 0.085], h: 0.58, seg: 8, hseg: 3, at: [-0.42, 0.84, 0.03], rot: [8, 0, -16], scale: [0.62, 1, 1.2], col: 'haoriLo', col2: 'haori', anim: [6, 0, 0] },
      { s: 'sph', r: 0.045, seg: 6, at: [0.44, 0.86, 0.02], col: 'skin', anim: [6, 0, 0] },
      { s: 'sph', r: 0.045, seg: 6, at: [-0.43, 0.87, 0.06], col: 'skin', anim: [6, 0, 0] },
      // 鉢巻の尾（2本。風で左へ流れる）
      { s: 'ribbon', w: [0.04, 0.06], side: [0, 1, 0.25], col: 'paperWhite', anim: [5, 1, 0], animGrad: [0, 1], seg: 14,
        path: [[0.02, 1.645, -0.15], [0.2, 1.6, -0.22], [0.42, 1.52, -0.25], [0.64, 1.5, -0.2], [0.84, 1.42, -0.16], [0.98, 1.4, -0.2]] },
      { s: 'ribbon', w: [0.04, 0.055], side: [0, 1, -0.2], col: 'paperWhite', anim: [5, 1, 1.7], animGrad: [0, 1], seg: 14,
        path: [[0.02, 1.64, -0.15], [0.16, 1.54, -0.23], [0.32, 1.42, -0.27], [0.52, 1.37, -0.24], [0.68, 1.28, -0.27], [0.8, 1.26, -0.24]] },
      // 長巻（右手。刃先は右前の地面すれすれ）
      { s: 'group', at: [-0.43, 0.87, 0.06], rot: [0, 28, 128], anim: [6, 0, 0], parts: [
        { s: 'cyl', r: 0.02, h: 0.8, seg: 6, at: [0, -0.5, 0], col: 'hilt', col2: 'hiltHi' },
        { s: 'cyl', r: 0.05, h: 0.02, seg: 8, at: [0, 0.3, 0], col: 'gold' },
        { s: 'box', size: [0.012, 1.0, 0.052], at: [0, 0.32, 0], col: 'steel', col2: 'steelHi' },
        { s: 'cyl', r: [0.026, 0.0], h: 0.1, seg: 4, at: [0, 1.32, 0], scale: [0.25, 1, 1], col: 'steelHi' },
        { s: 'ribbon', w: [0.03, 0.05], side: [1, 0, 0], col: 'tassel', path: [[0, 0.28, 0.03], [0.02, 0.2, 0.12], [0.0, 0.1, 0.2], [0.02, 0.0, 0.22]] },
      ] },
    ],
  },

  // ---- 提灯お化け（一つ目・長い舌。鳥居から下がる） ----
  chochin: {
    parts: [
      { s: 'lathe', seg: 14, col: 'chochinLo', col2: 'chochin',
        pts: [[0.2, 0.0], [0.47, 0.14], [0.6, 0.42], [0.64, 0.75], [0.6, 1.08], [0.45, 1.32], [0.22, 1.42]] },
      // 骨（横の輪）
      { s: 'cyl', r: [0.612, 0.622], h: 0.03, seg: 14, at: [0, 0.44, 0], col: 'chochinRib', open: true },
      { s: 'cyl', r: [0.652, 0.652], h: 0.03, seg: 14, at: [0, 0.74, 0], col: 'chochinRib', open: true },
      { s: 'cyl', r: [0.625, 0.61], h: 0.03, seg: 14, at: [0, 1.04, 0], col: 'chochinRib', open: true },
      { s: 'cyl', r: [0.49, 0.47], h: 0.03, seg: 14, at: [0, 1.28, 0], col: 'chochinRib', open: true },
      { s: 'cyl', r: [0.49, 0.5], h: 0.03, seg: 14, at: [0, 0.16, 0], col: 'chochinRib', open: true },
      { s: 'cyl', r: [0.24, 0.22], h: 0.14, seg: 10, at: [0, 1.4, 0], col: 'ink' },
      { s: 'cyl', r: [0.2, 0.22], h: 0.1, seg: 10, at: [0, -0.08, 0], col: 'ink' },
      // 一つ目
      { s: 'sph', r: [0.24, 0.17, 0.07], seg: 10, at: [0, 0.95, 0.6], col: 'paperWhite' },
      { s: 'sph', r: [0.115, 0.115, 0.05], seg: 8, at: [0, 0.95, 0.65], col: 'eyeAmber', fx: [0, 0, 0, 0.35] },
      { s: 'sph', r: [0.055, 0.07, 0.04], seg: 6, at: [0, 0.95, 0.685], col: 'ink' },
      // 裂けた口と舌
      { s: 'sph', r: [0.34, 0.085, 0.1], seg: 8, at: [0, 0.47, 0.56], col: 'mouth' },
      { s: 'tube', r: [0.13, 0.055], seg: 16, rseg: 7, col: 'tongue', col2: 'tongueHi',
        path: [[0, 0.46, 0.56], [0.02, 0.2, 0.72], [0.0, -0.3, 0.7], [0.08, -0.8, 0.6], [0.2, -1.05, 0.66], [0.3, -1.02, 0.78]] },
      // 破れた紙
      { s: 'fan', pts: [[0.5, 0.2, 0.3], [0.62, -0.2, 0.34], [0.42, -0.05, 0.4]], col: 'chochinLo' },
      { s: 'fan', pts: [[-0.5, 0.25, 0.25], [-0.66, -0.15, 0.2], [-0.4, 0.0, 0.36]], col: 'chochinLo' },
      // 吊り縄
      { s: 'cyl', r: 0.02, h: 0.75, seg: 5, at: [0, 1.5, 0], col: 'ink' },
    ],
  },
  // ---- 唐傘お化け（破れ傘・一本足・下駄） ----
  karakasa: {
    parts: [
      { s: 'lathe', seg: 14, at: [0, 0.75, 0], col: 'kasaLo', col2: 'kasa',
        pts: [[1.0, 0.0], [0.86, 0.2], [0.58, 0.7], [0.3, 1.12], [0.08, 1.42], [0.0, 1.46]] },
      { s: 'cyl', r: [0.04, 0.03], h: 0.2, seg: 6, at: [0, 2.2, 0], col: 'ink' },
      // 破れた裾
      { s: 'fan', pts: [[0.6, 0.95, 0.5], [0.85, 0.5, 0.55], [0.45, 0.6, 0.72]], col: 'kasaLo' },
      { s: 'fan', pts: [[-0.6, 0.95, 0.5], [-0.9, 0.55, 0.4], [-0.55, 0.52, 0.72]], col: 'kasaLo' },
      { s: 'fan', pts: [[0.1, 0.9, 0.82], [0.25, 0.45, 0.9], [-0.15, 0.55, 0.88]], col: 'kasa' },
      { s: 'fan', pts: [[0.8, 0.9, -0.2], [1.0, 0.5, -0.3], [0.7, 0.55, -0.55]], col: 'kasaLo' },
      { s: 'fan', pts: [[-0.8, 0.9, -0.2], [-1.0, 0.45, -0.1], [-0.75, 0.5, -0.5]], col: 'kasa' },
      // 目（一つ）と口
      { s: 'sph', r: [0.2, 0.16, 0.06], seg: 8, at: [0, 1.4, 0.56], rot: [-28, 0, 0], col: 'paperWhite' },
      { s: 'sph', r: [0.08, 0.09, 0.04], seg: 6, at: [0, 1.4, 0.61], rot: [-28, 0, 0], col: 'ink' },
      { s: 'sph', r: [0.24, 0.06, 0.05], seg: 6, at: [0, 1.08, 0.76], rot: [-28, 0, 0], col: 'mouth' },
      // 一本足と下駄
      { s: 'cyl', r: [0.06, 0.085], h: 0.85, seg: 7, at: [0, 0.12, 0], col: 'skin' },
      { s: 'box', size: [0.24, 0.05, 0.4], at: [0, 0.1, 0.04], col: 'getaWood' },
      { s: 'box', size: [0.22, 0.1, 0.05], at: [0, 0, 0.14], col: 'getaWood' },
      { s: 'box', size: [0.22, 0.1, 0.05], at: [0, 0, -0.08], col: 'getaWood' },
    ],
  },
  // ---- 山犬（岩棚で身を低くする。逆立つ毛・光る目） ----
  yamainu: {
    parts: [
      { s: 'sph', r: [0.3, 0.36, 0.72], seg: 10, at: [0, 0.82, -0.1], rot: [-8, 0, 0], col: 'wolfLo', col2: 'wolf', jitter: 0.05, jfreq: 4 },
      { s: 'sph', r: [0.33, 0.42, 0.42], seg: 10, at: [0, 0.9, 0.42], col: 'wolfLo', col2: 'wolf', jitter: 0.05, jfreq: 4 },
      { s: 'sph', r: [0.19, 0.2, 0.26], seg: 8, at: [0, 0.93, 0.92], rot: [18, 0, 0], col: 'wolf' },
      { s: 'cyl', r: [0.11, 0.045], h: 0.34, seg: 6, at: [0, 0.85, 1.08], rot: [100, 0, 0], col: 'wolfLo' },
      { s: 'cyl', r: [0.07, 0.0], h: 0.22, seg: 4, at: [0.12, 1.07, 0.84], rot: [-18, 0, -14], col: 'wolfLo' },
      { s: 'cyl', r: [0.07, 0.0], h: 0.22, seg: 4, at: [-0.12, 1.07, 0.84], rot: [-18, 0, 14], col: 'wolfLo' },
      // 目（青緑に光る）
      { s: 'sph', r: 0.035, seg: 5, at: [0.1, 0.97, 1.11], col: 'eyeCyan', fx: [0, 0, 0, 1] },
      { s: 'sph', r: 0.035, seg: 5, at: [-0.1, 0.97, 1.11], col: 'eyeCyan', fx: [0, 0, 0, 1] },
      // 脚
      { s: 'cyl', r: [0.05, 0.085], h: 0.78, seg: 6, at: [0.2, 0, 0.5], rot: [8, 0, 0], col: 'wolfLo' },
      { s: 'cyl', r: [0.05, 0.085], h: 0.78, seg: 6, at: [-0.2, 0, 0.56], rot: [14, 0, 0], col: 'wolfLo' },
      { s: 'cyl', r: [0.05, 0.1], h: 0.74, seg: 6, at: [0.2, 0, -0.52], rot: [-10, 0, 0], col: 'wolfLo' },
      { s: 'cyl', r: [0.05, 0.1], h: 0.74, seg: 6, at: [-0.2, 0, -0.46], rot: [-6, 0, 0], col: 'wolfLo' },
      // 尾
      { s: 'tube', r: [0.12, 0.03], seg: 8, rseg: 6, col: 'wolf', col2: 'wolfLo', path: [[0, 0.88, -0.75], [0.05, 0.8, -1.05], [0.12, 0.6, -1.3], [0.1, 0.42, -1.5]] },
      // 逆立つ毛（首から背へ）
      { s: 'cyl', r: [0.1, 0.0], h: 0.42, seg: 4, at: [0, 1.22, 0.6], rot: [-28, 0, 0], col: 'wolf' },
      { s: 'cyl', r: [0.1, 0.0], h: 0.46, seg: 4, at: [0.1, 1.24, 0.42], rot: [-38, 0, -16], col: 'wolfLo' },
      { s: 'cyl', r: [0.1, 0.0], h: 0.46, seg: 4, at: [-0.1, 1.24, 0.42], rot: [-38, 0, 16], col: 'wolf' },
      { s: 'cyl', r: [0.09, 0.0], h: 0.44, seg: 4, at: [0, 1.22, 0.2], rot: [-48, 0, 0], col: 'wolfLo' },
      { s: 'cyl', r: [0.09, 0.0], h: 0.4, seg: 4, at: [0.08, 1.14, -0.05], rot: [-55, 0, -12], col: 'wolf' },
      { s: 'cyl', r: [0.09, 0.0], h: 0.4, seg: 4, at: [-0.08, 1.14, -0.05], rot: [-55, 0, 12], col: 'wolfLo' },
      { s: 'cyl', r: [0.08, 0.0], h: 0.34, seg: 4, at: [0, 1.06, -0.35], rot: [-62, 0, 0], col: 'wolf' },
      { s: 'cyl', r: [0.08, 0.0], h: 0.3, seg: 4, at: [0, 0.98, -0.6], rot: [-70, 0, 0], col: 'wolfLo' },
      { s: 'cyl', r: [0.07, 0.0], h: 0.3, seg: 4, at: [0.2, 1.0, 0.7], rot: [-30, 0, -50], col: 'wolf' },
      { s: 'cyl', r: [0.07, 0.0], h: 0.3, seg: 4, at: [-0.2, 1.0, 0.7], rot: [-30, 0, 50], col: 'wolf' },
    ],
  },
};
