import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { fullName, hasGeorgianName, prayerName } from './memberName';

// directory/{uid}: just the name and photo of everyone who has signed in, so a teacher can add people
// to their class or psalter group without reading anyone's private record (firestore.rules).
export interface DirectoryEntry {
  uid: string;
  name: string;        // Google name
  firstName?: string;  // Georgian name from the profile
  lastName?: string;
  churchName?: string;
  photoURL?: string;
}

/** The name groups show: the Georgian profile name when there is one. */
export const shownName = (e: DirectoryEntry) => (hasGeorgianName(e) ? fullName(e) : e.name || 'უსახელო');
export const shownPrayerName = (e: DirectoryEntry) => (hasGeorgianName(e) ? prayerName(e) : '');

export const writeDirectory = (uid: string, entry: Partial<Omit<DirectoryEntry, 'uid'>>) =>
  setDoc(doc(db, 'directory', uid), { ...entry, uid, updatedAt: new Date().toISOString() }, { merge: true }).catch(e =>
    console.warn('directory note:', e?.code || e)
  );

/** Everyone in the directory (teachers and admins only). */
export const useDirectory = (enabled: boolean) => {
  const [people, setPeople] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!enabled) { setPeople([]); setLoading(false); return; }
    return onSnapshot(
      collection(db, 'directory'),
      s => {
        setPeople(s.docs.map(d => ({ ...(d.data() as DirectoryEntry), uid: d.id })).sort((a, b) => shownName(a).localeCompare(shownName(b), 'ka')));
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [enabled]);
  return { people, loading };
};
