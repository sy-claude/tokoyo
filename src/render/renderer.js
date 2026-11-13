// レンダラー（09 8.1。最小）。後処理（紙墨パス）と品質の自動降格は M1b。
/** @import {Cfg, QualityLevel} from '../config/index.js' */
import { NoToneMapping, SRGBColorSpace, WebGLRenderer } from 'three';

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Cfg} cfg
 * @param {QualityLevel} quality
 */
export function createRenderer(canvas, cfg, quality) {
  const three = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    stencil: false,
    depth: true,
    powerPreference: 'high-performance',
  });
  three.outputColorSpace = SRGBColorSpace;
  three.toneMapping = NoToneMapping;
  three.info.autoReset = false; // 1フレームの最初に reset し、後処理まで合算する
  let level = quality;
  let viewW = 1;
  let viewH = 1;
  const last = { calls: 0, triangles: 0 };

  function applySize() {
    three.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, cfg.quality.dprMaxMul[level]));
    three.setSize(viewW, viewH, false);
  }

  return {
    three,
    /** 画面の大きさ（CSS px）を伝える。 */
    resize(w, h) {
      viewW = Math.max(1, Math.floor(w));
      viewH = Math.max(1, Math.floor(h));
      applySize();
    },
    /** @param {QualityLevel} q */
    setQuality(q) {
      level = q;
      applySize();
    },
    get quality() {
      return level;
    },
    /** @returns {[number, number]} 画面の幅・高さ（CSS px） */
    viewPx() {
      return [viewW, viewH];
    },
    /** 1フレームを描く。描画命令の数を数え直す。 */
    draw(scene, camera) {
      three.info.reset();
      three.render(scene, camera);
      last.calls = three.info.render.calls;
      last.triangles = three.info.render.triangles;
    },
    /** 直前に描いたフレームの情報。 */
    info() {
      return {
        calls: last.calls,
        triangles: last.triangles,
        programs: three.info.programs ? three.info.programs.length : 0,
        pixelRatio: three.getPixelRatio(),
        quality: level,
      };
    },
  };
}
