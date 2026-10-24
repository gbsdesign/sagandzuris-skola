import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, AudioLines, Check, ChevronRight, Loader2 } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { GrapeBunch, Rosette, VineLeaf } from '../../components/home/PlateOrnaments';
import { useDragSort } from '../../components/ui/useDragSort';
import { Btn } from '../../components/ui/kit';
import { useAuth } from '../../context/AuthContext';
import { daysBetween, fromIso, oldStyleOf, todayIso } from '../../data/churchCalendar';
import { FEAST_GROUPS, Feast, feastDates } from '../../data/library/feasts';
import { splitTitle, useLivesIndex } from '../../data/saintLives';
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

// an oil lamp of red glass on a brass stand: it stands where a board has room left beside its books
const Lamp: React.FC = () => (
  <span className="relative w-full max-w-[128px] sm:max-w-[148px] justify-self-center aspect-[5/7] flex items-end justify-center pointer-events-none" aria-hidden>
    {/* its light on the back wall */}
    <span className="lamp-glow absolute left-1/2 top-[18%] w-[130%] aspect-square -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(closest-side,rgba(255,196,110,0.5),rgba(255,196,110,0.16)_55%,transparent)]" />
    <svg viewBox="0 0 60 120" className="relative w-[46%] drop-shadow-[0_8px_8px_rgba(42,32,23,0.35)]">
      <defs>
        <linearGradient id="lamp-brass" x1="0" x2="1">
          <stop offset="0" stopColor="#8f6a32" /><stop offset="0.35" stopColor="#f0d79a" /><stop offset="0.6" stopColor="#c9a35a" /><stop offset="1" stopColor="#7d5a28" />
        </linearGradient>
        <linearGradient id="lamp-glass" x1="0" x2="1">
          <stop offset="0" stopColor="#6e141c" /><stop offset="0.4" stopColor="#c23a40" /><stop offset="1" stopColor="#5a1018" />
        </linearGradient>
        <radialGradient id="lamp-inner" cx="0.5" cy="0.3" r="0.6">
          <stop offset="0" stopColor="#ffd27a" stopOpacity="0.95" /><stop offset="0.6" stopColor="#ff8a4a" stopOpacity="0.35" /><stop offset="1" stopColor="#ff8a4a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lamp-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6d8" /><stop offset="0.45" stopColor="#ffd36b" /><stop offset="1" stopColor="#f08a2c" />
        </linearGradient>
      </defs>
      {/* foot, stem and the cup's holder */}
      <ellipse cx="30" cy="116.5" rx="17" ry="3" fill="#6b4c22" opacity="0.5" />
      <path d="M14 116 Q16 105 30 104 Q44 105 46 116 Z" fill="url(#lamp-brass)" />
      <rect x="27.5" y="78" width="5" height="28" rx="1.5" fill="url(#lamp-brass)" />
      <ellipse cx="30" cy="92" rx="5" ry="2.8" fill="url(#lamp-brass)" />
      <path d="M19 72 Q30 86 41 72 L39 79 Q30 85 21 79 Z" fill="url(#lamp-brass)" />
      {/* the red glass, lit from inside */}
      <path d="M16.5 46 Q14.5 64 21.5 72.5 Q30 79 38.5 72.5 Q45.5 64 43.5 46 Z" fill="url(#lamp-glass)" />
      <ellipse cx="30" cy="58" rx="11" ry="12" fill="url(#lamp-inner)" />
      <path d="M20.5 50 Q19.5 61 23.5 69" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <rect x="15" y="43.5" width="30" height="4" rx="2" fill="url(#lamp-brass)" />
      {/* the flame */}
      <g className="lamp-flame">
        <path d="M30 22 Q37 34 35 40.5 Q33.5 46 30 46 Q26.5 46 25 40.5 Q23 34 30 22 Z" fill="url(#lamp-flame)" />
        <ellipse cx="30" cy="40.5" rx="2.2" ry="3.6" fill="#fffbea" />
      </g>
    </svg>
  </span>
);

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

// What the plates say today: the prayers of this hour, today's saint, the coming feast; the other books keep their note.
interface Plate { text: string; opens?: string }

const inDays = (n: number) => (n === 0 ? 'დღეს' : n === 1 ? 'ხვალ' : `${n} დღეში`);

// the ranks before a saint's name, left out on the plate
const RANK = /^(წმიდა(თა)?|წმიდან(ნ)?ი|ღირს(ი|ნი)|.*მოწამე(ნი)?|მოციქულ.*|მართალ(ი|ნი)|ნეტარ(ი|ნი)|კეთილმორწმუნე|წინასწარმეტყველ(ი|ნი)|დიდებულ(ი|ნი)|მენელსაცხებლე(ნი)?|დედა(ჲ)?|მამა(ჲ|ნი)?|ჩვენ(ი|ნი)|შორის|მეფე|დედოფალი|.*დიაკონი|.*ეპისკოპოსი|მღვდელმთავარ(ი|ნი)|.*მოქმედ(ი|ნი)|მახარებელი|მღვდელი|პატრიარქი|უსასყიდლონი|ორნი|სამნი|ძმანი|მშობელნი|ღვთისა|აბბა|და|.*თაგან(ი|ნი))$/;
const lifeWords = (t: string) => splitTitle(t).name.split(/[,;.(]/)[0].replace(/[:–-]/g, ' ').split(/\s+/).filter(Boolean);

// "წმიდა მოციქული ფილიპე, შვიდ დიაკონთაგანი (I)" → "წმ. ფილიპე", "ღირსი კოზმა - მაიუმელი…" → "ღირსი კოზმა";
// null when the title names no saint after its ranks (a feast, an icon, "ღირსნი მამანი, რომელნი…")
const shortLife = (t: string) => {
  const words = lifeWords(t);
  const i = words.findIndex(w => !RANK.test(w));
  if (i < 1) return null;
  const rank = words[0].startsWith('ღირს') ? 'ღირსი' : words[0].startsWith('მართალ') ? 'მართალი' : 'წმ.';
  return `${rank} ${words[i]}`;
};

// the nearest of the twelve great feasts and the great feasts, today included
const nextFeast = (today: string) => {
  const year = fromIso(today).getFullYear();
  let next: { feast: Feast; iso: string } | null = null;
  for (const feast of FEAST_GROUPS.slice(0, 3).flatMap(g => g.feasts)) {
    for (const iso of [...feastDates(feast, year), ...feastDates(feast, year + 1)]) {
      if (iso >= today && (!next || iso < next.iso)) next = { feast, iso };
    }
  }
  return next;
};

const usePlates = (): Partial<Record<Cover['id'], Plate>> => {
  const { lives } = useLivesIndex();
  const today = todayIso();
  const hour = new Date().getHours();
  return useMemo(() => {
    const plates: Partial<Record<Cover['id'], Plate>> = {};
    if (hour >= 5 && hour < 12) plates.prayers = { text: 'დილის ლოცვები', opens: 'prayers:morning-evening' };
    else if (hour >= 18 || hour < 2) plates.prayers = { text: 'საღამოს ლოცვები', opens: 'prayers:morning-evening' };
    const old = oldStyleOf(today);
    const todays = (lives || []).filter(l => !l.x && l.m === old.month && l.d === old.day);
    // a Georgian saint first, then the day's first saint (a day of a feast only keeps the note)
    const saint = [...todays.filter(l => l.g), ...todays].map(l => shortLife(l.t)).find(Boolean);
    if (saint) plates.lives = { text: `დღეს: ${saint}` };
    const next = nextFeast(today);
    if (next) plates.feasts = { text: `${inDays(daysBetween(today, next.iso))}: ${next.feast.short ?? next.feast.name}` };
    return plates;
  }, [lives, today, hour]);
};

const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

type GripProps = ReturnType<ReturnType<typeof useDragSort>['grip']>;

// on the shelf a cover opens its book (the cover swings open first); while arranging, the whole cover is the grip.
// marked = the reader stopped inside: a ribbon hangs from the top
const BookCover: React.FC<{ cover: Cover; onOpen: () => void; grip?: GripProps; lifted?: boolean; opening?: boolean; marked?: boolean }> = ({ cover, onOpen, grip, lifted, opening, marked }) => {
  const { Orn } = cover;
  const name = cover.title.replace('­', '');
  return (
    <button
      type="button"
      data-sort-id={cover.id}
      {...(grip || { onClick: onOpen })}
      aria-label={grip ? `${name} — გადაადგილება (ისრებითაც)` : name}
      className={`group relative block w-full max-w-[128px] sm:max-w-[148px] justify-self-center ${cover.shape} select-none rounded-[3px_9px_9px_3px] outline-none [perspective:700px] focus-visible:ring-2 focus-visible:ring-[#7a2028]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f3e8d5] transition-transform duration-200 ease-out ${
        opening
          ? 'z-10 -translate-y-2 scale-[1.04]'
          : !grip
            ? 'cursor-pointer hover:-translate-y-1.5 active:scale-[0.97]'
            : lifted
              ? 'z-10 -translate-y-2.5 scale-105 cursor-grabbing'
              : 'cursor-grab -translate-y-1'
      }`}
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
  const shelf = useShelfOrder(user?.uid);
  const [arranging, setArranging] = useState(false);
  const { container, order, dragging, grip } = useDragSort(shelf.order, shelf.save);
  const perRow = usePerRow();
  const plates = usePlates();
  // the cover swings open, then the book's page comes
  const [opening, setOpening] = useState<string | null>(null);
  const busy = useRef(false);
  const openBook = (id: string, at = id) => {
    if (busy.current) return;
    if (reducedMotion()) return onOpen(at);
    busy.current = true;
    setOpening(id);
    window.setTimeout(() => { onOpen(at); busy.current = false; setOpening(null); }, 340);
  };
  const covers = order.map(id => COVERS.find(c => c.id === id)).filter((c): c is Cover => Boolean(c));
  const rows = Array.from({ length: Math.ceil(covers.length / perRow) }, (_, i) => covers.slice(i * perRow, (i + 1) * perRow));
  const cols = COLS[perRow];

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
        {/* a wooden bookcase: the frame, the back wall in its shade, a board under each row of books */}
        <div className="mt-3 rounded-[20px] p-2 bg-gradient-to-b from-[#c9a272] via-[#b8905f] to-[#a17548] ring-1 ring-[#8f653c]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_24px_36px_-26px_rgba(74,52,38,0.75)]">
          <div
            ref={el => { container.current = el; }}
            className="rounded-[13px] overflow-hidden bg-gradient-to-b from-[#f6eedf] to-[#ecdec4] shadow-[inset_0_14px_16px_-12px_rgba(74,52,38,0.5),inset_12px_0_14px_-12px_rgba(74,52,38,0.35),inset_-12px_0_14px_-12px_rgba(74,52,38,0.35)]"
          >
            {rows.map((row, i) => (
              <React.Fragment key={i}>
                <div className={`relative z-[1] -mb-1 grid items-end ${cols} ${i === 0 ? 'pt-6 sm:pt-8' : 'pt-5'}`}>
                  {row.map(c => (
                    <BookCover
                      key={c.id}
                      cover={c}
                      onOpen={() => openBook(c.id)}
                      grip={arranging ? grip(c.id) : undefined}
                      lifted={dragging === c.id}
                      opening={opening === c.id}
                      marked={c.id === 'book' && !!last}
                    />
                  ))}
                  {/* a board with room left keeps a lamp burning there */}
                  {row.length < perRow && <Lamp />}
                </div>
                {/* the board: its top, where the books stand, and its front edge */}
                <div aria-hidden>
                  <div className="h-[6px] bg-gradient-to-b from-[#dcbd90] to-[#caa476]" />
                  <div className="h-[18px] bg-gradient-to-b from-[#b68c5d] via-[#a67b4c] to-[#8d633b] border-t border-[#ecd3ab]/80 shadow-[0_10px_12px_-8px_rgba(74,52,38,0.55)]" />
                </div>
                {/* a small brass plate hung on the board's edge under each book, two screws holding it */}
                <div className={`relative z-[1] -mt-[10px] grid ${cols} pb-5`}>
                  {row.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      tabIndex={-1}
                      title={plates[c.id]?.text ?? c.note}
                      onClick={() => !arranging && openBook(c.id, plates[c.id]?.opens)}
                      // a plate may reach a little into the gap beside its book, so a phone keeps it on one line
                      className="relative justify-self-center w-max max-w-[calc(100%+20px)] text-balance rounded-[3px] px-2.5 py-[2px] bg-gradient-to-b from-[#f2e4bd] to-[#d6b67a] ring-1 ring-[#9a7740]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_2px_3px_-1px_rgba(74,52,38,0.5)] text-center text-[12px] font-semibold leading-[15px] text-[#4a3018] cursor-pointer"
                    >
                      <span className="absolute left-[3.5px] top-1/2 -translate-y-1/2 w-[3px] h-[3px] rounded-full bg-[#8a6630]/80" aria-hidden />
                      <span className="line-clamp-2">{plates[c.id]?.text ?? c.note}</span>
                      <span className="absolute right-[3.5px] top-1/2 -translate-y-1/2 w-[3px] h-[3px] rounded-full bg-[#8a6630]/80" aria-hidden />
                    </button>
                  ))}
                </div>
              </React.Fragment>
            ))}
          </div>
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
