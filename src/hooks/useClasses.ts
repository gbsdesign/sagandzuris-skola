import { useEffect, useMemo, useState } from 'react';
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
  // the class's own psalter group, made by its teacher (none until they make one)
  psalterGroupId?: string;
  // put away by an admin („არქივი“): hidden everywhere, nothing deleted, an admin brings it back
  archived?: boolean;
  archivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const list = (v: unknown) => (Array.isArray(v) ? v : []);

export const toClass = (id: string, d: any): SchoolClass => ({
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
  psalterGroupId: typeof d.psalterGroupId === 'string' ? d.psalterGroupId : '',
  ...(d.archived ? { archived: true, archivedAt: d.archivedAt || '' } : {}),
  createdAt: d.createdAt || '',
  updatedAt: d.updatedAt || '',
  ...(d.liturgy ? { liturgy: d.liturgy } : {}),
  ...(d.live ? { live: d.live } : {}),
});

const byName = (a: SchoolClass, b: SchoolClass) => a.name.localeCompare(b.name, 'ka');
// the classes in use, by name (an archived class shows only in the admin's „არქივი“)
const active = (docs: { id: string; data: () => any }[]) => docs.map(d => toClass(d.id, d.data())).filter(c => !c.archived).sort(byName);

/** Classes the given user belongs to (live). */
export const useMyClasses = (uid?: string | null) => {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  useEffect(() => {
    if (!uid) { setClasses([]); return; }
    const q = query(collection(db, 'classes'), where('memberIds', 'array-contains', uid));
    return onSnapshot(
      q,
      snap => setClasses(active(snap.docs)),
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
      snap => { setClasses(active(snap.docs)); setLoading(false); },
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

/** Every class (admins only, live): those in use, and the archived ones apart. `failed` = the list did not come;
 *  `fresh` = it is the server's, not a possibly partial copy from the phone's cache. */
export const useAllClasses = (enabled: boolean) => {
  const [all, setAll] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    if (!enabled) { setAll([]); setLoading(false); return; }
    return onSnapshot(
      collection(db, 'classes'),
      { includeMetadataChanges: true },
      snap => {
        setAll(snap.docs.map(d => toClass(d.id, d.data())).sort(byName));
        setFresh(!snap.metadata.fromCache);
        setFailed(false);
        setLoading(false);
      },
      err => { console.warn('classes: ', err?.code || err); setFailed(true); setFresh(false); setLoading(false); }
    );
  }, [enabled]);
  const classes = useMemo(() => all.filter(c => !c.archived), [all]);
  const archived = useMemo(() => all.filter(c => c.archived), [all]);
  return { classes, archived, loading, failed, fresh };
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
