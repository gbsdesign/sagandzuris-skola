import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, GraduationCap, Search, UserRound, Users } from 'lucide-react';
import { FieldPath, deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { useManagedClasses, type SchoolClass } from '../../hooks/useClasses';
import type { AttachEntry } from './AttachButton';
import { saveClassProgram } from '../admin/ClassesAdmin';
import { Avatar, Dot, Field, Helper, Row, Rows, SectionLabel } from '../ui2';
import { ClassLogo } from '../classes/ClassLogo';
import { shownName, useDirectory } from '../../utils/directory';
import { kaName } from '../../utils/georgianName';
import { triggerHaptic } from '../../utils/haptics';
import { errorText } from '../../utils/errorText';

// „კლასს ან მოსწავლეს მიმაგრება“ for anything that can stand on the path (2026-11-23, the user: „ეს ღილაკი მინდა დაამატო
// სიმღერებსაც ვიდეოთეკასაც. წიგნებსაც მთქმელსაც აბიტურსაც“, answer „გზაზეც ჩაჯდეს“). Moved out of the chant version's menu
// (VersionMenu) so every section shares one way: the class list once, a class = its whole program on top and each member's path
// under it, each line saying whether it is there; an admin also gets the members of no class, and a search over both.

type Step = { at: 'classes' } | { at: 'class'; cls: SchoolClass } | { at: 'loose' };
type Has = 'yes' | 'no' | 'err';
type Person = { uid: string; name: string; photo?: string; cls?: string };

/** The steps themselves; `onExit` = „უკან“ from the class list (none = no back row there). */
export const AttachFlow: React.FC<{ entry: AttachEntry; onExit?: () => void }> = ({ entry, onExit }) => {
  const { user, isAdmin } = useAuth();
  const { classes } = useManagedClasses();
  const [step, setStep] = useState<Step>({ at: 'classes' });
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [has, setHas] = useState<Record<string, Has>>({});
  const [find, setFind] = useState('');
  const q = find.trim().toLowerCase();
  const { people } = useDirectory(!!isAdmin && (step.at === 'loose' || (step.at === 'classes' && !!q)));
  const id = entry.id;

  const said = (t: string) => { triggerHaptic(10); setErr(''); setNote(t); };
  const failed = (e: unknown) => { setNote(''); setErr('ვერ შეინახა: ' + errorText(e)); };

  const loose = useMemo<Person[]>(() => {
    if (step.at !== 'loose') return [];
    const inClass = new Set(classes.flatMap(c => [...c.memberIds, ...c.teacherIds]));
    return people
      .filter(p => !inClass.has(p.uid) && p.uid !== user?.uid)
      .map(p => ({ uid: p.uid, name: shownName(p), photo: p.photoURL }))
      .filter(p => !q || p.name.toLowerCase().includes(q));
  }, [step.at, people, classes, q, user?.uid]);

  const foundClasses = step.at === 'classes' && q ? classes.filter(c => c.name.toLowerCase().includes(q)) : classes;
  const found = useMemo<Person[]>(() => {
    if (step.at !== 'classes' || !q) return [];
    const byUid = new Map<string, Person>();
    for (const c of classes) for (const m of c.members) {
      if (!byUid.has(m.uid)) byUid.set(m.uid, { uid: m.uid, name: kaName(m.name), photo: m.photoURL, cls: c.name });
    }
    for (const p of people) {
      if (!byUid.has(p.uid)) byUid.set(p.uid, { uid: p.uid, name: shownName(p), photo: p.photoURL });
    }
    byUid.delete(user?.uid ?? '');
    return [...byUid.values()].filter(p => p.name.toLowerCase().includes(q)).slice(0, 30);
  }, [step.at, q, classes, people, user?.uid]);

  // whether each member shown has it on their path, read once
  const shownUids = step.at === 'class' ? step.cls.members.map(m => m.uid).join(',') : step.at === 'classes' ? found.map(p => p.uid).join(',') : '';
  useEffect(() => {
    if (!shownUids) return;
    let live = true;
    for (const uid of shownUids.split(',')) {
      if (has[uid] === 'yes' || has[uid] === 'no') continue;
      getDoc(doc(db, 'students', uid)).then(
        s => { if (live) setHas(h => ({ ...h, [uid]: (s.data()?.selectedChantVariants ?? {})[id] ? 'yes' : 'no' })); },
        () => { if (live) setHas(h => ({ ...h, [uid]: 'err' })); },
      );
    }
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownUids, id]);

  const toggleClass = async (cls: SchoolClass) => {
    const old = cls.program.find(p => p.id === id);
    // another recording of the same song already there: it is swapped for this one, not taken off
    const swap = !!old && entry.take !== undefined && old.take !== entry.take;
    const made = { id, title: entry.title, ...(entry.code ? { code: entry.code } : {}), ...(entry.take !== undefined ? { take: entry.take } : {}) };
    setBusy(cls.id);
    try {
      const next = swap ? cls.program.map(p => (p.id === id ? { ...p, ...made } : p)) : old ? cls.program.filter(p => p.id !== id) : [...cls.program, made];
      const why = await saveClassProgram(cls, next);
      if (why) { setNote(''); setErr(String(why)); } else said(swap ? 'ჩანაწერი შეიცვალა' : old ? 'კლასის პროგრამიდან ამოვიდა' : 'კლასის პროგრამაში ჩაჯდა');
    } catch (e) { failed(e); }
    setBusy('');
  };

  const togglePerson = async (p: Person) => {
    setBusy(p.uid);
    try {
      const ref = doc(db, 'students', p.uid);
      const snap = await getDoc(ref);
      const had = (snap.data()?.selectedChantVariants ?? {})[id] as { take?: number } | undefined;
      const now: Has = had ? 'yes' : 'no';
      if (had && entry.take !== undefined && had.take !== entry.take) {
        // another recording of the song is on the path: this one takes its place, the marks stay
        await setDoc(ref, { selectedChantVariants: { [id]: { take: entry.take, label: entry.item().label } } }, { merge: true });
        setHas(h => ({ ...h, [p.uid]: 'yes' }));
        said(`${p.name} — ჩანაწერი შეიცვალა`);
      } else if (now === 'yes') {
        await updateDoc(ref, new FieldPath('selectedChantVariants', id), deleteField());
        setHas(h => ({ ...h, [p.uid]: 'no' }));
        said(`${p.name} — გზიდან ამოვიდა`);
      } else {
        await setDoc(ref, { selectedChantVariants: { [id]: entry.item() } }, { merge: true });
        setHas(h => ({ ...h, [p.uid]: 'yes' }));
        said(`${p.name} — გზაზე ჩაჯდა`);
      }
    } catch (e) { failed(e); }
    setBusy('');
  };

  const go = (s: Step) => { setNote(''); setErr(''); setFind(''); setStep(s); };
  const back = step.at === 'classes' ? onExit : () => go({ at: 'classes' });

  const personRow = (p: Person) => {
    const h = has[p.uid];
    const state = busy === p.uid ? 'ინახება…' : h === 'yes' ? 'გზაზეა — შეხებით ამოვა' : h === 'no' ? 'შეხებით ჩაჯდება გზაზე' : h === 'err' ? 'ვერ წავიკითხე — შეხებით სცადე' : step.at !== 'loose' ? '…' : undefined;
    const sub = [p.cls, state].filter(Boolean).join(' · ') || undefined;
    return (
      <Row key={p.uid} lead={<Avatar name={p.name} photo={p.photo} size={40} />} title={p.name} sub={sub}
        right={h === 'yes' ? <Check className="size-5 shrink-0 text-leaf" aria-label="გზაზეა" /> : null}
        disabled={!!busy} onClick={() => void togglePerson(p)} />
    );
  };

  return (
    <div className="flex flex-col gap-2.5">
      {back && (
        <Rows>
          <Row lead={<Dot icon={<ChevronLeft />} />} title="უკან" right={null} onClick={back} />
        </Rows>
      )}
      {note && <p className="px-1 text-meta font-semibold text-leaf" role="status">{note}</p>}
      {err && <p className="px-1 text-meta font-semibold text-danger" role="alert">{err}</p>}

      {step.at === 'classes' && (
        <label className="flex h-[52px] shrink-0 items-center gap-2.5 rounded-full bg-surf px-[18px] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-wine/60">
          <Search className="size-5 shrink-0 text-mut" aria-hidden="true" />
          <input type="search" value={find} onChange={e => setFind(e.target.value)} placeholder="კლასი ან წევრი"
            aria-label="კლასის ან წევრის ძებნა" className="h-full w-full min-w-0 bg-transparent text-lead text-ink outline-none placeholder:text-faint" />
        </label>
      )}

      {step.at === 'classes' && q && found.length > 0 && (
        <>
          <SectionLabel label={<span className="flex items-center gap-1.5"><UserRound className="size-4" aria-hidden="true" />წევრები — შეხებით გზაზე</span>} />
          <Rows>{found.map(personRow)}</Rows>
        </>
      )}

      {step.at === 'classes' && q && found.length === 0 && foundClasses.length === 0 && <Helper>ვერ მოიძებნა.</Helper>}

      {step.at === 'classes' && q && foundClasses.length > 0 && <SectionLabel label="კლასები" />}

      {step.at === 'classes' && (foundClasses.length > 0 || (isAdmin && !q)) && (
        <Rows>
          {foundClasses.map(cls => {
            const there = cls.program.some(p => p.id === id);
            return (
              <Row key={cls.id} lead={<ClassLogo name={cls.name} logo={cls.logo} className="size-10 shrink-0" />} title={cls.name}
                sub={[there && 'პროგრამაშია', `${cls.members.length} მოსწავლე`].filter(Boolean).join(' · ')}
                onClick={() => go({ at: 'class', cls })} />
            );
          })}
          {isAdmin && !q && (
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
                sub={busy === cls.id ? 'ინახება…' : there ? 'პროგრამაშია' : `${cls.program.length} პროგრამაში`}
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
  );
};
