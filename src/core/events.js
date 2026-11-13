// イベント列（09 4.5）。シムは emit で world.eventsOut に積み、
// 購読側（描画・音・UI）は bus.on で配列ごと受け取る。購読側はシムを変えない。
/** @import {SimEvent, SimEventMap} from '../data/types.js' */

/**
 * @template {keyof SimEventMap} K
 * @param {{tick:number, eventsOut:SimEvent[]}} world
 * @param {K} type
 * @param {SimEventMap[K]} payload
 */
export function emit(world, type, payload) {
  world.eventsOut.push(/** @type {any} */ ({ type, tick: world.tick, ...payload }));
}

/**
 * @typedef {Object} EventBus
 * @property {(handler:(events:SimEvent[])=>void)=>()=>void} on  登録順に呼ぶ（render → audio → ui の順で登録する）
 * @property {(events:SimEvent[])=>void} dispatch
 * @property {(sinceTick?:number)=>SimEvent[]} getEvents  直近 ringCount 件のうち sinceTick 以降
 * @property {()=>void} clear
 */

/** @param {number} ringCount 環状に保持する件数 @returns {EventBus} */
export function createBus(ringCount) {
  /** @type {((events:SimEvent[])=>void)[]} */
  const handlers = [];
  /** @type {SimEvent[]} */
  const ring = new Array(ringCount);
  let head = 0; // 次に書く位置
  let count = 0;
  return {
    on(handler) {
      handlers.push(handler);
      return () => {
        const i = handlers.indexOf(handler);
        if (i >= 0) handlers.splice(i, 1);
      };
    },
    dispatch(events) {
      if (events.length === 0) return;
      for (const ev of events) {
        ring[head] = ev;
        head = (head + 1) % ringCount;
        if (count < ringCount) count += 1;
      }
      for (const h of handlers) h(events);
    },
    getEvents(sinceTick = 0) {
      const out = [];
      const start = (head - count + ringCount) % ringCount;
      for (let i = 0; i < count; i++) {
        const ev = ring[(start + i) % ringCount];
        if (ev.tick >= sinceTick) out.push(ev);
      }
      return out;
    },
    clear() {
      head = 0;
      count = 0;
    },
  };
}
