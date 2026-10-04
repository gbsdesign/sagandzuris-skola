import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

// A class (group of students) made by an admin: shown to its members in the header and on its own page.
// Member names/photos are copied into the class so members can see each other without reading
// other students' private records.
export interface ClassMember {
  uid: string;
  name: string;
  photoURL?: string;
}

export interface ProgramItem {
  id?: string;   // catalogue id (chant variant, song, poem, instrument); absent on early free-text items
  title: string;
  code?: string;
  note?: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  logo?: string; // small data URL
  memberIds: string[];
  members: ClassMember[];
  program: ProgramItem[];
  createdAt?: string;
  updatedAt?: string;
}

const toClass = (id: string, d: any): SchoolClass => ({
  id,
  name: d.name || 'კლასი',
  logo: d.logo || '',
  memberIds: Array.isArray(d.memberIds) ? d.memberIds : [],
  members: Array.isArray(d.members) ? d.members : [],
  program: Array.isArray(d.program) ? d.program : [],
  createdAt: d.createdAt || '',
  updatedAt: d.updatedAt || '',
});

const byName = (a: SchoolClass, b: SchoolClass) => a.name.localeCompare(b.name, 'ka');

/** Classes the given user belongs to (live). */
export const useMyClasses = (uid?: string | null) => {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  useEffect(() => {
    if (!uid) { setClasses([]); return; }
    const q = query(collection(db, 'classes'), where('memberIds', 'array-contains', uid));
    return onSnapshot(
      q,
      snap => setClasses(snap.docs.map(d => toClass(d.id, d.data())).sort(byName)),
      err => { console.warn('classes: ', err?.code || err); setClasses([]); }
    );
  }, [uid]);
  return classes;
};

/** Every class (admins only, live). */
export const useAllClasses = (enabled: boolean) => {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(
      collection(db, 'classes'),
      snap => { setClasses(snap.docs.map(d => toClass(d.id, d.data())).sort(byName)); setLoading(false); },
      err => { console.warn('classes: ', err?.code || err); setLoading(false); }
    );
  }, [enabled]);
  return { classes, loading };
};

/** Shrinks a picked image to a square-ish data URL small enough to live inside the class document. */
export const imageFileToDataUrl = (file: File, size = 160): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('სურათი ვერ წაიკითხა'));
      img.onload = () => {
        const scale = Math.min(1, size / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
