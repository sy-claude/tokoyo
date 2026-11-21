// 衝突世界の組み立てと問い合わせ：足元の高さ（地形＋乗れる形状）・縁・海。
/** @import {StageDef} from '../../data/types.js' */
/** @import {Cfg} from '../../config/index.js' */
import { buildTerrain } from '../../gen/terrain.js';
import { buildShapes } from '../../gen/props.js';
import { props as propDefs } from '../../data/props.js';
import { heightAt, surfaceAt, SURFACE } from './heightfield.js';
import { buildShapeGrid } from './grid.js';
import { overlapsFootprint, topOf } from './shapes.js';

/**
 * @typedef {Object} CollisionWorld
 * @property {import('../../gen/terrain.js').Terrain} terrain
 * @property {import('../../gen/props.js').WorldShape[]} shapes
 * @property {ReturnType<typeof buildShapeGrid>} grid
 * @property {[number, number]} sizeM
 */

/** @param {StageDef} stage @param {Cfg} cfg @returns {CollisionWorld} */
export function buildCollisionWorld(stage, cfg) {
  const terrain = buildTerrain(stage, cfg.collision);
  const shapes = buildShapes(stage, propDefs, terrain);
  return { terrain, shapes, grid: buildShapeGrid(shapes, stage.sizeM, cfg.collision.shapeGridCellM), sizeM: stage.sizeM };
}

/**
 * (x,z) の足元の高さ：地形と、乗れる形状のうち上面が footY+stepUp 以下で、円 r が上面に重なるものの最大。
 * @param {CollisionWorld} cw @param {number} r 0 で点 @param {number} stepUpM
 * @returns {{h:number, onShape:boolean}}
 */
export function groundAt(cw, x, z, footY, r, stepUpM, epsM) {
  let h = heightAt(cw.terrain, x, z);
  let onShape = false;
  for (const i of cw.grid.query(x - r, z - r, x + r, z + r)) {
    const s = cw.shapes[i];
    if (!s.walkable) continue;
    const top = topOf(s);
    if (top > footY + stepUpM + epsM || top <= h) continue;
    if (!overlapsFootprint(s, x, z, r)) continue;
    h = top;
    onShape = true;
  }
  return { h, onShape };
}

/** (x,z) が海・禁止の升か。 @param {CollisionWorld} cw */
export function isSeaOrForbidden(cw, x, z) {
  const s = surfaceAt(cw.terrain, x, z);
  return s === SURFACE.sea || s === SURFACE.forbidden;
}
