// 撮影の共通部品（10 §4.8）。render() してから撮り、tests/artifacts/shots/ に置く。
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const SHOTS_DIR = fileURLToPath(new URL('../../artifacts/shots/', import.meta.url));

/**
 * @param {import('@playwright/test').Page} page
 * @param {number} n 1〜8
 * @param {{render?:boolean}} [o] render=false なら __game.render() を呼ばない（通常ループの画面）
 */
export async function shot(page, n, o = {}) {
  mkdirSync(SHOTS_DIR, { recursive: true });
  if (o.render !== false) await page.evaluate(() => /** @type {any} */ (window).__game.render());
  await page.screenshot({ path: join(SHOTS_DIR, `${String(n).padStart(2, '0')}.png`) });
}
