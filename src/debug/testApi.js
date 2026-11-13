// 試験用の入口 window.__game（?test=1 のときだけ。09 10.2）。e2e とスクリーンショットが使う。
// まだ無い機能（敵・音・配置など）の関数は、作るMで中身を入れる。それまでは呼ぶと理由つきで失敗する。
/** @import {InputFrame, BtnId, SimEvent, V3} from '../data/types.js' */
import { setConfigValue } from '../core/config.js';
import { hashWorld } from '../core/hash.js';
import { createSyntheticInput } from '../input/synthetic.js';
import { stepWorld } from '../sim/step.js';
import { teleportPlayer, viewWorld } from '../sim/world.js';

/**
 * @typedef {Object} GameTestApi
 * @property {Promise<void>} ready
 * @property {(n?:number)=>void} step                 n tick 進めて、イベントを配送（既定1）。一時停止中でも進める
 * @property {()=>void} render                        補間 alpha=1 で1回描く
 * @property {()=>GameStateView} getState              JSON にできる写し
 * @property {(sinceTick?:number)=>SimEvent[]} getEvents
 * @property {(p:{stick?:[number,number], camDeg?:[number,number], camHeld?:boolean, down?:Partial<Record<BtnId,boolean>>,
 *   ougiOut?:boolean, flick?:-1|0|1, taps?:[number,number][], fu?:InputFrame['fu']})=>void} setInput
 *   stick・camHeld・down・ougiOut は次に変えるまで保持。pressed/released は down の変化から作る。それ以外は次の1tickだけ
 * @property {()=>null} audio                          音の状態（08 10章の試験用）。音が無効なら null（音は M0b）
 * @property {{lumaProbe:(id:number|string)=>{core:number, ring:number}}} debug  明度検査（07 1.3。M1a）
 * @property {(btn:BtnId, holdF?:number)=>void} press  down→holdF tick（既定1）→離す→1tick
 * @property {(x:number, y:number, z:number, yawDeg?:number)=>void} teleport  補間を切る
 * @property {(enemyId:string, x:number, z:number, yawDeg?:number)=>number} spawn  エンティティIDを返す
 * @property {(id:number)=>void} kill
 * @property {(path:string, v:number|boolean|string)=>void} setConfig  例 'movement.runSpeedMps'
 * @property {(on:boolean)=>void} godMode             被ダメ0・資源無限
 * @property {(p:{hp?:number, fu?:number, magatama?:number, kekkai?:number})=>void} setPlayer
 * @property {(name:'sandbox'|'stage'|'boss'|'fu-test'|'title', o?:{char?:string, seed?:number})=>Promise<void>} loadScene
 * @property {()=>string} hash                        状態ハッシュ（8桁16進）
 * @property {()=>never} layout                       computeLayout の結果（M0b）
 * @property {()=>{calls:number, triangles:number, programs:number, pixelRatio:number, quality:string}} renderInfo
 *   pixelRatio・quality は 09 10.2 への追加（budget.spec と M0a-2 が読む）
 * @property {(q:'high'|'mid'|'low')=>void} setQuality
 * @property {(frames:InputFrame[])=>void} playReplay  以後 step はこの列を消費
 */
/**
 * @typedef {{tick:number, scene:string, paused:boolean, worldMul:number,
 *  player:{id:number, pos:V3, vel:V3, yawDeg:number, grounded:boolean, hp:number, hpMax:number, state:string,
 *    moveId:string|null, moveF:number, scale:number, fu:number, magatama:number, kekkai:number, infected:boolean, buffs:string[]},
 *  enemies:{id:number, def:string, pos:V3, hp:number, state:string, sealed:boolean, scale:number}[],
 *  projectiles:{id:number, def:string, pos:V3}[],
 *  camera:{pos:V3, yawDeg:number, pitchDeg:number, distM:number, fovYDeg:number, mode:string, lockId:number|null},
 *  gauge:number, tamakake:number, boss:{hp:number, phase:number, breakPct:number}|null}} GameStateView
 */

function notYet(name, m) {
  return () => {
    throw new Error(`__game.${name} は ${m} で作ります（まだ使えません）`);
  };
}

/**
 * window.__game を置く。場面の読込が終わったら markReady を呼ぶ。
 * @param {any} game boot の入れ物
 */
export function installTestApi(game) {
  const synth = createSyntheticInput();
  /** @type {InputFrame[]} */
  let replay = [];
  let markReady = () => {};
  const ready = new Promise((resolve) => {
    markReady = () => resolve(undefined);
  });

  /** @type {GameTestApi} */
  const api = {
    ready,
    step(n = 1) {
      const events = [];
      for (let i = 0; i < n; i++) {
        const w = game.world;
        const frame = replay.length > 0 ? /** @type {InputFrame} */ (replay.shift()) : synth.build(w.tick, game.renderer.viewPx());
        stepWorld(w, frame);
        for (const ev of w.eventsOut) events.push(ev);
      }
      game.bus.dispatch(events);
    },
    render() {
      game.frame.render(game.world, 1);
      game.overlay?.update(null);
    },
    getState() {
      const { tick, scene, ...rest } = viewWorld(game.world);
      return { tick, scene, paused: game.paused, ...rest };
    },
    getEvents(sinceTick = 0) {
      return game.bus.getEvents(sinceTick);
    },
    setInput(p) {
      synth.set(p);
    },
    audio() {
      return null;
    },
    debug: { lumaProbe: notYet('debug.lumaProbe', 'M1a') },
    press(btn, holdF = 1) {
      synth.set({ down: { [btn]: true } });
      api.step(holdF);
      synth.set({ down: { [btn]: false } });
      api.step(1);
    },
    teleport(x, y, z, yawDeg) {
      teleportPlayer(game.world, x, y, z, yawDeg);
    },
    spawn: notYet('spawn', 'M2b'),
    kill: notYet('kill', 'M2b'),
    setConfig(path, v) {
      setConfigValue(game.cfg, game.tables, path, v);
    },
    godMode: notYet('godMode', 'M3a'),
    setPlayer: notYet('setPlayer', 'M3a'),
    async loadScene(name, o = {}) {
      synth.reset();
      replay = [];
      await game.scenes.load(name, o);
    },
    hash() {
      return hashWorld(game.world);
    },
    layout: notYet('layout', 'M0b'),
    renderInfo() {
      return game.renderer.info();
    },
    setQuality(q) {
      game.renderer.setQuality(q);
    },
    playReplay(frames) {
      replay = frames.slice();
    },
  };
  /** @type {any} */ (globalThis).__game = api;
  return { api, markReady };
}
