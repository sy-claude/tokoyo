// ゲームループ（09 4.1）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLoop } from '../../src/app/loop.js';
import { createSceneWorld } from '../../src/sim/world.js';
import { stepWorld } from '../../src/sim/step.js';
import { makeFrame } from '../../src/input/synthetic.js';
import { hashWorld } from '../../src/core/hash.js';
import { makeCfg } from './helpers/cfg.js';

const cfg = makeCfg();
const STEP_MS = 1000 / cfg.time.tickRateHz;

function harness() {
  const log = { ticks: 0, flushes: 0, renders: [] };
  const loop = createLoop({
    timeCfg: cfg.time,
    tick: () => {
      log.ticks += 1;
    },
    flush: () => {
      log.flushes += 1;
    },
    render: (alpha) => {
      log.renders.push(alpha);
    },
  });
  return { loop, log };
}

test('maxFiveTicks：1描画で 0.5s の遅れ → 進むtickは5（09受8）', () => {
  const { loop, log } = harness();
  assert.equal(loop.onFrame(1000), 0); // 最初の描画は基準を取るだけ
  assert.equal(loop.onFrame(1500), cfg.time.maxTicksPerFrameCount);
  assert.equal(log.ticks, cfg.time.maxTicksPerFrameCount);
  assert.equal(cfg.time.maxTicksPerFrameCount, 5); // [検算] 00_core 4章
  // 遅れは捨てる：残るのは1tick未満の端数だけなので、次の普通の描画で進むのは1〜2tick
  const next = loop.onFrame(1500 + STEP_MS);
  assert.ok(next >= 1 && next <= 2, `next=${next}`);
});

test('steadySixty：60Hz の描画が続くと、1描画につき1tick', () => {
  const { loop, log } = harness();
  loop.onFrame(0);
  const frames = 600;
  for (let i = 1; i <= frames; i++) loop.onFrame(i * STEP_MS);
  assert.ok(Math.abs(log.ticks - frames) <= 1, `ticks=${log.ticks}`);
  for (const a of log.renders) assert.ok(a >= 0 && a <= 1);
});

test('slowDisplay：30Hz の描画なら1描画につき2tick、120Hz なら2描画につき1tick', () => {
  const a = harness();
  a.loop.onFrame(0);
  for (let i = 1; i <= 300; i++) a.loop.onFrame(i * STEP_MS * 2);
  assert.ok(Math.abs(a.log.ticks - 600) <= 1);
  const b = harness();
  b.loop.onFrame(0);
  for (let i = 1; i <= 600; i++) b.loop.onFrame((i * STEP_MS) / 2);
  assert.ok(Math.abs(b.log.ticks - 300) <= 1);
});

test('alphaIsFraction：補間の alpha は余りの時間÷1tick', () => {
  const { loop, log } = harness();
  loop.onFrame(0);
  loop.onFrame(STEP_MS * 1.5);
  assert.equal(log.ticks, 1);
  assert.ok(Math.abs(log.renders.at(-1) - 0.5) < 1e-9);
});

test('flushPerFrame：イベントの配送は tick 単位でまとめて、描画の前に1回', () => {
  const order = [];
  const loop = createLoop({
    timeCfg: cfg.time,
    tick: () => order.push('tick'),
    flush: () => order.push('flush'),
    render: () => order.push('render'),
  });
  loop.onFrame(0);
  order.length = 0;
  loop.onFrame(STEP_MS * 3);
  assert.deepEqual(order, ['tick', 'tick', 'tick', 'flush', 'render']);
});

test('pausedNoTicks：一時停止中は tick も localF も進まない。描画は続ける（09 4.2 の表）', () => {
  const world = createSceneWorld('sandbox', { seed: 1, cfg: makeCfg() });
  let renders = 0;
  const loop = createLoop({
    timeCfg: cfg.time,
    tick: () => stepWorld(world, makeFrame(world.tick, { stick: [0, 1] })),
    flush: () => {},
    render: () => {
      renders += 1;
    },
  });
  loop.onFrame(0);
  loop.onFrame(STEP_MS * 3);
  assert.equal(world.tick, 3);
  const before = { tick: world.tick, localF: world.player.localF, hash: hashWorld(world) };
  loop.setPaused(true, 'user');
  assert.equal(loop.pauseReason, 'user');
  const r0 = renders;
  for (let i = 0; i < 30; i++) assert.equal(loop.onFrame(1000 + i * STEP_MS), 0);
  assert.equal(world.tick, before.tick);
  assert.equal(world.player.localF, before.localF);
  assert.equal(hashWorld(world), before.hash);
  assert.equal(renders - r0, 30);
  // 再開した直後に、止まっていた時間ぶんを一気に進めない（一時停止中の描画で基準の時刻を更新し続けるため）
  const lastPausedMs = 1000 + 29 * STEP_MS;
  loop.setPaused(false);
  assert.equal(loop.pauseReason, null);
  assert.equal(loop.onFrame(lastPausedMs + STEP_MS * 1.01), 1);
  assert.equal(world.tick, before.tick + 1);
});

test('hiddenNoTicks：画面が見えていない間も進めない', () => {
  const { loop, log } = harness();
  loop.onFrame(0);
  assert.equal(loop.onFrame(100, true), 0);
  assert.equal(loop.onFrame(10000, true), 0);
  assert.equal(log.ticks, 0);
  assert.equal(loop.onFrame(10000 + STEP_MS * 1.01), 1);
});
