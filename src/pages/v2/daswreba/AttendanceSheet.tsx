import React, { useMemo, useState } from 'react';
import { Check, CheckCheck, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../../../context';
import { Avatar, Bar, Button, Chips, Press, RoundButton, Row, Rows, SectionLabel, Seg, Sheet, Small, Stats } from '../../../components/ui2';
import { cx } from '../../../components/ui2/cx';
import { Waiting } from '../../../components/shell/PageSkeleton';
import type { SchoolClass } from '../../../hooks/useClasses';
import { localIso, saveAttendance, useAttendanceState, type AttendanceDay } from '../../../hooks/useTeaching';
import { attendanceStats, latestLessonDay, stepLessonDay } from '../../../utils/attendanceStats';
import { MONTHS_GE, WEEKDAYS_GE } from '../../../utils/dateNames';
import { triggerHaptic } from '../../../utils/haptics';

// „დასწრება“ (2026-11-22, the user: „ეს გაუგებარია … მარტივად კლასების მიხედვით ვნიშნავდე დასწრებას და მერე სტატისტიკასაც
// ვხედავდე“): one window — the class (when one leads several), „მონიშვნა“ (a lesson day, „ყველა მოვიდა“, a tap on a name) and
// „სტატისტიკა“ (the class's share, each member's share with the newest lessons they missed in a row, the lessons themselves).
// The record is the teachers' own (classes/{id}/attendance/{day}); a tap saves at once.

type Tab = 'mark' | 'stats';
const TABS: { id: Tab; label: string }[] = [{ id: 'mark', label: 'მონიშვნა' }, { id: 'stats', label: 'სტატისტიკა' }];

const partsOf = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return { wd: new Date(y, m - 1, d).getDay(), m, d }; };
const dayWords = (iso: string) => {
  if (iso === localIso()) return 'დღეს';
  const { wd, m, d } = partsOf(iso);
  return `${WEEKDAYS_GE[wd]}, ${d} ${MONTHS_GE[m - 1]}`;
};

export const AttendanceSheet: React.FC<{ classes: SchoolClass[]; open: boolean; onClose: () => void; first?: string }> = ({
  classes, open, onClose, first,
}) => {
  const [pick, setPick] = useState(first ?? '');
  const [tab, setTab] = useState<Tab>('mark');
  const cls = classes.find(c => c.id === pick) ?? classes[0];
  if (!cls) return null;
  return (
    <Sheet open={open} onClose={onClose} title="დასწრება">
      <div className="flex flex-col gap-3">
        {classes.length > 1 && (
          <Chips label="კლასი" items={classes.map(c => ({ id: c.id, label: c.name }))} value={cls.id} onChange={setPick} />
        )}
        <Seg label="დასწრება" items={TABS} value={tab} onChange={setTab} />
        {open && <ClassBody key={cls.id} cls={cls} tab={tab} onTab={setTab} />}
      </div>
    </Sheet>
  );
};

const ClassBody: React.FC<{ cls: SchoolClass; tab: Tab; onTab: (t: Tab) => void }> = ({ cls, tab, onTab }) => {
  const { days, ready } = useAttendanceState(cls.id, 60);
  const weekdays = useMemo(() => cls.schedule.map(s => s.day), [cls.schedule]);
  const [date, setDate] = useState(() => latestLessonDay(weekdays, localIso()));
  if (!ready) return <Waiting field={false} rows={4} quiet />;
  return tab === 'mark'
    ? <Mark cls={cls} days={days} weekdays={weekdays} date={date} onDate={setDate} />
    : <Numbers cls={cls} days={days} onLesson={d => { setDate(d); onTab('mark'); }} />;
};

const Mark: React.FC<{ cls: SchoolClass; days: AttendanceDay[]; weekdays: number[]; date: string; onDate: (d: string) => void }> = ({
  cls, days, weekdays, date, onDate,
}) => {
  const { user } = useAuth();
  const [err, setErr] = useState('');
  const today = localIso();
  const saved = days.find(d => d.date === date);
  const present = saved?.present ?? [];
  const total = cls.members.length;
  const came = cls.members.filter(m => present.includes(m.uid)).length;
  const all = total > 0 && came >= total;
  const write = async (next: string[]) => {
    if (!user) return;
    setErr('');
    try {
      await saveAttendance(cls.id, date, next, user.uid);
    } catch {
      setErr('დასწრება ვერ შეინახა. სცადე ხელახლა.');
    }
  };
  const toggle = (uid: string) => {
    triggerHaptic(10);
    write(present.includes(uid) ? present.filter(x => x !== uid) : [...present, uid]);
  };
  const back = stepLessonDay(weekdays, date, -1, today);
  const fore = stepLessonDay(weekdays, date, 1, today);
  return (
    <>
      <div className="flex items-center gap-2">
        <RoundButton label="წინა გაკვეთილი" disabled={back === date} onClick={() => onDate(back)}><ChevronLeft /></RoundButton>
        <div className="flex min-w-0 flex-1 flex-col items-center text-center">
          <span className="max-w-full truncate text-lead font-bold">{dayWords(date)}</span>
          <span className={cx('text-meta', saved && present.length ? 'font-bold text-leaf-ink' : 'text-mut')}>
            {saved && present.length ? `მოვიდა ${came} / ${total}` : 'ჯერ არ მონიშნულა'}
          </span>
        </div>
        <RoundButton label="შემდეგი გაკვეთილი" disabled={fore === date} onClick={() => onDate(fore)}><ChevronRight /></RoundButton>
      </div>
      {total > 0 && (
        <Button full kind={all ? 'ghost' : 'primary'} icon={all ? <X /> : <CheckCheck />}
          onClick={() => { triggerHaptic(12); write(all ? [] : cls.members.map(m => m.uid)); }}>
          {all ? 'მონიშვნის მოხსნა' : 'ყველა მოვიდა'}
        </Button>
      )}
      {err && <p role="alert" className="text-center text-meta text-danger">{err}</p>}
      {total === 0 ? <Small tone="mut" className="px-1.5">კლასში ჯერ წევრი არ არის.</Small> : (
        <>
          <SectionLabel label="შეეხე სახელს — მოვიდა" />
          <Rows>
            {cls.members.map(m => {
              const on = present.includes(m.uid);
              return (
                <Press key={m.uid} aria-pressed={on} aria-label={`${m.name} — ${on ? 'მოვიდა' : 'არ მოსულა'}`} onClick={() => toggle(m.uid)}
                  className="flex min-h-row w-full cursor-pointer items-center gap-2.5 py-2 pr-3 pl-4 text-left text-ink transition-colors active:bg-soft">
                  <Avatar name={m.name} photo={m.photoURL} />
                  <span className="min-w-0 flex-1 text-body font-semibold wrap-break-word">{m.name}</span>
                  <span className={cx('flex size-[30px] shrink-0 items-center justify-center rounded-full', on ? 'bg-leaf text-white' : 'border-[1.5px] border-dim')}>
                    {on && <Check className="size-[58%]" strokeWidth={2.6} aria-hidden="true" />}
                  </span>
                </Press>
              );
            })}
          </Rows>
        </>
      )}
    </>
  );
};

const toneOf = (pct: number) => (pct >= 75 ? 'leaf' : pct >= 50 ? 'gold' : 'wine');

const Numbers: React.FC<{ cls: SchoolClass; days: AttendanceDay[]; onLesson: (d: string) => void }> = ({ cls, days, onLesson }) => {
  const s = useMemo(() => attendanceStats(days, cls.members.map(m => m.uid)), [days, cls.members]);
  const total = cls.members.length;
  if (!s.lessons.length) {
    return <Small tone="mut" className="px-1.5 text-center">ჯერ არცერთი გაკვეთილი არ მონიშნულა. „მონიშვნაში“ აღნიშნე, ვინ მოვიდა — აქ დათვლის.</Small>;
  }
  const nameOf = new Map(cls.members.map(m => [m.uid, m]));
  const order = [...s.members].sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0) || (nameOf.get(a.uid)?.name || '').localeCompare(nameOf.get(b.uid)?.name || '', 'ka'));
  return (
    <>
      <Stats items={[
        { value: `${s.average ?? 0}%`, label: 'საშუალოდ დადის' },
        { value: s.lessons.length, label: 'გაკვეთილი' },
        { value: `${s.lessons[0].came} / ${total}`, label: 'ბოლო გაკვეთილზე' },
      ]} />
      <SectionLabel label="წევრები · ნაკლებად დამსწრე თავში" />
      <Rows>
        {order.map(r => {
          const m = nameOf.get(r.uid);
          const pct = r.pct ?? 0;
          return (
            <div key={r.uid} className="flex min-h-row w-full items-center gap-2.5 py-2.5 pr-4 pl-4 text-ink">
              <Avatar name={m?.name || ''} photo={m?.photoURL} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-body font-semibold wrap-break-word">{m?.name}</span>
                <Bar value={pct / 100} tone={toneOf(pct)} h={5} label={`${m?.name}: ${pct}%`} />
                <span className="text-cap text-mut">
                  {r.came} / {r.of} გაკვეთილი
                  {r.missedRow >= 2 && <span className="font-bold text-gold-ink"> · ბოლო {r.missedRow} გააცდინა</span>}
                </span>
              </div>
              <span className="shrink-0 text-lead font-bold tabular-nums">{pct}%</span>
            </div>
          );
        })}
      </Rows>
      <SectionLabel label="გაკვეთილები" />
      <Rows>
        {s.lessons.slice(0, 12).map(l => (
          <Row key={l.date} title={dayWords(l.date)} sub={`მოვიდა ${l.came} / ${total}`} onClick={() => onLesson(l.date)} />
        ))}
      </Rows>
    </>
  );
};
