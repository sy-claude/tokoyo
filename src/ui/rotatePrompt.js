// 縦向き案内（01 5.2）と、画面の高さが足りないときの案内（01 1.7 の4）。全画面・紙の地・z=40。
// 疑似横画面（CSS 回転）は作らない。

/** 横向きに回る端末の図（線画）。 */
const PHONE_SVG = `<svg viewBox="0 0 120 80" width="168" height="112" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <rect x="14" y="10" width="26" height="48" rx="4"/>
  <rect x="62" y="34" width="48" height="26" rx="4"/>
  <path d="M38 6 C 60 2, 78 10, 84 26"/><path d="M78 22 L 84 27 L 88 20"/>
</svg>`;

/**
 * @param {Document} doc
 * @param {HTMLElement} parent  body
 * @param {boolean} ios
 */
export function createRotatePrompt(doc, parent, ios) {
  const el = doc.createElement('div');
  el.id = 'rotate-prompt';
  el.setAttribute('role', 'dialog');
  el.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:40', 'display:none', 'flex-direction:column', 'align-items:center',
    'justify-content:center', 'gap:16px', 'padding:24px', 'box-sizing:border-box', 'background:var(--paper)',
    'color:var(--ink)', 'font-family:var(--tk-font)', 'font-weight:bold', 'text-align:center', 'pointer-events:auto',
  ].join(';');
  const fig = doc.createElement('div');
  fig.innerHTML = PHONE_SVG;
  const title = doc.createElement('div');
  title.style.cssText = 'font-size:22px;';
  const note = doc.createElement('div');
  note.style.cssText = 'font-size:var(--tk-font-px);line-height:1.6;max-width:30em;';
  el.append(fig, title, note);
  parent.appendChild(el);

  const ROTATE_NOTE = ios
    ? '回らないとき：画面の右上から下へなでてコントロールセンターを開き、『画面縦向きのロック』（鍵と丸い矢印）を切ってください'
    : '回らないとき：クイック設定の『自動回転』をオンにしてください';

  /** @type {'rotate'|'height'|null} */
  let mode = null;
  return {
    el,
    /** @param {'rotate'|'height'|null} m */
    show(m) {
      if (m === mode) return;
      mode = m;
      if (!m) {
        el.style.display = 'none';
        return;
      }
      fig.style.display = m === 'rotate' ? 'block' : 'none';
      title.textContent = m === 'rotate' ? '横向きにしてください' : '画面の高さが足りません';
      note.textContent = m === 'rotate' ? ROTATE_NOTE : 'ブラウザのツールバーを隠すか、端末を横向きにしてください';
      el.style.display = 'flex';
    },
    get mode() {
      return mode;
    },
  };
}
