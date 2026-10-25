import React, { useEffect, useRef, useState } from 'react';
import { AudioLines, ChevronRight, Loader2 } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { GrapeBunch, Rosette, VineLeaf } from '../../components/home/PlateOrnaments';
import { useAuth } from '../../context/AuthContext';
import { SectionTitle } from './BookHead';
import { lastChapter } from './readingPlace';
import { exportBusy, useExportState } from './SynthDownload';

// The library's front room: the books standing on a wooden shelf (a cover opens the book), the place
// the reader stopped, and the chant recordings on a shelf of their own.

export type ShelfId = 'book' | 'lives' | 'feasts' | 'prayers' | 'sasuliero' | 'audio';
export const SHELF_IDS: ShelfId[] = ['book', 'lives', 'feasts', 'prayers', 'sasuliero', 'audio'];

type Orn = React.FC<{ color: string; className?: string }>;
/** shape = the binding's proportions: the books are not all of one height, as on a real shelf */
interface Cover { id: Exclude<ShelfId, 'audio'>; title: string; note: string; cloth: string; deep: string; Orn: Orn; shape: string }

// a Bolnisi cross: four arms widening to notched ends
const BolnisiCross: Orn = ({ color, className }) => (
  <svg viewBox="0 0 100 100" className={className} aria-hidden>
    {[0, 90, 180, 270].map(a => (
      <path key={a} d="M43 50 L57 50 L66 10 Q50 20 34 10 Z" fill={color} transform={`rotate(${a} 50 50)`} />
    ))}
    <circle cx="50" cy="50" r="8" fill={color} />
  </svg>
);

// an open book with a small cross above it
const OpenBook: Orn = ({ color, className }) => (
  <svg viewBox="0 0 100 100" className={className} aria-hidden>
    <path d="M47 6 h6 v8 h8 v6 h-8 v12 h-6 v-12 h-8 v-6 h8 Z" fill={color} />
    <path d="M48 44 Q30 34 8 38 L8 84 Q30 80 48 90 Z M52 44 Q70 34 92 38 L92 84 Q70 80 52 90 Z" fill={color} />
    <path d="M16 50 Q30 47 41 53 M16 60 Q30 57 41 63 M16 70 Q30 67 41 73 M84 50 Q70 47 59 53 M84 60 Q70 57 59 63 M84 70 Q70 67 59 73" stroke="#000" strokeOpacity="0.28" strokeWidth="2.4" fill="none" strokeLinecap="round" />
  </svg>
);

// cloth bindings: burgundy, forest green, night blue, deep violet, leather brown — dark and quiet, with gilt lines
export const COVERS: Cover[] = [
  { id: 'book', title: 'საღმრთო ისტორია', note: 'ძველი აღთქმა', cloth: '#7a2430', deep: '#4e141b', Orn: GrapeBunch, shape: 'aspect-[5/7]' },
  // a soft hyphen: on a narrow phone the long word breaks as a book would break it
  { id: 'lives', title: 'წმიდანთა ცხოვრება', note: 'წლის ყოველი დღე', cloth: '#35553f', deep: '#1f3527', Orn: VineLeaf, shape: 'aspect-[5/7.25]' },
  { id: 'feasts', title: 'დღესას­წაულები', note: 'ამ წლის თარიღები', cloth: '#2c4268', deep: '#18273f', Orn: Rosette, shape: 'aspect-[5/6.8]' },
  { id: 'prayers', title: 'ლოცვანი', note: 'დილა და საღამო', cloth: '#5a3a5e', deep: '#33203a', Orn: BolnisiCross, shape: 'aspect-[5/6.45]' },
  { id: 'sasuliero', title: 'სასულიერო წიგნები', note: 'წმიდა მამები', cloth: '#6b4a2e', deep: '#3a2716', Orn: OpenBook, shape: 'aspect-[5/7.1]' },
];
const COVER_IDS: string[] = COVERS.map(c => c.id);

// Each member's own order of the books: students/{uid}.shelfOrder, on this device for guests.
const ORDER_KEY = 'libraryShelfOrder';
const fullOrder = (v: unknown): string[] => {
  const saved = Array.isArray(v) ? v.filter((x): x is string => COVER_IDS.includes(x)) : [];
  return [...saved, ...COVER_IDS.filter(id => !saved.includes(id))];
};
const useShelfOrder = (uid?: string | null) => {
  const [order, setOrder] = useState<string[]>(() => {
    try { return fullOrder(JSON.parse(localStorage.getItem(ORDER_KEY) || '[]')); } catch { return COVER_IDS; }
  });
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, 'students', uid), snap => { const v = snap.data()?.shelfOrder; if (v) setOrder(fullOrder(v)); }, () => {});
  }, [uid]);
  const save = (next: string[]) => {
    setOrder(next);
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(next)); } catch { /* this visit keeps it */ }
    if (uid) setDoc(doc(db, 'students', uid), { shelfOrder: next }, { mergeFields: ['shelfOrder'] }).catch(() => {});
  };
  return { order, save };
};

// books to a board: two on a phone (the titles keep their size), three from sm, all five on one board
// from lg, where the front room widens (LibraryPage)
const SM = '(min-width: 640px)';
const LG = '(min-width: 1024px)';
const perRowNow = () => (window.matchMedia(LG).matches ? 5 : window.matchMedia(SM).matches ? 3 : 2);
const usePerRow = () => {
  const [n, setN] = useState(perRowNow);
  useEffect(() => {
    const ms = [SM, LG].map(q => window.matchMedia(q));
    const on = () => setN(perRowNow());
    ms.forEach(m => m.addEventListener('change', on));
    return () => ms.forEach(m => m.removeEventListener('change', on));
  }, []);
  return n;
};
const COLS: Record<number, string> = {
  2: 'grid-cols-2 gap-6 min-[400px]:gap-7 px-6 min-[400px]:px-8',
  3: 'grid-cols-3 gap-6 px-8',
  5: 'grid-cols-5 gap-5 px-8',
};
const GILT = '#e2bf7c';

/** A small cover, for the head of an open book and the "continue" card. */
export const MiniCover: React.FC<{ id: Cover['id']; className?: string }> = ({ id, className = 'w-9 h-12' }) => {
  const c = COVERS.find(x => x.id === id)!;
  return (
    <span
      className={`relative shrink-0 rounded-[2px_5px_5px_2px] shadow-[0_6px_12px_-6px_rgba(42,32,23,0.7)] ${className}`}
      style={{ background: `linear-gradient(140deg, ${c.cloth}, ${c.deep})` }}
      aria-hidden
    >
      <span className="absolute inset-y-0 left-0 w-[14%] bg-gradient-to-r from-black/30 to-white/10" />
      <span className="absolute inset-[14%] left-[26%] rounded-[1px] ring-1 ring-[#e2bf7c]/55" />
    </span>
  );
};

const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// on the shelf a cover opens its book (the cover swings open first).
// marked = the reader stopped inside: a ribbon hangs from the top
const BookCover: React.FC<{ cover: Cover; onOpen: () => void; opening?: boolean; marked?: boolean }> = ({ cover, onOpen, opening, marked }) => {
  const { Orn } = cover;
  const name = cover.title.replace('­', '');
  return (
    <button
      type="button"
      data-sort-id={cover.id}
      onClick={onOpen}
      aria-label={name}
      className={`group relative block w-full max-w-[128px] sm:max-w-[148px] justify-self-center ${cover.shape} select-none rounded-[3px_9px_9px_3px] outline-none [perspective:700px] focus-visible:ring-2 focus-visible:ring-[#7a2028]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f3e8d5] transition-transform duration-200 ease-out ${opening ? 'z-10 -translate-y-2 scale-[1.04]' : 'cursor-pointer hover:-translate-y-1.5 active:scale-[0.97]'}`}
    >
      {/* where the book touches the board */}
      <span className="absolute -bottom-[3px] inset-x-[3%] h-[7px] rounded-[50%] bg-[#2a2017]/35 blur-[3px]" aria-hidden />
      {/* the pages under the cover, seen as it opens */}
      <span className="absolute inset-y-[1.5%] left-[3%] right-[1%] rounded-[2px_8px_8px_2px] bg-[#fbf4e4] bg-[linear-gradient(90deg,rgba(74,52,38,0.28),transparent_14%),repeating-linear-gradient(0deg,transparent_0_9px,rgba(74,52,38,0.07)_9px_10px)]" aria-hidden />
      <span
        className="absolute inset-0 overflow-hidden rounded-[3px_9px_9px_3px] shadow-[0_2px_3px_rgba(42,32,23,0.25),0_14px_22px_-12px_rgba(42,32,23,0.65)] origin-left transition-transform duration-[380ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ background: `linear-gradient(140deg, ${cover.cloth} 0%, ${cover.deep} 100%)`, transform: opening ? 'rotateY(-68deg)' : undefined }}
      >
        {/* the spine: a rounded fold with its shadow, as on a cloth binding */}
        <span className="absolute inset-y-0 left-0 w-[10%] bg-gradient-to-r from-black/35 via-white/[0.12] to-black/15" />
        <span className="absolute inset-y-0 left-[10%] w-px bg-black/20" />
        {/* gilt frame, double */}
        <span className="absolute top-[7%] bottom-[7%] left-[17%] right-[7%] rounded-[2px] ring-1 ring-[#e2bf7c]/60" />
        <span className="absolute top-[9.5%] bottom-[9.5%] left-[19.5%] right-[9.5%] rounded-[1px] ring-1 ring-[#e2bf7c]/25" />
        {/* a soft light across the cloth */}
        <span className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-black/10" />
        <span className="absolute top-[13%] bottom-[13%] left-[23%] right-[13%] flex flex-col items-center justify-center gap-[9%] text-center">
          <Orn color={GILT} className="w-[30%] aspect-square opacity-90" />
          <span className="block font-serif-ge font-bold leading-[1.25] text-[#f4e3c1] text-[12px] min-[400px]:text-[13px] sm:text-[15px] [hyphens:manual] text-balance">
            {cover.title}
          </span>
          <span className="flex items-center gap-1 opacity-70" aria-hidden>
            <span className="h-px w-3 bg-[#e2bf7c]" />
            <span className="w-1 h-1 rotate-45 bg-[#e2bf7c]" />
            <span className="h-px w-3 bg-[#e2bf7c]" />
          </span>
        </span>
      </span>
      {marked && !opening && (
        <span className="absolute -top-[3px] right-[15%] w-[11%] h-[24%] drop-shadow-[0_2px_2px_rgba(42,32,23,0.45)]" aria-hidden>
          <span className="absolute inset-0 bg-gradient-to-r from-[#c9a35a] via-[#f0d79a] to-[#c9a35a] [clip-path:polygon(0_0,100%_0,100%_100%,50%_80%,0_100%)]" />
        </span>
      )}
    </button>
  );
};

export const Shelf: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const { user } = useAuth();
  const job = useExportState();
  const last = lastChapter();
  // a member's own order of the books, if they set one before (the arranging was removed with the plates, 2026-10-25)
  const { order } = useShelfOrder(user?.uid);
  const perRow = usePerRow();
  // the cover swings open, then the book's page comes
  const [opening, setOpening] = useState<string | null>(null);
  const busy = useRef(false);
  const openBook = (id: string) => {
    if (busy.current) return;
    if (reducedMotion()) return onOpen(id);
    busy.current = true;
    setOpening(id);
    window.setTimeout(() => { onOpen(id); busy.current = false; setOpening(null); }, 340);
  };
  const covers = order.map(id => COVERS.find(c => c.id === id)).filter((c): c is Cover => Boolean(c));
  const rows = Array.from({ length: Math.ceil(covers.length / perRow) }, (_, i) => covers.slice(i * perRow, (i + 1) * perRow));

  return (
    <div className="space-y-7">
      {/* where the reader stopped */}
      {last && (
        <button
          type="button"
          // two steps, the contents and then the chapter, so "back" from the chapter shows the contents
          onClick={() => { onOpen('book'); window.setTimeout(() => onOpen(`book:${last.n}`), 0); }}
          className="group w-full flex items-center gap-3.5 min-h-16 rounded-2xl bg-[#fffdf8] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/30 shadow-[0_1px_2px_rgba(42,32,23,0.04),0_10px_24px_-20px_rgba(42,32,23,0.45)] px-3.5 py-2.5 text-left cursor-pointer transition"
        >
          <MiniCover id="book" />
          <span className="flex-1 min-w-0">
            <span className="block text-xs font-bold text-[#9a7438]">გააგრძელე კითხვა · თავი {last.n}</span>
            <span className="mt-0.5 block font-serif-ge text-[15px] font-semibold leading-snug text-[#2a2017] truncate">
              {last.title || 'საღმრთო ისტორია'}
            </span>
          </span>
          <ChevronRight className="w-5 h-5 shrink-0 text-[#cdbba3] group-hover:text-[#7a2028] group-hover:translate-x-0.5 transition-all" />
        </button>
      )}

      {/* the books: cloth covers on light boards, one board under each row; a row with room left keeps its books
          in the middle (a phone: two, two and one) — no plates, no lamp, nothing to read under them */}
      <section aria-label="წიგნები" className="pt-3 space-y-8">
        {rows.map((row, i) => (
          <div key={i}>
            <div className="relative z-[1] flex items-end justify-center gap-7 min-[400px]:gap-9 sm:gap-8 px-3">
              {row.map(c => (
                <div key={c.id} className="w-[40%] max-w-[148px] sm:w-[26%] lg:w-[16%]">
                  <BookCover cover={c} onOpen={() => openBook(c.id)} opening={opening === c.id} marked={c.id === 'book' && !!last} />
                </div>
              ))}
            </div>
            {/* the board: light oak, thin, with its soft shadow */}
            <div aria-hidden className="-mt-0.5 h-2.5 rounded-full bg-gradient-to-b from-[#ecdcbf] via-[#e0c8a0] to-[#cfb185] ring-1 ring-[#b8946a]/25 shadow-[0_10px_16px_-10px_rgba(74,52,38,0.55)]" />
          </div>
        ))}
      </section>

      {/* the chant recordings — for members, as before */}
      {user && (
        <section aria-label="მოსასმენი">
          <SectionTitle>მოსასმენი</SectionTitle>
          <button
            type="button"
            onClick={() => onOpen('audio')}
            className="group mt-3 w-full flex items-center gap-3.5 min-h-16 rounded-2xl bg-[#fffdf8] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/30 shadow-[0_1px_2px_rgba(42,32,23,0.04),0_10px_24px_-20px_rgba(42,32,23,0.45)] px-3.5 py-2.5 text-left cursor-pointer active:scale-[0.99] transition-all"
          >
            <span className="w-11 h-11 shrink-0 rounded-xl bg-[#f6ecda] ring-1 ring-[#ead9bd] flex items-center justify-center text-[#7a2028]">
              <AudioLines className="w-5 h-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-serif-ge text-[15px] font-bold leading-snug text-[#2a2017]">საგალობლების mp3</span>
              {exportBusy(job) ? (
                <span className="mt-0.5 flex items-center gap-1.5 text-[12px] font-bold leading-snug text-[#7a2028] tabular-nums">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> მზადდება · {job!.done} / {job!.total}
                </span>
              ) : (
                <span className="mt-0.5 block text-[12px] leading-snug text-[#8a7a6a]">წიგნ-წიგნ, სინთეზატორით დაკრული</span>
              )}
            </span>
            <ChevronRight className="w-5 h-5 shrink-0 text-[#cdbba3] group-hover:text-[#7a2028] group-hover:translate-x-0.5 transition-all" />
          </button>
        </section>
      )}
    </div>
  );
};
