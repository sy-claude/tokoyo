// 描画用カメラ。シムのカメラ（sim/camera.js の状態）を補間して写すだけ（不変条件3）。
// 画面揺れ（render/feel/shake.js）は M3b でここに足す。
/** @import {Cfg} from '../config/index.js' */
import { PerspectiveCamera } from 'three';
import { forwardYawPitch, lerp, lerpDeg } from '../core/math.js';

/** @param {Cfg} cfg */
export function createCameraView(cfg) {
  const three = new PerspectiveCamera(cfg.camera.camFovYDeg, 1, cfg.camera.camNearM, cfg.camera.camFarM);
  return {
    three,
    /**
     * @param {{pos:number[], yawDeg:number, pitchDeg:number, fovYDeg:number, prevPos:number[], prevYawDeg:number, prevPitchDeg:number}} cam シムのカメラ
     * @param {number} alpha 前tick→今tickの補間（0〜1）
     * @param {number} aspect 画面の横÷縦
     */
    update(cam, alpha, aspect) {
      const x = lerp(cam.prevPos[0], cam.pos[0], alpha);
      const y = lerp(cam.prevPos[1], cam.pos[1], alpha);
      const z = lerp(cam.prevPos[2], cam.pos[2], alpha);
      const f = forwardYawPitch(lerpDeg(cam.prevYawDeg, cam.yawDeg, alpha), lerp(cam.prevPitchDeg, cam.pitchDeg, alpha));
      three.position.set(x, y, z);
      three.lookAt(x + f[0], y + f[1], z + f[2]);
      three.fov = cam.fovYDeg;
      three.aspect = aspect;
      three.near = cfg.camera.camNearM;
      three.far = cfg.camera.camFarM;
      three.updateProjectionMatrix();
    },
  };
}
