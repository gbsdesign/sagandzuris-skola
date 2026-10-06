import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

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

// One lesson in the class timetable: weekday (0 = Sunday, as Date.getDay) and time.
export interface LessonSlot {
  day: number;
  start: string;  // "18:00"
  end?: string;   // "19:30"
  note?: string;  // e.g. the place
}

export interface SchoolClass {
  id: string;
  name: string;
  logo?: string; // small data URL
  memberIds: string[];
  members: ClassMember[];
  // the class's teachers (named by an admin); they manage this class only
  teacherIds: string[];
  teachers: ClassMember[];
  program: ProgramItem[];
  schedule: LessonSlot[];
  // "კლასის რეჟიმი": members see only the program's versions in the chant lists (one tap shows all)
  classMode?: boolean;
  // the teacher's starting home buttons for members who have chosen none
  defaultShortcuts?: string[];
  inviteCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

const list = (v: unknown) => (Array.isArray(v) ? v : []);

const toClass = (id: string, d: any): SchoolClass => ({
  id,
  name: d.name || 'კლასი',
  logo: d.logo || '',
  memberIds: list(d.memberIds),
  members: list(d.members),
  teacherIds: list(d.teacherIds),
  teachers: list(d.teachers),
  program: list(d.program),
  schedule: list(d.schedule).filter((x: any) => x && typeof x.day === 'number' && typeof x.start === 'string'),
  classMode: Boolean(d.classMode),
  defaultShortcuts: list(d.defaultShortcuts).filter((x: unknown) => typeof x === 'string'),
  inviteCode: typeof d.inviteCode === 'string' ? d.inviteCode : '',
  createdAt: d.createdAt || '',
  updatedAt: d.updatedAt || '',
  ...(d.liturgy ? { liturgy: d.liturgy } : {}),
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

/** Classes the given teacher leads (live). */
export const useTeachingClasses = (uid?: string | null) => {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!uid) { setClasses([]); setLoading(false); return; }
    const q = query(collection(db, 'classes'), where('teacherIds', 'array-contains', uid));
    return onSnapshot(
      q,
      snap => { setClasses(snap.docs.map(d => toClass(d.id, d.data())).sort(byName)); setLoading(false); },
      err => { console.warn('teaching classes: ', err?.code || err); setClasses([]); setLoading(false); }
    );
  }, [uid]);
  return { classes, loading };
};

/** The classes this person manages: every class for an admin, their own for a teacher. */
export const useManagedClasses = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const all = useAllClasses(isAdmin);
  const own = useTeachingClasses(!isAdmin && isTeacher ? user?.uid : null);
  return isAdmin ? all : own;
};

/** Every class (admins only, live). */
export const useAllClasses = (enabled: boolean) => {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!enabled) { setClasses([]); setLoading(false); return; }
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
