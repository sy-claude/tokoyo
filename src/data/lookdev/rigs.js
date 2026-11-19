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

