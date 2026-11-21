// 1フレームの描画。シムの状態を読み、補間して描くだけ（シムを import しない）。
// 試験場は灰色の仮表示（render/stage/sandboxView：地形・小道具・海・カプセル）。見た目の試作（lookdev）は専用の描画。
/** @import {Cfg} from '../config/index.js' */
import { Color, Scene } from 'three';
import { createCameraView } from './cameraView.js';
import { createLookdevView } from './lookdev/view.js';
import { createSandboxView } from './stage/sandboxView.js';

/** 見た目の試作（V1）の場面。この場面だけ専用の描画（render/lookdev）へ任せる。 */
const LOOKDEV_STAGE = 'lookdev';

/**
 * @param {ReturnType<typeof import('./renderer.js').createRenderer>} renderer
 * @param {Cfg} cfg
 */
export function createFrame(renderer, cfg, opts = {}) {
  const scene = new Scene();
  const cameraView = createCameraView(cfg);
  const bg = new Color(cfg.debug.grayBgColor);
  scene.background = bg;

  const sandbox = createSandboxView(cfg);
  let hasWorld = false;
  /** @type {ReturnType<typeof createLookdevView>|null} 見た目の試作の描画（その場面を開いたときに作る） */
  let lookdev = null;
  let useLookdev = false;

  function clear() {
    scene.remove(sandbox.root);
    hasWorld = false;
  }

  return {
    /**
     * 場面の見た目を作り直す。床はステージのデータ（衝突と同じもの）から作る。
     * @param {{stage:import('../data/types.js').StageDef, player:{capsule:{rM:number, hM:number}}}} world
     */
    async setWorld(world) {
      clear();
      useLookdev = world.stage.id === LOOKDEV_STAGE;
      if (useLookdev) {
        lookdev ??= createLookdevView(renderer, cfg, opts);
        await lookdev.setWorld(world);
        return;
      }
      sandbox.setWorld(world);
      scene.add(sandbox.root);
      hasWorld = true;
    },
    /**
     * @param {any} world シムのワールド（読むだけ）
     * @param {number} alpha 前tick→今tickの補間（0〜1）
     */
    render(world, alpha) {
      if (useLookdev && lookdev) {
        lookdev.render(world, alpha);
        return;
      }
      if (!hasWorld) return;
      // 調整パネルで変えた値を反映する
      bg.set(cfg.debug.grayBgColor);
      sandbox.render(world, alpha, renderer.three.getPixelRatio());

      const [w, h] = renderer.viewPx();
      cameraView.update(world.camera, alpha, w / h);
      renderer.draw(scene, cameraView.three);
    },
    dispose() {
      clear();
      sandbox.dispose();
      lookdev?.dispose();
    },
  };
}
