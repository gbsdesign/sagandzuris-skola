import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { BellOff, BellRing, CalendarClock, Check, CheckCheck, ClipboardList, Dumbbell, MessageSquareText } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth, useChants } from '../../context';
import { useMyClasses } from '../../hooks/useClasses';
import { Assignment, daysUntil, shortDate, useMyAssignments } from '../../hooks/useTeaching';
import { Confirmations, useConfirmations } from '../../hooks/useConfirmations';
import { Voice, voicesOf } from '../../utils/pathItems';
import { LessonChips } from './Schedule';
import { Btn } from '../ui/kit';
import { DrillSheet } from '../mastery/ManeraLessonSheet';
import { useDrillDone } from '../../utils/drillTakes';
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

// the assignments still shown: until three days past their deadline
export const currentWork = (list: Assignment[]) => list.filter(a => daysUntil(a.due) >= -3);

/** Done = a teacher confirmed every voice it asks for (or the item itself, when it has no voices); an exercise —
 *  the member pressed „შევასრულე“ on it since it was given (`drillDone`: students/{uid}.drillDone). */
export const workDone = (a: Assignment, confirmed: Confirmations, drillDone: Record<string, string> = {}) => {
  if (a.exercise) return (drillDone[a.exercise] || '') >= (a.createdAt || '').slice(0, 10);
  const conf = (a.variantId && confirmed[a.variantId]) || [];
  const need = a.voices.length ? a.voices : ['1'];
  return a.variantId ? need.every(v => conf.includes(v as Voice)) : false;
};

/** The assignments as their student sees them: a bar in the deadline's colour, the title, then one line with its book
 *  reference, the voices to learn — filled once marked on the path — and the deadline; the teacher's note under them.
 *  Also the class page's „დავალებები“ (ClassProgram). */
export const WorkItems: React.FC<{ list: Assignment[] }> = ({ list }) => {
  const { user } = useAuth();
  const { selectedChantVariants } = useChants();
  const confirmed = useConfirmations(user?.uid);
  const drillDone = useDrillDone(user?.uid);
  const [drill, setDrill] = useState<string | null>(null);
  return (
    <ul className="divide-y divide-[#f1e8d9]">
      {list.map(a => {
        const item = a.variantId ? selectedChantVariants[a.variantId] : undefined;
        const marked = item && a.variantId ? voicesOf(item, a.variantId) : [];
        const done = workDone(a, confirmed, drillDone);
        const n = daysUntil(a.due);
        const tone = TONE[done ? 'done' : n < 0 ? 'past' : n <= 1 ? 'soon' : 'later'];
        const { main, ref } = a.exercise ? { main: a.title, ref: `სავარჯიშო · ${a.code || ''}` } : splitTitle(a.title);
        return (
          <li key={`${a.classId}-${a.id}`} className="py-2.5 last:pb-0">
            <div className="relative pl-3.5">
              <span aria-hidden className={`absolute left-0 top-0.5 bottom-0.5 w-1 rounded-full ${tone.bar}`} />
              <p className="text-[14.5px] font-semibold leading-snug text-[#2a2017] break-words">{main}</p>
              {/* the reference and the voices on the left, the deadline on the right (it drops under them on a narrow phone) */}
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {ref && <span className="min-w-0 mr-1 text-xs text-[#8a7a6a]">{ref}</span>}
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
                <span className={`ml-auto shrink-0 h-6 px-2.5 rounded-full text-[11.5px] font-bold tabular-nums whitespace-nowrap inline-flex items-center gap-1 ${tone.badge}`}>
                  {done ? <><CheckCheck className="w-3.5 h-3.5" /> ჩათვლილია</> : dueText(a.due, n)}
                </span>
              </div>
              {a.note && (
                <p className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-snug text-[#75685a]">
                  <MessageSquareText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#b3a594]" />
                  <span className="min-w-0 whitespace-pre-line">{a.note}</span>
                </p>
              )}
              {a.exercise && !done && (
                <Btn kind="soft" size="sm" icon={<Dumbbell />} className="mt-2" onClick={() => setDrill(a.exercise!)}>სავარჯიშოს დაწყება</Btn>
              )}
            </div>
          </li>
        );
      })}
      <DrillSheet drillId={drill} startTab="exercise" onClose={() => setDrill(null)} />
    </ul>
  );
};

/** The teacher's assignments the student has not seen yet — the number on the "ნასწავლი" button: the shown ones
 *  created after students/{uid}.workSeenAt. `markSeen` moves that mark past them (to the newest one's own time, so
 *  the teacher's and the student's clocks never meet). */
export const useNewWork = () => {
  const { user } = useAuth();
  const classes = useMyClasses(user?.uid);
  const assignments = useMyAssignments(classes.map(c => c.id), user?.uid);
  // null until the student's doc answers, so nothing counts as new before it
  const [seenAt, setSeenAt] = useState<string | null>(null);
  useEffect(() => {
    if (!user) { setSeenAt(null); return; }
    return onSnapshot(doc(db, 'students', user.uid), snap => {
      const v = snap.data()?.workSeenAt;
      setSeenAt(typeof v === 'string' ? v : '');
    }, () => {});
  }, [user]);
  // (an old assignment without a time never counts as new)
  const fresh = seenAt === null ? [] : currentWork(assignments).filter(a => (a.createdAt || '') > seenAt);
  const markSeen = () => {
    if (!user || !fresh.length) return;
    const last = fresh.reduce((m, a) => (a.createdAt && a.createdAt > m ? a.createdAt : m), seenAt || '');
    setSeenAt(last);
    setDoc(doc(db, 'students', user.uid), { workSeenAt: last }, { mergeFields: ['workSeenAt'] }).catch(() => {});
  };
  return { count: fresh.length, markSeen };
};

// Inside "ნასწავლი" (the round button on the path page), at the top: the teacher's assignments with their
// deadlines, and the lesson timetable in one line after a calendar icon. The bell beside "დავალებები" turns on the
// reminder on the eve of a deadline. `bare`: no card of its own, a line under it instead.
export const MyClassWork: React.FC<{ bare?: boolean }> = ({ bare }) => {
  const { user } = useAuth();
  const classes = useMyClasses(user?.uid);
  const assignments = useMyAssignments(classes.map(c => c.id), user?.uid);
  const push = useGroupPush();
  const [pushNote, setPushNote] = useState<{ text: string; ok: boolean } | null>(null);
  // the bell's confirmation fades; an error stays until the next tap
  useEffect(() => {
    if (!pushNote?.ok) return;
    const t = window.setTimeout(() => setPushNote(null), 4000);
    return () => window.clearTimeout(t);
  }, [pushNote]);
  const current = currentWork(assignments);
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
    <section className={`${bare ? 'pb-3 border-b border-[#efe5d4]' : PATH_CARD} space-y-3`}>
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
                className={`w-9 h-9 -my-1.5 shrink-0 rounded-full flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${push.assignments ? CHIP_STRONG : CHIP_SOFT}`}
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
          <WorkItems list={current} />
        </div>
      )}
      {withSchedule.map(c => (
        <LessonChips
          key={c.id}
          slots={c.schedule}
          lead={
            <span title="გაკვეთილები" className={`mr-0.5 ${PATH_LABEL}`}>
              <CalendarClock className={PATH_LABEL_ICON} aria-label="გაკვეთილები" />
              {classes.length > 1 && c.name}
            </span>
          }
        />
      ))}
    </section>
  );
};
