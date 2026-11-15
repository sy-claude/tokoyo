// 草・野菊・紅葉・枯れ木・電線・千本鳥居・島を作って builder へ足す（見た目の試作）。
// 乱数は core/rng（種つき）。数と形は src/data/lookdev/scene.js から。
import { Color, Matrix4, Vector3 } from 'three';
import { RAD2DEG } from '../../core/math.js';
import { HALF, TAU } from './consts.js';

/** 円の中の1点（中心ほど密）。 */
function inDisc(rng, cx, cz, r) {
  const a = rng.float() * TAU;
  const d = r * Math.sqrt(rng.float()) * (HALF + HALF * rng.float());
  return [cx + Math.cos(a) * d, cz + Math.sin(a) * d];
}

/**
 * 生の三角形を足す道具。
 * @param {ReturnType<typeof import('./build.js').createBuilder>} b
 */
function rawWriter(b) {
  const { P, N, C, F, A, I } = b.raw;
  return {
    /** @returns {number} 頂点番号 */
    vert(x, y, z, nx, ny, nz, c, anim, glow = 0) {
      P.push(x, y, z);
      N.push(nx, ny, nz);
      C.push(c.r, c.g, c.b);
      F.push(0, 0, 0, glow);
      A.push(anim[0], anim[1], anim[2], 0);
      return b.vertexCount - 1;
    },
    tri(a, c, d) {
      I.push(a, c, d);
    },
  };
}

/** 草むら（ススキ・枯れ草・低い草）。葉1枚＝先細りの帯。 */
export function addGrass(b, S, terrain, rng, mul) {
  const w = rawWriter(b);
  const fl = S.flora;
  const c = new Color();
  for (const [cx, cz, r, count, kindName] of S.grass) {
    const kind = S.grassKinds[kindName];
    const clumps = Math.max(1, Math.round(count * mul));
    for (let k = 0; k < clumps; k++) {
      const [x, z] = inDisc(rng, cx, cz, r);
      const y = terrain.height(x, z);
      const blades = Math.round(rng.range(kind.blades[0], kind.blades[1]));
      const hClump = rng.range(kind.hM[0], kind.hM[1]);
      for (let i = 0; i < blades; i++) {
        const a = rng.float() * TAU;
        const dx = Math.cos(a);
        const dz = Math.sin(a);
        const h = hClump * rng.range(HALF, 1);
        const lean = kind.lean * rng.range(HALF, 1) * h;
        const bx = x + dx * kind.spreadM * rng.float() * HALF;
        const bz = z + dz * kind.spreadM * rng.float() * HALF;
        c.copy(b.color(rng.pick(kind.cols))).lerp(b.color(kind.cols[0]), rng.float());
        const phase = rng.float() * TAU;
        const segs = fl.bladeSegCount;
        let prevL = -1;
        let prevR = -1;
        let tx = bx;
        let ty = y;
        let tz = bz;
        for (let sI = 0; sI <= segs; sI++) {
          const t = sI / segs;
          const out = lean * t * t;
          tx = bx + dx * out;
          tz = bz + dz * out;
          ty = y + h * (t - fl.bladeCurve * t * t * HALF);
          const hw = kind.wM * (1 - t * t) + kind.wM * HALF * HALF;
          const anim = [1, t * t * h * fl.bladeSway, phase];
          const l = w.vert(tx - dz * hw, ty, tz + dx * hw, dx * HALF, 1, dz * HALF, c, anim);
          const rr = w.vert(tx + dz * hw, ty, tz - dx * hw, dx * HALF, 1, dz * HALF, c, anim);
          if (sI > 0) {
            w.tri(prevL, prevR, l);
            w.tri(prevR, rr, l);
          }
          prevL = l;
          prevR = rr;
        }
        // ススキの穂：葉先に細長い菱形
        if (rng.float() < kind.plume) {
          const pc = b.color('susukiPlume');
          const [pl, pw] = fl.plumeM;
          const anim = [1, h * fl.bladeSway, phase];
          const ex = tx + dx * pl;
          const ez = tz + dz * pl;
          const v0 = w.vert(tx, ty, tz, 0, 1, 0, pc, anim);
          const v1 = w.vert((tx + ex) * HALF - dz * pw, ty + pl * HALF, (tz + ez) * HALF + dx * pw, 0, 1, 0, pc, anim);
          const v2 = w.vert((tx + ex) * HALF + dz * pw, ty + pl * HALF, (tz + ez) * HALF - dx * pw, 0, 1, 0, pc, anim);
          const v3 = w.vert(ex, ty + pl * HALF * HALF, ez, 0, 1, 0, pc, anim);
          w.tri(v0, v2, v1);
          w.tri(v1, v2, v3);
        }
      }
    }
  }
}

/** 野菊：細い茎＋白い花びらの円盤＋黄色い芯。 */
export function addDaisies(b, S, terrain, rng, mul) {
  const w = rawWriter(b);
  const d = S.daisy;
  const white = b.color('daisy');
  const core = b.color('daisyCore');
  const stem = b.color('grassOlive');
  for (const [cx, cz, r, count] of S.daisies) {
    const n = Math.max(1, Math.round(count * mul));
    for (let k = 0; k < n; k++) {
      const [x, z] = inDisc(rng, cx, cz, r);
      const y0 = terrain.height(x, z);
      const h = rng.range(d.stemM[0], d.stemM[1]);
      const phase = rng.float() * TAU;
      const anim0 = [1, 0, phase];
      const anim1 = [1, h * HALF * HALF, phase];
      const sw = S.flora.stemWM;
      const a = w.vert(x - sw, y0, z, 0, 1, 0, stem, anim0);
      const c = w.vert(x + sw, y0, z, 0, 1, 0, stem, anim0);
      const e = w.vert(x, y0 + h, z, 0, 1, 0, stem, anim1);
      w.tri(a, c, e);
      // 花は少し手前（−Z）へ傾ける
      const tilt = rng.range(0, HALF);
      const pr = d.petalM * rng.range(HALF + HALF * HALF, 1 + HALF * HALF);
      const center = w.vert(x, y0 + h, z, 0, 1, 0, core, anim1);
      let first = -1;
      let prev = -1;
      for (let i = 0; i < d.petalCount; i++) {
        const ang = (i / d.petalCount) * TAU + phase;
        const px = Math.cos(ang) * pr;
        const pz = Math.sin(ang) * pr;
        const v = w.vert(x + px, y0 + h + pz * tilt, z + pz, 0, 1, 0, white, anim1);
        if (prev >= 0) w.tri(center, v, prev);
        else first = v;
        prev = v;
      }
      w.tri(center, first, prev);
    }
  }
}

/** 紅葉：枝は管、葉は「もみじ形の扇」を房ごとに散らす。まず枝。 */
export function addMapleBranches(b, S) {
  for (const br of S.maple.branches) b.add({ s: 'tube', path: br.path, r: br.r, rseg: S.flora.branchRseg, col: 'bark', col2: 'barkHi', fx: [HALF, 0, 0, 0], jitter: br.r[0] * HALF * HALF, jfreq: 1 });
}

/** もみじ形の扇を1枚足す（中心＋外周。ax・ay は葉の面の2軸）。 */
function leafFan(w, fl, x, y, z, ax, ay, size, c, anim) {
  const pts = fl.leafLobeCount * 2;
  const center = w.vert(x, y, z, 0, 1, 0, c, anim);
  let first = -1;
  let prev = -1;
  for (let i = 0; i < pts; i++) {
    const ang = (i / pts) * TAU;
    const rad = size * (i % 2 === 0 ? 1 : fl.leafLobe);
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    const v = w.vert(x + ax.x * px + ay.x * py, y + ax.y * px + ay.y * py, z + ax.z * px + ay.z * py, 0, 1, 0, c, anim);
    if (prev >= 0) w.tri(center, prev, v);
    else first = v;
    prev = v;
  }
  w.tri(center, prev, first);
}

/** 紅葉の葉。 */
export function addMaple(b, S, rng, mul) {
  const M = S.maple;
  const w = rawWriter(b);
  const fl = S.flora;
  const ax = new Vector3();
  const ay = new Vector3();
  const nrm = new Vector3();
  const c = new Color();
  for (const [cx, cy, cz, r, count] of M.clusters) {
    const n = Math.max(1, Math.round(count * mul));
    for (let k = 0; k < n; k++) {
      // 房の中の位置（中心ほど密、縦につぶす）
      const a = rng.float() * TAU;
      const e = Math.acos(rng.range(-1, 1));
      const d = r * Math.cbrt(rng.float());
      const x = cx + Math.sin(e) * Math.cos(a) * d;
      const y = cy + Math.cos(e) * d * fl.clusterFlat;
      const z = cz + Math.sin(e) * Math.sin(a) * d;
      // 葉の面：だいたい下向き〜横向き（下から見上げる構図で形が見える）
      nrm.set(rng.range(-1, 1), rng.range(-1, HALF), rng.range(-1, 1)).normalize();
      ax.set(rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1)).cross(nrm).normalize();
      ay.crossVectors(nrm, ax);
      const size = M.leafM * rng.range(HALF + HALF * HALF, 1 + HALF * HALF);
      c.copy(b.color(rng.pick(S.palette.maple)));
      c.multiplyScalar(rng.range(1 - HALF * HALF, 1 + HALF * HALF));
      leafFan(w, fl, x, y, z, ax, ay, size, c, [1, fl.leafSway, rng.float() * TAU]);
    }
  }
}

/** 落ち葉：地面に寝たもみじ（参道と草地に散らす）。 */
export function addFallenLeaves(b, S, terrain, rng, mul) {
  const w = rawWriter(b);
  const fl = S.flora;
  const ax = new Vector3();
  const ay = new Vector3();
  const c = new Color();
  const still = [0, 0, 0];
  for (const [cx, cz, r, count] of S.fallenLeaves) {
    const n = Math.max(1, Math.round(count * mul));
    for (let k = 0; k < n; k++) {
      const [x, z] = inDisc(rng, cx, cz, r);
      const a = rng.float() * TAU;
      const tilt = rng.range(-fl.fallenTilt, fl.fallenTilt);
      ax.set(Math.cos(a), tilt, Math.sin(a)).normalize();
      ay.set(-Math.sin(a), rng.range(-fl.fallenTilt, fl.fallenTilt), Math.cos(a)).normalize();
      c.copy(b.color(rng.pick(S.palette.fallen)));
      const size = S.maple.leafM * fl.fallenSize * rng.range(HALF, 1 + HALF);
      leafFan(w, fl, x, terrain.height(x, z) + fl.fallenLiftM, z, ax, ay, size, c, still);
    }
  }
}

/** 小石・岩・茂みを散らす（参道の縁、岸、丘の斜面）。 */
export function addScatter(b, S, terrain, rng) {
  const pathX = (z) => {
    const P = S.path;
    if (z <= P[0][1]) return P[0][0];
    for (let i = 1; i < P.length; i++) {
      if (z <= P[i][1]) return P[i - 1][0] + ((P[i][0] - P[i - 1][0]) * (z - P[i - 1][1])) / (P[i][1] - P[i - 1][1]);
    }
    return P[P.length - 1][0];
  };
  for (const sc of S.scatter) {
    for (let k = 0; k < sc.count; k++) {
      let x = 0;
      let z = 0;
      if (sc.edge) {
        z = rng.range(sc.edge[0], sc.edge[1]);
        const side = rng.float() < HALF ? -1 : 1;
        x = pathX(z) + side * rng.range(sc.offM[0], sc.offM[1]);
      } else {
        [x, z] = inDisc(rng, sc.disc[0], sc.disc[1], sc.disc[2]);
      }
      const s = rng.range(sc.scale[0], sc.scale[1]);
      b.add({ s: 'ref', model: rng.pick(sc.models), at: [x, terrain.height(x, z) - sc.sink * s, z], rot: [rng.range(-sc.tilt, sc.tilt), rng.float() * (TAU * RAD2DEG), rng.range(-sc.tilt, sc.tilt)], scale: s });
    }
  }
}

/** 枯れ木：幹＋斜め上へ伸びる枝＋小枝。 */
export function addBareTrees(b, S, terrain, rng) {
  const T = S.bareTree;
  const fl = S.flora;
  const dark = new Color(S.palette.bareTree);
  const pale = new Color(S.palette.cliffHi);
  for (const [x, z, h, k] of S.bareTrees) {
    const y = terrain.height(x, z);
    const col = `#${dark.clone().lerp(pale, 1 - k).getHexString()}`;
    const cv = fl.treeCurveM;
    const trunk = [[x, y - HALF, z], [x + rng.range(-cv, cv), y + h * HALF, z + rng.range(-cv, cv)], [x + rng.range(-cv, cv), y + h, z + rng.range(-cv, cv)]];
    b.add({ s: 'tube', path: trunk, r: [T.trunkRM * h * HALF, T.trunkRM * HALF * HALF], rseg: S.flora.branchRseg, col });
    for (let i = 0; i < T.branchCount; i++) {
      const t = rng.range(fl.treeBranchFrom, 1);
      const sx = trunk[1][0] + (trunk[2][0] - trunk[1][0]) * t;
      const sy = y + h * (HALF + HALF * t) * rng.range(HALF + HALF * HALF, 1);
      const sz = trunk[1][2] + (trunk[2][2] - trunk[1][2]) * t;
      const a = rng.float() * TAU;
      const len = h * rng.range(fl.treeBranchLen[0], fl.treeBranchLen[1]);
      const ex = sx + Math.cos(a) * len * T.spreadM;
      const ez = sz + Math.sin(a) * len * T.spreadM;
      const ey = sy + len * rng.range(HALF, 1);
      const mid = [(sx + ex) * HALF + rng.range(-cv, cv) * HALF, (sy + ey) * HALF - len * HALF * HALF * HALF, (sz + ez) * HALF + rng.range(-cv, cv) * HALF];
      b.add({ s: 'tube', path: [[sx, sy, sz], mid, [ex, ey, ez]], r: [T.trunkRM * HALF, T.trunkRM * HALF * HALF * HALF], rseg: N_RSEG, col });
      for (let j = 0; j < T.twigCount; j++) {
        const tl = len * fl.twigLen * rng.range(HALF, 1);
        const ta = rng.float() * TAU;
        const from = rng.float() < HALF ? mid : [ex, ey, ez];
        b.add({ s: 'tube', path: [from, [from[0] + Math.cos(ta) * tl * HALF, from[1] + tl * HALF, from[2] + Math.sin(ta) * tl * HALF], [from[0] + Math.cos(ta) * tl, from[1] + tl * rng.range(HALF, 1), from[2] + Math.sin(ta) * tl]],
          r: [T.trunkRM * HALF * HALF, T.trunkRM * HALF * HALF * HALF * HALF], rseg: N_RSEG, seg: 2, col });
      }
    }
  }
}
const N_RSEG = 3; // num-ok: 細い枝の断面は三角形で足りる

/** 電線：2点の間をたるませた細い管。 */
export function addWires(b, S) {
  const n = S.flora.wireSegCount;
  for (const [p0, p1, sag] of S.wires) {
    const path = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      path.push([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t - sag * (1 - (2 * t - 1) * (2 * t - 1)), p0[2] + (p1[2] - p0[2]) * t]);
    }
    b.add({ s: 'tube', path, r: S.wireRM, rseg: S.flora.wireRseg, seg: n * 2, col: 'wire' });
  }
}

/** 千本鳥居：折れ線に沿って小さな鳥居を並べる。 */
export function addSenbon(b, S, terrain) {
  const { line, stepM, sink } = S.senbon;
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1];
    const [bx, bz] = line[i];
    const len = Math.hypot(bx - ax, bz - az);
    const yaw = Math.atan2(bx - ax, bz - az) * RAD2DEG;
    const n = Math.floor(len / stepM);
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      b.add({ s: 'ref', model: 'toriiSmall', at: [x, terrain.height(x, z) - sink, z], rot: [0, yaw, 0] });
    }
  }
}

/** 遠くの島と山並み。 */
export function addIslands(b, S) {
  const fl = S.flora;
  let seed = 1;
  for (const [x, y, z, rx, ry, rz, col] of S.islands) {
    b.add({ s: 'sph', r: [rx, ry, rz], seg: fl.islandSeg, at: [x, y, z], col, jitter: ry * fl.islandJitter, jfreq: fl.islandJfreq, seed });
    seed += 1;
  }
}

/** 部品の表を、地形の高さに合わせて置く。 */
export function placeAll(b, list, terrain, origin = new Matrix4()) {
  for (const p of list) {
    const at = p.ground ? [p.at[0], p.at[1] + terrain.height(p.at[0], p.at[2]), p.at[2]] : p.at;
    b.add({ s: 'ref', model: p.model, at, rot: p.rot, scale: p.scale }, origin);
  }
}
