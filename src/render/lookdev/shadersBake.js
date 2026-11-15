// 起動時に1度だけ焼く絵（V2）：面の質感テクスチャ2枚（継ぎ目なく並ぶ）と、空の絵（雲を描き込んだ全天）。
// 毎フレームの計算を「絵を引く」だけにして、描き込みを増やしつつスマホの負荷を下げる。
import { OUT_GLSL, NOISE_GLSL } from './shaders.js';

// 継ぎ目なく並ぶノイズ（周期 per）
const TILE_GLSL = /* glsl */ `
varying vec2 vUv;
float h21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 h22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float pn(vec2 p, vec2 per) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = h21(mod(i, per)), b = h21(mod(i + vec2(1.0, 0.0), per));
  float c = h21(mod(i + vec2(0.0, 1.0), per)), d = h21(mod(i + vec2(1.0, 1.0), per));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float pfbm(vec2 p, vec2 per, int oct) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int k = 0; k < 8; k++) {
    if (k >= oct) break;
    s += pn(p, per) * a; n += a;
    p = p * 2.0 + vec2(13.0, 7.0); per *= 2.0; a *= 0.5;
  }
  return s / n;
}
// 升目のノイズ：x=最寄りの点までの距離 y=2番目 z=升の乱数
vec3 pvor(vec2 p, vec2 per) {
  vec2 i = floor(p), f = fract(p);
  float d1 = 9.0, d2 = 9.0, id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(float(x), float(y));
    vec2 c = mod(i + o, per);
    vec2 r = o + h22(c) - f;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = h21(c + 7.3); } else if (d < d2) d2 = d;
  }
  return vec3(sqrt(d1), sqrt(d2), id);
}
`;

// texA：R=大きなむら G=粒 B=ひび A=筆の筋（u 方向に長い）
export const DETAIL_A_FRAG = /* glsl */ `
${TILE_GLSL}
void main() {
  vec2 uv = vUv;
  vec2 warp = vec2(pfbm(uv * 4.0, vec2(4.0), 4), pfbm(uv * 4.0 + vec2(1.7, 5.2), vec2(4.0), 4)) - 0.5;
  float m = pfbm(uv * 3.0 + warp * 1.6, vec2(3.0), 6);
  float g = pfbm(uv * 72.0 + warp * 2.0, vec2(72.0), 3);
  float sp = smoothstep(0.78, 0.9, pn(uv * 220.0, vec2(220.0)));
  float sp2 = smoothstep(0.8, 0.92, pn(uv * 150.0 + 3.3, vec2(150.0)));
  vec3 v1 = pvor(uv * 5.0 + warp * 0.9, vec2(5.0));
  float e1 = 1.0 - smoothstep(0.0, 0.05, v1.y - v1.x);
  vec3 v2 = pvor(uv * 14.0 + warp * 1.5, vec2(14.0));
  float e2 = (1.0 - smoothstep(0.0, 0.07, v2.y - v2.x)) * smoothstep(0.5, 0.62, pfbm(uv * 4.0 + 2.9, vec2(4.0), 3));
  float brk = smoothstep(0.3, 0.55, pfbm(uv * 9.0 + 8.1, vec2(9.0), 3));
  float sA = pfbm(vec2(uv.x * 5.0, uv.y * 90.0) + vec2(warp.x * 0.6, warp.y * 5.0), vec2(5.0, 90.0), 4);
  gl_FragColor = vec4(
    smoothstep(0.22, 0.78, m),
    clamp(0.5 + (g - 0.5) * 1.5 - sp * 0.45 + sp2 * 0.35, 0.0, 1.0),
    max(e1 * brk, e2 * 0.8),
    smoothstep(0.2, 0.8, sA));
}`;

// texB：R=苔のむら G=垂れ汚れ（v 方向に長い） B=塗りのはげ A=かすれた筆（u 方向に長い）
export const DETAIL_B_FRAG = /* glsl */ `
${TILE_GLSL}
void main() {
  vec2 uv = vUv;
  vec2 warp = vec2(pfbm(uv * 4.0 + 9.1, vec2(4.0), 4), pfbm(uv * 4.0 + vec2(3.7, 2.2), vec2(4.0), 4)) - 0.5;
  float mo = pfbm(uv * 6.0 + warp * 1.2, vec2(6.0), 5);
  float dr = pn(vec2(uv.x * 46.0, uv.y * 2.5) + vec2(warp.y * 0.8, 0.0), vec2(46.0, 2.5));
  float drm = smoothstep(0.35, 0.7, pfbm(uv * vec2(7.0, 3.0) + 4.4, vec2(7.0, 3.0), 3));
  float pe = pfbm(uv * 8.0 + warp * 2.2, vec2(8.0), 5);
  float chips = pn(uv * 60.0 + warp * 3.0, vec2(60.0));
  float db = pfbm(vec2(uv.x * 18.0, uv.y * 160.0) + warp * vec2(1.0, 6.0), vec2(18.0, 160.0), 3);
  float dm = pfbm(uv * 9.0 + 6.6, vec2(9.0), 3);
  gl_FragColor = vec4(
    clamp(smoothstep(0.25, 0.75, mo) + (pn(uv * 110.0, vec2(110.0)) - 0.5) * 0.18, 0.0, 1.0),
    smoothstep(0.62, 0.95, dr) * drm,
    clamp(smoothstep(0.2, 0.8, pe) + (chips - 0.5) * 0.22, 0.0, 1.0),
    smoothstep(0.55, 0.7, db) * smoothstep(0.45, 0.65, dm));
}`;

// 空の絵（全天。u=方位、v=仰角を地平寄りに細かく）。雲は夕日側の縁と腹が染まる
const SKY_MAP_GLSL = /* glsl */ `
const float SKY_EL0 = 0.12;
const float SKY_POW = 0.6;
vec2 skyUv(vec3 d) {
  float u = atan(d.x, d.z) / 6.2831853 + 0.5;
  float el = asin(clamp(d.y, -1.0, 1.0));
  return vec2(u, pow(clamp((el + SKY_EL0) / (1.5707963 + SKY_EL0), 0.0, 1.0), SKY_POW));
}
vec3 skyDir(vec2 uv) {
  float az = (uv.x - 0.5) * 6.2831853;
  float el = pow(uv.y, 1.0 / SKY_POW) * (1.5707963 + SKY_EL0) - SKY_EL0;
  return vec3(sin(az) * cos(el), sin(el), cos(az) * cos(el));
}
`;

export const SKY_BAKE_FRAG = /* glsl */ `
${OUT_GLSL}
${NOISE_GLSL}
${SKY_MAP_GLSL}
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
uniform vec4 uSky; // x=うろこ雲の量 y=雲の量 z=（未使用） w=色の境のにじみ
varying vec2 vUv;
void main() {
  vec3 d = skyDir(vUv);
  vec3 s = normalize(uSunDir);
  float e = d.y;
  float az = dot(normalize(d.xz + 1e-5), normalize(s.xz));
  float sunSide = smoothstep(-0.3, 1.0, az);
  float h = clamp(e + (fbm2(d.xz * 2.5 / (abs(e) + 0.35)) - 0.5) * 0.1 * uSky.w, -0.2, 1.0);
  // 地平から天頂へ：淡い黄桃 → 橙桃 → 藤 → 青鼠
  vec3 horizon = mix(uSkyHorizonFar, uSkyHorizonSun, pow(sunSide, 5.0));
  vec3 col = mix(horizon, uSkyLow, smoothstep(0.0, 0.09 + 0.05 * sunSide, h));
  col = mix(col, uSkyMid, smoothstep(0.07 + 0.05 * sunSide, 0.3, h));
  col = mix(col, uSkyTop, smoothstep(0.2, 0.62, h) * (1.0 - 0.4 * sunSide));
  // 雲：大きな塊をゆがめ、小さなちぎれ雲を重ねる
  vec2 cp = d.xz / (max(e, 0.0) + 0.2);
  vec2 st = vec2(dot(cp, vec2(s.z, -s.x)), dot(cp, s.xz));
  vec2 q = st * vec2(0.42, 1.25);
  vec2 wv = vec2(fbm2(q * 0.7 + 11.0), fbm2(q * 0.7 + 47.0)) - 0.5;
  float c = fbm2(q + wv * 1.6);
  float cs = fbm2(q + wv * 1.6 + vec2(0.0, 0.22));
  float puff = fbm2(q * 3.3 + wv * 3.0 + 5.0);
  float ripple = fbm2(q * vec2(7.0, 9.0) + wv * 4.0 + 21.0);
  float field = c * 0.52 + puff * 0.28 + ripple * 0.2;
  float cover = mix(0.56, 0.4, smoothstep(0.06, 0.5, h)) - (uSky.y - 0.5) * 0.3;
  float dens = smoothstep(cover, cover + 0.14, field) * smoothstep(-0.01, 0.05, e);
  float under = clamp((c - cs) * 4.5 + 0.5, 0.0, 1.0); // 夕日を向いた側
  float lowness = max(smoothstep(0.62, 0.04, h), sunSide * sunSide * 0.85);
  vec3 cc = mix(uCloudDark, mix(uSkyMid * 1.15, uCloudLit, lowness), under * (0.35 + 0.65 * lowness * (0.45 + 0.55 * sunSide)));
  float rimBand = smoothstep(0.0, 0.35, dens) * (1.0 - smoothstep(0.35, 0.8, dens));
  cc = mix(cc, uCloudEdge, rimBand * lowness * (0.3 + 0.7 * sunSide));
  col = mix(col, cc, dens * 0.92);
  // うろこ雲：小さな雲片が列になって並ぶ。夕日を向いた下側の縁が染まり、上側は青鼠に沈む
  vec2 sq = vec2(atan(d.x, d.z), asin(clamp(e, -1.0, 1.0))) + wv * 0.05;
  sq = vec2(sq.x + sq.y * 0.5, sq.y - sq.x * 0.12); // 列を少し斜めに
  float rowsK = sin(sq.y * 44.0 + fbm2(sq * 3.0 + 3.0) * 7.0) * 0.5 + 0.5;
  float cellA = vnoise2(sq * vec2(17.0, 27.0) + 2.0) * 0.7 + vnoise2(sq * vec2(36.0, 52.0) + 9.0) * 0.3;
  float cellB = vnoise2(sq * vec2(17.0, 27.0) + vec2(2.0, 2.25)) * 0.7 + vnoise2(sq * vec2(36.0, 52.0) + vec2(9.0, 9.4)) * 0.3;
  float fleckArea = smoothstep(0.3, 0.5, fbm2(sq * 2.2 + 31.0));
  float fleck = smoothstep(0.47, 0.6, cellA * 0.72 + rowsK * 0.28) * fleckArea * smoothstep(0.02, 0.12, e) * (1.0 - dens * 0.5);
  float fleckLit = clamp((cellA - cellB) * 4.0 + 0.45, 0.0, 1.0);
  vec3 fc = mix(uCloudDark * 0.95, mix(uCloudLit, uCloudEdge, 0.4 * sunSide), fleckLit * (0.35 + 0.65 * max(lowness, sunSide)));
  col = mix(col, fc, fleck * uSky.x);
  // 地平近くの横筋の雲
  float sk = fbm2(vec2(st.x * 0.25, st.y * 5.0) + 3.0);
  float band = smoothstep(0.5, 0.68, sk) * smoothstep(0.17, 0.02, h) * smoothstep(-0.005, 0.02, e);
  col = mix(col, mix(uCloudLit, uCloudDark, 0.4), band * 0.65);
  // 夕日のまわりのにじんだ光
  float ang = acos(clamp(dot(d, s), -1.0, 1.0));
  col += uSunCol * exp(-ang * 5.0) * 0.34;
  gl_FragColor = vec4(toDisplay(col), 1.0);
}`;

export const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0);
  gl_Position = p.xyww;
}`;

// 毎フレーム：焼いた空の絵を引き、夕日の円盤だけ上に描く（色は表示用の値）
export const SKY_FRAG = /* glsl */ `
${SKY_MAP_GLSL}
uniform sampler2D uSkyTex;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform vec3 uSunCore;
uniform vec4 uSky; // x=夕日の半径(rad)
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  vec3 col = texture2D(uSkyTex, skyUv(d)).rgb;
  float ang = acos(clamp(dot(d, normalize(uSunDir)), -1.0, 1.0));
  float wob = sin(atan(d.x, d.y) * 23.0) * 0.012 + sin(atan(d.x, d.y) * 61.0) * 0.006;
  float disc = smoothstep(uSky.x * (1.03 + wob), uSky.x * (0.97 + wob), ang);
  col = mix(col, mix(uSunCol, uSunCore, smoothstep(uSky.x, 0.0, ang) * 0.6), disc);
  gl_FragColor = vec4(col, 1.0);
}`;
