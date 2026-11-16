// 顔の絵のアトラス（V5。07 §6.8）：data/lookdev/faces.js の記述を、起動時に Canvas へ描いてテクスチャにする。
// 地は透明（肌は頂点の色のまま）。線と塗りだけを重ねる。色は THREE.Color を通す（不変条件10）。
import { CanvasTexture, Color, LinearFilter, SRGBColorSpace } from 'three';
import { faces } from '../../data/lookdev/faces.js';
import { BYTE_MAX, HALF, TAU } from './consts.js';

/** 升の位置（アトラスの uv の左下と1升の幅）。 @param {number} cell */
export function faceCellRect(cell) {
  const n = faces.cols;
  return { u0: (cell % n) / n, v0: Math.floor(cell / n) / n, size: 1 / n };
}

/** @param {Record<string, any>} palette */
export function createFaceAtlas(palette) {
  const px = faces.cellPx;
  const canvas = document.createElement('canvas');
  canvas.width = px * faces.cols;
  canvas.height = px * faces.cols;
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  const tmp = new Color();
  const style = (name) => tmp.set(typeof palette[name] === 'string' ? palette[name] : name).getStyle();

  for (const face of Object.values(faces)) {
    if (typeof face !== 'object' || !face.ops) continue;
    const r = faceCellRect(face.cell);
    const ox = r.u0 * canvas.width;
    const oy = (1 - r.v0 - r.size) * canvas.height; // Canvas は上が0
    const X = (u) => ox + u * px;
    const Y = (v) => oy + (1 - v) * px;
    /** なめらかな線（点の中点を通る2次曲線）。 */
    const trace = (pts, close) => {
      ctx.beginPath();
      if (close) {
        const n = pts.length;
        ctx.moveTo((X(pts[n - 1][0]) + X(pts[0][0])) * HALF, (Y(pts[n - 1][1]) + Y(pts[0][1])) * HALF);
        for (let i = 0; i < n; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % n];
          ctx.quadraticCurveTo(X(a[0]), Y(a[1]), (X(a[0]) + X(b[0])) * HALF, (Y(a[1]) + Y(b[1])) * HALF);
        }
        ctx.closePath();
        return;
      }
      ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
      for (let i = 1; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const last = i === pts.length - 2;
        ctx.quadraticCurveTo(X(a[0]), Y(a[1]), last ? X(b[0]) : (X(a[0]) + X(b[0])) * HALF, last ? Y(b[1]) : (Y(a[1]) + Y(b[1])) * HALF);
      }
      if (pts.length === 2) ctx.lineTo(X(pts[1][0]), Y(pts[1][1]));
    };
    const flip = (pts) => pts.map((q) => [1 - q[0], q[1]]);
    const draw = (op, mirrored) => {
      const P = (pts) => (mirrored ? flip(pts) : pts);
      ctx.save();
      ctx.beginPath();
      ctx.rect(ox, oy, px, px);
      ctx.clip();
      ctx.globalAlpha = op.a ?? 1;
      ctx.fillStyle = style(op.col);
      ctx.strokeStyle = style(op.col);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (op.t === 'fill') {
        trace(P(op.pts), true);
        ctx.fill();
      } else if (op.t === 'stroke') {
        ctx.lineWidth = op.w * px;
        trace(P(op.pts), false);
        ctx.stroke();
      } else if (op.t === 'soft') {
        // ぼかした陰影：中心が濃く、縁へ向けて消える楕円
        const c = mirrored ? [1 - op.c[0], op.c[1]] : op.c;
        ctx.translate(X(c[0]), Y(c[1]));
        ctx.scale(op.r[0] * px, op.r[1] * px);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, style(op.col));
        tmp.set(typeof palette[op.col] === 'string' ? palette[op.col] : op.col);
        g.addColorStop(1, `rgba(${Math.round(tmp.r * BYTE_MAX)}, ${Math.round(tmp.g * BYTE_MAX)}, ${Math.round(tmp.b * BYTE_MAX)}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, TAU);
        ctx.fill();
      } else if (op.t === 'disc') {
        if (op.clip) {
          trace(P(op.clip), true);
          ctx.clip();
        }
        const c = mirrored ? [1 - op.c[0], op.c[1]] : op.c;
        ctx.beginPath();
        ctx.ellipse(X(c[0]), Y(c[1]), op.r[0] * px, op.r[1] * px, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    };
    for (const op of face.ops) {
      draw(op, false);
      if (op.mirror) draw(op, true);
    }
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}
