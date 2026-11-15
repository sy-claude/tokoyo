// M1a のリプレイ：立ったままカメラで一周して楓真を眺め、縦にも振り、少し走って止まる（360tick）。
// 依頼者が試すこと2（周りを回って輪郭を見る）と同じ操作。走り出しと停止は、袖・髪・鉢巻の尾の揺れの入力になる。
// シムの規則は M0b から変えていない（見た目だけのM）ので、ハッシュが変わったらシムを触ってしまった合図。
import { createSyntheticInput } from '../../../src/input/synthetic.js';

export const meta = { scene: 'sandbox', char: 'fuma', seed: 1 };

/** [tick数, その間の入力] の台本。 */
const SCRIPT = [
  [20, {}],
  [120, { camDeg: [3, 0], camHeld: true }],
  [30, { camDeg: [0, 1], camHeld: true }],
  [60, { camDeg: [-3, -0.5], camHeld: true }],
  [20, {}],
  [50, { stick: [0, 1] }],
  [30, {}],
  [30, { stick: [-0.7, 0.3], camDeg: [1, 0], camHeld: true }],
];

export function frames() {
  const input = createSyntheticInput();
  const out = [];
  for (const [n, p] of SCRIPT) {
    for (let i = 0; i < n; i++) {
      input.set({ camHeld: false, stick: [0, 0], ...p }); // camDeg は1tickだけ有効なので毎tick入れる
      out.push(input.build(out.length));
    }
  }
  return out;
}
