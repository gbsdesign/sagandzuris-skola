import React, { useRef, useState } from 'react';
import { triggerHaptic } from '../../utils/haptics';

/** What a swipe to one side does: its colour and words show behind the row while the finger moves. */
export interface SwipeSide {
  label: string;
  icon: React.ReactNode;
  /** the colour behind the row (Tailwind classes) */
  tone: string;
  /** the row slides out and folds up before `run` (a delete, a hide); else it springs back and `run` runs */
  leave?: boolean;
  run: () => void;
}

/** A row that answers a swipe aside (a finger or a mouse): past a third of its width, or flicked, `left` (the finger
 *  moves left) or `right` runs; less, and it springs back. A side with nothing to do only gives a little and springs
 *  back. A swipe never counts as a tap. Up and down stay the list's scroll. (The 🔔 list, the messages list.) */
export const SwipeRow: React.FC<{
  left?: SwipeSide; right?: SwipeSide; className?: string;
  /** the row's own background while it moves, when the row itself has none (so the colour behind does not show through) */
  faceBg?: string;
  children: React.ReactNode;
}> = ({ left, right, className, faceBg, children }) => {
  const box = useRef<HTMLDivElement>(null);
  const face = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x0: number; y0: number; t0: number; dx: number; on: boolean } | null>(null);
  const swiped = useRef(false);
  const [side, setSide] = useState(0);
  const sideOf = (dx: number) => (dx < 0 ? left : dx > 0 ? right : undefined);
  const place = (dx: number, animate: boolean, fade = true) => {
    const el = face.current;
    if (!el) return;
    el.style.transition = animate ? 'transform 0.22s ease, opacity 0.22s ease' : 'none';
    el.style.transform = dx ? `translateX(${dx}px)` : '';
    el.style.opacity = dx && fade ? String(Math.max(0.35, 1 - Math.abs(dx) / ((box.current?.offsetWidth || 300) * 1.2))) : '';
  };
  const back = () => {
    place(0, true);
    window.setTimeout(() => setSide(0), 220);
  };
  const end = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.on) return;
    const w = box.current?.offsetWidth || 300;
    const act = sideOf(d.dx);
    const fast = Math.abs(d.dx) / Math.max(1, performance.now() - d.t0) > 0.6 && Math.abs(d.dx) > 40;
    if (!act || (Math.abs(d.dx) < w * 0.33 && !fast)) { back(); return; }
    triggerHaptic(12);
    if (!act.leave) { back(); act.run(); return; }
    place(Math.sign(d.dx) * w * 1.1, true);
    window.setTimeout(() => {
      const el = box.current;
      if (el) {
        el.style.height = `${el.offsetHeight}px`;
        el.style.transition = 'height 0.2s ease, margin 0.2s ease';
        void el.offsetHeight;
        el.style.height = '0px';
        el.style.marginTop = '0px';
      }
      window.setTimeout(act.run, 200);
    }, 200);
  };
  const shown = sideOf(side);
  return (
    <div
      ref={box}
      className={`relative overflow-hidden rounded-2xl touch-pan-y select-none ${className || ''}`}
      onPointerDown={e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        drag.current = { x0: e.clientX, y0: e.clientY, t0: performance.now(), dx: 0, on: false };
        swiped.current = false;
      }}
      onPointerMove={e => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
        if (!d.on) {
          if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag.current = null; return; }
          if (Math.abs(dx) < 10) return;
          d.on = true;
          swiped.current = true;
          box.current?.setPointerCapture(e.pointerId);
        }
        // a side with nothing to do gives only a little (a quarter of the finger's way, at most 24 px)
        const free = !!sideOf(dx);
        d.dx = free ? dx : Math.sign(dx) * Math.min(24, Math.abs(dx) / 4);
        setSide(Math.sign(dx));
        place(d.dx, false, free && !!sideOf(dx)?.leave);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onClickCapture={e => {
        if (!swiped.current) return;
        swiped.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {shown && (
        <div aria-hidden className={`absolute inset-0 rounded-2xl flex items-center px-5 gap-2 text-[13px] font-bold ${shown.tone} ${side > 0 ? 'justify-start' : 'justify-end'}`}>
          {shown.icon} {shown.label}
        </div>
      )}
      <div ref={face} className={`relative rounded-2xl ${side && faceBg ? faceBg : ''}`}>{children}</div>
    </div>
  );
};
