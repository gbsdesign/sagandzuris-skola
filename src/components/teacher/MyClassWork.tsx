import React, { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { BellOff, BellRing, Check, CheckCheck, ClipboardList, Dumbbell, GraduationCap, MessageSquareText, Trash2 } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth, useChants, useViewing } from '../../context';
import { useMyClasses, type SchoolClass } from '../../hooks/useClasses';
import { Assignment, daysUntil, deleteAssignment, dueUntil, useMyAssignments } from '../../hooks/useTeaching';
import { Confirmations, useConfirmations } from '../../hooks/useConfirmations';
import { Voice, voicesOf } from '../../utils/pathItems';
import { Btn, Sheet, askConfirm, offerUndo } from '../ui/kit';
import { DrillSheet } from '../mastery/ManeraLessonSheet';
import { useDrillDone } from '../../utils/drillTakes';
import { pushSupported, setGroupPush, useGroupPush } from '../../utils/groupPush';
import { useAllLearning } from '../../hooks/useLearning';
import { allLearned, assignedProgress } from '../../utils/learn';
import { PartsBar } from '../learn/PartsBar';
import { learnPieceOf, useOpenLearning } from '../learn/openLearning';
import { usePathItemOpener } from '../../hooks/usePathItemOpener';
import { assignmentLines } from '../../utils/assignmentLines';
import { AssignmentsFold, WorkCardHead } from './AssignmentsPanel';
import { useClassWork } from '../classes/ClassWork';
import { ClassLogo } from '../classes/ClassLogo';
import { usePathMarks } from '../../hooks/usePathMarks';
import { useLongPress } from '../../hooks/useLongPress';
import { markDrillDone } from '../../utils/maneraPractice';
import { triggerFireworks } from '../views/StudentBookmarkView';
import { CHIP_SOFT, CHIP_STRONG, PATH_CARD, PATH_LABEL, PATH_LABEL_ICON } from '../views/pathStyle';

const VOICE: Record<string, string> = { '1': 'I', '2': 'II', '3': 'III' };

// an assignment's colours (the bar beside it and its deadline badge)
const TONE = {
  done: { bar: 'bg-emerald-500', badge: 'bg-emerald-600 text-white' },
  past: { bar: 'bg-[#d9ccb8]', badge: 'bg-[#efe5d4] text-[#75685a]' },
  soon: { bar: 'bg-amber-500', badge: 'bg-amber-500 text-white' },
  later: { bar: 'bg-[#7a2028]', badge: 'bg-[#7a2028]/[0.08] text-[#7a2028]' },
};

// the assignments still shown: until three days past their deadline
export const currentWork = (list: Assignment[]) => list.filter(a => daysUntil(a.due) >= -3);

/** The member's learning mode (useAllLearning): its records and the pieces' part counts. */
export type MyLearning = ReturnType<typeof useAllLearning>;

/** Every part of an assigned chant or song learned in the learning mode. */
export const learntWork = (a: Assignment, mine?: MyLearning) =>
  !!a.variantId && allLearned(assignedProgress(a.variantId, mine?.learning, mine?.parts));

/** Done = a teacher confirmed every voice it asks for (or the item itself, when it has no voices), or the member learned
 *  every part of it in the learning mode (`mine`); an exercise — the member pressed „შევასრულე“ on it since it was
 *  given (`drillDone`: students/{uid}.drillDone). */
export const workDone = (a: Assignment, confirmed: Confirmations, drillDone: Record<string, string> = {}, mine?: MyLearning) => {
  if (a.exercise) return (drillDone[a.exercise] || '') >= (a.createdAt || '').slice(0, 10);
  if (learntWork(a, mine)) return true;
  const conf = (a.variantId && confirmed[a.variantId]) || [];
  const need = a.voices.length ? a.voices : ['1'];
  return a.variantId ? need.every(v => conf.includes(v as Voice)) : false;
};

/** What an assignment card needs from the member's records (WorkItems and the path's carousel share it). */
const useWorkCtx = () => {
  const { user } = useAuth();
  const { selectedChantVariants } = useChants();
  const confirmed = useConfirmations(user?.uid);
  const drillDone = useDrillDone(user?.uid);
  const mine = useAllLearning(user?.uid);
  const openLearning = useOpenLearning();
  const openerOf = usePathItemOpener();
  return { selectedChantVariants, confirmed, drillDone, mine, openLearning, openerOf };
};
type WorkCtx = ReturnType<typeof useWorkCtx>;

/** The voices an assignment asks for, all marked by the member on their path (a task's „შესრულდა“ marks them). */
const markedAll = (a: Assignment, ctx: WorkCtx) => {
  const item = a.variantId ? ctx.selectedChantVariants[a.variantId] : undefined;
  if (!item || !a.variantId) return false;
  const marked = voicesOf(item, a.variantId);
  return (a.voices.length ? a.voices : ['1']).every(v => marked.includes(v as Voice));
};

/** One assignment as its student sees it: a bar in the deadline's colour, the title, then one line with its book
 *  reference, the voices to learn — filled once marked on the path — and the deadline; the teacher's note under them;
 *  a chant or song still to do gets „სწავლა“ (straight into its learning mode, on the assigned voice) beside the bar
 *  of its parts. */
const WorkCard: React.FC<{ a: Assignment; ctx: WorkCtx; onDrill: (id: string) => void }> = ({ a, ctx, onDrill }) => {
  const item = a.variantId ? ctx.selectedChantVariants[a.variantId] : undefined;
  const marked = item && a.variantId ? voicesOf(item, a.variantId) : [];
  const done = workDone(a, ctx.confirmed, ctx.drillDone, ctx.mine);
  const counted = workDone(a, ctx.confirmed, ctx.drillDone); // a teacher's „ჩათვლა“, not only the learning mode
  const learnt = a.variantId ? assignedProgress(a.variantId, ctx.mine?.learning, ctx.mine?.parts) : null;
  const piece = a.variantId ? learnt?.piece ?? learnPieceOf(a.variantId) : null;
  const n = daysUntil(a.due);
  const tone = TONE[done ? 'done' : n < 0 ? 'past' : n <= 1 ? 'soon' : 'later'];
  const { name, line } = a.exercise ? { name: a.title, line: `სავარჯიშო · ${a.code || ''}` } : assignmentLines(a.variantId, a.title);
  // a tap on the name opens the chant's notes, the song, or the exercise (2026-11-04)
  const open = a.exercise ? () => onDrill(a.exercise!) : a.variantId ? ctx.openerOf(a.variantId) : null;
  return (
    <div className="relative pl-3.5">
      <span aria-hidden className={`absolute left-0 top-0.5 bottom-0.5 w-1 rounded-full ${tone.bar}`} />
      <WorkCardHead name={name} line={line} open={open} className="-ml-1 pl-1 py-1 rounded-xl" />
      {/* the voices on the left, the deadline on the right */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
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
          {done ? <><CheckCheck className="w-3.5 h-3.5" /> {counted ? 'ჩათვლილია' : 'ნასწავლია'}</> : dueUntil(a.due)}
        </span>
      </div>
      {a.note && (
        <p className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-snug text-[#75685a]">
          <MessageSquareText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#b3a594]" />
          <span className="min-w-0 whitespace-pre-line">{a.note}</span>
        </p>
      )}
      {piece && !done && (
        <div className="mt-2 flex items-center gap-2.5">
          <Btn kind="soft" size="sm" icon={<GraduationCap />} onClick={() => ctx.openLearning(piece, a.voices[0] as Voice | undefined)}>სწავლა</Btn>
          {learnt && (
            <>
              <PartsBar p={learnt} className="min-w-0 flex-1" />
              <span className="shrink-0 text-[12px] font-bold tabular-nums text-[#75685a]">{learnt.learned}/{learnt.total}</span>
            </>
          )}
        </div>
      )}
      {a.exercise && !done && (
        <Btn kind="soft" size="sm" icon={<Dumbbell />} className="mt-2" onClick={() => onDrill(a.exercise!)}>სავარჯიშოს დაწყება</Btn>
      )}
    </div>
  );
};

/** The assignments as a list (the class page's „დავალებები“, ClassProgram). */
export const WorkItems: React.FC<{ list: Assignment[] }> = ({ list }) => {
  const ctx = useWorkCtx();
  const [drill, setDrill] = useState<string | null>(null);
  return (
    <ul className="divide-y divide-[#f1e8d9]">
      {list.map(a => (
        <li key={`${a.classId}-${a.id}`} className="py-2.5 last:pb-0">
          <WorkCard a={a} ctx={ctx} onDrill={setDrill} />
        </li>
      ))}
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

/** The assignments a member put away with „წაშლა“ while they belong to the whole class (students/{uid}.workHidden:
 *  `classId/assignmentId`, the newest 100). */
const useHiddenWork = (uid?: string) => {
  const [hidden, setHidden] = useState<string[]>([]);
  useEffect(() => {
    if (!uid) { setHidden([]); return; }
    return onSnapshot(doc(db, 'students', uid), snap => {
      const v = snap.data()?.workHidden;
      setHidden(Array.isArray(v) ? v.filter((x: unknown): x is string => typeof x === 'string') : []);
    }, () => {});
  }, [uid]);
  const hide = (key: string) => {
    if (!uid) return;
    const next = [...hidden.filter(k => k !== key), key].slice(-100);
    setHidden(next);
    setDoc(doc(db, 'students', uid), { workHidden: next }, { mergeFields: ['workHidden'] }).catch(() => {});
  };
  return { hidden: new Set(hidden), hide };
};

const workKey = (a: Assignment) => `${a.classId}/${a.id}`;

/** The member's assignments still to do, one card a time: a finger moves them aside (scroll snap), dots under them say
 *  where one is. A long press on a card asks „შესრულდა“ or „წაშლა“ (`onPress`). */
const WorkCarousel: React.FC<{ list: Assignment[]; ctx: WorkCtx; onDrill: (id: string) => void; onPress: (a: Assignment) => void }> = ({ list, ctx, onDrill, onPress }) => {
  const box = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const several = list.length > 1;
  const onScroll = () => {
    const el = box.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    setAt(Math.max(0, Math.min(list.length - 1, Math.round(el.scrollLeft / (first.offsetWidth + 10)))));
  };
  const go = (i: number) => {
    const el = box.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft - 12, behavior: 'smooth' });
  };
  useEffect(() => { if (at > list.length - 1) setAt(Math.max(0, list.length - 1)); }, [list.length, at]);
  return (
    <div>
      <div
        ref={box}
        onScroll={onScroll}
        className="-mx-3 sm:-mx-4 px-3 sm:px-4 scroll-px-3 sm:scroll-px-4 flex gap-2.5 overflow-x-auto snap-x snap-mandatory overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {list.map(a => (
          <PressCard key={workKey(a)} wide={!several} onLong={() => onPress(a)}>
            <WorkCard a={a} ctx={ctx} onDrill={onDrill} />
          </PressCard>
        ))}
      </div>
      {several && (
        <div className="mt-1.5 flex items-center justify-center gap-1" aria-label={`${at + 1} / ${list.length}`}>
          {list.map((a, i) => (
            <button
              key={workKey(a)}
              type="button"
              aria-label={`დავალება ${i + 1}`}
              onClick={() => go(i)}
              className="w-6 h-6 flex items-center justify-center cursor-pointer"
            >
              <span className={`block rounded-full transition-all ${i === at ? 'w-4 h-1.5 bg-[#7a2028]' : 'w-1.5 h-1.5 bg-[#dccdb6]'}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** A card of the carousel: a long press (or a right click) calls `onLong`. */
const PressCard: React.FC<{ wide: boolean; onLong: () => void; children: React.ReactNode }> = ({ wide, onLong, children }) => {
  const press = useLongPress(onLong);
  return (
    <div
      {...press}
      className={`snap-start shrink-0 ${wide ? 'w-full' : 'w-[calc(100%-2.25rem)] max-w-md'} rounded-2xl bg-white ring-1 ring-[#eadcc4] shadow-[0_6px_16px_-12px_rgba(74,52,38,0.45)] px-3 py-3 select-none [-webkit-touch-callout:none]`}
    >
      {children}
    </div>
  );
};

/** The small window a long press opens: „შესრულდა“ (the chant joins „ნასწავლი“ with its voices; an exercise counts as
 *  done today) and „წაშლა“ (an assignment for me alone is deleted for the teacher too; one for the class only leaves my
 *  list). */
const TaskMenu: React.FC<{ a: Assignment | null; onClose: () => void; onDone: (a: Assignment) => void; onDelete: (a: Assignment) => void }> = ({ a, onClose, onDone, onDelete }) => {
  const lines = a ? (a.exercise ? { name: a.title } : assignmentLines(a.variantId, a.title)) : null;
  return (
    <Sheet open={!!a} onClose={onClose} title={lines?.name ?? ''}>
      {a && (
        <div className="space-y-2.5 pb-1">
          <Btn full size="lg" icon={<Check className="stroke-[3]" />} className="!bg-emerald-600 hover:!bg-emerald-700 !text-white" onClick={() => onDone(a)}>
            შესრულდა
          </Btn>
          <Btn full size="lg" kind="soft" icon={<Trash2 />} className="!text-[#a3323d]" onClick={() => onDelete(a)}>
            წაშლა
          </Btn>
        </div>
      )}
    </Sheet>
  );
};

/** A class's name over its part of the teacher's list. */
const ClassHead: React.FC<{ cls: SchoolClass }> = ({ cls }) => (
  <p className="flex items-center gap-2.5 min-w-0">
    <ClassLogo name={cls.name} logo={cls.logo} className="w-8 h-8 shrink-0 text-xs" />
    <span className="min-w-0 line-clamp-2 text-[15px] font-bold leading-snug text-[#4a3426]">{cls.name}</span>
  </p>
);

// Inside "ნასწავლი" (the round button on the path page), at the top: every assignment — since 2026-11-08 the only place
// (the user: „დავალების ღილაკი მოიხსნას … ყველა სახის დავალება ჩაჯდეს … გვერდზე გადაწევით … დიდხანს დაჭერით … შესრულდა,
// წაშლა“, answers „ჩავარდა არ უნდა · წაშლა მასწავლებელთანაც“). A member's still to do stand as cards a finger moves aside; a
// done one leaves them for the list under them. A teacher manages each class's assignments under them (AssignmentsFold:
// „+ ახალი“, „ისწავლა N/M“, the older ones under „ძველი“). The bell beside "დავალებები" turns on the reminder on the eve of a
// deadline. `bare`: no card of its own, a line under it instead.
export const MyClassWork: React.FC<{ bare?: boolean }> = ({ bare }) => {
  const { user } = useAuth();
  // a student's page (ViewAsStudent): the bell is this phone's, so it stays the viewer's own
  const viewing = !!useViewing();
  const classes = useMyClasses(user?.uid);
  const work = useClassWork(classes);
  const ctx = useWorkCtx();
  const marks = usePathMarks(triggerFireworks);
  const { hidden, hide } = useHiddenWork(user?.uid);
  const push = useGroupPush();
  const [pushNote, setPushNote] = useState<{ text: string; ok: boolean } | null>(null);
  const [menu, setMenu] = useState<Assignment | null>(null);
  const [drill, setDrill] = useState<string | null>(null);
  // the bell's confirmation fades; an error stays until the next tap
  useEffect(() => {
    if (!pushNote?.ok) return;
    const t = window.setTimeout(() => setPushNote(null), 4000);
    return () => window.clearTimeout(t);
  }, [pushNote]);

  const mineAll = work.groups.filter(g => !g.canEdit).flatMap(g => g.all).filter(a => !hidden.has(workKey(a)));
  const todo = mineAll.filter(a => !workDone(a, ctx.confirmed, ctx.drillDone, ctx.mine) && !markedAll(a, ctx));
  const teaching = work.groups.filter(g => g.canEdit);
  if (!user || (!mineAll.length && !teaching.length)) return null;

  const toggleReminder = async () => {
    const on = !push.assignments;
    const error = await setGroupPush({ ...push, assignments: on });
    setPushNote(
      error
        ? { text: error, ok: false }
        : { text: on ? 'შეგახსენებ ვადის წინა საღამოს, 19:00-ზე — ამ მოწყობილობაზე.' : 'შეხსენება გამოირთო.', ok: true }
    );
  };

  const done = (a: Assignment) => {
    setMenu(null);
    if (a.exercise) {
      markDrillDone(a.exercise, user.uid);
      triggerFireworks();
      return;
    }
    if (!a.variantId) return;
    const r = marks.markAll(a.variantId, a.voices as Voice[]);
    if (!r) { setPushNote({ text: 'მონიშვნას ახლა მასწავლებელი აკეთებს.', ok: false }); return; }
    const id = a.variantId;
    offerUndo('ნასწავლში ჩაჯდა', () => marks.restore(id, r.before));
  };

  const remove = async (a: Assignment) => {
    setMenu(null);
    const alone = a.studentIds.length === 1 && a.studentIds[0] === user.uid;
    const ok = await askConfirm({
      title: 'წავშალო დავალება?',
      text: alone ? 'მასწავლებელთანაც წაიშლება.' : 'ეს დავალება მთელ კლასს აქვს — მხოლოდ შენ გაგიქრება.',
      ok: 'წაშლა',
      danger: true,
    });
    if (!ok) return;
    if (alone) {
      try { await deleteAssignment(a.classId, a.id); } catch { setPushNote({ text: 'ვერ წაიშალა.', ok: false }); }
    } else hide(workKey(a));
  };

  return (
    <section className={`${bare ? 'pb-3 border-b border-[#efe5d4]' : PATH_CARD} space-y-3`}>
      <div>
        <div className="flex items-center gap-2">
          <h2 className={`flex-1 min-w-0 ${PATH_LABEL}`}>
            <ClipboardList className={PATH_LABEL_ICON} /> დავალებები
            {todo.length > 1 && <span className="ml-1 text-[12px] font-bold tabular-nums text-[#a4927c]">{todo.length}</span>}
          </h2>
          {pushSupported() && !viewing && (
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
        {mineAll.length > 0 && (
          todo.length ? (
            <div className="mt-2.5">
              <WorkCarousel list={todo} ctx={ctx} onDrill={setDrill} onPress={setMenu} />
              <p className="mt-1 text-center text-[12px] font-medium text-[#a4927c]">დიდხანს დააჭირე — შესრულდა ან წაშლა</p>
            </div>
          ) : (
            <p className="mt-2 flex items-center gap-1.5 text-[13.5px] font-semibold text-emerald-700">
              <CheckCheck className="w-4 h-4 shrink-0" /> ყველა დავალება შესრულებულია
            </p>
          )
        )}
        {teaching.length > 0 && (
          <div className="mt-3 divide-y divide-[#efe5d4]">
            {teaching.map(g => (
              <div key={g.cls.id} className="py-3 first:pt-0 last:pb-0">
                <AssignmentsFold cls={g.cls} list={g.all} past={g.past} head={<ClassHead cls={g.cls} />} />
              </div>
            ))}
          </div>
        )}
      </div>
      <TaskMenu a={menu} onClose={() => setMenu(null)} onDone={done} onDelete={remove} />
      <DrillSheet drillId={drill} startTab="exercise" onClose={() => setDrill(null)} />
    </section>
  );
};
