// 不変条件8・11：数値は config と data だけ。色は THREE.Color を通す（色の直書きは config・data だけ）。
// 資源のパスは import.meta.env.BASE_URL 経由（'/assets' のような絶対パスを書かない。09 12.1）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineOf, listJs, maskSource, read } from './helpers/source.js';

const NUM_RE = /(?<![\w$.])(0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\.\d+)(?![\w$])/g;

/** 小数を含む数値リテラル、または絶対値が3以上の整数（同じ行に `// num-ok: 理由` があれば可）。 @returns {string[]} */
export function findNumberLiterals(relPath, src) {
  const code = maskSource(src);
  const rawLines = src.split('\n');
  const out = [];
  for (const m of code.matchAll(NUM_RE)) {
    const text = m[1];
    const line = lineOf(code, m.index);
    if (/\/\/\s*num-ok:\s*\S/.test(rawLines[line - 1])) continue;
    const isHex = /^0[xX]/.test(text);
    const isDecimal = !isHex && /[.eE]/.test(text);
    if (isDecimal || Math.abs(Number(text)) >= 3) out.push(`${relPath}:${line} 数値 ${text}`);
  }
  return out;
}

/** 0x で始まる6桁、または '#rrggbb'。 @returns {string[]} */
export function findColorLiterals(relPath, src) {
  const out = [];
  const code = maskSource(src);
  for (const m of code.matchAll(/\b0[xX][0-9a-fA-F]{6}\b/g)) out.push(`${relPath}:${lineOf(code, m.index)} 色 ${m[0]}`);
  const withStrings = maskSource(src, { strings: 'keep' });
  for (const m of withStrings.matchAll(/(['"`])#[0-9a-fA-F]{6}\1/g)) out.push(`${relPath}:${lineOf(withStrings, m.index)} 色 ${m[0]}`);
  return out;
}

/** '/assets/…' のような絶対パスの文字列。 @returns {string[]} */
export function findAbsolutePaths(relPath, src) {
  const out = [];
  const withStrings = maskSource(src, { strings: 'keep' });
  for (const m of withStrings.matchAll(/(['"`])\/[A-Za-z][\w./-]*\1/g)) out.push(`${relPath}:${lineOf(withStrings, m.index)} 絶対パス ${m[0]}`);
  return out;
}

const NUM_SCOPE = ['src/sim', 'src/render', 'src/input', 'src/ui', 'src/audio'].flatMap(listJs);
const ALL = listJs('src');
const COLOR_SCOPE = ALL.filter((f) => !f.startsWith('src/config/') && !f.startsWith('src/data/'));

test('noNumbersOutsideConfig：src/{sim,render,input,ui,audio} に数値の直書きが無い', () => {
  assert.ok(NUM_SCOPE.length >= 8);
  assert.deepEqual(NUM_SCOPE.flatMap((f) => findNumberLiterals(f, read(f))), []);
});

test('noColorsOutsideConfig：色の直書きは config・data だけ', () => {
  assert.ok(COLOR_SCOPE.length >= 20);
  assert.deepEqual(COLOR_SCOPE.flatMap((f) => findColorLiterals(f, read(f))), []);
});

test('noAbsolutePaths：資源を絶対パスで指さない', () => {
  assert.deepEqual(ALL.flatMap((f) => findAbsolutePaths(f, read(f))), []);
});

test('detectsNumbers：検出の規則そのもの', () => {
  const n = (code) => findNumberLiterals('x.js', code).length;
  assert.equal(n('const a = 0; const b = 1; const c = 2; const d = -1; const e = -2;'), 0);
  assert.equal(n('const a = 3;'), 1);
  assert.equal(n('const a = -5;'), 1);
  assert.equal(n('const a = 0.5;'), 1);
  assert.equal(n('const a = 1.0;'), 1);
  assert.equal(n('const a = .5;'), 1);
  assert.equal(n('const a = 1e3;'), 1);
  assert.equal(n('const a = 0x10;'), 1);
  assert.equal(n('const a = x * 60;'), 1);
  assert.equal(n('const a = v[3];'), 1);
  assert.equal(n('const a = v[0] + v[1] + v[2];'), 0);
  assert.equal(n('const v3 = new Vector3(); const m = new Matrix4(); const x1 = y2;'), 0); // 名前の中の数字は対象外
  assert.equal(n('const a = 60; // num-ok: 1秒のtick数を説明するための例'), 0);
  assert.equal(n('const a = 60; // num-ok:'), 1); // 理由が無ければ不可
  assert.equal(n('// 60Hz で 0.15 倍\n/* 4096 */ const a = 1;'), 0); // コメントの中
  assert.equal(n("const s = '110 以下'; const t = \"1.5\";"), 0); // 文字列の中
  assert.equal(n('const glsl = `float a = 0.5 * 3.0; ${name}`;'), 0); // テンプレート文字列（GLSL）の中
  assert.equal(n('const a = b / 2; const re = /\\d{3}/; const c = 7;'), 1); // 正規表現の中は対象外、7 だけ
});

test('detectsColors：検出の規則そのもの', () => {
  const c = (code) => findColorLiterals('x.js', code).length;
  assert.equal(c('const a = 0xe2452b;'), 1);
  assert.equal(c("const a = '#e2452b';"), 1);
  assert.equal(c('const a = "#EFE6D2";'), 1);
  assert.equal(c('const a = 0x811c9dc5; const b = 0xff; const d = 0xffff;'), 0); // 6桁でないものは色でない
  assert.equal(c('// 朱 #e2452b は情報専用'), 0);
  assert.equal(c("const a = new Color(cfg.palette.shu);"), 0);
});

test('detectsAbsolutePaths：検出の規則そのもの', () => {
  const p = (code) => findAbsolutePaths('x.js', code).length;
  assert.equal(p("const a = '/assets/x.png';"), 1);
  assert.equal(p("const a = '/audio/bgm/stage.m4a';"), 1);
  assert.equal(p("const a = `${import.meta.env.BASE_URL}audio/bgm/stage.m4a`;"), 0);
  assert.equal(p("const a = '../core/math.js'; const b = './x.js'; const c = 'a/b';"), 0);
  assert.equal(p('const re = /abc/; const d = a / b;'), 0);
});
