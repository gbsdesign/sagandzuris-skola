import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../../context';
import { useManagedClasses } from '../../../hooks/useClasses';
import { shownName, useDirectory } from '../../../utils/directory';
import { georgiaToday } from '../../../utils/psalter';
import { buildScope, MAX_CONTEXT_PEOPLE, type AssistantScope } from '../../../utils/aiAssistant';
import type { Me } from './act';

// What the assistant may know, read on the phone from what the person can already read: a teacher's own classes (useManaged-
// Classes) and their members' records; an admin's every class, the directory's names and the class members' records. Each
// record is read once a visit (no live listeners — an admin's school may be large).

type Records = Record<string, Record<string, any> | null>;

export const useAssistantScope = (focusClassId?: string): { scope: AssistantScope; me: Me; ready: boolean } => {
  const { user, isAdmin } = useAuth();
  const managed = useManagedClasses();
  const dir = useDirectory(isAdmin);
  const [records, setRecords] = useState<Records>({});
  const [ready, setReady] = useState(false);

  const uids = useMemo(() => {
    const all = new Set<string>();
    for (const c of managed.classes) for (const id of c.memberIds) if (id !== user?.uid) all.add(id);
    return [...all].slice(0, MAX_CONTEXT_PEOPLE);
  }, [managed.classes, user?.uid]);
  const key = uids.join(',');

  useEffect(() => {
    if (managed.loading) return;
    let live = true;
    const missing = uids.filter(u => !(u in records));
    if (!missing.length) { setReady(true); return; }
    Promise.all(missing.map(u => getDoc(doc(db, 'students', u)).then(s => [u, s.data() ?? null] as const, () => [u, null] as const)))
      .then(pairs => {
        if (!live) return;
        setRecords(r => ({ ...r, ...Object.fromEntries(pairs) }));
        setReady(true);
      });
    return () => { live = false; };
    // the records follow the member list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, managed.loading]);

  const me = useMemo<Me>(() => {
    const uid = user?.uid || '';
    const fromClass = managed.classes.flatMap(c => c.teachers).find(t => t.uid === uid);
    const fromDir = dir.people.find(p => p.uid === uid);
    return {
      uid,
      name: fromClass?.name || (fromDir ? shownName(fromDir) : '') || user?.displayName || 'მასწავლებელი',
      photoURL: fromClass?.photoURL || fromDir?.photoURL || user?.photoURL || '',
      email: user?.email || '',
    };
  }, [user, managed.classes, dir.people]);

  const scope = useMemo(() => buildScope({
    me: user?.uid || '',
    admin: isAdmin,
    today: georgiaToday(),
    now: Date.now(),
    classes: managed.classes.map(c => ({
      id: c.id, name: c.name, teacherIds: c.teacherIds, teachers: c.teachers.map(t => ({ uid: t.uid, name: t.name || '' })),
      members: c.members.map(m => ({ uid: m.uid, name: m.name || '', photoURL: m.photoURL })), schedule: c.schedule,
    })),
    others: isAdmin ? dir.people.map(p => ({ uid: p.uid, name: shownName(p), photoURL: p.photoURL })) : [],
    records,
    focusClassId,
  }), [user?.uid, isAdmin, managed.classes, dir.people, records, focusClassId]);

  return { scope, me, ready: ready && !managed.loading };
};
