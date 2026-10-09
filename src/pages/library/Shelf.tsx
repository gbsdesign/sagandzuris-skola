import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, AudioLines, Check, ChevronRight, Loader2 } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { GrapeBunch, Rosette, VineLeaf } from '../../components/home/PlateOrnaments';
import { useDragSort } from '../../components/ui/useDragSort';
import { Btn } from '../../components/ui/kit';
import { useAuth } from '../../context/AuthContext';
import { SectionTitle } from './BookHead';
import { lastChapter } from './readingPlace';
import { exportBusy, useExportState } from './SynthDownload';

// The library's front room: the books standing on a wooden shelf (a cover opens the book), the place
// the reader stopped, and the chant recordings on a shelf of their own.

export type ShelfId = 'book' | 'lives' | 'feasts' | 'prayers' | 'sasuliero' | 'audio';
export const SHELF_IDS: ShelfId[] = ['book', 'lives', 'feasts', 'prayers', 'sasuliero', 'audio'];

type Orn = React.FC<{ color: string; className?: string }>;
interface Cover { id: Exclude<ShelfId, 'audio'>; title: string; note: string; cloth: string; deep: string; Orn: Orn }

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
  { id: 'book', title: 'საღმრთო ისტორია', note: 'ძველი აღთქმა', cloth: '#7a2430', deep: '#4e141b', Orn: GrapeBunch },
  // a soft hyphen: on a narrow phone the long word breaks as a book would break it
  { id: 'lives', title: 'წმიდანთა ცხოვრება', note: 'წლის ყოველი დღე', cloth: '#35553f', deep: '#1f3527', Orn: VineLeaf },
  { id: 'feasts', title: 'დღესას­წაულები', note: 'ამ წლის თარიღები', cloth: '#2c4268', deep: '#18273f', Orn: Rosette },
  { id: 'prayers', title: 'ლოცვანი', note: 'დილა და საღამო', cloth: '#5a3a5e', deep: '#33203a', Orn: BolnisiCross },
  { id: 'sasuliero', title: 'სასულიერო წიგნები', note: 'წმიდა მამები', cloth: '#6b4a2e', deep: '#3a2716', Orn: OpenBook },
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

// two books to a board on a phone (the titles keep their size), four side by side from sm up
const WIDE = '(min-width: 640px)';
const useWide = () => {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  useEffect(() => {
    const m = window.matchMedia(WIDE);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
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

type GripProps = ReturnType<ReturnType<typeof useDragSort>['grip']>;

// on the shelf a cover opens its book; while arranging, the whole cover is the grip
const BookCover: React.FC<{ cover: Cover; onOpen: () => void; grip?: GripProps; lifted?: boolean }> = ({ cover, onOpen, grip, lifted }) => {
  const { Orn } = cover;
  const name = cover.title.replace('­', '');
  return (
    <button
      type="button"
      data-sort-id={cover.id}
      {...(grip || { onClick: onOpen })}
      aria-label={grip ? `${name} — გადაადგილება (ისრებითაც)` : name}
      className={`group relative block w-full max-w-[128px] sm:max-w-[148px] justify-self-center aspect-[5/7] select-none rounded-[3px_9px_9px_3px] outline-none focus-visible:ring-2 focus-visible:ring-[#7a2028]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f3e8d5] transition-transform duration-200 ease-out ${
        !grip
          ? 'cursor-pointer hover:-translate-y-1.5 active:scale-[0.97]'
          : lifted
            ? 'z-10 -translate-y-2.5 scale-105 cursor-grabbing'
            : 'cursor-grab -translate-y-1'
      }`}
    >
      <span
        className="absolute inset-0 overflow-hidden rounded-[3px_9px_9px_3px] shadow-[0_2px_3px_rgba(42,32,23,0.25),0_14px_22px_-12px_rgba(42,32,23,0.65)]"
        style={{ background: `linear-gradient(140deg, ${cover.cloth} 0%, ${cover.deep} 100%)` }}
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
    </button>
  );
};

export const Shelf: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const { user } = useAuth();
  const job = useExportState();
  const last = lastChapter();
  const shelf = useShelfOrder(user?.uid);
  const [arranging, setArranging] = useState(false);
  const { container, order, dragging, grip } = useDragSort(shelf.order, shelf.save);
  const wide = useWide();
  const covers = order.map(id => COVERS.find(c => c.id === id)).filter((c): c is Cover => Boolean(c));
  const perRow = wide ? 4 : 2;
  const rows = Array.from({ length: Math.ceil(covers.length / perRow) }, (_, i) => covers.slice(i * perRow, (i + 1) * perRow));
  const cols = wide ? 'grid-cols-4 gap-6 px-8' : 'grid-cols-2 gap-6 min-[400px]:gap-8 px-8 min-[400px]:px-10';

  return (
    <div className="space-y-6">
      {/* where the reader stopped */}
      {last && (
        <button
          type="button"
          // two steps, the contents and then the chapter, so "back" from the chapter shows the contents
          onClick={() => { onOpen('book'); window.setTimeout(() => onOpen(`book:${last.n}`), 0); }}
          className="group w-full flex items-center gap-3.5 min-h-16 rounded-2xl bg-[#fffdf8] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/30 shadow-[0_1px_2px_rgba(42,32,23,0.04),0_10px_24px_-20px_rgba(42,32,23,0.45)] px-3.5 py-2.5 text-left cursor-pointer active:scale-[0.99] transition-all"
        >
          <MiniCover id="book" />
          <span className="flex-1 min-w-0">
            <span className="block text-[12px] font-bold text-[#9a7438]">გააგრძელე კითხვა · თავი {last.n}</span>
            <span className="mt-0.5 block font-serif-ge text-[15px] font-semibold leading-snug text-[#2a2017] truncate">
              {last.title || 'საღმრთო ისტორია'}
            </span>
          </span>
          <ChevronRight className="w-5 h-5 shrink-0 text-[#cdbba3] group-hover:text-[#7a2028] group-hover:translate-x-0.5 transition-all" />
        </button>
      )}

      {/* the books */}
      <section aria-label="წასაკითხი">
        <div className="flex items-center gap-2">
          <SectionTitle className="flex-1">წასაკითხი</SectionTitle>
          {arranging ? (
            <Btn size="sm" icon={<Check />} onClick={() => setArranging(false)}>
              მზადაა
            </Btn>
          ) : (
            <button
              type="button"
              onClick={() => setArranging(true)}
              className="min-h-9 px-3 rounded-full inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#8a7a6a] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.06] cursor-pointer transition-colors"
            >
              <ArrowLeftRight className="w-4 h-4" />
              რიგი
            </button>
          )}
        </div>
        {arranging && <p className="mt-1.5 px-1 text-[12.5px] text-[#8a7a6a]">გადაათრიე წიგნი ახალ ადგილზე.</p>}
        <div
          ref={el => { container.current = el; }}
          className="mt-3 rounded-2xl bg-gradient-to-b from-[#f6eedf] to-[#efe3cd] ring-1 ring-[#e6d6bb] shadow-[inset_0_10px_18px_-14px_rgba(74,52,38,0.35)] overflow-hidden"
        >
          {rows.map((row, i) => (
            <React.Fragment key={i}>
              <div className={`grid items-end ${cols} ${i === 0 ? 'pt-5 sm:pt-7' : 'pt-4'}`}>
                {row.map(c => (
                  <BookCover key={c.id} cover={c} onOpen={() => onOpen(c.id)} grip={arranging ? grip(c.id) : undefined} lifted={dragging === c.id} />
                ))}
              </div>
              {/* the wooden board the books stand on */}
              <div className="relative h-3.5 bg-gradient-to-b from-[#c9a272] via-[#b48a5c] to-[#94693f] border-t border-[#e0c49a] shadow-[0_6px_10px_-4px_rgba(74,52,38,0.45)]" aria-hidden />
              <div className={`grid ${cols} pt-2.5 pb-3`}>
                {row.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    tabIndex={-1}
                    onClick={() => !arranging && onOpen(c.id)}
                    className="text-center text-[12px] sm:text-[12.5px] font-semibold leading-snug text-[#8a6a52] cursor-pointer"
                  >
                    {c.note}
                  </button>
                ))}
              </div>
            </React.Fragment>
          ))}
        </div>
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
