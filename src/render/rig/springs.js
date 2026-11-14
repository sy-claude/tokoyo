// 二次的な揺れ（07 6.5、09 8.3）。袖・髪・鉢巻の尾などを角度のばねで揺らす。見た目だけの状態で、シムに影響しない。
// 各ばね骨：θ'' = −k(θ−θ0) − c·θ' − a·gainMul（c = 2·減衰比·√k）。1/60s 固定で実tickごとに積分し、±limitDeg で止める。
// a は親の骨の座標で見た加速度：キャラの根の加速度（シムの速度の変化）＋待機のそよ風（M1a で追加）。
// 加速度には springAccelMul を掛ける（式のままの単位では揺れがほとんど見えないため。PROGRESS に記録）。
/** @import {SpringDef, V3} from '../../data/types.js' */
/** @import {Cfg} from '../../config/index.js' */
import { Quaternion, Vector3 } from 'three';
import { DEG2RAD } from '../../core/math.js';
import { TICK_RATE_HZ } from '../../core/units.js';
import { dirFromAzEl } from '../stage/light.js';

const TAU = Math.PI * 2;
const QUAT = 4; // num-ok: 四元数の要素数

/**
 * 1本のばねを 1/60s 進める。純関数（状態を新しい値で返す）。
 * @param {number} angle 今の角度（rad） @param {number} vel 角速度（rad/s） @param {number} rest 釣り合いの角度（rad）
 * @param {number} drive 外からの角加速度（rad/s²） @param {number} limit 角度の上限（rad）
 * @param {{springKRatio:number, springDampingRatio:number}} an
 * @returns {[number, number]} [角度, 角速度]
 */
export function stepSpring(angle, vel, rest, drive, limit, an) {
  const dt = 1 / TICK_RATE_HZ;
  const c = 2 * an.springDampingRatio * Math.sqrt(an.springKRatio);
  const v = vel + (-an.springKRatio * (angle - rest) - c * vel + drive) * dt;
  const a = angle + v * dt;
  if (a > limit) return [limit, 0];
  if (a < -limit) return [-limit, 0];
  return [a, v];
}

/**
 * そよ風の加速度（世界座標、m/s²）。時刻とばねの番号だけで決まる（乱数・時計を使わない）。
 * @param {number} tick 実tick @param {number} phase ばねごとの位相（rad） @param {Cfg['anim']} an @param {Vector3} out
 */
export function breezeAccel(tick, phase, an, out) {
  const t = tick / TICK_RATE_HZ;
  const sway = (1 + Math.sin((TAU * t) / an.breezeSwayS + phase)) / 2;
  const flutter = 1 + an.breezeFlutterRatio * Math.sin((TAU * t) / an.breezeFlutterS + phase * 2);
  const d = dirFromAzEl(an.breezeAzimuthDeg, 0);
  const a = an.breezeAccelMps2 * sway * flutter;
  return out.set(d[0] * a, 0, d[2] * a);
}

/**
 * @param {SpringDef[]} defs
 * @param {any[]} bones  Bone の配列 @param {Record<string, number>} boneIndex
 * @param {Cfg['anim']} an
 */
export function createSprings(defs, bones, boneIndex, an) {
  const items = defs.map((def, i) => {
    const restX = (def.restDeg?.[0] ?? 0) * DEG2RAD;
    const restZ = (def.restDeg?.[1] ?? 0) * DEG2RAD;
    return { def, idx: boneIndex[def.bone], bone: bones[boneIndex[def.bone]], phase: i, restX, restZ, x: restX, z: restZ, vx: 0, vz: 0 };
  });
  const world = new Vector3();
  const local = new Vector3();
  const parentQ = new Quaternion();
  const springQ = new Quaternion();

  return {
    count: items.length,
    /** 揺れを釣り合いの位置へ戻す（場面の読込・大きく時間が飛んだとき）。 */
    reset() {
      for (const s of items) {
        s.x = s.restX;
        s.z = s.restZ;
        s.vx = 0;
        s.vz = 0;
      }
    },
    /**
     * n tick 進める。
     * @param {number} n 進める tick 数 @param {number} tick0 最初の tick の番号
     * @param {V3} rootAccel キャラの根の加速度（世界座標、m/s²。この n tick の間は一定とみなす）
     */
    step(n, tick0, rootAccel) {
      const mag = Math.hypot(rootAccel[0], rootAccel[1], rootAccel[2]);
      const k = mag > an.springAccelMaxMps2 ? an.springAccelMaxMps2 / mag : 1;
      for (const s of items) {
        // 親の骨の向き（直前に描いたときの行列。1フレーム古くてよい）
        parentQ.setFromRotationMatrix(s.bone.parent.matrixWorld).invert();
        const limit = s.def.limitDeg * DEG2RAD;
        const gain = s.def.gainMul * an.springAccelMul;
        for (let i = 0; i < n; i++) {
          breezeAccel(tick0 + i, s.phase, an, world);
          local.set(world.x + rootAccel[0] * k, world.y + rootAccel[1] * k, world.z + rootAccel[2] * k).applyQuaternion(parentQ);
          // 親が +Z へ加速すると先は −Z へ遅れる（X 回転が正）。+X へ加速すると先は −X へ遅れる（Z 回転が負）
          [s.x, s.vx] = stepSpring(s.x, s.vx, s.restX, local.z * gain, limit, an);
          if (s.def.axes === 'xz') [s.z, s.vz] = stepSpring(s.z, s.vz, s.restZ, -local.x * gain, limit, an);
        }
      }
    },
    /**
     * ばね骨の回転を骨に書く：ポーズの回転（poseAt の出力）× ばねの回転。
     * @param {Float32Array} pose poseAt の出力
     */
    apply(pose) {
      for (const s of items) {
        // Euler 'XYZ'（x, 0, z）の四元数
        const cx = Math.cos(s.x / 2);
        const sx = Math.sin(s.x / 2);
        const cz = Math.cos(s.z / 2);
        const sz = Math.sin(s.z / 2);
        springQ.set(sx * cz, -sx * sz, cx * sz, cx * cz);
        s.bone.quaternion.fromArray(pose, s.idx * QUAT).multiply(springQ);
      }
    },
    /** 試験用：今の角度（度）。 @returns {{bone:string, xDeg:number, zDeg:number}[]} */
    snapshot() {
      return items.map((s) => ({ bone: s.def.bone, xDeg: s.x / DEG2RAD, zDeg: s.z / DEG2RAD }));
    },
  };
}
