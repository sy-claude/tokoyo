// 単位の換算と、設定キーの接尾辞の規則（00_core 0章、09 2章8）。
// config・data が読んでよい core はこのファイルだけ（09 1.4）。

/** 固定更新の回数（1秒あたりのtick）。config/time.js の tickRateHz と同じ値（config.test が照合する）。 */
export const TICK_RATE_HZ = 60;

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
