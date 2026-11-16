// 工房（docs/12 4章）の撮影：1つの形を決まった6視点で撮り、1枚の一覧にする。
// 使い方：node scripts/atelier-shot.mjs <形の名前> [--url=http://localhost:5199/] [--q=high] [--ref=参考画像のパス] [--focus=head など（寄り）] [--out=tests/artifacts/atelier]
// 参考画像（--ref）があれば一覧の左に並べる。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=').slice(1).join('=');
const model = args.find((a) => !a.startsWith('--')) ?? 'toriiMain';
const url = opt('url', 'http://localhost:5199/');
const q = opt('q', 'high');
const ref = opt('ref', '');
const focus = opt('focus', '');
const OUT = opt('out', 'tests/artifacts/atelier');
const W = 900, H = 700;
// 視点：[名前, 横の向き(度), 縦の向き(度)]。最後の2つは寄り（画面の一部を2倍で撮る）
const VIEWS = [['正面', 180, 0], ['背面', 0, 0], ['左', 90, 0], ['右', 270, 0], ['斜め上', 215, 22], ['見上げ', 150, -14]];
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(`${url}?test=1&scene=lookdev&q=${q}&model=${model}${focus ? `&focus=${focus}` : ''}`);
  await page.waitForFunction(() => Boolean(window.__game));
  await page.evaluate(() => window.__game.ready);
  await page.addStyleTag({ content: '#hud,#input,#menus{display:none !important}' });
  const start = await page.evaluate(() => { const c = window.__game.getState().camera; return [c.yawDeg, c.pitchDeg]; });
  let [yaw, pitch] = start;
  const shots = [];
  for (const [name, y, p] of VIEWS) {
    await page.evaluate(([dy, dp]) => {
      const g = window.__game;
      g.setInput({ camDeg: [dy, dp] }); g.step(1); g.setInput({ camDeg: [0, 0] }); g.step(2); g.render();
    }, [y - yaw, p - pitch]);
    const now = await page.evaluate(() => { const c = window.__game.getState().camera; return [c.yawDeg, c.pitchDeg]; });
    [yaw, pitch] = now;
    const buf = await page.screenshot();
    shots.push({ name, data: `data:image/png;base64,${buf.toString('base64')}` });
  }
  const info = await page.evaluate(() => window.__game.renderInfo());
  const refUrl = ref && existsSync(ref) ? `data:image/png;base64,${readFileSync(ref).toString('base64')}` : '';
  const sheet = await page.evaluate(async ([shots, refUrl, W, H]) => {
    const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); return i; };
    const cols = 3, rows = 2, cw = W, ch = H;
    const refW = refUrl ? Math.round(cw * 1.2) : 0;
    const c = document.createElement('canvas');
    c.width = refW + cw * cols; c.height = ch * rows;
    const x = c.getContext('2d');
    x.fillStyle = '#222'; x.fillRect(0, 0, c.width, c.height);
    if (refUrl) {
      const r = await load(refUrl);
      const k = Math.min(refW / r.width, c.height / r.height);
      x.drawImage(r, 0, 0, r.width * k, r.height * k);
    }
    x.font = '28px sans-serif'; x.textBaseline = 'top';
    for (let i = 0; i < shots.length; i++) {
      const im = await load(shots[i].data);
      const px = refW + (i % cols) * cw, py = Math.floor(i / cols) * ch;
      x.drawImage(im, px, py, cw, ch);
      x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(px + 8, py + 8, 120, 40);
      x.fillStyle = '#fff'; x.fillText(shots[i].name, px + 16, py + 12);
    }
    return c.toDataURL('image/png');
  }, [shots, refUrl, W, H]);
  const file = join(OUT, `${model}${focus ? `_${focus}` : ''}.png`);
  writeFileSync(file, Buffer.from(sheet.split(',')[1], 'base64'));
  console.log(`${file}  calls=${info.calls} tris=${info.triangles} q=${info.quality}`);
  if (errors.length) console.log(`console:\n${errors.slice(0, 12).join('\n')}`);
} finally {
  await browser.close();
}
