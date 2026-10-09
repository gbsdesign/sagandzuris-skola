import { useEffect, useMemo, useState } from 'react';
import {
  collection, deleteField, doc, limit, onSnapshot, orderBy, query, runTransaction, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Assignment, Cycle, KATHISMA_COUNT, Slot, Slots, cycleOf, georgiaToday, halfIndex, kathismasOf, normCycleDays, normShiftDays, ownersIn, responsible,
} from '../utils/psalter';

// Firestore side of the psalter group:
//   psalterGroups/{id}                 name, teachers, members, assignment (for baseHalf), cycleDays, reminders
//   psalterGroups/{id}/cycles/{start}  slots: { "7": { readBy, readAt, takenBy, takenAt, help } }

export interface GroupMember {
  uid: string;
  name: string;     // Georgian first name and surname
  prayer?: string;  // the name for the commemoration list
  photoURL?: string;
}

export interface PsalterGroup {
  id: string;
  name: string;
  teacherIds: string[];
  teachers: GroupMember[];
  memberIds: string[];
  members: GroupMember[];
  assignment: Assignment;
  baseHalf: number;
  cycleDays: number; // 1–7
  shiftDays: number[]; // days of the month when everyone moves one kathisma on (default 1 and 15)
  startDate: string;
  remindDaily: string; // "20:00" — a nudge to whoever hasn't read today; '' = off
  remindFinal: string; // "21:00" on the cycle's last day
  createdAt?: string;
}

const arr = (v: unknown) => (Array.isArray(v) ? v : []);

export const toGroup = (id: string, d: any): PsalterGroup => ({
  id,
  name: d.name || 'ფსალმუნთა ჯგუფი',
  teacherIds: arr(d.teacherIds),
  teachers: arr(d.teachers),
  memberIds: arr(d.memberIds),
  members: arr(d.members),
  assignment: d.assignment && typeof d.assignment === 'object' ? d.assignment : {},
  baseHalf: typeof d.baseHalf === 'number' ? d.baseHalf : halfIndex(georgiaToday(), normShiftDays(d.shiftDays)),
  cycleDays: normCycleDays(d.cycleDays),
  shiftDays: normShiftDays(d.shiftDays),
  startDate: d.startDate || '',
  remindDaily: typeof d.remindDaily === 'string' ? d.remindDaily : '20:00',
  remindFinal: typeof d.remindFinal === 'string' ? d.remindFinal : '21:00',
  createdAt: d.createdAt || '',
});

const byName = (a: PsalterGroup, b: PsalterGroup) => a.name.localeCompare(b.name, 'ka');

/** Groups I read in or lead (live). */
export const useMyPsalterGroups = (uid?: string | null) => {
  const [asMember, setAsMember] = useState<PsalterGroup[]>([]);
  const [asTeacher, setAsTeacher] = useState<PsalterGroup[]>([]);
  const [loaded, setLoaded] = useState({ m: false, t: false });
  useEffect(() => {
    if (!uid) { setAsMember([]); setAsTeacher([]); setLoaded({ m: true, t: true }); return; }
    setLoaded({ m: false, t: false });
    const coll = collection(db, 'psalterGroups');
    const off1 = onSnapshot(query(coll, where('memberIds', 'array-contains', uid)),
      s => { setAsMember(s.docs.map(d => toGroup(d.id, d.data()))); setLoaded(l => ({ ...l, m: true })); },
      () => { setAsMember([]); setLoaded(l => ({ ...l, m: true })); });
    const off2 = onSnapshot(query(coll, where('teacherIds', 'array-contains', uid)),
      s => { setAsTeacher(s.docs.map(d => toGroup(d.id, d.data()))); setLoaded(l => ({ ...l, t: true })); },
      () => { setAsTeacher([]); setLoaded(l => ({ ...l, t: true })); });
    return () => { off1(); off2(); };
  }, [uid]);
  const groups = useMemo(() => {
    const map = new Map<string, PsalterGroup>();
    [...asMember, ...asTeacher].forEach(g => map.set(g.id, g));
    return [...map.values()].sort(byName);
  }, [asMember, asTeacher]);
  return { groups, loading: !(loaded.m && loaded.t) };
};

/** Every group (admins). */
export const useAllPsalterGroups = (enabled: boolean) => {
  const [groups, setGroups] = useState<PsalterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!enabled) { setGroups([]); setLoading(false); return; }
    return onSnapshot(collection(db, 'psalterGroups'),
      s => { setGroups(s.docs.map(d => toGroup(d.id, d.data())).sort(byName)); setLoading(false); },
      () => setLoading(false));
  }, [enabled]);
  return { groups, loading };
};

/** Re-renders every half minute, so the time left and the cycle itself stay current. */
export const useTicker = (ms = 30_000) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), ms);
    const wake = () => document.visibilityState === 'visible' && setNow(new Date());
    document.addEventListener('visibilitychange', wake);
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', wake); };
  }, [ms]);
  return now;
};

/** The marks of one cycle (live; works offline from the cache). */
export const useCycleSlots = (groupId?: string | null, cycleId?: string | null) => {
  const [slots, setSlots] = useState<Slots>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!groupId || !cycleId) { setSlots({}); setLoading(false); return; }
    setLoading(true);
    return onSnapshot(doc(db, 'psalterGroups', groupId, 'cycles', cycleId),
      s => { setSlots((s.data()?.slots as Slots) || {}); setLoading(false); },
      () => { setSlots({}); setLoading(false); });
  }, [groupId, cycleId]);
  return { slots, loading };
};

/** The latest cycles' marks, newest first (for the history). */
export const useCycleHistory = (groupId?: string | null, count = 8) => {
  const [list, setList] = useState<{ id: string; slots: Slots }[]>([]);
  useEffect(() => {
    if (!groupId) { setList([]); return; }
    // every cycle document carries its first day in `start` (written with each mark)
    const q = query(collection(db, 'psalterGroups', groupId, 'cycles'), orderBy('start', 'desc'), limit(count));
    return onSnapshot(q, s => setList(s.docs.map(d => ({ id: d.id, slots: (d.data().slots as Slots) || {} }))), () => setList([]));
  }, [groupId, count]);
  return list;
};

/** Everything a page needs about the current cycle of one group. */
export const useGroupNow = (group: PsalterGroup | null | undefined, uid?: string | null) => {
  const now = useTicker();
  const cycle = useMemo(() => (group ? cycleOf(georgiaToday(now), group.cycleDays, group.shiftDays) : null), [group, now]);
  const { slots, loading } = useCycleSlots(group?.id, cycle?.id);
  const owners = useMemo(() => (group && cycle ? ownersIn(group.assignment, group.baseHalf, cycle.half) : {}), [group, cycle]);
  const mine = useMemo(() => {
    if (!uid) return [] as number[];
    const own = kathismasOf(owners, uid).filter(k => !slots[k]?.takenBy || slots[k]?.takenBy === uid);
    const taken = Object.entries(slots).filter(([, s]) => s?.takenBy === uid).map(([k]) => Number(k));
    return [...new Set([...own, ...taken])].sort((a, b) => a - b);
  }, [owners, slots, uid]);
  // my own kathismas someone else took over
  const takenFromMe = useMemo(() => (uid ? kathismasOf(owners, uid).filter(k => slots[k]?.takenBy && slots[k]?.takenBy !== uid) : []), [owners, slots, uid]);
  const helpWanted = useMemo(
    () => Object.entries(slots).filter(([, s]) => s?.help && !s.readBy && !s.takenBy).map(([k, s]) => ({ k: Number(k), by: s.help!.by })),
    [slots]
  );
  return { now, cycle, slots, loading, owners, mine, takenFromMe, helpWanted };
};

// ---- actions -----------------------------------------------------------------------------------

const cycleRef = (groupId: string, c: Cycle) => doc(db, 'psalterGroups', groupId, 'cycles', c.id);
const stamp = () => new Date().toISOString();
const base = (c: Cycle) => ({ start: c.start, end: c.end, updatedAt: stamp() });

/** "წავიკითხე" — works offline too: the mark waits on the phone and is sent when it reconnects. */
export const markRead = (groupId: string, c: Cycle, k: number, uid: string) =>
  setDoc(cycleRef(groupId, c), { ...base(c), slots: { [k]: { readBy: uid, readAt: stamp(), help: deleteField() } } }, { merge: true });

/** A mark made by mistake is taken back (until the cycle ends). */
export const unmarkRead = (groupId: string, c: Cycle, k: number) =>
  updateDoc(cycleRef(groupId, c), { [`slots.${k}.readBy`]: deleteField(), [`slots.${k}.readAt`]: deleteField(), updatedAt: stamp() });

export class TakenError extends Error {
  constructor(public by: string) { super('taken'); }
}

/** "აღება" — the server lets only the first of two people taking at once have it. */
export const takeKathisma = (groupId: string, c: Cycle, k: number, uid: string) =>
  runTransaction(db, async tx => {
    const ref = cycleRef(groupId, c);
    const snap = await tx.get(ref);
    const slot: Slot | undefined = snap.exists() ? (snap.data().slots || {})[k] : undefined;
    if (slot?.readBy) throw new TakenError(slot.readBy);
    if (slot?.takenBy && slot.takenBy !== uid) throw new TakenError(slot.takenBy);
    tx.set(ref, { ...base(c), slots: { [k]: { takenBy: uid, takenAt: stamp(), help: deleteField() } } }, { merge: true });
  });

/** The one who took it gives it back (before reading). */
export const giveBack = (groupId: string, c: Cycle, k: number) =>
  updateDoc(cycleRef(groupId, c), { [`slots.${k}.takenBy`]: deleteField(), [`slots.${k}.takenAt`]: deleteField(), updatedAt: stamp() });

/** "დახმარება მჭირდება": the kathisma shows up for everyone to take. */
export const askHelp = (groupId: string, c: Cycle, k: number, uid: string) =>
  setDoc(cycleRef(groupId, c), { ...base(c), slots: { [k]: { help: { by: uid, at: stamp() } } } }, { merge: true });

export const cancelHelp = (groupId: string, c: Cycle, k: number) =>
  updateDoc(cycleRef(groupId, c), { [`slots.${k}.help`]: deleteField(), updatedAt: stamp() });

export const canMark = (slot: Slot | undefined, owners: string[], uid: string, isLeader: boolean) =>
  isLeader || responsible(slot, owners).includes(uid);

export const memberName = (group: PsalterGroup, uid?: string) => {
  if (!uid) return '';
  return group.members.find(m => m.uid === uid)?.name || group.teachers.find(m => m.uid === uid)?.name || 'წევრი';
};
export const firstName = (full: string) => full.split(/\s+/)[0] || full;
/** Ergative case for "who did it": ნინო → ნინომ, დავით → დავითმა. */
export const ergative = (name: string) => (/[აეიოუ]$/.test(name) ? `${name}მ` : `${name}მა`);

export const ALL_KATHISMAS = Array.from({ length: KATHISMA_COUNT }, (_, i) => i + 1);

/** One person my groups pray for: the prayer name and the surname's first five letters („წიკლა.“). */
export interface GroupPrayerName { uid: string; name: string; short: string }

const surnameShort = (full: string) => {
  const letters = Array.from(full.trim().split(/\s+/).slice(1).join(' '));
  return letters.length > 5 ? `${letters.slice(0, 5).join('')}.` : letters.join('');
};

/** How a group name reads on the list and at „დიდებაი“: „ზურა (წიკლ.) (ოჯ.)“. */
export const groupPrayerText = (n: GroupPrayerName) => `${n.name}${n.short ? ` (${n.short})` : ''} (ოჯ.)`;

/** The people my psalter groups pray for at each "დიდება" (everyone but me, each once), for the commemoration list. */
export const useGroupPrayerNames = (uid?: string | null) => {
  const { groups } = useMyPsalterGroups(uid);
  return useMemo(() => {
    const out: GroupPrayerName[] = [];
    for (const g of groups) {
      if (!uid || !g.memberIds.includes(uid)) continue;
      for (const m of g.members) {
        if (m.uid === uid || out.some(x => x.uid === m.uid)) continue;
        const name = (m.prayer || firstName(m.name)).trim();
        if (name) out.push({ uid: m.uid, name, short: surnameShort(m.name) });
      }
    }
    return out;
  }, [groups, uid]);
};
