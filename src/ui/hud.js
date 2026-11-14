// HUD（01 4章）。M0b は「音の帯」（音が止まったとき。01 4.2・8.8）と教示（案内の文。01 1.7・8.3）だけ。
// 要素は起動時に全部作り、以後は追加・削除しない。毎フレームの更新は transform と opacity だけ、
// 値が同じなら書かない。文字は変わったときだけ textContent。位置と大きさは layout のときだけ（01 4.1）。
// HP・方位帯・地脈などの中身は M4a 以降。
/** @import {Layout} from '../input/layout.js' */

const SHOWN = '1';
const HIDDEN = '0';

/**
 * @param {Document} doc
 * @param {HTMLElement} hudEl  #hud（pointer-events:none）
 * @param {HTMLElement} teachParent  教示を置く場所（メニューより手前に出すため #hud の外）
 * @param {import('../config/index.js').Cfg} cfg
 * @param {{onSoundBandTap?:()=>void}} [hooks]
 */
export function createHud(doc, hudEl, teachParent, cfg, hooks = {}) {
  const u = cfg.ui;
  const band = doc.createElement('button');
  band.id = 'sound-band';
  band.type = 'button';
  band.className = 'tk-item tk-ground tk-text';
  band.textContent = '音を有効にする';
  band.style.cssText = 'position:absolute;left:0;top:0;pointer-events:auto;';
  band.style.opacity = HIDDEN;
  band.style.transform = 'scale(0)';
  band.addEventListener('click', () => hooks.onSoundBandTap?.());
  hudEl.appendChild(band);

  const teach = doc.createElement('div');
  teach.id = 'teach';
  teach.className = 'tk-ground tk-text';
  teach.style.cssText = 'position:absolute;left:0;top:0;z-index:35;display:flex;align-items:center;justify-content:center;pointer-events:none;font-size:var(--tk-font-px);white-space:nowrap;';
  teach.style.opacity = HIDDEN;
  teachParent.appendChild(teach);

  /** 前回書いた値（同じなら書かない） */
  const last = { bandOpacity: HIDDEN, bandTransform: 'scale(0)', teachOpacity: HIDDEN, teachText: '' };

  return {
    band,
    teach,
    /** 位置と大きさ（computeLayout のときだけ）。 @param {Layout} L */
    layout(L) {
      const cx = L.viewW / 2;
      band.style.left = `${cx - u.hudSoundBandHalfWPx}px`;
      band.style.top = `${L.safeT + u.hudSoundBandTopPx}px`;
      band.style.width = `${u.hudSoundBandHalfWPx * 2}px`;
      band.style.height = `${u.hudSoundBandHPx}px`;
      teach.style.left = `${cx - u.hudTeachHalfWPx}px`;
      teach.style.top = `${L.safeT + u.hudTeachTopPx}px`;
      teach.style.width = `${u.hudTeachHalfWPx * 2}px`;
      teach.style.height = `${u.hudTeachHPx}px`;
    },
    /**
     * 毎フレーム（と音の状態が変わったとき）。
     * @param {{soundBand:boolean, hint:string|null}} s
     */
    update(s) {
      const bo = s.soundBand ? SHOWN : HIDDEN;
      // 見えないときは大きさ0にして、指を受けないようにする（pointer-events を書き換えない）
      const bt = s.soundBand ? 'none' : 'scale(0)';
      if (bo !== last.bandOpacity) {
        band.style.opacity = bo;
        last.bandOpacity = bo;
      }
      if (bt !== last.bandTransform) {
        band.style.transform = bt;
        last.bandTransform = bt;
      }
      const text = s.hint ?? '';
      if (text !== last.teachText && text !== '') {
        teach.textContent = text;
        last.teachText = text;
      }
      const to = s.hint ? SHOWN : HIDDEN;
      if (to !== last.teachOpacity) {
        teach.style.opacity = to;
        last.teachOpacity = to;
      }
    },
  };
}
