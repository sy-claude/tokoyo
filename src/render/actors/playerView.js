// 主人公の表示（09 1.4）。シムのプレイヤーの状態を読み、補間して、剛体スキンの1メッシュ（＋輪郭・武器）を置く。
// ポーズは poseAt（純関数）、揺れものは springs（見た目だけの状態）、まばたきは描画側の乱数（シムの乱数は使わない）。
/** @import {Cfg} from '../../config/index.js' */
/** @import {CharacterLook} from '../../data/characters.js' */
/** @import {V3} from '../../data/types.js' */
import { DEG2RAD, lerp, lerpDeg } from '../../core/math.js';
import { createRng, presentationSeed } from '../../core/rng.js';
import { TICK_RATE_HZ } from '../../core/units.js';
import { createOutlineMaterial } from '../materials/outline.js';
import { createToonMaterial } from '../materials/toon.js';
import { buildRig } from '../rig/buildRig.js';
import { faceRowShift } from '../rig/face.js';
import { makePoseRig, poseAt, poseSize } from '../rig/pose.js';
import { createSprings } from '../rig/springs.js';

const QUAT = 4; // num-ok: 四元数の要素数

/**
 * @param {CharacterLook} look  キャラの見た目（data/characters.js）
 * @param {{cfg:Cfg, toonShared:ReturnType<typeof import('../materials/toon.js').createToonShared>,
 *   outlineShared:ReturnType<typeof import('../materials/outline.js').createOutlineShared>, faceTexture:any, seed:number}} ctx
 *   seed＝ワールドの種（まばたきの乱数の種にする。シムの乱数とは別の流れ）
 */
export function createPlayerView(look, ctx) {
  const { cfg } = ctx;
  const an = cfg.anim;
  const bodyMaterial = createToonMaterial(ctx.toonShared, { rimColor: cfg.palette.rimHero, faceTexture: ctx.faceTexture });
  const outlineMaterial = createOutlineMaterial(ctx.outlineShared, { px: cfg.render.outlineHeroPx, color: cfg.palette.ink });
  const rig = buildRig(look.rig, { cfg, bodyMaterial, outlineMaterial });
  const poseRig = makePoseRig(look.rig, an);
  const pose = new Float32Array(poseSize(poseRig));
  const springs = createSprings(look.rig.springs, rig.bones, rig.boneIndex, an);
  const n = rig.bones.length;

  let lastTick = -1;
  /** @type {V3} */
  let lastVel = [0, 0, 0];
  // まばたき：描画側の乱数（時計は使わない。同じ tick の列なら同じ結果になり、撮影が安定する）
  const blinkSeed = presentationSeed(ctx.seed);
  let blinkRng = createRng(blinkSeed);
  let blinkAt = 0;

  function scheduleBlink(tick) {
    blinkAt = tick + Math.round(blinkRng.range(an.blinkMinS, an.blinkMaxS) * TICK_RATE_HZ);
  }

  function restart(tick, vel) {
    springs.reset();
    lastVel = [vel[0], vel[1], vel[2]];
    blinkRng = createRng(blinkSeed);
    scheduleBlink(tick);
  }

  return {
    object: rig.group,
    rig,
    springs,
    /**
     * @param {{pos:V3, prevPos:V3, yawDeg:number, prevYawDeg:number, vel:V3, localF:number, scale:number, hitstopUntil:number}} e シムのプレイヤー（読むだけ）
     * @param {number} alpha 前tick→今tickの補間（0〜1）
     * @param {number} tick 実tick
     */
    update(e, alpha, tick) {
      rig.group.position.set(lerp(e.prevPos[0], e.pos[0], alpha), lerp(e.prevPos[1], e.pos[1], alpha), lerp(e.prevPos[2], e.pos[2], alpha));
      rig.group.rotation.y = lerpDeg(e.prevYawDeg, e.yawDeg, alpha) * DEG2RAD;

      // 揺れもの：進んだ tick の数だけ積分する（ヒットストップ中は止める）
      const dTicks = tick - lastTick;
      if (lastTick < 0 || dTicks < 0 || dTicks > an.springResetGapF) {
        restart(tick, e.vel);
      } else if (dTicks > 0) {
        if (e.hitstopUntil <= tick) {
          const k = TICK_RATE_HZ / dTicks;
          springs.step(dTicks, lastTick, [(e.vel[0] - lastVel[0]) * k, (e.vel[1] - lastVel[1]) * k, (e.vel[2] - lastVel[2]) * k]);
        }
        lastVel = [e.vel[0], e.vel[1], e.vel[2]];
      }
      lastTick = tick;

      // ポーズ：局所時間を前後tickで補間して渡す
      poseAt(poseRig, null, 0, { tF: e.localF - e.scale * (1 - alpha) }, pose);
      for (let i = 0; i < n; i++) rig.bones[i].quaternion.fromArray(pose, i * QUAT);
      const bind = rig.bindPos[0];
      rig.bones[0].position.set(bind[0] + pose[n * QUAT], bind[1] + pose[n * QUAT + 1], bind[2] + pose[n * QUAT + 2]);
      springs.apply(pose);

      // まばたき
      if (tick >= blinkAt + an.blinkF) scheduleBlink(tick);
      const closed = tick >= blinkAt && tick < blinkAt + an.blinkF;
      bodyMaterial.uniforms.uFaceShift.value.y = faceRowShift(closed ? an.faceRowClosedCount : an.faceRowOpenCount, cfg.render);
      // 調整パネルで変えた値を反映する
      outlineMaterial.userData.uniforms.uOutlinePx.value = cfg.render.outlineHeroPx;
      bodyMaterial.uniforms.uRimColor.value.set(cfg.palette.rimHero);
    },
    /** 試験用：今の状態。 */
    snapshot() {
      return { springs: springs.snapshot(), blinkAt, drawCalls: rig.drawCalls };
    },
    dispose() {
      rig.dispose();
      bodyMaterial.dispose();
      outlineMaterial.dispose();
    },
  };
}
