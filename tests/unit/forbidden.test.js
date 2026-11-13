// 不変条件1・5・9：シム（src/core・src/sim・src/gen）は時刻・乱数・DOM・音を知らない。
// localStorage は platform/storage.js だけ（09 2章）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importsOf, lineOf, listJs, maskSource, read } from './helpers/source.js';

/** シムで禁止する書き方（不変条件1）。 */
const TIME_RANDOM = [
  ['Math.random', /\bMath\s*\.\s*random\b/g],
  ['Date.now', /\bDate\s*\.\s*now\b/g],
  ['performance.now', /\bperformance\s*\.\s*now\b/g],
  ['new Date', /\bnew\s+Date\b/g],
  ['setTimeout', /\bsetTimeout\b/g],
  ['setInterval', /\bsetInterval\b/g],
  ['requestAnimationFrame', /\brequestAnimationFrame\b/g],
];
/** シムで禁止する名前（不変条件5）。 */
const DOM_AUDIO = ['window', 'document', 'navigator', 'localStorage', 'AudioContext', 'HTMLElement', 'addEventListener']
  .map((w) => /** @type {[string, RegExp]} */ ([w, new RegExp(`(?<![\\w$])${w}(?![\\w$])`, 'g')]));
/** three のうちシムが使ってよい数学クラス（09 1.4）。 */
const THREE_MATH = new Set(['Vector2', 'Vector3', 'Quaternion', 'Matrix3', 'Matrix4', 'Euler', 'MathUtils', 'Box3', 'Sphere', 'Ray', 'Plane', 'Line3', 'Triangle']);

/** 1ファイルの違反を返す。 @returns {string[]} */
export function findSimViolations(relPath, src) {
  const code = maskSource(src);
  const out = [];
  for (const [name, re] of [...TIME_RANDOM, ...DOM_AUDIO]) {
    for (const m of code.matchAll(re)) out.push(`${relPath}:${lineOf(code, m.index)} ${name}`);
  }
  for (const { spec, clause } of importsOf(src)) {
    if (spec !== 'three' && !spec.startsWith('three/')) continue;
    if (spec !== 'three') {
      out.push(`${relPath}: ${spec} はシムで使えない`);
      continue;
    }
    const named = /^\{([^}]*)\}$/.exec(clause);
    if (!named) {
      out.push(`${relPath}: three は名前付き import だけ`);
      continue;
    }
    for (const part of named[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0];
      if (name && !THREE_MATH.has(name)) out.push(`${relPath}: three の ${name} はシムで使えない（数学クラスのみ）`);
    }
  }
  return out;
}

const SIM_FILES = [...listJs('src/core'), ...listJs('src/sim'), ...listJs('src/gen')];

test('simNoTimeRandomDom：src/{core,sim,gen} に時刻・乱数・DOM・音が無い', () => {
  assert.ok(SIM_FILES.length >= 10);
  const all = SIM_FILES.flatMap((f) => findSimViolations(f, read(f)));
  assert.deepEqual(all, []);
});

test('detectsMathRandom：sim に Math.random を1行足すと失敗する（09受3）', () => {
  const src = read('src/sim/step.js');
  assert.deepEqual(findSimViolations('src/sim/step.js', src), []);
  const bad = `${src}\nexport const cheat = () => Math.random();\n`;
  const v = findSimViolations('src/sim/step.js', bad);
  assert.equal(v.length, 1);
  assert.match(v[0], /Math\.random/);
});

test('detectsEach：禁止の書き方を1つずつ検出する。コメントと文字列の中は対象外', () => {
  const samples = {
    'Math.random': 'const a = Math.random();',
    'Date.now': 'const a = Date.now();',
    'performance.now': 'const a = performance.now();',
    'new Date': 'const a = new Date();',
    setTimeout: 'setTimeout(() => {}, 1);',
    setInterval: 'setInterval(() => {}, 1);',
    requestAnimationFrame: 'requestAnimationFrame(f);',
    window: 'const w = window.innerWidth;',
    document: 'document.title = "x";',
    navigator: 'const n = navigator.userAgent;',
    localStorage: 'localStorage.setItem("a", "b");',
    AudioContext: 'const c = new AudioContext();',
    HTMLElement: 'const ok = x instanceof HTMLElement;',
    addEventListener: 'target.addEventListener("x", f);',
  };
  for (const [name, code] of Object.entries(samples)) {
    const v = findSimViolations('x.js', code);
    assert.ok(v.some((s) => s.includes(name)), `${name} を検出できない`);
  }
  assert.deepEqual(findSimViolations('x.js', '// Math.random と document は使わない\nconst s = "window.localStorage";\nconst t = `Date.now`;'), []);
  assert.deepEqual(findSimViolations('x.js', 'const windowSize = 1; const myDocument = 2; const randomMath = 3;'), []);
});

test('threeMathOnly：シムの three は名前付き import で数学クラスだけ', () => {
  assert.deepEqual(findSimViolations('x.js', "import { Vector3, Quaternion as Q } from 'three';"), []);
  assert.equal(findSimViolations('x.js', "import { Vector3, Mesh } from 'three';").length, 1);
  assert.equal(findSimViolations('x.js', "import * as THREE from 'three';").length, 1);
  assert.equal(findSimViolations('x.js', "import THREE from 'three';").length, 1);
  assert.equal(findSimViolations('x.js', "import { OrbitControls } from 'three/addons/controls/OrbitControls.js';").length, 1);
});

test('localStorageOnlyInStorage：localStorage を書いてよいのは platform/storage.js だけ', () => {
  const hits = [];
  for (const f of listJs('src')) {
    const code = maskSource(read(f));
    if (/(?<![\w$])localStorage(?![\w$])/.test(code)) hits.push(f);
  }
  assert.deepEqual(hits, ['src/platform/storage.js']);
});

test('simNoKeyOrderIteration：sim は for...in と Object.keys で反復しない（09 4.4）', () => {
  const hits = [];
  for (const f of listJs('src/sim')) {
    const code = maskSource(read(f));
    if (/\bfor\s*\(\s*(?:const|let|var)\s+[\w$]+\s+in\b/.test(code)) hits.push(`${f}: for...in`);
    if (/\bObject\s*\.\s*keys\b/.test(code)) hits.push(`${f}: Object.keys`);
  }
  assert.deepEqual(hits, []);
});
