import React from 'react';
import { CalendarClock, ClipboardList, CheckCheck } from 'lucide-react';
import { useAuth, useChants } from '../../context';
import { useMyClasses } from '../../hooks/useClasses';
import { daysUntil, dueLabel, shortDate, useMyAssignments } from '../../hooks/useTeaching';
import { useConfirmations } from '../../hooks/useConfirmations';
import { Voice, voicesOf } from '../../utils/pathItems';
import { LessonTable } from './Schedule';
import { Toggle } from '../ui/kit';
import { pushSupported, setGroupPush, useGroupPush } from '../../utils/groupPush';

const VOICE_LABEL: Record<string, string> = { '1': 'I ხმა', '2': 'II ხმა', '3': 'III ხმა' };

// On the student's path page: the teacher's assignments (with their deadlines) and the lesson timetable.
export const MyClassWork: React.FC = () => {
  const { user } = useAuth();
  const classes = useMyClasses(user?.uid);
  const assignments = useMyAssignments(classes.map(c => c.id), user?.uid);
  const { selectedChantVariants } = useChants();
  const confirmed = useConfirmations(user?.uid);
  const push = useGroupPush();
  const [pushNote, setPushNote] = React.useState('');
  const current = assignments.filter(a => daysUntil(a.due) >= -3);
  const withSchedule = classes.filter(c => c.schedule.length);
  if (!user || (!current.length && !withSchedule.length)) return null;

  return (
    <section className="rounded-3xl bg-white/80 ring-1 ring-[#e8dcc8] p-4 sm:p-5 space-y-4 shadow-[0_1px_2px_rgba(74,52,38,0.05)]">
      {current.length > 0 && (
        <div>
          <h2 className="flex items-center gap-2 font-serif-ge text-[17px] font-bold text-[#4a3426] mb-3">
            <ClipboardList className="w-5 h-5 text-[#7a2028]" /> დავალებები
          </h2>
          <ul className="space-y-2">
            {current.map(a => {
              const item = a.variantId ? selectedChantVariants[a.variantId] : undefined;
              const marked = item && a.variantId ? voicesOf(item, a.variantId) : [];
              const conf = (a.variantId && confirmed[a.variantId]) || [];
              const need = a.voices.length ? a.voices : ['1'];
              const done = a.variantId ? need.every(v => conf.includes(v as Voice)) : false;
              const n = daysUntil(a.due);
              return (
                <li key={`${a.classId}-${a.id}`} className={`p-3 rounded-2xl ring-1 ${done ? 'bg-emerald-50 ring-emerald-200' : n <= 1 ? 'bg-amber-50 ring-amber-200' : 'bg-[#fbf6ec] ring-[#efe3cf]'}`}>
                  <div className="flex items-start gap-2">
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold text-[#2a2017] leading-snug">{a.title}</span>
                      <span className="block text-xs text-[#8a7a6a] mt-0.5">
                        {a.voices.map(v => VOICE_LABEL[v]).join(', ')}{a.voices.length ? ' · ' : ''}{shortDate(a.due)}
                      </span>
                    </span>
                    <span className={`shrink-0 h-6 px-2 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${done ? 'bg-emerald-700 text-white' : n < 0 ? 'bg-[#efe5d4] text-[#75685a]' : n <= 1 ? 'bg-amber-500 text-white' : 'bg-[#7a2028]/10 text-[#7a2028]'}`}>
                      {done ? <><CheckCheck className="w-3.5 h-3.5" /> ჩათვლილია</> : dueLabel(a.due)}
                    </span>
                  </div>
                  {!done && a.voices.length > 0 && (
                    <div className="mt-2 flex gap-1.5">
                      {a.voices.map(v => (
                        <span key={v} className={`h-6 px-2 rounded-full text-[11px] font-bold inline-flex items-center ${marked.includes(v as Voice) ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#b3a594]'}`}>
                          {VOICE_LABEL[v]} {marked.includes(v as Voice) ? '✓' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                  {a.note && <p className="mt-2 text-[13px] text-[#75685a] whitespace-pre-line">{a.note}</p>}
                </li>
              );
            })}
          </ul>
          {pushSupported() && (
            <div className="mt-2 border-t border-[#efe3cf]">
              <Toggle
                on={push.assignments}
                onChange={async on => setPushNote(await setGroupPush({ ...push, assignments: on }))}
                label="შეხსენება ვადამდე"
                hint="ვადის წინა საღამოს, 19:00-ზე, ამ მოწყობილობაზე"
              />
              {pushNote && <p className="text-xs font-semibold text-[#9a3324]">{pushNote}</p>}
            </div>
          )}
        </div>
      )}
      {withSchedule.map(c => (
        <div key={c.id}>
          <h2 className="flex items-center gap-2 font-serif-ge text-[17px] font-bold text-[#4a3426] mb-2">
            <CalendarClock className="w-5 h-5 text-[#7a2028]" /> გაკვეთილები{classes.length > 1 ? ` · ${c.name}` : ''}
          </h2>
          <LessonTable slots={c.schedule} />
        </div>
      ))}
    </section>
  );
};
