import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Award, BookOpen, Check, ChevronLeft, ChevronRight, Dumbbell, ExternalLink, Lightbulb, Link2, Music4, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context';
import type { SchoolClass } from '../../hooks/useClasses';
import {
  Done, Lesson, LessonStep, STEP_KINDS, StepKind, deleteLesson, doneCount, markStep, newStepId, saveLesson,
  useClassLessonProgress, useClassLessons, useMyLessonProgress,
} from '../../hooks/useLessons';
import { usePathItemOpener } from '../views/PathOrbs';
import { triggerHaptic } from '../../utils/haptics';
import { Bar, Btn, FIELD, Flash, IconBtn, Label, Sheet, askConfirm, useFlash } from '../ui/kit';

// „ოსტატობა“ of one class: its lessons, step by step. A member opens a lesson and goes through it one step at a time,
// marking each „შესრულდა“; the class's teachers build them in place (+ and ✎) from tips, exercises, chants of the
// class program and links, and see how many members finished each one. `bare`: inside the path page's panel (no card).

const KIND_ICON: Record<StepKind, React.ReactNode> = {
  text: <Lightbulb />, exercise: <Dumbbell />, chant: <Music4 />, link: <Link2 />,
};

export const ClassLessons: React.FC<{ cls: SchoolClass; canEdit: boolean; bare?: boolean; showClassName?: boolean }> = ({ cls, canEdit, bare, showClassName }) => {
  const { user } = useAuth();
  const lessons = useClassLessons(cls.id);
  const iAmMember = !!user && cls.memberIds.includes(user.uid);
  const mine = useMyLessonProgress(iAmMember ? cls.id : null, user?.uid);
  const everyone = useClassLessonProgress(cls.id, canEdit);
  const [open, setOpen] = useState<Lesson | null>(null);
  const [editing, setEditing] = useState<Lesson | 'new' | null>(null);

  if (!lessons) return null;
  if (!lessons.length && !canEdit) return null;
  // how many members finished a lesson (the teachers' line)
  const finished = (l: Lesson) => cls.members.filter(m => l.steps.length && doneCount(l, everyone[m.uid] || {}) === l.steps.length).length;

  const body = (
    <>
      <div className={`flex items-center gap-2 ${bare ? 'min-h-11' : 'min-h-14 px-1'}`}>
        {!bare && <Award className="w-5 h-5 shrink-0 text-[#7a2028]" />}
        <h2 className="flex-1 min-w-0 font-serif-ge text-lg font-bold text-[#4a3426] truncate">
          {showClassName ? cls.name : bare ? 'გაკვეთილები' : 'ოსტატობა'}
          {lessons.length > 0 && <span className="ml-2 font-sans text-sm font-bold text-[#a4927c] tabular-nums">{lessons.length}</span>}
        </h2>
        {canEdit && <IconBtn label="ახალი გაკვეთილი" tone="wine" onClick={() => setEditing('new')}><Plus /></IconBtn>}
      </div>

      {lessons.length === 0 ? (
        <button type="button" onClick={() => setEditing('new')}
          className="w-full mt-1 min-h-14 rounded-2xl border border-dashed border-[#e0d0b6] text-[#8a7a6a] hover:text-[#7a2028] hover:border-[#7a2028]/40 flex items-center justify-center gap-2 text-sm font-bold cursor-pointer transition">
          <Plus className="w-4 h-4" /> პირველი გაკვეთილი
        </button>
      ) : (
        <ul className="mt-1 divide-y divide-[#f1e8d9]">
          {lessons.map(l => {
            const n = doneCount(l, mine);
            const all = l.steps.length;
            const complete = iAmMember && all > 0 && n === all;
            return (
              <li key={l.id} className="flex items-center gap-2 py-1">
                <button type="button" onClick={() => { triggerHaptic(8); setOpen(l); }}
                  className="group flex-1 min-w-0 min-h-14 flex items-center gap-3 px-1 text-left cursor-pointer">
                  <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${complete ? 'bg-emerald-600 text-white' : 'bg-[#7a2028]/[0.08] text-[#7a2028]'}`}>
                    {complete ? <Check className="w-5 h-5 stroke-[3]" /> : <BookOpen className="w-5 h-5" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-bold leading-snug text-[#2a2017] line-clamp-2">{l.title || 'უსათაურო'}</span>
                    <span className="mt-1 flex items-center gap-2">
                      {iAmMember ? (
                        <>
                          <span className="w-20"><Bar value={n} max={all} tone={complete ? 'green' : 'wine'} /></span>
                          <span className="text-xs font-semibold text-[#8a7a6a] tabular-nums">{n}/{all}</span>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-[#8a7a6a] tabular-nums">{all} ნაბიჯი{canEdit ? ` · დაასრულა ${finished(l)}/${cls.members.length}` : ''}</span>
                      )}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 shrink-0 text-[#c4b49c] group-hover:text-[#7a2028]" />
                </button>
                {canEdit && <IconBtn label="გაკვეთილის შეცვლა" onClick={() => setEditing(l)}><Pencil /></IconBtn>}
              </li>
            );
          })}
        </ul>
      )}

      {open && <LessonView cls={cls} lesson={open} done={mine} member={iAmMember} onClose={() => setOpen(null)} />}
      {canEdit && editing && (
        <LessonEditor cls={cls} lesson={editing === 'new' ? null : editing} nextOrder={lessons.length ? Math.max(...lessons.map(l => l.order)) + 1 : 0} onClose={() => setEditing(null)} />
      )}
    </>
  );
  return bare ? <div>{body}</div> : <section className="bg-white/70 rounded-3xl ring-1 ring-[#e8dcc8] px-3 sm:px-4 pt-1 pb-3" aria-label="ოსტატობა">{body}</section>;
};

/** One lesson, one step at a time: its kind, title and words, a chant's notes or a link to open, and „შესრულდა“. */
const LessonView: React.FC<{ cls: SchoolClass; lesson: Lesson; done: Done; member: boolean; onClose: () => void }> = ({ cls, lesson, done, member, onClose }) => {
  const { user } = useAuth();
  const openerOf = usePathItemOpener();
  const mine = new Set(done[lesson.id] || []);
  // start at the first step not done yet
  const [at, setAt] = useState(() => Math.max(0, lesson.steps.findIndex(s => !mine.has(s.id))));
  const step: LessonStep | undefined = lesson.steps[at];
  const last = at >= lesson.steps.length - 1;
  const isDone = !!step && mine.has(step.id);
  const go = (i: number) => { triggerHaptic(8); setAt(Math.min(Math.max(i, 0), lesson.steps.length - 1)); };
  const markAndNext = async () => {
    if (!step || !user) return;
    triggerHaptic(15);
    await markStep(cls.id, user.uid, lesson.id, step.id, !isDone).catch(() => {});
    if (!isDone && !last) setAt(at + 1);
  };
  const openChant = step?.kind === 'chant' && step.ref ? openerOf(step.ref) : null;
  const chantTitle = step?.kind === 'chant' ? cls.program.find(p => p.id === step.ref)?.title : undefined;

  return (
    <Sheet open onClose={onClose} title={lesson.title || 'გაკვეთილი'} wide
      footer={step && (
        <div className="flex items-center gap-2">
          <IconBtn label="წინა ნაბიჯი" disabled={at === 0} onClick={() => go(at - 1)}><ChevronLeft /></IconBtn>
          {member ? (
            <Btn full kind={isDone ? 'ghost' : 'primary'} icon={<Check />} onClick={markAndNext}>{isDone ? 'შესრულებულია' : 'შესრულდა'}</Btn>
          ) : (
            <span className="flex-1 text-center text-sm font-semibold text-[#8a7a6a] tabular-nums">{at + 1} / {lesson.steps.length}</span>
          )}
          <IconBtn label="შემდეგი ნაბიჯი" disabled={last} onClick={() => go(at + 1)}><ChevronRight /></IconBtn>
        </div>
      )}>
      {!step ? (
        <p className="text-sm text-[#8a7a6a]">ამ გაკვეთილს ნაბიჯები ჯერ არ აქვს.</p>
      ) : (
        <div className="space-y-4">
          {/* the steps as dots: done in green, this one in wine */}
          <div className="flex flex-wrap items-center gap-1.5" aria-label={`ნაბიჯი ${at + 1} / ${lesson.steps.length}`}>
            {lesson.steps.map((s, i) => (
              <button key={s.id} type="button" onClick={() => go(i)} aria-label={`ნაბიჯი ${i + 1}`}
                className={`h-2.5 rounded-full cursor-pointer transition-all ${i === at ? 'w-7 bg-[#7a2028]' : mine.has(s.id) ? 'w-2.5 bg-emerald-600' : 'w-2.5 bg-[#e3d5bd]'}`} />
            ))}
            <span className="ml-1 text-xs font-semibold text-[#8a7a6a] tabular-nums">{at + 1} / {lesson.steps.length}</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 shrink-0 rounded-2xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5">{KIND_ICON[step.kind]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#a4927c]">{STEP_KINDS.find(k => k.id === step.kind)?.label}</p>
              <h3 className="mt-0.5 font-serif-ge text-[19px] font-bold leading-snug text-[#2a2017]">{step.title || chantTitle || '—'}</h3>
            </div>
          </div>
          {step.text && <p className="text-[15px] leading-relaxed text-[#2a2017] whitespace-pre-line">{step.text}</p>}
          {step.kind === 'chant' && (openChant
            ? <Btn kind="soft" icon={<Music4 />} onClick={() => { openChant(); onClose(); }}>ნოტების გახსნა{chantTitle ? ` · ${chantTitle}` : ''}</Btn>
            : chantTitle ? <p className="text-sm text-[#8a7a6a]">{chantTitle}</p> : null)}
          {step.kind === 'link' && step.url && (
            <a href={step.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] font-bold text-sm hover:bg-[#7a2028]/[0.14] transition">
              <ExternalLink className="w-[18px] h-[18px]" /> გახსნა
            </a>
          )}
        </div>
      )}
    </Sheet>
  );
};

/** The teacher builds a lesson: its title and steps (kind, title, words; a chant from the class program; a link). */
const LessonEditor: React.FC<{ cls: SchoolClass; lesson: Lesson | null; nextOrder: number; onClose: () => void }> = ({ cls, lesson, nextOrder, onClose }) => {
  const msg = useFlash();
  const [title, setTitle] = useState(lesson?.title || '');
  const [steps, setSteps] = useState<LessonStep[]>(() => lesson?.steps.length ? lesson.steps : [{ id: newStepId(), kind: 'text', title: '' }]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setTitle(lesson?.title || ''); }, [lesson]);
  const chants = cls.program.filter(p => p.id);
  const patch = (i: number, p: Partial<LessonStep>) => setSteps(list => list.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const move = (i: number, d: number) => setSteps(list => {
    const j = i + d;
    if (j < 0 || j >= list.length) return list;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const save = async () => {
    if (!title.trim()) { msg.fail('დაარქვი გაკვეთილს სახელი.'); return; }
    const ready = steps.filter(s => s.title.trim() || s.text?.trim() || (s.kind === 'chant' && s.ref) || (s.kind === 'link' && s.url?.trim()));
    if (!ready.length) { msg.fail('დაამატე ერთი ნაბიჯი მაინც.'); return; }
    setSaving(true);
    try {
      await saveLesson(cls.id, { id: lesson?.id, title, steps: ready, order: lesson?.order ?? nextOrder });
      onClose();
    } catch {
      msg.fail('ვერ შეინახა. სცადე ხელახლა.');
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!lesson) return;
    if (!(await askConfirm({ title: `წავშალო გაკვეთილი „${lesson.title}“?`, text: 'მოსწავლეების მონიშვნებიც დაიკარგება.', ok: 'წაშლა', danger: true }))) return;
    await deleteLesson(cls.id, lesson.id).catch(() => {});
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={lesson ? 'გაკვეთილის შეცვლა' : 'ახალი გაკვეთილი'} wide
      footer={
        <div className="space-y-2">
          <Flash flash={msg.flash} onClose={msg.clear} />
          <div className="flex gap-2">
            {lesson && <IconBtn label="გაკვეთილის წაშლა" tone="danger" onClick={remove}><Trash2 /></IconBtn>}
            <Btn full size="lg" icon={<Check />} disabled={saving} onClick={save}>{saving ? 'ინახება…' : 'შენახვა'}</Btn>
          </div>
        </div>
      }>
      <div className="space-y-4">
        <div>
          <Label htmlFor="sg-lesson-title">სახელი</Label>
          <input id="sg-lesson-title" className={FIELD} value={title} onChange={e => setTitle(e.target.value)} placeholder="მაგ: სუნთქვა გალობისას" />
        </div>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={s.id} className="p-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8] space-y-2.5">
              <div className="flex items-center gap-1">
                <span className="w-7 h-7 shrink-0 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] text-xs font-black flex items-center justify-center tabular-nums">{i + 1}</span>
                <span className="flex-1" />
                <IconBtn label="ზემოთ" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></IconBtn>
                <IconBtn label="ქვემოთ" disabled={i === steps.length - 1} onClick={() => move(i, 1)}><ArrowDown /></IconBtn>
                <IconBtn label="ნაბიჯის წაშლა" tone="danger" disabled={steps.length === 1} onClick={() => setSteps(list => list.filter((_, j) => j !== i))}><Trash2 /></IconBtn>
              </div>
              {/* the kind, as four small pills */}
              <div className="grid grid-cols-2 min-[460px]:grid-cols-4 gap-1.5">
                {STEP_KINDS.map(k => (
                  <button key={k.id} type="button" aria-pressed={s.kind === k.id} onClick={() => patch(i, { kind: k.id })}
                    className={`h-10 rounded-xl inline-flex items-center justify-center gap-1.5 text-[13px] font-bold cursor-pointer transition [&>svg]:w-4 [&>svg]:h-4 ${
                      s.kind === k.id ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#fbf6ec] ring-1 ring-[#efe3cf] text-[#4a3426] hover:ring-[#7a2028]/30'
                    }`}>
                    {KIND_ICON[k.id]} {k.label}
                  </button>
                ))}
              </div>
              <input className={FIELD} value={s.title} onChange={e => patch(i, { title: e.target.value })} placeholder="სათაური" aria-label={`ნაბიჯი ${i + 1}: სათაური`} />
              {s.kind === 'chant' && (
                chants.length ? (
                  <select className={FIELD} value={s.ref || ''} onChange={e => patch(i, { ref: e.target.value })} aria-label={`ნაბიჯი ${i + 1}: საგალობელი`}>
                    <option value="">— საგალობელი კლასის პროგრამიდან —</option>
                    {chants.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                ) : <p className="text-[13px] text-[#8a7a6a]">კლასის პროგრამაში საგალობლები ჯერ არ არის.</p>
              )}
              {s.kind === 'link' && (
                <input className={FIELD} type="url" inputMode="url" value={s.url || ''} onChange={e => patch(i, { url: e.target.value })} placeholder="https://…" aria-label={`ნაბიჯი ${i + 1}: ბმული`} />
              )}
              <textarea className={`${FIELD} !h-auto min-h-[84px] py-2.5 leading-relaxed`} value={s.text || ''} onChange={e => patch(i, { text: e.target.value })}
                placeholder={s.kind === 'exercise' ? 'რა გააკეთოს, რამდენჯერ' : 'ტექსტი'} aria-label={`ნაბიჯი ${i + 1}: ტექსტი`} />
            </li>
          ))}
        </ol>
        <Btn kind="ghost" full icon={<Plus />} onClick={() => setSteps(list => [...list, { id: newStepId(), kind: 'text', title: '' }])}>ნაბიჯის დამატება</Btn>
      </div>
    </Sheet>
  );
};
