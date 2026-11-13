// ワールド（シムの全状態）。描画・DOM・音を知らない（不変条件5）。
/** @import {StageDef, SimEvent, InputFrame, V3} from '../data/types.js' */
/** @import {Cfg} from '../config/index.js' */
/** @import {Rng} from '../core/rng.js' */
/** @import {Entity} from './entities.js' */
/** @import {CameraState} from './camera.js' */
import { createRng } from '../core/rng.js';
import { createIdGen } from '../core/ids.js';
import { createTimeState } from '../core/time.js';
import { copyV3 } from '../core/math.js';
import { validateStage } from '../data/validate.js';
import { sandbox } from '../data/stages/sandbox.js';
import { createPlayer } from './entities.js';
import { createCamera, resetCameraBehind } from './camera.js';

/**
 * @typedef {Object} World
 * @property {number} tick     実tick（整数）。stepWorld の最後に +1
 * @property {number} seed
 * @property {string} scene
 * @property {string} charId
 * @property {Cfg} cfg         設定の値（調整パネルやテストが書き換える。ハッシュには入れない）
 * @property {StageDef} stage
 * @property {import('../core/ids.js').IdGen} ids
 * @property {Rng} rng         本流。用途ごとの流れは rngAi・rngCombat・rngSpawn（09 4.4）
 * @property {Rng} rngAi
 * @property {Rng} rngCombat
 * @property {Rng} rngSpawn
 * @property {Rng[]} rngs      ハッシュに入れる順
 * @property {import('../core/time.js').TimeState} time
 * @property {Entity[]} entities  ID昇順
 * @property {Entity} player
 * @property {CameraState} camera
 * @property {InputFrame|null} input  このtickの入力
 * @property {SimEvent[]} eventsOut   このtickに出たイベント
 */

/** 場面名 → ステージのデータ。M0a は試験場だけ。 @type {Map<string, StageDef>} */
const SCENE_STAGES = new Map([['sandbox', sandbox]]);

/** その場面をシムが作れるか。 */
export function hasSceneWorld(scene) {
  return SCENE_STAGES.has(scene);
}

/**
 * @param {{stage:StageDef, seed:number, cfg:Cfg, scene?:string, charId?:string}} o
 * @returns {World}
 */
export function createWorld(o) {
  const errs = validateStage(o.stage);
  if (errs.length > 0) throw new Error(`ステージのデータが不正：\n${errs.join('\n')}`);
  const rng = createRng(o.seed);
  const rngAi = rng.fork('ai');
  const rngCombat = rng.fork('combat');
  const rngSpawn = rng.fork('spawn');
  /** @type {any} */
  const world = {
    tick: 0,
    seed: o.seed,
    scene: o.scene ?? o.stage.id,
    charId: o.charId ?? 'fuma',
    cfg: o.cfg,
    stage: o.stage,
    ids: createIdGen(),
    rng,
    rngAi,
    rngCombat,
    rngSpawn,
    rngs: [rng, rngAi, rngCombat, rngSpawn],
    time: createTimeState(),
    entities: [],
    input: null,
    eventsOut: [],
  };
  const capsule = { rM: o.cfg.collision.m0CapsuleRM, hM: o.cfg.collision.m0CapsuleHM };
  world.player = createPlayer(world, o.stage.playerStart.pos, o.stage.playerStart.yawDeg, capsule);
  world.camera = createCamera(world.player, o.cfg);
  return world;
}

/**
 * 場面名からワールドを作る（リプレイ・テスト・app/scenes が使う）。
 * @param {string} scene @param {{seed:number, cfg:Cfg, charId?:string}} o
 */
export function createSceneWorld(scene, o) {
  const stage = SCENE_STAGES.get(scene);
  if (!stage) throw new Error(`この場面はまだ作られていません：${scene}`);
  return createWorld({ stage, seed: o.seed, cfg: o.cfg, scene, charId: o.charId });
}

/** プレイヤーを置き直す。補間を切り、カメラを背後へ戻す（テスト用）。 */
export function teleportPlayer(world, x, y, z, yawDeg) {
  const p = world.player;
  p.pos[0] = x;
  p.pos[1] = y;
  p.pos[2] = z;
  p.vel[0] = 0;
  p.vel[1] = 0;
  p.vel[2] = 0;
  if (yawDeg !== undefined) p.yawDeg = yawDeg;
  p.prevPos = copyV3(p.pos);
  p.prevYawDeg = p.yawDeg;
  resetCameraBehind(world.camera, p, world.cfg);
}

/** JSON にできる状態の写し（09 10.2 の GameStateView のうちシムが持つ部分）。 */
export function viewWorld(world) {
  const p = world.player;
  const c = world.camera;
  /** @type {(v:V3)=>V3} */
  const v3 = (v) => [v[0], v[1], v[2]];
  return {
    tick: world.tick,
    scene: world.scene,
    worldMul: world.time.worldMul,
    player: {
      id: p.id,
      pos: v3(p.pos),
      vel: v3(p.vel),
      yawDeg: p.yawDeg,
      grounded: p.grounded,
      hp: p.hp,
      hpMax: p.hpMax,
      state: p.state,
      moveId: p.moveId,
      moveF: p.moveId === null ? 0 : Math.floor(p.localF - p.moveStartLocalF),
      scale: p.scale,
      fu: p.fu,
      magatama: p.magatama,
      kekkai: p.kekkai,
      infected: false,
      buffs: [],
    },
    enemies: [],
    projectiles: [],
    camera: {
      pos: v3(c.pos),
      yawDeg: c.yawDeg,
      pitchDeg: c.pitchDeg,
      distM: c.distM,
      fovYDeg: c.fovYDeg,
      mode: c.mode,
      lockId: c.lockId,
    },
    gauge: 0,
    tamakake: 0,
    boss: null,
  };
}
