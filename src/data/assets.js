// 外部素材の目録（docs/11 §4）。いまは試しの1件だけ（11/21 依頼者：Tripo 無料版の岩丈を工房で試す）。
// 素材は public/assets/models/<ID>.glb に置く（公開版に入る）。読めなければコードの見た目に戻る。
// 11/21 依頼者の指示で、試し（trial＝Tripo 無料版）も公開URLで見られるよう public に置いた。本番の素材ができたら差し替える。

/**
 * 骨の無い素材にコードで付ける人型の骨（07 §6.3 の骨名。親子は data/lookdev/rigs.js の humanBones）。
 * at＝関節の位置、end＝その骨が受け持つ区間の終わり（形の座標 m。足元0・正面+Z・+X が本人の左）、rM＝区間から体の表面までのおよその半径。
 * end と rM が無い骨は体を動かさない（root・weapon）。
 * @typedef {{at:[number,number,number], end?:[number,number,number], rM?:number}} AssetRigBone
 */

/**
 * @typedef {{id:string, kind:'model'|'texture', url:string, required:false, budget:keyof typeof assetBudgets,
 *  heightM?:number, yawDeg?:number, footOffsetM?:number, rig?:Record<string, AssetRigBone>,
 *  fallback:'procedural'|'none', trial?:boolean, source?:string}} AssetDef
 */

/** 重さの上限（docs/11 §5。単体テスト assets.test が GLB の中身を数えて確かめる） */
export const assetBudgets = {
  harai: { triMaxCount: 12000, texMaxPx: 1024, texMaxCount: 1, meshMaxCount: 1, fileMaxByteCount: 2000000 }, // 祓人1体（武器を除く）
};

/** @type {Record<string, AssetDef>} */
export const assets = {
  ganjo: {
    id: 'ganjo',
    kind: 'model',
    url: 'assets/models/ganjo.glb',
    required: false,
    budget: 'harai',
    heightM: 1.95, // 07 §6.4 の岩丈の身長
    yawDeg: 0,
    // 骨（11/21。正面・横の正射影の画像に 0.1m の升目を重ねて読んだ。腕はやや外へ開いて垂れ、脚は膝から下が外へ開く）
    rig: {
      root: { at: [0, 0, 0] },
      hips: { at: [0, 0.98, 0], end: [0, 1.1, 0], rM: 0.24 },
      spine: { at: [0, 1.1, 0], end: [0, 1.3, 0], rM: 0.24 },
      chest: { at: [0, 1.3, 0], end: [0, 1.58, 0], rM: 0.26 },
      neck: { at: [0, 1.58, 0], end: [0, 1.68, 0.01], rM: 0.1 },
      head: { at: [0, 1.68, 0.01], end: [0, 1.95, 0], rM: 0.14 },
      armL: { at: [0.28, 1.47, -0.03], end: [0.37, 1.13, -0.01], rM: 0.08 },
      forearmL: { at: [0.37, 1.13, -0.01], end: [0.4, 0.92, 0.04], rM: 0.07 },
      handL: { at: [0.4, 0.92, 0.04], end: [0.39, 0.78, 0.06], rM: 0.06 },
      armR: { at: [-0.28, 1.47, -0.03], end: [-0.37, 1.13, -0.01], rM: 0.08 },
      forearmR: { at: [-0.37, 1.13, -0.01], end: [-0.4, 0.92, 0.04], rM: 0.07 },
      handR: { at: [-0.4, 0.92, 0.04], end: [-0.39, 0.78, 0.06], rM: 0.06 },
      thighL: { at: [0.12, 0.93, 0], end: [0.17, 0.52, 0], rM: 0.2 },
      shinL: { at: [0.17, 0.52, 0], end: [0.21, 0.1, 0], rM: 0.12 },
      footL: { at: [0.21, 0.1, 0], end: [0.22, 0.02, 0.18], rM: 0.1 },
      thighR: { at: [-0.12, 0.93, 0], end: [-0.17, 0.52, 0], rM: 0.2 },
      shinR: { at: [-0.17, 0.52, 0], end: [-0.21, 0.1, 0], rM: 0.12 },
      footR: { at: [-0.21, 0.1, 0], end: [-0.22, 0.02, 0.18], rM: 0.1 },
      weapon: { at: [-0.4, 0.86, 0.06] },
    },
    fallback: 'procedural',
    trial: true,
    source: 'Tripo 無料版（11/21）。元は31.5万面・4096²の画像3枚 → 1.2万面・色の画像1枚 1024²（WebP）に軽くした',
  },
};
