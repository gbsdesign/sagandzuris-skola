import React, { useMemo, useState } from 'react';
import { Check, Info, X } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { Area, Avatar, Button, Card, Chips, Helper, RoundButton, Row, Rows, SectionLabel, Sheet, TopBar } from '../../../components/ui2';
import { askConfirm } from '../../../components/ui/kit';
import type { SchoolClass } from '../../../hooks/useClasses';
import { useClassStudents } from '../../../hooks/useTeaching';
import { errorText } from '../../../utils/errorText';
import { NOTE_MAX, activeFor, makeNote, noteLine, type AiStudentNote } from '../../../utils/aiTeacherNotes';
import { changeClassNotes, changeStudentNotes, useClassNotes } from './useAiNotes';
import { kaName } from '../../../utils/georgianName';

// x-ai-mititeba — what the teacher tells the AI teacher: one text for the whole class or for one student, and the list of
// what works now. The AI reads these before every lesson until a note is taken away.

type Who = 'class' | 'one';
const WHO = [{ id: 'class' as const, label: 'მთელ კლასს' }, { id: 'one' as const, label: 'ერთ მოსწავლეს' }];

export const InstructionScreen: React.FC<{ cls: SchoolClass }> = ({ cls }) => {
  const { handleGoBack } = useNavigation();
  const { user } = useAuth();
  const records = useClassStudents(cls);
  const classNotes = useClassNotes(cls.id);
  const [who, setWho] = useState<Who>('class');
  const [pick, setPick] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const nameOf = (uid: string) => cls.members.find(m => m.uid === uid)?.name ?? 'მოსწავლე';
  // everything that works in this class: its own note and each member's (a note a member got in another class is left out)
  const active = useMemo(() => {
    const own = cls.members.flatMap(m => (records[m.uid]?.data?.aiTeacherNotes ?? []) as AiStudentNote[]);
    const mine = own.filter(n => n && n.classId === cls.id);
    return activeFor(classNotes, mine);
  }, [classNotes, records, cls.id, cls.members]);

  const choose = (w: Who) => { setWho(w); if (w === 'one' && !pick) setPicking(true); };
  const ready = !!text.trim() && (who === 'class' || !!pick) && !busy;

  const save = async () => {
    if (!user || !ready) return;
    const base = makeNote(text, user.uid, kaName(user.displayName) || 'მასწავლებელი');
    if (!base) return;
    setBusy(true);
    setError('');
    try {
      if (who === 'class') await changeClassNotes(cls.id, { add: base });
      else await changeStudentNotes(pick!, { add: { ...base, classId: cls.id } });
      setText('');
    } catch (e) {
      setError('ვერ შეინახა: ' + errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a: (typeof active)[number]) => {
    const target = a.kind === 'student' ? cls.members.find(m => records[m.uid]?.data?.aiTeacherNotes?.some((n: AiStudentNote) => n.id === a.note.id)) : null;
    if (!(await askConfirm({ title: 'წავშალო ეს მითითება?', text: `„${a.note.text}“ — AI მას აღარ გაითვალისწინებს.`, ok: 'წაშლა', danger: true }))) return;
    setError('');
    try {
      if (a.kind === 'class') await changeClassNotes(cls.id, { removeId: a.note.id });
      else if (target) await changeStudentNotes(target.uid, { removeId: a.note.id });
    } catch (e) {
      setError('ვერ წაიშალა: ' + errorText(e));
    }
  };

  return (
    <div className="flex w-full flex-col gap-3 pb-6">
      <TopBar title="მითითება AI-ს" sub="მასწავლებლის გვერდი" onBack={handleGoBack} />
      <Chips items={WHO} value={who} onChange={choose} label="ვისთვის" />
      {who === 'one' && (
        <Rows>
          <Row
            lead={pick ? <Avatar name={nameOf(pick)} photo={cls.members.find(m => m.uid === pick)?.photoURL} size={32} /> : undefined}
            title={pick ? nameOf(pick) : 'აირჩიე მოსწავლე'}
            right={<span className="text-meta font-bold text-wine">{pick ? 'შეცვლა' : 'არჩევა'}</span>}
            onClick={() => setPicking(true)}
          />
        </Rows>
      )}
      <Area
        label="მითითება"
        hideLabel
        value={text}
        onChange={t => setText(t.slice(0, NOTE_MAX))}
        maxLength={NOTE_MAX}
        placeholder={who === 'class' ? 'მაგ.: ჯერ ბანი ასწავლე. ტემპს ნუ აუჩქარებ.' : 'მაგ.: ჯერ II ხმა ასწავლე.'}
      />
      <SectionLabel label="ახლა მოქმედებს" />
      {active.length ? (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {active.map(a => {
              const who2 = a.kind === 'student' ? cls.members.find(m => records[m.uid]?.data?.aiTeacherNotes?.some((n: AiStudentNote) => n.id === a.note.id)) : null;
              return (
                <li key={a.note.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-body leading-snug font-bold wrap-break-word">{a.note.text}</div>
                    <div className="text-meta text-mut">
                      {who2 ? noteLine(a.note, a.kind).replace('ერთ მოსწავლეს', `ერთ მოსწავლეს · ${who2.name.split(' ')[0]}`) : noteLine(a.note, a.kind)}
                    </div>
                  </div>
                  <RoundButton label="მითითების წაშლა" size={36} tone="page" onClick={() => remove(a)}><X /></RoundButton>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <p className="px-1.5 text-meta text-mut">ჯერ მითითება არ გაქვს.</p>
      )}
      <Helper icon={<Info />}>AI ამას ყოველ გაკვეთილზე ითვალისწინებს, სანამ არ წაშლი.</Helper>
      {error && <p className="px-1.5 text-meta font-semibold text-danger">{error}</p>}
      <Button full icon={<Check />} disabled={!ready} onClick={save}>შენახვა</Button>

      <Sheet open={picking} onClose={() => setPicking(false)} title="რომელ მოსწავლეს?">
        <Rows>
          {cls.members.map(m => (
            <Row key={m.uid} lead={<Avatar name={m.name} photo={m.photoURL} size={32} />} title={m.name}
              right={pick === m.uid ? <Check className="size-5 text-wine" /> : null}
              onClick={() => { setPick(m.uid); setPicking(false); }} />
          ))}
        </Rows>
      </Sheet>
    </div>
  );
};
