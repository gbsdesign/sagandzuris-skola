import { useEffect, useState } from 'react';
import { arrayRemove, arrayUnion, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context';

// settings/centreDownload (admins write, everyone reads): { everyone: boolean, uids: string[] } — who may save the
// Folklore Centre's recordings (MP3 / offline). Staff always may; a member when `everyone` is on or their uid is listed.
export interface CentreDownload { everyone: boolean; uids: string[] }

let cache: CentreDownload = { everyone: false, uids: [] };
const listeners = new Set<(s: CentreDownload) => void>();
let started = false;
const ref = () => doc(db, 'settings', 'centreDownload');

const start = () => {
  if (started) return;
  started = true;
  onSnapshot(
    ref(),
    snap => {
      const d = snap.data() || {};
      cache = { everyone: d.everyone === true, uids: Array.isArray(d.uids) ? d.uids : [] };
      listeners.forEach(l => l(cache));
    },
    () => { /* offline or not yet set: nobody but staff */ }
  );
};

export const useCentreDownloadSettings = () => {
  const [s, setS] = useState(cache);
  useEffect(() => {
    start();
    listeners.add(setS);
    setS(cache);
    return () => { listeners.delete(setS); };
  }, []);
  return s;
};

/** May the signed-in person save the Centre's recordings? */
export const useCanDownloadCentre = () => {
  const { user, isTeacher } = useAuth();
  const s = useCentreDownloadSettings();
  return isTeacher || (!!user && (s.everyone || s.uids.includes(user.uid)));
};

export const setCentreEveryone = (everyone: boolean) => setDoc(ref(), { everyone }, { merge: true });
export const setCentreMember = (uid: string, on: boolean) =>
  setDoc(ref(), { uids: on ? arrayUnion(uid) : arrayRemove(uid) }, { merge: true });
