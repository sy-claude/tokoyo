// CDP の Input.dispatchTouchEvent で指を動かす（09 11.3）。座標は CSS px。ボタンの位置は __game.layout() から得る。
// pointer と touch の両イベントが発火する（入力層は Pointer Events だけを聞く）。

/**
 * @param {import('@playwright/test').Page} page
 */
export async function createTouch(page) {
  const cdp = await page.context().newCDPSession(page);
  /** @type {Map<number, {x:number, y:number}>} 押している指 */
  const fingers = new Map();
  const point = (id, p) => ({ x: p.x, y: p.y, id, radiusX: 8, radiusY: 8, force: 1 });
  const all = () => [...fingers].map(([id, p]) => point(id, p));
  const send = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  const step = (n) => page.evaluate((k) => /** @type {any} */ (window).__game.step(k), n);

  const api = {
    /** touchStart。touchPoints は押している全指＋新しい指 */
    async down(id, x, y) {
      fingers.set(id, { x, y });
      await send('touchStart', all());
    },
    /** touchMove。押している全指 */
    async move(id, x, y) {
      fingers.set(id, { x, y });
      await send('touchMove', all());
    },
    /** touchEnd。touchPoints は離す指だけ（残りの指は押したまま） */
    async up(id) {
      const p = fingers.get(id);
      if (!p) return;
      fingers.delete(id);
      await send('touchEnd', [point(id, p)]);
    },
    /** touchCancel。全指 */
    async cancel() {
      fingers.clear();
      await send('touchCancel', []);
    },
    /**
     * down → move×steps（毎回 __game.step(ticksPerStep)）→ up
     * @param {number} id @param {[number,number]} from @param {[number,number]} to
     * @param {{steps?:number, ticksPerStep?:number, keep?:boolean}} [o] keep=true なら離さない
     */
    async drag(id, from, to, o = {}) {
      const { steps = 8, ticksPerStep = 1, keep = false } = o;
      await api.down(id, from[0], from[1]);
      for (let i = 1; i <= steps; i++) {
        await api.move(id, from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps);
        await step(ticksPerStep);
      }
      if (!keep) await api.up(id);
    },
    /** 1点を軽く叩く（down → up）。メニューの DOM ボタン用 */
    async tap(x, y, id = 90) {
      await api.down(id, x, y);
      await api.up(id);
    },
    /** 要素の中心を叩く */
    async tapElement(locator) {
      const box = await locator.boundingBox();
      if (!box) throw new Error('要素が見えない');
      await api.tap(box.x + box.width / 2, box.y + box.height / 2);
    },
    /** ボタン中心で down → step(holdF) → up → step(1) */
    async tapButton(btnId, holdF = 1, id = 91) {
      const L = await page.evaluate(() => /** @type {any} */ (window).__game.layout());
      const b = L.buttons.find((x) => x.id === btnId);
      await api.down(id, b.x, b.y);
      await step(holdF);
      await api.up(id);
      await step(1);
    },
  };
  return api;
}

/**
 * ページの表示・非表示を偽装する（visibilitychange を発火）。
 * @param {import('@playwright/test').Page} page @param {boolean} hidden
 */
export async function setHidden(page, hidden) {
  await page.evaluate((h) => {
    Object.defineProperty(document, 'visibilityState', { value: h ? 'hidden' : 'visible', configurable: true });
    Object.defineProperty(document, 'hidden', { value: h, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}
