// キーボード入力（PCデバッグ用）。キーの割当は 01 2.12 の表が正本。e.code を使い、e.repeat は無視する。
// DOM に触るのは attach だけ。それ以外は純粋な状態機械なので Node のテストから直接使える。
// 符の構え中のキー（1〜5・Enter・Esc）は、符を作る M2.5 で足す。
/** @import {InputFrame, BtnId} from '../data/types.js' */
import { BTN_IDS, makeFrame } from './synthetic.js';

/** キー → ボタン（01 2.12）。 @type {Record<string, BtnId>} */
const KEY_TO_BTN = {
  KeyJ: 'attack',
  KeyK: 'dodge',
  Space: 'jump',
  KeyL: 'ougi',
  KeyU: 'kekkai',
  KeyI: 'fu',
  KeyO: 'focus',
};
const PAUSE_KEYS = ['KeyP', 'Escape'];
/** ゲームが使うキー（ブラウザの既定動作＝スクロールなどを止める対象）。 */
const GAME_KEYS = new Set([
  ...Object.keys(KEY_TO_BTN),
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyQ', 'KeyE', 'Backspace',
]);

/**
 * @param {{keyCamDegPs:number, kbWalkMul:number}} inputCfg
 * @param {number} tickRateHz
 * @param {{onPause?:()=>void}} [opts]
 */
export function createKeyboard(inputCfg, tickRateHz, opts = {}) {
  /** @type {Set<string>} */
  const keys = new Set();
  /** ボタンごとの状態（09 5.3 の collector と同じ規則：押下は必ず1tick見える） */
  /** @type {Record<string, {downNow:boolean, pressLatched:boolean, pendingRelease:boolean, lastDown:boolean}>} */
  const btn = {};
  for (const id of BTN_IDS) btn[id] = { downNow: false, pressLatched: false, pendingRelease: false, lastDown: false };
  let flickLatched = 0;
  let ougiOutLatched = false;
  let ougiSuppressed = false; // L を押したまま K／Backspace：L を離すまで奥義は押していない扱い

  function onKeyDown(code, repeat = false) {
    if (repeat || keys.has(code)) return;
    keys.add(code);
    const id = KEY_TO_BTN[code];
    if (id) {
      if (id === 'ougi') ougiSuppressed = false;
      // L を押したまま K は滑らせと同じ（ougiOut 1tick＋dodge.pressed。09 5.3）
      if (id === 'dodge' && btn.ougi.downNow && !ougiSuppressed) {
        ougiSuppressed = true;
        ougiOutLatched = true;
      }
      btn[id].downNow = true;
      btn[id].pressLatched = true;
    } else if (code === 'Backspace') {
      // 奥義の取消のみ（そのtickの ougiOut=true）
      if (btn.ougi.downNow && !ougiSuppressed) ougiSuppressed = true;
      ougiOutLatched = true;
    } else if (code === 'KeyQ') {
      flickLatched = -1;
    } else if (code === 'KeyE') {
      flickLatched = 1;
    } else if (PAUSE_KEYS.includes(code)) {
      opts.onPause?.();
    }
  }

  function onKeyUp(code) {
    keys.delete(code);
    const id = KEY_TO_BTN[code];
    if (id) btn[id].downNow = false;
  }

  /** 全キーを離したことにする（blur など）。 */
  function reset() {
    keys.clear();
    for (const id of BTN_IDS) btn[id].downNow = false;
    flickLatched = 0;
  }

  /** @returns {[number,number]} W A S D（斜めは正規化）。Shift で ×kbWalkMul */
  function stick() {
    let x = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    let y = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
    const m = Math.hypot(x, y);
    if (m > 1) {
      x /= m;
      y /= m;
    }
    const mul = keys.has('ShiftLeft') || keys.has('ShiftRight') ? inputCfg.kbWalkMul : 1;
    return [x * mul, y * mul];
  }

  /** @returns {[number,number]} 矢印キーの1tickぶんの回転量 [yaw 右+, pitch 上+] */
  function camDeg() {
    const per = inputCfg.keyCamDegPs / tickRateHz;
    const yaw = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
    const pitch = (keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0);
    return [yaw * per, pitch * per];
  }

  /**
   * このtickの InputFrame を作る（1描画で n tick 進むとき n 回呼ぶ）。
   * @param {number} tick @param {[number,number]} [viewPx] @returns {InputFrame}
   */
  function build(tick, viewPx) {
    /** @type {any} */
    const out = {};
    for (const id of BTN_IDS) {
      const b = btn[id];
      const physDown = b.downNow && !(id === 'ougi' && ougiSuppressed);
      let down = physDown;
      let pressed = false;
      let released = false;
      if (id === 'ougi' && ougiSuppressed) {
        // 奥義でなくなった：down=false にするが released は出さない
        b.pressLatched = false;
        b.pendingRelease = false;
      } else if (b.pressLatched) {
        pressed = true;
        b.pressLatched = false;
        if (!physDown) {
          // 同じ区間で押して離した短いタップ：このtickは down、次のtickで released
          down = true;
          b.pendingRelease = true;
        }
      } else if (b.pendingRelease) {
        down = false;
        released = true;
        b.pendingRelease = false;
      } else {
        released = b.lastDown && !down;
      }
      b.lastDown = down;
      out[id] = { down, pressed, released, ageF: 0 };
    }
    const frame = makeFrame(tick, {
      stick: stick(),
      camDeg: camDeg(),
      camHeld: keys.has('ArrowLeft') || keys.has('ArrowRight') || keys.has('ArrowUp') || keys.has('ArrowDown'),
      btn: out,
      ougiOut: ougiOutLatched,
      flick: /** @type {-1|0|1} */ (flickLatched),
      viewPx,
    });
    ougiOutLatched = false;
    flickLatched = 0;
    return frame;
  }

  /**
   * DOM のキーイベントにつなぐ。
   * @param {Window} target @returns {()=>void} 外す関数
   */
  function attach(target) {
    const kd = (/** @type {KeyboardEvent} */ e) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      onKeyDown(e.code, e.repeat);
    };
    const ku = (/** @type {KeyboardEvent} */ e) => onKeyUp(e.code);
    const bl = () => reset();
    target.addEventListener('keydown', kd);
    target.addEventListener('keyup', ku);
    target.addEventListener('blur', bl);
    return () => {
      target.removeEventListener('keydown', kd);
      target.removeEventListener('keyup', ku);
      target.removeEventListener('blur', bl);
    };
  }

  return { onKeyDown, onKeyUp, reset, build, attach };
}
