// 値ノイズ（純関数・決定論）。地形や岩の凹凸など「形を作るとき」に使う。時刻・乱数に頼らない。

/** 整数格子の点 → 0〜1 の擬似乱数。 */
function hash3(ix, iy, iz) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(iz, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const fade = (t) => t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;

/** 3次元の値ノイズ（0〜1）。 */
export function noise3(x, y, z) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const fz = fade(z - iz);
  const a = mix(mix(hash3(ix, iy, iz), hash3(ix + 1, iy, iz), fx), mix(hash3(ix, iy + 1, iz), hash3(ix + 1, iy + 1, iz), fx), fy);
  const b = mix(mix(hash3(ix, iy, iz + 1), hash3(ix + 1, iy, iz + 1), fx), mix(hash3(ix, iy + 1, iz + 1), hash3(ix + 1, iy + 1, iz + 1), fx), fy);
  return mix(a, b, fz);
}

/** 重ねた値ノイズ（0〜1）。 @param {number} [octaves] */
export function fbm3(x, y, z, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += noise3(x * f, y * f, z * f) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

/** 2次元（y=定数の断面）。 */
export function fbm2(x, z, octaves = 4) {
  return fbm3(x, 7.31, z, octaves);
}

/** 0〜1 のなめらかな段。 */
export function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
