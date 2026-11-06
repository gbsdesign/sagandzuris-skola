import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowUp, ChevronLeft, ChevronRight, Focus, Loader2, Minus, Moon, Pause, Play, Plus, RotateCcw, Sun, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Flash, Ticker, firstWordOf, wordsOf, type FlowHandle, type Word } from './PrompterFlow';

// „წამყვანის ეკრანი“ (2026-11-06, the user: „ავტომატური კითხვის ჟურნალისტური ვერსია … წამყვანებს წინ რომ ეკრანი აქვთ“):
// the text being read, big, over the whole screen, gliding up past a reading line as on a television prompter. Opened
// from the auto-scroll bar's „სრულ ეკრანზე“ (`AutoScroll` in ReadingTools): it starts where the page was being read and
// gives the page back where it stopped. Dark (light letters on black) or light, the reader's pick, kept on the device
// with the letters' size. It opens standing still (the user: „წამზომი არ უნდა თავად იწყებოდეს“): ▶ — or a tap — counts
// 3-2-1 and sets it going; after a pause it goes on at once. A tap pauses / goes on, a finger held stops it; the speed is
// the bar's own and means the same reading pace here (letters a second), whatever the letters' size. The text goes up, as
// on a television prompter — a sideways crawl was offered and declined (harder on the eye for a long text).

// the blocks a text is made of: the page and its copy here are matched by their order
export const BLOCKS = 'p, h1, h2, h3, h4, h5, li, blockquote, pre';

type Scroller = HTMLElement | null; // null = the window
const viewTop = (s: Scroller) => (s ? s.getBoundingClientRect().top : 0);
const viewHeight = (s: Scroller) => (s ? s.clientHeight : window.innerHeight);
// on the page the eye is about a third of the way down the screen
const PAGE_EYE = 0.3;

/** The block of `source` being read now (the first one that reaches past the eye's line). */
export const blockAtReading = (source: HTMLElement, s: Scroller) => {
  const eye = viewTop(s) + viewHeight(s) * PAGE_EYE;
  const blocks = source.querySelectorAll(BLOCKS);
  for (let i = 0; i < blocks.length; i++) if (blocks[i].getBoundingClientRect().bottom > eye) return i;
  return Math.max(0, blocks.length - 1);
};

/** Scrolls the page so that block `i` of `source` stands at the eye's line. */
export const showBlock = (source: HTMLElement, s: Scroller, i: number) => {
  const el = source.querySelectorAll(BLOCKS)[i];
  if (!el) return;
  const by = el.getBoundingClientRect().top - (viewTop(s) + viewHeight(s) * PAGE_EYE);
  if (s) s.scrollTop += by;
  else window.scrollTo({ top: window.scrollY + by, behavior: 'instant' as ScrollBehavior });
};

// what the page shows only to work it (buttons, pictures, ornaments) stays out of the copy
const DROP = 'button, svg, img, picture, figure, audio, video, iframe, input, select, textarea, nav, [aria-hidden="true"], [data-no-prompter]';

// A psalter kanon (the user, 2026-11-06: „ფსალმუნის მუხლის ციფრები ან სათაურები არ ჩანდეს … მაღლა რომელი კანონია და რომელი
// დიდება“): its psalms' headings and verses' numbers stay out of the copy, every block learns its glory and its psalm
// (`data-glory`, `data-psalm`; a psalm's first block `data-psalm-start`) for the place line on top, and the page's
// „დიდებაი ▾“ button becomes a plain golden „დიდებაი“ where the glory is said.
const markPsalter = (copy: HTMLElement) => {
  let glory = 1;
  let psalm: number | null = null;
  let fresh = false; // the next block is a psalm's first
  // the page makes each „დიდებაი.“ a button; in the prayer's own ხუცური it stays the book's <em> (its letters turned)
  const buttons = copy.querySelector('button[data-glory]') !== null;
  const walker = document.createTreeWalker(copy, NodeFilter.SHOW_ELEMENT);
  for (let n = walker.nextNode() as Element | null; n; n = walker.nextNode() as Element | null) {
    const tag = n.tagName;
    if (tag === 'H3' || tag === 'H2') {
      const t = (n.textContent || '').trim();
      const num = t.match(/^(\d+)\./)?.[1] ?? t.match(/(\d+)\s*$/)?.[1];
      if (num) { psalm = Number(num); fresh = true; }
      else if (tag === 'H2' && t && psalm !== null) { psalm += 1; fresh = true; } // the 151st, after the 150th
      continue;
    }
    // the block holding the mark belongs to the glory it ends
    if (n.hasAttribute('data-glory')) { glory += 1; continue; }
    if (!buttons && tag === 'EM') { glory += 1; n.classList.add('sgp-glory'); continue; }
    if (n.hasAttribute('data-sgp')) {
      n.setAttribute('data-glory', String(Math.min(3, glory)));
      if (psalm !== null) n.setAttribute('data-psalm', String(psalm));
      if (fresh && psalm !== null) { n.setAttribute('data-psalm-start', ''); fresh = false; }
    }
  }
  copy.querySelectorAll('button[data-glory]').forEach(b => {
    const mark = document.createElement('span');
    mark.className = 'sgp-glory';
    mark.textContent = (b.textContent || '').replace(/[▾\s]+$/u, '').trim() || 'დიდებაი.';
    b.replaceWith(mark);
  });
  copy.querySelectorAll('h2, h3').forEach(h => h.remove());
  // the verses' numbers: „1. ნეტარ…“, „… ჟამსა თვისსა. 4. არა ესრე…“
  const texts = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
  for (let t = texts.nextNode(); t; t = texts.nextNode()) {
    const v = t.nodeValue || '';
    if (/\d/.test(v)) t.nodeValue = v.replace(/(^|[\s(])\d{1,3}\.\s*/g, '$1');
  }
};

/** The text of `source` as it is on screen now (ხუცური too), each block numbered for `blockAtReading`; `psalter` = a
 * psalter kanon's own way (`markPsalter`). */
export const prompterCopy = (source: HTMLElement, psalter = false) => {
  const copy = source.cloneNode(true) as HTMLElement;
  copy.querySelectorAll(BLOCKS).forEach((b, i) => b.setAttribute('data-sgp', String(i)));
  if (psalter) markPsalter(copy);
  copy.querySelectorAll(DROP).forEach(n => n.remove());
  // a drop cap's letter is kept for screen readers only: here it is just the word's first letter again
  copy.querySelectorAll('.sr-only').forEach(n => n.classList.remove('sr-only'));
  copy.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  copy.querySelectorAll('[style]').forEach(n => n.removeAttribute('style')); // the page's own sizes
  return copy.innerHTML;
};

type Theme = 'dark' | 'light';
const LOOK: Record<Theme, { bg: string; text: string; muted: string; accent: string; band: string; bar: string; ring: string; btn: string; hover: string; play: string; playText: string }> = {
  dark: {
    bg: '#100d0a', text: '#f4ecdf', muted: '#b4a58f', accent: '#e8c37c', band: 'rgba(232,195,124,0.10)',
    bar: 'rgba(30,25,20,0.92)', ring: 'rgba(255,255,255,0.14)', btn: '#f4ecdf', hover: 'hover:bg-white/10', play: '#e8c37c', playText: '#100d0a',
  },
  light: {
    bg: '#fbf6ec', text: '#2a2017', muted: '#7a6655', accent: '#7a2028', band: 'rgba(122,32,40,0.07)',
    bar: 'rgba(255,255,255,0.95)', ring: '#e8dcc8', btn: '#7a2028', hover: 'hover:bg-[#7a2028]/[0.07]', play: '#7a2028', playText: '#fbf6ec',
  },
};

const SIZES = [22, 26, 30, 34, 40, 46, 54, 62];
// the reading line: where the eye reads, a third of the way down the screen by default. Its band and arrows show only
// when the reader turns them on (the user, 2026-11-06: „ნებით … აწევ-დაწევა ამ განივი ისრების“): then the arrows are
// handles that move it up or down. Both kept on the device.
const LINE = 0.36;
const LINE_MIN = 0.22; // under the place line
const LINE_MAX = 0.7;
const GUIDE_KEY = 'sg-prompter-guide';
// three ways of reading: the text goes up (as on television), one line goes sideways, one word at a time in one place
type Mode = 'up' | 'side' | 'word';
const MODES: { id: Mode; label: string; Icon: typeof ArrowUp }[] = [
  { id: 'up', label: 'ზემოთ', Icon: ArrowUp },
  { id: 'side', label: 'გვერდზე', Icon: ArrowLeft },
  { id: 'word', label: 'სიტყვით', Icon: Focus },
];
const MODE_KEY = 'sg-prompter-mode';
const CHUNK_KEY = 'sg-prompter-chunk'; // „სიტყვით“: how many words show at once, 1…5
const CHUNK_MAX = 5;
const GLORY_NAMES = ['პირველი', 'მეორე', 'მესამე'];
type Place = { glory: number; psalm: number | null };
const LINE_KEY = 'sg-prompter-line';
const PACE = 1.1; // letters a pixel of the page's text at 100 %: the bar's px a second × PACE = letters a second
const THEME_KEY = 'sg-prompter-theme';
const SIZE_KEY = 'sg-prompter-size';

const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const keep = (key: string, v: string) => { try { localStorage.setItem(key, v); } catch { /* private mode */ } };

const useWakeLock = () => {
  useEffect(() => {
    type Lock = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Lock> } };
    let lock: Lock | null = null;
    let gone = false;
    const take = () => {
      if (nav.wakeLock && document.visibilityState === 'visible') {
        nav.wakeLock.request('screen').then(l => { if (gone) l.release().catch(() => {}); else lock = l; }, () => {});
      }
    };
    take();
    document.addEventListener('visibilitychange', take);
    return () => { gone = true; document.removeEventListener('visibilitychange', take); lock?.release().catch(() => {}); };
  }, []);
};

const CSS = `
.sgp-scroll { scrollbar-width: none; -webkit-tap-highlight-color: transparent; }
.sgp-scroll::-webkit-scrollbar { display: none; }
.sgp-body { font-family: var(--font-serif-ge); line-height: 1.5; overflow-wrap: break-word; }
.sgp-body * { font-size: inherit !important; line-height: inherit !important; color: inherit !important; background: none !important; max-width: none !important; }
.sgp-body p, .sgp-body li, .sgp-body blockquote, .sgp-body pre { margin: 0 0 0.7em !important; padding: 0 !important; border: 0 !important; }
.sgp-body h1, .sgp-body h2, .sgp-body h3, .sgp-body h4, .sgp-body h5 { font-size: 0.95em !important; font-weight: 700 !important; text-align: center !important; margin: 1.3em 0 0.6em !important; color: var(--sgp-accent) !important; }
.sgp-body p.c { text-align: center; color: var(--sgp-accent) !important; }
.sgp-body em, .sgp-body i { color: var(--sgp-muted) !important; }
.sgp-body sup { font-size: 0.55em !important; color: var(--sgp-muted) !important; }
.sgp-body [class~="text-[#7a2028]"], .sgp-body [class~="text-[#9a3324]"], .sgp-body [class~="text-[#9b1c23]"], .sgp-body [class~="text-[#5e1820]"], .sgp-body [class~="text-[#a0703c]"] { color: var(--sgp-accent) !important; }
.sgp-body [class~="text-[1.45em]"] { font-size: 1.45em !important; line-height: 1 !important; }
.sgp-body .float-left { float: none !important; margin: 0 !important; }
.sgp-body section + section { margin-top: 1em !important; }
.sgp-body ul, .sgp-body ol { padding-left: 1.2em !important; }
.sgp-body .sgp-glory { display: block; text-align: center; margin-top: .35em; font-weight: 700; color: var(--sgp-accent) !important; }
.sgp-body [data-psalm-start] { margin-top: 1.5em !important; }
.sgp-body hr { border: 0; border-top: 1px solid var(--sgp-muted); opacity: .4; width: 30%; margin: 1em auto; }
`;

const Arrow: React.FC<{ side: 'left' | 'right'; color: string }> = ({ side, color }) => (
  <svg viewBox="0 0 10 14" className="w-3 h-4" aria-hidden>
    <path d={side === 'left' ? 'M0 0 L10 7 L0 14 Z' : 'M10 0 L0 7 L10 14 Z'} fill={color} />
  </svg>
);

// the reading line's own mark for its on/off button: ▸ — ◂
const LineIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
    <path d="M2 7 L7 12 L2 17 Z M22 7 L17 12 L22 17 Z" fill="currentColor" />
    <path d="M9 12 H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const Prompter: React.FC<{
  html: string;
  start: number;
  speeds: { label: string; px: number }[];
  speed: number;
  onSpeed: (i: number) => void;
  onClose: (block: number) => void;
  /** a psalter kanon's number: the place line on top says the kanon, the glory and the psalm */
  kanon?: number;
  /** opened on the next / previous kanon by its button: 3-2-1 and it goes on by itself */
  autoStart?: boolean;
  /** the kanon or chapter before / after (its label), and the step there */
  prev?: string;
  next?: string;
  onGo?: (dir: -1 | 1) => void;
  /** the label of the one being opened, while it loads */
  loading?: string | null;
}> = ({ html, start, speeds, speed, onSpeed, onClose, kanon, autoStart = false, prev, next, onGo, loading }) => {
  // „გვერდზე“ and „სიტყვით“ are the admins' only (the user, 2026-11-06); everybody else reads going up
  const { isAdmin } = useAuth();
  const [theme, setTheme] = useState<Theme>(() => (read(THEME_KEY) === 'light' ? 'light' : 'dark'));
  const [size, setSize] = useState(() => {
    const kept = Number(read(SIZE_KEY));
    return SIZES.includes(kept) ? kept : window.innerWidth >= 768 ? 40 : 30;
  });
  const [chosenMode, setMode] = useState<Mode>(() => {
    const kept = read(MODE_KEY);
    return kept === 'side' || kept === 'word' ? kept : 'up';
  });
  const [words, setWords] = useState<Word[]>([]);
  const [flowStart, setFlowStart] = useState(0);
  const flow = useRef<FlowHandle | null>(null);
  const flowLeft = useRef(0); // letters left in a sideways / word-by-word reading
  const upBlock = useRef<number | null>(null); // where to stand once back to „ზემოთ“
  const [chunk, setChunk] = useState(() => {
    const kept = Number(read(CHUNK_KEY));
    return kept >= 1 && kept <= CHUNK_MAX ? kept : 1;
  });
  // a psalter kanon: each block's glory and psalm, and where the reading is now
  const places = useRef(new Map<number, Place>());
  const [place, setPlace] = useState<Place | null>(null);
  const [guide, setGuide] = useState(() => read(GUIDE_KEY) === '1');
  const [line, setLine] = useState(() => {
    const kept = Number(read(LINE_KEY));
    return kept >= LINE_MIN && kept <= LINE_MAX ? kept : LINE;
  });
  const [dragging, setDragging] = useState(false);
  const mode: Mode = isAdmin ? chosenMode : 'up';
  const [count, setCount] = useState(autoStart ? 3 : 0); // 3 · 2 · 1 before it moves
  const [fresh, setFresh] = useState(!autoStart); // not started yet (since opening or „თავიდან“): ▶ counts 3-2-1 first
  const [running, setRunning] = useState(false);
  const [ended, setEnded] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [poke, setPoke] = useState(0); // any touch of the controls keeps them on a little longer
  const [, setTick] = useState(0);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const pos = useRef(0);
  const held = useRef(false);
  const density = useRef(0.4); // letters a pixel here
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const keepBlock = useRef<number | null>(start);
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const look = LOOK[theme];

  useWakeLock();
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const pxPerSecond = () => (speeds[speedRef.current].px * PACE) / density.current;

  const measure = () => {
    const b = bodyRef.current;
    if (!b) return;
    const letters = (b.textContent || '').replace(/\s+/g, ' ').length;
    density.current = b.offsetHeight > 0 && letters > 0 ? letters / b.offsetHeight : 0.4;
  };

  // the block at the reading line now
  const blockAtLine = useCallback(() => {
    const sc = scrollerRef.current;
    const b = bodyRef.current;
    if (!sc || !b) return start;
    const at = sc.getBoundingClientRect().top + sc.clientHeight * line + size * 0.5;
    let found = -1;
    b.querySelectorAll('[data-sgp]').forEach(el => {
      if (el.getBoundingClientRect().top <= at) found = Number(el.getAttribute('data-sgp'));
    });
    if (found >= 0) return found;
    const first = b.querySelector('[data-sgp]');
    return first ? Number(first.getAttribute('data-sgp')) : 0;
  }, [size, start, line]);

  // puts block `i` (or the nearest one before it) on the reading line
  const placeAt = (i: number) => {
    const sc = scrollerRef.current;
    const b = bodyRef.current;
    if (!sc || !b) return;
    let el: Element | null = null;
    b.querySelectorAll('[data-sgp]').forEach(x => { if (Number(x.getAttribute('data-sgp')) <= i) el = x; });
    if (!el) { sc.scrollTop = 0; pos.current = 0; return; }
    const target = sc.getBoundingClientRect().top + sc.clientHeight * line - size * 0.75;
    sc.scrollTop += (el as Element).getBoundingClientRect().top - target;
    pos.current = sc.scrollTop;
  };

  // the words for the other two ways, once; they start where the text was being read
  useLayoutEffect(() => {
    const b = bodyRef.current;
    if (!b) return;
    const all = wordsOf(b);
    setWords(all);
    setFlowStart(firstWordOf(all, start));
    if (kanon) {
      b.querySelectorAll('[data-sgp]').forEach(el => {
        const glory = Number(el.getAttribute('data-glory'));
        if (!glory) return;
        const psalm = el.getAttribute('data-psalm');
        places.current.set(Number(el.getAttribute('data-sgp')), { glory, psalm: psalm ? Number(psalm) : null });
      });
      showPlace(start);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // back to „ზემოთ“: the text stands where the other way stopped
  useLayoutEffect(() => {
    if (mode !== 'up' || upBlock.current === null) return;
    placeAt(upBlock.current);
    upBlock.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // a new size (or the first look): the same place stays on the line
  useLayoutEffect(() => {
    measure();
    if (keepBlock.current !== null) {
      placeAt(keepBlock.current);
      keepBlock.current = null;
    }
    const again = () => measure();
    window.addEventListener('resize', again);
    return () => window.removeEventListener('resize', again);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  // the line moved: the text stays where it is (its top room grows as much as its bottom room shrinks)
  const lastLine = useRef(line);
  useLayoutEffect(() => {
    const sc = scrollerRef.current;
    const by = (line - lastLine.current) * (sc?.clientHeight ?? 0);
    lastLine.current = line;
    if (sc && by) { sc.scrollTop += by; pos.current = sc.scrollTop; }
  }, [line]);

  // 3 · 2 · 1
  useEffect(() => {
    if (count <= 0) return;
    const id = window.setTimeout(() => {
      if (count === 1) { setCount(0); setRunning(true); } else setCount(count - 1);
    }, 1000);
    return () => window.clearTimeout(id);
  }, [count]);

  // the glide (the text going up; the other two ways move themselves, PrompterFlow.tsx)
  useEffect(() => {
    if (!running || mode !== 'up') return;
    const sc = scrollerRef.current;
    if (!sc) return;
    let last = performance.now();
    pos.current = sc.scrollTop;
    let frame = 0;
    const step = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      if (held.current || Math.abs(sc.scrollTop - pos.current) > 2) pos.current = sc.scrollTop; // moved by hand: on from there
      if (!held.current) {
        pos.current += (pxPerSecond() * dt) / 1000;
        sc.scrollTop = pos.current;
        if (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 1) {
          setRunning(false);
          setEnded(true);
          setChrome(true);
          return;
        }
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode]);

  // the controls step aside while it moves
  useEffect(() => {
    if (!running || !chrome) return;
    const id = window.setTimeout(() => setChrome(false), 2800);
    return () => window.clearTimeout(id);
  }, [running, chrome, poke]);

  // the time left, while the controls are shown
  useEffect(() => {
    if (!chrome) return;
    const id = window.setInterval(() => setTick(t => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [chrome]);

  const nudge = () => { setChrome(true); setPoke(p => p + 1); };

  const toTop = () => {
    if (mode === 'up') {
      const sc = scrollerRef.current;
      if (sc) { sc.scrollTop = 0; pos.current = 0; }
    } else flow.current?.toWord(0);
    setEnded(false);
  };

  const flowEnded = () => {
    setRunning(false);
    setEnded(true);
    setChrome(true);
  };
  const flowProgress = (done: number, lettersLeft: number) => {
    flowLeft.current = lettersLeft;
    if (progressRef.current) progressRef.current.style.width = `${Math.min(100, done * 100)}%`;
    if (kanon) { const w = words[flow.current?.word() ?? 0]; if (w) showPlace(w.block); }
  };

  // the place line follows the block being read (the nearest block before it that knows its place)
  const showPlace = (block: number) => {
    let best: Place | null = null;
    let at = -1;
    places.current.forEach((p, i) => { if (i <= block && i > at) { at = i; best = p; } });
    if (!best) best = places.current.values().next().value ?? null;
    setPlace(prev => (prev && best && prev.glory === (best as Place).glory && prev.psalm === (best as Place).psalm ? prev : best));
  };

  const stepChunk = (d: 1 | -1) => {
    const next = Math.min(CHUNK_MAX, Math.max(1, chunk + d));
    setChunk(next);
    keep(CHUNK_KEY, String(next));
    nudge();
  };

  // another way of reading: the same place, standing still until ▶ (3-2-1 again)
  const pickMode = (m: Mode) => {
    if (m === mode) return;
    const at = mode === 'up' ? firstWordOf(words, blockAtLine()) : flow.current?.word() ?? 0;
    if (m === 'up') upBlock.current = words[at]?.block ?? start;
    else setFlowStart(at);
    setRunning(false);
    setCount(0);
    setEnded(false);
    setFresh(true);
    setMode(m);
    keep(MODE_KEY, m);
    nudge();
  };

  // „თავიდან“: back to the start, standing still until ▶
  const fromTop = () => {
    toTop();
    setRunning(false);
    setCount(0);
    setFresh(true);
    setChrome(true);
  };

  const toggle = () => {
    if (ended) {
      toTop();
      setFresh(false);
      setCount(3);
    } else if (running || count > 0) {
      setCount(0);
      setRunning(false);
      setChrome(true);
    } else if (fresh) {
      setFresh(false);
      setCount(3);
    } else {
      setRunning(true);
      nudge();
    }
  };

  const stepSpeed = (d: 1 | -1) => {
    onSpeed(Math.min(speeds.length - 1, Math.max(0, speed + d)));
    nudge();
  };

  const stepSize = (d: 1 | -1) => {
    const next = SIZES[Math.min(SIZES.length - 1, Math.max(0, SIZES.indexOf(size) + d))];
    if (next === size) return;
    keepBlock.current = blockAtLine();
    setSize(next);
    keep(SIZE_KEY, String(next));
    nudge();
  };

  const switchGuide = () => {
    setGuide(g => { keep(GUIDE_KEY, g ? '0' : '1'); return !g; });
    nudge();
  };

  // an arrow held and moved takes the line with it
  const grab = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const drag = (e: React.PointerEvent) => {
    if (!dragging) return;
    setLine(Math.min(LINE_MAX, Math.max(LINE_MIN, e.clientY / window.innerHeight)));
  };
  const drop = () => {
    if (!dragging) return;
    setDragging(false);
    keep(LINE_KEY, line.toFixed(3));
  };

  const pickTheme = (t: Theme) => {
    setTheme(t);
    keep(THEME_KEY, t);
    nudge();
  };

  const close = () => onClose(mode === 'up' ? blockAtLine() : words[flow.current?.word() ?? 0]?.block ?? start);

  // a computer's keys: space pauses, ↑ ↓ the speed, + − the letters, Esc closes
  const keys = useRef({ toggle, stepSpeed, stepSize, close });
  keys.current = { toggle, stepSpeed, stepSize, close };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keys.current;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); k.toggle(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); k.stepSpeed(1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); k.stepSpeed(-1); }
      else if (e.key === '+' || e.key === '=') k.stepSize(1);
      else if (e.key === '-') k.stepSize(-1);
      else if (e.key === 'Escape') k.close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // a tap pauses / goes on; a finger held (or dragging the text) stops the glide meanwhile
  const down = (e: React.PointerEvent) => {
    held.current = true;
    touch.current = { x: e.clientX, y: e.clientY, t: performance.now() };
  };
  const up = (e: React.PointerEvent) => {
    held.current = false;
    const t = touch.current;
    touch.current = null;
    if (t && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 10 && performance.now() - t.t < 400) toggle();
  };
  const cancel = () => { held.current = false; touch.current = null; };

  const onScroll = () => {
    const sc = scrollerRef.current;
    const bar = progressRef.current;
    if (!sc || !bar) return;
    const max = sc.scrollHeight - sc.clientHeight;
    bar.style.width = `${max > 0 ? Math.min(100, (sc.scrollTop / max) * 100) : 0}%`;
    // taken back up by hand after the end: ▶ goes on from there
    if (ended && sc.scrollTop < max - 4) setEnded(false);
    if (kanon && mode === 'up') showPlace(blockAtLine());
  };

  // a mouse moved over a running text brings the controls back (not more than twice a second)
  const lastMove = useRef(0);
  const onMove = () => {
    if (!running) return;
    const now = performance.now();
    if (now - lastMove.current < 500) return;
    lastMove.current = now;
    nudge();
  };

  const sc = scrollerRef.current;
  const left =
    mode !== 'up' ? (words.length ? flowLeft.current / (speeds[speed].px * PACE) : null)
    : sc ? Math.max(0, sc.scrollHeight - sc.clientHeight - sc.scrollTop) / pxPerSecond() : null;
  const endCard = ended && !loading && Boolean(onGo) && Boolean(prev || next);
  const leftText = left === null ? '' : ended ? (endCard ? '' : 'დასრულდა') :left < 60 ? 'დარჩა 1 წუთზე ნაკლები' : `დარჩა ≈ ${Math.round(left / 60)} წთ`;

  const round = `w-11 h-11 shrink-0 rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition disabled:opacity-35 disabled:cursor-default ${look.hover}`;
  const panel = { background: look.bar, boxShadow: `inset 0 0 0 1px ${look.ring}, 0 12px 32px -14px rgba(0,0,0,0.5)` };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="წამყვანის ეკრანი"
      className="fixed inset-0 z-[95] select-none overflow-hidden"
      style={{ background: look.bg, color: look.text, ['--sgp-accent' as string]: look.accent, ['--sgp-muted' as string]: look.muted }}
      onMouseMove={onMove}
    >
      <style>{CSS}</style>

      {/* the text */}
      <div
        ref={scrollerRef}
        className={`sgp-scroll absolute inset-0 overflow-y-auto overscroll-contain ${mode === 'up' ? '' : 'invisible pointer-events-none'}`}
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={cancel}
        onScroll={onScroll}
      >
        <div
          style={{
            fontSize: size,
            paddingTop: `calc(${line * 100}dvh - ${size * 0.75}px)`,
            paddingBottom: `${(1 - line) * 100}dvh`,
            paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 28px)',
            paddingRight: 'calc(env(safe-area-inset-right, 0px) + 28px)',
          }}
        >
          <div ref={bodyRef} className="sgp-body mx-auto" style={{ maxWidth: '30em' }} dangerouslySetInnerHTML={{ __html: html }} />
          <p className="mx-auto mt-[1.2em] text-center font-sans font-bold" style={{ fontSize: 15, color: look.muted }}>— დასასრული —</p>
        </div>
      </div>

      {/* the other two ways */}
      {mode !== 'up' && words.length > 0 && (
        <div className="absolute inset-0" onPointerDown={down} onPointerUp={up} onPointerCancel={cancel}>
          {mode === 'side' ? (
            <Ticker key="side" words={words} start={flowStart} running={running} size={size} colors={look} pace={() => speeds[speedRef.current].px * PACE} held={held} handle={flow} onEnd={flowEnded} onProgress={flowProgress} />
          ) : (
            <Flash key="word" words={words} start={flowStart} chunk={chunk} running={running} size={size} colors={look} pace={() => speeds[speedRef.current].px * PACE} held={held} handle={flow} onEnd={flowEnded} onProgress={flowProgress} />
          )}
        </div>
      )}

      {/* the edges fade; the reading line, when on, glows and moves by its arrows */}
      {mode === 'up' && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: `${Math.max(8, (line - 0.12) * 100)}%`, background: `linear-gradient(${look.bg}, ${look.bg}00)` }} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[22%]" style={{ background: `linear-gradient(${look.bg}00, ${look.bg})` }} />
        </>
      )}
      {mode === 'up' && guide && (
        <div
          className="absolute inset-x-0 pointer-events-none"
          style={{ top: `calc(${line * 100}% - ${size * 0.75}px)`, height: size * 1.5, background: look.band, boxShadow: dragging ? `inset 0 0 0 1.5px ${look.accent}` : undefined }}
        >
          {(['left', 'right'] as const).map(side => (
            <span
              key={side}
              role="slider"
              aria-label="კითხვის ხაზის გადაწევა"
              aria-valuemin={Math.round(LINE_MIN * 100)}
              aria-valuemax={Math.round(LINE_MAX * 100)}
              aria-valuenow={Math.round(line * 100)}
              onPointerDown={grab}
              onPointerMove={drag}
              onPointerUp={drop}
              onPointerCancel={drop}
              className={`pointer-events-auto absolute top-1/2 -translate-y-1/2 ${side === 'left' ? 'left-0 justify-start pl-1.5' : 'right-0 justify-end pr-1.5'} w-12 h-14 flex items-center cursor-ns-resize`}
              style={{ touchAction: 'none' }}
            >
              <Arrow side={side} color={look.accent} />
            </span>
          ))}
        </div>
      )}

      {/* how far */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: `${look.muted}26` }}>
        <div ref={progressRef} className="h-full" style={{ width: 0, background: look.accent }} />
      </div>

      {/* 3 · 2 · 1 */}
      {count > 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center" style={{ background: `${look.bg}d9` }}>
          <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: `calc(${line * 100}% - 64px)` }}>
            <span key={count} className="font-sans font-black leading-none tabular-nums animate-in zoom-in-50 fade-in duration-300" style={{ fontSize: 96, color: look.accent }}>
              {count}
            </span>
            <span className="mt-4 h-8 px-3.5 rounded-full inline-flex items-center font-sans text-[14px] font-bold" style={{ ...panel, color: look.text }}>
              ეკრანზე შეხება — გაჩერება
            </span>
          </div>
        </div>
      )}

      {/* a psalter kanon: where the reading is — კანონი · დიდება · ფსალმუნი. While reading one quiet line at the very top;
          with the controls a card under them, the kanon between ‹ › that open the one before / after */}
      {kanon && place && (
        <div
          className="pointer-events-none absolute inset-x-0 flex justify-center px-4 transition-[top] duration-300"
          style={{ top: `calc(env(safe-area-inset-top, 0px) + ${chrome ? (isAdmin ? 118 : 66) : 12}px)` }}
          aria-live="polite"
        >
          {chrome ? (
            <div className="pointer-events-auto px-1.5 pt-1 pb-2 rounded-2xl flex flex-col items-center font-sans backdrop-blur" style={panel}>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => onGo?.(-1)} disabled={!prev || !onGo || !!loading} aria-label={prev ? `წინა: ${prev}` : 'წინა არ არის'} className={`${round} !w-10 !h-10`} style={{ color: look.btn }}>
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="min-w-[6.5rem] text-center text-[16px] font-black" style={{ color: look.text }}>კანონი {kanon}</span>
                <button type="button" onClick={() => onGo?.(1)} disabled={!next || !onGo || !!loading} aria-label={next ? `შემდეგი: ${next}` : 'შემდეგი არ არის'} className={`${round} !w-10 !h-10`} style={{ color: look.btn }}>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2 px-3 text-[13px] font-bold whitespace-nowrap">
                <span style={{ color: look.muted }}>{GLORY_NAMES[place.glory - 1] ?? place.glory} დიდება</span>
                {place.psalm !== null && (
                  <>
                    <span aria-hidden className="w-1 h-1 rounded-full" style={{ background: look.muted }} />
                    <span style={{ color: look.accent }}>{place.psalm} ფსალმუნი</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="h-9 px-4 rounded-full inline-flex items-center gap-2.5 font-sans text-[13.5px] font-bold whitespace-nowrap backdrop-blur" style={panel}>
              <span style={{ color: look.muted }}>კანონი {kanon}</span>
              <span aria-hidden className="w-1 h-1 rounded-full" style={{ background: look.muted }} />
              <span style={{ color: look.muted }}>{GLORY_NAMES[place.glory - 1] ?? place.glory} დიდება</span>
              {place.psalm !== null && (
                <>
                  <span aria-hidden className="w-1 h-1 rounded-full" style={{ background: look.muted }} />
                  <span key={place.psalm} className="animate-in fade-in slide-in-from-bottom-1 duration-300" style={{ color: look.accent }}>
                    {place.psalm} ფსალმუნი
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* the end: on to the kanon or chapter before / after */}
      {endCard && onGo && (
        <div className="absolute inset-x-0 flex justify-center px-5" style={{ top: '52%' }}>
          <div className="w-full max-w-sm p-4 rounded-3xl flex flex-col items-center gap-3 font-sans backdrop-blur animate-in fade-in zoom-in-95 duration-200" style={panel}>
            <span className="text-[13px] font-bold" style={{ color: look.muted }}>დასრულდა</span>
            {next && (
              <button
                type="button"
                onClick={() => onGo(1)}
                className="w-full h-14 rounded-2xl inline-flex items-center justify-center gap-2 text-[17px] font-black cursor-pointer active:scale-[0.98] transition"
                style={{ background: look.play, color: look.playText }}
              >
                {next}
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
            {prev && (
              <button
                type="button"
                onClick={() => onGo(-1)}
                className={`h-11 px-4 rounded-full inline-flex items-center gap-1.5 text-[14px] font-bold cursor-pointer active:scale-95 transition ${look.hover}`}
                style={{ color: look.btn }}
              >
                <ChevronLeft className="w-4 h-4" />
                {prev}
              </button>
            )}
          </div>
        </div>
      )}

      {/* the next one opening */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: `${look.bg}cc` }}>
          <span className="h-11 px-5 rounded-full inline-flex items-center gap-2.5 font-sans text-[15px] font-bold backdrop-blur" style={{ ...panel, color: look.text }}>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: look.accent }} />
            {loading}
          </span>
        </div>
      )}

      {/* the controls: close, colours, letters on top; play and speed at the bottom */}
      <div
        className={`absolute inset-x-0 top-0 flex flex-col items-center gap-2 transition-opacity duration-300 ${chrome ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)', paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 12px)', paddingRight: 'calc(env(safe-area-inset-right, 0px) + 12px)' }}
      >
       <div className="w-full flex items-center gap-2">
        <button type="button" onClick={close} aria-label="დახურვა" title="დახურვა" className={`${round} backdrop-blur`} style={{ ...panel, color: look.btn }}>
          <X className="w-5 h-5" />
        </button>
        <span className="flex-1" />
        {mode === 'up' && <button
          type="button"
          aria-pressed={guide}
          onClick={switchGuide}
          aria-label="კითხვის ხაზი"
          title="კითხვის ხაზი"
          className={`${round} backdrop-blur`}
          style={guide ? { background: look.play, color: look.playText } : { ...panel, color: look.btn }}
        >
          <LineIcon />
        </button>}
        <div role="group" aria-label="ფონის ფერი" className="flex items-center p-1 rounded-full backdrop-blur" style={panel}>
          {(['dark', 'light'] as const).map(t => {
            const on = theme === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => pickTheme(t)}
                className="h-9 px-3 rounded-full inline-flex items-center gap-1.5 font-sans text-[13px] font-bold cursor-pointer transition"
                style={on ? { background: look.play, color: look.playText } : { color: look.btn }}
              >
                {t === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                {t === 'dark' ? 'მუქი' : 'ღია'}
              </button>
            );
          })}
        </div>
        <div role="group" aria-label="ასოების ზომა" className="flex items-center p-0.5 rounded-full backdrop-blur" style={panel}>
          <button type="button" aria-label="ასოების დაპატარავება" disabled={size === SIZES[0]} onClick={() => stepSize(-1)} className={`${round} !w-10 font-sans text-[14px] font-bold`} style={{ color: look.btn }}>
            A
          </button>
          <button type="button" aria-label="ასოების გადიდება" disabled={size === SIZES[SIZES.length - 1]} onClick={() => stepSize(1)} className={`${round} !w-10 font-sans text-[20px] font-bold`} style={{ color: look.btn }}>
            A
          </button>
        </div>
       </div>
        {isAdmin && <div role="group" aria-label="როგორ მოძრაობდეს ტექსტი" className="flex items-center p-1 rounded-full backdrop-blur" style={panel}>
          {MODES.map(({ id, label, Icon }) => {
            const on = mode === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => pickMode(id)}
                className="h-9 px-3 rounded-full inline-flex items-center gap-1.5 font-sans text-[13px] font-bold cursor-pointer transition"
                style={on ? { background: look.play, color: look.playText } : { color: look.btn }}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>}
      </div>

      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-4 transition-opacity duration-300 ${chrome ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* „სიტყვით“: how many words at once */}
          {mode === 'word' && (
            <div role="group" aria-label="რამდენი სიტყვა ერთად" className="h-9 pl-3 pr-1 rounded-full inline-flex items-center gap-1 backdrop-blur" style={panel}>
              <span className="font-sans text-[13px] font-bold" style={{ color: look.muted }}>ერთად</span>
              <button type="button" aria-label="ნაკლები სიტყვა" disabled={chunk <= 1} onClick={() => stepChunk(-1)} className={`${round} !w-8 !h-8`} style={{ color: look.btn }}>
                <Minus className="w-4 h-4" />
              </button>
              <span className="min-w-[4.5rem] text-center font-sans text-[13.5px] font-black tabular-nums" style={{ color: look.btn }}>
                {chunk} სიტყვა
              </span>
              <button type="button" aria-label="მეტი სიტყვა" disabled={chunk >= CHUNK_MAX} onClick={() => stepChunk(1)} className={`${round} !w-8 !h-8`} style={{ color: look.btn }}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
          {leftText && (
            <span className="h-9 px-3 rounded-full inline-flex items-center font-sans text-[13px] font-bold tabular-nums backdrop-blur" style={{ ...panel, color: look.muted }}>
              {leftText}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 p-1.5 rounded-full backdrop-blur" style={panel}>
          <button
            type="button"
            onClick={toggle}
            aria-label={ended ? 'თავიდან' : running || count > 0 ? 'გაჩერება' : fresh ? 'დაწყება' : 'გაგრძელება'}
            className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition"
            style={{ background: look.play, color: look.playText }}
          >
            {ended ? <RotateCcw className="w-5 h-5" /> : running || count > 0 ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
          </button>
          <button type="button" aria-label="ნელა" disabled={speed <= 0} onClick={() => stepSpeed(-1)} className={round} style={{ color: look.btn }}>
            <Minus className="w-[18px] h-[18px]" />
          </button>
          <span className="w-16 text-center leading-none font-sans">
            <span className="block text-[11.5px] font-bold" style={{ color: look.muted }}>სიჩქარე</span>
            <span className="block mt-1 text-[17px] font-black tabular-nums" style={{ color: look.btn }}>{speeds[speed].label}</span>
          </span>
          <button type="button" aria-label="სწრაფად" disabled={speed >= speeds.length - 1} onClick={() => stepSpeed(1)} className={round} style={{ color: look.btn }}>
            <Plus className="w-[18px] h-[18px]" />
          </button>
          <span aria-hidden className="w-px h-6 mx-0.5" style={{ background: look.ring }} />
          <button type="button" onClick={fromTop} aria-label="თავიდან" title="თავიდან" className={round} style={{ color: look.btn }}>
            <RotateCcw className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default Prompter;
