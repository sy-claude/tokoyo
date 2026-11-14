// 剛体スキンの組み立て（07 6.1、09 8.2）。RigDef → 骨・1つに統合したジオメトリ・本体と輪郭の SkinnedMesh。
// 1体＝本体1＋輪郭1（武器持ちは＋武器1＋武器の輪郭1）。全頂点が骨1本だけに付く（skinWeight＝(1,0,0,0)）。
/** @import {RigDef, RigPartDef, BoneDef} from '../../data/types.js' */
/** @import {Cfg} from '../../config/index.js' */
import {
  Bone, BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Euler, Float32BufferAttribute, Group, LatheGeometry,
  Matrix4, Skeleton, SkinnedMesh, Sphere, SphereGeometry, Uint16BufferAttribute, Vector2, Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DEG2RAD } from '../../core/math.js';
import { extrudeShapes } from '../../data/rigs/shapes.js';
import { faceCellUv } from './face.js';

const XYZ = 3; // num-ok: 位置・法線・色の要素数
const QUAD = 4; // num-ok: skinIndex・skinWeight の要素数。放物線 4t(1−t) の係数にも使う
const TAU = Math.PI * 2;
/** 部品の rotDeg を回す順（Z ひねり → X 傾け → Y 向き。data/types.js の RigPartDef） */
const PART_EULER = 'YXZ';

/** 三角形の列（位置だけ）から、面ごとの法線を持つジオメトリを作る。 @param {number[]} positions */
function trisGeometry(positions) {
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, XYZ));
  geo.computeVertexNormals();
  return geo;
}

/**
 * 三角形を1枚足す。法線が out の向き（内積が正）になるよう、必要なら裏返す。
 * @param {number[]} positions @param {Vector3} a @param {Vector3} b @param {Vector3} c @param {Vector3} out
 */
function pushTri(positions, a, b, c, out) {
  const n = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
  const [p, q] = n.dot(out) >= 0 ? [b, c] : [c, b];
  positions.push(a.x, a.y, a.z, p.x, p.y, p.z, q.x, q.y, q.z);
}

/** 回転体のふた（円板）。頂点は LatheGeometry の輪と同じ位置。 @param {number} r @param {number} y @param {number} seg @param {boolean} up */
function diskGeometry(r, y, seg, up) {
  const positions = [];
  const c = new Vector3(0, y, 0);
  const out = new Vector3(0, up ? 1 : -1, 0);
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * TAU;
    const a1 = ((i + 1) / seg) * TAU;
    pushTri(positions, c, new Vector3(r * Math.sin(a0), y, r * Math.cos(a0)), new Vector3(r * Math.sin(a1), y, r * Math.cos(a1)), out);
  }
  return trisGeometry(positions);
}

/** lathe：[半径,高さ] の列を Y 軸のまわりに回す。両端は円板でふさぐ。 @param {number[][]} pts @param {number} seg */
function latheGeometry(pts, seg) {
  const asc = pts[0][1] <= pts[pts.length - 1][1] ? pts : [...pts].reverse();
  const side = new LatheGeometry(asc.map(([r, y]) => new Vector2(r, y)), seg).toNonIndexed();
  side.deleteAttribute('uv');
  const out = [side];
  const [r0, y0] = asc[0];
  const [r1, y1] = asc[asc.length - 1];
  if (r0 > 0) out.push(diskGeometry(r0, y0, seg, false));
  if (r1 > 0) out.push(diskGeometry(r1, y1, seg, true));
  return mergeGeometries(out, false);
}

/**
 * extrude：断面（data/rigs/shapes.js）を関節から −Y へ押し出す。先端へ細り、反りで曲がる。
 * @param {(number|string|number[])[]} dims [形名, 長さ, 先端の細り倍率, 幅, 反り]
 */
function extrudeGeometry(dims) {
  const sh = extrudeShapes[String(dims[0])];
  const lenM = Number(dims[1]);
  const tipMul = Number(dims[2]);
  const widthM = dims.length > XYZ ? Number(dims[XYZ]) : sh.widthM;
  const bendM = dims.length > QUAD ? Number(dims[QUAD]) : 0;
  const thickM = widthM * sh.thickRatio;
  const n = sh.segCount;
  const m = sh.section.length;
  // 断面の巻き（符号つき面積）。辺の外向きを決めるのに使う
  let area = 0;
  for (let j = 0; j < m; j++) {
    const [x0, z0] = sh.section[j];
    const [x1, z1] = sh.section[(j + 1) % m];
    area += x0 * z1 - x1 * z0;
  }
  const wind = area >= 0 ? 1 : -1;
  /** 断面の [x, z]（割合）→ 輪 t の上の点 */
  const at = (sx, sz, t) => {
    const s = 1 - (1 - tipMul) * t ** sh.taperPowRatio;
    const off = sh.bendMode === 'chord' ? QUAD * bendM * t * (1 - t) : QUAD * bendM * t * t;
    return new Vector3(
      (sh.anchorXRatio + (sx - sh.anchorXRatio) * s) * widthM + (sh.bendAxis === 'x' ? off : 0),
      -lenM * t,
      sz * s * thickM + (sh.bendAxis === 'z' ? off : 0),
    );
  };
  /** @type {Vector3[][]} */
  const rings = [];
  for (let i = 0; i <= n; i++) rings.push(sh.section.map(([sx, sz]) => at(sx, sz, i / n)));
  const positions = [];
  const out = new Vector3();
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const k = (j + 1) % m;
      // 辺 j→k の外向き：断面の中で、辺の向きを右へ90°回した向き（巻きが逆なら反対）
      out.set((sh.section[k][1] - sh.section[j][1]) * thickM * wind, 0, -(sh.section[k][0] - sh.section[j][0]) * widthM * wind);
      pushTri(positions, rings[i][j], rings[i][k], rings[i + 1][k], out);
      pushTri(positions, rings[i][j], rings[i + 1][k], rings[i + 1][j], out);
    }
  }
  // 両端のふた
  for (const [i, dir] of [[0, 1], [n, -1]]) {
    out.set(0, dir, 0);
    const c = at(sh.capCenter[0], sh.capCenter[1], i / n);
    for (let j = 0; j < m; j++) pushTri(positions, c, rings[i][j], rings[i][(j + 1) % m], out);
  }
  return trisGeometry(positions);
}

/**
 * sphere・cap の伸び（sx,sy,sz）。rotDeg で回した後、骨の座標の軸に沿って掛ける（頭の縦の伸びを、向きを変えた球冠にも同じに掛けるため）。
 * @param {RigPartDef} part @returns {[number, number, number]}
 */
export function partStretch(part) {
  const d = /** @type {number[]} */ (part.dims);
  if (part.shape === 'sphere') return [d[1], d[2], d[XYZ]];
  if (part.shape === 'cap' && d.length > 2) return [d[2], d[XYZ], d[QUAD]];
  return [1, 1, 1];
}

/**
 * 部品の形（原点＝骨の関節。sphere・cap の伸びは掛ける前）。位置と法線だけを持つ、索引なしのジオメトリを返す。
 * 顔（cap）は userData.faceUv に、セルの中の位置（u,v は 0〜1）を頂点ごとに持つ。
 * @param {RigPartDef} part @param {Cfg['anim']} an
 */
export function partGeometry(part, an) {
  const d = /** @type {number[]} */ (part.dims);
  const seg = an.rigPartSegs[part.name] ?? an.rigSegCount;
  /** @type {any} */
  let geo;
  switch (part.shape) {
    case 'cyl':
      geo = new CylinderGeometry(d[0], d[1], d[2], seg).translate(0, -d[2] / 2, 0);
      break;
    case 'cone':
      geo = new ConeGeometry(d[0], d[1], seg).translate(0, -d[1] / 2, 0);
      break;
    case 'box':
      geo = new BoxGeometry(d[0], d[1], d[2]);
      break;
    case 'sphere':
      geo = new SphereGeometry(d[0], seg, an.rigSphereRingCount);
      break;
    case 'cap': {
      const open = d[1] * DEG2RAD;
      geo = new SphereGeometry(d[0], seg, an.rigSphereRingCount, 0, TAU, 0, open).rotateX(Math.PI / 2).toNonIndexed();
      const pos = geo.getAttribute('position');
      const span = 2 * d[0] * Math.sin(Math.min(open, Math.PI / 2));
      const faceUv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        faceUv[i * 2] = pos.getX(i) / span + 1 / 2;
        faceUv[i * 2 + 1] = pos.getY(i) / span + 1 / 2;
      }
      geo.userData.faceUv = faceUv;
      break;
    }
    case 'lathe':
      geo = latheGeometry(/** @type {number[][]} */ (part.dims), seg);
      break;
    case 'extrude':
      geo = extrudeGeometry(part.dims);
      break;
    default:
      throw new Error(`部品 ${part.name}：形 ${part.shape} はまだ作っていません（使うキャラを作るMで足す）`);
  }
  const faceUv = geo.userData.faceUv;
  if (geo.index) geo = geo.toNonIndexed();
  geo.deleteAttribute('uv');
  geo.userData.faceUv = faceUv;
  return geo;
}

/** 色：palette のキーまたは16進 → THREE.Color（線形）。 @param {string} color @param {Cfg['palette']} palette */
function partColor(color, palette) {
  return new Color(color.startsWith('#') ? color : palette[color]);
}

/**
 * 同じ位置（eps 以内）の頂点の法線を平均する（07 4章の aOutlineNormal。部品ごと）。
 * @param {any} geo @param {number} eps @returns {Float32Array}
 */
export function averagedNormals(geo, eps) {
  const pos = geo.getAttribute('position');
  const nor = geo.getAttribute('normal');
  /** @type {Map<string, number[]>} */
  const sums = new Map();
  const keys = [];
  for (let i = 0; i < pos.count; i++) {
    const key = `${Math.round(pos.getX(i) / eps)},${Math.round(pos.getY(i) / eps)},${Math.round(pos.getZ(i) / eps)}`;
    keys.push(key);
    const s = sums.get(key) ?? [0, 0, 0];
    s[0] += nor.getX(i);
    s[1] += nor.getY(i);
    s[2] += nor.getZ(i);
    sums.set(key, s);
  }
  const out = new Float32Array(pos.count * XYZ);
  for (let i = 0; i < pos.count; i++) {
    const s = /** @type {number[]} */ (sums.get(keys[i]));
    let len = Math.hypot(s[0], s[1], s[2]);
    let n = s;
    if (len < eps) {
      // 向かい合う面が打ち消し合ったら、その頂点の法線をそのまま使う
      n = [nor.getX(i), nor.getY(i), nor.getZ(i)];
      len = Math.hypot(n[0], n[1], n[2]) || 1;
    }
    out[i * XYZ] = n[0] / len;
    out[i * XYZ + 1] = n[1] / len;
    out[i * XYZ + 2] = n[2] / len;
  }
  return out;
}

/**
 * 骨を作ってバインド姿勢（全関節0°）に置く。
 * @param {BoneDef[]} defs @param {number} scaleMul
 * @returns {{bones:any[], index:Record<string, number>}}
 */
function makeBones(defs, scaleMul) {
  /** @type {any[]} */
  const bones = [];
  /** @type {Record<string, number>} */
  const index = {};
  defs.forEach((def, i) => {
    const bone = new Bone();
    bone.name = def.name;
    bone.position.set(def.posM[0] * scaleMul, def.posM[1] * scaleMul, def.posM[2] * scaleMul);
    if (def.parent !== null) bones[index[def.parent]].add(bone);
    bones.push(bone);
    index[def.name] = i;
  });
  return { bones, index };
}

/**
 * 部品を1つのジオメトリに統合する（09 8.2 の手順 2〜4 の前半）。骨の世界行列は更新済みであること。
 * @param {RigPartDef[]} parts @param {any[]} bones @param {Record<string, number>} index @param {number} scaleMul @param {Cfg} cfg
 */
function mergeParts(parts, bones, index, scaleMul, cfg) {
  const euler = new Euler();
  const m = new Matrix4();
  const stretch = new Matrix4();
  const geos = parts.map((part) => {
    const geo = partGeometry(part, cfg.anim);
    // 回す → 伸ばす（sphere・cap）→ 置く → 骨のバインド時の世界行列
    euler.set(part.rotDeg[0] * DEG2RAD, part.rotDeg[1] * DEG2RAD, part.rotDeg[2] * DEG2RAD, PART_EULER);
    const [sx, sy, sz] = partStretch(part);
    m.makeRotationFromEuler(euler).premultiply(stretch.makeScale(sx * scaleMul, sy * scaleMul, sz * scaleMul));
    m.setPosition(part.offsetM[0] * scaleMul, part.offsetM[1] * scaleMul, part.offsetM[2] * scaleMul);
    const boneIdx = index[part.bone];
    geo.applyMatrix4(m.premultiply(bones[boneIdx].matrixWorld));
    const count = geo.getAttribute('position').count;
    const skinIndex = new Uint16Array(count * QUAD);
    const skinWeight = new Float32Array(count * QUAD);
    const color = new Float32Array(count * XYZ);
    const faceUv = new Float32Array(count * 2).fill(-1);
    const c = partColor(part.color, cfg.palette);
    for (let i = 0; i < count; i++) {
      skinIndex[i * QUAD] = boneIdx;
      skinWeight[i * QUAD] = 1;
      color[i * XYZ] = c.r;
      color[i * XYZ + 1] = c.g;
      color[i * XYZ + 2] = c.b;
      if (part.faceCell !== undefined && geo.userData.faceUv) {
        const uv = faceCellUv(part.faceCell, geo.userData.faceUv[i * 2], geo.userData.faceUv[i * 2 + 1], cfg.render);
        faceUv[i * 2] = uv[0];
        faceUv[i * 2 + 1] = uv[1];
      }
    }
    geo.setAttribute('skinIndex', new Uint16BufferAttribute(skinIndex, QUAD));
    geo.setAttribute('skinWeight', new Float32BufferAttribute(skinWeight, QUAD));
    geo.setAttribute('color', new Float32BufferAttribute(color, XYZ));
    geo.setAttribute('aOutlineNormal', new Float32BufferAttribute(averagedNormals(geo, cfg.anim.rigWeldEpsM * scaleMul), XYZ));
    geo.setAttribute('aFaceUv', new Float32BufferAttribute(faceUv, 2));
    geo.userData = {};
    return geo;
  });
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  return merged;
}

/**
 * @typedef {Object} RigRuntime
 * @property {any} group            位置と向きを置く親（Group）
 * @property {any} body             本体の SkinnedMesh
 * @property {any} outline          輪郭の SkinnedMesh（本体と同じジオメトリ・同じ Skeleton）
 * @property {any|null} weapon      武器の SkinnedMesh
 * @property {any|null} weaponOutline
 * @property {any[]} bones          RigDef.bones と同じ順の Bone
 * @property {Record<string, number>} boneIndex  骨の名前 → 番号
 * @property {[number,number,number][]} bindPos   各骨のバインド時の位置（親からの相対）
 * @property {number} drawCalls     描画命令の数（2 または 4）
 * @property {()=>void} dispose
 */

/**
 * @param {RigDef} rig
 * @param {{cfg:Cfg, bodyMaterial:any, outlineMaterial:any}} o  材質は呼ぶ側が作る（1体で1組。武器も同じ材質）
 * @returns {RigRuntime}
 */
export function buildRig(rig, o) {
  const { cfg } = o;
  const s = rig.scaleMul;
  const group = new Group();

  // 1. 骨（バインド姿勢）
  const { bones, index } = makeBones(rig.bones, s);
  const wb = rig.weapon ? makeBones(rig.weapon.bones, s) : null;
  if (rig.weapon && wb) bones[index[rig.weapon.socket]].add(wb.bones[0]);
  bones[0].updateMatrixWorld(true);

  // 2〜4. 部品 → 統合 → 本体
  const geo = mergeParts(rig.parts, bones, index, s, cfg);
  const body = new SkinnedMesh(geo, o.bodyMaterial);
  body.name = 'body';
  body.add(bones[0]);
  body.bind(new Skeleton(bones));

  // 5. 輪郭：同じジオメトリと Skeleton（骨の行列を共有するので、本体とずれない）
  const outline = new SkinnedMesh(geo, o.outlineMaterial);
  outline.name = 'outline';
  outline.bind(body.skeleton, body.bindMatrix);
  group.add(body, outline);

  // 6. 武器：骨は手の骨（socket）の子。メッシュは本体と同じ親に置く
  let weapon = null;
  let weaponOutline = null;
  let weaponGeo = null;
  if (rig.weapon && wb) {
    weaponGeo = mergeParts(rig.weapon.parts, wb.bones, wb.index, s, cfg);
    weapon = new SkinnedMesh(weaponGeo, o.bodyMaterial);
    weapon.name = 'weapon';
    weapon.bind(new Skeleton(wb.bones));
    weaponOutline = new SkinnedMesh(weaponGeo, o.outlineMaterial);
    weaponOutline.name = 'weaponOutline';
    weaponOutline.bind(weapon.skeleton, weapon.bindMatrix);
    group.add(weapon, weaponOutline);
  }

  // 視錐台の判定：ポーズで動いても外れないよう、体の球に武器の長さを足した球を全メッシュで使う
  geo.computeBoundingSphere();
  let reach = 0;
  if (weaponGeo) {
    weaponGeo.computeBoundingSphere();
    reach = weaponGeo.boundingSphere.radius * 2;
  }
  const sphere = new Sphere(geo.boundingSphere.center.clone(), geo.boundingSphere.radius + reach);
  for (const mesh of [body, outline, weapon, weaponOutline]) {
    if (mesh) mesh.boundingSphere = sphere.clone();
  }

  return {
    group,
    body,
    outline,
    weapon,
    weaponOutline,
    bones,
    boneIndex: index,
    bindPos: bones.map((b) => [b.position.x, b.position.y, b.position.z]),
    drawCalls: weapon ? QUAD : 2,
    dispose() {
      geo.dispose();
      weaponGeo?.dispose();
      body.skeleton.dispose();
      weapon?.skeleton.dispose();
    },
  };
}
