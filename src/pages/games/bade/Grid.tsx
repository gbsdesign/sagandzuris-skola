import React, { useEffect, useRef, useState } from 'react';
import { lineOf } from '../../../utils/bade';
import { triggerHaptic } from '../../../utils/haptics';

// The square of letters of „ასოების ბადე“ (2026-11-01). A finger drawn from a word's first letter to its last marks it —
// the line snaps across, down or diagonal (utils/bade.ts `lineOf`) — and a tap on the first letter and then on the last does
// the same, for a mouse or an unsteady hand. Words found lie under their letters as coloured capsules (an SVG behind the
// letters); a missed word shows faint at the end. The letters scale with the square (container units), so the same grid fills
// a phone or a projector.

/** a word's capsule; `dashed` = a word nobody found, shown faint once the grid is over */
export interface Mark { cells: number[]; color: string; dashed?: boolean }

/** the found words' colours when no team owns them: one each, in the order found */
export const WORD_TINTS = ['#f2b632', '#5fb36a', '#4f9fdc', '#b675c9', '#ef8a54', '#3fb3a6', '#e0708f', '#8fab3e', '#7f8bd9', '#c99a52'];

const capsule = (cells: number[], size: number) => {
  const a = cells[0], b = cells[cells.length - 1];
  return { x1: (a % size) + 0.5, y1: Math.floor(a / size) + 0.5, x2: (b % size) + 0.5, y2: Math.floor(b / size) + 0.5 };
};

export const BadeGrid: React.FC<{
  size: number;
  /** the letters as shown (already in the chosen script) */
  letters: string[];
  marks: Mark[];
  /** a drawn line: true when it was a hidden word; leave it out for a grid only to look at */
  onLine?: (cells: number[]) => boolean;
  /** the first touch (a clock waiting for it) */
  onTouch?: () => void;
  /** a word to point at for a moment (picked from the list) */
  flash?: number[] | null;
  label: string;
}> = ({ size, letters, marks, onLine, onTouch, flash, label }) => {
  const ref = useRef<HTMLDivElement>(null);
  // the line being drawn lives in refs too: a pointer's events may come faster than React draws, and the last move must count
  const [drag, setDragState] = useState<{ from: number; to: number; moved: boolean } | null>(null);
  const [anchor, setAnchorState] = useState<number | null>(null);
  const dragRef = useRef(drag);
  const anchorRef = useRef(anchor);
  const setDrag = (d: typeof drag) => { dragRef.current = d; setDragState(d); };
  const setAnchor = (a: number | null) => { anchorRef.current = a; setAnchorState(a); };
  const [bad, setBad] = useState<number[] | null>(null);
  useEffect(() => {
    if (!bad) return;
    const t = window.setTimeout(() => setBad(null), 420);
    return () => window.clearTimeout(t);
  }, [bad]);
  // a new grid forgets a half-drawn line
  const gridKey = letters.join('');
  useEffect(() => { setAnchor(null); setDrag(null); }, [gridKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // the letters stand inside a 3% margin
  const cellAt = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const clamp = (v: number) => Math.min(size - 1, Math.max(0, Math.floor(v)));
    const at = (p: number, from: number, len: number) => clamp(((p - from - len * 0.03) / (len * 0.94)) * size);
    return at(e.clientY, r.top, r.height) * size + at(e.clientX, r.left, r.width);
  };
  const submit = (cells: number[]) => {
    if (!onLine || cells.length < 2) return;
    if (onLine(cells)) { triggerHaptic(18); return; }
    triggerHaptic(35);
    setBad(cells);
  };

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onLine || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    ref.current?.setPointerCapture(e.pointerId);
    onTouch?.();
    const c = cellAt(e);
    setDrag({ from: c, to: c, moved: false });
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const c = cellAt(e);
    if (c !== d.to) setDrag({ ...d, to: c, moved: d.moved || c !== d.from });
  };
  const up = (e: React.PointerEvent<HTMLDivElement>) => {
    move(e);
    const d = dragRef.current;
    if (!d) return;
    const { from, to, moved } = d;
    const anchor = anchorRef.current;
    setDrag(null);
    if (moved) {
      // drawn back to where it began: nothing
      if (from !== to) submit(lineOf(from, to, size));
      setAnchor(null);
      return;
    }
    // a tap: the first letter, then the last
    if (anchor === null) setAnchor(from);
    else if (anchor === from) setAnchor(null);
    else { submit(lineOf(anchor, from, size)); setAnchor(null); }
  };

  const live = drag && drag.moved ? lineOf(drag.from, drag.to, size) : anchor !== null ? [anchor] : null;
  const letterSize = `calc(100cqw / ${size} * ${size > 10 ? 0.6 : 0.56})`;

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => setDrag(null)}
      className={`relative w-full aspect-square select-none rounded-2xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_8px_22px_-16px_rgba(74,52,38,0.55)] ${onLine ? 'cursor-pointer' : ''}`}
      style={{ containerType: 'inline-size', touchAction: onLine ? 'none' : 'auto', WebkitTouchCallout: 'none' }}
    >
      <svg className="absolute inset-[3%] w-[94%] h-[94%] pointer-events-none" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {marks.map((m, i) => {
          const p = capsule(m.cells, size);
          return m.dashed
            ? <line key={i} {...p} stroke={m.color} strokeWidth={0.7} strokeLinecap="round" opacity={0.3} />
            : <line key={i} {...p} stroke={m.color} strokeWidth={0.76} strokeLinecap="round" opacity={0.5} />;
        })}
        {flash && flash.length > 1 && <line {...capsule(flash, size)} stroke="#7a2028" strokeWidth={0.86} strokeLinecap="round" opacity={0.28} className="animate-pulse" />}
        {live && (live.length > 1
          ? <line {...capsule(live, size)} stroke="#7a2028" strokeWidth={0.8} strokeLinecap="round" opacity={0.32} />
          : <circle cx={(live[0] % size) + 0.5} cy={Math.floor(live[0] / size) + 0.5} r={0.4} fill="#7a2028" opacity={0.3} />)}
        {bad && <line {...capsule(bad, size)} stroke="#c0392b" strokeWidth={0.8} strokeLinecap="round" opacity={0.35} />}
      </svg>
      <div className="absolute inset-[3%] grid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, gridTemplateRows: `repeat(${size}, 1fr)` }} aria-hidden="true">
        {letters.map((ch, i) => (
          <span key={i} className="flex items-center justify-center font-serif-ge font-bold leading-none text-[#3d2a1e]" style={{ fontSize: letterSize }}>{ch}</span>
        ))}
      </div>
    </div>
  );
};
