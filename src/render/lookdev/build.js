// 形の記述（src/data/lookdev/models.js の部品の表）→ 1つにまとめたジオメトリ。
// 部品：box・cyl・sph・lathe・tube・loft・ribbon・fan・group・ref。色は THREE.Color を通す（不変条件10）。
// 頂点の属性：position・normal・color・aFx（苔, 塗りのはげ, 石畳, 発光）・aAnim（動きの種類, 重み）。
import {
  BoxGeometry, BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, CylinderGeometry, Euler, LatheGeometry,
  Matrix4, Quaternion, SphereGeometry, TubeGeometry, Vector2, Vector3,
} from 'three';
import { DEG2RAD } from '../../core/math.js';
import { fbm3 } from '../../core/noise.js';
import { createRng } from '../../core/rng.js';
import { BYTE_MAX, HALF, N3, N4, SEG_DEFAULT, TAU } from './consts.js';

const ZERO4 = [0, 0, 0, 0];
/** しわの谷で、筋を引き始める所（谷の中心からの近さ 0〜1）。形の作り方の定数 */
const FOLD_LINE_FROM = 0.6; // num-ok: 谷の芯の範囲（形の作り方の定数）
const ONE3 = [1, 1, 1];
const ZERO3 = [0, 0, 0];

/** at・rot（度）・scale → 行列。 */
export function partMatrix(p) {
  const at = p.at ?? ZERO3;
  const rot = p.rot ?? ZERO3;
  const sc = typeof p.scale === 'number' ? [p.scale, p.scale, p.scale] : p.scale ?? ONE3;
  const q = new Quaternion().setFromEuler(new Euler(rot[0] * DEG2RAD, rot[1] * DEG2RAD, rot[2] * DEG2RAD, 'YXZ'));
  return new Matrix4().compose(new Vector3(at[0], at[1], at[2]), q, new Vector3(sc[0], sc[1], sc[2]));
}

const v3 = (a) => new Vector3(a[0], a[1], a[2]);

/** 帯（幅のある平たい紐。鉢巻の尾・紙垂・草の葉）。 */
function ribbonGeometry(p) {
  const pts = p.smooth === false ? p.path.map(v3) : new CatmullRomCurve3(p.path.map(v3)).getPoints(p.seg ?? p.path.length * 2);
  const n = pts.length;
  const w0 = Array.isArray(p.w) ? p.w[0] : p.w;
  const w1 = Array.isArray(p.w) ? p.w[1] : p.w;
  const side = v3(p.side ?? [1, 0, 0]).normalize();
  const pos = new Float32Array(n * 2 * N3);
  const uv = new Float32Array(n * 2 * 2);
  const idx = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const hw = (w0 + (w1 - w0) * t) * HALF;
    const a = pts[i].clone().addScaledVector(side, -hw);
    const b = pts[i].clone().addScaledVector(side, hw);
    a.toArray(pos, i * 2 * N3);
    b.toArray(pos, (i * 2 + 1) * N3);
    uv[i * N4 + 1] = t;
    uv[i * N4 + 2] = 1;
    uv[i * N4 + N3] = t;
    if (i > 0) {
      const k = i * 2;
      idx.push(k - 2, k - 1, k, k - 1, k + 1, k);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, N3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** 扇（中心＋外周の点。葉・花びら・破れ傘の布）。pts は [x,y,z] の列、最初が中心。 */
function fanGeometry(p) {
  const n = p.pts.length;
  const pos = new Float32Array(n * N3);
  const uv = new Float32Array(n * 2);
  const idx = [];
  for (let i = 0; i < n; i++) {
    pos.set(p.pts[i], i * N3);
    uv[i * 2 + 1] = i === 0 ? 0 : 1;
    if (i >= 2) idx.push(0, i - 1, i);
  }
  if (p.closed) idx.push(0, n - 1, 1);
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, N3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * 肉付けした管（体・手足・袖）：道のりに沿って、楕円の断面の大きさを変えながらつなぐ。
 * st＝[[x, y, z, 半径A, 半径B], …]。A の向きは side（道のりに直交させる）、B は道のり×A。両端はふさぐ。
 */
function loftGeometry(p) {
  const st = p.st;
  const centers = new CatmullRomCurve3(st.map((q) => new Vector3(q[0], q[1], q[2])));
  const radii = new CatmullRomCurve3(st.map((q) => new Vector3(q[N3], q[N4], 0)));
  const rings = p.n ?? st.length * N3;
  const seg = p.seg ?? SEG_DEFAULT;
  const side = v3(p.side ?? [1, 0, 0]);
  const arc = p.arc ?? null; // 開いた筒（V5）：[始まり, 終わり]（度）。前の開いた羽織など。ふたは付けない
  const pos = [];
  const uv = [];
  const idx = [];
  const c = new Vector3();
  const r = new Vector3();
  const tan = new Vector3();
  const A = new Vector3();
  const B = new Vector3();
  for (let i = 0; i < rings; i++) {
    const t = i / (rings - 1);
    centers.getPoint(t, c);
    radii.getPoint(t, r);
    centers.getTangent(t, tan);
    A.copy(side).addScaledVector(tan, -side.dot(tan)).normalize();
    B.crossVectors(tan, A);
    for (let j = 0; j <= seg; j++) {
      const a = arc ? (arc[0] + ((arc[1] - arc[0]) * j) / seg) * DEG2RAD : (j / seg) * TAU;
      const ca = Math.cos(a) * Math.max(r.x, 0);
      const sa = Math.sin(a) * Math.max(r.y, 0);
      pos.push(c.x + A.x * ca + B.x * sa, c.y + A.y * ca + B.y * sa, c.z + A.z * ca + B.z * sa);
      uv.push(j / seg, t);
      if (i > 0 && j > 0) {
        const k = i * (seg + 1) + j;
        idx.push(k - seg - 2, k - 1, k - seg - 1, k - seg - 1, k - 1, k);
      }
    }
  }
  // 両端のふた
  for (const end of arc ? [] : [0, rings - 1]) {
    centers.getPoint(end === 0 ? 0 : 1, c);
    const center = pos.length / N3;
    pos.push(c.x, c.y, c.z);
    uv.push(HALF, end === 0 ? 0 : 1);
    for (let j = 0; j < seg; j++) {
      const k = end * (seg + 1) + j;
      if (end === 0) idx.push(center, k, k + 1);
      else idx.push(center, k + 1, k);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), N3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.userData.seg = seg;
  g.userData.rings = rings;
  return g;
}

/** 部品1つ → three のジオメトリ（局所座標）。segMul＝円周の分割数に掛ける倍率（品質ごと）。ひだのある形は山の数を保つ。 */
function shapeGeometry(p0, segMul) {
  // 品質ごとの細かさ：円周の分割（ひだのある形は山の数を保つため変えない）と、管（loft）の道のりの輪の数を減らす
  let p = p0;
  if (segMul !== 1) {
    p = { ...p0 };
    if (p0.seg !== undefined && !p0.flute) p.seg = Math.max(N4, Math.round(p0.seg * segMul));
    if (p0.s === 'loft' && p0.n !== undefined) p.n = Math.max(p0.st.length, Math.round(p0.n * segMul));
  }
  switch (p.s) {
    case 'geom':
      return p.geom.clone(); // 描画側で作った形（しわの墨線など）
    case 'box': {
      const extra = p.bevel ? 2 : 0; // 面取りは各辺の両端に1区画ずつ足して作る
      const g = new BoxGeometry(p.size[0], p.size[1], p.size[2], (p.segs?.[0] ?? 1) + extra, (p.segs?.[1] ?? 1) + extra, (p.segs?.[2] ?? 1) + extra);
      if (p.bevel) bevelBox(g, p.size, p.bevel);
      g.translate(0, p.size[1] * HALF, 0); // 底面の中心が原点
      return g;
    }
    case 'cyl': {
      const r = Array.isArray(p.r) ? p.r : [p.r, p.r];
      const g = new CylinderGeometry(r[1], r[0], p.h, p.seg ?? SEG_DEFAULT, p.hseg ?? 1, p.open === true);
      g.translate(0, p.h * HALF, 0);
      return g;
    }
    case 'sph': {
      const r = Array.isArray(p.r) ? p.r : [p.r, p.r, p.r];
      const seg = p.seg ?? SEG_DEFAULT;
      const g = new SphereGeometry(1, seg, Math.max(2, Math.round(seg * (p.vseg ?? HALF + HALF * HALF))));
      g.scale(r[0], r[1], r[2]);
      return g;
    }
    case 'lathe':
      return new LatheGeometry(p.pts.map((q) => new Vector2(q[0], q[1])), p.seg ?? SEG_DEFAULT);
    case 'tube': {
      const curve = new CatmullRomCurve3(p.path.map(v3));
      const g = new TubeGeometry(curve, p.seg ?? p.path.length * N3, 1, p.rseg ?? N4 + 1, false);
      // 半径を道のりに沿って変える（先細り）
      const r0 = Array.isArray(p.r) ? p.r[0] : p.r;
      const r1 = Array.isArray(p.r) ? p.r[1] : p.r;
      const pos = g.attributes.position;
      const uv = g.attributes.uv;
      const c = new Vector3();
      const q = new Vector3();
      for (let i = 0; i < pos.count; i++) {
        const t = uv.getX(i);
        curve.getPointAt(t, c);
        q.fromBufferAttribute(pos, i).sub(c).multiplyScalar(r0 + (r1 - r0) * t).add(c);
        pos.setXYZ(i, q.x, q.y, q.z);
      }
      return g;
    }
    case 'loft':
      return loftGeometry(p);
    case 'ribbon':
      return ribbonGeometry(p);
    case 'fan':
      return fanGeometry(p);
    default:
      throw new Error(`lookdev: 知らない部品 ${p.s}`);
  }
}

/** 縦のひだ（袴・畳んだ傘）：Y軸まわりに半径を山谷に変える。flute=[山の数, 深さ, 上で消える割合]。 */
function fluteGeometry(g, flute) {
  const [n, depth, topFade] = flute;
  g.computeBoundingBox();
  const bb = g.boundingBox;
  const span = Math.max(bb.max.y - bb.min.y, Number.EPSILON);
  const pos = g.attributes.position;
  const ao = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const t = (Math.atan2(z, x) / TAU) * n;
    const tri = Math.abs(t - Math.floor(t) - HALF) * 2;
    const k = 1 + depth * (tri * 2 - 1) * (1 - topFade * ((pos.getY(i) - bb.min.y) / span));
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
    ao[i] = (tri - HALF) * (1 - topFade * ((pos.getY(i) - bb.min.y) / span));
  }
  // ひだの谷を暗く、山を明るく塗る
  g.setAttribute('ao', new BufferAttribute(ao, 1));
  g.computeVertexNormals();
}

/**
 * 面取り（V5）：箱の角と辺を丸める。各辺の端の1区画を面取りの幅に詰め、内側の箱からの距離を幅にそろえる。
 * @param {BufferGeometry} g 中心が原点の箱 @param {number[]} size @param {number} bevel 面取りの幅（m）
 */
function bevelBox(g, size, bevel) {
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const r = Math.min(bevel, Math.min(size[0], size[1], size[2]) * HALF * HALF);
  const half = [size[0] * HALF, size[1] * HALF, size[2] * HALF];
  const eps = Math.min(half[0], half[1], half[2]) / BYTE_MAX;
  const c = [0, 0, 0];
  const inner = [0, 0, 0];
  for (let i = 0; i < pos.count; i++) {
    c[0] = pos.getX(i);
    c[1] = pos.getY(i);
    c[2] = pos.getZ(i);
    for (let a = 0; a < N3; a++) {
      const h = half[a];
      // 端の区画を面取りの幅に詰める（端から1つ目の頂点を「内側の箱」の面へ寄せる）。区画の幅は 全長÷区画数
      const segN = Math.round((g.parameters[a === 0 ? 'widthSegments' : a === 1 ? 'heightSegments' : 'depthSegments']));
      const step = (h * 2) / segN;
      const idx = Math.round((c[a] + h) / step);
      if (idx === 1) c[a] = -h + r;
      else if (idx === segN - 1) c[a] = h - r;
      else if (idx > 1 && idx < segN - 1) c[a] = -h + r + ((idx - 1) / (segN - 2)) * (h * 2 - r * 2);
      inner[a] = Math.max(-h + r, Math.min(h - r, c[a]));
    }
    const dx = c[0] - inner[0];
    const dy = c[1] - inner[1];
    const dz = c[2] - inner[2];
    const d = Math.hypot(dx, dy, dz);
    if (d > eps) {
      pos.setXYZ(i, inner[0] + (dx / d) * r, inner[1] + (dy / d) * r, inner[2] + (dz / d) * r);
      nor.setXYZ(i, dx / d, dy / d, dz / d);
    } else {
      pos.setXYZ(i, c[0], c[1], c[2]);
    }
  }
  pos.needsUpdate = true;
}

/**
 * 彫り込み（V5）：円柱・回転体の側面に、縦の割れ目や欠けを彫る。場所と深さを表で指定する。
 * grooves＝[[向き(度), 幅(度), 深さ(m), 下端(0..1), 上端(0..1)], …]。割れ目は上下の端へ向けて浅くなり、少し蛇行する。
 */
function grooveGeometry(g, grooves) {
  g.computeBoundingBox();
  const bb = g.boundingBox;
  const span = Math.max(bb.max.y - bb.min.y, Number.EPSILON);
  const pos = g.attributes.position;
  const ao = g.attributes.ao ? g.attributes.ao.array : new Float32Array(pos.count);
  const turn = TAU / DEG2RAD;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const rad = Math.hypot(x, z);
    if (rad < Number.EPSILON) continue;
    const ty = (pos.getY(i) - bb.min.y) / span;
    const ang = Math.atan2(z, x) / DEG2RAD;
    let cut = 0;
    for (const [a0, w, depth, y0, y1] of grooves) {
      if (ty < y0 || ty > y1) continue;
      const u = (ty - y0) / Math.max(y1 - y0, Number.EPSILON);
      const wander = Math.sin(u * TAU + a0) * w * HALF; // 蛇行
      let da = Math.abs(ang - a0 - wander) % turn;
      if (da > turn * HALF) da = turn - da;
      const across = Math.max(0, 1 - da / w);
      const along = Math.sin(u * Math.PI);
      cut = Math.max(cut, across * Math.sqrt(along) * depth);
    }
    if (cut > 0) {
      const k = (rad - cut) / rad;
      pos.setX(i, x * k);
      pos.setZ(i, z * k);
      ao[i] -= Math.min(1, cut / (rad * HALF)) * 2;
    }
  }
  g.setAttribute('ao', new BufferAttribute(ao, 1));
  g.computeVertexNormals();
}

/** 面の向きは作り方で内向きにも外向きにもなる（管 loft は内向き）。形の中心から見て外向きなら 1、内向きなら -1。 */
function outwardSign(g) {
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  g.computeBoundingBox();
  const mid = g.boundingBox.getCenter(new Vector3());
  let facing = 0;
  for (let i = 0; i < pos.count; i++) {
    facing += (pos.getX(i) - mid.x) * nor.getX(i) + (pos.getY(i) - mid.y) * nor.getY(i) + (pos.getZ(i) - mid.z) * nor.getZ(i);
  }
  return facing < 0 ? -1 : 1;
}

/**
 * しわの墨線（V5）：谷（深さが正）の芯に沿って、布の表面に貼りつく細い帯を作る。管（loft）の頂点の並び（輪×(seg+1)）を使う。
 * 帯は谷の両端へ向けて細くなる。ink＝[幅(m), 浮かせる量(m), 引く谷の最短の長さ(道のりの比。省くと全部)]
 */
function foldInkGeometry(g, folds, ink) {
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  const seg = g.userData.seg;
  const rings = g.userData.rings;
  if (!seg || !rings) return null;
  const out = outwardSign(g);
  const [width, lift, minLen = 0] = ink;
  const P2 = [];
  const N2 = [];
  const UV2 = [];
  const I2 = [];
  const a = new Vector3();
  const b = new Vector3();
  const na = new Vector3();
  const nb = new Vector3();
  const side = new Vector3();
  const at = (r, j, target, ntarget) => {
    const k = r * (seg + 1) + j;
    target.fromBufferAttribute(pos, k);
    ntarget.fromBufferAttribute(nor, k);
  };
  for (const [u0, , depth, v0, v1, peak = HALF] of folds) {
    if (depth <= 0 || v1 - v0 < minLen) continue;
    const start = P2.length / N3;
    let count = 0;
    for (let r = 0; r < rings; r++) {
      const t = uv.getY(r * (seg + 1));
      if (t < v0 || t > v1) continue;
      if (r % 2 === 1 && r < rings - 1) continue; // 筋は輪を1つおきに拾う（ほぼまっすぐなので形は変わらず、三角形が半分）
      const s = (t - v0) / Math.max(v1 - v0, Number.EPSILON);
      const along = s < peak ? s / Math.max(peak, Number.EPSILON) : (1 - s) / Math.max(1 - peak, Number.EPSILON);
      const f = u0 * seg;
      const j0 = Math.min(seg - 1, Math.max(0, Math.floor(f)));
      const w = f - j0;
      at(r, j0, a, na);
      at(r, j0 + 1, b, nb);
      side.copy(b).sub(a).normalize();
      const c = a.clone().lerp(b, w);
      const n = na.lerp(nb, w).normalize().multiplyScalar(out);
      c.addScaledVector(n, lift);
      const half = width * HALF * Math.sin(Math.min(1, along) * HALF * Math.PI);
      P2.push(c.x - side.x * half, c.y - side.y * half, c.z - side.z * half, c.x + side.x * half, c.y + side.y * half, c.z + side.z * half);
      N2.push(n.x, n.y, n.z, n.x, n.y, n.z);
      UV2.push(0, t, 1, t);
      if (count > 0) {
        const q = start + (count - 1) * 2;
        I2.push(q, q + 2, q + 1, q + 1, q + 2, q + N3);
      }
      count++;
    }
  }
  if (I2.length === 0) return null;
  const lg = new BufferGeometry();
  lg.setAttribute('position', new BufferAttribute(new Float32Array(P2), N3));
  lg.setAttribute('normal', new BufferAttribute(new Float32Array(N2), N3));
  lg.setAttribute('uv', new BufferAttribute(new Float32Array(UV2), 2));
  lg.setIndex(I2);
  return lg;
}

/**
 * 布のしわ（V5）：管（loft）の面の上で、場所を uv（u＝周り 0〜1、v＝道のり 0〜1）で指定して、面を法線の向きへ押し込む（谷）／盛り上げる（山）。
 * folds＝[[u, 幅(u), 深さ(m。正＝谷、負＝山), v0, v1, 一番深い所(0〜1。省くと真ん中)], …]。部品の foldLine＝谷の芯の筋の濃さ（0〜）
 * 谷は細い V 字、山はなだらか。谷を暗く・山を明るく塗る（ao）。周りの向き u は継ぎ目をまたいでよい。
 */
function foldGeometry(g, folds, lineRatio = 0) {
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  if (!uv) return;
  const ao = g.attributes.ao ? g.attributes.ao.array : new Float32Array(pos.count);
  let maxDepth = Number.EPSILON;
  for (const f of folds) maxDepth = Math.max(maxDepth, Math.abs(f[2]));
  const out = outwardSign(g);
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i);
    const t = uv.getY(i);
    let d = 0;
    let shade = 0; // 塗り：谷の暗い帯は形のくぼみより広く取る（細い谷は1頂点しか沈まず、色が見えないため）
    for (const [u0, w, depth, v0, v1, peak = HALF] of folds) {
      if (t < v0 || t > v1) continue;
      let du = Math.abs(u - u0);
      du = Math.min(du, 1 - du);
      if (du >= w) continue;
      const k = 1 - du / w;
      const across = depth > 0 ? k * k : k * k * (N3 - 2 * k);
      const s = (t - v0) / Math.max(v1 - v0, Number.EPSILON);
      const a = s < peak ? s / Math.max(peak, Number.EPSILON) : (1 - s) / Math.max(1 - peak, Number.EPSILON);
      const along = Math.sin(Math.min(1, a) * HALF * Math.PI);
      d += depth * across * along;
      // 谷：広く淡い陰と、芯の細く濃い筋（墨の線のように見せる。lineRatio＝筋の濃さ）
      shade += depth * (depth > 0 ? k + lineRatio * Math.max(0, (k - FOLD_LINE_FROM) / (1 - FOLD_LINE_FROM)) : across) * along;
    }
    if (d === 0) continue;
    const push = d * out;
    pos.setXYZ(i, pos.getX(i) - nor.getX(i) * push, pos.getY(i) - nor.getY(i) * push, pos.getZ(i) - nor.getZ(i) * push);
    ao[i] -= shade / maxDepth;
  }
  g.setAttribute('ao', new BufferAttribute(ao, 1));
  g.computeVertexNormals();
}

/** 反り（鳥居の笠木）：両端ほど上へ持ち上げる。 */
function bendGeometry(g, bendY, halfLen) {
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const k = pos.getX(i) / halfLen;
    pos.setY(i, pos.getY(i) + bendY * k * k);
  }
  g.computeVertexNormals();
}

/**
 * 鑿（のみ）で割ったような平らな面を付ける（岩）：でたらめな向きの平面で、はみ出した頂点を面の上へ押し戻す。
 * chisel=[面の数, 削る深さ（半径に対する比の上限）, 種]。面と面の境が稜になり、後処理の「内側の線」が乗る。
 */
function chiselGeometry(g, chisel) {
  const [count, depth, seed] = chisel;
  const rng = createRng(seed);
  g.computeBoundingBox();
  const bb = g.boundingBox;
  const c = bb.getCenter(new Vector3());
  const half = bb.getSize(new Vector3()).multiplyScalar(HALF);
  const pos = g.attributes.position;
  const n = new Vector3();
  const v = new Vector3();
  for (let k = 0; k < count; k++) {
    n.set(rng.range(-1, 1), rng.range(-HALF, 1), rng.range(-1, 1)).normalize();
    // その向きでの岩の「半径」から、少し内側に平面を置く
    const reach = Math.hypot(n.x * half.x, n.y * half.y, n.z * half.z);
    const d = reach * (1 - depth * rng.range(HALF * HALF, 1));
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).sub(c);
      const over = v.dot(n) - d;
      if (over > 0) {
        v.addScaledVector(n, -over).add(c);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
    }
  }
  g.computeVertexNormals();
}

/** ノイズで頂点を法線方向へ出し入れする（岩・古い石の凹凸）。 */
function jitterGeometry(g, amount, freq, seed, oct) {
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const v = new Vector3();
  const n = new Vector3();
  const ao = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    // 尾根のように尖らせる（丸い山ではなく、割れた岩の稜）
    const f = fbm3(v.x * freq + seed, v.y * freq + seed * 2, v.z * freq - seed, oct);
    const k = 1 - Math.abs(f - HALF) * N4 - HALF;
    const d = k * amount;
    pos.setXYZ(i, v.x + n.x * d, v.y + n.y * d, v.z + n.z * d);
    ao[i] = k;
  }
  // 出っ張りは明るく、くぼみは暗く塗るための値（−0.5〜0.5）
  g.setAttribute('ao', new BufferAttribute(ao, 1));
}

/**
 * 部品の表をためて、最後に1つのジオメトリにする。
 * @param {{models?:Record<string, any>, palette?:Record<string, any>, aoGain?:number, segMul?:number, faceOf?:(name:string)=>any, boneIndex?:(name:string)=>number}} [lib] ref で引く部品の表と、色の名前の表
 */
export function createBuilder(lib = {}) {
  /** @type {number[]} */ const P = [];
  /** @type {number[]} */ const N = [];
  /** @type {number[]} */ const C = [];
  /** @type {number[]} */ const F = [];
  /** @type {number[]} */ const A = [];
  /** @type {number[]} */ const I = [];
  /** 頂点ごとの骨の番号（剛体スキン。lib.boneIndex があるときだけ使う） @type {number[]} */ const B = [];
  /** 顔の絵を貼る頂点（V5）：[頂点の番号, u, v, 濃さ] を並べる。ほかの頂点は 0 @type {number[]} */ const FACE = [];
  const colorCache = new Map();
  const color = (name) => {
    let c = colorCache.get(name);
    if (!c) {
      const named = lib.palette?.[name];
      c = new Color(typeof named === 'string' ? named : name);
      colorCache.set(name, c);
    }
    return c;
  };
  const v = new Vector3();
  const tmpC = new Color();

  /**
   * @param {any} p 部品 @param {Matrix4} parent 親の行列
   * @param {{col?:string, fx?:number[], anim?:number[], bone?:string}} [inherit]
   */
  function add(p, parent = new Matrix4(), inherit = {}) {
    const m = parent.clone().multiply(partMatrix(p));
    const inh = { col: p.col ?? inherit.col, fx: p.fx ?? inherit.fx, anim: p.anim ?? inherit.anim, bone: p.bone ?? inherit.bone };
    if (p.s === 'group' || p.s === 'ref') {
      const parts = p.s === 'ref' ? lib.models?.[p.model]?.parts : p.parts;
      if (!parts) throw new Error(`lookdev: 部品の表が無い ${p.model}`);
      const sub = p.s === 'ref' ? { fx: inh.fx, anim: inh.anim, bone: inh.bone } : inh;
      for (const q of parts) add(q, m, sub);
      return;
    }
    let g = shapeGeometry(p, lib.segMul ?? 1);
    if (p.chisel) chiselGeometry(g, p.chisel);
    if (p.flute) fluteGeometry(g, p.flute);
    if (p.grooves) grooveGeometry(g, p.grooves);
    if (p.folds) foldGeometry(g, p.folds, p.foldLine ?? 0);
    if (p.bendY) bendGeometry(g, p.bendY, p.size[0] * HALF);
    if (p.jitter) {
      jitterGeometry(g, p.jitter, p.jfreq ?? 1, p.seed ?? 1, p.joct ?? N3);
      g.computeVertexNormals();
    }
    if (p.flat) {
      g = g.toNonIndexed();
      g.computeVertexNormals();
    }
    if (p.folds && p.foldInk) {
      const lg = foldInkGeometry(g, p.folds, p.foldInk);
      if (lg) {
        add({ s: 'geom', geom: lg, col: p.foldInkCol ?? 'ink', anim: p.anim, animGrad: p.animGrad, gradUv: true, bone: inh.bone, boneBelow: p.boneBelow }, m, inherit);
        lg.dispose();
      }
    }
    g.computeBoundingBox();
    const bb = g.boundingBox;
    const spanY = Math.max(bb.max.y - bb.min.y, Number.EPSILON);
    const c0 = color(inh.col ?? 'paperWhite');
    const c1 = p.col2 ? color(p.col2) : c0;
    const fx = inh.fx ?? ZERO4;
    const fx2 = p.fx2 ?? null; // 下端 fx → 上端 fx2 へ変える（塗りのはげ・苔を高さで変える）
    const anim = inh.anim ?? ZERO4;
    const animGrad = p.animGrad ?? null; // 帯や草：道のりに沿って重みを 0→1 にする
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    const uv = g.attributes.uv;
    const aoAttr = g.attributes.ao;
    const aoGain = p.ao ?? lib.aoGain ?? 0;
    const base = P.length / N3;
    const face = p.face ? lib.faceOf?.(p.face) ?? null : null;
    const boneId = lib.boneIndex ? lib.boneIndex(inh.bone ?? 'root') : 0;
    // 骨の鎖（鉢巻の尾など）：帯の道のり（uv の v）で等分して順に付ける
    // 高さで骨を分ける（羽織の裾など）：部品の座標で y より下の頂点は別の骨
    const below = lib.boneIndex && p.boneBelow ? { y: p.boneBelow[0], id: lib.boneIndex(p.boneBelow[1]) } : null;
    const chain = lib.boneIndex && p.boneChain ? p.boneChain.map((name) => /** @type {(n:string)=>number} */ (lib.boneIndex)(name)) : null;
    const normalM = m.clone().invert().transpose();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const ty = (v.y - bb.min.y) / spanY;
      const localY = v.y;
      if (face) {
        // 顔の絵：部品の座標で正面から平らに写す。前を向いた面だけ
        const fu = (v.x - face.rect.x[0]) / (face.rect.x[1] - face.rect.x[0]);
        const fv = (v.y - face.rect.y[0]) / (face.rect.y[1] - face.rect.y[0]);
        // 面の向きの符号は部品の作り方で変わるので、前後は位置（zMin より前）で決め、濃さは面の傾きで決める
        const front = v.z > face.rect.zMin ? Math.min(1, Math.max(0, Math.abs(nor.getZ(i)) * N4 - HALF)) : 0;
        // 絵を貼らない頂点にも同じ座標を持たせる（濃さ0）。座標が途中で飛ぶと、境目に絵が細く縮んで写る
        const inside = fu >= 0 && fu <= 1 && fv >= 0 && fv <= 1;
        FACE.push(base + i, face.u0 + Math.min(1, Math.max(0, fu)) * face.size, face.v0 + Math.min(1, Math.max(0, fv)) * face.size, inside ? front : 0);
      }
      v.applyMatrix4(m);
      P.push(v.x, v.y, v.z);
      v.fromBufferAttribute(nor, i).transformDirection(normalM);
      N.push(v.x, v.y, v.z);
      const tc = p.gradUv && uv ? uv.getY(i) : ty;
      tmpC.copy(c0).lerp(c1, tc);
      if (aoAttr) tmpC.multiplyScalar(1 + aoAttr.getX(i) * aoGain);
      C.push(tmpC.r, tmpC.g, tmpC.b);
      if (fx2) F.push(fx[0] + (fx2[0] - fx[0]) * ty, fx[1] + (fx2[1] - fx[1]) * ty, fx[2] + (fx2[2] - fx[2]) * ty, fx[N3] + (fx2[N3] - fx[N3]) * ty);
      else F.push(fx[0], fx[1], fx[2], fx[N3]);
      const w = animGrad && uv ? animGrad[0] + (animGrad[1] - animGrad[0]) * (p.s === 'tube' ? uv.getX(i) : uv.getY(i)) : anim[1];
      A.push(anim[0], w, anim[2] ?? 0, anim[N3] ?? 0);
      if (below && localY < below.y) B.push(below.id);
      else B.push(chain && uv ? chain[Math.min(chain.length - 1, Math.floor(uv.getY(i) * chain.length))] : boneId);
    }
    const idx = g.index;
    if (idx) for (let i = 0; i < idx.count; i++) I.push(base + idx.getX(i));
    else for (let i = 0; i < pos.count; i++) I.push(base + i);
    g.dispose();
  }

  return {
    add,
    /** 部品の表をまとめて足す。 */
    addAll(parts, parent, inherit) {
      for (const p of parts) add(p, parent, inherit);
    },
    /** 生の三角形を足す（地形・草・葉など、描画側で計算した形）。 */
    raw: { P, N, C, F, A, I },
    color,
    get vertexCount() {
      return P.length / N3;
    },
    toGeometry() {
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(new Float32Array(P), N3));
      g.setAttribute('normal', new BufferAttribute(new Float32Array(N), N3));
      g.setAttribute('color', new BufferAttribute(new Float32Array(C), N3));
      g.setAttribute('aFx', new BufferAttribute(new Float32Array(F), N4));
      g.setAttribute('aAnim', new BufferAttribute(new Float32Array(A), N4));
      const fa = new Float32Array(P.length);
      for (let i = 0; i < FACE.length; i += N4) fa.set([FACE[i + 1], FACE[i + 2], FACE[i + N3]], FACE[i] * N3);
      g.setAttribute('aFace', new BufferAttribute(fa, N3));
      if (lib.boneIndex) {
        // 剛体スキン（07 §6.1）：骨は1頂点に1本、重みは (1,0,0,0)
        const si = new Uint16Array(B.length * N4);
        const sw = new Float32Array(B.length * N4);
        for (let i = 0; i < B.length; i++) {
          si[i * N4] = B[i];
          sw[i * N4] = 1;
        }
        g.setAttribute('skinIndex', new BufferAttribute(si, N4));
        g.setAttribute('skinWeight', new BufferAttribute(sw, N4));
      }
      g.setIndex(I);
      g.computeBoundingSphere();
      return g;
    },
  };
}
