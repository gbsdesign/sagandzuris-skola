import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Dumbbell, Lock, Music, Pencil, Plus, Send, Users } from 'lucide-react';
import type { SchoolClass } from '../../../hooks/useClasses';
import type { PinInput } from '../../../hooks/useChatPins';
import type { PinPerson } from '../../../components/classes/PinSheet';
import { PICKER_GROUPS, useNewAssignment } from '../../../components/teacher/AssignmentsPanel';
import { localIso } from '../../../hooks/useTeaching';
import { CATEGORY_LABEL, type CatalogEntry, findCatalogEntry, searchCatalog } from '../../../utils/pathItems';
import { MONTHS_GE } from '../../../utils/dateNames';
import {
  Area, Avatar, Button, Card, Choice, Dot, Helper, Note, Press, Row, Rows, SectionLabel, Seg, Sheet, Val, WrapChips, cx,
} from '../../../components/ui2';
import { FOCUS } from '../../../components/ui2/cx';
import { SearchBox } from './teacher/SearchBox';

/** x-komentari / x-davaleba — the chat's 📎 for a teacher or an admin in the new look: one window „მოსწავლისთვის“ — who it
 *  is for (a card with „შეცვლა“ when the chat has several), a switch „კომენტარი · დავალება“, then the comment's box or the
 *  assignment's three rows (რა · ვადა · შენიშვნა). The old three steps' logic: `onSend` and NewAssignment's
 *  `useNewAssignment` (`forWhom`, `onMade`). */

type What = 'note' | 'work';

export const PinSheetV2: React.FC<{
  open: boolean;
  onClose: () => void;
  people: PinPerson[];
  classes: SchoolClass[];
  inClass: boolean;
  onSend: (p: PinInput) => Promise<void>;
  preset?: CatalogEntry | null;
}> = ({ open, onClose, people, classes, inClass, onSend, preset }) => {
  const only = people.length === 1 ? people[0] : null;
  const [who, setWho] = useState<PinPerson | null>(only);
  const [what, setWhat] = useState<What>('note');
  const [workCls, setWorkCls] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // each opening starts the assignment afresh
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!open) return;
    setWho(only); setWhat(preset ? 'work' : 'note'); setWorkCls(null); setText(''); setErr(''); setRound(r => r + 1);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const mine = who ? classes.filter(c => c.memberIds.includes(who.uid)) : [];
  const cls = mine.find(c => c.id === workCls) || mine[0] || null;

  const sendNote = async () => {
    if (!who || !text.trim()) return;
    setBusy(true);
    setErr('');
    try {
      await onSend({ kind: 'note', to: who.uid, toName: who.name, text: text.trim() });
      onClose();
    } catch (e) {
      console.warn('pin: ', e);
      setErr('ვერ გაიგზავნა. სცადეთ თავიდან.');
    } finally {
      setBusy(false);
    }
  };

  const seenBy = who
    ? inClass ? `დაინახავს მხოლოდ ${who.name}, კლასის მასწავლებლები და ადმინები.` : `დაინახავს მხოლოდ ${who.name}.`
    : '';

  return (
    <Sheet open={open} onClose={onClose} title="მოსწავლისთვის">
      {!who ? (
        <>
          <SectionLabel label="ვისთვის?" />
          <Rows>
            {people.map(p => (
              <Row key={p.uid} lead={<Avatar name={p.name || '?'} photo={p.photoURL} />} title={p.name || 'უსახელო'} wrap onClick={() => setWho(p)} />
            ))}
          </Rows>
        </>
      ) : (
        <>
          <Card pad="sm" className="flex items-center gap-3">
            <Avatar name={who.name || '?'} photo={who.photoURL} size={48} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="sg-fit truncate text-lead font-bold">{who.name}</span>
              {mine.length > 0 && <span className="sg-fit truncate text-meta text-mut">{mine.map(c => c.name).join(' · ')}</span>}
            </span>
            {!only && (
              <Press
                onClick={() => setWho(null)}
                className={cx('h-tap shrink-0 cursor-pointer rounded-full bg-page px-4 text-body font-bold text-ink transition active:scale-[0.97] active:bg-soft', FOCUS)}
              >
                შეცვლა
              </Press>
            )}
          </Card>
          <Seg<What>
            label="რა გინდა"
            items={[{ id: 'note', label: 'კომენტარი' }, { id: 'work', label: 'დავალება' }]}
            value={what}
            onChange={setWhat}
          />
          {what === 'note' ? (
            <>
              <Area
                label="რა უთხრა?"
                hideLabel
                value={text}
                onChange={setText}
                maxLength={2000}
                placeholder="რა უთხრა? მაგ. მესამე მუხლში ბანი უფრო რბილად"
              />
              <Helper icon={<Lock />}>{seenBy}</Helper>
              {err && <Note className="text-danger">{err}</Note>}
              <div className="sticky bottom-0 mt-auto bg-page pt-2">
                <Button full icon={<Send />} disabled={busy || !text.trim()} onClick={sendNote}>{busy ? 'იგზავნება…' : 'გაგზავნა'}</Button>
              </div>
            </>
          ) : cls ? (
            <WorkForm
              key={`${round}:${cls.id}:${who.uid}`}
              cls={cls}
              classes={mine}
              onClass={setWorkCls}
              who={who}
              seenBy={seenBy}
              onClose={onClose}
              onSend={onSend}
              preset={preset}
            />
          ) : (
            <>
              <Note>{who.name} არცერთ კლასში არ არის — დავალება კლასში იქმნება.</Note>
              <div className="sticky bottom-0 mt-auto bg-page pt-2">
                <Button full icon={<Plus />} disabled>დავალების მიცემა</Button>
              </div>
            </>
          )}
        </>
      )}
    </Sheet>
  );
};

const dayName = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return y ? `${d} ${MONTHS_GE[m - 1]}` : iso;
};
const inDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return localIso(d); };
const SOON = [
  { days: 1, label: 'ხვალ' },
  { days: 3, label: '3 დღეში' },
  { days: 7, label: 'ერთ კვირაში' },
  { days: 14, label: 'ორ კვირაში' },
];
const VOICE_ITEMS = [{ id: '1', label: 'I ხმა' }, { id: '2', label: 'II ხმა' }, { id: '3', label: 'III ხმა' }];
const ROMAN: Record<string, string> = { '1': 'I', '2': 'II', '3': 'III' };

/** x-davaleba — the assignment's three rows; each opens its own small window. */
const WorkForm: React.FC<{
  cls: SchoolClass;
  classes: SchoolClass[];
  onClass: (id: string) => void;
  who: PinPerson;
  seenBy: string;
  onClose: () => void;
  onSend: (p: PinInput) => Promise<void>;
  preset?: CatalogEntry | null;
}> = ({ cls, classes, onClass, who, seenBy, onClose, onSend, preset }) => {
  const a = useNewAssignment({
    cls,
    preset,
    onClose,
    onDone: () => {},
    forWhom: { uid: who.uid, name: who.name },
    onMade: m => onSend({
      kind: 'work', to: who.uid, toName: who.name, text: m.title,
      work: m.id, wcls: cls.id, vid: m.variantId || '', drill: m.exercise || '', due: m.due, note: m.note,
    }).catch(e => console.warn('pin: ', e)),
  });
  const [open, setOpen] = useState<'what' | 'due' | 'note' | 'class' | null>(null);
  const close = () => setOpen(null);

  const chosen = a.kind === 'drill' ? a.drill : a.entry;
  const voices = a.withVoices && a.voices.length ? ` · ${[...a.voices].sort().map(v => ROMAN[v]).join(', ')} ხმა` : '';
  const whatSub = a.kind === 'drill'
    ? a.drill && `სავარჯიშო · ${a.drill.exercise.minutes} წთ`
    : a.entry && `${CATEGORY_LABEL[a.entry.category]}${voices}`;

  return (
    <>
      <Rows>
        <Row
          lead={<Dot icon={a.kind === 'drill' ? <Dumbbell /> : <Music />} />}
          title={chosen ? chosen.title : 'საგალობელი ან სავარჯიშო'}
          sub={chosen ? whatSub || undefined : undefined}
          wrap
          right={chosen ? 'chev' : <Val>აირჩიე</Val>}
          onClick={() => setOpen('what')}
          aria-haspopup="dialog"
        />
        <Row lead={<Dot icon={<CalendarDays />} />} title="ვადა" right={<Val>{a.due ? dayName(a.due) : 'აირჩიე'}</Val>} onClick={() => setOpen('due')} aria-haspopup="dialog" />
        <Row lead={<Dot icon={<Pencil />} />} title="შენიშვნა" right={<Val>{a.note.trim() || 'არ არის'}</Val>} onClick={() => setOpen('note')} aria-haspopup="dialog" />
        {classes.length > 1 && (
          <Row lead={<Dot icon={<Users />} />} title="კლასი" right={<Val>{cls.name}</Val>} onClick={() => setOpen('class')} aria-haspopup="dialog" />
        )}
      </Rows>
      <Helper icon={<Lock />}>{seenBy}</Helper>
      {a.error && <Note className="text-danger">{a.error}</Note>}
      <div className="sticky bottom-0 mt-auto bg-page pt-2">
        <Button full icon={<Plus />} disabled={a.busy || !a.ready} onClick={a.save}>{a.busy ? 'იქმნება…' : 'დავალების მიცემა'}</Button>
      </div>

      <WhatSheet open={open === 'what'} onClose={close} cls={cls} a={a} />

      <Sheet open={open === 'due'} title="ვადა" onClose={close}>
        <Rows role="radiogroup">
          {SOON.map(s => {
            const iso = inDays(s.days);
            return <Choice key={s.days} title={s.label} sub={dayName(iso)} on={a.due === iso} onClick={() => { a.setDue(iso); close(); }} />;
          })}
        </Rows>
        <label className="flex flex-col gap-1.5">
          <span className="pl-1.5 text-meta font-semibold text-mut">სხვა დღე</span>
          <input
            type="date"
            value={a.due}
            min={localIso()}
            onChange={e => a.setDue(e.target.value)}
            className={cx('h-[52px] w-full min-w-0 rounded-full bg-surf px-[18px] text-lead text-ink', FOCUS)}
          />
        </label>
        <Button full onClick={close}>მზადაა</Button>
      </Sheet>

      <NoteSheet open={open === 'note'} value={a.note} onSave={v => { a.setNote(v); close(); }} onClose={close} />

      <Sheet open={open === 'class'} title="რომელ კლასში?" onClose={close}>
        <Rows role="radiogroup">
          {classes.map(c => <Choice key={c.id} title={c.name} on={c.id === cls.id} onClick={() => { onClass(c.id); close(); }} />)}
        </Rows>
      </Sheet>
    </>
  );
};

type Assign = ReturnType<typeof useNewAssignment>;

/** What to give: a chant (the class's program first, or a search over every chant, song, poem, instrument) or one of
 *  „ოსტატობა“'s exercises; a chant with voices then asks which. */
const WhatSheet: React.FC<{ open: boolean; onClose: () => void; cls: SchoolClass; a: Assign }> = ({ open, onClose, cls, a }) => {
  const [q, setQ] = useState('');
  useEffect(() => { if (open) setQ(''); }, [open]);
  const words = q.toLowerCase().trim();
  const program = useMemo(
    () => (open ? cls.program.flatMap(p => { const e = p.id ? findCatalogEntry(p.id) : undefined; return e ? [e] : []; }) : []),
    [open, cls.program],
  );
  const found = useMemo(() => (open && words ? searchCatalog(words, 25) : []), [open, words]);
  const chants: CatalogEntry[] = words ? found : program;
  const drills = PICKER_GROUPS
    .map(g => ({ ...g, drills: words ? g.drills.filter(d => d.title.toLowerCase().includes(words)) : g.drills }))
    .filter(g => g.drills.length);

  const pickChant = (e: CatalogEntry) => {
    const same = a.entry?.id === e.id;
    a.setEntry(e);
    if (!same) a.setVoices([]);
    a.setError('');
  };

  return (
    <Sheet open={open} title="რა დავალება?" onClose={onClose} className="min-h-[70dvh]">
      <Seg<'chant' | 'drill'>
        label="რა სახის"
        items={[{ id: 'chant', label: 'საგალობელი', icon: <Music /> }, { id: 'drill', label: 'სავარჯიშო', icon: <Dumbbell /> }]}
        value={a.kind}
        onChange={k => { a.setKind(k); a.setError(''); }}
      />
      <SearchBox value={q} onChange={setQ} placeholder={a.kind === 'drill' ? 'მოძებნე სავარჯიშო' : 'მოძებნე საგალობელი ან სიმღერა'} />
      {a.kind === 'chant' ? (
        <>
          {a.entry && a.withVoices && (
            <>
              <SectionLabel label="ხმა · რამდენიც გინდა" />
              <WrapChips label="ხმა" items={VOICE_ITEMS} value={a.voices} onChange={a.setVoices} />
            </>
          )}
          {!words && <SectionLabel label={program.length ? 'სასწავლო პროგრამიდან' : 'მოძებნე ზემოთ'} />}
          {chants.length > 0 ? (
            <Rows role="radiogroup">
              {chants.map(e => (
                <Choice key={e.id} title={e.title} sub={`${CATEGORY_LABEL[e.category]} · ${e.code}`} on={a.entry?.id === e.id} onClick={() => pickChant(e)} wrap />
              ))}
            </Rows>
          ) : words ? <Note>ვერ მოიძებნა.</Note> : null}
        </>
      ) : drills.length ? (
        drills.map(g => (
          <React.Fragment key={g.id}>
            <SectionLabel label={g.title} />
            <Rows role="radiogroup">
              {g.drills.map(d => (
                <Choice key={d.id} title={d.title} sub={`${d.exercise.minutes} წთ`} on={a.drillId === d.id} onClick={() => { a.setDrillId(d.id); a.setError(''); }} wrap />
              ))}
            </Rows>
          </React.Fragment>
        ))
      ) : (
        <Note>ვერ მოიძებნა.</Note>
      )}
      <div className="sticky bottom-0 mt-auto bg-page pt-2">
        <Button full disabled={!a.ready} onClick={onClose}>მზადაა</Button>
      </div>
    </Sheet>
  );
};

const NoteSheet: React.FC<{ open: boolean; value: string; onSave: (v: string) => void; onClose: () => void }> = ({ open, value, onSave, onClose }) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (open) setDraft(value); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Sheet open={open} title="შენიშვნა" onClose={onClose}>
      <Area label="შენიშვნა" hideLabel value={draft} onChange={setDraft} autoFocus placeholder="მაგ: ყურადღება მიაქციე მესამე მუხლის ბანს" />
      <Button full onClick={() => onSave(draft)}>მზადაა</Button>
    </Sheet>
  );
};
