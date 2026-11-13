// e2e の共通部品（09 11.3）。boot で ?test=1 の画面を開き、__game.ready を待つ。
// console の error と pageerror を集め、各テストの終わりに0件を強制する。
import { test as base, expect } from '@playwright/test';
import { buildConfig } from '../../../src/core/config.js';
import { configTables } from '../../../src/config/index.js';

export { expect };

/** 期待値を config から計算するための設定（既定値）。 */
export const cfg = buildConfig(configTables);

export const test = base.extend({
  /** @type {any} ページで出たエラーの一覧（自動で集める） */
  pageErrors: [
    async ({ page }, use) => {
      /** @type {string[]} */
      const errors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
      });
      page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
      await use(errors);
      expect(errors, 'コンソールのエラーは0件').toEqual([]);
    },
    { auto: true },
  ],
});

/**
 * 試験モードで開いて、準備ができるまで待つ。
 * @param {import('@playwright/test').Page} page
 * @param {{scene?:string, seed?:number, char?:string, q?:string, extra?:string}} [o]
 */
export async function boot(page, o = {}) {
  const { scene = 'sandbox', seed = 1, char = 'fuma', q = 'high', extra = '' } = o;
  await page.goto(`/?test=1&seed=${seed}&scene=${scene}&char=${char}&q=${q}${extra}`);
  await page.waitForFunction(() => Boolean(/** @type {any} */ (window).__game));
  await page.evaluate(() => /** @type {any} */ (window).__game.ready);
}

/** __game の関数を呼んで結果を受け取る。 */
export function game(page, method, ...args) {
  return page.evaluate(([m, a]) => /** @type {any} */ (window).__game[m](...a), [method, args]);
}
