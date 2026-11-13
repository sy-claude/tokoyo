// config の組立（09 1.4）。ConfigTable（設定の表）から、値だけの読みやすい形 cfg を作る。
// 表そのものは src/config/*.js にあり、core は config を import しない（呼ぶ側が表を渡す）。
/** @import {ConfigTable} from '../data/types.js' */
import { hasUnitSuffix } from './units.js';

function cloneValue(v) {
  return typeof v === 'object' && v !== null ? structuredClone(v) : v;
}

function sameValue(a, b) {
  if (typeof a === 'object' || typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b);
  return a === b;
}

/**
 * 表の集まりから cfg を作る。cfg.<表>.<キー> が値。
 * @template {Record<string, ConfigTable>} T
 * @param {T} tables
 * @returns {{[K in keyof T]: {[P in keyof T[K]]: T[K][P]['v']}}}
 */
export function buildConfig(tables) {
  /** @type {any} */
  const cfg = {};
  for (const [tableName, table] of Object.entries(tables)) {
    cfg[tableName] = {};
    for (const [key, entry] of Object.entries(table)) cfg[tableName][key] = cloneValue(entry.v);
  }
  return cfg;
}

/** 'movement.runSpeedMps' や 'quality.dprMaxMul.high' を分解して、置き場と既定値を返す。無ければ null。 */
function resolvePath(cfg, tables, path) {
  const parts = path.split('.');
  if (parts.length < 2) return null;
  const [tableName, key, ...rest] = parts;
  const entry = tables[tableName]?.[key];
  if (!entry) return null;
  let holder = cfg[tableName];
  let prop = key;
  let def = entry.v;
  for (const p of rest) {
    if (typeof def !== 'object' || def === null || !(p in def)) return null;
    holder = holder[prop];
    def = def[p];
    prop = p;
  }
  return { holder, prop, def, entry };
}

/** @returns {unknown} 値（無いパスは undefined） */
export function getConfigValue(cfg, tables, path) {
  const r = resolvePath(cfg, tables, path);
  return r ? r.holder[r.prop] : undefined;
}

/**
 * 値を1つ変える。パスが無い、または型が既定値と違うときは例外。
 * @param {string} path 例 'movement.runSpeedMps'
 */
export function setConfigValue(cfg, tables, path, v) {
  const r = resolvePath(cfg, tables, path);
  if (!r) throw new Error(`config: 無いキー ${path}`);
  if (typeof v !== typeof r.def) throw new Error(`config: 型が違う ${path}（${typeof r.def} が必要）`);
  if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`config: 数値でない ${path}`);
  r.holder[r.prop] = cloneValue(v);
}

/** 既定から変えたキーだけを { 'movement.runSpeedMps': 7 } の形で返す（調整パネルの「JSONをコピー」）。 */
export function diffConfig(cfg, tables) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [tableName, table] of Object.entries(tables)) {
    for (const [key, entry] of Object.entries(table)) {
      const cur = cfg[tableName][key];
      if (!sameValue(cur, entry.v)) out[`${tableName}.${key}`] = cloneValue(cur);
    }
  }
  return out;
}

/** diffConfig の形の上書きを適用する。無いキー・型の違う値は捨てて、捨てたキーを返す。 */
export function applyConfigOverrides(cfg, tables, overrides) {
  const rejected = [];
  for (const [path, v] of Object.entries(overrides ?? {})) {
    const r = resolvePath(cfg, tables, path);
    if (!r || typeof v !== typeof r.def) {
      rejected.push(path);
      continue;
    }
    r.holder[r.prop] = cloneValue(v);
  }
  return rejected;
}

/** 全キーを既定値へ戻す。 */
export function resetConfig(cfg, tables) {
  for (const [tableName, table] of Object.entries(tables)) {
    for (const [key, entry] of Object.entries(table)) cfg[tableName][key] = cloneValue(entry.v);
  }
}

/**
 * 表の検査（configKeys.test・config.test が使う）。問題の一覧を返す（空なら合格）。
 * - 数値スカラーのキーは単位の接尾辞で終わる（09 2章8）。
 * - 説明 desc がある。min ≤ v ≤ max。
 * @param {Record<string, ConfigTable>} tables
 */
export function checkTables(tables) {
  const problems = [];
  for (const [tableName, table] of Object.entries(tables)) {
    for (const [key, entry] of Object.entries(table)) {
      const where = `${tableName}.${key}`;
      if (typeof entry !== 'object' || entry === null || !('v' in entry)) {
        problems.push(`${where}: ConfigEntry の形でない`);
        continue;
      }
      if (typeof entry.desc !== 'string' || entry.desc.length === 0) problems.push(`${where}: desc が無い`);
      if (typeof entry.v === 'number') {
        if (!Number.isFinite(entry.v)) problems.push(`${where}: 数値でない`);
        if (!hasUnitSuffix(key)) problems.push(`${where}: 単位の接尾辞が無い`);
        if (entry.min !== undefined && entry.v < entry.min) problems.push(`${where}: min より小さい`);
        if (entry.max !== undefined && entry.v > entry.max) problems.push(`${where}: max より大きい`);
        if (entry.min !== undefined && entry.max !== undefined && entry.min > entry.max) problems.push(`${where}: min > max`);
      }
    }
  }
  return problems;
}
