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
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
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
  const file = join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`${file}  calls=${info.calls} tris=${info.triangles} q=${info.quality}`);
  if (errors.length) console.log(`console:\n${errors.slice(0, 12).join('\n')}`);
  // 比較画像（左＝参考画像、右＝今回）
  if (existsSync(REF) && !cam && !walk) {
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
  }
} finally {
  await browser.close();
}
