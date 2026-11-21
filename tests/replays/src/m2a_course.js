// M2a のリプレイ：試験場で 走る・跳ぶ・神通足・ステップ・短い跳躍・歩き・海に落ちて戻る（600tick）。
// 移動・跳躍・回避・衝突・海の規則（02）が変わるとハッシュが変わる。
import { createSyntheticInput } from '../../../src/input/synthetic.js';

export const meta = { scene: 'sandbox', char: 'fuma', seed: 1 };

// ボタンは「押しっぱなし」の状態で書く（押した・離したは down の変化から作られる）
const UP = { jump: false, dodge: false };
const J = { jump: true, dodge: false };
const JD = { jump: true, dodge: true };
const D = { jump: false, dodge: true };

/** [tick数, その間の入力] の台本。開始は (30,0,14)、+Z 向き。 */
const SCRIPT = [
  [5, { stick: [0, 0], down: UP }],
  [40, { stick: [0, 1] }], // 前へ走る
  [20, { stick: [0, 1], down: J }], // 走り跳び（押し続け）
  [1, { stick: [0, 1], down: JD }], // 頂点で神通足
  [25, { stick: [0, 1], down: UP }],
  [20, { stick: [-1, 0] }], // 右へ
  [1, { stick: [0, 0], down: D }], // ステップ（中立＝後ろ）
  [15, { stick: [0, 0], down: UP }],
  [40, { stick: [-1, 0.3], camDeg: [1.5, 0] }], // 回りながら走る
  [4, { stick: [0, 1], down: J }], // 短く押す跳躍
  [40, { stick: [0, 1], down: UP }],
  [20, { stick: [0, 0.3], camDeg: [-3, 0] }], // 歩きながらカメラを元の向きへ戻す
  [225, { stick: [-0.3, -1] }], // 後ろへ（海の方へ。S1 の段を避けて東寄りに）走って落ちる
  [144, { stick: [0, 0] }], // 戻る
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
