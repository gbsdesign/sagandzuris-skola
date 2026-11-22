import React, { useEffect, useMemo, useState } from 'react';
import { Bookmark, BookmarkCheck, CalendarDays, Check, ChevronLeft, GraduationCap, ListPlus, UserRound, Users } from 'lucide-react';
import { FieldPath, deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth, useChants } from '../../../context';
import { useNotes } from '../../../context/NotesContext';
import { useManagedClasses, type SchoolClass } from '../../../hooks/useClasses';
import { saveClassProgram } from '../../../components/admin/ClassesAdmin';
import { Avatar, Dot, Field, Helper, Row, Rows, SectionLabel, Sheet } from '../../../components/ui2';
import { ClassLogo } from '../../../components/classes/ClassLogo';
import type { ChantItem, ChantVariant } from '../../../data';
import { versionTitle } from '../../../data/tsirvaChants';
import { addDayChant, removeDayChant, tbilisiToday, useDayChants } from '../../../utils/dayChants';
import { shownName, useDirectory } from '../../../utils/directory';
import { kaName } from '../../../utils/georgianName';
import { triggerHaptic } from '../../../utils/haptics';
import { errorText } from '../../../utils/errorText';

// A version card's long press (2026-11-22, the user: „დიდხანს დაჭერისას ამოვიდეს ფანჯარა … კლასის პროგრამაში და ინდივიდუალურ
// პროგრამაშიც მიმაგრება … დღის მსახურებაში მონიშვნა“): my treasury (the old 🔖), today's liturgy (the old ≡+, the regent), today's
// day service, and for teachers and admins one way „კლასს ან მოსწავლეს“ (the same evening, the user: „მოსწავლეზე მიმაგრება არ
// მუშაობს … კლასის გარეშე წევრები არ ჩანს … გაორებული ფუნქციები“): the class list once, a class = its whole program on top and
// each member's path under it, each line saying whether it is there; an admin also gets the members of no class.

type Step = { at: 'main' } | { at: 'classes' } | { at: 'class'; cls: SchoolClass } | { at: 'loose' };
/** a member's path: has it / hasn't / could not be read */
type Has = 'yes' | 'no' | 'err';
type Person = { uid: string; name: string; photo?: string };


export const VersionMenu: React.FC<{ chant: ChantItem; variant: ChantVariant; hasNotes: boolean; onClose: () => void }> = ({ chant, variant, hasNotes, onClose }) => {
  const { user, isTeacher, isAdmin } = useAuth();
  const { selectedChantVariants = {}, toggleVariantSelection } = useChants();
  const { liturgy } = useNotes();
  const { classes } = useManagedClasses();
  const day = useDayChants(user?.uid);
  const [step, setStep] = useState<Step>({ at: 'main' });
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [has, setHas] = useState<Record<string, Has>>({});
  const [find, setFind] = useState('');
  const { people } = useDirectory(isAdmin && step.at === 'loose');

  const id = variant.id;
  const title = versionTitle(chant, variant);
  const mine = !!selectedChantVariants[id];
  const progAt = liturgy.role === 'teacher' && hasNotes ? (liturgy.program?.items.indexOf(id) ?? -1) : null;
  const today = tbilisiToday();
  const inDay = (day[today] ?? []).includes(id);
  const said = (t: string) => { triggerHaptic(10); setErr(''); setNote(t); };
  const failed = (e: unknown) => { setNote(''); setErr('ვერ შეინახა: ' + errorText(e)); };

  // the members of no class (admins): everyone in the directory who is in no class's list, nor teaches one
  const loose = useMemo<Person[]>(() => {
    if (step.at !== 'loose') return [];
    const inClass = new Set(classes.flatMap(c => [...c.memberIds, ...c.teacherIds]));
    const q = find.trim().toLowerCase();
    return people
      .filter(p => !inClass.has(p.uid) && p.uid !== user?.uid)
      .map(p => ({ uid: p.uid, name: shownName(p), photo: p.photoURL }))
      .filter(p => !q || p.name.toLowerCase().includes(q));
  }, [step.at, people, classes, find, user?.uid]);

  // a class's members: whether each has this version on their path, read once the class opens
  const classUids = step.at === 'class' ? step.cls.members.map(m => m.uid).join(',') : '';
  useEffect(() => {
    if (!classUids) return;
    let live = true;
    for (const uid of classUids.split(',')) {
      getDoc(doc(db, 'students', uid)).then(
        s => { if (live) setHas(h => ({ ...h, [uid]: (s.data()?.selectedChantVariants ?? {})[id] ? 'yes' : 'no' })); },
        () => { if (live) setHas(h => ({ ...h, [uid]: 'err' })); },
      );
    }
    return () => { live = false; };
  }, [classUids, id]);

  const toggleClass = async (cls: SchoolClass) => {
    const there = cls.program.some(p => p.id === id);
    setBusy(cls.id);
    try {
      const next = there ? cls.program.filter(p => p.id !== id) : [...cls.program, { id, title, code: variant.code }];
      const why = await saveClassProgram(cls, next);
      if (why) { setNote(''); setErr(String(why)); } else said(there ? 'კლასის პროგრამიდან ამოვიდა' : 'კლასის პროგრამაში ჩაჯდა');
    } catch (e) { failed(e); }
    setBusy('');
  };

  // puts the version on a member's path or takes it off; an unknown state is read first
  const togglePerson = async (p: Person) => {
    setBusy(p.uid);
    try {
      const ref = doc(db, 'students', p.uid);
      let now = has[p.uid];
      if (now !== 'yes' && now !== 'no') {
        const snap = await getDoc(ref);
        now = (snap.data()?.selectedChantVariants ?? {})[id] ? 'yes' : 'no';
      }
      if (now === 'yes') {
        await updateDoc(ref, new FieldPath('selectedChantVariants', id), deleteField());
        setHas(h => ({ ...h, [p.uid]: 'no' }));
        said(`${p.name} — გზიდან ამოვიდა`);
      } else {
        const item = { variantId: id, chantId: chant.id, chantName: chant.title, code: variant.code, label: variant.label, fullTitle: title, isLearned: false, voices: [] };
        await setDoc(ref, { selectedChantVariants: { [id]: item } }, { merge: true });
        setHas(h => ({ ...h, [p.uid]: 'yes' }));
        said(`${p.name} — გზაზე ჩაჯდა`);
      }
    } catch (e) { failed(e); }
    setBusy('');
  };

  const go = (s: Step) => { setNote(''); setErr(''); setFind(''); setStep(s); };
  const back = step.at === 'class' || step.at === 'loose' ? () => go({ at: 'classes' }) : () => go({ at: 'main' });

  const personRow = (p: Person) => {
    const h = has[p.uid];
    const sub = busy === p.uid ? 'ინახება…' : h === 'yes' ? 'გზაზეა — შეხებით ამოვა' : h === 'no' ? 'შეხებით ჩაჯდება გზაზე' : h === 'err' ? 'ვერ წავიკითხე — შეხებით სცადე' : step.at === 'class' ? '…' : undefined;
    return (
      <Row key={p.uid} lead={<Avatar name={p.name} photo={p.photo} size={40} />} title={p.name} sub={sub}
        right={h === 'yes' ? <Check className="size-5 shrink-0 text-leaf" aria-label="გზაზეა" /> : null}
        disabled={!!busy} onClick={() => void togglePerson(p)} />
    );
  };

  return (
    <Sheet open title={title} onClose={onClose}>
      <div className="flex flex-col gap-2.5">
        {step.at !== 'main' && (
          <Rows>
            <Row lead={<Dot icon={<ChevronLeft />} />} title="უკან" right={null} onClick={back} />
          </Rows>
        )}
        {note && <p className="px-1 text-meta font-semibold text-leaf" role="status">{note}</p>}
        {err && <p className="px-1 text-meta font-semibold text-danger" role="alert">{err}</p>}

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
            {isTeacher && (classes.length > 0 || isAdmin) && (
              <Row lead={<Dot icon={<GraduationCap />} />} title="კლასს ან მოსწავლეს მიმაგრება" sub="პროგრამაში ან მოსწავლის გზაზე"
                onClick={() => go({ at: 'classes' })} />
            )}
          </Rows>
        )}

        {step.at === 'classes' && (
          <Rows>
            {classes.map(cls => {
              const there = cls.program.some(p => p.id === id);
              return (
                <Row key={cls.id} lead={<ClassLogo name={cls.name} logo={cls.logo} className="size-10 shrink-0" />} title={cls.name}
                  sub={[there && 'პროგრამაშია', `${cls.members.length} მოსწავლე`].filter(Boolean).join(' · ')}
                  onClick={() => go({ at: 'class', cls })} />
              );
            })}
            {isAdmin && (
              <Row lead={<Dot icon={<Users />} />} title="კლასის გარეშე წევრები" onClick={() => go({ at: 'loose' })} />
            )}
          </Rows>
        )}

        {step.at === 'class' && (() => {
          const cls = classes.find(c => c.id === step.cls.id) ?? step.cls;
          const there = cls.program.some(p => p.id === id);
          return (
            <>
              <Rows>
                <Row lead={<Dot icon={<GraduationCap />} color={there ? 'wine' : undefined} />}
                  title={there ? 'კლასის პროგრამიდან ამოღება' : 'მთელი კლასის პროგრამაში დამატება'}
                  sub={busy === cls.id ? 'ინახება…' : there ? 'პროგრამაშია' : `${cls.program.length} საგალობელი პროგრამაში`}
                  right={there ? <Check className="size-5 shrink-0 text-wine" aria-label="პროგრამაშია" /> : null}
                  disabled={!!busy} onClick={() => void toggleClass(cls)} />
              </Rows>
              <SectionLabel label={<span className="flex items-center gap-1.5"><UserRound className="size-4" aria-hidden="true" />მოსწავლის გზაზე</span>} />
              {cls.members.length === 0 ? <Helper>ამ კლასში მოსწავლე არ არის.</Helper> : (
                <Rows>{cls.members.map(m => personRow({ uid: m.uid, name: kaName(m.name), photo: m.photoURL }))}</Rows>
              )}
            </>
          );
        })()}

        {step.at === 'loose' && (
          <>
            <Field label="ძებნა" type="search" value={find} onChange={setFind} placeholder="სახელი" />
            {loose.length === 0 ? <Helper>{find ? 'ვერ მოიძებნა.' : 'კლასის გარეშე წევრი არ არის.'}</Helper> : (
              <Rows>{loose.map(personRow)}</Rows>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
};
