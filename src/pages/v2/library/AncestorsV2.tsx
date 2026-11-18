import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, List, Music, Play, ScrollText, Shield } from 'lucide-react';
import { useNavigation } from '../../../context';
import { ANCESTORS, type Ancestor, type BioBlock } from '../../../data/ancestorsBios';
import { useOpenRequest } from '../../../utils/searchOpen';
import { Avatar, Dot, Note, Row, Rows, SectionLabel, Sheet, Small, TopBar, cx } from '../../../components/ui2';
import { triggerHaptic } from '../../../utils/haptics';
import { PinRound } from '../gza/parts';
import { AutoRound, Page, SearchPill, TextSizeButton, useReaderFont } from './parts';

// x-tsinaprebi / x-tsinapari — „გაიცანი წინაპრები“ in the new look: the three big portrait cards became a list with small
// photos (more names on a screen), the groups fold open in place; a person's page shows their photo, the contents folded into
// one line, and the text starts at once. The texts, the film and the links are the old page's (pages/AncestorsPage).

const PORTRAITS = [
  { src: '/home/karbelashvili.jpg', name: 'წმ. ძმები კარბელაშვილები', bio: 7 },
  { src: '/home/koridze.jpg', name: 'წმ. ფილიმონ ქორიძე', bio: 8 },
  { src: '/home/kereselidze.jpg', name: 'წმ. ექვთიმე კერესელიძე', bio: 9 },
];
const GROUPS: { key: Ancestor['group']; title: string; one: string; subtitle: string; Icon: typeof Music }[] = [
  { key: 'hymnographers', title: 'ძველი ჰიმნოგრაფები', one: 'ძველი ჰიმნოგრაფი', subtitle: 'VIII–XIII საუკუნეები', Icon: ScrollText },
  { key: 'keepers', title: 'გალობის მცველები', one: 'გალობის მცველი', subtitle: 'მგალობლები, ლოტბრები, გადამრჩენლები', Icon: Shield },
];
const LINKS = [
  { href: 'https://www.galobani.ge/library/istoria', label: 'ისტორია ქართული საეკლესიო საგალობლების ნოტებზე გადაღებისა' },
];
const SOURCE_URL = 'https://www.galobani.ge/library/biografia';
const VIDEO_ID = 'F-7QoI2ULlM';
const FONT_KEY = 'ancestors-reader-font';

// „Name (Surname)“ → the surname as a quieter second line; the letter on a photo-less round skips „წმიდა“ / „არქიმანდრიტი“
const splitName = (name: string) => {
  const m = name.match(/^(.*?)\s*\((.+)\)$/);
  return m ? [m[1], m[2]] : [name, ''];
};
const letterName = (name: string) => name.replace(/^(წმიდა|წმ\.|არქიმანდრიტი)\s+/, '');

const Person: React.FC<{ a: Ancestor; onOpen: (id: number) => void }> = ({ a, onOpen }) => {
  const [main, sur] = splitName(a.name);
  return (
    <Row
      lead={<Avatar name={letterName(a.name)} photo={a.image} className="object-top" />}
      title={main}
      sub={[sur, a.years].filter(Boolean).join(' · ') || undefined}
      wrap
      onClick={() => { triggerHaptic(10); onOpen(a.id); }}
    />
  );
};

// the documentary: its still in a row, the player in a window
const Film: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Rows>
        <Row
          lead={
            <span aria-hidden="true" className="relative flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-field bg-ink text-white">
              <img src={`https://i.ytimg.com/vi/${VIDEO_ID}/mqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-90" />
              <span className="relative flex size-8 items-center justify-center rounded-full bg-ink/55"><Play className="size-4 fill-current" strokeWidth={1.5} /></span>
            </span>
          }
          title="გალობის რაინდები"
          sub="დოკუმენტური ფილმი · odishitv"
          onClick={() => { triggerHaptic(10); setOpen(true); }}
        />
      </Rows>
      <Sheet open={open} title="გალობის რაინდები" onClose={() => setOpen(false)}>
        <div className="aspect-video w-full shrink-0 overflow-hidden rounded-tile bg-ink">
          {open && (
            <iframe
              className="size-full"
              src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?start=2&autoplay=1`}
              title="გალობის რაინდები"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          )}
        </div>
        <Note>დოკუმენტური ფილმი · odishitv</Note>
      </Sheet>
    </>
  );
};

const BioBody: React.FC<{ blocks: BioBlock[] }> = ({ blocks }) => {
  let headingNo = 0;
  return (
    <>
      {blocks.map((b, i) => {
        if (typeof b === 'string') return <p key={i} className="mb-[1em] wrap-break-word">{b}</p>;
        if ('h' in b) {
          if (b.h === '***') return <p key={i} aria-hidden="true" className="my-6 text-center text-gold">✦</p>;
          return (
            <h3 key={i} id={`bio-h-${headingNo++}`} className="mt-8 mb-3 scroll-mt-24 leading-snug font-bold text-wine first:mt-0" style={{ fontSize: '1.1em' }}>
              {b.h}
            </h3>
          );
        }
        if ('verse' in b) {
          return (
            <blockquote key={i} className="my-5 rounded-tile bg-surf px-5 py-4 text-center italic">
              {b.verse.map((l, j) => <span key={j} className="block">{l}</span>)}
            </blockquote>
          );
        }
        if ('sources' in b) {
          return (
            <div key={i} className="mt-8 border-t border-line pt-4 font-sans text-meta leading-relaxed text-mut">
              <p className="mb-2 font-bold text-ink">წყაროები და სამეცნიერო ლიტერატურა</p>
              {b.sources.map((s, j) => <p key={j} className="mb-1 wrap-break-word">{s}</p>)}
            </div>
          );
        }
        return <p key={i} className="mt-2 font-sans text-meta text-mut italic">{b.note}</p>;
      })}
    </>
  );
};

/** x-tsinapari — one person's page over the list: photo, name, the contents in one line, the text, ‹ › to the neighbours */
const Reader: React.FC<{ id: number; onNavigate: (id: number) => void; onClose: () => void }> = ({ id, onNavigate, onClose }) => {
  const [texts, setTexts] = useState<Record<number, BioBlock[]> | null>(null);
  const [font, setFont] = useReaderFont(FONT_KEY);
  const [contents, setContents] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const index = ANCESTORS.findIndex(a => a.id === id);
  const a = ANCESTORS[index];
  const prev = ANCESTORS[index - 1];
  const next = ANCESTORS[index + 1];
  const blocks = texts?.[id];
  const headings = (blocks ?? []).flatMap(b => (typeof b !== 'string' && 'h' in b && b.h !== '***' ? [b.h] : []));

  useEffect(() => {
    let alive = true;
    import('../../../data/ancestorsBioTexts').then(m => alive && setTexts(m.BIO_TEXTS));
    return () => { alive = false; };
  }, []);

  // the page behind stays put while the reader is open; Escape closes it
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !contents) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, contents]);

  // a newly opened biography starts from its beginning
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); }, [id]);

  const jumpTo = (n: number) => {
    setContents(false);
    window.setTimeout(() => scroller.current?.querySelector(`#bio-h-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  if (!a) return null;
  const group = GROUPS.find(g => g.key === a.group);
  const [main, sur] = splitName(a.name);

  return (
    <div ref={scroller} role="dialog" aria-modal="true" aria-label={a.name} className="safe-x fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-page">
      <div className="sticky top-0 z-10 bg-page px-4 pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto max-w-2xl">
          <TopBar
            title="წინაპრები"
            onBack={onClose}
            right={<>{blocks && <AutoRound source={() => textRef.current} scroller={() => scroller.current} zoom={font / 100} />}<TextSizeButton font={font} onFont={setFont} /></>}
          />
        </div>
      </div>
      <Page className="px-4 pb-10">
        <header className="flex items-center gap-3.5 px-1.5 pt-1.5">
          <span aria-hidden="true" className="flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-wine text-hero font-bold text-white">
            {a.image ? <img src={a.image} alt="" className="size-full object-cover object-top" /> : Array.from(letterName(a.name))[0]}
          </span>
          <div className="min-w-0">
            {group && <div className="text-meta font-semibold text-wine">{group.one}</div>}
            <h2 className="mt-0.5 font-serif-ge text-title leading-tight font-bold wrap-break-word">{main}</h2>
            {(sur || a.years) && <div className="text-meta text-mut">{[sur, a.years].filter(Boolean).join(' · ')}</div>}
          </div>
        </header>

        {headings.length >= 2 && (
          <Rows>
            <Row lead={<Dot icon={<List />} />} title="შინაარსი" sub={`${headings.length} თავი`} onClick={() => { triggerHaptic(8); setContents(true); }} />
          </Rows>
        )}

        <div ref={textRef} className="px-1.5 font-serif-ge leading-[1.75] text-ink" style={{ fontSize: `${(17 * font) / 100}px` }}>
          {blocks ? <BioBody blocks={blocks} /> : (
            <div className="flex animate-pulse flex-col gap-3" aria-label="იტვირთება">
              {[100, 96, 92, 98, 60].map((w, i) => <div key={i} className="h-3.5 rounded-full bg-soft" style={{ width: `${w}%` }} />)}
            </div>
          )}
        </div>

        {(prev || next) && (
          <Rows>
            {prev && (
              <Row lead={<Avatar name={letterName(prev.name)} photo={prev.image} className="object-top" />} title={splitName(prev.name)[0]}
                sub={<span className="inline-flex items-center gap-0.5"><ChevronLeft aria-hidden="true" className="size-3.5" />წინა</span>}
                onClick={() => { triggerHaptic(8); onNavigate(prev.id); }} right={null} />
            )}
            {next && (
              <Row lead={<Avatar name={letterName(next.name)} photo={next.image} className="object-top" />} title={splitName(next.name)[0]}
                sub={<span className="inline-flex items-center gap-0.5">შემდეგი<ChevronRight aria-hidden="true" className="size-3.5" /></span>}
                onClick={() => { triggerHaptic(8); onNavigate(next.id); }} />
            )}
          </Rows>
        )}
        <Note className="text-center">
          ტექსტი: <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted">galobani.ge — ცნობილი მგალობლების ბიოგრაფიები</a>
        </Note>
      </Page>

      <Sheet open={contents} title="შინაარსი" onClose={() => setContents(false)}>
        <Rows>
          {headings.map((h, n) => (
            <Row key={n} lead={<span className="w-6 shrink-0 text-center text-meta font-bold text-gold-ink tabular-nums">{n + 1}</span>} title={h} wrap onClick={() => jumpTo(n)} />
          ))}
        </Rows>
      </Sheet>
    </div>
  );
};

export const AncestorsV2: React.FC = () => {
  const { handleGoBack } = useNavigation();
  const [openId, setOpenId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [unfolded, setUnfolded] = useState<Ancestor['group'] | null>(null);
  const closeReader = useCallback(() => setOpenId(null), []);
  // a chanter picked in the search opens straight in the reader
  useOpenRequest('tsinaprebi', id => setOpenId(Number(id)));

  const q = query.trim();
  const found = useMemo(() => (q ? ANCESTORS.filter(a => a.name.includes(q)) : []), [q]);

  return (
    <Page>
      <TopBar title="გაიცანი წინაპრები" onBack={handleGoBack} right={<PinRound id="section:tsinaprebi" />} />
      <SearchPill value={query} onChange={setQuery} placeholder="ეძებე სახელით" />

      {q ? (
        found.length
          ? <Rows>{found.map(a => <Person key={a.id} a={a} onOpen={setOpenId} />)}</Rows>
          : <Note className="py-6 text-center">ასეთი სახელი ვერ მოიძებნა</Note>
      ) : (
        <>
          <SectionLabel label="წმიდა მგალობლები" />
          <Rows>
            {PORTRAITS.map(p => (
              <Row
                key={p.bio}
                lead={<Avatar name={letterName(p.name)} photo={p.src} className="object-top" />}
                title={p.name}
                onClick={() => { triggerHaptic(10); setOpenId(p.bio); }}
              />
            ))}
          </Rows>

          <SectionLabel label="ჯგუფები" />
          <Rows>
            {GROUPS.map(g => {
              // the three above are not shown a second time here
              const items = ANCESTORS.filter(a => a.group === g.key && !PORTRAITS.some(p => p.bio === a.id));
              const open = unfolded === g.key;
              return (
                <React.Fragment key={g.key}>
                  <Row
                    lead={<Dot icon={<g.Icon />} />}
                    title={g.title}
                    sub={g.subtitle}
                    aria-expanded={open}
                    onClick={() => { triggerHaptic(10); setUnfolded(open ? null : g.key); }}
                    right={<><Small>{items.length}</Small><ChevronDown aria-hidden="true" className={cx('size-[18px] shrink-0 text-mut transition-transform', open && 'rotate-180')} strokeWidth={2} /></>}
                  />
                  {open && items.map(a => <Person key={a.id} a={a} onOpen={setOpenId} />)}
                </React.Fragment>
              );
            })}
          </Rows>
        </>
      )}

      <SectionLabel label="ფილმი" />
      <Film />

      <SectionLabel label="წაიკითხე" />
      <Rows>
        {LINKS.map(l => (
          <Row key={l.href} lead={<Dot icon={<ExternalLink />} color="sea" />} title={l.label} wrap href={l.href} target="_blank" />
        ))}
      </Rows>
      <Note className="text-center">
        ბიოგრაფიები: <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted">galobani.ge</a>
      </Note>

      {openId !== null && <Reader id={openId} onNavigate={setOpenId} onClose={closeReader} />}
    </Page>
  );
};

export default AncestorsV2;
