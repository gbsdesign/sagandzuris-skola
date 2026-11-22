import React, { useState } from 'react';
import { Bookmark, BookmarkCheck, CalendarDays, ChevronLeft, GraduationCap, ListPlus, Music, UserRound } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth, useChants } from '../../../context';
import { useNotes } from '../../../context/NotesContext';
import { useManagedClasses, type SchoolClass } from '../../../hooks/useClasses';
import { saveClassProgram } from '../../../components/admin/ClassesAdmin';
import { Avatar, Dot, Helper, Row, Rows, Sheet } from '../../../components/ui2';
import { ClassLogo } from '../../../components/classes/ClassLogo';
import type { ChantItem, ChantVariant } from '../../../data';
import { versionTitle } from '../../../data/tsirvaChants';
import { addDayChant, removeDayChant, tbilisiToday, useDayChants } from '../../../utils/dayChants';
import { triggerHaptic } from '../../../utils/haptics';
import { errorText } from '../../../utils/errorText';

// A version card's long press (2026-11-22, the user: „დიდხანს დაჭერისას ამოვიდეს ფანჯარა … კლასის პროგრამაში და ინდივიდუალურ
// პროგრამაშიც მიმაგრება … დღის მსახურებაში მონიშვნა“): my treasury (the old 🔖), today's liturgy (the old ≡+, the regent), today's
// day service, and for teachers and admins a class's program or one student's path.

type Step = { at: 'main' } | { at: 'class' } | { at: 'who' } | { at: 'student'; cls: SchoolClass };

export const VersionMenu: React.FC<{ chant: ChantItem; variant: ChantVariant; hasNotes: boolean; onClose: () => void }> = ({ chant, variant, hasNotes, onClose }) => {
  const { user, isTeacher } = useAuth();
  const { selectedChantVariants = {}, toggleVariantSelection } = useChants();
  const { liturgy } = useNotes();
  const { classes } = useManagedClasses();
  const day = useDayChants(user?.uid);
  const [step, setStep] = useState<Step>({ at: 'main' });
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');

  const id = variant.id;
  const title = versionTitle(chant, variant);
  const mine = !!selectedChantVariants[id];
  const progAt = liturgy.role === 'teacher' && hasNotes ? (liturgy.program?.items.indexOf(id) ?? -1) : null;
  const today = tbilisiToday();
  const inDay = (day[today] ?? []).includes(id);
  const said = (t: string) => { triggerHaptic(10); setErr(''); setNote(t); };
  const failed = (e: unknown) => { setNote(''); setErr('ვერ შეინახა: ' + errorText(e)); };

  const toggleClass = async (cls: SchoolClass) => {
    const has = cls.program.some(p => p.id === id);
    setBusy(cls.id);
    try {
      const next = has ? cls.program.filter(p => p.id !== id) : [...cls.program, { id, title, code: variant.code }];
      const why = await saveClassProgram(cls, next);
      if (why) setErr(String(why)); else said(has ? `${cls.name} — პროგრამიდან ამოვიდა` : `${cls.name} — პროგრამაში ჩაჯდა`);
    } catch (e) { failed(e); }
    setBusy('');
  };

  const addToStudent = async (uid: string, name: string) => {
    setBusy(uid);
    try {
      const ref = doc(db, 'students', uid);
      const snap = await getDoc(ref);
      const path = (snap.data()?.selectedChantVariants ?? {}) as Record<string, unknown>;
      if (path[id]) said(`${name}-ს უკვე აქვს გზაზე`);
      else {
        const item = { variantId: id, chantId: chant.id, chantName: chant.title, code: variant.code, label: variant.label, fullTitle: title, isLearned: false, voices: [] };
        await setDoc(ref, { selectedChantVariants: { [id]: item } }, { merge: true });
        said(`${name} — გზაზე ჩაჯდა`);
      }
    } catch (e) { failed(e); }
    setBusy('');
  };

  const back = step.at === 'student' ? () => setStep({ at: 'who' }) : () => setStep({ at: 'main' });
  const head = step.at !== 'main' && (
    <Rows>
      <Row lead={<Dot icon={<ChevronLeft />} />} title="უკან" right={null} onClick={() => { setNote(''); setErr(''); back(); }} />
    </Rows>
  );

  return (
    <Sheet open title={title} onClose={onClose}>
      <div className="flex flex-col gap-2.5">
        {head}
        {step.at === 'main' && (
          <Rows>
            <Row lead={<Dot icon={mine ? <BookmarkCheck /> : <Bookmark />} color={mine ? 'leaf' : undefined} />}
              title={mine ? 'ჩემი საგანძურიდან ამოღება' : 'ჩემს საგანძურში დამატება'} right={null}
              onClick={() => { toggleVariantSelection?.(chant, variant); if (user) said(mine ? 'საგანძურიდან ამოვიდა' : 'საგანძურში ჩაჯდა'); else onClose(); }} />
            {progAt !== null && (
              <Row lead={<Dot icon={<ListPlus />} color={progAt >= 0 ? 'wine' : undefined} />}
                title={progAt >= 0 ? 'დღევანდელი წირვიდან ამოღება' : 'დღევანდელ წირვაში დამატება'}
                sub={progAt >= 0 ? `წირვაშია, №${progAt + 1}` : undefined} right={null}
                onClick={() => { liturgy.toggle(id); said(progAt >= 0 ? 'წირვიდან ამოვიდა' : 'წირვაში ჩაჯდა'); }} />
            )}
            {user && (
              <Row lead={<Dot icon={<CalendarDays />} color={inDay ? 'wine' : undefined} />}
                title={inDay ? 'დღის მსახურებიდან ამოღება' : 'დღის მსახურებაში დამატება'} sub="დღეს, ჩემთვის" right={null}
                onClick={() => (inDay ? removeDayChant(user.uid, today, id) : addDayChant(user.uid, today, id))
                  .then(() => said(inDay ? 'დღის მსახურებიდან ამოვიდა' : 'დღის მსახურებაში ჩაჯდა'), failed)} />
            )}
            {isTeacher && classes.length > 0 && (
              <>
                <Row lead={<Dot icon={<GraduationCap />} />} title="კლასის პროგრამაში მიმაგრება" onClick={() => { setNote(''); setStep({ at: 'class' }); }} />
                <Row lead={<Dot icon={<UserRound />} />} title="მოსწავლის გზაზე მიმაგრება" onClick={() => { setNote(''); setStep({ at: 'who' }); }} />
              </>
            )}
          </Rows>
        )}
        {(step.at === 'class' || step.at === 'who') && (
          <Rows>
            {classes.map(cls => {
              const has = step.at === 'class' && cls.program.some(p => p.id === id);
              return (
                <Row key={cls.id} lead={<ClassLogo name={cls.name} logo={cls.logo} className="size-10 shrink-0" />} title={cls.name}
                  sub={step.at === 'class' ? (has ? 'პროგრამაშია — შეხებით ამოვა' : `${cls.program.length} საგალობელი`) : `${cls.members.length} მოსწავლე`}
                  right={step.at === 'class' ? (has ? <Music className="size-5 text-wine" aria-hidden="true" /> : null) : undefined}
                  disabled={!!busy}
                  onClick={() => (step.at === 'class' ? void toggleClass(cls) : setStep({ at: 'student', cls }))} />
              );
            })}
          </Rows>
        )}
        {step.at === 'student' && (
          step.cls.members.length === 0 ? <Helper>ამ კლასში მოსწავლე არ არის.</Helper> : (
            <Rows>
              {step.cls.members.map(m => (
                <Row key={m.uid} lead={<Avatar name={m.name} photo={m.photoURL} size={40} />} title={m.name} right={null}
                  disabled={!!busy} onClick={() => void addToStudent(m.uid, m.name)} />
              ))}
            </Rows>
          )
        )}
        {note && <p className="px-1 text-meta font-semibold text-leaf">{note}</p>}
        {err && <p className="px-1 text-meta font-semibold text-danger">{err}</p>}
      </div>
    </Sheet>
  );
};
