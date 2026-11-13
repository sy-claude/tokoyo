// 合成入力（09 5.5）。リプレイ・Node テスト・__game.setInput が使う。
/** @import {InputFrame, BtnId, BtnState} from '../data/types.js' */
import { input as inputTable } from '../config/input.js';

/** @type {BtnId[]} */
export const BTN_IDS = ['attack', 'dodge', 'jump', 'ougi', 'kekkai', 'fu', 'focus'];

/** @returns {BtnState} */
function neutralBtn() {
  return { down: false, pressed: false, released: false, ageF: 0 };
}

/** @returns {Record<BtnId,BtnState>} */
export function neutralButtons() {
  /** @type {any} */
  const btn = {};
  for (const id of BTN_IDS) btn[id] = neutralBtn();
  return btn;
}

/**
 * InputFrame を作る。省略した値は中立。
 * @param {number} tick
 * @param {Partial<Omit<InputFrame,'btn'>> & {btn?:Partial<Record<BtnId,Partial<BtnState>>>}} [partial]
 * @returns {InputFrame}
 */
export function makeFrame(tick, partial = {}) {
  const btn = neutralButtons();
  if (partial.btn) {
    for (const id of BTN_IDS) {
      const b = partial.btn[id];
      if (b) Object.assign(btn[id], b);
    }
  }
  const ref = inputTable.refViewPx.v;
  return {
    tick,
    stick: partial.stick ? [partial.stick[0], partial.stick[1]] : [0, 0],
    camDeg: partial.camDeg ? [partial.camDeg[0], partial.camDeg[1]] : [0, 0],
    camHeld: partial.camHeld ?? false,
    btn,
    ougiOut: partial.ougiOut ?? false,
    flick: partial.flick ?? 0,
    taps: partial.taps ? partial.taps.map((t) => [t[0], t[1]]) : [],
    fu: partial.fu ? structuredClone(partial.fu) : null,
    viewPx: partial.viewPx ? [partial.viewPx[0], partial.viewPx[1]] : [ref[0], ref[1]],
  };
}

/** InputFrame から、中立でない値だけを取り出す（tick は除く。リプレイ JSON の連長圧縮用）。 */
export function toPartial(frame) {
  /** @type {any} */
  const p = {};
  const neutral = makeFrame(0);
  if (frame.stick[0] !== 0 || frame.stick[1] !== 0) p.stick = [frame.stick[0], frame.stick[1]];
  if (frame.camDeg[0] !== 0 || frame.camDeg[1] !== 0) p.camDeg = [frame.camDeg[0], frame.camDeg[1]];
  if (frame.camHeld) p.camHeld = true;
  for (const id of BTN_IDS) {
    const b = frame.btn[id];
    if (b.down || b.pressed || b.released || b.ageF !== 0) {
      p.btn ??= {};
      p.btn[id] = {};
      if (b.down) p.btn[id].down = true;
      if (b.pressed) p.btn[id].pressed = true;
      if (b.released) p.btn[id].released = true;
      if (b.ageF !== 0) p.btn[id].ageF = b.ageF;
    }
  }
  if (frame.ougiOut) p.ougiOut = true;
  if (frame.flick !== 0) p.flick = frame.flick;
  if (frame.taps.length > 0) p.taps = frame.taps.map((t) => [t[0], t[1]]);
  if (frame.fu) p.fu = structuredClone(frame.fu);
  if (frame.viewPx[0] !== neutral.viewPx[0] || frame.viewPx[1] !== neutral.viewPx[1]) p.viewPx = [frame.viewPx[0], frame.viewPx[1]];
  return p;
}

/** InputFrame の列 → [[回数, 部分InputFrame], ...]（09 11.2 の連長圧縮）。 @param {InputFrame[]} frames */
export function encodeFrames(frames) {
  /** @type {[number, object][]} */
  const out = [];
  let lastKey = null;
  for (const f of frames) {
    const p = toPartial(f);
    const key = JSON.stringify(p);
    if (key === lastKey) out[out.length - 1][0] += 1;
    else out.push([1, p]);
    lastKey = key;
  }
  return out;
}

/** [[回数, 部分InputFrame], ...] → InputFrame の列。 @param {[number, object][]} rle @returns {InputFrame[]} */
export function decodeFrames(rle) {
  const out = [];
  let tick = 0;
  for (const [count, partial] of rle) {
    for (let i = 0; i < count; i++) {
      out.push(makeFrame(tick, partial));
      tick += 1;
    }
  }
  return out;
}

/**
 * 「押しっぱなし」の状態から毎tickの InputFrame を作る道具（__game.setInput とリプレイの台本が使う）。
 * stick・camHeld・down・ougiOut は次に変えるまで保持。pressed/released は down の変化から作る。それ以外は次の1tickだけ。
 */
export function createSyntheticInput() {
  /** @type {[number,number]} */
  let stick = [0, 0];
  let camHeld = false;
  let ougiOut = false;
  /** @type {Record<string,boolean>} */
  const down = {};
  /** @type {Record<string,boolean>} */
  const prevDown = {};
  for (const id of BTN_IDS) {
    down[id] = false;
    prevDown[id] = false;
  }
  /** @type {any} */
  let once = {};
  return {
    /**
     * @param {{stick?:[number,number], camDeg?:[number,number], camHeld?:boolean, down?:Partial<Record<BtnId,boolean>>,
     *   ougiOut?:boolean, flick?:-1|0|1, taps?:[number,number][], fu?:InputFrame['fu']}} p
     */
    set(p) {
      if (p.stick) stick = [p.stick[0], p.stick[1]];
      if (p.camHeld !== undefined) camHeld = p.camHeld;
      if (p.ougiOut !== undefined) ougiOut = p.ougiOut;
      if (p.down) {
        for (const id of BTN_IDS) {
          const v = p.down[id];
          if (v !== undefined) down[id] = v;
        }
      }
      if (p.camDeg) once.camDeg = p.camDeg;
      if (p.flick !== undefined) once.flick = p.flick;
      if (p.taps) once.taps = p.taps;
      if (p.fu !== undefined) once.fu = p.fu;
    },
    /** @param {number} tick @param {[number,number]} [viewPx] @returns {InputFrame} */
    build(tick, viewPx) {
      /** @type {any} */
      const btn = {};
      for (const id of BTN_IDS) {
        btn[id] = { down: down[id], pressed: down[id] && !prevDown[id], released: !down[id] && prevDown[id] };
        prevDown[id] = down[id];
      }
      const frame = makeFrame(tick, { stick, camHeld, ougiOut, btn, viewPx, ...once });
      once = {};
      return frame;
    },
    reset() {
      stick = [0, 0];
      camHeld = false;
      ougiOut = false;
      for (const id of BTN_IDS) {
        down[id] = false;
        prevDown[id] = false;
      }
      once = {};
    },
  };
}
