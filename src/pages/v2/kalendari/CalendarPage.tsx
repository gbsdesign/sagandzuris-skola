import React, { useMemo, useState } from 'react';
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Waiting } from '../../../components/shell/PageSkeleton';
import { useNavigation } from '../../../context';
import { Card, cx, Dot, FOCUS, Hero, Press, RoundButton, Row, Rows, SectionLabel, TopBar } from '../../../components/ui2';
import {
  addDays, dayMonthGe, oldDayMonthGe, todayIso, useCalendarDay, weekdayGe,
} from '../../../data/churchCalendar';
import { openSaintLife } from '../../../data/saintLives';
import { readingsOf } from '../../../utils/dayReadings';
import { triggerHaptic } from '../../../utils/haptics';
import { feastTitle, inDaysText, ISO_RE, nextGreatFeast, readingShort, saintLife, saintName, saintSub, yearOf } from './calendarBits';
import { DateSheet } from './DateSheet';
import { ReadingsSheet } from './ReadingsSheet';
import { DayText } from './DayText';

// „კალენდარი“ (board x-kalendari): the church calendar as a page of its own in the new look — it was a window over the
// page, opened from the footer. The day is the page's `mapItem` (/p/calendar/<day>); ‹ › and the 📅 window turn it in
// place. On top the day in both styles on one line, then who is commemorated (a tap opens the life), the day's readings,
// the nearest great feast, and under them the day's whole text as the calendar writes it (fasts, notes…).

export const CalendarPage: React.FC = () => {
  const { mapItem, openMapItem, handleGoBack } = useNavigation();
  const today = todayIso();
  const iso = mapItem && ISO_RE.test(mapItem) ? mapItem : today;
  const day = useCalendarDay(iso);
  const [win, setWin] = useState<null | 'date' | 'readings'>(null);

  const go = (next: string) => openMapItem(next === today ? '' : next, true, true);
  const readings = useMemo(() => (day ? readingsOf(day) : []), [day]);
  const feast = useMemo(() => nextGreatFeast(iso), [iso]);
  const feastDay = useCalendarDay(feast?.iso ?? null);

  const title = `${dayMonthGe(iso)}${yearOf(iso) !== yearOf(today) ? ` ${yearOf(iso)}` : ''}`;
  const saints = day?.s ?? [];

  return (
    <div className="flex w-full flex-col gap-3 pb-4">
      <TopBar
        title="კალენდარი"
        onBack={handleGoBack}
        right={<RoundButton label="თარიღის არჩევა" onClick={() => setWin('date')}><CalendarDays strokeWidth={1.75} /></RoundButton>}
      />

      <Card pad="sm">
        <div className="flex items-center gap-2">
          <RoundButton label="წინა დღე" tone="page" onClick={() => go(addDays(iso, -1))}><ChevronLeft strokeWidth={1.75} /></RoundButton>
          <div className="min-w-0 flex-1 text-center" aria-live="polite">
            <div className="sg-fit text-head font-bold">{title}</div>
            <div className="sg-fit text-meta text-mut">
              {weekdayGe(iso)} · ძვ. სტ. {oldDayMonthGe(iso)}
            </div>
          </div>
          <RoundButton label="შემდეგი დღე" tone="page" onClick={() => go(addDays(iso, 1))}><ChevronRight strokeWidth={1.75} /></RoundButton>
        </div>
        {iso !== today && (
          <div className="mt-1 flex justify-center">
            <Press
              onClick={() => go(today)}
              className={cx('flex h-tap cursor-pointer items-center rounded-full px-4 text-meta font-bold text-wine active:bg-tint', FOCUS)}
            >
              დღევანდელ დღეზე
            </Press>
          </div>
        )}
      </Card>

      {day === undefined && (
        <Waiting kind="text" field={false} />
      )}
      {day === null && (
        <Card><p className="text-body text-mut">ამ დღის კალენდარი ჯერ არ დამატებულა.</p></Card>
      )}

      {day && saints.length > 0 && (
        <section className="flex shrink-0 flex-col gap-2">
          <SectionLabel label={iso === today ? 'დღეს იხსენიებიან' : 'ამ დღეს იხსენიებიან'} />
          <Rows>
            {saints.map((s, i) => {
              const life = saintLife(s);
              return (
                <Row
                  key={i}
                  title={saintName(s)}
                  sub={saintSub(s.d)}
                  wrap
                  onClick={life ? () => { triggerHaptic(8); openSaintLife(life); } : undefined}
                />
              );
            })}
          </Rows>
        </section>
      )}

      {day && readings.length > 0 && (
        <Rows>
          <Row
            lead={<Dot icon={<BookOpen />} />}
            title="დღის საკითხავები"
            sub={readings.map(readingShort).join(' · ')}
            onClick={() => setWin('readings')}
          />
        </Rows>
      )}

      {feast && (
        <Press
          onClick={() => go(feast.iso)}
          aria-label={`${feastTitle(feast.great, feastDay)} — ${dayMonthGe(feast.iso)}, ${inDaysText(feast.inDays)}`}
          className={cx('block shrink-0 cursor-pointer rounded-card text-left transition active:scale-[0.99]', FOCUS)}
        >
          <Hero
            kicker={feast.inDays === 0 ? 'დღესასწაული · დღეს' : `უახლოესი დღესასწაული · ${inDaysText(feast.inDays)}`}
            title={feastTitle(feast.great, feastDay)}
            sub={`${dayMonthGe(feast.iso)}${yearOf(feast.iso) !== yearOf(today) ? ` ${yearOf(feast.iso)}` : ''}`}
          />
        </Press>
      )}

      {day && (
        <section className="flex shrink-0 flex-col gap-2">
          <SectionLabel label="დღის სრული ტექსტი" />
          <Card><DayText day={day} /></Card>
        </section>
      )}

      <DateSheet open={win === 'date'} iso={iso} onPick={go} onClose={() => setWin(null)} />
      <ReadingsSheet open={win === 'readings'} readings={readings} onClose={() => setWin(null)} />
    </div>
  );
};
