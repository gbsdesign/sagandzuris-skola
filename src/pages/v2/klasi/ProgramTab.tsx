import React, { useState } from 'react';
import { AudioLines, BookOpen, ChevronDown, ChevronUp, ClipboardList, CloudCheck, CloudDownload, GraduationCap, Loader2, Music, Plus, Users } from 'lucide-react';
import { useAuth, useChants, useNavigation } from '../../../context';
import { Avatar, Bar, Button, Card, CheckButton, Dot, Duo, Note, Pill, RoundButton, Row, Rows, SectionLabel, Sheet, Small } from '../../../components/ui2';
import type { ProgramItem, SchoolClass } from '../../../hooks/useClasses';
import { usePathMarks } from '../../../hooks/usePathMarks';
import { ownVoices, useClassMarks } from '../../../hooks/useClassMarks';
import { useAccess } from '../../../hooks/useAccess';
import { useClassGroup } from '../../../components/psalter/ClassPsalter';
import { useGroupNow } from '../../../hooks/usePsalter';
import { openPsalterGroup } from '../../../components/psalter/selectedGroup';
import { NewGroupSheet } from '../psalmuni/NewGroup';
import { usePathItemOpener } from '../../../hooks/usePathItemOpener';
import { learnPieceOf, useOpenLearning } from '../../../components/learn/openLearning';
import { Studio, studioPiece } from '../../../components/studio/ClassStudio';
import { NewAssignment } from '../../../components/teacher/AssignmentsPanel';
import { programLines } from '../../../components/teacher/ClassProgramPanel';
import { useProgramOffline } from '../../../components/classes/ProgramOffline';
import { triggerFireworks } from '../../../components/views/StudentBookmarkView';
import { CATEGORY_LABEL, CatalogEntry, PathCategory, Voice, categoryOf, findCatalogEntry, usesVoices } from '../../../utils/pathItems';
import { KATHISMA_COUNT, formatRange, readCount } from '../../../utils/psalter';
import { ProgramAddSheet } from './teacher/ProgramAdd';

type Listed = ProgramItem & { id: string; key: string };
type Knower = { m: SchoolClass['members'][number]; ok: boolean; me: boolean };

const VOICE_NAME: Record<Voice, string> = { '1': 'პირველი ხმა', '2': 'მეორე ხმა', '3': 'მესამე ხმა' };

/** The round 1 2 3 at a program line's end: wine once known, green once a teacher counted it. */
const Mark: React.FC<{ n: string; on: boolean; ok: boolean }> = ({ n, on, ok }) => (
  <span aria-hidden="true" className={`flex size-[30px] shrink-0 items-center justify-center rounded-full text-meta font-bold tabular-nums ${
    ok ? 'bg-leaf text-white' : on ? 'bg-wine text-white' : 'border-[1.5px] border-dim text-mut'}`}>
    {n}
  </span>
);

/** x-klasi — the class's „პროგრამა“ tab: the program card, then the psalter group's row. */
export const ProgramTab: React.FC<{ cls: SchoolClass; canEdit: boolean }> = ({ cls, canEdit }) => {
  const { user } = useAuth();
  const { selectedChantVariants = {} } = useChants();
  // the member's own marks, as on „საგანძურის გზა“ (a program item not on the path yet joins it when marked)
  const { locked, confirmed, toggle } = usePathMarks(triggerFireworks);
  const marks = useClassMarks(cls.id);
  const openerOf = usePathItemOpener();
  const openLearning = useOpenLearning();
  const [shown, setShown] = useState<string | null>(null);
  const [studio, setStudio] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [assigning, setAssigning] = useState<CatalogEntry | null>(null);
  const [done, setDone] = useState('');
  const iAmMember = !!user && cls.memberIds.includes(user.uid);

  const listed: Listed[] = cls.program.flatMap((p, i) => (p.id ? [{ ...p, id: p.id, key: `${i}:${p.id}` }] : []));
  const free = cls.program.filter(p => !p.id);
  const offline = useProgramOffline(listed.map(p => p.id));
  const mine = (id: string) => (iAmMember ? ownVoices(selectedChantVariants, confirmed, id) : { known: [] as Voice[], confirmed: [] as Voice[] });

  // the members who know one voice of one item: the viewer from their own live marks, the others from their copies
  const knowers = (id: string, v: Voice): Knower[] =>
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
      const voiced = items.filter(p => usesVoices(p.id));
      return {
        id, label: CATEGORY_LABEL[id], items,
        learned: items.filter(p => mine(p.id).known.length > 0).length,
        voices: voiced.reduce((a, p) => a + mine(p.id).known.length, 0),
        voiceSlots: voiced.length * 3,
      };
    })
    .filter(c => c.items.length > 0);
  const total = listed.length;
  const learned = cats.reduce((a, c) => a + c.learned, 0);
  const voices = cats.reduce((a, c) => a + c.voices, 0);
  const voiceSlots = cats.reduce((a, c) => a + c.voiceSlots, 0);
  const word = cats.every(c => c.id === 'galoba') ? 'საგალობელი' : 'ნაწარმოები';

  const line = (p: Listed) => {
    const lines = programLines(p);
    const voiced = usesVoices(p.id);
    let right: React.ReactNode = null;
    if (iAmMember) {
      const own = mine(p.id);
      right = (
        <span className="flex shrink-0 items-center gap-1.5">
          {voicedList(voiced).map(v => <Mark key={v} n={voiced ? v : '✓'} on={own.known.includes(v)} ok={own.confirmed.includes(v)} />)}
        </span>
      );
    } else {
      const n = anyoneKnows(p.id);
      right = n ? <span className="flex shrink-0 items-center gap-1 text-meta font-semibold text-mut tabular-nums" title="კლასში იცის"><Users className="size-4" aria-hidden="true" />{n}</span> : null;
    }
    return (
      <Row key={p.key} title={lines.title} sub={[lines.sub, p.note].filter(Boolean).join(' · ') || undefined} right={right} onClick={() => setShown(p.key)} aria-haspopup="dialog" />
    );
  };
  const open = listed.find(p => p.key === shown);

  return (
    <div className="flex flex-col gap-2.5">
      <Card pad="none">
        <div className="flex flex-col gap-2 px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="min-w-0 truncate text-head font-bold">სასწავლო პროგრამა</h2>
            {!iAmMember && cls.program.length > 0 && <Small>{cls.program.length}</Small>}
          </div>
          {iAmMember && total > 0 && (
            <>
              <div className="text-meta text-mut">
                შენ იცი {learned} / {total} {word}{voiceSlots ? ` · ${voices} / ${voiceSlots} ხმა` : ''}
              </div>
              <Bar value={total ? learned / total : 0} label="ნასწავლი" />
            </>
          )}
        </div>
        {cls.program.length === 0 ? (
          <p className="px-4 pb-4 text-body text-mut">პროგრამა ჯერ არ არის შედგენილი.</p>
        ) : (
          <div className="flex flex-col divide-y divide-line border-t border-line">
            {cats.map(c => (
              <div key={c.id}>
                {cats.length > 1 && <div className="px-4 pt-2.5 pb-0.5 text-meta font-semibold text-mut">{c.label} · {c.items.length}</div>}
                <div className="flex flex-col divide-y divide-line">{c.items.map(line)}</div>
              </div>
            ))}
            {/* early free-text items: no catalogue id, so no voices */}
            {free.length > 0 && (
              <div>
                {total > 0 && <div className="px-4 pt-2.5 pb-0.5 text-meta font-semibold text-mut">სხვა · {free.length}</div>}
                {free.map((p, i) => <Row key={i} title={p.title} sub={p.note} wrap />)}
              </div>
            )}
          </div>
        )}
        {(canEdit || offline.shown) && (
          <div className="flex items-center justify-between gap-2 border-t border-line px-2 py-1">
            {canEdit ? (
              <Button kind="quiet" size="md" icon={<Plus />} onClick={() => setAdding(true)}>დამატება</Button>
            ) : <span />}
            {offline.shown && (
              <Button kind="quiet" size="md" onClick={offline.save} aria-label={offline.label} title={offline.label}
                icon={offline.busy ? <Loader2 className="animate-spin" /> : offline.saved ? <CloudCheck /> : <CloudDownload />}>
                {offline.saved ? 'ჩამოწერილია' : 'ჩამოწერა'}
              </Button>
            )}
          </div>
        )}
      </Card>
      {offline.shown && (offline.trouble || offline.line) && (
        <Note className={offline.trouble ? 'text-danger' : undefined}>{offline.trouble || offline.line}</Note>
      )}
      {done && <Note>{done}</Note>}

      <PsalterRow cls={cls} canLead={canEdit} />

      {canEdit && <ProgramAddSheet cls={cls} open={adding} onClose={() => setAdding(false)} />}
      {assigning && (
        <NewAssignment open only="chant" preset={assigning} cls={cls} onClose={() => setAssigning(null)} onDone={setDone} />
      )}
      {open && (
        <ItemSheet
          p={open}
          onClose={() => setShown(null)}
          go={openerOf(open.id)}
          piece={learnPieceOf(open.id)}
          onLearn={piece => { setShown(null); openLearning(piece); }}
          onStudio={studioPiece(open.id) && (iAmMember || canEdit) ? () => { setShown(null); setStudio(open.id); } : null}
          onAssign={canEdit && findCatalogEntry(open.id) ? () => { setShown(null); setAssigning(findCatalogEntry(open.id) || null); } : null}
          member={iAmMember}
          teacher={canEdit}
          own={mine(open.id)}
          locked={locked}
          onMark={v => toggle(open.id, v)}
          knowers={v => knowers(open.id, v)}
        />
      )}
      {studio && <Studio cls={cls} vid={studio} canEdit={canEdit} onClose={() => setStudio(null)} />}
    </div>
  );
};

const voicedList = (voiced: boolean): Voice[] => (voiced ? ['1', '2', '3'] : ['1']);

/** One program item's window (the old `ItemSheet`'s content): open it and „სწავლა“ on top, the voices once — my mark and who
 *  in the class knows each —, then the studio and a teacher's „დავალებად მიცემა“. */
const ItemSheet: React.FC<{
  p: Listed;
  onClose: () => void;
  go: (() => void) | null;
  piece: string | null;
  onLearn: (piece: string) => void;
  onStudio: (() => void) | null;
  onAssign: (() => void) | null;
  member: boolean;
  teacher: boolean;
  own: { known: Voice[]; confirmed: Voice[] };
  locked: boolean;
  onMark: (v: Voice) => void;
  knowers: (v: Voice) => Knower[];
}> = ({ p, onClose, go, piece, onLearn, onStudio, onAssign, member, teacher, own, locked, onMark, knowers }) => {
  const lines = programLines(p);
  const voiced = usesVoices(p.id);
  const song = categoryOf(p.id) === 'simghera';
  const [names, setNames] = useState<Voice | null>(null);
  const hint = locked ? 'მონიშვნას ახლა მასწავლებელი აკეთებს.' : voiced ? 'წრეს შეეხე, როცა ხმას ისწავლი.' : 'წრეს შეეხე, როცა ისწავლი.';
  return (
    <Sheet open onClose={onClose} title={lines.title}>
      {(lines.sub || p.note) && (
        <div className="flex flex-col gap-1 px-1 text-meta text-mut">
          {lines.sub && <p>{lines.sub}</p>}
          {p.note && <p className="whitespace-pre-line">{p.note}</p>}
        </div>
      )}
      {(go || piece) && (
        <Duo>
          {go && <Button kind="ghost" icon={<Music />} onClick={() => { onClose(); go(); }}>{song ? 'სიმღერა' : 'ნოტები'}</Button>}
          {piece && <Button icon={<GraduationCap />} onClick={() => onLearn(piece)}>სწავლა</Button>}
        </Duo>
      )}
      <SectionLabel label={voiced ? 'ხმები' : 'ვინ იცის'} />
      <Rows>
        {voicedList(voiced).map(v => {
          const people = knowers(v);
          const okOne = own.confirmed.includes(v);
          const on = okOne || own.known.includes(v);
          const unfolded = names === v && people.length > 0;
          const title = voiced ? VOICE_NAME[v] : 'ნასწავლი';
          return (
            <div key={v}>
              <Row
                lead={member ? (
                  <CheckButton
                    on={on}
                    onChange={() => onMark(v)}
                    disabled={locked || okOne}
                    label={`${title} — ${okOne ? 'ჩათვლილია' : on ? 'ნასწავლია' : 'ჯერ არა'}`}
                    className="-ml-2"
                  />
                ) : undefined}
                title={title}
                sub={`${people.length ? `კლასში იცის ${people.length}` : 'კლასში ჯერ არავინ'}${okOne ? ' · ჩათვლილია' : ''}`}
                right={people.length > 0 ? (
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span aria-hidden="true" className="flex -space-x-2">
                      {people.slice(0, 3).map(({ m }) => <Avatar key={m.uid} name={m.name} photo={m.photoURL} size={32} className="ring-2 ring-surf" />)}
                    </span>
                    <RoundButton label={unfolded ? 'სახელების დამალვა' : 'სახელების ჩვენება'} size={36} tone="plain" aria-expanded={unfolded}
                      onClick={() => setNames(n => (n === v ? null : v))}>
                      {unfolded ? <ChevronUp /> : <ChevronDown />}
                    </RoundButton>
                  </span>
                ) : null}
              />
              {unfolded && (
                <ul className="sg-in flex flex-wrap gap-1.5 px-4 pb-3">
                  {people.map(({ m, ok, me }) => <li key={m.uid} className="max-w-full"><Pill on={ok}>{m.name}{me ? ' (შენ)' : ''}</Pill></li>)}
                </ul>
              )}
            </div>
          );
        })}
      </Rows>
      {member && <Note>{hint} მწვანე — მასწავლებელმა ჩათვალა.</Note>}
      {(onStudio || onAssign) && (
        <Duo className={onStudio && onAssign ? 'max-[439px]:flex-col' : undefined}>
          {onStudio && <Button kind="soft" size="md" icon={<AudioLines />} onClick={onStudio}>{teacher ? 'ჯგუფური ჩანაწერი' : 'ჩემი ხმის ჩაწერა'}</Button>}
          {onAssign && <Button kind="soft" size="md" icon={<ClipboardList />} onClick={onAssign}>დავალებად მიცემა</Button>}
        </Duo>
      )}
    </Sheet>
  );
};

/** x-klasi-psalmuni — the class's psalter group as one row („ფსალმუნი · 0 / 20“) that opens the group's page. */
const PsalterRow: React.FC<{ cls: SchoolClass; canLead: boolean }> = ({ cls, canLead }) => {
  const { user } = useAuth();
  const { navigateTo } = useNavigation();
  // the admin's switch for „ფსალმუნთა ჯგუფი“ still holds for the members
  const open = useAccess().section('medavitneoba') === 'open';
  const group = useClassGroup(open || canLead ? cls.psalterGroupId : undefined);
  const [creating, setCreating] = useState(false);
  if (!open && !canLead) return null;
  if (group === undefined) return null;
  if (!group) {
    if (!canLead) return null;
    return (
      <Rows>
        <Row lead={<Dot icon={<BookOpen />} size={40} />} title="ფსალმუნთა ჯგუფი" sub="ჯერ არ არის შექმნილი" right={<Small tone="wine">შექმნა</Small>} onClick={() => setCreating(true)} />
        <NewGroupSheet cls={cls} open={creating} onClose={() => setCreating(false)} />
      </Rows>
    );
  }
  return <GroupRow group={group} uid={user?.uid} onOpen={() => { openPsalterGroup(group.id); navigateTo('psalter'); }} />;
};

const GroupRow: React.FC<{ group: NonNullable<ReturnType<typeof useClassGroup>>; uid?: string; onOpen: () => void }> = ({ group, uid, onOpen }) => {
  const { cycle, slots, mine } = useGroupNow(group, uid);
  if (!cycle) return null;
  const isMember = !!uid && group.memberIds.includes(uid);
  return (
    <Rows>
      <Row
        lead={<Dot icon={<BookOpen />} size={40} />}
        title={`ფსალმუნი · ${readCount(slots)} / ${KATHISMA_COUNT}`}
        sub={`${formatRange(cycle)}${isMember && mine.length ? ` · შენი კანონი: ${mine.join(', ')}` : ''}`}
        onClick={onOpen}
      />
    </Rows>
  );
};
