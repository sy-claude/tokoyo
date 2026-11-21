// 外部の3Dモデル（GLB）の読み込み（11_assets・U8。three 同梱の GLTFLoader を使い、npm の依存は足さない）。
// Blender で作って色の絵・凹凸の絵を焼いたモデルを、塗りの材質で描ける形（頂点の属性をそろえた1つの形）にする。
import { BufferAttribute, SRGBColorSpace } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { N3, N4 } from './consts.js';

/**
 * @param {string} url
 * @param {number[]} [fx] 頂点の効果 [苔, 塗りのはげ, 石, 発光]（石は割れ目の墨線と縁の光が乗り、木目の線は乗らない）
 * @returns {Promise<{geometry:any, map:any, normalMap:any}>}
 */
export async function loadGlbModel(url, fx = [0, 0, 0, 0]) {
  const gltf = await new GLTFLoader().loadAsync(url);
  gltf.scene.updateMatrixWorld(true);
  /** @type {any[]} */
  const geos = [];
  /** @type {any} */
  let map = null;
  /** @type {any} */
  let normalMap = null;
  gltf.scene.traverse((o) => {
    if (!(/** @type {any} */ (o).isMesh)) return;
    const mesh = /** @type {any} */ (o);
    const g = mesh.geometry.clone();
    g.applyMatrix4(mesh.matrixWorld);
    geos.push(g);
    map ??= mesh.material.map;
    normalMap ??= mesh.material.normalMap;
  });
  const geometry = geos.length === 1 ? geos[0] : mergeGeometries(geos);
  // 凹凸の絵の向き（接線）が無ければ計算する（Blender の書き出しで入らないことがある）
  if (!geometry.attributes.tangent && geometry.index && geometry.attributes.uv) geometry.computeTangents();
  // 塗りの材質が読む頂点の属性をそろえる：色は白（色は絵から）、効果・動き・顔の絵は無し
  const n = geometry.attributes.position.count;
  const glowAttr = geometry.attributes.color; // 白で上書きする前に読む
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(n * N3).fill(1), N3));
  const F = new Float32Array(n * N4);
  for (let i = 0; i < n; i++) F.set(fx, i * N4);
  // 頂点の色（Blender の set_glow）の R＝光る部位：発光（aFx の4番目）を fx[3] の強さで
  if (glowAttr) for (let i = 0; i < n; i++) F[i * N4 + N3] = glowAttr.getX(i) * fx[N3];
  geometry.setAttribute('aFx', new BufferAttribute(F, N4));
  geometry.setAttribute('aAnim', new BufferAttribute(new Float32Array(n * N4), N4));
  geometry.setAttribute('aFace', new BufferAttribute(new Float32Array(n * N3), N3));
  if (map) map.colorSpace = SRGBColorSpace;
  return { geometry, map, normalMap };
}
