// 画面の消灯防止（01 8.5）。タイトルのタップで取り、表示に戻ったら（title 以外の画面なら）取り直す。失敗は無視。

/** @param {any} [nav] */
export function createWakeLock(nav = globalThis.navigator) {
  /** @type {any} */
  let sentinel = null;
  let wanted = false;

  function request() {
    wanted = true;
    try {
      const p = nav?.wakeLock?.request('screen');
      p?.then((s) => {
        sentinel = s;
      }).catch(() => {});
    } catch {
      // 使えない端末は何もしない
    }
  }

  return {
    request,
    /** visibilitychange で表示に戻ったとき。 @param {boolean} onTitle */
    reacquire(onTitle) {
      if (!wanted || onTitle) return;
      if (sentinel && !sentinel.released) return;
      request();
    },
  };
}
