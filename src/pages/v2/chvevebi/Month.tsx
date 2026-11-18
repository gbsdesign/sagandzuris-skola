import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Button, Card, cx } from '../../../components/ui2';
import { HabitsModel } from '../../../components/habits/useHabits';
import { MONTHS_GE, WEEKDAYS_GE, WEEKDAYS_SHORT_GE } from '../../../utils/dateNames';
import { canTickDay, dayKey } from '../../../utils/habitsWeek';
import { dayState, monthWeeks, parseDay } from '../../../utils/habitStats';
import { setHabitsDate, useHabitsNav } from './nav';
import { PeriodNav } from './PeriodNav';

// „თვე“ (x-chvevebi-tve): the month as a calendar (Sunday first, as the habits' week), a day's circle shaded by the share of
// the daily habits done; under it the picked day and „✓ მონიშვნა“.

const shade = (share: number) =>
  share >= 1 ? 'bg-wine/70 text-white' : share >= 0.5 ? 'bg-wine/45 text-ink' : share > 0 ? 'bg-wine/25 text-ink' : 'bg-transparent text-mut';

export const MonthView: React.FC<{ model: HabitsModel }> = ({ model }) => {
  const { back } = useHabitsNav();
  const [offset, setOffset] = useState(0);
  const [picked, setPicked] = useState(() => dayKey(new Date()));
  const now = new Date();
  const today = dayKey(now);
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const weeks = monthWeeks(month.getFullYear(), month.getMonth());
  const firstMonth = model.first ? parseDay(model.first) : now;
  const canPrev = month.getFullYear() * 12 + month.getMonth() > firstMonth.getFullYear() * 12 + firstMonth.getMonth();
  const chosen = weeks.flat().find(d => d && dayKey(d) === picked) ?? null;
  const s = chosen ? dayState(model.log, model.dailyIds, chosen) : null;

  const mark = () => { if (chosen) { setHabitsDate(chosen); back(); } };

  return (
    <>
      <PeriodNav
        title={`${MONTHS_GE[month.getMonth()]} ${month.getFullYear()}`}
        sub={offset === 0 ? 'ეს თვე' : undefined}
        onPrev={canPrev ? () => setOffset(o => o - 1) : undefined}
        onNext={offset < 0 ? () => setOffset(o => o + 1) : undefined}
      />

      <Card pad="sm">
        <div className="grid grid-cols-7 gap-y-1.5 text-center">
          {WEEKDAYS_SHORT_GE.map(w => <span key={w} className="pb-1 text-cap text-mut">{w}</span>)}
          {weeks.flat().map((d, i) => {
            if (!d) return <span key={i} />;
            const key = dayKey(d);
            const future = key > today;
            const share = future ? 0 : dayState(model.log, model.dailyIds, d).share;
            const isToday = key === today;
            return (
              <button
                key={i}
                type="button"
                disabled={future}
                aria-pressed={key === picked}
                aria-label={`${d.getDate()} ${MONTHS_GE[d.getMonth()]}`}
                onClick={() => setPicked(key)}
                className="mx-auto flex size-11 items-center justify-center rounded-full enabled:cursor-pointer"
              >
                <span className={cx(
                  'flex size-10 items-center justify-center rounded-full text-body font-bold tabular-nums',
                  isToday ? 'bg-wine text-white' : shade(share),
                  key === picked && 'ring-2 ring-wine ring-offset-2 ring-offset-surf',
                  future && 'text-faint',
                )}>
                  {d.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {chosen && s && (
        <Card className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-lead font-bold wrap-break-word">{WEEKDAYS_GE[chosen.getDay()]}, {chosen.getDate()} {MONTHS_GE[chosen.getMonth()]}</div>
            <div className="text-meta text-mut tabular-nums">{s.done} / {s.total} ჩვევა</div>
          </div>
          <Button icon={<Check />} disabled={!canTickDay(chosen)} onClick={mark}>მონიშვნა</Button>
        </Card>
      )}
      <p className="px-1.5 text-meta leading-normal text-mut">რაც უფრო მუქია დღე, მით მეტი ჩვევა შესრულდა.</p>
    </>
  );
};
