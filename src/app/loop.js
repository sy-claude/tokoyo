// ゲームループ（09 4.1）。60Hz の固定更新。1描画で進める tick は最大5（それ以上は捨てて遅延を許す）。
// requestAnimationFrame につなぐのは boot。ここは時刻を引数で受け取るので Node のテストから直接使える。

/**
 * @param {Object} o
 * @param {{tickRateHz:number, maxTicksPerFrameCount:number, frameDeltaClampS:number}} o.timeCfg
 * @param {(nowMs:number)=>void} o.tick    1tick 進める（入力を作ってシムを呼ぶ）
 * @param {()=>void} o.flush               溜めたイベントを配送する（tick 単位でまとめて）
 * @param {(alpha:number, nowMs:number)=>void} o.render  補間 alpha で描く
 */
export function createLoop(o) {
  const MS_PER_S = 1000;
  let last = null;
  let acc = 0;
  let paused = false;
  /** @type {string|null} */
  let pauseReason = null;

  return {
    get paused() {
      return paused;
    },
    get pauseReason() {
      return pauseReason;
    },
    /** @param {boolean} on @param {string} [reason] */
    setPaused(on, reason) {
      paused = on;
      pauseReason = on ? (reason ?? 'user') : null;
    },
    /**
     * 1描画ぶん進める。
     * @param {number} nowMs @param {boolean} [hidden] 画面が見えていない
     * @returns {number} 進めた tick の数
     */
    onFrame(nowMs, hidden = false) {
      const stepMs = MS_PER_S / o.timeCfg.tickRateHz;
      if (paused || hidden || last === null) {
        // 一時停止中はシムを呼ばない。描画は最後の状態のまま続ける
        last = nowMs;
        acc = 0;
        o.render(1, nowMs);
        return 0;
      }
      acc += Math.min(nowMs - last, o.timeCfg.frameDeltaClampS * MS_PER_S);
      last = nowMs;
      let n = Math.floor(acc / stepMs);
      if (n > o.timeCfg.maxTicksPerFrameCount) {
        n = o.timeCfg.maxTicksPerFrameCount;
        acc %= stepMs; // 遅れは捨てる
      } else {
        acc -= n * stepMs;
      }
      for (let i = 0; i < n; i++) o.tick(nowMs);
      o.flush();
      o.render(acc / stepMs, nowMs);
      return n;
    },
  };
}
