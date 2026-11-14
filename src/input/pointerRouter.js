// 指の役割の割当（01 2.2〜2.9、09 5.1）。Pointer Events だけを聞く（touch は既定動作の抑止だけ。platform/guards）。
// down で役割を1つ決め、up/cancel まで保持する。役割の変更は2つだけ（攻撃→カメラ、奥義→回避）。
// DOM に触るのは attach だけ。それ以外は座標と時刻（ms）を受け取る状態機械なので Node のテストから直接使える。
// 符の構え中の指（fuCancel・draw）は符を作る M2.5、使えないボタンの「×を揺らす」は M3a 以降で足す。
/** @import {BtnId} from '../data/types.js' */
/** @import {Layout} from './layout.js' */
/** @import {Collector} from './collector.js' */
import { PCT } from '../core/units.js';
import { buttonOf, hitPause, hitTest, inStickZone } from './layout.js';
import { flickOf, isTap } from './gestures.js';

/** @typedef {'stick'|'camera'|'button'|'draw'|'attackDragCamera'|'fuCancel'|'ignored'} PointerRole */
/**
 * @typedef {{id:number, role:PointerRole, btn:BtnId|'pause'|null, disabled:boolean,
 *  downX:number, downY:number, downT:number, x:number, y:number, maxMovePx:number,
 *  ougiState:'charge'|'cancelZone'|null, flickDone:boolean, originX:number, originY:number,
 *  lastX:number, lastY:number}} PointerRec
 *  originX/Y：スティックの原点（絶対座標。配置が変わっても保持する。01 1.7）。lastX/Y：カメラの差分の基準
 */
/** @typedef {{id:number, x:number, y:number, t:number}} PointerSample  座標は visualViewport の左上が原点の CSS px、t は e.timeStamp（ms） */


/**
 * @param {Object} o
 * @param {import('../config/index.js').Cfg['input']} o.inputCfg
 * @param {{camYawDegPerPx:number, camPitchDegPerPx:number}} o.cameraCfg
 * @param {Collector} o.collector
 * @param {()=>Layout} o.getLayout
 * @param {()=>{attackDragCam:boolean, camSensPct:number, camInvertX:boolean, camInvertY:boolean}} o.getSettings
 * @param {{onPause?:()=>void, canDodge?:()=>boolean, onAnyUp?:()=>void}} [o.hooks]
 */
export function createPointerRouter(o) {
  const { collector } = o;
  const hooks = o.hooks ?? {};
  /** @type {Map<number, PointerRec>} */
  const recs = new Map();
  let enabled = true;

  const isCam = (r) => r.role === 'camera' || r.role === 'attackDragCamera';
  const roleCount = (pred) => [...recs.values()].filter(pred).length;
  const updateCamHeld = () => collector.setCamHeld(roleCount(isCam) > 0);

  /** px の移動 → 度（09 3章の InputFrame.camDeg の式）。 */
  function camFromPx(dx, dy, mul) {
    const s = o.getSettings();
    const sens = (s.camSensPct / PCT) * mul;
    const yaw = dx * o.cameraCfg.camYawDegPerPx * sens * (s.camInvertX ? -1 : 1);
    // 指を上へ（dy<0）→ 視点が上を向く（camDeg[1] は「上から見下ろす向き」が＋なので負）。PROGRESS の決めたこと
    const pitch = dy * o.cameraCfg.camPitchDegPerPx * sens * (s.camInvertY ? -1 : 1);
    collector.addCam(yaw, pitch);
  }

  /** スティックの出力（01 1.5）。追従はハイブリッドだけ。 @param {PointerRec} r */
  function updateStick(r) {
    const L = o.getLayout();
    const R = L.stickBaseRPx;
    let dx = r.x - r.originX;
    let dy = r.y - r.originY;
    let len = Math.hypot(dx, dy);
    const followR = L.stickFollowRPx;
    if (L.stickMode === 'hybrid' && len > followR) {
      const k = (len - followR) / len;
      r.originX += dx * k;
      r.originY += dy * k;
      dx = r.x - r.originX;
      dy = r.y - r.originY;
      len = Math.hypot(dx, dy);
    }
    const m = len / R;
    const dz = L.stickDeadzoneMul;
    if (m <= dz || len === 0) {
      collector.setStick(0, 0);
      return;
    }
    const mm = Math.min(1, (m - dz) / (1 - dz));
    collector.setStick((dx / len) * mm, (-dy / len) * mm);
  }

  /** 01 2.6 の取消扱い（静かな解放）。役割は ignored にして、離すまで何もしない。 @param {PointerRec} r */
  function cancelRec(r) {
    if (r.role === 'stick') collector.setStick(0, 0);
    else if (r.role === 'button' && r.btn && r.btn !== 'pause') {
      if (r.btn === 'ougi') {
        if (r.ougiState === 'charge') collector.release('ougi', true);
        collector.setOugiOutHeld(false);
        collector.ougiOutPulse();
      } else collector.release(r.btn, true);
    }
    r.role = 'ignored';
    r.btn = null;
  }

  /** @param {PointerSample} p */
  function down(p) {
    if (!enabled || recs.has(p.id)) return;
    const L = o.getLayout();
    /** @type {PointerRec} */
    const r = {
      id: p.id, role: 'ignored', btn: null, disabled: false, downX: p.x, downY: p.y, downT: p.t, x: p.x, y: p.y,
      maxMovePx: 0, ougiState: null, flickDone: false, originX: p.x, originY: p.y, lastX: p.x, lastY: p.y,
    };
    if (recs.size >= o.inputCfg.inputMaxPointersCount) {
      recs.set(p.id, r); // 5本目以降は ignored
      return;
    }
    recs.set(p.id, r);
    if (hitPause(L, p.x, p.y)) {
      r.role = 'button';
      r.btn = 'pause';
      return;
    }
    const id = hitTest(L, p.x, p.y);
    if (id) {
      r.role = 'button';
      r.btn = id;
      if (id === 'ougi') r.ougiState = 'charge';
      collector.press(id, p.t);
      return;
    }
    if (inStickZone(L, p.x, p.y)) {
      if (roleCount((x) => x.role === 'stick') > 0) return;
      r.role = 'stick';
      if (L.stickMode === 'fixed') {
        r.originX = L.stickDefault[0];
        r.originY = L.stickDefault[1];
      }
      updateStick(r);
      return;
    }
    if (roleCount(isCam) > 0) return;
    r.role = 'camera';
    updateCamHeld();
  }

  /** @param {PointerSample} p */
  function move(p) {
    const r = recs.get(p.id);
    if (!r) return;
    r.x = p.x;
    r.y = p.y;
    const dist = Math.hypot(p.x - r.downX, p.y - r.downY);
    r.maxMovePx = Math.max(r.maxMovePx, dist);
    const ic = o.inputCfg;
    switch (r.role) {
      case 'stick':
        updateStick(r);
        break;
      case 'camera': {
        const f = flickOf(r, p.x, p.y, p.t, ic);
        if (f !== 0) {
          collector.setFlick(f);
          r.flickDone = true;
        } else if (!r.flickDone) {
          camFromPx(p.x - r.lastX, p.y - r.lastY, 1);
        }
        break;
      }
      case 'attackDragCamera':
        camFromPx(p.x - r.lastX, p.y - r.lastY, ic.attackDragCamMul);
        break;
      case 'button':
        if (r.btn === 'attack') {
          // 01 2.7：28px 以上動き、設定がオン、他にカメラ系の指がいない → カメラへ（28px 分は回さない）
          if (dist >= ic.attackCamSlidePx && o.getSettings().attackDragCam && roleCount(isCam) === 0) {
            r.role = 'attackDragCamera';
            r.btn = null;
            collector.release('attack', true);
            updateCamHeld();
          }
        } else if (r.btn === 'ougi') {
          moveOugi(r, p, dist);
        }
        break;
      default:
        break;
    }
    r.lastX = p.x;
    r.lastY = p.y;
  }

  /** 01 2.8（押したまま方式）。 @param {PointerRec} r @param {PointerSample} p @param {number} dist */
  function moveOugi(r, p, dist) {
    const L = o.getLayout();
    const ic = o.inputCfg;
    const dodge = buttonOf(L, 'dodge');
    if ((hooks.canDodge?.() ?? true) && Math.hypot(p.x - dodge.x, p.y - dodge.y) <= dodge.rHitPx) {
      if (r.ougiState === 'charge') collector.release('ougi', true);
      collector.setOugiOutHeld(false);
      collector.ougiOutPulse();
      collector.press('dodge', p.t);
      r.btn = 'dodge';
      r.ougiState = null;
      return;
    }
    if (r.ougiState === 'charge' && dist >= ic.ougiOutPx) {
      r.ougiState = 'cancelZone';
      collector.release('ougi', true);
      collector.setOugiOutHeld(true);
    } else if (r.ougiState === 'cancelZone' && dist <= ic.ougiBackPx) {
      r.ougiState = 'charge';
      collector.setOugiOutHeld(false);
      collector.press('ougi', p.t); // 溜めは0から
    }
  }

  /** @param {PointerSample} p */
  function up(p) {
    const r = recs.get(p.id);
    if (!r) return;
    move(p);
    recs.delete(p.id);
    const L = o.getLayout();
    switch (r.role) {
      case 'stick':
        collector.setStick(0, 0);
        break;
      case 'camera':
        if (isTap(r, p.x, p.y, p.t, L, o.inputCfg)) collector.addTap(p.x, p.y);
        updateCamHeld();
        break;
      case 'attackDragCamera':
        updateCamHeld();
        break;
      case 'button':
        if (r.btn === 'pause') {
          if (hitPause(L, p.x, p.y)) hooks.onPause?.();
        } else if (r.btn === 'ougi') {
          if (r.ougiState === 'charge') collector.release('ougi');
          collector.setOugiOutHeld(false);
        } else if (r.btn) {
          collector.release(r.btn);
        }
        break;
      default:
        break;
    }
    hooks.onAnyUp?.();
  }

  /** pointercancel・lostpointercapture（その指）。 @param {number} id */
  function cancel(id) {
    const r = recs.get(id);
    if (!r) return;
    cancelRec(r);
    recs.delete(id);
    updateCamHeld();
  }

  /** blur・hidden・メニュー・縦向き（01 2.6）：全指を解放。まだ触れている指は離すまで ignored。 */
  function releaseAll() {
    for (const r of recs.values()) cancelRec(r);
    updateCamHeld();
  }

  return {
    down,
    move,
    up,
    cancel,
    releaseAll,
    /** 入力層を有効・無効にする（メニュー表示中・暗転中は無効。無効にしたら全指を解放）。 @param {boolean} on */
    setEnabled(on) {
      if (!on) releaseAll();
      enabled = on;
    },
    get enabled() {
      return enabled;
    },
    /** 表示用（buttonsView）：スティックの原点とつまみ、押しているボタン、奥義の取消域。 */
    viewState() {
      const L = o.getLayout();
      /** @type {Set<string>} */
      const pressed = new Set();
      let stick = null;
      let ougiCancelAt = null;
      for (const r of recs.values()) {
        if (r.role === 'button' && r.btn) pressed.add(r.btn);
        if (r.role === 'button' && r.btn === 'ougi' && r.ougiState === 'cancelZone') ougiCancelAt = [r.downX, r.downY];
        if (r.role === 'stick') {
          const dx = r.x - r.originX;
          const dy = r.y - r.originY;
          const len = Math.hypot(dx, dy);
          const k = len > L.stickBaseRPx ? L.stickBaseRPx / len : 1;
          stick = { originX: r.originX, originY: r.originY, knobX: r.originX + dx * k, knobY: r.originY + dy * k };
        }
      }
      return { stick, pressed, ougiCancelAt };
    },
    /** 試験用：今の指の役割の一覧。 */
    roles() {
      return [...recs.values()].map((r) => ({ id: r.id, role: r.role, btn: r.btn }));
    },
    /**
     * DOM の Pointer Events につなぐ（#input の div）。座標は origin（ルート要素の左上）を引いて visualViewport 基準にする。
     * @param {HTMLElement} el @param {()=>[number,number]} origin
     * @returns {()=>void} 外す関数
     */
    attach(el, origin) {
      /** @param {PointerEvent} e @returns {PointerSample} */
      const sample = (e) => {
        const [ox, oy] = origin();
        return { id: e.pointerId, x: e.clientX - ox, y: e.clientY - oy, t: e.timeStamp };
      };
      const onDown = (/** @type {PointerEvent} */ e) => {
        if (!enabled) return;
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          // 捕まえられなくても続ける
        }
        down(sample(e));
      };
      const onMove = (/** @type {PointerEvent} */ e) => move(sample(e));
      const onUp = (/** @type {PointerEvent} */ e) => up(sample(e));
      const onCancel = (/** @type {PointerEvent} */ e) => cancel(e.pointerId);
      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onCancel);
      el.addEventListener('lostpointercapture', onCancel);
      return () => {
        el.removeEventListener('pointerdown', onDown);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onCancel);
        el.removeEventListener('lostpointercapture', onCancel);
      };
    },
  };
}

/** @typedef {ReturnType<typeof createPointerRouter>} PointerRouter */
