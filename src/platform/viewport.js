// visualViewport と safe-area（01 1.1・1.7）。100vh は使わない。高さは必ず visualViewport.height。
// 変化（visualViewport の resize/scroll、window の resize/orientationchange、縦向きの matchMedia）が来たら、
// 次の requestAnimationFrame で1回だけ onChange を呼ぶ。

/** @typedef {{W:number, H:number, offsetLeft:number, offsetTop:number, insets:{l:number, r:number, t:number, b:number}, portrait:boolean}} ViewportInfo */

/**
 * @param {Window} win
 * @param {HTMLElement} probe  `.safe-probe` の要素（padding が env(safe-area-inset-*)）
 * @param {(v:ViewportInfo)=>void} onChange
 */
export function createViewport(win, probe, onChange) {
  const vv = win.visualViewport;
  const mql = win.matchMedia('(orientation: portrait)');
  let scheduled = false;

  /** @returns {ViewportInfo} */
  function read() {
    const cs = win.getComputedStyle(probe);
    const n = (v) => Number.parseFloat(v) || 0;
    return {
      W: vv ? vv.width : win.innerWidth,
      H: vv ? vv.height : win.innerHeight,
      offsetLeft: vv ? vv.offsetLeft : 0,
      offsetTop: vv ? vv.offsetTop : 0,
      insets: { l: n(cs.paddingLeft), r: n(cs.paddingRight), t: n(cs.paddingTop), b: n(cs.paddingBottom) },
      portrait: mql.matches,
    };
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    win.requestAnimationFrame(() => {
      scheduled = false;
      onChange(read());
    });
  }

  vv?.addEventListener('resize', schedule);
  vv?.addEventListener('scroll', schedule);
  win.addEventListener('resize', schedule);
  win.addEventListener('orientationchange', schedule);
  mql.addEventListener?.('change', schedule);

  return { read, schedule };
}
