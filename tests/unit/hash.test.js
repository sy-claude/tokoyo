// 状態ハッシュ（09 11.2）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHasher, hash32, hashWorld } from '../../src/core/hash.js';
import { createSceneWorld } from '../../src/sim/world.js';
import { makeCfg } from './helpers/cfg.js';

const newWorld = (seed = 1) => createSceneWorld('sandbox', { seed, cfg: makeCfg() });

test('fnv1a：空は FNV の初期値、同じ入力は同じ値', () => {
  assert.equal(createHasher().hex(), '811c9dc5'); // FNV-1a 32bit の初期値（算法の定数。調整の対象ではない）
  assert.equal(createHasher().u32(1).str('a').hex(), createHasher().u32(1).str('a').hex());
  assert.notEqual(createHasher().u32(1).hex(), createHasher().u32(2).hex());
  assert.match(createHasher().u32(123).hex(), /^[0-9a-f]{8}$/);
});

test('hash32：種とラベルで変わる', () => {
  assert.equal(hash32(1, 'ai'), hash32(1, 'ai'));
  assert.notEqual(hash32(1, 'ai'), hash32(1, 'combat'));
  assert.notEqual(hash32(1, 'ai'), hash32(2, 'ai'));
});

test('worldHashStable：同じ状態は同じハッシュ（8桁16進）', () => {
  assert.equal(hashWorld(newWorld()), hashWorld(newWorld()));
  assert.match(hashWorld(newWorld()), /^[0-9a-f]{8}$/);
});

test('worldHashSensitive：tick・種・位置（1mm）・向き・カメラ・乱数の消費で変わる', () => {
  const base = hashWorld(newWorld());
  assert.notEqual(hashWorld(newWorld(2)), base);
  /** @type {((w:any)=>void)[]} */
  const edits = [
    (w) => { w.tick += 1; },
    (w) => { w.player.pos[0] += 0.001; },
    (w) => { w.player.vel[2] += 0.001; },
    (w) => { w.player.yawDeg += 0.001; },
    (w) => { w.player.localF += 1 / 4096; },
    (w) => { w.player.state = 'run'; },
    (w) => { w.camera.pos[1] += 0.001; },
    (w) => { w.camera.yawDeg += 0.001; },
    (w) => { w.camera.pitchDeg += 0.001; },
    (w) => { w.rng.next(); },
    (w) => { w.rngAi.next(); },
    (w) => { w.time.worldMulNext = 0.5; },
  ];
  for (const edit of edits) {
    const w = newWorld();
    edit(w);
    assert.notEqual(hashWorld(w), base, String(edit));
  }
});

test('cameraInHash：カメラはシム側（不変条件3）。カメラだけ変えてもハッシュが変わる', () => {
  const w = newWorld();
  const before = hashWorld(w);
  w.camera.distM += 1;
  assert.notEqual(hashWorld(w), before);
});
