// 不変条件11：依存は4つだけ（three, vite, typescript, @playwright/test）。版は完全に固定。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, read } from './helpers/source.js';

const pkg = JSON.parse(read('package.json'));

test('fourDeps：依存は4つで、^ や ~ を使わない', () => {
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.deepEqual(Object.keys(all).sort(), ['@playwright/test', 'three', 'typescript', 'vite']);
  assert.deepEqual(Object.keys(pkg.dependencies), ['three']);
  for (const [name, ver] of Object.entries(all)) assert.match(ver, /^\d+\.\d+\.\d+$/, name);
  for (const k of ['peerDependencies', 'optionalDependencies', 'bundledDependencies']) assert.equal(pkg[k], undefined, k);
});

test('pinnedVersions：設計書（09 1.2）の版と同じ', () => {
  assert.equal(pkg.dependencies.three, '0.187.0');
  assert.equal(pkg.devDependencies.vite, '8.3.8');
  assert.equal(pkg.devDependencies.typescript, '6.0.3');
  assert.equal(pkg.devDependencies['@playwright/test'], '1.65.0');
});

test('lockfile：package-lock.json があり、直接の依存が package.json と同じ', () => {
  assert.ok(existsSync(join(ROOT, 'package-lock.json')));
  const lock = JSON.parse(read('package-lock.json'));
  const root = lock.packages[''];
  assert.deepEqual(root.dependencies, pkg.dependencies);
  assert.deepEqual(root.devDependencies, pkg.devDependencies);
});

test('scripts：09 1.2 のコマンドがある', () => {
  for (const s of ['dev', 'build', 'preview', 'typecheck', 'test', 'test:e2e', 'shots', 'verify:fast', 'verify', 'replays:update', 'bench']) {
    assert.equal(typeof pkg.scripts[s], 'string', s);
  }
  assert.equal(pkg.type, 'module');
});
