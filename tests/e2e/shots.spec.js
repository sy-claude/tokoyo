// スクリーンショット8地点（M0a。10 §M0a の表）。Mごとにこの8枚を置き換える。
// 合否は状態で判定し、画像（sheet.png・sheet_gray.png）では「見る点」だけを確かめる。
import { boot, cfg, expect, game, test } from './helpers/game.js';
import { shot } from './helpers/shots.js';

test.describe.configure({ mode: 'serial' });

test('shot 1：起動直後', async ({ page }) => {
  await boot(page);
  await shot(page, 1);
  expect((await game(page, 'getState')).tick).toBe(0);
});

test('shot 2：stick [0,1] で60tick（約6.5m前進、カメラが追う）', async ({ page }) => {
  await boot(page);
  await game(page, 'setInput', { stick: [0, 1] });
  await game(page, 'step', 60);
  await shot(page, 2);
  const s = await game(page, 'getState');
  expect(Math.abs(s.player.pos[2] - (14 + cfg.movement.runSpeedMps)) < 0.2).toBe(true);
});

test('shot 3：camDeg で yaw +90°（格子の向きが回る）', async ({ page }) => {
  await boot(page);
  await game(page, 'setInput', { camDeg: [90, 0] });
  await game(page, 'step', 1);
  await shot(page, 3);
  const yaw = (await game(page, 'getState')).camera.yawDeg;
  expect(Math.abs(Math.abs(yaw) - 90) < 1e-6).toBe(true);
});

test('shot 4：pitch を camPitchMaxDeg へ（見下ろし、床の端が見える）', async ({ page }) => {
  await boot(page);
  await game(page, 'teleport', 30, 0, 55, 0); // 南の端（z=60）の手前。端が画面に入る
  await game(page, 'setInput', { camDeg: [0, 500] });
  await game(page, 'step', 1);
  await shot(page, 4);
  expect((await game(page, 'getState')).camera.pitchDeg).toBe(cfg.camera.camPitchMaxDeg);
});

test('shot 5：?debug=1 のパネル（通常のループ。FPS・tick が出る）', async ({ page }) => {
  await page.goto('/?scene=sandbox&debug=1');
  await page.locator('#dbg-toggle').click();
  await page.locator('#dbg-panel details', { hasText: 'movement' }).locator('summary').click();
  await page.waitForTimeout(1500); // FPS の中央値が出るまで
  await expect(page.locator('#debug-overlay')).toContainText('fps');
  await shot(page, 5, { render: false });
});

test('shot 6：視点 667×375', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await boot(page);
  await shot(page, 6);
  expect(await page.evaluate(() => [innerWidth, innerHeight])).toEqual([667, 375]);
});

test('shot 7：視点 932×430', async ({ page }) => {
  await page.setViewportSize({ width: 932, height: 430 });
  await boot(page);
  await shot(page, 7);
  expect(await page.evaluate(() => [innerWidth, innerHeight])).toEqual([932, 430]);
});

test('shot 8：q=low（絵が同じで粗いだけ）', async ({ page }) => {
  await boot(page, { q: 'low' });
  await shot(page, 8);
  expect((await game(page, 'renderInfo')).pixelRatio).toBe(cfg.quality.dprMaxMul.low);
});
