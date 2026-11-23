import React, { useState } from 'react';
import { AudioLines, BookOpen, Check, ChevronDown, ChevronUp, ClipboardList, CloudCheck, CloudDownload, FileText, GraduationCap, Loader2, Mic, Music, Plus, Sparkles, Users } from 'lucide-react';
import { useAuth, useChants, useNavigation } from '../../../context';
import { Avatar, Bar, Button, Card, Dot, Note, Pill, Press, RoundButton, Row, Rows, Sheet, Small, cx } from '../../../components/ui2';
import { FOCUS } from '../../../components/ui2/cx';
import type { ProgramItem, SchoolClass } from '../../../hooks/useClasses';
import { usePathMarks } from '../../../hooks/usePathMarks';
import { ownVoices, useClassMarks } from '../../../hooks/useClassMarks';
import { useAccess } from '../../../hooks/useAccess';
import { prepItem } from './nav';
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
import { ProgramOfflineSheet } from './ProgramOfflineSheet';
import { openAiLesson } from '../../../components/aiLesson/open';
import { useMemberNotes } from '../aiklasi/useAiNotes';
import { saveClassProgram } from '../../../components/admin/ClassesAdmin';
import { askConfirm, offerUndo } from '../../../components/ui/kit';
import { errorText } from '../../../utils/errorText';
import { ArrangeSheet, Held } from './ArrangeSheet';

type Listed = ProgramItem & { id: string; key: string; at: number };
type Knower = { m: SchoolClass['members'][number]; ok: boolean; me: boolean };

const VOICE_NAME: Record<Voice, string> = { '1': 'პირველი ხმა', '2': 'მეორე ხმა', '3': 'მესამე ხმა' };
const ROMAN_V: Record<Voice, string> = { '1': 'I', '2': 'II', '3': 'III' };

/** The round 1 2 3 at a program line's end: wine once known, green once a teacher counted it. */
const Mark: React.FC<{ n: string; on: boolean; ok: boolean }> = ({ n, on, ok }) => (
  <span aria-hidden="true" className={`flex size-[30px] shrink-0 items-center justify-center rounded-full text-meta font-bold tabular-nums ${
    ok ? 'bg-leaf text-white' : on ? 'bg-wine text-white' : 'border-[1.5px] border-dim text-mut'}`}>
    {n}
  </span>
);

/** x-klasi — the class's „პროგრამა“ tab: the program card, then the psalter group's row. */
/** `compact`: the class chat's fold (2026-11-22, the user: „კომპაქტური გახადე უფრო“) — one header line with the count, the
 *  bar thin under it, „+“ beside the ☁, the rows tighter and no psalter row (the list's „ფს.ჯ.“ has it) */
export const ProgramTab: React.FC<{ cls: SchoolClass; canEdit: boolean; compact?: boolean }> = ({ cls, canEdit, compact }) => {
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
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [arranging, setArranging] = useState<string | null>(null);
  const [arrangeErr, setArrangeErr] = useState('');
  const iAmMember = !!user && cls.memberIds.includes(user.uid);
  const { openMapItem } = useNavigation();
  const aiOn = useAccess().on('aiTeacher');

  const listed: Listed[] = cls.program.flatMap((p, i) => (p.id ? [{ ...p, id: p.id, key: `${i}:${p.id}`, at: i }] : []));
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

  // a teacher's long press on a line: move it among its kind's lines, or take it off the program (with „გაუქმება“)
  const saveProgram = (next: ProgramItem[]) => {
    setArrangeErr('');
    return saveClassProgram(cls, next)
      .then(why => { if (why) setArrangeErr(String(why)); })
      .catch(e => setArrangeErr('ვერ შეინახა: ' + errorText(e)));
  };
  const arrangedItem = arranging ? listed.find(p => p.id === arranging) ?? null : null;
  const arrangedGroup = arrangedItem ? cats.find(c => c.id === categoryOf(arrangedItem.id))?.items ?? [] : [];
  const arrangedAt = arrangedItem ? arrangedGroup.findIndex(p => p.id === arrangedItem.id) : -1;
  const moveLine = (dir: -1 | 1) => {
    const other = arrangedGroup[arrangedAt + dir];
    if (!arrangedItem || !other) return;
    const next = [...cls.program];
    [next[arrangedItem.at], next[other.at]] = [next[other.at], next[arrangedItem.at]];
    void saveProgram(next);
  };
  const deleteLine = async () => {
    if (!arrangedItem) return;
    const name = programLines(arrangedItem).title;
    const ok = await askConfirm({ title: `წავშალო „${name}“ პროგრამიდან?`, ok: 'წაშლა', danger: true });
    if (!ok) return;
    const before = cls.program;
    setArranging(null);
    await saveProgram(before.filter((_, i) => i !== arrangedItem.at));
    offerUndo('პროგრამიდან წაიშალა', () => { void saveClassProgram(cls, before).catch(() => {}); });
  };

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
    // while a download runs (or just after) the right side says whether this one is on the phone
    const st = offline.showStates ? offline.savedItem(p.id) : null;
    if (st !== null) {
      right = st
        ? <span className="flex shrink-0 items-center gap-1 text-meta font-semibold text-wine"><Check className="size-4" aria-hidden="true" />ტელეფონშია</span>
        : <span className="shrink-0 text-meta text-mut">იწერება…</span>;
    }
    const row = (
      <Row key={p.key} title={lines.title} sub={[lines.sub, p.note].filter(Boolean).join(' · ') || undefined} right={right} onClick={() => setShown(p.key)} aria-haspopup="dialog"
        className={compact ? 'min-h-0! py-1.5!' : undefined} />
    );
    return canEdit ? <Held key={p.key} onLong={() => setArranging(p.id)}>{row}</Held> : row;
  };
  const open = listed.find(p => p.key === shown);

  return (
    <div className="flex flex-col gap-2.5">
      <Card pad="none">
        <div className={cx('flex flex-col', compact ? 'gap-1.5 px-3.5 pt-2.5 pb-2' : 'gap-2 px-4 pt-4 pb-3')}>
          <div className="flex items-center justify-between gap-2">
            <h2 className={cx('min-w-0 truncate font-bold', compact ? 'text-lead' : 'text-head')}>
              სასწავლო პროგრამა
              {compact && iAmMember && total > 0 && <span className="ml-1.5 text-meta font-semibold text-mut tabular-nums">{learned} / {total}</span>}
            </h2>
            <div className="flex shrink-0 items-center gap-1">
              {compact && canEdit && (
                <RoundButton label="დამატება" size={36} tone="plain" onClick={() => setAdding(true)}><Plus /></RoundButton>
              )}
              {!iAmMember && cls.program.length > 0 && <Small>{cls.program.length}</Small>}
              {offline.shown && (
                <RoundButton label={offline.label} size={36} tone="plain" onClick={() => setOfflineOpen(true)} aria-haspopup="dialog">
                  {offline.busy ? <Loader2 className="animate-spin" /> : offline.saved ? <CloudCheck /> : <CloudDownload />}
                </RoundButton>
              )}
            </div>
          </div>
          {offline.busy && offline.count > 0 && (
            <>
              <div className="text-meta font-semibold text-wine tabular-nums">იწერება · {offline.savedCount} / {offline.count}</div>
              <Bar value={offline.savedCount / offline.count} label="ჩამოწერა" />
            </>
          )}
          {iAmMember && total > 0 && compact && <Bar value={learned / total} label="ნასწავლი" />}
          {iAmMember && total > 0 && !compact && (
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
        {canEdit && !compact && (
          <div className="flex items-center justify-between gap-2 border-t border-line px-2 py-1">
            <Button kind="quiet" size="md" icon={<Plus />} onClick={() => setAdding(true)}>დამატება</Button>
          </div>
        )}
      </Card>
      {offline.shown && !offline.saved && offline.trouble && <Note className="text-danger">{offline.trouble}</Note>}
      {offline.shown && (
        <ProgramOfflineSheet open={offlineOpen} onClose={() => setOfflineOpen(false)} o={offline} classId={cls.id} word={word} />
      )}
      {done && <Note>{done}</Note>}
      {arrangeErr && <Note className="text-danger">{arrangeErr}</Note>}
      {canEdit && (
        <ArrangeSheet open={!!arrangedItem} title={arrangedItem ? programLines(arrangedItem).title : ''}
          at={arrangedAt} count={arrangedGroup.length} onMove={moveLine} onDelete={() => { void deleteLine(); }}
          deleteSub="მთელი კლასის პროგრამიდან" onClose={() => setArranging(null)} />
      )}

      {!compact && <PsalterRow cls={cls} canLead={canEdit} />}
      {iAmMember && !canEdit && <AiNoteRow cls={cls} uid={user?.uid} />}

      {canEdit && <ProgramAddSheet cls={cls} open={adding} onClose={() => setAdding(false)} />}
      {assigning && (
        <NewAssignment open only="chant" preset={assigning} cls={cls} onClose={() => setAssigning(null)} onDone={setDone} />
      )}
      {open && (
        <ItemSheet
          p={open}
          onClose={() => setShown(null)}
          go={openerOf(open.id, open.title, open.take)}
          piece={learnPieceOf(open.id)}
          onLearn={piece => { setShown(null); openLearning(piece); }}
          onStudio={studioPiece(open.id) && (iAmMember || canEdit) ? () => { setShown(null); setStudio(open.id); } : null}
          onAssign={canEdit && findCatalogEntry(open.id) ? () => { setShown(null); setAssigning(findCatalogEntry(open.id) || null); } : null}
          // the AI prepares a lesson from the chant's notes (AI step 3, x-ai-avto): the class's teachers, while the AI teacher is on
          onPrep={canEdit && aiOn && usesVoices(open.id) ? () => { setShown(null); openMapItem(prepItem(open.id)); } : null}
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

/** x-programis-punkti — one program item's window: one main „სწავლა“ (the notes / the song when nothing can be learned),
 *  the voices as three tiles (a member's tap = „ვიცი“; green = a teacher counted it), who in the class knows each folded
 *  under them, then rows: the notes, the studio, a teacher's „დავალებად მიცემა“ and „AI გაკვეთილი“. */
const ItemSheet: React.FC<{
  p: Listed;
  onClose: () => void;
  go: (() => void) | null;
  piece: string | null;
  onLearn: (piece: string) => void;
  onStudio: (() => void) | null;
  onAssign: (() => void) | null;
  onPrep?: (() => void) | null;
  member: boolean;
  teacher: boolean;
  own: { known: Voice[]; confirmed: Voice[] };
  locked: boolean;
  onMark: (v: Voice) => void;
  knowers: (v: Voice) => Knower[];
}> = ({ p, onClose, go, piece, onLearn, onStudio, onAssign, onPrep, member, teacher, own, locked, onMark, knowers }) => {
  const lines = programLines(p);
  const voiced = usesVoices(p.id);
  const song = categoryOf(p.id) === 'simghera';
  const [names, setNames] = useState(false);
  const list = voicedList(voiced);
  const who = list.map(v => ({ v, people: knowers(v) }));
  const everyone = new Map(who.flatMap(w => w.people.map(k => [k.m.uid, k.m] as const)));
  const kind = categoryOf(p.id);
  const goLabel = song ? 'სიმღერა' : kind === 'video' ? 'ვიდეო' : kind === 'wigni' ? 'წიგნი' : kind === 'abituri' ? 'გახსნა' : 'ნოტები';
  const openGo = go ? () => { onClose(); go(); } : null;
  return (
    <Sheet open onClose={onClose} title={lines.title}>
      {(lines.sub || p.note) && (
        <div className="flex flex-col gap-1 px-1 text-meta text-mut">
          {lines.sub && <p>{lines.sub}</p>}
          {p.note && <p className="whitespace-pre-line">{p.note}</p>}
        </div>
      )}
      {piece ? (
        <Button full icon={<GraduationCap />} onClick={() => onLearn(piece)}>სწავლა</Button>
      ) : openGo ? (
        <Button full icon={<Music />} onClick={openGo}>{goLabel}</Button>
      ) : null}

      <Card pad="sm" className="flex flex-col gap-2.5">
        <div className="px-1 text-meta font-semibold text-mut">
          {member ? (voiced ? 'რომელი ხმა იცი?' : 'ისწავლე?') : voiced ? 'ვინ რომელი ხმა იცის' : 'ვინ იცის'}
        </div>
        <div className={voiced ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-1'}>
          {who.map(({ v, people }) => {
            const title = voiced ? `${ROMAN_V[v]} ხმა` : 'ნასწავლი';
            if (!member) {
              return (
                <div key={v} className="flex min-h-16 min-w-0 flex-col items-center justify-center rounded-tile bg-page px-1.5 py-2 text-center">
                  <span className="text-body font-bold">{title}</span>
                  <span className="text-meta text-mut">{people.length ? `იცის ${people.length}` : 'ჯერ არავინ'}</span>
                </div>
              );
            }
            const ok = own.confirmed.includes(v);
            const on = ok || own.known.includes(v);
            const state = ok ? 'ჩათვლილია' : on ? 'ვიცი' : 'ჯერ არა';
            return (
              <Press
                key={v}
                aria-pressed={on}
                aria-label={`${title} — ${state}`}
                disabled={locked || ok}
                onClick={() => onMark(v)}
                className={cx(
                  'flex min-h-16 min-w-0 cursor-pointer flex-col items-center justify-center rounded-tile px-1.5 py-2 text-center transition active:scale-[0.97]',
                  'disabled:cursor-default disabled:active:scale-100',
                  ok ? 'bg-leaf text-white' : on ? 'bg-wine text-white' : 'bg-page text-ink',
                  locked && !ok && 'disabled:opacity-60',
                  FOCUS,
                )}
              >
                <span className="text-body font-bold">{title}</span>
                <span className={cx('text-meta', on ? 'text-white/85' : 'text-mut')}>{state}</span>
              </Press>
            );
          })}
        </div>
        {everyone.size > 0 && (
          <Press
            aria-expanded={names}
            onClick={() => setNames(n => !n)}
            className={cx('flex min-h-tap cursor-pointer items-center gap-2 rounded-full px-1 text-left', FOCUS)}
          >
            <span aria-hidden="true" className="flex -space-x-2">
              {[...everyone.values()].slice(0, 3).map(m => <Avatar key={m.uid} name={m.name} photo={m.photoURL} size={32} className="ring-2 ring-surf" />)}
            </span>
            <span className="min-w-0 flex-1 truncate text-meta font-semibold text-mut">კლასში იცის {everyone.size}</span>
            {names ? <ChevronUp aria-hidden="true" className="size-[18px] shrink-0 text-mut" /> : <ChevronDown aria-hidden="true" className="size-[18px] shrink-0 text-mut" />}
          </Press>
        )}
        {names && (
          <div className="sg-in flex flex-col gap-2 px-1 pb-1">
            {who.filter(w => w.people.length).map(({ v, people }) => (
              <div key={v} className="flex flex-col gap-1">
                {voiced && <span className="text-cap font-semibold text-mut">{VOICE_NAME[v]}</span>}
                <ul className="flex flex-wrap gap-1.5">
                  {people.map(({ m, ok, me }) => <li key={m.uid} className="max-w-full"><Pill on={ok}>{m.name}{me ? ' (შენ)' : ''}</Pill></li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
      {member && locked && <Note>მონიშვნას ახლა მასწავლებელი აკეთებს.</Note>}

      {((piece && openGo) || onStudio || onAssign || onPrep) && (
        <Rows>
          {piece && openGo && <Row lead={<Dot icon={song ? <Music /> : <FileText />} />} title={goLabel} onClick={openGo} />}
          {onStudio && (
            <Row
              lead={<Dot icon={teacher ? <AudioLines /> : <Mic />} />}
              title={teacher ? 'ჯგუფური ჩანაწერი' : 'ჩემი ხმის ჩაწერა'}
              sub={teacher ? 'კლასის ჩანაწერები ერთად' : 'მასწავლებელს ეგზავნება'}
              onClick={onStudio}
            />
          )}
          {onAssign && <Row lead={<Dot icon={<ClipboardList />} />} title="დავალებად მიცემა" sub="ვადით — კლასს ან ზოგიერთს" onClick={onAssign} />}
          {onPrep && <Row lead={<Dot icon={<Sparkles />} />} title="AI გაკვეთილი" sub="ფრაზები და კითხვები ნოტებიდან" onClick={onPrep} />}
        </Rows>
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

/** x-klasi — „✦ მითითება ავტომატურ სასწავლო პროგრამას“: shown to a member while the class or they have a note; opens the day's lesson. */
const AiNoteRow: React.FC<{ cls: SchoolClass; uid?: string }> = ({ cls, uid }) => {
  const on = useAccess().on('aiTeacher');
  const notes = useMemberNotes(cls.id, uid, on);
  if (!on || !notes.length) return null;
  return (
    <Rows>
      <Row
        lead={<Dot icon={<Sparkles />} size={40} />}
        title="მითითება ავტომატურ სასწავლო პროგრამას"
        sub={`ამ კვირას: „${notes[0].note.text}“`}
        onClick={openAiLesson}
      />
    </Rows>
  );
};
