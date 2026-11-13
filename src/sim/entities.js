// エンティティの生成と整理。配列は常にID昇順（09 4.4）。
/** @import {V3} from '../data/types.js' */
import { nextId } from '../core/ids.js';
import { copyV3 } from '../core/math.js';

/**
 * @typedef {Object} Entity
 * @property {number} id
 * @property {'player'|'enemy'} kind
 * @property {boolean} alive
 * @property {V3} pos       足元の位置
 * @property {V3} vel
 * @property {number} yawDeg
 * @property {V3} prevPos   前tickの位置（描画の補間用）
 * @property {number} prevYawDeg
 * @property {{rM:number, hM:number}} capsule
 * @property {boolean} grounded
 * @property {number} hp
 * @property {number} hpMax
 * @property {string} state
 * @property {string|null} moveId
 * @property {number} moveStartLocalF
 * @property {number} localF     局所時間（1/4096 単位の和）
 * @property {number} scale      このtickの時間倍率
 * @property {number} slowUntil     個別の減速が続く実tick
 * @property {number} hitstopUntil  ヒットストップが続く実tick
 * @property {number} fu
 * @property {number} magatama
 * @property {number} kekkai
 */

/**
 * プレイヤーを作って world.entities に足す。
 * M0a は仮のカプセル。HP・資源はキャラのデータが入るM（M2a 以降）で本物の値にする。
 * @param {{ids:import('../core/ids.js').IdGen, entities:Entity[]}} world
 * @param {V3} pos @param {number} yawDeg @param {{rM:number, hM:number}} capsule
 * @returns {Entity}
 */
export function createPlayer(world, pos, yawDeg, capsule) {
  /** @type {Entity} */
  const e = {
    id: nextId(world.ids),
    kind: 'player',
    alive: true,
    pos: copyV3(pos),
    vel: [0, 0, 0],
    yawDeg,
    prevPos: copyV3(pos),
    prevYawDeg: yawDeg,
    capsule: { rM: capsule.rM, hM: capsule.hM },
    grounded: true,
    hp: 1,
    hpMax: 1,
    state: 'idle',
    moveId: null,
    moveStartLocalF: 0,
    localF: 0,
    scale: 1,
    slowUntil: 0,
    hitstopUntil: 0,
    fu: 0,
    magatama: 0,
    kekkai: 0,
  };
  world.entities.push(e);
  return e;
}

/** 前tickの状態を写す（補間用。09 4.3 の手順1）。 @param {Entity[]} entities */
export function savePrev(entities) {
  for (const e of entities) {
    e.prevPos[0] = e.pos[0];
    e.prevPos[1] = e.pos[1];
    e.prevPos[2] = e.pos[2];
    e.prevYawDeg = e.yawDeg;
  }
}

/** 死んだエンティティを、順序を保って詰める（09 4.3 の手順9）。 @param {Entity[]} entities */
export function compactEntities(entities) {
  let w = 0;
  for (let r = 0; r < entities.length; r++) {
    const e = entities[r];
    if (e.alive) {
      entities[w] = e;
      w += 1;
    }
  }
  entities.length = w;
}
