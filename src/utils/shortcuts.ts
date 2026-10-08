import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AKATHISTS, KATHISMAS, MORNING_EVENING, PRAYER_HOURS, PSALTER_RULE, prayerTitle, weekPrayerId } from '../data/prayers';
import { HABIT_ITEMS } from '../data/habitsAndManera';
import { SECTIONS, SectionId } from '../data/sections';
import { findVersion } from '../data/chantLookup';
import { dayKey } from './habitsWeek';

// "ჩემი ღილაკები": up to eight buttons a member puts under the home vine (students/{uid}.shortcuts, the
// same on every device). Ids:
//   section:<id>   a section (გალობა, ბიბლიოთეკა, …)       prayer:<id>   a prayer, akathist or kathisma
//   chant:<vid>    one chant version's notes page          special:<x>   kathisma | liturgy | commemoration |
//                                                                         calendar | class | teacher
//   habit:<id>     a habit (tap ticks today, or opens its books)   service:<name>  a service's chant list
//   library:<tab>  a library tab      page:<x>  abituri | messages
//   teacher:<tab>  a teacher-panel tab (teachers only)     admin:<tab>  an admin-panel tab (admins; requests: superadmins)
// Never chosen (no field) → the class's starting buttons, if its teacher set them; an empty list stays empty.

export const MAX_SHORTCUTS = 8;

export type ShortcutKind = 'section' | 'prayer' | 'chant' | 'special' | 'habit' | 'service' | 'library' | 'page' | 'teacher' | 'admin';
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

// habits that have no prayer button of their own (morning/evening, hours, psalms and akathists do)
export const HABIT_SHORT: Record<string, string> = {
  habit_2: 'სახარება', habit_3: 'სამოციქულო', habit_5: 'იესოს ლოცვა', habit_4: 'სულიერი ლიტერატურა', habit_14: 'ჩანაწერების წიგნაკი',
  habit_11: 'წირვაზე დასწრება', habit_12: 'ლოცვაზე დასწრება', habit_8: 'სამადლობელი პარაკლისი', habit_9: 'აღსარება', habit_10: 'ზიარება',
};
export const SERVICES = ['წირვა', 'მწუხრი', 'ცისკარი', 'სადღესასწაულო', 'მარხვანი', 'ზატიკი', 'მომიხსენენი', 'ძლისპირები', 'კატაბასიები', 'დასადებლები'] as const;
export const LIBRARY_SHORT: Record<string, string> = { book: 'საღმრთო ისტორია', feasts: 'დღესასწაულები', lives: 'წმიდანთა ცხოვრება' };
export const PAGES: Record<string, string> = { abituri: 'აბიტურიენტს', messages: 'მიმოწერა' };
export const TEACHER_TABS: Record<string, string> = {
  students: 'მოსწავლეები', assignments: 'დავალებები', attendance: 'დასწრება', schedule: 'ცხრილი', class: 'კლასის მართვა', groups: 'ფსალმუნის ჯგუფები',
};
export const ADMIN_TABS: Record<string, string> = {
  users: 'მომხმარებლები', classes: 'კლასები', recordings: 'ჩანაწერები', sections: 'განყოფილებები', stats: 'სტატისტიკა', school: 'სკოლა',
  requests: 'წევრების მიღება',
};

/** Who may have a button: teacher / admin / superadmin buttons show only to them. */
export type ShortcutRole = 'teacher' | 'admin' | 'superadmin';
export const roleOfShortcut = (id: string): ShortcutRole | null => {
  if (id === 'special:teacher' || kindOf(id) === 'teacher') return 'teacher';
  if (id === 'admin:requests') return 'superadmin';
  if (kindOf(id) === 'admin') return 'admin';
  return null;
};
export const roleAllows = (id: string, who: { isTeacher: boolean; isAdmin: boolean; isSuperAdmin: boolean }) => {
  const r = roleOfShortcut(id);
  return !r || (r === 'teacher' ? who.isTeacher : r === 'admin' ? who.isAdmin : who.isSuperAdmin);
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
    case 'habit': return HABIT_SHORT[ref] ? { label: HABIT_SHORT[ref], sub: 'ჩვევა' } : null;
    case 'service': return (SERVICES as readonly string[]).includes(ref) ? { label: ref, sub: 'საგალობლები' } : null;
    case 'library': return LIBRARY_SHORT[ref] ? { label: LIBRARY_SHORT[ref], sub: 'ბიბლიოთეკა' } : null;
    case 'page': return PAGES[ref] ? { label: PAGES[ref] } : null;
    case 'teacher': return TEACHER_TABS[ref] ? { label: TEACHER_TABS[ref], sub: 'მასწავლებელი' } : null;
    case 'admin': return ADMIN_TABS[ref] ? { label: ADMIN_TABS[ref], sub: ref === 'requests' ? 'სუპერადმინი' : 'ადმინი' } : null;
  }
  return null;
};

/** Everything that can be put on the home page, grouped as the "+" sheet shows it; `role` groups show only to that role. */
export const SHORTCUT_GROUPS: { title: string; ids: string[]; role?: ShortcutRole }[] = [
  {
    title: 'ლოცვანი',
    ids: [...MORNING_EVENING.map(p => `prayer:${p.id}`), ...PRAYER_HOURS.map(h => `prayer:${h.id}`), 'special:commemoration'],
  },
  { title: 'კვირის დღეების ლოცვები', ids: [0, 1, 2, 3, 4, 5, 6].flatMap(d => [`prayer:${weekPrayerId(d, 'dila')}`, `prayer:${weekPrayerId(d, 'dzili')}`]) },
  { title: 'დაუჯდომლები', ids: AKATHISTS.map(a => `prayer:${a.id}`) },
  { title: 'ჩვევები', ids: ['section:chvevebi', ...HABIT_ITEMS.filter(h => HABIT_SHORT[h.id]).map(h => `habit:${h.id}`)] },
  {
    title: 'ფსალმუნი',
    ids: ['special:kathisma', 'section:medavitneoba', `prayer:${PSALTER_RULE.id}`, ...KATHISMAS.map(k => `prayer:${k.id}`)],
  },
  { title: 'გალობა', ids: ['section:galoba', 'special:liturgy', ...SERVICES.map(x => `service:${x}`), 'page:abituri'] },
  { title: 'სწავლა', ids: ['section:gza', 'special:class', 'page:messages', 'section:simghera', 'section:mtkmeli', 'section:sakravebi', 'section:tsinaprebi'] },
  { title: 'ბიბლიოთეკა', ids: ['section:biblioteka', ...Object.keys(LIBRARY_SHORT).map(t => `library:${t}`), 'special:calendar'] },
  { title: 'მასწავლებელი', role: 'teacher', ids: ['special:teacher', ...Object.keys(TEACHER_TABS).map(t => `teacher:${t}`)] },
  { title: 'ადმინი', role: 'admin', ids: Object.keys(ADMIN_TABS).filter(t => t !== 'requests').map(t => `admin:${t}`) },
  { title: 'სუპერადმინი', role: 'superadmin', ids: ['admin:requests'] },
];

/** The habit a button's "✓ წავიკითხე" also ticks; `null` → the button has nothing to mark. */
export const habitOfShortcut = (id: string): string | null => {
  const ref = refOf(id);
  if (id === 'special:kathisma') return 'habit_6';
  if (kindOf(id) === 'habit') return HABIT_SHORT[ref] ? ref : null;
  if (kindOf(id) !== 'prayer') return null;
  if (MORNING_EVENING.some(p => p.id === ref)) return 'habit_1';
  if (PRAYER_HOURS.some(h => h.id === ref)) return 'habit_13';
  if (AKATHISTS.some(a => a.id === ref)) return 'habit_7';
  if (KATHISMAS.some(k => k.id === ref)) return 'habit_6';
  return null;
};

export const sectionOfShortcut = (id: string): SectionId | null => {
  if (kindOf(id) === 'section') return refOf(id) as SectionId;
  if (id === 'special:kathisma') return 'medavitneoba';
  if (id === 'special:liturgy' || id === 'page:abituri' || kindOf(id) === 'chant' || kindOf(id) === 'service') return 'galoba';
  if (id === 'special:calendar' || kindOf(id) === 'library') return 'biblioteka';
  if (kindOf(id) === 'habit') return 'chvevebi';
  return null;
};

/** Buttons marked today: students/{uid}.shortcutsDone = { day, ids } — another day's marks count as none. */
type ShortcutsDone = { day: string; ids: string[] };

/** My saved buttons (live): `null` while I never chose any; `done` = the ones I marked today. */
export const useMyShortcuts = (uid?: string | null) => {
  const [list, setList] = useState<string[] | null>(null);
  const [marks, setMarks] = useState<ShortcutsDone | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!uid) { setList(null); setMarks(null); setLoaded(true); return; }
    setLoaded(false);
    return onSnapshot(
      doc(db, 'students', uid),
      snap => {
        const v = snap.data()?.shortcuts;
        setList(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!shortcutLabel(x)) : null);
        const d = snap.data()?.shortcutsDone;
        setMarks(d && typeof d.day === 'string' && Array.isArray(d.ids) ? d : null);
        setLoaded(true);
      },
      () => setLoaded(true)
    );
  }, [uid]);
  const done = marks?.day === dayKey(new Date()) ? marks.ids : [];
  return { list, loaded, done };
};

export const saveShortcuts = (uid: string, list: string[]) =>
  setDoc(doc(db, 'students', uid), { shortcuts: list.slice(0, MAX_SHORTCUTS) }, { mergeFields: ['shortcuts'] });

/** Marks a button read for today (or takes the mark back); `done` is today's list as it is now. */
export const markShortcutDone = (uid: string, done: string[], id: string, on: boolean) =>
  setDoc(
    doc(db, 'students', uid),
    { shortcutsDone: { day: dayKey(new Date()), ids: on ? [...done.filter(x => x !== id), id] : done.filter(x => x !== id) } },
    { mergeFields: ['shortcutsDone'] }
  );
