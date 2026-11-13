// 時間の規則（00_core 4章、09 4.2）。時計は2つ：実tick（world.tick）と局所時間（entity.localF）。
// 倍率は掛け算で、積を 1/quant 単位に丸める。倍率の変更は次のtickから有効。

/** 倍率の量子化 q(x)=round(x×quant)/quant。 */
export function quantScale(x, quant) {
  return Math.round(x * quant) / quant;
}

/** ヒットストップ倍率（止まっていれば0、それ以外1）。 */
export function hitstopMul(tick, hitstopUntil) {
  return tick < hitstopUntil ? 0 : 1;
}

/** エンティティの時間倍率 = q(世界 × 個別 × ヒットストップ)。 */
export function entityScale(worldMul, indivMul, tick, hitstopUntil, quant) {
  return quantScale(worldMul * indivMul * hitstopMul(tick, hitstopUntil), quant);
}

/** 命中した tick に置く値。次のtickから hitstopF の間（実tick）止まる。 */
export function hitstopUntilAfter(tick, hitstopF) {
  return tick + 1 + hitstopF;
}

/** @typedef {{worldMul:number, worldMulNext:number}} TimeState */

/** @returns {TimeState} */
export function createTimeState() {
  return { worldMul: 1, worldMulNext: 1 };
}

/** 世界倍率の変更を予約する（このtickで決めて、次のtickから効く）。 */
export function requestWorldMul(time, mul) {
  time.worldMulNext = mul;
}

/** 個別倍率（見切りの減速など）。slowUntil（実tick）までは slowMul。 */
export function indivMulOf(entity, tick, slowMul) {
  return tick < entity.slowUntil ? slowMul : 1;
}

/**
 * 1tick の時間を進める（09 4.3 の手順2）。世界倍率を確定し、各エンティティの scale を決めて localF に足す。
 * @param {{tick:number, time:TimeState, entities:{slowUntil:number, hitstopUntil:number, scale:number, localF:number}[]}} world
 * @param {{scaleQuantCount:number, mikiriSlowMul:number}} timeCfg
 */
export function advanceTime(world, timeCfg) {
  const t = world.time;
  t.worldMul = t.worldMulNext;
  for (const e of world.entities) {
    const indiv = indivMulOf(e, world.tick, timeCfg.mikiriSlowMul);
    e.scale = entityScale(t.worldMul, indiv, world.tick, e.hitstopUntil, timeCfg.scaleQuantCount);
    e.localF += e.scale;
  }
}
