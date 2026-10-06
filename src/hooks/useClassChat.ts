import { useEffect, useState } from 'react';
import {
  addDoc, Bytes, collection, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { VoiceTake } from '../utils/voiceRecorder';

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
  // 'call': a private call was started (the teacher's "ზარი" button)
  kind: 'text' | 'voice' | 'call';
  text: string;
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
            kind: m.kind === 'voice' || m.kind === 'call' ? m.kind : 'text',
            text: m.text || '',
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
