// 起動時の焼き込み（V2）：質感テクスチャ2枚と空の絵を、画面いっぱいの板へ描いてテクスチャにする。
import {
  LinearFilter, LinearMipmapLinearFilter, Mesh, OrthographicCamera, PlaneGeometry, RepeatWrapping, Scene, ShaderMaterial,
  ClampToEdgeWrapping, WebGLRenderTarget,
} from 'three';
import { POST_VERT } from './shaders.js';
import { DETAIL_A_FRAG, DETAIL_B_FRAG, SKY_BAKE_FRAG } from './shadersBake.js';

/**
 * 1枚焼く。
 * @param {any} three WebGLRenderer @param {string} frag @param {Record<string, {value:any}>} uniforms
 * @param {number} w @param {number} h @param {{tile:boolean, defines?:Record<string, number>}} o
 */
function bakeOne(three, frag, uniforms, w, h, o) {
  const rt = new WebGLRenderTarget(w, h, {
    depthBuffer: false,
    generateMipmaps: o.tile,
    minFilter: o.tile ? LinearMipmapLinearFilter : LinearFilter,
    magFilter: LinearFilter,
    wrapS: RepeatWrapping,
    wrapT: o.tile ? RepeatWrapping : ClampToEdgeWrapping,
  });
  if (o.tile) rt.texture.anisotropy = Math.min(2 + 2, three.capabilities.getMaxAnisotropy());
  const mat = new ShaderMaterial({ vertexShader: POST_VERT, fragmentShader: frag, uniforms, defines: o.defines ?? {}, depthTest: false, depthWrite: false });
  const geo = new PlaneGeometry(2, 2);
  const quad = new Mesh(geo, mat);
  quad.frustumCulled = false;
  const scene = new Scene();
  scene.add(quad);
  const prev = three.getRenderTarget();
  three.setRenderTarget(rt);
  three.render(scene, new OrthographicCamera(-1, 1, 1, -1, 0, 1));
  three.setRenderTarget(prev);
  mat.dispose();
  geo.dispose();
  return rt;
}

/** 質感テクスチャ2枚（継ぎ目なく並ぶ）。 @param {any} three @param {number} size */
export function bakeDetail(three, size) {
  const a = bakeOne(three, DETAIL_A_FRAG, {}, size, size, { tile: true });
  const b = bakeOne(three, DETAIL_B_FRAG, {}, size, size, { tile: true });
  return { texA: a.texture, texB: b.texture, dispose: () => { a.dispose(); b.dispose(); } };
}

/**
 * 空の絵。
 * @param {any} three @param {Record<string, {value:any}>} uniforms 空の色と夕日の向き
 * @param {number} width 横の画素数（縦は半分） @param {number} octaves 雲の細かさ
 */
export function bakeSky(three, uniforms, width, octaves) {
  const rt = bakeOne(three, SKY_BAKE_FRAG, uniforms, width, Math.round(width / 2), { tile: false, defines: { OCT: octaves } });
  return { tex: rt.texture, dispose: () => rt.dispose() };
}
