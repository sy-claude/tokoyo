// トゥーン（07 3.3）。人物・敵・大きな小道具の材質。3段の階調（陰は藍寄り）＋縁の光。
// 色＝頂点色（顔は顔アトラス）× 段の倍率 × mix(白, shadowTint, 段の藍寄せ割合) ＋ rim×縁色。
// 霧（07 3.6）と被弾の白・溶解の uniform は、それを作るM（M1b・M3b・M4a）で足す。
/** @import {Cfg} from '../../config/index.js' */
import { ClampToEdgeWrapping, Color, DataTexture, NearestFilter, RGBAFormat, ShaderMaterial, UnsignedByteType, Vector2, Vector3, Vector4 } from 'three';

const BYTE_MAX = 255; // num-ok: 1バイトの最大値
const RGBA = 4; // num-ok: 1画素の要素数

/**
 * 陰影の量 h（0〜1）→ 段（0 陰・1 中・2 明）。純関数。
 * @param {number} h @param {{toonEdge1Ratio:number, toonEdge2Ratio:number}} rc
 */
export function toonBand(h, rc) {
  return h < rc.toonEdge1Ratio ? 0 : h < rc.toonEdge2Ratio ? 1 : 2;
}

/**
 * 階調テクスチャの中身（幅 toonRampPx×1、RGBA8）。R＝明るさの倍率、G＝shadowTint の割合。純関数。
 * @param {Cfg['render']} rc @returns {Uint8Array}
 */
export function toonRampData(rc) {
  const w = rc.toonRampPx;
  const levels = [rc.toonLevelDarkRatio, rc.toonLevelMidRatio, rc.toonLevelLitRatio];
  const tints = [rc.toonShadowTintDarkMul, rc.toonShadowTintMidMul, 0];
  const data = new Uint8Array(w * RGBA);
  for (let i = 0; i < w; i++) {
    const band = toonBand((i + 1 / 2) / w, rc);
    data[i * RGBA] = Math.round(levels[band] * BYTE_MAX);
    data[i * RGBA + 1] = Math.round(tints[band] * BYTE_MAX);
    data[i * RGBA + 2] = 0;
    data[i * RGBA + RGBA - 1] = BYTE_MAX;
  }
  return data;
}

const VERT = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
attribute vec2 aFaceUv;
varying vec3 vColor;
varying vec3 vNormalV;
varying vec3 vViewPos;
varying vec2 vFaceUv;
void main() {
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  #include <project_vertex>
  vColor = color;
  vNormalV = transformedNormal;
  vViewPos = -mvPosition.xyz;
  vFaceUv = aFaceUv;
}`;

const FRAG = /* glsl */ `
uniform sampler2D tRamp;
uniform sampler2D tFace;
uniform vec3 uLightDir;
uniform vec3 uShadowTint;
uniform vec3 uRimColor;
uniform vec4 uRim;
uniform vec2 uFaceShift;
varying vec3 vColor;
varying vec3 vNormalV;
varying vec3 vViewPos;
varying vec2 vFaceUv;
void main() {
  vec3 n = normalize(vNormalV);
  vec3 l = normalize((viewMatrix * vec4(uLightDir, 0.0)).xyz);
  vec3 v = normalize(vViewPos);
  float h = 0.5 * dot(n, l) + 0.5;
  vec4 ramp = texture2D(tRamp, vec2(h, 0.5));
  vec3 base = mix(vColor, texture2D(tFace, vFaceUv + uFaceShift).rgb, step(0.0, vFaceUv.x));
  vec3 col = base * ramp.r * mix(vec3(1.0), uShadowTint, ramp.g);
  float rim = smoothstep(uRim.y, uRim.y + uRim.z, pow(1.0 - clamp(dot(n, v), 0.0, 1.0), uRim.x)) * uRim.w;
  col += rim * uRimColor;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

/**
 * 全部のトゥーン材質が共有するもの（階調テクスチャ・光の向き・陰の色・縁の光の係数）。
 * @param {Cfg} cfg
 */
export function createToonShared(cfg) {
  const rc = cfg.render;
  const ramp = new DataTexture(toonRampData(rc), rc.toonRampPx, 1, RGBAFormat, UnsignedByteType);
  ramp.minFilter = NearestFilter;
  ramp.magFilter = NearestFilter;
  ramp.wrapS = ClampToEdgeWrapping;
  ramp.wrapT = ClampToEdgeWrapping;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  const uniforms = {
    tRamp: { value: ramp },
    uLightDir: { value: new Vector3(0, 1, 0) },
    uShadowTint: { value: new Color(cfg.palette.shadowTint) },
    uRim: { value: new Vector4(rc.rimPowerRatio, rc.rimStepRatio, rc.rimSoftRatio, rc.rimStrengthRatio) },
  };
  /** 階調を決める値（変わったときだけテクスチャを書き直す） */
  const rampKeys = /** @type {const} */ (['toonRampPx', 'toonEdge1Ratio', 'toonEdge2Ratio', 'toonLevelDarkRatio', 'toonLevelMidRatio', 'toonLevelLitRatio', 'toonShadowTintDarkMul', 'toonShadowTintMidMul']);
  const rampLast = rampKeys.map((k) => rc[k]);
  return {
    uniforms,
    /** 調整パネルで変えた値を反映する（毎フレーム呼んでよい）。 */
    refresh() {
      uniforms.uShadowTint.value.set(cfg.palette.shadowTint);
      uniforms.uRim.value.set(rc.rimPowerRatio, rc.rimStepRatio, rc.rimSoftRatio, rc.rimStrengthRatio);
      let changed = false;
      rampKeys.forEach((k, i) => {
        if (rampLast[i] !== rc[k]) {
          rampLast[i] = rc[k];
          changed = true;
        }
      });
      if (changed && rc.toonRampPx === ramp.image.width) {
        ramp.image.data.set(toonRampData(rc));
        ramp.needsUpdate = true;
      }
    },
    /** @param {import('../../data/types.js').V3} dir 光源を指す単位ベクトル（世界座標） */
    setLightDir(dir) {
      uniforms.uLightDir.value.set(dir[0], dir[1], dir[2]);
    },
    dispose() {
      ramp.dispose();
    },
  };
}

/**
 * 1体ぶんのトゥーン材質。シェーダーの文字列が同じなのでプログラムは共有される（剛体スキンと静的物で1つずつ）。
 * @param {ReturnType<typeof createToonShared>} shared
 * @param {{rimColor:string, faceTexture:any}} o  rimColor＝縁の光の色（16進。主人公 rimHero、敵 rimEnemy）
 */
export function createToonMaterial(shared, o) {
  const material = new ShaderMaterial({
    name: 'toon',
    vertexShader: VERT,
    fragmentShader: FRAG,
    vertexColors: true,
    uniforms: {
      tRamp: shared.uniforms.tRamp,
      uLightDir: shared.uniforms.uLightDir,
      uShadowTint: shared.uniforms.uShadowTint,
      uRim: shared.uniforms.uRim,
      tFace: { value: o.faceTexture },
      uRimColor: { value: new Color(o.rimColor) },
      uFaceShift: { value: new Vector2(0, 0) },
    },
  });
  return material;
}
