import React, { useEffect, useState } from 'react';
import { BellOff, BellRing, CalendarClock, Check, CheckCheck, ClipboardList, MessageSquareText } from 'lucide-react';
import { useAuth, useChants } from '../../context';
import { useMyClasses } from '../../hooks/useClasses';
import { daysUntil, shortDate, useMyAssignments } from '../../hooks/useTeaching';
import { useConfirmations } from '../../hooks/useConfirmations';
import { Voice, voicesOf } from '../../utils/pathItems';
import { LessonChips } from './Schedule';
import { pushSupported, setGroupPush, useGroupPush } from '../../utils/groupPush';
import { CHIP_SOFT, CHIP_STRONG, PATH_CARD, PATH_LABEL, PATH_LABEL_ICON } from '../views/pathStyle';

const VOICE: Record<string, string> = { '1': 'I', '2': 'II', '3': 'III' };

// a book reference closing the title — "… (145 ხუნდაძე, გვ. 205)" — goes on a small line of its own
const splitTitle = (title: string) => {
  const m = title.match(/^(.*\S)\s*\(([^()]+)\)\s*$/);
  return m ? { main: m[1], ref: m[2] } : { main: title, ref: '' };
};

// the deadline, said once: "13 ოქტ · 5 დღეში"
const dueText = (iso: string, n: number) =>
  `${shortDate(iso)} · ${n < 0 ? 'ვადა გავიდა' : n === 0 ? 'დღეს' : n === 1 ? 'ხვალ' : `${n} დღეში`}`;

// an assignment's colours (the bar beside it and its deadline badge)
const TONE = {
  done: { bar: 'bg-emerald-500', badge: 'bg-emerald-600 text-white' },
  past: { bar: 'bg-[#d9ccb8]', badge: 'bg-[#efe5d4] text-[#75685a]' },
  soon: { bar: 'bg-amber-500', badge: 'bg-amber-500 text-white' },
  later: { bar: 'bg-[#7a2028]', badge: 'bg-[#7a2028]/[0.08] text-[#7a2028]' },
};

// On the student's path page, in one card: the teacher's assignments with their deadlines, and the lesson
// timetable. The bell beside "დავალებები" turns on the reminder on the eve of a deadline.
export const MyClassWork: React.FC = () => {
  const { user } = useAuth();
  const classes = useMyClasses(user?.uid);
  const assignments = useMyAssignments(classes.map(c => c.id), user?.uid);
  const { selectedChantVariants } = useChants();
  const confirmed = useConfirmations(user?.uid);
  const push = useGroupPush();
  const [pushNote, setPushNote] = useState<{ text: string; ok: boolean } | null>(null);
  // the bell's confirmation fades; an error stays until the next tap
  useEffect(() => {
    if (!pushNote?.ok) return;
    const t = window.setTimeout(() => setPushNote(null), 4000);
    return () => window.clearTimeout(t);
  }, [pushNote]);
  const current = assignments.filter(a => daysUntil(a.due) >= -3);
  const withSchedule = classes.filter(c => c.schedule.length);
  if (!user || (!current.length && !withSchedule.length)) return null;

  const toggleReminder = async () => {
    const on = !push.assignments;
    const error = await setGroupPush({ ...push, assignments: on });
    setPushNote(
      error
        ? { text: error, ok: false }
        : { text: on ? 'შეგახსენებ ვადის წინა საღამოს, 19:00-ზე — ამ მოწყობილობაზე.' : 'შეხსენება გამოირთო.', ok: true }
    );
  };

  return (
    <section className={`${PATH_CARD} divide-y divide-[#f1e8d9] [&>*:not(:first-child)]:pt-3 [&>*:not(:last-child)]:pb-3`}>
      {current.length > 0 && (
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`flex-1 min-w-0 ${PATH_LABEL}`}>
              <ClipboardList className={PATH_LABEL_ICON} /> დავალებები
            </h2>
            {pushSupported() && (
              <button
                type="button"
                onClick={toggleReminder}
                aria-pressed={push.assignments}
                aria-label="შეხსენება ვადამდე"
                title={push.assignments ? 'შეხსენება ჩართულია: ვადის წინა საღამოს, 19:00-ზე' : 'შეხსენება ვადამდე — დააჭირე ჩასართავად'}
                className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${push.assignments ? CHIP_STRONG : CHIP_SOFT}`}
              >
                {push.assignments ? <BellRing className="w-[18px] h-[18px]" /> : <BellOff className="w-[18px] h-[18px]" />}
              </button>
            )}
          </div>
          {pushNote && (
            <p role="status" className={`mt-1 text-xs font-semibold ${pushNote.ok ? 'text-[#75685a]' : 'text-[#9a3324]'}`}>
              {pushNote.text}
            </p>
          )}
          <ul className="divide-y divide-[#f1e8d9]">
            {current.map(a => {
              const item = a.variantId ? selectedChantVariants[a.variantId] : undefined;
              const marked = item && a.variantId ? voicesOf(item, a.variantId) : [];
              const conf = (a.variantId && confirmed[a.variantId]) || [];
              const need = a.voices.length ? a.voices : ['1'];
              const done = a.variantId ? need.every(v => conf.includes(v as Voice)) : false;
              const n = daysUntil(a.due);
              const tone = TONE[done ? 'done' : n < 0 ? 'past' : n <= 1 ? 'soon' : 'later'];
              const { main, ref } = splitTitle(a.title);
              return (
                <li key={`${a.classId}-${a.id}`} className="py-3 last:pb-0">
                  <div className="relative pl-4">
                    <span aria-hidden className={`absolute left-0 top-0.5 bottom-0.5 w-1 rounded-full ${tone.bar}`} />
                    <p className="text-[15px] font-semibold leading-snug text-[#2a2017] break-words">{main}</p>
                    {ref && <p className="mt-0.5 text-xs text-[#8a7a6a]">{ref}</p>}
                    {/* the voices to learn on the left, the deadline on the right (it drops under them on a narrow phone) */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {!done && a.voices.length > 0 && (
                        <>
                          <span className="mr-0.5 text-[11px] font-semibold text-[#a08f7c]">ხმა</span>
                          {a.voices.map(v => {
                            const on = marked.includes(v as Voice);
                            return (
                              <span
                                key={v}
                                title={`${VOICE[v]} ხმა${on ? ' — ნასწავლია' : ''}`}
                                className={`h-6 min-w-6 px-1.5 rounded-full text-[11px] font-bold inline-flex items-center justify-center gap-0.5 ${on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#f6efe4] text-[#8a7a6a]'}`}
                              >
                                {VOICE[v]}
                                {on && <Check className="w-3 h-3 stroke-[3]" />}
                              </span>
                            );
                          })}
                        </>
                      )}
                      <span className={`ml-auto shrink-0 h-7 px-2.5 rounded-full text-xs font-bold tabular-nums whitespace-nowrap inline-flex items-center gap-1 ${tone.badge}`}>
                        {done ? <><CheckCheck className="w-3.5 h-3.5" /> ჩათვლილია</> : dueText(a.due, n)}
                      </span>
                    </div>
                    {a.note && (
                      <p className="mt-2 flex items-start gap-1.5 text-[13px] leading-snug text-[#75685a]">
                        <MessageSquareText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#b3a594]" />
                        <span className="min-w-0 whitespace-pre-line">{a.note}</span>
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {withSchedule.map(c => (
        <LessonChips
          key={c.id}
          slots={c.schedule}
          label={<><CalendarClock className={PATH_LABEL_ICON} /> გაკვეთილები{classes.length > 1 ? ` · ${c.name}` : ''}</>}
        />
      ))}
    </section>
  );
};
