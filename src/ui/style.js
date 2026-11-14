// UI の共通の見た目（07 9章）。色は config/palette、大きさは config/ui から CSS の変数にして1回だけ入れる。
// 外部フォントは使わない。文字は明朝の太字、墨縁は paint-order:stroke。
import { PCT } from '../core/units.js';

const FONT = '"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif JP","Noto Serif CJK JP",serif';

/**
 * @param {Document} doc
 * @param {import('../config/index.js').Cfg} cfg
 */
export function installUiStyle(doc, cfg) {
  if (doc.getElementById('tk-ui-style')) return;
  const p = cfg.palette;
  const u = cfg.ui;
  const groundPct = Math.round(u.uiInkGroundOpacityRatio * PCT);
  const style = doc.createElement('style');
  style.id = 'tk-ui-style';
  style.textContent = `
:root { --ink:${p.ink}; --paper:${p.paper}; --paperWhite:${p.paperWhite}; --shu:${p.shuInfo}; --inkGray:${p.inkGray};
  --tk-font:${FONT}; --tk-font-px:${u.uiFontPx}px; --tk-edge-px:${u.uiInkEdgePx}px; --tk-wipe-s:${u.sceneWipeS}s;
  --tk-ground:color-mix(in srgb, var(--ink) ${groundPct}%, transparent); }
.tk-text { font-family:var(--tk-font); font-weight:bold; color:var(--paperWhite);
  -webkit-text-stroke:var(--tk-edge-px) var(--ink); paint-order:stroke fill; }
.tk-ground { background:var(--tk-ground);
  clip-path:polygon(1% 10%, 22% 2%, 50% 0%, 78% 3%, 99% 0%, 100% 45%, 98% 92%, 74% 100%, 48% 97%, 20% 100%, 0% 94%, 2% 48%); }
.tk-menu { position:absolute; inset:0; z-index:30; display:none; flex-direction:column; align-items:center; justify-content:center;
  font-family:var(--tk-font); font-weight:bold; pointer-events:auto; touch-action:none; }
.tk-menu.on { display:flex; animation:tk-wipe var(--tk-wipe-s) ease-out both; }
@keyframes tk-wipe { from { clip-path:inset(0 100% 0 0); } to { clip-path:inset(0 0 0 0); } }
.tk-item { display:flex; align-items:center; justify-content:center; box-sizing:border-box; border:0; padding:0; margin:0;
  font:inherit; font-size:var(--tk-font-px); cursor:pointer; touch-action:none; }
.tk-item:active { filter:brightness(1.4); }
.tk-item[aria-pressed="true"] { box-shadow:inset 0 0 0 3px var(--shu); text-decoration:underline; }
`;
  doc.head.appendChild(style);
}
