import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Button, Hero, Note, Press, RoundButton, Row, Rows, SectionLabel, Sheet, TopBar, cx } from '../../../components/ui2';
import { triggerHaptic } from '../../../utils/haptics';
import { FEAST_GROUPS, Feast, feastDates, feastUrl } from '../../../data/library/feasts';
import { dayMonthGe, daysBetween, fromIso, oldDayMonthGe, openChurchCalendar, todayIso, weekdayGe } from '../../../data/churchCalendar';
import { DateTile, Page } from './parts';

// x-dghesastsaulebi — the feasts in the new look: the nearest one on a wine card, then the year's feasts in date order, each one
// line with its date tile. A tap opens the feast's own window: its day, the old-style date, how it is counted, its other days,
// the calendar and orthodoxy.ge's article. A group named by a home button („feasts:2“) shows only that group.

const inDays = (n: number) => (n === 0 ? 'დღეს' : n === 1 ? 'ხვალ' : `${n} დღეში`);

type Item = { feast: Feast; group: number; iso: string; all: string[] };

/** the feast's window: everything the old list's row said */
const FeastSheet: React.FC<{ item: Item | null; today: string; onClose: () => void }> = ({ item, today, onClose }) => {
  if (!item) return null;
  const { feast, iso, all } = item;
  const url = feastUrl(feast);
  const ahead = iso >= today ? daysBetween(today, iso) : null;
  const go = (d: string) => { triggerHaptic(8); onClose(); openChurchCalendar(d); };
  return (
    <Sheet open title={feast.short ?? feast.name} onClose={onClose}>
      {feast.short && feast.short !== feast.name && <p className="px-1 font-serif-ge text-lead leading-snug text-ink wrap-break-word">{feast.name}</p>}
      <Rows>
        <Row
          lead={<DateTile iso={iso} tone={iso === today ? 'wine' : iso < today ? 'soft' : 'tint'} />}
          title={`${dayMonthGe(iso)}, ${weekdayGe(iso)}`}
          sub={ahead !== null ? inDays(ahead) : 'წელს უკვე იყო'}
          wrap
        />
        {feast.fixed && !feast.fromEaster
          ? <Row title={`ძველი სტილით ${oldDayMonthGe(iso)}`} sub="უძრავი დღესასწაული" wrap />
          : feast.rule && <Row title={feast.rule} sub="მოძრავი დღესასწაული" wrap />}
        {/* feasts kept twice a year (St Nino, Mtskheta, Queen Tamar): the other day too */}
        {all.filter(d => d !== iso).map(d => (
          <Row key={d} title={`ასევე ${dayMonthGe(d)}`} sub={weekdayGe(d)} onClick={() => go(d)} />
        ))}
      </Rows>
      <Button kind="primary" full icon={<CalendarDays aria-hidden="true" />} onClick={() => go(iso)}>კალენდარში ნახვა</Button>
      {url && <Button kind="ghost" full icon={<ExternalLink aria-hidden="true" />} href={url} target="_blank">ვრცლად orthodoxy.ge-ზე</Button>}
    </Sheet>
  );
};

/** `group`: a group a home button names („2“) — only its feasts */
export const FeastsV2: React.FC<{ group?: string | null; onAll: () => void; onBack: () => void }> = ({ group, onAll, onBack }) => {
  const today = todayIso();
  const thisYear = fromIso(today).getFullYear();
  const [year, setYear] = useState(thisYear);
  const [picked, setPicked] = useState<Item | null>(null);
  const gi = group != null && group !== '' ? Number(group) : null;
  const only = gi !== null && FEAST_GROUPS[gi] ? gi : null;

  // the nearest feast from today (into next year once this year's are over)
  const next = useMemo(() => {
    let best: Item | null = null;
    for (const y of [thisYear, thisYear + 1])
      FEAST_GROUPS.forEach((g, i) => g.feasts.forEach(f => {
        const all = feastDates(f, y);
        for (const d of all) if (d >= today && (!best || d < best.iso)) best = { feast: f, group: i, iso: d, all };
      }));
    return best as Item | null;
  }, [today, thisYear]);

  // the year's feasts by date; a feast kept twice shows on its next day (or its first, once both are over)
  const items = useMemo(() => {
    const out: Item[] = [];
    FEAST_GROUPS.forEach((g, i) => {
      if (only !== null && i !== only) return;
      g.feasts.forEach(f => {
        const all = feastDates(f, year);
        if (!all.length) return;
        out.push({ feast: f, group: i, iso: all.find(d => d >= today) ?? all[0], all });
      });
    });
    return out.sort((a, b) => a.iso.localeCompare(b.iso));
  }, [year, today, only]);

  const step = (n: number) => { triggerHaptic(8); setYear(y => y + n); };
  const g = only !== null ? FEAST_GROUPS[only] : null;

  return (
    <Page>
      <TopBar title="დღესასწაულები" sub={g ? `${g.title}${g.subtitle ? ` · ${g.subtitle}` : ''}` : undefined} onBack={onBack} />

      {next && only === null && (
        <Hero
          kicker={`უახლოესი · ${inDays(daysBetween(today, next.iso))}`}
          title={next.feast.name}
          sub={`${dayMonthGe(next.iso)}, ${weekdayGe(next.iso)}`}
          action={{ label: 'ვრცლად', icon: <CalendarDays aria-hidden="true" />, onClick: () => { triggerHaptic(8); setPicked(next); } }}
        />
      )}

      <SectionLabel
        label={`${year} წელი`}
        right={
          <span className="flex items-center gap-1">
            {year !== thisYear && (
              <Press onClick={() => { triggerHaptic(8); setYear(thisYear); }} className="h-tap cursor-pointer rounded-full px-2 text-meta font-semibold text-wine">
                ამ წელს
              </Press>
            )}
            <RoundButton label="წინა წელი" size={36} tone="plain" onClick={() => step(-1)}><ChevronLeft aria-hidden="true" /></RoundButton>
            <RoundButton label="შემდეგი წელი" size={36} tone="plain" onClick={() => step(1)}><ChevronRight aria-hidden="true" /></RoundButton>
          </span>
        }
      />
      <Rows>
        {items.map(it => {
          const past = it.all.every(d => d < today) && year <= thisYear;
          return (
            <Row
              key={it.feast.name}
              className={cx(past && 'opacity-70')}
              lead={<DateTile iso={it.iso} tone={it.iso === today ? 'wine' : past ? 'soft' : 'tint'} />}
              title={it.feast.short ?? it.feast.name}
              wrap
              aria-label={`${it.feast.name}, ${dayMonthGe(it.iso)}`}
              onClick={() => { triggerHaptic(8); setPicked({ ...it }); }}
            />
          );
        })}
      </Rows>
      {g && (
        <Press onClick={() => { triggerHaptic(8); onAll(); }} className="h-tap shrink-0 cursor-pointer self-center rounded-full px-4 text-body font-bold text-wine">
          ყველა დღესასწაული
        </Press>
      )}
      <Note>თარიღები ახალი სტილითაა; მოძრავი დღესასწაულები ყოველ წელს აღდგომით ითვლება.</Note>

      <FeastSheet item={picked} today={today} onClose={() => setPicked(null)} />
    </Page>
  );
};
