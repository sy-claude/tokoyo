// 妖怪の身じろぎ（V4）：時刻（tick から出した秒）だけで決まる純関数。同じ tick なら同じ姿勢（一時停止で止まる）。
// 揺れ＝支点のまわりの小さな回転（提灯は吊り金具、唐傘は足元）、上下＝呼吸、跳ね＝唐傘の小跳び。
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { DEG2RAD } from '../../core/math.js';
import { TAU } from './consts.js';

const ONE3 = new Vector3(1, 1, 1);
const tmpQ = new Quaternion();
const tmpE = new Euler();
const tmpV = new Vector3();
const tmpM = new Matrix4();

/**
 * @typedef {{pivot:number[], swayDeg:number[], swayHz:number, bobM:number, bobHz:number, hopM:number, hopHz:number, phase:number}} YokaiMotion
 */

/** 跳ねの高さの比（0..1）。周期の後ろ3分の1だけ宙にいる（溜め → 跳ぶ → 着地）。 @param {number} cycles 周期の数 */
export function hopRatio(cycles) {
  return Math.max(0, Math.sin(cycles * TAU) * 2 - 1);
}

/**
 * 配置の行列に身じろぎを掛けた行列を out へ書く。
 * @param {Matrix4} place 配置（at・rot・scale） @param {YokaiMotion|undefined} mo @param {number} timeS @param {Matrix4} out
 */
export function yokaiMatrix(place, mo, timeS, out) {
  out.copy(place);
  if (!mo) return out;
  const a = timeS * mo.swayHz * TAU + mo.phase;
  // 前後と左右で速さをずらし、同じ動きの繰り返しに見えないようにする
  tmpE.set(Math.sin(a) * mo.swayDeg[0] * DEG2RAD, 0, Math.sin(a / 2 + mo.phase * 2) * mo.swayDeg[1] * DEG2RAD);
  tmpQ.setFromEuler(tmpE);
  const lift = Math.sin(timeS * mo.bobHz * TAU + mo.phase) * mo.bobM + hopRatio(timeS * mo.hopHz + mo.phase) * mo.hopM;
  tmpV.set(mo.pivot[0], mo.pivot[1], mo.pivot[2]);
  // 支点へ移す → 回す → 戻す → 持ち上げる（形の座標で）
  out.multiply(tmpM.makeTranslation(tmpV.x, tmpV.y + lift, tmpV.z));
  out.multiply(tmpM.compose(tmpV.set(0, 0, 0), tmpQ, ONE3));
  out.multiply(tmpM.makeTranslation(-mo.pivot[0], -mo.pivot[1], -mo.pivot[2]));
  return out;
}
