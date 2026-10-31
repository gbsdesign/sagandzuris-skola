import { useEffect, useState } from 'react';
import {
  addDoc, Bytes, collection, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { VoiceTake } from '../utils/voiceRecorder';
import type { RoomGame } from '../utils/gameRoom';
import { ROOM_GAME_INFO, chatRoomRef } from '../data/roomGames';

// A chat lives under a base document: a class's chat under classes/{classId}, a private one under
// dms/{teacherUid}_{studentUid} (hooks/useDirectChat.ts). Messages are {base}/messages; a voice message's
// MP3 lives apart, in {base}/voice/{messageId}_{n}, split below Firestore's 1 MiB document limit,
// so the message list stays light and audio is only downloaded when someone presses play.
export interface ChatMessage {
  id: string;
  uid: string;
  name: string;
  photoURL: string;
  teacher: boolean;
  // 'call': a private call was started (the teacher's "ზარი" button); 'game': an invitation into a class's game room
  kind: 'text' | 'voice' | 'call' | 'game';
  text: string;
  /** a 'game' message's room (classes/{id}/games/{room}) */
  room: string;
  seconds: number;
  wave: string;
  parts: number;
  at: Date | null;
  pending: boolean;
}

export interface ChatAuthor {
  uid: string;
  name: string;
  photoURL: string;
  teacher: boolean;
}

const SHOWN = 150;
const PART_BYTES = 700_000;

/** a class's chat base: classes/{classId} */
export const classChatBase = (classId: string) => `classes/${classId}`;

const messagesOf = (base: string) => collection(db, base, 'messages');
const voicePart = (base: string, messageId: string, n: number) => doc(db, base, 'voice', `${messageId}_${n}`);

// ---- which class chats have news: the newest message of each, and when I last read each ------------------

export interface ChatLast { at: Date | null; uid: string; text: string }

/** The newest message of each class chat (live), for the chat list and the header's count. */
export const useClassLasts = (ids: string[]) => {
  const [last, setLast] = useState<Record<string, ChatLast | null>>({});
  const key = ids.join(',');
  useEffect(() => {
    const offs = ids.map(id => onSnapshot(
      query(messagesOf(classChatBase(id)), orderBy('createdAt', 'desc'), limit(1)),
      s => {
        const d = s.docs[0]?.data({ serverTimestamps: 'estimate' });
        setLast(p => ({
          ...p,
          [id]: d ? { at: d.createdAt?.toDate?.() || null, uid: d.uid || '', text: d.kind === 'voice' ? '🎤 ხმოვანი შეტყობინება' : d.text || '' } : null,
        }));
      },
      err => console.warn('class chat: ', err?.code || err)
    ));
    return () => offs.forEach(off => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return last;
};

// when I last read each class chat: in my students document (chatSeen.{classId}), so a phone and a computer
// agree; what this device noted before that still counts
const SEEN_KEY = 'sg-classChatSeen';
const deviceSeen = (): Record<string, number> => {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {}; } catch { return {}; }
};

/** When I last read each class chat (live): classId → ms. */
export const useChatSeen = (uid?: string | null) => {
  const [seen, setSeen] = useState<Record<string, number>>(deviceSeen);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, 'students', uid), snap => {
      const kept = (snap.data()?.chatSeen || {}) as Record<string, unknown>;
      const next = deviceSeen();
      for (const [id, at] of Object.entries(kept)) if (typeof at === 'number' && at > (next[id] || 0)) next[id] = at;
      setSeen(next);
    }, () => {});
  }, [uid]);
  return seen;
};

/** I have read a class chat up to `at` (its newest message): this device at once, my record in the background. */
export const markChatSeen = (uid: string, classId: string, at: number) => {
  const mine = deviceSeen();
  if ((mine[classId] || 0) >= at) return;
  mine[classId] = at;
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(mine)); } catch { /* private window */ }
  updateDoc(doc(db, 'students', uid), { [`chatSeen.${classId}`]: at }).catch(() => { /* no record yet: this device keeps it */ });
};

/** someone else wrote after I last read it */
export const isClassUnread = (last: ChatLast | null | undefined, seenAt: number | undefined, uid: string) =>
  !!last?.at && last.uid !== uid && (seenAt ?? 0) < last.at.getTime();

/** The chat's latest messages, oldest first (live). */
export const useChat = (base?: string | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!base) return;
    setLoading(true);
    const q = query(messagesOf(base), orderBy('createdAt', 'desc'), limit(SHOWN));
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      snap => {
        setMessages(snap.docs.map(d => {
          const m = d.data({ serverTimestamps: 'estimate' });
          return {
            id: d.id,
            uid: m.uid || '',
            name: m.name || '',
            photoURL: m.photoURL || '',
            teacher: !!m.teacher,
            kind: m.kind === 'voice' || m.kind === 'call' || m.kind === 'game' ? m.kind : 'text',
            text: m.text || '',
            room: typeof m.room === 'string' ? m.room : '',
            seconds: m.seconds || 0,
            wave: m.wave || '',
            parts: m.parts || 0,
            at: m.createdAt?.toDate?.() || null,
            pending: d.metadata.hasPendingWrites,
          } as ChatMessage;
        }).reverse());
        setLoading(false);
        setError(false);
      },
      err => { console.warn('chat: ', err?.code || err); setLoading(false); setError(true); }
    );
  }, [base]);
  return { messages, loading, error };
};

const stamp = (author: ChatAuthor) => ({
  uid: author.uid,
  name: author.name,
  photoURL: author.photoURL,
  teacher: author.teacher,
  createdAt: serverTimestamp(),
});

export const sendTextMessage = async (base: string, author: ChatAuthor, text: string) => {
  await addDoc(messagesOf(base), { ...stamp(author), kind: 'text', text: text.slice(0, 2000) });
};

/** „სამშვილდის ღამე“ online: the class is invited into a game room — a card with a button into the room */
/** an invitation into a game room of the class (its card leads into the room) */
export const sendGameMessage = async (classId: string, author: ChatAuthor, roomId: string, game: RoomGame = 'samshvilde') => {
  const text = `${game === 'samshvilde' ? '🌙' : '🎲'} „${ROOM_GAME_INFO[game].title}“ — ონლაინ თამაში`;
  await addDoc(messagesOf(classChatBase(classId)), { ...stamp(author), kind: 'game', text, room: chatRoomRef(game, roomId) });
};

/** "a call started": shown in the chat as a card with a button into the call */
export const sendCallMessage = async (base: string, author: ChatAuthor) => {
  await addDoc(messagesOf(base), { ...stamp(author), kind: 'call', text: '' });
};

export const sendVoiceMessage = async (base: string, author: ChatAuthor, { mp3, seconds, wave }: VoiceTake) => {
  const bytes = new Uint8Array(await mp3.arrayBuffer());
  const ref = doc(messagesOf(base));
  const batch = writeBatch(db);
  let parts = 0;
  for (let i = 0; i < bytes.length; i += PART_BYTES, parts++) {
    batch.set(voicePart(base, ref.id, parts), { uid: author.uid, data: Bytes.fromUint8Array(bytes.subarray(i, i + PART_BYTES)) });
  }
  batch.set(ref, { ...stamp(author), kind: 'voice', text: '', seconds: Math.round(seconds * 10) / 10, wave, parts });
  await batch.commit();
};

export const deleteMessage = async (base: string, m: ChatMessage) => {
  const batch = writeBatch(db);
  for (let n = 0; n < m.parts; n++) batch.delete(voicePart(base, m.id, n));
  batch.delete(doc(messagesOf(base), m.id));
  await batch.commit();
};

// message id -> object URL of its MP3, kept for the session so a replay doesn't download again
const voiceUrls = new Map<string, Promise<string>>();

export const loadVoiceUrl = (base: string, m: ChatMessage): Promise<string> => {
  let url = voiceUrls.get(m.id);
  if (!url) {
    url = Promise.all(Array.from({ length: m.parts }, (_, n) => getDoc(voicePart(base, m.id, n)))).then(snaps => {
      const pieces = snaps.map(s => {
        const data = s.get('data') as Bytes | undefined;
        if (!data) throw new Error('voice part missing');
        return data.toUint8Array() as BlobPart;
      });
      return URL.createObjectURL(new Blob(pieces, { type: 'audio/mpeg' }));
    });
    url.catch(() => voiceUrls.delete(m.id));
    voiceUrls.set(m.id, url);
  }
  return url;
};
