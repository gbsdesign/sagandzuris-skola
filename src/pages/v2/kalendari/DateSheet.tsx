import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, cx, FOCUS, Press, RoundButton, Sheet } from '../../../components/ui2';
import { fromIso, oldDayMonthGe, todayIso } from '../../../data/churchCalendar';
import { MONTHS_GE } from '../../../utils/dateNames';
import { isGreat, monthGrid, WEEK_SHORT } from './calendarBits';

// The calendar's 📅 (board x-kalendari): one window with the month and its days — it takes the place of the old window's
// two lists (month, day) and its old / new style switch. A great feast has a gold dot; today a ring; the chosen day wine.

export const DateSheet: React.FC<{ open: boolean; iso: string; onPick: (iso: string) => void; onClose: () => void }> = ({
  open, iso, onPick, onClose,
}) => {
  const [at, setAt] = useState(() => ({ y: fromIso(iso).getFullYear(), m: fromIso(iso).getMonth() + 1 }));
  // each opening starts on the chosen day's month
  useEffect(() => {
    if (open) setAt({ y: fromIso(iso).getFullYear(), m: fromIso(iso).getMonth() + 1 });
  }, [open, iso]);
  const today = todayIso();
  const step = (n: number) => setAt(({ y, m }) => {
    const t = m + n;
    return t < 1 ? { y: y - 1, m: 12 } : t > 12 ? { y: y + 1, m: 1 } : { y, m: t };
  });
  const cells = monthGrid(at.y, at.m);
  const pick = (d: string) => { onPick(d); onClose(); };

  return (
    <Sheet open={open} title="თარიღის არჩევა" onClose={onClose}>
      <div className="flex shrink-0 flex-col gap-2 rounded-card bg-surf p-3">
        <div className="flex items-center gap-2">
          <RoundButton label="წინა თვე" tone="page" onClick={() => step(-1)}><ChevronLeft strokeWidth={1.75} /></RoundButton>
          <div aria-live="polite" className="min-w-0 flex-1 text-center text-head font-bold">{MONTHS_GE[at.m - 1]} {at.y}</div>
          <RoundButton label="შემდეგი თვე" tone="page" onClick={() => step(1)}><ChevronRight strokeWidth={1.75} /></RoundButton>
        </div>
        <div role="grid" aria-label={`${MONTHS_GE[at.m - 1]} ${at.y}`} className="grid grid-cols-7 gap-y-1">
          {WEEK_SHORT.map((w, i) => (
            <div key={w} role="columnheader" className={cx('pb-1 text-center text-cap font-semibold', i === 6 ? 'text-wine' : 'text-mut')}>{w}</div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} aria-hidden="true" />;
            const chosen = d === iso;
            const isToday = d === today;
            const sunday = i % 7 === 6;
            const great = isGreat(d);
            return (
              <Press
                key={d}
                role="gridcell"
                aria-selected={chosen}
                aria-label={`${Number(d.slice(8))} ${MONTHS_GE[at.m - 1]}${isToday ? ', დღეს' : ''}${great ? ', დიდი დღესასწაული' : ''} · ძვ. სტ. ${oldDayMonthGe(d)}`}
                onClick={() => pick(d)}
                className={cx('group flex h-tap cursor-pointer items-center justify-center', 'focus-visible:outline-none')}
              >
                <span className={cx(
                  'relative flex size-10 items-center justify-center rounded-full text-body font-semibold tabular-nums transition',
                  'group-active:scale-95 group-focus-visible:outline-2 group-focus-visible:outline-offset-1 group-focus-visible:outline-wine/60',
                  chosen ? 'bg-wine font-bold text-white' : isToday ? 'ring-2 ring-wine text-wine' : sunday ? 'text-wine' : 'text-ink',
                )}>
                  {Number(d.slice(8))}
                  {great && (
                    <span aria-hidden="true" className={cx('absolute bottom-1 size-1.5 rounded-full', chosen ? 'bg-white' : 'bg-gold')} />
                  )}
                </span>
              </Press>
            );
          })}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 px-1.5 text-meta text-mut">
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-gold" />
        <span className="min-w-0">დიდი დღესასწაული</span>
      </div>
      <Button kind="ghost" full disabled={iso === today} onClick={() => pick(today)} className={FOCUS}>დღეს</Button>
    </Sheet>
  );
};
