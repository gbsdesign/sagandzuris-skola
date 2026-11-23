import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Check as CheckIcon, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { Button, Check, Hero, Num, RoundButton, Row, Rows, ToggleRow, TopBar } from '../../../components/ui2';
import { useNavigation } from '../../../context';
import { AttachRow, simpleEntry } from '../../../components/attach/AttachButton';
import { PATH_PREFIX } from '../../../utils/pathPrefix';
import { hideNav } from '../../../design/newLook';
import { bookReadId, chapterReadId, useBooksRead } from '../../../hooks/useBooksRead';
import { triggerHaptic } from '../../../utils/haptics';
import type { Book } from '../../library/BookTab';
import type { BookNav } from '../../library/BookHead';
import { lastChapter, saveChapter } from '../../library/readingPlace';
import { AutoRound, Loading, Page, TextSizeButton, useReaderFont } from './parts';

// x-tsigni / x-tavi — a book read in the app, in the new look: the contents (where the reader stopped on a wine card, every
// chapter a row, a read one ticked), then a chapter on its own screen — only its text, the bottom menu steps aside, and at the
// bottom ‹ „წავიკითხე“ ›. The text, the steps („book:12“) and the place kept are the old reader's (pages/library/BookTab).

type Run = [string, number?];

const loadDzveli = () => import('../../../data/library/dzveliAgtqma.json').then(m => m.default as unknown as Book);

const Para: React.FC<{ runs: Run[] }> = ({ runs }) => (
  <p className="wrap-break-word">
    {runs.map(([t, b], i) =>
      b === 1 ? <strong key={i} className="font-bold">{t}</strong>
        : b === 2 ? <em key={i} className="italic">{t}</em>
        : <React.Fragment key={i}>{t}</React.Fragment>,
    )}
  </p>
);

/** the bar under a chapter: ‹ previous · „წავიკითხე“ · next ›; at the book's end › goes back to the contents */
const ChapterBar: React.FC<{ onPrev?: () => void; onNext?: () => void; onEnd: () => void; read: boolean; onRead: () => void }> = ({
  onPrev, onNext, onEnd, read, onRead,
}) => {
  useEffect(() => hideNav(), []);
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 safe-x">
      <div className="mx-auto flex max-w-2xl items-center gap-2.5 bg-linear-to-t from-page via-page/95 to-transparent px-4 pt-6 pb-[max(16px,env(safe-area-inset-bottom))]">
        <RoundButton label="წინა თავი" size={48} disabled={!onPrev} onClick={onPrev}>
          <ChevronLeft aria-hidden="true" strokeWidth={1.75} />
        </RoundButton>
        <Button
          full
          kind={read ? 'ghost' : 'primary'}
          aria-pressed={read}
          icon={<CheckIcon aria-hidden="true" className={read ? 'text-leaf' : undefined} strokeWidth={2.4} />}
          onClick={onRead}
          className="flex-1"
        >
          {read ? 'წაკითხულია' : 'წავიკითხე'}
        </Button>
        {onNext ? (
          <RoundButton label="შემდეგი თავი" size={48} onClick={onNext}>
            <ChevronRight aria-hidden="true" strokeWidth={1.75} />
          </RoundButton>
        ) : (
          <RoundButton label="სარჩევზე დაბრუნება" size={48} onClick={onEnd}>
            <List aria-hidden="true" strokeWidth={1.75} />
          </RoundButton>
        )}
      </div>
    </div>
  );
};

export const BookV2: React.FC<{
  nav: BookNav;
  load?: () => Promise<Book>;
  /** where the reader stopped is kept under this name (BookTab's `place`) */
  place?: string;
  /** the book's short name for the bar (the file's own is long: „საღმრთო ისტორია ძველი და ახალი აღთქმისა“) */
  title?: string;
  /** the line under the book's name */
  sub?: (book: Book) => string;
}> = ({ nav, load = loadDzveli, place = 'dzveli', title, sub }) => {
  const [book, setBook] = useState<Book | null>(null);
  const [failed, setFailed] = useState(false);
  const chapter = Number(nav.part) || null;
  // the library's step of this book's contents: what a path's pin opens again
  const { mapItem } = useNavigation();
  const [last, setLast] = useState<number | null>(() => lastChapter(place)?.n ?? null);
  const [font, setFont] = useReaderFont('sg-book-font');
  const textRef = useRef<HTMLDivElement>(null);
  const read = useBooksRead();

  useEffect(() => {
    let alive = true;
    load().then(b => alive && setBook(b)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [load]);

  const ch = book && chapter ? book.chapters.find(c => c.n === chapter) ?? null : null;
  // the chapter on screen is where the reader stopped
  useEffect(() => {
    if (!ch || !book) return;
    setLast(ch.n);
    saveChapter(ch.n, ch.title, place, book.chapters.length);
  }, [ch, book, place]);

  if (!book) {
    return (
      <Page>
        <TopBar title={chapter ? `თავი ${chapter}` : 'წიგნი'} onBack={nav.up} />
        <Loading failed={failed} />
      </Page>
    );
  }

  const total = book.chapters.length;

  if (ch) {
    const prev = book.chapters.find(c => c.n === ch.n - 1);
    const next = book.chapters.find(c => c.n === ch.n + 1);
    // the next / previous chapter turns the page in place: „უკან“ still leads to the contents
    const turn = (n: number) => { triggerHaptic(8); nav.go(String(n), true); };
    const id = chapterReadId(place, ch.n);
    const done = read.isRead(id);
    return (
      <Page>
        <TopBar
          title={`თავი ${ch.n} / ${total}`}
          onBack={nav.up}
          right={<><AutoRound source={() => textRef.current} zoom={font / 100} /><TextSizeButton font={font} onFont={setFont} /></>}
        />
        <article className="px-1.5 pt-1.5">
          <div className="text-meta font-semibold text-wine">{title ?? book.book}</div>
          <h2 className="mt-1 mb-3.5 font-serif-ge text-title leading-snug font-bold text-ink wrap-break-word">{ch.title}</h2>
          <div ref={textRef} className="flex flex-col gap-3.5 font-serif-ge leading-[1.75] text-ink" style={{ fontSize: `${(17 * font) / 100}px` }}>
            {ch.paras.map((p, i) => <Para key={i} runs={p as Run[]} />)}
          </div>
        </article>
        {/* room for the bar at the bottom */}
        <div aria-hidden="true" className="h-20 shrink-0" />
        <ChapterBar
          onPrev={prev ? () => turn(prev.n) : undefined}
          onNext={next ? () => turn(next.n) : undefined}
          onEnd={nav.up}
          read={done}
          onRead={() => { triggerHaptic(done ? 8 : 18); read.toggle(id); }}
        />
      </Page>
    );
  }

  const lastCh = last ? book.chapters.find(c => c.n === last) : null;
  const first = book.chapters[0];
  const resume = lastCh ?? first;
  const wholeId = bookReadId(place);
  return (
    <Page>
      <TopBar title={title ?? book.book} sub={sub ? sub(book) : `${book.author} · ${book.part} · ${total} თავი`} onBack={nav.up} />

      {resume && (
        <Hero
          kicker={lastCh ? `გააგრძელე · თავი ${lastCh.n} / ${total}` : `დაიწყე კითხვა · ${total} თავი`}
          title={resume.title}
          action={{ label: 'კითხვა', icon: <BookOpen aria-hidden="true" />, onClick: () => nav.go(String(resume.n)) }}
        />
      )}

      {/* the contents: a read chapter ticked, the one the reader stopped at in wine */}
      <Rows aria-label="სარჩევი">
        {book.chapters.map(c => {
          const done = read.isRead(chapterReadId(place, c.n));
          return (
            <Row
              key={c.n}
              lead={done ? <Check on /> : <Num n={c.n} on={c.n === last} />}
              title={c.title}
              wrap
              aria-label={`თავი ${c.n}: ${c.title}${done ? ' — წაკითხულია' : ''}`}
              onClick={() => nav.go(String(c.n))}
            />
          );
        })}
      </Rows>

      {/* the whole book read — counted in „საგანძურის გზა“'s library ring */}
      <Rows>
        <ToggleRow
          title="მთელი წიგნი წავიკითხე"
          sub="ითვლება „საგანძურის გზის“ ბიბლიოთეკის წრეში"
          on={read.isRead(wholeId)}
          onChange={() => { triggerHaptic(18); read.toggle(wholeId); }}
          wrap
        />
        {mapItem && <AttachRow entry={simpleEntry(`${PATH_PREFIX.wigni}${mapItem}`, title ?? book.book, 'წიგნი')} />}
      </Rows>
    </Page>
  );
};
