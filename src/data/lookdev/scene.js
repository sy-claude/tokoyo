// 見た目の試作（lookdev）の場面の記述：色・光・地形の形・物の配置・草木の散らし方。
// 座標は「主人公の開始位置が原点」の局所座標（m）。+Z＝前（鳥居の方）、+X＝左（海）、−X＝右（崖）、+Y＝上。
// 参考画像（design-notes/lookdev/reference.png）の構図に合わせて決めた（設計書に無い「見た目の創作部分」）。

export const scene = {
  // 夕日の方角（主人公から見て左前の水平線すれすれ）
  sunDir: [0.6, 0.032, 0.8],

  palette: {
    paper: '#f1e8d6',
    paperWhite: '#f4efe6',
    ink: '#4b3b45',
    // 鳥居
    toriiRed: '#b24c3a',
    toriiRedLo: '#a34a3c',
    toriiRedHi: '#c25c45',
    toriiRoof: '#5c5560',
    toriiFar: '#b4604c',
    peel: '#cdc2b6',
    vine: '#5d6248',
    // 石・岩
    stone: '#948a86',
    stoneHi: '#b0a59e',
    stoneDark: '#7a706f',
    rock: '#a59684',
    rockHi: '#b8ab9b',
    rockDark: '#857a74',
    rockWet: '#7a7078',
    cliff: '#857872',
    cliffHi: '#a8998c',
    pave: '#8f7e74',
    paveHi: '#a79a9a',
    crack: '#3e2f47',
    moss: '#74714e',
    concrete: '#857d82',
    concreteHi: '#9d9494',
    lighthouse: '#e6dfd4',
    // 土・草
    earth: '#7a6a60',
    grassDry: '#9a8869',
    grassOlive: '#77745a',
    hillBrush: '#8a6f68',
    hillBrushWarm: '#a87a62',
    susuki: '#d9c79c',
    susukiPlume: '#f0e3c4',
    daisy: '#f6f2e8',
    daisyCore: '#e0b84a',
    straw: '#c2b084',
    strawHi: '#d9caa2',
    // 木
    bark: '#5b4a52',
    barkHi: '#7c6763',
    bareTree: '#7a6878',
    fallen: ['#9d2d26', '#b85a34', '#85282a', '#a8683a', '#7a4a3a', '#b04a30'],
    bushGreen: '#5f6350',
    bushGreenHi: '#7b7a5c',
    bushRed: '#84503f',
    bushRedHi: '#a3644c',
    maple: ['#9d2d26', '#ab3d2a', '#85282a', '#b85a34', '#92332d', '#a5352e'],
    // 電柱など
    poleWood: '#5b4d50',
    poleWoodHi: '#75656a',
    poleMetal: '#7b7f8c',
    wire: '#6a5c66',
    // 主人公
    haori: '#5f8563',
    haoriLo: '#466a50',
    hakama: '#6f645c',
    hakamaLo: '#4d4440',
    obi: '#7a3f38',
    kyahan: '#d8d0c2',
    // 草鞋と脚絆の縄（場面の枯れ草のわら色より濃く。白い脚絆・肌と見分ける）
    waraji: '#8f7550',
    warajiHi: '#a88b5e',
    skin: '#e3c5a9',
    hair: '#2f2a31',
    hilt: '#5c2f30',
    hiltHi: '#7a3a36',
    gold: '#c9a24e',
    steel: '#aeb6c2',
    steelHi: '#e4e8ec',
    tassel: '#c4372e',
    // 妖怪
    chochin: '#dcc9a0',
    chochinLo: '#bba57c',
    chochinSoot: '#1e1b1a',
    chochinMid: '#9a8566',
    chochinSootHi: '#5a4b3f',
    chochinRib: '#9c8468',
    eyeAmber: '#d2a437',
    mouth: '#5a2a30',
    tongue: '#cf7f88',
    tongueHi: '#e9a6a4',
    kasa: '#727a58',
    kasaFace: '#8a8c6a',
    kasaRib: '#a48f68',
    kasaEye: '#7d8c80',
    kasaSkin: '#ddcfba',
    kasaLo: '#4f5640',
    getaWood: '#7a5f4c',
    wolf: '#6e7064',
    wolfLo: '#45484a',
    eyeCyan: '#8ff4e2',
    lampGlow: '#f6dfa6',
  },

  light: {
    lightCol: '#fff0d6',
    lightGain: 1.14,
    shadeCol: '#bdb0b4',
    shadeGain: 0.84,
    rimCol: '#f6a468',
    fogWarm: '#dcae98',
    fogCool: '#c4aea8',
    reflWarm: '#f7b877',
    reflCool: '#a79fc6',
    glowCol: '#9c5fdc',
  },

  sky: {
    top: '#5d5f84',
    mid: '#a08398',
    low: '#dc8c74',
    horizonSun: '#f2c9a0',
    horizonFar: '#d9aca0',
    cloudDark: '#665f7c',
    cloudLit: '#e89a7c',
    cloudEdge: '#fad29c',
    sun: '#e24f38',
    sunCore: '#f07848',
    radiusM: 380,
  },

  sea: {
    near: '#4a507a',
    far: '#8a7896',
    deep: '#3c466f',
    foam: '#f3eee6',
    glitter: '#ffb26a',
    sizeM: 760,
  },

  mist: { col: '#4d3462', core: '#8a6aa6' },

  // 参道の中心線 [x, z, 半幅]（8点。石畳の範囲）
  path: [
    [0.1, -16, 2.2], [0.1, -5, 2.3], [0, 1, 2.4], [-0.4, 4, 2.4], [-1.5, 7.2, 2.3], [-2.7, 10, 2.1], [-4.7, 13, 1.9], [-7.6, 16.2, 1.8],
  ],
  // 地面の裂け目 [x, z, 幅]（6点。紫の靄が漏れる）
  fissure: [[0.6, 1.2, 0.02], [-0.2, 2.7, 0.06], [-1.0, 3.6, 0.1], [-1.2, 5.0, 0.07], [-2.1, 5.9, 0.1], [-2.6, 7.6, 0.04]],
  // 置き影 [x, z, 半径, 長さ]（12個。夕日の反対側へ伸びる）
  casters: [
    [0.66, 7.6, 0.42, 6.5], [-3.86, 6.8, 0.42, 6.5], [2.0, 3.9, 0.6, 4.2], [-5.4, 5.6, 0.4, 2.6], [-0.2, 10.6, 0.35, 2.2],
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
    { model: 'lanternBig', at: [2.0, -0.08, 3.9], rot: [0, 20, 0], scale: 1.08 },
    { model: 'lantern', at: [-5.35, 0, 5.7], rot: [0, -15, 2], scale: 0.52, ground: true },
    { model: 'lantern', at: [-0.3, 0, 10.7], rot: [0, 10, -2], scale: 0.55, ground: true },
    { model: 'lantern', at: [-3.3, 0, 9.4], rot: [0, 30, 3], scale: 0.5, ground: true },
    { model: 'lantern', at: [-6.0, 0, 15.0], rot: [0, 5, 0], scale: 0.55, ground: true },
    { model: 'lantern', at: [-2.4, 0, 14.2], rot: [0, 50, -3], scale: 0.5, ground: true },
    { model: 'lantern', at: [2.6, -0.1, -9.5], rot: [0, 50, -3], scale: 0.9 },
    // 注連縄の巨岩（右手前）
    { model: 'iwakura', at: [-7.6, -0.2, 3.6], rot: [0, -12, 0], scale: 0.82 },
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
    // 石段（鳥居の先を右へ上る。幅の狭い薄い踏み石を細かく刻む。少しずつ傾いて不ぞろい）
    { model: 'stepSlab', at: [-2.90, 0, 10.40], rot: [0, 20, 1], ground: true },
    { model: 'stepSlab', at: [-3.13, 0, 10.82], rot: [-2, 21, 2], ground: true },
    { model: 'stepSlab', at: [-3.37, 0, 11.24], rot: [-2, 25, 2], ground: true },
    { model: 'stepSlab', at: [-3.62, 0, 11.66], rot: [-2, 29, -1], ground: true },
    { model: 'stepSlab', at: [-3.88, 0, 12.08], rot: [-2, 26, 1], ground: true },
    { model: 'stepSlab', at: [-4.15, 0, 12.48], rot: [1, 29, -1], ground: true },
    { model: 'stepSlab', at: [-4.43, 0, 12.88], rot: [-2, 36, 1], ground: true },
    { model: 'stepSlab', at: [-4.74, 0, 13.26], rot: [-2, 40, 2], ground: true },
    { model: 'stepSlab', at: [-5.06, 0, 13.64], rot: [-2, 37, 2], ground: true },
    { model: 'stepSlab', at: [-5.40, 0, 14.01], rot: [-2, 41, 2], ground: true },
    { model: 'stepSlab', at: [-5.75, 0, 14.38], rot: [1, 38, -1], ground: true },
    { model: 'stepSlab', at: [-6.11, 0, 14.75], rot: [-2, 43, -1], ground: true },
    { model: 'stepSlab', at: [-6.48, 0, 15.10], rot: [0, 43, -1], ground: true },
    { model: 'stepSlab', at: [-6.85, 0, 15.45], rot: [2, 41, 2], ground: true },
    { model: 'stepSlab', at: [-7.23, 0, 15.80], rot: [0, 46, -1], ground: true },
    { model: 'stepSlab', at: [-7.60, 0, 16.15], rot: [-2, 47, 2], ground: true },
    // 崩れた石垣（石段の両脇。奥ほど低く崩れる）と転がった石
    { model: 'ishigaki', at: [-1.26, -0.1, 9.90], rot: [2, 110, 1], scale: 1.00, ground: true },
    { model: 'ishigaki', at: [-4.93, -0.1, 11.64], rot: [-3, 116, -3], scale: 1.00, ground: true },
    { model: 'ishigakiBroken', at: [-2.40, -0.1, 11.36], rot: [1, 115, -1], scale: 0.90, ground: true },
    { model: 'ishigaki', at: [-5.93, -0.1, 13.79], rot: [0, 128, 4], scale: 1.05, ground: true },
    { model: 'ishigakiBroken', at: [-6.96, -0.1, 15.36], rot: [0, 137, 1], scale: 0.90, ground: true },
    { model: 'ishigaki', at: [-4.23, -0.1, 13.05], rot: [0, 134, 3], scale: 1.00, ground: true },
    { model: 'ishigakiBroken', at: [-5.65, -0.1, 14.26], rot: [-1, 133, -1], scale: 0.85, ground: true },
    { model: 'ishigaki', at: [-8.58, -0.1, 17.15], rot: [3, 131, -1], scale: 0.90, ground: true },
    // 木の根（斜面を這って石段の縁へ出る）
    { model: 'roots', at: [-5.92, 0.02, 12.86], rot: [0, 200, 0], scale: 1.00, ground: true },
    { model: 'roots', at: [-6.89, 0.02, 14.96], rot: [0, 150, 0], scale: 1.20, ground: true },
    { model: 'roots', at: [-4.41, 0.02, 13.18], rot: [0, 20, 0], scale: 1.00, ground: true },
    { model: 'roots', at: [-2.45, 0.02, 11.52], rot: [0, 330, 0], scale: 0.90, ground: true },
    // 電柱（左奥。傾いている）
    { model: 'pole', at: [4.2, 0, 16.5], rot: [3, 0, -9], ground: true },
    { model: 'pole', at: [6.6, 0, 11.6], rot: [-2, 0, 7], scale: 0.82, ground: true },
    { model: 'pole', at: [9.5, 0, 22], rot: [0, 0, -4], scale: 0.9, ground: true },
    // 防波堤（左の海）
    { model: 'breakwater', at: [12.5, -3.3, 15.5], rot: [0, -12, 0], scale: 0.9 },
    // 灯台（遠くの岬の上）
    { model: 'lighthouse', at: [62, 3, 170], rot: [0, 0, 0], scale: 0.75 },
  ],

  // 妖怪（1体＝1メッシュ）。motion＝身じろぎ：pivot＝支点（形の座標 m）、swayDeg＝[前後, 左右] の揺れ、bob＝呼吸の上下、hop＝小跳び、phase＝ずらし
  yokai: [
    { model: 'chochin', at: [-1.45, 2.45, 7.0], rot: [4, 186, -3], scale: 1.0,
      motion: { pivot: [0, 2.15, 0], swayDeg: [3.5, 5], swayHz: 0.31, bobM: 0, bobHz: 0, hopM: 0, hopHz: 0, phase: 0.4 } },
    { model: 'karakasa', at: [-6.5, 0.05, 10.4], rot: [5, 160, -9], scale: 1.2, ground: true,
      motion: { pivot: [0, 0, 0], swayDeg: [4, 5], swayHz: 0.42, bobM: 0, bobHz: 0, hopM: 0.2, hopHz: 0.42, phase: 1.1 } },
    { model: 'yamainu', at: [-9.2, 0.95, 14.6], rot: [6, 122, 0], scale: 1.6, ground: true,
      motion: { pivot: [0, 0.4, -0.5], swayDeg: [2.2, 1.2], swayHz: 0.5, bobM: 0.012, bobHz: 0.5, hopM: 0, hopHz: 0, phase: 2.3 } },
  ],

  // 電線 [始点, 終点, たるみ(m)]
  wires: [
    [[4.95, 6.3, 16.6], [6.2, 5.1, 11.7], 0.5], [[5.3, 6.9, 16.6], [5.9, 5.6, 11.7], 0.45], [[4.95, 6.3, 16.6], [9.6, 5.8, 22], 0.6],
    [[5.3, 6.9, 16.6], [-0.5, 9, 26], 0.7], [[9.6, 5.8, 22], [16, 6, 34], 0.8],
  ],
  wireRM: 0.008,

  // 千本鳥居（崖の棚の上を奥へ並ぶ）。[x, z] の折れ線に沿って stepM ごと
  senbon: { line: [[-12.4, 12.6], [-13.6, 17], [-14.6, 22], [-15.6, 27.5], [-17.5, 32], [-21, 35.5]], stepM: 1.45, sink: 0.15 },

  // 遠くの島と山並み（つぶした球）。[x, y, z, rx, ry, rz, 色]
  islands: [
    [168, -3, 250, 70, 5, 26, '#5d5a82'], [235, -2, 215, 60, 15, 22, '#646088'], [60, -2, 285, 90, 19, 30, '#6c6790'],
    [-10, -2, 300, 70, 14, 24, '#757095'], [200, -2, 290, 110, 22, 30, '#716c92'], [112, -3, 196, 30, 5, 12, '#55527a'],
    // 灯台の岬（緑がかった丘）
    [70, -3, 172, 36, 6.5, 14, '#5f6850'], [100, -3, 180, 26, 4, 12, '#68705a'],
    // 右奥へ続く岬
    [-30, -4, 120, 60, 22, 40, '#9a8a9c'], [-90, -4, 90, 70, 34, 50, '#94859a'],
  ],

  // 紅葉の木（右の巨岩の後ろから左へ張り出す）。幹と枝は管、葉は房
  maple: {
    branches: [
      { path: [[-10.4, 2.5, 4.6], [-9.6, 4.8, 4.9], [-8.2, 6.6, 5.2], [-5.9, 7.6, 5.6], [-3.4, 7.9, 6.1]], r: [0.36, 0.12] },
      { path: [[-3.4, 7.9, 6.1], [-1.4, 8.2, 6.3], [0.6, 8.0, 6.7], [2.2, 7.5, 7.2], [3.6, 7.6, 7.8]], r: [0.12, 0.025] },
      { path: [[-5.9, 7.6, 5.6], [-4.6, 8.6, 4.6], [-3.0, 9.3, 3.8], [-1.2, 9.4, 3.2]], r: [0.11, 0.03] },
      { path: [[-8.2, 6.6, 5.2], [-7.8, 8.0, 3.8], [-6.6, 9.0, 2.6], [-5.0, 9.6, 1.6]], r: [0.14, 0.04] },
      { path: [[-3.4, 7.9, 6.1], [-2.6, 7.2, 4.6], [-1.6, 6.9, 3.4], [-0.2, 7.0, 2.6]], r: [0.1, 0.03] },
      { path: [[-9.6, 4.8, 4.9], [-10.8, 6.6, 5.6], [-11.4, 8.4, 6.6]], r: [0.2, 0.05] },
      { path: [[-1.4, 8.2, 6.3], [-0.8, 9.0, 7.6], [0.4, 9.4, 8.8]], r: [0.08, 0.03] },
      { path: [[4.3, 0, 8.6], [4.2, 0.9, 8.6], [4.5, 1.7, 8.8]], r: [0.07, 0.02] },
      { path: [[5.4, -0.2, 9.4], [5.5, 1.2, 9.4], [5.2, 2.3, 9.2]], r: [0.08, 0.02] },
      { path: [[3.3, 0, 7.2], [3.5, 0.7, 7.1], [3.2, 1.3, 7.3]], r: [0.05, 0.02] },
      { path: [[-10.6, 0.2, 4.4], [-10.7, 1.4, 4.5], [-10.4, 2.5, 4.6]], r: [0.46, 0.36] },
    ],
    // 葉の房 [x, y, z, 半径, 枚数]
    clusters: [
      [4.4, 1.7, 8.7, 1.0, 110], [5.3, 2.3, 9.3, 1.1, 120], [3.3, 1.3, 7.2, 0.7, 70], [6.3, 1.4, 10.4, 0.9, 80],
      [2.0, 7.4, 7.2, 1.3, 165], [0.4, 8.0, 6.7, 1.2, 165], [-1.4, 8.3, 6.3, 1.3, 187], [-3.2, 8.1, 6.0, 1.2, 165],
      [-1.2, 9.4, 3.3, 1.4, 187], [-3.0, 9.3, 3.9, 1.3, 165], [-5.0, 9.6, 1.8, 1.5, 187], [-6.6, 9.0, 2.8, 1.3, 154],
      [-0.2, 7.0, 2.7, 1.1, 143], [-1.8, 7.0, 3.6, 0.9, 99], [0.4, 9.4, 8.8, 1.2, 143], [-10.2, 8.2, 6.5, 1.6, 187],
      [-5.4, 7.8, 5.4, 1.1, 121], [-7.4, 7.8, 3.9, 1.2, 132], [3.2, 7.0, 7.6, 0.8, 77], [-4.4, 8.8, 4.6, 1.0, 110],
    ],
    leafM: 0.15,
  },

  // 枯れ木（奥の丘・左奥。細い枝だけ）[x, z, 高さ, 色の濃さ]
  bareTrees: [
    [3.4, 7.6, 4.6, 0.95], [4.9, 9.6, 5.2, 0.9], [6.0, 7.2, 3.6, 0.95], [3.0, 10.6, 4.2, 0.9],
    [3.9, 14.5, 3.8, 0.8], [5.8, 16.5, 3.4, 0.7], [2.2, 18.5, 4.6, 0.7], [0.6, 15.2, 4.2, 0.8], [-1.6, 18.5, 5.4, 0.9],
    [-4.2, 20.5, 5.0, 0.85], [1.4, 23, 5.6, 0.8], [5.2, 24, 4.8, 0.8], [-8.2, 21.5, 4.6, 0.85], [-11.2, 19.5, 4.2, 0.85],
    [-17.5, 20, 5.2, 0.8], [-19, 27, 5.6, 0.8], [-10.5, 8.6, 3.6, 1], [-12.6, 3.2, 4.0, 1], [-22, 14, 5.4, 0.85], [-6, 26, 5.0, 0.8],
    [9.4, 14.4, 3.4, 0.95], [-14.6, 9.4, 4.4, 0.95],
  ],
  bareTree: { branchCount: 7, twigCount: 3, trunkRM: 0.07, spreadM: 0.55 },

  // 草むら [x, z, 半径, 株の数, 種類]。種類：susuki（穂のある長い草）・dry（枯れ草）・green（低い草）
  grass: [
    [4.4, -2.6, 2.2, 46, 'susuki'], [5.4, -4.6, 1.8, 40, 'susuki'], [3.6, -4.4, 1.2, 30, 'susuki'], [3.4, -5.6, 1.0, 26, 'susuki'], [-3.6, -5.2, 1.2, 26, 'susuki'], [4.6, 1.2, 1.6, 22, 'susuki'],
    [3.4, 3.0, 1.0, 14, 'susuki'], [-4.0, -3.0, 1.6, 22, 'susuki'], [-4.6, -1.0, 1.4, 20, 'dry'], [-3.4, 0.9, 0.9, 14, 'dry'],
    [-4.4, 4.9, 1.0, 16, 'dry'], [3.0, -1.2, 0.8, 14, 'dry'], [2.9, 2.2, 0.7, 12, 'green'], [3.2, 6.6, 1.4, 22, 'dry'],
    [4.4, 9.5, 2.2, 30, 'susuki'], [2.4, 11.5, 2.0, 26, 'dry'], [-3.9, 8.0, 0.8, 12, 'dry'], [-8.5, 0.4, 2.0, 26, 'dry'],
    [-5.6, -4.2, 2.0, 26, 'susuki'], [6.6, 13.5, 3.0, 34, 'dry'], [0.6, 12.6, 1.6, 18, 'green'], [-1.2, 15.5, 2.4, 22, 'dry'],
    [3.4, -8, 2.0, 26, 'susuki'], [-3.8, -8, 2.0, 24, 'dry'], [-5.6, 8.9, 1.0, 12, 'dry'], [8.6, 16.5, 3.0, 24, 'dry'],
  ],
  grassKinds: {
    susuki: { hM: [1.0, 1.8], blades: [9, 15], wM: 0.036, spreadM: 0.42, lean: 0.6, plume: 0.8, cols: ['susuki', 'susukiPlume', 'grassDry'] },
    dry: { hM: [0.35, 0.75], blades: [9, 14], wM: 0.03, spreadM: 0.3, lean: 0.5, plume: 0, cols: ['susuki', 'grassDry', 'straw'] },
    green: { hM: [0.2, 0.42], blades: [8, 12], wM: 0.03, spreadM: 0.22, lean: 0.45, plume: 0, cols: ['grassOlive', 'moss', 'grassDry'] },
  },
  // 野菊 [x, z, 半径, 株の数]
  daisies: [[1.9, -4.5, 0.7, 34], [-2.2, -4.3, 0.8, 44], [-3.0, -3.3, 0.7, 34], [2.5, -3.9, 0.9, 30], [3.1, -2.4, 0.6, 16], [-2.8, -3.0, 0.8, 26], [-3.4, -1.0, 0.6, 16], [-2.9, -4.6, 0.9, 26], [2.8, 1.6, 0.5, 12], [-4.2, 4.4, 0.6, 12], [2.0, -5.2, 0.7, 20]],
  daisy: { stemM: [0.2, 0.42], petalM: 0.07, petalCount: 8 },

  // 落ち葉 [x, z, 半径, 枚数]
  fallenLeaves: [[0, -2, 4.5, 60], [-0.5, 3, 3.5, 40], [-1.5, 7, 3, 30], [2.6, -3, 2, 40], [-3, -2.5, 2, 40], [-3.2, 10.5, 2.5, 20]],
  // 散らす物：edge=[z0, z1] は参道の縁に沿って（offM＝中心からの距離）、disc=[x, z, 半径] は円の中
  scatter: [
    { models: ['pebbleA', 'pebbleB'], count: 46, edge: [-13, 9], offM: [2.4, 3.5], scale: [0.14, 0.42], sink: 0.12, tilt: 20 },
    { models: ['rockA', 'rockB', 'rockC'], count: 14, edge: [-13, 9], offM: [3.0, 4.2], scale: [0.4, 0.8], sink: 0.2, tilt: 14 },
    { models: ['rockC', 'rockB', 'pebbleA'], count: 16, edge: [9.8, 16], offM: [2.5, 4.2], scale: [0.45, 1.2], sink: 0.3, tilt: 16 },
    { models: ['pebbleB', 'rockShore'], count: 26, disc: [7.5, 0, 9], scale: [0.4, 1.3], sink: 0.3, tilt: 20 },
    { models: ['rockC', 'rockB'], count: 12, disc: [-16, 6, 8], scale: [0.5, 1.2], sink: 0.35, tilt: 16 },
    { models: ['rockC', 'rockB'], count: 10, disc: [0, 19, 7], scale: [0.4, 1.0], sink: 0.35, tilt: 16 },
    { models: ['bush', 'bushRed'], count: 26, disc: [3, 15, 8], scale: [0.6, 1.5], sink: 0.1, tilt: 6 },
    { models: ['bush', 'bushRed'], count: 18, disc: [-14, 22, 12], scale: [0.6, 1.3], sink: 0.1, tilt: 6 },
    { models: ['bush'], count: 10, disc: [5.5, 6, 3], scale: [0.4, 0.9], sink: 0.1, tilt: 6 },
    { models: ['bush'], count: 12, disc: [4.8, 8.8, 3.2], scale: [0.6, 1.2], sink: 0.15, tilt: 6 },
  ],
  // 岩の出っ張りを明るく・くぼみを暗く塗る強さ
  aoGain: 0.55,

  // 草木の形の細部
  flora: {
    fallenTilt: 0.12,          // 落ち葉の傾き
    fallenLiftM: 0.025,
    fallenSize: 0.55,          // 落ち葉の大きさ（木の葉との比）        // 落ち葉を地面から浮かせる量（m）
    bladeSegCount: 3,          // 草の葉1枚の節の数
    bladeSway: 0.75,           // 風のしなり（高さ1mあたりの重み）
    bladeCurve: 0.5,           // 葉先の垂れ
    plumeM: [0.3, 0.04],       // ススキの穂（長さ, 幅）
    stemWM: 0.014,             // 野菊の茎の幅
    leafLobe: 0.4,             // もみじの切れ込み（内側の半径の比）
    leafLobeCount: 5,
    leafSway: 0.16,
    clusterFlat: 0.45,          // 葉の房のつぶれ（縦／横）
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
    [-0.2, 0.1, 2.7, 0.4, 2], [-1.0, 0.1, 3.6, 0.5, 3], [-1.2, 0.1, 5.0, 0.5, 3], [-2.1, 0.1, 5.9, 0.6, 3], [-2.6, 0.2, 7.6, 0.8, 3], [-3.6, 0.5, 8.6, 1.2, 3],
    [-4.6, 1.2, 10.4, 1.6, 3], [-6.4, 2.6, 12.5, 2.0, 2], [0.6, 0.2, 9.2, 1.4, 2], [-8.2, 4.4, 14.4, 1.6, 2],
  ],
  // 波しぶきの上がる所（岸の岩）[x, y, z, 広がり(m), 重み]
  spraySources: [
    [5.2, -2.6, -3.6, 0.7, 3], [5.9, -2.8, -1.2, 0.8, 3], [6.4, -2.9, 1.4, 0.8, 2], [5.0, -2.4, -5.6, 0.7, 3], [6.3, -2.8, 4.4, 0.9, 2], [7.4, -2.9, 7.2, 1.0, 2],
  ],
  spray: { col: '#e9e2dc', core: '#fbf7f0' },
  // 舞う葉の範囲（x幅, 高さ, z奥行）と中心
  leafBox: { size: [26, 9, 22], center: [0, 0, 4] },

  // 落ち影の図の中心（この周りだけ影を落とす）
  shadowCenter: [-1, 1, 4],

  // 工房（?scene=lookdev&model=形の名前）：台と、カメラの距離（形の半径の何倍か）
  atelier: {
    floorParts: [{ s: 'cyl', r: [9, 9], h: 0.2, seg: 32, at: [0, -0.2, 0], col: 'paveHi' }],
    distMul: 1.5,
    // 形を床から持ち上げる高さ（m。吊り下がる妖怪の舌が床に埋もれないように）
    liftM: { chochin: 1.3 },
    // 寄りの枠 [中心の高さ(m), 半径(m)]。all＝全身（長い武器や鉢巻の尾を枠の基準にしない）
    focus: {
      hero: { all: [0.88, 1.28], head: [1.56, 0.26], body: [1.02, 0.72], legs: [0.35, 0.45] },
      lanternBig: { all: [1.5, 2.35], top: [2.45, 1.5] },
      chochin: { all: [1.7, 2.2], face: [2.15, 0.6] },
      karakasa: { all: [1.2, 1.8], face: [1.7, 0.45] },
      iwakura: { all: [2.1, 3.6], rope: [2.5, 1.6] },
      rockA: { all: [0.35, 1.1] },
      rockB: { all: [0.35, 0.95] },
      rockC: { all: [0.35, 1.6] },
      rockShore: { all: [0.25, 1.5] },
    },
  },

};
