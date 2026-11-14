// 画面配置（01 1章、09 5.2）。純関数。当たり判定はこの数値で行い、DOM の矩形は使わない（D10）。
// テストは __game.layout() で同じ座標を得る。
/** @import {BtnId, Elem} from '../data/types.js' */
import { buildConfig } from '../core/config.js';
import { PCT } from '../core/units.js';
import { layout as layoutTable } from '../config/layout.js';
import { settings as settingsTable } from '../config/settings.js';

/** @typedef {typeof DEFAULT_LC} LayoutCfg */
const DEFAULT_LC = buildConfig({ layout: layoutTable }).layout;
/** 配置が読む設定（01 6.1 の一部）。 */
/** @typedef {{btnScalePct:number, leftHanded:boolean, btnLayout:Record<string,{dxPx?:number, dyPx?:number, scalePct?:number}>, stickSize:string, stickMode:string}} LayoutSettings */
export const DEFAULT_LAYOUT_SETTINGS = /** @type {LayoutSettings} */ (
  /** @type {unknown} */ (buildConfig({ settings: settingsTable }).settings)
);

/** @typedef {{id:BtnId|'pause', x:number, y:number, rVisPx:number, rHitPx:number}} LayoutButton */
/**
 * @typedef {Object} Layout
 * @property {number} viewW @property {number} viewH
 * @property {number} safeL @property {number} safeR @property {number} safeT @property {number} safeB
 * @property {number} deviceScale  clamp(H / 基準高, 0.85, 1.1)
 * @property {number} userScale    実効値（はみ出すときは自動で下げた値）
 * @property {boolean} leftHanded
 * @property {LayoutButton[]} buttons  7つのボタン（BtnId の順）＋最後に一時停止（id 'pause'）
 * @property {{x0:number, x1:number, y0:number, y1:number}} stickZone  スティックの出現範囲（両端を含む）
 * @property {[number,number]} stickDefault  既定位置
 * @property {number} stickBaseRPx  台座の半径
 * @property {number} stickKnobRPx  つまみの半径
 * @property {number} stickFollowRPx  これを超えたら原点が追う（台座半径×stickFollowMul）
 * @property {number} stickDeadzoneMul  台座半径に対する不感帯
 * @property {'hybrid'|'fixed'} stickMode
 * @property {{cx:number, cy:number, rPx:number, points:Record<Elem,[number,number]>}} pentagram
 */

/** @type {BtnId[]} */
export const LAYOUT_BTN_IDS = ['attack', 'dodge', 'jump', 'ougi', 'kekkai', 'fu', 'focus'];
/** 星の点の並び（木が上、時計回り。01 1.8：左利きでも並びは反転しない）。 @type {Elem[]} */
const STAR_ORDER = ['wood', 'fire', 'earth', 'metal', 'water'];
/** BtnId → config のキー名の部品（01 1.3。注目は Chumoku）。 */
const KEY_PART = { attack: 'Attack', dodge: 'Dodge', jump: 'Jump', ougi: 'Ougi', kekkai: 'Kekkai', fu: 'Fu', focus: 'Chumoku' };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * 右利きの座標で7つのボタンを作る。
 * @param {LayoutCfg} lc
 */
function placeButtons(lc, pivotX, pivotY, userScale, deviceScale, s) {
  /** @type {LayoutButton[]} */
  const out = [];
  for (const id of LAYOUT_BTN_IDS) {
    const k = KEY_PART[id];
    const o = s.btnLayout?.[id] ?? {};
    const dx = o.dxPx ?? lc[`btn${k}DxPx`];
    const dy = o.dyPx ?? lc[`btn${k}DyPx`];
    const btnScale = (o.scalePct ?? PCT) / PCT;
    const sizeMul = deviceScale * clamp(userScale * btnScale, lc.btnScaleMinMul, lc.btnScaleMaxMul);
    out.push({
      id,
      x: pivotX - dx * userScale,
      y: pivotY - dy * userScale,
      rVisPx: (lc[`btn${k}DiamPx`] * sizeMul) / 2,
      rHitPx: (lc[`btn${k}HitDiamPx`] * sizeMul) / 2,
    });
  }
  return out;
}

/**
 * 配置を計算する（01 1.1〜1.8）。
 * @param {number} viewW  visualViewport.width（CSS px）
 * @param {number} viewH  visualViewport.height
 * @param {{l:number, r:number, t:number, b:number}} insets  env(safe-area-inset-*) の値
 * @param {Partial<LayoutSettings>} [settings]
 * @param {LayoutCfg} [lc]  cfg.layout（省略時は既定値）
 * @returns {Layout}
 */
export function computeLayout(viewW, viewH, insets, settings = {}, lc = DEFAULT_LC) {
  const s = { ...DEFAULT_LAYOUT_SETTINGS, ...settings };
  const W = viewW;
  const H = viewH;
  const safeL = Math.max(insets.l, lc.layoutRefInsetSidePx);
  const safeR = W - Math.max(insets.r, lc.layoutRefInsetSidePx);
  const safeT = insets.t;
  const safeB = H - Math.max(insets.b, lc.layoutRefInsetBottomPx);
  const deviceScale = clamp(H / lc.layoutRefHeightPx, lc.layoutDeviceScaleMinMul, lc.layoutDeviceScaleMaxMul);
  const zoneW = Math.round((W * lc.stickZoneRightPct) / PCT);
  const topLimit = safeT + lc.hudTopReservePx;

  // 1.2：拡縮後に上端の HUD 帯かスティック範囲へはみ出すなら、userScale を刻みで下げる（右利きで計算し、後で鏡映）
  const want = s.btnScalePct / PCT;
  let userScale = want;
  let buttons = placeButtons(lc, safeR, safeB, userScale, deviceScale, s);
  for (let k = 1; userScale > lc.btnScaleShrinkStepMul; k++) {
    const fits = buttons.every((b) => b.y - b.rVisPx >= topLimit && b.x - b.rVisPx >= zoneW);
    if (fits) break;
    userScale = want - k * lc.btnScaleShrinkStepMul;
    buttons = placeButtons(lc, safeR, safeB, userScale, deviceScale, s);
  }
  // 見た目円を safe 矩形の中へ寄せる（端末が大きく deviceScale>1 のとき、注目が右へ最大2pxはみ出すため。PROGRESS の決めたこと）
  for (const b of buttons) {
    b.x = clamp(b.x, safeL + b.rVisPx, safeR - b.rVisPx);
    b.y = clamp(b.y, safeT + b.rVisPx, safeB - b.rVisPx);
  }
  // 一時停止は右上pivot 基準・拡縮なし。左利きでも右上のまま（01 1.8）
  /** @type {LayoutButton} */
  const pause = {
    id: 'pause',
    x: safeR - lc.btnPauseDxPx,
    y: safeT + lc.btnPauseTopPx,
    rVisPx: lc.btnPauseDiamPx / 2,
    rHitPx: lc.btnPauseHitDiamPx / 2,
  };

  let starCx = safeR - lc.starDxPx;
  const starCy = safeB - lc.starDyPx;
  let stickDefault = /** @type {[number,number]} */ ([safeL + lc.stickDefaultDxPx, safeB - lc.stickDefaultDyPx]);
  let stickZone = { x0: lc.stickZoneLeftPx, x1: zoneW, y0: safeT + lc.stickZoneTopPx, y1: H };
  if (s.leftHanded) {
    for (const b of buttons) b.x = W - b.x;
    starCx = W - starCx;
    stickDefault = [W - stickDefault[0], stickDefault[1]];
    stickZone = { x0: W - zoneW, x1: W - lc.stickZoneLeftPx, y0: stickZone.y0, y1: H };
  }
  /** @type {any} */
  const points = {};
  const step = (2 * Math.PI) / STAR_ORDER.length;
  STAR_ORDER.forEach((e, i) => {
    points[e] = [starCx + lc.starRadiusPx * Math.sin(i * step), starCy - lc.starRadiusPx * Math.cos(i * step)];
  });
  const baseDiam = lc[`stickBaseDiam${s.stickSize}Px`] ?? lc.stickBaseDiamMPx;

  return {
    viewW: W,
    viewH: H,
    safeL,
    safeR,
    safeT,
    safeB,
    deviceScale,
    userScale,
    leftHanded: Boolean(s.leftHanded),
    buttons: [...buttons, pause],
    stickZone,
    stickDefault,
    stickBaseRPx: baseDiam / 2,
    stickKnobRPx: (baseDiam * lc.stickKnobMul) / 2,
    stickFollowRPx: (baseDiam * lc.stickFollowMul) / 2,
    stickDeadzoneMul: lc.stickDeadzoneMul,
    stickMode: s.stickMode === 'fixed' ? 'fixed' : 'hybrid',
    pentagram: { cx: starCx, cy: starCy, rPx: lc.starRadiusPx, points },
  };
}

/** @param {Layout} L @param {BtnId|'pause'} id @returns {LayoutButton} */
export function buttonOf(L, id) {
  const b = L.buttons.find((x) => x.id === id);
  if (!b) throw new Error(`layout: ボタン ${id} が無い`);
  return b;
}

/** 攻撃の扇（01 1.4）：右利きは「x ≥ cx かつ y ≥ cy」、左利きは「x ≤ cx かつ y ≥ cy」。 */
function inAttackFan(L, b, x, y) {
  return y >= b.y && (L.leftHanded ? x <= b.x : x >= b.x);
}

/**
 * ボタンの判定（01 2.3）。表示中のボタンのうち「中心距離 ≤ 判定半径」または攻撃の扇に入るものを候補にし、
 * 「距離 ÷ 判定半径」が最小のものを返す（扇だけで入った攻撃は比 1.0）。一時停止は含めない（hitPause）。
 * @param {Layout} L @param {number} x @param {number} y
 * @param {ReadonlySet<BtnId>} [hidden]  導入で隠しているボタン
 * @returns {BtnId|null}
 */
export function hitTest(L, x, y, hidden) {
  /** @type {BtnId|null} */
  let best = null;
  let bestRatio = Infinity;
  for (const b of L.buttons) {
    if (b.id === 'pause' || hidden?.has(b.id)) continue;
    let ratio = Math.hypot(x - b.x, y - b.y) / b.rHitPx;
    if (ratio > 1) {
      if (b.id === 'attack' && inAttackFan(L, b, x, y)) ratio = 1;
      else continue;
    }
    if (ratio < bestRatio) {
      bestRatio = ratio;
      best = b.id;
    }
  }
  return best;
}

/** 一時停止の判定円の中か。 @param {Layout} L */
export function hitPause(L, x, y) {
  const b = buttonOf(L, 'pause');
  return Math.hypot(x - b.x, y - b.y) <= b.rHitPx;
}

/** スティックの出現範囲の中か（両端を含む）。 @param {Layout} L */
export function inStickZone(L, x, y) {
  const z = L.stickZone;
  return x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1;
}

/** 全ボタン（一時停止を含む）の判定円の縁からの最短距離（01 2.5 のタップの条件3）。 @param {Layout} L */
export function buttonClearance(L, x, y) {
  let min = Infinity;
  for (const b of L.buttons) min = Math.min(min, Math.hypot(x - b.x, y - b.y) - b.rHitPx);
  return min;
}
