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
  col += uGlitterCol * pow(toSun, uSea.w * 0.5) * 0.05 * uSea.y;
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
  col = applyFog(col, cameraPosition + (vWorld - cameraPosition) * 0.3);
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
  vec3 col = mix(c0, avg, 0.3);
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
