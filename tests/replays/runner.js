// リプレイを Node で流す道具（replay.test.js と scripts/replays-update.mjs が共用。09 11.2）。
// シムだけを動かす（描画・DOM なし）。
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { buildConfig } from '../../src/core/config.js';
import { hashWorld } from '../../src/core/hash.js';
import { configTables } from '../../src/config/index.js';
import { createSceneWorld, viewWorld } from '../../src/sim/world.js';
import { stepWorld } from '../../src/sim/step.js';
import { decodeFrames, encodeFrames } from '../../src/input/synthetic.js';

export const REPLAY_DIR = fileURLToPath(new URL('.', import.meta.url));
export const REPLAY_SRC_DIR = join(REPLAY_DIR, 'src');
/** ハッシュを比べる間隔（tick）。 */
export const HASH_EVERY = 60;

/**
 * 入力列を流して、60tick ごとと最後のハッシュを返す。
 * @param {{scene:string, char?:string, seed:number, frames:import('../../src/data/types.js').InputFrame[]}} o
 */
export function runFrames(o) {
  const cfg = buildConfig(configTables);
  const world = createSceneWorld(o.scene, { seed: o.seed, cfg, charId: o.char });
  /** @type {Record<string,string>} */
  const hashes = {};
  for (const frame of o.frames) {
    stepWorld(world, frame);
    if (world.tick % HASH_EVERY === 0) hashes[String(world.tick)] = hashWorld(world);
  }
  hashes.final = hashWorld(world);
  return { hashes, world, state: viewWorld(world) };
}

/** src のスクリプト（frames と meta）から、保存する JSON の中身を作る。 */
export async function buildReplayJson(name) {
  const mod = await import(new URL(`./src/${name}.js`, import.meta.url).href);
  const frames = mod.frames();
  const { scene, char, seed } = mod.meta;
  const { hashes } = runFrames({ scene, char, seed, frames });
  return { format: 1, name, scene, char, seed, ticks: frames.length, frames: encodeFrames(frames), hashes };
}

/** tests/replays/src/*.js の名前（拡張子なし）。 */
export function listReplaySources() {
  return readdirSync(REPLAY_SRC_DIR).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).sort();
}

/** tests/replays/*.json を読む。 */
export function loadReplayJsons() {
  return readdirSync(REPLAY_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(REPLAY_DIR, f), 'utf8')));
}

export { decodeFrames };
