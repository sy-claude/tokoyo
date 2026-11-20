// 形そのものの三角形の数を数える（影の図の分を含まない）。品質ごとの細かさ（meshDetailMul）で数える。
// 使い方：node scripts/model-tris.mjs [形の名前 …]（省くと主人公・妖怪・鳥居）
import { Matrix4 } from 'three';
import { createBuilder } from '../src/render/lookdev/build.js';
import { models } from '../src/data/lookdev/models.js';
import { scene } from '../src/data/lookdev/scene.js';
import { lookdev } from '../src/config/lookdev.js';

const names = process.argv.slice(2).length ? process.argv.slice(2) : ['hero', 'chochin', 'karakasa', 'yamainu', 'toriiMain'];
const muls = lookdev.meshDetailMul.v;
console.log(['形', ...Object.keys(muls).map((q) => `品質${q}`)].join('\t'));
for (const name of names) {
  const row = [name];
  for (const q of Object.keys(muls)) {
    const b = createBuilder({ models, palette: scene.palette, aoGain: scene.aoGain, segMul: muls[q], faceOf: () => null });
    b.addAll(models[name].parts, new Matrix4(), {});
    row.push(String(b.raw.I.length / 3));
  }
  console.log(row.join('\t'));
}
