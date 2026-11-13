// 決定論（不変条件1）：同じ種・同じ入力なら同じハッシュ。保存したリプレイと 60tick ごとに一致（09 11.2）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HASH_EVERY, buildReplayJson, decodeFrames, listReplaySources, loadReplayJsons, runFrames } from '../replays/runner.js';
import { makeFrame } from '../../src/input/synthetic.js';

/** 600tick の入力（歩く・回す）。 */
function sixHundred() {
  const frames = [];
  for (let t = 0; t < 600; t++) {
    const phase = Math.floor(t / 100) % 3;
    frames.push(makeFrame(t, {
      stick: phase === 0 ? [0, 1] : phase === 1 ? [0.6, -0.3] : [0, 0],
      camDeg: [phase === 1 ? 1.5 : 0, phase === 2 ? 0.5 : 0],
    }));
  }
  return frames;
}

test('sameSeedSameHash：同じ種・同じ入力で600tick を2回 → ハッシュが一致。種を2にすると不一致（09受7）', () => {
  const frames = sixHundred();
  const a = runFrames({ scene: 'sandbox', seed: 1, frames });
  const b = runFrames({ scene: 'sandbox', seed: 1, frames });
  assert.equal(a.world.tick, 600);
  assert.deepEqual(a.hashes, b.hashes);
  assert.equal(Object.keys(a.hashes).length, 600 / HASH_EVERY + 1);
  const c = runFrames({ scene: 'sandbox', seed: 2, frames });
  assert.notEqual(c.hashes.final, a.hashes.final);
});

test('inputChangesHash：入力が1tick違えばハッシュが変わる', () => {
  const frames = sixHundred();
  const a = runFrames({ scene: 'sandbox', seed: 1, frames });
  const edited = sixHundred();
  edited[300] = makeFrame(300, { stick: [1, 0] });
  const b = runFrames({ scene: 'sandbox', seed: 1, frames: edited });
  assert.equal(a.hashes['300'], b.hashes['300']); // 変える前までは同じ
  assert.notEqual(a.hashes.final, b.hashes.final);
});

test('replaysExist：M ごとにリプレイがあり、src と JSON が1対1', () => {
  const jsons = loadReplayJsons();
  assert.ok(jsons.length >= 1);
  assert.deepEqual(jsons.map((j) => j.name), listReplaySources());
});

for (const json of loadReplayJsons()) {
  test(`replay ${json.name}：保存したハッシュと 60tick ごとに一致`, async () => {
    assert.equal(json.format, 1);
    const frames = decodeFrames(json.frames);
    assert.equal(frames.length, json.ticks);
    assert.ok(json.ticks >= 60 && json.ticks <= 600, '60〜600tick（10 §4.2-3）');
    const { hashes, state } = runFrames({ scene: json.scene, char: json.char, seed: json.seed, frames });
    // 不一致なら、最初にずれた tick とそのときの状態を出す
    const keys = Object.keys(json.hashes);
    const firstBad = keys.find((k) => hashes[k] !== json.hashes[k]);
    if (firstBad !== undefined) {
      const upTo = firstBad === 'final' ? frames.length : Number(firstBad);
      const at = runFrames({ scene: json.scene, char: json.char, seed: json.seed, frames: frames.slice(0, upTo) });
      assert.fail(`リプレイ ${json.name} が tick ${firstBad} で不一致（期待 ${json.hashes[firstBad]}、実際 ${hashes[firstBad]}）。\n`
        + `意図した変更なら npm run replays:update。そのときの状態：\n${JSON.stringify(at.state, null, 1)}`);
    }
    assert.deepEqual(hashes, json.hashes);
    assert.equal(state.tick, json.ticks);
    // JSON が src の台本と同じ内容か（src だけ直して更新し忘れるのを防ぐ）
    const rebuilt = await buildReplayJson(json.name);
    assert.deepEqual(rebuilt.frames, json.frames, 'src の台本と JSON の frames が違う（npm run replays:update）');
  });
}

test('m0WalkMoves：M0a のリプレイは実際に歩き、カメラを回している', () => {
  const json = loadReplayJsons().find((j) => j.name === 'm0_walk');
  assert.ok(json);
  const { state } = runFrames({ scene: json.scene, seed: json.seed, frames: decodeFrames(json.frames) });
  const start = runFrames({ scene: json.scene, seed: json.seed, frames: [] }).state;
  const moved = Math.hypot(state.player.pos[0] - start.player.pos[0], state.player.pos[2] - start.player.pos[2]);
  assert.ok(moved > 3, `moved=${moved}`);
  assert.notEqual(state.camera.yawDeg, start.camera.yawDeg);
  assert.ok(state.camera.pitchDeg > start.camera.pitchDeg);
});
