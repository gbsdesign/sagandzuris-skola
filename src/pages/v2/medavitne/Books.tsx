import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Library, List, ScanText } from 'lucide-react';
import { Button, Card, Chips, Dot, Helper, Hero, Note, Num, Pill, Press, RoundButton, Row, Rows, SectionLabel, TopBar, cx } from '../../../components/ui2';
import { useNavigation } from '../../../context';
import { WIGNEBI_COLLECTIONS, WIGNEBI_SHELVES, type WignebiCollection } from '../../../data/wignebi';
import { EXTRA_BOOKS, EXTRA_GROUPS } from '../../../data/extraBooks';
import { triggerHaptic } from '../../../utils/haptics';
import {
  EXTRA, MONTHS, SHELF_ICONS, countWord, kickerOf, tbilisiToday, useFile, type BookFile, type CalFile,
} from '../../medavitneoba/Wignebi';
import { AutoRound, TextSizeButton, useReaderFont } from '../library/parts';
import { BottomBar, Page, Waiting } from './parts';

// „წიგნები მედავითნისთვის“ in the new look (boards x-medavitne, x-medavitne-tsigni): the shelves as one card of rows, a book's
// list with „გააგრძელე“ on top (where the reader stopped is kept on the device) and its numbered items as a grid, the text on
// a screen of its own like a library chapter (‹ ›, the size, ⏬). The places are the old page's `mapItem` („w…“, Wignebi.tsx).

type Open = (id: string, replace?: boolean) => void;

// ---------- where the reader stopped, a book at a time (this device) ----------
const LAST_KEY = 'sg-wignebi-last';
const readLast = (): Record<string, string> => {
  try { const v = JSON.parse(localStorage.getItem(LAST_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
};
const saveLast = (coll: string, place: string) => {
  try { localStorage.setItem(LAST_KEY, JSON.stringify({ ...readLast(), [coll]: place })); } catch { /* private window */ }
};

/** the shelves' rows (the reader's front page shows them under the course) */
export const ShelfRows: React.FC<{ open: Open }> = ({ open }) => {
  const go = (id: string, colls: string[]) => open(colls.length === 1 ? `w:c:${colls[0]}` : `w:s:${id}`);
  return (
    <>
      <Rows aria-label="წიგნები მედავითნისთვის">
        {WIGNEBI_SHELVES.map(s => {
          const Icon = SHELF_ICONS[s.id] ?? BookOpen;
          return <Row key={s.id} lead={<Dot icon={<Icon />} />} title={s.title.replace('­', '')} sub={s.sub} onClick={() => go(s.id, s.collections)} />;
        })}
      </Rows>
      <Rows>
        <Row lead={<Dot icon={<Library />} color="gold" />} title={EXTRA.title}
          sub={`წმინდანთა განგებები, დიდი მარხვა, კურთხევები · ${EXTRA_BOOKS.length} წიგნი`} onClick={() => open(`w:c:${EXTRA.id}`)} />
      </Rows>
      <Note>ტექსტები: „საღვთისმსახურო წიგნები“, ღვთისმშობლის მიძინების სახელობის მამათა მონასტერი.</Note>
    </>
  );
};

const ScanNote: React.FC<{ pics?: boolean }> = ({ pics }) => (
  <Helper icon={<ScanText className="text-gold-ink" />}>
    {pics ? 'ძველი ნაბეჭდია, სკანერი ვერ კითხულობს — ამიტომ გვერდები სურათებადაა.' : 'ტექსტი სკანერიდანაა, შეიძლება შეცდომა იყოს.'}
  </Helper>
);

// the Bible: four books
const ShelfView: React.FC<{ id: string; open: Open; back: () => void }> = ({ id, open, back }) => {
  const shelf = WIGNEBI_SHELVES.find(s => s.id === id);
  if (!shelf) return null;
  return (
    <Page>
      <TopBar title={shelf.title} sub="საღვთისმსახურო წიგნები" onBack={back} />
      <Rows>
        {shelf.collections.map((cid, i) => {
          const c = WIGNEBI_COLLECTIONS[cid];
          return <Row key={cid} lead={<Num n={i + 1} />} title={c.title} sub={`${c.items.length} წიგნი`} onClick={() => open(`w:c:${cid}`)} />;
        })}
      </Rows>
    </Page>
  );
};

// items named „კანონი 7“, „ხმა 3“: a grid of their numbers
const NUMBERED = /^(.*\S)\s+(\d+)$/;
const numberedRun = (c: WignebiCollection) => {
  const m = c.items.map(it => NUMBERED.exec(it.t));
  const prefix = m[0]?.[1];
  const run = prefix ? c.items.filter((_, i) => m[i]?.[1] === prefix) : [];
  return run.length >= 6 ? { prefix: prefix!, run } : null;
};
const GRID_NAMES: Record<string, string> = { 'კანონი': 'კანონები', 'ხმა': 'ხმები' };

const NumberGrid: React.FC<{ label: string; items: { key: string | number; n: React.ReactNode; on?: boolean; onClick: () => void; aria: string }[] }> = ({ label, items }) => (
  <Card pad="sm" className="flex flex-col gap-2.5">
    <span className="px-1 text-meta font-semibold text-mut">{label}</span>
    <div className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-2">
      {items.map(it => (
        <Press key={it.key} onClick={it.onClick} aria-label={it.aria}
          className={cx(
            'flex h-13 cursor-pointer items-center justify-center rounded-field text-lead font-bold tabular-nums transition active:scale-95',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60',
            it.on ? 'bg-wine text-white' : 'bg-page text-ink',
          )}>
          {it.n}
        </Press>
      ))}
    </div>
  </Card>
);

/** „გააგრძელე“: the place kept for this book, else its first item */
const ResumeHero: React.FC<{ c: WignebiCollection; open: Open }> = ({ c, open }) => {
  const last = readLast()[c.id];
  const [n, part] = (last ?? '').split(':').map(Number);
  const item = c.items.find(it => it.n === n);
  if (!item) {
    const first = c.items[0];
    if (!first) return null;
    return <Hero kicker="დაიწყე კითხვა" title={first.t} action={{ label: 'კითხვა', icon: <BookOpen aria-hidden="true" />, onClick: () => open(`w:c:${c.id}:${first.n}`) }} />;
  }
  return (
    <Hero
      kicker="გააგრძელე"
      title={item.t}
      sub={Number.isFinite(part) && item.c > 1 ? `ნაწილი ${part + 1} / ${item.c}` : undefined}
      action={{ label: 'კითხვა', icon: <BookOpen aria-hidden="true" />, onClick: () => open(last!.includes(':') ? `w:c:${c.id}:${last}` : `w:c:${c.id}:${n}`) }}
    />
  );
};

// a book's list (Old Testament books, the hours of the ჟამნი, the eight tones, the twenty kanons…)
const CollectionView: React.FC<{ c: WignebiCollection; open: Open; back: () => void }> = ({ c, open, back }) => {
  const isBible = ['akhali', 'dzveli', 'trapezi', 'samociqulo'].includes(c.id);
  const grid = numberedRun(c);
  const rest = grid ? c.items.filter(it => !grid.run.includes(it)) : c.items;
  const lastN = Number((readLast()[c.id] ?? '').split(':')[0]);
  return (
    <Page>
      <TopBar title={c.title} sub={isBible ? 'ბიბლია' : undefined} onBack={back} />
      <ResumeHero c={c} open={open} />
      {grid && (
        <NumberGrid
          label={GRID_NAMES[grid.prefix] ?? grid.prefix}
          items={grid.run.map(it => ({
            key: it.n, n: NUMBERED.exec(it.t)?.[2] ?? it.n, on: it.n === lastN, aria: it.t, onClick: () => open(`w:c:${c.id}:${it.n}`),
          }))}
        />
      )}
      {rest.length > 0 && (
        <Rows>
          {rest.map((it, i) => (
            <Row key={it.n} lead={grid ? <Dot icon={<BookOpen />} /> : <Num n={i + 1} on={it.n === lastN} />} title={it.t}
              sub={countWord(c, it.c) || undefined} wrap onClick={() => open(`w:c:${c.id}:${it.n}`)} />
          ))}
        </Rows>
      )}
    </Page>
  );
};

// „დამატებითი წიგნები“: the books in their groups
const ExtraList: React.FC<{ open: Open; back: () => void }> = ({ open, back }) => (
  <Page>
    <TopBar title={EXTRA.title} sub="წიგნები, რომლებიც ზედა თაროებზე არ არის" onBack={back} />
    {EXTRA_GROUPS.map(g => {
      const books = EXTRA_BOOKS.filter(b => b.g === g.id);
      if (!books.length) return null;
      // a whole group read by a scanner says so once, not on every row
      const allScan = books.length > 3 && books.every(b => b.scan);
      return (
        <div key={g.id} className="flex flex-col gap-2">
          <SectionLabel label={g.title} />
          {g.note && <Note className="-mt-1">{g.note}</Note>}
          {allScan && <ScanNote />}
          <Rows>
            {books.map((b, i) => (
              <Row key={b.n} lead={<Num n={i + 1} />} wrap onClick={() => open(`w:c:${EXTRA.id}:${b.n}`)}
                title={b.t}
                sub={`${b.sub}${b.scan && !allScan ? ' · სკანერიდან' : ''}`} />
            ))}
          </Rows>
        </div>
      );
    })}
  </Page>
);

// a book kept as page pictures
const PagesView: React.FC<{ c: WignebiCollection; n: number; book: BookFile; back: () => void }> = ({ c, n, book, back }) => (
  <Page>
    <TopBar title={book.t} sub={kickerOf(c, n)} onBack={back} />
    <ScanNote pics />
    {book.pages!.map((src, i) => (
      <Card key={src} pad="none" as="div">
        <img src={src} alt={`${book.t}, გვერდი ${i + 1}`} loading="lazy" decoding="async" className="block h-auto w-full" />
        <p className="py-1.5 text-center text-cap font-bold text-mut tabular-nums">{i + 1}</p>
      </Card>
    ))}
  </Page>
);

// an item with several parts: chapter numbers for the Bible, rows for everything else
const PartsView: React.FC<{ c: WignebiCollection; n: number; book: BookFile; open: Open; back: () => void }> = ({ c, n, book, open, back }) => {
  const last = (readLast()[c.id] ?? '').split(':');
  const lastPart = last[0] === String(n) && last[1] !== undefined ? Number(last[1]) : -1;
  return (
    <Page>
      <TopBar title={book.t} sub={kickerOf(c, n)} onBack={back} />
      {book.scan && <ScanNote />}
      {book.num ? (
        <NumberGrid
          label="აირჩიე თავი"
          items={book.c.map((p, i) => ({ key: i, n: p.l, on: i === lastPart, aria: `თავი ${p.l}`, onClick: () => open(`w:c:${c.id}:${n}:${i}`) }))}
        />
      ) : (
        <Rows>
          {book.c.map((p, i) => <Row key={i} lead={<Num n={i + 1} on={i === lastPart} />} title={p.l} wrap onClick={() => open(`w:c:${c.id}:${n}:${i}`)} />)}
        </Rows>
      )}
    </Page>
  );
};

// the text: headings as red rubrics, the Bible's verses numbered; ‹ › under it
const Reader: React.FC<{ c: WignebiCollection; n: number; book: BookFile; part: number; open: Open; back: () => void }> = ({ c, n, book, part, open, back }) => {
  const [font, setFont] = useReaderFont('sg-wignebi-font');
  const textRef = useRef<HTMLElement>(null);
  const p = book.c[part];
  const many = book.c.length > 1;
  useEffect(() => { if (p) saveLast(c.id, many ? `${n}:${part}` : String(n)); }, [c.id, n, part, many, p]);
  if (!p) return null;
  const go = (id: string) => { triggerHaptic(10); open(id, true); window.scrollTo({ top: 0 }); };
  // a one-part item of a list (a kanon, an hour) goes on to the list's next item
  const at = c.items.findIndex(it => it.n === n);
  const nextItem = !many && c.id !== EXTRA.id ? c.items[at + 1] : undefined;
  const prevItem = !many && c.id !== EXTRA.id ? c.items[at - 1] : undefined;
  const prev = part > 0 ? `w:c:${c.id}:${n}:${part - 1}` : prevItem ? `w:c:${c.id}:${prevItem.n}` : null;
  const next = part < book.c.length - 1 ? `w:c:${c.id}:${n}:${part + 1}` : nextItem ? `w:c:${c.id}:${nextItem.n}` : null;
  const partTitle = book.num ? `თავი ${p.l}` : many ? p.l : '';
  return (
    <Page>
      <TopBar
        title={book.t}
        sub={partTitle && !(!book.num && p.s[0]?.[0] === p.l) ? partTitle : kickerOf(c, n)}
        onBack={back}
        right={<><AutoRound source={() => textRef.current} zoom={font / 100} /><TextSizeButton font={font} onFont={setFont} /></>}
      />
      {book.scan && <ScanNote />}
      <article ref={textRef} className="flex flex-col gap-[1.2em] px-1.5 pt-1" style={{ fontSize: `${(17 * font) / 100}px` }}>
        {p.s.map(([h, paras], si) => (
          <section key={si}>
            {h && <h3 className="mb-[0.5em] font-serif-ge leading-snug font-bold text-wine" style={{ fontSize: '0.92em' }}>{h}</h3>}
            {paras.map((t, pi) => {
              const numbered = book.num && !/^\d+[.\s]/.test(t);
              return (
                <p key={pi} className="mb-[0.55em] font-serif-ge leading-[1.75] text-ink wrap-break-word last:mb-0">
                  {numbered && <sup className="mr-1 font-sans font-bold text-gold-ink tabular-nums" style={{ fontSize: '0.62em' }}>{pi + 1}</sup>}
                  {t}
                </p>
              );
            })}
          </section>
        ))}
      </article>
      <BottomBar>
        <RoundButton label="წინა" size={48} disabled={!prev} onClick={() => prev && go(prev)}><ChevronLeft aria-hidden="true" strokeWidth={1.75} /></RoundButton>
        <Button kind="ghost" full icon={<List aria-hidden="true" />} onClick={back} className="flex-1">სია</Button>
        <RoundButton label="შემდეგი" size={48} disabled={!next} onClick={() => next && go(next)}><ChevronRight aria-hidden="true" strokeWidth={1.75} /></RoundButton>
      </BottomBar>
    </Page>
  );
};

const ItemView: React.FC<{ c: WignebiCollection; n: number; part?: number; open: Open; back: () => void }> = ({ c, n, part, open, back }) => {
  const { data, error, retry } = useFile<BookFile>(c.id, n);
  if (!data) return (
    <Page>
      <TopBar title={c.items.find(it => it.n === n)?.t ?? c.title} onBack={back} />
      <Waiting failed={error} kind="text" />
      {error && <Button kind="soft" onClick={retry}>თავიდან ცდა</Button>}
    </Page>
  );
  if (data.pages?.length) return <PagesView c={c} n={n} book={data} back={back} />;
  if (part === undefined && data.c.length > 1) return <PartsView c={c} n={n} book={data} open={open} back={back} />;
  return <Reader c={c} n={n} book={data} part={part ?? 0} open={open} back={back} />;
};

// ---------- the church calendar ----------
const CalendarView: React.FC<{ c: WignebiCollection; back: () => void }> = ({ c, back }) => {
  const today = tbilisiToday();
  const years = c.items.map(it => ({ n: it.n, y: Number(it.t) }));
  const [year, setYear] = useState(() => (years.find(x => x.y === today.y) ?? years[years.length - 1]).n);
  const yearNum = years.find(x => x.n === year)?.y ?? today.y;
  const [month, setMonth] = useState(() => (yearNum === today.y ? today.m : 0));
  const { data, error } = useFile<CalFile>(c.id, year);
  const days = useMemo(() => data?.m[month] ?? [], [data, month]);
  const todayRef = useRef<HTMLDivElement>(null);
  const showsToday = yearNum === today.y && month === today.m && days.some(x => x.d === today.d);
  return (
    <Page>
      <TopBar title={c.title} sub="საღვთისმსახურო წიგნები" onBack={back} />
      <Chips label="წელი" items={years.map(x => ({ id: String(x.n), label: String(x.y) }))} value={String(year)}
        onChange={v => { const x = years.find(y => String(y.n) === v)!; triggerHaptic(8); setYear(x.n); setMonth(x.y === today.y ? today.m : 0); }} />
      <div role="group" aria-label="თვე" className="grid grid-cols-3 gap-1 rounded-tile bg-surf p-1 min-[480px]:grid-cols-4">
        {MONTHS.map((name, i) => (
          <Press key={name} aria-pressed={i === month} onClick={() => { triggerHaptic(8); setMonth(i); }}
            className={cx('min-h-tap cursor-pointer rounded-field px-1 text-meta font-bold transition-colors',
              i === month ? 'bg-wine text-white' : 'text-ink active:bg-soft')}>
            {name}
          </Press>
        ))}
      </div>
      {/* only on a tap: the list never moves by itself */}
      {data && showsToday && (
        <Button kind="ghost" size="md" icon={<CalendarDays aria-hidden="true" />} className="self-center"
          onClick={() => { triggerHaptic(8); todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
          დღეს, {today.d} {MONTHS[today.m].toLowerCase()}
        </Button>
      )}
      {!data ? <Waiting failed={error} kind="list" /> : !days.length ? <Note className="py-8 text-center">ამ თვისთვის მონაცემები არ არის.</Note> : (
        days.map(x => {
          const isToday = yearNum === today.y && month === today.m && x.d === today.d;
          return (
            <div key={x.d} ref={isToday ? todayRef : undefined} className={cx('flex shrink-0 scroll-mt-4 gap-3 rounded-card bg-surf p-3', isToday && 'ring-2 ring-wine/60')}>
              <div className={cx('flex w-[64px] shrink-0 flex-col items-center self-start rounded-field px-1 py-2 text-center', x.r ? 'bg-wine text-white' : 'bg-page')}>
                <span className="text-title leading-none font-bold tabular-nums">{x.d}</span>
                <span className={cx('mt-1 text-cap leading-tight font-semibold wrap-break-word', x.r ? 'text-white/85' : 'text-mut')}>{x.w}</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {isToday && <Pill on className="h-6">დღეს</Pill>}
                  {x.f !== null && x.f !== undefined && (
                    <Pill className={cx('h-6', x.f ? 'bg-gold-tint text-gold-ink' : 'bg-leaf-tint text-leaf-ink')}>{x.f ? 'მარხვა' : 'ხსნილი'}</Pill>
                  )}
                  {typeof x.o === 'number' && <span className="text-cap font-semibold text-mut">ძვ. სტ. {x.o}</span>}
                </div>
                {x.s && <p className={cx('text-body leading-relaxed wrap-break-word', x.r && 'font-bold text-wine')}>{x.s}</p>}
                {x.n.map((t, i) => <p key={i} className="text-meta leading-relaxed text-mut wrap-break-word">{t}</p>)}
                {x.k.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {x.k.map((t, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-meta leading-snug text-ink">
                        <BookOpen aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-gold-ink" />{t}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })
      )}
    </Page>
  );
};

/** the books' places („w:s:…“, „w:c:…[:n[:part]]“) in the new look */
export const BooksV2: React.FC<{ item: string }> = ({ item }) => {
  const { openMapItem, handleGoBack } = useNavigation();
  const open: Open = (id, replace) => openMapItem(id, replace);
  const [, kind, id, n, part] = item.split(':');
  const partNum = part !== undefined ? Number(part) : undefined;
  if (kind === 's' && id) return <ShelfView id={id} open={open} back={handleGoBack} />;
  if (kind === 'c' && id === EXTRA.id) {
    if (n && EXTRA.items.some(it => it.n === Number(n)))
      return <ItemView key={`${id}:${n}`} c={EXTRA} n={Number(n)} part={partNum} open={open} back={handleGoBack} />;
    return <ExtraList open={open} back={handleGoBack} />;
  }
  if (kind === 'c' && id && WIGNEBI_COLLECTIONS[id]) {
    const c = WIGNEBI_COLLECTIONS[id];
    if (c.kind === 'calendar') return <CalendarView c={c} back={handleGoBack} />;
    if (n && c.items.some(it => it.n === Number(n)))
      return <ItemView key={`${id}:${n}`} c={c} n={Number(n)} part={partNum} open={open} back={handleGoBack} />;
    return <CollectionView c={c} open={open} back={handleGoBack} />;
  }
  return null;
};
