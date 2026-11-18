import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth, useViewing } from '../../../context';

type V = '1' | '2' | '3';
const KEY = 'sg-my-voice';
const isV = (x: unknown): x is V => x === '1' || x === '2' || x === '3';

const readDevice = (): V | null => {
  try { const v = localStorage.getItem(KEY); return isV(v) ? v : null; } catch { return null; }
};

/** The voice I sing: the profile's one voice, else the device's choice, else null (ask once). */
export const useMyVoice = (): { voice: V | null; save: (v: V) => Promise<void> } => {
  const { user } = useAuth();
  const viewing = useViewing();
  const uid = user?.uid ?? null;
  const [device, setDevice] = useState<V | null>(readDevice);
  const [profile, setProfile] = useState<V | null>(null);

  useEffect(() => {
    if (!uid) { setProfile(null); return; }
    return onSnapshot(doc(db, 'students', uid), s => {
      const vs = s.data()?.profile?.voices;
      const list = Array.isArray(vs) ? vs.filter(isV) : [];
      setProfile(list.length === 1 ? list[0] : null);
    }, () => setProfile(null));
  }, [uid]);

  const save = useCallback(async (v: V) => {
    if (viewing) return; // a teacher's look: read only
    try { localStorage.setItem(KEY, v); } catch { /* private mode */ }
    setDevice(v);
    if (!uid) return;
    try { await setDoc(doc(db, 'students', uid), { profile: { voices: [v] } }, { merge: true }); }
    catch (e) { console.warn('my voice:', (e as { code?: string })?.code || e); }
  }, [uid, viewing]);

  return { voice: profile ?? device, save };
};
