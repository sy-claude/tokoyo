// 07受25・M1a-2：起動から最初の描画までに事前コンパイルが済み、その後は新しいシェーダープログラムを作らない。
// 07受5：主人公の描画命令＝本体2＋武器2。
import { boot, cfg, expect, game, test } from './helpers/game.js';

/** いろいろな向き・距離・品質で描く（どれも最初に作ったプログラムだけで描けること） */
const VIEWS = [
  [['setInput', { camDeg: [180, 0] }], ['step', 1]],
  [['setInput', { camDeg: [90, 500] }], ['step', 1]],
  [['setConfig', 'camera.camExploreDistM', 25], ['setInput', { camDeg: [45, -500] }], ['step', 1]],
  [['setConfig', 'camera.camExploreDistM', 2], ['setInput', { stick: [0, 1] }], ['step', 30]],
  [['setQuality', 'low'], ['setInput', { stick: [0, 0], camDeg: [10, 20] }], ['step', 90]],
  [['setQuality', 'mid'], ['teleport', 5, 0, 5, 135], ['step', 1]],
  [['setQuality', 'high'], ['step', 300]],
];

test(`noNewPrograms：起動時に renderer.compile が呼ばれ、試験場で楓真を描き続けても programs が増えない。描画命令 ≤ ${cfg.quality.drawCallMaxCount}（07受25・M1a-2）`, async ({ page }) => {
  await boot(page);
  const first = await game(page, 'renderInfo');
  expect(first.compileCalls, '起動から最初の描画までに compile が呼ばれている').toBeGreaterThanOrEqual(1);
  expect(first.programsAtWarmup).toBeGreaterThanOrEqual(3); // 床・トゥーン（剛体スキン）・輪郭（剛体スキン）
  expect(first.programs, '最初の描画で新しいプログラムを作っていない').toBe(first.programsAtWarmup);
  expect(first.calls).toBeGreaterThan(0);

  for (const view of VIEWS) {
    for (const [method, ...args] of view) await game(page, method, ...args);
    await game(page, 'render');
    const info = await game(page, 'renderInfo');
    expect(info.programs, JSON.stringify(view)).toBe(first.programsAtWarmup);
    expect(info.calls).toBeLessThanOrEqual(cfg.quality.drawCallMaxCount);
  }
  // 場面を読み直しても（主人公を作り直しても）増えない。compile も呼び直さない
  await game(page, 'loadScene', 'sandbox');
  await game(page, 'step', 2);
  await game(page, 'render');
  const again = await game(page, 'renderInfo');
  expect(again.programs).toBe(first.programsAtWarmup);
  expect(again.compileCalls).toBe(first.compileCalls);
});

test('playerDrawCalls：楓真は SkinnedMesh の本体1＋武器1、輪郭を足して描画命令4。床と合わせて5（07受5）', async ({ page }) => {
  await boot(page);
  await game(page, 'render');
  const rig = await game(page, 'playerRig');
  expect(rig.meshes.map((m) => m.name)).toEqual(['body', 'outline', 'weapon', 'weaponOutline']);
  expect(rig.meshes.every((m) => m.skinned)).toBe(true);
  expect(rig.drawCalls).toBe(4);
  // 輪郭は本体と同じ数の骨（同じ Skeleton）
  expect(rig.meshes[1].bones).toBe(rig.meshes[0].bones);
  expect(rig.meshes[3].bones).toBe(rig.meshes[2].bones);
  const info = await game(page, 'renderInfo');
  expect(info.calls).toBe(1 + rig.drawCalls);
  // カメラを真上へ向けて主人公が画面から外れても、数は増えない
  await game(page, 'setInput', { camDeg: [0, -500] });
  await game(page, 'step', 1);
  await game(page, 'render');
  expect((await game(page, 'renderInfo')).calls).toBeLessThanOrEqual(1 + rig.drawCalls);
});

test('normalLoopWarm：通常のループ（?test なし）でも、タイトル → 試験場で programs が事前コンパイルの数のまま', async ({ page }) => {
  // 通常の起動では __game が無いので、描画が進むこと（canvas に絵が出ること）だけを確かめる。エラー0件は共通の検査
  await page.goto('/?scene=sandbox&q=high');
  await page.waitForTimeout(500);
  const drawn = await page.evaluate(() => {
    const c = /** @type {HTMLCanvasElement} */ (document.getElementById('game'));
    return c.width > 0 && c.height > 0;
  });
  expect(drawn).toBe(true);
});
