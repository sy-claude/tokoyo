// 配信先のパス（09受22）：BASE_PATH=/x/ で build すると、index.html の資源のパスが全て /x/ で始まる。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './helpers/source.js';

test('basePathBuild：BASE_PATH=/x/ の成果物は、資源のパスが全て /x/ で始まる（09受22）', () => {
  const out = join(ROOT, 'tests/artifacts/base-x');
  const r = spawnSync(process.execPath, [join(ROOT, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', out, '--emptyOutDir', '--logLevel', 'error'], {
    cwd: ROOT,
    env: { ...process.env, BASE_PATH: '/x/' },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length >= 3, `参照が少なすぎる：${refs}`); // スクリプト・manifest・icon
  for (const ref of refs) assert.ok(ref.startsWith('/x/'), `/x/ で始まらない：${ref}`);
  assert.ok(refs.some((x) => x.endsWith('.js')));
  assert.ok(refs.some((x) => x.endsWith('manifest.webmanifest')));
  assert.ok(refs.some((x) => x.endsWith('icon.svg')));
  // manifest の中は相対パス（どの置き場所でも動く）
  const manifest = JSON.parse(readFileSync(join(out, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.start_url, '.');
  for (const icon of manifest.icons) assert.ok(!icon.src.startsWith('/'));
  rmSync(out, { recursive: true, force: true });
});
