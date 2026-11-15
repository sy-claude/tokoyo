// 形の記述（src/data/lookdev/models.js の部品の表）→ 1つにまとめたジオメトリ。
// 部品：box・cyl・sph・lathe・tube・ribbon・fan・group・ref。色は THREE.Color を通す（不変条件10）。
// 頂点の属性：position・normal・color・aFx（苔, 塗りのはげ, 石畳, 発光）・aAnim（動きの種類, 重み）。
import {
  BoxGeometry, BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, CylinderGeometry, Euler, LatheGeometry,
  Matrix4, Quaternion, SphereGeometry, TubeGeometry, Vector2, Vector3,
} from 'three';
import { DEG2RAD } from '../../core/math.js';
import { fbm3 } from '../../core/noise.js';
import { HALF, N3, N4, SEG_DEFAULT } from './consts.js';

const ZERO4 = [0, 0, 0, 0];
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

/** 部品1つ → three のジオメトリ（局所座標）。 */
function shapeGeometry(p) {
  switch (p.s) {
    case 'box': {
      const g = new BoxGeometry(p.size[0], p.size[1], p.size[2], p.segs?.[0] ?? 1, p.segs?.[1] ?? 1, p.segs?.[2] ?? 1);
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
    case 'ribbon':
      return ribbonGeometry(p);
    case 'fan':
      return fanGeometry(p);
    default:
      throw new Error(`lookdev: 知らない部品 ${p.s}`);
  }
}

/** ノイズで頂点を法線方向へ出し入れする（岩・古い石の凹凸）。 */
function jitterGeometry(g, amount, freq, seed, oct) {
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const v = new Vector3();
  const n = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    // 尾根のように尖らせる（丸い山ではなく、割れた岩の稜）
    const f = fbm3(v.x * freq + seed, v.y * freq + seed * 2, v.z * freq - seed, oct);
    const d = (1 - Math.abs(f - HALF) * N4 - HALF) * amount;
    pos.setXYZ(i, v.x + n.x * d, v.y + n.y * d, v.z + n.z * d);
  }
}

/**
 * 部品の表をためて、最後に1つのジオメトリにする。
 * @param {{models?:Record<string, any>, palette?:Record<string, any>}} [lib] ref で引く部品の表と、色の名前の表
 */
export function createBuilder(lib = {}) {
  /** @type {number[]} */ const P = [];
  /** @type {number[]} */ const N = [];
  /** @type {number[]} */ const C = [];
  /** @type {number[]} */ const F = [];
  /** @type {number[]} */ const A = [];
  /** @type {number[]} */ const I = [];
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
   * @param {{col?:string, fx?:number[], anim?:number[]}} [inherit]
   */
  function add(p, parent = new Matrix4(), inherit = {}) {
    const m = parent.clone().multiply(partMatrix(p));
    const inh = { col: p.col ?? inherit.col, fx: p.fx ?? inherit.fx, anim: p.anim ?? inherit.anim };
    if (p.s === 'group' || p.s === 'ref') {
      const parts = p.s === 'ref' ? lib.models?.[p.model]?.parts : p.parts;
      if (!parts) throw new Error(`lookdev: 部品の表が無い ${p.model}`);
      const sub = p.s === 'ref' ? { fx: inh.fx, anim: inh.anim } : inh;
      for (const q of parts) add(q, m, sub);
      return;
    }
    let g = shapeGeometry(p);
    if (p.jitter) {
      jitterGeometry(g, p.jitter, p.jfreq ?? 1, p.seed ?? 1, p.joct ?? N3);
      g.computeVertexNormals();
    }
    if (p.flat) {
      g = g.toNonIndexed();
      g.computeVertexNormals();
    }
    g.computeBoundingBox();
    const bb = g.boundingBox;
    const spanY = Math.max(bb.max.y - bb.min.y, Number.EPSILON);
    const c0 = color(inh.col ?? 'paperWhite');
    const c1 = p.col2 ? color(p.col2) : c0;
    const fx = inh.fx ?? ZERO4;
    const anim = inh.anim ?? ZERO4;
    const animGrad = p.animGrad ?? null; // 帯や草：道のりに沿って重みを 0→1 にする
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    const uv = g.attributes.uv;
    const base = P.length / N3;
    const normalM = m.clone().invert().transpose();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const ty = (v.y - bb.min.y) / spanY;
      v.applyMatrix4(m);
      P.push(v.x, v.y, v.z);
      v.fromBufferAttribute(nor, i).transformDirection(normalM);
      N.push(v.x, v.y, v.z);
      const tc = p.gradUv && uv ? uv.getY(i) : ty;
      tmpC.copy(c0).lerp(c1, tc);
      C.push(tmpC.r, tmpC.g, tmpC.b);
      F.push(fx[0], fx[1], fx[2], fx[N3]);
      const w = animGrad && uv ? animGrad[0] + (animGrad[1] - animGrad[0]) * (p.s === 'tube' ? uv.getX(i) : uv.getY(i)) : anim[1];
      A.push(anim[0], w, anim[2] ?? 0, anim[N3] ?? 0);
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
      g.setIndex(I);
      g.computeBoundingSphere();
      return g;
    },
  };
}
