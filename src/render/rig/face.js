// 顔（07 6.8）。顔アトラス（512²＝128²×16セル）を起動時に Canvas で描く。
// セル：0楓真 1白雪 2岩丈（開いた目）。閉じた目は＋4、痛がる顔は＋8（1行下・2行下）。
// M1a は楓真の3つだけ描く（白雪・岩丈は M9a、敵の目は M4a 以降）。
/** @import {Cfg} from '../../config/index.js' */
/** @import {FaceDef} from '../../data/rigs/faces.js' */
import { CanvasTexture, SRGBColorSpace } from 'three';

const half = (v) => v / 2;

/** アトラスの1辺に並ぶセルの数。 @param {{texFaceAtlasPx:number, texFaceCellPx:number}} rc */
export function faceCols(rc) {
  return Math.round(rc.texFaceAtlasPx / rc.texFaceCellPx);
}

/**
 * セルの中の位置（u,v は 0〜1、v は上が1）→ アトラスの uv。純関数。
 * @param {number} cell @param {number} u @param {number} v
 * @param {{texFaceAtlasPx:number, texFaceCellPx:number}} rc
 * @returns {[number, number]}
 */
export function faceCellUv(cell, u, v, rc) {
  const cols = faceCols(rc);
  const col = cell % cols;
  const row = Math.floor(cell / cols);
  return [(col + u) / cols, (cols - 1 - row + v) / cols];
}

/**
 * 顔の行（開・閉・痛）へ切り替えるための uv のずらし量（uniform uFaceShift の y）。
 * @param {number} rows 何行下か @param {{texFaceAtlasPx:number, texFaceCellPx:number}} rc
 */
export function faceRowShift(rows, rc) {
  return -rows / faceCols(rc);
}

/**
 * 顔を1つ描く。
 * @param {CanvasRenderingContext2D} ctx @param {number} x0 @param {number} y0 セルの左上
 * @param {FaceDef} f @param {'open'|'closed'|'pain'} mode @param {Cfg} cfg
 */
function drawFace(ctx, x0, y0, f, mode, cfg) {
  const S = cfg.render.texFaceCellPx;
  const an = cfg.anim;
  const ink = cfg.palette.ink;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, S, S);
  ctx.clip();
  ctx.fillStyle = f.skin;
  ctx.fillRect(x0, y0, S, S);
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const cx = x0 + half(S);
  for (const side of [-1, 1]) {
    // side は目尻の向き（画面の外側）
    const ex = cx + side * f.eyeDxPx;
    const ey = y0 + f.eyeYPx;
    const inner = ex - side * half(f.eyeWPx);
    const outer = ex + side * half(f.eyeWPx);
    const top = ey - half(f.eyeHPx);
    const bottom = ey + half(f.eyeHPx);
    if (mode === 'open') {
      // 瞳 → 上まぶた（太い。目尻を上げる）→ 下まぶた（細い）
      ctx.beginPath();
      ctx.arc(ex, ey, half(an.facePupilPx), 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = an.faceLidUpperPx;
      ctx.beginPath();
      ctx.moveTo(inner, top + half(half(f.eyeHPx)));
      ctx.quadraticCurveTo(ex, top - half(half(f.eyeHPx)), outer, top - f.eyeTailUpPx);
      ctx.stroke();
      ctx.lineWidth = an.faceLidLowerPx;
      ctx.beginPath();
      ctx.moveTo(ex - side * half(half(f.eyeWPx)), bottom + an.faceLidLowerPx);
      ctx.lineTo(outer - side * an.faceLidLowerPx, bottom - half(f.eyeTailUpPx));
      ctx.stroke();
    } else if (mode === 'closed') {
      // 閉じた目：下へふくらむ1画
      ctx.lineWidth = an.faceLidUpperPx;
      ctx.beginPath();
      ctx.moveTo(inner, ey);
      ctx.quadraticCurveTo(ex, bottom, outer, ey - half(f.eyeTailUpPx));
      ctx.stroke();
    } else {
      // 痛：ぎゅっと閉じた「＞＜」
      ctx.lineWidth = an.faceLidUpperPx;
      ctx.beginPath();
      ctx.moveTo(outer, top - half(f.eyeTailUpPx));
      ctx.lineTo(inner, ey);
      ctx.lineTo(outer, bottom);
      ctx.stroke();
    }
  }
  if (f.mouthYPx > 0) {
    const my = y0 + f.mouthYPx;
    ctx.lineWidth = an.faceMouthPx;
    ctx.beginPath();
    if (mode === 'pain') {
      // 食いしばる「へ」の字
      ctx.moveTo(cx - half(f.mouthWPx), my + an.faceMouthPx);
      ctx.lineTo(cx, my - an.faceMouthPx);
      ctx.lineTo(cx + half(f.mouthWPx), my + an.faceMouthPx);
    } else {
      ctx.moveTo(cx - half(f.mouthWPx), my);
      ctx.lineTo(cx + half(f.mouthWPx), my);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * 顔アトラスを作る。
 * @param {Document} doc @param {Cfg} cfg @param {Record<string, FaceDef>} faces
 * @returns {{texture:any, canvas:HTMLCanvasElement, dispose:()=>void}}
 */
export function createFaceAtlas(doc, cfg, faces) {
  const rc = cfg.render;
  const an = cfg.anim;
  const canvas = doc.createElement('canvas');
  canvas.width = rc.texFaceAtlasPx;
  canvas.height = rc.texFaceAtlasPx;
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  const cols = faceCols(rc);
  const S = rc.texFaceCellPx;
  /** @type {['open'|'closed'|'pain', number][]} */
  const modes = [['open', an.faceRowOpenCount], ['closed', an.faceRowClosedCount], ['pain', an.faceRowPainCount]];
  for (const f of Object.values(faces)) {
    for (const [mode, rows] of modes) {
      const cell = f.cell + rows * cols;
      // セルの外へにじんでも色が変わらないよう、先にセルより少し広く肌色で塗る
      ctx.fillStyle = f.skin;
      const x0 = (cell % cols) * S;
      const y0 = Math.floor(cell / cols) * S;
      ctx.fillRect(x0 - 1, y0 - 1, S + 2, S + 2);
      drawFace(ctx, x0, y0, f, mode, cfg);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return { texture, canvas, dispose: () => texture.dispose() };
}
