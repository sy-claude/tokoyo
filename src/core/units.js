// 単位の換算と、設定キーの接尾辞の規則（00_core 0章、09 2章8）。
// config・data が読んでよい core はこのファイルだけ（09 1.4）。

/** 固定更新の回数（1秒あたりのtick）。config/time.js の tickRateHz と同じ値（config.test が照合する）。 */
export const TICK_RATE_HZ = 60;

/** 百分率の分母（設定の `…Pct` を倍率にする）。 */
export const PCT = 100;

/** 1秒のミリ秒（入力の timeStamp・音の時刻の換算）。 */
export const MS_PER_S = 1000;

/** 音量の dB → 振幅の倍率（20·log10 の逆）。−Infinity は 0。 */
export function dbToGain(db) {
  return db === -Infinity ? 0 : 10 ** (db / 20);
}

/** 秒 → tick（整数）。長い効果（s）を読み込み時に tick へ換算する。 */
export function sToTicks(s) {
  return Math.round(s * TICK_RATE_HZ);
}

/** tick → 秒。 */
export function ticksToS(f) {
  return f / TICK_RATE_HZ;
}

/** 数値スカラーの設定キーが終わらなければならない接尾辞（09 2章8 の正規表現そのまま）。 */
export const UNIT_SUFFIX_RE = /(F|S|M|Mps|Mps2|Deg|DegPs|Px|Mul|Pct|Hz|Db|Bpm|Count|Ratio)$/;

/** 設定キーの名前が接尾辞の規則に合うか。 */
export function hasUnitSuffix(key) {
  return UNIT_SUFFIX_RE.test(key);
}
