// 数値表示（?debug=1。09 10.1）。右上に FPS（直近の中央値 ms）・描画命令・三角形数・tick・敵数。
// 判定表示のトグル（debugDraw）は、判定を作るM（M2a 以降）で足す。

/** @param {any} game boot の入れ物 */
export function createOverlay(game) {
  const el = document.createElement('div');
  el.id = 'debug-overlay';
  el.style.cssText = [
    'position:fixed', 'top:max(4px, env(safe-area-inset-top))', 'right:max(4px, env(safe-area-inset-right))',
    'z-index:50', 'padding:4px 8px', 'font:12px/1.35 ui-monospace,Menlo,Consolas,monospace',
    'color:rgb(245,240,225)', 'background:rgba(20,20,24,0.78)', 'border-radius:4px',
    'white-space:pre', 'pointer-events:none', 'text-align:right',
  ].join(';');
  document.body.appendChild(el);

  /** @type {number[]} rAF の時刻（直近 fpsWindowS ぶん） */
  const stamps = [];
  let lastText = -Infinity;

  function medianFrameMs() {
    if (stamps.length < 2) return null;
    const d = [];
    for (let i = 1; i < stamps.length; i++) d.push(stamps[i] - stamps[i - 1]);
    d.sort((a, b) => a - b);
    return d[Math.floor(d.length / 2)];
  }

  return {
    el,
    /**
     * 1描画ごとに呼ぶ。試験モード（ループなし）は nowMs=null で呼ぶ（FPS は出せないので「—」）。
     * @param {number|null} nowMs
     */
    update(nowMs) {
      const w = game.world;
      if (!w) return;
      el.dataset.tick = String(w.tick);
      if (nowMs !== null) {
        stamps.push(nowMs);
        const windowMs = game.cfg.debug.fpsWindowS * 1000;
        while (stamps.length > 2 && nowMs - stamps[0] > windowMs) stamps.shift();
        if (nowMs - lastText < game.cfg.debug.overlayRefreshS * 1000) return;
        lastText = nowMs;
      }
      const ms = nowMs === null ? null : medianFrameMs();
      const info = game.renderer.info();
      const fps = ms ? `${(1000 / ms).toFixed(0)} fps（${ms.toFixed(1)} ms）` : '— fps';
      el.textContent = [
        fps,
        `描画命令 ${info.calls}　三角形 ${info.triangles}`,
        `tick ${w.tick}　敵 ${w.entities.length - 1}`,
        `品質 ${info.quality}　DPR ${info.pixelRatio}${game.paused ? '　一時停止' : ''}`,
      ].join('\n');
    },
  };
}
