// 音の解錠・中断・復帰（08 10章の16〜19。?test=1&audio=1 と ?scene=title から始める）。
// この spec だけ起動引数に --autoplay-policy=no-user-gesture-required を足す（09 10.1）。
import { boot, expect, game, test } from './helpers/game.js';
import { createTouch, setHidden } from './helpers/touch.js';

test.use({
  launchOptions: {
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  },
});

const audioState = async (page) => (await game(page, 'audio')).state;

async function start(page, soundOn) {
  await boot(page, { scene: 'title', extra: '&audio=1' });
  const t = await createTouch(page);
  await t.tapElement(page.locator(soundOn ? '#title-sound-on' : '#title-sound-off'));
  await expect.poll(async () => (await game(page, 'getState')).scene).toBe('devMenu');
  return t;
}

test('soundOnRunning：「音を出して遊ぶ」→ 1s 以内に running、りんが鳴る（08受16）', async ({ page }) => {
  await start(page, true);
  await expect.poll(() => audioState(page), { timeout: 1000 }).toBe('running');
  const a = await game(page, 'audio');
  expect(a.lastSounds.map((x) => x.id)).toContain('uiRin');
  expect(a.masterGain).toBeGreaterThan(0);
});

test('soundOffMuted：「音なしで遊ぶ」→ 主音量 0、/audio/bgm/ への要求 0件（08受17）', async ({ page }) => {
  /** @type {string[]} */
  const bgmReq = [];
  page.on('request', (r) => {
    if (r.url().includes('/audio/bgm/')) bgmReq.push(r.url());
  });
  await start(page, false);
  const a = await game(page, 'audio');
  expect(a.masterGain).toBe(0);
  expect(a.lastSounds.map((x) => x.id)).not.toContain('uiRin');
  expect(bgmReq).toEqual([]);
});

test('hiddenResume：hidden → suspended。表示に戻して pointerup → 0.5s 以内に running（08受18）', async ({ page }) => {
  const t = await start(page, true);
  await expect.poll(() => audioState(page)).toBe('running');
  await setHidden(page, true);
  await expect.poll(() => audioState(page)).toBe('suspended');
  await setHidden(page, false);
  await page.waitForTimeout(100);
  expect(await audioState(page)).toBe('suspended'); // 自動では再開しない
  await t.tap(420, 30);
  await expect.poll(() => audioState(page), { timeout: 500 }).toBe('running');
});

test('soundBand：ctx を suspend → 音の帯が出る。帯をタップ → running、帯が消える（08受19）', async ({ page }) => {
  const t = await start(page, true);
  await t.tapElement(page.locator('[data-item=sandbox]'));
  await expect.poll(async () => (await game(page, 'getState')).scene).toBe('sandbox');
  await expect.poll(() => audioState(page)).toBe('running');
  const band = page.locator('#sound-band');
  await expect(band).toHaveCSS('opacity', '0');
  await game(page, 'audioSuspend');
  await expect.poll(() => audioState(page)).toBe('suspended');
  await expect(band).toHaveCSS('opacity', '1');
  await t.tapElement(band);
  await expect.poll(() => audioState(page), { timeout: 1000 }).toBe('running');
  await expect(band).toHaveCSS('opacity', '0');
  expect((await game(page, 'getState')).paused).toBe(false);
});
