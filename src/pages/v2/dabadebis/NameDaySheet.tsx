import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { CalendarDay, loadCalendarYearDays } from '../../../data/churchCalendar';
import { MONTHS_SHORT_GE } from '../../../utils/dateNames';
import { NameDay } from '../../../utils/nameDays';
import { nameDayCandidates } from '../../../utils/nameDayMatch';
import { Button, Field, Note, Press, Sheet } from '../../../components/ui2';
import { cx } from '../../../components/ui2/cx';

type Candidate = ReturnType<typeof nameDayCandidates>[number];

/** „ჩემი ანგელოზის დღე“'s window (the old `NameDaySheet` of components/birthdays/MyNameDay.tsx): the days of the church
 *  calendar that name a saint of my (baptismal) name; another name can be typed in. */
export const NameDaySheetV2: React.FC<{
  first: string;
  mine?: NameDay;
  onPick: (c: Candidate) => Promise<void>;
  onClear: () => Promise<void>;
  onClose: () => void;
}> = ({ first, mine, onPick, onClear, onClose }) => {
  const [name, setName] = useState(first);
  const [days, setDays] = useState<Record<string, CalendarDay> | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { loadCalendarYearDays().then(setDays, () => setDays({})); }, []);
  const list = useMemo(() => (days && name.trim().length >= 2 ? nameDayCandidates(days, name) : []), [days, name]);

  const pick = async (c: Candidate) => {
    setBusy(c.iso + c.saint); setError('');
    try { await onPick(c); } catch (e) { setError('ვერ შეინახა: ' + ((e as { code?: string })?.code || '')); }
    setBusy('');
  };

  return (
    <Sheet open onClose={onClose} title="ანგელოზის დღე">
      <Field label="სახელი (ნათლობის)" value={name} onChange={setName} placeholder="მაგ. ნინო" />
      {!days ? (
        <div className="flex justify-center py-8"><Loader2 aria-hidden="true" className="size-6 animate-spin text-wine" /></div>
      ) : !list.length ? (
        <Note className="py-4 text-center">
          {name.trim().length < 2 ? 'ჩაწერე სახელი.' : 'ამ სახელით კალენდარში წმინდანი ვერ ვიპოვე — ჩაწერე ნათლობის სახელი.'}
        </Note>
      ) : (
        <>
          <Note>აირჩიე შენი წმინდანის დღე ({list.length})</Note>
          <ul className="flex flex-col gap-2">
            {list.map(c => {
              const chosen = !!mine && mine.month === c.month && mine.day === c.day && mine.saint === c.saint;
              return (
                <li key={c.iso + c.saint}>
                  <Press
                    onClick={() => pick(c)}
                    disabled={!!busy}
                    className={cx(
                      'flex w-full cursor-pointer items-center gap-3 rounded-tile px-3 py-2.5 text-left transition-colors disabled:opacity-60',
                      chosen ? 'bg-tint' : 'bg-surf active:bg-soft',
                    )}
                  >
                    <span className={cx(
                      'flex size-12 shrink-0 flex-col items-center justify-center rounded-field leading-none',
                      c.feast ? 'bg-wine text-white' : 'bg-tint text-wine',
                    )}>
                      <span className="text-lead font-bold tabular-nums">{c.day}</span>
                      <span className="mt-0.5 text-cap font-semibold">{MONTHS_SHORT_GE[c.month - 1]}</span>
                    </span>
                    <span className={cx('min-w-0 flex-1 text-body leading-snug wrap-break-word', c.feast && 'font-bold')}>
                      {busy === c.iso + c.saint ? 'ინახება…' : c.saint}
                    </span>
                  </Press>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {error && <p className="text-meta text-danger">{error}</p>}
      {mine && (
        <Button kind="ghost" full onClick={() => { setBusy('clear'); onClear().catch(() => setBusy('')); }}>
          არჩევანის მოხსნა
        </Button>
      )}
    </Sheet>
  );
};
