// レンダラー（07 3.1、09 8.1）。場面の描画先と紙墨パス（07 3.2 の手順2・3）、品質の自動降格は M1b。
/** @import {Cfg, QualityLevel} from '../config/index.js' */
import { ColorManagement, NoToneMapping, SRGBColorSpace, WebGLRenderer } from 'three';
import { warmupScene } from './warmup.js';

/** config の文字列 → three の定数（07 3.1 の表にある値だけ） */
const TONE_MAPPINGS = { NoToneMapping };
const COLOR_SPACES = { SRGBColorSpace };

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Cfg} cfg
 * @param {QualityLevel} quality
 */
export function createRenderer(canvas, cfg, quality) {
  const rc = cfg.render;
  ColorManagement.enabled = true;
  const three = new WebGLRenderer({
    canvas,
    antialias: rc.rendererAntialias,
    alpha: rc.rendererAlpha,
    stencil: rc.rendererStencil,
    depth: true,
    powerPreference: rc.rendererPowerPreference,
  });
  three.outputColorSpace = COLOR_SPACES[rc.outputColorSpace] ?? SRGBColorSpace;
  three.toneMapping = TONE_MAPPINGS[rc.toneMapping] ?? NoToneMapping;
  three.info.autoReset = false; // 1フレームの最初に reset し、後処理まで合算する
  let level = quality;
  let viewW = 1;
  let viewH = 1;
  const last = { calls: 0, triangles: 0 };
  const warm = { compileCalls: 0, programs: 0 };

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
    /** 事前コンパイル（09 8.7）。全材質を1つずつ置いた場面を渡す。 */
    warmup(scene, camera) {
      warm.programs = warmupScene(three, scene, camera);
      warm.compileCalls += 1;
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
        compileCalls: warm.compileCalls,
        programsAtWarmup: warm.programs,
      };
    },
  };
}
