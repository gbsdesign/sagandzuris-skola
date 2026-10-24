import React, { useMemo, useState } from 'react';
import { CalendarDays, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '../../context';
import { SchoolClass } from '../../hooks/useClasses';
import { AttendanceDay, localIso, saveAttendance, shortDate, useAttendance, weekdayOf } from '../../hooks/useTeaching';
import { Btn, Flash, useFlash } from '../ui/kit';
import { triggerHaptic } from '../../utils/haptics';
import { WEEKDAYS_GE, WEEKDAYS_SHORT_GE } from '../../utils/dateNames';

/** The latest days (up to `count`) that fall on the class's lesson weekdays, today first. */
const recentLessonDays = (cls: SchoolClass, count = 4) => {
  const days = new Set(cls.schedule.map(s => s.day));
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < 21 && out.length < count; i++) {
    if (!days.size || days.has(d.getDay())) out.push(localIso(d));
    d.setDate(d.getDate() - 1);
  }
  return out;
};

// "დასწრება", marked right in the class's students list: the chosen day, who came (one tap per student,
// saved at once); `last` = the latest 8 lessons, for each student's record.
export const useClassAttendance = (cls: SchoolClass) => {
  const { user } = useAuth();
  const msg = useFlash();
  const history = useAttendance(cls.id);
  const choices = useMemo(() => recentLessonDays(cls), [cls]);
  const [date, setDate] = useState(choices[0] || localIso());
  const saved = history.find(h => h.date === date);
  const present = saved?.present || [];

  const write = async (next: string[]) => {
    if (!user) return;
    try {
      await saveAttendance(cls.id, date, next, user.uid);
    } catch {
      msg.fail('დასწრება ვერ შეინახა.');
    }
  };

  return {
    last: history.slice(0, 8),
    choices, date, setDate, marked: !!saved, present, msg,
    toggle: (uid: string) => write(present.includes(uid) ? present.filter(x => x !== uid) : [...present, uid]),
    allCame: () => write(cls.members.map(m => m.uid)),
    clear: () => write([]),
  };
};
export type ClassAttendance = ReturnType<typeof useClassAttendance>;

/** The day being marked: the latest lesson days, any other through 📅 (then shown as a day of its own); below — how
 *  many came. */
export const AttendanceDays: React.FC<{ a: ClassAttendance; total: number }> = ({ a, total }) => {
  const days = a.choices.includes(a.date) ? a.choices : [...a.choices, a.date];
  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-1.5">
        {days.map(d => (
          <button key={d} type="button" onClick={() => a.setDate(d)} aria-pressed={d === a.date}
            className={`h-9 px-3 rounded-full text-[13px] font-bold cursor-pointer transition ${d === a.date ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'}`}>
            {d === localIso() ? 'დღეს' : `${WEEKDAYS_SHORT_GE[weekdayOf(d)]}, ${shortDate(d)}`}
          </button>
        ))}
        {/* the date field lies unseen over the round button and opens the device's own calendar */}
        <label title="სხვა დღე" className="relative w-9 h-9 shrink-0 rounded-full bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#7a2028] flex items-center justify-center cursor-pointer transition">
          <CalendarDays className="w-4 h-4" />
          <input type="date" value={a.date} max={localIso()} aria-label="სხვა დღე"
            onChange={e => e.target.value && a.setDate(e.target.value)}
            onClick={e => { try { e.currentTarget.showPicker(); } catch { /* the browser opens its own */ } }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </label>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <p className="flex-1 min-w-40 text-[13px] text-[#8a7a6a]">
          {WEEKDAYS_GE[weekdayOf(a.date)]}, {shortDate(a.date)} ·{' '}
          {a.marked ? <span className="font-bold text-emerald-800 tabular-nums">მოვიდა {a.present.length}/{total}</span> : 'ჯერ არ მონიშნულა'}
        </p>
        {a.present.length < total && <Btn kind="soft" size="sm" icon={<CheckCheck />} onClick={a.allCame}>ყველა მოვიდა</Btn>}
        {a.present.length > 0 && <Btn kind="ghost" size="sm" onClick={a.clear}>გასუფთავება</Btn>}
      </div>
      {a.msg.flash && <div className="mt-2.5"><Flash flash={a.msg.flash} onClose={a.msg.clear} /></div>}
    </div>
  );
};

/** The round ✓ on a student's card: came to the chosen day's lesson. */
export const CameCheck: React.FC<{ on: boolean; name: string; onToggle: () => void; className?: string }> = ({ on, name, onToggle, className = '' }) => (
  <button type="button" onClick={() => { triggerHaptic(10); onToggle(); }} aria-pressed={on} aria-label={`${name} — მოვიდა`} title={on ? 'მოვიდა' : 'მონიშნე: მოვიდა'}
    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all duration-200 active:scale-90 ${on ? 'bg-emerald-600 text-white shadow-[0_4px_12px_-4px_rgba(5,150,105,0.75)]' : 'bg-[#f6efe3] text-[#cdbb9f] hover:bg-emerald-50 hover:text-emerald-600'} ${className}`}>
    <Check className={`w-[18px] h-[18px] stroke-[3] transition-transform duration-200 ${on ? 'scale-100' : 'scale-90'}`} />
  </button>
);

/** A student's latest lessons, oldest first: green — came. */
export const AttendanceStrip: React.FC<{ uid: string; last: AttendanceDay[] }> = ({ uid, last }) => {
  const came = last.filter(d => d.present.includes(uid)).length;
  return (
    <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-3.5">
      <p className="text-[13px] font-bold text-[#75685a] mb-2">
        დასწრება{last.length > 0 && ` · ბოლო ${last.length} გაკვეთილი · ${came}/${last.length}`}
      </p>
      {last.length === 0 ? (
        <p className="text-sm text-[#8a7a6a]">ჯერ არ მონიშნულა.</p>
      ) : (
        <div className="flex gap-1.5">
          {[...last].reverse().map(d => {
            const on = d.present.includes(uid);
            return (
              <div key={d.date} className="flex-1 max-w-12 flex flex-col items-center gap-1" title={`${WEEKDAYS_GE[weekdayOf(d.date)]}, ${shortDate(d.date)}: ${on ? 'მოვიდა' : 'არ მოსულა'}`}>
                <span className={`w-full h-7 rounded-md flex items-center justify-center ${on ? 'bg-emerald-600 text-white' : 'bg-[#efe5d4]'}`}>
                  {on && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </span>
                <span className="text-[10.5px] font-semibold text-[#8a7a6a] tabular-nums">{Number(d.date.slice(8))}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
