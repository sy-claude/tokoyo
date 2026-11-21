// キャラの移動解決（09 §6.3・§11.1、10 M2a-1）：段差・斜面・押し出し・着地。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeWorld, step } from './helpers/play.js';

/** 段差・斜面の前から +Z（または +X）へ歩かせて、最後の足の高さ。 */
function walkFrom(at, stick, n = 120) {
  const w = makeWorld('fuma', at, 0);
  for (let i = 0; i < n; i++) step(w, { stick });
  return w;
}

test('stepAndSlope：0.40m の段は登り 0.41m で止まる。44° の斜面は登り 46° で止まる（10 M2a-1）', () => {
  // S1：段 0.40 は (16,16)、0.41 は (19,16)。どちらも 2×2m。手前 z=13 から +Z へ
  assert.ok(Math.abs(walkFrom([16, 0, 13], [0, 1], 40).player.pos[1] - 0.4) < 1e-6, '0.40 を登る');
  const w41 = walkFrom([19, 0, 13], [0, 1], 40);
  assert.equal(w41.player.pos[1], 0, '0.41 は登らない');
  assert.ok(w41.player.pos[2] < 15 - 0.35 + 1e-6, '0.41 の手前で止まる');
  // T3：44° は x2–6、46° は x8–12（z14 から +Z に登る）。上の平らは 3.86・4.14
  assert.ok(Math.abs(walkFrom([4, 0, 12], [0, 1], 66).player.pos[1] - 3.86) < 1e-6, '44° を登り切る（上の平らで止める）');
  assert.ok(walkFrom([10, 0, 12], [0, 1]).player.pos[1] < 1, '46° は登れない');
});

test('moverPush：乗れない壁・柱には入り込まない（半径の外へ押し出す）', () => {
  // S3 の壁 3.6m（中心 41,26、6×1m）へ −Z 側から
  const w = walkFrom([41, 0, 22], [0, 1], 90);
  assert.ok(w.player.pos[2] <= 25.5 - w.player.capsule.rM + 1e-6);
  assert.equal(w.player.pos[1], 0);
  // S4 の柱 r0.5（44,40）へ
  const c = walkFrom([44, 0, 36], [0, 1], 90);
  assert.ok(Math.hypot(c.player.pos[0] - 44, c.player.pos[2] - 40) >= 0.5 + c.player.capsule.rM - 1e-6);
});

test('moverLandAndWalkOff：台に着地し、端から歩き出ると落ちる（走りで）', () => {
  // S2 の台A（中心 16,24、4×4×2m）の上に置いて +X へ走る
  const w = makeWorld('fuma', [16, 2, 24], 90);
  step(w);
  assert.equal(w.player.pos[1], 2);
  assert.ok(w.player.grounded);
  for (let i = 0; i < 60 && w.player.pos[1] > 0; i++) step(w, { stick: [0, 1] });
  assert.equal(w.player.pos[1], 0, '台の外の床に着いた');
});
