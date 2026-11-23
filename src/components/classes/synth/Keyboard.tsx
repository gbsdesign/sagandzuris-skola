import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isBlack, noteNameOf } from '../../../utils/melody';
import { triggerHaptic } from '../../../utils/haptics';

/**
 * The keyboard (2026-11-23): white and black keys from `lo` to `hi` (MIDI), a finger slides from key to key, several fingers
 * at once. Keys fit ten white ones to the width (36–56 px each); ‹ › move it by an octave. `lit` = keys sounding (wine),
 * `target` = the key to press next (a gold ring), `wrong` = a missed key (red a moment).
 */
export const Keyboard: React.FC<{
  lo: number;
  hi: number;
  lit?: ReadonlySet<number>;
  target?: number | null;
  wrong?: number | null;
  onDown: (midi: number) => void;
  onUp: (midi: number) => void;
  /** the key the view starts at (its octave's დო on the left) */
  startAt?: number;
  height?: number;
}> = ({ lo, hi, lit, target, wrong, onDown, onUp, startAt = 60, height = 150 }) => {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(40);
  const [scroll, setScroll] = useState({ left: 0, max: 0 });
  const whites = useMemo(() => {
    const out: number[] = [];
    for (let m = lo; m <= hi; m++) if (!isBlack(m)) out.push(m);
    return out;
  }, [lo, hi]);
  const blacks = useMemo(() => {
    const out: { midi: number; x: number }[] = [];
    let wi = 0;
    for (let m = lo; m <= hi; m++) {
      if (isBlack(m)) { if (wi > 0) out.push({ midi: m, x: wi }); } else wi++;
    }
    return out;
  }, [lo, hi]);

  // ten white keys to the width, never thinner than 36 or wider than 56
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setW(Math.max(36, Math.min(56, Math.floor(el.clientWidth / 10))));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const measure = () => {
    const el = box.current;
    if (el) setScroll({ left: el.scrollLeft, max: el.scrollWidth - el.clientWidth });
  };
  // the view starts at the asked octave
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const c = Math.max(lo, Math.floor(startAt / 12) * 12);
    const i = whites.findIndex(m => m >= c);
    el.scrollLeft = Math.max(0, i) * w;
    measure();
  }, [w, lo, hi, startAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = (d: 1 | -1) => {
    const el = box.current;
    if (!el) return;
    triggerHaptic(8);
    el.scrollTo({ left: el.scrollLeft + d * 7 * w, behavior: 'smooth' });
    window.setTimeout(measure, 350);
  };

  // each finger: the key under it (a slide moves to the next key)
  const fingers = useRef(new Map<number, number>());
  const keyAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-midi]');
    return el && box.current?.contains(el) ? Number(el.dataset.midi) : null;
  };
  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    const m = keyAt(e.clientX, e.clientY);
    if (m === null) return;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* fine */ }
    fingers.current.set(e.pointerId, m);
    onDown(m);
  };
  const slide = (e: React.PointerEvent) => {
    const was = fingers.current.get(e.pointerId);
    if (was === undefined) return;
    const m = keyAt(e.clientX, e.clientY);
    if (m === null || m === was) return;
    onUp(was);
    fingers.current.set(e.pointerId, m);
    onDown(m);
  };
  const up = (e: React.PointerEvent) => {
    const was = fingers.current.get(e.pointerId);
    if (was === undefined) return;
    fingers.current.delete(e.pointerId);
    onUp(was);
  };
  // a key left held when the keyboard goes away is let go
  useEffect(() => () => { fingers.current.forEach(m => onUp(m)); fingers.current.clear(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const look = (m: number, black: boolean) =>
    wrong === m ? (black ? 'bg-danger' : 'bg-danger/70')
    : lit?.has(m) ? (black ? 'bg-wine' : 'bg-wine/75')
    : black ? 'bg-ink' : 'bg-white';

  return (
    <div className="flex items-stretch gap-1">
      <button type="button" onClick={() => move(-1)} disabled={scroll.left <= 1} aria-label="დაბლა ოქტავით"
        className="flex w-9 shrink-0 cursor-pointer items-center justify-center rounded-field bg-soft text-wine transition active:scale-95 disabled:opacity-30 [&_svg]:size-5">
        <ChevronLeft />
      </button>
      <div ref={box} onScroll={measure} className="relative min-w-0 flex-1 overflow-hidden rounded-field bg-ink/80 p-[2px]">
        <div
          className="relative touch-none select-none [-webkit-touch-callout:none]"
          style={{ width: whites.length * w, height }}
          onPointerDown={down}
          onPointerMove={slide}
          onPointerUp={up}
          onPointerCancel={up}
          onContextMenu={e => e.preventDefault()}
          role="group"
          aria-label="კლავიატურა"
        >
          {whites.map((m, i) => (
            <div
              key={m}
              data-midi={m}
              className={`absolute top-0 bottom-0 flex flex-col items-center justify-end rounded-b-[7px] border-r border-ink/15 pb-1.5 transition-colors duration-75 ${look(m, false)} ${target === m ? 'sg-key-target' : ''}`}
              style={{ left: i * w, width: w - 1 }}
            >
              <span className={`pointer-events-none text-cap leading-none ${lit?.has(m) || wrong === m ? 'text-white' : m % 12 === 0 ? 'font-bold text-wine' : 'text-mut'}`}>
                {noteNameOf(m)}
              </span>
              {m % 12 === 0 && <span className={`pointer-events-none mt-0.5 text-[11px] leading-none ${lit?.has(m) ? 'text-white/80' : 'text-faint'}`}>{m / 12 - 1}</span>}
            </div>
          ))}
          {blacks.map(({ midi, x }) => (
            <div
              key={midi}
              data-midi={midi}
              className={`absolute top-0 z-[1] rounded-b-[6px] shadow-[0_2px_3px_rgba(0,0,0,.35)] transition-colors duration-75 ${look(midi, true)} ${target === midi ? 'sg-key-target' : ''}`}
              style={{ left: x * w - w * 0.31, width: w * 0.62, height: height * 0.6 }}
            />
          ))}
        </div>
      </div>
      <button type="button" onClick={() => move(1)} disabled={scroll.left >= scroll.max - 1} aria-label="მაღლა ოქტავით"
        className="flex w-9 shrink-0 cursor-pointer items-center justify-center rounded-field bg-soft text-wine transition active:scale-95 disabled:opacity-30 [&_svg]:size-5">
        <ChevronRight />
      </button>
    </div>
  );
};
