// 起動順（09 1.4）。URL 引数 → 設定 → 保存 → 描画 → 画面の部品 → 入力 → 場面 → ブラウザ対策 → ループ（または試験用の __game）。
import { buildConfig, applyConfigOverrides } from '../core/config.js';
import { createBus } from '../core/events.js';
import { MS_PER_S } from '../core/units.js';
import { configTables } from '../config/index.js';
import { createStorage } from '../platform/storage.js';
import { createViewport } from '../platform/viewport.js';
import { createWakeLock } from '../platform/wakeLock.js';
import { installGuards, isIOS, leaveByBack, persistStorage, pushGuard, requestFullscreenLandscape } from '../platform/guards.js';
import { createRenderer } from '../render/renderer.js';
import { createFrame } from '../render/frame.js';
import { createKeyboard } from '../input/keyboard.js';
import { createCollector, mergeFrames } from '../input/collector.js';
import { createPointerRouter } from '../input/pointerRouter.js';
import { computeLayout } from '../input/layout.js';
import { createAudioEngine } from '../audio/engine.js';
import { createUnlocker } from '../audio/unlock.js';
import { installUiStyle } from '../ui/style.js';
import { createButtonsView } from '../ui/buttonsView.js';
import { createHud } from '../ui/hud.js';
import { createRotatePrompt } from '../ui/rotatePrompt.js';
import { createTitle } from '../ui/menus/title.js';
import { createDevMenu } from '../ui/menus/devMenu.js';
import { createPauseMenu } from '../ui/menus/pause.js';
import { stepWorld } from '../sim/step.js';
import { installTestApi } from '../debug/testApi.js';
import { createOverlay } from '../debug/overlay.js';
import { createPanel } from '../debug/panel.js';
import { parseUrlParams } from './urlParams.js';
import { createLoop } from './loop.js';
import { createScenes } from './scenes.js';

/** タイトルの背後に置くワールド（タイトルにシムは無いが、描画と __game のために1つ持つ）。 */
const BACKDROP_SCENE = 'sandbox';

/** 保存の settings を既定値に重ねる（知らないキー・型の違う値は捨てる）。 */
function loadSettings(defaults, saved) {
  const s = structuredClone(defaults);
  for (const [k, v] of Object.entries(saved ?? {})) {
    if (k in s && typeof v === typeof s[k]) s[k] = v;
  }
  return s;
}

const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

export async function boot() {
  const params = parseUrlParams(globalThis.location.search);
  const cfg = buildConfig(configTables);
  const storage = createStorage(cfg.save);
  if (params.debug) applyConfigOverrides(cfg, configTables, storage.loadDebug());
  const loaded = storage.loadSave(); // 壊れた保存はここで .bak に退避され、既定値になる
  const settings = loadSettings(cfg.settings, loaded.data.settings);

  // 試験は時刻に頼らない：画面切替のワイプ（その間は押せない）を0にした写しを画面の部品に渡す（cfg そのものは変えない）
  const uiCfg = params.test ? { ...cfg, ui: { ...cfg.ui, sceneWipeS: 0 } } : cfg;
  installUiStyle(document, uiCfg);
  const rootEl = $('root');
  const canvas = /** @type {HTMLCanvasElement} */ ($('game'));
  const renderer = createRenderer(canvas, cfg, params.q ?? 'high');
  const frame = createFrame(renderer, cfg, document);
  const bus = createBus(cfg.debug.eventRingCount);

  /** ゲーム全体の入れ物。app と debug だけが持つ */
  const game = {
    params,
    cfg,
    tables: configTables,
    storage,
    save: loaded.data,
    settings,
    renderer,
    frame,
    bus,
    /** @type {import('../sim/world.js').World} */
    world: /** @type {any} */ (null),
    /** 画面：'title' | 'devMenu' | シムの場面名 */
    scene: '',
    seed: params.seed,
    charId: params.char,
    /** 一時停止メニューが開いている */
    paused: false,
    /** @type {'rotate'|'height'|null} 重ねの案内 */
    blockMode: null,
    /** @type {import('../input/layout.js').Layout} */
    layout: /** @type {any} */ (null),
    /** @type {{text:string, untilMs:number}|null} 教示の文 */
    hint: null,
    exitArmedUntilMs: 0,
    /** @type {ReturnType<typeof createOverlay>|null} */
    overlay: null,
    /** @type {ReturnType<typeof createLoop>|null} */
    loop: null,
    /** @type {ReturnType<typeof createScenes>} */
    scenes: /** @type {any} */ (null),
    /** @type {any} */
    ui: null,
    /** @type {ReturnType<typeof createCollector>} */
    collector: /** @type {any} */ (null),
    /** @type {ReturnType<typeof createPointerRouter>} */
    router: /** @type {any} */ (null),
    /** @type {import('../audio/engine.js').AudioEngine|null} */
    engine: null,
    /** @type {import('../audio/unlock.js').Unlocker|null} */
    unlocker: null,
    /** 試験用：設定を変えて配置を作り直す */
    applySettings: (/** @type {object} */ p) => {},
    showHint: (/** @type {string} */ text, /** @type {number} */ s) => {},
    toggleOverlay: () => false,
    updateUi: () => {},
  };

  // ---- 音（?test=1 では無効。&audio=1 で有効） ----
  if (!params.test || params.audio) {
    game.engine = createAudioEngine(cfg.audio, { now: () => game.world?.tick ?? 0 });
    game.unlocker = createUnlocker(game.engine, cfg.audio);
  }
  const wakeLock = createWakeLock();

  // ---- 入力 ----
  game.collector = createCollector(cfg.input, cfg.time.tickRateHz);
  game.router = createPointerRouter({
    inputCfg: cfg.input,
    cameraCfg: cfg.camera,
    collector: game.collector,
    getLayout: () => game.layout,
    getSettings: () => game.settings,
    hooks: { onPause: () => game.scenes.openPause() },
  });
  /** @type {[number,number]} ルート要素の左上（visualViewport の位置） */
  let origin = [0, 0];
  game.router.attach($('input'), () => origin);
  const keyboard = createKeyboard(cfg.input, cfg.time.tickRateHz, { onPause: () => game.scenes.togglePause() });
  keyboard.attach(globalThis.window);

  // ---- 画面の部品 ----
  const menusEl = $('menus');
  const save = () => {
    game.save.settings = { ...game.save.settings, soundOn: game.settings.soundOn };
    storage.writeSave(game.save);
  };
  const resumeAudio = () => {
    if (game.engine && game.settings.soundOn && game.engine.state() !== 'running') game.unlocker?.resumeFromGesture();
  };
  game.ui = {
    buttons: createButtonsView(document, $('hud'), cfg),
    hud: createHud(document, $('hud'), rootEl, cfg, { onSoundBandTap: resumeAudio }),
    rotate: createRotatePrompt(document, document.body, isIOS()),
    title: createTitle(document, menusEl, uiCfg, {
      // 01 5.3：同じタップの処理の中で順に（失敗はすべて握りつぶして先へ）
      onChoose: (soundOn) => {
        game.settings.soundOn = soundOn;
        game.unlocker?.unlock({ soundOn, followMuteSwitch: game.settings.followMuteSwitch });
        if (soundOn) game.engine?.play('uiRin');
        requestFullscreenLandscape(document);
        wakeLock.request();
        persistStorage();
        pushGuard();
        save();
        game.scenes.toDevMenu(); // devMenuOn の間はステージ選択の代わり（10 §4.4）
      },
    }),
    devMenu: createDevMenu(document, menusEl, uiCfg, {
      onScene: (name) => {
        game.scenes.startPlay(name);
      },
      onOverlay: () => game.toggleOverlay(),
      getOverlay: () => Boolean(game.overlay && game.overlay.el.style.display !== 'none'),
      onQuality: (q) => game.renderer.setQuality(q),
      getQuality: () => game.renderer.quality,
      onTitle: () => game.scenes.toTitle(),
    }),
    pause: createPauseMenu(document, menusEl, uiCfg, {
      onResume: () => game.scenes.closePause(),
      onTitle: () => game.scenes.toTitle(),
    }),
  };
  game.scenes = createScenes(game);

  game.toggleOverlay = () => {
    if (!game.overlay) {
      game.overlay = createOverlay(game);
      game.overlay.update(null);
      return true;
    }
    const on = game.overlay.el.style.display === 'none';
    game.overlay.el.style.display = on ? '' : 'none';
    return on;
  };
  game.showHint = (text, s) => {
    game.hint = { text, untilMs: globalThis.performance.now() + s * MS_PER_S };
  };
  game.updateUi = () => {
    const now = globalThis.performance.now();
    if (game.hint && now >= game.hint.untilMs) game.hint = null;
    const e = game.engine;
    const soundBand = Boolean(
      e && game.unlocker?.unlocked && game.settings.soundOn && e.state() !== 'running' && document.visibilityState === 'visible',
    );
    game.ui.hud.update({ soundBand, hint: game.hint ? game.hint.text : null });
    game.ui.buttons.update(game.router.viewState());
  };

  // ---- 画面の大きさ（01 1.7） ----
  let lowHeightHinted = false;
  /** @param {import('../platform/viewport.js').ViewportInfo} v */
  const applyViewport = (v) => {
    origin = [v.offsetLeft, v.offsetTop];
    rootEl.style.left = `${v.offsetLeft}px`;
    rootEl.style.top = `${v.offsetTop}px`;
    rootEl.style.width = `${v.W}px`;
    rootEl.style.height = `${v.H}px`;
    renderer.resize(v.W, v.H);
    game.layout = computeLayout(v.W, v.H, v.insets, game.settings, cfg.layout);
    game.ui.buttons.layout(game.layout, game.settings);
    game.ui.hud.layout(game.layout);
    game.ui.title.layout(game.layout);
    if (!v.portrait && v.H < cfg.layout.layoutMinHeightPx && v.H >= cfg.layout.layoutHardMinHeightPx && !lowHeightHinted) {
      lowHeightHinted = true; // 1セッション1回
      game.showHint('ツールバーを隠すと遊びやすくなります', cfg.ui.hudLowHeightHintS);
    }
    game.scenes.setBlock(v.portrait ? 'rotate' : v.H < cfg.layout.layoutHardMinHeightPx ? 'height' : null);
    if (game.world) frame.render(game.world, 1);
    game.updateUi();
  };
  const viewport = createViewport(globalThis.window, $('safe-probe'), applyViewport);
  game.applySettings = (p) => {
    Object.assign(game.settings, p);
    applyViewport(viewport.read());
  };

  // ---- ブラウザ対策（01 8章） ----
  installGuards(globalThis.window, document, {
    onBack: () => {
      const now = globalThis.performance.now();
      const calm = game.paused || game.scene === 'title' || game.scene === 'devMenu';
      if (calm && now < game.exitArmedUntilMs) {
        save();
        leaveByBack();
        return;
      }
      game.scenes.openPause();
      game.showHint('もう一度『戻る』で終了します', cfg.ui.backExitArmS);
      pushGuard();
      game.exitArmedUntilMs = now + cfg.ui.backExitArmS * MS_PER_S;
    },
    onHidden: () => {
      game.router.releaseAll();
      keyboard.reset();
      game.scenes.openPause();
      save();
      game.unlocker?.onHidden();
    },
    onVisible: () => wakeLock.reacquire(game.scene === 'title'),
    onBlur: () => {
      game.router.releaseAll();
      keyboard.reset();
      game.scenes.openPause();
    },
    onPageShow: (persisted) => {
      if (persisted) game.scenes.openPause();
    },
  });
  // 音が止まっていたら、入力層の任意の pointerup で戻す（01 8.8・08 2.2）
  document.addEventListener('pointerup', resumeAudio, true);

  // 試験用の入口は場面の読込より先に置く（ready を待てるように）
  const testApi = params.test ? installTestApi(game) : null;

  // ---- 最初の場面 ----
  let scene = params.scene ?? (params.test ? BACKDROP_SCENE : 'title');
  if (scene !== 'title' && !game.scenes.has(scene)) {
    console.warn(`場面 ${scene} はまだ作られていません。${BACKDROP_SCENE} を開きます。`);
    scene = BACKDROP_SCENE;
  }
  applyViewport(viewport.read());
  if (scene === 'title') {
    await game.scenes.load(BACKDROP_SCENE, { char: params.char, seed: params.seed });
    game.scenes.toTitle();
  } else {
    await game.scenes.startPlay(scene, { char: params.char, seed: params.seed });
  }
  applyViewport(viewport.read());

  if (params.debug) {
    game.overlay = createOverlay(game);
    createPanel(game);
  }

  const onUiFrame = () => {
    game.updateUi();
    globalThis.requestAnimationFrame(onUiFrame);
  };

  if (testApi) {
    // ?test=1&audio=1：タイトルのタップと同じ解錠手順を ready の前に行う（09 10.1）
    if (params.audio) game.unlocker?.unlock({ soundOn: true, followMuteSwitch: game.settings.followMuteSwitch });
    // ?test=1：シムのループを起動しない。__game.step / render で進める（UI の表示だけ毎フレーム更新する）
    game.overlay?.update(null);
    globalThis.requestAnimationFrame(onUiFrame);
    testApi.markReady();
    return;
  }

  // 通常のループ
  /** @type {import('../data/types.js').SimEvent[]} */
  const pending = [];
  game.loop = createLoop({
    timeCfg: cfg.time,
    beginFrame: (n) => game.collector.startFrame(n),
    tick: (nowMs) => {
      const w = game.world;
      const touch = game.collector.build(w.tick, nowMs, renderer.viewPx());
      stepWorld(w, mergeFrames(touch, keyboard.build(w.tick, renderer.viewPx())));
      for (const ev of w.eventsOut) pending.push(ev);
    },
    flush: () => {
      bus.dispatch(pending);
      pending.length = 0;
    },
    render: (alpha, nowMs) => {
      frame.render(game.world, alpha);
      game.overlay?.update(nowMs);
      game.updateUi();
    },
  });
  game.scenes.sync();
  const onRaf = (nowMs) => {
    game.loop?.onFrame(nowMs, document.hidden);
    globalThis.requestAnimationFrame(onRaf);
  };
  globalThis.requestAnimationFrame(onRaf);
}
