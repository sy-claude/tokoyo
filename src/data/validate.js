// data の検証関数。問題の一覧（文字列）を返す。空なら合格。
// M0a はステージの骨組みだけを見る。技・敵・キャラなどの検証は、その data を作るMで足す。
/** @import {StageDef} from './types.js' */
import { collision } from '../config/collision.js';

function isV3(v) {
  return Array.isArray(v) && v.length === 3 && v.every((n) => Number.isFinite(n));
}

/** @param {StageDef} def @returns {string[]} */
export function validateStage(def) {
  const errs = [];
  const at = `stage ${def?.id ?? '?'}`;
  if (typeof def.id !== 'string' || def.id.length === 0) errs.push(`${at}: id が無い`);
  if (!Number.isInteger(def.seed)) errs.push(`${at}: seed は整数`);
  if (!Array.isArray(def.sizeM) || def.sizeM.length !== 2 || !(def.sizeM[0] > 0) || !(def.sizeM[1] > 0)) {
    errs.push(`${at}: sizeM は正の [x幅, z奥行]`);
    return errs;
  }
  if (def.cellM !== collision.terrainCellM.v) errs.push(`${at}: cellM は config の terrainCellM と同じにする`);
  if (!Number.isFinite(def.seaLevelM)) errs.push(`${at}: seaLevelM が数値でない`);
  if (typeof def.terrain?.gen !== 'string') errs.push(`${at}: terrain.gen が無い`);
  for (const key of ['paths', 'zones', 'props', 'spawns', 'eseki', 'eiki', 'ryuketsu', 'checkpoints']) {
    if (!Array.isArray(def[key])) errs.push(`${at}: ${key} は配列`);
  }
  const inBounds = (p) => p[0] >= 0 && p[0] <= def.sizeM[0] && p[2] >= 0 && p[2] <= def.sizeM[1];
  if (!isV3(def.playerStart?.pos) || !Number.isFinite(def.playerStart?.yawDeg)) {
    errs.push(`${at}: playerStart が不正`);
  } else if (!inBounds(def.playerStart.pos)) {
    errs.push(`${at}: playerStart が地図の外`);
  }
  if (!isV3(def.bossGate?.pos)) errs.push(`${at}: bossGate.pos が不正`);
  if (!isV3(def.bossArena?.center)) errs.push(`${at}: bossArena.center が不正`);
  return errs;
}
