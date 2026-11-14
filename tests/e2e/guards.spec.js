// ブラウザ対策（M0b。01 8章、01受29・30、09受21）。
import { boot, expect, game, test } from './helpers/game.js';
import { createTouch, setHidden } from './helpers/touch.js';

/** タイトルから試験場まで指で進む（番兵が積まれる） */
async function titleToSandbox(page) {
  await boot(page, { scene: 'title' });
  const t = await createTouch(page);
  await t.tapElement(page.locator('#title-sound-off'));
  await t.tapElement(page.locator('[data-item=sandbox]'));
  await expect.poll(async () => (await game(page, 'getState')).scene).toBe('sandbox');
  return t;
}

test('hiddenPauses：visibilitychange（hidden）→ paused=true、tokoyo:save が書かれる（09受21）', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => localStorage.removeItem('tokoyo:save'));
  expect((await game(page, 'getState')).paused).toBe(false);
  await setHidden(page, true);
  expect((await game(page, 'getState')).paused).toBe(true);
  const saved = await page.evaluate(() => localStorage.getItem('tokoyo:save'));
  expect(saved).not.toBeNull();
  expect(JSON.parse(/** @type {string} */ (saved)).v).toBe(1);
  await setHidden(page, false);
  await expect(page.locator('#pause-menu')).toBeVisible();
});

test('popstatePauses：play 中に戻る → 一時停止が開き、history.state が番兵に戻る（01受29）', async ({ page }) => {
  await titleToSandbox(page);
  await page.evaluate(() => new Promise((resolve) => {
    addEventListener('popstate', () => setTimeout(resolve, 0), { once: true });
    history.back();
  }));
  const s = await game(page, 'getState');
  expect(s.paused).toBe(true);
  await expect(page.locator('#pause-menu')).toBeVisible();
  expect(await page.evaluate(() => history.state && history.state.tokoyo)).toBe('guard');
  await expect(page.locator('#teach')).toContainText('もう一度');
});

test('portraitPrompt：視点を 390×844 → 縦向き案内が出て一時停止。横に戻すと案内が消え、一時停止のまま（01受30）', async ({ page }) => {
  await boot(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#rotate-prompt')).toBeVisible();
  await expect(page.locator('#rotate-prompt')).toContainText('横向きにしてください');
  expect((await game(page, 'getState')).paused).toBe(true);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#rotate-prompt')).toBeHidden();
  expect((await game(page, 'getState')).paused).toBe(true);
  await expect(page.locator('#pause-menu')).toBeVisible();
});

test('pauseButton：一時停止ボタンで開き、「続ける」で閉じる。「タイトルへ」でタイトル', async ({ page }) => {
  await boot(page);
  const t = await createTouch(page);
  const L = await game(page, 'layout');
  const p = L.buttons.find((b) => b.id === 'pause');
  await t.tap(p.x, p.y, 1);
  expect((await game(page, 'getState')).paused).toBe(true);
  await t.tapElement(page.locator('#pause-resume'));
  await expect.poll(async () => (await game(page, 'getState')).paused).toBe(false);
  await t.tap(p.x, p.y, 1);
  await t.tapElement(page.locator('#pause-title'));
  await expect.poll(async () => (await game(page, 'getState')).scene).toBe('title');
  await expect(page.locator('#title')).toBeVisible();
});

test('menuReleasesFingers：一時停止が開くと押していた指は解放され、閉じた後も離すまで無視', async ({ page }) => {
  await boot(page);
  const t = await createTouch(page);
  await t.down(1, 120, 300);
  await t.move(1, 180, 300);
  await game(page, 'step', 1);
  expect((await game(page, 'getState')).lastInput.stick[0]).toBeGreaterThan(0.5);
  await setHidden(page, true);
  await setHidden(page, false);
  await t.tapElement(page.locator('#pause-resume'));
  await t.move(1, 190, 300);
  await game(page, 'step', 1);
  expect((await game(page, 'getState')).lastInput.stick).toEqual([0, 0]);
  expect(await game(page, 'pointers')).toEqual([{ id: expect.any(Number), role: 'ignored', btn: null }]);
});

test('suppressed：contextmenu・dblclick・ctrl+wheel・touchmove の既定動作を止める（01 8.2）', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    const fire = (ev) => !document.getElementById('input')?.dispatchEvent(ev); // true＝既定動作を止めた
    return {
      contextmenu: fire(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })),
      dblclick: fire(new MouseEvent('dblclick', { bubbles: true, cancelable: true })),
      wheel: fire(new WheelEvent('wheel', { bubbles: true, cancelable: true, ctrlKey: true })),
      wheelPlain: fire(new WheelEvent('wheel', { bubbles: true, cancelable: true })),
    };
  });
  expect(r).toEqual({ contextmenu: true, dblclick: true, wheel: true, wheelPlain: false });
});

test('lowHeight：高さ 280 未満で一時停止して案内、戻ると案内が消える（01 1.7）', async ({ page }) => {
  await boot(page);
  await page.setViewportSize({ width: 844, height: 270 });
  await expect(page.locator('#rotate-prompt')).toContainText('画面の高さが足りません');
  expect((await game(page, 'getState')).paused).toBe(true);
  await page.setViewportSize({ width: 844, height: 300 });
  await expect(page.locator('#rotate-prompt')).toBeHidden();
});
