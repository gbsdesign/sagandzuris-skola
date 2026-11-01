import { CHESTS } from '../../../data/pearls';
import { findVersion } from '../../../data/chantLookup';
import { chantName } from '../../../utils/pearls';
import type { KnownChant } from '../../../utils/chantRounds';

// The chants „მესამე ხმა“ sings: the class's program first (what the class is learning), then the pearls' sixty — the
// Liturgy's of vol. IX, vespers and matins of vol. I — each a version with book notes, short answers too (a trio of
// „ამინ“ is a good first try). Grouped for the picker.

export interface TrioChant extends KnownChant { group: string }

export const PROGRAM_GROUP = 'კლასის პროგრამა';

export const trioChants = (program: readonly string[] = []): TrioChant[] => {
  const out: TrioChant[] = [];
  const seen = new Set<string>();
  const add = (id: string, group: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const info = findVersion(id);
    const num = info?.variant.bookNums?.[0];
    if (!info || !num) return;
    out.push({ id, title: chantName(info.chant.title), service: info.service, book: info.variant.book || 'book', num, group });
  };
  program.forEach(id => add(id, PROGRAM_GROUP));
  CHESTS.forEach(c => c.pearls.forEach(id => add(id, c.label)));
  return out;
};
