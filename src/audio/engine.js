// 音の骨組み（08 1.1）。AudioContext・バス・主音量と、確認音「りん」（08 3.1 の rin）。
// 効果音の本体（声の管理・ばらつき・定位）は M3b、残響は M3b、BGM は M10b、環境音は M7d で足す。
// 例外は外へ出さない（console.error を出さない。08 2.1）。
import { dbToGain } from '../core/units.js';

/** @typedef {'sfx'|'ui'|'bgm'|'amb'|'reverb'} BusId */
/** @typedef {import('../config/index.js').Cfg['audio']} AudioCfg */

/**
 * @param {AudioCfg} audioCfg
 * @param {{AudioContextCtor?:any, now?:()=>number}} [env]  試験用に差し替えられる。now は lastSounds の tick を返す
 */
export function createAudioEngine(audioCfg, env = {}) {
  const Ctor = env.AudioContextCtor ?? globalThis.AudioContext ?? /** @type {any} */ (globalThis).webkitAudioContext;
  /** @type {AudioContext|null} */
  let ctx = null;
  /** @type {Record<string, GainNode>} */
  const bus = {};
  /** @type {GainNode|null} */
  let master = null;
  let masterOn = true;
  let voices = 0;
  /** @type {{id:string, tick:number}[]} */
  const lastSounds = [];
  /** @type {((state:string)=>void)[]} */
  const listeners = [];

  function gainNode(db) {
    const g = /** @type {AudioContext} */ (ctx).createGain();
    g.gain.value = dbToGain(db);
    return g;
  }

  /** ctx が無ければ作って、つなぎ方（08 1.1）を組む。 @returns {AudioContext|null} */
  function ensureCtx() {
    if (ctx) return ctx;
    if (!Ctor) return null;
    ctx = new Ctor({ latencyHint: 'interactive' });
    const c = /** @type {AudioContext} */ (ctx);
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = audioCfg.compThresholdDb;
    comp.knee.value = audioCfg.compKneeDb;
    comp.ratio.value = audioCfg.compRatioMul;
    comp.attack.value = audioCfg.compAttackS;
    comp.release.value = audioCfg.compReleaseS;
    comp.connect(c.destination);
    master = gainNode(audioCfg.masterDb);
    master.gain.value = masterOn ? dbToGain(audioCfg.masterDb) : 0;
    master.connect(comp);
    // worldFx：BGM と環境音だけにかかる低域通過（符の構え・見切り・一時停止で絞る。M2.5 以降）
    const worldFx = c.createBiquadFilter();
    worldFx.type = 'lowpass';
    worldFx.frequency.value = audioCfg.worldFxOpenHz;
    worldFx.connect(master);
    bus.sfx = gainNode(audioCfg.busSfxDb);
    bus.ui = gainNode(audioCfg.busUiDb);
    bus.reverb = gainNode(audioCfg.busReverbDb);
    bus.bgm = gainNode(audioCfg.busBgmDb);
    bus.amb = gainNode(audioCfg.busAmbDb);
    bus.sfx.connect(master);
    bus.ui.connect(master);
    bus.reverb.connect(master);
    bus.bgm.connect(worldFx);
    bus.amb.connect(worldFx);
    c.onstatechange = () => {
      for (const f of listeners) f(c.state);
    };
    return c;
  }

  /** 部品「りん」rin(f, うなりHz, d)（08 3.1）を sound の設定で鳴らす。 */
  function playRin(sound, part, destination) {
    const c = /** @type {AudioContext} */ (ctx);
    const t0 = c.currentTime;
    const a = part.attackS;
    let ended = 0;
    const n = part.partials.length;
    voices += 1;
    for (const p of part.partials) {
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = sound.fHz * p.fMul + sound.beatHz * p.beatMul;
      const g = c.createGain();
      const d = sound.decayS * p.decayMul;
      const peak = dbToGain(p.db + (sound.db - part.refDb));
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + a);
      g.gain.setTargetAtTime(0, t0 + a, d / audioCfg.envDecayDivRatio);
      osc.connect(g);
      g.connect(destination);
      osc.onended = () => {
        ended += 1;
        if (ended === n) voices -= 1;
        osc.disconnect();
        g.disconnect();
      };
      osc.start(t0);
      osc.stop(t0 + a + d + audioCfg.envStopPadS);
    }
  }

  return {
    ensureCtx,
    get ctx() {
      return ctx;
    },
    /** @returns {string} 'none'（未作成）| 'suspended' | 'running' | 'interrupted' | 'closed' */
    state() {
      return ctx ? ctx.state : 'none';
    },
    /** 主音量のオン・オフ（「音なしで遊ぶ」は 0。08 2.1 の6）。 @param {boolean} on */
    setMasterOn(on) {
      masterOn = on;
      if (master) master.gain.value = on ? dbToGain(audioCfg.masterDb) : 0;
    },
    get masterOn() {
      return masterOn;
    },
    /** @param {(state:string)=>void} f */
    onStateChange(f) {
      listeners.push(f);
    },
    /**
     * 効果音を鳴らす（sfxRecipes.sounds の音ID）。ctx が動いていなくても予定だけ入れる（ctx の時計と一緒に止まる）。
     * @param {string} id
     */
    play(id) {
      try {
        if (!ctx) return;
        const r = /** @type {any} */ (audioCfg.sfxRecipes);
        const sound = r.sounds[id];
        const part = sound ? r.parts[sound.part] : null;
        if (!sound || !part) return;
        playRin(sound, part, bus[sound.bus] ?? bus.sfx);
        lastSounds.push({ id, tick: env.now ? env.now() : 0 });
        if (lastSounds.length > audioCfg.voiceMaxCount) lastSounds.shift();
      } catch (e) {
        console.info('音を鳴らせませんでした', e);
      }
    },
    suspend() {
      try {
        ctx?.suspend().catch(() => {});
      } catch {
        // 止められなくても続ける
      }
    },
    resume() {
      try {
        ctx?.resume().catch(() => {});
      } catch {
        // 動かせなくても続ける
      }
    },
    /** __game.audio() の中身（08 10章の試験用。BGM は M10b）。 */
    snapshot() {
      return {
        state: this.state(),
        voices,
        lastSounds: lastSounds.slice(),
        busDb: {
          sfx: audioCfg.busSfxDb,
          ui: audioCfg.busUiDb,
          bgm: audioCfg.busBgmDb,
          amb: audioCfg.busAmbDb,
          reverb: audioCfg.busReverbDb,
          master: audioCfg.masterDb,
        },
        masterGain: master ? master.gain.value : masterOn ? dbToGain(audioCfg.masterDb) : 0,
        bgm: { track: null, state: {}, gains: {} },
      };
    },
  };
}

/** @typedef {ReturnType<typeof createAudioEngine>} AudioEngine */
