// 顔（07 6.8）。顔アトラス（128px のセル×16）のどのセルに、誰の顔を描くか。寸法は 128px のセルの中の px。
// 線の太さと瞳の大きさは config/anim.js。目・口の位置は設計書に無いので M1a で決めた（PROGRESS に記録）。
// 目を閉じた顔はセル番号＋4、痛がる顔は＋8 に描く（config/anim.js の faceRow*）。

/**
 * @typedef {Object} FaceDef
 * @property {number} cell       目を開いた顔のセル番号（0 楓真、1 白雪、2 岩丈）
 * @property {string} skin       肌の色（背景）
 * @property {number} eyeYPx     目の高さ（セルの上端から）
 * @property {number} eyeDxPx    顔の中心から目の中心までの横の距離
 * @property {number} eyeWPx     目の幅
 * @property {number} eyeHPx     目の高さ（上まぶたと下まぶたの間）
 * @property {number} eyeTailUpPx  目尻を上げる量
 * @property {number} mouthYPx   口の高さ（セルの上端から。0 は口なし）
 * @property {number} mouthWPx   口の幅
 */

/** @type {Record<string, FaceDef>} */
export const faces = {
  fuma: { cell: 0, skin: '#c99a78', eyeYPx: 72, eyeDxPx: 22, eyeWPx: 27, eyeHPx: 14, eyeTailUpPx: 5, mouthYPx: 99, mouthWPx: 15 },
};
