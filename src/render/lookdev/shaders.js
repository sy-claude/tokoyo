// 見た目の試作（lookdev）の GLSL。水彩の「塗り」＝頂点色＋にじんだ色むら＋淡い陰影＋空気遠近。
// 数値のうち絵づくりの調整値は uniform（src/config/lookdev.js・src/data/lookdev/）から渡す。ここに残る数は模様の作り方の定数。

// 出力は常に表示用（sRGB）の値にする（画面へ直接でも、後処理用の描画先でも同じ）
export const OUT_GLSL = /* glsl */ `
vec3 toDisplay(vec3 c) {
  c = max(c, 0.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
`;

export const NOISE_GLSL = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
}
float vnoise3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(hash13(i), hash13(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), f.x), f.y);
  float b = mix(mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), f.x), f.y);
  return mix(a, b, f.z);
}
float fbm2(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < OCT; i++) { s += vnoise2(p) * a; p = p * 2.03 + 17.7; a *= 0.5; }
  return s / (1.0 - a * 2.0);
}
float fbm3(vec3 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < OCT; i++) { s += vnoise3(p) * a; p = p * 2.03 + 17.7; a *= 0.5; }
  return s / (1.0 - a * 2.0);
}
`;

// 空気遠近：遠いほど淡く、夕日の方角は暖かく、反対側は青紫へ
export const FOG_GLSL = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uFogWarm;
uniform vec3 uFogCool;
uniform vec4 uFog; // x=濃さ(1/m) y=低い所ほど濃くなる高さ(m) z=上限 w=夕日側の広がり
vec3 applyFog(vec3 col, vec3 world) {
  vec3 v = world - cameraPosition;
  float dist = length(v);
  float low = exp(-max(world.y, 0.0) / uFog.y);
  float f = (1.0 - exp(-dist * uFog.x * (0.55 + 0.45 * low))) * uFog.z;
  float sunAmt = pow(max(dot(normalize(v.xz + 1e-5), normalize(uSunDir.xz)), 0.0), uFog.w);
  return mix(col, mix(uFogCool, uFogWarm, sunAmt), f);
}
`;

export const WASH_VERT = /* glsl */ `
attribute vec4 aFx;
attribute vec4 aAnim;
uniform float uTime;
uniform vec3 uWind;   // xz=向き×強さ(m) y=速さ
uniform vec4 uWalk;   // x=歩きの位相 y=歩きの量(0..1) z=腰の高さ(m) w=脚の振り(rad)
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vColor;
varying vec4 vFx;
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
  // 体の上下（歩き）
  if (kind > 1.5) p.y += abs(sin(uWalk.x)) * uWalk.y * 0.035;
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
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const WASH_FRAG = /* glsl */ `
${OUT_GLSL}
${NOISE_GLSL}
${FOG_GLSL}
uniform float uTime;
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
uniform vec4 uPlayer; // xyz=主人公の足元 w=影の濃さ
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

float segDist(vec2 p, vec2 a, vec2 b, out float t) {
  vec2 pa = p - a, ba = b - a;
  t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * t);
}
// 影の楕円（夕日の反対側へ長く伸びる）
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
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 base = vColor;
  float n1 = fbm3(vWorld * 0.55);
  float n2 = fbm3(vWorld * 2.3 + 7.0);
  float pave = vFx.z;
  float glow = vFx.w;
  float wetK = 0.0;

#ifdef TERRAIN
  // --- 石畳：ボロノイの1升＝敷石1枚。升の中心が参道の幅に入っていれば石 ---
  vec2 gp = vWorld.xz * uLook.w;
  vec2 gi = floor(gp), gf = fract(gp);
  float d1 = 9.0, d2 = 9.0; vec2 cell = vec2(0.0); vec2 cpos = vec2(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 o = vec2(float(i), float(j));
    vec2 r = o + 0.06 + 0.88 * hash22(gi + o) - gf;
    float d = max(abs(r.x), abs(r.y)) * 0.6 + length(r) * 0.4;
    if (d < d1) { d2 = d1; d1 = d; cell = gi + o; cpos = (gi + o + 0.06 + 0.88 * hash22(gi + o)) / uLook.w; }
    else if (d < d2) d2 = d;
  }
  float dPath = 99.0; float tt;
  for (int i = 0; i < PATH_N - 1; i++) {
    float d = segDist(cpos, uPath[i].xy, uPath[i + 1].xy, tt) - mix(uPath[i].z, uPath[i + 1].z, tt);
    dPath = min(dPath, d);
  }
  float stone = step(dPath + (hash12(cell) - 0.5) * 0.9, 0.0) * step(0.55, N.y);
  float edge = d2 - d1;
  float ch = hash12(cell + 3.7);
  vec3 stoneCol = uPaveCol * (0.82 + 0.36 * ch);
  stoneCol = mix(stoneCol, stoneCol * vec3(1.10, 0.97, 0.86), smoothstep(0.55, 0.9, hash12(cell + 9.1)));
  stoneCol = mix(stoneCol, stoneCol * vec3(0.86, 0.84, 1.08), smoothstep(0.6, 0.95, hash12(cell + 5.3)));
  // 目地（割れ目）：暗い線。石の内側にも細いひび
  float joint = smoothstep(0.075, 0.02, edge);
  float hair = smoothstep(0.035, 0.0, abs(vnoise2(vWorld.xz * 1.7 + ch * 9.0) - 0.5)) * step(0.5, ch) * 0.6;
  stoneCol = mix(stoneCol, uCrackCol, max(joint, hair) * 0.8);
  // 目地の草・苔
  stoneCol = mix(stoneCol, uMossCol, joint * smoothstep(0.45, 0.7, n2) * 0.7);
  base = mix(base, stoneCol, stone);
  pave = stone;
  wetK = stone * (1.0 - joint);
  // --- 地面の裂け目（紫の靄が漏れる） ---
  float dF = 99.0;
  for (int i = 0; i < FIS_N - 1; i++) {
    float w = mix(uFis[i].z, uFis[i + 1].z, 0.5);
    float d = segDist(vWorld.xz + (vec2(vnoise2(vWorld.xz * 2.1), vnoise2(vWorld.xz * 2.1 + 31.0)) - 0.5) * 0.5, uFis[i].xy, uFis[i + 1].xy, tt) - w;
    dF = min(dF, d);
  }
  float fisCore = smoothstep(0.05, -0.05, dF);
  float fisGlow = exp(-max(dF, 0.0) * 2.6) * (0.75 + 0.25 * sin(uTime * 1.3 + vWorld.x * 2.0));
  base = mix(base, uCrackCol * 0.55, fisCore);
  wetK *= 1.0 - fisCore;
  // --- 置き影 ---
  vec2 sdir = -normalize(uSunDir.xz);
  float sh = blobShadow(vWorld.xz, uPlayer.xz, 0.4, 4.6, sdir) * step(abs(vWorld.y - uPlayer.y), 0.6);
  for (int i = 0; i < CAST_N; i++) sh = max(sh, blobShadow(vWorld.xz, uCaster[i].xy, uCaster[i].z, uCaster[i].w, sdir) * 0.8);
  sh *= uPlayer.w * step(0.4, N.y);
#else
  float fisGlow = 0.0;
  float sh = 0.0;
  if (pave > 0.5) wetK = 0.5;
#endif

  // --- 塗りのはげ（鳥居）：朱の下から白っぽい木地、縦に流れる汚れ ---
  if (vFx.y > 0.01) {
    float pn = fbm3(vWorld * vec3(2.2, 1.1, 2.2) + 3.0);
    float peel = smoothstep(0.05, -0.05, pn - vFx.y * 0.62);
    float fine = step(0.62, vnoise3(vWorld * vec3(9.0, 4.0, 9.0))) * vFx.y * 0.5;
    base = mix(base, uPeelCol * (0.85 + 0.3 * n2), max(peel, fine * step(pn - vFx.y * 0.62, 0.12)));
    float streak = fbm3(vec3(vWorld.x * 5.0, vWorld.y * 0.6, vWorld.z * 5.0));
    base *= 1.0 - smoothstep(0.5, 0.8, streak) * 0.28 * vFx.y;
  }
  // --- 苔：上を向いた面とくぼみに ---
  if (vFx.x > 0.01) {
    float m = smoothstep(0.42, 0.62, n2 * 0.75 + N.y * 0.3 + (vFx.x - 0.5) * 0.5);
    vec3 mc = mix(uMossCol, uMossCol * vec3(1.12, 1.08, 0.8), smoothstep(0.4, 0.7, n1));
    base = mix(base, mc, m * min(0.8, vFx.x * 1.6));
  }

  // --- 水彩の色むら：大きなにじみ＋細かな顔料の粒。暗い所は紫へ、明るい所は暖色へ寄る ---
  float n3 = vnoise3(vWorld * 6.5 + 3.0);
  float mott = (n1 - 0.5) * 1.0 + (n2 - 0.5) * 0.55 + (n3 - 0.5) * 0.3;
  base *= 1.0 + mott * uLook.x;
  base = mix(base, base * vec3(0.90, 0.86, 1.10), smoothstep(0.52, 0.8, n1) * uLook.x);
  base = mix(base, base * vec3(1.10, 1.02, 0.86), smoothstep(0.48, 0.2, n1) * uLook.x);

  // 筆のむら：面の向きを少し乱して、陰影が筆触のように割れる
  N = normalize(N + (vec3(n2, n3, vnoise3(vWorld * 2.9 + 40.0)) - 0.5) * 0.55);
  // --- 淡い陰影：夕日側は暖かく、陰は藍紫 ---
  float ndl = dot(N, normalize(uSunDir + vec3(0.0, 0.38, 0.0)));
  float wrap = smoothstep(-0.55, 0.75, ndl);
  float up = N.y * 0.5 + 0.5;
  vec3 col = base * mix(uShadeCol, uLightCol, wrap) * mix(0.86, 1.06, up);
  col = mix(col, col * uShadeCol * 0.72, sh);

  // --- 濡れた石：空の色を映す（夕日の方角は橙、反対は青紫）＋夕日の照り返し ---
  if (wetK > 0.0) {
    vec3 R = reflect(-V, normalize(N + vec3(n2 - 0.5, 0.0, n1 - 0.5) * 0.35));
    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.5);
    float toSun = pow(max(dot(normalize(R.xz + 1e-5), normalize(uSunDir.xz)), 0.0), 2.0);
    float puddle = smoothstep(0.5, 0.66, fbm2(vWorld.xz * 0.45 + 11.0));
    vec3 refl = mix(uReflCool, uReflWarm, toSun);
    col = mix(col, refl, wetK * uLook.z * puddle * (0.12 + 0.88 * fres) * 0.75);
    float glint = pow(max(dot(R, normalize(uSunDir)), 0.0), 18.0) * puddle;
    col += uReflWarm * glint * wetK * uLook.z * 0.9;
  }

  // --- 縁の光（逆光の輪郭が橙に光る） ---
  float rim = pow(1.0 - abs(dot(N, V)), 3.0) * smoothstep(-0.2, 0.6, dot(-V, normalize(uSunDir)));
  col += uRimCol * rim * uLook.y * smoothstep(-0.3, 0.4, ndl + 0.3);

  // --- 発光（目・灯・裂け目） ---
  col = mix(col, vColor * 1.35, glow);
  col += uGlowCol * fisGlow * 0.3;

  col = applyFog(col, vWorld);
  gl_FragColor = vec4(col, 1.0);
  gl_FragColor.rgb = toDisplay(gl_FragColor.rgb);
}`;

export const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
  gl_Position = p.xyww;
}`;

export const SKY_FRAG = /* glsl */ `
${OUT_GLSL}
${NOISE_GLSL}
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSkyTop;
uniform vec3 uSkyMid;
uniform vec3 uSkyLow;
uniform vec3 uSkyHorizonSun;
uniform vec3 uSkyHorizonFar;
uniform vec3 uCloudDark;
uniform vec3 uCloudLit;
uniform vec3 uCloudEdge;
uniform vec3 uSunCol;
uniform vec3 uSunCore;
uniform vec4 uSky; // x=夕日の半径(rad) y=雲の量 z=雲の流れる速さ w=にじみ
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  vec3 s = normalize(uSunDir);
  float e = d.y;
  float az = dot(normalize(d.xz + 1e-5), normalize(s.xz)); // 夕日の方角=1
  float sunSide = smoothstep(-0.2, 1.0, az);
  float wob = (fbm2(d.xz * 3.0 / (abs(e) + 0.4)) - 0.5) * uSky.w;
  float h = clamp(e + wob * 0.12, -0.2, 1.0);
  // 地平から天頂へ：淡い黄桃 → 橙桃 → 藤 → 青鼠
  vec3 horizon = mix(uSkyHorizonFar, uSkyHorizonSun, sunSide);
  vec3 col = mix(horizon, uSkyLow, smoothstep(0.0, 0.14 + 0.08 * sunSide, h));
  col = mix(col, uSkyMid, smoothstep(0.08 + 0.06 * sunSide, 0.34, h));
  col = mix(col, uSkyTop, smoothstep(0.26, 0.7, h));
  // 雲：横に流れる筋。下の面は夕日に染まり、上は暗い藤鼠
  vec2 cp = d.xz / (max(e, 0.0) + 0.22);
  vec2 st = vec2(dot(cp, vec2(s.z, -s.x)), dot(cp, s.xz));
  float t = uTime * uSky.z;
  float c1 = fbm2(vec2(st.x * 0.55 + t, st.y * 1.9) + 4.0);
  float c2 = fbm2(vec2(st.x * 1.3 - t * 0.6, st.y * 4.2) + 19.0);
  // 高い雲：青鼠の厚い雲が上を覆う
  float topD = smoothstep(0.62 - uSky.y * 0.25, 0.8 - uSky.y * 0.25, c1 * 0.75 + c2 * 0.25) * smoothstep(0.1, 0.45, h);
  col = mix(col, mix(uCloudDark, uSkyMid, 0.25 + 0.3 * c2), topD * 0.85);
  // 低い雲：横に長い筋。夕日に染まった橙の腹と明るい縁
  float lowD = smoothstep(0.52, 0.7, c2 * 0.62 + c1 * 0.42) * smoothstep(-0.01, 0.04, e) * smoothstep(0.42, 0.12, h);
  float lit = 0.4 + 0.6 * sunSide;
  vec3 cc = mix(uCloudDark, uCloudLit, lit * smoothstep(0.3, 0.05, h) + 0.25);
  float edgeBand = smoothstep(0.0, 0.5, lowD) * (1.0 - smoothstep(0.5, 1.0, lowD));
  cc = mix(cc, uCloudEdge, edgeBand * lit * 0.8);
  col = mix(col, cc, lowD * 0.8);
  // 夕日：朱の円盤と、にじんだ光の輪
  float ang = acos(clamp(dot(d, s), -1.0, 1.0));
  float disc = smoothstep(uSky.x * 1.06, uSky.x * 0.94, ang + wob * 0.004);
  float halo = exp(-ang * 5.5);
  col += uSunCol * halo * 0.42;
  col = mix(col, mix(uSunCol, uSunCore, smoothstep(uSky.x, 0.0, ang) * 0.6), disc);
  gl_FragColor = vec4(col, 1.0);
  gl_FragColor.rgb = toDisplay(gl_FragColor.rgb);
}`;

export const SEA_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const SEA_FRAG = /* glsl */ `
${OUT_GLSL}
${NOISE_GLSL}
${FOG_GLSL}
uniform float uTime;
uniform sampler2D uHeightMap;
uniform vec4 uHeightRect;  // x0, z0, 1/幅, 1/奥行
uniform vec2 uHeightRange; // 最低, 幅（m）
uniform vec3 uSeaNear;
uniform vec3 uSeaFar;
uniform vec3 uSeaDeep;
uniform vec3 uFoamCol;
uniform vec3 uGlitterCol;
uniform vec4 uSea; // x=波の速さ y=きらめき z=泡 w=きらめきの幅
varying vec3 vWorld;
void main() {
  vec2 wp = vWorld.xz;
  vec3 toP = vWorld - cameraPosition;
  float dist = length(toP);
  float t = uTime * uSea.x;
  // 横に長い波の筋（遠くは細かく）
  float band = fbm2(vec2(wp.x * 0.07 + t * 0.4, wp.y * 0.42 - t));
  float rip = vnoise2(vec2(wp.x * 0.55 - t * 1.3, wp.y * 2.6 + t * 2.0));
  vec3 col = mix(uSeaNear, uSeaFar, smoothstep(8.0, 140.0, dist));
  col = mix(col, uSeaDeep, smoothstep(0.45, 0.75, band) * 0.55 * smoothstep(160.0, 20.0, dist));
  col = mix(col, uSeaFar * 1.08, smoothstep(0.55, 0.3, band) * 0.35);
  // 夕日の道：夕日の方角に橙のきらめきの筋
  float toSun = max(dot(normalize(toP.xz), normalize(uSunDir.xz)), 0.0);
  float lane = pow(toSun, uSea.w) * smoothstep(6.0, 60.0, dist);
  float spark = smoothstep(0.52, 0.7, rip * 0.6 + band * 0.5 + lane * 0.25);
  col = mix(col, uGlitterCol, lane * spark * uSea.y);
  col += uGlitterCol * pow(toSun, uSea.w * 0.25) * 0.10 * uSea.y;
  // 岸の泡：地形の高さの図から水深を出し、浅い所に寄せては返す白波
  vec2 huv = (wp - uHeightRect.xy) * uHeightRect.zw;
  float inside = step(0.0, huv.x) * step(huv.x, 1.0) * step(0.0, huv.y) * step(huv.y, 1.0);
  float ground = texture2D(uHeightMap, huv).r * uHeightRange.y + uHeightRange.x;
  float depth = mix(9.0, vWorld.y - ground, inside);
  float shore = smoothstep(5.0, 0.0, depth);
  float wave = sin(depth * 1.9 + t * 6.0 + band * 5.0) * 0.5 + 0.5;
  float foam = shore * smoothstep(0.55, 0.8, wave * 0.6 + rip * 0.55 + shore * 0.25);
  foam = max(foam, smoothstep(0.9, 0.0, depth) * 0.9);
  // 沖の白波（まばら）
  foam = max(foam, smoothstep(0.80, 0.86, band * 0.55 + rip * 0.5) * smoothstep(90.0, 10.0, dist) * 0.7);
  col = mix(col, uFoamCol, foam * uSea.z);
  col = applyFog(col, cameraPosition + (vWorld - cameraPosition) * 0.45);
  gl_FragColor = vec4(col, 1.0);
  gl_FragColor.rgb = toDisplay(gl_FragColor.rgb);
}`;

// 紫の靄・舞う紅葉：カメラへ向く小さな板（インスタンス）。aSeed＝(x, y, z, 乱数)
export const MIST_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform vec4 uMist; // x=大きさ(m) y=上る速さ z=濃さ w=上る高さ(m)
varying vec2 vUv;
varying float vAlpha;
varying float vRnd;
void main() {
  float r = aSeed.w;
  float life = fract(uTime * uMist.y * (0.5 + r) + r * 7.0);
  vec3 c = aSeed.xyz + vec3(sin(uTime * 0.3 + r * 40.0) * 0.5, life * uMist.w * (0.4 + r), cos(uTime * 0.23 + r * 31.0) * 0.5);
  float size = uMist.x * (0.6 + r * 0.9) * (0.5 + life);
  vec4 mv = viewMatrix * modelMatrix * vec4(c, 1.0);
  mv.xy += position.xy * size * vec2(1.5, 1.0);
  vUv = position.xy;
  vRnd = r;
  vAlpha = sin(life * 3.14159) * uMist.z;
  gl_Position = projectionMatrix * mv;
}`;

export const MIST_FRAG = /* glsl */ `
${OUT_GLSL}
${NOISE_GLSL}
uniform float uTime;
uniform vec3 uMistCol;
uniform vec3 uMistCore;
varying vec2 vUv;
varying float vAlpha;
varying float vRnd;
void main() {
  float d = length(vUv);
  float n = fbm2(vUv * 1.6 + vRnd * 50.0 + vec2(0.0, -uTime * 0.12));
  float a = smoothstep(1.0, 0.1, d + (n - 0.5) * 0.9) * vAlpha;
  vec3 col = mix(uMistCol, uMistCore, smoothstep(0.5, 0.9, n) * 0.6);
  gl_FragColor = vec4(col, a);
  gl_FragColor.rgb = toDisplay(gl_FragColor.rgb);
}`;

export const LEAF_VERT = /* glsl */ `
attribute vec4 aSeed;
attribute vec3 aTint;
uniform float uTime;
uniform vec4 uLeaf;  // x=大きさ(m) y=落ちる速さ z=横へ流れる速さ w=箱の高さ(m)
uniform vec3 uLeafBox; // 舞う範囲（x幅, 高さ, z奥行）
uniform vec3 uWind;
varying vec3 vTint;
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  float r = aSeed.w;
  float t = uTime * (0.6 + r * 0.8);
  vec3 c = aSeed.xyz;
  c.y = uLeafBox.y - mod(uLeafBox.y - c.y + t * uLeaf.y, uLeafBox.y);
  vec2 drift = normalize(uWind.xz + 1e-5) * t * uLeaf.z;
  c.xz = mod(c.xz + drift + vec2(sin(t * 1.3 + r * 30.0), cos(t * 1.1 + r * 17.0)) * 0.6 + uLeafBox.xz * 0.5, uLeafBox.xz) - uLeafBox.xz * 0.5;
  // ひらひら回る
  float a = t * 3.0 + r * 60.0;
  float b = t * 2.1 + r * 23.0;
  vec3 ax = vec3(cos(a), sin(a) * cos(b), sin(a) * sin(b));
  vec3 ay = normalize(cross(ax, vec3(sin(b), cos(b), 0.3)));
  vec3 p = c + (ax * position.x + ay * position.y) * uLeaf.x * (0.7 + r * 0.6);
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  vTint = aTint;
  vUv = position.xy;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const LEAF_FRAG = /* glsl */ `
${OUT_GLSL}
${FOG_GLSL}
varying vec3 vTint;
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  // もみじの形：5つの尖った裂片
  float ang = atan(vUv.x, vUv.y);
  float rad = length(vUv);
  float lobes = 0.45 + 0.55 * pow(abs(cos(ang * 2.5)), 0.6);
  if (rad > lobes) discard;
  vec3 col = vTint * (0.85 + 0.3 * (1.0 - rad));
  col = applyFog(col, vWorld);
  gl_FragColor = vec4(col, 1.0);
  gl_FragColor.rgb = toDisplay(gl_FragColor.rgb);
}`;

// 後処理（品質「高」「中」）：水彩の仕上げ。色は表示用（sRGB）の値で受け取り、そのまま出す。
export const POST_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

export const BLUR_FRAG = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uStep;      // 1テクセルの向きと幅
uniform float uThreshold; // 明るい所だけ拾う（0 なら全部）
varying vec2 vUv;
vec3 pick(vec2 uv) {
  vec3 c = texture2D(tSrc, uv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return c * mix(1.0, smoothstep(uThreshold, uThreshold + 0.25, l), step(0.001, uThreshold));
}
void main() {
  vec3 c = pick(vUv) * 0.227;
  c += (pick(vUv + uStep * 1.385) + pick(vUv - uStep * 1.385)) * 0.316;
  c += (pick(vUv + uStep * 3.231) + pick(vUv - uStep * 3.231)) * 0.070;
  gl_FragColor = vec4(c, 1.0);
}`;

export const POST_FRAG = /* glsl */ `
${NOISE_GLSL}
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tBloom;
uniform vec2 uTexel;     // 1px の大きさ（uv）
uniform vec2 uView;      // 画面の大きさ（CSS px 相当。紙の目の細かさをそろえる）
uniform vec2 uNearFar;
uniform vec3 uPaperCol;
uniform vec3 uInkCol;
uniform vec4 uWash;   // x=縁のゆらぎ(px) y=にじみ(px) z=顔料のたまり w=粒状感
uniform vec4 uLine;   // x=輪郭の濃さ y=太さ(px) z=奥行きの感度 w=色の境の線
uniform vec4 uTone;   // x=彩度 y=コントラスト z=紙の白へ寄せる量 w=周囲の紙の余白
uniform vec4 uGlow;   // x=光のにじみ y=紙の目 z=にじみの有無(0/1) w=時間
varying vec2 vUv;

float linDepth(vec2 uv) {
  float z = texture2D(tDepth, uv).r * 2.0 - 1.0;
  return 2.0 * uNearFar.x * uNearFar.y / (uNearFar.y + uNearFar.x - z * (uNearFar.y - uNearFar.x));
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
// 紙の目：繊維の粗い凹凸＋細かな粒
float paperTex(vec2 px) {
  float a = fbm2(px * 0.035);
  float b = fbm2(px * vec2(0.22, 0.26) + 40.0);
  float c = vnoise2(px * 0.9 + 9.0);
  return a * 0.35 + b * 0.45 + c * 0.2;
}
void main() {
  vec2 px = vUv * uView;
  float paper = paperTex(px);
  // 1) 縁のゆらぎ：紙の凹凸で絵の具の境目が波打つ
  vec2 wv = vec2(fbm2(px * 0.045 + 3.0), fbm2(px * 0.045 + 71.0)) - 0.5;
  vec2 wv2 = vec2(vnoise2(px * 0.21 + 13.0), vnoise2(px * 0.21 + 57.0)) - 0.5;
  vec2 uv = vUv + (wv * 2.0 + wv2 * 0.7) * uWash.x * uTexel;
  // 2) にじみ：周りの色を少し混ぜる（色が境目からはみ出す）
  vec3 c0 = texture2D(tColor, uv).rgb;
  vec2 b = uWash.y * uTexel;
  float rot = paper * 6.283;
  vec2 o1 = vec2(cos(rot), sin(rot)) * b;
  vec2 o2 = vec2(-o1.y, o1.x);
  vec3 s1 = texture2D(tColor, uv + o1).rgb;
  vec3 s2 = texture2D(tColor, uv - o1).rgb;
  vec3 s3 = texture2D(tColor, uv + o2).rgb;
  vec3 s4 = texture2D(tColor, uv - o2).rgb;
  vec3 avg = (s1 + s2 + s3 + s4) * 0.25;
  vec3 col = mix(c0, avg, 0.55);
  // 3) 顔料のたまり：色の境目が少し濃くなる（水彩の「縁取り」）
  float grad = length(vec2(luma(s1) - luma(s2), luma(s3) - luma(s4)));
  col *= 1.0 - smoothstep(0.02, 0.22, grad) * uWash.z;
  // 4) 輪郭線：奥行きの段差に、細くかすれた焦茶の線
  vec2 lt = uLine.y * uTexel;
  float dc = linDepth(uv);
  float dl = linDepth(uv - vec2(lt.x, 0.0)), dr = linDepth(uv + vec2(lt.x, 0.0));
  float du = linDepth(uv - vec2(0.0, lt.y)), dd = linDepth(uv + vec2(0.0, lt.y));
  float dEdge = (abs(dl + dr - 2.0 * dc) + abs(du + dd - 2.0 * dc)) / max(dc, 0.1);
  float line = smoothstep(uLine.z, uLine.z * 3.0, dEdge);
  vec3 cl = texture2D(tColor, uv - lt).rgb, cr = texture2D(tColor, uv + lt).rgb;
  line = max(line, smoothstep(0.10, 0.32, abs(luma(cl) - luma(cr))) * uLine.w);
  line *= 0.55 + 0.45 * smoothstep(0.35, 0.6, paper + wv2.x * 0.5); // かすれ
  line *= smoothstep(260.0, 30.0, dc);                               // 遠くは線を消す
  col = mix(col, uInkCol, line * uLine.x);
  // 5) 光のにじみ（夕日・濡れた石・紫の光）
  col += texture2D(tBloom, vUv).rgb * uGlow.x;
  // 6) 色調：彩度とコントラスト、暗部は紫へ、全体を紙の白へ少し寄せる
  float l = luma(col);
  col = mix(vec3(l), col, uTone.x);
  col = (col - 0.58) * uTone.y + 0.58;
  col = mix(col, uPaperCol, uTone.z * (0.35 + 0.65 * smoothstep(0.35, 0.95, l)));
  // 7) 粒状感：顔料が紙のくぼみにたまる（暗い色ほど強い）
  float gran = (paper - 0.5) * 2.0;
  col *= 1.0 - gran * uWash.w * (1.0 - l * 0.6);
  // 8) 紙の目：明るい繊維と淡い影
  col *= 1.0 + (paper - 0.5) * uGlow.y;
  // 大きなにじみむら（水をたっぷり含んだ筆の濃淡）
  col *= 1.0 + (fbm2(px * 0.007 + 5.0) - 0.5) * uWash.w * 0.9;
  // 9) 周囲の余白：絵の縁がかすれて紙の地が出る
  vec2 q = abs(vUv - 0.5) * 2.0;
  float edge = max(q.x, q.y) + (fbm2(px * 0.02 + 90.0) - 0.5) * 0.02;
  col = mix(col, uPaperCol * (0.97 + 0.06 * paper), smoothstep(1.0 - uTone.w, 1.0 + 0.01, edge));
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;
