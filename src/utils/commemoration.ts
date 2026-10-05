import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context';

// "მოსახსენებელი": the names a student prays for, in their own order. Kept on the student's
// Firestore doc (field `commemoration`) so every device shows the same lists, and cached in
// localStorage so prayers show the names at once (and without an account).

export type NameListId = 'deceased' | 'living' | 'group';
export type Commemoration = Record<NameListId, string[]>;

export const NAME_LISTS: { id: NameListId; title: string; hint: string }[] = [
  { id: 'living', title: 'ცოცხალთა', hint: 'მშობლები, ოჯახი, ახლობლები — ლოცვებში „(სახელი)“-ს ადგილას ჩაიწერება.' },
  { id: 'deceased', title: 'გარდაცვლილთა', hint: 'ჩაიწერება ლოცვებში, სადაც მიცვალებულთა სახელები მოიხსენიება.' },
  { id: 'group', title: 'ჯგუფის წევრები', hint: 'ფსალმუნთა კითხვისას მოსახსენიებლად.' },
];

const KEY = 'commemoration';
const CHANGED = 'commemoration-changed';
const EMPTY: Commemoration = { deceased: [], living: [], group: [] };

// Names typed together, separated by spaces, commas, semicolons or new lines.
export const splitNames = (text: string): string[] => text.split(/[\s,;]+/).map(n => n.trim()).filter(Boolean);

const tidy = (raw: unknown): Commemoration => {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<NameListId, unknown>>;
  // one name per entry: "გიორგი სულხანი" written at once becomes two names to order separately
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').flatMap(splitNames) : []);
  return { deceased: list(src.deceased), living: list(src.living), group: list(src.group) };
};

const readLocal = (): Commemoration => {
  try {
    return tidy(JSON.parse(localStorage.getItem(KEY) || 'null'));
  } catch {
    return EMPTY;
  }
};

const writeLocal = (value: Commemoration) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* storage off: the lists still live in Firestore for signed-in students */
  }
  window.dispatchEvent(new Event(CHANGED));
};

export const useCommemoration = () => {
  const { user } = useAuth();
  const [lists, setLists] = useState<Commemoration>(readLocal);

  useEffect(() => {
    const sync = () => setLists(readLocal());
    window.addEventListener(CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGED, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  // the student's saved lists win over this device's copy
  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, 'students', user.uid),
      snap => {
        const saved = snap.data()?.commemoration;
        if (saved) writeLocal(tidy(saved));
      },
      err => console.warn('commemoration sync note:', err?.message || err)
    );
  }, [user]);

  const save = (next: Commemoration) => {
    const clean = tidy(next);
    writeLocal(clean);
    if (user) {
      setDoc(doc(db, 'students', user.uid), { commemoration: clean }, { mergeFields: ['commemoration'] }).catch(err =>
        console.warn('commemoration save note:', err)
      );
    }
  };

  return { lists, save };
};
