import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { traceOk, traceScore } from '../../../utils/anbani';
import { triggerHaptic } from '../../../utils/haptics';

// „მოხაზე“ (სამი დამწერლობა, 2026-11-01): the old letter drawn faint in a square, the finger traces it. The check draws the
// letter and the finger's line again on small hidden canvases and counts their pixels (utils/anbani.ts `traceScore`): enough
// of the letter covered, and the line kept to it. The font is the app's own („SG Old Script“), so it waits for it to load.

type Pt = [number, number];
const FONT = '"SG Old Script", "Noto Serif Georgian", serif';
const S = 120; // the hidden canvases' side
const INK = 0.075; // the visible line's width, a share of the side

/** where the glyph sits in a side×side square: its font size and baseline, centred by its own ink */
const placeGlyph = (ctx: CanvasRenderingContext2D, glyph: string, side: number) => {
  ctx.font = `100px ${FONT}`;
  const m = ctx.measureText(glyph);
  const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight || 60;
  const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent || 70;
  const k = (side * 0.7) / Math.max(w, h);
  const size = 100 * k;
  const x = side / 2 - ((m.actualBoundingBoxRight - m.actualBoundingBoxLeft) * k) / 2;
  const y = side / 2 + ((m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) * k) / 2;
  return { size, x, y };
};
const drawGlyph = (ctx: CanvasRenderingContext2D, glyph: string, side: number, widen = 0) => {
  const { size, x, y } = placeGlyph(ctx, glyph, side);
  ctx.font = `${size}px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillText(glyph, x, y);
  if (widen) { ctx.lineWidth = widen; ctx.lineJoin = 'round'; ctx.strokeText(glyph, x, y); }
};
const drawLines = (ctx: CanvasRenderingContext2D, strokes: Pt[][], side: number, width: number) => {
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of strokes) {
    if (!s.length) continue;
    ctx.beginPath();
    ctx.moveTo(s[0][0] * side, s[0][1] * side);
    if (s.length === 1) ctx.lineTo(s[0][0] * side + 0.01, s[0][1] * side);
    for (const [x, y] of s.slice(1)) ctx.lineTo(x * side, y * side);
    ctx.stroke();
  }
};
const mask = (paint: (ctx: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return new Uint8Array(S * S);
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  paint(ctx);
  const data = ctx.getImageData(0, 0, S, S).data;
  const out = new Uint8Array(S * S);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3] > 96 ? 1 : 0;
  return out;
};

export const TraceBoard: React.FC<{ glyph: string; onPass: () => void; done: boolean }> = ({ glyph, onPass, done }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Pt[][]>([]);
  const drawing = useRef(false);
  const [ready, setReady] = useState(false);
  const [inked, setInked] = useState(false);
  const [miss, setMiss] = useState(0);
  const [say, setSay] = useState<string | null>(null);

  useEffect(() => {
    let gone = false;
    setReady(false);
    const font = document.fonts?.load ? document.fonts.load(`100px ${FONT}`, glyph) : Promise.resolve([]);
    font.catch(() => []).then(() => { if (!gone) setReady(true); });
    return () => { gone = true; };
  }, [glyph]);

  const paint = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const side = c.clientWidth || 280;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (c.width !== Math.round(side * dpr)) { c.width = Math.round(side * dpr); c.height = Math.round(side * dpr); }
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, side, side);
    // a faint grid, the letter, then the finger's line
    ctx.strokeStyle = '#efe5d3';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(side / 2, 8); ctx.lineTo(side / 2, side - 8);
    ctx.moveTo(8, side / 2); ctx.lineTo(side - 8, side / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = done ? '#cfe5d3' : '#eadfcb';
    drawGlyph(ctx, glyph, side);
    ctx.strokeStyle = done ? '#2f7d4f' : '#7a2028';
    drawLines(ctx, strokes.current, side, side * INK);
  }, [glyph, done]);

  useEffect(() => { if (ready) paint(); }, [ready, paint]);
  useEffect(() => {
    const again = () => paint();
    window.addEventListener('resize', again);
    return () => window.removeEventListener('resize', again);
  }, [paint]);
  useEffect(() => { strokes.current = []; setInked(false); setMiss(0); setSay(null); }, [glyph]);

  const at = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (done) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    strokes.current.push([at(e)]);
    setInked(true);
    setSay(null);
    paint();
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    strokes.current[strokes.current.length - 1].push(at(e));
    paint();
  };
  const up = () => { drawing.current = false; };
  const clear = () => { strokes.current = []; setInked(false); setSay(null); paint(); };

  const check = () => {
    const s = strokes.current;
    const score = traceScore({
      glyph: mask(ctx => drawGlyph(ctx, glyph, S)),
      glyphWide: mask(ctx => drawGlyph(ctx, glyph, S, S * 0.1)),
      ink: mask(ctx => drawLines(ctx, s, S, S * INK)),
      inkWide: mask(ctx => drawLines(ctx, s, S, S * 0.17)),
    });
    if (traceOk(score)) { triggerHaptic(25); onPass(); return; }
    triggerHaptic(60);
    setMiss(m => m + 1);
    setSay(score.cover < 0.6 ? 'ასოს ყველა ხაზი მოხაზე.' : 'ხაზს ასოზე გაჰყევი, გარეთ ნუ გახვალ.');
    strokes.current = [];
    setInked(false);
    paint();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvas}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="block rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_2px_10px_-6px_rgba(74,52,38,0.4)]"
        style={{ width: 'min(72vw, 280px, calc(100dvh - 360px))', minWidth: 200, aspectRatio: '1', touchAction: 'none' }}
        aria-label="მოხაზე ასო თითით"
      />
      <p className="min-h-[20px] text-center text-[14px] font-bold text-[#a0322e]" role="status">{say}</p>
      {!done && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={clear} disabled={!inked} className="h-11 px-4 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[14px] font-bold text-[#4a3426] inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer">
            <RotateCcw className="w-4 h-4" aria-hidden="true" />თავიდან
          </button>
          <button type="button" onClick={check} disabled={!inked} className="h-11 px-5 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[14px] font-bold disabled:opacity-40 cursor-pointer">შემოწმება</button>
          {miss >= 2 && <button type="button" onClick={onPass} className="h-11 px-3 rounded-full text-[13.5px] font-bold text-[#75685a] underline underline-offset-4 cursor-pointer">გამოტოვება</button>}
        </div>
      )}
    </div>
  );
};
