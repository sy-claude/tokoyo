// 高さ格子（09 §6.1・10 §4.5）：試験場の地形・面種別・崖と海までの距離。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeCfg } from './helpers/cfg.js';
import { buildTerrain, SURFACE } from '../../src/gen/terrain.js';
import { edgeDistAt, heightAt, slopeDegAt, surfaceAt } from '../../src/gen/terrainQuery.js';
import { sandbox } from '../../src/data/stages/sandbox.js';

const cfg = makeCfg();
const t = buildTerrain(sandbox, cfg.collision);

test('heightfieldSandbox：試験場の頂点と升の数、床・海・下段・斜面の高さ', () => {
  assert.equal(t.nx, 120);
  assert.equal(t.nz, 120);
  assert.equal(t.heights.length, 121 * 121);
  assert.equal(heightAt(t, 30, 30), 0);
  assert.equal(heightAt(t, 30, 5), -6);
  assert.equal(heightAt(t, 55, 30), -3);
  // 斜面：+z へ直線、上の平らは斜面の終わりの高さ
  assert.ok(Math.abs(heightAt(t, 4, 16) - 3.86 / 2) < 1e-6);
  assert.ok(Math.abs(heightAt(t, 4, 19) - 3.86) < 1e-6);
  // 双一次補間：升の中の点
  assert.ok(Math.abs(heightAt(t, 4, 14.25) - 3.86 * (0.25 / 4)) < 1e-6);
});

test('heightfieldSurface：海・崖・石の升（10 §4.5 の規則）。44° の斜面は崖でなく、46° は崖', () => {
  assert.equal(surfaceAt(t, 30, 5), SURFACE.sea);
  assert.equal(surfaceAt(t, 30, 10.2), SURFACE.cliff); // 海の縁
  assert.equal(surfaceAt(t, 49.8, 30), SURFACE.cliff); // 下段の縁
  assert.equal(surfaceAt(t, 30, 30), SURFACE.stone);
  assert.equal(surfaceAt(t, 4, 16), SURFACE.stone);
  assert.equal(surfaceAt(t, 10, 16), SURFACE.cliff);
  assert.equal(surfaceAt(t, 55, 30), SURFACE.stone); // 下段は海でない（水面 −3.5 より上）
  assert.ok(Math.abs(slopeDegAt(t, 4, 16) - 43.98) < 0.05);
  assert.ok(Math.abs(slopeDegAt(t, 10, 16) - 46.0) < 0.05);
});

test('heightfieldEdgeDist：崖・海の升からの距離（8近傍×0.5m）', () => {
  assert.equal(edgeDistAt(t, 49.8, 30), 0);
  assert.equal(edgeDistAt(t, 49.3, 30), 0.5);
  assert.equal(edgeDistAt(t, 48.6, 30), 1.0);
  assert.equal(edgeDistAt(t, 48.4, 30), 1.5);
  assert.equal(edgeDistAt(t, 30, 13), 3.0); // 海の縁 z=10 の升（10〜10.5）から z=13 の升まで6升
});
