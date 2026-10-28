import React, { useState } from 'react';
import { Check, CheckCheck, ChevronRight, GraduationCap, Music, Plus, Users } from 'lucide-react';
import { useAuth, useChants } from '../../context';
import type { ProgramItem, SchoolClass } from '../../hooks/useClasses';
import { usePathMarks } from '../../hooks/usePathMarks';
import { ownVoices, useClassMarks } from '../../hooks/useClassMarks';
import { CATEGORY_LABEL, PathCategory, Voice, categoryOf, usesVoices } from '../../utils/pathItems';
import { triggerHaptic } from '../../utils/haptics';
import { assignedProgress } from '../../utils/learn';
import { useAllLearning } from '../../hooks/useLearning';
import { usePathItemOpener } from '../views/PathOrbs';
import { Avatar } from './ChatPanel';
import { triggerFireworks } from '../views/StudentBookmarkView';
import { ProgramEditor, programLines } from '../teacher/ClassProgramPanel';
import { PartsBar } from '../learn/PartsBar';
import { learnPieceOf, useOpenLearning } from '../learn/openLearning';
import { Btn, Sheet } from '../ui/kit';

type Listed = ProgramItem & { id: string; key: string };

const VOICE_NAME: Record<Voice, string> = { '1': 'პირველი ხმა', '2': 'მეორე ხმა', '3': 'მესამე ხმა' };

// The class page's „პროგრამა“ tab (2026-10-28: „ერთი რამ, ერთ ადგილას“): a member's progress in one thin bar, then the
// whole program in the teacher's order. A line holds only the name and what the member has of it — the voices they know
// (green once a teacher confirmed them), else the learning mode's bar of parts; a teacher sees how many members know
// it. A tap opens the item's window (ItemSheet): its notes or song, „სწავლა“, the member's own voice marks (the same
// marks as on the path) and who in the class knows each voice (their own path marks or a teacher's confirmation, copied
// by useClassMarksSync). The teachers change the program from the page's one ✎ (`editing`, ProgramEditor).
export const ClassProgram: React.FC<{ cls: SchoolClass; canEdit?: boolean; editing?: boolean; onEditing?: (on: boolean) => void }> = ({
  cls, canEdit, editing, onEditing,
}) => {
  const { user } = useAuth();
  const { selectedChantVariants = {} } = useChants();
  // the member's own marks, as on „საგანძურის გზა“ (a program item not on the path yet joins it when marked)
  const { locked, confirmed, toggle } = usePathMarks(triggerFireworks);
  const myLearning = useAllLearning(user?.uid);
  const marks = useClassMarks(cls.id);
  const openerOf = usePathItemOpener();
  const openLearning = useOpenLearning();
  // the item whose window is open (its key)
  const [shown, setShown] = useState<string | null>(null);
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
  const voicesOf = (id: string): Voice[] => (usesVoices(id) ? ['1', '2', '3'] : ['1']);
  const anyoneKnows = (id: string) => new Set(voicesOf(id).flatMap(v => knowers(id, v).map(k => k.m.uid))).size;

  const cats = (Object.keys(CATEGORY_LABEL) as PathCategory[])
    .map(id => {
      const items = listed.filter(p => categoryOf(p.id) === id);
      const done = items.filter(p => mine(p.id).known.length > 0);
      const voiced = items.filter(p => usesVoices(p.id));
      return {
        id,
        label: CATEGORY_LABEL[id],
        items,
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

  // what the line shows at its right: the member's voices, else the learning mode's parts; a teacher's count of knowers
  const status = (p: Listed) => {
    if (iAmMember) {
      const own = mine(p.id);
      if (own.known.length) {
        const all = own.known.every(v => own.confirmed.includes(v));
        return (
          <span className={`shrink-0 h-7 px-2.5 rounded-full inline-flex items-center gap-1 text-[12px] font-bold tabular-nums whitespace-nowrap ${
            all ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-[#7a2028]/[0.08] text-[#7a2028]'}`}>
            {all ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
            {usesVoices(p.id) ? `ხმა ${[...own.known].sort().join(' · ')}` : 'ნასწავლი'}
          </span>
        );
      }
      const parts = assignedProgress(p.id, myLearning?.learning, myLearning?.parts);
      return parts && parts.marks.some(m => m > 0) ? <PartsBar p={parts} className="w-16 shrink-0" /> : null;
    }
    const n = anyoneKnows(p.id);
    return n ? (
      <span className="shrink-0 inline-flex items-center gap-1 text-[12.5px] font-bold tabular-nums text-[#8a7a6a]" title="კლასში იცის">
        <Users className="w-4 h-4" /> {n}
      </span>
    ) : null;
  };

  const row = (p: Listed) => {
    const lines = programLines(p);
    return (
      <li key={p.key}>
        <button
          type="button"
          onClick={() => { triggerHaptic(8); setShown(p.key); }}
          aria-haspopup="dialog"
          className="group w-full min-h-[60px] py-2 px-1 flex items-center gap-3 text-left rounded-lg cursor-pointer transition-colors hover:bg-[#fbf6ec]"
        >
          <span className="min-w-0 flex-1">
            <span className="block line-clamp-2 break-words text-[14.5px] leading-snug font-semibold text-[#2a2017]">{lines.title}</span>
            {lines.sub && <span className="block mt-0.5 text-xs leading-snug text-[#a4927c]">{lines.sub}</span>}
            {p.note && <span className="block mt-0.5 text-[12px] leading-snug text-[#75685a] whitespace-pre-line">{p.note}</span>}
          </span>
          {status(p)}
          <ChevronRight className="w-5 h-5 shrink-0 text-[#c4b49c] group-hover:text-[#7a2028]" />
        </button>
      </li>
    );
  };

  // a kind's name over its items only when the program has more than one kind
  const groups = cats.map(c => (
    <section key={c.id}>
      {cats.length > 1 && <h4 className="px-1 mb-0.5 text-[12.5px] font-bold text-[#a0703c]">{c.label} · {c.items.length}</h4>}
      <ul className="divide-y divide-[#f3ebdd]">{c.items.map(row)}</ul>
    </section>
  ));

  const open = listed.find(p => p.key === shown);

  return (
    <section className="bg-white/70 rounded-3xl ring-1 ring-[#e8dcc8] px-4 min-[400px]:px-5 sm:px-6 py-4" aria-label="სასწავლო პროგრამა">
      {iAmMember && total > 0 && !editing && (
        <div className="mb-3 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-[#ece2d1] overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-700 ${learned === total ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-[#c2414c] to-[#7a2028]'}`}
              style={{ width: `${(100 * learned) / total}%` }}
            />
          </div>
          <span className="shrink-0 text-[12.5px] font-bold tabular-nums text-[#8a7a6a]">
            ნასწავლი {learned}/{total}{voiceSlots ? ` · ${voices}/${voiceSlots} ხმა` : ''}
          </span>
        </div>
      )}

      {editing && canEdit ? (
        <ProgramEditor cls={cls} onDone={() => onEditing?.(false)} />
      ) : cls.program.length === 0 ? (
        <div className="py-1 space-y-3">
          <p className="text-sm text-[#8a7a6a]">პროგრამა ჯერ არ არის შედგენილი.</p>
          {canEdit && onEditing && <Btn kind="soft" size="sm" icon={<Plus />} onClick={() => onEditing(true)}>პროგრამის შედგენა</Btn>}
        </div>
      ) : (
        <div className="space-y-3">
          {/* one list for everyone, in the teacher's order */}
          {groups}

          {/* early free-text items: no catalogue id, so no voices */}
          {free.length > 0 && (
            <section>
              {total > 0 && <h4 className="px-1 mb-0.5 text-[12.5px] font-bold text-[#a0703c]">სხვა · {free.length}</h4>}
              <ul className="divide-y divide-[#f3ebdd]">
                {free.map((p, i) => (
                  <li key={i} className="py-2 px-1">
                    <p className="text-[14px] leading-snug font-semibold text-[#2a2017]">{p.title}</p>
                    {p.note && <p className="mt-0.5 text-[12px] leading-snug text-[#75685a] whitespace-pre-line">{p.note}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {open && (
        <ItemSheet
          p={open}
          onClose={() => setShown(null)}
          go={openerOf(open.id)}
          piece={learnPieceOf(open.id)}
          onLearn={piece => { setShown(null); openLearning(piece); }}
          member={iAmMember}
          own={mine(open.id)}
          locked={locked}
          onMark={v => toggle(open.id, v)}
          knowers={v => knowers(open.id, v)}
        />
      )}
    </section>
  );
};

type Knower = { m: SchoolClass['members'][number]; ok: boolean; me: boolean };

/** One program item's window: open it (its notes, or the song), „სწავლა“ (its learning mode), the member's voice marks
 *  — a voice a teacher confirmed is green and only the teacher takes it back; while a teacher has locked marking they
 *  only show — and who in the class knows each voice. */
const ItemSheet: React.FC<{
  p: Listed;
  onClose: () => void;
  go: (() => void) | null;
  piece: string | null;
  onLearn: (piece: string) => void;
  member: boolean;
  own: { known: Voice[]; confirmed: Voice[] };
  locked: boolean;
  onMark: (v: Voice) => void;
  knowers: (v: Voice) => Knower[];
}> = ({ p, onClose, go, piece, onLearn, member, own, locked, onMark, knowers }) => {
  const lines = programLines(p);
  const voiced = usesVoices(p.id);
  const list: Voice[] = voiced ? ['1', '2', '3'] : ['1'];
  const song = categoryOf(p.id) === 'simghera';
  return (
    <Sheet open onClose={onClose} title={lines.title}>
      <div className="space-y-5">
        {(lines.sub || p.note) && (
          <div className="-mt-1 space-y-1">
            {lines.sub && <p className="text-[13px] text-[#8a7a6a]">{lines.sub}</p>}
            {p.note && <p className="text-[13px] leading-snug text-[#75685a] whitespace-pre-line">{p.note}</p>}
          </div>
        )}

        {(go || piece) && (
          <div className={`grid gap-2.5 ${go && piece ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {go && <Btn kind="ghost" size="lg" icon={<Music />} onClick={() => { onClose(); go(); }}>{song ? 'სიმღერა' : 'ნოტები'}</Btn>}
            {piece && <Btn size="lg" icon={<GraduationCap />} onClick={() => onLearn(piece)}>სწავლა</Btn>}
          </div>
        )}

        {member && (
          <div>
            <p className="text-[13.5px] font-bold text-[#4a3426]">{voiced ? 'რომელი ხმა იცი?' : 'იცი?'}</p>
            <div className="mt-2 flex items-center gap-2.5">
              {list.map(v => {
                const okOne = own.confirmed.includes(v);
                const on = okOne || own.known.includes(v);
                return (
                  <button
                    key={v}
                    type="button"
                    disabled={locked || okOne}
                    onClick={() => { triggerHaptic(on ? 8 : 15); onMark(v); }}
                    aria-pressed={on}
                    aria-label={voiced ? VOICE_NAME[v] : 'ნასწავლი'}
                    title={okOne ? 'მასწავლებელმა ჩათვალა' : locked ? 'მონიშვნას მასწავლებელი აკეთებს' : on ? 'ნასწავლია — შეეხე მოსახსნელად' : 'შეეხე, როცა ისწავლი'}
                    className={`w-12 h-12 shrink-0 rounded-full text-[16px] font-bold tabular-nums flex items-center justify-center transition active:scale-90 disabled:active:scale-100 ${
                      okOne ? 'bg-emerald-600 text-white'
                        : on ? 'bg-[#7a2028] text-white shadow-[0_2px_6px_-2px_rgba(122,32,40,0.6)]'
                        : 'bg-white ring-1 ring-[#e3d6c1] text-[#8a7a6a] enabled:hover:ring-[#7a2028]/50 enabled:hover:text-[#7a2028]'
                    } ${locked && !okOne ? 'opacity-60' : ''} ${locked || okOne ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    {voiced ? v : <Check className="w-5 h-5 stroke-[3]" />}
                  </button>
                );
              })}
              <span className="ml-1 text-[12.5px] leading-snug text-[#8a7a6a]">
                {locked ? 'მონიშვნას ახლა მასწავლებელი აკეთებს' : 'შეეხე, როცა ისწავლი'}
              </span>
            </div>
          </div>
        )}

        <div>
          <p className="text-[13.5px] font-bold text-[#4a3426]">კლასში ვინ იცის</p>
          <div className="mt-2 space-y-3">
            {list.map(v => {
              const people = knowers(v);
              return (
                <div key={v}>
                  <p className="text-[12.5px] font-bold text-[#8a7a6a]">
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
        </div>
      </div>
    </Sheet>
  );
};
