// ソースを読んで検査するための補助（不変条件の検査群：forbidden・imports・literals が使う）。
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const SRC = join(ROOT, 'src');

/** dir 以下の .js を再帰で集める（リポジトリ相対のパス、区切りは /）。 */
export function listJs(dir) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.js')) out.push(relative(ROOT, p).split(sep).join('/'));
    }
  };
  try {
    walk(join(ROOT, dir));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e; // まだ無いフォルダ（ui・audio・gen など）は空として扱う
  }
  return out;
}

export function read(relPath) {
  return readFileSync(join(ROOT, relPath), 'utf8');
}

const REGEX_PREV = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);
const REGEX_WORDS = new Set(['return', 'typeof', 'case', 'in', 'of', 'do', 'else', 'void', 'delete', 'throw', 'new', 'yield', 'await']);

/**
 * ソースの長さと行を保ったまま、コメントを空白にする。
 * strings='blank' なら文字列・テンプレート文字列（GLSL を含む）・正規表現の中身も空白にする。
 * @param {string} src @param {{strings?:'keep'|'blank'}} [o]
 */
export function maskSource(src, o = {}) {
  const blankStrings = (o.strings ?? 'blank') === 'blank';
  const n = src.length;
  let out = '';
  let i = 0;
  let lastSig = '';
  let word = '';
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') {
      let j = i;
      while (j < n && src[j] !== '\n') j++;
      out += blank(src.slice(i, j));
      i = j;
      continue;
    }
    if (c === '/' && d === '*') {
      let j = src.indexOf('*/', i + 2);
      j = j < 0 ? n : j + 2;
      out += blank(src.slice(i, j));
      i = j;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
      j = Math.min(n, j + 1);
      const s = src.slice(i, j);
      out += blankStrings ? c + blank(s.slice(1, -1)) + c : s;
      i = j;
      lastSig = c;
      word = '';
      continue;
    }
    if (c === '`') {
      // テンプレート文字列：${ } の中も含めて1つの文字列として扱う（入れ子の ` は1段まで）
      let j = i + 1;
      let depth = 0;
      while (j < n) {
        const ch = src[j];
        if (ch === '\\') {
          j += 2;
          continue;
        }
        if (depth === 0 && ch === '`') break;
        if (ch === '$' && src[j + 1] === '{') {
          depth += 1;
          j += 2;
          continue;
        }
        if (depth > 0 && ch === '{') depth += 1;
        else if (depth > 0 && ch === '}') depth -= 1;
        else if (depth > 0 && ch === '`') {
          j += 1;
          while (j < n && src[j] !== '`') j += src[j] === '\\' ? 2 : 1;
        }
        j += 1;
      }
      j = Math.min(n, j + 1);
      const s = src.slice(i, j);
      out += blankStrings ? '`' + blank(s.slice(1, -1)) + '`' : s;
      i = j;
      lastSig = '`';
      word = '';
      continue;
    }
    if (c === '/' && (REGEX_PREV.has(lastSig) || REGEX_WORDS.has(word))) {
      // 正規表現リテラル
      let j = i + 1;
      let inClass = false;
      while (j < n && src[j] !== '\n') {
        const ch = src[j];
        if (ch === '\\') {
          j += 2;
          continue;
        }
        if (ch === '[') inClass = true;
        else if (ch === ']') inClass = false;
        else if (ch === '/' && !inClass) break;
        j += 1;
      }
      j = Math.min(n, j + 1);
      while (j < n && /[a-z]/.test(src[j])) j++;
      const s = src.slice(i, j);
      out += blankStrings ? '/' + blank(s.slice(1)) : s;
      i = j;
      lastSig = ')';
      word = '';
      continue;
    }
    out += c;
    if (/[A-Za-z_$]/.test(c)) {
      word = /[A-Za-z_$0-9]/.test(src[i - 1] ?? '') ? word + c : c;
      lastSig = c;
    } else if (!/\s/.test(c)) {
      if (!/[0-9]/.test(c)) word = '';
      lastSig = c;
    }
    i += 1;
  }
  return out;
}

/** 行番号（1始まり）を返す。 */
export function lineOf(src, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (src[i] === '\n') line += 1;
  return line;
}

/** import 文の読み先を集める（JSDoc の @import はコメントなので含まれない）。 @returns {{spec:string, clause:string}[]} */
export function importsOf(src) {
  const code = maskSource(src, { strings: 'keep' });
  const out = [];
  const res = [
    /\bimport\s+([^'"`;()]*?)\s*from\s*['"]([^'"]+)['"]/g,
    /\bexport\s+([^'"`;()]*?)\s*from\s*['"]([^'"]+)['"]/g,
  ];
  for (const re of res) {
    for (const m of code.matchAll(re)) out.push({ spec: m[2], clause: m[1].trim() });
  }
  for (const m of code.matchAll(/\bimport\s*['"]([^'"]+)['"]/g)) out.push({ spec: m[1], clause: '' });
  for (const m of code.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) out.push({ spec: m[1], clause: '*' });
  return out;
}
