// HUD・ボタン表示の書き込みの規則（01 4.1、01受28）と、無音WAV（08受13）。DOM は偽物で数える。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHud } from '../../src/ui/hud.js';
import { createButtonsView } from '../../src/ui/buttonsView.js';
import { computeLayout } from '../../src/input/layout.js';
import { makeSilentWav } from '../../src/audio/unlock.js';
import { cfg, REF_INSETS } from './helpers/touchRig.js';

/** style への書き込みを数える偽の DOM。 */
function fakeDoc() {
  const log = { on: false, writes: /** @type {string[]} */ ([]) };
  const make = () => {
    const style = new Proxy(
      {},
      {
        set(t, k, v) {
          if (log.on) log.writes.push(String(k));
          t[k] = v;
          return true;
        },
      },
    );
    return {
      style,
      dataset: {},
      className: '',
      textContent: '',
      id: '',
      type: '',
      appendChild() {},
      append() {},
      addEventListener() {},
      setAttribute() {},
    };
  };
  const doc = { createElement: make, createElementNS: make };
  return { doc: /** @type {any} */ (doc), log, make };
}

test('hudWritesOnlyTransformOpacity：300フレーム回す → style への書き込みは transform と opacity だけ、値が同じフレームは0件（01受28）', () => {
  const { doc, log, make } = fakeDoc();
  const hud = createHud(doc, /** @type {any} */ (make()), /** @type {any} */ (make()), cfg);
  const L = computeLayout(cfg.layout.layoutRefWidthPx, cfg.layout.layoutRefHeightPx, REF_INSETS, {}, cfg.layout);
  hud.layout(L);
  log.on = true;
  let prevKey = '';
  for (let i = 0; i < 300; i++) {
    const s = i < 100 ? { soundBand: false, hint: null } : i < 200 ? { soundBand: true, hint: '案内' } : { soundBand: false, hint: null };
    const before = log.writes.length;
    hud.update(s);
    const key = JSON.stringify(s);
    if (key === prevKey) assert.equal(log.writes.length, before, `frame ${i}：同じ値で書いた`);
    prevKey = key;
  }
  assert.ok(log.writes.length > 0);
  assert.deepEqual([...new Set(log.writes)].sort(), ['opacity', 'transform']);
});

test('buttonsWritesOnlyTransformOpacity：ボタンとスティックの毎フレーム更新も transform と opacity だけ（01 4.1）', () => {
  const { doc, log, make } = fakeDoc();
  const view = createButtonsView(doc, /** @type {any} */ (make()), cfg);
  const L = computeLayout(cfg.layout.layoutRefWidthPx, cfg.layout.layoutRefHeightPx, REF_INSETS, {}, cfg.layout);
  view.layout(L, cfg.settings);
  log.on = true;
  const idle = { stick: null, pressed: new Set() };
  view.update(idle);
  const afterFirst = log.writes.length;
  for (let i = 0; i < 100; i++) view.update(idle);
  assert.equal(log.writes.length, afterFirst, '同じ値の間は書かない');
  for (let i = 0; i < 100; i++) {
    view.update({ stick: { originX: 120, originY: 300, knobX: 120 + (i % 10), knobY: 300 }, pressed: new Set(i % 2 ? ['attack'] : []) });
  }
  assert.deepEqual([...new Set(log.writes)].sort(), ['opacity', 'transform']);
});

test('silentWav：8000Hz・1.0s → 8044バイト、先頭 RIFF・8バイト目から WAVE、標本は全部 0x80（08受13）', () => {
  const w = makeSilentWav(cfg.audio.silentWavRateHz, cfg.audio.silentWavLenS);
  const n = Math.round(cfg.audio.silentWavRateHz * cfg.audio.silentWavLenS);
  assert.equal(w.length, 44 + n);
  const ascii = (at, len) => String.fromCharCode(...w.slice(at, at + len));
  assert.equal(ascii(0, 4), 'RIFF');
  assert.equal(ascii(8, 4), 'WAVE');
  assert.equal(ascii(36, 4), 'data');
  assert.ok(w.slice(44).every((b) => b === 0x80));
});

test('[検算] silentWav の大きさ：8044バイト（08受13）', () => {
  assert.equal(makeSilentWav(8000, 1.0).length, 8044);
});
