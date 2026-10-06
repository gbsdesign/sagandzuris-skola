import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AKATHISTS, KATHISMAS, MORNING_EVENING, PRAYER_HOURS, PSALTER_RULE, prayerTitle } from '../data/prayers';
import { SECTIONS, SectionId } from '../data/sections';
import { findVersion } from '../data/chantLookup';

// "ჩემი ღილაკები": up to eight buttons a member puts under the home vine (students/{uid}.shortcuts, the
// same on every device). Ids:
//   section:<id>   a section (გალობა, ბიბლიოთეკა, …)       prayer:<id>   a prayer, akathist or kathisma
//   chant:<vid>    one chant version's notes page          special:<x>   kathisma | liturgy | commemoration |
//                                                                         calendar | class | teacher
// Never chosen (no field) → the class's starting buttons, if its teacher set them; an empty list stays empty.

export const MAX_SHORTCUTS = 8;

export type ShortcutKind = 'section' | 'prayer' | 'chant' | 'special';
export const kindOf = (id: string) => id.split(':')[0] as ShortcutKind;
export const refOf = (id: string) => id.slice(id.indexOf(':') + 1);

export const SPECIALS: Record<string, string> = {
  kathisma: 'ჩემი კანონი',
  liturgy: 'დღევანდელი წირვა',
  commemoration: 'მოსახსენებელი',
  calendar: 'კალენდარი',
  class: 'ჩემი კლასი',
  teacher: 'მასწავლებლის პანელი',
};

/** A short label for a button (and a second line). */
export const shortcutLabel = (id: string): { label: string; sub?: string } | null => {
  const ref = refOf(id);
  switch (kindOf(id)) {
    case 'section': {
      const s = SECTIONS.find(x => x.id === ref);
      return s ? { label: s.label } : null;
    }
    case 'special':
      return SPECIALS[ref] ? { label: SPECIALS[ref] } : null;
    case 'prayer': {
      const t = prayerTitle(ref);
      if (t === 'ლოცვა') return null;
      const k = KATHISMAS.find(x => x.id === ref);
      if (k) return { label: `კანონი ${k.n}`, sub: `ფს. ${k.psalms}` };
      const ak = AKATHISTS.find(x => x.id === ref);
      if (ak) return { label: ak.title, sub: 'დაუჯდომელი' };
      const h = PRAYER_HOURS.find(x => x.id === ref);
      if (h) return { label: `${String(h.hour).padStart(2, '0')}:00 ლოცვა`, sub: 'შვიდგზის' };
      return { label: t };
    }
    case 'chant': {
      const v = findVersion(ref);
      return v ? { label: v.chant.title.replace(/[;\s]+$/, ''), sub: v.variant.code } : null;
    }
  }
  return null;
};

/** Everything that can be put on the home page, grouped as the "+" sheet shows it. */
export const SHORTCUT_GROUPS: { title: string; ids: string[] }[] = [
  {
    title: 'ლოცვანი',
    ids: [
      ...MORNING_EVENING.map(p => `prayer:${p.id}`),
      ...PRAYER_HOURS.map(h => `prayer:${h.id}`),
      'special:commemoration',
      ...AKATHISTS.slice(0, 6).map(a => `prayer:${a.id}`),
    ],
  },
  {
    title: 'ფსალმუნი',
    ids: ['special:kathisma', 'section:medavitneoba', `prayer:${PSALTER_RULE.id}`, ...KATHISMAS.map(k => `prayer:${k.id}`)],
  },
  { title: 'გალობა', ids: ['section:galoba', 'special:liturgy'] },
  { title: 'სწავლა', ids: ['section:gza', 'section:chvevebi', 'special:class', 'section:simghera', 'section:mtkmeli', 'section:sakravebi', 'section:tsinaprebi'] },
  { title: 'ბიბლიოთეკა', ids: ['section:biblioteka', 'special:calendar'] },
];

export const sectionOfShortcut = (id: string): SectionId | null => {
  if (kindOf(id) === 'section') return refOf(id) as SectionId;
  if (id === 'special:kathisma') return 'medavitneoba';
  if (id === 'special:liturgy' || kindOf(id) === 'chant') return 'galoba';
  if (id === 'special:calendar') return 'biblioteka';
  return null;
};

/** My saved buttons (live): `null` while I never chose any. */
export const useMyShortcuts = (uid?: string | null) => {
  const [list, setList] = useState<string[] | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!uid) { setList(null); setLoaded(true); return; }
    setLoaded(false);
    return onSnapshot(
      doc(db, 'students', uid),
      snap => {
        const v = snap.data()?.shortcuts;
        setList(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!shortcutLabel(x)) : null);
        setLoaded(true);
      },
      () => setLoaded(true)
    );
  }, [uid]);
  return { list, loaded };
};

export const saveShortcuts = (uid: string, list: string[]) =>
  setDoc(doc(db, 'students', uid), { shortcuts: list.slice(0, MAX_SHORTCUTS) }, { mergeFields: ['shortcuts'] });
