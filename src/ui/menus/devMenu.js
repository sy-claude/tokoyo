// 試験メニュー（10 §4.4。開発用、config/debug.js の devMenuOn）。依頼者は URL を打ち替えずに全場面へ行ける。
// 項目はそのMで使えるものだけ表示する（M0b：試験場・数値表示・品質 高/中/低・タイトルへ）。
/** @import {QualityLevel} from '../../config/index.js' */
import { createItem, createMenuShell } from './common.js';

/** @type {[QualityLevel, string][]} */
const QUALITIES = [['high', '高'], ['mid', '中'], ['low', '低']];

/**
 * @param {Document} doc @param {HTMLElement} parent
 * @param {import('../../config/index.js').Cfg} cfg
 * @param {{onScene:(name:'sandbox')=>void, onOverlay:()=>boolean, onQuality:(q:QualityLevel)=>void,
 *   getQuality:()=>QualityLevel, getOverlay:()=>boolean, onTitle:()=>void}} hooks
 */
export function createDevMenu(doc, parent, cfg, hooks) {
  const u = cfg.ui;
  const shell = createMenuShell(doc, parent, 'dev-menu', cfg);
  const el = shell.el;
  el.style.background = 'var(--paper)';
  el.style.color = 'var(--ink)';
  el.style.gap = `${u.menuItemGapPx}px`;
  const ready = () => shell.ready();
  const W = u.devMenuItemWPx;
  const H = u.devMenuItemHPx;

  const head = doc.createElement('div');
  head.textContent = '試験メニュー';
  head.style.cssText = 'font-size:var(--tk-font-px);';

  const row = () => {
    const r = doc.createElement('div');
    r.style.cssText = `display:flex;flex-wrap:wrap;justify-content:center;gap:${u.menuItemGapPx}px;`;
    return r;
  };
  const r1 = row();
  const sandbox = createItem(doc, '試験場', W, H, ready, () => hooks.onScene('sandbox'));
  sandbox.dataset.item = 'sandbox';
  const overlay = createItem(doc, '数値表示', W, H, ready, () => {
    overlay.setAttribute('aria-pressed', String(hooks.onOverlay()));
  });
  overlay.dataset.item = 'overlay';
  r1.append(sandbox, overlay);

  const r2 = row();
  /** @type {HTMLButtonElement[]} */
  const qBtns = [];
  const refreshQuality = () => {
    for (const b of qBtns) b.setAttribute('aria-pressed', String(b.dataset.q === hooks.getQuality()));
  };
  for (const [q, label] of QUALITIES) {
    const b = createItem(doc, `品質：${label}`, (W * 2 - u.menuItemGapPx) / QUALITIES.length, H, ready, () => {
      hooks.onQuality(q);
      refreshQuality();
    });
    b.dataset.item = `quality-${q}`;
    b.dataset.q = q;
    qBtns.push(b);
    r2.appendChild(b);
  }
  const r3 = row();
  const toTitle = createItem(doc, 'タイトルへ', W, H, ready, hooks.onTitle);
  toTitle.dataset.item = 'title';
  r3.appendChild(toTitle);
  el.append(head, r1, r2, r3);

  const baseShow = shell.show;
  return Object.assign(shell, {
    show() {
      refreshQuality();
      overlay.setAttribute('aria-pressed', String(hooks.getOverlay()));
      baseShow();
    },
  });
}
