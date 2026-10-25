import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Music, Play, Search, X } from 'lucide-react';
import { ANCESTORS, type Ancestor, type BioBlock } from '../data/ancestorsBios';
import { useOpenRequest } from '../utils/searchOpen';

// "Meet the ancestors": portraits of the great chanters lead the page, then every
// biography from galobani.ge as a card that opens a full-screen reader, then the
// documentary film and further reading.
const PORTRAITS = [
  { src: '/home/karbelashvili.jpg', name: 'წმ. ძმები კარბელაშვილები', bio: 7 },
  { src: '/home/koridze.jpg', name: 'წმ. ფილიმონ ქორიძე', bio: 8 },
  { src: '/home/kereselidze.jpg', name: 'წმ. ექვთიმე კერესელიძე', bio: 9 },
];

const GROUPS: { key: Ancestor['group']; title: string; subtitle: string }[] = [
  { key: 'hymnographers', title: 'ძველი ჰიმნოგრაფები', subtitle: 'VIII–XIII საუკუნეები' },
  { key: 'keepers', title: 'გალობის მცველები', subtitle: 'მგალობლები, ლოტბრები, გადამრჩენლები' },
];

const LINKS = [
  { href: 'https://www.galobani.ge/library/istoria', label: 'ისტორია ქართული საეკლესიო საგალობლების ნოტებზე გადაღებისა', Icon: Music },
];

const SOURCE_URL = 'https://www.galobani.ge/library/biografia';
const VIDEO_ID = 'F-7QoI2ULlM';
const FONT_KEY = 'ancestors-reader-font';
const FONT_STEPS = [90, 100, 112, 125, 140];

// Asomtavruli capital for the portrait-less cards: Mkhedruli ა… and Asomtavruli Ⴀ… share their order.
const initialOf = (name: string) => {
  const ch = name.replace(/^(წმიდა|არქიმანდრიტი)\s+/, '').charAt(0);
  const code = ch.charCodeAt(0);
  return code >= 0x10d0 && code <= 0x10f5 ? String.fromCharCode(code - 0x30) : ch;
};

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#7a2028]/70">
    <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#e6d9c2]" />
    {children}
    <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#e6d9c2]" />
  </h2>
);

const Ornament: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center justify-center gap-2 text-[#b08a4a] ${className}`} aria-hidden="true">
    <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#cdb184]" />
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" />
    </svg>
    <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#cdb184]" />
  </div>
);

// Parchment plate with a thin gilt frame and an Asomtavruli capital, for those without a portrait.
const Monogram: React.FC<{ name: string; big?: boolean }> = ({ name, big }) => (
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_15%,#fffaf0_0%,#f6ecd9_55%,#e9d7b3_100%)]">
    <div className={`absolute border border-[#b08a4a]/40 ${big ? 'inset-2.5 rounded-[1.1rem]' : 'inset-1.5 rounded-[0.8rem]'}`} />
    <div className={`absolute border border-[#b08a4a]/20 ${big ? 'inset-4 rounded-xl' : 'inset-2.5 rounded-[0.55rem]'}`} />
    <span
      className={`absolute inset-0 flex items-center justify-center font-serif-ge text-[#7a2028]/85 ${
        big ? 'pb-[6%] text-7xl' : 'pb-[30%] text-4xl sm:text-5xl'
      }`}
    >
      {initialOf(name)}
    </span>
  </div>
);

// "Name (Surname)" → the surname as a quieter second line.
const splitName = (name: string) => {
  const m = name.match(/^(.*?)\s*\((.+)\)$/);
  return m ? [m[1], m[2]] : [name, ''];
};

const AncestorCard: React.FC<{ a: Ancestor; onOpen: () => void; className?: string }> = ({ a, onOpen, className = '' }) => {
  const [main, sub] = splitName(a.name);
  const photo = Boolean(a.image);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`@container group relative aspect-[3/4] rounded-2xl overflow-hidden bg-stone-200 shadow-sm ring-1 ring-black/5 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 text-left cursor-pointer ${className}`}
    >
      {photo ? (
        <img
          src={a.image}
          alt={a.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <Monogram name={a.name} />
      )}
      {photo && <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />}
      {a.years && (
        <span
          className={`absolute top-1.5 left-1.5 px-1.5 py-px rounded-full text-[11px] font-semibold ${
            photo ? 'bg-black/35 backdrop-blur-sm text-white/90' : 'bg-[#7a2028]/10 text-[#7a2028]/80'
          }`}
        >
          {a.years}
        </span>
      )}
      <span className={`absolute inset-x-0 bottom-0 px-1.5 pb-2 sm:p-2.5 font-serif-ge leading-tight break-words ${photo ? 'text-white drop-shadow' : 'text-[#7a2028]'}`}>
        <span className="block text-[clamp(10.5px,10.8cqw,13.5px)] font-bold line-clamp-3">{main}</span>
        {sub && <span className={`block mt-0.5 text-[clamp(9.5px,9.6cqw,11.5px)] font-semibold ${photo ? 'text-white/75' : 'text-[#7a2028]/60'}`}>{sub}</span>}
      </span>
    </button>
  );
};

const roundBtn =
  'w-9 h-9 rounded-full bg-white ring-1 ring-[#e6d9c2] shadow-sm flex items-center justify-center text-[#7a2028] hover:ring-[#7a2028]/30 hover:shadow transition-all cursor-pointer disabled:opacity-35 disabled:cursor-default disabled:shadow-none';

// One group as a swipeable strip of small cards; „ყველა“ unfolds it into a grid.
const GroupStrip: React.FC<{ title: string; subtitle: string; items: Ancestor[]; onOpen: (id: number) => void }> = ({
  title,
  subtitle,
  items,
  onOpen,
}) => {
  const [all, setAll] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    if (all) return;
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [all, measure]);

  const page = (dir: 1 | -1) => {
    const el = track.current;
    el?.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h3 className="font-serif-ge font-bold text-base sm:text-lg leading-tight text-[#7a2028]">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!all && (
            <>
              <button type="button" onClick={() => page(-1)} disabled={edge.start} className={`hidden sm:flex ${roundBtn}`} aria-label="წინა">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => page(1)} disabled={edge.end} className={`hidden sm:flex ${roundBtn}`} aria-label="შემდეგი">
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            aria-expanded={all}
            className="h-9 pl-3.5 pr-2.5 rounded-full bg-white ring-1 ring-[#e6d9c2] shadow-sm inline-flex items-center gap-1 text-[13px] font-semibold text-[#7a2028] hover:ring-[#7a2028]/30 hover:shadow transition-all cursor-pointer"
          >
            {all ? 'შეკეცვა' : `ყველა · ${items.length}`}
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${all ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {all ? (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 sm:gap-3 pt-1">
          {items.map((a) => (
            <AncestorCard key={a.id} a={a} onOpen={() => onOpen(a.id)} />
          ))}
        </div>
      ) : (
        <div
          ref={track}
          onScroll={measure}
          className="-mx-1 px-1 pt-1 pb-2 flex gap-2.5 sm:gap-3 overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((a) => (
            <AncestorCard key={a.id} a={a} onOpen={() => onOpen(a.id)} className="shrink-0 snap-start w-[29%] sm:w-[21.5%]" />
          ))}
        </div>
      )}
    </div>
  );
};

// A light film card: only the thumbnail loads; the YouTube player appears on tap.
const FilmCard: React.FC = () => {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="relative w-full max-w-md mx-auto aspect-video rounded-2xl overflow-hidden shadow-lg bg-black">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?start=2&autoplay=1`}
          title="გალობის რაინდები"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
        <button
          type="button"
          onClick={() => setPlaying(false)}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer"
          title="დახურვა"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group w-full flex items-center gap-4 p-2.5 rounded-2xl bg-white ring-1 ring-[#e6d9c2] shadow-sm hover:shadow-md hover:ring-[#7a2028]/30 transition-all text-left cursor-pointer active:scale-[0.99]"
    >
      <div className="relative w-32 sm:w-40 aspect-video shrink-0 rounded-xl overflow-hidden bg-stone-800">
        <img
          src={`https://i.ytimg.com/vi/${VIDEO_ID}/mqdefault.jpg`}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center group-hover:scale-110 transition-transform">
            <Play className="w-4 h-4 text-[#7a2028] fill-[#7a2028] translate-x-px" />
          </span>
        </span>
      </div>
      <div className="min-w-0">
        <p className="font-serif-ge font-bold text-base sm:text-lg text-slate-800 group-hover:text-[#7a2028] transition-colors">
          გალობის რაინდები
        </p>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">დოკუმენტური ფილმი · odishitv</p>
      </div>
    </button>
  );
};

const BioBody: React.FC<{ blocks: BioBlock[] }> = ({ blocks }) => {
  let headingNo = 0;
  return (
    <>
      {blocks.map((b, i) => {
        if (typeof b === 'string') {
          const lead = i === 0;
          return (
            <p
              key={i}
              className={`mb-[1.1em] ${
                lead
                  ? 'first-letter:float-left first-letter:font-serif-ge first-letter:font-bold first-letter:text-[3.3em] first-letter:leading-[0.9] first-letter:mr-2 first-letter:mt-1 first-letter:text-[#7a2028]'
                  : ''
              }`}
            >
              {b}
            </p>
          );
        }
        if ('h' in b) {
          if (b.h === '***') return <Ornament key={i} className="my-8" />;
          return (
            <h3
              key={i}
              id={`bio-h-${headingNo++}`}
              className="scroll-mt-20 font-serif-ge font-bold text-[1.15em] leading-snug text-[#7a2028] mt-9 mb-3 first:mt-0"
            >
              {b.h}
            </h3>
          );
        }
        if ('verse' in b) {
          return (
            <blockquote key={i} className="my-6 py-4 px-5 rounded-2xl bg-white/70 ring-1 ring-[#e6d9c2] font-serif-ge italic text-center text-slate-700 leading-loose">
              {b.verse.map((l, j) => (
                <span key={j} className="block">{l}</span>
              ))}
            </blockquote>
          );
        }
        if ('sources' in b) {
          return (
            <div key={i} className="mt-9 pt-5 border-t border-[#e6d9c2] text-[0.8em] text-slate-500 leading-relaxed">
              <p className="font-bold text-slate-600 mb-2">წყაროები და სამეცნიერო ლიტერატურა</p>
              {b.sources.map((s, j) => (
                <p key={j} className="mb-1">{s}</p>
              ))}
            </div>
          );
        }
        return (
          <p key={i} className="text-[0.8em] italic text-slate-500 mt-2">
            {b.note}
          </p>
        );
      })}
    </>
  );
};

const readFont = () => {
  try {
    const v = Number(localStorage.getItem(FONT_KEY));
    return FONT_STEPS.includes(v) ? v : 100;
  } catch {
    return 100;
  }
};

// Full-screen reading view of one biography, with font size and previous/next.
const BioReader: React.FC<{ id: number; onNavigate: (id: number) => void; onClose: () => void }> = ({ id, onNavigate, onClose }) => {
  const [texts, setTexts] = useState<Record<number, BioBlock[]> | null>(null);
  const [font, setFont] = useState(readFont);
  const scroller = useRef<HTMLDivElement>(null);

  const index = ANCESTORS.findIndex((a) => a.id === id);
  const a = ANCESTORS[index];
  const prev = ANCESTORS[index - 1];
  const next = ANCESTORS[index + 1];
  const blocks = texts?.[id];
  const headings = (blocks ?? []).flatMap((b) => (typeof b !== 'string' && 'h' in b && b.h !== '***' ? [b.h] : []));

  useEffect(() => {
    let alive = true;
    import('../data/ancestorsBioTexts').then((m) => alive && setTexts(m.BIO_TEXTS));
    return () => {
      alive = false;
    };
  }, []);

  // the page behind stays put while the reader is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // a newly opened biography starts from its beginning
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [id]);

  const changeFont = (dir: 1 | -1) => {
    const i = Math.min(FONT_STEPS.length - 1, Math.max(0, FONT_STEPS.indexOf(font) + dir));
    setFont(FONT_STEPS[i]);
    try {
      localStorage.setItem(FONT_KEY, String(FONT_STEPS[i]));
    } catch {
      /* the size just isn't remembered */
    }
  };

  const jumpTo = (n: number) => {
    const el = scroller.current?.querySelector(`#bio-h-${n}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!a) return null;

  const navButton = (target: Ancestor | undefined, dir: 'prev' | 'next') =>
    target ? (
      <button
        type="button"
        onClick={() => onNavigate(target.id)}
        className={`group flex-1 min-w-0 flex items-center gap-3 p-2.5 rounded-2xl bg-white ring-1 ring-[#e6d9c2] shadow-sm hover:shadow-md hover:ring-[#7a2028]/30 transition-all cursor-pointer active:scale-[0.99] ${
          dir === 'next' ? 'flex-row-reverse text-right' : 'text-left'
        }`}
      >
        <span className="relative w-11 h-14 shrink-0 rounded-xl overflow-hidden bg-stone-200">
          {target.image ? (
            <img src={target.image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover object-top" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center bg-[#7a2028] font-serif-ge text-xl text-[#ecd29c]">
              {initialOf(target.name)}
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-[#7a2028] transition-colors">
            {dir === 'prev' ? <ChevronLeft className="w-3.5 h-3.5" /> : null}
            {dir === 'prev' ? 'წინა' : 'შემდეგი'}
            {dir === 'next' ? <ChevronRight className="w-3.5 h-3.5" /> : null}
          </span>
          <span className="block font-serif-ge font-bold text-sm leading-snug text-slate-800 line-clamp-2">{target.name}</span>
        </span>
      </button>
    ) : (
      <span className="flex-1" />
    );

  return (
    <div
      ref={scroller}
      role="dialog"
      aria-modal="true"
      aria-label={a.name}
      className="fixed inset-0 z-[70] safe-x overflow-y-auto overscroll-contain bg-[#fbf6ec]"
    >
      <div className="sticky top-0 z-10 bg-[#fbf6ec]/90 backdrop-blur-md border-b border-[#e6d9c2]/70">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200/90 hover:border-amber-400/50 bg-white/80 hover:bg-amber-50/50 active:scale-95 text-slate-700 hover:text-[#85502c] transition-all text-sm font-semibold cursor-pointer group shrink-0"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>უკან</span>
          </button>
          <p className="flex-1 min-w-0 truncate text-center font-serif-ge font-bold text-sm text-[#7a2028]/80">{a.name}</p>
          <div className="flex items-center rounded-xl ring-1 ring-slate-200/90 bg-white/80 shrink-0 overflow-hidden">
            <button
              type="button"
              onClick={() => changeFont(-1)}
              disabled={font === FONT_STEPS[0]}
              className="w-10 h-9 text-sm font-bold text-slate-600 hover:bg-amber-50 disabled:opacity-35 cursor-pointer disabled:cursor-default"
              aria-label="ტექსტის დაპატარავება"
            >
              A−
            </button>
            <span className="w-px h-5 bg-slate-200" />
            <button
              type="button"
              onClick={() => changeFont(1)}
              disabled={font === FONT_STEPS[FONT_STEPS.length - 1]}
              className="w-10 h-9 text-base font-bold text-slate-600 hover:bg-amber-50 disabled:opacity-35 cursor-pointer disabled:cursor-default"
              aria-label="ტექსტის გადიდება"
            >
              A+
            </button>
          </div>
        </div>
      </div>

      <article className="max-w-[40rem] mx-auto px-5 pt-8 pb-10">
        <header className="flex flex-col items-center text-center">
          <div className="relative w-40 sm:w-48 aspect-[3/4] rounded-3xl overflow-hidden shadow-xl ring-4 ring-white bg-stone-200">
            {a.image ? (
              <img src={a.image} alt={a.name} className="absolute inset-0 w-full h-full object-cover object-top" />
            ) : (
              <Monogram name={a.name} big />
            )}
          </div>
          <h2 className="mt-6 font-serif-ge font-bold text-2xl sm:text-3xl leading-tight text-[#7a2028]">{a.name}</h2>
          {a.years && <p className="mt-2 text-sm font-semibold tracking-wide text-[#a07a3c]">{a.years}</p>}
          <Ornament className="mt-5" />
        </header>

        {headings.length >= 3 && (
          <nav className="mt-7 p-4 rounded-2xl bg-white/70 ring-1 ring-[#e6d9c2]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7a2028]/70 mb-2.5">შინაარსი</p>
            <ol className="space-y-1">
              {headings.map((h, n) => (
                <li key={n}>
                  <button
                    type="button"
                    onClick={() => jumpTo(n)}
                    className="w-full text-left flex gap-2.5 py-1.5 px-2 -mx-2 rounded-lg text-sm text-slate-700 hover:bg-amber-50 hover:text-[#7a2028] transition-colors cursor-pointer"
                  >
                    <span className="font-serif-ge font-bold text-[#b08a4a] w-4 shrink-0">{n + 1}</span>
                    <span>{h}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="mt-8 font-serif-ge text-slate-800 leading-[1.85]" style={{ fontSize: `${(17 * font) / 100}px` }}>
          {blocks ? (
            <BioBody blocks={blocks} />
          ) : (
            <div className="space-y-3 animate-pulse" aria-label="იტვირთება">
              {[100, 96, 92, 98, 60].map((w, i) => (
                <div key={i} className="h-3.5 rounded-full bg-[#eadfca]" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}
        </div>

        <Ornament className="mt-10" />
        <div className="mt-8 flex gap-3">
          {navButton(prev, 'prev')}
          {navButton(next, 'next')}
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          ტექსტი:{' '}
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-[#7a2028]">
            galobani.ge — ცნობილი მგალობლების ბიოგრაფიები
          </a>
        </p>
      </article>
    </div>
  );
};

export const AncestorsPage: React.FC = () => {
  const [openId, setOpenId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const closeReader = useCallback(() => setOpenId(null), []);
  // a chanter picked in the search opens straight in the reader
  useOpenRequest('tsinaprebi', id => setOpenId(Number(id)));

  const q = query.trim();
  const found = useMemo(() => (q ? ANCESTORS.filter((a) => a.name.includes(q)) : []), [q]);

  return (
    <div className="w-full max-w-2xl mx-auto mb-4 px-1 space-y-8">
      <div className="space-y-4">
        <label className="relative block max-w-md mx-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="მოძებნე მგალობელი…"
            className="w-full h-10 pl-10 pr-4 rounded-full bg-white/90 ring-1 ring-[#e6d9c2] focus:ring-2 focus:ring-[#7a2028]/40 outline-none shadow-sm text-[15px] text-slate-800 placeholder:text-slate-400 transition-shadow"
          />
        </label>
  
        {q ? (
          found.length ? (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 sm:gap-3">
              {found.map((a) => (
                <AncestorCard key={a.id} a={a} onOpen={() => setOpenId(a.id)} />
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">ასეთი სახელი ვერ მოიძებნა</p>
          )
        ) : (
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          {PORTRAITS.map(({ src, name, bio }) => (
            <button
              key={src}
              type="button"
              onClick={() => setOpenId(bio)}
              className="group relative w-[calc(50%-0.375rem)] sm:w-[calc((100%-2rem)/3)] aspect-[3/4] rounded-3xl overflow-hidden bg-stone-200 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            >
              <img
                src={src}
                alt={name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-3 max-[359px]:px-2 sm:p-4 text-center font-serif-ge text-sm max-[359px]:text-[13px] sm:text-base font-bold leading-snug text-white drop-shadow">
                {name}
              </span>
            </button>
          ))}
        </div>
        )}
      </div>

      {!q && (
        <section className="space-y-5">
          <SectionLabel>ცნობილი მგალობლები</SectionLabel>
          {GROUPS.map((g) => (
            <GroupStrip
              key={g.key}
              title={g.title}
              subtitle={g.subtitle}
              items={ANCESTORS.filter((a) => a.group === g.key)}
              onOpen={setOpenId}
            />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <SectionLabel>ფილმი</SectionLabel>
        <FilmCard />
      </section>

      <section className="space-y-3">
        <SectionLabel>წაიკითხე</SectionLabel>
        <div className="space-y-2.5">
          {LINKS.map(({ href, label, Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-3 p-4 rounded-2xl bg-white ring-1 ring-[#e6d9c2] shadow-sm hover:shadow-md hover:ring-[#7a2028]/30 transition-all duration-200 text-slate-800 hover:text-[#7a2028]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#fbf6ec] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#7a2028]" />
                </div>
                <span className="font-semibold text-sm sm:text-base">{label}</span>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#7a2028] group-hover:translate-x-0.5 transition-all shrink-0" />
            </a>
          ))}
        </div>
        <p className="text-center text-xs text-slate-400 pt-1">
          ბიოგრაფიები:{' '}
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-[#7a2028]">
            galobani.ge
          </a>
        </p>
      </section>

      {openId !== null && <BioReader id={openId} onNavigate={setOpenId} onClose={closeReader} />}
    </div>
  );
};
