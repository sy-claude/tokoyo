// 起動と土台の e2e（M0a。09 13章の受け入れ基準）。
import { readFileSync } from 'node:fs';
import { boot, cfg, expect, game, test } from './helpers/game.js';

const near = (a, b, tol) => Math.abs(a - b) <= tol;

test('testModeNoLoop：?test=1 では1秒待っても tick が進まない（09受5）', async ({ page }) => {
  await boot(page);
  await page.waitForTimeout(1000);
  expect((await game(page, 'getState')).tick).toBe(0);
});

test('stepSixty：step(60) で tick が60（09受6）', async ({ page }) => {
  await boot(page);
  await game(page, 'step', 60);
  const s = await game(page, 'getState');
  expect(s.tick).toBe(60);
  expect(s.scene).toBe('sandbox');
  expect(s.paused).toBe(false);
});

test('sameSeedSameHash：同じ種・同じ入力で600tick を2回 → 一致。種を2にすると不一致（09受7）', async ({ page }) => {
  const run = async (seed) => {
    await game(page, 'loadScene', 'sandbox', { seed });
    await game(page, 'setInput', { stick: [0, 1] });
    await game(page, 'step', 300);
    await game(page, 'setInput', { stick: [0.5, -0.5], camDeg: [20, 5] });
    await game(page, 'step', 300);
    return game(page, 'hash');
  };
  await boot(page);
  const a = await run(1);
  const b = await run(1);
  const c = await run(2);
  expect(a).toMatch(/^[0-9a-f]{8}$/);
  expect(b).toBe(a);
  expect(c).not.toBe(a);
});

test('replayMatchesNode：保存したリプレイをブラウザで流すと、Node と同じハッシュ（V8 内の決定論）', async ({ page }) => {
  const json = JSON.parse(readFileSync(new URL('../replays/m0_walk.json', import.meta.url), 'utf8'));
  const { decodeFrames } = await import('../../src/input/synthetic.js');
  await boot(page, { scene: json.scene, seed: json.seed });
  await game(page, 'playReplay', decodeFrames(json.frames));
  for (const [tick, hash] of Object.entries(json.hashes)) {
    if (tick === 'final') continue;
    await game(page, 'step', Number(tick) - (await game(page, 'getState')).tick);
    expect(await game(page, 'hash'), `tick ${tick}`).toBe(hash);
  }
  await game(page, 'step', json.ticks - (await game(page, 'getState')).tick);
  expect(await game(page, 'hash')).toBe(json.hashes.final);
});

test('walkForward：setInput({stick:[0,1]}) と step(60) → カプセルが 仮速度×1s 前へ進む（09受13）', async ({ page }) => {
  await boot(page);
  const s0 = await game(page, 'getState');
  await game(page, 'setInput', { stick: [0, 1] });
  await game(page, 'step', cfg.time.tickRateHz);
  const s1 = await game(page, 'getState');
  const expected = cfg.movement.runSpeedMps; // m/s × 1s
  const moved = Math.hypot(s1.player.pos[0] - s0.player.pos[0], s1.player.pos[2] - s0.player.pos[2]);
  expect(near(moved, expected, expected * 0.02), `moved=${moved}`).toBe(true);
  // 前＝カメラの向き（開始時は +Z）。カメラも同じだけ追う
  expect(near(s1.player.pos[2] - s0.player.pos[2], expected, expected * 0.02)).toBe(true);
  expect(near(s1.camera.pos[2] - s0.camera.pos[2], expected, expected * 0.02)).toBe(true);
  // 止めれば止まる
  await game(page, 'setInput', { stick: [0, 0] });
  await game(page, 'step', 10);
  const s2 = await game(page, 'getState');
  expect(s2.player.pos).toEqual(s1.player.pos);
});

test('setConfigLive：setConfig で変えた値がすぐシムに効く', async ({ page }) => {
  await boot(page);
  const s0 = await game(page, 'getState');
  const speed = cfg.movement.runSpeedMps / 2;
  await game(page, 'setConfig', 'movement.runSpeedMps', speed);
  await game(page, 'setInput', { stick: [0, 1] });
  await game(page, 'step', cfg.time.tickRateHz);
  const s1 = await game(page, 'getState');
  expect(near(s1.player.pos[2] - s0.player.pos[2], speed, speed * 0.02)).toBe(true);
});

test('cameraTurnAndPitch：camDeg で回り、縦角は config の範囲で止まる', async ({ page }) => {
  await boot(page);
  const s0 = await game(page, 'getState');
  await game(page, 'setInput', { camDeg: [90, 0] });
  await game(page, 'step', 1);
  const s1 = await game(page, 'getState');
  const dYaw = Math.abs(((s1.camera.yawDeg - s0.camera.yawDeg + 540) % 360) - 180);
  expect(near(dYaw, 90, 1e-6)).toBe(true);
  // 視点が右を向く：+Z を向いていたカメラが −X を向く → カメラの位置は注視点の +X 側
  expect(s1.camera.pos[0] - s1.player.pos[0]).toBeGreaterThan(cfg.camera.camExploreDistM * 0.9);
  await game(page, 'setInput', { camDeg: [0, 500] });
  await game(page, 'step', 1);
  expect((await game(page, 'getState')).camera.pitchDeg).toBe(cfg.camera.camPitchMaxDeg);
  await game(page, 'setInput', { camDeg: [0, -500] });
  await game(page, 'step', 1);
  expect((await game(page, 'getState')).camera.pitchDeg).toBe(cfg.camera.camPitchMinDeg);
});

test('sandbox300：sandbox を起動して300tick → コンソールエラー0件（09受19）', async ({ page }) => {
  await boot(page);
  await game(page, 'setInput', { stick: [0.7, 0.7], camDeg: [3, 1] });
  for (let i = 0; i < 10; i++) {
    await game(page, 'step', 30);
    await game(page, 'render');
  }
  expect((await game(page, 'getState')).tick).toBe(300);
  expect((await game(page, 'renderInfo')).calls).toBeGreaterThan(0);
  expect(await game(page, 'getEvents')).toEqual([]); // M0a はイベントを出す機能がまだ無い
});

test('normalLoopRuns：通常のループで起動して1秒待つと tick ≥ 30（M0a-1）', async ({ page }) => {
  await page.goto('/?scene=sandbox&debug=1');
  const overlay = page.locator('#debug-overlay');
  await expect(overlay).toBeVisible();
  expect(await page.evaluate(() => /** @type {any} */ (window).__game)).toBeUndefined(); // ?test=1 が無ければ __game は無い
  await page.waitForFunction(() => document.querySelector('#debug-overlay')?.getAttribute('data-tick') !== null);
  const t0 = Number(await overlay.getAttribute('data-tick'));
  await page.waitForTimeout(1000);
  const t1 = Number(await overlay.getAttribute('data-tick'));
  expect(t1 - t0).toBeGreaterThanOrEqual(30);
  await expect(overlay).toContainText('tick');
  await expect(overlay).toContainText('fps');
});

test('defaultSceneIsSandbox：引数なしで開くと試験場が出る（公開URLの最初の画面）', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas#game')).toBeVisible();
  await page.waitForTimeout(500);
  const size = await page.evaluate(() => {
    const c = /** @type {HTMLCanvasElement} */ (document.getElementById('game'));
    return [c.width, c.height, c.clientWidth, c.clientHeight];
  });
  expect(size[2]).toBe(cfg.input.refViewPx[0]);
  expect(size[3]).toBe(cfg.input.refViewPx[1]);
  expect(size[0]).toBe(Math.floor(cfg.input.refViewPx[0] * cfg.quality.dprMaxMul.high));
});

test('qualityParam：&q=low → pixelRatio 1.0、エラー0（M0a-2）', async ({ page }) => {
  await boot(page, { q: 'low' });
  await game(page, 'render');
  const info = await game(page, 'renderInfo');
  expect(info.pixelRatio).toBe(cfg.quality.dprMaxMul.low);
  expect(info.pixelRatio).toBe(1.0); // [検算] M0a-2
  expect(info.quality).toBe('low');
  await game(page, 'setQuality', 'mid');
  await game(page, 'render');
  expect((await game(page, 'renderInfo')).pixelRatio).toBe(cfg.quality.dprMaxMul.mid);
});

test('noVersionSaveToBak：v の無い JSON を置いて起動 → .bak に退避され既定値で起動、例外なし（09受17）', async ({ page }) => {
  const raw = JSON.stringify({ tamakake: 99 });
  await page.addInitScript((text) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('tokoyo:save', text);
      sessionStorage.setItem('seeded', '1');
    }
  }, raw);
  await boot(page);
  const stored = await page.evaluate(() => ({ bak: localStorage.getItem('tokoyo:save.bak'), keys: Object.keys(localStorage) }));
  expect(stored.bak).toBe(raw);
  for (const k of stored.keys) expect(k.startsWith(cfg.save.saveKeyPrefix)).toBe(true);
  await game(page, 'step', 10);
  expect((await game(page, 'getState')).tick).toBe(10);
});

test('debugPanelCopy：?debug=1 で調整パネルが出て、「JSONをコピー」は変えたキーだけを返す（09受23）', async ({ page }) => {
  await boot(page, { extra: '&debug=1' });
  await expect(page.locator('#dbg-panel')).toBeVisible();
  await page.locator('#dbg-toggle').click();
  await page.locator('#dbg-copy').click();
  expect(JSON.parse(await page.locator('#dbg-json').inputValue())).toEqual({});
  // 走りの速さを変える
  await page.locator('#dbg-panel details', { hasText: 'movement' }).locator('summary').click();
  const box = page.locator('.dbg-row[data-path="movement.runSpeedMps"] input[type=number]');
  await expect(box).toHaveValue(String(cfg.movement.runSpeedMps));
  const speed = cfg.movement.runSpeedMps + 1.5;
  await box.fill(String(speed));
  await box.dispatchEvent('change');
  await page.locator('#dbg-copy').click();
  expect(JSON.parse(await page.locator('#dbg-json').inputValue())).toEqual({ 'movement.runSpeedMps': speed });
  // 変えた値がシムに効く
  const s0 = await game(page, 'getState');
  await game(page, 'setInput', { stick: [0, 1] });
  await game(page, 'step', cfg.time.tickRateHz);
  const s1 = await game(page, 'getState');
  expect(near(s1.player.pos[2] - s0.player.pos[2], speed, speed * 0.02)).toBe(true);
  // 値は tokoyo:debug に残り、開き直しても使われる
  await boot(page, { extra: '&debug=1' });
  await page.locator('#dbg-toggle').click();
  expect(JSON.parse(await page.locator('#dbg-json').inputValue())).toEqual({ 'movement.runSpeedMps': speed });
  // 「初期化」で既定に戻る
  await page.locator('#dbg-reset').click();
  expect(JSON.parse(await page.locator('#dbg-json').inputValue())).toEqual({});
  expect(await page.evaluate(() => localStorage.getItem('tokoyo:debug'))).toBeNull();
});
