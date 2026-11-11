import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useRealAuth } from '../context';

// settings/recordingTools (admins write, everyone reads; 2026-11-11, the user: „ჩანაწერების ოფლაინ და ჩამოტვირთვის ღილაკების
// მართვა … დამალვა და გამოჩენა“, answer „მხოლოდ წევრებს“): { mp3Hidden, offlineHidden } — hides the recordings' ⬇ MP3 and
// ☁ offline buttons from members and guests at once; teachers and admins always keep them. Not set = both shown.
// Books' pages offline and the notes page's own offline save are not touched (the choir reads offline in church).
export interface RecordingToolsSetting { mp3Hidden: boolean; offlineHidden: boolean }

let cache: RecordingToolsSetting | null = null;
const listeners = new Set<(s: RecordingToolsSetting) => void>();
let started = false;
const ref = () => doc(db, 'settings', 'recordingTools');

const start = () => {
  if (started) return;
  started = true;
  onSnapshot(
    ref(),
    snap => {
      const d = snap.data() || {};
      cache = { mp3Hidden: d.mp3Hidden === true, offlineHidden: d.offlineHidden === true };
      listeners.forEach(l => l(cache!));
    },
    () => { /* offline or not set: shown */ }
  );
};

/** The stored setting (null until read) — for the admin's switches */
export const useRecordingToolsSetting = () => {
  const [s, setS] = useState(cache);
  useEffect(() => {
    start();
    listeners.add(setS);
    setS(cache);
    return () => { listeners.delete(setS); };
  }, []);
  return s;
};

/** May the person see the recordings' ⬇ MP3 and ☁ offline buttons? */
export const useRecordingTools = () => {
  const { isTeacher } = useRealAuth();
  const s = useRecordingToolsSetting();
  if (isTeacher) return { mp3: true, offline: true };
  return { mp3: !s?.mp3Hidden, offline: !s?.offlineHidden };
};

export const setRecordingTools = (patch: Partial<RecordingToolsSetting>) => setDoc(ref(), patch, { merge: true });
