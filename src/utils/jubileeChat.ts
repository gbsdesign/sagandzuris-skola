import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { classChatBase, sendTextMessage } from '../hooks/useClassChat';
import type { SchoolClass } from '../hooks/useClasses';
import { logChange } from './adminLog';

// „იუბილარის ჩათი“ (2026-11-24, the user: „ადმინს შეეძლოს მასზედ დაჭერით შექმნას მიმდინარე იუბილარის ჩათი და ავტომატურად კლასის
// წევრები დაემატნენ იუბილარის გამოკლებით“): a chat of its own (a class doc marked `jubilee`) with the class's people but the one
// whose birthday it is. One a person a month: a second tap opens the one already made.

export interface Me { uid: string; name: string; photoURL: string; email?: string }

const MONTH = 30 * 86_400_000;

export const openJubileeChat = async (cls: SchoolClass, who: { uid: string; name: string }, me: Me): Promise<string> => {
  const made = await getDocs(query(collection(db, 'classes'), where('jubilee', '==', who.uid)));
  const fresh = made.docs.find(d => {
    const x = d.data();
    return !x.archived && Date.now() - Date.parse(x.createdAt || '') < MONTH;
  });
  if (fresh) return fresh.id;

  const not = (p: { uid: string }) => p.uid !== who.uid;
  const members = cls.members.filter(not);
  const teachers = [...cls.teachers.filter(not)];
  if (!teachers.some(t => t.uid === me.uid) && me.uid !== who.uid) teachers.push({ uid: me.uid, name: me.name, photoURL: me.photoURL });
  const ref = doc(collection(db, 'classes'));
  const now = new Date().toISOString();
  const name = `🎂 ${who.name}`;
  await setDoc(ref, {
    name, logo: '', jubilee: who.uid,
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
