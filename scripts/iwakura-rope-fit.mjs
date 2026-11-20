// 注連縄の巨岩：岩の本体の形を変えたら実行し、出力を models.js の注連縄（rope）の path に貼る。結び目は 22 番、紙垂は 16・18・20 番の点の外側に置く。
// 使い方：node scripts/iwakura-rope-fit.mjs
// 巨岩の本体の形を作り、縄の通る高さで各方向の表面までの距離を測って、縄の道のり（岩の表面＋縄の半径）を出す
import { createBuilder } from '../src/render/lookdev/build.js';
import { models } from '../src/data/lookdev/models.js';
import { Matrix4 } from 'three';
const group = models.iwakura.parts[0];
const rock = group.parts[0];
const b = createBuilder({ segMul: 1 }); b.add({ ...rock, rot: undefined }, new Matrix4(), {});
const P = b.raw.P;
const N = 24, out = [], ropeR = 0.14;
const yAt = (ph) => 2.85 - 0.3 * Math.cos(ph) - 0.12 * Math.max(0, -Math.sin(ph));
for (let i = 0; i < N; i++) {
  const ph = (2 * Math.PI * i) / N, y = yAt(ph);
  let best = 0;
  for (let j = 0; j < P.length; j += 3) {
    if (Math.abs(P[j + 1] - y) > 0.18) continue;
    const a = Math.atan2(P[j + 2], P[j]); let d = Math.abs(a - ph); d = Math.min(d, 2 * Math.PI - d);
    if (d > 0.3) continue;
    best = Math.max(best, Math.hypot(P[j], P[j + 2]) * Math.cos(d));
  }
  const r = best + ropeR * 0.75;
  out.push([+(r * Math.cos(ph)).toFixed(3), +y.toFixed(3), +(r * Math.sin(ph)).toFixed(3)]);
}
console.log(JSON.stringify(out));
