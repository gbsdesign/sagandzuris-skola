import React, { useMemo, useState } from 'react';
import { Check, CheckCheck, ClipboardCheck, History } from 'lucide-react';
import { useAuth } from '../../context';
import { SchoolClass } from '../../hooks/useClasses';
import { localIso, saveAttendance, shortDate, useAttendance, weekdayOf } from '../../hooks/useTeaching';
import { Avatar, Btn, Card, CardTitle, Empty, FIELD, Flash, useFlash } from '../ui/kit';
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

// "დასწრება": who came to the lesson, one tap per student; saved at once. Below: each student's record.
export const AttendancePanel: React.FC<{ cls: SchoolClass }> = ({ cls }) => {
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
  const toggle = (uid: string) => write(present.includes(uid) ? present.filter(x => x !== uid) : [...present, uid]);

  const last = history.slice(0, 8);
  if (!cls.members.length) return <Empty icon={<ClipboardCheck />} title="კლასში ჯერ წევრები არ არიან" text="დაამატე წევრები ჩანართში „კლასი“." />;

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle
          icon={<ClipboardCheck />}
          title="დასწრება"
          hint="შეეხე მოსწავლეს — მოვიდა. ინახება მაშინვე."
          right={<span className="text-sm font-bold text-[#7a2028] tabular-nums pt-1">{present.length}/{cls.members.length}</span>}
        />
        <div className="flex flex-wrap gap-2 mb-3">
          {choices.map(d => (
            <button key={d} type="button" onClick={() => setDate(d)}
              className={`h-10 px-3.5 rounded-full text-[13px] font-bold cursor-pointer transition ${d === date ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}>
              {d === localIso() ? 'დღეს' : `${WEEKDAYS_SHORT_GE[weekdayOf(d)]}, ${shortDate(d)}`}
            </button>
          ))}
          <input type="date" value={date} max={localIso()} onChange={e => e.target.value && setDate(e.target.value)} className={`${FIELD} !w-auto !h-10`} aria-label="სხვა დღე" />
        </div>
        <p className="mb-2 text-[13px] text-[#8a7a6a]">{WEEKDAYS_GE[weekdayOf(date)]}, {shortDate(date)}{saved ? '' : ' · ჯერ არ მონიშნულა'}</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {cls.members.map(m => {
            const on = present.includes(m.uid);
            return (
              <li key={m.uid}>
                <button type="button" onClick={() => toggle(m.uid)} aria-pressed={on}
                  className={`w-full flex items-center gap-3 p-2.5 pr-3 rounded-2xl text-left cursor-pointer transition active:scale-[0.99] ${on ? 'bg-emerald-50 ring-1 ring-emerald-300' : 'bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/30'}`}>
                  <Avatar name={m.name} photo={m.photoURL} size={40} />
                  <span className="flex-1 min-w-0 text-[15px] font-semibold text-[#2a2017] truncate">{m.name}</span>
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition ${on ? 'bg-emerald-700 text-white' : 'ring-1 ring-[#d9c8ac] text-transparent'}`}>
                    <Check className="w-5 h-5 stroke-[3]" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn kind="soft" size="sm" icon={<CheckCheck />} onClick={() => write(cls.members.map(m => m.uid))}>ყველა მოვიდა</Btn>
          {present.length > 0 && <Btn kind="ghost" size="sm" onClick={() => write([])}>გასუფთავება</Btn>}
        </div>
        <div className="mt-3"><Flash flash={msg.flash} onClose={msg.clear} /></div>
      </Card>

      {last.length > 0 && (
        <Card>
          <CardTitle icon={<History />} title="ბოლო გაკვეთილები" hint={`${last.length} გაკვეთილი · მწვანე — მოვიდა`} />
          <ul className="space-y-2">
            {cls.members.map(m => {
              const came = last.filter(d => d.present.includes(m.uid)).length;
              return (
                <li key={m.uid} className="flex items-center gap-3">
                  <span className="w-28 sm:w-40 shrink-0 text-sm font-semibold text-[#2a2017] truncate">{m.name}</span>
                  <span className="flex-1 flex gap-1 min-w-0">
                    {[...last].reverse().map(d => (
                      <span key={d.date} title={`${shortDate(d.date)}: ${d.present.includes(m.uid) ? 'მოვიდა' : 'არ მოსულა'}`}
                        className={`flex-1 max-w-6 h-6 rounded-md ${d.present.includes(m.uid) ? 'bg-emerald-600' : 'bg-[#efe5d4]'}`} />
                    ))}
                  </span>
                  <span className={`w-10 text-right text-sm font-bold tabular-nums ${came / last.length >= 0.75 ? 'text-emerald-700' : came / last.length < 0.5 ? 'text-[#9a3324]' : 'text-[#4a3426]'}`}>{came}/{last.length}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
};
