import { collection, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { classChatBase, sendTextMessage } from '../hooks/useClassChat';
import type { SchoolClass } from '../hooks/useClasses';
import { logChange } from './adminLog';

// „იუბილარის ჩათი“ (2026-11-24, the user: „ადმინს შეეძლოს მასზედ დაჭერით შექმნას მიმდინარე იუბილარის ჩათი და ავტომატურად კლასის
// წევრები დაემატნენ იუბილარის გამოკლებით“): a chat of its own (a class doc marked `jubilee`) with the class's people but the one
// whose birthday it is. One a person a month: a second tap opens the one already made.

export interface Me { uid: string; name: string; photoURL: string; email?: string }

const MONTH = 30 * 86_400_000;

export interface Jubilar { uid: string; name: string; month: number; day: number }

/** what the reminders Worker needs to greet them at midnight in their class's chat, in the admin's name (2026-11-24) */
const greetFields = (cls: SchoolClass, who: Jubilar, me: Me) => ({
  bday: { month: who.month, day: who.day }, fromClass: cls.id, jubileeName: who.name,
  greeter: { uid: me.uid, name: me.name, photoURL: me.photoURL || '' },
});

export const openJubileeChat = async (cls: SchoolClass, who: Jubilar, me: Me): Promise<string> => {
  const made = await getDocs(query(collection(db, 'classes'), where('jubilee', '==', who.uid)));
  const fresh = made.docs.find(d => {
    const x = d.data();
    return !x.archived && Date.now() - Date.parse(x.createdAt || '') < MONTH;
  });
  if (fresh) {
    if (!fresh.data().bday) await updateDoc(fresh.ref, greetFields(cls, who, me)).catch(() => undefined);
    return fresh.id;
  }

  const not = (p: { uid: string }) => p.uid !== who.uid;
  const members = cls.members.filter(not);
  const teachers = [...cls.teachers.filter(not)];
  if (!teachers.some(t => t.uid === me.uid) && me.uid !== who.uid) teachers.push({ uid: me.uid, name: me.name, photoURL: me.photoURL });
  const ref = doc(collection(db, 'classes'));
  const now = new Date().toISOString();
  const name = `🎂 ${who.name}`;
  await setDoc(ref, {
    name, logo: '', jubilee: who.uid, ...greetFields(cls, who, me),
    teacherIds: teachers.map(t => t.uid), teachers,
    memberIds: members.map(m => m.uid), members: members.map(m => ({ uid: m.uid, name: m.name, photoURL: m.photoURL || '' })),
    program: [], schedule: [], classMode: false, defaultShortcuts: [],
    createdAt: now, createdBy: me.email || '', updatedAt: now,
  });
  logChange('class', `იუბილარის ჩათი „${name}“ შეიქმნა`, ref.id);
  await sendTextMessage(classChatBase(ref.id), { uid: me.uid, name: me.name, photoURL: me.photoURL, teacher: true },
    `🎂 ${who.name}-ის დაბადების დღე ახლოვდება. ეს ჩათი მას არ უჩანს — აქ მოვემზადოთ მისალოცად.`).catch(() => undefined);
  return ref.id;
};

// The chat's people (2026-11-24, the user: „პროგრამა კი არა ჩათის წევრების სია … დამატების და წაშლის ფუნქციით“): only its
// own list changes — it is no real class, so nobody's teachers, path or psalter group follow it. The birthday person never goes in.
export interface ChatPerson { uid: string; name: string; photoURL?: string }

export const addJubileeMember = async (cls: SchoolClass, p: ChatPerson) => {
  if (cls.memberIds.includes(p.uid) || cls.teacherIds.includes(p.uid) || cls.jubilee?.uid === p.uid) return;
  await updateDoc(doc(db, 'classes', cls.id), {
    memberIds: [...cls.memberIds, p.uid],
    members: [...cls.members, { uid: p.uid, name: p.name, photoURL: p.photoURL || '' }],
    updatedAt: new Date().toISOString(),
  });
};

export const removeJubileeMember = async (cls: SchoolClass, uid: string) => {
  await updateDoc(doc(db, 'classes', cls.id), {
    memberIds: cls.memberIds.filter(x => x !== uid),
    members: cls.members.filter(m => m.uid !== uid),
    updatedAt: new Date().toISOString(),
  });
};

/** A chat made before its day was kept: an admin's opening writes the day (and who greets) onto it, as a new chat has it. */
export const keepJubileeDay = (chatId: string, who: Jubilar, fromClass: string, me: Me) =>
  updateDoc(doc(db, 'classes', chatId), {
    bday: { month: who.month, day: who.day }, fromClass, jubileeName: who.name,
    greeter: { uid: me.uid, name: me.name, photoURL: me.photoURL || '' },
  });
