import { useEffect, useState } from 'react';
import { arrayRemove, arrayUnion, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context';

// Song words written in the app: songTexts/{songId} { text, by, at } (everyone reads). Admins write them on every song,
// and the members an admin picked: settings/songTextEditors { uids } (admins write, everyone reads).

let editors: string[] = [];
const listeners = new Set<(u: string[]) => void>();
let started = false;
const editorsRef = () => doc(db, 'settings', 'songTextEditors');

const start = () => {
  if (started) return;
  started = true;
  onSnapshot(
    editorsRef(),
    snap => {
      const d = snap.data() || {};
      editors = Array.isArray(d.uids) ? d.uids : [];
      listeners.forEach(l => l(editors));
    },
    () => { /* offline or not yet set: admins only */ }
  );
};

export const useSongTextEditors = () => {
  const [u, setU] = useState(editors);
  useEffect(() => {
    start();
    listeners.add(setU);
    setU(editors);
    return () => { listeners.delete(setU); };
  }, []);
  return u;
};

/** May the signed-in person write song words? */
export const useCanEditSongText = () => {
  const { user, isAdmin } = useAuth();
  const uids = useSongTextEditors();
  return isAdmin || (!!user && uids.includes(user.uid));
};

export const setSongTextEditor = (uid: string, on: boolean) =>
  setDoc(editorsRef(), { uids: on ? arrayUnion(uid) : arrayRemove(uid) }, { merge: true });

/** The words written in the app for this song: undefined while loading, null when there are none. */
export const useWrittenSongText = (songId?: string) => {
  const [text, setText] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    setText(undefined);
    if (!songId) return;
    return onSnapshot(
      doc(db, 'songTexts', songId),
      snap => { const t = snap.data()?.text; setText(typeof t === 'string' && t.trim() ? t : null); },
      () => setText(null)
    );
  }, [songId]);
  return text;
};

/** Save (or, with empty text, remove) the words written in the app. */
export const saveSongText = (songId: string, text: string, by: string) => {
  const ref = doc(db, 'songTexts', songId);
  const clean = text.replace(/\r/g, '').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  return clean ? setDoc(ref, { text: clean, by, at: serverTimestamp() }) : deleteDoc(ref);
};
