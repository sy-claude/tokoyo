// M0a のリプレイ：歩く・カメラを回す・縦角を上限まで上げる・斜めに歩く（300tick）。
// 仮の移動（等速）とカメラ、時間の刻みが変わるとハッシュが変わる。
import { createSyntheticInput } from '../../../src/input/synthetic.js';

export const meta = { scene: 'sandbox', char: 'fuma', seed: 1 };

/** [tick数, その間の入力] の台本。 */
const SCRIPT = [
  [30, {}],
  [60, { stick: [0, 1] }],
  [45, { stick: [0, 1], camDeg: [2, 0] }],
  [30, { stick: [1, 0] }],
  [40, { stick: [0, 0], camDeg: [0, 2] }],
  [45, { stick: [0.5, 0.5], camDeg: [-1, -0.5] }],
  [20, { stick: [-0.6, 0.8] }],
  [30, { stick: [0, 0] }],
];

export function frames() {
  const input = createSyntheticInput();
  const out = [];
  for (const [n, p] of SCRIPT) {
    for (let i = 0; i < n; i++) {
      input.set(p); // camDeg は1tickだけ有効なので毎tick入れる
      out.push(input.build(out.length));
    }
  }
  return out;
}
