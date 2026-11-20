// 見た目の試作（V1。?scene=lookdev）の描画。参考画像（水彩画）に近い場面を、すべてコードの形と色で作る。
// シムの状態（主人公の位置と向き・カメラ）を読んで補間して描くだけ（シムを import しない）。
// V2：面の質感は起動時に焼いたテクスチャ、空も焼いた絵、影は影の図（「低」は楕円の置き影）。
// 描画命令：場面11＋影の図6（高・中）＋後処理（中1・高5）。
/** @import {Cfg} from '../../config/index.js' */
import {
  BackSide, Color, DataTexture, DepthTexture, DoubleSide, Group, InstancedBufferAttribute, InstancedBufferGeometry, LinearFilter,
  Bone, Matrix4, Mesh, NearestFilter, Skeleton, SkinnedMesh, OrthographicCamera, PlaneGeometry, RedFormat, Scene, ShaderMaterial, SphereGeometry,
  UnsignedByteType, UnsignedIntType, Vector2, Vector3, Vector4, WebGLRenderTarget,
} from 'three';
import { DEG2RAD, forwardYawPitch, lerp, lerpDeg } from '../../core/math.js';
import { createRng, presentationSeed } from '../../core/rng.js';
import { scene as S } from '../../data/lookdev/scene.js';
import { models } from '../../data/lookdev/models.js';
import { createCameraView } from '../cameraView.js';
import { createBuilder, partMatrix } from './build.js';
import { createFaceAtlas, faceCellRect } from './faceAtlas.js';
import { faces } from '../../data/lookdev/faces.js';
import { yokaiMatrix } from './yokaiMotion.js';
import { heroSpringBones, heroSprings, humanBones } from '../../data/lookdev/rigs.js';
import { blinkAt, poseAt } from '../rig/pose.js';
import { createSprings } from '../rig/springs.js';
import { HALF, N3, N4, TAU } from './consts.js';
import { addBareTrees, addDaisies, addGrass, addFallenLeaves, addIslands, addMaple, addMapleBranches, addScatter, addSenbon, addWires, placeAll } from './flora.js';
import { createPost } from './post.js';
import { bakeDetail, bakeSky } from './bake.js';
import { LEAF_FRAG, LEAF_VERT, MIST_FRAG, MIST_VERT, SEA_FRAG, SEA_VERT } from './shaders.js';
import { SKY_FRAG, SKY_VERT } from './shadersBake.js';
import { SHADOW_FRAG, WASH_FRAG, WASH_VERT } from './shadersWash.js';
import { createTerrain } from './terrain.js';

const col = (hex, gain = 1) => new Color(hex).multiplyScalar(gain);

/**
 * @param {ReturnType<typeof import('../renderer.js').createRenderer>} renderer
 * @param {Cfg} cfg
 * @param {{atelierModel?:string|null, atelierFocus?:string|null, atelierAnim?:string|null, atelierView?:number[]|null}} [opts] 工房：形の名前を渡すと、その形だけを台の上に大きく映す（docs/12 4章）
 */
export function createLookdevView(renderer, cfg, opts = {}) {
  const atelier = opts.atelierModel && models[opts.atelierModel] ? opts.atelierModel : null;
  /** 工房で映す形の中心の高さと半径（カメラの距離を決める） */
  const atelierFrame = { y: 0, r: 1 };
  const scene = new Scene();
  const cameraView = createCameraView(cfg);
  const terrain = createTerrain(S.terrain, S.path);
  const post = createPost(cfg, S);
  const camDir = new Vector3();
  const heroMottle = { value: 1 };
  const heroTexScale = { value: new Vector4() };
  const sun = new Vector3(S.sunDir[0], S.sunDir[1], S.sunDir[2]).normalize();
  /** @type {{dispose:()=>void}[]} */
  let disposables = [];
  /** @type {any} */
  let hero = null;
  /** @type {any} */
  let root = null;
  /** @type {any} */
  let sky = null;
  /** 顔の絵（起動時に1度だけ描く） @type {any} */
  let faceTex = null;
  let builtQuality = '';
  /** @type {any} */
  let builtWorld = null;
  /** 焼いた質感テクスチャ（大きさごとに1度だけ焼く） @type {Map<number, ReturnType<typeof bakeDetail>>} */
  const detailCache = new Map();
  /** 影を落とす物（影の図を描くときだけ材質を差し替える） @type {{mesh:any, mat:any, shadowMat:any}[]} */
  let casters = [];
  /** 影を落とさない物（影の図を描く間は隠す） @type {any[]} */
  let nonCasters = [];
  /** 妖怪（毎フレーム身じろぎの行列を掛ける） @type {{mesh:any, place:Matrix4, motion:any}[]} */
  let yokai = [];
  const shadowCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  /** @type {any} */
  let shadowRT = null;
  const shadowBias = new Matrix4().makeTranslation(HALF, HALF, HALF).multiply(new Matrix4().makeScale(HALF, HALF, HALF));

  // ---- 全材質で共有する値（毎フレーム cfg から更新） ----
  const U = {
    uTime: { value: 0 },
    uSunDir: { value: sun },
    uFogWarm: { value: col(S.light.fogWarm) },
    uFogCool: { value: col(S.light.fogCool) },
    uFog: { value: new Vector4() },
    uWind: { value: new Vector3() },
    uLightCol: { value: col(S.light.lightCol, S.light.lightGain) },
    uShadeCol: { value: col(S.light.shadeCol, S.light.shadeGain) },
    uRimCol: { value: col(S.light.rimCol) },
    uMossCol: { value: col(S.palette.moss) },
    uPeelCol: { value: col(S.palette.peel) },
    uCrackCol: { value: col(S.palette.crack) },
    uReflWarm: { value: col(S.light.reflWarm) },
    uReflCool: { value: col(S.light.reflCool) },
    uGlowCol: { value: col(S.light.glowCol) },
    uLook: { value: new Vector4() },
    uPlayer: { value: new Vector4() },
    uTexA: { value: null },
    uTexB: { value: null },
    uTexScale: { value: new Vector4() },
    uShadowMap: { value: null },
    uShadowMat: { value: new Matrix4() },
    uShadowOffset: { value: 0 },
    uShadow: { value: new Vector4() },
    uInk: { value: new Vector4() },
    uFaceTex: { value: /** @type {any} */ (null) },
    uFaceShift: { value: new Vector2() },
    uTexMottleMul: { value: 1 },
  };
  // 主人公の骨組み（剛体スキン。07 §6.1・09 §8.2）。骨は humanBones の順
  const heroBoneDefs = [...humanBones, ...heroSpringBones];
  const heroRig = { bones: heroBoneDefs };
  const boneIndex = new Map(heroBoneDefs.map((b, i) => [b.name, i]));
  const heroPose = new Float32Array(heroBoneDefs.length * N4 + N3);
  /** @type {any[]} */
  let heroBones = [];
  /** 揺れ（ばね）の状態と、最後に積分した tick・その時の主人公の位置と向き @type {ReturnType<typeof createSprings>|null} */
  let springs = null;
  let springTick = -1;
  const springPos = new Vector3();

  function washMaterial(defines, extraUniforms) {
    const m = new ShaderMaterial({
      vertexShader: WASH_VERT,
      fragmentShader: WASH_FRAG,
      defines,
      uniforms: { ...U, ...extraUniforms },
      vertexColors: true,
      side: DoubleSide,
    });
    disposables.push(m);
    return m;
  }
  /** 影の図を描くときの材質（頂点の動きは同じ、色は書かない）。 */
  function shadowMaterial() {
    const m = new ShaderMaterial({
      vertexShader: WASH_VERT,
      fragmentShader: SHADOW_FRAG,
      uniforms: { uTime: U.uTime, uWind: U.uWind, uShadowMat: U.uShadowMat, uShadowOffset: U.uShadowOffset },
      vertexColors: true,
      side: DoubleSide,
    });
    m.colorWrite = false;
    disposables.push(m);
    return m;
  }

  function meshOf(builder, material) {
    const g = builder.toGeometry();
    disposables.push(g);
    const m = new Mesh(g, material);
    m.frustumCulled = false; // 風や歩きで頂点が動く。数も少ないので切り捨ての計算を省く
    return m;
  }

  /** カメラへ向く板のインスタンス（靄・舞う葉）。 */
  function billboards(count, fill) {
    const g = new InstancedBufferGeometry();
    const quad = new PlaneGeometry(2, 2);
    g.index = quad.index;
    g.setAttribute('position', quad.attributes.position);
    const seed = new Float32Array(count * N4);
    const tint = new Float32Array(count * N3);
    for (let i = 0; i < count; i++) fill(i, seed, tint);
    g.setAttribute('aSeed', new InstancedBufferAttribute(seed, N4));
    g.setAttribute('aTint', new InstancedBufferAttribute(tint, N3));
    g.instanceCount = count;
    disposables.push(g, quad);
    return g;
  }

  function clear() {
    if (root) scene.remove(root);
    if (hero) scene.remove(hero);
    if (sky) scene.remove(sky);
    for (const d of disposables) d.dispose();
    disposables = [];
    casters = [];
    yokai = [];
    nonCasters = [];
    shadowRT = null;
    root = null;
    hero = null;
    sky = null;
  }

  /** @param {any} world @param {import('../../config/index.js').QualityLevel} q */
  function build(world, q) {
    clear();
    const L = cfg.lookdev;
    const oct = L.octaveCount[q];
    const mul = L.floraMul[q];
    const o = world.stage.playerStart.pos;
    /** 顔の絵の升と貼る範囲（部品の face: '名前' から引く） */
    const faceOf = (name) => (faces[name] ? { ...faceCellRect(faces[name].cell), rect: faces[name].rect } : null);
    const lib = { models, palette: S.palette, aoGain: S.aoGain, segMul: L.meshDetailMul[q], faceOf };
    if (!faceTex) faceTex = createFaceAtlas(S.palette);
    U.uFaceTex.value = faceTex;
    const rng = createRng(presentationSeed(world.stage.seed));
    root = new Group();
    root.position.set(o[0], o[1], o[2]);
    scene.add(root);

    // 質感テクスチャ（焼くのは大きさごとに1度）
    let detail = detailCache.get(L.bakePx[q]);
    if (!detail) {
      detail = bakeDetail(renderer.three, L.bakePx[q]);
      detailCache.set(L.bakePx[q], detail);
    }
    U.uTexA.value = detail.texA;
    U.uTexB.value = detail.texB;

    // 影の図
    const useShadow = L.shadowOn[q];
    /** @type {Record<string, number>} */
    const baseDefines = { OCT: oct };
    if (L.triFull[q]) baseDefines.TRI_FULL = 1;
    if (useShadow) {
      baseDefines.SHADOWS = 1;
      const px = L.shadowMapPx[q];
      const depth = new DepthTexture(px, px);
      depth.type = UnsignedIntType;
      depth.minFilter = NearestFilter;
      depth.magFilter = NearestFilter;
      shadowRT = new WebGLRenderTarget(px, px, { depthBuffer: true, depthTexture: depth });
      U.uShadowMap.value = depth;
      disposables.push(shadowRT, depth);
    }
    const stillShadow = shadowMaterial();
    const addCaster = (mesh, shadowMat = stillShadow) => casters.push({ mesh, mat: mesh.material, shadowMat });

    // 地形（石畳・裂け目はシェーダが描く。座標はワールドへ直して渡す）
    const toWorld3 = (p) => new Vector3(p[0] + o[0], p[1] + o[2], p[2]);
    const tb = createBuilder(lib);
    if (atelier) tb.addAll(S.atelier.floorParts, new Matrix4(), {});
    else terrain.addTo(tb);
    const terrainMat = washMaterial({ ...baseDefines, TERRAIN: 1, PATH_N: S.path.length, FIS_N: S.fissure.length, CAST_N: S.casters.length }, {
      uPath: { value: S.path.map(toWorld3) },
      uFis: { value: S.fissure.map(toWorld3) },
      uCaster: { value: S.casters.map((c) => new Vector4(c[0] + o[0], c[1] + o[2], c[2], c[N3])) },
      uPaveCol: { value: col(S.palette.pave) },
    });
    const terrainMesh = meshOf(tb, terrainMat);
    root.add(terrainMesh);
    nonCasters.push(terrainMesh);

    // 小道具・木の枝・千本鳥居・島（動かない物を1つにまとめる）
    const washMat = washMaterial(baseDefines, {});
    const sb = createBuilder(lib);
    if (atelier) {
      if (atelier !== 'hero') sb.addAll(models[atelier].parts, new Matrix4(), {});
    } else {
      placeAll(sb, S.placements, terrain);
      addScatter(sb, S, terrain, rng.fork('scatter'), L.scatterMul[q]);
      addSenbon(sb, S, terrain);
      addIslands(sb, S);
      addBareTrees(sb, S, terrain, rng.fork('trees'));
      addWires(sb, S);
      addMapleBranches(sb, S);
    }
    const staticMesh = meshOf(sb, washMat);
    if (atelier) {
      staticMesh.geometry.computeBoundingSphere();
      atelierFrame.y = staticMesh.geometry.boundingSphere.center.y;
      atelierFrame.r = staticMesh.geometry.boundingSphere.radius;
      // 寄り：形ごとに登録した [中心の高さ, 半径]（全身・顔など）。無ければ形全体
      const f = S.atelier.focus[atelier]?.[opts.atelierFocus ?? 'all'];
      if (f) {
        atelierFrame.y = f[0];
        atelierFrame.r = f[1];
      }
    }
    root.add(staticMesh);
    addCaster(staticMesh);

    // 草・野菊・紅葉・落ち葉（風で動く）
    const fb = createBuilder(lib);
    if (!atelier) {
      addGrass(fb, S, terrain, rng.fork('grass'), mul);
      addDaisies(fb, S, terrain, rng.fork('daisy'), mul);
      addFallenLeaves(fb, S, terrain, rng.fork('fallen'), mul);
      addMaple(fb, S, rng.fork('maple'), mul);
    }
    // 草や葉は奥行きを書かない：後処理の輪郭線が細い葉の1枚ずつに付いて黒ずむのを防ぐ（ほかの不透明な物の後に描く）
    const floraMat = washMaterial(baseDefines, {});
    floraMat.depthWrite = false;
    const flora = meshOf(fb, floraMat);
    flora.renderOrder = 1;
    root.add(flora);
    addCaster(flora);

    // 妖怪（1体＝1メッシュ。形は自分の座標で作り、配置と身じろぎはメッシュの行列で掛ける）
    for (const y of atelier ? [] : S.yokai) {
      const yb = createBuilder(lib);
      yb.addAll(models[y.model].parts, new Matrix4(), {});
      const ym = meshOf(yb, washMat);
      const at = y.ground ? [y.at[0], y.at[1] + terrain.height(y.at[0], y.at[2]), y.at[2]] : y.at;
      const place = partMatrix({ at, rot: y.rot, scale: y.scale });
      ym.matrixAutoUpdate = false;
      ym.matrix.copy(place);
      root.add(ym);
      addCaster(ym);
      yokai.push({ mesh: ym, place, motion: y.motion });
    }

    // 主人公（1メッシュ＋1素材。骨組みは剛体スキン：部品ごとに骨を1本。布の揺れは頂点シェーダ）
    const hb = createBuilder({
      ...lib,
      boneIndex: (name) => {
        const i = boneIndex.get(name);
        if (i === undefined) throw new Error(`lookdev: 骨が無い ${name}`);
        return i;
      },
    });
    hb.addAll(models.hero.parts, new Matrix4(), {});
    const heroGeo = hb.toGeometry();
    disposables.push(heroGeo);
    heroBones = heroBoneDefs.map((d) => {
      const b = new Bone();
      b.name = d.name;
      b.position.set(d.posM[0], d.posM[1], d.posM[2]);
      return b;
    });
    heroBoneDefs.forEach((d, i) => {
      if (d.parent) heroBones[boneIndex.get(d.parent) ?? 0].add(heroBones[i]);
    });
    // 主人公：模様は形の座標で貼る（歩いても服の上を滑らない）。色むらは控えめ、模様は細かく
    hero = new SkinnedMesh(heroGeo, washMaterial({ ...baseDefines, LOCAL_TEX: 1 }, { uTexMottleMul: heroMottle, uTexScale: heroTexScale }));
    hero.frustumCulled = false;
    hero.add(heroBones[0]);
    hero.updateMatrixWorld(true);
    hero.bind(new Skeleton(heroBones));
    springs = createSprings(heroSprings, new Map(heroBones.map((b) => [b.name, b])));
    springTick = -1;
    scene.add(hero);
    hero.visible = !atelier || atelier === 'hero';
    addCaster(hero, shadowMaterial());

    // 空（焼いた絵を、カメラを中心にした球の内側に貼る）
    const skyBake = bakeSky(renderer.three, {
      uSunDir: { value: sun },
      uSkyTop: { value: col(S.sky.top) },
      uSkyMid: { value: col(S.sky.mid) },
      uSkyLow: { value: col(S.sky.low) },
      uSkyHorizonSun: { value: col(S.sky.horizonSun) },
      uSkyHorizonFar: { value: col(S.sky.horizonFar) },
      uCloudDark: { value: col(S.sky.cloudDark) },
      uCloudLit: { value: col(S.sky.cloudLit) },
      uCloudEdge: { value: col(S.sky.cloudEdge) },
      uSunCol: { value: col(S.sky.sun) },
      uSky: { value: new Vector4(L.cloudFleckRatio, L.cloudRatio, 0, L.skyBleedRatio) },
    }, L.skyPx[q], L.skyOctaveCount);
    const skyGeo = new SphereGeometry(S.sky.radiusM, N4 * N4, N4 * N3);
    const skyMat = new ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: {
        uSkyTex: { value: skyBake.tex },
        uSunDir: U.uSunDir,
        uSunCol: { value: col(S.sky.sun).convertLinearToSRGB() },
        uSunCore: { value: col(S.sky.sunCore).convertLinearToSRGB() },
        uSky: { value: new Vector4() },
      },
      side: BackSide,
      depthWrite: false,
    });
    sky = new Mesh(skyGeo, skyMat);
    sky.frustumCulled = false;
    sky.renderOrder = -1;
    scene.add(sky);
    nonCasters.push(sky);
    disposables.push(skyGeo, skyMat, skyBake);

    // 海（岸の泡は地形の高さの図から）
    const hm = terrain.heightMap();
    const hmTex = new DataTexture(hm.data, hm.n, hm.n, RedFormat, UnsignedByteType);
    hmTex.minFilter = LinearFilter;
    hmTex.magFilter = LinearFilter;
    hmTex.needsUpdate = true;
    const seaGeo = new PlaneGeometry(S.sea.sizeM, S.sea.sizeM);
    seaGeo.rotateX(-Math.PI / 2);
    const seaMat = new ShaderMaterial({
      vertexShader: SEA_VERT,
      fragmentShader: SEA_FRAG,
      defines: { OCT: Math.max(2, oct) },
      uniforms: {
        uTime: U.uTime,
        uSunDir: U.uSunDir,
        uFogWarm: U.uFogWarm,
        uFogCool: U.uFogCool,
        uFog: U.uFog,
        uTexA: U.uTexA,
        uHeightMap: { value: hmTex },
        uHeightRect: { value: new Vector4(hm.rect[0] + o[0], hm.rect[1] + o[2], 1 / (hm.rect[2] - hm.rect[0]), 1 / (hm.rect[N3] - hm.rect[1])) },
        uHeightRange: { value: S.terrain.heightRange },
        uSeaNear: { value: col(S.sea.near) },
        uSeaFar: { value: col(S.sea.far) },
        uSeaDeep: { value: col(S.sea.deep) },
        uFoamCol: { value: col(S.sea.foam) },
        uGlitterCol: { value: col(S.sea.glitter) },
        uSea: { value: new Vector4() },
      },
    });
    const sea = new Mesh(seaGeo, seaMat);
    sea.position.y = world.stage.seaLevelM - o[1];
    sea.frustumCulled = false;
    root.add(sea);
    sea.userData.hidden = Boolean(atelier);
    nonCasters.push(sea);
    disposables.push(hmTex, seaGeo, seaMat);

    // 煙のように上る板の群れ：紫の靄（裂け目と石段）と、白い波しぶき（岸の岩）
    const puffs = (name, sources, count, c0, c1) => {
      const pr = rng.fork(name);
      const weightSum = sources.reduce((a, m) => a + m[N4], 0);
      const geo = billboards(count, (i, seed) => {
        let pick = pr.float() * weightSum;
        let src = sources[0];
        for (const m of sources) {
          src = m;
          pick -= m[N4];
          if (pick <= 0) break;
        }
        seed[i * N4] = src[0] + pr.range(-1, 1) * src[N3];
        seed[i * N4 + 1] = src[1] + pr.float() * HALF;
        seed[i * N4 + 2] = src[2] + pr.range(-1, 1) * src[N3];
        seed[i * N4 + N3] = pr.float();
      });
      const mat = new ShaderMaterial({
        vertexShader: MIST_VERT,
        fragmentShader: MIST_FRAG,
        defines: { OCT: 2 },
        uniforms: { uTime: U.uTime, uMist: { value: new Vector4() }, uMistCol: { value: col(c0) }, uMistCore: { value: col(c1) } },
        transparent: true,
        depthWrite: false,
      });
      const mesh = new Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = 2;
      root.add(mesh);
      mesh.userData.hidden = Boolean(atelier);
      nonCasters.push(mesh);
      disposables.push(mat);
      return mat;
    };
    const mistMat = puffs('mist', S.mistSources, L.mistCount[q], S.mist.col, S.mist.core);
    const sprayMat = puffs('spray', S.spraySources, L.sprayCount[q], S.spray.col, S.spray.core);

    // 舞う紅葉
    const leafRng = rng.fork('leaf');
    const box = S.leafBox;
    const tmp = new Color();
    const leafGeo = billboards(L.leafCount[q], (i, seed, tint) => {
      seed[i * N4] = leafRng.range(-HALF, HALF) * box.size[0];
      seed[i * N4 + 1] = leafRng.float() * box.size[1];
      seed[i * N4 + 2] = leafRng.range(-HALF, HALF) * box.size[2];
      seed[i * N4 + N3] = leafRng.float();
      tmp.set(leafRng.pick(S.palette.maple));
      tint[i * N3] = tmp.r;
      tint[i * N3 + 1] = tmp.g;
      tint[i * N3 + 2] = tmp.b;
    });
    const leafMat = new ShaderMaterial({
      vertexShader: LEAF_VERT,
      fragmentShader: LEAF_FRAG,
      uniforms: {
        uTime: U.uTime,
        uSunDir: U.uSunDir,
        uFogWarm: U.uFogWarm,
        uFogCool: U.uFogCool,
        uFog: U.uFog,
        uWind: U.uWind,
        uLeaf: { value: new Vector4() },
        uLeafBox: { value: new Vector3(box.size[0], box.size[1], box.size[2]) },
      },
      side: DoubleSide,
    });
    const leaves = new Mesh(leafGeo, leafMat);
    leaves.position.set(box.center[0], box.center[1], box.center[2]);
    leaves.frustumCulled = false;
    root.add(leaves);
    leaves.userData.hidden = Boolean(atelier);
    nonCasters.push(leaves);
    disposables.push(leafMat);

    // 毎フレーム cfg から書き換える uniform の置き場
    for (const n of nonCasters) n.visible = !n.userData.hidden;
    root.userData = { skyMat, seaMat, mistMat, sprayMat, leafMat, origin: o };
    builtQuality = q;
    builtWorld = world;
  }

  /** cfg の値を uniform へ写す（調整パネルで変えた値がすぐ効く）。 */
  function syncUniforms(time) {
    const L = cfg.lookdev;
    const m = root.userData;
    U.uTime.value = time;
    U.uFog.value.set(L.fogDensityRatio, L.fogLowM, L.fogMaxRatio, L.fogSunSpreadRatio);
    // 風は海（左）から山（右）へ：鉢巻の尾と草が画面の右→左へ流れて見えるよう、向きは +X
    U.uWind.value.set(L.windM, L.windHz, L.windM * HALF * HALF);
    U.uLook.value.set(L.mottleRatio, L.rimRatio, L.wetRatio, 1 / L.paveCellM);
    U.uTexScale.value.set(1 / L.texLargeTileM, 1 / L.texFineTileM, 1 / L.texBTileM, L.grainRatio);
    heroTexScale.value.copy(U.uTexScale.value).multiplyScalar(L.heroTexScaleMul).setW(L.grainRatio);
    heroMottle.value = L.heroMottleRatio;
    U.uInk.value.set(L.inkCrackRatio, L.inkGrainRatio, L.paveJointM, 0);
    m.skyMat.uniforms.uSky.value.set(L.sunRadiusDeg * DEG2RAD, 0, 0, 0);
    m.seaMat.uniforms.uSea.value.set(L.seaSpeedRatio, L.seaGlitterRatio, L.seaFoamRatio, L.seaLaneRatio);
    m.mistMat.uniforms.uMist.value.set(L.mistSizeM, L.mistRiseRatio, L.mistAlphaRatio, L.mistRiseM);
    m.sprayMat.uniforms.uMist.value.set(L.spraySizeM, L.sprayRiseRatio, L.sprayAlphaRatio, L.sprayRiseM);
    m.leafMat.uniforms.uLeaf.value.set(L.leafSizeM, L.leafFallMps, L.leafDriftMps, 0);
    // 影の図：夕日の方角・決めた仰角から、場面の中心を見下ろす
    if (shadowRT) {
      const e = L.shadowElevDeg * DEG2RAD;
      const hx = sun.x / Math.hypot(sun.x, sun.z);
      const hz = sun.z / Math.hypot(sun.x, sun.z);
      const c = S.shadowCenter;
      const cx = c[0] + m.origin[0];
      const cy = c[1] + m.origin[1];
      const cz = c[2] + m.origin[2];
      const d = L.shadowDepthM * HALF;
      shadowCam.left = -L.shadowHalfM;
      shadowCam.right = L.shadowHalfM;
      shadowCam.top = L.shadowHalfM;
      shadowCam.bottom = -L.shadowHalfM;
      shadowCam.near = 0;
      shadowCam.far = L.shadowDepthM;
      shadowCam.position.set(cx + hx * Math.cos(e) * d, cy + Math.sin(e) * d, cz + hz * Math.cos(e) * d);
      shadowCam.lookAt(cx, cy, cz);
      shadowCam.updateProjectionMatrix();
      shadowCam.updateMatrixWorld();
      U.uShadowMat.value.copy(shadowBias).multiply(shadowCam.projectionMatrix).multiply(shadowCam.matrixWorldInverse);
      U.uShadowOffset.value = L.shadowOffsetM;
      U.uShadow.value.set(L.castShadowRatio, L.shadowBiasRatio, L.shadowSoftPx / shadowRT.width, L.strokeRatio);
    } else {
      U.uShadow.value.set(0, 0, 0, L.strokeRatio);
    }
  }

  /** 影の図を描く：影を落とす物だけ、奥行きだけを書く材質に差し替えて、光の側から描く。 */
  function renderShadow(three) {
    for (const n of nonCasters) n.visible = false;
    for (const c of casters) c.mesh.material = c.shadowMat;
    three.setRenderTarget(shadowRT);
    three.clear();
    three.render(scene, shadowCam);
    for (const c of casters) c.mesh.material = c.mat;
    for (const n of nonCasters) n.visible = !n.userData.hidden;
  }

  return {
    /** @param {any} world */
    setWorld(world) {
      build(world, renderer.quality);
    },
    /** @param {any} world @param {number} alpha */
    render(world, alpha) {
      if (!root || builtWorld !== world || builtQuality !== renderer.quality) build(world, renderer.quality);
      const L = cfg.lookdev;
      const hz = cfg.time.tickRateHz;
      const time = (world.tick + alpha) / hz;
      syncUniforms(time);

      const p = world.player;
      const x = lerp(p.prevPos[0], p.pos[0], alpha);
      const y = lerp(p.prevPos[1], p.pos[1], alpha);
      const z = lerp(p.prevPos[2], p.pos[2], alpha);
      // 姿勢：速さから歩き・走りを混ぜる（07 §6.6）。工房では &anim=walk|run で速さを決めて見る
      const simSpeed = Math.hypot(p.pos[0] - p.prevPos[0], p.pos[2] - p.prevPos[2]) * hz;
      const A = cfg.anim;
      const speed = opts.atelierAnim === 'walk' ? A.walkBlendFromMps : opts.atelierAnim === 'run' ? cfg.movement.runSpeedMps : simSpeed;
      const setPose = (/** @type {number} */ t) => {
        poseAt(heroRig, null, 0, { timeS: t, speedMps: speed, runSpeedMps: cfg.movement.runSpeedMps, tickRateHz: hz, anim: A }, heroPose);
        for (let i = 0; i < heroBones.length; i++) {
          heroBones[i].quaternion.set(heroPose[i * N4], heroPose[i * N4 + 1], heroPose[i * N4 + 2], heroPose[i * N4 + N3]);
        }
        const n4 = heroBones.length * N4;
        heroBones[0].position.set(heroPose[n4], heroPose[n4 + 1], heroPose[n4 + 2]);
      };
      // 揺れ：前に積分した tick から今の tick まで、1tick ずつ姿勢と位置を当てて積分する（描画の頻度によらず同じ結果）
      if (springs) {
        const now = world.tick;
        if (springTick < 0 || now < springTick || now - springTick > A.springCatchupMaxCount) {
          springs.reset();
          springTick = Math.max(0, now - A.springCatchupMaxCount);
          springPos.set(p.pos[0], p.pos[1], p.pos[2]);
        }
        const from = springTick;
        for (let k = from + 1; k <= now; k++) {
          const f = (k - from) / (now - from);
          hero.position.set(lerp(springPos.x, p.pos[0], f), lerp(springPos.y, p.pos[1], f), lerp(springPos.z, p.pos[2], f));
          hero.rotation.y = p.yawDeg * DEG2RAD;
          setPose(k / hz);
          hero.updateMatrixWorld(true);
          springs.step(1 / hz, A);
        }
        springTick = now;
        springPos.set(p.pos[0], p.pos[1], p.pos[2]);
      }
      hero.position.set(x, y, z);
      hero.rotation.y = lerpDeg(p.prevYawDeg, p.yawDeg, alpha) * DEG2RAD;
      setPose(time);
      springs?.apply();
      // まばたき：閉じた目の絵の升へずらす（主人公の顔だけが絵を持つ）
      const fh = faces.hero;
      const shut = blinkAt(time, A, hz);
      U.uFaceShift.value.set(shut * (faceCellRect(fh.blinkCell).u0 - faceCellRect(fh.cell).u0), shut * (faceCellRect(fh.blinkCell).v0 - faceCellRect(fh.cell).v0));
      U.uPlayer.value.set(x, y, z, L.shadowRatio);
      for (const k of yokai) yokaiMatrix(k.place, k.motion, time, k.mesh.matrix);

      const [w, h] = renderer.viewPx();
      cameraView.update(world.camera, alpha, w / h);
      if (atelier) {
        // 工房：向きはシムのカメラのまま、距離だけ形の大きさに合わせる（開発用の見本。遊びの場面では使わない）
        const c = cameraView.three;
        if (opts.atelierView) {
          // 視点を固定（&view=横の向き,縦の向き。度）：撮影で毎コマ同じ角度から見るため
          const f = forwardYawPitch(opts.atelierView[0], opts.atelierView[1]);
          camDir.set(f[0], f[1], f[2]);
        } else c.getWorldDirection(camDir);
        const d = atelierFrame.r * S.atelier.distMul;
        c.position.set(x - camDir.x * d, y + atelierFrame.y - camDir.y * d, z - camDir.z * d);
        c.lookAt(x, y + atelierFrame.y, z);
        c.updateMatrixWorld();
      }
      const q = renderer.quality;
      renderer.drawWith((three) => {
        if (shadowRT) renderShadow(three);
        if (L.postOn[q]) {
          post.render(three, scene, cameraView.three, { bloom: L.bloomOn[q], viewPx: [w, h], time });
        } else {
          three.setRenderTarget(null);
          three.render(scene, cameraView.three);
        }
      });
    },
    dispose() {
      clear();
      for (const d of detailCache.values()) d.dispose();
      detailCache.clear();
      post.dispose();
      faceTex?.dispose();
    },
  };
}
