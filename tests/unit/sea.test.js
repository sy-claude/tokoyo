// 海への落下と復帰・安全地点（02 §5、02受17〜19）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cfg, makeWorld, step } from './helpers/play.js';
import { isInvulnerable } from '../../src/sim/player/fsm.js';

const mv = cfg.movement;

/** 海（z<10）へ −Z に走って落ちる。落ちた tick までの数を返す。 */
function runIntoSea(w) {
  for (let i = 0; i < 200; i++) {
    step(w, { stick: [0, 1] });
    if (w.player.state === 'fallSea') return i;
  }
  throw new Error('海に落ちなかった');
}

test('02受17：海に落ちる → 54+20tick 後に最新の安全地点、HP −8%（420→386）、その後60tickは無敵、61tick目は無敵でない', () => {
  const w = makeWorld('fuma', [30, 0, 20], 180);
  for (let i = 0; i < 40; i++) step(w); // 安全地点を記録させる
  runIntoSea(w);
  const safe = [...w.player.mv.safePoints[0].pos]; // 落ちた時点で最新の安全地点（走っている途中も記録される）
  assert.ok(safe[2] > 10 + cfg.collision.safeEdgeDistM, '崖から1.5m 以上');
  assert.equal(w.camera.mode, 'sea');
  for (let i = 0; i < mv.seaSinkF + mv.seaWipeF; i++) step(w);
  assert.equal(w.player.state, 'fallSea');
  step(w);
  assert.equal(w.player.state, 'respawn');
  assert.deepEqual(w.player.pos, safe);
  assert.equal(w.player.hp, 386);
  for (let i = 1; i < mv.respawnF; i++) step(w, { stick: [0, 1] });
  assert.equal(w.player.state, 'respawn', '操作は戻らない');
  assert.deepEqual(w.player.pos, safe, '入力を受けない');
  /** @type {boolean[]} */
  const inv = [];
  for (let i = 0; i < mv.respawnInvulnF + 1; i++) {
    step(w);
    inv.push(isInvulnerable(w.player, cfg));
  }
  assert.deepEqual(inv, [...Array(mv.respawnInvulnF).fill(true), false]);
});

test('02受18：HP20 で海に落ちる → HP1（海では死なない）', () => {
  const w = makeWorld('fuma', [30, 0, 20], 180);
  w.player.hp = 20;
  runIntoSea(w);
  for (let i = 0; i < mv.seaSinkF + mv.seaWipeF + 1; i++) step(w);
  assert.equal(w.player.hp, 1);
});

test('02受19：崖から1.4m の位置に立ち続けても安全地点は記録されない、1.6m なら記録される（T2 の縁 x=50）', () => {
  for (const [dist, ok] of [[1.4, false], [1.6, true]]) {
    const w = makeWorld('fuma', [50 - dist, 0, 30], 0);
    w.player.mv.safePoints.length = 0;
    for (let i = 0; i < 90; i++) step(w);
    assert.equal(w.player.mv.safePoints.length > 0, ok, `${dist}m`);
  }
});

test('safePointShape：小道具の上は安全地点にしない、記録は新しい順に8個まで', () => {
  const w = makeWorld('fuma', [16, 2, 24], 0);
  w.player.mv.safePoints.length = 0;
  for (let i = 0; i < 90; i++) step(w);
  assert.equal(w.player.mv.safePoints.length, 0);
  const g = makeWorld('fuma', [30, 0, 30], 0);
  for (let i = 0; i < 30 * 12; i++) step(g);
  assert.equal(g.player.mv.safePoints.length, mv.safePointKeepCount);
});
