// キャラの定義（06 §1.2）。M2a は移動に要る欄だけ（hpMax・capsule・flags）。技・見た目・強化は各Mで足す。
// 移動のキャラ係数（runSpeedMul など）は config/movement.js の charMove（02 §9.1 が正本）。

/**
 * @typedef {Object} CharacterMoveDef  CharacterDef（types.js）のうち M2a で使う欄
 * @property {string} id
 * @property {string} name
 * @property {import('./types.js').Elem} element
 * @property {number} hpMax
 * @property {{rM:number, hM:number}} capsule
 * @property {{canAirDash:boolean, canFlip:boolean, canKekkai:boolean, canBreakEseki:boolean}} flags
 * @property {boolean} playable
 */

/** @type {Record<string, CharacterMoveDef>} */
export const characters = {
  fuma: {
    id: 'fuma', name: '楓真', element: 'wood', hpMax: 420, capsule: { rM: 0.35, hM: 1.7 },
    flags: { canAirDash: true, canFlip: false, canKekkai: true, canBreakEseki: true }, playable: true,
  },
  shirayuki: {
    id: 'shirayuki', name: '白雪', element: 'metal', hpMax: 360, capsule: { rM: 0.32, hM: 1.6 },
    flags: { canAirDash: false, canFlip: true, canKekkai: true, canBreakEseki: true }, playable: true,
  },
  ganjo: {
    id: 'ganjo', name: '岩丈', element: 'earth', hpMax: 560, capsule: { rM: 0.45, hM: 1.85 },
    flags: { canAirDash: true, canFlip: false, canKekkai: true, canBreakEseki: true }, playable: true,
  },
};
