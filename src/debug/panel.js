// 調整パネル（?debug=1。09 10.1）。config の全キーを画面で変えられる。
// 「JSONをコピー」は既定から変えたキーだけを出す。値は tokoyo:debug に保存し、次の ?debug=1 でも使う。
// 入力の記録（リプレイ JSON）と判定表示のトグルは、後のMで足す。
import { diffConfig, getConfigValue, resetConfig, setConfigValue } from '../core/config.js';

const CSS = `
#dbg-panel { position:fixed; right:max(4px, env(safe-area-inset-right)); top:calc(max(4px, env(safe-area-inset-top)) + 76px);
  z-index:51; width:min(320px, 46vw); font:12px/1.4 system-ui, sans-serif; color:rgb(245,240,225); }
#dbg-panel button { font:inherit; color:inherit; background:rgba(20,20,24,0.85); border:1px solid rgba(245,240,225,0.5);
  border-radius:4px; padding:4px 8px; }
#dbg-toggle { float:right; }
#dbg-body { clear:both; margin-top:4px; padding:6px; max-height:calc(100vh - 150px); overflow:auto;
  background:rgba(20,20,24,0.88); border-radius:4px; -webkit-overflow-scrolling:touch; touch-action:pan-y; }
#dbg-body[hidden] { display:none; }
#dbg-json { width:100%; box-sizing:border-box; height:44px; margin:4px 0; font:11px ui-monospace,Menlo,monospace;
  color:inherit; background:rgba(0,0,0,0.4); border:1px solid rgba(245,240,225,0.3); }
#dbg-panel details { margin-top:4px; }
#dbg-panel summary { cursor:pointer; padding:2px 0; font-weight:bold; }
.dbg-row { display:grid; grid-template-columns:1fr 64px; gap:2px 6px; align-items:center; padding:2px 0;
  border-top:1px solid rgba(245,240,225,0.12); }
.dbg-row label { overflow-wrap:anywhere; }
.dbg-row small { grid-column:1 / 3; opacity:0.7; }
.dbg-row input[type=range] { grid-column:1 / 3; width:100%; margin:0; }
.dbg-row input[type=number], .dbg-row input[type=text] { width:64px; box-sizing:border-box; font:inherit; }
.dbg-row.changed label { color:rgb(255,190,120); }
`;

/** @param {any} game boot の入れ物 */
export function createPanel(game) {
  const { cfg, tables, storage } = game;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'dbg-panel';
  root.innerHTML = `
    <button id="dbg-toggle" type="button">調整パネル</button>
    <div id="dbg-body" hidden>
      <button id="dbg-copy" type="button">JSONをコピー</button>
      <button id="dbg-reset" type="button">初期化</button>
      <textarea id="dbg-json" readonly aria-label="既定から変えたキー"></textarea>
      <div id="dbg-tables"></div>
    </div>`;
  root.dataset.allowNative = ''; // 指でスクロール・文字の選択をしてよい（platform/guards）
  document.body.appendChild(root);
  const body = /** @type {HTMLElement} */ (root.querySelector('#dbg-body'));
  const out = /** @type {HTMLTextAreaElement} */ (root.querySelector('#dbg-json'));
  const tablesEl = /** @type {HTMLElement} */ (root.querySelector('#dbg-tables'));
  /** @type {(()=>void)[]} 表示を cfg の値に合わせ直す関数 */
  const refreshers = [];

  function changedJson() {
    return JSON.stringify(diffConfig(cfg, tables));
  }
  function afterChange() {
    const diff = diffConfig(cfg, tables);
    if (Object.keys(diff).length === 0) storage.clearDebug(); // 既定と同じなら保存を残さない
    else storage.writeDebug(diff);
    out.value = changedJson();
    for (const f of refreshers) f();
    if (game.world) game.frame.render(game.world, 1);
  }

  /** 1つの値（数値・真偽・文字列）の行を作る。 */
  function addRow(parent, path, entry, defValue) {
    const row = document.createElement('div');
    row.className = 'dbg-row';
    row.dataset.path = path;
    const label = document.createElement('label');
    label.textContent = path.split('.').slice(1).join('.');
    row.appendChild(label);
    /** @type {HTMLInputElement} */
    const box = document.createElement('input');
    /** @type {HTMLInputElement|null} */
    let range = null;
    const set = (v) => {
      try {
        setConfigValue(cfg, tables, path, v);
      } catch (e) {
        console.warn(String(e));
      }
      afterChange();
    };
    if (typeof defValue === 'number') {
      box.type = 'number';
      if (entry.step !== undefined) box.step = String(entry.step);
      box.addEventListener('change', () => {
        const v = Number(box.value);
        if (Number.isFinite(v)) set(v);
      });
      if (entry.min !== undefined && entry.max !== undefined && entry.min < entry.max) {
        range = document.createElement('input');
        range.type = 'range';
        range.min = String(entry.min);
        range.max = String(entry.max);
        range.step = String(entry.step ?? 'any');
        const r = range;
        range.addEventListener('input', () => set(Number(r.value)));
      }
    } else if (typeof defValue === 'boolean') {
      box.type = 'checkbox';
      box.addEventListener('change', () => set(box.checked));
    } else {
      box.type = 'text';
      box.addEventListener('change', () => set(box.value));
    }
    row.appendChild(box);
    if (range) row.appendChild(range);
    const desc = document.createElement('small');
    desc.textContent = entry.desc;
    row.appendChild(desc);
    parent.appendChild(row);
    refreshers.push(() => {
      const v = getConfigValue(cfg, tables, path);
      if (box.type === 'checkbox') box.checked = Boolean(v);
      else if (document.activeElement !== box) box.value = String(v);
      if (range && document.activeElement !== range) range.value = String(v);
      row.classList.toggle('changed', v !== defValue);
    });
  }

  for (const [tableName, table] of Object.entries(tables)) {
    const det = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = tableName;
    det.appendChild(sum);
    for (const [key, entry] of Object.entries(/** @type {Record<string, any>} */ (table))) {
      const path = `${tableName}.${key}`;
      const v = entry.v;
      if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') {
        addRow(det, path, entry, v);
      } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        // 品質の3列（high／mid／low）など：中の数値を1つずつ
        for (const [sub, sv] of Object.entries(v)) {
          if (typeof sv === 'number' || typeof sv === 'boolean' || typeof sv === 'string') addRow(det, `${path}.${sub}`, entry, sv);
        }
      }
      // 配列の値はパネルでは変えない（JSON で貼る）
    }
    tablesEl.appendChild(det);
  }

  root.querySelector('#dbg-toggle')?.addEventListener('click', () => {
    body.hidden = !body.hidden;
  });
  root.querySelector('#dbg-copy')?.addEventListener('click', () => {
    out.value = changedJson();
    // クリップボードが使えない環境でも、上の欄から手でコピーできる
    globalThis.navigator.clipboard?.writeText(out.value).catch(() => {});
  });
  root.querySelector('#dbg-reset')?.addEventListener('click', () => {
    resetConfig(cfg, tables);
    afterChange();
  });

  out.value = changedJson();
  for (const f of refreshers) f();
  return { root };
}
