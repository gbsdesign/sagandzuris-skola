import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { Waiting } from '../../../components/shell/PageSkeleton';
import { CalendarDay, loadCalendarYearDays } from '../../../data/churchCalendar';
import { MONTHS_GE, MONTHS_SHORT_GE } from '../../../utils/dateNames';
import { NameDay } from '../../../utils/nameDays';
import { nameDayCandidates } from '../../../utils/nameDayMatch';
import { Button, Field, Note, Press, Rows, SectionLabel, Sheet } from '../../../components/ui2';
import { cx, FOCUS_IN } from '../../../components/ui2/cx';

type Candidate = ReturnType<typeof nameDayCandidates>[number];

const isMine = (mine: NameDay | undefined, c: Candidate) => !!mine && mine.month === c.month && mine.day === c.day && mine.saint === c.saint;

/** „ჩემი ანგელოზის დღე“'s window (board x-angelozis-dghe; the old `NameDaySheet` of components/birthdays/MyNameDay.tsx): the
 *  days of the church calendar that name a saint of my (baptismal) name; another name can be typed in. Four days show, the
 *  rest behind „კიდევ N დღე“; a saint's long name is cut, a tap shows it whole and the button that chooses the day. */
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
  const [openKey, setOpenKey] = useState('');
  const [all, setAll] = useState(false);
  useEffect(() => { loadCalendarYearDays().then(setDays, () => setDays({})); }, []);
  const list = useMemo(() => (days && name.trim().length >= 2 ? nameDayCandidates(days, name) : []), [days, name]);

  const pick = async (c: Candidate) => {
    setBusy(c.iso + c.saint); setError('');
    try { await onPick(c); } catch (e) { setError('ვერ შეინახა: ' + ((e as { code?: string })?.code || '')); }
    setBusy('');
  };

  const chosenAt = list.findIndex(c => isMine(mine, c));
  // four days at first (more when the chosen one is further down), the rest behind „კიდევ N დღე“
  const cut = all || list.length <= 5 ? list.length : Math.max(4, chosenAt + 1);
  const rest = list.length - cut;

  return (
    <Sheet open onClose={onClose} title="ანგელოზის დღე">
      <Field label="ნათლობის სახელი" value={name} onChange={v => { setName(v); setOpenKey(''); }} placeholder="მაგ. ნინო" />
      {!days ? (
        <Waiting field={false} rows={4} quiet />
      ) : !list.length ? (
        <Note className="py-4 text-center">
          {name.trim().length < 2 ? 'ჩაწერე სახელი.' : 'ამ სახელით კალენდარში წმინდანი ვერ ვიპოვე — ჩაწერე ნათლობის სახელი.'}
        </Note>
      ) : (
        <>
          <SectionLabel label={`აირჩიე დღე · ${list.length}`} />
          <Rows>
            {list.slice(0, cut).map(c => {
              const key = c.iso + c.saint;
              const chosen = isMine(mine, c);
              const open = openKey === key;
              return (
                <div key={key} className={cx(chosen && 'bg-tint')}>
                  {/* the saint's name is cut to two lines; a tap shows it whole with the button that chooses it */}
                  <Press
                    aria-expanded={open}
                    onClick={() => setOpenKey(open ? '' : key)}
                    className={cx('flex min-h-14 w-full cursor-pointer items-center gap-2.5 py-1.5 pr-3 pl-4 text-left text-ink transition-colors active:bg-soft', FOCUS_IN)}
                  >
                    <span aria-hidden="true" className="flex size-[46px] shrink-0 flex-col items-center justify-center rounded-field bg-tint leading-tight text-wine">
                      <span className="text-lead font-bold tabular-nums">{c.day}</span>
                      <span className="text-cap font-semibold">{MONTHS_SHORT_GE[c.month - 1]}</span>
                    </span>
                    <span className="sr-only">{c.day} {MONTHS_GE[c.month - 1]}:</span>
                    {/* a great commemoration (the calendar's bold line) in bold, as the old window had it */}
                    <span className={cx('min-w-0 flex-1 text-lead leading-tight wrap-break-word', c.feast ? 'font-bold' : 'font-medium', !open && 'line-clamp-2')}>{c.saint}</span>
                    {chosen
                      ? <Check aria-label="არჩეულია" className="size-[18px] shrink-0 text-wine" strokeWidth={2.4} />
                      : <ChevronRight aria-hidden="true" className={cx('size-[18px] shrink-0 text-mut transition-transform', open && 'rotate-90')} />}
                  </Press>
                  {open && (
                    <div className="flex flex-col gap-2 pr-3 pb-3 pl-4">
                      {chosen ? (
                        <Note>ეს არის შენი ანგელოზის დღე.</Note>
                      ) : (
                        <Button full size="md" disabled={!!busy} onClick={() => void pick(c)}>
                          {busy === key ? 'ინახება…' : `${c.day} ${MONTHS_GE[c.month - 1]} — ჩემი დღეა`}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </Rows>
          {rest > 0 && <Button kind="quiet" className="self-center" onClick={() => setAll(true)}>კიდევ {rest} დღე</Button>}
        </>
      )}
      {error && <p role="alert" className="text-meta text-danger">{error}</p>}
      {mine && (
        <Button kind="ghost" full onClick={() => { setBusy('clear'); onClear().catch(() => setBusy('')); }}>
          არჩევანის მოხსნა
        </Button>
      )}
    </Sheet>
  );
};
