// 乱数（09 4.4）：同じ種で同じ列、fork の独立。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, presentationSeed } from '../../src/core/rng.js';

test('sameSeedSameSequence：同じ種は同じ列、違う種は違う列', () => {
  const a = createRng(1);
  const b = createRng(1);
  const c = createRng(2);
  const sa = Array.from({ length: 100 }, () => a.next());
  const sb = Array.from({ length: 100 }, () => b.next());
  const sc = Array.from({ length: 100 }, () => c.next());
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
});

test('goldenSequence：算法を変えたら気づけるように、種1の最初の値を固定する', () => {
  const r = createRng(1);
  const got = [r.next(), r.next(), r.next(), r.next()];
  for (const v of got) assert.ok(Number.isInteger(v) && v >= 0 && v <= 0xffffffff);
  assert.deepEqual(got, [4203887797, 1563716435, 1831295773, 1535592268]); // [検算] 実装時に記録した値
});

test('forkIndependent：fork は元の流れを進めず、ラベルごとに別の列', () => {
  const a = createRng(7);
  const b = createRng(7);
  const ai = a.fork('ai');
  const combat = a.fork('combat');
  for (let i = 0; i < 50; i++) ai.next();
  assert.equal(a.next(), b.next()); // fork しても、fork を進めても、本流は変わらない
  const ai2 = createRng(7).fork('ai');
  const x = Array.from({ length: 20 }, () => ai2.next());
  const y = Array.from({ length: 20 }, () => combat.next());
  assert.notDeepEqual(x, y);
  assert.deepEqual(x.slice(0, 5), Array.from({ length: 5 }, ((r) => () => r.next())(createRng(7).fork('ai'))));
});

test('ranges：float は [0,1)、int は 0〜n−1、range は [a,b)、pick は配列の要素', () => {
  const r = createRng(123);
  const seen = new Set();
  for (let i = 0; i < 5000; i++) {
    const f = r.float();
    assert.ok(f >= 0 && f < 1);
    const k = r.int(6);
    assert.ok(Number.isInteger(k) && k >= 0 && k < 6);
    seen.add(k);
    const g = r.range(-2, 3);
    assert.ok(g >= -2 && g < 3);
    assert.ok(['a', 'b', 'c'].includes(r.pick(['a', 'b', 'c'])));
  }
  assert.equal(seen.size, 6);
});

test('uniformity：float の平均がほぼ 0.5', () => {
  const r = createRng(99);
  let sum = 0;
  const n = 20000;
  for (let i = 0; i < n; i++) sum += r.float();
  assert.ok(Math.abs(sum / n - 0.5) < 0.01);
});

test('presentationSeed：描画と音の種はシムの種と違う', () => {
  assert.notEqual(presentationSeed(1), 1);
  assert.equal(presentationSeed(1), (1 ^ 0x9e3779b9) >>> 0);
});
