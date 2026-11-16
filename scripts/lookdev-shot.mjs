// 見た目の試作（?scene=lookdev）を撮る。参考画像と同じ 16:9 で撮り、左右に並べた比較画像も作る。
// 使い方：node scripts/lookdev-shot.mjs [出力名] [--q=high|mid|low] [--url=http://localhost:4173/] [--cam=yaw,pitch] [--w=1672 --h=941]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=').slice(1).join('=');
const name = args.find((a) => !a.startsWith('--')) ?? 'shot';
const q = opt('q', 'high');
const url = opt('url', 'http://localhost:4173/');
const W = Number(opt('w', 1672));
const H = Number(opt('h', 941));
const cam = opt('cam', '');
const walk = Number(opt('walk', 0));
const OUT = opt('out', 'tests/artifacts/lookdev');
const REF = 'design-notes/lookdev/reference.png';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: Number(opt('dpr', 1)) });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(`${url}?test=1&scene=lookdev&q=${q}`);
  await page.waitForFunction(() => Boolean(window.__game));
  await page.evaluate(() => window.__game.ready);
  await page.addStyleTag({ content: '#hud,#input,#menus{display:none !important}' });
  await page.evaluate(([cam, walk]) => {
    const g = window.__game;
    if (cam) { const [yaw, pitch] = cam.split(',').map(Number); g.setInput({ camDeg: [yaw, pitch] }); g.step(1); g.setInput({ camDeg: [0, 0] }); }
    if (walk) { g.setInput({ stick: [0, 1] }); g.step(walk); }
    g.step(40);
    g.render();
  }, [cam, walk]);
  const info = await page.evaluate(() => window.__game.renderInfo());
  const clip = opt('clip', '');
  const file = join(OUT, `${name}.png`);
  if (clip) { const [x, y, w, h] = clip.split(',').map(Number); await page.screenshot({ path: file, clip: { x, y, width: w, height: h } }); } else await page.screenshot({ path: file });
  console.log(`${file}  calls=${info.calls} tris=${info.triangles} q=${info.quality}`);
  if (errors.length) console.log(`console:\n${errors.slice(0, 12).join('\n')}`);
  // 比較画像（左＝参考画像、右＝今回）
  if (existsSync(REF) && !cam && !walk && !clip) {
    const toUrl = (p) => `data:image/png;base64,${readFileSync(p).toString('base64')}`;
    const cmp = await page.evaluate(async ([a, b]) => {
      const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); return i; };
      const [ia, ib] = [await load(a), await load(b)];
      const w = 1000, h = Math.round((w * ia.height) / ia.width), gap = 8;
      const c = document.createElement('canvas');
      c.width = w * 2 + gap; c.height = h;
      const x = c.getContext('2d');
      x.fillStyle = '#222'; x.fillRect(0, 0, c.width, c.height);
      x.imageSmoothingQuality = 'high';
      x.drawImage(ia, 0, 0, w, h);
      x.drawImage(ib, w + gap, 0, w, h);
      return c.toDataURL('image/png');
    }, [toUrl(REF), toUrl(file)]);
    writeFileSync(join(OUT, `${name}_compare.png`), Buffer.from(cmp.split(',')[1], 'base64'));
    // 計測：画面を 8×4 に分け、参考との差（明るさ L・彩度 S・D＝明暗の細かさ。太い線や紙の目も数えるので、描き込みの量の指標ではない。docs/12 3章）を出す
    const m = await page.evaluate(async ([a, b]) => {
      const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); return i; };
      const W = 640, H = 360, GX = 8, GY = 4;
      const stat = async (src) => {
        const img = await load(src);
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, W, H);
        const d = x.getImageData(0, 0, W, H).data;
        const lum = new Float32Array(W * H);
        const cells = [];
        for (let i = 0; i < GX * GY; i++) cells.push({ r: 0, g: 0, b: 0, s: 0, det: 0, n: 0 });
        for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
          const k = (y * W + xx) * 4; const r = d[k], g = d[k + 1], bl = d[k + 2];
          lum[y * W + xx] = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
          const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
          const ce = cells[Math.floor(y / (H / GY)) * GX + Math.floor(xx / (W / GX))];
          ce.r += r; ce.g += g; ce.b += bl; ce.s += mx > 0 ? (mx - mn) / mx : 0; ce.n += 1;
        }
        for (let y = 1; y < H - 1; y++) for (let xx = 1; xx < W - 1; xx++) {
          const gx = lum[y * W + xx + 1] - lum[y * W + xx - 1], gy = lum[(y + 1) * W + xx] - lum[(y - 1) * W + xx];
          cells[Math.floor(y / (H / GY)) * GX + Math.floor(xx / (W / GX))].det += Math.hypot(gx, gy);
        }
        return cells.map((ce) => ({ r: ce.r / ce.n, g: ce.g / ce.n, b: ce.b / ce.n, s: ce.s / ce.n, det: ce.det / ce.n }));
      };
      const [A, B] = [await stat(a), await stat(b)];
      const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
      const L = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
      const rows = []; let eL = 0, eC = 0, dA = 0, dB = 0;
      for (let j = 0; j < GY; j++) {
        const row = [];
        for (let i = 0; i < GX; i++) {
          const ca = A[j * GX + i], cb = B[j * GX + i];
          row.push(`${hex(ca)}>${hex(cb)} L${Math.round(L(cb) - L(ca))} S${Math.round((cb.s - ca.s) * 100)} D${(cb.det / ca.det).toFixed(2)}`);
          eL += Math.abs(L(cb) - L(ca)); eC += Math.hypot(ca.r - cb.r, ca.g - cb.g, ca.b - cb.b); dA += ca.det; dB += cb.det;
        }
        rows.push(row.join(' | '));
      }
      const n = GX * GY;
      return { rows, summary: `色の差 平均 ${(eC / n).toFixed(1)} / 明るさの差 平均 ${(eL / n).toFixed(1)} / 明暗の細かさ 参考比 ${(dB / dA).toFixed(2)}（描き込みの量ではない。進み具合の根拠にしない）` };
    }, [toUrl(REF), toUrl(file)]);
    if (args.includes('--grid')) console.log(m.rows.join('\n'));
    console.log(`計測：${m.summary}`);
  }
} finally {
  await browser.close();
}
