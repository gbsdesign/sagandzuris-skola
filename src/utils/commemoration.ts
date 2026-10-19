import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context';
import { Gender, nameGender, titleGender } from '../data/georgianNames';

// "მოსახსენებელი": the names a student prays for. Kept on the student's
// Firestore doc (field `commemoration`) so every device shows the same lists, and cached in
// localStorage so prayers show the names at once (and without an account).
// Names stay in the order written and dragged. With „დალაგება“ on (the page's ⋯ menu) a new name takes its place
// by itself — clergy men, clergy women, then lay men, lay women, each by the alphabet (unknown ones last).

export type NameListId = 'deceased' | 'living' | 'group' | 'sick' | 'trial';
// the living and the departed can also be kept under categories ("ოჯახი", "მეგობრები"…);
// the plain lists hold the names written without one
export type CategoryListId = 'living' | 'deceased';
export const isCategoryList = (id: NameListId): id is CategoryListId => id === 'living' || id === 'deceased';
export interface NameSection { title: string; names: string[] }
export type Commemoration = Record<NameListId, string[]> & {
  sections: Record<CategoryListId, NameSection[]>;
  // categories a student made up themself, offered next time too
  customCategories: string[];
  // the psalter group's people (uids) in the order the student dragged them
  groupOrder: string[];
  // a man or a woman, as the student marked a name the app guessed wrong or didn't know (by the first name)
  genders: Record<string, Gender>;
  // „დალაგება“ is on: new names go to their place in the reading order
  autoSort: boolean;
};

// the offered categories, in the order they are read in prayers (one's own come before „სხვა“)
export const NAME_CATEGORIES = ['ოჯახი', 'ნათესავები', 'ნათლია-ნათლულები', 'მეგობრები', 'კლასელები', 'თანამშრომლები', 'მეზობლები'];
export const OTHER_CATEGORY = 'სხვა';
export const categoryChoices = (custom: string[]) => [...NAME_CATEGORIES, ...custom.filter(c => !NAME_CATEGORIES.includes(c) && c !== OTHER_CATEGORY), OTHER_CATEGORY];

export const NAME_LISTS: { id: NameListId; title: string; hint: string }[] = [
  { id: 'living', title: 'ცოცხალთა', hint: 'მშობლები, ოჯახი, ახლობლები — ლოცვებში „(სახელი)“-ს ადგილას ჩაიწერება.' },
  { id: 'deceased', title: 'გარდაცვლილთა', hint: 'ჩაიწერება ლოცვებში, სადაც მიცვალებულთა სახელები მოიხსენიება.' },
  { id: 'group', title: 'ჯგუფის წევრები', hint: 'ფსალმუნთა კითხვისას მოსახსენიებლად.' },
  { id: 'sick', title: 'უძლურებასა და განსაცდელსა შინა მყოფნი', hint: 'ჩაიწერება „ლოცვა სნეულთათვის“-ში და „დიდებაი“-ზე.' },
  { id: 'trial', title: 'განსაცდელსა შინა მყოფნი', hint: 'მოიხსენიება „დიდებაი“-ზე.' },
];

const KEY = 'commemoration';
const CHANGED = 'commemoration-changed';
const EMPTY: Commemoration = {
  deceased: [], living: [], group: [], sick: [], trial: [],
  sections: { living: [], deceased: [] }, customCategories: [], groupOrder: [], genders: {}, autoSort: false,
};

/** A list entry split into its clergy title (if any) and the name: „მღვდ. გიორგი“ → „მღვდ.“ + „გიორგი“. */
export const nameParts = (entry: string) => {
  const [first = '', ...rest] = entry.trim().split(/\s+/);
  return rest.length && titleGender(first) !== undefined ? { title: first, bare: rest.join(' ') } : { title: '', bare: entry.trim() };
};

/** The first name a gender mark is kept under („ლუკა (სად.)“ → „ლუკა“). */
export const genderKey = (entry: string) => nameParts(entry).bare.split(/[\s(]/)[0];

/** The gender the app guesses (by the title, else by the name), before the student's own marks. */
export const guessGender = (entry: string): Gender | undefined => {
  const { title } = nameParts(entry);
  return (title ? titleGender(title) : undefined) || nameGender(genderKey(entry));
};

export const genderOf = (entry: string, genders: Record<string, Gender>): Gender | undefined =>
  genders[genderKey(entry)] || guessGender(entry);

// clergy men, clergy women, clergy not known; lay men, lay women, not known
const rankOf = (entry: string, genders: Record<string, Gender>) => {
  const g = genderOf(entry, genders);
  return (nameParts(entry).title ? 0 : 3) + (g === 'm' ? 0 : g === 'f' ? 1 : 2);
};

/** The reading order of two names (see the top of the file). */
export const compareNames = (a: string, b: string, genders: Record<string, Gender>) =>
  rankOf(a, genders) - rankOf(b, genders) || nameParts(a).bare.localeCompare(nameParts(b).bare, 'ka') || a.localeCompare(b, 'ka');

/** Puts each new item where it belongs in the order, leaving the rest (maybe dragged) where they stand. */
export const insertSorted = <T,>(list: T[], fresh: T[], cmp: (a: T, b: T) => number) => {
  const out = [...list];
  for (const x of [...fresh].sort(cmp)) {
    const at = out.findIndex(y => cmp(y, x) > 0);
    out.splice(at < 0 ? out.length : at, 0, x);
  }
  return out;
};

// a clergy title written before a name stays with it: „მღვდ. გიორგი“ is one name
const withTitles = (words: string[]) => {
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const next = words[i + 1];
    if (titleGender(words[i]) !== undefined && next && !next.endsWith(':') && titleGender(next) === undefined) out.push(`${words[i]} ${words[++i]}`);
    else out.push(words[i]);
  }
  return out;
};

// Names typed together, separated by spaces, commas, semicolons, underscores or new lines. What stands in
// brackets stays with its name („ლუკა (სად.)“, „ნიკოლოზი (დედა სოფიო)“); a lone „და“ and question marks
// („ნინო[?]“) are dropped; a word ending in „:“ („მეზობლები:“) is kept whole — `tidy` makes it a category.
export const splitNames = (text: string): string[] => {
  const out: string[] = [];
  let word = '';
  let depth = 0;
  let openAt = 0;
  const end = () => {
    const w = word
      .replace(/\[\s*\?+\s*\]|\?/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .replace(/\(\)/g, '')
      .trim();
    word = '';
    depth = 0;
    if (!w || w === 'და') return;
    const last = out.length - 1;
    if (w.startsWith('(') && last >= 0 && !out[last].endsWith(':')) out[last] += ` ${w}`;
    else out.push(w);
  };
  for (const ch of text) {
    // an unclosed bracket ends at a comma, a new line or after 40 letters, so it cannot swallow the list
    if (depth > 0 && (/[,;\n]/.test(ch) || word.length - openAt > 40)) depth = 0;
    if (ch === '(') {
      if (!depth) openAt = word.length;
      depth++;
    } else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (depth > 0) {
      word += ch === '_' ? ' ' : ch;
      continue;
    } else if (/[\s,;_]/.test(ch)) {
      end();
      continue;
    } else if (ch === ':') {
      word += ch;
      end();
      continue;
    }
    word += ch;
  }
  end();
  return withTitles(out);
};

// „ნათესაობა:“ → the offered „ნათესავები“ (same first letters); anything else is a category of its own
const categoryTitle = (head: string) => {
  const title = head.replace(/:$/, '').trim();
  const key = (s: string) => s.replace(/[^\p{L}]/gu, '').slice(0, 4);
  return NAME_CATEGORIES.find(c => key(c) === key(title)) || title;
};

const tidy = (raw: unknown): Commemoration => {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Partial<
    Record<NameListId | 'sections' | 'customCategories' | 'groupOrder' | 'genders' | 'autoSort', unknown>
  >;
  const genders: Record<string, Gender> = Object.fromEntries(
    Object.entries(src.genders && typeof src.genders === 'object' ? src.genders : {}).filter(([k, v]) => k && (v === 'm' || v === 'f'))
  );
  const autoSort = src.autoSort === true;
  // one name per entry: "გიორგი სულხანი" written at once becomes two names to order separately
  // (a title kept apart by the older splitting — „მღვდ.“, „იოანე“ — joins its name again; so does a bracket
  // kept apart from its name — „გურამი“, „(გაფრ.)“ — so the entries are read as one text)
  const list = (v: unknown) => withTitles(Array.isArray(v) ? splitNames(v.filter((x): x is string => typeof x === 'string').join(' ')) : []);
  const raws = (src.sections && typeof src.sections === 'object' ? src.sections : {}) as Partial<Record<CategoryListId, unknown>>;
  // the names by category ('' = without one); a „მეზობლები:“ among them puts the names after it under „მეზობლები“
  const regroup = (plain: unknown, sections: unknown) => {
    const by = new Map<string, string[]>([['', []]]);
    const walk = (title: string, names: string[]) => {
      let at = title;
      let fresh = false;
      for (const n of names) {
        if (n.endsWith(':')) {
          at = categoryTitle(n);
          fresh = true;
        } else {
          // the names just written after „მეზობლები:“ join that category — in their place when the order is on
          const was = by.get(at) || [];
          by.set(at, fresh && autoSort ? insertSorted(was, [n], (a, b) => compareNames(a, b, genders)) : [...was, n]);
        }
      }
    };
    // the categories first, so names written under one of them find its names already there
    for (const x of Array.isArray(sections) ? sections : []) {
      const title = typeof x?.title === 'string' ? x.title.trim() : '';
      if (title) walk(title, list(x?.names));
    }
    walk('', list(plain));
    return by;
  };
  const living = regroup(src.living, raws.living);
  const deceased = regroup(src.deceased, raws.deceased);
  const titles = [...living.keys(), ...deceased.keys()].filter(t => t && !NAME_CATEGORIES.includes(t) && t !== OTHER_CATEGORY);
  const customCategories = [
    ...new Set([...(Array.isArray(src.customCategories) ? src.customCategories : []).filter((x): x is string => typeof x === 'string').map(x => x.trim()), ...titles].filter(Boolean)),
  ];
  const choices = categoryChoices(customCategories);
  const rank = (t: string) => (choices.includes(t) ? choices.indexOf(t) : choices.length - 1);
  // one section per category, in reading order; empty ones dropped
  const sections = (by: Map<string, string[]>): NameSection[] =>
    [...by].filter(([title, names]) => title && names.length).map(([title, names]) => ({ title, names })).sort((a, b) => rank(a.title) - rank(b.title));
  return {
    deceased: deceased.get('') || [],
    living: living.get('') || [],
    group: list(src.group),
    sick: list(src.sick),
    trial: list(src.trial),
    sections: { living: sections(living), deceased: sections(deceased) },
    customCategories,
    groupOrder: Array.isArray(src.groupOrder) ? [...new Set(src.groupOrder.filter((x): x is string => typeof x === 'string'))] : [],
    genders,
    autoSort,
  };
};

/** The group's people in the student's order; newcomers go to the end — or, with the order on, to their place. */
export const inGroupOrder = <T extends { uid: string; name: string; short?: string }>(
  people: T[],
  { groupOrder: order, genders, autoSort }: Pick<Commemoration, 'groupOrder' | 'genders' | 'autoSort'>
) => {
  const placed = order.map(uid => people.find(p => p.uid === uid)).filter((p): p is T => !!p);
  const newcomers = people.filter(p => !order.includes(p.uid));
  if (!autoSort) return [...placed, ...newcomers];
  const cmp = (a: T, b: T) => compareNames(a.name, b.name, genders) || (a.short || '').localeCompare(b.short || '', 'ka');
  return insertSorted(placed, newcomers, cmp);
};

// One copy on this device per account (`commemoration:<uid>`) and one for a visitor without an account, so a
// shared phone never shows one person's names to another. The old copy shared by everyone is dropped: whose
// names it held can't be told (an account's own lists are safe in Firestore).
const keyFor = (uid?: string | null) => `${KEY}:${uid || 'guest'}`;
try {
  localStorage.removeItem(KEY);
} catch {
  /* storage off */
}

const readLocal = (key: string): Commemoration => {
  try {
    return tidy(JSON.parse(localStorage.getItem(key) || 'null'));
  } catch {
    return EMPTY;
  }
};

const writeLocal = (key: string, value: Commemoration) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage off: the lists still live in Firestore for signed-in students */
  }
  window.dispatchEvent(new Event(CHANGED));
};

/** How a list reads in a prayer: „გიორგი, ნინო; ოჯახი: ანა, დათო“ (plain names first, then each category). */
export const namesText = (lists: Commemoration, id: NameListId) =>
  [lists[id].join(', '), ...(isCategoryList(id) ? lists.sections[id].map(s => `${s.title}: ${s.names.join(', ')}`) : [])].filter(Boolean).join('; ');

export const nameCount = (lists: Commemoration, id: NameListId) =>
  lists[id].length + (isCategoryList(id) ? lists.sections[id].reduce((n, s) => n + s.names.length, 0) : 0);

export const useCommemoration = () => {
  const { user, loading } = useAuth();
  // while the account is still being recognised, no one's names show
  const key = loading ? null : keyFor(user?.uid);
  const [lists, setLists] = useState<Commemoration>(() => (key ? readLocal(key) : EMPTY));

  useEffect(() => {
    if (!key) return;
    const sync = () => setLists(readLocal(key));
    sync();
    window.addEventListener(CHANGED, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGED, sync);
      window.removeEventListener('storage', sync);
    };
  }, [key]);

  // the student's saved lists win over this device's copy
  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, 'students', user.uid),
      snap => {
        const saved = snap.data()?.commemoration;
        if (saved) writeLocal(keyFor(user.uid), tidy(saved));
      },
      err => console.warn('commemoration sync note:', err?.message || err)
    );
  }, [user]);

  const save = (next: Commemoration) => {
    const clean = tidy(next);
    writeLocal(keyFor(user?.uid), clean);
    if (user) {
      setDoc(doc(db, 'students', user.uid), { commemoration: clean }, { mergeFields: ['commemoration'] }).catch(err =>
        console.warn('commemoration save note:', err)
      );
    }
  };

  return { lists, save };
};
