// 依存の向き（09 1.4）。import 文を読んで検査する。JSDoc の @import（型だけ）は検査しない。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { posix } from 'node:path';
import { importsOf, listJs, read } from './helpers/source.js';
import { stepWorld } from '../../src/sim/step.js';

/** 読む側の層 → 読んでよい層。自分の層は常に読める。 */
const ALLOWED = {
  core: [],
  config: ['core/units'],
  data: ['core/units'],
  platform: ['core', 'config'],
  gen: ['core', 'config', 'data'],
  sim: ['core', 'config', 'data', 'gen'],
  input: ['core', 'config'],
  render: ['core', 'config', 'data', 'gen'],
  ui: ['core', 'config', 'data', 'input/layout'],
  audio: ['core', 'config', 'data', 'input/layout'],
  app: '*',
  debug: '*',
  types: [],
};
/** three を読んでよい層（core・gen・sim は数学クラスのみ＝forbidden.test が検査）。 */
const THREE_OK = new Set(['core', 'gen', 'sim', 'render', 'app', 'debug']);
/** 例外：data/validate.js は config も読んでよい（09 1.4）。 */
const EXTRA = { 'src/data/validate.js': ['config'] };

/** @returns {string[]} */
export function findImportViolations(relPath, src) {
  const out = [];
  const inSrc = relPath.slice('src/'.length);
  const layer = inSrc.includes('/') ? inSrc.split('/')[0] : 'main';
  for (const { spec } of importsOf(src)) {
    if (!spec.startsWith('.')) {
      const isThree = spec === 'three' || spec.startsWith('three/');
      if (!isThree) out.push(`${relPath}: 外部パッケージ ${spec} は使えない`);
      else if (!THREE_OK.has(layer)) out.push(`${relPath}: ${layer} は three を読めない`);
      continue;
    }
    const target = posix.normalize(posix.join(posix.dirname(relPath), spec));
    if (!target.startsWith('src/')) {
      out.push(`${relPath}: src の外 ${spec} は読めない`);
      continue;
    }
    const tIn = target.slice('src/'.length).replace(/\.js$/, '');
    const tLayer = tIn.split('/')[0];
    if (layer === 'main') {
      if (tLayer !== 'app') out.push(`${relPath}: main.js が読めるのは app だけ`);
      continue;
    }
    if (tLayer === layer) continue;
    const allowed = ALLOWED[layer];
    if (allowed === undefined) {
      out.push(`${relPath}: 知らない層 ${layer}（09 1.4 に無いフォルダ）`);
      continue;
    }
    if (allowed === '*') continue;
    const list = [...allowed, ...(EXTRA[relPath] ?? [])];
    const ok = list.some((a) => (a.includes('/') ? tIn === a : tLayer === a));
    if (!ok) out.push(`${relPath}: ${layer} は ${tIn} を読めない`);
  }
  return out;
}

test('layerDirections：全ファイルの import が 09 1.4 の向きを守る', () => {
  const files = listJs('src');
  assert.ok(files.length >= 30);
  const all = files.flatMap((f) => findImportViolations(f, read(f)));
  assert.deepEqual(all, []);
});

test('detectsViolations：向きの違反を検出する', () => {
  const v = (path, code) => findImportViolations(path, code).length;
  assert.equal(v('src/render/a.js', "import { stepWorld } from '../sim/step.js';"), 1); // render は sim を読まない（不変条件3）
  assert.equal(v('src/sim/a.js', "import { createKeyboard } from '../input/keyboard.js';"), 1); // sim は input を読まない（不変条件4）
  assert.equal(v('src/sim/a.js', "import { createFrame } from '../render/frame.js';"), 1);
  assert.equal(v('src/core/a.js', "import { time } from '../config/time.js';"), 1);
  assert.equal(v('src/config/a.js', "import { clamp } from '../core/math.js';"), 1);
  assert.equal(v('src/config/a.js', "import { sToTicks } from '../core/units.js';"), 0);
  assert.equal(v('src/data/a.js', "import { time } from '../config/time.js';"), 1);
  assert.equal(v('src/data/validate.js', "import { time } from '../config/time.js';"), 0);
  assert.equal(v('src/input/a.js', "import { Vector2 } from 'three';"), 1);
  assert.equal(v('src/ui/a.js', "import { computeLayout } from '../input/layout.js';"), 0);
  assert.equal(v('src/ui/a.js', "import { createKeyboard } from '../input/keyboard.js';"), 1);
  assert.equal(v('src/platform/a.js', "import { x } from '../sim/world.js';"), 1);
  assert.equal(v('src/app/a.js', "import { x } from '../sim/world.js'; import { y } from '../render/frame.js';"), 0);
  assert.equal(v('src/render/a.js', "import lodash from 'lodash';"), 1);
  assert.equal(v('src/sim/a.js', "/** @import {X} from '../render/frame.js' */\nexport const a = 1;"), 0); // 型だけは検査しない
  assert.equal(v('src/render/a.js', "const m = await import('../sim/step.js');"), 1);
});

test('stepWorldArity：stepWorld の引数は2つ（world と InputFrame。不変条件4）', () => {
  assert.equal(stepWorld.length, 2);
});
