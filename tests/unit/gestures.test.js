// タップとはじき（01 2.5、01 9章の受け入れ基準 16〜18）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buttonOf } from '../../src/input/layout.js';
import { flickOf, isTap } from '../../src/input/gestures.js';
import { cfg, makeRig } from './helpers/touchRig.js';

const MS = 1000;
/** ボタンから離れたカメラの空き領域の点 */
const CX = 450;
const CY = 150;

/** カメラの指で down → move(dx,dy) → ms 後に up。taps の件数を返す */
function tapCount(r, x, y, dx, dy, ms) {
  r.down(9, x, y);
  r.move(9, x + dx, y + dy);
  r.wait(ms);
  r.up(9, x + dx, y + dy);
  return r.one().taps.length;
}

test('tapLimits：移動 < tapMaxMovePx かつ 時間 < tapMaxS → 1件、どちらかが境目ちょうどなら0件（01受16）', () => {
  const maxPx = cfg.input.tapMaxMovePx;
  const maxMs = cfg.input.tapMaxS * MS;
  assert.equal(tapCount(makeRig(), CX, CY, maxPx - 1, 0, maxMs - 1), 1);
  assert.equal(tapCount(makeRig(), CX, CY, maxPx, 0, maxMs - 1), 0);
  assert.equal(tapCount(makeRig(), CX, CY, maxPx - 1, 0, maxMs), 0);
});

test('[検算] tapLimits の値：11px・249ms → 1件／12px または 250ms → 0件（01受16）', () => {
  assert.equal(tapCount(makeRig(), CX, CY, 11, 0, 249), 1);
  assert.equal(tapCount(makeRig(), CX, CY, 12, 0, 249), 0);
  assert.equal(tapCount(makeRig(), CX, CY, 11, 0, 250), 0);
});

test('tapClearance：ボタン判定の縁から 23px → 0件、25px → 1件（01受17）', () => {
  const r0 = makeRig();
  const k = buttonOf(r0.layout, 'kekkai');
  const at = (gap) => k.x - k.rHitPx - gap;
  assert.equal(tapCount(makeRig(), at(cfg.input.tapBtnClearancePx - 1), k.y, 0, 0, 10), 0);
  assert.equal(tapCount(makeRig(), at(cfg.input.tapBtnClearancePx + 1), k.y, 0, 0, 10), 1);
  // tap の座標は離した位置
  const r = makeRig();
  r.down(1, CX, CY);
  r.up(1, CX, CY);
  assert.deepEqual(r.one().taps, [[CX, CY]]);
});

test('flick：170ms で横41px・縦10px → +1 が1回、続けて動かしても2回目は出ず、以後の camDeg は捨てる。横39px → 0（01受18）', () => {
  const r = makeRig();
  r.down(1, CX, CY);
  r.wait(170);
  r.move(1, CX + 41, CY + 10);
  let f = r.one();
  assert.equal(f.flick, 1);
  r.wait(5);
  r.move(1, CX + 90, CY + 10);
  f = r.one();
  assert.equal(f.flick, 0);
  assert.deepEqual(f.camDeg, [0, 0]);
  r.up(1, CX + 90, CY + 10);
  assert.equal(r.one().taps.length, 0);

  const r2 = makeRig();
  r2.down(1, CX, CY);
  r2.wait(170);
  r2.move(1, CX - 39, CY);
  f = r2.one();
  assert.equal(f.flick, 0);
  assert.ok(f.camDeg[0] < 0);
});

test('flickRules：時間窓の外・縦が大きい・左向き（純関数）', () => {
  const rec = { downX: 0, downY: 0, downT: 0, flickDone: false };
  const ms = cfg.input.flickWindowS * MS;
  const px = cfg.input.flickMinPx;
  assert.equal(flickOf(rec, px, 0, ms, cfg.input), 1);
  assert.equal(flickOf(rec, px, 0, ms + 1, cfg.input), 0);
  assert.equal(flickOf(rec, -px, 0, 1, cfg.input), -1);
  assert.equal(flickOf(rec, px, px / cfg.input.flickAxisMul + 1, 1, cfg.input), 0);
  assert.equal(flickOf({ ...rec, flickDone: true }, px, 0, 1, cfg.input), 0);
});

test('tapInFuStance：符の構え中はタップにしない（純関数）', () => {
  const r = makeRig();
  const rec = { maxMovePx: 0, downT: 0 };
  assert.equal(isTap(rec, CX, CY, 1, r.layout, cfg.input, false), true);
  assert.equal(isTap(rec, CX, CY, 1, r.layout, cfg.input, true), false);
});
