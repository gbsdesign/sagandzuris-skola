import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronsDown, Minus, Pause, Play, Plus, X } from 'lucide-react';

// The tools over a prayer's text: ხუცური on the left; auto-scroll and the text's size on the right.
// Nothing is remembered: every new visit starts in ordinary letters, standard size, standing still.

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
}> = ({ size, onSize, khutsuri, onKhutsuri }) => {
  const [scroll, setScroll] = useState(false);
  return (
    // sticky: the tools stay at hand all down a long text (the page bar is not sticky)
    <div className="sticky top-[env(safe-area-inset-top,0px)] z-10 flex items-center justify-between gap-2 -mt-2 -mx-1.5 sm:-mx-3 mb-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full">
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
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setScroll(true)}
          aria-label="ავტომატური გადახვევა"
          title="ავტომატური გადახვევა"
          className={`${ROUND} ${PILL}`}
        >
          <ChevronsDown className="w-[18px] h-[18px]" />
        </button>
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
      {scroll && <AutoScroll zoom={size / 100} onClose={() => setScroll(false)} />}
    </div>
  );
};

// The speeds −/+ step through (by quarters up to 1, then by ones up to 10) and px a second at each, for text at
// 100 % (bigger letters → taller lines → faster)
const SPEEDS: { label: string; px: number }[] = [
  ...[0.25, 0.5, 0.75].map(s => ({ label: String(s), px: 8 * s })),
  ...[8, 12, 16, 20, 24, 29, 34, 40, 47, 55].map((px, i) => ({ label: String(i + 1), px })),
];
const START_SPEED = SPEEDS.findIndex(s => s.label === '3');

// The page moves up by itself; the bar stays at the bottom of the screen. A finger on the screen holds it, letting go
// goes on; at the end it stops. The screen is kept awake meanwhile.
const AutoScroll: React.FC<{ zoom: number; onClose: () => void }> = ({ zoom, onClose }) => {
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(START_SPEED);
  const pxPerSecond = useRef(0);
  pxPerSecond.current = SPEEDS[speed].px * zoom;

  useEffect(() => {
    if (!running) return;
    let held = false;
    const hold = () => { held = true; };
    const letGo = () => { held = false; };
    window.addEventListener('touchstart', hold, { passive: true });
    window.addEventListener('touchend', letGo, { passive: true });
    window.addEventListener('touchcancel', letGo, { passive: true });

    let last = performance.now();
    // its own position, in fractions of a pixel, so the slowest speeds glide instead of jumping now and then
    let pos = window.scrollY;
    let frame = 0;
    const step = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      if (held || Math.abs(window.scrollY - pos) > 2) pos = window.scrollY; // moved by hand: go on from there
      if (!held) {
        pos += (pxPerSecond.current * dt) / 1000;
        window.scrollTo({ top: pos, behavior: 'instant' as ScrollBehavior });
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
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
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pointer-events-none"
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
