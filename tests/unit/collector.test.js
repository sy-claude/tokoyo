// InputFrame の組み立てと指の役割（01 9章の受け入れ基準 9〜15・26、09 13章の 11・12・14・15）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCollector, mergeFrames } from '../../src/input/collector.js';
import { buttonOf } from '../../src/input/layout.js';
import { makeFrame } from '../../src/input/synthetic.js';
import { cfg, makeRig } from './helpers/touchRig.js';

const near = (a, b, tol) => Math.abs(a - b) <= tol;
const STEP_MS = 1000 / cfg.time.tickRateHz;
/** スティック範囲の中の点 */
const SX = 120;
const SY = 300;

/** 01 1.5 の式（台座半径 R、不感帯 dz）で、右へ px 動かしたときの stick.x */
function stickX(px, R, dz) {
  const m = px / R;
  return m <= dz ? 0 : Math.min(1, (m - dz) / (1 - dz));
}

test('stickHybrid：触れた点が原点。右へ動かすと式どおり、追従半径を超えると原点が追う（01受9）', () => {
  const r = makeRig();
  const L = r.layout;
  r.down(1, SX, SY);
  r.move(1, SX + 30, SY);
  let f = r.one();
  assert.ok(near(f.stick[0], stickX(30, L.stickBaseRPx, L.stickDeadzoneMul), 1e-9), String(f.stick));
  assert.ok(near(f.stick[1], 0, 1e-9));
  r.move(1, SX + 60, SY);
  f = r.one();
  assert.ok(near(f.stick[0], 1, 1e-9));
  r.move(1, SX + 100, SY);
  const vs = r.router.viewState();
  assert.ok(near(vs.stick.originX - SX, 100 - L.stickFollowRPx, 1e-9), String(vs.stick.originX));
  // 上へ動かすと y が＋
  r.move(1, vs.stick.originX, SY - 60);
  f = r.one();
  assert.ok(f.stick[1] > 0.99, String(f.stick));
});

test('[検算] stickHybrid の値：右へ30px → 0.432、60px → 1.0、100px → 原点が16px 追従（01受9）', () => {
  const r = makeRig();
  r.down(1, SX, SY);
  r.move(1, SX + 30, SY);
  assert.ok(near(r.one().stick[0], 0.432, 0.01));
  r.move(1, SX + 60, SY);
  assert.ok(near(r.one().stick[0], 1.0, 0.01));
  r.move(1, SX + 100, SY);
  assert.ok(near(r.router.viewState().stick.originX - SX, 16, 1));
});

test('stickFixed：固定方式は原点が常に既定位置', () => {
  const r = makeRig({ settings: { stickMode: 'fixed' } });
  const [dx0, dy0] = r.layout.stickDefault;
  r.down(1, SX, SY);
  const vs = r.router.viewState();
  assert.deepEqual([vs.stick.originX, vs.stick.originY], [dx0, dy0]);
});

test('stickKeptOnResize：押下中に高さ 390→340 → 役割と出力が保持される（01受10）', () => {
  const r = makeRig();
  r.down(1, SX, SY);
  r.move(1, SX + 30, SY - 10);
  const a = r.one().stick;
  r.resize(cfg.layout.layoutRefWidthPx, 340);
  r.move(1, SX + 30, SY - 10);
  const b = r.one().stick;
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01);
  assert.deepEqual(r.router.roles(), [{ id: 1, role: 'stick', btn: null }]);
});

test('attackDragCamera：27px では camDeg 0、28px でカメラになり（28px 分は回さない）以後 camDeg が出る。pressed は1回（01受11）', () => {
  const r = makeRig();
  const a = buttonOf(r.layout, 'attack');
  r.down(1, a.x, a.y);
  let f = r.one();
  assert.equal(f.btn.attack.pressed, true);
  assert.equal(f.btn.attack.down, true);
  let pressedCount = 1;
  let camSum = 0;
  r.move(1, a.x - 27, a.y);
  f = r.one();
  camSum += Math.abs(f.camDeg[0]) + Math.abs(f.camDeg[1]);
  assert.equal(camSum, 0);
  assert.equal(f.btn.attack.down, true);
  r.move(1, a.x - cfg.input.attackCamSlidePx, a.y);
  f = r.one();
  assert.deepEqual(f.camDeg, [0, 0]);
  assert.equal(f.btn.attack.down, false);
  assert.equal(f.btn.attack.released, false);
  assert.equal(f.camHeld, true);
  r.move(1, a.x - cfg.input.attackCamSlidePx - 10, a.y);
  f = r.one();
  const want = -10 * cfg.camera.camYawDegPerPx * cfg.input.attackDragCamMul;
  assert.ok(near(f.camDeg[0], want, 1e-9), String(f.camDeg));
  r.up(1, a.x - cfg.input.attackCamSlidePx - 10, a.y);
  for (let i = 0; i < 3; i++) {
    f = r.one();
    if (f.btn.attack.pressed) pressedCount += 1;
    assert.equal(f.btn.attack.released, false);
  }
  assert.equal(pressedCount, 1);
  assert.equal(f.camHeld, false);
});

test('ougiCancelZone：71px → down・ougiOut 偽、72px → ougiOut 真・down 偽（取消域の間は真）、55px → ougiOut 偽・pressed（01受12）', () => {
  const r = makeRig();
  const o = buttonOf(r.layout, 'ougi');
  r.down(1, o.x, o.y);
  r.one();
  r.move(1, o.x - (cfg.input.ougiOutPx - 1), o.y);
  let f = r.one();
  assert.equal(f.btn.ougi.down, true);
  assert.equal(f.ougiOut, false);
  r.move(1, o.x - cfg.input.ougiOutPx, o.y);
  f = r.one();
  assert.equal(f.ougiOut, true);
  assert.equal(f.btn.ougi.down, false);
  assert.equal(f.btn.ougi.released, false);
  f = r.one();
  assert.equal(f.ougiOut, true, '取消域にいる間はずっと真');
  r.move(1, o.x - (cfg.input.ougiBackPx - 1), o.y);
  f = r.one();
  assert.equal(f.ougiOut, false);
  assert.equal(f.btn.ougi.pressed, true);
  assert.equal(f.btn.ougi.down, true);
  r.up(1, o.x - (cfg.input.ougiBackPx - 1), o.y);
  assert.equal(r.one().btn.ougi.released, true);
});

test('ougiSlideToDodge：回避の判定円へ → 同じtickに ougiOut と dodge.pressed、次のtickは ougiOut 偽、離すと dodge.released（01受13）', () => {
  const r = makeRig();
  const o = buttonOf(r.layout, 'ougi');
  const d = buttonOf(r.layout, 'dodge');
  r.down(1, o.x, o.y);
  r.one();
  r.move(1, d.x, d.y);
  let f = r.one();
  assert.equal(f.ougiOut, true);
  assert.equal(f.btn.dodge.pressed, true);
  assert.equal(f.btn.ougi.down, false);
  assert.equal(f.btn.ougi.released, false);
  f = r.one();
  assert.equal(f.ougiOut, false);
  assert.equal(f.btn.dodge.down, true);
  r.up(1, d.x, d.y);
  assert.equal(r.one().btn.dodge.released, true);
});

test('ougiBlur：奥義の押下中に blur（全指の解放）→ そのtick ougiOut 真・ougi.released 偽（01受14）', () => {
  const r = makeRig();
  const o = buttonOf(r.layout, 'ougi');
  r.down(1, o.x, o.y);
  r.one();
  r.router.releaseAll();
  const f = r.one();
  assert.equal(f.ougiOut, true);
  assert.equal(f.btn.ougi.released, false);
  assert.equal(f.btn.ougi.down, false);
  // 離すまで ignored：離しても何も出ない
  r.up(1, o.x, o.y);
  const g = r.one();
  assert.equal(g.btn.ougi.released, false);
  assert.equal(g.ougiOut, false);
});

test('stickCancel：stick の指に pointercancel → 次のtickで stick=(0,0)（01受15）', () => {
  const r = makeRig();
  r.down(1, SX, SY);
  r.move(1, SX + 50, SY);
  assert.ok(r.one().stick[0] > 0.5);
  r.router.cancel(1);
  assert.deepEqual(r.one().stick, [0, 0]);
});

test('touchCancelAll：全指の取消 → 全ボタン down=false・released=false、stick=[0,0]（09受15）', () => {
  const r = makeRig();
  const a = buttonOf(r.layout, 'attack');
  const j = buttonOf(r.layout, 'jump');
  r.down(1, SX, SY);
  r.move(1, SX + 50, SY);
  r.down(2, a.x, a.y);
  r.down(3, j.x, j.y);
  r.one();
  for (const id of [1, 2, 3]) r.router.cancel(id);
  const f = r.one();
  assert.deepEqual(f.stick, [0, 0]);
  for (const b of Object.values(f.btn)) assert.deepEqual([b.down, b.released], [false, false]);
});

test('twoFingers：スティック＋カメラを同時に動かし、カメラの指だけ離す → スティックが続く（09受14）', () => {
  const r = makeRig();
  r.down(1, SX, SY);
  r.down(2, 450, 150);
  r.move(1, SX + 50, SY);
  r.move(2, 480, 150);
  let f = r.one();
  assert.ok(f.camDeg[0] > 0 && f.camHeld);
  r.up(2, 480, 150);
  r.move(1, SX + 55, SY);
  f = r.one();
  assert.ok(Math.hypot(f.stick[0], f.stick[1]) > 0.5);
  assert.equal(f.camHeld, false);
  assert.deepEqual(r.router.roles(), [{ id: 1, role: 'stick', btn: null }]);
});

test('multiTick：3tick 進む描画で押した → pressed は1tick目だけ、camDeg は3等分。押して離した → 1tick目 down・2tick目 released（01受26・09受11）', () => {
  const r = makeRig();
  const a = buttonOf(r.layout, 'attack');
  r.down(1, a.x, a.y);
  r.down(2, 450, 150);
  r.move(2, 480, 150);
  let fs = r.frame(3);
  assert.deepEqual(fs.map((f) => f.btn.attack.pressed), [true, false, false]);
  assert.deepEqual(fs.map((f) => f.btn.attack.down), [true, true, true]);
  const total = 30 * cfg.camera.camYawDegPerPx;
  for (const f of fs) assert.ok(near(f.camDeg[0], total / 3, 0.001), String(f.camDeg));
  r.up(1, a.x, a.y);
  r.up(2, 480, 150);
  r.frame(1);
  // 同じ描画区間で押して離した
  r.down(3, a.x, a.y);
  r.up(3, a.x, a.y);
  fs = r.frame(3);
  assert.deepEqual(fs.map((f) => [f.btn.attack.pressed, f.btn.attack.down, f.btn.attack.released]), [
    [true, true, false],
    [false, false, true],
    [false, false, false],
  ]);
});

test('ageF：押下から nowMs までの tick 数を上限で切る（09受12）', () => {
  const c = createCollector(cfg.input, cfg.time.tickRateHz);
  c.press('attack', 0);
  const f = c.build(0, 120);
  assert.equal(f.btn.attack.ageF, Math.min(cfg.input.inputAgeMaxF, Math.round(120 / STEP_MS)));
  c.press('dodge', 100);
  assert.equal(c.build(1, 100 + STEP_MS).btn.dodge.ageF, 1);
});

test('[検算] ageF の値：120ms 前の押下 → 4（09受12）', () => {
  const c = createCollector(cfg.input, cfg.time.tickRateHz);
  c.press('attack', 0);
  assert.equal(c.build(0, 120).btn.attack.ageF, 4);
});

test('twoFingersSameButton：同じボタンに2本 → pressed は指ごと、down は1本でも、released は最後の指', () => {
  const r = makeRig();
  const a = buttonOf(r.layout, 'jump');
  r.down(1, a.x, a.y);
  assert.equal(r.one().btn.jump.pressed, true);
  r.down(2, a.x + 2, a.y);
  assert.equal(r.one().btn.jump.pressed, true);
  r.up(1, a.x, a.y);
  let f = r.one();
  assert.deepEqual([f.btn.jump.down, f.btn.jump.released], [true, false]);
  r.up(2, a.x + 2, a.y);
  f = r.one();
  assert.deepEqual([f.btn.jump.down, f.btn.jump.released], [false, true]);
});

test('pauseButton：一時停止の判定内で離すと onPause、外で離すと何もしない。InputFrame には入らない', () => {
  const r = makeRig();
  const p = buttonOf(r.layout, 'pause');
  r.down(1, p.x, p.y);
  r.up(1, p.x, p.y);
  assert.equal(r.pauses, 1);
  r.down(2, p.x, p.y);
  r.up(2, p.x - 100, p.y + 100);
  assert.equal(r.pauses, 1);
  const f = r.one();
  for (const b of Object.values(f.btn)) assert.equal(b.pressed, false);
});

test('maxPointers：5本目以降は ignored。無効中の指は記録しない', () => {
  const r = makeRig();
  for (let i = 0; i < cfg.input.inputMaxPointersCount + 1; i++) r.down(i + 1, 400 + i * 30, 120);
  const roles = r.router.roles();
  assert.equal(roles.length, cfg.input.inputMaxPointersCount + 1);
  assert.equal(roles[roles.length - 1].role, 'ignored');
  r.router.setEnabled(false);
  r.down(99, SX, SY);
  assert.ok(!r.router.roles().some((x) => x.id === 99));
});

test('cameraInvert・感度：camSensPct と反転が camDeg に掛かる。指を上へ → camDeg[1] が負（視点が上を向く）', () => {
  const r = makeRig({ settings: { camSensPct: 200, camInvertX: true } });
  r.down(1, 450, 200);
  r.move(1, 460, 190);
  const f = r.one();
  assert.ok(near(f.camDeg[0], -10 * cfg.camera.camYawDegPerPx * 2, 1e-9));
  assert.ok(near(f.camDeg[1], -10 * cfg.camera.camPitchDegPerPx * 2, 1e-9));
});

test('mergeFrames：stick は長い方、camDeg は和、ボタンは「または」', () => {
  const a = makeFrame(3, { stick: [0.2, 0], camDeg: [1, 0], btn: { attack: { down: true, pressed: true } } });
  const b = makeFrame(3, { stick: [0, 0.9], camDeg: [2, 1], btn: { jump: { released: true } }, flick: 1 });
  const m = mergeFrames(a, b);
  assert.deepEqual(m.stick, [0, 0.9]);
  assert.deepEqual(m.camDeg, [3, 1]);
  assert.equal(m.btn.attack.pressed, true);
  assert.equal(m.btn.jump.released, true);
  assert.equal(m.flick, 1);
  assert.equal(m.tick, 3);
});
