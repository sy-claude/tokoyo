// 後処理（見た目の試作の品質「高」「中」）：場面を1度テクスチャへ描き、水彩の仕上げ（にじみ・縁のたまり・輪郭線・紙の目）を掛ける。
// 「高」は光のにじみ（縮小してぼかした明部）も足す。「低」はここを通らず直接描く。
import {
  DataTexture, DepthTexture, LinearFilter, Mesh, OrthographicCamera, PlaneGeometry, RGBAFormat, Scene, ShaderMaterial,
  UnsignedByteType, UnsignedIntType, Vector2, Vector4, WebGLRenderTarget, Color,
} from 'three';
import { BLUR_FRAG, POST_FRAG, POST_VERT } from './shaders.js';
import { N4 } from './consts.js';

/**
 * @param {import('../../config/index.js').Cfg} cfg
 * @param {any} S scene の記述（紙と墨の色）
 */
export function createPost(cfg, S) {
  const size = new Vector2(1, 1);
  const depth = new DepthTexture(1, 1);
  depth.type = UnsignedIntType;
  const rtScene = new WebGLRenderTarget(1, 1, { depthBuffer: true, depthTexture: depth, minFilter: LinearFilter, magFilter: LinearFilter });
  const rtA = new WebGLRenderTarget(1, 1, { depthBuffer: false, minFilter: LinearFilter, magFilter: LinearFilter });
  const rtB = new WebGLRenderTarget(1, 1, { depthBuffer: false, minFilter: LinearFilter, magFilter: LinearFilter });
  const black = new DataTexture(new Uint8Array(N4), 1, 1, RGBAFormat, UnsignedByteType);
  black.needsUpdate = true;

  const quadCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeo = new PlaneGeometry(2, 2);
  const blurMat = new ShaderMaterial({
    vertexShader: POST_VERT,
    fragmentShader: BLUR_FRAG,
    uniforms: { tSrc: { value: null }, uStep: { value: new Vector2() }, uThreshold: { value: 0 } },
    depthTest: false,
    depthWrite: false,
  });
  const postMat = new ShaderMaterial({
    vertexShader: POST_VERT,
    fragmentShader: POST_FRAG,
    defines: { OCT: 2 },
    uniforms: {
      tColor: { value: rtScene.texture },
      tDepth: { value: depth },
      tBloom: { value: black },
      uTexel: { value: new Vector2() },
      uView: { value: new Vector2() },
      uNearFar: { value: new Vector2() },
      uPaperCol: { value: new Color(S.palette.paper).convertLinearToSRGB() },
      uInkCol: { value: new Color(S.palette.ink).convertLinearToSRGB() },
      uWash: { value: new Vector4() },
      uLine: { value: new Vector4() },
      uTone: { value: new Vector4() },
      uGlow: { value: new Vector4() },
    },
    depthTest: false,
    depthWrite: false,
  });
  const quad = new Mesh(quadGeo, blurMat);
  quad.frustumCulled = false;
  const quadScene = new Scene();
  quadScene.add(quad);

  function pass(three, material, target) {
    quad.material = material;
    three.setRenderTarget(target);
    three.render(quadScene, quadCam);
  }

  return {
    /**
     * @param {any} three WebGLRenderer @param {any} scene @param {any} camera
     * @param {{bloom:boolean, viewPx:[number,number], time:number}} o
     */
    render(three, scene, camera, o) {
      const L = cfg.lookdev;
      three.getDrawingBufferSize(size);
      if (rtScene.width !== size.x || rtScene.height !== size.y) {
        rtScene.setSize(size.x, size.y);
        const bw = Math.max(1, Math.round(size.x / L.bloomDivCount));
        const bh = Math.max(1, Math.round(size.y / L.bloomDivCount));
        rtA.setSize(bw, bh);
        rtB.setSize(bw, bh);
      }
      const pr = size.x / o.viewPx[0];
      three.setRenderTarget(rtScene);
      three.render(scene, camera);

      const u = postMat.uniforms;
      if (o.bloom) {
        const bu = blurMat.uniforms;
        const sx = L.bloomSpreadPx / rtA.width;
        const sy = L.bloomSpreadPx / rtA.height;
        bu.tSrc.value = rtScene.texture;
        bu.uThreshold.value = L.bloomThresholdRatio;
        bu.uStep.value.set(sx, 0);
        pass(three, blurMat, rtA);
        bu.tSrc.value = rtA.texture;
        bu.uThreshold.value = 0;
        bu.uStep.value.set(0, sy);
        pass(three, blurMat, rtB);
        bu.tSrc.value = rtB.texture;
        bu.uStep.value.set(sx * 2, 0);
        pass(three, blurMat, rtA);
        bu.tSrc.value = rtA.texture;
        bu.uStep.value.set(0, sy * 2);
        pass(three, blurMat, rtB);
        u.tBloom.value = rtB.texture;
      } else {
        u.tBloom.value = black;
      }
      u.uTexel.value.set(pr / size.x, pr / size.y); // CSS px 1つぶん
      u.uView.value.set(o.viewPx[0], o.viewPx[1]);
      u.uNearFar.value.set(camera.near, camera.far);
      u.uWash.value.set(L.wobblePx, L.bleedPx, L.poolRatio, L.granulationRatio);
      u.uLine.value.set(L.outlineRatio, L.outlinePx, L.outlineDepthRatio, L.outlineColorRatio);
      u.uTone.value.set(L.saturationMul, L.contrastMul, L.paperLiftRatio, L.borderRatio);
      u.uGlow.value.set(o.bloom ? L.bloomRatio : 0, L.paperGrainRatio, 1, o.time);
      pass(three, postMat, null);
    },
    dispose() {
      rtScene.dispose();
      rtA.dispose();
      rtB.dispose();
      depth.dispose();
      black.dispose();
      quadGeo.dispose();
      blurMat.dispose();
      postMat.dispose();
    },
  };
}
