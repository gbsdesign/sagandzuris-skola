import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen, CalendarDays, ScrollText, Droplets, Music2, Sparkles, Clock, Feather, Music, Megaphone, Heart, Flame,
  Crown, ChevronRight, ChevronLeft, Minus, Plus, WifiOff, Loader2,
} from 'lucide-react';
import { useNavigation } from '../../context';
import { WIGNEBI_COLLECTIONS, WIGNEBI_SHELVES, type WignebiCollection } from '../../data/wignebi';
import { triggerHaptic } from '../../utils/haptics';

// „წიგნები“ of მედავითნეობა: the liturgical books in the menu order of the „საღვთისმსახურო წიგნები“ app.
// The place is `mapItem`: „w“ the shelves, „w:s:biblia“ the Bible's four books, „w:c:<collection>“ a book's list,
// „w:c:<collection>:<n>“ an item (its parts, or straight its text), „w:c:<collection>:<n>:<part>“ the text.
// Texts are fetched from public/wignebi/<collection>/<NN>.json only when opened (the service worker keeps them).

type Section = [string, string[]];
type BookFile = { t: string; num?: boolean; c: { l: string; s: Section[] }[] };
type CalDay = { d: number; w: string; o?: number | null; f?: boolean | null; r?: boolean; s: string; n: string[]; k: string[] };
type CalFile = { y: number; m: CalDay[][] };

const CARD = 'rounded-3xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_28px_-18px_rgba(42,32,23,0.35)]';
const ROW = `${CARD} w-full min-h-16 px-4 py-3 flex items-center gap-3 text-left cursor-pointer transition hover:ring-[#7a2028]/25 active:scale-[0.99]`;

const SHELF_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  biblia: BookOpen, kalendari: CalendarDays, kondaki: Crown, kurtxevani: Droplets, paraklitoni: Music2, tveni: Sparkles,
  jamni: Clock, davitni: Feather, mgalobeltatvis: Music, wardgoma: Megaphone, locvani: Heart, paraklisebi: Flame,
  kriteli: ScrollText,
};

// ---------- files ----------
const cache = new Map<string, Promise<unknown>>();
const fileUrl = (coll: string, n: number) => `/wignebi/${coll}/${String(n).padStart(2, '0')}.json`;
const loadFile = <T,>(coll: string, n: number): Promise<T> => {
  const url = fileUrl(coll, n);
  let p = cache.get(url);
  if (!p) {
    p = fetch(url).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p as Promise<T>;
};
function useFile<T>(coll: string, n: number) {
  const [state, set] = useState<{ data?: T; error?: boolean }>({});
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    set({});
    loadFile<T>(coll, n).then(data => live && set({ data }), () => live && set({ error: true }));
    return () => { live = false; };
  }, [coll, n, tick]);
  return { ...state, retry: () => setTick(t => t + 1) };
}

// ---------- text size (this device only) ----------
const SIZES = [15, 17, 19, 21, 23, 26];
const SIZE_KEY = 'sg-wignebi-size';
const useTextSize = () => {
  const [i, setI] = useState(() => {
    try { const v = Number(localStorage.getItem(SIZE_KEY)); return v >= 0 && v < SIZES.length ? v : 2; } catch { return 2; }
  });
  const change = (d: number) => setI(old => {
    const v = Math.min(SIZES.length - 1, Math.max(0, old + d));
    try { localStorage.setItem(SIZE_KEY, String(v)); } catch { /* private mode */ }
    return v;
  });
  return { px: SIZES[i], smaller: i > 0 ? () => change(-1) : undefined, bigger: i < SIZES.length - 1 ? () => change(1) : undefined };
};

// ---------- small parts ----------
const Head: React.FC<{ kicker?: string; title: string; sub?: string }> = ({ kicker, title, sub }) => (
  <header className="text-center px-2 mb-5">
    {kicker && <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#a0703c]">{kicker}</p>}
    <h2 className="mt-1.5 font-serif-ge text-[22px] sm:text-[26px] font-bold leading-tight text-[#2a2017] text-balance">{title}</h2>
    {sub && <p className="mt-2 mx-auto max-w-md text-[15px] leading-relaxed text-[#6b5c4d] text-pretty">{sub}</p>}
    <Ornament />
  </header>
);

// a thin gold rule with a small cross, under page titles
const Ornament: React.FC = () => (
  <div className="mt-3 flex items-center justify-center gap-2.5 text-[#c9a35f]" aria-hidden>
    <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#c9a35f]/70" />
    <svg viewBox="0 0 16 22" className="w-3 h-4" fill="currentColor"><path d="M7 0h2v5h5v2H9v3h4v2H9v10H7V12H3v-2h4V7H2V5h5z" /></svg>
    <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#c9a35f]/70" />
  </div>
);

const Num: React.FC<{ n: number | string }> = ({ n }) => (
  <span className="shrink-0 w-10 h-10 rounded-full bg-[#7a2028]/[0.07] ring-1 ring-[#7a2028]/10 text-[#7a2028] flex items-center justify-center text-[14px] font-black tabular-nums">{n}</span>
);

const Waiting: React.FC<{ error?: boolean; retry: () => void }> = ({ error, retry }) => (
  <div className={`${CARD} py-12 px-5 text-center`}>
    {error ? (
      <>
        <span className="mx-auto w-12 h-12 rounded-2xl bg-[#7a2028]/[0.07] text-[#7a2028] flex items-center justify-center"><WifiOff className="w-6 h-6" /></span>
        <p className="mt-3 font-serif-ge font-bold text-[#4a3426]">ტექსტი ვერ ჩაიტვირთა</p>
        <p className="mt-1 text-[14px] text-[#8a7a6a]">შეამოწმე ინტერნეტი. ერთხელ გახსნილი წიგნი მერე უინტერნეტოდაც იხსნება.</p>
        <button type="button" onClick={retry}
          className="mt-4 h-11 px-5 rounded-full bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] text-[15px] font-bold cursor-pointer transition active:scale-[0.97]">თავიდან ცდა</button>
      </>
    ) : (
      <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#8a7a6a]"><Loader2 className="w-5 h-5 animate-spin" />იტვირთება…</span>
    )}
  </div>
);

// ---------- shelves (the main menu) ----------
const Home: React.FC<{ open: (id: string) => void }> = ({ open }) => {
  const [bible, ...rest] = WIGNEBI_SHELVES;
  const go = (id: string, colls: string[]) => open(colls.length === 1 ? `w:c:${colls[0]}` : `w:s:${id}`);
  return (
    <div>
      <Head kicker="საღვთისმსახურო წიგნები" title="წიგნები მედავითნისთვის" sub="ბიბლია, ჟამნი, პარაკლიტონი, დავითნი და სხვა წიგნები, რომლებიც კლიროსზე გამოგადგება." />
      <button type="button" onClick={() => go(bible.id, bible.collections)}
        className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#8a2630] via-[#7a2028] to-[#561419] text-[#fbf6ec] p-5 sm:p-6 text-left cursor-pointer transition active:scale-[0.99] shadow-[0_14px_30px_-18px_rgba(122,32,40,0.9)] ring-1 ring-[#c9a35f]/30">
        <span className="absolute inset-2 rounded-[20px] border border-[#e8c98a]/25 pointer-events-none" aria-hidden />
        <span className="relative flex items-center gap-4">
          <span className="shrink-0 w-14 h-14 rounded-2xl bg-[#fbf6ec]/10 ring-1 ring-[#e8c98a]/40 flex items-center justify-center text-[#f3dca8]">
            <BookOpen className="w-7 h-7" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-serif-ge text-[21px] font-bold leading-tight">{bible.title}</span>
            <span className="block mt-1 text-[14px] leading-snug text-[#fbf6ec]/75">{bible.sub}</span>
          </span>
          <ChevronRight className="w-6 h-6 shrink-0 text-[#f3dca8]" />
        </span>
      </button>

      <div className="mt-3 grid grid-cols-2 min-[640px]:grid-cols-3 gap-3">
        {rest.map(s => {
          const Icon = SHELF_ICONS[s.id] ?? BookOpen;
          return (
            <button key={s.id} type="button" onClick={() => go(s.id, s.collections)}
              className={`${CARD} group relative min-h-[132px] p-4 flex flex-col items-start text-left cursor-pointer transition hover:ring-[#7a2028]/25 active:scale-[0.98]`}>
              <span className="w-11 h-11 rounded-2xl bg-[#7a2028]/[0.07] ring-1 ring-[#7a2028]/10 text-[#7a2028] flex items-center justify-center transition group-hover:bg-[#7a2028] group-hover:text-[#fbf6ec]">
                <Icon className="w-5 h-5" />
              </span>
              <span className="mt-3 block font-serif-ge text-[16px] font-bold leading-snug text-[#2a2017] break-words">{s.title}</span>
              <span className="mt-1 block text-[13px] leading-snug text-[#8a7a6a]">{s.sub}</span>
              <span className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-[#c9a35f]/70" aria-hidden />
            </button>
          );
        })}
      </div>
      <p className="mt-5 px-2 text-center text-[13px] leading-relaxed text-[#8a7a6a] text-pretty">
        ტექსტები: „საღვთისმსახურო წიგნები“, ღვთისმშობლის მიძინების სახელობის მამათა მონასტერი.
      </p>
    </div>
  );
};

const countWord = (c: WignebiCollection, n: number) =>
  c.kind === 'grid' ? `${n} თავი` : c.id === 'trapezi' || c.id === 'samociqulo' ? `${n} საკითხავი` : n > 1 ? `${n} ნაწილი` : '';

// the Bible: four books
const ShelfView: React.FC<{ id: string; open: (id: string) => void }> = ({ id, open }) => {
  const shelf = WIGNEBI_SHELVES.find(s => s.id === id);
  if (!shelf) return null;
  return (
    <div>
      <Head kicker="საღვთისმსახურო წიგნები" title={shelf.title} />
      <div className="space-y-3">
        {shelf.collections.map((cid, i) => {
          const c = WIGNEBI_COLLECTIONS[cid];
          return (
            <button key={cid} type="button" onClick={() => open(`w:c:${cid}`)} className={ROW}>
              <Num n={i + 1} />
              <span className="flex-1 min-w-0">
                <span className="block font-serif-ge text-[17px] font-bold leading-snug text-[#2a2017]">{c.title}</span>
                <span className="block mt-0.5 text-[13px] text-[#8a7a6a]">{c.items.length} წიგნი</span>
              </span>
              <ChevronRight className="w-5 h-5 shrink-0 text-[#c4b39c]" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

// a book's list (Old Testament books, the hours of the ჟამნი, the eight tones…)
const CollectionView: React.FC<{ c: WignebiCollection; open: (id: string) => void }> = ({ c, open }) => {
  const isBible = ['akhali', 'dzveli', 'trapezi', 'samociqulo'].includes(c.id);
  return (
    <div>
      <Head kicker={isBible ? 'ბიბლია' : 'საღვთისმსახურო წიგნები'} title={c.title} />
      <ol className="space-y-2.5">
        {c.items.map((it, i) => (
          <li key={it.n}>
            <button type="button" onClick={() => open(`w:c:${c.id}:${it.n}`)} className={ROW}>
              <Num n={i + 1} />
              <span className="flex-1 min-w-0">
                <span className="block text-[16px] font-bold leading-snug text-[#2a2017] break-words">{it.t}</span>
                {countWord(c, it.c) && <span className="block mt-0.5 text-[13px] text-[#8a7a6a]">{countWord(c, it.c)}</span>}
              </span>
              <ChevronRight className="w-5 h-5 shrink-0 text-[#c4b39c]" />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
};

// an item with several parts: chapter numbers for the Bible, rows for everything else
const PartsView: React.FC<{ c: WignebiCollection; n: number; book: BookFile; open: (id: string) => void }> = ({ c, n, book, open }) => (
  <div>
    <Head kicker={c.title} title={book.t} />
    {book.num ? (
      <div className={`${CARD} p-3 sm:p-4`}>
        <p className="px-1 pb-2.5 text-[13px] font-bold text-[#8a7a6a]">აირჩიე თავი</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-2">
          {book.c.map((p, i) => (
            <button key={i} type="button" onClick={() => open(`w:c:${c.id}:${n}:${i}`)}
              className="h-12 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[16px] font-bold tabular-nums text-[#4a3426] cursor-pointer transition hover:bg-[#7a2028] hover:text-[#fbf6ec] hover:ring-[#7a2028] active:scale-[0.95]">
              {p.l}
            </button>
          ))}
        </div>
      </div>
    ) : (
      <ol className="space-y-2.5">
        {book.c.map((p, i) => (
          <li key={i}>
            <button type="button" onClick={() => open(`w:c:${c.id}:${n}:${i}`)} className={ROW}>
              <Num n={i + 1} />
              <span className="flex-1 min-w-0 text-[15px] font-bold leading-snug text-[#2a2017] line-clamp-3 break-words">{p.l}</span>
              <ChevronRight className="w-5 h-5 shrink-0 text-[#c4b39c]" />
            </button>
          </li>
        ))}
      </ol>
    )}
  </div>
);

// the text: headings as red rubrics, the Bible's verses numbered
const Reader: React.FC<{ c: WignebiCollection; n: number; book: BookFile; part: number; open: (id: string, replace?: boolean) => void; back: () => void }> = ({
  c, n, book, part, open, back,
}) => {
  const size = useTextSize();
  const p = book.c[part];
  const many = book.c.length > 1;
  const go = (i: number) => { triggerHaptic(10); open(`w:c:${c.id}:${n}:${i}`, true); window.scrollTo({ top: 0 }); };
  if (!p) return null;
  const partTitle = book.num ? `თავი ${p.l}` : many ? p.l : '';
  return (
    <div>
      <header className="px-1 mb-4 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#a0703c]">{c.title}</p>
          <h2 className="mt-1 font-serif-ge text-[21px] font-bold leading-tight text-[#2a2017] text-balance">{book.t}</h2>
          {partTitle && !(!book.num && p.s[0]?.[0] === p.l) && (
            <p className="mt-1 text-[15px] font-bold text-[#7a2028] line-clamp-2">{partTitle}</p>
          )}
        </div>
        {/* text size, kept on this device */}
        <div className="shrink-0 flex items-center gap-1 rounded-full bg-white ring-1 ring-[#e8dcc8] p-1">
          <button type="button" onClick={size.smaller} disabled={!size.smaller} aria-label="ტექსტი უფრო პატარა"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#4a3426] cursor-pointer hover:bg-[#7a2028]/[0.06] disabled:opacity-30 disabled:cursor-default"><Minus className="w-4 h-4" /></button>
          <span className="text-[13px] font-black text-[#8a7a6a] select-none" aria-hidden>ა</span>
          <button type="button" onClick={size.bigger} disabled={!size.bigger} aria-label="ტექსტი უფრო დიდი"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#4a3426] cursor-pointer hover:bg-[#7a2028]/[0.06] disabled:opacity-30 disabled:cursor-default"><Plus className="w-4 h-4" /></button>
        </div>
      </header>

      <article className={`${CARD} px-5 py-6 sm:px-8 sm:py-8`} style={{ fontSize: size.px }}>
        {p.s.map(([h, paras], si) => (
          <section key={si} className={si ? 'mt-[1.4em]' : ''}>
            {h && <h3 className="font-serif-ge font-bold text-[0.92em] leading-snug text-[#9b1c23] mb-[0.5em] text-pretty">{h}</h3>}
            {paras.map((t, pi) => {
              const numbered = book.num && !/^\d+[.\s]/.test(t);
              return (
                <p key={pi} className="font-serif-ge leading-[1.75] text-[#2a2017] mb-[0.55em] last:mb-0 text-pretty break-words">
                  {numbered && <sup className="mr-1 text-[0.62em] font-sans font-black text-[#a0703c] tabular-nums">{pi + 1}</sup>}
                  {t}
                </p>
              );
            })}
          </section>
        ))}
      </article>

      {/* the way on: roomy, wraps on a narrow phone */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 px-1">
        <button type="button" onClick={() => (part > 0 ? go(part - 1) : back())}
          className="inline-flex items-center gap-1.5 h-12 pl-3.5 pr-5 rounded-full bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#4a3426] text-[15px] font-bold cursor-pointer transition active:scale-[0.97]">
          <ChevronLeft className="w-5 h-5" />{part > 0 ? 'წინა' : 'სია'}
        </button>
        {part < book.c.length - 1 && (
          <button type="button" onClick={() => go(part + 1)}
            className="inline-flex items-center gap-1.5 h-12 pl-6 pr-4 rounded-full bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] text-[15px] font-bold cursor-pointer transition active:scale-[0.97] shadow-[0_6px_14px_-8px_rgba(122,32,40,0.7)]">
            {book.num ? 'შემდეგი თავი' : 'შემდეგი'}<ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

const ItemView: React.FC<{ c: WignebiCollection; n: number; part?: number; open: (id: string, replace?: boolean) => void; back: () => void }> = ({ c, n, part, open, back }) => {
  const { data, error, retry } = useFile<BookFile>(c.id, n);
  if (!data) return <Waiting error={error} retry={retry} />;
  if (part === undefined && data.c.length > 1) return <PartsView c={c} n={n} book={data} open={open} />;
  return <Reader c={c} n={n} book={data} part={part ?? 0} open={open} back={back} />;
};

// ---------- the church calendar ----------
const MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
const tbilisiToday = () => { const d = new Date(Date.now() + 4 * 3600e3); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }; };

const CalendarView: React.FC<{ c: WignebiCollection }> = ({ c }) => {
  const today = tbilisiToday();
  const years = c.items.map(it => ({ n: it.n, y: Number(it.t) }));
  const [year, setYear] = useState(() => (years.find(x => x.y === today.y) ?? years[years.length - 1]).n);
  const yearNum = years.find(x => x.n === year)?.y ?? today.y;
  const [month, setMonth] = useState(() => (yearNum === today.y ? today.m : 0));
  const { data, error, retry } = useFile<CalFile>(c.id, year);
  const days = useMemo(() => data?.m[month] ?? [], [data, month]);
  const todayRef = useRef<HTMLLIElement>(null);
  const showsToday = yearNum === today.y && month === today.m && days.some(d => d.d === today.d);

  return (
    <div>
      <Head kicker="საღვთისმსახურო წიგნები" title={c.title} />
      <div className="flex flex-wrap justify-center gap-2 mb-3">
        {years.map(x => (
          <button key={x.n} type="button" aria-pressed={x.n === year}
            onClick={() => { triggerHaptic(8); setYear(x.n); setMonth(x.y === today.y ? today.m : 0); }}
            className={`h-10 px-4 rounded-full text-[15px] font-bold tabular-nums cursor-pointer transition ${x.n === year ? 'bg-[#7a2028] text-[#fbf6ec] shadow-sm' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'}`}>
            {x.y}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 min-[480px]:grid-cols-4 min-[720px]:grid-cols-6 gap-1 p-1 mb-4 rounded-2xl bg-white/75 ring-1 ring-[#e8dcc8]">
        {MONTHS.map((name, i) => (
          <button key={name} type="button" aria-pressed={i === month} onClick={() => { triggerHaptic(8); setMonth(i); }}
            className={`min-h-11 px-1 rounded-xl text-[13px] font-bold cursor-pointer transition-colors ${i === month ? 'bg-[#7a2028] text-[#fbf6ec] shadow-sm' : 'text-[#4a3426] hover:bg-[#7a2028]/[0.05]'}`}>
            {name}
          </button>
        ))}
      </div>

      {/* only on a tap: the list never moves by itself */}
      {data && showsToday && (
        <div className="flex justify-center mb-3">
          <button type="button" onClick={() => { triggerHaptic(8); todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-white ring-1 ring-[#7a2028]/30 text-[#7a2028] text-[15px] font-bold cursor-pointer transition hover:bg-[#7a2028]/[0.05] active:scale-[0.97]">
            <CalendarDays className="w-4 h-4" />დღეს, {today.d} {MONTHS[today.m].toLowerCase()}
          </button>
        </div>
      )}

      {!data ? <Waiting error={error} retry={retry} /> : !days.length ? (
        <div className={`${CARD} py-10 px-5 text-center text-[15px] text-[#8a7a6a]`}>ამ თვისთვის მონაცემები არ არის.</div>
      ) : (
        <ol className="space-y-2.5">
          {days.map(d => {
            const isToday = yearNum === today.y && month === today.m && d.d === today.d;
            return (
              <li key={d.d} ref={isToday ? todayRef : undefined} className={`${CARD} p-4 flex gap-3.5 scroll-mt-4 ${isToday ? 'ring-2 ring-[#7a2028]/60' : ''}`}>
                <div className={`shrink-0 self-start w-[76px] rounded-2xl px-1 py-2 text-center ${d.r ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[#2a2017]'}`}>
                  <span className="block text-[22px] font-black leading-none tabular-nums">{d.d}</span>
                  <span className={`block mt-1 text-[12px] font-bold leading-tight break-words ${d.r ? 'text-[#fbf6ec]/80' : 'text-[#8a7a6a]'}`}>{d.w}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    {isToday && <span className="h-6 px-2.5 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[12px] font-black inline-flex items-center">დღეს</span>}
                    {d.f !== null && d.f !== undefined && (
                      <span className={`h-6 px-2.5 rounded-full text-[12px] font-bold inline-flex items-center ${d.f ? 'bg-[#fdf4e3] text-[#9a5b12] ring-1 ring-[#e9c98f]' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'}`}>
                        {d.f ? 'მარხვა' : 'ხსნილი'}
                      </span>
                    )}
                    {typeof d.o === 'number' && <span className="text-[12px] font-semibold text-[#8a7a6a]">ძვ. სტ. {d.o}</span>}
                  </div>
                  {d.s && <p className={`text-[15px] leading-relaxed text-pretty ${d.r ? 'font-bold text-[#7a2028]' : 'text-[#2a2017]'}`}>{d.s}</p>}
                  {d.n.map((t, i) => <p key={i} className="mt-1.5 text-[14px] leading-relaxed text-[#6b5c4d] text-pretty">{t}</p>)}
                  {d.k.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {d.k.map((t, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[13px] leading-snug text-[#4a3426]">
                          <BookOpen className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#a0703c]" />{t}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

// ---------- the switch ----------
export const WignebiView: React.FC<{ item: string }> = ({ item }) => {
  const { openMapItem, handleGoBack } = useNavigation();
  const open = (id: string, replace?: boolean) => openMapItem(id, replace);
  const [, kind, id, n, part] = item.split(':');
  let body: React.ReactNode;
  if (kind === 's' && id) body = <ShelfView id={id} open={open} />;
  else if (kind === 'c' && id && WIGNEBI_COLLECTIONS[id]) {
    const c = WIGNEBI_COLLECTIONS[id];
    if (c.kind === 'calendar') body = <CalendarView c={c} />;
    else if (n && c.items.some(it => it.n === Number(n)))
      body = <ItemView key={`${id}:${n}`} c={c} n={Number(n)} part={part !== undefined ? Number(part) : undefined} open={open} back={handleGoBack} />;
    else body = <CollectionView c={c} open={open} />;
  } else body = <Home open={open} />;
  return <div className="w-full max-w-2xl mx-auto mb-6 px-1">{body}</div>;
};

