// 構造上の定数（調整値ではない）。数値の直書き禁止（不変条件7）の例外として、理由を添えてここにだけ置く。
export const N3 = 3; // num-ok: ベクトルの成分数（xyz・rgb）
export const N4 = 4; // num-ok: 4成分（vec4・四角形の頂点数）
export const HALF = 0.5; // num-ok: 半分
export const TAU = Math.PI * 2;
export const BYTE_MAX = 255; // num-ok: 8bit の最大値（高さの図の符号化）
/** 形の既定の分割数（部品の表で seg を省いたとき）。 */
export const SEG_DEFAULT = 8; // num-ok: 円の分割の既定（形の細かさ。調整値ではない）
