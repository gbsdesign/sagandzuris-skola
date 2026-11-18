import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Feather, Search, Sparkles, Star, X } from 'lucide-react';
import { Card, Dot, Pill, Press, RoundButton, Row, Rows, SectionLabel, Small, TopBar, cx } from '../../../components/ui2';
import { triggerHaptic } from '../../../utils/haptics';
import { dayMonthGe, daysInMonth, fromOldStyle, oldStyleOf, todayIso } from '../../../data/churchCalendar';
import { LifeEntry, lifeNewIso, lifeOldDay, openSaintLife, splitTitle, useLivesIndex } from '../../../data/saintLives';
import { MONTHS_GE, MONTHS_SHORT_GE } from '../../../utils/dateNames';
import type { BookNav } from '../../library/BookHead';
import { DateTile, Loading, Page, SearchPill } from './parts';

// x-tskhovreba — „წმიდანთა ცხოვრება“ in the new look: who is remembered today first, the twelve months (old style, as the
// menaion has them) as small buttons in one grid, then the other parts. A month („lives:m9“, a day „m9:14“) and a part
// („lives:georgian“) are steps of their own as before; the search hides behind the bar's 🔍; a life opens over the page.

const PARTS = [
  { id: 'georgian', label: 'ქართველი წმიდანები', Icon: Star },
  { id: 'theotokos', label: 'ღვთისმშობლის ცხოვრება', Icon: Sparkles },
  { id: 'movable', label: 'გარდამავალი დღესასწაულები', Icon: Feather },
] as const;

// searching: one spelling for წმიდა/წმინდა, ღვთის/ღმრთის, and no punctuation
const norm = (s: string) =>
  s.replace(/წმინდ/g, 'წმიდ').replace(/ღმრთ/g, 'ღვთ').replace(/[^ა-ჰ0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const open = (l: LifeEntry) => { triggerHaptic(8); openSaintLife(l.id); };

/** „23 სექტემბერი ძვ. სტ. · 6 ოქტომბერი“ under a search result */
const whenOf = (l: LifeEntry) => {
  const iso = lifeNewIso(l);
  return l.m ? `${lifeOldDay(l)} ძვ. სტ.${iso ? ` · ${dayMonthGe(iso)}` : ''}` : l.h || '';
};

const LifeRow: React.FC<{ life: LifeEntry; sub?: string }> = ({ life, sub }) => {
  const { name, note } = splitTitle(life.t);
  const line = [note, sub].filter(Boolean).join(' · ');
  return <Row title={name} sub={line || undefined} wrap onClick={() => open(life)} />;
};

const byDay = (list: LifeEntry[]) => {
  const days = new Map<number, LifeEntry[]>();
  for (const l of list) {
    if (!days.has(l.d!)) days.set(l.d!, []);
    days.get(l.d!)!.push(l);
  }
  return [...days];
};

// one day of a month: its old-style day in the tile, this year's new-style date, its lives
const DayGroup: React.FC<{ month: number; day: number; lives: LifeEntry[]; today: boolean }> = ({ month, day, lives, today }) => {
  const year = oldStyleOf(todayIso()).year;
  const iso = fromOldStyle(year, month, Math.min(day, daysInMonth(year, month, true)));
  return (
    <Card pad="none" id={`lives-day-${month}-${day}`} className={cx('scroll-mt-24', today && 'outline-2 outline-wine/40')}>
      <header className="flex items-center gap-3 px-4 pt-3 pb-1">
        <DateTile day={day} month={month} tone={today ? 'wine' : 'tint'} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-lead font-bold">{dayMonthGe(iso)}</span>
          <span className="text-meta text-mut">{day} {MONTHS_GE[month - 1]} ძვ. სტ.</span>
        </span>
        {today && <Pill on>დღეს</Pill>}
      </header>
      <div className="flex flex-col divide-y divide-line">{lives.map(l => <LifeRow key={l.id} life={l} />)}</div>
    </Card>
  );
};

export const LivesV2: React.FC<{ nav: BookNav }> = ({ nav }) => {
  const { lives, failed } = useLivesIndex();
  const today = todayIso();
  const old = oldStyleOf(today);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');

  const listed = useMemo(() => (lives || []).filter(l => !l.x), [lives]);
  const todays = useMemo(() => listed.filter(l => l.m === old.month && l.d === old.day), [listed, old.month, old.day]);
  const perMonth = useMemo(() => {
    const n = Array(12).fill(0) as number[];
    for (const l of listed) if (l.m) n[l.m - 1]++;
    return n;
  }, [listed]);
  const georgian = useMemo(() => listed.filter(l => l.g), [listed]);
  const theotokos = useMemo(
    () => listed
      .filter(l => l.id.startsWith('gvtismshobeli/'))
      .sort((a, b) => (parseInt(a.id.split('/')[1], 10) || 99) - (parseInt(b.id.split('/')[1], 10) || 99)),
    [listed],
  );
  const movable = useMemo(() => listed.filter(l => l.id.startsWith('gardamavali/')), [listed]);

  // a month's part may name a day („m9:14“, from a button): that day's lives come into view
  const [partMonth, partDay] = (nav.part ?? '').split(':');
  useEffect(() => {
    if (partDay && listed.length) document.getElementById(`lives-day-${partMonth.slice(1)}-${partDay}`)?.scrollIntoView({ block: 'start' });
  }, [partMonth, partDay, listed.length]);

  const found = useMemo(() => {
    const q = norm(query);
    if (!q) return null;
    const words = q.split(' ');
    return listed.filter(l => { const t = norm(l.t); return words.every(w => t.includes(w)); }).slice(0, 120);
  }, [listed, query]);

  const part = nav.part;
  const month = part?.startsWith('m') ? Number(partMonth.slice(1)) : 0;
  const partInfo = PARTS.find(p => p.id === part);

  if (failed || !lives) {
    return (
      <Page>
        <TopBar title="წმიდანთა ცხოვრება" onBack={nav.up} />
        <Loading failed={failed} what="სია" />
      </Page>
    );
  }

  // a month, as the menaion has it; ‹ › turn its pages in place
  if (month >= 1 && month <= 12) {
    const step = (n: number) => { triggerHaptic(8); nav.go(`m${((month - 1 + n + 12) % 12) + 1}`, true); };
    return (
      <Page>
        <TopBar
          title={MONTHS_GE[month - 1]}
          sub="ძველი სტილით"
          onBack={nav.up}
          right={<>
            <RoundButton label="წინა თვე" onClick={() => step(-1)}><ChevronLeft aria-hidden="true" strokeWidth={1.75} /></RoundButton>
            <RoundButton label="შემდეგი თვე" onClick={() => step(1)}><ChevronRight aria-hidden="true" strokeWidth={1.75} /></RoundButton>
          </>}
        />
        {byDay(listed.filter(l => l.m === month)).map(([d, ls]) => (
          <DayGroup key={d} month={month} day={d} lives={ls} today={month === old.month && d === old.day} />
        ))}
      </Page>
    );
  }

  if (partInfo) {
    return (
      <Page>
        <TopBar title={partInfo.label} onBack={nav.up} />
        {part === 'georgian' ? (
          MONTHS_GE.map((name, mi) => {
            const ls = georgian.filter(l => l.m === mi + 1);
            if (!ls.length) return null;
            return (
              <React.Fragment key={mi}>
                <SectionLabel label={name} />
                <Rows>{ls.map(l => <LifeRow key={l.id} life={l} sub={whenOf(l)} />)}</Rows>
              </React.Fragment>
            );
          })
        ) : (
          <Rows>
            {(part === 'theotokos' ? theotokos : movable).map(l => <LifeRow key={l.id} life={l} sub={part === 'movable' ? l.h : undefined} />)}
          </Rows>
        )}
      </Page>
    );
  }

  // the contents
  const closeSearch = () => { setQuery(''); setSearching(false); };
  return (
    <Page>
      <TopBar
        title="წმიდანთა ცხოვრება"
        sub={`${listed.length} ცხოვრება`}
        onBack={nav.up}
        right={
          <RoundButton
            label={searching ? 'ძებნის დახურვა' : 'წმიდანის ძებნა'}
            tone={searching ? 'wine' : 'surf'}
            aria-expanded={searching}
            onClick={() => { triggerHaptic(8); if (searching) closeSearch(); else setSearching(true); }}
          >
            {searching ? <X aria-hidden="true" /> : <Search aria-hidden="true" strokeWidth={1.75} />}
          </RoundButton>
        }
      />

      {searching && <SearchPill value={query} onChange={setQuery} placeholder="წმიდანის სახელი" autoFocus onEscape={closeSearch} />}

      {found ? (
        <>
          <SectionLabel label={found.length ? `ნაპოვნია ${found.length === 120 ? '120+' : found.length}` : 'ვერაფერი მოიძებნა'} />
          {found.length > 0 && <Rows>{found.map(l => <LifeRow key={l.id} life={l} sub={whenOf(l)} />)}</Rows>}
        </>
      ) : (
        <>
          {todays.length > 0 && (
            <>
              <SectionLabel label={`დღეს იხსენიებიან · ${dayMonthGe(today)}`} />
              <Rows>{todays.map(l => <LifeRow key={l.id} life={l} />)}</Rows>
            </>
          )}

          {/* the twelve months of the menaion (old style); the one we are in is wine */}
          <SectionLabel label="თვეები" />
          <div className="grid shrink-0 grid-cols-4 gap-2">
            {MONTHS_SHORT_GE.map((short, mi) => {
              const now = mi + 1 === old.month;
              return (
                <Press
                  key={mi}
                  aria-label={`${MONTHS_GE[mi]} — ${perMonth[mi]} ცხოვრება${now ? ' (ახლა)' : ''}`}
                  title={`${MONTHS_GE[mi]} · ${perMonth[mi]}`}
                  aria-current={now ? 'date' : undefined}
                  onClick={() => { triggerHaptic(8); nav.go(`m${mi + 1}`); }}
                  className={cx(
                    'flex h-tap min-w-0 cursor-pointer items-center justify-center rounded-full text-body transition active:scale-[0.97]',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60',
                    now ? 'bg-wine font-bold text-white' : 'bg-surf font-semibold text-ink active:bg-soft',
                  )}
                >
                  {short}
                </Press>
              );
            })}
          </div>

          <Rows>
            {PARTS.map(p => {
              const n = p.id === 'georgian' ? georgian.length : p.id === 'theotokos' ? theotokos.length : movable.length;
              return (
                <Row
                  key={p.id}
                  lead={<Dot icon={<p.Icon />} />}
                  title={p.label}
                  onClick={() => { triggerHaptic(8); nav.go(p.id); }}
                  right={<><Small>{n}</Small><ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={2} /></>}
                />
              );
            })}
          </Rows>
        </>
      )}
    </Page>
  );
};
