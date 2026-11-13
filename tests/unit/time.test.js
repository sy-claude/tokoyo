// 時間の規則（00_core 4章、09 4.2 の表を全部）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceTime, entityScale, hitstopUntilAfter, quantScale, requestWorldMul } from '../../src/core/time.js';
import { createSceneWorld } from '../../src/sim/world.js';
import { stepWorld } from '../../src/sim/step.js';
import { makeFrame } from '../../src/input/synthetic.js';
import { makeCfg } from './helpers/cfg.js';

const cfg = makeCfg();
const T = cfg.time;

/** 見切りの減速×符の構えの倍率（config から計算）。 */
const SLOW_IN_FU = Math.round(T.mikiriSlowMul * T.fuWorldMul * T.scaleQuantCount) / T.scaleQuantCount;

test('scaleProduct：倍率は 個別×世界 の積を 1/4096 に丸めた値', () => {
  assert.equal(entityScale(T.fuWorldMul, T.mikiriSlowMul, 0, 0, T.scaleQuantCount), SLOW_IN_FU);
  assert.equal(entityScale(1, 1, 0, 0, T.scaleQuantCount), 1);
  assert.equal(entityScale(1, 1, 0, 1, T.scaleQuantCount), 0); // ヒットストップ中は0
});

test('[検算] scaleProduct の値：個別0.3×世界0.15 → 0.044921875（±0）', () => {
  assert.equal(entityScale(0.15, 0.3, 0, 0, 4096), 0.044921875); // 09受10、09 4.2 の表
});

test('quantScale：1/4096 単位に丸め、1 と 0 は変わらない', () => {
  assert.equal(quantScale(1, T.scaleQuantCount), 1);
  assert.equal(quantScale(0, T.scaleQuantCount), 0);
  const q = quantScale(T.fuWorldMul, T.scaleQuantCount);
  assert.equal(q * T.scaleQuantCount, Math.round(T.fuWorldMul * T.scaleQuantCount));
});

test('hitstopRealTicks：符の構え中（世界0.15）に hitstopF=14 → 止まるのは実tickで14（09受9）', () => {
  const hitstopF = 14; // 09受9 の条件
  const world = createSceneWorld('sandbox', { seed: 1, cfg: makeCfg() });
  requestWorldMul(world.time, T.fuWorldMul);
  stepWorld(world, makeFrame(world.tick)); // 予約した倍率は次のtickから
  stepWorld(world, makeFrame(world.tick));
  assert.equal(world.player.scale, quantScale(T.fuWorldMul, T.scaleQuantCount));
  // このtickに命中したとする
  world.player.hitstopUntil = hitstopUntilAfter(world.tick, hitstopF);
  stepWorld(world, makeFrame(world.tick)); // 命中した tick 自身は止まらない
  let stopped = 0;
  let guard = 0;
  for (;;) {
    stepWorld(world, makeFrame(world.tick));
    if (world.player.scale !== 0) break;
    stopped += 1;
    guard += 1;
    assert.ok(guard < 1000);
  }
  assert.equal(stopped, hitstopF);
  assert.equal(world.player.scale, quantScale(T.fuWorldMul, T.scaleQuantCount)); // 明けたら世界倍率に戻る
});

test('slowInFu：見切り減速中の敵が符の構えに入る → 0.3×0.15 を丸めた値', () => {
  const world = createSceneWorld('sandbox', { seed: 1, cfg: makeCfg() });
  world.player.slowUntil = 100;
  requestWorldMul(world.time, T.fuWorldMul);
  stepWorld(world, makeFrame(world.tick));
  stepWorld(world, makeFrame(world.tick));
  assert.equal(world.player.scale, SLOW_IN_FU);
});

test('worldMulNextTick：倍率の変化は、変えると決めたtickの次のtickから有効', () => {
  const ent = { slowUntil: 0, hitstopUntil: 0, scale: 1, localF: 0 };
  const world = { tick: 0, time: { worldMul: 1, worldMulNext: 1 }, entities: [ent] };
  advanceTime(world, T);
  assert.equal(ent.scale, 1);
  requestWorldMul(world.time, T.fuWorldMul); // tick 0 の途中で決めた
  assert.equal(world.time.worldMul, 1); // このtickはまだ 1
  world.tick = 1;
  advanceTime(world, T);
  assert.equal(ent.scale, quantScale(T.fuWorldMul, T.scaleQuantCount));
});

test('localFExact：1/4096 の倍数の和は誤差なく足せる', () => {
  const ent = { slowUntil: 1e9, hitstopUntil: 0, scale: 1, localF: 0 };
  const world = { tick: 0, time: { worldMul: T.fuWorldMul, worldMulNext: T.fuWorldMul }, entities: [ent] };
  const n = 100000;
  for (let i = 0; i < n; i++) {
    advanceTime(world, T);
    world.tick += 1;
  }
  assert.equal(ent.localF, SLOW_IN_FU * n);
});

test('moveIntegration：移動は pos += vel × scale / 60（倍率0.15なら進みも0.15倍）', () => {
  const a = createSceneWorld('sandbox', { seed: 1, cfg: makeCfg() });
  const b = createSceneWorld('sandbox', { seed: 1, cfg: makeCfg() });
  requestWorldMul(b.time, T.fuWorldMul);
  stepWorld(b, makeFrame(b.tick));
  const z0a = a.player.pos[2];
  const z0b = b.player.pos[2];
  const n = 60;
  for (let i = 0; i < n; i++) {
    stepWorld(a, makeFrame(a.tick, { stick: [0, 1] }));
    stepWorld(b, makeFrame(b.tick, { stick: [0, 1] }));
  }
  const da = a.player.pos[2] - z0a;
  const db = b.player.pos[2] - z0b;
  assert.ok(Math.abs(da - (cfg.movement.runSpeedMps * n) / T.tickRateHz) < 1e-9);
  assert.ok(Math.abs(db - da * quantScale(T.fuWorldMul, T.scaleQuantCount)) < 1e-9);
});
