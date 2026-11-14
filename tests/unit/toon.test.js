// トゥーンの階調と光の向き（07 3.3）。純関数を Node で確かめる。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeCfg } from './helpers/cfg.js';
import { DEG2RAD } from '../../src/core/math.js';
import { sandbox } from '../../src/data/stages/sandbox.js';
import { createToonMaterial, createToonShared, toonBand, toonRampData } from '../../src/render/materials/toon.js';
import { dirFromAzEl, mainLightDir, sunAzimuthDeg } from '../../src/render/stage/light.js';
import { faceCellUv, faceCols, faceRowShift } from '../../src/render/rig/face.js';

const cfg = makeCfg();
const rc = cfg.render;
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

test('toonBands：h＝0.5·N·L+0.5 を toonEdge1Ratio・toonEdge2Ratio で3段に分ける', () => {
  assert.equal(toonBand(0, rc), 0);
  assert.equal(toonBand(rc.toonEdge1Ratio - 1e-6, rc), 0);
  assert.equal(toonBand(rc.toonEdge1Ratio, rc), 1);
  assert.equal(toonBand(rc.toonEdge2Ratio - 1e-6, rc), 1);
  assert.equal(toonBand(rc.toonEdge2Ratio, rc), 2);
  assert.equal(toonBand(1, rc), 2);
});

test('rampTexture：階調テクスチャは 16×1。R＝段の明るさ、G＝shadowTint の割合（陰1.0・中0.35・明0）', () => {
  const data = toonRampData(rc);
  assert.equal(data.length, rc.toonRampPx * 4);
  const levels = [rc.toonLevelDarkRatio, rc.toonLevelMidRatio, rc.toonLevelLitRatio];
  const tints = [rc.toonShadowTintDarkMul, rc.toonShadowTintMidMul, 0];
  const seen = new Set();
  for (let i = 0; i < rc.toonRampPx; i++) {
    const band = toonBand((i + 0.5) / rc.toonRampPx, rc);
    seen.add(band);
    assert.equal(data[i * 4], Math.round(levels[band] * 255), `画素${i} の明るさ`);
    assert.equal(data[i * 4 + 1], Math.round(tints[band] * 255), `画素${i} の藍寄せ`);
    assert.equal(data[i * 4 + 3], 255);
  }
  assert.deepEqual([...seen].sort(), [0, 1, 2]);
  // 段は左（陰）から右（明）へ単調に明るくなる
  for (let i = 1; i < rc.toonRampPx; i++) assert.ok(data[i * 4] >= data[(i - 1) * 4]);
  const shared = createToonShared(cfg);
  const tex = shared.uniforms.tRamp.value;
  assert.deepEqual([tex.image.width, tex.image.height], [rc.toonRampPx, 1]);
  assert.equal(tex.generateMipmaps, false);
});

test('[検算] toonValues：07 3.3 の表の値', () => {
  // 07 3.3
  assert.deepEqual([rc.toonEdge1Ratio, rc.toonEdge2Ratio], [0.35, 0.62]);
  assert.deepEqual([rc.toonLevelDarkRatio, rc.toonLevelMidRatio, rc.toonLevelLitRatio], [0.58, 0.8, 0.98]);
  assert.deepEqual([rc.toonShadowTintDarkMul, rc.toonShadowTintMidMul], [1.0, 0.35]);
  assert.deepEqual([rc.rimPowerRatio, rc.rimStepRatio, rc.rimStrengthRatio], [3.0, 0.55, 0.35]);
  assert.deepEqual([rc.lightAzimuthOffsetDeg, rc.lightElevationDeg], [35, 40]);
  assert.equal(rc.toonRampPx, 16);
});

test('toonMaterial：1体ぶんの材質は、階調・光・陰の色を共有し、縁の色と顔のずらしだけを個別に持つ', () => {
  const shared = createToonShared(cfg);
  const a = createToonMaterial(shared, { rimColor: cfg.palette.rimHero, faceTexture: null });
  const b = createToonMaterial(shared, { rimColor: cfg.palette.rimEnemy, faceTexture: null });
  for (const key of ['tRamp', 'uLightDir', 'uShadowTint', 'uRim']) assert.equal(a.uniforms[key], b.uniforms[key], key);
  assert.notEqual(a.uniforms.uRimColor, b.uniforms.uRimColor);
  assert.notEqual(a.uniforms.uFaceShift, b.uniforms.uFaceShift);
  assert.equal(a.vertexShader, b.vertexShader); // 同じ文字列 → プログラムは共有
  assert.equal(a.fragmentShader, b.fragmentShader);
  assert.equal(a.vertexColors, true);
  assert.deepEqual(a.uniforms.uRim.value.toArray(), [rc.rimPowerRatio, rc.rimStepRatio, rc.rimSoftRatio, rc.rimStrengthRatio]);
  shared.setLightDir([0, 0, 1]);
  assert.deepEqual(b.uniforms.uLightDir.value.toArray(), [0, 0, 1]);
});

test('sunAzimuth：夕日の方位＝bossGate → ボス舞台の中心の向き（北から時計回り。07 3.3・07受23 の式）', () => {
  const stage = (gx, gz, ax, az) => ({ bossGate: { pos: [gx, 0, gz], yawDeg: 0, gaugeReq: 0 }, bossArena: { center: [ax, 0, az], rM: 1 } });
  assert.ok(near(sunAzimuthDeg(stage(0, 0, 0, -10)), 0), '北（−Z）');
  assert.ok(near(sunAzimuthDeg(stage(0, 0, 10, 0)), 90), '東（+X）');
  assert.ok(near(Math.abs(sunAzimuthDeg(stage(0, 0, 0, 10))), 180), '南（+Z）');
  assert.ok(near(sunAzimuthDeg(stage(0, 0, -10, 0)), -90), '西（−X）');
  assert.ok(near(sunAzimuthDeg(stage(5, 7, 15, -3)), 45), '北東');
  // 高さの差は方位に関係しない
  const s = stage(0, 0, 10, 0);
  s.bossArena.center[1] = 50;
  assert.ok(near(sunAzimuthDeg(s), 90));
});

test('[検算] sandboxLight：試験場の夕日は真南。主光は 南＋35°（南西寄り）・仰角40°', () => {
  // 10 §4.5：夕日は真南＝鳥居の列の向こう
  assert.ok(near(Math.abs(sunAzimuthDeg(sandbox)), 180));
  const L = mainLightDir(sandbox, rc);
  assert.ok(near(Math.hypot(...L), 1, 1e-12));
  assert.ok(near(L[1], Math.sin(40 * DEG2RAD), 1e-12), '仰角40°');
  assert.ok(near(L[0], Math.cos(40 * DEG2RAD) * Math.sin(215 * DEG2RAD), 1e-12));
  assert.ok(near(L[2], -Math.cos(40 * DEG2RAD) * Math.cos(215 * DEG2RAD), 1e-12));
  assert.ok(L[2] > 0 && L[0] < 0, '南（+Z）で西（−X）寄り');
  assert.deepEqual(dirFromAzEl(0, 90).map((v) => Math.round(v * 1e9) / 1e9 + 0), [0, 1, 0]);
});

test('faceAtlasUv：顔アトラスは 512²＝128²×16セル。セル番号＋4 が閉じた目、＋8 が痛がる顔（07 6.8）', () => {
  assert.equal(faceCols(rc), 4);
  assert.equal(faceCols(rc) ** 2, 16);
  // セル0は左上（v は上が1）
  assert.deepEqual(faceCellUv(0, 0, 1, rc), [0, 1]);
  assert.deepEqual(faceCellUv(0, 1, 0, rc), [0.25, 0.75]);
  assert.deepEqual(faceCellUv(5, 0.5, 0.5, rc), [0.375, 0.625]);
  // 行を下へずらす量：閉じた目＝1行、痛＝2行
  const an = cfg.anim;
  const [u, v] = faceCellUv(0, 0.5, 0.5, rc);
  assert.deepEqual([u, v + faceRowShift(an.faceRowClosedCount, rc)], faceCellUv(4, 0.5, 0.5, rc));
  assert.deepEqual([u, v + faceRowShift(an.faceRowPainCount, rc)], faceCellUv(8, 0.5, 0.5, rc));
  assert.equal(faceRowShift(an.faceRowOpenCount, rc), -0);
  // 07 6.8：上まぶた7px・下まぶた3px・瞳14px
  assert.deepEqual([an.faceLidUpperPx, an.faceLidLowerPx, an.facePupilPx], [7, 3, 14]);
});
