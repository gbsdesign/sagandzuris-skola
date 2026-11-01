import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, Trash2, Undo2 } from 'lucide-react';
import {
  ERASER, INK_COLORS, INK_COLOR_NAMES, INK_MAX, INK_SIDE, INK_WIDTHS, addPoint, decodeInk, encodeInk, inkGrows, inkPoints, inkUpTo,
  strokeWidth, type Stroke,
} from '../../utils/ink';
import { triggerHaptic } from '../../utils/haptics';

// A drawing on screen („ნახატობანა“, 2026-11-01; the lines' text is utils/ink.ts): the pad a finger draws on — eight colours
// with the eraser, three widths, a step back, a clean page — and the picture another phone sees, growing as it is drawn or
// played again from its first line. Both are a white square of the same 1000 × 1000 page, so a drawing looks the same on
// every screen.

const PAPER = '#ffffff';

/** the strokes onto a canvas of `side` px (its context already scaled for the screen) */
export const paintInk = (ctx: CanvasRenderingContext2D, strokes: readonly Stroke[], side: number) => {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, side, side);
  const k = side / INK_SIDE;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of strokes) {
    const n = s.p.length >> 1;
    if (!n) continue;
    const w = strokeWidth(s) * k;
    ctx.strokeStyle = INK_COLORS[s.c] ?? INK_COLORS[0];
    ctx.fillStyle = ctx.strokeStyle;
    if (n === 1) {
      ctx.beginPath();
      ctx.arc(s.p[0] * k, s.p[1] * k, w / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(s.p[0] * k, s.p[1] * k);
    // through the middles of the segments: a smooth line
    for (let i = 1; i < n - 1; i++) {
      const x = s.p[i * 2] * k, y = s.p[i * 2 + 1] * k;
      const nx = s.p[i * 2 + 2] * k, ny = s.p[i * 2 + 3] * k;
      ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
    }
    ctx.lineTo(s.p[(n - 1) * 2] * k, s.p[(n - 1) * 2 + 1] * k);
    ctx.stroke();
  }
};

/** a canvas drawn at the screen's own sharpness: its side in CSS px and its context, scaled */
const sized = (c: HTMLCanvasElement) => {
  const side = c.clientWidth || 300;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const px = Math.round(side * dpr);
  if (c.width !== px) { c.width = px; c.height = px; }
  const ctx = c.getContext('2d');
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { side, ctx };
};

/** the drawing as a picture (PNG), for saving or sharing */
export const inkPng = (ink: string, size = 900): Promise<Blob | null> => {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  paintInk(ctx, decodeInk(ink), size);
  return new Promise(res => c.toBlob(b => res(b), 'image/png'));
};

const BOX = 'block bg-white rounded-3xl ring-1 ring-[#e8dcc8] shadow-[0_2px_10px_-6px_rgba(74,52,38,0.4)]';
/** the square's width: the page's, but never taller than the screen leaves room for */
export const inkWidth = (room: number) => `min(100%, 560px, max(220px, calc(100dvh - ${room}px)))`;

// ———————————————————————— the picture

/**
 * A drawing to look at. `grow`: what is added since it was last shown is drawn on over `growMs`, as if drawn now (the host's
 * drawing on a player's phone); a stroke taken back shows at once. `replay`: the whole drawing again from its first line
 * (each time `replayKey` changes). `still`: as it is.
 */
export const InkView: React.FC<{
  ink: string; mode?: 'grow' | 'replay' | 'still'; replayKey?: number; growMs?: number; width?: string; className?: string; label?: string;
}> = ({ ink, mode = 'still', replayKey = 0, growMs = 900, width = inkWidth(360), className = '', label = 'ნახატი' }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const shown = useRef(0);
  const last = useRef('');
  const strokes = useRef<Stroke[]>([]);
  const raf = useRef(0);

  const paint = useCallback((n: number) => {
    const c = canvas.current;
    if (!c) return;
    const { side, ctx } = sized(c);
    if (ctx) paintInk(ctx, inkUpTo(strokes.current, n), side);
  }, []);
  const run = useCallback((from: number, to: number, ms: number) => {
    cancelAnimationFrame(raf.current);
    if (to <= from || ms <= 0) { shown.current = to; paint(to); return; }
    const t0 = performance.now();
    const frame = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      shown.current = Math.round(from + (to - from) * k);
      paint(shown.current);
      if (k < 1) raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
  }, [paint]);

  useEffect(() => {
    const before = last.current;
    last.current = ink;
    strokes.current = decodeInk(ink);
    const total = inkPoints(strokes.current);
    if (mode === 'grow' && inkGrows(before, ink)) run(Math.min(shown.current, total), total, growMs);
    else if (mode !== 'replay') run(total, total, 0);
  }, [ink, mode, growMs, run]);
  useEffect(() => {
    if (mode !== 'replay') return;
    const total = inkPoints(strokes.current);
    run(0, total, Math.min(5000, Math.max(1200, total * 3)));
  }, [mode, replayKey, run]);
  useEffect(() => {
    const c = canvas.current;
    if (!c || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => paint(shown.current));
    ro.observe(c);
    return () => ro.disconnect();
  }, [paint]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return <canvas ref={canvas} role="img" aria-label={label} className={`${BOX} mx-auto ${className}`} style={{ width, aspectRatio: '1' }} />;
};

// ———————————————————————— the pad

const ToolBtn: React.FC<{ on?: boolean; label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({ on, label, onClick, disabled, children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    aria-pressed={on}
    disabled={disabled}
    onClick={() => { triggerHaptic(5); onClick(); }}
    className={`w-9 h-9 shrink-0 rounded-full inline-flex items-center justify-center transition active:scale-95 cursor-pointer disabled:opacity-35 disabled:cursor-default ${on ? 'ring-2 ring-[#7a2028] ring-offset-2 ring-offset-[#fbf6ec]' : ''}`}
  >
    {children}
  </button>
);

/**
 * The pad a finger (or a mouse, a pen) draws on. `onChange` gets the drawing's text while a line is drawn (every `liveMs`)
 * and once it ends (`done`); `initial` is where it starts (a drawing begun before a reload). It keeps its own lines: a new
 * pad (a new `key`) starts a new drawing. `aside`: the tools stand beside the square (a phone on its side has no room under it).
 */
export const InkPad: React.FC<{
  initial?: string; onChange: (ink: string, done: boolean) => void; disabled?: boolean; liveMs?: number; width?: string; className?: string;
  /** the tools beside the square, not under it (a phone on its side) */
  aside?: boolean;
  /** more under the tools (a phone on its side has no footer: the screen's own buttons go here) */
  extra?: React.ReactNode;
}> = ({ initial = '', onChange, disabled, liveMs = 250, width = inkWidth(330), className = '', aside = false, extra }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>(decodeInk(initial));
  const past = useRef<Stroke[][]>([]);
  const live = useRef<{ id: number; s: Stroke } | null>(null);
  const sent = useRef(0);
  const cb = useRef(onChange);
  cb.current = onChange;
  const [color, setColor] = useState(0);
  const [width$, setWidth] = useState(1);
  const [inked, setInked] = useState(strokes.current.length > 0);
  const [full, setFull] = useState(false);
  // the step back's button follows the lines kept (a ref): a change shows it again
  const [, bump] = useState(0);

  const repaint = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const { side, ctx } = sized(c);
    if (ctx) paintInk(ctx, live.current ? [...strokes.current, live.current.s] : strokes.current, side);
  }, []);
  useEffect(() => {
    repaint();
    const c = canvas.current;
    if (!c || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(repaint);
    ro.observe(c);
    return () => ro.disconnect();
  }, [repaint]);

  const all = () => (live.current ? [...strokes.current, live.current.s] : strokes.current);
  const tell = (done: boolean) => {
    const text = encodeInk(all());
    sent.current = Date.now();
    cb.current(text, done);
    return text;
  };
  const at = (e: { clientX: number; clientY: number }) => {
    const r = canvas.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * INK_SIDE, ((e.clientY - r.top) / r.height) * INK_SIDE] as const;
  };
  /** the newest piece of the live line onto the canvas (no full repaint while drawing) */
  const drawTail = (s: Stroke) => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const k = c.clientWidth / INK_SIDE;
    const n = s.p.length >> 1;
    const w = strokeWidth(s) * k;
    ctx.strokeStyle = INK_COLORS[s.c];
    ctx.fillStyle = INK_COLORS[s.c];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (n === 1) { ctx.beginPath(); ctx.arc(s.p[0] * k, s.p[1] * k, w / 2, 0, Math.PI * 2); ctx.fill(); return; }
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(s.p[(n - 2) * 2] * k, s.p[(n - 2) * 2 + 1] * k);
    ctx.lineTo(s.p[(n - 1) * 2] * k, s.p[(n - 1) * 2 + 1] * k);
    ctx.stroke();
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || live.current || full) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = at(e);
    const s: Stroke = { c: color, w: width$, p: [] };
    addPoint(s.p, x, y);
    live.current = { id: e.pointerId, s };
    drawTail(s);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const l = live.current;
    if (!l || l.id !== e.pointerId) return;
    const events = typeof e.nativeEvent.getCoalescedEvents === 'function' ? e.nativeEvent.getCoalescedEvents() : [];
    for (const ev of events.length ? events : [e.nativeEvent]) {
      const [x, y] = at(ev);
      if (addPoint(l.s.p, x, y)) drawTail(l.s);
    }
    if (Date.now() - sent.current >= liveMs) {
      const text = tell(false);
      if (text.length > INK_MAX - 400) up(e);
    }
  };
  const up = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const l = live.current;
    if (!l || l.id !== e.pointerId) return;
    live.current = null;
    past.current = [...past.current.slice(-49), strokes.current];
    strokes.current = [...strokes.current, l.s];
    setInked(true);
    bump(v => v + 1);
    const text = tell(true);
    if (text.length > INK_MAX - 400) setFull(true);
  };
  const undo = () => {
    const prev = past.current[past.current.length - 1];
    if (!prev) return;
    past.current = past.current.slice(0, -1);
    strokes.current = prev;
    setInked(prev.length > 0);
    setFull(false);
    bump(v => v + 1);
    repaint();
    tell(true);
  };
  const clear = () => {
    if (!strokes.current.length) return;
    past.current = [...past.current.slice(-49), strokes.current];
    strokes.current = [];
    setInked(false);
    setFull(false);
    bump(v => v + 1);
    repaint();
    tell(true);
  };

  const eraser = color === ERASER;
  return (
    <div className={`${aside ? 'flex items-start justify-center gap-3' : 'space-y-2.5'} ${className}`}>
      <canvas
        ref={canvas}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className={`${BOX} ${aside ? 'shrink-0' : 'mx-auto'} ${disabled ? 'opacity-60' : eraser ? 'cursor-cell' : 'cursor-crosshair'}`}
        style={{ width, aspectRatio: '1', touchAction: 'none' }}
        aria-label="სახატავი დაფა: ხატე თითით"
      />
      {full && !aside && <p className="text-center text-[12.5px] font-bold text-[#a0322e]" role="status">დაფა სავსეა — წაშალე რამე ან დაიწყე თავიდან.</p>}
      <div className={aside ? 'w-[132px] shrink-0 flex flex-col items-center gap-2' : 'mx-auto flex flex-col items-center gap-2'} style={aside ? undefined : { width }}>
        {full && aside && <p className="text-center text-[12px] font-bold leading-snug text-[#a0322e]" role="status">დაფა სავსეა — წაშალე რამე.</p>}
        <div className={aside ? 'grid grid-cols-3 gap-1.5' : 'flex flex-wrap justify-center gap-1.5'} role="radiogroup" aria-label="ფერი">
          {INK_COLORS.map((hex, i) => (
            <ToolBtn key={hex} on={color === i} label={INK_COLOR_NAMES[i]} onClick={() => setColor(i)}>
              {i === ERASER
                ? <span className="w-8 h-8 rounded-full bg-white ring-1 ring-[#d8c9b0] inline-flex items-center justify-center text-[#75685a]"><Eraser className="w-4 h-4" /></span>
                : <span className="w-8 h-8 rounded-full ring-1 ring-black/10" style={{ background: hex }} />}
            </ToolBtn>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <div className="flex items-center gap-1.5 rounded-full bg-white ring-1 ring-[#e8dcc8] px-1 py-0.5" role="radiogroup" aria-label="სისქე">
            {INK_WIDTHS.map((w, i) => (
              <ToolBtn key={w} on={width$ === i} label={['წვრილი', 'საშუალო', 'მსხვილი'][i]} onClick={() => setWidth(i)}>
                <span className="rounded-full" style={{ width: 6 + i * 6, height: 6 + i * 6, background: eraser ? '#c9b99f' : INK_COLORS[color] }} />
              </ToolBtn>
            ))}
          </div>
          <ToolBtn label="უკან" onClick={undo} disabled={!past.current.length || disabled}>
            <span className="w-9 h-9 rounded-full bg-white ring-1 ring-[#e8dcc8] inline-flex items-center justify-center text-[#4a3426]"><Undo2 className="w-4.5 h-4.5" /></span>
          </ToolBtn>
          <ToolBtn label="ყველაფრის წაშლა" onClick={clear} disabled={!inked || disabled}>
            <span className="w-9 h-9 rounded-full bg-white ring-1 ring-[#e8dcc8] inline-flex items-center justify-center text-[#a0322e]"><Trash2 className="w-4.5 h-4.5" /></span>
          </ToolBtn>
        </div>
        {extra}
      </div>
    </div>
  );
};
