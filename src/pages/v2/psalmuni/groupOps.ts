import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { askConfirm } from '../../../components/ui/kit';
import type { SchoolClass } from '../../../hooks/useClasses';
import { ALL_KATHISMAS, PsalterGroup, distributionLog, type GroupMember } from '../../../hooks/usePsalter';
import { cycleOf, georgiaToday, halfIndex, kathismasOf, ownersIn, rebase } from '../../../utils/psalter';
import { kaName } from '../../../utils/georgianName';

// The saves of the psalter group's new-look screens — the old GroupManage / CreateGroupSheet writes, unchanged.

export const REMIND_TIMES = ['', '18:00', '19:00', '20:00', '21:00', '22:00'];

export type SettingsPatch = Partial<{ name: string; cycleDays: number; shiftDays: number[]; remindDaily: string; remindFinal: string }>;
/** done = saved; error = a plain Georgian line; neither = the person said no to the question */
export type SaveResult = { done: boolean; error?: string };

/** One setting (or two) of the group; a new rule that starts the current cycle afresh asks first, new shift days write
 *  today's readers down for the new count — as the old „პარამეტრები“ window did. */
export const saveSettings = async (group: PsalterGroup, patch: SettingsPatch): Promise<SaveResult> => {
  const today = georgiaToday();
  const cycleDays = patch.cycleDays ?? group.cycleDays;
  const shiftDays = patch.shiftDays ?? group.shiftDays;
  const sameDays = shiftDays.join() === group.shiftDays.join();
  const cycle = cycleOf(today, group.cycleDays, group.shiftDays);
  if (cycleOf(today, cycleDays, shiftDays).id !== cycle.id
    && !(await askConfirm({ title: 'შევინახო?', text: 'მიმდინარე წრე ახლიდან დაიწყება და ამ წრის „წავიკითხე“ მონიშვნები აღარ გამოჩნდება. ვინ რომელ კანონს კითხულობს დღეს, არ შეიცვლება.', ok: 'შენახვა' }))) {
    return { done: false };
  }
  try {
    await updateDoc(doc(db, 'psalterGroups', group.id), {
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      cycleDays,
      shiftDays,
      ...(patch.remindDaily !== undefined ? { remindDaily: patch.remindDaily } : {}),
      ...(patch.remindFinal !== undefined ? { remindFinal: patch.remindFinal } : {}),
      ...(sameDays ? {} : {
        assignment: rebase(ownersIn(group.assignment, group.baseHalf, halfIndex(today, group.shiftDays))),
        baseHalf: halfIndex(today, shiftDays),
        ...distributionLog(group, cycle),
      }),
      updatedAt: new Date().toISOString(),
    });
    return { done: true };
  } catch {
    return { done: false, error: 'ვერ შეინახა.' };
  }
};

type Me = { uid: string; displayName: string | null; photoURL: string | null };

/** The leader reads too (or no longer): their kanons go free when they stop. Returns an error line or ''. */
export const setReading = async (group: PsalterGroup, cls: SchoolClass | undefined, user: Me, on: boolean): Promise<string> => {
  const cycle = cycleOf(georgiaToday(), group.cycleDays, group.shiftDays);
  const half = cycle.half;
  const owners = ownersIn(group.assignment, group.baseHalf, half);
  const mineNow = kathismasOf(owners, user.uid);
  if (!on && mineNow.length && !(await askConfirm({ title: 'აღარ კითხულობ?', text: `კანონი ${mineNow.join(', ')} თავისუფალი დარჩება.`, ok: 'დიახ' }))) return '';
  const me = group.members.find(m => m.uid === user.uid)
    || { uid: user.uid, name: cls?.teachers.find(t => t.uid === user.uid)?.name || kaName(user.displayName) || 'მასწავლებელი', prayer: '', photoURL: user.photoURL || '' };
  try {
    await updateDoc(doc(db, 'psalterGroups', group.id), on
      ? { members: arrayUnion(me), memberIds: arrayUnion(user.uid), updatedAt: new Date().toISOString() }
      : {
        members: group.members.filter(m => m.uid !== user.uid),
        memberIds: arrayRemove(user.uid),
        ...(mineNow.length ? {
          assignment: rebase(Object.fromEntries(ALL_KATHISMAS.map(k => [k, owners[k].filter(u => u !== user.uid)]))), baseHalf: half, ...distributionLog(group, cycle),
        } : {}),
        updatedAt: new Date().toISOString(),
      });
    return '';
  } catch {
    return 'ვერ შეინახა.';
  }
};

/** Deletes the group with its whole history after asking; the class forgets it. Returns 'deleted', '' (said no) or an error line. */
export const removeGroup = async (group: PsalterGroup, cls?: SchoolClass): Promise<string> => {
  if (!(await askConfirm({ title: `წავშალო ჯგუფი „${group.name}“ მთელი ისტორიით?`, text: 'ამის დაბრუნება შეუძლებელია.', ok: 'წაშლა', danger: true }))) return '';
  try {
    const ref = doc(db, 'psalterGroups', group.id);
    const cycles = await getDocs(collection(db, 'psalterGroups', group.id, 'cycles'));
    await Promise.all(cycles.docs.map(d => deleteDoc(d.ref)));
    await deleteDoc(ref);
    if (cls) await updateDoc(doc(db, 'classes', cls.id), { psalterGroupId: '', updatedAt: new Date().toISOString() }).catch(() => {});
    return 'deleted';
  } catch {
    return 'ჯგუფი ვერ წაიშალა.';
  }
};

/** A member leaves the group (their kanon goes free). Returns an error line or ''. */
export const leaveGroup = async (group: PsalterGroup, uid: string): Promise<string> => {
  if (!(await askConfirm({ title: `გახვიდე ჯგუფიდან „${group.name}“?`, text: 'შენი კანონი თავისუფალი გახდება.', ok: 'გასვლა', danger: true }))) return '';
  const mine = group.members.filter(m => m.uid === uid);
  try {
    await updateDoc(doc(db, 'psalterGroups', group.id), {
      memberIds: arrayRemove(uid),
      members: arrayRemove(...mine),
      assignment: Object.fromEntries(Object.entries(group.assignment).map(([k, list]) => [k, list.filter(u => u !== uid)])),
      updatedAt: new Date().toISOString(),
    });
    return '';
  } catch {
    return 'ვერ გახვედი. სცადე ხელახლა.';
  }
};

const people = (list: SchoolClass['members']): GroupMember[] => list.map(m => ({ uid: m.uid, name: m.name, photoURL: m.photoURL || '' }));

/** The class's psalter group: made as the old class header made it (the class's members and teachers, the maker among the
 *  teachers) and linked to the class. Returns the new group's id. */
export const createClassGroup = async (cls: SchoolClass, user: Me, name: string, cycleDays: number, shiftDays: number[]): Promise<string> => {
  const today = georgiaToday();
  const me = { uid: user.uid, name: kaName(user.displayName) || 'მასწავლებელი', photoURL: user.photoURL || '' };
  const teachers = [me, ...people(cls.teachers).filter(t => t.uid !== user.uid)];
  const members = people(cls.members);
  const ref = await addDoc(collection(db, 'psalterGroups'), {
    name: name.trim(),
    teacherIds: teachers.map(t => t.uid),
    teachers,
    memberIds: members.map(m => m.uid),
    members,
    assignment: {},
    baseHalf: cycleOf(today, cycleDays, shiftDays).half,
    cycleDays,
    shiftDays,
    startDate: today,
    remindDaily: '20:00',
    remindFinal: '21:00',
    createdAt: new Date().toISOString(),
    createdBy: user.uid,
  });
  await updateDoc(doc(db, 'classes', cls.id), { psalterGroupId: ref.id, updatedAt: new Date().toISOString() });
  return ref.id;
};
