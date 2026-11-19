// URL 引数（09 10.1）。純関数。
/** @import {QualityLevel} from '../config/index.js' */

const SCENES = ['sandbox', 'stage', 'boss', 'fu-test', 'title', 'lookdev'];
const CHARS = ['fuma', 'shirayuki', 'ganjo'];
const QUALITIES = ['high', 'mid', 'low'];

/**
 * @param {string} search 例 '?test=1&seed=3&scene=sandbox'
 * @returns {{debug:boolean, test:boolean, audio:boolean, bench:boolean, benchS:number|null, seed:number,
 *   scene:string|null, char:string, q:QualityLevel|null, model:string|null, focus:string|null, anim:string|null, view:number[]|null}}
 */
export function parseUrlParams(search) {
  const p = new URLSearchParams(search);
  const flag = (k) => p.get(k) === '1';
  const seedRaw = Number.parseInt(p.get('seed') ?? '', 10);
  const benchRaw = Number.parseFloat(p.get('benchS') ?? '');
  const scene = p.get('scene');
  const char = p.get('char');
  const q = p.get('q');
  const model = p.get('model');
  const focus = p.get('focus');
  const anim = p.get('anim');
  const view = (p.get('view') ?? '').split(',').map(Number);
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
    // 工房（docs/12 4章）：?scene=lookdev&model=形の名前 で、その形だけを大きく映す
    model: model !== null && /^[A-Za-z0-9]+$/.test(model) ? model : null,
    // 工房の寄り：&focus=head など（data/lookdev/scene.js の atelier.focus に登録した名前）
    focus: focus !== null && /^[A-Za-z0-9]+$/.test(focus) ? focus : null,
    // 工房の動き：&anim=walk|run（主人公をその速さで歩かせて見る）
    anim: anim === 'walk' || anim === 'run' ? anim : null,
    // 工房の視点の固定：&view=横の向き,縦の向き（度）
    view: view.length === 2 && view.every(Number.isFinite) ? view : null,
  };
}
