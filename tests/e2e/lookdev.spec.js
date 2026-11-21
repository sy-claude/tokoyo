// 見た目の試作（V1。?scene=lookdev）：開ける・歩ける・カメラが回る・描画命令が予算内・エラー0件。
// 絵は tests/artifacts/lookdev/ に置く（参考画像との比較は scripts/lookdev-shot.mjs）。
import { mkdirSync } from 'node:fs';
import { boot, cfg, expect, game, test } from './helpers/game.js';
import { lookdev } from '../../src/data/stages/lookdev.js';

const OUT = 'tests/artifacts/lookdev';

for (const q of ['high', 'mid', 'low']) {
  test(`lookdevDraw（品質 ${q}）：描画命令 ≤ ${cfg.quality.drawCallMaxCount}、絵が出る`, async ({ page }) => {
    test.setTimeout(120000);
    await boot(page, { scene: 'lookdev', q });
    await game(page, 'step', 30);
    await game(page, 'render');
    const info = await game(page, 'renderInfo');
    expect(info.calls).toBeGreaterThan(5);
    expect(info.calls).toBeLessThanOrEqual(cfg.quality.drawCallMaxCount);
    expect(info.pixelRatio).toBeLessThanOrEqual(cfg.quality.dprMaxMul[q]);
    const s = await game(page, 'getState');
    expect(s.scene).toBe('lookdev');
    expect(s.camera.distM).toBe(lookdev.cameraView.distM);
    mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: `${OUT}/e2e_${q}.png` });
  });
}

test('lookdevWalkAndTurn：前へ歩ける・カメラを回せる', async ({ page }) => {
  test.setTimeout(120000);
  await boot(page, { scene: 'lookdev', q: 'low' });
  const a = await game(page, 'getState');
  await game(page, 'setInput', { stick: [0, 1] });
  await game(page, 'step', 30);
  await game(page, 'setInput', { stick: [0, 0], camDeg: [40, 0] });
  await game(page, 'step', 1);
  await game(page, 'render');
  const b = await game(page, 'getState');
  expect(b.player.pos[2]).toBeGreaterThan(a.player.pos[2] + 2);
  expect(Math.abs(b.camera.yawDeg - a.camera.yawDeg)).toBeGreaterThan(30);
});

test('lookdevGlbFallback：工房で外部素材（&glb=1）を頼んでも、公開版に入らない試しの素材ならコードの形で映る（警告1回・エラー0）', async ({ page }) => {
  test.setTimeout(120000);
  /** @type {string[]} */
  const warns = [];
  page.on('console', (m) => {
    if (m.type() === 'warning') warns.push(m.text());
  });
  await boot(page, { scene: 'lookdev', q: 'low', extra: '&model=ganjo&glb=1' });
  await game(page, 'step', 2);
  await game(page, 'render');
  await game(page, 'render');
  const info = await game(page, 'renderInfo');
  expect(info.calls).toBeGreaterThan(1);
  expect(info.calls).toBeLessThanOrEqual(cfg.quality.drawCallMaxCount);
  expect(warns.filter((w) => w.includes('素材 ganjo')).length).toBe(1);
});
