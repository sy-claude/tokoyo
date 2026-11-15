// 見た目の試作（V1。?scene=lookdev）の描画。参考画像（水彩画）に近い場面を、すべてコードの形と色で作る。
// シムの状態（主人公の位置と向き・カメラ）を読んで補間して描くだけ（シムを import しない）。
// 描画命令：地形・小道具・草木・主人公・妖怪3・空・海・靄・舞う葉＝11、後処理は「中」+1、「高」+5。
/** @import {Cfg} from '../../config/index.js' */
import {
  BackSide, Color, DataTexture, DoubleSide, Group, InstancedBufferAttribute, InstancedBufferGeometry, LinearFilter,
  Matrix4, Mesh, PlaneGeometry, RedFormat, Scene, ShaderMaterial, SphereGeometry, UnsignedByteType, Vector3, Vector4,
} from 'three';
import { DEG2RAD, lerp, lerpDeg } from '../../core/math.js';
import { createRng, presentationSeed } from '../../core/rng.js';
import { scene as S } from '../../data/lookdev/scene.js';
import { models } from '../../data/lookdev/models.js';
import { createCameraView } from '../cameraView.js';
import { createBuilder } from './build.js';
import { HALF, N3, N4, TAU } from './consts.js';
import { addBareTrees, addDaisies, addGrass, addIslands, addMaple, addMapleBranches, addSenbon, addWires, placeAll } from './flora.js';
import { createPost } from './post.js';
import { LEAF_FRAG, LEAF_VERT, MIST_FRAG, MIST_VERT, SEA_FRAG, SEA_VERT, SKY_FRAG, SKY_VERT, WASH_FRAG, WASH_VERT } from './shaders.js';
import { createTerrain } from './terrain.js';

const col = (hex, gain = 1) => new Color(hex).multiplyScalar(gain);

/**
 * @param {ReturnType<typeof import('../renderer.js').createRenderer>} renderer
 * @param {Cfg} cfg
 */
export function createLookdevView(renderer, cfg) {
  const scene = new Scene();
  const cameraView = createCameraView(cfg);
  const lib = { models, palette: S.palette };
  const terrain = createTerrain(S.terrain, S.path);
  const post = createPost(cfg, S);
  const sun = new Vector3(S.sunDir[0], S.sunDir[1], S.sunDir[2]).normalize();
  /** @type {{dispose:()=>void}[]} */
  let disposables = [];
  /** @type {any} */
  let hero = null;
  /** @type {any} */
  let root = null;
  /** @type {any} */
  let sky = null;
  let builtQuality = '';
  /** @type {any} */
  let builtWorld = null;

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
  };
  const still = { value: new Vector4() }; // 動かない物の uWalk
  const heroWalk = { value: new Vector4() };

  function washMaterial(octaves, extraDefines, extraUniforms, walk) {
    const m = new ShaderMaterial({
      vertexShader: WASH_VERT,
      fragmentShader: WASH_FRAG,
      defines: { OCT: octaves, ...extraDefines },
      uniforms: { ...U, uWalk: walk, ...extraUniforms },
      vertexColors: true,
      side: DoubleSide,
    });
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
    const rng = createRng(presentationSeed(world.stage.seed));
    root = new Group();
    root.position.set(o[0], o[1], o[2]);
    scene.add(root);

    // 地形（石畳・裂け目・置き影はシェーダが描く。座標はワールドへ直して渡す）
    const toWorld3 = (p) => new Vector3(p[0] + o[0], p[1] + o[2], p[2]);
    const tb = createBuilder(lib);
    terrain.addTo(tb);
    const terrainMat = washMaterial(oct, { TERRAIN: 1, PATH_N: S.path.length, FIS_N: S.fissure.length, CAST_N: S.casters.length }, {
      uPath: { value: S.path.map(toWorld3) },
      uFis: { value: S.fissure.map(toWorld3) },
      uCaster: { value: S.casters.map((c) => new Vector4(c[0] + o[0], c[1] + o[2], c[2], c[N3])) },
      uPaveCol: { value: col(S.palette.pave) },
    }, still);
    root.add(meshOf(tb, terrainMat));

    // 小道具・木の枝・千本鳥居・島（動かない物を1つにまとめる）
    const washMat = washMaterial(oct, {}, {}, still);
    const sb = createBuilder(lib);
    placeAll(sb, S.placements, terrain);
    addSenbon(sb, S, terrain);
    addIslands(sb, S);
    addBareTrees(sb, S, terrain, rng.fork('trees'));
    addWires(sb, S);
    addMapleBranches(sb, S);
    root.add(meshOf(sb, washMat));

    // 草・野菊・紅葉（風で動く）
    const fb = createBuilder(lib);
    addGrass(fb, S, terrain, rng.fork('grass'), mul);
    addDaisies(fb, S, terrain, rng.fork('daisy'), mul);
    addMaple(fb, S, rng.fork('maple'), mul);
    // 草や葉は奥行きを書かない：後処理の輪郭線が細い葉の1枚ずつに付いて黒ずむのを防ぐ（ほかの不透明な物の後に描く）
    const floraMat = washMaterial(oct, {}, {}, still);
    floraMat.depthWrite = false;
    const flora = meshOf(fb, floraMat);
    flora.renderOrder = 1;
    root.add(flora);

    // 妖怪（1体＝1メッシュ。動かない）
    for (const y of S.yokai) {
      const yb = createBuilder(lib);
      placeAll(yb, [y], terrain);
      root.add(meshOf(yb, washMat));
    }

    // 主人公（1メッシュ＋1素材。歩きと布の動きは頂点シェーダ）
    const hb = createBuilder(lib);
    hb.addAll(models.hero.parts, new Matrix4(), {});
    hero = meshOf(hb, washMaterial(oct, {}, {}, heroWalk));
    scene.add(hero);

    // 空（カメラを中心にした球の内側）
    const skyGeo = new SphereGeometry(S.sky.radiusM, N4 * N4, N4 * N3);
    const skyMat = new ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      defines: { OCT: Math.max(2, oct) },
      uniforms: {
        uTime: U.uTime,
        uSunDir: U.uSunDir,
        uSkyTop: { value: col(S.sky.top) },
        uSkyMid: { value: col(S.sky.mid) },
        uSkyLow: { value: col(S.sky.low) },
        uSkyHorizonSun: { value: col(S.sky.horizonSun) },
        uSkyHorizonFar: { value: col(S.sky.horizonFar) },
        uCloudDark: { value: col(S.sky.cloudDark) },
        uCloudLit: { value: col(S.sky.cloudLit) },
        uCloudEdge: { value: col(S.sky.cloudEdge) },
        uSunCol: { value: col(S.sky.sun) },
        uSunCore: { value: col(S.sky.sunCore) },
        uSky: { value: new Vector4() },
      },
      side: BackSide,
      depthWrite: false,
    });
    sky = new Mesh(skyGeo, skyMat);
    sky.frustumCulled = false;
    sky.renderOrder = -1;
    scene.add(sky);
    disposables.push(skyGeo, skyMat);

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
    disposables.push(hmTex, seaGeo, seaMat);

    // 紫の靄（裂け目と石段から立ちのぼる）
    const mistRng = rng.fork('mist');
    const weightSum = S.mistSources.reduce((a, m) => a + m[N4], 0);
    const mistGeo = billboards(L.mistCount[q], (i, seed) => {
      let pick = mistRng.float() * weightSum;
      let src = S.mistSources[0];
      for (const m of S.mistSources) {
        src = m;
        pick -= m[N4];
        if (pick <= 0) break;
      }
      seed[i * N4] = src[0] + mistRng.range(-1, 1) * src[N3];
      seed[i * N4 + 1] = src[1] + mistRng.float() * HALF;
      seed[i * N4 + 2] = src[2] + mistRng.range(-1, 1) * src[N3];
      seed[i * N4 + N3] = mistRng.float();
    });
    const mistMat = new ShaderMaterial({
      vertexShader: MIST_VERT,
      fragmentShader: MIST_FRAG,
      defines: { OCT: 2 },
      uniforms: { uTime: U.uTime, uMist: { value: new Vector4() }, uMistCol: { value: col(S.mist.col) }, uMistCore: { value: col(S.mist.core) } },
      transparent: true,
      depthWrite: false,
    });
    const mist = new Mesh(mistGeo, mistMat);
    mist.frustumCulled = false;
    mist.renderOrder = 2;
    root.add(mist);
    disposables.push(mistMat);

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
    disposables.push(leafMat);

    // 毎フレーム cfg から書き換える uniform の置き場
    root.userData = { skyMat, seaMat, mistMat, leafMat };
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
    m.skyMat.uniforms.uSky.value.set(L.sunRadiusDeg * DEG2RAD, L.cloudRatio, L.cloudSpeedRatio, L.skyBleedRatio);
    m.seaMat.uniforms.uSea.value.set(L.seaSpeedRatio, L.seaGlitterRatio, L.seaFoamRatio, L.seaLaneRatio);
    m.mistMat.uniforms.uMist.value.set(L.mistSizeM, L.mistRiseRatio, L.mistAlphaRatio, L.mistRiseM);
    m.leafMat.uniforms.uLeaf.value.set(L.leafSizeM, L.leafFallMps, L.leafDriftMps, 0);
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
      hero.position.set(x, y, z);
      hero.rotation.y = lerpDeg(p.prevYawDeg, p.yawDeg, alpha) * DEG2RAD;
      const speed = Math.hypot(p.pos[0] - p.prevPos[0], p.pos[2] - p.prevPos[2]) * hz;
      const amount = Math.min(1, speed / cfg.movement.runSpeedMps);
      heroWalk.value.set(time * L.walkStepHz * TAU, amount, S.heroHipM, L.walkSwingDeg * DEG2RAD);
      U.uPlayer.value.set(x, y, z, L.shadowRatio);

      const [w, h] = renderer.viewPx();
      cameraView.update(world.camera, alpha, w / h);
      const q = renderer.quality;
      renderer.drawWith((three) => {
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
      post.dispose();
    },
  };
}
