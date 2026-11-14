// 指の操作（M0b。10 §M0b の M0b-1〜3、09 13章の14・15）。CDP のタッチで入力層を通す。
import { boot, cfg, expect, game, test } from './helpers/game.js';
import { createTouch } from './helpers/touch.js';

const near = (a, b, tol) => Math.abs(a - b) <= tol;
/** スティック範囲の中の点（基準端末） */
const STICK_AT = [120, 300];
/** カメラの空き領域の点 */
const CAM_AT = [450, 150];

test('titleToSandbox：タイトル →「音を出して遊ぶ」→ 試験メニュー →「試験場」を CDP のタップで進む（M0b-1）', async ({ page }) => {
  await boot(page, { scene: 'title' });
  const t = await createTouch(page);
  expect((await game(page, 'getState')).scene).toBe('title');
  await t.tapElement(page.locator('#title-sound-on'));
  await expect.poll(async () => (await game(page, 'getState')).scene).toBe('devMenu');
  await t.tapElement(page.locator('[data-item=sandbox]'));
  await expect.poll(async () => (await game(page, 'getState')).scene).toBe('sandbox');
  const s = await game(page, 'getState');
  expect(s.paused).toBe(false);
  // 戻るの番兵が積まれている（01 8.3）
  expect(await page.evaluate(() => history.state && history.state.tokoyo)).toBe('guard');
});

test('stickDrag：スティックを右へ60px ドラッグ → stick.x 1.0、カプセルが右へ動く（M0b-2）', async ({ page }) => {
  // 右の向き：合成入力の stick [1,0] で同じだけ進めた向きと比べる
  await boot(page);
  const s0 = await game(page, 'getState');
  await game(page, 'setInput', { stick: [1, 0] });
  await game(page, 'step', 10);
  const ref = (await game(page, 'getState')).player.pos;
  const dirX = Math.sign(ref[0] - s0.player.pos[0]);
  expect(dirX).not.toBe(0);

  await game(page, 'loadScene', 'sandbox');
  const L = await game(page, 'layout');
  const t = await createTouch(page);
  const px = 60;
  await t.drag(1, STICK_AT, [STICK_AT[0] + px, STICK_AT[1]], { steps: 6, keep: true });
  const s1 = await game(page, 'getState');
  const m = px / L.stickBaseRPx;
  const want = Math.min(1, (m - L.stickDeadzoneMul) / (1 - L.stickDeadzoneMul));
  expect(near(s1.lastInput.stick[0], want, 1e-6), String(s1.lastInput.stick)).toBe(true);
  expect(near(s1.lastInput.stick[0], 1.0, 0.01)).toBe(true); // [検算] 10 §M0b-2
  await game(page, 'step', 30);
  const s2 = await game(page, 'getState');
  expect(Math.sign(s2.player.pos[0] - s0.player.pos[0])).toBe(dirX);
  expect(Math.abs(s2.player.pos[0] - s0.player.pos[0])).toBeGreaterThan(1);
  expect(near(s2.player.pos[2], s0.player.pos[2], 1e-6)).toBe(true);
  await t.up(1);
  await game(page, 'step', 1);
  expect((await game(page, 'getState')).lastInput.stick).toEqual([0, 0]);
});

test('devMenuOverlay：試験メニューの「数値表示」→ overlay が出る（M0b-3）', async ({ page }) => {
  await boot(page, { scene: 'title' });
  const t = await createTouch(page);
  await t.tapElement(page.locator('#title-sound-off'));
  await expect(page.locator('#dev-menu')).toBeVisible();
  await expect(page.locator('#debug-overlay')).toHaveCount(0);
  await t.tapElement(page.locator('[data-item=overlay]'));
  await expect(page.locator('#debug-overlay')).toBeVisible();
  await expect(page.locator('#debug-overlay')).toContainText('tick');
  await expect(page.locator('[data-item=overlay]')).toHaveAttribute('aria-pressed', 'true');
});

test('twoFingers：スティック＋カメラを同時にドラッグし、カメラの指だけ離す → スティックが続く（09受14）', async ({ page }) => {
  await boot(page);
  const t = await createTouch(page);
  await t.down(1, STICK_AT[0], STICK_AT[1]);
  await t.down(2, CAM_AT[0], CAM_AT[1]);
  for (let i = 1; i <= 6; i++) {
    await t.move(1, STICK_AT[0] + i * 10, STICK_AT[1]);
    await t.move(2, CAM_AT[0] + i * 10, CAM_AT[1]);
    await game(page, 'step', 1);
  }
  let s = await game(page, 'getState');
  expect(s.lastInput.camHeld).toBe(true);
  expect(s.camera.yawDeg).not.toBe(0);
  await t.up(2);
  await t.move(1, STICK_AT[0] + 65, STICK_AT[1]);
  await game(page, 'step', 1);
  s = await game(page, 'getState');
  expect(Math.hypot(s.lastInput.stick[0], s.lastInput.stick[1])).toBeGreaterThan(0.5);
  expect(s.lastInput.camHeld).toBe(false);
  expect(await game(page, 'pointers')).toEqual([{ id: expect.any(Number), role: 'stick', btn: null }]);
});

test('touchCancel：touchCancel → 全ボタン down=false、stick=[0,0]（09受15）', async ({ page }) => {
  await boot(page);
  const L = await game(page, 'layout');
  const t = await createTouch(page);
  const atk = L.buttons.find((b) => b.id === 'attack');
  const jmp = L.buttons.find((b) => b.id === 'jump');
  await t.down(1, STICK_AT[0], STICK_AT[1]);
  await t.move(1, STICK_AT[0] + 50, STICK_AT[1]);
  await t.down(2, atk.x, atk.y);
  await t.down(3, jmp.x, jmp.y);
  await game(page, 'step', 1);
  let s = await game(page, 'getState');
  expect(s.lastInput.btn.attack.down && s.lastInput.btn.jump.down).toBe(true);
  expect(s.lastInput.stick[0]).toBeGreaterThan(0.5);
  await t.cancel();
  await game(page, 'step', 1);
  s = await game(page, 'getState');
  expect(s.lastInput.stick).toEqual([0, 0]);
  for (const b of Object.values(s.lastInput.btn)) expect([b.down, b.released]).toEqual([false, false]);
});

test('tapButton：ボタンを叩くと pressed、離すと released が届く（技はまだ出ない）', async ({ page }) => {
  await boot(page);
  const t = await createTouch(page);
  const L = await game(page, 'layout');
  const j = L.buttons.find((b) => b.id === 'jump');
  await t.down(1, j.x, j.y);
  await game(page, 'step', 1);
  expect((await game(page, 'getState')).lastInput.btn.jump).toMatchObject({ pressed: true, down: true });
  await t.up(1);
  await game(page, 'step', 1);
  expect((await game(page, 'getState')).lastInput.btn.jump).toMatchObject({ released: true, down: false });
});

test('cameraDrag：右側のなぞりで見回せる（指を右へ → yaw が感度どおりに回る）', async ({ page }) => {
  await boot(page);
  const t = await createTouch(page);
  const s0 = await game(page, 'getState');
  // はじき（180ms 以内に横40px）にならないよう、押してから待ってから動かす
  await t.down(1, CAM_AT[0], CAM_AT[1]);
  await page.waitForTimeout(cfg.input.flickWindowS * 1000 + 50);
  for (let i = 1; i <= 10; i++) {
    await t.move(1, CAM_AT[0] + i * 10, CAM_AT[1]);
    await game(page, 'step', 1);
  }
  await t.up(1);
  const s1 = await game(page, 'getState');
  const turned = Math.abs(s1.camera.yawDeg - s0.camera.yawDeg);
  expect(near(turned, 100 * cfg.camera.camYawDegPerPx, 0.01), String(turned)).toBe(true);
});
