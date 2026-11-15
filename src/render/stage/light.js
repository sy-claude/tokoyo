// 光の向き（07 3.3）。夕日の方位はステージのデータ（bossGate → ボス舞台の中心）から決まる。純関数。
// 座標は +X＝東、−Z＝北。方位は北から時計回り（度）。
/** @import {StageDef, V3} from '../../data/types.js' */
import { DEG2RAD, RAD2DEG, wrapDeg } from '../../core/math.js';

/**
 * 夕日の方位：門から見て舞台の真後ろに夕日がある（07 3.3、07受23）。
 * @param {Pick<StageDef, 'bossGate'|'bossArena'>} stage
 * @returns {number} 度（−180〜180。北が0、東が90）
 */
export function sunAzimuthDeg(stage) {
  const dx = stage.bossArena.center[0] - stage.bossGate.pos[0];
  const dz = stage.bossArena.center[2] - stage.bossGate.pos[2];
  return wrapDeg(Math.atan2(dx, -dz) * RAD2DEG);
}

/**
 * 方位と仰角 → その方向を指す単位ベクトル。
 * @param {number} azimuthDeg @param {number} elevationDeg @returns {V3}
 */
export function dirFromAzEl(azimuthDeg, elevationDeg) {
  const az = azimuthDeg * DEG2RAD;
  const el = elevationDeg * DEG2RAD;
  const c = Math.cos(el);
  return [c * Math.sin(az), Math.sin(el), -c * Math.cos(az)];
}

/**
 * 主光の向き（光源を指すベクトル）：方位＝夕日の方位＋lightAzimuthOffsetDeg、仰角＝lightElevationDeg。
 * @param {Pick<StageDef, 'bossGate'|'bossArena'>} stage
 * @param {{lightAzimuthOffsetDeg:number, lightElevationDeg:number}} renderCfg
 * @returns {V3}
 */
export function mainLightDir(stage, renderCfg) {
  return dirFromAzEl(sunAzimuthDeg(stage) + renderCfg.lightAzimuthOffsetDeg, renderCfg.lightElevationDeg);
}
