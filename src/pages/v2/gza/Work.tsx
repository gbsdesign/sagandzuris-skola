import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Check, CheckCheck, Dumbbell, MessageSquareText, Music, Play, Trash2 } from 'lucide-react';
import { useAuth, useViewing } from '../../../context';
import { Button, Card, Press, Row, Rows, RoundButton, SectionLabel, Sheet, ToggleRow, Note, cx, FOCUS } from '../../../components/ui2';
import { useMyClasses, type SchoolClass } from '../../../hooks/useClasses';
import { deleteAssignment, dueUntil, type Assignment } from '../../../hooks/useTeaching';
import { markedAll, useHiddenWork, useWorkCtx, workDone, workKey } from '../../../components/teacher/MyClassWork';
import { useClassWork } from '../../../components/classes/ClassWork';
import { AssignmentsFold } from '../../../components/teacher/AssignmentsPanel';
import { ClassLogo } from '../../../components/classes/ClassLogo';
import { DrillSheet } from '../../../components/mastery/ManeraLessonSheet';
import { askConfirm, offerUndo } from '../../../components/ui/kit';
import { learnPieceOf } from '../../../components/learn/openLearning';
import { triggerFireworks } from '../../../components/views/StudentBookmarkView';
import { usePathMarks } from '../../../hooks/usePathMarks';
import { useLongPress } from '../../../hooks/useLongPress';
import { pushSupported, setGroupPush, useGroupPush } from '../../../utils/groupPush';
import { markDrillDone } from '../../../utils/maneraPractice';
import { assignmentLines } from '../../../utils/assignmentLines';
import type { Voice } from '../../../utils/pathItems';

// „დავალება“ on „საგანძური“ (board x-sagandzuri): the member's first assignment still to do as one card with the big
// „ისწავლე“ (into the learning mode on the assigned voice), „ძველი · N“ opens the rest. The old carousel's long press stays —
// „შესრულდა“ / „წაშლა“ — and the bell of the eve-of-deadline reminder lives in the window of the rest. A teacher keeps each
// class's assignments to manage under them (the old AssignmentsFold, until its own stage).

/** One assignment as the page shows it. */
export interface WorkLine {
  key: string;
  name: string;
  /** „III ხმა · 17 ნოემბრამდე“, or „ნასწავლია“ once done */
  sub: string;
  note?: string;
  kind: 'chant' | 'drill';
  /** the main button's word; none = nothing to open */
  action?: string;
  onGo?: () => void;
  /** a long press: „შესრულდა“ / „წაშლა“ */
  onLong?: () => void;
}

export interface WorkTask { name: string; onDone: () => void; onDelete: () => void }

const ROMAN: Record<string, string> = { '1': 'I', '2': 'II', '3': 'III' };

const KindDot: React.FC<{ kind: WorkLine['kind']; size?: 40 | 36 }> = ({ kind, size = 40 }) => (
  <span aria-hidden="true" className={cx(
    'flex shrink-0 items-center justify-center rounded-full bg-tint text-wine',
    size === 40 ? 'size-10 [&_svg]:size-5' : 'size-icon [&_svg]:size-[18px]',
  )}>
    {kind === 'drill' ? <Dumbbell strokeWidth={2} /> : <Music strokeWidth={2} />}
  </span>
);

/** The first assignment's card: its name and line, the teacher's note, the big wine button. */
const FirstCard: React.FC<{ w: WorkLine }> = ({ w }) => {
  const press = useLongPress(() => w.onLong?.());
  return (
    <Card {...(w.onLong ? press : {})} className="flex flex-col gap-3 px-4 pt-3.5 pb-4 select-none [-webkit-touch-callout:none]" pad="none">
      <div className="flex items-center gap-3">
        <KindDot kind={w.kind} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-lead leading-tight font-bold wrap-break-word">{w.name}</span>
          <span className="text-meta text-mut wrap-break-word">{w.sub}</span>
        </span>
      </div>
      {w.note && (
        <p className="-mt-1 flex gap-2 text-meta leading-normal text-mut">
          <MessageSquareText aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          <span className="min-w-0 whitespace-pre-line wrap-break-word">{w.note}</span>
        </p>
      )}
      {w.action && w.onGo && (
        <Button full icon={<Play className="fill-current" strokeWidth={1.5} />} onClick={w.onGo}>{w.action}</Button>
      )}
    </Card>
  );
};

/** One of the rest, in the window: a tap opens it, a long press asks „შესრულდა“ / „წაშლა“. */
const WorkRow: React.FC<{ w: WorkLine }> = ({ w }) => {
  const press = useLongPress(() => w.onLong?.());
  return (
    <Row {...(w.onLong ? press : {})} lead={<KindDot kind={w.kind} size={36} />} title={w.name} sub={w.sub} wrap onClick={w.onGo}
      className="select-none [-webkit-touch-callout:none]" />
  );
};

/** The section as the board draws it — everything by props. */
export const WorkSectionView: React.FC<{
  first: WorkLine | null;
  /** there are assignments and every one is done */
  allDone: boolean;
  others: WorkLine[];
  reminder?: { on: boolean; onToggle: () => void };
  status?: { text: string; ok: boolean } | null;
  task: WorkTask | null;
  onCloseTask: () => void;
}> = ({ first, allDone, others, reminder, status, task, onCloseTask }) => {
  const [open, setOpen] = useState(false);
  if (!first && !allDone && !others.length) return null;
  return (
    <>
      <SectionLabel
        label="დავალება"
        right={others.length ? (
          <Press onClick={() => setOpen(true)} className={cx('-my-3 flex h-tap cursor-pointer items-center rounded-full px-1 text-meta font-bold text-wine', FOCUS)}>
            ძველი · {others.length}
          </Press>
        ) : reminder ? (
          <RoundButton size={36} tone="plain" label={reminder.on ? 'შეხსენება ჩართულია' : 'შეხსენება ვადამდე'} aria-pressed={reminder.on}
            onClick={reminder.onToggle} className="-my-2">
            {reminder.on ? <Bell strokeWidth={1.75} /> : <BellOff strokeWidth={1.75} />}
          </RoundButton>
        ) : undefined}
      />
      {first ? <FirstCard w={first} /> : allDone && (
        <Card className="flex items-center gap-2.5 py-3.5">
          <CheckCheck aria-hidden="true" className="size-5 shrink-0 text-leaf" strokeWidth={2} />
          <span className="text-body font-semibold text-leaf-ink">ყველა დავალება შესრულებულია</span>
        </Card>
      )}
      {status && <p role="status" className={cx('px-1.5 text-meta font-semibold', status.ok ? 'text-mut' : 'text-danger')}>{status.text}</p>}

      <Sheet open={open} title="დავალებები" onClose={() => setOpen(false)}>
        <Rows>{others.map(w => <WorkRow key={w.key} w={w} />)}</Rows>
        {reminder && (
          <Rows>
            <ToggleRow title="შეხსენება ვადამდე" sub="ვადის წინა საღამოს, 19:00-ზე" on={reminder.on} onChange={reminder.onToggle} wrap />
          </Rows>
        )}
        {status && open && <p role="status" className={cx('px-1.5 text-meta font-semibold', status.ok ? 'text-mut' : 'text-danger')}>{status.text}</p>}
        <Note>დავალებაზე დიდხანს დაჭერა — „შესრულდა“ ან „წაშლა“.</Note>
      </Sheet>

      <Sheet open={!!task} title={task?.name ?? ''} onClose={onCloseTask}>
        {task && (
          <div className="flex flex-col gap-2.5 pb-1">
            <Button full icon={<Check strokeWidth={2.6} />} onClick={task.onDone}>შესრულდა</Button>
            <Button full kind="ghost" icon={<Trash2 />} className="text-danger" onClick={task.onDelete}>წაშლა</Button>
          </div>
        )}
      </Sheet>
    </>
  );
};

/** A teacher's classes with their assignments to manage (the old fold, inside a card of the new look). */
const TeachingWork: React.FC<{ groups: { cls: SchoolClass; all: Assignment[]; past: Assignment[] }[] }> = ({ groups }) => (
  <>
    <SectionLabel label="კლასების დავალებები" />
    <Card className="flex flex-col divide-y divide-line py-1">
      {groups.map(g => (
        <div key={g.cls.id} className="py-3">
          <AssignmentsFold cls={g.cls} list={g.all} past={g.past} head={(
            <span className="flex min-w-0 items-center gap-2.5">
              <ClassLogo name={g.cls.name} logo={g.cls.logo} className="size-8 shrink-0 text-cap" />
              <span className="min-w-0 text-body leading-snug font-bold wrap-break-word">{g.cls.name}</span>
            </span>
          )} />
        </div>
      ))}
    </Card>
  </>
);

/** The section with the member's own assignments (and a teacher's classes'). */
export const WorkSection: React.FC = () => {
  const { user } = useAuth();
  // a student's page (ViewAsStudent): the bell is this phone's, so it stays the viewer's own
  const viewing = !!useViewing();
  const classes = useMyClasses(user?.uid);
  const work = useClassWork(classes);
  const ctx = useWorkCtx();
  const marks = usePathMarks(triggerFireworks);
  const { hidden, hide } = useHiddenWork(user?.uid);
  const push = useGroupPush();
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [menu, setMenu] = useState<Assignment | null>(null);
  const [drill, setDrill] = useState<string | null>(null);
  // a confirmation fades; an error stays until the next tap
  useEffect(() => {
    if (!status?.ok) return;
    const t = window.setTimeout(() => setStatus(null), 4000);
    return () => window.clearTimeout(t);
  }, [status]);

  const mineAll = work.groups.filter(g => !g.canEdit).flatMap(g => g.all).filter(a => !hidden.has(workKey(a)));
  const isDone = (a: Assignment) => workDone(a, ctx.confirmed, ctx.drillDone, ctx.mine) || markedAll(a, ctx);
  const todo = mineAll.filter(a => !isDone(a));
  const teaching = work.groups.filter(g => g.canEdit);
  if (!user || (!mineAll.length && !teaching.length)) return null;

  const done = (a: Assignment) => {
    setMenu(null);
    if (a.exercise) { markDrillDone(a.exercise, user.uid); triggerFireworks(); return; }
    if (!a.variantId) return;
    const r = marks.markAll(a.variantId, a.voices as Voice[]);
    if (!r) { setStatus({ text: 'მონიშვნას ახლა მასწავლებელი აკეთებს.', ok: false }); return; }
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
      try { await deleteAssignment(a.classId, a.id); } catch { setStatus({ text: 'ვერ წაიშალა.', ok: false }); }
    } else hide(workKey(a));
  };

  const lineOf = (a: Assignment): WorkLine => {
    const finished = workDone(a, ctx.confirmed, ctx.drillDone, ctx.mine);
    const counted = workDone(a, ctx.confirmed, ctx.drillDone); // a teacher's „ჩათვლა“, not only the learning mode
    const name = a.exercise ? a.title : assignmentLines(a.variantId, a.title).name;
    const voices = a.voices.map(v => ROMAN[v] ?? v).join(', ');
    const what = a.exercise ? 'სავარჯიშო' : voices ? `${voices} ხმა` : '';
    const sub = finished ? (counted ? 'ჩათვლილია' : 'ნასწავლია')
      : isDone(a) ? [what, 'მონიშნულია'].filter(Boolean).join(' · ')
      : [what, dueUntil(a.due)].filter(Boolean).join(' · ');
    const piece = a.variantId ? learnPieceOf(a.variantId) : null;
    const open = a.variantId ? ctx.openerOf(a.variantId) : null;
    const go = a.exercise ? () => setDrill(a.exercise!)
      : piece ? () => ctx.openLearning(piece, a.voices[0] as Voice | undefined)
      : open ?? undefined;
    return {
      key: workKey(a), name, sub, note: a.note || undefined, kind: a.exercise ? 'drill' : 'chant',
      action: a.exercise ? 'დაწყება' : piece ? 'ისწავლე' : open ? 'გახსნა' : undefined,
      onGo: go, onLong: () => setMenu(a),
    };
  };

  const first = todo[0] ?? null;
  const others = mineAll.filter(a => a !== first).map(lineOf);
  const toggleReminder = async () => {
    const on = !push.assignments;
    const error = await setGroupPush({ ...push, assignments: on });
    setStatus(error
      ? { text: error, ok: false }
      : { text: on ? 'შეგახსენებ ვადის წინა საღამოს, 19:00-ზე — ამ მოწყობილობაზე.' : 'შეხსენება გამოირთო.', ok: true });
  };
  const menuName = menu ? (menu.exercise ? menu.title : assignmentLines(menu.variantId, menu.title).name) : '';

  return (
    <>
      {mineAll.length > 0 && (
        <WorkSectionView
          first={first ? lineOf(first) : null}
          allDone={!todo.length}
          others={others}
          reminder={pushSupported() && !viewing ? { on: push.assignments, onToggle: toggleReminder } : undefined}
          status={status}
          task={menu ? { name: menuName, onDone: () => done(menu), onDelete: () => remove(menu) } : null}
          onCloseTask={() => setMenu(null)}
        />
      )}
      {teaching.length > 0 && <TeachingWork groups={teaching} />}
      <DrillSheet drillId={drill} startTab="exercise" onClose={() => setDrill(null)} />
    </>
  );
};
