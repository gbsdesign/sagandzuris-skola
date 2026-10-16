import { HABIT_GROUPS, HABIT_ITEMS, HabitGroupType, HabitItemType, HabitMenu } from '../data/habitsAndManera';
import {
  HABIT_ICON_IDS,
  HABIT_TONES,
  HabitCounter,
  HabitIconId,
  HabitLook,
  HabitToneId,
  MAX_COUNTER_GOAL,
  SCHOOL_COUNTERS,
  SCHOOL_LOOKS,
  TONE_IDS,
} from '../data/habitLooks';
import type { SearchGroupId, SearchOpen } from '../data/searchIndex';

// "ჩემი ჩვევები": each member arranges the habits for themselves — the order inside a group, habits
// taken away or added, and which prayers a habit's book button opens. Kept in students/{uid}.habitSetup;
// with nothing saved the list is the school's (HABIT_GROUPS). Ticks stay keyed by habit id, so a habit
// taken away and brought back keeps its days.

export interface HabitSetup {
  /** each group's habit ids in the member's order; a group not here keeps the school's order */
  order?: Record<string, string[]>;
  /** the school's habits taken away */
  removed?: string[];
  /** the member's own habits */
  custom?: Record<string, { label: string; group: string }>;
  /** a habit's book button: a menu, or 'none' for no button */
  menus?: Record<string, HabitMenu | 'none'>;
  /** what else a habit opens: things found by the search, or other sites */
  links?: Record<string, HabitLink[]>;
  /** the member's own words about a habit, shown under ⓘ */
  notes?: Record<string, string>;
  /** a habit's colour and icon (data/habitLooks); what is not chosen stays the school's */
  looks?: Record<string, Partial<HabitLook>>;
  /** a habit counted in numbers, or 'none' to switch the school's counter off */
  counters?: Record<string, HabitCounter | 'none'>;
}

/** Something tied to a habit: an item of the one search (kept whole, so it opens without the index), or a site. */
export type HabitLink =
  | { kind: 'find'; title: string; sub?: string; group: SearchGroupId; icon?: string; section?: string | null; open: SearchOpen }
  | { kind: 'url'; title: string; url: string };

export interface MyHabit extends HabitItemType {
  links?: HabitLink[];
  note?: string;
}
export type MyHabitGroup = Omit<HabitGroupType, 'items'> & { items: MyHabit[] };

export const MAX_LINKS = 6;
export const MAX_NOTE = 500;

export const MENU_LABELS: Record<HabitMenu, string> = {
  'morning-evening': 'დილის და საღამოს ლოცვები',
  morning: 'დილის ლოცვები',
  evening: 'საღამოს ლოცვები',
  hours: 'შვიდგზის ლოცვა',
  gospel: 'სახარება',
  apostle: 'სამოციქულო',
  psalms: 'ფსალმუნები',
  jesus: 'იესოს ლოცვა',
  akathists: 'დაუჯდომლები',
  book: 'მთელი ლოცვანი',
};
export const MENUS = Object.keys(MENU_LABELS) as HabitMenu[];

const isMenu = (m: unknown): m is HabitMenu => typeof m === 'string' && m in MENU_LABELS;

/** The groups as this member sees them. */
export const resolveHabits = (setup: HabitSetup | null | undefined): MyHabitGroup[] => {
  const removed = new Set(setup?.removed || []);
  const custom = setup?.custom || {};
  const menus = setup?.menus || {};
  const known = new Map<string, HabitItemType>(HABIT_ITEMS.map(h => [h.id, h]));
  for (const [id, c] of Object.entries(custom)) if (c?.label) known.set(id, { id, label: c.label });
  const withMenu = (h: HabitItemType): MyHabit => {
    const m = menus[h.id];
    const links = setup?.links?.[h.id]?.filter(l => l?.title);
    const note = setup?.notes?.[h.id]?.trim();
    const own: MyHabit = { ...h, ...(links?.length ? { links } : {}), ...(note ? { note } : {}) };
    if (m === 'none') return { ...own, menu: undefined };
    return isMenu(m) ? { ...own, menu: m } : own;
  };
  return HABIT_GROUPS.map(g => {
    const mine = Object.entries(custom).filter(([, c]) => c?.group === g.id && c.label).map(([id]) => id);
    const natural = [...g.items.map(h => h.id), ...mine];
    const saved = (setup?.order?.[g.id] || []).filter(id => natural.includes(id));
    // what the saved order doesn't know yet (a habit added since) goes at the end
    const ids = [...saved, ...natural.filter(id => !saved.includes(id))].filter(id => !removed.has(id));
    return { ...g, items: ids.map(id => withMenu(known.get(id)!)) };
  });
};

export const reorderGroup = (setup: HabitSetup, groupId: string, ids: string[]): HabitSetup => ({
  ...setup,
  order: { ...setup.order, [groupId]: ids },
});

export const removeHabit = (setup: HabitSetup, id: string): HabitSetup => {
  if (setup.custom?.[id]) {
    const { [id]: _gone, ...custom } = setup.custom;
    return { ...setup, custom };
  }
  return { ...setup, removed: [...(setup.removed || []).filter(x => x !== id), id] };
};

export const addHabit = (setup: HabitSetup, label: string, group: string, menu: HabitMenu | 'none', id = `my_${Date.now().toString(36)}`): HabitSetup => ({
  ...setup,
  custom: { ...setup.custom, [id]: { label: label.trim(), group } },
  menus: { ...setup.menus, [id]: menu },
});

/** The school's habits taken away, to bring back one by one. */
export const removedHabits = (setup: HabitSetup | null | undefined): HabitItemType[] =>
  HABIT_ITEMS.filter(h => setup?.removed?.includes(h.id));

export const restoreHabit = (setup: HabitSetup, id: string): HabitSetup => ({
  ...setup,
  removed: (setup.removed || []).filter(x => x !== id),
});

export const setHabitMenu = (setup: HabitSetup, id: string, menu: HabitMenu | 'none'): HabitSetup => ({
  ...setup,
  menus: { ...setup.menus, [id]: menu },
});

export const setHabitLinks = (setup: HabitSetup, id: string, links: HabitLink[]): HabitSetup => ({
  ...setup,
  links: { ...setup.links, [id]: links.slice(0, MAX_LINKS) },
});

export const setHabitNote = (setup: HabitSetup, id: string, note: string): HabitSetup => ({
  ...setup,
  notes: { ...setup.notes, [id]: note.trim().slice(0, MAX_NOTE) },
});

const isTone = (t: unknown): t is HabitToneId => typeof t === 'string' && t in HABIT_TONES;
const isIcon = (i: unknown): i is HabitIconId => typeof i === 'string' && (HABIT_ICON_IDS as readonly string[]).includes(i);

// a member's own habit keeps one tone wherever it stands in the list
const toneById = (id: string): HabitToneId => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONE_IDS[h % TONE_IDS.length];
};

/** Each habit's colour and icon: the member's choice, else the school's, else a tone by its id and ✦. */
export const resolveLooks = (setup: HabitSetup | null | undefined, groups: MyHabitGroup[]): Record<string, HabitLook> => {
  const looks: Record<string, HabitLook> = {};
  for (const h of groups.flatMap(g => g.items)) {
    const own = setup?.looks?.[h.id];
    const base = SCHOOL_LOOKS[h.id] ?? { tone: toneById(h.id), icon: 'sparkle' };
    looks[h.id] = { tone: isTone(own?.tone) ? own.tone : base.tone, icon: isIcon(own?.icon) ? own.icon : base.icon };
  }
  return looks;
};

const isCounter = (c: unknown): c is HabitCounter =>
  !!c && typeof c === 'object' && Number.isFinite((c as HabitCounter).goal) && (c as HabitCounter).goal >= 1 && typeof (c as HabitCounter).unit === 'string';

/** The habits counted in numbers: the member's own counters and the school's they kept. */
export const resolveCounters = (setup: HabitSetup | null | undefined, groups: MyHabitGroup[]): Record<string, HabitCounter> => {
  const counters: Record<string, HabitCounter> = {};
  for (const h of groups.flatMap(g => g.items)) {
    const own = setup?.counters?.[h.id];
    if (own === 'none') continue;
    const c = isCounter(own) ? own : SCHOOL_COUNTERS[h.id];
    if (c) counters[h.id] = { goal: Math.min(MAX_COUNTER_GOAL, Math.round(c.goal)), unit: c.unit };
  }
  return counters;
};

export const setHabitLook = (setup: HabitSetup, id: string, look: Partial<HabitLook>): HabitSetup => ({
  ...setup,
  looks: { ...setup.looks, [id]: { ...setup.looks?.[id], ...look } },
});

export const setHabitCounter = (setup: HabitSetup, id: string, counter: HabitCounter | 'none'): HabitSetup => ({
  ...setup,
  counters: {
    ...setup.counters,
    [id]: counter === 'none' ? 'none' : { goal: Math.max(1, Math.min(MAX_COUNTER_GOAL, Math.round(counter.goal) || 1)), unit: counter.unit.trim().slice(0, 20) },
  },
});

/** A typed address as a safe link ("galoba.ge" → https://galoba.ge/); null for anything not http(s). */
export const normalizeUrl = (typed: string): string | null => {
  const t = typed.trim();
  if (!t || /\s/.test(t)) return null;
  try {
    const u = new URL(/^[a-z][a-z\d+.-]*:/i.test(t) ? t : `https://${t}`);
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.') ? u.href : null;
  } catch {
    return null;
  }
};

/** A site's short name for its button: "www.galoba.edu.ge" → "galoba.edu.ge". */
export const siteName = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};
