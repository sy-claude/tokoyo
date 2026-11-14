// 一時停止メニュー（01 5.6）。M0b は「続ける」「タイトルへ」の2つだけ。背後のゲーム画面は静止（描画は止めない）。
import { PCT } from '../../core/units.js';
import { createItem, createMenuShell } from './common.js';

/**
 * @param {Document} doc @param {HTMLElement} parent
 * @param {import('../../config/index.js').Cfg} cfg
 * @param {{onResume:()=>void, onTitle:()=>void}} hooks
 */
export function createPauseMenu(doc, parent, cfg, hooks) {
  const u = cfg.ui;
  const shell = createMenuShell(doc, parent, 'pause-menu', cfg);
  const el = shell.el;
  el.style.gap = `${u.menuItemGapPx}px`;
  // 背後を少し暗くする（墨の地の不透明度の半分）
  el.style.background = `color-mix(in srgb, var(--ink) ${Math.round((u.uiInkGroundOpacityRatio * PCT) / 2)}%, transparent)`;
  const head = doc.createElement('div');
  head.className = 'tk-text';
  head.textContent = '一時停止';
  head.style.cssText = `font-size:var(--tk-font-px);margin-bottom:${u.menuItemGapPx}px;`;
  const ready = () => shell.ready();
  const resume = createItem(doc, '続ける', u.menuItemWPx, u.menuItemHPx, ready, hooks.onResume);
  resume.id = 'pause-resume';
  const title = createItem(doc, 'タイトルへ', u.menuItemWPx, u.menuItemHPx, ready, hooks.onTitle);
  title.id = 'pause-title';
  el.append(head, resume, title);
  return shell;
}
