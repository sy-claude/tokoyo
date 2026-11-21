// 不変条件6（09 §2 の6）：衝突と見た目は同じステージのデータから作る。試験場（M2a）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { makeCfg } from './helpers/cfg.js';
import { buildTerrain } from '../../src/gen/terrain.js';
import { buildShapes } from '../../src/gen/props.js';
import { props } from '../../src/data/props.js';
import { sandbox } from '../../src/data/stages/sandbox.js';
import { placementMatrix, propGeometry, terrainGeometry } from '../../src/render/stage/sandboxView.js';

const cfg = makeCfg();
const MARGIN_M = 0.3;

test('stageSourceProps：全小道具で、当たり形状の外接箱 ⊂ 見た目の外接箱を0.3m広げたもの', () => {
  const terrain = buildTerrain(sandbox, cfg.collision);
  const shapes = buildShapes(sandbox, props, terrain);
  for (const pl of sandbox.props) {
    const g = propGeometry(props[pl.prop]);
    g.applyMatrix4(placementMatrix(pl, terrain));
    g.computeBoundingBox();
    const vis = /** @type {Box3} */ (g.boundingBox).clone().expandByScalar(MARGIN_M);
    for (const s of shapes.filter((x) => x.placementId === pl.id)) {
      const ext = s.kind === 'box' ? Math.hypot(s.hx, s.hz) : s.rM;
      const lo = new Vector3(s.x - ext, s.kind === 'sphere' ? s.y - s.rM : s.y, s.z - ext);
      const hi = new Vector3(s.x + ext, s.kind === 'sphere' ? s.y + s.rM : s.y + s.hM, s.z + ext);
      // 向きの無い箱は外接円でなく辺で比べる
      if (s.kind === 'box' && s.yawDeg % 180 === 0) {
        lo.x = s.x - s.hx;
        hi.x = s.x + s.hx;
        lo.z = s.z - s.hz;
        hi.z = s.z + s.hz;
      }
      assert.ok(vis.containsBox(new Box3(lo, hi)), `${pl.id}（${pl.prop}）`);
    }
  }
});

test('stageSourceTerrain：地形の描画頂点の高さ＝高さ格子の値（差0）', () => {
  const terrain = buildTerrain(sandbox, cfg.collision);
  const g = terrainGeometry(terrain);
  const pos = g.attributes.position;
  assert.equal(pos.count, terrain.heights.length);
  for (let i = 0; i < pos.count; i++) assert.equal(pos.getY(i), terrain.heights[i]);
});
