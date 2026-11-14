// 押し出し（RigPartDef の shape 'extrude'）の断面と曲がり方。形名は 07 6.4 の部品表の名前。
// 断面は x＝幅の向き（−0.5〜0.5）、z＝厚みの向き（−0.5〜0.5）の多角形（反時計回り）。押し出しは関節から −Y へ。
// 細部の断面形は設計書に無いので M1a で決めた（PROGRESS に記録）。

/**
 * @typedef {Object} ExtrudeShape
 * @property {[number,number][]} section   断面の頂点 [x, z]（幅・厚みに対する割合）
 * @property {[number,number]} capCenter   両端のふたを張る中心 [x, z]（断面の内側の点）
 * @property {number} widthM               幅の既定（dims で上書きできる）
 * @property {number} thickRatio           厚み＝幅×この値
 * @property {number} segCount             長さ方向の分割
 * @property {number} taperPowRatio        細りの曲線：倍率＝1−(1−先端の倍率)×t^この値（大きいほど先端だけ細る）
 * @property {number} anchorXRatio         細るときに動かない断面の x（0＝中心、0.5＝+x の端）
 * @property {'x'|'z'} bendAxis            反りの向き（断面の x か z）
 * @property {'chord'|'tangent'} bendMode  chord＝両端を結ぶ線から中央が「反り」だけ膨らむ／tangent＝根元はまっすぐで、先が曲がる（弦からの反りが「反り」）
 */

/** @type {Record<string, ExtrudeShape>} */
export const extrudeShapes = {
  // 髪束：頭頂から頭の丸みに沿って垂れる、先細りの花びら形。断面は頭の丸みに合わせた三日月（+z が外側）
  tuft: {
    section: [[-0.5, 0], [-0.26, 0.108], [0, 0.145], [0.26, 0.108], [0.5, 0], [0.26, 0.03], [0, 0.05], [-0.26, 0.03]],
    capCenter: [0, 0.1],
    widthM: 0.15,
    thickRatio: 1,
    segCount: 5,
    taperPowRatio: 2,
    anchorXRatio: 0,
    bendAxis: 'z',
    bendMode: 'chord',
  },
  // 長巻の刃：+x が峰（厚い）、−x が刃先（薄い）。峰の線を保ったまま切先へ細る
  curvedBlade: {
    section: [[-0.5, 0], [0.5, -0.5], [0.5, 0.5]],
    capCenter: [0.2, 0],
    widthM: 0.035,
    thickRatio: 0.22,
    segCount: 6,
    taperPowRatio: 5,
    anchorXRatio: 0.5,
    bendAxis: 'x',
    bendMode: 'tangent',
  },
  // 刃の峰：刃の +x の端に重ねる細い帯
  bladeSpine: {
    section: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
    capCenter: [0, 0],
    widthM: 0.012,
    thickRatio: 0.9,
    segCount: 6,
    taperPowRatio: 5,
    anchorXRatio: 0.5,
    bendAxis: 'x',
    bendMode: 'tangent',
  },
};
