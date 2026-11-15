// 地形（見た目の試作）。高さは純関数 height(x, z)：参道のまわりは平ら、左は海へ落ち、右と奥は千本鳥居の丘へ上る。
// 局所座標（主人公の開始位置が原点）。値はすべて src/data/lookdev/scene.js の terrain から。
import { fbm2, smoothstep } from '../../core/noise.js';
import { BYTE_MAX, HALF } from './consts.js';

/** 折れ線 [[k, v], …] を k で引く（区間の外は端の値）。 */
function sampleLine(line, k) {
  if (k <= line[0][0]) return line[0][1];
  for (let i = 1; i < line.length; i++) {
    if (k <= line[i][0]) {
      const t = (k - line[i - 1][0]) / (line[i][0] - line[i - 1][0]);
      return line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t;
    }
  }
  return line[line.length - 1][1];
}

/** 点から折れ線 [[x, z, …], …] までの距離。 */
export function polylineDist(pts, x, z) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1][0];
    const az = pts[i - 1][1];
    const bx = pts[i][0] - ax;
    const bz = pts[i][1] - az;
    const t = Math.min(1, Math.max(0, ((x - ax) * bx + (z - az) * bz) / (bx * bx + bz * bz)));
    best = Math.min(best, Math.hypot(x - ax - bx * t, z - az - bz * t));
  }
  return best;
}

/**
 * @param {any} T scene.terrain @param {number[][]} path 参道の中心線
 */
export function createTerrain(T, path) {
  /** 丘の「奥へ入った量」（0 以下は平地）。 */
  function hillS(x, z) {
    const sR = T.hillFootX - x;
    const sB = (z - T.hillBackZ) * T.hillBackGain - Math.max(0, x - T.hillBackPivotX) * T.hillBackSlant;
    const s = HALF * (sR + sB + Math.sqrt((sR - sB) * (sR - sB) + T.hillBlend));
    const n = (fbm2(x * T.hillNoiseFreq, z * T.hillNoiseFreq) - HALF) * T.hillNoiseM;
    return s + n * smoothstep(0, T.hillStep1W, s);
  }
  function height(x, z) {
    const s = hillS(x, z);
    const hill = T.hillStep1M * smoothstep(0, T.hillStep1W, s) + T.hillStep2M * smoothstep(T.hillStep2From, T.hillStep2To, s)
      + T.hillRampRatio * Math.max(s, 0);
    const wob = (fbm2(x * T.bumpFreq + 1, z * T.bumpFreq - 1) - HALF) * T.coastNoiseM;
    const e = x - sampleLine(T.coast, z) + wob;
    const sea = -T.coastDepthM * smoothstep(0, T.coastDropM, e);
    const d = polylineDist(path, x, z);
    const bump = (fbm2(x * T.bumpFreq, z * T.bumpFreq) - HALF) * T.bumpM * smoothstep(T.flatHalfM, T.flatHalfM * 2, d);
    return hill + sea + bump;
  }

  return {
    height,
    hillS,
    /**
     * 地形の面を builder へ足す。色は高さ・傾き・ノイズで塗り分ける（石畳はシェーダが上に描く）。
     * @param {ReturnType<typeof import('./build.js').createBuilder>} b
     */
    addTo(b) {
      const [x0, z0, x1, z1] = T.rect;
      const nx = Math.round((x1 - x0) / T.cellM) + 1;
      const nz = Math.round((z1 - z0) / T.cellM) + 1;
      const { P, N, C, F, A, I } = b.raw;
      const base = b.vertexCount;
      const hs = new Float32Array(nx * nz);
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) hs[j * nx + i] = height(x0 + i * T.cellM, z0 + j * T.cellM);
      const at = (i, j) => hs[Math.min(nz - 1, Math.max(0, j)) * nx + Math.min(nx - 1, Math.max(0, i))];
      const col = (name) => b.color(name);
      const c = col('earth').clone();
      const f = T.colorFreq;
      for (let j = 0; j < nz; j++) {
        for (let i = 0; i < nx; i++) {
          const x = x0 + i * T.cellM;
          const z = z0 + j * T.cellM;
          const y = hs[j * nx + i];
          let nxv = at(i - 1, j) - at(i + 1, j);
          let nzv = at(i, j - 1) - at(i, j + 1);
          let nyv = 2 * T.cellM;
          const len = Math.hypot(nxv, nyv, nzv);
          nxv /= len;
          nyv /= len;
          nzv /= len;
          P.push(x, y, z);
          N.push(nxv, nyv, nzv);
          // 草地：枯れ草・オリーブ・土。丘の上は紅葉の残る藪の色
          const n1 = fbm2(x * f, z * f);
          const n2 = fbm2(x * f * 2 + T.colorShift, z * f * 2 - T.colorShift);
          c.copy(col('grassDry')).lerp(col('grassOlive'), smoothstep(HALF - HALF * HALF, HALF + HALF * HALF, n1));
          c.lerp(col('earth'), smoothstep(HALF, 1, n2));
          const hillK = smoothstep(T.hillColorM[0], T.hillColorM[1], y);
          c.lerp(col('hillBrush'), hillK * (1 - n2 * HALF));
          c.lerp(col('hillBrushWarm'), hillK * smoothstep(HALF, 1, n1) * HALF);
          // 岩肌：傾きの急な所。海辺は濡れて暗い
          const rockK = smoothstep(T.slopeRock[0], T.slopeRock[1], 1 - nyv);
          c.lerp(col('cliff'), rockK);
          c.lerp(col('cliffHi'), rockK * smoothstep(HALF, 1, n2) * HALF);
          const wetK = smoothstep(T.wetM[0], T.wetM[1], y);
          c.lerp(col('rockWet'), wetK);
          C.push(c.r, c.g, c.b);
          F.push(rockK * T.rockMoss + (1 - rockK) * T.grassMoss * (1 - wetK), 0, rockK, 0);
          A.push(0, 0, 0, 0);
        }
      }
      for (let j = 0; j < nz - 1; j++) {
        for (let i = 0; i < nx - 1; i++) {
          const a = base + j * nx + i;
          I.push(a, a + nx, a + 1, a + 1, a + nx, a + nx + 1);
        }
      }
    },
    /** 海の泡用：高さの図（1辺 n の 8bit）。 @returns {{data:Uint8Array, n:number, rect:number[]}} */
    heightMap() {
      const n = T.heightMapCount;
      const [x0, z0, x1, z1] = T.rect;
      const data = new Uint8Array(n * n);
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const h = height(x0 + ((i + HALF) / n) * (x1 - x0), z0 + ((j + HALF) / n) * (z1 - z0));
          data[j * n + i] = Math.round(Math.min(1, Math.max(0, (h - T.heightRange[0]) / T.heightRange[1])) * BYTE_MAX);
        }
      }
      return { data, n, rect: T.rect };
    },
  };
}
