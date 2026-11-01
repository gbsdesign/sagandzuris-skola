import { OTKHEULI_GROUPS } from './otkheuliGroups';
import { CHAMO_LISTS } from './chamotvaleLists';
import type { BadeTheme } from '../utils/bade';

// The themes of „ასოების ბადე“ (games hub, 2026-11-01): the groups of „ოთხეული“ — the wider Georgian world and the app's own
// (animals, birds, trees, rivers, castles, heroes, dishes, dances, instruments, saints, feasts…) — and a few closed lists of
// „ჩამოთვალე!“. Only one-word names hide in a grid (utils/bade.ts `usableWords`); the songs' and chants' titles stay out —
// they are mostly several words. A theme too small for a grid is left out by the game itself.

const FROM_LISTS: Record<string, string> = {
  planetebi: 'პლანეტები', tveebi: 'წლის თვეები', tsisartqela: 'ცისარტყელას ფერები', 'shavi-zghva': 'შავი ზღვის ქვეყნები', intervalebi: 'ინტერვალები',
};

export const BADE_THEMES: BadeTheme[] = [
  ...OTKHEULI_GROUPS.filter(g => g.family !== 'songs' && g.family !== 'chants').map(g => ({ id: g.id, title: g.label, words: g.words })),
  ...CHAMO_LISTS.filter(l => FROM_LISTS[l.id]).map(l => ({ id: `ch-${l.id}`, title: FROM_LISTS[l.id], words: l.items.map(i => i.name) })),
];

export const badeThemeById = (id: string) => BADE_THEMES.find(t => t.id === id);
