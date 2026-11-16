// 「塗り」の材質（V2）。頂点色に、起動時に焼いた質感テクスチャ（bake.js）を三方向から貼って描き込みを足す。
// texA＝(大きなむら, 粒, ひび, 筆の筋) texB＝(苔, 垂れ汚れ, 塗りのはげ, かすれ)。
// 影は影の図（夕日側から見た奥行き）を引く。品質「低」は置き影（楕円）に戻る。
import { FOG_GLSL, NOISE_GLSL, OUT_GLSL } from './shaders.js';

export const WASH_VERT = /* glsl */ `
attribute vec4 aFx;
attribute vec4 aAnim;
attribute vec3 aFace;
varying vec3 vFace;
uniform float uTime;
uniform vec3 uWind;   // xz=向き×強さ(m) y=速さ
uniform vec4 uWalk;   // x=歩きの位相 y=歩きの量(0..1) z=腰の高さ(m) w=脚の振り(rad)
uniform mat4 uShadowMat;
uniform float uShadowOffset;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vColor;
varying vec4 vFx;
varying vec3 vShadow;
vec3 rotX(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }
void main() {
  vec3 p = position;
  vec3 n = normal;
  float kind = aAnim.x;
  // 2・3：脚（腰を軸に前後へ振る）。4：腕（肩を軸に少し振る。aAnim.z＝軸の高さ）
  if (kind > 1.5 && kind < 4.5) {
    float sgn = kind < 2.5 ? 1.0 : (kind < 3.5 ? -1.0 : 0.35);
    float pivot = kind < 3.5 ? uWalk.z : aAnim.z;
    float a = sin(uWalk.x) * uWalk.w * uWalk.y * sgn;
    p = rotX(p - vec3(0.0, pivot, 0.0), a) + vec3(0.0, pivot, 0.0);
    n = rotX(n, a);
  }
  // 7：まぶた（まばたき）。上端（aAnim.z＝形の座標の高さ）を止めたまま下へ伸び、目の前へ出る（aAnim.y＝伸びる倍率、aAnim.w＝面の傾き）
  if (kind > 6.5 && kind < 7.5) {
    float bl = pow(max(sin(uTime * 0.9 + modelMatrix[3].x * 1.7), 0.0), 26.0);
    float drop = max(aAnim.z - p.y, 0.0) * aAnim.y * bl;
    p.y -= drop;
    p.z += drop * aAnim.w + 0.1 * bl;
  }
  // 体の上下（歩き）
  if (kind > 1.5) p.y += abs(sin(uWalk.x)) * uWalk.y * 0.035;
  // 待機の呼吸：胴から上がわずかに上下する（脚は動かさない）
  if (kind > 3.5 && kind < 6.5) p.y += sin(uTime * 1.7) * 0.005 * smoothstep(0.7, 1.4, p.y) * (1.0 - uWalk.y);
  vec4 w = modelMatrix * vec4(p, 1.0);
  float ph = dot(w.xz, vec2(0.37, 0.29)) + aAnim.z;
  // 1：風にしなる（草・枝先の葉）
  if (kind > 0.5 && kind < 1.5) {
    float s = sin(uTime * uWind.y + ph) * 0.6 + sin(uTime * uWind.y * 1.9 + ph * 1.7) * 0.4;
    w.xz += uWind.xz * aAnim.y * (0.55 + 0.45 * s);
    w.y -= aAnim.y * aAnim.y * length(uWind.xz) * 0.25 * (0.55 + 0.45 * s);
  }
  // 5：布・鉢巻の尾（はためく）
  if (kind > 4.5 && kind < 5.5) {
    float t = uTime * uWind.y * 2.6 - aAnim.y * 5.0 + aAnim.z;
    w.y += sin(t) * aAnim.y * 0.10;
    w.xz += normalize(uWind.xz + 1e-5) * (sin(t * 0.7 + 1.3) * 0.08 + 0.05) * aAnim.y;
  }
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * n);
  vColor = color;
  vFx = aFx;
  vFace = aFace;
  vShadow = (uShadowMat * vec4(w.xyz + vNormal * uShadowOffset, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// 影の図を描くとき用（色は書かない）
export const SHADOW_FRAG = /* glsl */ `
void main() {
  gl_FragColor = vec4(1.0);
}`;

export const WASH_FRAG = /* glsl */ `
${OUT_GLSL}
${NOISE_GLSL}
${FOG_GLSL}
uniform float uTime;
uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform sampler2D uShadowMap;
uniform vec4 uTexScale; // x=大きな柄(1/m) y=細かな柄(1/m) z=texB(1/m) w=粒の強さ
uniform sampler2D uFaceTex; // 顔の絵（地は透明。線と塗りだけ）
uniform vec4 uInk;      // x=石の割れ目の線 y=木目・しわの線 z=敷石の目地の太さ
uniform vec4 uShadow;   // x=影の濃さ(0で無効) y=奥行きの余裕 z=ぼかし(uv) w=筆の筋の強さ
uniform vec3 uLightCol;
uniform vec3 uShadeCol;
uniform vec3 uRimCol;
uniform vec3 uMossCol;
uniform vec3 uPeelCol;
uniform vec3 uCrackCol;
uniform vec3 uReflWarm;
uniform vec3 uReflCool;
uniform vec3 uGlowCol;
uniform vec4 uLook;   // x=色むら y=縁の光 z=濡れ w=石畳の升(1/m)
uniform vec4 uPlayer; // xyz=主人公の足元 w=置き影の濃さ
#ifdef TERRAIN
uniform vec3 uPath[PATH_N];    // 参道の中心線（x, z, 半幅）
uniform vec3 uFis[FIS_N];      // 地面の裂け目（x, z, 幅）
uniform vec4 uCaster[CAST_N];  // 置き影（x, z, 半径, 長さ）
uniform vec3 uPaveCol;
#endif
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vColor;
varying vec4 vFx;
varying vec3 vFace;
varying vec3 vShadow;

// 質感テクスチャを三方向から貼る。A は側面で「u=高さ」（筋が縦に走る）、B は「v=高さ」（垂れが縦に走る）
vec4 triA(vec3 p, vec3 w) {
#ifdef TRI_FULL
  return texture2D(uTexA, p.yz) * w.x + texture2D(uTexA, p.xz) * w.y + texture2D(uTexA, p.yx) * w.z;
#else
  vec2 uv = w.y >= max(w.x, w.z) ? p.xz : (w.x > w.z ? p.yz : p.yx);
  return texture2D(uTexA, uv);
#endif
}
vec4 triB(vec3 p, vec3 w) {
#ifdef TRI_FULL
  return texture2D(uTexB, p.zy) * w.x + texture2D(uTexB, p.xz) * w.y + texture2D(uTexB, p.xy) * w.z;
#else
  vec2 uv = w.y >= max(w.x, w.z) ? p.xz : (w.x > w.z ? p.zy : p.xy);
  return texture2D(uTexB, uv);
#endif
}
float segDist(vec2 p, vec2 a, vec2 b, out float t) {
  vec2 pa = p - a, ba = b - a;
  t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * t);
}
// 影の楕円（夕日の反対側へ長く伸びる。影の図を使わない品質用）
float blobShadow(vec2 p, vec2 c, float r, float len, vec2 dir) {
  vec2 rel = p - c;
  float al = dot(rel, dir);
  float ac = dot(rel, vec2(-dir.y, dir.x));
  float k = clamp(al / len, 0.0, 1.0);
  float d = length(vec2(al - clamp(al, 0.0, len), ac)) / (r * (1.0 + k * 0.6));
  return smoothstep(1.0, 0.35, d) * (1.0 - k * 0.75);
}

void main() {
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  float flatTop = smoothstep(0.4, 0.8, N.y); // 上を向いた面（地面）
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 tw = pow(abs(N), vec3(4.0));
  tw /= tw.x + tw.y + tw.z;
  vec4 dA = triA(vWorld * uTexScale.x, tw);
  vec4 dF = triA(vWorld * uTexScale.y + 0.37, tw);
  vec4 dB = triB(vWorld * uTexScale.z, tw);
  vec3 base = vColor;
  float stone = vFx.z;
  float glow = vFx.w;
  float wetK = 0.0;
  float fisGlow = 0.0;
  float blob = 0.0;

#ifdef TERRAIN
  // --- 石畳：ボロノイの1升＝敷石1枚。升の中心が参道の幅に入っていれば石 ---
  // 升をゆがめ、参道を横切る向きに少し長くする（六角形に見えないように）
  vec2 gp = (vWorld.xz + (vec2(vnoise2(vWorld.xz * 0.8), vnoise2(vWorld.xz * 0.8 + 17.0)) - 0.5) * 0.6) * uLook.w * vec2(0.72, 1.0);
  vec2 gi = floor(gp), gf = fract(gp);
  float d1 = 9.0, d2 = 9.0; vec2 cell = vec2(0.0); vec2 cpos = vec2(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 o = vec2(float(i), float(j));
    vec2 r = o + 0.06 + 0.88 * hash22(gi + o) - gf;
    float d = max(abs(r.x), abs(r.y)) * 0.6 + length(r) * 0.4;
    if (d < d1) { d2 = d1; d1 = d; cell = gi + o; cpos = (gi + o + 0.06 + 0.88 * hash22(gi + o)) / (uLook.w * vec2(0.72, 1.0)); }
    else if (d < d2) d2 = d;
  }
  float dPath = 99.0; float tt;
  for (int i = 0; i < PATH_N - 1; i++) {
    float d = segDist(cpos, uPath[i].xy, uPath[i + 1].xy, tt) - mix(uPath[i].z, uPath[i + 1].z, tt);
    dPath = min(dPath, d);
  }
  float st = step(dPath + (hash12(cell) - 0.5) * 0.9, 0.0) * step(0.55, N.y);
  float edge = d2 - d1 + (dF.g - 0.5) * 0.03;
  float ch = hash12(cell + 3.7);
  vec3 stoneCol = uPaveCol * (0.72 + 0.5 * ch);
  stoneCol = mix(stoneCol, stoneCol * vec3(1.12, 0.98, 0.84), smoothstep(0.5, 0.9, hash12(cell + 9.1)));
  stoneCol = mix(stoneCol, stoneCol * vec3(0.88, 0.86, 1.08), smoothstep(0.6, 0.95, hash12(cell + 5.3)));
  // 石の縁は欠けて暗く、内側は少し明るい（1枚ずつの厚みが見える）
  float joint = smoothstep(uInk.z * 2.2, uInk.z * 0.5, edge);
  float bevel = smoothstep(0.16, uInk.z, edge);
  stoneCol *= 1.0 - bevel * 0.12;
  stoneCol = mix(stoneCol, uCrackCol, joint * 0.85);
  // 目地の草・苔・土
  stoneCol = mix(stoneCol, uMossCol * (0.8 + 0.5 * dF.r), joint * smoothstep(0.45, 0.6, dB.r) * 0.85);
  base = mix(base, stoneCol, st);
  stone = max(stone, st);
  wetK = st * (1.0 - joint);
  // 土と草地：小石と踏まれた土のむら
  base = mix(base, base * 0.72, (1.0 - st) * smoothstep(0.55, 0.75, dF.b + dB.a * 0.5) * 0.5);
  // --- 地面の裂け目（紫の靄が漏れる） ---
  float dFs = 99.0;
  vec2 wob = (vec2(vnoise2(vWorld.xz * 2.1), vnoise2(vWorld.xz * 2.1 + 31.0)) - 0.5) * 0.5;
  for (int i = 0; i < FIS_N - 1; i++) {
    float w = mix(uFis[i].z, uFis[i + 1].z, 0.5);
    dFs = min(dFs, segDist(vWorld.xz + wob, uFis[i].xy, uFis[i + 1].xy, tt) - w);
  }
  float fisCore = smoothstep(0.05, -0.05, dFs);
  fisGlow = exp(-max(dFs, 0.0) * 7.0) * (0.75 + 0.25 * sin(uTime * 1.3 + vWorld.x * 2.0));
  base = mix(base, uCrackCol * 0.3, fisCore);
  wetK *= 1.0 - fisCore;
#ifndef SHADOWS
  vec2 sdir = -normalize(uSunDir.xz);
  blob = blobShadow(vWorld.xz, uPlayer.xz, 0.4, 4.6, sdir) * step(abs(vWorld.y - uPlayer.y), 0.6);
  for (int i = 0; i < CAST_N; i++) blob = max(blob, blobShadow(vWorld.xz, uCaster[i].xy, uCaster[i].z, uCaster[i].w, sdir) * 0.8);
  blob *= uPlayer.w * step(0.4, N.y);
#endif
#else
  if (stone > 0.5 && N.y > 0.7) wetK = 0.4;
#endif

  // --- 塗りのはげ（鳥居）：朱の下から白っぽい木地。はげの縁に薄い影、縦に垂れる汚れ ---
  if (vFx.y > 0.01) {
    float pv = dB.b + (dF.g - 0.5) * 0.18 - vFx.y * 0.8 + 0.12;
    float peel = smoothstep(0.015, -0.015, pv);
    vec3 under = uPeelCol * (0.78 + 0.4 * dF.a) * mix(vec3(1.0), vec3(0.92, 0.9, 1.0), dA.r);
    base *= 1.0 - smoothstep(0.07, 0.0, abs(pv)) * 0.3;
    base = mix(base, under, peel);
    base *= 1.0 - dB.g * 0.45 * vFx.y;
    base *= 1.0 + (dF.a - 0.5) * 0.3;
  }
  // --- 苔：上を向いた面とくぼみに。縁は粒でほつれる ---
  if (vFx.x > 0.01) {
    float mv = dB.r + N.y * 0.3 + (vFx.x - 0.5) * 0.75 + (dF.g - 0.5) * 0.22;
    float m = smoothstep(0.86, 0.96, mv);
    vec3 mc = uMossCol * (0.75 + 0.55 * dF.r);
    mc = mix(mc, mc * vec3(1.2, 1.12, 0.72), dA.r);
    base = mix(base, mc, m * 0.8);
    stone *= 1.0 - m * 0.7;
  }

  // --- 石の描き込み：ひび・粒・かすれた明るい面 ---
  float ck = max(dF.b, dA.b * 0.9) * stone;
  base = mix(base, uCrackCol, ck * 0.7 * (1.0 - uInk.x * 0.6));
  // 墨線：割れ目の芯だけを細く濃く引く（参考の「形の内側まで描いた細い線」）
  base = mix(base, uCrackCol * 0.75, smoothstep(0.45, 0.8, dF.b * stone) * uInk.x);
  base *= 1.0 + (dF.g - 0.5) * uTexScale.w * (0.45 + 0.55 * stone);
  base += vec3(0.09, 0.08, 0.065) * dB.a * stone * smoothstep(0.0, 0.7, N.y);
  // 筆の筋（木目・岩の層・布のしわ）
  base *= 1.0 + (dF.a - 0.5) * uShadow.w;
  // 墨線：木目・布のしわ。筋の暗い谷だけを細い線にする（石と発光する所には引かない）
  float gl = smoothstep(0.2, 0.08, dF.a) * (0.55 + 0.45 * smoothstep(0.35, 0.65, dA.r));
  base = mix(base, base * uCrackCol * 1.6, gl * uInk.y * (1.0 - stone) * (1.0 - glow));

  // --- 水彩の色むら：大きなにじみ。暗い所は紫へ、明るい所は暖色へ寄る ---
  float mott = (dA.r - 0.5) * 1.1 + (dF.r - 0.5) * 0.6;
  base *= 1.0 + mott * uLook.x;
  base = mix(base, base * vec3(0.90, 0.86, 1.10), smoothstep(0.55, 0.85, dA.r) * uLook.x);
  base = mix(base, base * vec3(1.10, 1.02, 0.86), smoothstep(0.45, 0.15, dA.r) * uLook.x);

  // 筆のむら：面の向きを少し乱して、陰影が筆触のように割れる
  N = normalize(N + (vec3(dF.r, dF.g, dA.r) - 0.5) * 0.6);

  // --- 顔の絵（目・眉・口）：色むらを掛けた後に重ねる。線はむらで薄れない ---
  if (vFace.z > 0.01) {
    vec4 fc = texture2D(uFaceTex, vFace.xy);
    base = mix(base, fc.rgb, fc.a * min(vFace.z * 2.0, 1.0));
  }

  // --- 落ち影（影の図を5点で引いて縁をぼかす。縁は粒でゆらぐ） ---
  float lit = 1.0;
#ifdef SHADOWS
  if (uShadow.x > 0.0 && vShadow.x > 0.0 && vShadow.x < 1.0 && vShadow.y > 0.0 && vShadow.y < 1.0 && vShadow.z < 1.0) {
    float a = dF.g * 6.283;
    vec2 o1 = vec2(cos(a), sin(a)) * uShadow.z;
    vec2 o2 = vec2(-o1.y, o1.x);
    float zc = vShadow.z - uShadow.y;
    float s = step(zc, texture2D(uShadowMap, vShadow.xy).r);
    s += step(zc, texture2D(uShadowMap, vShadow.xy + o1).r);
    s += step(zc, texture2D(uShadowMap, vShadow.xy - o1).r);
    s += step(zc, texture2D(uShadowMap, vShadow.xy + o2).r);
    s += step(zc, texture2D(uShadowMap, vShadow.xy - o2).r);
    lit = mix(1.0, s * 0.2, uShadow.x);
  }
#endif

  // --- 淡い陰影：夕日側は暖かく、陰は藍紫 ---
  float ndl = dot(N, normalize(uSunDir + vec3(0.0, 0.6, 0.0)));
  float wrap = smoothstep(-0.7, 0.7, ndl);
  float up = N.y * 0.5 + 0.5;
  vec3 col = base * mix(uShadeCol, uLightCol, wrap * lit) * mix(0.86, 1.06, up);
  col *= mix(1.0, 0.9, (1.0 - lit) * step(0.001, uShadow.x));
  col = mix(col, col * uShadeCol * 0.72, blob);

  // --- 濡れた石：空の色を映す（夕日の方角は橙、反対は青紫）＋夕日の照り返し ---
  if (wetK > 0.0) {
    vec3 R = reflect(-V, normalize(N + vec3(dF.r - 0.5, 0.0, dA.r - 0.5) * 0.3));
    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.5);
    float toSun = pow(max(dot(normalize(R.xz + 1e-5), normalize(uSunDir.xz)), 0.0), 2.0);
    float puddle = smoothstep(0.5, 0.72, dA.r * 0.7 + dB.r * 0.3);
    vec3 refl = mix(uReflCool, uReflWarm, toSun);
    col = mix(col, refl, wetK * uLook.z * puddle * (0.12 + 0.88 * fres) * 0.8);
    float glint = pow(max(dot(R, normalize(uSunDir + vec3(0.0, 0.1, 0.0))), 0.0), 14.0) * (0.35 + 0.65 * puddle);
    col += uReflWarm * glint * wetK * uLook.z * (0.5 + 0.5 * lit) * 0.6;
  }

  // --- 縁の光（逆光の輪郭が橙に光る） ---
  float rim = pow(1.0 - abs(dot(N, V)), 3.0) * smoothstep(-0.2, 0.6, dot(-V, normalize(uSunDir)));
  col += uRimCol * rim * uLook.y * smoothstep(-0.3, 0.4, ndl + 0.3) * (0.4 + 0.6 * lit) * (1.0 - flatTop);

  // --- 発光（目・灯・裂け目） ---
  col = mix(col, vColor * 1.35, glow);
  col += uGlowCol * fisGlow * 0.3;

  col = applyFog(col, vWorld);
  gl_FragColor = vec4(toDisplay(col), 1.0);
}`;
