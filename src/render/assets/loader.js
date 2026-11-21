// 外部素材（GLB）の読み込み（docs/11 §1・§5、09 §13）。
// 読めない・形が1つでない・色の画像が無いときは null を返す。呼ぶ側はコードの仮の見た目のまま（警告は ID ごとに1回）。
// 形は「向き → 身長 → 足元を y=0・中心を xz=0」に直し、塗りの材質（lookdev/shadersWash）が読む属性を足して返す。
import { Float32BufferAttribute, SRGBColorSpace } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DEG2RAD } from '../../core/math.js';
import { HALF, N3, N4 } from '../lookdev/consts.js';
import { autoSkin, rigBoneDefs } from './autoSkin.js';

/** @type {Set<string>} */
const warned = new Set();

/** @param {string} id @param {string} why */
function warnOnce(id, why) {
  if (warned.has(id)) return;
  warned.add(id);
  console.warn(`素材 ${id}：${why}。コードの見た目で表示します`);
}

/**
 * @param {import('../../data/assets.js').AssetDef} def
 * @param {string} baseUrl import.meta.env.BASE_URL
 * @param {{softRatio:number, behindMul:number, minWeightRatio:number}} [skin] 目録に骨（rig）があるときの重みの付け方（autoSkin）
 * @returns {Promise<{geometry:any, map:any, boneDefs:ReturnType<typeof rigBoneDefs>|null}|null>}
 */
export async function loadModelAsset(def, baseUrl, skin) {
  /** @type {any} */
  let gltf;
  try {
    gltf = await new GLTFLoader().loadAsync(baseUrl + def.url);
  } catch {
    warnOnce(def.id, `読めない（${def.url}）`);
    return null;
  }
  /** @type {any[]} */
  const meshes = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((/** @type {any} */ o) => {
    if (o.isMesh) meshes.push(o);
  });
  const src = meshes[0];
  const map = src?.material?.map ?? null;
  if (meshes.length !== 1 || !map) {
    warnOnce(def.id, meshes.length !== 1 ? `形が${meshes.length}個（1体＝1メッシュ）` : '色の画像が無い');
    for (const m of meshes) {
      m.geometry.dispose();
      m.material.map?.dispose();
      m.material.dispose();
    }
    return null;
  }
  const g = src.geometry.clone();
  g.applyMatrix4(src.matrixWorld);
  src.geometry.dispose();
  src.material.dispose();
  if (!g.attributes.normal) g.computeVertexNormals();
  if (def.yawDeg) g.rotateY(def.yawDeg * DEG2RAD);
  g.computeBoundingBox();
  const b = g.boundingBox;
  g.translate(-(b.min.x + b.max.x) * HALF, -b.min.y, -(b.min.z + b.max.z) * HALF);
  const s = def.heightM ? def.heightM / Math.max(b.max.y - b.min.y, Number.EPSILON) : 1;
  g.scale(s, s, s);
  g.translate(0, def.footOffsetM ?? 0, 0);
  // 塗りの材質が読む属性：頂点色は白（色は画像から）、効果・動き・顔の絵は無し
  const n = g.attributes.position.count;
  g.setAttribute('color', new Float32BufferAttribute(new Float32Array(n * N3).fill(1), N3));
  g.setAttribute('aFx', new Float32BufferAttribute(new Float32Array(n * N4), N4));
  g.setAttribute('aAnim', new Float32BufferAttribute(new Float32Array(n * N4), N4));
  g.setAttribute('aFace', new Float32BufferAttribute(new Float32Array(n * N3), N3));
  g.computeBoundingSphere();
  map.colorSpace = SRGBColorSpace;
  if (def.rig && skin) {
    autoSkin(g, def.rig, skin);
    return { geometry: g, map, boneDefs: rigBoneDefs(def.rig) };
  }
  return { geometry: g, map, boneDefs: null };
}
