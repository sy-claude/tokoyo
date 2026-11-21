// 移動・跳躍・回避（02 の受け入れ基準 1〜16、10 M2a-2・M2a-3）。数値は 02 §3.5 の 60Hz の数値計算の値。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cfg, hold, hspeed, makeWorld, press, runUp, step } from './helpers/play.js';
import { isInvulnerable } from '../../src/sim/player/fsm.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} ≈ ${b} ±${tol}`);
const mv = cfg.movement;

/** 跳躍してから着地するまで（毎tick の入力 o を返す関数）。着地までの tick 数を返す。 */
function flyUntilLanded(w, o = () => ({}), max = 200) {
  let n = 0;
  while (!w.player.grounded && n < max) {
    step(w, o(n));
    n++;
  }
  return n;
}

test('02受1・2：走り1.0s で 6.5m/s（0.12s で 6.5±0.3）、中立で 0.08s±1tick で止まる', () => {
  const w = makeWorld();
  let at7 = 0;
  for (let i = 0; i < 60; i++) {
    step(w, { stick: [0, 1] });
    if (i === Math.round(mv.runAccelS * 60) - 1) at7 = hspeed(w);
  }
  near(hspeed(w), 6.5, 0.05, '最高速');
  near(at7, 6.5, 0.3, '0.12s');
  let n = 0;
  while (hspeed(w) > 0 && n < 60) {
    step(w);
    n++;
  }
  near(n, mv.runDecelS * 60, 1, '止まるまでの tick');
});

test('02受3：倒し量 0.54 は歩き 2.5、0.56 は走り 6.5。走り中の 0.52 は走りのまま、0.49 で歩き', () => {
  for (const [m, v] of [[0.54, 2.5], [0.56, 6.5]]) {
    const w = makeWorld();
    for (let i = 0; i < 60; i++) step(w, { stick: [0, m] });
    near(hspeed(w), v, 0.05, `倒し量 ${m}`);
  }
  const w = makeWorld();
  runUp(w);
  for (let i = 0; i < 30; i++) step(w, { stick: [0, 0.52] });
  assert.equal(w.player.state, 'run');
  for (let i = 0; i < 30; i++) step(w, { stick: [0, 0.49] });
  assert.equal(w.player.state, 'walk');
  near(hspeed(w), 2.5, 0.05);
});

test('02受4：岩丈の走り 1.0s → 5.85m/s', () => {
  const w = makeWorld('ganjo');
  for (let i = 0; i < 60; i++) step(w, { stick: [0, 1] });
  near(hspeed(w), 5.85, 0.05);
});

test('02受5・6：押し続けで頂点 2.40m・頂点まで21tick・着地まで36tick。1tick だけ押すと頂点 1.96m', () => {
  const w = makeWorld();
  step(w, { btn: press('jump') });
  let peak = w.player.pos[1];
  let apex = 1;
  let n = 1;
  while (!w.player.grounded) {
    step(w, { btn: hold('jump') });
    n++;
    if (w.player.pos[1] > peak) {
      peak = w.player.pos[1];
      apex = n;
    }
  }
  near(peak, 2.4, 0.02, '頂点');
  near(apex, 21, 1, '頂点まで');
  near(n, 36, 1, '着地まで');
  const t = makeWorld();
  step(t, { btn: press('jump') });
  let tp = 0;
  for (let i = 0; i < 60; i++) {
    step(t);
    tp = Math.max(tp, t.player.pos[1]);
  }
  near(tp, 1.96, 0.03, '最低の跳躍');
});

test('02受7：走り跳び（平地）→ 離陸点〜着地点 3.90m', () => {
  const w = makeWorld();
  runUp(w);
  const z0 = w.player.pos[2];
  step(w, { stick: [0, 1], btn: press('jump') });
  flyUntilLanded(w, () => ({ stick: [0, 1], btn: hold('jump') }));
  near(w.player.pos[2] - z0, 3.9, 0.05);
});

test('02受8：縁から走り出て5tick目の跳躍は跳べる、8tick目は跳べない（コヨーテ6f）', () => {
  for (const [k, ok] of [[5, true], [8, false]]) {
    // 台A（中心16,24、上面2m）の上から +X へ走り出る
    const w = makeWorld('fuma', [15, 2, 24], 90);
    step(w);
    let left = -1;
    for (let i = 0; i < 60 && left < 0; i++) {
      step(w, { stick: [0, 1] });
      if (!w.player.grounded) left = 0;
    }
    for (let i = 1; i < k; i++) step(w, { stick: [0, 1] });
    step(w, { stick: [0, 1], btn: press('jump') });
    assert.equal(w.player.vel[1] > 0, ok, `${k}tick目`);
  }
});

test('02受9：着地の6tick前に押した跳躍は、着地の tick に jumpRise', () => {
  const w = makeWorld();
  step(w, { btn: press('jump') });
  for (let i = 0; i < 29; i++) step(w, { btn: hold('jump') }); // 着地は36tick目
  step(w, { btn: press('jump') }); // 30tick目（着地の6tick前）
  let n = 31;
  while (!w.player.grounded && n < 40) {
    step(w);
    n++;
    if (w.player.state === 'jumpRise') break;
  }
  assert.equal(w.player.state, 'jumpRise');
  near(n, 36, 1);
});

test('02受10・M2a-2：走り跳びの頂点で神通足 → 8.29m。12tick で水平 4.50m・高さの変化 0', () => {
  const w = makeWorld();
  runUp(w);
  const z0 = w.player.pos[2];
  step(w, { stick: [0, 1], btn: press('jump') });
  for (let i = 1; i < 20; i++) step(w, { stick: [0, 1], btn: hold('jump') });
  const zd = w.player.pos[2];
  const yd = w.player.pos[1];
  step(w, { stick: [0, 1], btn: { ...hold('jump'), ...press('dodge') } });
  for (let i = 1; i < mv.airDashF; i++) step(w, { stick: [0, 1] });
  near(w.player.pos[2] - zd, 4.5, 0.02, '神通足の水平');
  near(w.player.pos[1] - yd, 0, 1e-9, '神通足の高さ');
  flyUntilLanded(w, () => ({ stick: [0, 1] }));
  near(w.player.pos[2] - z0, 8.29, 0.1, '着地距離');
});

test('02受11：1回の滞空で回避を2回 → 2回目は何も起きない。着地後は再び使える', () => {
  const w = makeWorld();
  step(w, { btn: press('jump') });
  for (let i = 0; i < 5; i++) step(w, { btn: hold('jump') });
  step(w, { btn: press('dodge') });
  assert.equal(w.player.state, 'airDash');
  for (let i = 0; i < mv.airDashF; i++) step(w);
  assert.equal(w.player.state, 'jumpFall');
  step(w, { btn: press('dodge') });
  assert.equal(w.player.state, 'jumpFall', '2回目は何も起きない');
  flyUntilLanded(w);
  for (let i = 0; i < 10; i++) step(w);
  step(w, { btn: press('jump') });
  for (let i = 0; i < 5; i++) step(w, { btn: hold('jump') });
  step(w, { btn: press('dodge') });
  assert.equal(w.player.state, 'airDash', '着地後は使える');
});

test('02受12・M2a-3：神通足を使う前の空中の水平到達は、最後の接地点から 4.8m 以下（白雪：走り跳び＋コヨーテ6f）', () => {
  // 「注目で前方へ回る宙返り」の配置は注目ができる M2b で足す（10 M2a）
  const w = makeWorld('shirayuki', [15, 2, 24], 90);
  step(w);
  runUp(w, 6);
  let maxD = 0;
  /** @type {[number, number]} */
  let g = [w.player.pos[0], w.player.pos[2]];
  for (let i = 0; i < 400 && w.player.pos[1] > 0; i++) {
    const coyote = !w.player.grounded && w.player.state === 'jumpFall' && w.player.mv.coyoteLeft === 1;
    step(w, { stick: [0, 1], btn: coyote ? press('jump') : hold('jump') });
    if (w.player.grounded) g = [w.player.pos[0], w.player.pos[2]];
    else maxD = Math.max(maxD, Math.hypot(w.player.pos[0] - g[0], w.player.pos[2] - g[1]));
  }
  assert.ok(maxD > 4.3, `走り跳び＋コヨーテ ${maxD}`);
  assert.ok(maxD <= mv.airReachCapNoDashM + 1e-6, `到達 ${maxD}`);
});

test('airReachCap（M2a-3）：空中で速い水平速度を持っても、神通足の前は最後の接地点から 4.8m で頭打ち', () => {
  const w = makeWorld();
  step(w, { btn: press('jump') });
  const g = [...w.player.mv.lastGround];
  w.player.vel[2] = 20;
  let maxD = 0;
  while (!w.player.grounded) {
    step(w, { btn: hold('jump') });
    maxD = Math.max(maxD, Math.hypot(w.player.pos[0] - g[0], w.player.pos[2] - g[1]));
  }
  near(maxD, mv.airReachCapNoDashM, 1e-6, '頭打ち');
});

test('02受13：白雪の宙返りを跳躍の頂点で → 足の最高 3.40m、無敵は 1〜16f', () => {
  const w = makeWorld('shirayuki');
  step(w, { btn: press('jump') });
  for (let i = 1; i < 20; i++) step(w, { btn: hold('jump') });
  step(w, { btn: { ...hold('jump'), ...press('dodge') } });
  assert.equal(w.player.state, 'flip');
  /** @type {boolean[]} */
  const inv = [isInvulnerable(w.player, cfg)];
  let peak = w.player.pos[1];
  for (let i = 1; i < 40; i++) {
    step(w);
    if (w.player.state === 'flip') inv.push(isInvulnerable(w.player, cfg));
    peak = Math.max(peak, w.player.pos[1]);
  }
  near(peak, 3.4, 0.05, '宙返りの頂点');
  assert.deepEqual(inv.slice(0, 17), [...Array(16).fill(true), false]);
});

test('02受14：ステップ（中立）→ 向きと逆へ 4.00m、16f目で移動完了、無敵 2〜14f、17f目は跳躍で取消できず 18f目でできる', () => {
  const w = makeWorld('fuma', [30, 0, 30], 0);
  const z0 = w.player.pos[2];
  step(w, { btn: press('dodge') });
  /** @type {boolean[]} */
  const inv = [isInvulnerable(w.player, cfg)];
  for (let f = 2; f <= 16; f++) {
    step(w);
    inv.push(isInvulnerable(w.player, cfg));
  }
  near(w.player.pos[2] - z0, -4, 0.02, '16f目');
  assert.deepEqual(inv, [false, ...Array(13).fill(true), false, false]);
  step(w, { btn: press('jump') }); // 17f目：取消不可（先行入力として保持される）
  assert.equal(w.player.state, 'step');
  step(w, { btn: press('jump') }); // 18f目：取消できる
  assert.equal(w.player.state, 'jumpRise');
});

test('02受15：ステップで崖へ → 縁で止まる。歩きで縁へ → 落ちない。走りで縁へ → 落ちる（T2 の落差3m、縁は x=50）', () => {
  const s = makeWorld('fuma', [48, 0, 30], 270); // −X を向き、中立ステップで +X（崖）へ
  step(s, { btn: press('dodge') });
  for (let i = 0; i < 30; i++) step(s);
  assert.equal(s.player.pos[1], 0, 'ステップ');
  const w = makeWorld('fuma', [47, 0, 30], 90);
  for (let i = 0; i < 120; i++) step(w, { stick: [0, 0.4] });
  assert.equal(w.player.pos[1], 0, '歩き');
  assert.ok(w.player.pos[0] > 49, `縁の近くまで歩いた ${w.player.pos[0]}`);
  const r = makeWorld('fuma', [46, 0, 30], 90);
  for (let i = 0; i < 60; i++) step(r, { stick: [0, 1] });
  near(r.player.pos[1], -3, 1e-6, '走り');
});

test('02受16：0.41m の段は登れない、0.40m は登る（mover と同じ）', () => {
  const a = makeWorld('fuma', [16, 0, 13], 0);
  const b = makeWorld('fuma', [19, 0, 13], 0);
  for (let i = 0; i < 80; i++) {
    step(a, { stick: [0, 0.4] });
    step(b, { stick: [0, 0.4] });
  }
  near(a.player.pos[1], 0.4, 1e-6);
  assert.equal(b.player.pos[1], 0);
});

test('[検算]gapRow（M2a-2）：試験場 S2 の隙間 2.5m は走り跳びで、6.0m は神通足で越え、10.0m は越えられない', () => {
  /** 台A（中心16, 上面2m）の西寄りから +X へ走って縁で跳ぶ。dash＝頂点で神通足。台B の上に着地したか。 */
  const cross = (z, dash, gapM) => {
    const w = makeWorld('fuma', [14.5, 2, z], 90);
    step(w);
    let jumped = false;
    for (let i = 0; i < 300; i++) {
      const atEdge = !jumped && w.player.grounded && w.player.pos[0] > 18 - 0.4;
      if (atEdge) jumped = true;
      const apex = dash && w.player.state === 'jumpRise' && w.player.vel[1] < 1;
      step(w, { stick: [0, 1], btn: atEdge ? press('jump') : apex ? { ...hold('jump'), ...press('dodge') } : hold('jump') });
      if (jumped && w.player.grounded && w.player.state !== 'jumpRise') break;
    }
    return w.player.pos[1] === 2 && w.player.pos[0] > 20 + gapM - 2;
  };
  assert.ok(cross(24, false, 2.5), '2.5m を走り跳び');
  assert.ok(!cross(36, false, 6.0), '6.0m は跳躍だけでは越えない');
  assert.ok(cross(36, true, 6.0), '6.0m を神通足で');
  assert.ok(!cross(48, true, 10.0), '10.0m は越えられない');
});
