// M1a-1：輪郭の太さの式（07 4章）を純関数にし、近い・遠い・斜めで 1.5〜4px に収まる。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ShaderLib } from 'three';
import { makeCfg } from './helpers/cfg.js';
import { DEG2RAD } from '../../src/core/math.js';
import { createOutlineMaterial, createOutlineShared, outlinePxPerM, outlineWidthM, outlineWidthPx } from '../../src/render/materials/outline.js';

const cfg = makeCfg();
const rc = cfg.render;
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

const DEPTHS = [0.2, 0.75, rc.outlineNearM, 2, 3, 5, 10, 25, 100, 400];
const NOISES = [0, 0.25, 0.5, 0.75, 1];
const NDOTL = [-1, -0.5, 0, 0.5, 1];

test('clamp：近い・遠い・斜め（光の当たり方）のどれでも、画面上の太さは outlineMinPx〜outlineMaxPx（M1a-1）', () => {
  let low = Infinity;
  let high = -Infinity;
  for (const basePx of [rc.outlineHeroPx, rc.outlineEnemyPx, rc.outlinePropPx]) {
    for (const depthM of DEPTHS) {
      for (const noise of NOISES) {
        for (const nDotL of NDOTL) {
          const px = outlineWidthPx({ basePx, noise, nDotL, depthM }, rc);
          assert.ok(px >= rc.outlineMinPx && px <= rc.outlineMaxPx, `base=${basePx} depth=${depthM} noise=${noise} nDotL=${nDotL} → ${px}`);
          low = Math.min(low, px);
          high = Math.max(high, px);
        }
      }
    }
  }
  // 下限と上限の両方に実際に届く（収めているだけで、いつも同じ太さではない）
  assert.equal(low, rc.outlineMinPx);
  assert.equal(high, rc.outlineMaxPx);
});

test('formula：範囲の中では uOutlinePx×(0.6+0.8·ゆらぎ)×(1+0.5·(1−N·L))（07 4章の式）', () => {
  const p = { basePx: rc.outlineHeroPx, noise: 0.5, nDotL: 1, depthM: 5 };
  const expected = rc.outlineHeroPx * (rc.outlineNoiseBaseRatio + rc.outlineNoiseAmpRatio * 0.5);
  assert.ok(near(outlineWidthPx(p, rc), expected));
  // 光と反対の側（N·L=−1）は 1+0.5×2＝2倍 → 上限で止まる
  assert.equal(outlineWidthPx({ ...p, nDotL: -1 }, rc), Math.min(rc.outlineMaxPx, expected * (1 + rc.outlineLightBoostRatio * 2)));
  // 距離を変えても画面上の太さは同じ（outlineNearM より遠い所）＝世界の太さは距離に比例
  for (const depthM of [2, 10, 25]) assert.ok(near(outlineWidthPx({ ...p, depthM }, rc), expected), `depth=${depthM}`);
});

test('[検算] heroWidth：主人公の輪郭は 2.6px を中心に 1.56〜3.64px（光の当たる側）', () => {
  // 07 4章：outlineHeroPx 2.6、ゆらぎ 0.6〜1.4
  const at = (noise) => outlineWidthPx({ basePx: rc.outlineHeroPx, noise, nDotL: 1, depthM: 5 }, rc);
  assert.ok(near(at(0), 1.56, 1e-9));
  assert.ok(near(at(0.5), 2.6, 1e-9));
  assert.ok(near(at(1), 3.64, 1e-9));
  assert.deepEqual([rc.outlineMinPx, rc.outlineMaxPx, rc.outlineEnemyPx, rc.outlinePropPx], [1.5, 4.0, 2.4, 2.0]);
});

test('nearKeepsWorldWidth：outlineNearM より近いと世界の太さを保つ（画面上では太る。上限まで）', () => {
  const pxPerM = outlinePxPerM(cfg.camera.camFovYDeg, cfg.input.refViewPx[1]);
  const p = { basePx: rc.outlineHeroPx, noise: 0, nDotL: 1 };
  const atNear = outlineWidthM(outlineWidthPx({ ...p, depthM: rc.outlineNearM }, rc), rc.outlineNearM, pxPerM);
  const closer = rc.outlineNearM * 0.8;
  const pxCloser = outlineWidthPx({ ...p, depthM: closer }, rc);
  assert.ok(pxCloser > outlineWidthPx({ ...p, depthM: rc.outlineNearM }, rc));
  assert.ok(pxCloser < rc.outlineMaxPx, 'この例では上限に届かない');
  assert.ok(near(outlineWidthM(pxCloser, closer, pxPerM), atNear, 1e-12));
  // 深度0でも壊れない
  assert.equal(outlineWidthPx({ ...p, depthM: 0 }, rc), rc.outlineMaxPx);
});

test('pxPerM：uPxPerM＝2·tan(fovY/2)／画面の高さ。押し出した幅を画面に戻すと元の px', () => {
  const fov = cfg.camera.camFovYDeg;
  const H = cfg.input.refViewPx[1];
  const k = outlinePxPerM(fov, H);
  assert.ok(near(k * H, 2 * Math.tan((fov * DEG2RAD) / 2), 1e-12));
  // 視点深度 d の所で、画面の高さは 2·d·tan(fovY/2) m。そこでの 1px は k·d m
  for (const d of [2, 10, 25]) {
    const px = outlineWidthPx({ basePx: rc.outlineHeroPx, noise: 0.5, nDotL: 0.5, depthM: d }, rc);
    const widthM = outlineWidthM(px, d, k);
    assert.ok(near(widthM / ((2 * d * Math.tan((fov * DEG2RAD) / 2)) / H), px, 1e-9));
  }
  // 画面が大きいほど 1px は小さい
  assert.ok(outlinePxPerM(fov, 430) < outlinePxPerM(fov, 375));
});

test('shaderInjection：輪郭の材質は three の頂点シェーダーの決まった場所に差し込める（09 8.2-5）', () => {
  const shared = createOutlineShared(cfg);
  shared.setView(cfg.camera.camFovYDeg, cfg.input.refViewPx[1]);
  const a = createOutlineMaterial(shared, { px: rc.outlineHeroPx, color: cfg.palette.ink });
  const b = createOutlineMaterial(shared, { px: rc.outlineEnemyPx, color: cfg.palette.ink });
  // 差し込み先の目印が、いま使っている three にある
  const src = ShaderLib.basic.vertexShader;
  assert.ok(src.includes('#include <beginnormal_vertex>'));
  assert.ok(src.includes('#include <skinning_vertex>'));
  const shader = { uniforms: {}, vertexShader: src };
  a.onBeforeCompile(shader);
  assert.ok(!shader.vertexShader.includes('#include <beginnormal_vertex>'));
  assert.ok(shader.vertexShader.includes('vec3 objectNormal = aOutlineNormal;'));
  assert.ok(shader.vertexShader.indexOf('#include <skinning_vertex>') < shader.vertexShader.indexOf('transformed += tkN'));
  assert.ok(shader.vertexShader.indexOf('transformed += tkN') < shader.vertexShader.indexOf('#include <project_vertex>'));
  // uniform：太さだけが個別、それ以外は共有。式の係数は config から
  assert.equal(shader.uniforms.uOutlinePx.value, rc.outlineHeroPx);
  assert.equal(b.userData.uniforms.uOutlinePx.value, rc.outlineEnemyPx);
  assert.equal(a.userData.uniforms.uPxPerM, b.userData.uniforms.uPxPerM);
  assert.equal(shader.uniforms.uPxPerM.value, outlinePxPerM(cfg.camera.camFovYDeg, cfg.input.refViewPx[1]));
  assert.deepEqual(shader.uniforms.uOutlineClamp.value.toArray(), [rc.outlineMinPx, rc.outlineMaxPx, rc.outlineNearM]);
  assert.deepEqual(shader.uniforms.uOutlineNoise.value.toArray(), [rc.outlineNoiseBaseRatio, rc.outlineNoiseAmpRatio, rc.outlineNoiseFreqRatio]);
  assert.equal(shader.uniforms.uOutlineLight.value, rc.outlineLightBoostRatio);
  // 同じ関数・同じキー → プログラムは共有される
  assert.equal(a.onBeforeCompile, b.onBeforeCompile);
  assert.equal(a.customProgramCacheKey(), b.customProgramCacheKey());
});
