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
  for (const sc of scene.scatter) refs.push(...sc.models);
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

test('lookdevYokaiMotion：妖怪の身じろぎは時刻だけで決まり、動きの指定が無ければ配置のまま。跳ねは0〜1', async () => {
  const { Matrix4 } = await import('three');
  const { yokaiMatrix, hopRatio } = await import('../../src/render/lookdev/yokaiMotion.js');
  const { partMatrix } = await import('../../src/render/lookdev/build.js');
  for (const y of scene.yokai) {
    const place = partMatrix(y);
    const a = yokaiMatrix(place, y.motion, 1.25, new Matrix4());
    const b = yokaiMatrix(place, y.motion, 1.25, new Matrix4());
    assert.deepEqual(a.elements, b.elements);
    assert.ok(a.elements.every(Number.isFinite));
    assert.notDeepEqual(a.elements, place.elements); // 動いている
    assert.deepEqual(yokaiMatrix(place, undefined, 1.25, new Matrix4()).elements, place.elements);
  }
  for (let c = 0; c < 2; c += 0.01) assert.ok(hopRatio(c) >= 0 && hopRatio(c) <= 1);
});

test('lookdevTriBudget：主人公（本体・武器）と妖怪の三角形が上限以内（11_assets §5。品質「高」）', async () => {
  const { Matrix4 } = await import('three');
  const { createBuilder } = await import('../../src/render/lookdev/build.js');
  const { lookdev: L } = await import('../../src/config/lookdev.js');
  const count = (parts) => {
    const b = createBuilder({ models, palette: scene.palette, aoGain: scene.aoGain, segMul: L.meshDetailMul.v.high, faceOf: () => null });
    b.addAll(parts, new Matrix4(), {});
    return b.raw.I.length / 3;
  };
  const heroParts = models.hero.parts;
  const weapon = heroParts[heroParts.length - 1];
  const body = count(heroParts.slice(0, -1));
  assert.ok(weapon.parts.some((p) => p.col === 'steel'), '主人公の部品表の最後は武器');
  assert.ok(body <= L.budgetHeroTriCount.v, `主人公の本体 ${body}`);
  assert.ok(count([weapon]) <= L.budgetWeaponTriCount.v, '武器');
  for (const name of ['chochin', 'karakasa', 'yamainu']) {
    const n = count(models[name].parts);
    assert.ok(n <= L.budgetSmallEnemyTriCount.v, `${name} ${n}`);
  }
});
