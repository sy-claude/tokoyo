// 保存（不変条件9、09 9章）：名前空間・版・移行・壊れたデータ・引き継ぎ文字列。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_VERSION, decodeHandoff, defaultSave, encodeHandoff, parseSaveText, serializeSave, upgradeSave } from '../../src/core/saveSchema.js';
import { createStorage } from '../../src/platform/storage.js';
import { makeCfg } from './helpers/cfg.js';

const cfg = makeCfg();

/** localStorage の代わり（Map）。failOn に入れたキーへの書き込みは例外にする。 */
function fakeStorage(initial = {}, failOn = new Set()) {
  const m = new Map(Object.entries(initial));
  return {
    map: m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      if (failOn.has(k)) throw new Error('QuotaExceededError');
      m.set(k, String(v));
    },
    removeItem: (k) => {
      m.delete(k);
    },
  };
}

/** 中身のある保存データの例。 */
function sampleSave() {
  const s = defaultSave();
  s.tamakake = 37;
  s.upgrades = { fuma: { hp: 2 } };
  s.esekiTaken = ['es_shu_1', 'es_ao_2'];
  s.tutorialDone = true;
  s.clears = { 'shirasagi/fuma': { count: 2, bestTimeS: 612.5, bestPurityPct: 88 } };
  s.settings = { camSensPct: 120, leftHanded: true, note: '日本語の文字列も通る' };
  s.lastCharId = 'shirayuki';
  s.updatedAt = 1700000000000;
  return s;
}

test('defaults：既定値は版1で、魂片0・導入未完了', () => {
  const d = defaultSave();
  assert.equal(d.v, SAVE_VERSION);
  assert.equal(d.tamakake, 0);
  assert.equal(d.tutorialDone, false);
  assert.equal(d.retry, null);
  assert.deepEqual(parseSaveText(null), { data: defaultSave(), status: 'empty', backup: false });
});

test('roundTrip：書いて読むと元と同じ', () => {
  const s = sampleSave();
  const r = parseSaveText(serializeSave(s));
  assert.equal(r.status, 'ok');
  assert.equal(r.backup, false);
  assert.deepEqual(r.data, s);
});

test('noVersionToBak：v の無い JSON を置いて読む → .bak に退避され既定値、例外なし（09受17）', () => {
  const raw = JSON.stringify({ tamakake: 99, settings: {} });
  const backend = fakeStorage({ 'tokoyo:save': raw });
  const storage = createStorage(cfg.save, backend);
  const r = storage.loadSave();
  assert.deepEqual(r.data, defaultSave());
  assert.equal(r.status, 'noVersion');
  assert.equal(r.backedUp, true);
  assert.equal(backend.map.get('tokoyo:save.bak'), raw);
  assert.equal(backend.map.has('tokoyo:save'), false); // 退避したら元は消す
  // 次の起動は「保存なし」で、.bak は上書きされない
  const again = storage.loadSave();
  assert.equal(again.status, 'empty');
  assert.equal(backend.map.get('tokoyo:save.bak'), raw);
});

test('brokenToBak：JSON でない・未来の版・配列も退避して既定値', () => {
  for (const [raw, status] of [
    ['{こわれた', 'notJson'],
    ['', 'notJson'],
    [JSON.stringify({ v: SAVE_VERSION + 1, tamakake: 5 }), 'future'],
    [JSON.stringify([1, 2, 3]), 'noVersion'],
    [JSON.stringify({ v: '1' }), 'noVersion'],
    ['null', 'noVersion'],
  ]) {
    const backend = fakeStorage({ 'tokoyo:save': raw });
    const r = createStorage(cfg.save, backend).loadSave();
    assert.equal(r.status, status, raw);
    assert.deepEqual(r.data, defaultSave(), raw);
    assert.equal(backend.map.get('tokoyo:save.bak'), raw, raw);
  }
});

test('emptyNoBak：保存が無いときは退避しない', () => {
  const backend = fakeStorage();
  const r = createStorage(cfg.save, backend).loadSave();
  assert.equal(r.status, 'empty');
  assert.equal(r.backedUp, false);
  assert.equal(backend.map.size, 0);
});

test('sanitize：型の合わない項目だけ既定値に戻し、残りは保つ', () => {
  const r = parseSaveText(JSON.stringify({ v: 1, tamakake: -3, tutorialDone: 'yes', esekiTaken: ['a', 5], settings: { x: 1 } }));
  assert.equal(r.status, 'ok');
  assert.equal(r.data.tamakake, 0);
  assert.equal(r.data.tutorialDone, false);
  assert.deepEqual(r.data.esekiTaken, ['a']);
  assert.deepEqual(r.data.settings, { x: 1 });
});

test('migrationChain：古い版は移行関数を順に適用する（v→v+1 の純関数）', () => {
  const migrations = {
    1: (o) => ({ ...o, v: 2, coins: o.tamakake }),
    2: (o) => ({ ...o, v: 3, flags: ['m2'] }),
  };
  const old = { v: 1, tamakake: 12 };
  const r = upgradeSave(old, { current: 3, migrations });
  assert.ok(r.ok);
  assert.equal(r.migrated, true);
  assert.deepEqual(r.data, { v: 3, tamakake: 12, coins: 12, flags: ['m2'] });
  assert.deepEqual(old, { v: 1, tamakake: 12 }); // 入力は変えない
  // 途中の移行関数が無ければ失敗（退避の対象）
  const r2 = parseSaveText(JSON.stringify(old), { current: 3, migrations: { 2: migrations[2] } });
  assert.equal(r2.status, 'noMigration');
  assert.equal(r2.backup, true);
  // parseSaveText 経由でも移行される
  assert.equal(parseSaveText(JSON.stringify(old), { current: 3, migrations }).status, 'migrated');
});

test('namespace：キーは tokoyo: で始まる。保存時刻は platform 側で付ける', () => {
  const backend = fakeStorage();
  const storage = createStorage(cfg.save, backend, () => 12345);
  const s = sampleSave();
  assert.equal(storage.writeSave(s), true);
  storage.writeDebug({ 'movement.runSpeedMps': 7 });
  assert.ok(backend.map.size >= 2);
  for (const k of backend.map.keys()) assert.ok(k.startsWith(cfg.save.saveKeyPrefix), k);
  assert.deepEqual([...backend.map.keys()].sort(), ['tokoyo:debug', 'tokoyo:save']);
  assert.equal(storage.loadSave().data.updatedAt, 12345);
  assert.deepEqual(storage.loadDebug(), { 'movement.runSpeedMps': 7 });
  storage.clearDebug();
  assert.deepEqual(storage.loadDebug(), {});
});

test('writeFailure：書き込みの失敗（容量・プライベートモード）は例外にせず saveFailed を立てる', () => {
  const storage = createStorage(cfg.save, fakeStorage({}, new Set(['tokoyo:save'])));
  assert.equal(storage.saveFailed, false);
  assert.equal(storage.writeSave(defaultSave()), false);
  assert.equal(storage.saveFailed, true);
  // localStorage 自体が無い環境でも落ちない
  const none = createStorage(cfg.save, null);
  assert.deepEqual(none.loadSave().data, defaultSave());
  assert.equal(none.writeSave(defaultSave()), false);
  assert.deepEqual(none.loadDebug(), {});
});

test('handoffRoundTrip：引き継ぎ文字列を書き出して読み込むと元と深く一致。1文字変えると拒否（09受18）', () => {
  const s = sampleSave();
  const str = encodeHandoff(s);
  assert.match(str, /^TKY1\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/);
  const r = decodeHandoff(str);
  assert.ok(r.ok);
  assert.deepEqual(r.data, s);
  assert.ok(decodeHandoff(`  ${str}\n`).ok); // 貼り付けの前後の空白は許す

  // どの位置の1文字を変えても拒否する
  const pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.';
  let rejected = 0;
  for (let i = 0; i < str.length; i++) {
    for (const ch of [pool[(pool.indexOf(str[i]) + 1) % pool.length], pool[(pool.indexOf(str[i]) + 17) % pool.length]]) {
      if (ch === str[i]) continue;
      const mutated = str.slice(0, i) + ch + str.slice(i + 1);
      const m = decodeHandoff(mutated);
      assert.equal(m.ok, false, `位置 ${i} を ${ch} に変えた文字列が通ってしまった`);
      rejected += 1;
    }
  }
  assert.ok(rejected >= str.length);
  // 1文字足す・1文字削る・空・別物も拒否
  for (const bad of [str + 'a', str.slice(0, -1), str.slice(1), '', 'TKY1..00000000', 'hello', str.replace('TKY1', 'TKY2')]) {
    assert.equal(decodeHandoff(bad).ok, false, bad);
  }
});

test('handoffVersion：検査値が合っていても、版の無い・未来の版のデータは拒否', () => {
  const forge = (obj) => encodeHandoff(/** @type {any} */ (obj));
  assert.deepEqual(decodeHandoff(forge({ tamakake: 5 })), { ok: false, reason: 'noVersion' });
  assert.deepEqual(decodeHandoff(forge({ v: SAVE_VERSION + 1 })), { ok: false, reason: 'future' });
  assert.equal(decodeHandoff(forge({ v: 1, tamakake: 5 })).ok, true);
});
