import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronRight, Loader2 } from 'lucide-react';
import { GrapeBunch } from '../../components/home/PlateOrnaments';
import { BookHead, BookNav, SectionTitle, ToContents } from './BookHead';
import { MiniCover } from './Shelf';
import { lastChapter, saveChapter } from './readingPlace';

// სვიმონ მჭედლიძე, „საღმრთო ისტორია" — ძველი აღთქმა: the contents, then one chapter at a time
// ("book:12", a step of its own), remembering where the reader stopped.

type Run = [string, number?];
interface Chapter { n: number; title: string; paras: Run[][] }
interface Book { author: string; book: string; note: string; part: string; source: string; chapters: Chapter[] }

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

export const BookTab: React.FC<{ nav: BookNav }> = ({ nav }) => {
  const [book, setBook] = useState<Book | null>(null);
  const [failed, setFailed] = useState(false);
  const chapter = Number(nav.part) || null;
  const [last, setLast] = useState<number | null>(() => lastChapter()?.n ?? null);

  useEffect(() => {
    let alive = true;
    loadBook().then(b => alive && setBook(b)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, []);

  const ch = book && chapter ? book.chapters.find(c => c.n === chapter) ?? null : null;
  // the chapter on screen is where the reader stopped
  useEffect(() => {
    if (!ch) return;
    setLast(ch.n);
    saveChapter(ch.n, ch.title);
  }, [ch]);

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

  if (ch) {
    const prev = book.chapters.find(c => c.n === ch.n - 1);
    const next = book.chapters.find(c => c.n === ch.n + 1);
    // the next / previous chapter turns the page in place: "back" still leads to the contents
    const turn = (n: number) => nav.go(String(n), true);
    return (
      <div>
        <div className="flex items-center justify-between gap-3">
          <ToContents onClick={nav.up} />
          <span className="text-[12.5px] font-bold text-[#8a7a6a] tabular-nums">თავი {ch.n} / {total}</span>
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
            <button type="button" onClick={() => turn(prev.n)} className="group min-w-0 text-left rounded-2xl bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/35 px-3.5 py-3 cursor-pointer active:scale-[0.98] transition-all">
              <span className="flex items-center gap-1 text-[11.5px] font-bold text-[#8a7a6a] group-hover:text-[#7a2028]"><ArrowLeft className="w-3.5 h-3.5" /> წინა თავი</span>
              <span className="mt-1 block font-serif-ge text-[14px] font-semibold text-[#2a2017] line-clamp-2">{prev.title}</span>
            </button>
          ) : <span />}
          {next ? (
            <button type="button" onClick={() => turn(next.n)} className="group min-w-0 text-right rounded-2xl bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/35 px-3.5 py-3 cursor-pointer active:scale-[0.98] transition-all">
              <span className="flex items-center justify-end gap-1 text-[11.5px] font-bold text-[#8a7a6a] group-hover:text-[#7a2028]">შემდეგი თავი <ArrowRight className="w-3.5 h-3.5" /></span>
              <span className="mt-1 block font-serif-ge text-[14px] font-semibold text-[#2a2017] line-clamp-2">{next.title}</span>
            </button>
          ) : (
            <button type="button" onClick={nav.up} className="min-w-0 text-right rounded-2xl bg-[#7a2028]/[0.05] ring-1 ring-[#7a2028]/15 px-3.5 py-3 cursor-pointer active:scale-[0.98] transition-all">
              <span className="block text-[11.5px] font-bold text-[#7a2028]">დასასრული</span>
              <span className="mt-1 block font-serif-ge text-[14px] font-semibold text-[#2a2017]">სარჩევზე დაბრუნება</span>
            </button>
          )}
        </nav>
      </div>
    );
  }

  const lastCh = last ? book.chapters.find(c => c.n === last) : null;
  return (
    <div>
      <BookHead
        cover={<MiniCover id="book" className="w-11 h-[60px]" />}
        title={book.book}
        sub={<>{book.author} · {book.part} · {total} თავი</>}
      />

      {lastCh && (
        <button
          type="button"
          onClick={() => nav.go(String(lastCh.n))}
          className="group mt-4 w-full flex items-center gap-3 min-h-14 rounded-2xl bg-[#d2a04a]/[0.10] ring-1 ring-[#d2a04a]/35 hover:ring-[#7a2028]/30 px-4 py-2.5 text-left cursor-pointer active:scale-[0.99] transition-all"
        >
          <span className="flex-1 min-w-0">
            <span className="block text-[12px] font-bold text-[#8a6a2a]">გააგრძელე კითხვა · თავი {lastCh.n}</span>
            <span className="block font-serif-ge text-[15px] font-semibold text-[#2a2017] truncate">{lastCh.title}</span>
          </span>
          <ChevronRight className="w-5 h-5 shrink-0 text-[#7a2028] group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* contents */}
      <SectionTitle className="mt-5">სარჩევი</SectionTitle>
      <ol className="mt-2.5 rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_26px_-22px_rgba(42,32,23,0.35)] p-1.5 sm:p-2 md:columns-2 md:gap-2">
        {book.chapters.map(c => (
          <li key={c.n} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => nav.go(String(c.n))}
              className="group w-full flex items-center gap-3 min-h-12 rounded-xl px-2 py-1.5 text-left hover:bg-[#7a2028]/[0.04] cursor-pointer active:scale-[0.99] transition-all"
            >
              <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center font-serif-ge text-[12px] font-bold tabular-nums ${
                c.n === last ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#f6ecda] text-[#7a2028]'
              }`}>
                {c.n}
              </span>
              <span className="flex-1 min-w-0 font-serif-ge text-[14.5px] leading-snug text-[#2a2017] group-hover:text-[#7a2028] transition-colors">{c.title}</span>
              <ChevronRight className="w-4 h-4 shrink-0 text-[#cdbba3] group-hover:text-[#7a2028] transition-colors" />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
};
