import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { Button, Note, Row, Rows, Sheet, Stats, TopBar, Val, WrapChips } from '../../../components/ui2';
import { WORK_DAYS, WORK_HOURS, WorkSchedule, hoursOf } from '../../../components/views/WorkScheduleEditor';
import { ErrorLine } from './parts';
import { saveSchedule, useProfileDoc } from './profileStore';

// x-mushaobis-ganrigi — „მუშაობის განრიგი“ (profile mapItem `ganrigi`): the week at a glance — which day, which hours —
// and two numbers under it. The eighteen hours (06:00–23:00, an hour each — the old editor's, `profile.workSchedule`
// { 'ორშ': '09:00, 10:00' }) show only for the day touched, in a window; each tap is kept at once.

/** „19:00 – 21:00, 22:00 – 23:00“: the chosen hours joined into runs */
export const runsOf = (hours: string[]) => {
  const n = hours.map(h => parseInt(h, 10)).sort((a, b) => a - b);
  const runs: [number, number][] = [];
  for (const h of n) {
    const last = runs[runs.length - 1];
    if (last && last[1] === h) last[1] = h + 1;
    else runs.push([h, h + 1]);
  }
  const t = (x: number) => `${String(x).padStart(2, '0')}:00`;
  return runs.map(([a, b]) => `${t(a)} – ${t(b)}`).join(', ');
};

/** a day's hours at a row's end: one run a line, so a day of several runs never pushes the row wider */
const Runs: React.FC<{ hours: string[] }> = ({ hours }) => (
  <span className="flex shrink-0 items-center gap-1">
    <span className="flex flex-col items-end text-meta leading-snug font-semibold whitespace-nowrap text-wine tabular-nums">
      {runsOf(hours).split(', ').map(r => <span key={r}>{r}</span>)}
    </span>
    <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={2} />
  </span>
);

export const ScheduleScreen: React.FC = () => {
  const { user } = useAuth();
  const { handleGoBack } = useNavigation();
  const me = useProfileDoc();
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { if (me.data !== undefined && !schedule) setSchedule(me.profile.workSchedule || {}); }, [me.data, me.profile.workSchedule, schedule]);

  if (!user) return null;
  const s = schedule || {};
  const days = WORK_DAYS.filter(d => hoursOf(s, d.id).length > 0);
  const total = WORK_DAYS.reduce((n, d) => n + hoursOf(s, d.id).length, 0);
  const open = WORK_DAYS.find(d => d.id === day);

  const setHours = (dayId: string, hours: string[]) => {
    const out = { ...s };
    const sorted = [...hours].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    if (sorted.length) out[dayId] = sorted.join(', ');
    else delete out[dayId];
    setSchedule(out);
    setError('');
    saveSchedule(user, out).catch(() => setError('ვერ შეინახა — შეამოწმე ინტერნეტი.'));
  };

  return (
    <div className="flex w-full flex-col gap-3 pb-5">
      <TopBar title="მუშაობის განრიგი" onBack={handleGoBack} />
      <Note>აირჩიე მინიმუმ 2 დღე. შეეხე დღეს — საათებს აირჩევ.</Note>
      <Rows aria-busy={!schedule}>
        {WORK_DAYS.map(d => {
          const hours = hoursOf(s, d.id);
          return (
            <Row key={d.id} title={d.full} onClick={() => setDay(d.id)}
              right={hours.length ? <Runs hours={hours} /> : <Val>არ არის</Val>} />
          );
        })}
      </Rows>
      <Stats items={[
        { value: days.length, label: 'დღე' },
        { value: `${total} სთ`, label: 'კვირაში' },
      ]} />
      {days.length === 1 && <Note>კიდევ ერთი დღე აირჩიე.</Note>}
      {error && <ErrorLine>{error}</ErrorLine>}

      <Sheet open={!!open} title={open?.full || ''} onClose={() => setDay(null)}>
        {open && (
          <>
            <Note>მონიშნე საათები — თითო საათი ერთი საათის მუშაობაა.</Note>
            <WrapChips label={`${open.full} — საათები`} items={WORK_HOURS.map(h => ({ id: h, label: h }))}
              value={hoursOf(s, open.id)} onChange={v => setHours(open.id, v)} />
            <Button full className="mt-2" onClick={() => setDay(null)}>მზადაა</Button>
          </>
        )}
      </Sheet>
    </div>
  );
};
