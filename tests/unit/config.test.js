// config の組立・範囲・tick 換算（09 11.1）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyConfigOverrides, buildConfig, checkTables, diffConfig, getConfigValue, resetConfig, setConfigValue } from '../../src/core/config.js';
import { TICK_RATE_HZ, sToTicks, ticksToS } from '../../src/core/units.js';
import { SAVE_VERSION } from '../../src/core/saveSchema.js';
import { validateStage } from '../../src/data/validate.js';
import { sandbox } from '../../src/data/stages/sandbox.js';
import { configTables, makeCfg } from './helpers/cfg.js';

test('buildConfig：表の値がそのまま cfg に入る', () => {
  const cfg = makeCfg();
  for (const [t, table] of Object.entries(configTables)) {
    for (const [k, entry] of Object.entries(table)) assert.deepEqual(cfg[t][k], entry.v, `${t}.${k}`);
  }
});

test('[検算] docValues：設計書の表の値を写し間違えていない（調整で値を変えたら、ここも直す）', () => {
  const cfg = makeCfg();
  assert.equal(cfg.time.tickRateHz, 60); // 09 4.2
  assert.equal(cfg.time.maxTicksPerFrameCount, 5); // 09 4.2、00_core 4章
  assert.equal(cfg.time.frameDeltaClampS, 0.25); // 09 4.2
  assert.equal(cfg.time.scaleQuantCount, 4096); // 09 4.2
  assert.equal(cfg.time.fuWorldMul, 0.15); // 09 4.2
  assert.equal(cfg.time.mikiriSlowMul, 0.3); // 09 4.2
  assert.equal(cfg.movement.runSpeedMps, 6.5); // 02 9.1
  assert.equal(cfg.camera.camExploreDistM, 5.0); // 02 9.2
  assert.equal(cfg.camera.camExplorePivotHM, 1.5); // 02 9.2
  assert.equal(cfg.camera.camPitchMinDeg, -30); // 02 9.2
  assert.equal(cfg.camera.camPitchMaxDeg, 60); // 02 9.2
  assert.equal(cfg.camera.camFovYDeg, 55); // 02 9.2
  assert.equal(cfg.input.keyCamDegPs, 120); // 09 5.4
  assert.equal(cfg.input.kbWalkMul, 0.5); // 01 2.11
  assert.equal(cfg.input.inputAgeMaxF, 4); // 09 5.4
  assert.deepEqual(cfg.quality.dprMaxMul, { high: 1.5, mid: 1.25, low: 1.0 }); // 09 8.9
  assert.equal(cfg.quality.drawCallMaxCount, 110); // 09 8.9
  assert.equal(cfg.collision.stepUpM, 0.4); // 09 6章
  assert.equal(cfg.collision.slopeMaxDeg, 45); // 09 6章
  assert.equal(cfg.save.saveKeyPrefix, 'tokoyo:'); // 09 9章
  assert.equal(cfg.debug.devMenuOn, true); // 10 §4.4（M10a で false）
});

test('independentCopies：cfg を変えても表（既定値）は変わらない', () => {
  const cfg = makeCfg();
  const def = configTables.quality.dprMaxMul.v.high;
  cfg.quality.dprMaxMul.high = def + 9;
  assert.equal(configTables.quality.dprMaxMul.v.high, def);
  assert.equal(makeCfg().quality.dprMaxMul.high, def);
});

test('setAndDiff：変えたキーだけが diff に出る。reset で空に戻る（09受23 の土台）', () => {
  const cfg = makeCfg();
  assert.deepEqual(diffConfig(cfg, configTables), {});
  setConfigValue(cfg, configTables, 'movement.runSpeedMps', 7);
  setConfigValue(cfg, configTables, 'quality.dprMaxMul.low', 0.75);
  assert.equal(getConfigValue(cfg, configTables, 'movement.runSpeedMps'), 7);
  assert.deepEqual(diffConfig(cfg, configTables), {
    'movement.runSpeedMps': 7,
    'quality.dprMaxMul': { ...configTables.quality.dprMaxMul.v, low: 0.75 },
  });
  setConfigValue(cfg, configTables, 'movement.runSpeedMps', configTables.movement.runSpeedMps.v);
  assert.deepEqual(Object.keys(diffConfig(cfg, configTables)), ['quality.dprMaxMul']);
  resetConfig(cfg, configTables);
  assert.deepEqual(diffConfig(cfg, configTables), {});
});

test('setRejects：無いキーと型の違う値は例外', () => {
  const cfg = makeCfg();
  assert.throws(() => setConfigValue(cfg, configTables, 'movement.noSuchKey', 1));
  assert.throws(() => setConfigValue(cfg, configTables, 'nosuch.runSpeedMps', 1));
  assert.throws(() => setConfigValue(cfg, configTables, 'movement.runSpeedMps', 'fast'));
  assert.throws(() => setConfigValue(cfg, configTables, 'movement.runSpeedMps', Number.NaN));
  assert.throws(() => setConfigValue(cfg, configTables, 'debug.devMenuOn', 1));
});

test('overrides：保存した差分を適用できる。無いキー・型違いは捨てて報告する', () => {
  const cfg = makeCfg();
  const rejected = applyConfigOverrides(cfg, configTables, {
    'movement.runSpeedMps': 8,
    'movement.gone': 1,
    'time.fuWorldMul': 'x',
  });
  assert.equal(cfg.movement.runSpeedMps, 8);
  assert.deepEqual(rejected.sort(), ['movement.gone', 'time.fuWorldMul']);
  assert.deepEqual(applyConfigOverrides(cfg, configTables, null), []);
});

test('ranges：全キーが min ≤ 値 ≤ max で、説明がある', () => {
  assert.deepEqual(checkTables(configTables), []);
});

test('tickConversion：秒 → tick の換算。config の tickRateHz と core の定数が同じ', () => {
  const cfg = makeCfg();
  assert.equal(cfg.time.tickRateHz, TICK_RATE_HZ);
  assert.equal(sToTicks(1), cfg.time.tickRateHz);
  assert.equal(sToTicks(0.6), Math.round(0.6 * cfg.time.tickRateHz));
  assert.equal(sToTicks(1.5), Math.round(1.5 * cfg.time.tickRateHz));
  assert.equal(ticksToS(cfg.time.tickRateHz), 1);
  assert.ok(Number.isInteger(sToTicks(0.25)));
});

test('saveVersion：config の saveVersionCount と core の版が同じ', () => {
  assert.equal(makeCfg().save.saveVersionCount, SAVE_VERSION);
});

test('sandboxValid：試験場のデータが検証を通る。壊すと検出する', () => {
  assert.deepEqual(validateStage(sandbox), []);
  const cfg = makeCfg();
  assert.equal(sandbox.cellM, cfg.collision.terrainCellM);
  const bad = structuredClone(sandbox);
  bad.playerStart.pos = [999, 0, 0];
  assert.ok(validateStage(bad).length > 0);
  const bad2 = structuredClone(sandbox);
  bad2.cellM = 1;
  assert.ok(validateStage(bad2).length > 0);
});

test('buildConfig は渡した表だけを見る（core は config を import しない）', () => {
  const cfg = buildConfig({ t: { aM: { v: 2, desc: 'x' } } });
  assert.deepEqual(cfg, { t: { aM: 2 } });
});
