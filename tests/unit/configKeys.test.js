// 不変条件8：数値スカラーの設定キーは単位の接尾辞で終わる（09 2章8）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTables } from '../../src/core/config.js';
import { UNIT_SUFFIX_RE, hasUnitSuffix } from '../../src/core/units.js';
import { configTables } from './helpers/cfg.js';
import { listJs } from './helpers/source.js';

test('unitSuffix：全ての数値スカラーのキーが接尾辞で終わる', () => {
  const problems = checkTables(configTables).filter((p) => p.includes('接尾辞'));
  assert.deepEqual(problems, []);
  let count = 0;
  for (const table of Object.values(configTables)) {
    for (const [key, entry] of Object.entries(table)) {
      if (typeof entry.v === 'number') {
        assert.match(key, UNIT_SUFFIX_RE);
        count += 1;
      }
    }
  }
  assert.ok(count > 10);
});

test('suffixRule：規則そのもの（良い名前・悪い名前）', () => {
  for (const ok of ['dodgeTotalF', 'runSpeedMps', 'camFovYDeg', 'gravityMps2', 'keyCamDegPs', 'tapMaxS', 'stepUpM',
    'ougiOutPx', 'fuWorldMul', 'traumaDecayPct', 'tickRateHz', 'bgmDb', 'tempoBpm', 'particleCount', 'tokenScoreDistRatio']) {
    assert.ok(hasUnitSuffix(ok), ok);
  }
  for (const ng of ['runSpeed', 'dprMax', 'gravity', 'fovY', 'weight', 'tickRate']) assert.ok(!hasUnitSuffix(ng), ng);
});

test('detectsBadKey：接尾辞の無い数値キー・範囲外・説明なしを検出する', () => {
  const problems = checkTables({
    t: {
      speed: { v: 3, desc: '接尾辞なし' },
      okM: { v: 5, min: 0, max: 4, desc: '範囲外' },
      label: { v: 'x', desc: '' },
      listOk: { v: [1, 2], desc: '配列は接尾辞の対象外' },
      flagOk: { v: true, desc: '真偽値は対象外' },
    },
  });
  assert.equal(problems.length, 3);
  assert.ok(problems.some((p) => p.startsWith('t.speed') && p.includes('接尾辞')));
  assert.ok(problems.some((p) => p.startsWith('t.okM')));
  assert.ok(problems.some((p) => p.startsWith('t.label')));
});

test('allTablesRegistered：src/config の各ファイルの表が全部 index に載っている（検査もれ防止）', async () => {
  const files = listJs('src/config').filter((f) => !f.endsWith('/index.js'));
  assert.ok(files.length > 0);
  const registered = new Set(Object.values(configTables));
  for (const f of files) {
    const mod = await import(new URL(`../../${f}`, import.meta.url).href);
    const exported = Object.values(mod);
    assert.equal(exported.length, 1, `${f}: 1ファイル1表`);
    assert.ok(registered.has(exported[0]), `${f}: config/index.js に載っていない`);
    const name = f.split('/').pop().replace('.js', '');
    assert.equal(configTables[name], exported[0], `${f}: 表の名前はファイル名と同じ`);
  }
});
