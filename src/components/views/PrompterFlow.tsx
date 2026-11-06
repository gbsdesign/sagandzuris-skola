import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

// The prompter's two other ways of reading (2026-11-06, the user: „განივი კითხვაც დაამატე … ადგილზე რომ გამოჩნდეს სიტყვა“),
// beside the text going up (Prompter.tsx): „გვერდზე“ = one big line crawling right to left, as a news strip, and
// „სიტყვით“ = one word at a time in one place, its key letter always on the same spot so the eye never moves. Both read
// the same words in the same order (`wordsOf`), so a switch of way keeps the place; the pace is the shell's letters a second.

export type Word = { t: string; block: number; head: boolean; end: 0 | 1 | 2 }; // end: 1 = a sentence ends, 2 = a block ends
export type FlowHandle = { word: () => number; toWord: (i: number) => void };
export type Colors = { bg: string; text: string; muted: string; accent: string };

const BREAKS = new Set(['BR', 'P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'LI', 'BLOCKQUOTE', 'SECTION', 'TR', 'TD', 'PRE']);

/** The words of the prompter's copy, in order, each with its block (`data-sgp`). A word split over two pieces of text (a red
 * initial and the rest of it) stays one word. */
export const wordsOf = (body: HTMLElement): Word[] => {
  const out: Word[] = [];
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let spaced = true; // the last thing seen ended a word
  let lastBlock: Element | null = null;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === Node.ELEMENT_NODE) {
      if (BREAKS.has((n as Element).tagName)) spaced = true;
      continue;
    }
    const s = n.textContent || '';
    if (!s) continue;
    const el = n.parentElement;
    const blockEl = el?.closest('[data-sgp]') ?? null;
    const block = blockEl ? Number(blockEl.getAttribute('data-sgp')) : out.length ? out[out.length - 1].block : 0;
    if (blockEl !== lastBlock) {
      if (out.length) out[out.length - 1].end = 2;
      spaced = true;
      lastBlock = blockEl;
    }
    const head = !!el?.closest('h1, h2, h3, h4, h5, .sgp-glory');
    const parts = s.split(/\s+/);
    if (!spaced && !/^\s/.test(s) && parts[0] && out.length) out[out.length - 1].t += parts.shift();
    for (const t of parts) if (t) out.push({ t, block, head, end: /[.!?;:][»“”"']?$/.test(t) ? 1 : 0 });
    spaced = /\s$/.test(s);
  }
  if (out.length) out[out.length - 1].end = 2;
  return out;
};

/** The first word of block `block` (or of the next one that has words). */
export const firstWordOf = (words: Word[], block: number) => {
  const i = words.findIndex(w => w.block >= block);
  return i < 0 ? Math.max(0, words.length - 1) : i;
};

type FlowProps = {
  words: Word[];
  start: number;
  running: boolean;
  size: number;
  colors: Colors;
  /** letters a second */
  pace: () => number;
  held: React.MutableRefObject<boolean>;
  handle: React.MutableRefObject<FlowHandle | null>;
  onEnd: () => void;
  /** how far (0…1) and how many letters are left */
  onProgress: (done: number, lettersLeft: number) => void;
};

const lettersAfter = (words: Word[]) => {
  const left = new Array<number>(words.length + 1).fill(0);
  for (let i = words.length - 1; i >= 0; i--) left[i] = left[i + 1] + words[i].t.length + 1;
  return left;
};

// ——— „გვერდზე“: the strip ———

const ANCHOR = 0.18; // where the word being read stands, from the left

export const Ticker: React.FC<FlowProps> = ({ words, start, running, size, colors, pace, held, handle, onEnd, onProgress }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const font = Math.round(size * 1.25);
  const [geo, setGeo] = useState<{ xs: number[]; ws: number[]; total: number; width: number } | null>(null);
  const off = useRef(0); // the text's place under the anchor, in px
  const [win, setWin] = useState(0);
  const left = useMemo(() => lettersAfter(words), [words]);
  const drag = useRef<{ x: number; off: number } | null>(null);

  // where every word stands on the line (the browser's own measure of the stage's letters)
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fam = getComputedStyle(stage).fontFamily;
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return;
    const xs: number[] = [];
    const ws: number[] = [];
    ctx.font = `400 ${font}px ${fam}`;
    const space = ctx.measureText(' ').width * 1.15;
    let x = 0;
    words.forEach(w => {
      ctx.font = `${w.head ? 700 : 400} ${font}px ${fam}`;
      const wd = ctx.measureText(w.t).width;
      xs.push(x);
      ws.push(wd);
      x += wd + (w.end === 2 ? font * 1.6 : space);
    });
    const was = geo && geo.xs.length ? wordAt(geo.xs, off.current) : start;
    setGeo({ xs, ws, total: x, width: stage.clientWidth });
    off.current = xs[Math.min(was, xs.length - 1)] ?? 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, font]);

  const wordAt = (xs: number[], at: number) => {
    let lo = 0;
    let hi = xs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (xs[mid] <= at) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };

  const paint = () => {
    const g = geo;
    const track = trackRef.current;
    if (!g || !track) return;
    track.style.transform = `translate3d(${g.width * ANCHOR - off.current}px, -50%, 0)`;
    const w = Math.floor(off.current / Math.max(1, g.width));
    setWin(prev => (prev === w ? prev : w));
    const i = wordAt(g.xs, off.current);
    onProgress(g.total > 0 ? off.current / g.total : 0, left[i]);
  };

  useLayoutEffect(paint);

  handle.current = {
    word: () => (geo ? wordAt(geo.xs, off.current) : start),
    toWord: i => { if (geo) { off.current = geo.xs[Math.max(0, Math.min(i, geo.xs.length - 1))] ?? 0; paint(); } },
  };

  useEffect(() => {
    if (!running || !geo) return;
    let last = performance.now();
    let frame = 0;
    const pxPerLetter = geo.total / Math.max(1, left[0]);
    const step = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      if (!held.current) {
        off.current += (pace() * pxPerLetter * dt) / 1000;
        if (off.current >= geo.total) {
          off.current = geo.total;
          paint();
          onEnd();
          return;
        }
        paint();
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, geo]);

  // a finger moved sideways moves the line (back to read again, or on)
  const down = (e: React.PointerEvent) => { drag.current = { x: e.clientX, off: off.current }; };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !geo) return;
    off.current = Math.max(0, Math.min(geo.total, d.off - (e.clientX - d.x)));
    paint();
  };
  const up = () => { drag.current = null; };

  const shown = geo
    ? words.map((w, i) => i).filter(i => {
        const x = geo.xs[i];
        return x + geo.ws[i] >= (win - 1) * geo.width && x <= (win + 2) * geo.width;
      })
    : [];

  return (
    <div
      ref={stageRef}
      className="absolute inset-0 overflow-hidden font-serif-ge"
      style={{ touchAction: 'none' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2" style={{ height: font * 1.9, background: `${colors.accent}14` }} aria-hidden />
      <div ref={trackRef} className="absolute left-0 top-1/2 will-change-transform" style={{ height: font * 1.5, fontSize: font, lineHeight: 1.5 }}>
        {geo &&
          shown.map(i => {
            const w = words[i];
            return (
              <React.Fragment key={i}>
                <span className="absolute top-0 whitespace-nowrap" style={{ left: geo.xs[i], color: w.head ? colors.accent : colors.text, fontWeight: w.head ? 700 : 400 }}>
                  {w.t}
                </span>
                {w.end === 2 && i < words.length - 1 && (
                  <span className="absolute top-0" style={{ left: geo.xs[i] + geo.ws[i] + font * 0.62, color: colors.muted }} aria-hidden>
                    •
                  </span>
                )}
              </React.Fragment>
            );
          })}
      </div>
      {/* the edges fade */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[12%]" style={{ background: `linear-gradient(90deg, ${colors.bg}, ${colors.bg}00)` }} />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[10%]" style={{ background: `linear-gradient(270deg, ${colors.bg}, ${colors.bg}00)` }} />
    </div>
  );
};

// ——— „სიტყვით“: one word in one place (or a few together, `chunk`) ———

// the letter the eye rests on: a little left of the word's middle
const keyLetter = (len: number) => (len <= 1 ? 0 : len <= 5 ? 1 : len <= 9 ? 2 : len <= 13 ? 3 : 4);
const SPOT = 0.36; // where that letter stands, from the left

const durationOf = (w: Word, perSecond: number) => {
  const base = Math.max(0.18, (w.t.length + 1) / perSecond);
  return base * (w.end === 2 ? 2.4 : w.end === 1 ? 1.8 : /[,—–]$/.test(w.t) ? 1.35 : w.head ? 1.2 : 1);
};

// a few words at once: up to `n`, but a sentence's or a block's end closes the group
const groupEnd = (words: Word[], i: number, n: number) => {
  let k = i;
  while (k < words.length && k - i < n) {
    k++;
    if (words[k - 1].end > 0) break;
  }
  return Math.max(k, i + 1);
};

export const Flash: React.FC<FlowProps & { chunk: number }> = ({ words, start, chunk, running, size, colors, pace, held, handle, onEnd, onProgress }) => {
  const [i, setI] = useState(() => Math.min(start, Math.max(0, words.length - 1)));
  const at = useRef(i);
  const left = useMemo(() => lettersAfter(words), [words]);
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const go = (k: number) => {
    at.current = k;
    setI(k);
  };

  useLayoutEffect(() => {
    onProgress(words.length > 1 ? i / (words.length - 1) : 1, left[i]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  handle.current = {
    word: () => at.current,
    toWord: k => go(Math.max(0, Math.min(k, words.length - 1))),
  };

  const chunkRef = useRef(chunk);
  chunkRef.current = chunk;
  const groupTime = (from: number) => {
    const to = groupEnd(words, from, chunkRef.current);
    let t = 0;
    for (let k = from; k < to; k++) t += durationOf(words[k], pace());
    // a group is read in one look: a little less than its words one by one
    return t * (to - from > 1 ? 0.85 : 1);
  };

  useEffect(() => {
    if (!running) return;
    let id = 0;
    const tick = () => {
      if (held.current) { id = window.setTimeout(tick, 100); return; }
      const k = groupEnd(words, at.current, chunkRef.current);
      if (k >= words.length) { onEnd(); return; }
      go(k);
      id = window.setTimeout(tick, groupTime(k) * 1000);
    };
    id = window.setTimeout(tick, groupTime(at.current) * 1000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const w = words[i];
  if (!w) return null;

  // a few words: one line in the middle (two when long), the letters as big as fits
  if (chunk > 1) {
    const group = words.slice(i, groupEnd(words, i, chunk));
    const letters = group.reduce((n, g) => n + g.t.length + 1, 0);
    // up to three words on one line; four or five may take two
    const lines = chunk <= 3 ? 1 : 1.8;
    const font = Math.max(22, Math.min(size * 1.35, ((width - 48) * lines) / Math.max(1, letters * 0.6)));
    return (
      <div className="absolute inset-0 flex items-center font-serif-ge" style={{ touchAction: 'none' }}>
        <div className="relative w-full flex items-center justify-center px-6" style={{ minHeight: size * 3.4 }}>
          <div className="absolute inset-x-[6%] top-0 h-px opacity-30" style={{ background: colors.muted }} aria-hidden />
          <div className="absolute inset-x-[6%] bottom-0 h-px opacity-30" style={{ background: colors.muted }} aria-hidden />
          <p className="text-center text-balance" style={{ fontSize: font, lineHeight: 1.3 }}>
            {group.map((g, k) => (
              <React.Fragment key={k}>
                {k > 0 && ' '}
                <span style={{ color: g.head ? colors.accent : colors.text, fontWeight: g.head ? 700 : 400 }}>{g.t}</span>
              </React.Fragment>
            ))}
          </p>
        </div>
      </div>
    );
  }
  const k = keyLetter(w.t.length);
  const before = w.t.slice(0, k);
  const letter = w.t.slice(k, k + 1);
  const after = w.t.slice(k + 1);
  // big, but a long word still fits on its side of the spot
  const per = 0.62;
  const font = Math.min(
    size * 1.45,
    (width * (1 - SPOT) - 24) / Math.max(1, (after.length + 0.5) * per),
    (width * SPOT - 16) / Math.max(1, (before.length + 0.5) * per),
  );
  const tick = { background: colors.accent };

  return (
    <div className="absolute inset-0 flex items-center font-serif-ge" style={{ touchAction: 'none' }}>
      <div className="relative w-full" style={{ height: size * 2.6 }}>
        {/* the two guide lines and the spot's ticks: the eye stays here */}
        <div className="absolute inset-x-[6%] top-0 h-px opacity-30" style={{ background: colors.muted }} aria-hidden />
        <div className="absolute inset-x-[6%] bottom-0 h-px opacity-30" style={{ background: colors.muted }} aria-hidden />
        <div className="absolute top-0 w-0.5 h-3 -translate-x-1/2" style={{ ...tick, left: `${SPOT * 100}%` }} aria-hidden />
        <div className="absolute bottom-0 w-0.5 h-3 -translate-x-1/2" style={{ ...tick, left: `${SPOT * 100}%` }} aria-hidden />
        <div
          className="absolute inset-0 grid items-center whitespace-nowrap"
          style={{ gridTemplateColumns: `${SPOT * 100}fr auto ${(1 - SPOT) * 100}fr`, fontSize: font, lineHeight: 1.2, fontWeight: w.head ? 700 : 400 }}
          aria-live="off"
        >
          <span className="text-right" style={{ color: w.head ? colors.accent : colors.text }}>{before}</span>
          <span style={{ color: colors.accent }}>{letter}</span>
          <span className="text-left" style={{ color: w.head ? colors.accent : colors.text }}>{after}</span>
        </div>
      </div>
    </div>
  );
};
