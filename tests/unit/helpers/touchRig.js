// 入力層の試験台：collector＋pointerRouter を基準端末の配置で組み、指の出来事から InputFrame を作る（DOM なし）。
import { createCollector } from '../../../src/input/collector.js';
import { createPointerRouter } from '../../../src/input/pointerRouter.js';
import { computeLayout } from '../../../src/input/layout.js';
import { makeCfg } from './cfg.js';

export const cfg = makeCfg();
export const REF_INSETS = { l: cfg.layout.layoutRefInsetSidePx, r: cfg.layout.layoutRefInsetSidePx, t: 0, b: cfg.layout.layoutRefInsetBottomPx };

/**
 * @param {{settings?:object, W?:number, H?:number}} [o]
 */
export function makeRig(o = {}) {
  const settings = { ...cfg.settings, ...(o.settings ?? {}) };
  let layout = computeLayout(o.W ?? cfg.layout.layoutRefWidthPx, o.H ?? cfg.layout.layoutRefHeightPx, REF_INSETS, settings, cfg.layout);
  const collector = createCollector(cfg.input, cfg.time.tickRateHz);
  let pauses = 0;
  const router = createPointerRouter({
    inputCfg: cfg.input,
    cameraCfg: cfg.camera,
    collector,
    getLayout: () => layout,
    getSettings: () => settings,
    hooks: { onPause: () => (pauses += 1) },
  });
  let tick = 0;
  let t = 0;
  return {
    cfg,
    collector,
    router,
    get layout() {
      return layout;
    },
    /** 画面の大きさを変える（visualViewport の resize と同じ。押下中の役割は変えない） */
    resize(W, H) {
      layout = computeLayout(W, H, REF_INSETS, settings, cfg.layout);
    },
    get pauses() {
      return pauses;
    },
    /** 時刻（ms）を進める */
    wait(ms) {
      t += ms;
    },
    get t() {
      return t;
    },
    down(id, x, y) {
      router.down({ id, x, y, t });
    },
    move(id, x, y) {
      router.move({ id, x, y, t });
    },
    up(id, x, y) {
      router.up({ id, x, y, t });
    },
    /** 1描画で n tick 進める。InputFrame の列を返す */
    frame(n = 1) {
      collector.startFrame(n);
      const out = [];
      for (let i = 0; i < n; i++) out.push(collector.build(tick++, t));
      return out;
    },
    /** 1 tick ぶんの InputFrame */
    one() {
      return this.frame(1)[0];
    },
  };
}
