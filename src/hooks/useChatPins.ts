import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { ChatAuthor, ChatMessage, toChatMessage } from './useClassChat';
import { notifyChat } from '../utils/groupPush';

// A teacher's (or an admin's) card for one member, in a chat (2026-11-04, the user: „ჩათში თითოეულ მოსწავლეს მასწავლებელი
// და ადმინებს უნდა შეეძლოს დავალების ან კომენტარის მიმაგრება კლასშიც და პირადშიც“ — „მარტო მასწი და ის კონკრეტული მოსწი
// ხედავენ“): a comment ('note') or an assignment ('work', a real one — made by NewAssignment — the card points at it).
// In a class's chat a card lives apart, in classes/{id}/pins, which only that member, the class's teachers and the admins
// may read (firestore.rules), so the others never learn it is there; the chat lays the cards in among its messages. In a
// private chat (dms/{id}) the two are alone anyway: a card is a message of its own kind there.

export interface PinInput {
  kind: 'note' | 'work';
  /** the member it is for */
  to: string;
  toName: string;
  /** a comment's text; a work card's assignment title (what the chat lists show) */
  text: string;
  /** a work card: the assignment's id and class, its chant (variant id) or exercise, its deadline and note */
  work?: string;
  wcls?: string;
  vid?: string;
  drill?: string;
  due?: string;
  note?: string;
}

const pinDoc = (author: ChatAuthor, p: PinInput) => ({
  uid: author.uid,
  name: author.name,
  photoURL: author.photoURL,
  teacher: true,
  kind: p.kind,
  text: p.text.slice(0, 2000),
  to: p.to,
  toName: p.toName.slice(0, 120),
  ...(p.kind === 'work'
    ? { work: p.work || '', wcls: p.wcls || '', vid: p.vid || '', drill: p.drill || '', due: p.due || '', note: (p.note || '').slice(0, 2000) }
    : {}),
  createdAt: serverTimestamp(),
});

const pinsOf = (classId: string) => collection(db, 'classes', classId, 'pins');

/** A card into a class's chat, seen only by `p.to`, the class's teachers and the admins. */
export const sendClassPin = async (classId: string, author: ChatAuthor, p: PinInput) => {
  const ref = await addDoc(pinsOf(classId), pinDoc(author, p));
  void notifyChat(`classes/${classId}`, ref.id, true);
  return ref;
};

/** A card into a private chat (dms/{id}): a message of its own kind. */
export const sendDmPin = async (base: string, author: ChatAuthor, p: PinInput) => {
  const ref = await addDoc(collection(db, base, 'messages'), pinDoc(author, p));
  void notifyChat(base, ref.id);
  return ref;
};

export const deleteClassPin = (classId: string, id: string) => deleteDoc(doc(pinsOf(classId), id));

/** What the chat list shows for a card („📌 …“). */
export const pinPreview = (p: Pick<PinInput, 'kind' | 'text'>) => (p.kind === 'work' ? `📌 დავალება: ${p.text}` : `📌 ${p.text}`);

/** A class chat's cards: a teacher (or an admin) gets all of them, a member only theirs. */
export const useClassPins = (classId: string, uid: string | undefined, staff: boolean) => {
  const [pins, setPins] = useState<ChatMessage[]>([]);
  useEffect(() => {
    if (!uid) { setPins([]); return; }
    // a member asks only for theirs (the rules let them read nothing else); few enough to sort here
    const q = staff ? query(pinsOf(classId), orderBy('createdAt', 'desc'), limit(150)) : query(pinsOf(classId), where('to', '==', uid));
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      snap => setPins(snap.docs.map(d => toChatMessage(d, true))),
      err => { console.warn('pins: ', err?.code || err); setPins([]); }
    );
  }, [classId, uid, staff]);
  return pins;
};

/** The chat's messages with its cards laid in by time (a card still being sent goes last). */
export const withPins = (messages: ChatMessage[], pins: ChatMessage[]) => {
  if (!pins.length) return messages;
  const t = (m: ChatMessage) => m.at?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return [...messages, ...pins].sort((a, b) => t(a) - t(b));
};
