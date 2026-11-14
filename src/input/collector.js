// InputFrame の組み立て（09 5.3、01 2.10）。指（pointerRouter）の出来事を受けて溜め、1tick ごとに配送する。
// DOM には触らない。時刻は呼ぶ側が渡す（e.timeStamp と requestAnimationFrame の時刻は同じ時計）。
/** @import {InputFrame, BtnId, BtnState} from '../data/types.js' */
import { MS_PER_S } from '../core/units.js';
import { BTN_IDS, makeFrame } from './synthetic.js';

/**
 * @param {{inputAgeMaxF:number}} inputCfg
 * @param {number} tickRateHz
 */
export function createCollector(inputCfg, tickRateHz) {
  const stepMs = MS_PER_S / tickRateHz;
  /** @typedef {{fingers:number, pressLatched:boolean, pressTimeMs:number, releaseLatched:boolean, pendingRelease:boolean}} BtnRec */
  /** @type {Record<string, BtnRec>} */
  const btn = {};
  for (const id of BTN_IDS) btn[id] = { fingers: 0, pressLatched: false, pressTimeMs: 0, releaseLatched: false, pendingRelease: false };
  /** @type {[number,number]} */
  let stick = [0, 0];
  let camHeld = false;
  /** 前の配送以後に溜まった回転量 */
  let camAcc = [0, 0];
  /** この描画区間で各tickへ配る量と残りの回数 */
  let camShare = [0, 0];
  let camTicksLeft = 0;
  /** @type {[number,number][]} */
  let taps = [];
  /** @type {-1|0|1} */
  let flick = 0;
  let ougiOutOnce = false;
  let ougiOutHeld = false;

  return {
    /** 指がボタンを押した。 @param {BtnId} id @param {number} tMs e.timeStamp */
    press(id, tMs) {
      const b = btn[id];
      b.fingers += 1;
      b.pressLatched = true;
      b.pressTimeMs = tMs;
    },
    /**
     * 指がボタンから離れた。最後の指なら released を出す。silent なら出さない（静かな解放。01 2.6）。
     * @param {BtnId} id @param {boolean} [silent]
     */
    release(id, silent = false) {
      const b = btn[id];
      if (b.fingers <= 0) return;
      b.fingers -= 1;
      if (b.fingers === 0 && !silent) b.releaseLatched = true;
    },
    /** @param {number} x @param {number} y 上が +y、長さ ≤ 1 */
    setStick(x, y) {
      stick = [x, y];
    },
    /** カメラの回転量（度、感度と反転を適用済み）を足す。 */
    addCam(yawDeg, pitchDeg) {
      camAcc[0] += yawDeg;
      camAcc[1] += pitchDeg;
    },
    /** @param {boolean} on */
    setCamHeld(on) {
      camHeld = on;
    },
    addTap(x, y) {
      taps.push([x, y]);
    },
    /** @param {-1|1} s */
    setFlick(s) {
      flick = s;
    },
    /** 奥義の指が奥義でなくなった tick（1tick だけ ougiOut）。 */
    ougiOutPulse() {
      ougiOutOnce = true;
    },
    /** 取消域にいる間（全tick）。 @param {boolean} on */
    setOugiOutHeld(on) {
      ougiOutHeld = on;
    },
    /**
     * 1描画で n tick 進むときに、build の前に1回呼ぶ。溜まった回転量を n 等分する（09 5.3）。
     * 呼ばずに build したときは n=1 として扱う。
     * @param {number} n
     */
    startFrame(n) {
      if (n <= 0) return;
      camShare = [camAcc[0] / n, camAcc[1] / n];
      camAcc = [0, 0];
      camTicksLeft = n;
    },
    /**
     * このtickの InputFrame（09 5.3）。
     * @param {number} tick @param {number} nowMs 描画の時刻（ageF 用） @param {[number,number]} [viewPx]
     * @returns {InputFrame}
     */
    build(tick, nowMs, viewPx) {
      /** @type {Record<string, BtnState>} */
      const out = {};
      for (const id of BTN_IDS) {
        const b = btn[id];
        let down = b.fingers > 0;
        let pressed = false;
        let released = false;
        let ageF = 0;
        if (b.pressLatched) {
          pressed = true;
          b.pressLatched = false;
          ageF = Math.min(inputCfg.inputAgeMaxF, Math.max(0, Math.round((nowMs - b.pressTimeMs) / stepMs)));
          if (!down) {
            // 同じ区間で押して離した短いタップ：このtickは down、次のtickで released（静かな解放なら出さない）
            down = true;
            b.pendingRelease = b.releaseLatched;
          }
          b.releaseLatched = false;
        } else if (b.pendingRelease) {
          down = false;
          released = true;
          b.pendingRelease = false;
        } else {
          released = b.releaseLatched && !down;
          b.releaseLatched = false;
        }
        out[id] = { down, pressed, released, ageF };
      }
      /** @type {[number,number]} */
      let cam;
      if (camTicksLeft > 0) {
        cam = [camShare[0], camShare[1]];
        camTicksLeft -= 1;
      } else {
        cam = [camAcc[0], camAcc[1]];
        camAcc = [0, 0];
      }
      const frame = makeFrame(tick, {
        stick,
        camDeg: cam,
        camHeld,
        btn: out,
        ougiOut: ougiOutOnce || ougiOutHeld,
        flick,
        taps,
        viewPx,
      });
      taps = [];
      flick = 0;
      ougiOutOnce = false;
      return frame;
    },
    /** 状態を全部消す（場面の切替）。 */
    reset() {
      for (const id of BTN_IDS) Object.assign(btn[id], { fingers: 0, pressLatched: false, releaseLatched: false, pendingRelease: false });
      stick = [0, 0];
      camHeld = false;
      camAcc = [0, 0];
      camTicksLeft = 0;
      taps = [];
      flick = 0;
      ougiOutOnce = false;
      ougiOutHeld = false;
    },
  };
}

/** @typedef {ReturnType<typeof createCollector>} Collector */

/**
 * 2つの InputFrame を1つにする（タッチとキーボードの合成。boot と __game.step が使う）。
 * stick は長い方、camDeg は和、ボタンと真偽値は「または」。
 * @param {InputFrame} a @param {InputFrame} b @returns {InputFrame}
 */
export function mergeFrames(a, b) {
  const la = Math.hypot(a.stick[0], a.stick[1]);
  const lb = Math.hypot(b.stick[0], b.stick[1]);
  /** @type {any} */
  const out = {};
  for (const id of BTN_IDS) {
    const x = a.btn[id];
    const y = b.btn[id];
    const down = x.down || y.down;
    out[id] = { down, pressed: x.pressed || y.pressed, released: (x.released || y.released) && !down, ageF: Math.max(x.ageF, y.ageF) };
  }
  return {
    tick: a.tick,
    stick: lb > la ? [b.stick[0], b.stick[1]] : [a.stick[0], a.stick[1]],
    camDeg: [a.camDeg[0] + b.camDeg[0], a.camDeg[1] + b.camDeg[1]],
    camHeld: a.camHeld || b.camHeld,
    btn: out,
    ougiOut: a.ougiOut || b.ougiOut,
    flick: a.flick !== 0 ? a.flick : b.flick,
    taps: [...a.taps, ...b.taps],
    fu: a.fu ?? b.fu,
    viewPx: a.viewPx,
  };
}
