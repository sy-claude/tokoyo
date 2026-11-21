// キャラの移動解決（09 §6.3）。鉛直カプセル（半径 r、高さ h、原点は足元）を、地形と静的形状に対して動かす。
/** @import {CollisionWorld} from './queries.js' */
/** @import {Cfg} from '../../config/index.js' */
import { gradientAt, heightAt, slopeDegAt } from './heightfield.js';
import { groundAt, isSeaOrForbidden } from './queries.js';
import { pushOut, shapeYRange, topOf } from './shapes.js';

/**
 * @typedef {Object} MoverBody
 * @property {[number, number, number]} pos
 * @property {{rM:number, hM:number}} capsule
 * @property {boolean} grounded
 */

/**
 * @typedef {Object} MoveResult
 * @property {boolean} landed   このtickで空中→接地
 * @property {boolean} onShape  小道具の上に立っている
 * @property {number} movedM    実際の水平移動量
 * @property {boolean} sea      海へ落ちた（09 §6.3 の4）
 */

/** 地形が登れないか（接地中の上り：段差 stepUp 超、または傾き slopeMax 超）。空中は段差だけ見る。 */
function terrainBlocks(cw, b, x, z, col) {
  const hNew = heightAt(cw.terrain, x, z);
  const rise = hNew - b.pos[1];
  if (rise > col.stepUpM + col.collisionEpsM) return true;
  return b.grounded && rise > col.collisionEpsM && slopeDegAt(cw.terrain, x, z) > col.slopeMaxDeg + col.collisionEpsM;
}

/**
 * @param {CollisionWorld} cw @param {MoverBody} b @param {number} dx @param {number} dz @param {number} dy
 * @param {Cfg['collision']} col
 * @returns {MoveResult}
 */
export function move(cw, b, dx, dz, dy, col) {
  const r = b.capsule.rM;
  const x0 = b.pos[0];
  const z0 = b.pos[2];
  // 1. 水平（地形）：登れなければ勾配に直交する成分だけ（滑り）、それも不可なら動かない
  let nx = x0 + dx;
  let nz = z0 + dz;
  if ((dx !== 0 || dz !== 0) && terrainBlocks(cw, b, nx, nz, col)) {
    const [gx, gz] = gradientAt(cw.terrain, nx, nz);
    const gl = Math.hypot(gx, gz);
    let sx = 0;
    let sz = 0;
    if (gl > 0) {
      const ux = gx / gl;
      const uz = gz / gl;
      const up = dx * ux + dz * uz;
      sx = up > 0 ? dx - up * ux : dx;
      sz = up > 0 ? dz - up * uz : dz;
    }
    if ((sx !== 0 || sz !== 0) && !terrainBlocks(cw, b, x0 + sx, z0 + sz, col)) {
      nx = x0 + sx;
      nz = z0 + sz;
    } else {
      nx = x0;
      nz = z0;
    }
  }
  // 地図の外へは出ない
  nx = Math.max(r, Math.min(cw.sizeM[0] - r, nx));
  nz = Math.max(r, Math.min(cw.sizeM[1] - r, nz));

  // 2. 押し出し：縦の範囲が重なる形状から水平に押し出す。乗れる形状で足が上面−段差以上なら押し出さない（足場の候補）
  const footY = b.pos[1];
  const y0 = footY;
  const y1 = footY + b.capsule.hM;
  for (let it = 0; it < col.pushIterCount; it++) {
    let any = false;
    for (const i of cw.grid.query(nx - r, nz - r, nx + r, nz + r)) {
      const s = cw.shapes[i];
      const [sy0, sy1] = shapeYRange(s);
      if (sy1 <= y0 || sy0 >= y1) continue;
      if (s.walkable && footY >= topOf(s) - col.stepUpM - col.collisionEpsM) continue;
      const p = pushOut(s, nx, nz, r, y0 + r, y1 - r);
      if (!p) continue;
      nx += p[0];
      nz += p[1];
      any = true;
    }
    if (!any) break;
  }
  const movedM = Math.hypot(nx - x0, nz - z0);
  b.pos[0] = nx;
  b.pos[2] = nz;

  // 3. 縦：着地・下りの吸着
  const wasGrounded = b.grounded;
  const g = groundAt(cw, nx, nz, footY, r, col.stepUpM, col.collisionEpsM);
  let y = footY + dy;
  let landed = false;
  if (dy <= 0 && y <= g.h) {
    y = g.h;
    landed = !wasGrounded;
    b.grounded = true;
  } else if (wasGrounded && dy <= 0 && g.h >= y - col.stepDownM) {
    y = g.h;
    b.grounded = true;
  } else {
    b.grounded = false;
  }
  b.pos[1] = y;

  // 4. 海
  const sea = isSeaOrForbidden(cw, nx, nz) || y < cw.terrain.seaLevelM - col.seaFallDepthM;
  return { landed, onShape: b.grounded && g.onShape, movedM, sea };
}
