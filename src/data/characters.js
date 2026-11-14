// キャラの定義（06 1.2、09 3章の CharacterDef）。
// M1a は楓真の「見た目に要る欄」だけ（id・名前・属性・武器名・造形）。HP・技・強化などは M2a 以降で足す。
/** @import {CharacterDef} from './types.js' */
import { fumaRig } from './rigs/fuma.js';

/** @typedef {Pick<CharacterDef, 'id'|'name'|'kana'|'element'|'weaponName'|'rig'>} CharacterLook */

/** @type {Record<string, CharacterLook>} */
export const characters = {
  fuma: { id: 'fuma', name: '楓真', kana: 'ふうま', element: 'wood', weaponName: '長巻', rig: fumaRig },
};

/** まだ造形の無いキャラが指定されたときに使う。 */
export const DEFAULT_CHAR_ID = 'fuma';
