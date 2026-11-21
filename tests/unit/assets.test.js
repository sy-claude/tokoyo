// 外部素材の目録（docs/11 §4・§5）：名前と ID が合う・パスは相対・試しの素材は assets-raw（公開版に入らない）・
// GLB の中身（三角形・メッシュ・画像の数と大きさ・ファイルの大きさ）が上限内。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { assetBudgets, assets } from '../../src/data/assets.js';

/** GLB の JSON と BIN を取り出す。 @param {Buffer} b */
function readGlb(b) {
  assert.equal(b.readUInt32LE(0), 0x46546c67, 'GLB の印');
  const jsonLen = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + jsonLen).toString('utf8'));
  const binLen = b.readUInt32LE(20 + jsonLen);
  return { json, bin: b.subarray(28 + jsonLen, 28 + jsonLen + binLen) };
}

/** WebP・PNG・JPEG の幅と高さ。 @param {Buffer} d @returns {[number, number]} */
function imageSize(d) {
  if (d.toString('ascii', 0, 4) === 'RIFF') {
    const kind = d.toString('ascii', 12, 16);
    if (kind === 'VP8X') return [1 + d.readUIntLE(24, 3), 1 + d.readUIntLE(27, 3)];
    if (kind === 'VP8L') {
      const v = d.readUInt32LE(21);
      return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)];
    }
    return [d.readUInt16LE(26) & 0x3fff, d.readUInt16LE(28) & 0x3fff];
  }
  if (d.readUInt32BE(0) === 0x89504e47) return [d.readUInt32BE(16), d.readUInt32BE(20)];
  for (let i = 2; i < d.length; ) {
    const marker = d.readUInt16BE(i);
    if (marker >= 0xffc0 && marker <= 0xffc2) return [d.readUInt16BE(i + 7), d.readUInt16BE(i + 5)];
    i += 2 + d.readUInt16BE(i + 2);
  }
  throw new Error('画像の大きさが読めない');
}

test('assetsCatalog：名前と ID が合い、パスは相対、試しの素材は assets-raw に置く', () => {
  for (const [key, def] of Object.entries(assets)) {
    assert.equal(def.id, key);
    assert.ok(!def.url.startsWith('/'), `${key}: 絶対パス`);
    assert.ok(assetBudgets[def.budget], `${key}: 上限の種類 ${def.budget}`);
    if (def.trial) assert.ok(def.url.startsWith('assets-raw/'), `${key}: 試しの素材は公開版に入らない場所へ`);
    else assert.ok(def.url.startsWith('assets/'), `${key}: 本番の素材は public/assets/`);
  }
});

test('assetsBudget：置いてある GLB は上限内（1体＝1メッシュ、色の画像だけ）', () => {
  let checked = 0;
  for (const def of Object.values(assets)) {
    const file = def.trial ? def.url : `public/${def.url}`;
    if (def.kind !== 'model' || !existsSync(file)) continue;
    const lim = assetBudgets[def.budget];
    const buf = readFileSync(file);
    assert.ok(statSync(file).size <= lim.fileMaxByteCount, `${def.id}: ファイル ${statSync(file).size}`);
    const { json, bin } = readGlb(buf);
    const prims = json.meshes.flatMap((/** @type {any} */ m) => m.primitives);
    const tris = prims.reduce((/** @type {number} */ n, /** @type {any} */ p) => n + json.accessors[p.indices ?? p.attributes.POSITION].count / 3, 0);
    assert.ok(tris <= lim.triMaxCount, `${def.id}: 三角形 ${tris}`);
    assert.ok(prims.length <= lim.meshMaxCount, `${def.id}: メッシュ ${prims.length}`);
    assert.ok((json.images ?? []).length <= lim.texMaxCount, `${def.id}: 画像 ${(json.images ?? []).length}枚`);
    for (const mat of json.materials ?? []) {
      assert.ok(!mat.normalTexture && !mat.pbrMetallicRoughness?.metallicRoughnessTexture, `${def.id}: 色以外の画像`);
    }
    for (const im of json.images ?? []) {
      const v = json.bufferViews[im.bufferView];
      const [w, h] = imageSize(bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength));
      assert.ok(w <= lim.texMaxPx && h <= lim.texMaxPx, `${def.id}: 画像 ${w}×${h}`);
    }
    checked += 1;
  }
  assert.ok(checked >= 1, '少なくとも1つの GLB を調べた');
});

test('assetsAutoSkin：骨の重みは足して1、手・足・頭・胴の点はそれぞれの骨に一番重く付く、帯の横は脚につられない', async () => {
  const { BufferGeometry, Float32BufferAttribute } = await import('three');
  const { autoSkin } = await import('../../src/render/assets/autoSkin.js');
  const { humanBones } = await import('../../src/data/lookdev/rigs.js');
  const { lookdev } = await import('../../src/config/lookdev.js');
  const rig = /** @type {any} */ (assets.ganjo.rig);
  // 点：左手の中・右の足首・頭・胸の中・帯の左横（腰の関節より上）
  const pts = [[0.4, 0.85, 0.05], [-0.21, 0.08, 0.05], [0, 1.82, 0], [0, 1.4, 0.1], [0.2, 1.05, 0]];
  const want = ['handL', 'footR', 'head', 'chest', 'hips'];
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pts.flat(), 3));
  autoSkin(g, rig, { softRatio: lookdev.assetSkinSoftRatio.v, behindMul: lookdev.assetSkinBehindMul.v, minWeightRatio: lookdev.assetSkinMinWeightRatio.v });
  const si = g.attributes.skinIndex;
  const sw = g.attributes.skinWeight;
  pts.forEach((_, v) => {
    let sum = 0;
    let best = 0;
    for (let q = 0; q < 4; q++) {
      sum += sw.getComponent(v, q);
      if (sw.getComponent(v, q) > sw.getComponent(v, best)) best = q;
    }
    assert.ok(Math.abs(sum - 1) < 1e-5, `点${v}の重みの和 ${sum}`);
    assert.equal(humanBones[si.getComponent(v, best)].name, want[v], `点${v}`);
  });
});
