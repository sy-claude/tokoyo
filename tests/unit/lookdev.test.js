// 見た目の試作（V1。?scene=lookdev）：データの整合と、歩ける範囲の地面が平らであること。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStage } from '../../src/data/validate.js';
import { lookdev } from '../../src/data/stages/lookdev.js';
import { scene } from '../../src/data/lookdev/scene.js';
import { models } from '../../src/data/lookdev/models.js';
import { createTerrain } from '../../src/render/lookdev/terrain.js';
import { parseUrlParams } from '../../src/app/urlParams.js';
import { hasSceneWorld, createSceneWorld } from '../../src/sim/world.js';
import { buildConfig } from '../../src/core/config.js';
import { configTables } from '../../src/config/index.js';

test('lookdevStageValid：ステージのデータが正しく、URL と場面の表に載っている', () => {
  assert.deepEqual(validateStage(lookdev), []);
  assert.equal(parseUrlParams('?scene=lookdev').scene, 'lookdev');
  assert.ok(hasSceneWorld('lookdev'));
});

test('lookdevCameraView：既定のカメラは構図の上書き（距離・高さ・縦角）で始まり、試験場には影響しない', () => {
  const cfg = buildConfig(configTables);
  const w = createSceneWorld('lookdev', { seed: 1, cfg });
  assert.equal(w.camera.distM, lookdev.cameraView.distM);
  assert.equal(w.camera.pitchDeg, lookdev.cameraView.pitchDeg);
  const s = createSceneWorld('sandbox', { seed: 1, cfg });
  assert.equal(s.camera.distM, cfg.camera.camExploreDistM);
  assert.equal(s.camera.view, null);
});

test('lookdevModelsExist：配置で使う形がすべて形の表にある', () => {
  const refs = [...scene.placements, ...scene.yokai].map((p) => p.model);
  const walk = (parts) => {
    for (const p of parts) {
      if (p.s === 'ref') refs.push(p.model);
      if (p.parts) walk(p.parts);
    }
  };
  for (const m of Object.values(models)) walk(m.parts);
  for (const name of refs) assert.ok(models[name], name);
  for (const g of scene.grass) assert.ok(scene.grassKinds[g[4]], g[4]);
});

test('lookdevWalkAreaFlat：歩ける範囲（ステージの矩形）の見た目の地面は高さ0（シムの床と一致）', () => {
  const terrain = createTerrain(scene.terrain, scene.path);
  const [ox, , oz] = lookdev.playerStart.pos;
  const r = 0.35;
  let worst = 0;
  for (let x = r; x <= lookdev.sizeM[0] - r; x += 0.25) {
    for (let z = r; z <= lookdev.sizeM[1] - r; z += 0.25) worst = Math.max(worst, Math.abs(terrain.height(x - ox, z - oz)));
  }
  assert.ok(worst < 0.05, `最大のずれ ${worst}`);
});

test('lookdevUniformArrays：シェーダへ渡す折れ線の点数（石畳8・裂け目6・置き影12）', () => {
  assert.equal(scene.path.length, 8);
  assert.equal(scene.fissure.length, 6);
  assert.equal(scene.casters.length, 12);
});
