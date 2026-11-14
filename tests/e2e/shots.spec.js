// スクリーンショット8地点（M0b。10 §M0b の表）。Mごとにこの8枚を置き換える。
// 合否は状態で判定し、画像（sheet.png・sheet_gray.png）では「見る点」だけを確かめる。
import { boot, cfg, expect, game, test } from './helpers/game.js';
import { shot } from './helpers/shots.js';
import { createTouch } from './helpers/touch.js';

test.describe.configure({ mode: 'serial' });

/** 見た目円がどれも safe 矩形の中で、互いに重ならない */
function checkLayout(L) {
  const bs = L.buttons.filter((b) => b.id !== 'pause');
  for (const a of bs) {
    expect(a.x - a.rVisPx >= L.safeL - 1e-6 && a.x + a.rVisPx <= L.safeR + 1e-6, a.id).toBe(true);
    expect(a.y - a.rVisPx >= L.safeT - 1e-6 && a.y + a.rVisPx <= L.safeB + 1e-6, a.id).toBe(true);
    for (const b of bs) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y) >= a.rVisPx + b.rVisPx, `${a.id}-${b.id}`).toBe(true);
  }
}

test('shot 1：タイトル（題字、2つのボタンが中央下、設定は右下）', async ({ page }) => {
  await boot(page, { scene: 'title' });
  await expect(page.locator('#title')).toBeVisible();
  await shot(page, 1);
  const box = await page.locator('#title-sound-on').boundingBox();
  const [W, H] = cfg.input.refViewPx;
  expect(Math.abs(box.y + box.height / 2 - H * cfg.ui.titleBtnCyRatio) < 1).toBe(true);
  const set = await page.locator('#title-settings').boundingBox();
  expect(set.x > W / 2 && set.y > H / 2).toBe(true);
});

test('shot 2：試験メニュー（項目が指で押せる大きさ）', async ({ page }) => {
  await boot(page, { scene: 'title' });
  const t = await createTouch(page);
  await t.tapElement(page.locator('#title-sound-off'));
  await expect(page.locator('#dev-menu')).toBeVisible();
  await shot(page, 2);
  const box = await page.locator('[data-item=sandbox]').boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(cfg.ui.devMenuItemHPx - 0.5);
});

test('shot 3：試験場 844×390（7ボタンと一時停止の位置）', async ({ page }) => {
  await boot(page);
  await shot(page, 3);
  const L = await game(page, 'layout');
  expect(L.buttons.length).toBe(8);
  checkLayout(L);
});

test('shot 4：667×375（重なり・欠けなし）', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await boot(page);
  await shot(page, 4);
  const L = await game(page, 'layout');
  expect([L.viewW, L.viewH]).toEqual([667, 375]);
  checkLayout(L);
});

test('shot 5：932×430（重なり・欠けなし）', async ({ page }) => {
  await page.setViewportSize({ width: 932, height: 430 });
  await boot(page);
  await shot(page, 5);
  const L = await game(page, 'layout');
  expect([L.viewW, L.viewH]).toEqual([932, 430]);
  checkLayout(L);
});

test('shot 6：左利き（左右反転、一時停止は右上のまま）', async ({ page }) => {
  await boot(page);
  const R = await game(page, 'layout');
  await game(page, 'setSettings', { leftHanded: true });
  await shot(page, 6);
  const L = await game(page, 'layout');
  const at = (lay, id) => lay.buttons.find((b) => b.id === id);
  expect(Math.abs(at(L, 'attack').x - (L.viewW - at(R, 'attack').x)) < 0.5).toBe(true);
  expect(at(L, 'pause').x).toBe(at(R, 'pause').x);
});

test('shot 7：390×844（縦向き案内）', async ({ page }) => {
  await boot(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#rotate-prompt')).toBeVisible();
  await shot(page, 7);
  expect((await game(page, 'getState')).paused).toBe(true);
});

test('shot 8：一時停止（2項目、背後の画面が止まっている）', async ({ page }) => {
  await boot(page);
  await game(page, 'setInput', { stick: [0, 1] });
  await game(page, 'step', 30);
  const t = await createTouch(page);
  const p = (await game(page, 'layout')).buttons.find((b) => b.id === 'pause');
  await t.tap(p.x, p.y, 1);
  await expect(page.locator('#pause-menu')).toBeVisible();
  await shot(page, 8);
  const s = await game(page, 'getState');
  expect(s.paused).toBe(true);
  expect(await page.locator('#pause-menu button').count()).toBe(2);
});
