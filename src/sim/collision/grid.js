// 静的形状の索引（09 §6.2）：shapeGridCellM の升ごとに、触れる形状の番号を持つ。
/** @import {WorldShape} from '../../gen/props.js' */

/**
 * @param {WorldShape[]} shapes @param {[number, number]} sizeM @param {number} cellM
 */
export function buildShapeGrid(shapes, sizeM, cellM) {
  const nx = Math.max(1, Math.ceil(sizeM[0] / cellM));
  const nz = Math.max(1, Math.ceil(sizeM[1] / cellM));
  /** @type {number[][]} */
  const cells = Array.from({ length: nx * nz }, () => []);
  const ci = (v, n) => Math.max(0, Math.min(n - 1, Math.floor(v / cellM)));
  shapes.forEach((s, i) => {
    const ext = s.kind === 'box' ? Math.hypot(s.hx, s.hz) : s.rM;
    for (let iz = ci(s.z - ext, nz); iz <= ci(s.z + ext, nz); iz++) {
      for (let ix = ci(s.x - ext, nx); ix <= ci(s.x + ext, nx); ix++) cells[iz * nx + ix].push(i);
    }
  });
  return {
    /** 範囲 [x0,x1]×[z0,z1] に触れる升の形状の番号（重複なし・昇順＝決定論）。 */
    query(x0, z0, x1, z1) {
      /** @type {Set<number>} */
      const out = new Set();
      for (let iz = ci(z0, nz); iz <= ci(z1, nz); iz++) {
        for (let ix = ci(x0, nx); ix <= ci(x1, nx); ix++) for (const i of cells[iz * nx + ix]) out.add(i);
      }
      return [...out].sort((a, b) => a - b);
    },
  };
}
