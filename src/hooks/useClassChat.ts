import { useEffect, useState } from 'react';
import {
  addDoc, Bytes, collection, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { VoiceTake } from '../utils/voiceRecorder';

// A class's chat: classes/{classId}/messages. A voice message's MP3 lives apart, in
// classes/{classId}/voice/{messageId}_{n}, split below Firestore's 1 MiB document limit,
// so the message list stays light and audio is only downloaded when someone presses play.
export interface ChatMessage {
  id: string;
  uid: string;
  name: string;
  photoURL: string;
  teacher: boolean;
  kind: 'text' | 'voice';
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

const messagesOf = (classId: string) => collection(db, 'classes', classId, 'messages');
const voicePart = (classId: string, messageId: string, n: number) => doc(db, 'classes', classId, 'voice', `${messageId}_${n}`);

/** The class's latest messages, oldest first (live). */
export const useClassChat = (classId?: string | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    const q = query(messagesOf(classId), orderBy('createdAt', 'desc'), limit(SHOWN));
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
            kind: m.kind === 'voice' ? 'voice' : 'text',
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
  }, [classId]);
  return { messages, loading, error };
};

const base = (author: ChatAuthor) => ({
  uid: author.uid,
  name: author.name,
  photoURL: author.photoURL,
  teacher: author.teacher,
  createdAt: serverTimestamp(),
});

export const sendTextMessage = async (classId: string, author: ChatAuthor, text: string) => {
  await addDoc(messagesOf(classId), { ...base(author), kind: 'text', text: text.slice(0, 2000) });
};

export const sendVoiceMessage = async (classId: string, author: ChatAuthor, { mp3, seconds, wave }: VoiceTake) => {
  const bytes = new Uint8Array(await mp3.arrayBuffer());
  const ref = doc(messagesOf(classId));
  const batch = writeBatch(db);
  let parts = 0;
  for (let i = 0; i < bytes.length; i += PART_BYTES, parts++) {
    batch.set(voicePart(classId, ref.id, parts), { uid: author.uid, data: Bytes.fromUint8Array(bytes.subarray(i, i + PART_BYTES)) });
  }
  batch.set(ref, { ...base(author), kind: 'voice', text: '', seconds: Math.round(seconds * 10) / 10, wave, parts });
  await batch.commit();
};

export const deleteMessage = async (classId: string, m: ChatMessage) => {
  const batch = writeBatch(db);
  for (let n = 0; n < m.parts; n++) batch.delete(voicePart(classId, m.id, n));
  batch.delete(doc(messagesOf(classId), m.id));
  await batch.commit();
};

// message id -> object URL of its MP3, kept for the session so a replay doesn't download again
const voiceUrls = new Map<string, Promise<string>>();

export const loadVoiceUrl = (classId: string, m: ChatMessage): Promise<string> => {
  let url = voiceUrls.get(m.id);
  if (!url) {
    url = Promise.all(Array.from({ length: m.parts }, (_, n) => getDoc(voicePart(classId, m.id, n)))).then(snaps => {
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
