// 骨組み（09 §2 の7・§8.2・§8.3）：剛体スキンの重み、骨の名前、ポーズの純関数。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Matrix4 } from 'three';
import { createBuilder } from '../../src/render/lookdev/build.js';
import { models } from '../../src/data/lookdev/models.js';
import { scene } from '../../src/data/lookdev/scene.js';
import { heroSpringBones, heroSprings, humanBones } from '../../src/data/lookdev/rigs.js';
import { poseAt } from '../../src/render/rig/pose.js';
import { anim } from '../../src/config/anim.js';

const heroBones = [...humanBones, ...heroSpringBones];
const boneIndex = new Map(heroBones.map((b, i) => [b.name, i]));
const animCfg = Object.fromEntries(Object.entries(anim).map(([k, e]) => [k, e.v]));

test('rigBonesValid：骨の親は先に出ていて、名前は重複しない（07 §6.3。ばね専用の骨を含む）', () => {
  const seen = new Set();
  for (const b of heroBones) {
    assert.ok(!seen.has(b.name), b.name);
    if (b.parent !== null) assert.ok(seen.has(b.parent), `${b.name} の親 ${b.parent}`);
    seen.add(b.name);
  }
});

test('rigRigidSkin：主人公の全頂点が骨を1本だけ持ち、重みは (1,0,0,0)。部品の骨の名前はすべて骨の表にある', () => {
  const b = createBuilder({
    models, palette: scene.palette, segMul: 1, faceOf: () => null,
    boneIndex: (name) => {
      const i = boneIndex.get(name);
      assert.ok(i !== undefined, `骨が無い ${name}`);
      return /** @type {number} */ (i);
    },
  });
  b.addAll(models.hero.parts, new Matrix4(), {});
  const g = b.toGeometry();
  const si = g.getAttribute('skinIndex');
  const sw = g.getAttribute('skinWeight');
  assert.equal(si.count, g.getAttribute('position').count);
  const used = new Set();
  for (let i = 0; i < sw.count; i++) {
    assert.deepEqual([sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i)], [1, 0, 0, 0]);
    used.add(si.getX(i));
  }
  // 脚・腕・頭・刀がそれぞれの骨に付いている
  for (const name of ['shinR', 'footL', 'handL', 'head', 'hips', 'weapon', 'sleeveL', 'hakamaR', 'hair1', 'hachiA3', 'hachiB2']) assert.ok(used.has(boneIndex.get(name)), name);
  // 揺れの表の骨はすべて骨の表にある
  for (const sp of heroSprings) assert.ok(boneIndex.has(sp.bone), sp.bone);
});

test('rigPosePure：poseAt は同じ入力で同じ結果、入力を書き換えない。止まっていれば脚は振らない', () => {
  const rig = Object.freeze({ bones: humanBones });
  const loco = Object.freeze({ timeS: 1.23, speedMps: 6.5, runSpeedMps: 6.5, tickRateHz: 60, anim: Object.freeze({ ...animCfg }) });
  const n = humanBones.length * 4 + 3;
  const a = poseAt(rig, null, 0, loco, new Float32Array(n));
  const b = poseAt(rig, null, 0, loco, new Float32Array(n));
  assert.deepEqual(Array.from(a), Array.from(b));
  const thighL = boneIndex.get('thighL') ?? 0;
  assert.ok(Math.abs(a[thighL * 4]) > 0.01, '走っていれば太ももが振れる');
  const still = poseAt(rig, null, 0, { ...loco, speedMps: 0 }, new Float32Array(n));
  assert.equal(still[thighL * 4], 0);
  assert.equal(still[thighL * 4 + 3], 1);
  // 四元数はすべて長さ1
  for (let i = 0; i < humanBones.length; i++) {
    const len = Math.hypot(a[i * 4], a[i * 4 + 1], a[i * 4 + 2], a[i * 4 + 3]);
    assert.ok(Math.abs(len - 1) < 1e-5);
  }
});

test('rigSprings：親が前へ加速すると、ばねの骨は後ろへ遅れ（X の正）、止まれば戻る。角度は limitDeg で止まる', async () => {
  const { Bone } = await import('three');
  const { createSprings } = await import('../../src/render/rig/springs.js');
  const parent = new Bone();
  const child = new Bone();
  child.name = 'c';
  parent.add(child);
  const A = { springKRatio: animCfg.springKRatio, springDampingRatio: animCfg.springDampingRatio, springInputMul: animCfg.springInputMul };
  const sp = createSprings([{ bone: 'c', axes: 'xz', gainMul: 0.1, limitDeg: 70 }], new Map([['c', child]]));
  const dt = 1 / 60;
  const angle = () => {
    child.quaternion.identity();
    sp.apply();
    return 2 * Math.asin(child.quaternion.x);
  };
  // 止まっている間は揺れない
  for (let i = 0; i < 10; i++) { parent.updateMatrixWorld(true); sp.step(dt, A); }
  assert.equal(angle(), 0);
  // 前（+Z）へ加速
  let v = 0;
  for (let i = 0; i < 12; i++) { v += 20 * dt; parent.position.z += v * dt; parent.updateMatrixWorld(true); sp.step(dt, A); }
  const lag = angle();
  assert.ok(lag > 0.02, `後ろへ遅れる ${lag}`);
  assert.ok(lag <= (70 * Math.PI) / 180 + 1e-6);
  // 等速になると戻っていく
  for (let i = 0; i < 240; i++) { parent.position.z += v * dt; parent.updateMatrixWorld(true); sp.step(dt, A); }
  assert.ok(Math.abs(angle()) < lag * 0.2, '等速では戻る');
});

test('rigBlink：まばたきの間隔は blinkMinS〜blinkMaxS、閉じる長さは blinkF tick、同じ時刻なら同じ（07 §6.6）', async () => {
  const { blinkAt } = await import('../../src/render/rig/pose.js');
  const hz = 60;
  const starts = [];
  let closed = 0;
  let prev = 0;
  for (let t = 0; t < hz * 120; t++) {
    const b = blinkAt(t / hz, animCfg, hz);
    assert.equal(b, blinkAt(t / hz, animCfg, hz));
    if (b && !prev) starts.push(t);
    closed += b;
    prev = b;
  }
  assert.ok(starts.length > 10);
  for (let i = 1; i < starts.length; i++) {
    const gap = (starts[i] - starts[i - 1]) / hz;
    assert.ok(gap >= animCfg.blinkMinS - 1 / hz && gap <= animCfg.blinkMaxS + 1 / hz, `間隔 ${gap}`);
  }
  assert.ok(Math.abs(closed / starts.length - animCfg.blinkF) <= 1, '閉じる長さ');
});
