import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, Loader2 } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { GrapeBunch, VineLeaf } from '../../components/home/PlateOrnaments';

// სვიმონ მჭედლიძე, „საღმრთო ისტორია" — ძველი აღთქმა: the contents, then one chapter at a time,
// remembering where the reader stopped.

type Run = [string, number?];
interface Chapter { n: number; title: string; paras: Run[][] }
interface Book { author: string; book: string; note: string; part: string; source: string; chapters: Chapter[] }

const LAST_KEY = 'libraryBook:dzveli';

const loadBook = () => import('../../data/library/dzveliAgtqma.json').then(m => m.default as unknown as Book);

const Para: React.FC<{ runs: Run[]; first?: boolean }> = ({ runs, first }) => {
  // the chapter opens with a cinnabar initial, as in old manuscripts (and the home page's quote)
  const [head, ...rest] = runs;
  const initial = first && head && !head[1] ? head[0].charAt(0) : '';
  return (
    <p className={first ? '' : 'mt-3'}>
      {initial && (
        <>
          <span className="float-left font-serif-ge text-[46px] leading-[0.82] mr-2 mt-1.5 text-[#9a3324]" aria-hidden>{initial}</span>
          <span className="sr-only">{initial}</span>
        </>
      )}
      {(initial ? [[head[0].slice(1)] as Run, ...rest] : runs).map(([t, b], i) =>
        b ? <strong key={i} className="font-bold text-[#5e1820]">{t}</strong> : <React.Fragment key={i}>{t}</React.Fragment>,
      )}
    </p>
  );
};

export const BookTab: React.FC = () => {
  const [book, setBook] = useState<Book | null>(null);
  const [failed, setFailed] = useState(false);
  const [chapter, setChapter] = useState<number | null>(null);
  const [last, setLast] = useState<number | null>(() => {
    try { const v = Number(localStorage.getItem(LAST_KEY)); return v > 0 ? v : null; } catch { return null; }
  });
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    loadBook().then(b => alive && setBook(b)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, []);

  const open = (n: number | null) => {
    triggerHaptic(8);
    setChapter(n);
    if (n) {
      setLast(n);
      try { localStorage.setItem(LAST_KEY, String(n)); } catch { /* ignore */ }
    }
    requestAnimationFrame(() => {
      const el = topRef.current;
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' });
    });
  };

  if (failed) {
    return <p className="py-12 text-center text-sm text-[#8a7a6a]">წიგნი ვერ ჩაიტვირთა. სცადეთ თავიდან.</p>;
  }
  if (!book) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#8a7a6a]">
        <Loader2 className="w-4 h-4 animate-spin" /> იტვირთება…
      </div>
    );
  }

  const total = book.chapters.length;
  const ch = chapter ? book.chapters.find(c => c.n === chapter) : null;

  if (ch) {
    const prev = book.chapters.find(c => c.n === ch.n - 1);
    const next = book.chapters.find(c => c.n === ch.n + 1);
    return (
      <div ref={topRef} className="scroll-mt-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => open(null)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/35 text-[13px] font-bold text-[#4a3426] hover:text-[#7a2028] cursor-pointer active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> სარჩევი
          </button>
          <span className="text-[12px] font-bold text-[#8a7a6a] tabular-nums">თავი {ch.n} / {total}</span>
        </div>

        <article className="mt-3 rounded-2xl bg-[#fffdf8] ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_12px_30px_-22px_rgba(42,32,23,0.4)] px-4 py-5 sm:px-8 sm:py-7">
          <p className="text-center text-[11px] font-bold tracking-wide text-[#b08a5a]">{book.part}</p>
          <h2 className="mt-1.5 text-center font-serif-ge text-[19px] sm:text-[23px] leading-snug font-bold text-[#7a2028] text-balance">{ch.title}</h2>
          <div className="mx-auto mt-3 mb-4 flex items-center justify-center gap-2" aria-hidden>
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#d9c6a8]" />
            <GrapeBunch color="#c4262e" className="w-4 h-4 opacity-80" />
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#d9c6a8]" />
          </div>
          <div className="font-serif-ge text-[16px] sm:text-[17px] leading-[1.8] text-[#2a2017] text-pretty">
            {ch.paras.map((p, i) => <Para key={i} runs={p} first={i === 0} />)}
          </div>
        </article>

        {/* previous · next chapter */}
        <nav className="mt-3 grid grid-cols-2 gap-2" aria-label="თავები">
          {prev ? (
            <button type="button" onClick={() => open(prev.n)} className="group min-w-0 text-left rounded-2xl bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/35 px-3 py-2.5 cursor-pointer active:scale-[0.98] transition-all">
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#8a7a6a] group-hover:text-[#7a2028]"><ArrowLeft className="w-3.5 h-3.5" /> წინა თავი</span>
              <span className="mt-1 block font-serif-ge text-[14px] font-semibold text-[#2a2017] line-clamp-2">{prev.title}</span>
            </button>
          ) : <span />}
          {next ? (
            <button type="button" onClick={() => open(next.n)} className="group min-w-0 text-right rounded-2xl bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/35 px-3 py-2.5 cursor-pointer active:scale-[0.98] transition-all">
              <span className="flex items-center justify-end gap-1 text-[11px] font-bold text-[#8a7a6a] group-hover:text-[#7a2028]">შემდეგი თავი <ArrowRight className="w-3.5 h-3.5" /></span>
              <span className="mt-1 block font-serif-ge text-[14px] font-semibold text-[#2a2017] line-clamp-2">{next.title}</span>
            </button>
          ) : (
            <button type="button" onClick={() => open(null)} className="min-w-0 text-right rounded-2xl bg-[#7a2028]/[0.05] ring-1 ring-[#7a2028]/15 px-3 py-2.5 cursor-pointer active:scale-[0.98] transition-all">
              <span className="block text-[11px] font-bold text-[#7a2028]">დასასრული</span>
              <span className="mt-1 block font-serif-ge text-[14px] font-semibold text-[#2a2017]">სარჩევზე დაბრუნება</span>
            </button>
          )}
        </nav>
      </div>
    );
  }

  const lastCh = last ? book.chapters.find(c => c.n === last) : null;
  return (
    <div ref={topRef} className="scroll-mt-4">
      {/* the book */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#7a2028] via-[#6b1a22] to-[#4a1218] text-[#fbf6ec] pl-5 pr-4 py-4 sm:pl-6 sm:pr-5 sm:py-5 shadow-[0_14px_30px_-20px_rgba(74,18,24,0.9)]">
        <VineLeaf color="#fbf6ec" className="absolute -right-5 -top-6 w-28 h-28 opacity-[0.07] rotate-12" />
        <GrapeBunch color="#fbf6ec" className="absolute right-4 bottom-3 w-11 h-11 opacity-[0.12]" />
        <span className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#d2a04a]/70 via-[#d2a04a]/30 to-[#d2a04a]/70" aria-hidden />
        <p className="text-[11px] font-bold tracking-wide text-[#f3d9a8]">{book.author}</p>
        <h2 className="mt-1 font-serif-ge text-[18px] sm:text-[21px] leading-snug font-bold text-balance pr-10">{book.book}</h2>
        <p className="text-[12px] text-[#fbf6ec]/70">({book.note})</p>
        <p className="mt-2.5 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-[#fbf6ec]/12 ring-1 ring-[#fbf6ec]/20 text-[11.5px] font-bold">
          <BookOpen className="w-3.5 h-3.5" /> {book.part} · {total} თავი
        </p>
      </div>

      {lastCh && (
        <button
          type="button"
          onClick={() => open(lastCh.n)}
          className="mt-2.5 w-full flex items-center gap-3 rounded-2xl bg-[#d2a04a]/[0.12] ring-1 ring-[#d2a04a]/35 hover:ring-[#7a2028]/30 px-3.5 py-2.5 text-left cursor-pointer active:scale-[0.99] transition-all"
        >
          <span className="flex-1 min-w-0">
            <span className="block text-[11px] font-bold text-[#8a6a2a]">გააგრძელე კითხვა · თავი {lastCh.n}</span>
            <span className="block font-serif-ge text-[14.5px] font-semibold text-[#2a2017] truncate">{lastCh.title}</span>
          </span>
          <ChevronRight className="w-4 h-4 shrink-0 text-[#7a2028]" />
        </button>
      )}

      {/* contents */}
      <ol className="mt-3 rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_26px_-22px_rgba(42,32,23,0.35)] p-1.5 sm:p-2 md:columns-2 md:gap-2">
        {book.chapters.map(c => (
          <li key={c.n} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => open(c.n)}
              className="group w-full flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-[#7a2028]/[0.04] cursor-pointer active:scale-[0.99] transition-all"
            >
              <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center font-serif-ge text-[12px] font-bold tabular-nums ${
                c.n === last ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#f6ecda] text-[#7a2028]'
              }`}>
                {c.n}
              </span>
              <span className="flex-1 min-w-0 font-serif-ge text-[14px] sm:text-[14.5px] leading-snug text-[#2a2017] group-hover:text-[#7a2028] transition-colors">{c.title}</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[#cdbba3] group-hover:text-[#7a2028] transition-colors" />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
};
