import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AKATHISTS, KATHISMAS, MORNING_EVENING, PRAYER_HOURS, prayerTitle } from '../data/prayers';
import { HABIT_ITEMS } from '../data/habitsAndManera';
import { SECTIONS, SectionId } from '../data/sections';
import { findVersion } from '../data/chantLookup';
import { dayKey } from './habitsWeek';

// "ჩემი ღილაკები": up to thirty buttons a member puts under the home vine (students/{uid}.shortcuts, the
// same on every device). Ids:
//   section:<id>   a section (გალობა, ბიბლიოთეკა, …)       prayer:<id>   a prayer, akathist or kathisma
//   chant:<vid>    one chant version's notes page          special:<x>   kathisma | liturgy | commemoration |
//                                                                         calendar | class | teacher
//   habit:<id>     a habit (tap ticks today, or opens its books)   service:<name>  a service's chant list
//   library:<tab>  a library tab      page:<x>  abituri | messages
//   teacher:<tab>  a teacher-panel tab (teachers only)     admin:<tab>  an admin-panel tab (admins; requests: superadmins)
//   chantof:<service>/<chantId>  one chant in its service's list      song:<id>  ancestor:<id>  a folk song, a great chanter
//   feast:<group>:<n>  a feast (its next day in the calendar)       life:<id>  a saint's life
//   library:<tab>:<part>  a chapter of a book ("book:12", "sasuliero:ati:3", "lives:m9")
// The kinds whose names live in big lazy data (and a member's own habits) carry their name in the id:
// "song:abc|ალილო|გურია" — see `labelled`.
// Never chosen (no field) → the class's starting buttons, if its teacher set them; an empty list stays empty.

export const MAX_SHORTCUTS = 30;

export type ShortcutKind =
  | 'section' | 'prayer' | 'chant' | 'special' | 'habit' | 'service' | 'library' | 'page' | 'teacher' | 'admin'
  | 'chantof' | 'song' | 'ancestor' | 'feast' | 'life';
/** the id without the name it carries */
export const coreOf = (id: string) => id.split('|')[0];
export const kindOf = (id: string) => coreOf(id).split(':')[0] as ShortcutKind;
export const refOf = (id: string) => {
  const core = coreOf(id);
  return core.slice(core.indexOf(':') + 1);
};
const clean = (t: string) => t.replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
/** An id that carries its button's name (and the small line under it). */
export const labelled = (core: string, label: string, sub?: string) => [core, clean(label), ...(sub ? [clean(sub)] : [])].join('|');
const carried = (id: string): { label: string; sub?: string } | null => {
  const [, label, sub] = id.split('|');
  return label ? { label, ...(sub ? { sub } : {}) } : null;
};

export const SPECIALS: Record<string, string> = {
  kathisma: 'ჩემი კანონი',
  liturgy: 'დღევანდელი წირვა',
  commemoration: 'მოსახსენებელი',
  calendar: 'კალენდარი',
  class: 'ჩემი კლასი',
  teacher: 'მასწავლებლის პანელი',
};

export const SERVICES = ['წირვა', 'მწუხრი', 'ცისკარი', 'სადღესასწაულო', 'მარხვანი', 'ზატიკი', 'მომიხსენენი', 'ძლისპირები', 'კატაბასიები', 'დასადებლები'] as const;
export const LIBRARY_SHORT: Record<string, string> = {
  book: 'საღმრთო ისტორია', feasts: 'დღესასწაულები', lives: 'წმიდანთა ცხოვრება', prayers: 'ლოცვანი', sasuliero: 'სასულიერო წიგნები',
};
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
    case 'habit': {
      // a school habit by its name; a member's own one carries it
      const h = HABIT_ITEMS.find(x => x.id === ref);
      return h ? { label: h.label, sub: 'ჩვევა' } : carried(id);
    }
    case 'service': return (SERVICES as readonly string[]).includes(ref) ? { label: ref, sub: 'საგალობლები' } : null;
    case 'library':
      if (ref.includes(':')) return LIBRARY_SHORT[ref.split(':')[0]] ? carried(id) : null;
      return LIBRARY_SHORT[ref] ? { label: LIBRARY_SHORT[ref], sub: 'ბიბლიოთეკა' } : null;
    case 'chantof': case 'song': case 'ancestor': case 'feast': case 'life':
      return carried(id);
    case 'page': return PAGES[ref] ? { label: PAGES[ref] } : null;
    case 'teacher': return TEACHER_TABS[ref] ? { label: TEACHER_TABS[ref], sub: 'მასწავლებელი' } : null;
    case 'admin': return ADMIN_TABS[ref] ? { label: ADMIN_TABS[ref], sub: ref === 'requests' ? 'სუპერადმინი' : 'ადმინი' } : null;
  }
  return null;
};

/** The habit a button's "✓ წავიკითხე" also ticks; `null` → the button has nothing to mark. */
export const habitOfShortcut = (id: string): string | null => {
  const ref = refOf(id);
  if (id === 'special:kathisma') return 'habit_6';
  if (kindOf(id) === 'habit') return ref;
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
  const kind = kindOf(id);
  if (id === 'special:liturgy' || id === 'page:abituri' || kind === 'chant' || kind === 'chantof' || kind === 'service') return 'galoba';
  if (id === 'special:calendar' || kind === 'library' || kind === 'life') return 'biblioteka';
  if (kind === 'habit') return 'chvevebi';
  if (kind === 'song') return 'simghera';
  if (kind === 'ancestor') return 'tsinaprebi';
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
