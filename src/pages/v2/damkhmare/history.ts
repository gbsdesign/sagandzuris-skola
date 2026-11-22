import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

// „ავტომატური პროგრამა“'s talks are kept (the user, 2026-11-22: „რო გამოვალ ჩათიდან არ უნდა აივიწყებდეს … ისტორია უნდა იყოს
// წინა ჩათების და ახლის გახსნა შემეძლოს + ღილაკით“): `assistantChats/{uid}/chats/{id}` { title, at, items } — each person's own
// (firestore.rules). The device remembers which talk was open last (`sg-program-chat:<uid>`), so reopening goes on with it.

export type SavedKind = 'me' | 'ai' | 'note';
export interface Saved { k: SavedKind; t: string }
export interface ChatHead { id: string; title: string; at: number }

const MAX_ITEMS = 80;
const MAX_TEXT = 4000;

const chats = (uid: string) => collection(db, 'assistantChats', uid, 'chats');

export const newChatId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const listChats = async (uid: string): Promise<ChatHead[]> => {
  const snap = await getDocs(query(chats(uid), orderBy('at', 'desc'), limit(40)));
  return snap.docs.map(d => ({ id: d.id, title: String(d.data().title || 'საუბარი'), at: Number(d.data().at) || 0 }));
};

export const loadChat = async (uid: string, id: string): Promise<Saved[]> => {
  const snap = await getDoc(doc(chats(uid), id));
  const items = snap.exists() ? snap.data().items : null;
  return Array.isArray(items)
    ? items.filter((i): i is Saved => !!i && (i.k === 'me' || i.k === 'ai' || i.k === 'note') && typeof i.t === 'string')
    : [];
};

export const saveChat = (uid: string, id: string, items: Saved[]) => {
  const kept = items.slice(-MAX_ITEMS).map(i => ({ k: i.k, t: i.t.slice(0, MAX_TEXT) }));
  const title = (kept.find(i => i.k === 'me')?.t || 'საუბარი').replace(/\s+/g, ' ').slice(0, 60);
  return setDoc(doc(chats(uid), id), { title, at: Date.now(), items: kept });
};

export const removeChat = (uid: string, id: string) => deleteDoc(doc(chats(uid), id));

const lastKey = (uid: string) => `sg-program-chat:${uid}`;
export const lastChatId = (uid: string): string => {
  try { return localStorage.getItem(lastKey(uid)) || ''; } catch { return ''; }
};
export const setLastChatId = (uid: string, id: string) => {
  try { localStorage.setItem(lastKey(uid), id); } catch { /* storage off: a new talk next time */ }
};

/** „10 ნოე, 21:15“ — a talk's time in the list. */
export const chatTime = (ms: number) => {
  const d = new Date(ms);
  const months = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];
  return `${d.getDate()} ${months[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
