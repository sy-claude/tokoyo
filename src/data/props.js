// 小道具の定義（PropDef）。M2a は試験場の灰色の台・壁・柱（10 §4.5）。見た目と当たりは同じ寸法（不変条件6）。
// 当たりの形（ShapeDef）の位置 offset は小道具の原点（足元の中心）から：円柱と箱は**底面の中心**、球は中心。
// 箱の half は [x半幅, y半高, z半奥行]。
/** @import {PropDef} from './types.js' */

/** 灰色の箱。 @param {string} id @param {number} wx @param {number} h @param {number} wz @param {boolean} walkable @returns {PropDef} */
function grayBox(id, wx, h, wz, walkable) {
  return {
    id,
    parts: [{ geo: { type: 'box', p: { w: wx, h, d: wz } }, color: 'sandboxProp', pos: [0, h / 2, 0], rotDeg: [0, 0, 0] }],
    colliders: [{ kind: 'box', half: [wx / 2, h / 2, wz / 2], yawDeg: 0, offset: [0, 0, 0], walkable, camBlock: true, projBlock: true }],
    mat: 'toon',
    outline: 'none',
    instanced: false,
  };
}

/** 灰色の円柱（乗れない）。 @param {string} id @param {number} r @param {number} h @returns {PropDef} */
function grayPillar(id, r, h) {
  return {
    id,
    parts: [{ geo: { type: 'cyl', p: { r, h } }, color: 'sandboxProp', pos: [0, h / 2, 0], rotDeg: [0, 0, 0] }],
    colliders: [{ kind: 'cyl', rM: r, hM: h, offset: [0, 0, 0], walkable: false, camBlock: true, projBlock: true }],
    mat: 'toon',
    outline: 'none',
    instanced: false,
  };
}

/** @type {Record<string, PropDef>} */
export const props = {
  // S1 段差（2×2m）
  sbStep040: grayBox('sbStep040', 2, 0.4, 2, true),
  sbStep041: grayBox('sbStep041', 2, 0.41, 2, true),
  sbStep100: grayBox('sbStep100', 2, 1.0, 2, true),
  sbStep180: grayBox('sbStep180', 2, 1.8, 2, true),
  sbStep240: grayBox('sbStep240', 2, 2.4, 2, true),
  // S2 隙間の台（4×4×高さ2m）
  sbPlat: grayBox('sbPlat', 4, 2, 4, true),
  // S3 壁（6×1m）。乗れない（上に乗れると壁の高さの試験にならない）
  sbWall340: grayBox('sbWall340', 6, 3.4, 1, false),
  sbWall360: grayBox('sbWall360', 6, 3.6, 1, false),
  // S4 カメラの試験
  sbBlock3: grayBox('sbBlock3', 2, 3, 2, true),
  sbPillar03: grayPillar('sbPillar03', 0.3, 3),
  sbPillar05: grayPillar('sbPillar05', 0.5, 3),
};
