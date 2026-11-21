// 骨の無い外部素材に、コードの人型の骨を付ける（11/21 の試し）。
// 体の各点が「どの骨に付いて動くか」を、骨の区間（関節→次の関節）からの近さで決める。近さは骨ごとの太さ（rM）で割った値で比べる
// （細い腕と太い胴を公平に比べるため）。区間の始まりより手前（関節より親の側）は遠く数え、親の骨に任せる。
// 1つの点に骨を最大4本、なめらかに混ぜる（関節のまわりがなめらかに曲がる）。
/** @import {AssetRigBone} from '../../data/assets.js' */
import { Uint16BufferAttribute, Float32BufferAttribute } from 'three';
import { humanBones } from '../../data/lookdev/rigs.js';
import { N4 } from '../lookdev/consts.js';

/**
 * @param {Record<string, AssetRigBone>} rig 骨の名前 → 関節の位置・区間の終わり・太さ（形の座標 m）
 * @returns {{name:string, parent:string|null, posM:[number,number,number]}[]} 骨（humanBones の順。posM は親からの相対）
 */
export function rigBoneDefs(rig) {
  return humanBones.map((b) => {
    const at = rig[b.name]?.at ?? [0, 0, 0];
    const pa = b.parent ? rig[b.parent]?.at ?? [0, 0, 0] : [0, 0, 0];
    return { name: b.name, parent: b.parent, posM: /** @type {[number,number,number]} */ ([at[0] - pa[0], at[1] - pa[1], at[2] - pa[2]]) };
  });
}

/**
 * 形に骨の重みを付ける（skinIndex・skinWeight）。
 * @param {any} geometry 形（足元0・正面+Z に直した後）
 * @param {Record<string, AssetRigBone>} rig
 * @param {{softRatio:number, behindMul:number, minWeightRatio:number}} k softRatio＝混ぜる幅（近さの差がこれだけ開くと重みが1/e）、behindMul＝関節より親の側の遠さの倍率、minWeightRatio＝これ未満の重みは捨てる
 */
export function autoSkin(geometry, rig, k) {
  /** 体を動かす骨：[骨の番号, 始まり, 終わり, 太さ] */
  const segs = [];
  humanBones.forEach((b, i) => {
    const r = rig[b.name];
    if (r?.end && r.rM) segs.push({ i, a: r.at, b: r.end, rM: r.rM });
  });
  const pos = geometry.attributes.position;
  const n = pos.count;
  const idx = new Uint16Array(n * N4);
  const wts = new Float32Array(n * N4);
  const near = new Float32Array(segs.length);
  const p = [0, 0, 0];
  for (let v = 0; v < n; v++) {
    p[0] = pos.getX(v);
    p[1] = pos.getY(v);
    p[2] = pos.getZ(v);
    let best = Infinity;
    segs.forEach((s, j) => {
      const ab = [s.b[0] - s.a[0], s.b[1] - s.a[1], s.b[2] - s.a[2]];
      const ap = [p[0] - s.a[0], p[1] - s.a[1], p[2] - s.a[2]];
      const len2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
      const t = (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / Math.max(len2, Number.EPSILON);
      const c = Math.min(1, Math.max(0, t));
      const d = Math.hypot(ap[0] - ab[0] * c, ap[1] - ab[1] * c, ap[2] - ab[2] * c);
      near[j] = (d * (t < 0 ? k.behindMul : 1)) / s.rM;
      best = Math.min(best, near[j]);
    });
    // 近い順に4本。重み＝exp(−(自分の近さ−一番の近さ)/混ぜる幅)
    const order = segs.map((_, j) => j).sort((x, y) => near[x] - near[y]).slice(0, N4);
    let sum = 0;
    const w = order.map((j) => {
      const x = Math.exp(-(near[j] - best) / k.softRatio);
      sum += x;
      return x;
    });
    let kept = 0;
    for (let q = 0; q < order.length; q++) {
      if (w[q] / sum < k.minWeightRatio) w[q] = 0;
      kept += w[q];
    }
    for (let q = 0; q < order.length; q++) {
      idx[v * N4 + q] = segs[order[q]].i;
      wts[v * N4 + q] = w[q] / kept;
    }
  }
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute(idx, N4));
  geometry.setAttribute('skinWeight', new Float32BufferAttribute(wts, N4));
  return geometry;
}
