import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronsDown, Maximize2, Minus, Moon, Pause, Play, Plus, X } from 'lucide-react';
import { Prompter, blockAtReading, prompterCopy, showBlock } from './Prompter';

// The tools over a prayer's text: ხუცური on the left; auto-scroll and the text's size on the right.
// Nothing is remembered: every new visit starts in ordinary letters, standard size, standing still.
// The auto-scroll (⏬) is every reading page's since 2026-11-06 (`AutoScrollButton`: prayers, saints' lives, ancestors,
// the library's books, the liturgical books, poems, songs' words). A tap opens a small menu right at the button (the user:
// „რომ დავაჭერ ისარს … მანდვე მთავაზობდეს სრულ ეკრანს კომპაქტურად“): „აქ გადახვევა“ = the page moves up by itself (the bar
// at the bottom), „სრულ ეკრანზე“ = the full-screen prompter (Prompter.tsx), which can also go on to the previous / next
// kanon or chapter (`neighbours`).

const ROUND =
  'w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-bold leading-none text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer active:scale-90 transition disabled:opacity-35 disabled:cursor-default disabled:hover:bg-transparent disabled:active:scale-100';
const PILL = 'bg-[#fbf6ec] ring-1 ring-[#e8dcc8]';

/** „A− | A+“ in one warm pill, for a reader's bar (the ancestors' biographies, the saints' lives). */
export const SizePill: React.FC<{ onStep: (dir: 1 | -1) => void; atMin: boolean; atMax: boolean }> = ({ onStep, atMin, atMax }) => {
  const btn = 'w-11 h-9 font-bold text-[#4a3426] hover:bg-[#fcf1df] hover:text-[#7a2028] disabled:opacity-35 cursor-pointer disabled:cursor-default';
  return (
    <div className="flex items-center rounded-full ring-1 ring-[#e8dcc8] bg-white/85 shrink-0 overflow-hidden">
      <button type="button" onClick={() => onStep(-1)} disabled={atMin} className={`${btn} text-sm`} aria-label="ტექსტის დაპატარავება" title="ტექსტის დაპატარავება">
        A−
      </button>
      <span className="w-px h-5 bg-[#e8dcc8]" />
      <button type="button" onClick={() => onStep(1)} disabled={atMax} className={`${btn} text-base`} aria-label="ტექსტის გადიდება" title="ტექსტის გადიდება">
        A+
      </button>
    </div>
  );
};

export const ReadingToolbar: React.FC<{
  size: number;
  onSize: (size: number) => void;
  khutsuri: boolean;
  onKhutsuri: (on: boolean) => void;
  /** the text the auto-scroll reads (and the prompter shows) */
  source?: HTMLElement | null;
  /** a psalter kanon's number: the prompter's own way for it */
  psalter?: number;
  /** the kanon or chapter before and after: the prompter goes on to them */
  neighbours?: Neighbours;
  /** „ღამის ფურცელი“ (2026-11-06): the text card in the dark; the 🌙 beside ხუცური turns it */
  night?: boolean;
  onNight?: (on: boolean) => void;
}> = ({ size, onSize, khutsuri, onKhutsuri, source, psalter, neighbours, night, onNight }) => (
  // sticky: the tools stay at hand all down a long text (the page bar is not sticky)
  <div className="sg-night-bar sticky top-[env(safe-area-inset-top,0px)] z-10 flex items-center justify-between gap-2 -mt-2 -mx-1.5 sm:-mx-3 mb-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full">
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-pressed={khutsuri}
        onClick={() => onKhutsuri(!khutsuri)}
        title="ძველი ქართული დამწერლობით"
        className={`h-9 pl-2.5 pr-3 rounded-full ring-1 inline-flex items-center gap-1.5 text-[13px] font-bold cursor-pointer active:scale-95 transition ${
          khutsuri ? 'bg-[#7a2028] ring-[#7a2028] text-[#fbf6ec]' : 'bg-[#fbf6ec] ring-[#e8dcc8] text-[#7a2028] hover:ring-[#7a2028]/40'
        }`}
      >
        <span aria-hidden className="font-serif-ge text-[17px] leading-none">Ⴞ</span>
        ხუცური
      </button>
      {onNight && (
        <button
          type="button"
          aria-pressed={!!night}
          onClick={() => onNight(!night)}
          title={night ? 'ღია ფურცელი' : 'ღამის ფურცელი — თვალის დამზოგავი'}
          aria-label={night ? 'ღია ფურცელი' : 'ღამის ფურცელი'}
          className={`${ROUND} ring-1 ${night ? '!bg-[#e3c37a] !text-[#1f1a16] ring-[#e3c37a]' : `${PILL}`}`}
        >
          <Moon className="w-[17px] h-[17px]" fill={night ? 'currentColor' : 'none'} />
        </button>
      )}
    </div>
    <div className="flex items-center gap-1.5">
      <AutoScrollButton source={() => source ?? null} zoom={size / 100} psalter={psalter} neighbours={neighbours} />
      <div role="group" aria-label="ასოების ზომა" className={`inline-flex items-center rounded-full ${PILL}`}>
        <button type="button" aria-label="ასოების დაპატარავება" disabled={size <= 50} onClick={() => onSize(size - 10)} className={`${ROUND} text-[13px]`}>
          A
        </button>
        {/* away from 100 %: the percent, a tap goes back */}
        {size !== 100 && (
          <button type="button" onClick={() => onSize(100)} title="ჩვეულებრივი ზომა" className="h-9 px-0.5 text-[12px] font-bold tabular-nums text-[#8a7a6a] hover:text-[#7a2028] cursor-pointer">
            {size}%
          </button>
        )}
        <button type="button" aria-label="ასოების გადიდება" disabled={size >= 200} onClick={() => onSize(size + 10)} className={`${ROUND} text-[19px]`}>
          A
        </button>
      </div>
    </div>
  </div>
);

type Getter = () => HTMLElement | null;
export type Neighbour = { label: string; go: () => void };
export type Neighbours = { prev?: Neighbour; next?: Neighbour };

const MENU_ITEM =
  'w-full h-11 pl-3 pr-4 rounded-xl inline-flex items-center gap-2.5 text-[14px] font-bold text-[#4a3426] hover:bg-[#fcf1df] hover:text-[#7a2028] cursor-pointer active:scale-[0.98] transition whitespace-nowrap';

/** ⏬: a small menu at the button — the page moves up by itself (the bar at the bottom) or the full-screen prompter.
 * `source` = the text read, `scroller` = the box that scrolls when it is not the window (a full-screen reader), `zoom` =
 * the letters' size (1 = 100 %), `label` = a worded button in place of the round one (its menu opens to the left edge). */
export const AutoScrollButton: React.FC<{
  source: Getter;
  scroller?: Getter;
  zoom?: number;
  label?: string;
  className?: string;
  psalter?: number;
  neighbours?: Neighbours;
}> = ({ source, scroller, zoom = 1, label, className, psalter, neighbours }) => {
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState<null | 'page' | 'full'>(null);
  const [speed, setSpeed] = useState(START_SPEED); // one pace for the page and the prompter
  const wrap = useRef<HTMLSpanElement>(null);

  // a tap anywhere else (or Esc) closes the menu
  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setMenu(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [menu]);

  const pick = (way: 'page' | 'full') => {
    setMenu(false);
    if (way === 'full' && !source()) return;
    setOpen(way);
  };

  return (
    <span ref={wrap} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setMenu(m => !m)}
        aria-haspopup="menu"
        aria-expanded={menu}
        aria-label="ავტომატური კითხვა"
        title="ავტომატური კითხვა"
        className={label ? className : `${ROUND} ${PILL} ${menu ? '!bg-[#7a2028] !text-[#fbf6ec] !ring-[#7a2028]' : ''} ${className ?? ''}`}
      >
        <ChevronsDown className={label ? 'w-4 h-4 text-[#b4620e]' : 'w-[18px] h-[18px]'} />
        {label}
      </button>
      {menu && (
        <span
          role="menu"
          className={`absolute top-full mt-2 ${label ? 'left-0 origin-top-left' : 'right-0 origin-top-right'} z-[60] w-max p-1.5 rounded-2xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_14px_36px_-14px_rgba(42,32,23,0.45)] flex flex-col animate-in fade-in zoom-in-95 duration-150`}
        >
          <button type="button" role="menuitem" onClick={() => pick('page')} className={MENU_ITEM}>
            <ChevronsDown className="w-[18px] h-[18px] text-[#b4620e]" />
            აქ გადახვევა
          </button>
          <button type="button" role="menuitem" onClick={() => pick('full')} className={MENU_ITEM}>
            <Maximize2 className="w-[18px] h-[18px] text-[#b4620e]" />
            სრულ ეკრანზე
          </button>
        </span>
      )}
      {open === 'page' && <AutoScroll zoom={zoom} source={source} scroller={scroller} speed={speed} onSpeed={setSpeed} onClose={() => setOpen(null)} />}
      {open === 'full' && (
        <FullScreen
          source={source}
          scroller={scroller}
          psalter={psalter}
          neighbours={neighbours}
          speed={speed}
          onSpeed={setSpeed}
          onClose={() => setOpen(null)}
        />
      )}
    </span>
  );
};

// The prompter, with the way on to the kanon or chapter before / after: the page itself moves there (its own pager's
// step), and once the new text is on the page it is copied in afresh and goes on after 3-2-1 (the user's pick).
const FullScreen: React.FC<{
  source: Getter;
  scroller?: Getter;
  psalter?: number;
  neighbours?: Neighbours;
  speed: number;
  onSpeed: (i: number) => void;
  onClose: () => void;
}> = props => {
  const { source, scroller, speed, onSpeed, onClose } = props;
  const latest = useRef(props);
  latest.current = props;
  const [full, setFull] = useState<{ html: string; start: number; n: number; auto: boolean } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const timer = useRef(0);

  useEffect(() => {
    const text = source();
    if (!text) { onClose(); return; }
    setFull({ html: prompterCopy(text, Boolean(props.psalter)), start: blockAtReading(text, scroller?.() ?? null), n: 0, auto: false });
    return () => window.clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (dir: -1 | 1) => {
    const step = dir < 0 ? latest.current.neighbours?.prev : latest.current.neighbours?.next;
    if (!step || loading) return;
    const before = (latest.current.source()?.textContent || '').slice(0, 400);
    setLoading(step.label);
    step.go();
    const t0 = Date.now();
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      const el = latest.current.source();
      const now = (el?.textContent || '').slice(0, 400);
      if (el && now.length > 40 && now !== before) {
        window.clearInterval(timer.current);
        // one more frame: the page finishes drawing its text (ხუცური, the glory marks)
        requestAnimationFrame(() => {
          const fresh = latest.current.source();
          if (fresh) setFull(f => ({ html: prompterCopy(fresh, Boolean(latest.current.psalter)), start: 0, n: (f?.n ?? 0) + 1, auto: true }));
          setLoading(null);
        });
      } else if (Date.now() - t0 > 12000) {
        window.clearInterval(timer.current);
        setLoading(null);
      }
    }, 120);
  };

  const close = (block: number) => {
    const text = source();
    onClose();
    if (text) requestAnimationFrame(() => showBlock(text, scroller?.() ?? null, block));
  };

  if (!full) return null;
  const nb = props.neighbours;
  return (
    <Prompter
      key={full.n}
      html={full.html}
      start={full.start}
      speeds={SPEEDS}
      speed={speed}
      onSpeed={onSpeed}
      onClose={close}
      kanon={props.psalter}
      autoStart={full.auto}
      prev={nb?.prev?.label}
      next={nb?.next?.label}
      onGo={go}
      loading={loading}
    />
  );
};

const SPEEDS: { label: string; px: number }[] = [
  ...[0.25, 0.5, 0.75].map(s => ({ label: String(s), px: 8 * s })),
  // 1…20 (up to 10 until 2026-11-06; the user: „სიჩქარის მომატება, შემეძლოს 20-მდე“)
  ...[8, 12, 16, 20, 24, 29, 34, 40, 47, 55, 62, 70, 79, 88, 98, 109, 121, 134, 148, 163].map((px, i) => ({ label: String(i + 1), px })),
];
const START_SPEED = SPEEDS.findIndex(s => s.label === '3');

// The page moves up by itself; the bar stays at the bottom of the screen. A finger on the screen holds it, letting go
// goes on; it stops once the text's end is on screen. The screen is kept awake meanwhile.
const AutoScroll: React.FC<{ zoom: number; onClose: () => void; source: Getter; scroller?: Getter; speed: number; onSpeed: (i: number) => void }> = ({
  zoom, onClose, source, scroller, speed, onSpeed,
}) => {
  const [running, setRunning] = useState(true);
  const setSpeed = (f: (s: number) => number) => onSpeed(f(speed));
  const pxPerSecond = useRef(0);
  pxPerSecond.current = SPEEDS[speed].px * zoom;
  const where = useRef({ source, scroller });
  where.current = { source, scroller };

  // the floating „უკან“ steps aside while the bar is here (index.css)
  useEffect(() => {
    document.documentElement.dataset.sgAutoscroll = '';
    return () => { delete document.documentElement.dataset.sgAutoscroll; };
  }, []);

  useEffect(() => {
    if (!running) return;
    const box = where.current.scroller?.() ?? null;
    const top = () => (box ? box.scrollTop : window.scrollY);
    const put = (y: number) => {
      if (box) box.scrollTop = y;
      else window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    };
    const atEnd = () => {
      const text = where.current.source();
      const bottom = box ? box.getBoundingClientRect().bottom : window.innerHeight;
      if (text && text.getBoundingClientRect().bottom <= bottom - 4) return true; // the text's last line is in view
      return box ? box.scrollTop + box.clientHeight >= box.scrollHeight - 2 : window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    };

    let held = false;
    const hold = () => { held = true; };
    const letGo = () => { held = false; };
    window.addEventListener('touchstart', hold, { passive: true });
    window.addEventListener('touchend', letGo, { passive: true });
    window.addEventListener('touchcancel', letGo, { passive: true });

    let last = performance.now();
    // its own position, in fractions of a pixel, so the slowest speeds glide instead of jumping now and then
    let pos = top();
    let frame = 0;
    const step = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      if (held || Math.abs(top() - pos) > 2) pos = top(); // moved by hand: go on from there
      if (!held) {
        pos += (pxPerSecond.current * dt) / 1000;
        put(pos);
        if (atEnd()) {
          setRunning(false);
          return;
        }
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);

    // the screen stays on while the text moves (it is not touched meanwhile)
    type Lock = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Lock> } };
    let lock: Lock | null = null;
    const awake = () => {
      if (nav.wakeLock && document.visibilityState === 'visible') nav.wakeLock.request('screen').then(l => { lock = l; }, () => {});
    };
    awake();
    document.addEventListener('visibilitychange', awake);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('touchstart', hold);
      window.removeEventListener('touchend', letGo);
      window.removeEventListener('touchcancel', letGo);
      document.removeEventListener('visibilitychange', awake);
      lock?.release().catch(() => {});
    };
  }, [running]);

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 z-[90] flex flex-col items-center gap-2 px-4 pointer-events-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 14px)' }}
    >
      <div className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-full bg-white/95 backdrop-blur ring-1 ring-[#e8dcc8] shadow-[0_12px_32px_-12px_rgba(42,32,23,0.5)] animate-in fade-in slide-in-from-bottom-2 duration-200">
        <button
          type="button"
          onClick={() => setRunning(r => !r)}
          aria-label={running ? 'შეჩერება' : 'გაგრძელება'}
          className="w-11 h-11 shrink-0 rounded-full bg-[#7a2028] text-[#fbf6ec] hover:bg-[#651a21] flex items-center justify-center cursor-pointer active:scale-95 transition"
        >
          {running ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
        </button>
        <button type="button" aria-label="ნელა" disabled={speed <= 0} onClick={() => setSpeed(s => s - 1)} className={ROUND}>
          <Minus className="w-[18px] h-[18px]" />
        </button>
        <span className="w-16 text-center leading-none select-none">
          <span className="block text-[11.5px] font-bold text-[#8a7a6a]">სიჩქარე</span>
          <span className="block mt-1 text-[16px] font-black tabular-nums text-[#7a2028]">{SPEEDS[speed].label}</span>
        </span>
        <button type="button" aria-label="სწრაფად" disabled={speed >= SPEEDS.length - 1} onClick={() => setSpeed(s => s + 1)} className={ROUND}>
          <Plus className="w-[18px] h-[18px]" />
        </button>
        <span aria-hidden className="w-px h-6 mx-0.5 bg-[#e8dcc8]" />
        <button type="button" aria-label="ავტოგადახვევის დახურვა" onClick={onClose} className={`${ROUND} !text-[#8a7a6a] hover:!text-[#7a2028]`}>
          <X className="w-[18px] h-[18px]" />
        </button>
      </div>
    </div>,
    document.body
  );
};

// ხუცური: the shown text turned into nuskhuri, with asomtavruli headings and a paragraph's first letter.
// The page's own words stay as written; it works on what is on screen, so folds opened later are turned too.
// Back to ordinary letters by drawing the text afresh (the caller changes its key).
const MKHEDRULI = /[ა-ჵ]/g; // ა … ჵ: the same order as nuskhuri ⴀ … ⴥ and asomtavruli Ⴀ … Ⴥ
const toNuskhuri = (s: string) => s.replace(MKHEDRULI, c => String.fromCharCode(c.charCodeAt(0) - 0x10d0 + 0x2d00));
const toAsomtavruli = (s: string) => s.replace(MKHEDRULI, c => String.fromCharCode(c.charCodeAt(0) - 0x10d0 + 0x10a0));
const ANY_LETTER = /[ა-ჵⴀ-ⴥႠ-Ⴥ]/;

const firstTextOf = (block: Element) => {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (ANY_LETTER.test(n.nodeValue || '')) return n;
  return null;
};

const turn = (t: Text) => {
  const text = t.nodeValue;
  const el = t.parentElement;
  if (!text || !el || !/[ა-ჵ]/.test(text)) return;
  // buttons and notes of the page itself are set in the sans font: they stay readable
  if (el.closest('.font-sans, .font-serif-ge')?.classList.contains('font-sans')) return;
  if (el.closest('h1, h2, h3, h4')) {
    t.nodeValue = toAsomtavruli(text);
    return;
  }
  const out = toNuskhuri(text);
  const block = el.closest('p, li, blockquote');
  // asomtavruli letters: a paragraph's first one and the first after each verse number („2. არამედ“)
  const at = new Set<number>();
  if (block && firstTextOf(block) === t && out.search(/[ⴀ-ⴥ]/) >= 0) at.add(out.search(/[ⴀ-ⴥ]/));
  for (const m of out.matchAll(/(?:^|\s)\d+\.\s*[ⴀ-ⴥ]/g)) at.add(m.index! + m[0].length - 1);
  if (!at.size) {
    t.nodeValue = out;
    return;
  }
  const cap = (i: number) => String.fromCharCode(out.charCodeAt(i) - 0x2d00 + 0x10a0);
  // in the prayer's own text each verse opens with a big red letter; italic notes and the page's own cards
  // (made by React, which must keep its nodes) get only the plain asomtavruli letter
  if (el.closest('em, i') || Object.keys(block ?? el).some(k => k.startsWith('__reactFiber$'))) {
    t.nodeValue = [...out].map((c, i) => (at.has(i) ? cap(i) : c)).join('');
    return;
  }
  const parts: (string | Node)[] = [];
  let from = 0;
  for (const i of [...at].sort((a, b) => a - b)) {
    if (i > from) parts.push(out.slice(from, i));
    const big = document.createElement('span');
    big.className = 'text-[1.45em] leading-none font-bold text-[#7a2028]';
    big.textContent = cap(i);
    parts.push(big);
    from = i + 1;
  }
  t.nodeValue = out.slice(from); // the rest of the word goes on in nuskhuri
  t.before(...parts);
};

const turnAll = (root: Node) => {
  if (root.nodeType === Node.TEXT_NODE) return turn(root as Text);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n as Text);
  texts.forEach(turn);
};

export const useKhutsuri = (root: HTMLElement | null, on: boolean) => {
  useEffect(() => {
    if (!root || !on) return;
    turnAll(root);
    const watch = new MutationObserver(changes => {
      for (const c of changes) {
        if (c.type === 'characterData') turn(c.target as Text);
        else c.addedNodes.forEach(turnAll);
      }
    });
    watch.observe(root, { childList: true, characterData: true, subtree: true });
    return () => watch.disconnect();
  }, [root, on]);
};
