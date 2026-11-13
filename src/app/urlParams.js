// URL 引数（09 10.1）。純関数。
/** @import {QualityLevel} from '../config/index.js' */

const SCENES = ['sandbox', 'stage', 'boss', 'fu-test', 'title'];
const CHARS = ['fuma', 'shirayuki', 'ganjo'];
const QUALITIES = ['high', 'mid', 'low'];

/**
 * @param {string} search 例 '?test=1&seed=3&scene=sandbox'
 * @returns {{debug:boolean, test:boolean, audio:boolean, bench:boolean, benchS:number|null, seed:number,
 *   scene:string|null, char:string, q:QualityLevel|null}}
 */
export function parseUrlParams(search) {
  const p = new URLSearchParams(search);
  const flag = (k) => p.get(k) === '1';
  const seedRaw = Number.parseInt(p.get('seed') ?? '', 10);
  const benchRaw = Number.parseFloat(p.get('benchS') ?? '');
  const scene = p.get('scene');
  const char = p.get('char');
  const q = p.get('q');
  return {
    debug: flag('debug'),
    test: flag('test'),
    audio: flag('audio'),
    bench: flag('bench'),
    benchS: Number.isFinite(benchRaw) && benchRaw > 0 ? benchRaw : null,
    seed: Number.isInteger(seedRaw) ? seedRaw : 1,
    scene: scene !== null && SCENES.includes(scene) ? scene : null,
    char: char !== null && CHARS.includes(char) ? char : 'fuma',
    q: q !== null && QUALITIES.includes(q) ? /** @type {QualityLevel} */ (q) : null,
  };
}
