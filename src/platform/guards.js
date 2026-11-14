// ブラウザ対策（01 8章）。イベントの抑止・戻るの番兵・ページの表示と非表示・全画面と向き・保存の保護。
// 何をするか（一時停止を開く・保存する）は呼ぶ側（app/boot）が hooks で決める。失敗はすべて握りつぶす。

const GUARD_STATE = 'guard';

/** iOS か（01 5.2：/iP(hone|ad|od)/ または Mac＋タッチ）。 @param {any} [nav] */
export function isIOS(nav = globalThis.navigator) {
  const ua = nav?.userAgent ?? '';
  return /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && (nav?.maxTouchPoints ?? 0) > 1);
}

/** 選択や拡大を許す場所（引き継ぎ欄・調整パネル）か。 @param {EventTarget|null} t */
function allowsNative(t) {
  const el = /** @type {any} */ (t);
  if (!el || typeof el.closest !== 'function') return false;
  return Boolean(el.closest('input, textarea, [data-allow-native]'));
}

/**
 * 01 8.2 の抑止と、8.3〜8.4 の出来事の受け口を document と window に付ける。
 * @param {Window} win @param {Document} doc
 * @param {{onBack?:()=>void, onHidden?:(reason:string)=>void, onVisible?:()=>void, onBlur?:()=>void,
 *   onPageShow?:(persisted:boolean)=>void, onFullscreenChange?:(on:boolean)=>void}} hooks
 */
export function installGuards(win, doc, hooks) {
  const prevent = (/** @type {Event} */ e) => {
    if (!allowsNative(e.target)) e.preventDefault();
  };
  for (const name of ['contextmenu', 'selectstart', 'dragstart', 'dblclick', 'gesturestart', 'gesturechange', 'gestureend']) {
    doc.addEventListener(name, prevent);
  }
  // ピンチ・引っ張り更新の保険。調整パネルの中だけは指でスクロールできるようにする
  doc.addEventListener('touchmove', prevent, { passive: false });
  // PC の拡大防止
  doc.addEventListener('wheel', (e) => {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });

  win.addEventListener('popstate', () => hooks.onBack?.());
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'hidden') hooks.onHidden?.('hidden');
    else hooks.onVisible?.();
  });
  win.addEventListener('pagehide', () => hooks.onHidden?.('pagehide'));
  win.addEventListener('pageshow', (e) => hooks.onPageShow?.(/** @type {PageTransitionEvent} */ (e).persisted));
  win.addEventListener('blur', () => hooks.onBlur?.());
  doc.addEventListener('fullscreenchange', () => hooks.onFullscreenChange?.(Boolean(doc.fullscreenElement)));
}

/** 戻るの番兵を積む（01 8.3）。 @param {History} [h] */
export function pushGuard(h = globalThis.history) {
  try {
    h.pushState({ tokoyo: GUARD_STATE }, '');
  } catch {
    // 積めなくても続ける
  }
}

/** 番兵を積まずに1つ戻る（ページを離れる）。 @param {History} [h] */
export function leaveByBack(h = globalThis.history) {
  try {
    h.back();
  } catch {
    // 戻れなくても続ける
  }
}

/** Android の全画面と横向きロック（01 8.6）。iOS では何もしない。 @param {Document} doc @param {any} [nav] */
export function requestFullscreenLandscape(doc, nav = globalThis.navigator) {
  if (isIOS(nav) || !doc.fullscreenEnabled) return;
  try {
    doc.documentElement
      .requestFullscreen({ navigationUI: 'hide' })
      .then(() => /** @type {any} */ (globalThis.screen)?.orientation?.lock?.('landscape'))
      .catch(() => {});
  } catch {
    // 全画面にできなくても続ける
  }
}

/** 保存の保護（01 8.7）。結果は設定のデータ欄（M10a）が使う。 @param {any} [nav] @returns {Promise<boolean|null>} */
export function persistStorage(nav = globalThis.navigator) {
  try {
    const p = nav?.storage?.persist?.();
    return p ? p.then((v) => Boolean(v)).catch(() => null) : Promise.resolve(null);
  } catch {
    return Promise.resolve(null);
  }
}
