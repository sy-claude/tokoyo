// 二次的な揺れ（07 §6.5・09 §8.3）：袖・袴・髪・鉢巻の尾。見た目だけの状態で、シムに影響しない。
// 各ばねの骨は、親の骨の世界加速度（親の向きに直した値）を入力にした角度のばね：
//   θ'' = −k(θ−θ0) − c·θ' − a·gainMul·inputMul、c＝2·減衰比·√k。1/60s 固定で実tickごとに積分し、角度は ±limitDeg で止める。
// θ は X 軸（前後）と Z 軸（左右）の2つ。骨は −Y に垂れる前提：前（+Z）へ加速すると後ろへ遅れる（X の正）、+X へ加速すると −X へ遅れる（Z の負）。
/** @import {SpringDef} from '../../data/lookdev/rigs.js' */
import { Euler, Quaternion, Vector3 } from 'three';
import { DEG2RAD } from '../../core/math.js';

const e = new Euler();
const q = new Quaternion();
const pq = new Quaternion();
const p = new Vector3();
const vel = new Vector3();
const acc = new Vector3();

/**
 * @param {SpringDef[]} defs
 * @param {Map<string, any>} bonesByName three の Bone
 */
export function createSprings(defs, bonesByName) {
  const state = defs.map((d) => ({
    def: d,
    bone: bonesByName.get(d.bone),
    thx: 0,
    thz: 0,
    wx: 0,
    wz: 0,
    prev: new Vector3(),
    prevVel: new Vector3(),
    samples: 0,
  }));
  for (const s of state) if (!s.bone) throw new Error(`springs: 骨が無い ${s.def.bone}`);
  return {
    /** 状態を捨てる（場面を作り直したとき・時間が大きく飛んだとき）。 */
    reset() {
      for (const s of state) {
        s.thx = 0;
        s.thz = 0;
        s.wx = 0;
        s.wz = 0;
        s.samples = 0;
      }
    },
    /**
     * 1tick 進める。呼ぶ前に骨の世界行列を今の tick の姿勢で更新しておくこと（親の位置を読む）。
     * @param {number} dt 1tick の秒 @param {{springKRatio:number, springDampingRatio:number, springInputMul:number}} A
     */
    step(dt, A) {
      const k = A.springKRatio;
      const c = 2 * A.springDampingRatio * Math.sqrt(k);
      for (const s of state) {
        const parent = s.bone.parent;
        parent.getWorldPosition(p);
        if (s.samples > 0) vel.copy(p).sub(s.prev).divideScalar(dt);
        else vel.set(0, 0, 0);
        if (s.samples > 1) acc.copy(vel).sub(s.prevVel).divideScalar(dt);
        else acc.set(0, 0, 0);
        s.prev.copy(p);
        s.prevVel.copy(vel);
        s.samples = Math.min(s.samples + 1, 2);
        // 親の向きに直す
        parent.getWorldQuaternion(pq);
        acc.applyQuaternion(pq.invert());
        const g = s.def.gainMul * A.springInputMul;
        const lim = s.def.limitDeg * DEG2RAD;
        s.wx += (-k * s.thx - c * s.wx + acc.z * g) * dt;
        s.thx = Math.max(-lim, Math.min(lim, s.thx + s.wx * dt));
        if (s.def.axes === 'xz') {
          s.wz += (-k * s.thz - c * s.wz - acc.x * g) * dt;
          s.thz = Math.max(-lim, Math.min(lim, s.thz + s.wz * dt));
        }
      }
    },
    /** 揺れを骨の回転に重ねる（ポーズで決めた回転の後に掛ける）。 */
    apply() {
      for (const s of state) {
        q.setFromEuler(e.set(s.thx, 0, s.thz, 'XYZ'));
        s.bone.quaternion.multiply(q);
      }
    },
  };
}
