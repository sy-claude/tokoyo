// 輪郭（07 4章、09 8.2-5）。同じジオメトリを裏面だけ、平均法線（aOutlineNormal）の向きへ押し出して墨で描く。
// 太さの式：px ＝ uOutlinePx ×（ゆらぎ 0.6〜1.4）×（光と反対の側ほど太い 1〜2）を画面上 1.5〜4px に収める。
//           世界の太さ ＝ px × 視点深度 × uPxPerM（uPxPerM ＝ 2·tan(fovY/2) / 画面の高さpx）。
//           視点深度が outlineNearM より近いときは、その距離での世界の太さを保つ（画面上では上限まで太る）。
// 下の純関数（outlineWidthPx）と頂点シェーダー（OUTLINE_MAIN）は同じ式。変えるときは両方を直す。
/** @import {Cfg} from '../../config/index.js' */
import { BackSide, Color, MeshBasicMaterial, Vector3 } from 'three';
import { DEG2RAD, clamp } from '../../core/math.js';

/**
 * 視点深度 1m で画面の 1px が何 m か（uniform uPxPerM）。
 * @param {number} fovYDeg @param {number} viewHPx 画面の高さ（CSS px）
 */
export function outlinePxPerM(fovYDeg, viewHPx) {
  return (2 * Math.tan((fovYDeg * DEG2RAD) / 2)) / viewHPx;
}

/**
 * 画面上の輪郭の太さ（px）。純関数（M1a-1）。
 * @param {{basePx:number, noise:number, nDotL:number, depthM:number}} p
 *   basePx＝outlineHeroPx など、noise＝0〜1 のゆらぎ、nDotL＝法線と光の内積（視点空間）、depthM＝視点深度
 * @param {Cfg['render']} rc
 */
export function outlineWidthPx(p, rc) {
  const depth = Math.max(p.depthM, Number.EPSILON);
  const raw = p.basePx * (rc.outlineNoiseBaseRatio + rc.outlineNoiseAmpRatio * p.noise) * (1 + rc.outlineLightBoostRatio * (1 - p.nDotL));
  return clamp((raw * Math.max(depth, rc.outlineNearM)) / depth, rc.outlineMinPx, rc.outlineMaxPx);
}

/**
 * 輪郭を押し出す世界の距離（m）。
 * @param {number} px 画面上の太さ @param {number} depthM 視点深度 @param {number} pxPerM outlinePxPerM の値
 */
export function outlineWidthM(px, depthM, pxPerM) {
  return px * depthM * pxPerM;
}

const OUTLINE_PARS = /* glsl */ `
attribute vec3 aOutlineNormal;
uniform float uOutlinePx;
uniform float uPxPerM;
uniform vec3 uOutlineClamp;
uniform vec3 uOutlineNoise;
uniform float uOutlineLight;
uniform vec3 uLightDir;
float tkHash3(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float tkNoise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(tkHash3(i), tkHash3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(tkHash3(i + vec3(0.0, 1.0, 0.0)), tkHash3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(tkHash3(i + vec3(0.0, 0.0, 1.0)), tkHash3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(tkHash3(i + vec3(0.0, 1.0, 1.0)), tkHash3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}
`;

// skinning_vertex の直後に入れる（剛体スキンでは objectNormal が骨で回った後。静的物では aOutlineNormal そのまま）
const OUTLINE_MAIN = /* glsl */ `
#ifndef USE_SKINNING
  vec3 objectNormal = aOutlineNormal;
#endif
{
  vec3 tkN = normalize(objectNormal);
  float tkDepth = max(-(modelViewMatrix * vec4(transformed, 1.0)).z, 0.001);
  vec3 tkNv = normalize(normalMatrix * tkN);
  vec3 tkLv = normalize((viewMatrix * vec4(uLightDir, 0.0)).xyz);
  float tkPx = uOutlinePx * (uOutlineNoise.x + uOutlineNoise.y * tkNoise3(position * uOutlineNoise.z)) * (1.0 + uOutlineLight * (1.0 - dot(tkNv, tkLv)));
  tkPx = clamp(tkPx * max(tkDepth, uOutlineClamp.z) / tkDepth, uOutlineClamp.x, uOutlineClamp.y);
  transformed += tkN * (tkPx * tkDepth * uPxPerM);
}
`;

/**
 * 全部の輪郭材質で同じ関数を使う（three は関数の文字列でプログラムを共有する）。this は材質。
 * @this {any} @param {any} shader
 */
function patchOutline(shader) {
  Object.assign(shader.uniforms, this.userData.uniforms);
  shader.vertexShader =
    OUTLINE_PARS +
    shader.vertexShader
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = aOutlineNormal;')
      .replace('#include <skinning_vertex>', `#include <skinning_vertex>\n${OUTLINE_MAIN}`);
}

/**
 * 全部の輪郭材質が共有するもの（px→m の係数・光の向き・太さの式の係数）。
 * @param {Cfg} cfg
 */
export function createOutlineShared(cfg) {
  const rc = cfg.render;
  const uniforms = {
    uPxPerM: { value: 0 },
    uLightDir: { value: new Vector3(0, 1, 0) },
    uOutlineClamp: { value: new Vector3(rc.outlineMinPx, rc.outlineMaxPx, rc.outlineNearM) },
    uOutlineNoise: { value: new Vector3(rc.outlineNoiseBaseRatio, rc.outlineNoiseAmpRatio, rc.outlineNoiseFreqRatio) },
    uOutlineLight: { value: rc.outlineLightBoostRatio },
  };
  return {
    uniforms,
    /** 調整パネルで変えた値を反映する。 */
    refresh() {
      uniforms.uOutlineClamp.value.set(rc.outlineMinPx, rc.outlineMaxPx, rc.outlineNearM);
      uniforms.uOutlineNoise.value.set(rc.outlineNoiseBaseRatio, rc.outlineNoiseAmpRatio, rc.outlineNoiseFreqRatio);
      uniforms.uOutlineLight.value = rc.outlineLightBoostRatio;
    },
    /** 画面の大きさ・視野角が変わったら呼ぶ。 @param {number} fovYDeg @param {number} viewHPx */
    setView(fovYDeg, viewHPx) {
      uniforms.uPxPerM.value = outlinePxPerM(fovYDeg, viewHPx);
    },
    /** @param {import('../../data/types.js').V3} dir 光源を指す単位ベクトル（世界座標） */
    setLightDir(dir) {
      uniforms.uLightDir.value.set(dir[0], dir[1], dir[2]);
    },
  };
}

/**
 * 1体ぶんの輪郭材質。uOutlinePx（太さ）だけを個別に持つ。プログラムは共有される。
 * @param {ReturnType<typeof createOutlineShared>} shared
 * @param {{px:number, color:string}} o  px＝outlineHeroPx など、color＝墨（16進）
 */
export function createOutlineMaterial(shared, o) {
  const material = new MeshBasicMaterial({ name: 'outline', color: new Color(o.color), side: BackSide });
  material.userData.uniforms = { ...shared.uniforms, uOutlinePx: { value: o.px } };
  material.onBeforeCompile = patchOutline;
  material.customProgramCacheKey = () => 'tkOutline';
  return material;
}
