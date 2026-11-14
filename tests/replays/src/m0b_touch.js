// M0b のリプレイ：指の入力層（pointerRouter＋collector）を通した、スティックとカメラ（360tick）。
// 基準端末の配置で、左の親指のスティックと右のなぞり（2本同時を含む）を合成する。
// 入力層の換算（感度・不感帯・追従・camDeg の等分）か、仮の移動とカメラが変わるとハッシュが変わる。
import { buildConfig } from '../../../src/core/config.js';
import { configTables } from '../../../src/config/index.js';
import { createCollector } from '../../../src/input/collector.js';
import { createPointerRouter } from '../../../src/input/pointerRouter.js';
import { computeLayout } from '../../../src/input/layout.js';

export const meta = { scene: 'sandbox', char: 'fuma', seed: 1 };

const STICK = 1;
const CAM = 2;

export function frames() {
  const cfg = buildConfig(configTables);
  const settings = { ...cfg.settings };
  const insets = { l: cfg.layout.layoutRefInsetSidePx, r: cfg.layout.layoutRefInsetSidePx, t: 0, b: cfg.layout.layoutRefInsetBottomPx };
  const [W, H] = cfg.input.refViewPx;
  const layout = computeLayout(W, H, insets, settings, cfg.layout);
  const collector = createCollector(cfg.input, cfg.time.tickRateHz);
  const router = createPointerRouter({
    inputCfg: cfg.input,
    cameraCfg: cfg.camera,
    collector,
    getLayout: () => layout,
    getSettings: () => settings,
  });
  const stepMs = 1000 / cfg.time.tickRateHz;
  /** @type {import('../../../src/data/types.js').InputFrame[]} */
  const out = [];
  let t = 0;
  /** n 描画ぶん進める（1描画＝ticksPerFrame tick） */
  const run = (n, ticksPerFrame = 1, each = () => {}) => {
    for (let i = 0; i < n; i++) {
      each(i);
      t += stepMs * ticksPerFrame;
      collector.startFrame(ticksPerFrame);
      for (let k = 0; k < ticksPerFrame; k++) out.push(collector.build(out.length, t, [W, H]));
    }
  };
  // 1. 何もしない
  run(20);
  // 2. 左の親指：触れて前へ（上へ）少しずつ倒す → 走る
  router.down({ id: STICK, x: 130, y: 280, t });
  run(40, 1, (i) => router.move({ id: STICK, x: 130, y: 280 - Math.min(70, i * 3), t }));
  // 3. 前へ倒したまま、右のなぞりでゆっくり右を見る（2本同時。1描画で2tick 進む区間を含む）
  router.down({ id: CAM, x: 480, y: 160, t });
  run(12); // はじきの時間窓を過ぎるまで待つ
  run(30, 2, (i) => router.move({ id: CAM, x: 480 + i * 4, y: 160 + (i % 5), t }));
  // 4. カメラの指だけ離す → スティックは続く。右斜め前へ
  router.up({ id: CAM, x: 600, y: 164, t });
  run(40, 1, (i) => router.move({ id: STICK, x: 130 + i, y: 230, t }));
  // 5. スティックを離す → 止まる。上下のなぞりで見下ろす
  router.up({ id: STICK, x: 170, y: 230, t });
  router.down({ id: CAM, x: 500, y: 120, t });
  run(12);
  run(40, 1, (i) => router.move({ id: CAM, x: 500, y: 120 + i * 2, t }));
  router.up({ id: CAM, x: 500, y: 200, t });
  // 6. 固定の時間まで中立
  run(360 - out.length);
  return out.slice(0, 360);
}
