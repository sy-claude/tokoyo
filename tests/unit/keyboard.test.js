// キーボード入力（01 2.12、09 5.3）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createKeyboard } from '../../src/input/keyboard.js';
import { makeCfg } from './helpers/cfg.js';

const cfg = makeCfg();
const newKb = (opts) => createKeyboard(cfg.input, cfg.time.tickRateHz, opts);
const near = (a, b, tol) => Math.abs(a - b) <= tol;

test('stickDiagonal：W+D の斜めは長さ1に正規化、Shift 併用で ×kbWalkMul', () => {
  const kb = newKb();
  kb.onKeyDown('KeyW');
  kb.onKeyDown('KeyD');
  let f = kb.build(0);
  const d = Math.SQRT1_2;
  assert.ok(near(f.stick[0], d, 1e-9) && near(f.stick[1], d, 1e-9), String(f.stick));
  assert.ok(near(Math.hypot(f.stick[0], f.stick[1]), 1, 1e-9));
  kb.onKeyDown('ShiftLeft');
  f = kb.build(1);
  assert.ok(near(f.stick[0], d * cfg.input.kbWalkMul, 1e-9) && near(f.stick[1], d * cfg.input.kbWalkMul, 1e-9), String(f.stick));
});

test('[検算] stickDiagonal の値：W+D → (0.707,0.707)、Shift 併用 → (0.354,0.354)（±0.01）', () => {
  const kb = newKb();
  kb.onKeyDown('KeyW');
  kb.onKeyDown('KeyD');
  let f = kb.build(0);
  assert.ok(near(f.stick[0], 0.707, 0.01) && near(f.stick[1], 0.707, 0.01), String(f.stick)); // 01受27
  kb.onKeyDown('ShiftLeft');
  f = kb.build(1);
  assert.ok(near(f.stick[0], 0.354, 0.01) && near(f.stick[1], 0.354, 0.01), String(f.stick)); // 01受27
});

test('stickAxes：W=前+、S=後ろ、D=右+、A=左。逆のキーは打ち消す。離すと中立', () => {
  const kb = newKb();
  kb.onKeyDown('KeyW');
  assert.deepEqual(kb.build(0).stick, [0, 1]);
  kb.onKeyDown('KeyS');
  assert.deepEqual(kb.build(1).stick, [0, 0]);
  kb.onKeyUp('KeyW');
  assert.deepEqual(kb.build(2).stick, [0, -1]);
  kb.onKeyUp('KeyS');
  kb.onKeyDown('KeyA');
  assert.deepEqual(kb.build(3).stick, [-1, 0]);
  kb.onKeyUp('KeyA');
  kb.onKeyDown('KeyD');
  kb.onKeyDown('ShiftRight');
  assert.deepEqual(kb.build(4).stick, [cfg.input.kbWalkMul, 0]);
  kb.reset();
  assert.deepEqual(kb.build(5).stick, [0, 0]);
});

test('arrowCamera：矢印キーは keyCamDegPs で camDeg を作る（→ が yaw+、↑ が pitch+）', () => {
  const kb = newKb();
  const per = cfg.input.keyCamDegPs / cfg.time.tickRateHz;
  kb.onKeyDown('ArrowRight');
  let f = kb.build(0);
  assert.deepEqual(f.camDeg, [per, 0]);
  assert.equal(f.camHeld, true);
  // 1秒押し続けると keyCamDegPs 度
  let sum = 0;
  for (let i = 0; i < cfg.time.tickRateHz; i++) sum += kb.build(i + 1).camDeg[0];
  assert.ok(near(sum, cfg.input.keyCamDegPs, 1e-9));
  kb.onKeyUp('ArrowRight');
  kb.onKeyDown('ArrowLeft');
  kb.onKeyDown('ArrowUp');
  f = kb.build(100);
  assert.deepEqual(f.camDeg, [-per, per]);
  kb.onKeyUp('ArrowLeft');
  kb.onKeyUp('ArrowUp');
  kb.onKeyDown('ArrowDown');
  assert.deepEqual(kb.build(101).camDeg, [0, -per]);
  kb.onKeyUp('ArrowDown');
  f = kb.build(102);
  assert.deepEqual(f.camDeg, [0, 0]);
  assert.equal(f.camHeld, false);
});

test('buttons：J K Space L U I O が各ボタン。pressed は最初のtickだけ、離すと released', () => {
  const map = { KeyJ: 'attack', KeyK: 'dodge', Space: 'jump', KeyL: 'ougi', KeyU: 'kekkai', KeyI: 'fu', KeyO: 'focus' };
  for (const [code, id] of Object.entries(map)) {
    const kb = newKb();
    kb.onKeyDown(code);
    let f = kb.build(0);
    assert.deepEqual(f.btn[id], { down: true, pressed: true, released: false, ageF: 0 }, code);
    for (const other of Object.keys(f.btn)) if (other !== id) assert.equal(f.btn[other].down, false);
    f = kb.build(1);
    assert.deepEqual(f.btn[id], { down: true, pressed: false, released: false, ageF: 0 }, code);
    kb.onKeyUp(code);
    f = kb.build(2);
    assert.deepEqual(f.btn[id], { down: false, pressed: false, released: true, ageF: 0 }, code);
    f = kb.build(3);
    assert.deepEqual(f.btn[id], { down: false, pressed: false, released: false, ageF: 0 }, code);
  }
});

test('shortTap：同じ区間で押して離した短いタップ → 最初のtickは down、次のtickで released（09 5.3）', () => {
  const kb = newKb();
  kb.onKeyDown('KeyJ');
  kb.onKeyUp('KeyJ');
  let f = kb.build(0);
  assert.deepEqual(f.btn.attack, { down: true, pressed: true, released: false, ageF: 0 });
  f = kb.build(1);
  assert.deepEqual(f.btn.attack, { down: false, pressed: false, released: true, ageF: 0 });
  f = kb.build(2);
  assert.deepEqual(f.btn.attack, { down: false, pressed: false, released: false, ageF: 0 });
});

test('repeatIgnored：キーの自動連打（e.repeat）は無視する', () => {
  const kb = newKb();
  kb.onKeyDown('KeyJ');
  assert.equal(kb.build(0).btn.attack.pressed, true);
  kb.onKeyDown('KeyJ', true);
  kb.onKeyDown('KeyJ');
  assert.equal(kb.build(1).btn.attack.pressed, false);
});

test('flick：Q / E は はじき −1 / +1 を1tickだけ出す', () => {
  const kb = newKb();
  kb.onKeyDown('KeyQ');
  assert.equal(kb.build(0).flick, -1);
  assert.equal(kb.build(1).flick, 0);
  kb.onKeyDown('KeyE');
  assert.equal(kb.build(2).flick, 1);
  assert.equal(kb.build(3).flick, 0);
});

test('ougiSlide：L を押したまま K → ougiOut が1tick＋dodge.pressed。奥義は released を出さずに down=false', () => {
  const kb = newKb();
  kb.onKeyDown('KeyL');
  let f = kb.build(0);
  assert.equal(f.btn.ougi.pressed, true);
  assert.equal(f.ougiOut, false);
  kb.onKeyDown('KeyK');
  f = kb.build(1);
  assert.equal(f.ougiOut, true);
  assert.equal(f.btn.dodge.pressed, true);
  assert.deepEqual(f.btn.ougi, { down: false, pressed: false, released: false, ageF: 0 });
  f = kb.build(2);
  assert.equal(f.ougiOut, false);
  assert.equal(f.btn.ougi.down, false);
  kb.onKeyUp('KeyL');
  assert.equal(kb.build(3).btn.ougi.released, false);
  // 押し直せばまた溜められる
  kb.onKeyUp('KeyK');
  kb.onKeyDown('KeyL');
  assert.equal(kb.build(4).btn.ougi.pressed, true);
});

test('ougiBackspace：L を押したまま Backspace → 取消のみ（ougiOut が1tick、回避は出ない）', () => {
  const kb = newKb();
  kb.onKeyDown('KeyL');
  kb.build(0);
  kb.onKeyDown('Backspace');
  const f = kb.build(1);
  assert.equal(f.ougiOut, true);
  assert.equal(f.btn.dodge.pressed, false);
  assert.equal(f.btn.ougi.down, false);
  assert.equal(f.btn.ougi.released, false);
  assert.equal(kb.build(2).ougiOut, false);
});

test('pauseKey：P と Esc は一時停止の合図（シムへの入力には入らない）', () => {
  let n = 0;
  const kb = newKb({ onPause: () => { n += 1; } });
  kb.onKeyDown('KeyP');
  kb.onKeyUp('KeyP');
  kb.onKeyDown('Escape');
  assert.equal(n, 2);
  const f = kb.build(0);
  for (const b of Object.values(f.btn)) assert.equal(b.down, false);
});

test('frameShape：InputFrame の形が正しい（tick・viewPx・中立の値）', () => {
  const kb = newKb();
  const f = kb.build(42, [667, 375]);
  assert.equal(f.tick, 42);
  assert.deepEqual(f.viewPx, [667, 375]);
  assert.deepEqual(kb.build(43).viewPx, cfg.input.refViewPx);
  assert.deepEqual(f.taps, []);
  assert.equal(f.fu, null);
  assert.deepEqual(Object.keys(f.btn).sort(), ['attack', 'dodge', 'focus', 'fu', 'jump', 'kekkai', 'ougi']);
});
