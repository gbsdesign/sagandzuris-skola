import { HABIT_GROUPS, HABIT_ITEMS, HabitGroupType, HabitItemType, HabitMenu } from '../data/habitsAndManera';
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
