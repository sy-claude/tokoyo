// 小道具の当たり（09 §6.2）：StageDef の配置と PropDef から、世界座標の静的形状の配列を作る。シムと描画が共用する純関数。
/** @import {StageDef, PropDef} from '../data/types.js' */
/** @import {Terrain} from './terrain.js' */
import { heightAt } from './terrainQuery.js';

/**
 * @typedef {Object} WorldShape  世界座標の形状。円柱と箱は底面の中心 (x,y,z)、球は中心
 * @property {'cyl'|'box'|'sphere'} kind
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {number} rM     円柱・球の半径
 * @property {number} hM     円柱・箱の高さ
 * @property {number} hx     箱の半幅（局所 x）
 * @property {number} hz     箱の半奥行（局所 z）
 * @property {number} yawDeg 箱の向き
 * @property {boolean} walkable
 * @property {boolean} camBlock
 * @property {boolean} projBlock
 * @property {string} placementId
 */

/**
 * @param {StageDef} stage @param {Record<string, PropDef>} propDefs @param {Terrain} terrain
 * @returns {WorldShape[]}
 */
export function buildShapes(stage, propDefs, terrain) {
  /** @type {WorldShape[]} */
  const out = [];
  for (const pl of stage.props) {
    const def = propDefs[pl.prop];
    if (!def) throw new Error(`小道具が無い：${pl.prop}`);
    const px = pl.pos?.[0] ?? 0;
    const pz = pl.pos?.[2] ?? 0;
    const py = pl.pos?.[1] ?? heightAt(terrain, px, pz);
    const sc = typeof pl.scale === 'number' ? [pl.scale, pl.scale, pl.scale] : pl.scale ?? [1, 1, 1];
    const yaw = pl.yawDeg ?? 0;
    const cy = Math.cos((yaw * Math.PI) / 180);
    const sy = Math.sin((yaw * Math.PI) / 180);
    for (const c of def.colliders) {
      // 小道具の向き（yaw）で offset を回す。F=(sin yaw, 0, cos yaw)、右=(cos yaw, 0, −sin yaw)
      const ox = c.offset[0] * sc[0];
      const oz = c.offset[2] * sc[2];
      const base = {
        x: px + ox * cy + oz * sy,
        y: py + c.offset[1] * sc[1],
        z: pz - ox * sy + oz * cy,
        rM: 0, hM: 0, hx: 0, hz: 0, yawDeg: yaw,
        walkable: pl.walkable ?? c.walkable, camBlock: c.camBlock, projBlock: c.projBlock, placementId: pl.id,
      };
      if (c.kind === 'cyl') out.push({ ...base, kind: 'cyl', rM: c.rM * Math.max(sc[0], sc[2]), hM: c.hM * sc[1] });
      else if (c.kind === 'box') out.push({ ...base, kind: 'box', hx: c.half[0] * sc[0], hM: c.half[1] * 2 * sc[1], hz: c.half[2] * sc[2], yawDeg: yaw + c.yawDeg });
      else out.push({ ...base, kind: 'sphere', rM: c.rM * Math.max(sc[0], sc[1], sc[2]) });
    }
  }
  return out;
}
