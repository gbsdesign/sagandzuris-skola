import { SERVICE_LISTS } from '../../../data/chantLookup';
import { OTHER_CHANTS } from '../../../utils/pathChests';

// „საგანძური“'s chips by service (the old chests' grouping, utils/pathChests) — shared by the path page and the chat's fold.

export const CHIP_ORDER = [...SERVICE_LISTS.map(([s]) => `s:${s}`), 'other', 'songs', 'poems', 'videos', 'books', 'abituri'];

const EXTRA_LABEL: Record<string, string> = { videos: 'ვიდეოთეკა', books: 'წიგნები', abituri: 'აბიტური' };

export const chipLabel = (id: string) =>
  id.startsWith('s:') ? id.slice(2) : id === 'other' ? OTHER_CHANTS : id === 'songs' ? 'სიმღერები' : id === 'poems' ? 'მთქმელი' : EXTRA_LABEL[id] ?? id;

/** the chips a list of items gives: „ყველა“, then each group it holds with its count, in the catalogue's order */
export const chipsOf = (ids: string[]) => {
  const n = new Map<string, number>();
  for (const id of ids) n.set(id, (n.get(id) ?? 0) + 1);
  return [
    { id: 'all', label: 'ყველა' },
    ...CHIP_ORDER.filter(id => n.has(id)).map(id => ({ id, label: `${chipLabel(id)} · ${n.get(id)}` })),
  ];
};
