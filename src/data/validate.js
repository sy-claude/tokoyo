// data の検証関数。問題の一覧（文字列）を返す。空なら合格。
// M0a はステージの骨組み、M1a は造形（RigDef）とポーズの関節名を見る。技・敵などの検証は、その data を作るMで足す。
/** @import {StageDef, RigDef, RigPartDef, BoneDef} from './types.js' */
import { collision } from '../config/collision.js';
import { palette } from '../config/palette.js';
import { extrudeShapes } from './rigs/shapes.js';

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

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
/** 形 → dims の数（最小, 最大）。lathe は [半径,高さ] の列なので別に見る。 */
const SHAPE_DIMS = { cyl: [3, 3], cone: [2, 2], box: [3, 3], sphere: [4, 4], cap: [2, 5], ico: [3, 3], tube: [1, 8] };

/** 色が palette のキーか16進か。 @param {string} color */
export function isRigColor(color) {
  return typeof color === 'string' && (HEX_RE.test(color) || Object.hasOwn(palette, color));
}

/** @param {BoneDef[]} bones @param {string} at @param {string[]} errs @returns {Set<string>} 骨の名前 */
function checkBones(bones, at, errs) {
  const names = new Set();
  if (!Array.isArray(bones) || bones.length === 0) {
    errs.push(`${at}: bones が空`);
    return names;
  }
  bones.forEach((b, i) => {
    if (typeof b.name !== 'string' || b.name.length === 0) errs.push(`${at}: 骨${i} の名前が無い`);
    else if (names.has(b.name)) errs.push(`${at}: 骨 ${b.name} が重複`);
    if (!isV3(b.posM)) errs.push(`${at}: 骨 ${b.name} の posM が不正`);
    if (i === 0 ? b.parent !== null : !names.has(/** @type {string} */ (b.parent))) {
      errs.push(`${at}: 骨 ${b.name} の親 ${b.parent} が先に無い（根は先頭の1本だけ）`);
    }
    names.add(b.name);
  });
  return names;
}

/** @param {RigPartDef[]} parts @param {Set<string>} boneNames @param {string} at @param {string[]} errs */
function checkParts(parts, boneNames, at, errs) {
  const seen = new Set();
  for (const p of parts ?? []) {
    const w = `${at}: 部品 ${p.name}`;
    if (seen.has(p.name)) errs.push(`${w} が重複`);
    seen.add(p.name);
    if (!boneNames.has(p.bone)) errs.push(`${w} の骨 ${p.bone} が無い`);
    if (!isV3(p.offsetM) || !isV3(p.rotDeg)) errs.push(`${w} の offsetM／rotDeg が不正`);
    if (!isRigColor(p.color)) errs.push(`${w} の色 ${p.color} は palette のキーでも16進でもない`);
    if (p.faceCell !== undefined && !(Number.isInteger(p.faceCell) && p.faceCell >= 0)) errs.push(`${w} の faceCell が不正`);
    if (p.shape === 'lathe') {
      const ok = p.dims.length >= 2 && p.dims.every((d) => Array.isArray(d) && d.length === 2 && d.every(Number.isFinite) && d[0] >= 0);
      if (!ok) errs.push(`${w}：lathe の dims は [半径,高さ] を2点以上`);
    } else if (p.shape === 'extrude') {
      const [shapeName, ...nums] = p.dims;
      if (typeof shapeName !== 'string' || !Object.hasOwn(extrudeShapes, shapeName)) errs.push(`${w}：extrude の形名 ${shapeName} が data/rigs/shapes.js に無い`);
      if (nums.length < 2 || nums.length > 4 || !nums.every((n) => Number.isFinite(n))) errs.push(`${w}：extrude の dims は [形名,長さ,細り,幅,反り]`);
    } else if (Object.hasOwn(SHAPE_DIMS, p.shape)) {
      const [lo, hi] = SHAPE_DIMS[p.shape];
      if (p.dims.length < lo || p.dims.length > hi || !p.dims.every((n) => Number.isFinite(n))) errs.push(`${w}：${p.shape} の dims の数が不正`);
    } else {
      errs.push(`${w} の形 ${p.shape} は知らない`);
    }
  }
}

/** ポーズで動かせる骨（07 6.3 の「ポーズ対象」と weapon）：根と、ばね専用の骨を除いたもの。 @param {RigDef} rig @returns {Set<string>} */
export function poseableBones(rig) {
  const springOnly = new Set(rig.springs.map((s) => s.bone));
  const out = new Set();
  rig.bones.forEach((b, i) => {
    if (i > 0 && !springOnly.has(b.name)) out.add(b.name);
  });
  return out;
}

/**
 * ポーズの関節名を確かめる（07 6.7・07受7）。根・ばね専用の骨・無い骨はエラー。
 * @param {RigDef} rig @param {Record<string, unknown>} joints 関節名 → 角度 @param {string} at
 * @returns {string[]}
 */
export function validatePoseJoints(rig, joints, at) {
  const errs = [];
  const ok = poseableBones(rig);
  for (const [name, deg] of Object.entries(joints ?? {})) {
    if (!ok.has(name)) errs.push(`${at}: 関節 ${name} はポーズで動かせない（07 6.3 のポーズ対象と weapon だけ）`);
    if (!isV3(deg)) errs.push(`${at}: 関節 ${name} の角度が [x,y,z] でない`);
  }
  return errs;
}

/** @param {RigDef} rig @param {string} id @returns {string[]} */
export function validateRig(rig, id) {
  const errs = [];
  const at = `rig ${id}`;
  if (!(rig.scaleMul > 0)) errs.push(`${at}: scaleMul は正の数`);
  const boneNames = checkBones(rig.bones, at, errs);
  checkParts(rig.parts, boneNames, at, errs);
  const springSeen = new Set();
  for (const s of rig.springs ?? []) {
    const w = `${at}: ばね ${s.bone}`;
    if (!boneNames.has(s.bone) || s.bone === rig.bones[0]?.name) errs.push(`${w} の骨が無い（根は不可）`);
    if (springSeen.has(s.bone)) errs.push(`${w} が重複`);
    springSeen.add(s.bone);
    if (s.axes !== 'xz' && s.axes !== 'x') errs.push(`${w} の axes が不正`);
    if (!(s.gainMul >= 0) || !(s.limitDeg > 0)) errs.push(`${w} の gainMul／limitDeg が不正`);
    if (s.restDeg !== undefined && !(Array.isArray(s.restDeg) && s.restDeg.length === 2 && s.restDeg.every(Number.isFinite))) errs.push(`${w} の restDeg は [x,z]`);
  }
  if (rig.weapon) {
    if (!boneNames.has(rig.weapon.socket)) errs.push(`${at}: 武器の socket ${rig.weapon.socket} が無い`);
    const wNames = checkBones(rig.weapon.bones, `${at}（武器）`, errs);
    checkParts(rig.weapon.parts, wNames, `${at}（武器）`, errs);
  }
  if (rig.stance) errs.push(...validatePoseJoints(rig, rig.stance, `${at} の stance`));
  return errs;
}
