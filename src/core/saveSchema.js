// 保存データの形・移行・引き継ぎ文字列（09 9章）。localStorage には触らない（platform/storage.js だけが触る）。
// 項目ごとの細かい検証（強化・retry など）は 06 6〜8章の実装（M9b）で足す。
/** @import {SaveDataV1} from '../data/types.js' */

/** 現在の保存の版。config/save.js の saveVersionCount と同じ値（config.test が照合する）。 */
export const SAVE_VERSION = 1;

const HANDOFF_PREFIX = 'TKY1';
const HANDOFF_RE = /^TKY1\.([A-Za-z0-9_-]+)\.([0-9a-f]{8})$/;

/**
 * 移行関数。migrations[v] が v → v+1 に変える純関数。v1 が最初の版なので今は空。
 * @type {Record<number, (old:any)=>any>}
 */
export const MIGRATIONS = {};

/** @returns {SaveDataV1} 既定値 */
export function defaultSave() {
  return {
    v: 1,
    updatedAt: 0,
    tamakake: 0,
    upgrades: {},
    esekiTaken: [],
    tutorialDone: false,
    clears: {},
    retry: null,
    settings: {},
  };
}

function isPlainObject(x) {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** 型の合わない最上位の項目を既定値に置き換える（壊れた項目で落ちないため）。 */
function sanitize(obj) {
  const d = defaultSave();
  /** @type {any} */
  const out = { ...d };
  if (Number.isFinite(obj.updatedAt)) out.updatedAt = obj.updatedAt;
  if (Number.isInteger(obj.tamakake) && obj.tamakake >= 0) out.tamakake = obj.tamakake;
  if (isPlainObject(obj.upgrades)) out.upgrades = obj.upgrades;
  if (Array.isArray(obj.esekiTaken)) out.esekiTaken = obj.esekiTaken.filter((s) => typeof s === 'string');
  if (typeof obj.tutorialDone === 'boolean') out.tutorialDone = obj.tutorialDone;
  if (isPlainObject(obj.clears)) out.clears = obj.clears;
  if (isPlainObject(obj.retry)) out.retry = obj.retry;
  if (isPlainObject(obj.settings)) out.settings = obj.settings;
  if (typeof obj.lastCharId === 'string') out.lastCharId = obj.lastCharId;
  out.v = SAVE_VERSION;
  return /** @type {SaveDataV1} */ (out);
}

/**
 * 解析済みの値を、現在の版の保存データにする。
 * @param {unknown} obj
 * @param {{current?:number, migrations?:Record<number,(old:any)=>any>}} [opts] 試験用に版と移行関数を差し替えられる
 * @returns {{ok:true, data:SaveDataV1, migrated:boolean} | {ok:false, reason:'noVersion'|'future'|'noMigration'}}
 */
export function upgradeSave(obj, opts = {}) {
  const current = opts.current ?? SAVE_VERSION;
  const migrations = opts.migrations ?? MIGRATIONS;
  if (!isPlainObject(obj)) return { ok: false, reason: 'noVersion' };
  /** @type {any} */
  let cur = obj;
  if (!Number.isInteger(cur.v) || cur.v < 1) return { ok: false, reason: 'noVersion' };
  if (cur.v > current) return { ok: false, reason: 'future' };
  let migrated = false;
  while (cur.v < current) {
    const fn = migrations[cur.v];
    if (!fn) return { ok: false, reason: 'noMigration' };
    const from = cur.v;
    cur = fn(structuredClone(cur));
    if (!isPlainObject(cur) || cur.v !== from + 1) return { ok: false, reason: 'noMigration' };
    migrated = true;
  }
  return { ok: true, data: current === SAVE_VERSION ? sanitize(cur) : cur, migrated };
}

/**
 * 保存の文字列を読む。壊れている・版が無い・未来の版 → backup=true（呼ぶ側が .bak に退避）で既定値。
 * @param {string|null} text
 * @param {{current?:number, migrations?:Record<number,(old:any)=>any>}} [opts]
 * @returns {{data:SaveDataV1, status:'empty'|'ok'|'migrated'|'notJson'|'noVersion'|'future'|'noMigration', backup:boolean}}
 */
export function parseSaveText(text, opts = {}) {
  if (text === null || text === undefined) return { data: defaultSave(), status: 'empty', backup: false };
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    return { data: defaultSave(), status: 'notJson', backup: true };
  }
  const r = upgradeSave(obj, opts);
  if (!r.ok) return { data: defaultSave(), status: r.reason, backup: true };
  return { data: r.data, status: r.migrated ? 'migrated' : 'ok', backup: false };
}

/** 保存データ → 文字列。 */
export function serializeSave(data) {
  return JSON.stringify(data);
}

// ---- 引き継ぎ文字列：TKY1. ＋ base64url(UTF-8 の JSON) ＋ . ＋ CRC32 の16進8桁 ----
// 検査値は base64url の文字列に対して計算する（末尾の余りビットだけを変えた文字列も確実に拒否するため）。

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function bytesToB64u(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64[b0 >> 2] + B64[((b0 & 3) << 4) | (b1 >> 4)];
    if (i + 1 < bytes.length) out += B64[((b1 & 15) << 2) | (b2 >> 6)];
    if (i + 2 < bytes.length) out += B64[b2 & 63];
  }
  return out;
}

function b64uToBytes(str) {
  if (str.length % 4 === 1) return null;
  const n = Math.floor((str.length * 3) / 4);
  const out = new Uint8Array(n);
  let acc = 0;
  let bits = 0;
  let o = 0;
  for (let i = 0; i < str.length; i++) {
    const v = B64.indexOf(str[i]);
    if (v < 0) return null;
    acc = ((acc << 6) | v) & 0xffff; // 使うのは下位14bitまで
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 0xff;
    }
  }
  return out;
}

let crcTable = null;
function crc32OfString(s) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < s.length; i++) crc = crcTable[(crc ^ s.charCodeAt(i)) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** 保存データ → 引き継ぎ文字列。 @param {SaveDataV1} data */
export function encodeHandoff(data) {
  const body = bytesToB64u(new TextEncoder().encode(JSON.stringify(data)));
  return `${HANDOFF_PREFIX}.${body}.${crc32OfString(body).toString(16).padStart(8, '0')}`;
}

/**
 * 引き継ぎ文字列 → 保存データ。形・検査値・版を確かめてから移行する。
 * @param {string} str
 * @returns {{ok:true, data:SaveDataV1} | {ok:false, reason:'format'|'checksum'|'decode'|'noVersion'|'future'|'noMigration'}}
 */
export function decodeHandoff(str) {
  const m = HANDOFF_RE.exec(String(str).trim());
  if (!m) return { ok: false, reason: 'format' };
  const [, body, sum] = m;
  if (crc32OfString(body).toString(16).padStart(8, '0') !== sum) return { ok: false, reason: 'checksum' };
  const bytes = b64uToBytes(body);
  if (!bytes) return { ok: false, reason: 'decode' };
  let obj;
  try {
    obj = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return { ok: false, reason: 'decode' };
  }
  const r = upgradeSave(obj);
  if (!r.ok) return { ok: false, reason: r.reason };
  return { ok: true, data: r.data };
}
