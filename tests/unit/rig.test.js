// 骨組み（09 §2 の7・§8.2・§8.3）：剛体スキンの重み、骨の名前、ポーズの純関数。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Matrix4 } from 'three';
import { createBuilder } from '../../src/render/lookdev/build.js';
import { models } from '../../src/data/lookdev/models.js';
import { scene } from '../../src/data/lookdev/scene.js';
import { humanBones } from '../../src/data/lookdev/rigs.js';
import { poseAt } from '../../src/render/rig/pose.js';
import { anim } from '../../src/config/anim.js';

const boneIndex = new Map(humanBones.map((b, i) => [b.name, i]));
const animCfg = Object.fromEntries(Object.entries(anim).map(([k, e]) => [k, e.v]));

test('rigBonesValid：骨の親は先に出ていて、名前は重複しない（07 §6.3）', () => {
  const seen = new Set();
  for (const b of humanBones) {
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
  for (const name of ['thighL', 'shinR', 'footL', 'armR', 'handL', 'head', 'hips', 'weapon']) assert.ok(used.has(boneIndex.get(name)), name);
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
