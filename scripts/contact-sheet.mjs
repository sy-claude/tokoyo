// スクリーンショット8枚を 422×195 に縮めて 4×2 に並べ、sheet.png と白黒版 sheet_gray.png を作る（09 11.3）。
// 画像の処理は Playwright のページの canvas で行う（画像用の依存を足さないため）。
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const DIR = 'tests/artifacts';
const SHOTS = join(DIR, 'shots');
const CELL_W = 422;
const CELL_H = 195;
const COLS = 4;
const ROWS = 2;

const sources = [];
for (let i = 1; i <= COLS * ROWS; i++) {
  const p = join(SHOTS, `${String(i).padStart(2, '0')}.png`);
  sources.push(existsSync(p) ? `data:image/png;base64,${readFileSync(p).toString('base64')}` : null);
}
const found = sources.filter(Boolean).length;
if (found === 0) {
  console.error(`スクリーンショットがありません（${SHOTS}）。先に npm run shots を実行してください。`);
  process.exit(1);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async ({ sources, CELL_W, CELL_H, COLS, ROWS }) => {
    const canvas = document.createElement('canvas');
    canvas.width = CELL_W * COLS;
    canvas.height = CELL_H * ROWS;
    const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    ctx.fillStyle = 'rgb(40,40,44)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = 'high';
    for (let i = 0; i < sources.length; i++) {
      const x = (i % COLS) * CELL_W;
      const y = Math.floor(i / COLS) * CELL_H;
      const src = sources[i];
      if (src) {
        const img = new Image();
        img.src = src;
        await img.decode();
        // 縦横比を保って升に収める（視点の違う 6・7 も欠けずに入る）
        const s = Math.min(CELL_W / img.width, CELL_H / img.height);
        const w = img.width * s;
        const h = img.height * s;
        ctx.drawImage(img, x + (CELL_W - w) / 2, y + (CELL_H - h) / 2, w, h);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(x, y, 22, 20);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(src ? String(i + 1) : `${i + 1}×`, x + 5, y + 15);
    }
    const color = canvas.toDataURL('image/png');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = data.data;
    for (let i = 0; i < d.length; i += 4) {
      const yv = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      d[i] = yv;
      d[i + 1] = yv;
      d[i + 2] = yv;
    }
    ctx.putImageData(data, 0, 0);
    return { color, gray: canvas.toDataURL('image/png') };
  }, { sources, CELL_W, CELL_H, COLS, ROWS });
  const toBuf = (url) => Buffer.from(url.split(',')[1], 'base64');
  writeFileSync(join(DIR, 'sheet.png'), toBuf(result.color));
  writeFileSync(join(DIR, 'sheet_gray.png'), toBuf(result.gray));
  console.log(`縮小一覧を作りました：${DIR}/sheet.png・sheet_gray.png（${found}/${COLS * ROWS} 枚）`);
} finally {
  await browser.close();
}
