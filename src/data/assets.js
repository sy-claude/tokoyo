// 外部素材の目録（docs/11 §4）。いまは試しの1件だけ（11/21 依頼者：Tripo 無料版の岩丈を工房で試す）。
// 本番の素材は public/assets/models/<ID>.glb に置く。試しの素材（trial）は assets-raw/ に置くので、
// 開発サーバ（npm run dev）でだけ読める。公開版（build）には入らず、読めなければコードの見た目に戻る。

/**
 * @typedef {{id:string, kind:'model'|'texture', url:string, required:false, budget:keyof typeof assetBudgets,
 *  heightM?:number, yawDeg?:number, footOffsetM?:number,
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
    url: 'assets-raw/models/ganjo.glb',
    required: false,
    budget: 'harai',
    heightM: 1.95, // 07 §6.4 の岩丈の身長
    yawDeg: 0,
    fallback: 'procedural',
    trial: true,
    source: 'Tripo 無料版（11/21）。元は31.5万面・4096²の画像3枚 → 1.2万面・色の画像1枚 1024²（WebP）に軽くした',
  },
};
