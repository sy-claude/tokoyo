// 不変条件7（09 2章）：剛体スキンの1メッシュ・純関数のポーズ。07受5・6・7（楓真）。
// 骨・部品のデータ（data/rigs）から Node の中で組み立てて確かめる（描画はしない）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BackSide, Euler, Quaternion, Vector3 } from 'three';
import { makeCfg } from './helpers/cfg.js';
import { DEG2RAD } from '../../src/core/math.js';
import { characters } from '../../src/data/characters.js';
import { fumaRig } from '../../src/data/rigs/fuma.js';
import { extrudeShapes } from '../../src/data/rigs/shapes.js';
import { poseableBones, validatePoseJoints, validateRig } from '../../src/data/validate.js';
import { createOutlineMaterial, createOutlineShared } from '../../src/render/materials/outline.js';
import { createToonMaterial, createToonShared } from '../../src/render/materials/toon.js';
import { averagedNormals, buildRig, partGeometry } from '../../src/render/rig/buildRig.js';
import { makePoseRig, poseAt, poseSize } from '../../src/render/rig/pose.js';
import { breezeAccel, createSprings, stepSpring } from '../../src/render/rig/springs.js';

const cfg = makeCfg();
const an = cfg.anim;

function build(rigDef) {
  const bodyMaterial = createToonMaterial(createToonShared(cfg), { rimColor: cfg.palette.rimHero, faceTexture: null });
  const outlineMaterial = createOutlineMaterial(createOutlineShared(cfg), { px: cfg.render.outlineHeroPx, color: cfg.palette.ink });
  return { rig: buildRig(rigDef, { cfg, bodyMaterial, outlineMaterial }), bodyMaterial, outlineMaterial };
}

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o) && !ArrayBuffer.isView(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}

const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

test('skinnedMeshCount：全キャラで SkinnedMesh が本体1＋武器1、輪郭を足して描画命令は4（不変条件7・07受5）', () => {
  const ids = Object.keys(characters);
  assert.ok(ids.includes('fuma'));
  for (const id of ids) {
    const look = characters[id];
    assert.deepEqual(validateRig(look.rig, id), [], `${id} の造形データ`);
    const { rig, bodyMaterial, outlineMaterial } = build(look.rig);
    const meshes = rig.group.children.filter((c) => c.isSkinnedMesh);
    const bodies = meshes.filter((m) => m.material === bodyMaterial);
    const outlines = meshes.filter((m) => m.material === outlineMaterial);
    const hasWeapon = Boolean(look.rig.weapon);
    assert.equal(bodies.length, hasWeapon ? 2 : 1, `${id}: 本体1＋武器1`);
    assert.equal(outlines.length, bodies.length, `${id}: 輪郭は本体・武器に1つずつ`);
    assert.equal(meshes.length, hasWeapon ? 4 : 2, `${id}: 1体の描画命令＝2（武器持ちは4）`);
    assert.equal(rig.drawCalls, meshes.length);
    assert.equal(rig.group.children.length, meshes.length, `${id}: SkinnedMesh 以外を置かない`);
    assert.equal(rig.body.skeleton.bones.length, look.rig.bones.length);
  }
});

test('skinWeightOne：全頂点の skinWeight が (1,0,0,0)、skinIndex は骨の範囲内（不変条件7・07受6）', () => {
  for (const [id, look] of Object.entries(characters)) {
    const { rig } = build(look.rig);
    for (const mesh of [rig.body, rig.weapon].filter(Boolean)) {
      const w = mesh.geometry.getAttribute('skinWeight');
      const idx = mesh.geometry.getAttribute('skinIndex');
      const boneCount = mesh.skeleton.bones.length;
      assert.ok(w.count > 100, `${id}/${mesh.name}: 頂点がある`);
      assert.equal(w.count, mesh.geometry.getAttribute('position').count);
      for (let i = 0; i < w.count; i++) {
        if (w.getX(i) !== 1 || w.getY(i) !== 0 || w.getZ(i) !== 0 || w.getW(i) !== 0) assert.fail(`${id}/${mesh.name}: 頂点${i} の skinWeight が (1,0,0,0) でない`);
        if (!(idx.getX(i) >= 0 && idx.getX(i) < boneCount) || idx.getY(i) !== 0 || idx.getZ(i) !== 0 || idx.getW(i) !== 0) assert.fail(`${id}/${mesh.name}: 頂点${i} の skinIndex が不正`);
      }
    }
  }
});

test('outlineSharesBones：輪郭は本体と同じジオメトリ・同じ Skeleton・同じ bindMatrix（骨を共有しないとずれる。10 §M1a のリスク）', () => {
  const { rig } = build(fumaRig);
  for (const [main, line] of [[rig.body, rig.outline], [rig.weapon, rig.weaponOutline]]) {
    assert.equal(line.geometry, main.geometry);
    assert.equal(line.skeleton, main.skeleton);
    assert.deepEqual(line.bindMatrix.elements, main.bindMatrix.elements);
    assert.equal(line.material.side, BackSide);
    assert.ok(line.geometry.getAttribute('aOutlineNormal'), '平均法線の属性がある');
  }
  // 武器の骨は手の骨（socket）の子：手を動かせば武器も輪郭もついてくる
  const socket = rig.bones[rig.boneIndex[fumaRig.weapon.socket]];
  assert.equal(rig.weapon.skeleton.bones[0].parent, socket);
  const before = new Vector3().setFromMatrixPosition(rig.weapon.skeleton.bones[0].matrixWorld);
  rig.bones[rig.boneIndex.armR].rotation.x = -1;
  rig.group.updateMatrixWorld(true);
  const after = new Vector3().setFromMatrixPosition(rig.weapon.skeleton.bones[0].matrixWorld);
  assert.ok(before.distanceTo(after) > 0.1);
});

test('outlineNormalsWelded：同じ位置の頂点は同じ平均法線を持ち、長さは1（輪郭が割れない。07 4章）', () => {
  for (const part of [...fumaRig.parts, ...fumaRig.weapon.parts]) {
    const geo = partGeometry(part, an);
    const pos = geo.getAttribute('position');
    const out = averagedNormals(geo, an.rigWeldEpsM);
    const seen = new Map();
    for (let i = 0; i < pos.count; i++) {
      const n = [out[i * 3], out[i * 3 + 1], out[i * 3 + 2]];
      assert.ok(near(Math.hypot(...n), 1, 1e-4), `${part.name}: 長さ1`);
      const key = [pos.getX(i), pos.getY(i), pos.getZ(i)].map((v) => Math.round(v / an.rigWeldEpsM)).join(',');
      const first = seen.get(key);
      if (first) assert.ok(first.every((v, k) => near(v, n[k], 1e-6)), `${part.name}: 同じ位置で法線が違う`);
      else seen.set(key, n);
    }
  }
});

test('partsOutward：部品の面は外向き（三角形の巻きと法線が一致）。押し出しの形は断面のデータどおり', () => {
  for (const part of [...fumaRig.parts, ...fumaRig.weapon.parts]) {
    const geo = partGeometry(part, an);
    const pos = geo.getAttribute('position');
    const nor = geo.getAttribute('normal');
    assert.equal(geo.index, null, `${part.name}: 索引なし`);
    assert.equal(pos.count % 3, 0);
    const a = new Vector3();
    const b = new Vector3();
    const c = new Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i);
      b.fromBufferAttribute(pos, i + 1);
      c.fromBufferAttribute(pos, i + 2);
      const face = b.clone().sub(a).cross(c.clone().sub(a));
      if (face.lengthSq() < 1e-16) continue; // 極の縮んだ三角形
      const n = new Vector3().fromBufferAttribute(nor, i).add(new Vector3().fromBufferAttribute(nor, i + 1)).add(new Vector3().fromBufferAttribute(nor, i + 2));
      assert.ok(face.dot(n) > 0, `${part.name}: 三角形${i / 3} が裏返っている`);
    }
  }
  // 押し出しの長さ＝dims の長さ（−Y へ伸びる）
  const blade = fumaRig.weapon.parts.find((p) => p.name === 'blade');
  const g = partGeometry(blade, an);
  g.computeBoundingBox();
  assert.ok(near(g.boundingBox.min.y, -blade.dims[1], 1e-6));
  assert.ok(near(g.boundingBox.max.y, 0, 1e-6));
  assert.ok(Object.hasOwn(extrudeShapes, blade.dims[0]));
});

test('poseAtPure：凍結した入力で2回呼ぶ → 結果が一致し、入力が変わらない（不変条件7）', () => {
  const poseRig = deepFreeze(makePoseRig(structuredClone(fumaRig), structuredClone(an)));
  const loco = deepFreeze({ tF: 137.25 });
  const snapshot = JSON.stringify([poseRig, loco]);
  const a = poseAt(poseRig, null, 0, loco, new Float32Array(poseSize(poseRig)));
  const b = poseAt(poseRig, null, 0, loco, new Float32Array(poseSize(poseRig)));
  assert.deepEqual(Array.from(a), Array.from(b));
  assert.equal(JSON.stringify([poseRig, loco]), snapshot);
  assert.equal(a.length, fumaRig.bones.length * 4 + 3);
  // 四元数は長さ1。根の位置のずれは待機では0
  for (let i = 0; i < fumaRig.bones.length; i++) assert.ok(near(Math.hypot(a[i * 4], a[i * 4 + 1], a[i * 4 + 2], a[i * 4 + 3]), 1, 1e-5));
  assert.deepEqual(Array.from(a.slice(-3)), [0, 0, 0]);
  // out を使い回しても同じ（前の中身に左右されない）
  const reused = new Float32Array(poseSize(poseRig)).fill(9);
  assert.deepEqual(Array.from(poseAt(poseRig, null, 0, loco, reused)), Array.from(a));
});

test('idlePose：待機＝基本姿勢＋呼吸（chest の X 回転、幅 idleBreathDeg、周期 idleBreathS）。2tick に1回だけ更新（07 6.6）', () => {
  const poseRig = makePoseRig(fumaRig, an);
  const n = fumaRig.bones.length;
  const quatOf = (out, name) => Array.from(out.slice(poseRig.index[name] * 4, poseRig.index[name] * 4 + 4));
  const expectQuat = (deg) => new Quaternion().setFromEuler(new Euler(deg[0] * DEG2RAD, deg[1] * DEG2RAD, deg[2] * DEG2RAD, 'XYZ')).toArray();
  const at = (tF) => poseAt(poseRig, null, 0, { tF }, new Float32Array(n * 4 + 3));
  const closeQ = (q, e) => q.every((v, k) => near(v, e[k], 1e-5));

  const t0 = at(0);
  // t=0：基本姿勢そのまま（関節は Euler 'XYZ'・度）。基本姿勢に無い関節は回転なし
  for (const [name, deg] of Object.entries(fumaRig.stance)) assert.ok(closeQ(quatOf(t0, name), expectQuat(deg)), name);
  assert.ok(closeQ(quatOf(t0, 'neck'), [0, 0, 0, 1]));
  assert.ok(closeQ(quatOf(t0, 'root'), [0, 0, 0, 1]));
  // 1/4 周期：chest の X が idleBreathDeg だけ増える
  const quarterF = (an.idleBreathS * cfg.time.tickRateHz) / 4;
  const [cx, cy, cz] = fumaRig.stance.chest;
  assert.ok(closeQ(quatOf(at(quarterF), 'chest'), expectQuat([cx + an.idleBreathDeg, cy, cz])));
  assert.ok(closeQ(quatOf(at(quarterF * 3), 'chest'), expectQuat([cx - an.idleBreathDeg, cy, cz])));
  // 2tick に1回の更新：奇数の tick は直前の偶数の tick と同じ
  assert.equal(an.animTwosEnabled, true);
  assert.deepEqual(Array.from(at(11)), Array.from(at(10)));
  assert.deepEqual(Array.from(at(10.9)), Array.from(at(10)));
  assert.notDeepEqual(Array.from(at(12)), Array.from(at(10)));
  // 袴：自分の太もも×hakamaOwnRatio＋両脚の平均×残り（07 6.2-3）
  const tl = fumaRig.stance.thighL;
  const tr = fumaRig.stance.thighR;
  const mix = (own, opp) => own.map((v, k) => an.hakamaOwnRatio * v + (1 - an.hakamaOwnRatio) * ((v + opp[k]) / 2));
  assert.ok(closeQ(quatOf(t0, 'hakamaL'), expectQuat(mix(tl, tr))));
  assert.ok(closeQ(quatOf(t0, 'hakamaR'), expectQuat(mix(tr, tl))));
});

test('poseJointNames：ポーズの関節名は 07 6.3 の「ポーズ対象」と weapon だけ（データ検証で不一致0。07受7）', () => {
  // 今あるポーズのデータ（待機の基本姿勢）は全キャラで不一致0。技のポーズ（M3a〜）も同じ検証を通す
  for (const [id, look] of Object.entries(characters)) {
    assert.deepEqual(validatePoseJoints(look.rig, look.rig.stance ?? {}, id), []);
  }
  const ok = poseableBones(fumaRig);
  for (const name of ['hips', 'spine', 'chest', 'neck', 'head', 'armL', 'armR', 'forearmL', 'forearmR', 'handL', 'handR',
    'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR', 'weapon']) assert.ok(ok.has(name), name);
  assert.equal(ok.size, 18);
  // 根・ばね専用の骨・無い骨はエラー
  const bad = validatePoseJoints(fumaRig, { root: [0, 0, 0], sleeveL: [0, 0, 0], hair2: [1, 0, 0], hakamaR: [0, 0, 0], tail9: [0, 0, 0], chest: [1, 2] }, 'x');
  assert.equal(bad.length, 6);
  for (const name of ['root', 'sleeveL', 'hair2', 'hakamaR', 'tail9']) assert.ok(bad.some((e) => e.includes(`関節 ${name} `)), name);
  assert.ok(bad.some((e) => e.includes('chest') && e.includes('[x,y,z]')));
});

test('[検算] boneTable：楓真の骨の位置は 07 6.3 の表のとおり', () => {
  // 07 6.3（人型、楓真1.72m 基準）
  const expected = {
    root: [null, [0, 0, 0]], hips: ['root', [0, 0.95, 0]], spine: ['hips', [0, 0.1, 0]], chest: ['spine', [0, 0.18, 0]],
    neck: ['chest', [0, 0.22, 0]], head: ['neck', [0, 0.08, 0]], armL: ['chest', [0.19, 0.17, 0]], armR: ['chest', [-0.19, 0.17, 0]],
    forearmL: ['armL', [0, -0.28, 0]], forearmR: ['armR', [0, -0.28, 0]], handL: ['forearmL', [0, -0.25, 0]], handR: ['forearmR', [0, -0.25, 0]],
    thighL: ['hips', [0.1, -0.04, 0]], thighR: ['hips', [-0.1, -0.04, 0]], shinL: ['thighL', [0, -0.44, 0]], shinR: ['thighR', [0, -0.44, 0]],
    footL: ['shinL', [0, -0.4, 0]], footR: ['shinR', [0, -0.4, 0]], weapon: ['handR', [0, -0.06, 0.02]],
    sleeveL: ['armL', [0.02, -0.02, 0]], sleeveR: ['armR', [-0.02, -0.02, 0]], hakamaL: ['hips', [0.1, -0.04, 0]], hakamaR: ['hips', [-0.1, -0.04, 0]],
    hemB: ['hips', [0, -0.02, -0.1]], hair1: ['head', [0, -0.02, -0.11]], hair2: ['hair1', [0, -0.08, 0]], hair3: ['hair2', [0, -0.08, 0]], hair4: ['hair3', [0, -0.08, 0]],
    hachiA1: ['head', [0.03, 0.06, -0.13]], hachiA2: ['hachiA1', [0, -0.2, 0]], hachiA3: ['hachiA2', [0, -0.2, 0]],
    hachiB1: ['head', [-0.03, 0.06, -0.13]], hachiB2: ['hachiB1', [0, -0.2, 0]], hachiB3: ['hachiB2', [0, -0.2, 0]],
  };
  assert.equal(fumaRig.bones.length, Object.keys(expected).length);
  for (const b of fumaRig.bones) {
    assert.ok(expected[b.name], b.name);
    assert.equal(b.parent, expected[b.name][0], `${b.name} の親`);
    assert.deepEqual(b.posM, expected[b.name][1], `${b.name} の位置`);
  }
  assert.equal(fumaRig.scaleMul, 1);
  // 07 6.5：gainMul（大袖0.06・袴0.03・羽織の裾0.04・後ろ髪0.08・鉢巻の尾0.10）と limitDeg（袴25・他70）
  const gain = { sleeve: 0.06, hakama: 0.03, hemB: 0.04, hair: 0.08, hachi: 0.1 };
  assert.equal(fumaRig.springs.length, 15);
  for (const s of fumaRig.springs) {
    const kind = Object.keys(gain).find((k) => s.bone.startsWith(k));
    assert.equal(s.gainMul, gain[kind], s.bone);
    assert.equal(s.limitDeg, kind === 'hakama' ? 25 : 70, s.bone);
  }
});

test('rigBuildBindPose：組み立てた骨はバインド姿勢（回転なし）で、頭は上・足は下。武器は右手の先', () => {
  const { rig } = build(fumaRig);
  rig.group.updateMatrixWorld(true);
  const posOf = (name) => new Vector3().setFromMatrixPosition(rig.bones[rig.boneIndex[name]].matrixWorld);
  const sum = (name) => {
    let y = 0;
    for (let b = fumaRig.bones.find((x) => x.name === name); b; b = fumaRig.bones.find((x) => x.name === b.parent)) y += b.posM[1];
    return y;
  };
  for (const name of ['head', 'handR', 'footL', 'hachiB3']) assert.ok(near(posOf(name).y, sum(name), 1e-6), name);
  assert.ok(posOf('armL').x > 0 && posOf('armR').x < 0, '左は +X');
  for (const b of rig.bones) assert.deepEqual(b.quaternion.toArray(), [0, 0, 0, 1]);
  // 体のジオメトリは足元（y=0）から頭の上まで。07 6.2-4：人物は約6頭身
  rig.body.geometry.computeBoundingBox();
  const box = rig.body.geometry.boundingBox;
  assert.ok(near(box.min.y, 0, 0.02), `足元 ${box.min.y}`);
  assert.ok(box.max.y > 1.7 && box.max.y < 1.9, `頭頂 ${box.max.y}`);
  // 視錐台の判定に使う球は、体と武器の両方を含む大きさ
  assert.ok(rig.body.boundingSphere.radius > box.max.y / 2);
  assert.deepEqual(rig.weapon.boundingSphere.center.toArray(), rig.body.boundingSphere.center.toArray());
});

test('validateRigDetects：造形データの誤りを検出する', () => {
  const broken = (edit) => {
    const r = structuredClone(fumaRig);
    edit(r);
    return validateRig(r, 'x').length;
  };
  assert.equal(broken(() => {}), 0);
  assert.ok(broken((r) => { r.parts[0].bone = 'nope'; }) > 0);
  assert.ok(broken((r) => { r.parts[0].color = 'notAColor'; }) > 0);
  assert.ok(broken((r) => { r.parts[0].shape = 'blob'; }) > 0);
  assert.ok(broken((r) => { r.parts[2].dims = ['noSuchShape', 0.2, 0.2]; }) > 0);
  assert.ok(broken((r) => { r.bones[3].parent = 'head'; }) > 0, '親は先に書く');
  assert.ok(broken((r) => { r.bones.push({ ...r.bones[1] }); }) > 0, '骨の重複');
  assert.ok(broken((r) => { r.springs[0].bone = 'root'; }) > 0);
  assert.ok(broken((r) => { r.springs[0].limitDeg = 0; }) > 0);
  assert.ok(broken((r) => { r.weapon.socket = 'tail'; }) > 0);
  assert.ok(broken((r) => { r.stance.sleeveL = [0, 0, 0]; }) > 0, 'ばね専用の骨はポーズ不可');
  assert.ok(broken((r) => { r.scaleMul = 0; }) > 0);
});

test('springStep：ばね1本は 釣り合い＋外力/k へ落ち着き、±limit で止まる（07 6.5）', () => {
  const k = an.springKRatio;
  // 外力なし：ずらした所から釣り合いへ戻る
  let [a, v] = [0.5, 0];
  for (let i = 0; i < 600; i++) [a, v] = stepSpring(a, v, 0.1, 0, 2, an);
  assert.ok(near(a, 0.1, 1e-4) && near(v, 0, 1e-3));
  // 一定の外力 d：釣り合いは rest + d/k
  [a, v] = [0, 0];
  for (let i = 0; i < 600; i++) [a, v] = stepSpring(a, v, 0, k * 0.2, 2, an);
  assert.ok(near(a, 0.2, 1e-4));
  // 減衰比 < 1：行き過ぎてから戻る
  [a, v] = [0, 0];
  let peak = 0;
  for (let i = 0; i < 120; i++) {
    [a, v] = stepSpring(a, v, 0, k * 0.2, 2, an);
    peak = Math.max(peak, a);
  }
  assert.ok(an.springDampingRatio < 1 && peak > 0.2 && peak < 0.3, `peak=${peak}`);
  // 上限で止まり、速度は0になる
  [a, v] = [0, 0];
  for (let i = 0; i < 120; i++) [a, v] = stepSpring(a, v, 0, k * 5, 0.3, an);
  assert.deepEqual([a, v], [0.3, 0]);
  [a, v] = stepSpring(0, 0, 0, -k * 500, 0.3, an);
  assert.deepEqual([a, v], [-0.3, 0]);
});

test('springsFollowAccel：前へ加速すると揺れものは後ろへ遅れる。止まれば釣り合いへ戻る。同じ入力なら同じ結果', () => {
  const calm = { ...an, breezeAccelMps2: 0 };
  const make = () => {
    const { rig } = build(fumaRig);
    rig.group.updateMatrixWorld(true);
    return createSprings(fumaRig.springs, rig.bones, rig.boneIndex, calm);
  };
  const s = make();
  assert.equal(s.count, fumaRig.springs.length);
  const rest = (name) => fumaRig.springs.find((d) => d.bone === name).restDeg ?? [0, 0];
  const get = (sp, name) => sp.snapshot().find((x) => x.bone === name);
  // 初めは釣り合いの角度
  for (const d of fumaRig.springs) assert.ok(near(get(s, d.bone).xDeg, rest(d.bone)[0], 1e-9) && near(get(s, d.bone).zDeg, rest(d.bone)[1], 1e-9));
  // +Z（前）へ 6 tick 加速：先は −Z（後ろ）へ＝X 回転が正の向きに増える。gainMul の大きいものほど大きく揺れる
  s.step(6, 0, [0, 0, 40]);
  const sleeve = get(s, 'sleeveL').xDeg - rest('sleeveL')[0];
  const tail = get(s, 'hachiA1').xDeg - rest('hachiA1')[0];
  const hakama = get(s, 'hakamaL').xDeg - rest('hakamaL')[0];
  assert.ok(sleeve > 1 && tail > sleeve && hakama > 0 && hakama < sleeve, `sleeve=${sleeve} tail=${tail} hakama=${hakama}`);
  // +X へ加速：Z 回転は負（先が −X へ遅れる）。axes 'x' の骨（袴）は Z に揺れない
  const s2 = make();
  s2.step(6, 0, [40, 0, 0]);
  assert.ok(get(s2, 'sleeveL').zDeg < -1);
  assert.equal(get(s2, 'hakamaL').zDeg, 0);
  // 上限を超えない（とても大きな加速度は springAccelMaxMps2 で頭打ち）
  const s3 = make();
  s3.step(60, 0, [0, 0, 1e6]);
  for (const d of fumaRig.springs) assert.ok(Math.abs(get(s3, d.bone).xDeg) <= d.limitDeg + 1e-9, d.bone);
  const s4 = make();
  s4.step(6, 0, [0, 0, calm.springAccelMaxMps2]);
  const s5 = make();
  s5.step(6, 0, [0, 0, calm.springAccelMaxMps2 * 10]);
  assert.deepEqual(s5.snapshot(), s4.snapshot());
  // 加速をやめて 5 秒：釣り合いへ戻る
  s.step(300, 6, [0, 0, 0]);
  assert.ok(near(get(s, 'hachiA1').xDeg, rest('hachiA1')[0], 1e-3));
  // 決定論：同じ手順は同じ結果。reset で釣り合いへ
  const a = make();
  const b = make();
  for (const sp of [a, b]) {
    sp.step(7, 0, [3, 0, -9]);
    sp.step(20, 7, [0, 0, 0]);
  }
  assert.deepEqual(a.snapshot(), b.snapshot());
  a.reset();
  assert.ok(near(get(a, 'hair1').xDeg, rest('hair1')[0], 1e-9));
});

test('breeze：そよ風は時刻とばねの番号だけで決まり、待機でも袖・髪が揺れる（10 §M1a の撮影7）', () => {
  const out1 = breezeAccel(90, 2, an, new Vector3());
  const out2 = breezeAccel(90, 2, an, new Vector3());
  assert.deepEqual(out1.toArray(), out2.toArray());
  assert.equal(out1.y, 0);
  // 強さは 0〜breezeAccelMps2×(1+breezeFlutterRatio)
  let max = 0;
  for (let t = 0; t < 600; t++) max = Math.max(max, breezeAccel(t, 0, an, new Vector3()).length());
  assert.ok(max > an.breezeAccelMps2 * 0.9 && max <= an.breezeAccelMps2 * (1 + an.breezeFlutterRatio) + 1e-9, `max=${max}`);
  // 立ったまま 1.5 秒：袖と鉢巻の尾が釣り合いから動いている
  const { rig } = build(fumaRig);
  rig.group.updateMatrixWorld(true);
  const s = createSprings(fumaRig.springs, rig.bones, rig.boneIndex, an);
  const before = s.snapshot();
  s.step(90, 0, [0, 0, 0]);
  const after = s.snapshot();
  const moved = (prefix) => Math.max(...after.filter((x) => x.bone.startsWith(prefix)).map((x, i) => {
    const b = before.filter((y) => y.bone.startsWith(prefix))[i];
    return Math.hypot(x.xDeg - b.xDeg, x.zDeg - b.zDeg);
  }));
  assert.ok(moved('sleeve') > 0.3, `sleeve ${moved('sleeve')}`);
  assert.ok(moved('hachi') > 2, `hachi ${moved('hachi')}`);
  assert.ok(moved('hair') > 1, `hair ${moved('hair')}`);
});
