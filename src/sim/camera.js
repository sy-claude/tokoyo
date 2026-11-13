// カメラ（シム側。実tickで更新）。M0a は仮：プレイヤーの後方・一定の高さから追従し、camDeg で回る。
// 本物（探索・戦闘・注目・自動回り込み・障害物）は M2b（02 6章）。
// 向きの約束：yawDeg は F=(sin yaw, 0, cos yaw)（プレイヤーと同じ）。入力の camDeg[0] は「右+」（視点が右を向く）
// なので、yawDeg からは引く（+Z を向いているとき、右は −X）。pitch は上から見下ろす向きが＋で、camDeg[1] を足す。
/** @import {V3, InputFrame} from '../data/types.js' */
/** @import {Cfg} from '../config/index.js' */
import { clamp, forwardYawPitch, wrapDeg } from '../core/math.js';

/**
 * @typedef {Object} CameraState
 * @property {V3} pos
 * @property {number} yawDeg
 * @property {number} pitchDeg
 * @property {number} distM
 * @property {number} fovYDeg
 * @property {string} mode
 * @property {number|null} lockId
 * @property {V3} prevPos
 * @property {number} prevYawDeg
 * @property {number} prevPitchDeg
 */

/** 注視点（足元＋高さ）から後ろへ dist だけ引いた位置に置く。 */
function place(cam, target, cfg) {
  const f = forwardYawPitch(cam.yawDeg, cam.pitchDeg);
  const pivotY = target.pos[1] + cfg.camera.camExplorePivotHM;
  cam.pos[0] = target.pos[0] - f[0] * cam.distM;
  cam.pos[1] = pivotY - f[1] * cam.distM;
  cam.pos[2] = target.pos[2] - f[2] * cam.distM;
}

/** 補間を切る（前tickの値を今の値にそろえる）。 @param {CameraState} cam */
export function snapCamera(cam) {
  cam.prevPos[0] = cam.pos[0];
  cam.prevPos[1] = cam.pos[1];
  cam.prevPos[2] = cam.pos[2];
  cam.prevYawDeg = cam.yawDeg;
  cam.prevPitchDeg = cam.pitchDeg;
}

/**
 * @param {{pos:V3, yawDeg:number}} target プレイヤー
 * @param {Cfg} cfg
 * @returns {CameraState}
 */
export function createCamera(target, cfg) {
  /** @type {CameraState} */
  const cam = {
    pos: [0, 0, 0],
    yawDeg: target.yawDeg,
    pitchDeg: 0,
    distM: cfg.camera.camExploreDistM,
    fovYDeg: cfg.camera.camFovYDeg,
    mode: 'explore',
    lockId: null,
    prevPos: [0, 0, 0],
    prevYawDeg: target.yawDeg,
    prevPitchDeg: 0,
  };
  place(cam, target, cfg);
  snapCamera(cam);
  return cam;
}

/** プレイヤーの背後へ置き直して補間を切る（teleport 用）。 */
export function resetCameraBehind(cam, target, cfg) {
  cam.yawDeg = target.yawDeg;
  place(cam, target, cfg);
  snapCamera(cam);
}

/**
 * 1tick の更新（09 4.3 の手順8）。
 * @param {CameraState} cam @param {{pos:V3, yawDeg:number}} target @param {InputFrame} input @param {Cfg} cfg
 */
export function stepCamera(cam, target, input, cfg) {
  cam.distM = cfg.camera.camExploreDistM;
  cam.fovYDeg = cfg.camera.camFovYDeg;
  cam.yawDeg = wrapDeg(cam.yawDeg - input.camDeg[0]);
  cam.pitchDeg = clamp(cam.pitchDeg + input.camDeg[1], cfg.camera.camPitchMinDeg, cfg.camera.camPitchMaxDeg);
  place(cam, target, cfg);
}
