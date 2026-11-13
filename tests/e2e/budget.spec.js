// 不変条件10：描画命令110以下・DPR 1.5以下（3視点で検査。09 2章）。
import { boot, cfg, expect, game, test } from './helpers/game.js';

const VIEWS = [
  { name: '開始地点', setup: [] },
  { name: '見下ろし', setup: [['setInput', { camDeg: [45, 500] }], ['step', 1]] },
  { name: '端から中央を見る', setup: [['teleport', 2, 0, 2, 45], ['setInput', { camDeg: [0, -500] }], ['step', 1]] },
];

for (const q of ['high', 'mid', 'low']) {
  test(`drawCallBudget（品質 ${q}）：3視点で描画命令 ≤ ${cfg.quality.drawCallMaxCount}、pixelRatio ≤ ${cfg.quality.dprMaxMul.high}（09受20）`, async ({ page }) => {
    await boot(page, { q });
    for (const view of VIEWS) {
      for (const [method, ...args] of view.setup) await game(page, method, ...args);
      await game(page, 'render');
      const info = await game(page, 'renderInfo');
      expect(info.calls, view.name).toBeGreaterThan(0);
      expect(info.calls, view.name).toBeLessThanOrEqual(cfg.quality.drawCallMaxCount);
      expect(info.pixelRatio, view.name).toBeLessThanOrEqual(cfg.quality.dprMaxMul.high);
      expect(info.pixelRatio, view.name).toBeLessThanOrEqual(cfg.quality.dprMaxMul[q]);
      expect(info.triangles, view.name).toBeGreaterThan(0);
    }
  });
}
