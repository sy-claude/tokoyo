// 色（07 2章）。sRGB の16進文字列。必ず new THREE.Color(hex) を通して使う（DOM の CSS ではそのまま使ってよい）。
// M0b は UI が使う色だけ（07 2.1 の ink・paper・paperWhite・shuInfo・inkGray）。残りは M1a 以降で写す。
/** @import {ConfigTable} from '../data/types.js' */

/** @satisfies {ConfigTable} */
export const palette = {
  paper: { v: '#efe6d2', desc: '紙。霧と地平の色' },
  paperWhite: { v: '#f4ecd8', desc: 'HPの中身、紙垂の明部' },
  ink: { v: '#1b1a1f', desc: '墨。輪郭・縁' },
  inkGray: { v: '#8a857c', desc: '灰（不利のダメージ数字、使えないボタン）' },
  shuInfo: { v: '#e2452b', desc: '情報の朱（予兆・朱印・命中・注目）' },
};
