// 保存の設定（09 9章）。
/** @import {ConfigTable} from '../data/types.js' */

/** @satisfies {ConfigTable} */
export const save = {
  saveVersionCount: { v: 1, min: 1, max: 1, step: 1, desc: '保存データの現在の版' },
  saveKeyPrefix: { v: 'tokoyo:', desc: 'localStorage の名前空間' },
};
