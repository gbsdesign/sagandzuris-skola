import React, { useState } from 'react';
import { Check, CheckCheck, ChevronDown, ChevronRight, ClipboardList, ListChecks, Users } from 'lucide-react';
import { useAuth, useChants } from '../../context';
import type { ProgramItem, SchoolClass } from '../../hooks/useClasses';
import { usePathMarks } from '../../hooks/usePathMarks';
import { ownVoices, useClassMarks } from '../../hooks/useClassMarks';
import { daysUntil, useAssignments } from '../../hooks/useTeaching';
import { CATEGORY_LABEL, PathCategory, Voice, categoryOf, usesVoices } from '../../utils/pathItems';
import { triggerHaptic } from '../../utils/haptics';
import { usePathItemOpener } from '../views/PathOrbs';
import { WorkItems, currentWork, workDone } from '../teacher/MyClassWork';
import { AssignmentsFold } from '../teacher/AssignmentsPanel';
import { Avatar } from './ChatPanel';
import { triggerFireworks } from '../views/StudentBookmarkView';
import { findVersion } from '../../data/chantLookup';
import { variantLines } from '../../data/tsirvaChants';

/** A program row's two lines: a chant's own name first, then its book, page, number and source, muted
 *  („აკურთხევს სული ჩემი“ / „I ტომი · გვ. 212 · ხუნდაძე · №153“); a song or a poem keeps its title and code. */
const programLines = (p: ProgramItem): { title: string; sub?: string } => {
  const v = p.id ? findVersion(p.id) : undefined;
  if (!v || !v.variant.page) return { title: p.title, sub: p.code };
  const { top, sub } = variantLines(v.chant.id, v.chant.title, v.variant);
  const segs = top.split(' · ');
  // top = book · name · page
  const name = segs.length >= 3 ? segs.slice(1, -1).join(' · ') : top;
  const where = segs.length >= 3 ? `${segs[0]} · ${segs[segs.length - 1]}` : '';
  return { title: name, sub: [where, sub].filter(Boolean).join(' · ') || p.code };
};

type Listed = ProgramItem & { id: string; key: string };

const VOICE_NAME: Record<Voice, string> = { '1': 'პირველი ხმა', '2': 'მეორე ხმა', '3': 'მესამე ხმა' };

// „სასწავლო პროგრამა“, at the top of the class page: a member's progress in one thin bar, the learned items, and the
// rest folded under "სასწავლი". A member's voice numbers are their own marks, the same buttons as on the path; 👥 beside
// them shows which members of the class know each voice (their own path marks or a teacher's confirmation, copied by
// useClassMarksSync). A teacher who is not a member sees every item in one list, with 👥 only. „დავალებები“ beside the title folds open the assignments (a dot while one is still
// to do): a member's own, or the class's to manage for its teachers (`canEdit`).
export const ClassProgram: React.FC<{ cls: SchoolClass; canEdit?: boolean; action?: React.ReactNode }> = ({ cls, canEdit, action }) => {
  const { user } = useAuth();
  const { selectedChantVariants = {} } = useChants();
  // the member's own marks, as on „საგანძურის გზა“ (a program item not on the path yet joins it when marked)
  const { locked, confirmed, toggle } = usePathMarks(triggerFireworks);
  const marks = useClassMarks(cls.id);
  const openerOf = usePathItemOpener();
  const assignments = useAssignments(cls.id);
  // the item whose „ვინ იცის“ is open (its key)
  const [who, setWho] = useState<string | null>(null);
  const [showTodo, setShowTodo] = useState(false);
  const [showWork, setShowWork] = useState(false);
  const iAmMember = !!user && cls.memberIds.includes(user.uid);

  const listed: Listed[] = cls.program.flatMap((p, i) => (p.id ? [{ ...p, id: p.id, key: `${i}:${p.id}` }] : []));
  const free = cls.program.filter(p => !p.id);
  const mine = (id: string) => (iAmMember ? ownVoices(selectedChantVariants, confirmed, id) : { known: [] as Voice[], confirmed: [] as Voice[] });

  // the members who know one voice of one item: the viewer from their own live marks, the others from their copies
  const knowers = (id: string, v: Voice) =>
    cls.members.flatMap(m => {
      const own = m.uid === user?.uid ? ownVoices(selectedChantVariants, confirmed, id) : null;
      const known = own ? own.known : marks[m.uid]?.voices[id] || [];
      if (!known.includes(v)) return [];
      const ok = own ? own.confirmed : marks[m.uid]?.confirmed[id] || [];
      return [{ m, ok: ok.includes(v), me: m.uid === user?.uid }];
    });

  // a teacher sees all the class's assignments, a member those for the whole class or for them
  const work = currentWork(canEdit ? assignments : assignments.filter(a => !a.studentIds.length || (!!user && a.studentIds.includes(user.uid))));
  const workDot = work.some(a => daysUntil(a.due) >= 0 && (canEdit || !workDone(a, confirmed)));

  const cats = (Object.keys(CATEGORY_LABEL) as PathCategory[])
    .map(id => {
      const items = listed.filter(p => categoryOf(p.id) === id);
      const done = items.filter(p => mine(p.id).known.length > 0);
      const voiced = items.filter(p => usesVoices(p.id));
      return {
        id,
        label: CATEGORY_LABEL[id],
        items,
        done,
        todo: items.filter(p => !mine(p.id).known.length),
        learned: done.length,
        voices: voiced.reduce((a, p) => a + mine(p.id).known.length, 0),
        voiceSlots: voiced.length * 3,
      };
    })
    .filter(c => c.items.length > 0);
  const total = listed.length;
  const learned = cats.reduce((a, c) => a + c.learned, 0);
  const voices = cats.reduce((a, c) => a + c.voices, 0);
  const voiceSlots = cats.reduce((a, c) => a + c.voiceSlots, 0);
  const todo = cats.filter(c => c.todo.length);
  const todoCount = todo.reduce((a, c) => a + c.todo.length, 0);

  const row = (p: Listed) => {
    const go = openerOf(p.id);
    const voiced = usesVoices(p.id);
    const own = mine(p.id);
    const list: Voice[] = voiced ? ['1', '2', '3'] : ['1'];
    const open = who === p.key;
    const lines = programLines(p);
    const name = (
      <>
        <span className="min-w-0">
          <span className="line-clamp-2 break-words text-[14px] leading-tight font-semibold text-[#2a2017]">{lines.title}</span>
          {lines.sub && <span className="block mt-0.5 line-clamp-2 text-xs leading-tight text-[#a4927c]">{lines.sub}</span>}
          {p.note && <span className="block mt-0.5 text-[12px] leading-snug text-[#75685a] whitespace-pre-line">{p.note}</span>}
        </span>
        {go && <ChevronRight className="w-4 h-4 shrink-0 text-[#c4b49c] group-hover:text-[#7a2028]" />}
      </>
    );
    // a phone too narrow for the name beside the buttons puts the buttons on a line of their own under it
    const nameCls = 'group grow basis-44 min-w-0 min-h-11 py-1 flex items-center gap-1 px-1 text-left';
    // the members who know at least one voice, for the 👥 button
    const anyone = new Set(list.flatMap(v => knowers(p.id, v).map(k => k.m.uid))).size;
    return (
      <li key={p.key} className="py-0.5">
        <div className="flex flex-wrap items-center gap-x-2">
          {go ? (
            <button type="button" onClick={go} className={`${nameCls} rounded-lg cursor-pointer transition-colors hover:bg-[#fbf6ec]`}>{name}</button>
          ) : (
            <div className={nameCls}>{name}</div>
          )}
          <span className="ml-auto flex items-center gap-2 pb-1 min-[430px]:pb-0">
            {/* a member's own marks, the same buttons as on „საგანძურის გზა“ */}
            {iAmMember && (
              <span className="flex gap-1.5 shrink-0">
                {list.map(v => {
                  const okOne = own.confirmed.includes(v);
                  const on = okOne || own.known.includes(v);
                  return (
                    <button
                      key={v}
                      type="button"
                      disabled={locked || okOne}
                      onClick={() => { triggerHaptic(on ? 8 : 15); toggle(p.id, v); }}
                      aria-pressed={on}
                      aria-label={voiced ? `${lines.title} — ${VOICE_NAME[v]}` : `${lines.title} — ნასწავლი`}
                      title={okOne ? 'მასწავლებელმა ჩათვალა' : locked ? 'მონიშვნას მასწავლებელი აკეთებს' : on ? 'ნასწავლია — შეეხე მოსახსნელად' : 'შეეხე, როცა ისწავლი'}
                      className={`w-9 h-9 rounded-full text-[13px] font-bold tabular-nums flex items-center justify-center transition active:scale-90 disabled:active:scale-100 ${
                        okOne ? 'bg-emerald-600 text-white'
                          : on ? 'bg-[#7a2028] text-white shadow-[0_2px_6px_-2px_rgba(122,32,40,0.6)]'
                          : 'bg-white ring-1 ring-[#e3d6c1] text-[#a4927c] enabled:hover:ring-[#7a2028]/50 enabled:hover:text-[#7a2028]'
                      } ${locked && !okOne ? 'opacity-60' : ''} ${locked || okOne ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      {voiced ? v : <Check className="w-4 h-4 stroke-[3]" />}
                    </button>
                  );
                })}
              </span>
            )}
            {/* who in the class knows it: a button of its own, so a mark is never mistaken for it */}
            <button
              type="button"
              onClick={() => { triggerHaptic(8); setWho(open ? null : p.key); }}
              aria-expanded={open}
              aria-label={`${lines.title} — ვინ იცის: ${anyone ? anyone : 'ჯერ არავინ'}`}
              title="კლასში ვინ იცის"
              className={`shrink-0 h-9 min-w-9 px-2 rounded-full inline-flex items-center justify-center gap-1 text-[12.5px] font-bold tabular-nums transition cursor-pointer active:scale-95 ${
                open ? 'bg-[#4a3426] text-white' : anyone ? 'bg-[#f3ebdd] text-[#4a3426] hover:bg-[#ece0cc]' : 'text-[#b3a594] hover:bg-[#f3ebdd]'
              }`}
            >
              <Users className="w-4 h-4" />
              {anyone > 0 && <span>{anyone}</span>}
            </button>
          </span>
        </div>

        {/* who in the class knows each voice */}
        {open && (
          <div className="sg-in mt-1.5 mb-2 rounded-xl bg-[#faf6ef] px-3 py-2.5 space-y-2.5">
            {list.map(v => {
              const people = knowers(p.id, v);
              return (
                <div key={v}>
                  <p className="text-[12px] font-bold text-[#8a7a6a]">
                    {voiced ? VOICE_NAME[v] : 'ნასწავლი'} · {people.length ? `იცის ${people.length}` : 'ჯერ არავის აქვს მონიშნული'}
                  </p>
                  {people.length > 0 && (
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {people.map(({ m, ok, me }) => (
                        <li
                          key={m.uid}
                          className={`h-9 max-w-full pl-1 pr-3 rounded-full inline-flex items-center gap-1.5 text-[13px] font-semibold ${
                            me ? 'bg-[#7a2028]/[0.06] ring-1 ring-[#7a2028]/20' : 'bg-white ring-1 ring-[#e8dcc8]'
                          } text-[#2a2017]`}
                          title={ok ? 'მასწავლებელმა ჩათვალა' : undefined}
                        >
                          <Avatar name={m.name} photoURL={m.photoURL} className="w-7 h-7 text-xs" />
                          <span className="truncate">{m.name}</span>
                          {me && <span className="text-xs font-normal text-[#8a7a6a]">(შენ)</span>}
                          {ok && <CheckCheck aria-label="მასწავლებელმა ჩათვალა" className="w-4 h-4 shrink-0 text-emerald-600" />}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </li>
    );
  };

  // a kind's name over its items only when the program has more than one kind
  const groups = (list: { id: string; label: string; items: Listed[] }[], heads = cats.length > 1) =>
    list.map(c => (
      <section key={c.id}>
        {heads && <h4 className="px-1 mb-0.5 text-[12px] font-bold text-[#a4927c]">{c.label} · {c.items.length}</h4>}
        <ul className="divide-y divide-[#f3ebdd]">{c.items.map(row)}</ul>
      </section>
    ));

  return (
    <section className="bg-white/70 rounded-3xl ring-1 ring-[#e8dcc8] px-4 min-[400px]:px-5 sm:px-6 py-4">
      <header>
        <div className="flex items-start gap-2">
          {/* on a narrow phone „დავალებები“ drops under the title; ✏️ stays in the corner */}
          <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h2 className="min-h-9 flex items-center gap-2 font-serif-ge text-lg font-bold text-[#4a3426]">
              <ListChecks className="w-5 h-5 shrink-0 text-[#7a2028]" /> სასწავლო პროგრამა
            </h2>
            <button
              type="button"
              onClick={() => { triggerHaptic(8); setShowWork(o => !o); }}
              aria-expanded={showWork}
              aria-label={workDot ? 'დავალებები — არის მიმდინარე' : 'დავალებები'}
              className={`relative h-9 pl-3 pr-2.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold cursor-pointer transition active:scale-95 ${
                showWork ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#7a2028]/[0.07] text-[#7a2028] hover:bg-[#7a2028]/[0.12]'
              }`}
            >
              <ClipboardList className="w-4 h-4" /> დავალებები
              <ChevronDown className={`w-4 h-4 transition-transform ${showWork ? 'rotate-180' : ''}`} />
              {workDot && <span aria-hidden className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#e5484d] ring-2 ring-white" />}
            </button>
          </div>
          {action}
        </div>
        {iAmMember && total > 0 && (
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-[#ece2d1] overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-700 ${learned === total ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-[#c2414c] to-[#7a2028]'}`}
                style={{ width: `${(100 * learned) / total}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-[#8a7a6a]">
              {learned}/{total} ნასწავლი{voiceSlots ? ` · ${voices}/${voiceSlots} ხმა` : ''}
            </span>
          </div>
        )}
      </header>

      {showWork && (
        <div className={`sg-in mt-3 rounded-2xl bg-[#faf6ef] px-3.5 ${canEdit || !work.length ? 'py-3' : 'pb-3'}`}>
          {canEdit ? (
            <AssignmentsFold cls={cls} list={work} />
          ) : work.length ? (
            <WorkItems list={work} />
          ) : (
            <p className="text-sm text-[#8a7a6a]">ახლა დავალება არ არის.</p>
          )}
        </div>
      )}

      {cls.program.length === 0 ? (
        <p className="mt-3 text-sm text-[#8a7a6a]">პროგრამა ჯერ არ არის შედგენილი.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {/* a teacher's view, or a member who has learned nothing yet: the whole program, unfolded */}
          {!iAmMember || learned === 0 ? (
            groups(cats.map(c => ({ id: c.id, label: c.label, items: c.items })))
          ) : (
            <>
              {groups(cats.filter(c => c.done.length).map(c => ({ id: c.id, label: c.label, items: c.done })))}
              {todoCount > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => { triggerHaptic(8); setShowTodo(o => !o); }}
                    aria-expanded={showTodo}
                    className="w-full h-11 px-3 rounded-xl flex items-center gap-2 bg-[#faf6ef] hover:bg-[#f5eee2] text-left cursor-pointer transition-colors"
                  >
                    <span className="flex-1 text-[13.5px] font-bold text-[#4a3426]">სასწავლი</span>
                    <span className="text-[12.5px] font-bold text-[#a4927c] tabular-nums">{todoCount}</span>
                    <ChevronDown className={`w-4 h-4 text-[#a4927c] transition-transform ${showTodo ? 'rotate-180' : ''}`} />
                  </button>
                  {showTodo && (
                    <div className="mt-2 space-y-3 sg-in">
                      {groups(todo.map(c => ({ id: c.id, label: c.label, items: c.todo })), todo.length > 1)}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* early free-text items: no catalogue id, so no voices */}
          {free.length > 0 && (
            <section>
              {total > 0 && <h4 className="px-1 mb-0.5 text-[12px] font-bold text-[#a4927c]">სხვა · {free.length}</h4>}
              <ul className="divide-y divide-[#f3ebdd]">
                {free.map((p, i) => (
                  <li key={i} className="py-2 px-1">
                    <p className="text-[13.5px] leading-tight font-semibold text-[#2a2017]">{p.title}</p>
                    {p.note && <p className="mt-0.5 text-[12px] leading-snug text-[#75685a] whitespace-pre-line">{p.note}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </section>
  );
};
