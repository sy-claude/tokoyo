// 骨組み（07 §6.3 の人型の骨。posM は親からの相対 m、楓真 1.72m 基準）。剛体スキン：部品ごとに骨を1本決める（07 §6.1）。
// 部品の表（models.js）では、部品または group に bone: '骨の名前' を書く（無ければ親から受け継ぐ。一番上は root）。

/** @typedef {{name:string, parent:string|null, posM:[number,number,number]}} BoneDef */

/** @type {BoneDef[]} 人型（ポーズ対象の骨。ばね専用の骨はまだ作らない） */
export const humanBones = [
  { name: 'root', parent: null, posM: [0, 0, 0] },
  { name: 'hips', parent: 'root', posM: [0, 0.95, 0] },
  { name: 'spine', parent: 'hips', posM: [0, 0.1, 0] },
  { name: 'chest', parent: 'spine', posM: [0, 0.18, 0] },
  { name: 'neck', parent: 'chest', posM: [0, 0.22, 0] },
  { name: 'head', parent: 'neck', posM: [0, 0.08, 0] },
  { name: 'armL', parent: 'chest', posM: [0.19, 0.17, 0] },
  { name: 'forearmL', parent: 'armL', posM: [0, -0.28, 0] },
  { name: 'handL', parent: 'forearmL', posM: [0, -0.25, 0] },
  { name: 'armR', parent: 'chest', posM: [-0.19, 0.17, 0] },
  { name: 'forearmR', parent: 'armR', posM: [0, -0.28, 0] },
  { name: 'handR', parent: 'forearmR', posM: [0, -0.25, 0] },
  { name: 'thighL', parent: 'hips', posM: [0.1, -0.04, 0] },
  { name: 'shinL', parent: 'thighL', posM: [0, -0.44, 0] },
  { name: 'footL', parent: 'shinL', posM: [0, -0.4, 0] },
  { name: 'thighR', parent: 'hips', posM: [-0.1, -0.04, 0] },
  { name: 'shinR', parent: 'thighR', posM: [0, -0.44, 0] },
  { name: 'footR', parent: 'shinR', posM: [0, -0.4, 0] },
  { name: 'weapon', parent: 'handR', posM: [0, -0.06, 0.02] },
];


/** @typedef {{bone:string, axes:'xz'|'x', gainMul:number, limitDeg:number}} SpringDef */

/**
 * 主人公（楓真）のばね専用の骨（07 §6.3「二次」）。ポーズでは指定しない（袴だけは 07 §6.2 の「自分の太もも50%＋両脚平均50%」を基準の向きにする）。
 * 鉢巻の尾は、この模型では風で横へ流れる形なので、骨の位置は尾の道のり（models.js の鉢巻の尾）の 0・1/3・2/3 の点に合わせた（設計書の posM は真下へ垂れる尾の値）。
 * 羽織の裾（hemB）と後ろ髪の2〜4節は、付ける部品がまだ無いので作らない。
 * @type {BoneDef[]}
 */
export const heroSpringBones = [
  { name: 'sleeveL', parent: 'armL', posM: [0.02, -0.02, 0] },
  { name: 'sleeveR', parent: 'armR', posM: [-0.02, -0.02, 0] },
  { name: 'hakamaL', parent: 'hips', posM: [0.1, -0.04, 0] },
  { name: 'hakamaR', parent: 'hips', posM: [-0.1, -0.04, 0] },
  { name: 'hair1', parent: 'head', posM: [0, -0.02, -0.11] },
  { name: 'hachiA1', parent: 'head', posM: [0.012, 0.118, -0.135] },
  { name: 'hachiA2', parent: 'hachiA1', posM: [0.408, -0.098, -0.115] },
  { name: 'hachiA3', parent: 'hachiA2', posM: [0.42, -0.07, 0.09] },
  { name: 'hachiB1', parent: 'head', posM: [0.012, 0.112, -0.135] },
  { name: 'hachiB2', parent: 'hachiB1', posM: [0.268, -0.142, -0.125] },
  { name: 'hachiB3', parent: 'hachiB2', posM: [0.32, -0.07, 0.007] },
];

/** 揺れの対象と強さ（07 §6.5：大袖0.06、袴0.03、後ろ髪0.08、鉢巻の尾0.10。limitDeg は袴25・他70） @type {SpringDef[]} */
export const heroSprings = [
  { bone: 'sleeveL', axes: 'xz', gainMul: 0.06, limitDeg: 70 },
  { bone: 'sleeveR', axes: 'xz', gainMul: 0.06, limitDeg: 70 },
  { bone: 'hakamaL', axes: 'xz', gainMul: 0.03, limitDeg: 25 },
  { bone: 'hakamaR', axes: 'xz', gainMul: 0.03, limitDeg: 25 },
  { bone: 'hair1', axes: 'xz', gainMul: 0.08, limitDeg: 70 },
  { bone: 'hachiA1', axes: 'xz', gainMul: 0.1, limitDeg: 70 },
  { bone: 'hachiA2', axes: 'xz', gainMul: 0.1, limitDeg: 70 },
  { bone: 'hachiA3', axes: 'xz', gainMul: 0.1, limitDeg: 70 },
  { bone: 'hachiB1', axes: 'xz', gainMul: 0.1, limitDeg: 70 },
  { bone: 'hachiB2', axes: 'xz', gainMul: 0.1, limitDeg: 70 },
  { bone: 'hachiB3', axes: 'xz', gainMul: 0.1, limitDeg: 70 },
];
