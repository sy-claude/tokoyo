// 描画の設定（07 3.1・3.3・4章・10.2 の表）。霧・紙墨パス（07 3.6・3.7）の行は M1b で足す。
// dprMaxMul・renderScaleMul は config/quality.js（09 8.9）に置く。
/** @import {ConfigTable} from '../data/types.js' */

/** @satisfies {ConfigTable} */
export const render = {
  // ---- 3.1 レンダラー ----
  rendererAntialias: { v: false, desc: '作成時のみ指定可。後処理と深度テクスチャがあるため切る' },
  rendererPowerPreference: { v: 'high-performance', desc: 'GPU の選び方' },
  rendererAlpha: { v: false, desc: '背景を透かさない' },
  rendererStencil: { v: false, desc: 'ステンシルを使わない' },
  toneMapping: { v: 'NoToneMapping', desc: '色を表のとおり出す' },
  outputColorSpace: { v: 'SRGBColorSpace', desc: '出力の色空間' },
  sceneRtType: { v: 'HalfFloatType', desc: '場面の描画先の型（M1b。作成失敗時は UnsignedByteType）' },
  msaaSamplesCount: { v: 0, min: 0, max: 8, step: 1, desc: 'MSAA の標本数（個。M1b）' },
  // ---- 3.3 トゥーン ----
  lightAzimuthOffsetDeg: { v: 35, min: -180, max: 180, step: 1, desc: '主光の方位＝夕日の方位＋この角度（deg）' },
  lightElevationDeg: { v: 40, min: 0, max: 90, step: 1, desc: '主光の仰角（deg）' },
  toonRampPx: { v: 16, min: 4, max: 256, step: 1, desc: '階調テクスチャの幅（px。16×1）' },
  toonEdge1Ratio: { v: 0.35, min: 0, max: 1, step: 0.01, desc: '階調の境目：陰と中（h）' },
  toonEdge2Ratio: { v: 0.62, min: 0, max: 1, step: 0.01, desc: '階調の境目：中と明（h）' },
  toonLevelDarkRatio: { v: 0.58, min: 0, max: 1, step: 0.01, desc: '陰段の明るさの倍率' },
  toonLevelMidRatio: { v: 0.8, min: 0, max: 1, step: 0.01, desc: '中段の明るさの倍率' },
  toonLevelLitRatio: { v: 0.98, min: 0, max: 1, step: 0.01, desc: '明段の明るさの倍率' },
  toonShadowTintDarkMul: { v: 1.0, min: 0, max: 1, step: 0.05, desc: '陰段で shadowTint を掛ける割合' },
  toonShadowTintMidMul: { v: 0.35, min: 0, max: 1, step: 0.05, desc: '中段で shadowTint を混ぜる割合' },
  rimPowerRatio: { v: 3.0, min: 0.5, max: 8, step: 0.1, desc: '縁の光：(1−N·V) の指数' },
  rimStepRatio: { v: 0.55, min: 0, max: 1, step: 0.01, desc: '縁の光：出始める閾値' },
  rimSoftRatio: { v: 0.05, min: 0.001, max: 0.5, step: 0.005, desc: '縁の光：閾値からのぼかし幅' },
  rimStrengthRatio: { v: 0.35, min: 0, max: 1, step: 0.01, desc: '縁の光：強さ' },
  // ---- 4 輪郭（裏面押し出し） ----
  outlineHeroPx: { v: 2.6, min: 0.5, max: 6, step: 0.1, desc: '輪郭：主人公・武器（px）' },
  outlineEnemyPx: { v: 2.4, min: 0.5, max: 6, step: 0.1, desc: '輪郭：敵・ボス（px）' },
  outlinePropPx: { v: 2.0, min: 0.5, max: 6, step: 0.1, desc: '輪郭：小道具（px。霧色へ寄せる）' },
  outlineMinPx: { v: 1.5, min: 0.5, max: 4, step: 0.1, desc: '輪郭：画面上の下限（px）' },
  outlineMaxPx: { v: 4.0, min: 1, max: 8, step: 0.1, desc: '輪郭：画面上の上限（px）' },
  outlineNearM: { v: 1.5, min: 0.1, max: 5, step: 0.1, desc: '輪郭：これより近いと世界の太さを保つ（m。式の max(視点深度, 1.5m)）' },
  outlineNoiseBaseRatio: { v: 0.6, min: 0, max: 2, step: 0.05, desc: '輪郭：太さのゆらぎの下限（式の 0.6）' },
  outlineNoiseAmpRatio: { v: 0.8, min: 0, max: 2, step: 0.05, desc: '輪郭：太さのゆらぎの幅（式の 0.8）' },
  outlineNoiseFreqRatio: { v: 3, min: 0.1, max: 20, step: 0.1, desc: '輪郭：ゆらぎの細かさ（物体座標に掛ける。1/m）' },
  outlineLightBoostRatio: { v: 0.5, min: 0, max: 2, step: 0.05, desc: '輪郭：光と反対の側を太くする割合（式の 0.5）' },
  // ---- 10.2 テクスチャ（このMで使う行） ----
  texFaceAtlasPx: { v: 512, min: 128, max: 2048, step: 128, desc: '顔アトラスの一辺（px）' },
  texFaceCellPx: { v: 128, min: 32, max: 512, step: 32, desc: '顔アトラスの1セルの一辺（px）' },
};
