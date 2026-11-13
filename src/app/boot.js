// 起動順（09 1.4）。URL 引数 → 設定 → 保存 → 描画 → 場面 → 入力とループ（または試験用の __game）。
// タイトル・音の起動・ブラウザ対策・タッチ入力は M0b。
import { buildConfig, applyConfigOverrides } from '../core/config.js';
import { createBus } from '../core/events.js';
import { configTables } from '../config/index.js';
import { createStorage } from '../platform/storage.js';
import { createRenderer } from '../render/renderer.js';
import { createFrame } from '../render/frame.js';
import { createKeyboard } from '../input/keyboard.js';
import { stepWorld } from '../sim/step.js';
import { installTestApi } from '../debug/testApi.js';
import { createOverlay } from '../debug/overlay.js';
import { createPanel } from '../debug/panel.js';
import { parseUrlParams } from './urlParams.js';
import { createLoop } from './loop.js';
import { createScenes } from './scenes.js';

const DEFAULT_SCENE = 'sandbox';

export async function boot() {
  const params = parseUrlParams(globalThis.location.search);
  const cfg = buildConfig(configTables);
  const storage = createStorage(cfg.save);
  if (params.debug) applyConfigOverrides(cfg, configTables, storage.loadDebug());
  const loaded = storage.loadSave(); // 壊れた保存はここで .bak に退避され、既定値になる

  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game'));
  const renderer = createRenderer(canvas, cfg, params.q ?? 'high');
  const frame = createFrame(renderer, cfg);
  const bus = createBus(cfg.debug.eventRingCount);

  /** ゲーム全体の入れ物。app と debug だけが持つ */
  const game = {
    params,
    cfg,
    tables: configTables,
    storage,
    save: loaded.data,
    renderer,
    frame,
    bus,
    /** @type {import('../sim/world.js').World} */
    world: /** @type {any} */ (null),
    scene: '',
    seed: params.seed,
    charId: params.char,
    paused: false,
    /** @type {ReturnType<typeof createOverlay>|null} */
    overlay: null,
    /** @type {ReturnType<typeof createScenes>} */
    scenes: /** @type {any} */ (null),
  };
  game.scenes = createScenes(game);

  const resize = () => {
    renderer.resize(globalThis.innerWidth, globalThis.innerHeight);
    if (game.world) frame.render(game.world, 1);
  };
  renderer.resize(globalThis.innerWidth, globalThis.innerHeight);
  globalThis.addEventListener('resize', resize);

  // 試験用の入口は場面の読込より先に置く（ready を待てるように）
  const testApi = params.test ? installTestApi(game) : null;

  let scene = params.scene ?? DEFAULT_SCENE;
  if (!game.scenes.has(scene)) {
    console.warn(`場面 ${scene} はまだ作られていません。${DEFAULT_SCENE} を開きます。`);
    scene = DEFAULT_SCENE;
  }
  await game.scenes.load(scene, { char: params.char, seed: params.seed });

  if (params.debug) {
    game.overlay = createOverlay(game);
    createPanel(game);
  }

  if (testApi) {
    // ?test=1：ループを起動しない。__game.step / render で進める
    game.overlay?.update(null);
    testApi.markReady();
    return;
  }

  // 通常のループ
  /** @type {import('../data/types.js').SimEvent[]} */
  const pending = [];
  /** @type {ReturnType<typeof createLoop>} */
  let loop;
  const keyboard = createKeyboard(cfg.input, cfg.time.tickRateHz, {
    onPause: () => {
      loop.setPaused(!loop.paused, 'user');
      game.paused = loop.paused;
    },
  });
  keyboard.attach(globalThis.window);
  loop = createLoop({
    timeCfg: cfg.time,
    tick: () => {
      stepWorld(game.world, keyboard.build(game.world.tick, renderer.viewPx()));
      for (const ev of game.world.eventsOut) pending.push(ev);
    },
    flush: () => {
      bus.dispatch(pending);
      pending.length = 0;
    },
    render: (alpha, nowMs) => {
      frame.render(game.world, alpha);
      game.overlay?.update(nowMs);
    },
  });
  const onRaf = (nowMs) => {
    loop.onFrame(nowMs, document.hidden);
    globalThis.requestAnimationFrame(onRaf);
  };
  globalThis.requestAnimationFrame(onRaf);
}
