// ボタンとスティックの見た目（01 4.3「ボタンの見た目」、07 9）。#hud の中に起動時に全要素を作る（pointer-events:none）。
// 位置・大きさは layout のときだけ書く。毎フレームは transform と opacity だけ、値が同じなら書かない（01 4.1）。
// 押しても技はまだ出ない（M3a〜）。使えないボタンの灰色・残数・奥義の溜めの輪は後のMで足す。
/** @import {Layout, LayoutButton} from '../input/layout.js' */
import { PCT } from '../core/units.js';
import { DEG2RAD } from '../core/math.js';

/** ボタンの文字（01 4.3）。 */
const GLYPH = { attack: '攻', dodge: '避', jump: '跳', ougi: '奥義', kekkai: '結界', fu: '符', focus: '注目', pause: '‖' };
const SVG_NS = 'http://www.w3.org/2000/svg';
/** 円相の SVG は 0〜2 の座標（中心1・半径1）で描き、太さは px のまま（vector-effect） */
const ENSO_R = 1;
const QUARTER_DEG = 90; // num-ok: 直角（度）

/**
 * @param {Document} doc
 * @param {HTMLElement} parent  #hud
 * @param {import('../config/index.js').Cfg} cfg
 */
export function createButtonsView(doc, parent, cfg) {
  const u = cfg.ui;
  const root = doc.createElement('div');
  root.id = 'pad';
  root.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
  parent.appendChild(root);

  /** 値が変わったときだけ書く（01 4.1 の2） */
  const last = new WeakMap();
  const put = (el, prop, v) => {
    let m = last.get(el);
    if (!m) last.set(el, (m = {}));
    if (m[prop] === v) return;
    m[prop] = v;
    el.style[prop] = v;
  };

  /** @type {Map<Element, Element>} 円相の svg → 弧の path */
  const arcOf = new Map();
  /** 円相（右上が切れた筆の円）。弧の形は直径が決まってから setEnsoSize で作る。 */
  function enso(strokeColor) {
    const svg = doc.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 2 2');
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible;';
    const arc = doc.createElementNS(SVG_NS, 'path');
    arc.setAttribute('fill', 'none');
    arc.setAttribute('stroke', strokeColor);
    arc.setAttribute('stroke-linecap', 'round');
    svg.appendChild(arc);
    arcOf.set(svg, arc);
    return svg;
  }

  /**
   * 円相の弧を作る。SVG は 0〜2 の座標なので、太さ px は 2/直径 を掛ける。線が外へはみ出さないよう半径を縮める。
   * 切れ目は右上（画面の −45°）を中心に uiBtnGapDeg。
   * @param {Element} svg @param {number} diamPx
   */
  const setEnsoSize = (svg, diamPx) => {
    const arc = arcOf.get(svg);
    if (!arc) return;
    const w = (u.uiBtnStrokePx * 2) / diamPx;
    const r = ENSO_R - w / 2;
    const gapMid = -QUARTER_DEG / 2;
    const a0 = (gapMid + u.uiBtnGapDeg / 2) * DEG2RAD; // 弧の始まり（切れ目の下端）
    const a1 = (gapMid - u.uiBtnGapDeg / 2) * DEG2RAD; // 弧の終わり（切れ目の上端）
    const p = (a) => `${ENSO_R + r * Math.cos(a)} ${ENSO_R + r * Math.sin(a)}`;
    // 画面の座標は y が下向きなので、角度の増える向き＝時計回り（sweep 1）。大きい方の弧（large-arc 1）
    arc.setAttribute('d', `M ${p(a0)} A ${r} ${r} 0 1 1 ${p(a1)}`);
    arc.setAttribute('stroke-width', String(w));
  };

  /** @type {Record<string, {el:HTMLElement, ground:HTMLElement, label:HTMLElement, ring:Element}>} */
  const btns = {};
  for (const id of Object.keys(GLYPH)) {
    const el = doc.createElement('div');
    el.className = 'tk-btn';
    el.dataset.btn = id;
    el.style.cssText = 'position:absolute;left:0;top:0;border-radius:50%;will-change:transform;';
    const ground = doc.createElement('div');
    ground.style.cssText = 'position:absolute;inset:0;border-radius:50%;background:var(--ink);';
    const label = doc.createElement('div');
    label.className = 'tk-text';
    label.textContent = GLYPH[id];
    label.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;line-height:1;white-space:nowrap;';
    const ring = enso(cfg.palette.ink);
    el.append(ground, ring, label);
    root.appendChild(el);
    btns[id] = { el, ground, label, ring };
  }

  // スティック：台座とつまみ。位置は transform（指に合わせて毎フレーム動く）
  const stickBase = doc.createElement('div');
  stickBase.style.cssText = 'position:absolute;left:0;top:0;border-radius:50%;will-change:transform,opacity;';
  const stickGround = doc.createElement('div');
  stickGround.style.cssText = 'position:absolute;inset:0;border-radius:50%;background:var(--ink);';
  stickGround.style.opacity = String(u.uiBtnFillOpacityRatio);
  const stickRing = enso(cfg.palette.ink);
  stickBase.append(stickGround, stickRing);
  const stickKnob = doc.createElement('div');
  stickKnob.style.cssText = 'position:absolute;left:0;top:0;border-radius:50%;background:var(--paperWhite);border:2px solid var(--ink);box-sizing:border-box;will-change:transform,opacity;';
  root.append(stickBase, stickKnob);

  /** @type {Layout|null} */
  let L = null;
  let opacity = 1;
  let visible = true;

  /** @param {HTMLElement} el @param {number} d 直径 */
  const size = (el, d) => {
    el.style.width = `${d}px`;
    el.style.height = `${d}px`;
  };

  return {
    root,
    /**
     * 配置を反映する（computeLayout のときだけ）。
     * @param {Layout} layout @param {{btnOpacityPct:number}} settings
     */
    layout(layout, settings) {
      L = layout;
      opacity = settings.btnOpacityPct / PCT;
      for (const b of layout.buttons) {
        const v = btns[b.id];
        const d = b.rVisPx * 2;
        size(v.el, d);
        v.el.style.left = `${b.x - b.rVisPx}px`;
        v.el.style.top = `${b.y - b.rVisPx}px`;
        v.ground.style.opacity = String(u.uiBtnFillOpacityRatio);
        setEnsoSize(v.ring, d);
        const glyphPx = b.id === 'attack' ? u.uiBtnAttackGlyphPx : u.uiBtnGlyphPx;
        // 2文字のボタン（奥義・結界・注目）は円に収まるよう縮める
        v.label.style.fontSize = `${Math.min(glyphPx, (d * u.uiBtnGlyphFitRatio) / GLYPH[b.id].length)}px`;
      }
      size(stickBase, layout.stickBaseRPx * 2);
      setEnsoSize(stickRing, layout.stickBaseRPx * 2);
      size(stickKnob, layout.stickKnobRPx * 2);
    },
    /** @param {boolean} on */
    setVisible(on) {
      visible = on;
    },
    /**
     * 毎フレーム：押下の縮み・スティックの位置と不透明度。
     * @param {{stick:{originX:number, originY:number, knobX:number, knobY:number}|null, pressed:Set<string>}} vs
     */
    update(vs) {
      if (!L) return;
      put(root, 'opacity', visible ? '1' : '0');
      for (const id of Object.keys(btns)) {
        put(btns[id].el, 'transform', vs.pressed.has(id) ? `scale(${u.hudBtnPressMul})` : 'none');
        put(btns[id].el, 'opacity', String(opacity));
      }
      const R = L.stickBaseRPx;
      const r = L.stickKnobRPx;
      const s = vs.stick;
      const ox = s ? s.originX : L.stickDefault[0];
      const oy = s ? s.originY : L.stickDefault[1];
      // 台座は safe 矩形の中に収まるよう表示位置だけずらす（入力の原点はずらさない。01 1.5）
      const bx = Math.min(Math.max(ox, L.safeL + R), L.viewW - R);
      const by = Math.min(Math.max(oy, L.safeT + R), L.viewH - R);
      const kx = s ? s.knobX + (bx - ox) : bx;
      const ky = s ? s.knobY + (by - oy) : by;
      const a = String(s ? opacity : opacity * u.hudStickIdleOpacityMul);
      put(stickBase, 'transform', `translate(${bx - R}px,${by - R}px)`);
      put(stickKnob, 'transform', `translate(${kx - r}px,${ky - r}px)`);
      put(stickBase, 'opacity', a);
      put(stickKnob, 'opacity', a);
    },
  };
}
