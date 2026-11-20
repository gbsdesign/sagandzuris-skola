import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { classChatBase, sendTextMessage, type ChatAuthor } from '../../../hooks/useClassChat';
import { dmBase, noteSent, openAdminThread, openThread, type DirectThread, type Person } from '../../../hooks/useDirectChat';
import { toClass } from '../../../hooks/useClasses';
import { addClassMembers } from '../../../components/admin/ClassesAdmin';
import { logChange } from '../../../utils/adminLog';
import { slotsText, type CheckedPlan, type PlanPerson } from '../../../utils/aiAssistant';

// What a plan does once the person said „კი“: the same writes the app makes by hand — a teacher's private chat (through the
// class that links them; an admin who does not teach them writes in the administration's chat), a line in a class chat, a new
// class made as the admin panel makes one. Nothing here widens a rule: firestore.rules still decides every write.

export interface Me { uid: string; name: string; photoURL: string; email?: string }

const author = (me: Me): ChatAuthor => ({ uid: me.uid, name: me.name, photoURL: me.photoURL, teacher: true });
const personOf = (p: { uid: string; name: string; photo?: string }): Person => ({ uid: p.uid, name: p.name, photoURL: p.photo || '' });

/** One private letter to each; returns how many went and how many did not. */
export const sendLetters = async (me: Me, to: PlanPerson[], text: string) => {
  let sent = 0;
  let failed = 0;
  for (const p of to) {
    try {
      const id = p.via ? await openThread(personOf(me), personOf(p), p.via) : await openAdminThread(personOf(p));
      await sendTextMessage(dmBase(id), author(me), text);
      // the lists show it first, as the chat page does after a send (a thread's own fields are all noteSent reads)
      const thread = { id, kind: p.via ? 'teach' : 'admin', members: p.via ? [me.uid, p.uid] : [p.uid] } as DirectThread;
      await noteSent(thread, me.uid, text).catch(e => console.warn('dm: ', e?.code || e));
      sent++;
    } catch (e) {
      console.warn('assistant letter: ', (e as { code?: string })?.code || e);
      failed++;
    }
  }
  return { sent, failed };
};

export const sendToClass = (me: Me, classId: string, text: string) => sendTextMessage(classChatBase(classId), author(me), text);

/** A new class (admins only — the rules say so): its name, lessons, me as its teacher if chosen, then its members, then a
 *  line in its chat so they hear of it. Returns the class's id and how many members could not be put in. */
export const makeClass = async (me: Me, plan: Extract<CheckedPlan, { kind: 'createClass' }>) => {
  const ref = doc(collection(db, 'classes'));
  const now = new Date().toISOString();
  const teachers = plan.teachMe ? [{ uid: me.uid, name: me.name, photoURL: me.photoURL }] : [];
  const data = {
    name: plan.name, logo: '', teacherIds: teachers.map(t => t.uid), teachers, memberIds: [], members: [], program: [],
    schedule: plan.slots, classMode: false, defaultShortcuts: [], createdAt: now, createdBy: me.email || '', updatedAt: now,
  };
  await setDoc(ref, data);
  logChange('class', `კლასი „${plan.name}“ შეიქმნა (ავტომატური პროგრამა)`, ref.id);
  let lost = 0;
  if (plan.members.length) {
    const r = await addClassMembers(toClass(ref.id, data), plan.members.map(m => ({ uid: m.uid, name: m.name, photoURL: m.photo || '' })));
    lost = r.lost;
    if (r.added.length) {
      const when = plan.slots.length ? ` გაკვეთილები: ${slotsText(plan.slots)}.` : '';
      await sendToClass(me, ref.id, `კლასი „${plan.name}“ შეიქმნა — კეთილი იყოს თქვენი მობრძანება!${when}`).catch(() => undefined);
    }
  }
  return { id: ref.id, lost };
};
