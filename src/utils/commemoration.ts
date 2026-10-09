import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context';

// "მოსახსენებელი": the names a student prays for, in their own order. Kept on the student's
// Firestore doc (field `commemoration`) so every device shows the same lists, and cached in
// localStorage so prayers show the names at once (and without an account).

export type NameListId = 'deceased' | 'living' | 'group';
// the living and the departed can also be kept under categories ("ოჯახი", "მეგობრები"…);
// the plain lists hold the names written without one
export type CategoryListId = 'living' | 'deceased';
export interface NameSection { title: string; names: string[] }
export type Commemoration = Record<NameListId, string[]> & {
  sections: Record<CategoryListId, NameSection[]>;
  // categories a student made up themself, offered next time too
  customCategories: string[];
  // the psalter group's people (uids) in the order the student dragged them
  groupOrder: string[];
};

// the offered categories, in the order they are read in prayers (one's own come before „სხვა“)
export const NAME_CATEGORIES = ['ოჯახი', 'ნათესავები', 'ნათლია-ნათლულები', 'მეგობრები', 'კლასელები', 'თანამშრომლები', 'მეზობლები'];
export const OTHER_CATEGORY = 'სხვა';
export const categoryChoices = (custom: string[]) => [...NAME_CATEGORIES, ...custom.filter(c => !NAME_CATEGORIES.includes(c) && c !== OTHER_CATEGORY), OTHER_CATEGORY];

export const NAME_LISTS: { id: NameListId; title: string; hint: string }[] = [
  { id: 'living', title: 'ცოცხალთა', hint: 'მშობლები, ოჯახი, ახლობლები — ლოცვებში „(სახელი)“-ს ადგილას ჩაიწერება.' },
  { id: 'deceased', title: 'გარდაცვლილთა', hint: 'ჩაიწერება ლოცვებში, სადაც მიცვალებულთა სახელები მოიხსენიება.' },
  { id: 'group', title: 'ჯგუფის წევრები', hint: 'ფსალმუნთა კითხვისას მოსახსენიებლად.' },
];

const KEY = 'commemoration';
const CHANGED = 'commemoration-changed';
const EMPTY: Commemoration = { deceased: [], living: [], group: [], sections: { living: [], deceased: [] }, customCategories: [], groupOrder: [] };

// Names typed together, separated by spaces, commas, semicolons or new lines.
export const splitNames = (text: string): string[] => text.split(/[\s,;]+/).map(n => n.trim()).filter(Boolean);

const tidy = (raw: unknown): Commemoration => {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<NameListId | 'sections' | 'customCategories' | 'groupOrder', unknown>>;
  // one name per entry: "გიორგი სულხანი" written at once becomes two names to order separately
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').flatMap(splitNames) : []);
  const customCategories = Array.isArray(src.customCategories)
    ? [...new Set(src.customCategories.filter((x): x is string => typeof x === 'string').map(x => x.trim()).filter(Boolean))]
    : [];
  const order = categoryChoices(customCategories);
  const rank = (t: string) => (order.includes(t) ? order.indexOf(t) : order.length - 1);
  const raws = (src.sections && typeof src.sections === 'object' ? src.sections : {}) as Partial<Record<CategoryListId, unknown>>;
  // one section per category, in reading order; empty ones dropped
  const sections = (v: unknown): NameSection[] => {
    const by = new Map<string, string[]>();
    for (const x of Array.isArray(v) ? v : []) {
      const title = typeof x?.title === 'string' ? x.title.trim() : '';
      const names = list(x?.names);
      if (title && names.length) by.set(title, [...(by.get(title) || []), ...names]);
    }
    return [...by].map(([title, names]) => ({ title, names })).sort((a, b) => rank(a.title) - rank(b.title));
  };
  return {
    deceased: list(src.deceased),
    living: list(src.living),
    group: list(src.group),
    sections: { living: sections(raws.living), deceased: sections(raws.deceased) },
    customCategories,
    groupOrder: Array.isArray(src.groupOrder) ? [...new Set(src.groupOrder.filter((x): x is string => typeof x === 'string'))] : [],
  };
};

/** The group's people in the student's order; newcomers go to the end. */
export const inGroupOrder = <T extends { uid: string }>(people: T[], order: string[]) => {
  const at = (uid: string) => (order.includes(uid) ? order.indexOf(uid) : order.length);
  return people.map((p, i) => ({ p, i })).sort((a, b) => at(a.p.uid) - at(b.p.uid) || a.i - b.i).map(x => x.p);
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

/** How a list reads in a prayer: „გიორგი, ნინო; ოჯახი: ანა, დათო“ (plain names first, then each category). */
export const namesText = (lists: Commemoration, id: CategoryListId) =>
  [lists[id].join(', '), ...lists.sections[id].map(s => `${s.title}: ${s.names.join(', ')}`)].filter(Boolean).join('; ');

export const nameCount = (lists: Commemoration, id: NameListId) =>
  lists[id].length + (id === 'group' ? 0 : lists.sections[id].reduce((n, s) => n + s.names.length, 0));

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
