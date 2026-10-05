import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, ChevronRight, Loader2, RotateCw } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { GrapeBunch } from '../home/PlateOrnaments';
import { dayMonthGe } from '../../data/churchCalendar';
import {
  LIFE_EVENT, Life, LifeBlock, LifeEntry, LifeRun, RUN_BOLD, RUN_ITALIC,
  lifeAsset, lifeNewIso, lifeOldDay, openSaintLife, splitTitle, useLife, useLivesIndex,
} from '../../data/saintLives';
import { LifeThumb } from './LifeThumb';
import { InlineLink } from './InlineLink';

// A saint's life over the whole screen, opened from the today's-saints card, the footer calendar or the
// library (openSaintLife). Each life is a history entry: the phone's back gesture closes it, or goes
// back from a longer version to the life it was opened from.

const historyLife = (): string | null => {
  try { return (window.history.state || {}).sgLife ?? null; } catch { return null; }
};

const Runs: React.FC<{ runs: LifeRun[]; skipFirst?: number }> = ({ runs, skipFirst = 0 }) => (
  <>
    {runs.map(([text, f = 0, link], i) => {
      const t = i === 0 && skipFirst ? text.slice(skipFirst) : text;
      const lines = t.split('\n').map((l, j) => (
        <React.Fragment key={j}>
          {j > 0 && <br />}
          {l}
        </React.Fragment>
      ));
      const cls = `${f & RUN_BOLD ? 'font-bold text-[#5e1820]' : ''} ${f & RUN_ITALIC ? 'italic' : ''}`.trim();
      if (link) {
        return (
          <InlineLink key={i} onOpen={() => { triggerHaptic(8); openSaintLife(link); }} className={`${cls} font-semibold text-[#7a2028]`}>
            {lines}
          </InlineLink>
        );
      }
      return cls ? <span key={i} className={cls}>{lines}</span> : <React.Fragment key={i}>{lines}</React.Fragment>;
    })}
  </>
);

// the icon in a thin gilded frame
const Icon: React.FC<{ block: Extract<LifeBlock, { img: string }>; lead?: boolean }> = ({ block, lead }) => {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <figure className={lead ? 'mx-auto mb-6 w-fit sm:float-left sm:mr-7 sm:mb-3 sm:mt-1.5' : 'mx-auto my-6 w-fit clear-both'}>
      <span className="block rounded-[14px] p-[5px] bg-gradient-to-b from-[#e9cf98] via-[#d2a04a] to-[#b98a3a] shadow-[0_22px_36px_-22px_rgba(74,40,10,0.65)]">
        <img
          src={lifeAsset(block.img)}
          alt=""
          width={block.w}
          height={block.h}
          onError={() => setOk(false)}
          className={`block rounded-[10px] bg-[#f3e8d4] w-auto h-auto ${lead ? 'max-h-[300px] sm:max-h-[340px] max-w-[min(78vw,280px)]' : 'max-h-[360px] max-w-full'}`}
        />
      </span>
    </figure>
  );
};

const Body: React.FC<{ life: Life }> = ({ life }) => {
  const firstText = life.b.findIndex(b => 'r' in b && !b.a);
  return (
    <div className="font-serif-ge text-[16.5px] sm:text-[17.5px] leading-[1.85] text-[#2a2017] text-pretty">
      {life.b.map((b, i) => {
        if ('img' in b) return <Icon key={i} block={b} lead={i < 3 && life.b.slice(0, i).every(x => !('img' in x))} />;
        if ('h' in b) {
          if (b.l) {
            const to = b.l;
            return (
              <button
                key={i}
                type="button"
                onClick={() => { triggerHaptic(8); openSaintLife(to); }}
                className="clear-both mt-7 w-full flex items-center gap-3 rounded-2xl bg-[#d2a04a]/[0.12] ring-1 ring-[#d2a04a]/35 hover:ring-[#7a2028]/30 px-4 py-3 text-left cursor-pointer active:scale-[0.99] transition-all"
              >
                <BookOpen className="w-5 h-5 shrink-0 text-[#8a6a2a]" />
                <span className="flex-1 min-w-0 font-serif-ge text-[15px] leading-snug font-bold text-[#5e1820]">{b.h}</span>
                <ChevronRight className="w-4 h-4 shrink-0 text-[#7a2028]" />
              </button>
            );
          }
          return <h3 key={i} className="clear-both mt-7 mb-1 font-serif-ge text-[18px] sm:text-[19px] leading-snug font-bold text-[#7a2028] text-balance">{b.h}</h3>;
        }
        // a citation or an epigraph ("„წმიდანთა ცხოვრება“, ტომი III…") stands apart, small and to the right
        if (b.a === 'r') {
          return (
            <p key={i} className="mt-3 ml-auto max-w-[85%] text-right font-serif-ge text-[13.5px] leading-relaxed italic text-[#8a7a6a]">
              <Runs runs={b.r.map(([t, f, l]) => [t, (f || 0) & ~RUN_ITALIC, l] as LifeRun)} />
            </p>
          );
        }
        if (b.a === 'c') return <p key={i} className="mt-4 text-center"><Runs runs={b.r} /></p>;
        // the life opens with a cinnabar initial, as the library's book does
        const [head] = b.r;
        const initial = i === firstText && head && !head[1] && !head[2] ? head[0].charAt(0) : '';
        return (
          <p key={i} className={i === firstText ? '' : 'mt-3.5'}>
            {initial && (
              <>
                <span className="float-left font-serif-ge text-[50px] leading-[0.8] mr-2 mt-[7px] text-[#9a3324]" aria-hidden>{initial}</span>
                <span className="sr-only">{initial}</span>
              </>
            )}
            <Runs runs={b.r} skipFirst={initial ? 1 : 0} />
          </p>
        );
      })}
    </div>
  );
};

export const SaintLifeOverlay: React.FC = () => {
  const [id, setId] = useState<string | null>(historyLife);
  const [shown, setShown] = useState<string | null>(id); // stays while the overlay fades out
  const [visible, setVisible] = useState(!!id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrolls = useRef(new Map<string, number>());
  const restore = useRef<string | null>(null);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const { lives } = useLivesIndex();
  const [attempt, setAttempt] = useState(0);
  const life = useLife(shown, attempt);
  const [titleGone, setTitleGone] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const back = () => {
    triggerHaptic(8);
    if (historyLife()) window.history.back();
    else setId(null);
  };

  // open (a new history entry) · back / forward between lives · close
  useEffect(() => {
    const onOpen = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (!next) return;
      const cur = historyLife();
      if (cur === next) return;
      if (cur && scrollRef.current) scrolls.current.set(cur, scrollRef.current.scrollTop);
      try { window.history.pushState({ ...(window.history.state || {}), sgLife: next }, ''); } catch { /* still opens */ }
      restore.current = null;
      setId(next);
    };
    const onPop = () => {
      if (shownRef.current && scrollRef.current) scrolls.current.set(shownRef.current, scrollRef.current.scrollTop);
      const next = historyLife();
      restore.current = next;
      setId(next);
    };
    window.addEventListener(LIFE_EVENT, onOpen);
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener(LIFE_EVENT, onOpen);
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  useEffect(() => {
    if (id) {
      setShown(id);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return;
    }
    setVisible(false);
    const t = window.setTimeout(() => setShown(null), 260);
    return () => window.clearTimeout(t);
  }, [id]);

  // the page underneath stays where it was
  useEffect(() => {
    if (!shown) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => { html.style.overflow = prev; };
  }, [shown]);

  // a new life starts at its top; one returned to (back) where the reader left it
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !shown) return;
    if (restore.current === shown && life) {
      el.scrollTop = scrolls.current.get(shown) ?? 0;
      restore.current = null;
    } else if (restore.current !== shown) {
      el.scrollTop = 0;
    }
  }, [shown, life]);

  // the bar shows the saint's name once the title has scrolled away
  useEffect(() => {
    const el = titleRef.current, root = scrollRef.current;
    if (!el || !root) { setTitleGone(false); return; }
    const io = new IntersectionObserver(([e]) => setTitleGone(!e.isIntersecting), { root, rootMargin: '-56px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [shown, life]);

  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') back(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  const entry = useMemo(() => lives?.find(l => l.id === shown) ?? null, [lives, shown]);
  // the others of the same day
  const sameDay = useMemo(() => {
    if (!lives || !entry?.m) return [];
    return lives.filter(l => !l.x && l.m === entry.m && l.d === entry.d && l.id !== entry.id);
  }, [lives, entry]);

  if (!shown) return null;

  const title = life?.t || entry?.t || '';
  const { name, note } = splitTitle(title);
  const oldDay = entry ? lifeOldDay(entry) : '';
  const newIso = entry ? lifeNewIso(entry) : null;
  const when = oldDay ? null : life?.h || entry?.h || '';

  return (
    <div
      ref={scrollRef}
      role="dialog"
      aria-modal="true"
      aria-label={name || 'წმიდანის ცხოვრება'}
      className={`fixed inset-0 z-[85] overflow-y-auto overscroll-contain bg-[#fbf6ec] transition-[opacity,transform] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        visible ? 'opacity-100 translate-y-0 duration-300' : 'opacity-0 translate-y-3 duration-200'
      }`}
    >
      {/* the bar */}
      <div className="sticky top-0 z-10 bg-[#fbf6ec]/90 backdrop-blur-md border-b border-[#2a2017]/[0.06]">
        <div className="max-w-[720px] mx-auto h-14 px-3 sm:px-5 flex items-center gap-3">
          <button
            type="button"
            onClick={back}
            className="w-10 h-10 shrink-0 rounded-full bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/35 text-[#4a3426] hover:text-[#7a2028] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
            aria-label="უკან"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <p className={`flex-1 min-w-0 truncate font-serif-ge text-[13px] font-bold text-[#7a2028] transition-opacity duration-200 ${titleGone ? 'opacity-100' : 'opacity-0'}`}>
            {name}
          </p>
        </div>
        <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[12px] font-bold text-[#8a7a6a] pointer-events-none transition-opacity duration-200 ${titleGone ? 'opacity-0' : 'opacity-100'}`}>
          წმიდანთა ცხოვრება
        </span>
      </div>

      <article className="max-w-[720px] mx-auto px-5 sm:px-8 pt-6 pb-16">
        <header className="text-center">
          {(oldDay || when) && (
            <p className="text-[12px] font-semibold text-[#8a6a2a]">
              {oldDay ? (
                <>
                  {oldDay}
                  <span className="text-[#b3a594]"> ძვ. სტ.</span>
                  {newIso && (
                    <>
                      <span className="mx-1.5 text-[#d9c6a8]">·</span>
                      {dayMonthGe(newIso)}
                      <span className="text-[#b3a594]"> ახ. სტ.</span>
                    </>
                  )}
                </>
              ) : when}
            </p>
          )}
          <h1 ref={titleRef} className="mt-2 font-serif-ge text-[23px] sm:text-[28px] leading-[1.3] font-bold text-[#7a2028] text-balance">
            {name || <span className="inline-block h-6 w-56 max-w-full rounded bg-[#e8dcc8]/70 animate-pulse align-middle" />}
          </h1>
          {note && <p className="mt-1 text-[13px] font-semibold text-[#8a7a6a]">({note})</p>}
          <div className="mx-auto mt-4 mb-7 flex items-center justify-center gap-2" aria-hidden>
            <span className="h-px w-14 bg-gradient-to-r from-transparent to-[#d9c6a8]" />
            <GrapeBunch color="#c4262e" className="w-4 h-4 opacity-80" />
            <span className="h-px w-14 bg-gradient-to-l from-transparent to-[#d9c6a8]" />
          </div>
        </header>

        {life === undefined && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#8a7a6a]">
            <Loader2 className="w-4 h-4 animate-spin" /> იტვირთება…
          </div>
        )}
        {life === null && (
          <div className="py-14 text-center">
            <p className="font-serif-ge text-[15px] text-[#4a3426]">ცხოვრება ვერ ჩაიტვირთა.</p>
            <p className="mt-1 text-[13px] text-[#8a7a6a]">შეამოწმეთ ინტერნეტი და სცადეთ თავიდან.</p>
            <button
              type="button"
              onClick={() => { triggerHaptic(8); setAttempt(a => a + 1); }}
              className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/35 text-[13px] font-bold text-[#7a2028] cursor-pointer active:scale-95 transition-all"
            >
              <RotateCw className="w-4 h-4" /> თავიდან
            </button>
          </div>
        )}
        {life && <Body life={life} />}

        {life && sameDay.length > 0 && (
          <section className="clear-both mt-12">
            <div className="flex items-center gap-3 mb-3" aria-hidden>
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#e3d3b8]" />
              <span className="w-1.5 h-1.5 rotate-45 bg-[#c4262e]/60" />
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#e3d3b8]" />
            </div>
            <h2 className="text-center font-serif-ge text-[15px] font-bold text-[#7a2028]">ამავე დღეს იხსენიებიან</h2>
            <ul className="mt-3 rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_26px_-22px_rgba(42,32,23,0.35)] p-1.5 [&>li+li]:border-t [&>li+li]:border-[#2a2017]/[0.05]">
              {sameDay.map(l => <SameDayRow key={l.id} life={l} />)}
            </ul>
          </section>
        )}
      </article>
    </div>
  );
};

const SameDayRow: React.FC<{ life: LifeEntry }> = ({ life }) => {
  const { name, note } = splitTitle(life.t);
  return (
    <li>
      <button
        type="button"
        onClick={() => { triggerHaptic(8); openSaintLife(life.id); }}
        className="group w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[#7a2028]/[0.04] cursor-pointer active:scale-[0.99] transition-all"
      >
        <LifeThumb life={life} className="w-9 h-11" />
        <span className="flex-1 min-w-0 font-serif-ge text-[14px] leading-snug text-[#2a2017] group-hover:text-[#7a2028] transition-colors">
          {name}
          {note && <span className="font-sans text-[11.5px] text-[#8a7a6a]"> ({note})</span>}
        </span>
        <ChevronRight className="w-4 h-4 shrink-0 text-[#cdbba3] group-hover:text-[#7a2028] transition-colors" />
      </button>
    </li>
  );
};
