// タイトル（01 5.3）。中央に題字、下に「音を出して遊ぶ」「音なしで遊ぶ」、右下に小さく「設定」。
// 選んだタップの処理の中で（同じ操作内に）呼ぶ側が音の起動などを順に行う（onChoose は同期で呼ぶ）。
/** @import {Layout} from '../../input/layout.js' */
import { createItem, createMenuShell } from './common.js';

/** かすれ（07 9）：題字の静的な要素だけに付ける */
const KASURE_SVG = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="tk-kasure">
<feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" result="n"/>
<feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G"/></filter></svg>`;

/**
 * @param {Document} doc @param {HTMLElement} parent
 * @param {import('../../config/index.js').Cfg} cfg
 * @param {{onChoose:(soundOn:boolean)=>void, onSettings?:()=>void}} hooks
 */
export function createTitle(doc, parent, cfg, hooks) {
  const u = cfg.ui;
  const shell = createMenuShell(doc, parent, 'title', cfg);
  const el = shell.el;
  el.style.background = 'var(--paper)';
  el.style.color = 'var(--ink)';
  el.style.justifyContent = 'flex-start';
  el.insertAdjacentHTML('beforeend', KASURE_SVG);

  const glyph = doc.createElement('div');
  glyph.id = 'title-glyph';
  glyph.textContent = '常世祓';
  glyph.style.cssText = `position:absolute;left:0;right:0;text-align:center;font-size:${u.titleGlyphPx}px;letter-spacing:0.12em;filter:url(#tk-kasure);line-height:1;`;
  const sub = doc.createElement('div');
  sub.textContent = 'とこよばらい';
  sub.style.cssText = 'position:absolute;left:0;right:0;text-align:center;font-size:var(--tk-font-px);letter-spacing:0.5em;';

  const row = doc.createElement('div');
  row.style.cssText = `position:absolute;left:0;right:0;display:flex;justify-content:center;gap:${u.titleBtnGapPx}px;`;
  const ready = () => shell.ready();
  const play = createItem(doc, '音を出して遊ぶ', u.titleBtnWPx, u.titleBtnHPx, ready, () => hooks.onChoose(true));
  play.id = 'title-sound-on';
  const mute = createItem(doc, '音なしで遊ぶ', u.titleBtnWPx, u.titleBtnHPx, ready, () => hooks.onChoose(false));
  mute.id = 'title-sound-off';
  row.append(play, mute);

  const settings = doc.createElement('button');
  settings.type = 'button';
  settings.id = 'title-settings';
  settings.className = 'tk-item';
  settings.textContent = '設定';
  settings.style.cssText = 'position:absolute;background:none;color:var(--ink);text-decoration:underline;';
  settings.addEventListener('click', () => {
    if (ready()) hooks.onSettings?.();
  });
  el.append(glyph, sub, row, settings);

  return Object.assign(shell, {
    /** @param {Layout} L */
    layout(L) {
      const cy = L.viewH * u.titleBtnCyRatio;
      row.style.top = `${cy - u.titleBtnHPx / 2}px`;
      // 題字は上端とボタンの間の中央
      const glyphCy = (L.safeT + cy - u.titleBtnHPx / 2) / 2;
      glyph.style.top = `${glyphCy - u.titleGlyphPx / 2}px`;
      sub.style.top = `${glyphCy + u.titleGlyphPx / 2 + u.titleBtnGapPx / 2}px`;
      settings.style.right = `${L.viewW - L.safeR}px`;
      settings.style.bottom = `${L.viewH - L.safeB}px`;
      settings.style.height = `${u.menuItemHPx}px`;
    },
  });
}
