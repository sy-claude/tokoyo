// 画面配置（01 1章・9章の受け入れ基準、09 13章の16）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buttonOf, computeLayout, hitTest, LAYOUT_BTN_IDS } from '../../src/input/layout.js';
import { createRng } from '../../src/core/rng.js';
import { makeCfg } from './helpers/cfg.js';

const cfg = makeCfg();
const lc = cfg.layout;
const REF_W = lc.layoutRefWidthPx;
const REF_H = lc.layoutRefHeightPx;
/** 基準端末の safe-area（01 0章：左右47・下21・上0） */
const REF_INSETS = { l: lc.layoutRefInsetSidePx, r: lc.layoutRefInsetSidePx, t: 0, b: lc.layoutRefInsetBottomPx };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const ref = (settings) => computeLayout(REF_W, REF_H, REF_INSETS, settings, lc);
const visual = (L) => L.buttons.filter((b) => b.id !== 'pause');

/** config から右下pivot の期待位置を作る（期待値は config から計算する。10 §4.2-6） */
function expectedPos(id) {
  const k = { attack: 'Attack', dodge: 'Dodge', jump: 'Jump', ougi: 'Ougi', kekkai: 'Kekkai', fu: 'Fu', focus: 'Chumoku' }[id];
  return [REF_W - REF_INSETS.r - lc[`btn${k}DxPx`], REF_H - REF_INSETS.b - lc[`btn${k}DyPx`]];
}

test('refPositions：基準端末の各ボタンの中心が pivot−dx,dy（±0.5px）', () => {
  const L = ref();
  for (const id of LAYOUT_BTN_IDS) {
    const b = buttonOf(L, id);
    const [x, y] = expectedPos(id);
    assert.ok(near(b.x, x, 0.5) && near(b.y, y, 0.5), `${id} (${b.x},${b.y})`);
  }
  const p = buttonOf(L, 'pause');
  assert.ok(near(p.x, REF_W - REF_INSETS.r - lc.btnPauseDxPx, 0.5) && near(p.y, lc.btnPauseTopPx, 0.5));
});

test('[検算] refPositions の値：攻撃(741,317)・回避(645,296)・跳躍(722,222)・奥義(562,310)・結界(598,212)・符(680,148)・注目(772,150)・一時停止(776,30)（01受1）', () => {
  const L = ref();
  const want = { attack: [741, 317], dodge: [645, 296], jump: [722, 222], ougi: [562, 310], kekkai: [598, 212], fu: [680, 148], focus: [772, 150], pause: [776, 30] };
  for (const [id, [x, y]] of Object.entries(want)) {
    const b = buttonOf(L, /** @type {any} */ (id));
    assert.ok(near(b.x, x, 0.5) && near(b.y, y, 0.5), `${id} (${b.x},${b.y})`);
  }
});

test('[検算] starPoints：星の点 木(644,142)・火(724,200)・土(693,294)・金(595,294)・水(564,200)（01受2、±1px）', () => {
  const P = ref().pentagram.points;
  const want = { wood: [644, 142], fire: [724, 200], earth: [693, 294], metal: [595, 294], water: [564, 200] };
  for (const [e, [x, y]] of Object.entries(want)) assert.ok(near(P[e][0], x, 1) && near(P[e][1], y, 1), `${e} ${P[e]}`);
});

test('allSizesFit：W 667〜932・H 320〜430（1px刻み）で見た目円の間隔 ≥ 0、全部 safe 矩形内（01受3）', () => {
  const problems = [];
  for (let W = 667; W <= 932; W++) {
    for (let H = 320; H <= 430; H++) {
      const L = computeLayout(W, H, REF_INSETS, {}, lc);
      const bs = visual(L);
      for (let i = 0; i < bs.length; i++) {
        const a = bs[i];
        if (a.x - a.rVisPx < L.safeL - 1e-9 || a.x + a.rVisPx > L.safeR + 1e-9 || a.y - a.rVisPx < L.safeT - 1e-9 || a.y + a.rVisPx > L.safeB + 1e-9) {
          problems.push(`${W}x${H} ${a.id} が safe の外`);
        }
        for (let j = i + 1; j < bs.length; j++) {
          const b = bs[j];
          if (Math.hypot(a.x - b.x, a.y - b.y) - a.rVisPx - b.rVisPx < 0) problems.push(`${W}x${H} ${a.id}-${b.id} が重なる`);
        }
      }
      if (problems.length > 5) break;
    }
  }
  assert.deepEqual(problems, []);
});

/** どの2つの判定円も重ならない（中心距離 > 判定半径の和）。一時停止も含める。 */
function hitOverlaps(L) {
  const out = [];
  for (let i = 0; i < L.buttons.length; i++) {
    for (let j = i + 1; j < L.buttons.length; j++) {
      const a = L.buttons[i];
      const b = L.buttons[j];
      if (!(Math.hypot(a.x - b.x, a.y - b.y) > a.rHitPx + b.rHitPx)) out.push(`${a.id}-${b.id}`);
    }
  }
  return out;
}

test('refHitNoOverlap：基準端末でどの2ボタンの判定円も重ならない（01受4）', () => {
  assert.deepEqual(hitOverlaps(ref()), []);
});

test('h320HitNoOverlap：高さ320px でどの2つの判定円も重ならない（09受16）', () => {
  for (const W of [667, REF_W, 932]) assert.deepEqual(hitOverlaps(computeLayout(W, lc.layoutMinHeightPx, REF_INSETS, {}, lc)), [], `W=${W}`);
});

test('deviceScale：H/基準高を min〜max に切る。位置は H に関わらず safeB からの距離が一定（01受5）', () => {
  for (const H of [330, REF_H, 430]) {
    const L = computeLayout(REF_W, H, REF_INSETS, {}, lc);
    const want = Math.min(lc.layoutDeviceScaleMaxMul, Math.max(lc.layoutDeviceScaleMinMul, H / REF_H));
    assert.ok(near(L.deviceScale, want, 0.001), `H=${H} ${L.deviceScale}`);
    for (const id of ['attack', 'dodge', 'ougi']) {
      const b = buttonOf(L, /** @type {any} */ (id));
      assert.ok(near(L.safeB - b.y, REF_H - REF_INSETS.b - expectedPos(id)[1], 1e-6), `${H} ${id}`);
    }
  }
});

test('[検算] deviceScale の値：H=330 → 0.85、390 → 1.00、430 → 1.10（01受5、±0.001）', () => {
  const ds = (H) => computeLayout(REF_W, H, REF_INSETS, {}, lc).deviceScale;
  assert.ok(near(ds(330), 0.85, 0.001));
  assert.ok(near(ds(390), 1.0, 0.001));
  assert.ok(near(ds(430), 1.1, 0.001));
});

/** 総当たり：「距離÷判定半径」が最小（扇だけで入った攻撃は 1.0）。 */
function bruteHit(L, x, y) {
  let best = null;
  let br = Infinity;
  for (const b of L.buttons) {
    if (b.id === 'pause') continue;
    let r = Math.hypot(x - b.x, y - b.y) / b.rHitPx;
    if (r > 1 && b.id === 'attack' && y >= b.y && (L.leftHanded ? x <= b.x : x >= b.x)) r = 1;
    if (r <= 1 && r < br) {
      br = r;
      best = b.id;
    }
  }
  return best;
}

test('hitTestRandom：ランダム1万点で総当たりと100%一致。(840,386) → attack（01受6）', () => {
  const rng = createRng(7);
  for (const lh of [false, true]) {
    const L = ref({ leftHanded: lh });
    for (let i = 0; i < 10000; i++) {
      const x = rng.float() * REF_W;
      const y = rng.float() * REF_H;
      assert.equal(hitTest(L, x, y), bruteHit(L, x, y), `(${x},${y}) lh=${lh}`);
    }
  }
  assert.equal(hitTest(ref(), 840, 386), 'attack');
});

test('leftHanded：各ボタン x\' = W − x（±0.5）、星の中心 x\' = W − 右利きの中心、木は真上・火は右、一時停止は右上のまま（01受7）', () => {
  const R = ref();
  const L = ref({ leftHanded: true });
  for (const id of LAYOUT_BTN_IDS) {
    assert.ok(near(buttonOf(L, id).x, REF_W - buttonOf(R, id).x, 0.5), id);
    assert.ok(near(buttonOf(L, id).y, buttonOf(R, id).y, 0.5), id);
  }
  assert.ok(near(L.pentagram.cx, REF_W - R.pentagram.cx, 0.5));
  const P = L.pentagram.points;
  assert.ok(near(P.wood[0], L.pentagram.cx, 1e-9) && P.wood[1] < L.pentagram.cy);
  assert.ok(P.fire[0] > L.pentagram.cx);
  assert.deepEqual([buttonOf(L, 'pause').x, buttonOf(L, 'pause').y], [buttonOf(R, 'pause').x, buttonOf(R, 'pause').y]);
  assert.ok(L.stickZone.x0 >= REF_W / 2 && L.stickZone.x1 === REF_W - lc.stickZoneLeftPx);
});

test('[検算] leftHanded の星の中心：x\' = W − 644（01受7）', () => {
  assert.ok(near(ref({ leftHanded: true }).pentagram.cx, REF_W - 644, 0.5));
});

test('scale150：btnScalePct=150 → 全ボタンが上端 safeT+hudTopReserve より下（自動縮小。01受8）', () => {
  const L = ref({ btnScalePct: 150 });
  assert.ok(L.userScale < 1.5, String(L.userScale));
  for (const b of visual(L)) assert.ok(b.y - b.rVisPx >= L.safeT + lc.hudTopReservePx - 1e-9, `${b.id} ${b.y - b.rVisPx}`);
  for (const b of visual(L)) assert.ok(b.x - b.rVisPx >= L.stickZone.x1 - 1e-9, `${b.id} がスティック範囲へ`);
});

test('stickZone：右利きは x∈[24, round(0.4W)]、y∈[safeT+64, H]。既定位置は左下pivot から (83,−89)', () => {
  const L = ref();
  assert.deepEqual(L.stickZone, { x0: lc.stickZoneLeftPx, x1: Math.round((REF_W * lc.stickZoneRightPct) / 100), y0: lc.stickZoneTopPx, y1: REF_H });
  assert.deepEqual(L.stickDefault, [REF_INSETS.l + lc.stickDefaultDxPx, REF_H - REF_INSETS.b - lc.stickDefaultDyPx]);
  assert.equal(L.stickBaseRPx, lc.stickBaseDiamMPx / 2);
});
