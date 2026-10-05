// "დღევანდელი წირვა": the regent's program of the service (which version of which chant, in order).
// The regent (an admin) edits a draft kept in their own settings, then sends it to a class (choir):
// it is copied into the class document, which the class members can read.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useAllClasses, useMyClasses, SchoolClass } from './useClasses';
import { findVersion, serviceOrder } from '../data/chantLookup';

export interface LiturgyProgram {
  date: string;      // YYYY-MM-DD
  items: string[];   // variant ids, in singing order
  sentAt?: string;   // ISO time it was sent to the class
  by?: string;       // the regent's name
  className?: string;
}
export interface LiturgyTemplate { name: string; items: string[] }

const CACHE_KEY = 'sagandzuri_liturgy_cache';
const valid = (items: unknown): string[] => (Array.isArray(items) ? items.filter((id): id is string => typeof id === 'string' && Boolean(findVersion(id))) : []);

/** The coming Sunday (today, if it is Sunday). */
export const nextSunday = () => {
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const WD = ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'];
const MO = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
export const formatLiturgyDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${WD[new Date(y, m - 1, d).getDay()]}, ${d} ${MO[m - 1]}`;
};
export const formatTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()} ${MO[d.getMonth()].slice(0, 3)}. ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Where a new item goes: among the items of its own service, in the service's order; otherwise at the end. */
export const insertInOrder = (items: string[], id: string) => {
  const info = findVersion(id);
  if (!info) return [...items, id];
  const ord = serviceOrder(info);
  const same = items
    .map((x, i) => ({ i, o: findVersion(x) }))
    .filter(e => e.o?.serviceIndex === info.serviceIndex);
  if (!same.length) return [...items, id];
  const before = same.filter(e => serviceOrder(e.o!) <= ord).pop();
  const next = items.slice();
  next.splice(before ? before.i + 1 : same[0].i, 0, id);
  return next;
};

export const useLiturgy = () => {
  const { user, isAdmin } = useAuth();
  const role: 'regent' | 'member' | 'guest' = !user ? 'guest' : isAdmin ? 'regent' : 'member';
  const uid = user?.uid;

  // ---- regent: draft, chosen class, templates
  const [draft, setDraft] = useState<LiturgyProgram>({ date: nextSunday(), items: [] });
  const [classId, setClassIdState] = useState<string | null>(null);
  const [templates, setTemplates] = useState<LiturgyTemplate[]>([]);
  const { classes: allClasses } = useAllClasses(role === 'regent');
  const myClasses = useMyClasses(role === 'member' ? uid : null);

  useEffect(() => {
    if (role !== 'regent' || !uid) return;
    const off1 = onSnapshot(doc(db, 'users', uid, 'settings', 'liturgy'), snap => {
      const d = snap.data();
      if (!d) return;
      setDraft({ date: typeof d.date === 'string' && d.date ? d.date : nextSunday(), items: valid(d.items) });
      if (typeof d.classId === 'string') setClassIdState(d.classId);
    }, err => console.warn('liturgy draft:', err?.code || err));
    const off2 = onSnapshot(doc(db, 'users', uid, 'settings', 'liturgyTemplates'), snap => {
      const list = snap.data()?.list;
      setTemplates(Array.isArray(list) ? list.filter(t => t && typeof t.name === 'string').map(t => ({ name: t.name, items: valid(t.items) })) : []);
    }, err => console.warn('liturgy templates:', err?.code || err));
    return () => { off1(); off2(); };
  }, [role, uid]);

  const saveDraft = useCallback((next: LiturgyProgram, nextClassId = classId) => {
    setDraft(next);
    if (!uid) return;
    setDoc(doc(db, 'users', uid, 'settings', 'liturgy'), { date: next.date, items: next.items, classId: nextClassId ?? null }, { merge: true })
      .catch(err => console.warn('liturgy save:', err?.code || err));
  }, [uid, classId]);

  const regentClass: SchoolClass | undefined = allClasses.find(c => c.id === classId) ?? allClasses[0];
  useEffect(() => {
    if (role === 'regent' && !classId && allClasses[0]) setClassIdState(allClasses[0].id);
  }, [role, classId, allClasses]);

  const setClassId = useCallback((id: string) => {
    setClassIdState(id);
    saveDraft(draft, id);
  }, [draft, saveDraft]);

  const toggle = useCallback((id: string) => {
    const items = draft.items.includes(id) ? draft.items.filter(x => x !== id) : insertInOrder(draft.items, id);
    saveDraft({ ...draft, items });
    return items;
  }, [draft, saveDraft]);
  const setItems = useCallback((items: string[]) => saveDraft({ ...draft, items }), [draft, saveDraft]);
  const setDate = useCallback((date: string) => saveDraft({ ...draft, date }), [draft, saveDraft]);

  const send = useCallback(async () => {
    if (!regentClass) throw new Error('no class');
    const sentAt = new Date().toISOString();
    await updateDoc(doc(db, 'classes', regentClass.id), {
      liturgy: { date: draft.date, items: draft.items, sentAt, by: user?.displayName || '' },
    });
    return regentClass.name;
  }, [regentClass, draft, user]);

  const saveTemplate = useCallback(async (name: string) => {
    if (!uid) return;
    const list = [...templates.filter(t => t.name !== name), { name, items: draft.items }];
    setTemplates(list);
    await setDoc(doc(db, 'users', uid, 'settings', 'liturgyTemplates'), { list }, { merge: true });
  }, [uid, templates, draft.items]);
  const deleteTemplate = useCallback(async (name: string) => {
    if (!uid) return;
    const list = templates.filter(t => t.name !== name);
    setTemplates(list);
    await setDoc(doc(db, 'users', uid, 'settings', 'liturgyTemplates'), { list }, { merge: true });
  }, [uid, templates]);

  // ---- member: the latest program sent to one of my classes (kept for offline use)
  const memberProgram = useMemo<LiturgyProgram | null>(() => {
    const sent = myClasses
      .map(c => ({ c, l: (c as SchoolClass & { liturgy?: any }).liturgy }))
      .filter(x => x.l && Array.isArray(x.l.items))
      .sort((a, b) => String(b.l.sentAt || '').localeCompare(String(a.l.sentAt || '')));
    if (!sent.length) return null;
    const { c, l } = sent[0];
    return { date: l.date || nextSunday(), items: valid(l.items), sentAt: l.sentAt, by: l.by, className: c.name };
  }, [myClasses]);
  const [cached, setCached] = useState<LiturgyProgram | null>(() => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
  });
  useEffect(() => {
    if (!memberProgram) return;
    setCached(memberProgram);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(memberProgram)); } catch { /* storage blocked */ }
  }, [memberProgram]);

  const regentSent = (regentClass as (SchoolClass & { liturgy?: any }) | undefined)?.liturgy;
  const program: LiturgyProgram | null = role === 'regent'
    ? { ...draft, sentAt: regentSent?.sentAt, className: regentClass?.name }
    : role === 'member' ? (memberProgram ?? cached) : null;

  return {
    role, program, classes: allClasses, classId: regentClass?.id ?? null, setClassId,
    toggle, setItems, setDate, send, templates, saveTemplate, deleteTemplate,
    sentInSync: Boolean(regentSent && JSON.stringify(regentSent.items) === JSON.stringify(draft.items) && regentSent.date === draft.date),
  };
};

export type LiturgyApi = ReturnType<typeof useLiturgy>;
