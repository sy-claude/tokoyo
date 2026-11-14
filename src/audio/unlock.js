// iOS 対策と開始・中断（08 2.1・2.2）。タイトルのタップの処理の中で、同期的に順に行う。
// 各手順の例外はすべて捕まえて先へ進む（console.error を出さない。console.info 1行のみ）。
/** @import {AudioEngine} from './engine.js' */
/** @typedef {import('../config/index.js').Cfg['audio']} AudioCfg */

const WAV_HEADER_BYTES = 44; // num-ok: WAV（RIFF）の見出しの大きさ（形式の固定値）
const WAV_SILENCE_BYTE = 0x80; // num-ok: 8bit PCM の無音（中央値。形式の固定値）

/**
 * 無音の WAV（8bit・モノラル。08 2.1 の5）。44バイトの見出し＋標本。
 * @param {number} rateHz @param {number} lenS @returns {Uint8Array}
 */
export function makeSilentWav(rateHz, lenS) {
  const n = Math.round(rateHz * lenS);
  const buf = new Uint8Array(WAV_HEADER_BYTES + n);
  const view = new DataView(buf.buffer);
  const ascii = (at, s) => {
    for (let i = 0; i < s.length; i++) buf[at + i] = s.charCodeAt(i);
  };
  // 以下は RIFF/WAVE の見出しの位置と値（形式の固定値）
  ascii(0, 'RIFF');
  view.setUint32(4, WAV_HEADER_BYTES - 8 + n, true); // num-ok: RIFF の大きさの位置と、それより前の8バイト
  ascii(8, 'WAVE'); // num-ok: 'WAVE' の位置
  ascii(12, 'fmt '); // num-ok: 'fmt ' の位置
  view.setUint32(16, 16, true); // num-ok: fmt の大きさ（PCM は16）
  view.setUint16(20, 1, true); // num-ok: 形式 1＝PCM
  view.setUint16(22, 1, true); // num-ok: チャンネル数 1
  view.setUint32(24, rateHz, true); // num-ok: 標本化周波数の位置
  view.setUint32(28, rateHz, true); // num-ok: 1秒のバイト数（8bit・モノラル＝周波数と同じ）
  view.setUint16(32, 1, true); // num-ok: ブロックの大きさ 1
  view.setUint16(34, 8, true); // num-ok: 標本のビット数 8
  ascii(36, 'data'); // num-ok: 'data' の位置
  view.setUint32(40, n, true); // num-ok: data の大きさの位置
  buf.fill(WAV_SILENCE_BYTE, WAV_HEADER_BYTES);
  return buf;
}

/**
 * @param {AudioEngine} engine
 * @param {AudioCfg} audioCfg
 * @param {{doc?:Document, nav?:any}} [env]
 */
export function createUnlocker(engine, audioCfg, env = {}) {
  const doc = env.doc ?? globalThis.document;
  const nav = env.nav ?? globalThis.navigator;
  /** @type {HTMLAudioElement|null} */
  let silentEl = null;
  let unlocked = false;
  let followMute = false;
  let informed = false;

  const info = (msg, e) => {
    if (informed) return;
    informed = true;
    console.info(`音の準備：${msg}`, e instanceof Error ? e.message : (e ?? ''));
  };
  const tryStep = (name, f) => {
    try {
      f();
    } catch (e) {
      info(name, e);
    }
  };

  function silentElement() {
    if (silentEl) return silentEl;
    const el = doc.createElement('audio');
    el.loop = true;
    el.setAttribute('playsinline', '');
    el.preload = 'auto';
    const wav = makeSilentWav(audioCfg.silentWavRateHz, audioCfg.silentWavLenS);
    el.src = URL.createObjectURL(new Blob([/** @type {Uint8Array<ArrayBuffer>} */ (wav)], { type: 'audio/wav' }));
    silentEl = el;
    return el;
  }

  /** 08 2.1 の 2〜5（中断からの復帰でも同じことをする）。 */
  function steps2to5() {
    const ctx = engine.ctx;
    tryStep('audioSession', () => {
      if (nav?.audioSession) nav.audioSession.type = followMute ? 'ambient' : 'playback';
    });
    tryStep('resume', () => {
      ctx?.resume().catch((e) => info('resume', e));
    });
    tryStep('1標本の無音', () => {
      if (!ctx) return;
      const b = ctx.createBuffer(1, 1, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = b;
      src.connect(ctx.destination);
      src.start(0);
    });
    tryStep('無音WAV', () => {
      const useLoop = audioCfg.silentLoopMode === 'always' || !nav?.audioSession;
      const el = silentElement();
      if (!followMute && useLoop) el.play()?.catch((e) => info('無音WAV', e));
      else el.pause();
    });
  }

  return {
    /**
     * タイトルの選択のタップの中で呼ぶ（08 2.1 の1〜6。7 の BGM は M10b）。
     * @param {{soundOn:boolean, followMuteSwitch:boolean}} o
     */
    unlock(o) {
      followMute = o.followMuteSwitch;
      tryStep('AudioContext', () => engine.ensureCtx());
      steps2to5();
      tryStep('主音量', () => engine.setMasterOn(o.soundOn));
      unlocked = true;
    },
    /** 解錠の手順を行ったか（音の帯を出す条件）。 */
    get unlocked() {
      return unlocked;
    },
    /** 中断からの復帰（帯のタップ・入力層の任意の pointerup。08 2.2）。 */
    resumeFromGesture() {
      if (!unlocked) return;
      steps2to5();
    },
    /** hidden・pagehide：ctx を止め、無音WAV を止める（08 2.2）。 */
    onHidden() {
      engine.suspend();
      tryStep('無音WAV の停止', () => silentEl?.pause());
    },
    /** 設定「消音スイッチに従う」の切替（設定画面のタップの中。M10a）。 @param {boolean} on */
    setFollowMuteSwitch(on) {
      followMute = on;
      if (unlocked) steps2to5();
    },
    /** 試験用：無音WAV の要素。 */
    get silentElement() {
      return silentEl;
    },
  };
}

/** @typedef {ReturnType<typeof createUnlocker>} Unlocker */
