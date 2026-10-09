import React from 'react';
import { ChevronRight } from 'lucide-react';
import { BookHead, BookNav, SectionTitle } from './BookHead';
import { Book, BookTab } from './BookTab';
import { MiniCover } from './Shelf';
import { lastChapter } from './readingPlace';

// "სასულიერო წიგნები": a list of books by the holy fathers (from orthodox.ge). A book ("sasuliero:ati")
// opens in the same reader as the Sacred History, and its chapter ("sasuliero:ati:3") is a step of its own.

interface Entry { id: string; title: string; author: string; chapters: number; load: () => Promise<Book> }

export const BOOKS: Entry[] = [
  {
    id: 'ati', title: 'ათი მცნების განმარტება', author: 'წმიდა ნიკოლოზ სერბი', chapters: 11,
    load: () => import('../../data/library/atiMcneba.json').then(m => m.default as unknown as Book),
  },
];

export const SpiritualBooksTab: React.FC<{ nav: BookNav }> = ({ nav }) => {
  const [id, ...rest] = (nav.part ?? '').split(':');
  const open = BOOKS.find(b => b.id === id);

  if (open) {
    const inner: BookNav = {
      part: rest.length ? rest.join(':') : null,
      go: (part, replace) => nav.go(part ? `${open.id}:${part}` : open.id, replace),
      up: nav.up,
    };
    return (
      <BookTab
        key={open.id}
        nav={inner}
        load={open.load}
        place={open.id}
        cover={<MiniCover id="sasuliero" className="w-11 h-[60px]" />}
        sub={b => <>{b.author} · {b.chapters.length} თავი</>}
      />
    );
  }

  return (
    <div>
      <BookHead
        cover={<MiniCover id="sasuliero" className="w-11 h-[60px]" />}
        title="სასულიერო წიგნები"
        sub="წმიდა მამების სწავლებანი"
      />

      <SectionTitle className="mt-5">წიგნები</SectionTitle>
      <ul className="mt-2.5 rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_26px_-22px_rgba(42,32,23,0.35)] p-1.5 sm:p-2">
        {BOOKS.map(b => {
          const last = lastChapter(b.id);
          return (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => nav.go(b.id)}
                className="group w-full flex items-center gap-3.5 min-h-16 rounded-xl px-2.5 py-2.5 text-left hover:bg-[#6b4a2e]/[0.05] cursor-pointer active:scale-[0.99] transition-all"
              >
                <MiniCover id="sasuliero" className="w-10 h-[54px]" />
                <span className="flex-1 min-w-0">
                  <span className="block font-serif-ge text-[16px] font-bold leading-snug text-[#2a2017] group-hover:text-[#7a2028] transition-colors text-balance">{b.title}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-[#8a7a6a]">
                    {b.author} · {b.chapters} თავი
                    {last && <span className="text-[#9a7438] font-semibold"> · გაჩერდით: თავი {last.n}</span>}
                  </span>
                </span>
                <ChevronRight className="w-5 h-5 shrink-0 text-[#cdbba3] group-hover:text-[#7a2028] group-hover:translate-x-0.5 transition-all" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
