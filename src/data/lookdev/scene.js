// 見た目の試作（lookdev）の場面の記述：色・光・地形の形・物の配置・草木の散らし方。
// 座標は「主人公の開始位置が原点」の局所座標（m）。+Z＝前（鳥居の方）、+X＝左（海）、−X＝右（崖）、+Y＝上。
// 参考画像（design-notes/lookdev/reference.png）の構図に合わせて決めた（設計書に無い「見た目の創作部分」）。

export const scene = {
  // 夕日の方角（主人公から見て左前の水平線すれすれ）
  sunDir: [0.6, 0.02, 0.8],

  palette: {
    paper: '#f1e8d6',
    paperWhite: '#f4efe6',
    ink: '#4b3b45',
    // 鳥居
    toriiRed: '#a63f30',
    toriiRedHi: '#b54e3a',
    toriiRoof: '#5c5560',
    toriiFar: '#b4604c',
    peel: '#bfb0aa',
    vine: '#5d6248',
    // 石・岩
    stone: '#88838a',
    stoneHi: '#a39b9e',
    stoneDark: '#6c6674',
    rock: '#7c767e',
    rockHi: '#a39a96',
    rockDark: '#6b6670',
    rockWet: '#5f5a72',
    cliff: '#6a6470',
    cliffHi: '#9a8d8c',
    pave: '#6f646d',
    paveHi: '#a79a9a',
    crack: '#3e2f47',
    moss: '#6a7054',
    concrete: '#989399',
    concreteHi: '#b3acab',
    lighthouse: '#e6dfd4',
    // 土・草
    earth: '#5f545c',
    grassDry: '#6d6259',
    grassOlive: '#646656',
    hillBrush: '#6f5d68',
    hillBrushWarm: '#a2735f',
    susuki: '#cdb88a',
    susukiPlume: '#ead9b4',
    daisy: '#f6f2e8',
    daisyCore: '#e0b84a',
    straw: '#c2b084',
    strawHi: '#d9caa2',
    // 木
    bark: '#5b4a52',
    barkHi: '#7c6763',
    bareTree: '#7a6878',
    maple: ['#9d2d26', '#ab3d2a', '#85282a', '#b85a34', '#92332d', '#a5352e'],
    // 電柱など
    poleWood: '#5b4d50',
    poleWoodHi: '#75656a',
    poleMetal: '#7b7f8c',
    wire: '#4a4050',
    // 主人公
    haori: '#8c9869',
    haoriLo: '#74805a',
    hakama: '#5f5559',
    hakamaLo: '#4c4349',
    obi: '#7a3f38',
    kyahan: '#d8d0c2',
    skin: '#e3c5a9',
    hair: '#2f2a31',
    hilt: '#5c2f30',
    hiltHi: '#7a3a36',
    gold: '#c9a24e',
    steel: '#aeb6c2',
    steelHi: '#e4e8ec',
    tassel: '#c4372e',
    // 妖怪
    chochin: '#e6d7b4',
    chochinLo: '#c9b48c',
    chochinRib: '#8a745f',
    eyeAmber: '#d2a437',
    mouth: '#5a2a30',
    tongue: '#cf7f88',
    tongueHi: '#e9a6a4',
    kasa: '#8a8c66',
    kasaLo: '#6b6f56',
    getaWood: '#7a5f4c',
    wolf: '#565a52',
    wolfLo: '#3d403f',
    eyeCyan: '#8ff4e2',
    lampGlow: '#f6dfa6',
  },

  light: {
    lightCol: '#fff0d6',
    lightGain: 1.02,
    shadeCol: '#b3abc6',
    shadeGain: 0.8,
    rimCol: '#f6a468',
    fogWarm: '#d9b39c',
    fogCool: '#a79cb4',
    reflWarm: '#f7b877',
    reflCool: '#a79fc6',
    glowCol: '#9c5fdc',
  },

  sky: {
    top: '#4a5278',
    mid: '#8c7b98',
    low: '#dc8d6e',
    horizonSun: '#f6dbac',
    horizonFar: '#ebc6b4',
    cloudDark: '#4a4e6e',
    cloudLit: '#e2906e',
    cloudEdge: '#fad29c',
    sun: '#e24f38',
    sunCore: '#f07848',
    radiusM: 380,
  },

  sea: {
    near: '#4b5583',
    far: '#9484a8',
    deep: '#3c466f',
    foam: '#f3eee6',
    glitter: '#ffb26a',
    sizeM: 760,
  },

  mist: { col: '#6f4a9c', core: '#a98ad6' },

  // 参道の中心線 [x, z, 半幅]（8点。石畳の範囲）
  path: [
    [0.1, -16, 2.2], [0.1, -5, 2.3], [0, 1, 2.4], [-0.4, 4, 2.4], [-1.5, 7.2, 2.3], [-2.7, 10, 2.1], [-4.7, 13, 1.9], [-7.6, 16.2, 1.8],
  ],
  // 地面の裂け目 [x, z, 幅]（6点。紫の靄が漏れる）
  fissure: [[0.5, 1.6, 0.03], [-0.2, 2.9, 0.07], [-1.0, 3.7, 0.12], [-1.2, 5.0, 0.08], [-2.1, 5.9, 0.12], [-2.5, 7.4, 0.04]],
  // 置き影 [x, z, 半径, 長さ]（12個。夕日の反対側へ伸びる）
  casters: [
    [0.66, 7.6, 0.42, 6.5], [-3.86, 6.8, 0.42, 6.5], [1.7, 4.6, 0.55, 4.2], [-5.4, 5.6, 0.4, 2.6], [-0.2, 10.6, 0.35, 2.2],
    [3.1, 0.6, 0.6, 1.8], [2.6, 5.4, 0.7, 2.0], [-3.6, -1.4, 0.7, 1.6], [3.0, -3.2, 0.5, 1.4], [-3.2, 9.3, 0.4, 2.0],
    [-6.6, 2.7, 2.4, 2.2], [2.9, 8.9, 0.5, 1.6],
  ],

  // 地形の形（terrain.js の式の引数）
  terrain: {
    rect: [-52, -34, 44, 78], // x0, z0, x1, z1
    cellM: 0.8,
    flatHalfM: 3.5,            // 参道からこの距離までは平ら
    bumpM: 0.9,                // 参道の外の起伏
    bumpFreq: 0.33,
    // 海岸線（z → 岸の x）。これより +X は海へ落ちる
    coast: [[-34, 3.7], [-6, 3.7], [3, 3.9], [8, 4.8], [13, 5], [20, 4.5], [30, 2.5], [44, -3], [60, -10], [78, -20]],
    coastDropM: 3.2,
    coastDepthM: 9,
    coastNoiseM: 1.4,
    // 右と奥の丘（千本鳥居の崖）
    hillFootX: -6.4,
    hillBackZ: 9.4,
    hillBackGain: 0.5,
    hillBackPivotX: -3,
    hillBackSlant: 1.3,
    hillBlend: 2,
    hillNoiseM: 2.6,
    hillNoiseFreq: 0.07,
    hillStep1M: 7.3,           // 1段目（千本鳥居の載る棚）の高さ
    hillStep1W: 6.5,
    hillStep2M: 10,
    hillStep2From: 10.5,
    hillStep2To: 21,
    hillRampRatio: 0.07,
    slopeRock: [0.12, 0.4],    // この傾きから岩肌
    // 色分け：丘の藪の高さ・濡れた岩の高さ・色むらの細かさ・岩の苔
    hillColorM: [1.2, 4.5],
    wetM: [-0.7, -2.4],
    colorFreq: 0.19,
    colorShift: 7,
    rockMoss: 0.3,
    grassMoss: 0.0,
    heightRange: [-10, 16],     // 海の泡の計算に渡す高さの図の範囲（最低, 幅）
    heightMapCount: 128,
  },

  // 物の配置。ground=true は地形の高さに置く（at.y は足し算）
  placements: [
    { model: 'toriiMain', at: [-1.6, -0.05, 7.2], rot: [0, 9, 0] },
    // 石灯籠
    { model: 'lantern', at: [1.75, -0.03, 4.6], rot: [0, 20, 0], scale: 0.98 },
    { model: 'lantern', at: [-5.35, 0, 5.7], rot: [0, -15, 2], scale: 0.52, ground: true },
    { model: 'lantern', at: [-0.3, 0, 10.7], rot: [0, 10, -2], scale: 0.55, ground: true },
    { model: 'lantern', at: [-3.3, 0, 9.4], rot: [0, 30, 3], scale: 0.5, ground: true },
    { model: 'lantern', at: [-6.0, 0, 15.0], rot: [0, 5, 0], scale: 0.55, ground: true },
    { model: 'lantern', at: [-2.4, 0, 14.2], rot: [0, 50, -3], scale: 0.5, ground: true },
    { model: 'lantern', at: [2.6, -0.1, -9.5], rot: [0, 50, -3], scale: 0.9 },
    // 注連縄の巨岩（右手前）
    { model: 'iwakura', at: [-7.0, -0.2, 2.9], rot: [0, -12, 0], scale: 1.0 },
    // 岩（参道の縁・手前・岸）
    { model: 'rockC', at: [3.0, -0.1, 5.3], rot: [0, 30, 0], scale: 0.8 },
    { model: 'rockA', at: [3.2, -0.05, 0.7], rot: [0, 80, 0], scale: 0.85 },
    { model: 'rockB', at: [2.9, -0.1, -3.1], rot: [0, 10, 0], scale: 0.7 },
    { model: 'rockA', at: [2.2, -0.1, -3.9], rot: [0, 150, 0], scale: 0.55 },
    { model: 'rockC', at: [-3.4, -0.15, -1.6], rot: [0, 200, 0], scale: 0.62 },
    { model: 'rockB', at: [-2.9, -0.1, -3.6], rot: [0, 60, 0], scale: 0.6 },
    { model: 'rockA', at: [-4.3, -0.1, -0.2], rot: [0, 20, 0], scale: 0.7 },
    { model: 'rockB', at: [-3.3, -0.1, 9.2], rot: [0, 0, 0], scale: 0.6 },
    { model: 'rockA', at: [2.9, -0.1, 8.9], rot: [0, 40, 0], scale: 0.6 },
    { model: 'rockC', at: [-8.4, -0.3, -1.5], rot: [0, 90, 0], scale: 1.3 },
    { model: 'rockShore', at: [5.6, -2.4, -1.5], rot: [0, 0, 0], scale: 1.1 },
    { model: 'rockShore', at: [6.6, -3.2, 1.2], rot: [0, 70, 0], scale: 1.3 },
    { model: 'rockShore', at: [4.9, -1.9, -4.4], rot: [0, 130, 0], scale: 0.9 },
    { model: 'rockShore', at: [7.9, -3.3, -3.4], rot: [0, 200, 0], scale: 1.0 },
    { model: 'rockShore', at: [6.2, -2.6, 4.2], rot: [0, 40, 0], scale: 1.2 },
    { model: 'rockShore', at: [8.6, -3.4, 6.8], rot: [0, 10, 0], scale: 1.5 },
    { model: 'rockShore', at: [10.5, -3.5, 2.5], rot: [0, 100, 0], scale: 0.8 },
    { model: 'rockShore', at: [7.2, -2.9, 9.6], rot: [0, 250, 0], scale: 1.1 },
    // 山犬の岩棚
    { model: 'rockC', at: [-9.3, -0.5, 14.9], rot: [0, 30, 0], scale: 1.5, ground: true },
    // 石段（鳥居の先を右へ上る）
    { model: 'step', at: [-2.9, 0, 10.4], rot: [0, 22, 0], ground: true },
    { model: 'step', at: [-3.4, 0, 11.3], rot: [0, 26, 0], ground: true },
    { model: 'step', at: [-3.95, 0, 12.2], rot: [0, 30, 0], ground: true },
    { model: 'step', at: [-4.55, 0, 13.05], rot: [0, 36, 0], ground: true },
    { model: 'step', at: [-5.25, 0, 13.85], rot: [0, 40, 0], ground: true },
    { model: 'step', at: [-6.0, 0, 14.65], rot: [0, 42, 0], ground: true },
    { model: 'step', at: [-6.8, 0, 15.4], rot: [0, 44, 0], ground: true },
    { model: 'step', at: [-7.6, 0, 16.15], rot: [0, 46, 0], ground: true },
    // 電柱（左奥。傾いている）
    { model: 'pole', at: [4.2, 0, 16.5], rot: [3, 0, -9], ground: true },
    { model: 'pole', at: [6.6, 0, 11.6], rot: [-2, 0, 7], scale: 0.82, ground: true },
    { model: 'pole', at: [9.5, 0, 22], rot: [0, 0, -4], scale: 0.9, ground: true },
    // 防波堤（左の海）
    { model: 'breakwater', at: [17, -3.2, 27], rot: [0, -10, 0], scale: 0.85 },
    // 灯台（遠くの岬の上）
    { model: 'lighthouse', at: [62, 3, 170], rot: [0, 0, 0], scale: 0.75 },
  ],

  // 妖怪（1体＝1メッシュ）
  yokai: [
    { model: 'chochin', at: [-1.45, 2.75, 7.0], rot: [4, 186, -3], scale: 1.0 },
    { model: 'karakasa', at: [-5.3, 0.05, 9.3], rot: [6, 170, -10], scale: 1.2, ground: true },
    { model: 'yamainu', at: [-9.2, 1.1, 14.6], rot: [8, 118, 0], scale: 1.5, ground: true },
  ],

  // 電線 [始点, 終点, たるみ(m)]
  wires: [
    [[4.95, 6.3, 16.6], [6.2, 5.1, 11.7], 0.5], [[5.3, 6.9, 16.6], [5.9, 5.6, 11.7], 0.45], [[4.95, 6.3, 16.6], [9.6, 5.8, 22], 0.6],
    [[6.2, 5.1, 11.7], [13, -0.5, 4], 1.2], [[5.9, 5.6, 11.7], [16, 0.5, 9], 1.0], [[5.3, 6.9, 16.6], [-0.5, 9, 26], 0.7],
  ],
  wireRM: 0.012,

  // 千本鳥居（崖の棚の上を奥へ並ぶ）。[x, z] の折れ線に沿って stepM ごと
  senbon: { line: [[-12.4, 12.6], [-13.6, 17], [-14.6, 22], [-15.6, 27.5], [-17.5, 32], [-21, 35.5]], stepM: 1.45, sink: 0.15 },

  // 遠くの島と山並み（つぶした球）。[x, y, z, rx, ry, rz, 色]
  islands: [
    [150, -3, 250, 80, 6, 26, '#6f6a92'], [235, -2, 215, 60, 10, 22, '#7c7499'], [60, -2, 285, 90, 10, 30, '#857c9f'],
    [-10, -2, 300, 70, 8, 24, '#9087a6'], [200, -2, 290, 110, 12, 30, '#8d84a4'], [112, -3, 196, 30, 3.5, 12, '#615e84'],
    // 灯台の岬（緑がかった丘）
    [70, -3, 172, 36, 6.5, 14, '#5f6850'], [100, -3, 180, 26, 4, 12, '#68705a'],
    // 右奥へ続く岬
    [-30, -4, 120, 60, 22, 40, '#9a8a9c'], [-90, -4, 90, 70, 34, 50, '#94859a'],
  ],

  // 紅葉の木（右の巨岩の後ろから左へ張り出す）。幹と枝は管、葉は房
  maple: {
    branches: [
      { path: [[-8.6, 2.5, 4.6], [-8.2, 4.6, 4.9], [-7.2, 6.2, 5.2], [-5.6, 7.3, 5.6], [-3.4, 7.9, 6.1]], r: [0.5, 0.16] },
      { path: [[-3.4, 7.9, 6.1], [-1.4, 8.2, 6.3], [0.6, 8.0, 6.7], [2.2, 7.5, 7.2]], r: [0.16, 0.04] },
      { path: [[-5.6, 7.3, 5.6], [-4.6, 8.6, 4.6], [-3.0, 9.3, 3.8], [-1.2, 9.4, 3.2]], r: [0.16, 0.04] },
      { path: [[-7.2, 6.2, 5.2], [-7.6, 7.8, 3.8], [-6.6, 9.0, 2.6], [-5.0, 9.6, 1.6]], r: [0.2, 0.05] },
      { path: [[-3.4, 7.9, 6.1], [-2.6, 7.2, 4.6], [-1.6, 6.9, 3.4], [-0.2, 7.0, 2.6]], r: [0.1, 0.03] },
      { path: [[-8.2, 4.6, 4.9], [-9.6, 6.4, 5.6], [-10.4, 8.2, 6.6]], r: [0.26, 0.06] },
      { path: [[-1.4, 8.2, 6.3], [-0.8, 9.0, 7.6], [0.4, 9.4, 8.8]], r: [0.08, 0.03] },
      { path: [[-8.6, 0.2, 4.4], [-8.7, 1.4, 4.5], [-8.6, 2.5, 4.6]], r: [0.62, 0.5] },
    ],
    // 葉の房 [x, y, z, 半径, 枚数]
    clusters: [
      [2.0, 7.4, 7.2, 1.3, 330], [0.4, 8.0, 6.7, 1.2, 330], [-1.4, 8.3, 6.3, 1.3, 374], [-3.2, 8.1, 6.0, 1.2, 330],
      [-1.2, 9.4, 3.3, 1.4, 374], [-3.0, 9.3, 3.9, 1.3, 330], [-5.0, 9.6, 1.8, 1.5, 374], [-6.6, 9.0, 2.8, 1.3, 308],
      [-0.2, 7.0, 2.7, 1.1, 286], [-1.8, 7.0, 3.6, 0.9, 198], [0.4, 9.4, 8.8, 1.2, 286], [-10.2, 8.2, 6.5, 1.6, 374],
      [-5.4, 7.8, 5.4, 1.1, 242], [-7.4, 7.8, 3.9, 1.2, 264], [3.2, 7.0, 7.6, 0.8, 154], [-4.4, 8.8, 4.6, 1.0, 220],
    ],
    leafM: 0.15,
  },

  // 枯れ木（奥の丘・左奥。細い枝だけ）[x, z, 高さ, 色の濃さ]
  bareTrees: [
    [3.9, 14.5, 3.8, 0.8], [5.8, 16.5, 3.4, 0.7], [2.2, 18.5, 4.6, 0.7], [0.6, 15.2, 4.2, 0.8], [-1.6, 18.5, 5.4, 0.9],
    [-4.2, 20.5, 5.0, 0.85], [1.4, 23, 5.6, 0.8], [5.2, 24, 4.8, 0.8], [-8.2, 21.5, 4.6, 0.85], [-11.2, 19.5, 4.2, 0.85],
    [-17.5, 20, 5.2, 0.8], [-19, 27, 5.6, 0.8], [-10.5, 8.6, 3.6, 1], [-12.6, 3.2, 4.0, 1], [-22, 14, 5.4, 0.85], [-6, 26, 5.0, 0.8],
    [9.4, 14.4, 3.4, 0.95], [-14.6, 9.4, 4.4, 0.95],
  ],
  bareTree: { branchCount: 7, twigCount: 3, trunkRM: 0.07, spreadM: 0.55 },

  // 草むら [x, z, 半径, 株の数, 種類]。種類：susuki（穂のある長い草）・dry（枯れ草）・green（低い草）
  grass: [
    [4.4, -2.6, 2.2, 36, 'susuki'], [5.4, -4.6, 1.8, 30, 'susuki'], [3.6, -4.4, 1.2, 20, 'susuki'], [4.6, 1.2, 1.6, 22, 'susuki'],
    [3.4, 3.0, 1.0, 14, 'susuki'], [-4.0, -3.0, 1.6, 22, 'susuki'], [-4.6, -1.0, 1.4, 20, 'dry'], [-3.4, 0.9, 0.9, 14, 'dry'],
    [-4.4, 4.9, 1.0, 16, 'dry'], [3.0, -1.2, 0.8, 14, 'dry'], [2.9, 2.2, 0.7, 12, 'green'], [3.2, 6.6, 1.4, 22, 'dry'],
    [4.4, 9.5, 2.2, 30, 'susuki'], [2.4, 11.5, 2.0, 26, 'dry'], [-3.9, 8.0, 0.8, 12, 'dry'], [-8.5, 0.4, 2.0, 26, 'dry'],
    [-5.6, -4.2, 2.0, 26, 'susuki'], [6.6, 13.5, 3.0, 34, 'dry'], [0.6, 12.6, 1.6, 18, 'green'], [-1.2, 15.5, 2.4, 22, 'dry'],
    [3.4, -8, 2.0, 26, 'susuki'], [-3.8, -8, 2.0, 24, 'dry'], [-5.6, 8.9, 1.0, 12, 'dry'], [8.6, 16.5, 3.0, 24, 'dry'],
  ],
  grassKinds: {
    susuki: { hM: [1.0, 1.7], blades: [9, 15], wM: 0.036, spreadM: 0.42, lean: 0.55, plume: 0.5, cols: ['susuki', 'susukiPlume', 'grassDry'] },
    dry: { hM: [0.35, 0.75], blades: [9, 14], wM: 0.03, spreadM: 0.3, lean: 0.5, plume: 0, cols: ['susuki', 'grassDry', 'straw'] },
    green: { hM: [0.2, 0.42], blades: [8, 12], wM: 0.03, spreadM: 0.22, lean: 0.45, plume: 0, cols: ['grassOlive', 'moss', 'grassDry'] },
  },
  // 野菊 [x, z, 半径, 株の数]
  daisies: [[2.5, -3.9, 0.9, 30], [3.1, -2.4, 0.6, 16], [-2.8, -3.0, 0.8, 26], [-3.4, -1.0, 0.6, 16], [-2.9, -4.6, 0.9, 26], [2.8, 1.6, 0.5, 12], [-4.2, 4.4, 0.6, 12], [2.0, -5.2, 0.7, 20]],
  daisy: { stemM: [0.2, 0.42], petalM: 0.06, petalCount: 8 },

  // 草木の形の細部
  flora: {
    bladeSegCount: 3,          // 草の葉1枚の節の数
    bladeSway: 0.75,           // 風のしなり（高さ1mあたりの重み）
    bladeCurve: 0.5,           // 葉先の垂れ
    plumeM: [0.24, 0.028],       // ススキの穂（長さ, 幅）
    stemWM: 0.014,             // 野菊の茎の幅
    leafLobe: 0.4,             // もみじの切れ込み（内側の半径の比）
    leafLobeCount: 5,
    leafSway: 0.16,
    clusterFlat: 0.6,          // 葉の房のつぶれ（縦／横）
    treeCurveM: 0.5,           // 枯れ木の幹の曲がり
    treeBranchLen: [0.35, 0.6], // 枝の長さ（木の高さとの比）
    treeBranchFrom: 0.35,      // 枝が出始める高さ（比）
    twigLen: 0.45,
    branchRseg: 6,
    wireSegCount: 6,
    wireRseg: 3,
    islandSeg: 14,
    islandJitter: 0.22,
    islandJfreq: 0.03,
  },

  // 紫の靄の湧く所 [x, y, z, 広がり(m), 重み]
  mistSources: [
    [-0.2, 0.1, 2.9, 0.6, 1], [-1.1, 0.1, 4.3, 0.8, 2], [-2.1, 0.1, 5.9, 0.8, 2], [-2.5, 0.2, 7.4, 1.0, 2], [-3.6, 0.5, 8.6, 1.4, 3],
    [-4.6, 1.2, 10.4, 1.6, 3], [-6.4, 2.6, 12.5, 2.0, 2], [0.6, 0.2, 9.2, 1.4, 2], [-8.2, 4.4, 14.4, 1.6, 2],
  ],
  // 舞う葉の範囲（x幅, 高さ, z奥行）と中心
  leafBox: { size: [26, 9, 22], center: [0, 0, 4] },

  // 歩きの見た目：腰の高さ（m）
  heroHipM: 1.0,
};
