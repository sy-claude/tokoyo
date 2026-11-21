// スクリーンショット8地点（M2a。10 §M2a の表）。Mごとにこの8枚を置き換える（M0b の配置の検査は m0bLayout.spec.js）。
// 合否は状態で判定し、画像（sheet.png・sheet_gray.png）では「見る点」だけを確かめる。
import { boot, cfg, expect, game, test } from './helpers/game.js';
import { shot } from './helpers/shots.js';

test.describe.configure({ mode: 'serial' });

const mv = cfg.movement;
const state = async (page) => (await game(page, 'getState')).player;

/** 跳躍を押し続けて n tick（押した tick を含む）。 */
async function jumpHold(page, n, stick = [0, 0]) {
  await game(page, 'setInput', { stick, down: { jump: true } });
  await game(page, 'step', n);
}

test('shot 1：開始点（試験場の全体：段差・台・壁・海）', async ({ page }) => {
  await boot(page);
  await game(page, 'setInput', { camDeg: [0, 12] });
  await game(page, 'step', 1);
  await shot(page, 1);
  const p = await state(page);
  expect(p.pos).toEqual([30, 0, 14]);
  expect(p.state).toBe('idle');
});

test('shot 2：1.8m の段の上（足が段に接している）', async ({ page }) => {
  await boot(page);
  await game(page, 'teleport', 25, 1.8, 14.2, 180);
  await game(page, 'step', 5);
  await game(page, 'teleport', 25, 1.8, 16, 180);
  await game(page, 'step', 2);
  await shot(page, 2);
  const p = await state(page);
  expect(p.pos[1]).toBe(1.8);
  expect(p.grounded).toBe(true);
});

test('shot 3：跳躍の頂点（跳躍の姿勢）', async ({ page }) => {
  await boot(page);
  await game(page, 'teleport', 30, 0, 20, 90);
  await jumpHold(page, 20);
  await shot(page, 3);
  const p = await state(page);
  expect(p.state).toBe('jumpRise');
  expect(p.pos[1]).toBeGreaterThan(2.3);
});

test('shot 4：神通足の途中（隙間6m。水平の姿勢）', async ({ page }) => {
  await boot(page);
  await game(page, 'teleport', 17.3, 2, 36, 90);
  await jumpHold(page, 20, [0, 1]);
  await game(page, 'setInput', { stick: [0, 1], down: { jump: true, dodge: true } });
  await game(page, 'step', 6);
  await shot(page, 4);
  const p = await state(page);
  expect(p.state).toBe('airDash');
  expect(p.pos[0]).toBeGreaterThan(20); // 隙間（x 18〜24）の上
});

test('shot 5：ステップ f8（後方への身のこなし）', async ({ page }) => {
  await boot(page);
  await game(page, 'teleport', 30, 0, 24, 0);
  await game(page, 'setInput', { down: { dodge: true } });
  await game(page, 'step', 8);
  await shot(page, 5);
  const p = await state(page);
  expect(p.state).toBe('step');
  expect(p.pos[2]).toBeLessThan(24 - 2);
});

test('shot 6：崖（T2）の縁に歩いて止まる（落ちていない）', async ({ page }) => {
  await boot(page);
  await game(page, 'teleport', 47, 0, 30, 90);
  await game(page, 'setInput', { stick: [0, 0.4] });
  await game(page, 'step', 120);
  await game(page, 'setInput', { stick: [0, 0], camDeg: [-60, 8] });
  await game(page, 'step', 1);
  await shot(page, 6);
  const p = await state(page);
  expect(p.pos[1]).toBe(0);
  expect(p.pos[0]).toBeGreaterThan(49);
});

test('shot 7：海へ落ちた直後（沈む表現）', async ({ page }) => {
  await boot(page);
  await game(page, 'teleport', 30, 0, 13, 180);
  await game(page, 'setInput', { stick: [0, 1] });
  let p = await state(page);
  for (let i = 0; i < 60 && p.state !== 'fallSea'; i++) {
    await game(page, 'step', 1);
    p = await state(page);
  }
  await game(page, 'setInput', { stick: [0, 0] });
  await game(page, 'step', mv.seaSinkF / 2);
  await shot(page, 7);
  p = await state(page);
  expect(p.state).toBe('fallSea');
  expect((await game(page, 'getState')).camera.mode).toBe('sea');
});

test('shot 8：char=shirayuki で宙返りの頂点（回転の姿勢。体はカプセル）', async ({ page }) => {
  await boot(page, { char: 'shirayuki' });
  await game(page, 'teleport', 30, 0, 24, 0);
  await jumpHold(page, 20);
  await game(page, 'setInput', { down: { jump: true, dodge: true } });
  await game(page, 'step', mv.flipF / 2);
  await shot(page, 8);
  const p = await state(page);
  expect(p.state).toBe('flip');
  expect(p.pos[1]).toBeGreaterThan(3.2);
});
