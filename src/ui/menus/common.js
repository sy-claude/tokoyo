// メニューの共通部品。画面切替の筆のワイプ（01 5.1：sceneWipeS）の間は押せない。
import { MS_PER_S } from '../../core/units.js';

/**
 * メニューの入れ物（.tk-menu）。show でワイプしながら出し、ワイプ中のタップは捨てる。
 * @param {Document} doc @param {HTMLElement} parent @param {string} id
 * @param {{ui:{sceneWipeS:number}}} cfg
 */
export function createMenuShell(doc, parent, id, cfg) {
  const el = doc.createElement('div');
  el.id = id;
  el.className = 'tk-menu';
  parent.appendChild(el);
  let lockedUntil = 0;
  let shown = false;
  return {
    el,
    get shown() {
      return shown;
    },
    show() {
      if (shown) return;
      shown = true;
      lockedUntil = globalThis.performance.now() + cfg.ui.sceneWipeS * MS_PER_S;
      el.classList.add('on');
    },
    hide() {
      shown = false;
      el.classList.remove('on');
    },
    /** タップを受けてよいか（表示中かつワイプが終わった）。 */
    ready() {
      return shown && globalThis.performance.now() >= lockedUntil;
    },
  };
}

/**
 * 押せる項目（墨の地に紙白の字）。
 * @param {Document} doc @param {string} label @param {number} wPx @param {number} hPx
 * @param {()=>boolean} ready @param {()=>void} onTap
 */
export function createItem(doc, label, wPx, hPx, ready, onTap) {
  const b = doc.createElement('button');
  b.type = 'button';
  b.className = 'tk-item tk-ground tk-text';
  b.textContent = label;
  b.style.width = `${wPx}px`;
  b.style.height = `${hPx}px`;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (ready()) onTap();
  });
  return b;
}
