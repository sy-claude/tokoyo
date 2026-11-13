// シード付き乱数（09 4.4）。splitmix32 で種を広げた xorshift128（32bit）。
// シムの乱数はここだけ。Math.random は使わない（不変条件1）。
import { hash32 } from './hash.js';

const SPLITMIX_GAMMA = 0x9e3779b9;
const UINT32_RANGE = 4294967296;

function splitmix32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + SPLITMIX_GAMMA) >>> 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    t ^= t >>> 15;
    return t >>> 0;
  };
}

/**
 * @typedef {Object} Rng
 * @property {number} seed
 * @property {Uint32Array} s  内部状態（ハッシュに入れる）
 * @property {()=>number} next   uint32
 * @property {()=>number} float  [0,1)
 * @property {(a:number, b:number)=>number} range  [a,b)
 * @property {(n:number)=>number} int  0〜n−1
 * @property {<T>(arr:T[])=>T} pick
 * @property {(label:string)=>Rng} fork  種＝hash32(seed, label) の独立した流れ
 */

/** @param {number} seed @returns {Rng} */
export function createRng(seed) {
  const sm = splitmix32(seed);
  const s = new Uint32Array(4);
  s[0] = sm();
  s[1] = sm();
  s[2] = sm();
  s[3] = sm();
  if ((s[0] | s[1] | s[2] | s[3]) === 0) s[0] = 1; // xorshift は全0の状態を持てない

  /** @type {Rng} */
  const rng = {
    seed: seed >>> 0,
    s,
    next() {
      let t = s[3];
      const x = s[0];
      s[3] = s[2];
      s[2] = s[1];
      s[1] = x;
      t ^= t << 11;
      t ^= t >>> 8;
      s[0] = (t ^ x ^ (x >>> 19)) >>> 0;
      return s[0];
    },
    float() {
      return rng.next() / UINT32_RANGE;
    },
    range(a, b) {
      return a + rng.float() * (b - a);
    },
    int(n) {
      return Math.floor(rng.float() * n);
    },
    pick(arr) {
      return arr[rng.int(arr.length)];
    },
    fork(label) {
      return createRng(hash32(rng.seed, label));
    },
  };
  return rng;
}

/** 描画と音の種（シムと別の流れ。ハッシュに含めない。09 4.4）。 */
export function presentationSeed(seed) {
  return (seed ^ SPLITMIX_GAMMA) >>> 0;
}
