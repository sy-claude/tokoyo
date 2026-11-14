// 07受8：パレットの全キーを THREE.Color で読める。部品表の色（data）も同じ。
// 「config・data 以外に # の色の直書き0」は literals.test › noColorsOutsideConfig が見る（不変条件11）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Color } from 'three';
import { makeCfg, configTables } from './helpers/cfg.js';
import { characters } from '../../src/data/characters.js';
import { faces } from '../../src/data/rigs/faces.js';
import { isRigColor } from '../../src/data/validate.js';

const cfg = makeCfg();
const HEX = /^#[0-9a-f]{6}$/;

test('allKeysParse：パレットの全キーが sRGB の16進で、THREE.Color で読める（07受8）', () => {
  const keys = Object.keys(configTables.palette);
  assert.ok(keys.length >= 70, `キーの数 ${keys.length}`);
  for (const key of keys) {
    const hex = cfg.palette[key];
    assert.match(hex, HEX, key);
    const c = new Color(hex);
    for (const v of [c.r, c.g, c.b]) assert.ok(Number.isFinite(v) && v >= 0 && v <= 1, key);
    assert.equal(`#${c.getHexString()}`, hex, `${key}: 読んで戻すと同じ色`);
  }
});

test('[検算] docValues：07 2章の表の値', () => {
  // 07 2.1
  const p = cfg.palette;
  assert.equal(p.paper, '#efe6d2');
  assert.equal(p.ink, '#1b1a1f');
  assert.equal(p.shuInfo, '#e2452b');
  assert.equal(p.shuEnv, '#a3412e');
  assert.equal(p.sunDisk, '#d9502e');
  assert.equal(p.rimHero, '#ffd9a0');
  assert.equal(p.rimEnemy, '#b0306a');
  assert.equal(p.shadowTint, '#8088a8');
  assert.equal(p.kegareCore, '#2a1730');
  assert.equal(p.goldLeaf, '#f0cf6a');
  // 07 2.2（Ui／Core／Rim）
  assert.deepEqual([p.elemWoodUi, p.elemWoodCore, p.elemWoodRim], ['#3f8f5a', '#6fd08a', '#1b1a1f']);
  assert.deepEqual([p.elemFireUi, p.elemFireCore, p.elemFireRim], ['#e06a2c', '#ffb070', '#b8321f']);
  assert.deepEqual([p.elemEarthUi, p.elemEarthCore, p.elemEarthRim], ['#b8862b', '#e0b04a', '#5a3f14']);
  assert.deepEqual([p.elemMetalUi, p.elemMetalCore, p.elemMetalRim], ['#dfe6ea', '#ffffff', '#7d8fa0']);
  assert.deepEqual([p.elemWaterUi, p.elemWaterCore, p.elemWaterRim], ['#2b4a8f', '#5b8be0', '#14234a']);
  // 07 2.3
  assert.deepEqual([p.skyTop, p.skyHorizon, p.fog], ['#8e8a88', '#efe6d2', '#efe6d2']);
  assert.deepEqual([p.island1, p.island2, p.island3], ['#b9b2a6', '#cfc6b6', '#ddd3c0']);
  assert.deepEqual([p.seaNear, p.seaFar, p.seaFoam], ['#6f7f80', '#8e9a98', '#f2ecdf']);
  assert.deepEqual([p.esekiAka, p.esekiKi, p.esekiAo], ['#d24a34', '#e0b04a', '#4f86c6']);
});

test('colorMeaning：朱の使い分け（07 1.1-3）。最高彩度の朱は情報専用、環境の朱はそれより暗い', () => {
  const luma = (hex) => {
    const n = Number.parseInt(hex.slice(1), 16);
    return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  };
  assert.ok(luma(cfg.palette.shuEnv) < luma(cfg.palette.shuInfo));
  assert.ok(luma(cfg.palette.momiji) <= luma(cfg.palette.shuInfo));
  // 明度の層（07 1.2）：紙は明、墨は暗
  assert.ok(luma(cfg.palette.paper) >= 0.7 && luma(cfg.palette.paper) <= 0.95);
  assert.ok(luma(cfg.palette.ink) < 0.15);
});

test('rigColorsResolve：部品表の色は palette のキーか16進で、THREE.Color で読める', () => {
  let count = 0;
  for (const [id, look] of Object.entries(characters)) {
    for (const part of [...look.rig.parts, ...(look.rig.weapon?.parts ?? [])]) {
      assert.ok(isRigColor(part.color), `${id}/${part.name}: ${part.color}`);
      const hex = part.color.startsWith('#') ? part.color : cfg.palette[part.color];
      assert.match(hex, HEX);
      assert.equal(`#${new Color(hex).getHexString()}`, hex);
      count += 1;
    }
  }
  assert.ok(count > 30);
  assert.ok(!isRigColor('#12345'));
  assert.ok(!isRigColor('noSuchKey'));
  for (const f of Object.values(faces)) assert.match(f.skin, HEX);
});

test('[検算] fumaColors：楓真の色は 07 6.4 の部品表のとおり', () => {
  // 07 6.4 楓真
  const part = (name, weapon = false) => (weapon ? characters.fuma.rig.weapon.parts : characters.fuma.rig.parts).find((p) => p.name === name);
  assert.equal(part('head').color, '#c99a78');
  assert.equal(part('torso').color, '#2f5a3e');
  assert.equal(part('obi').color, '#3a2e28');
  assert.equal(part('haoriHem').color, '#2f5a3e');
  assert.equal(part('armUpperL').color, '#26262b');
  assert.equal(part('hakamaR').color, '#26262b');
  assert.equal(part('footL').color, '#e8e0cc');
  assert.equal(part('hachimaki').color, '#f2ecdf');
  assert.equal(part('tuftFrontL').color, '#4a5a8a'); // 藍の帯（07 6.2-6）
  assert.equal(part('tuftBack').color, 'ink');
  assert.equal(part('shaft', true).color, '#2a2622');
  assert.equal(part('wrap0', true).color, 'shuEnv');
  assert.equal(part('blade', true).color, '#c9ccd0');
  assert.equal(part('bladeSpine', true).color, '#5d636b');
  assert.equal(faces.fuma.skin, part('head').color);
});
