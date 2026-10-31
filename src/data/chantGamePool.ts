import { CHESTS } from './pearls';
import { findVersion } from './chantLookup';
import { chantName } from '../utils/pearls';
import { nameKey, type KnownChant } from '../utils/chantRounds';

// The chants of „ხმა-ხმად“ and „სამ ნოტში!“ (the user's answer, 2026-10-31: only well-known ones): the pearls' sixty —
// the Liturgy's of vol. IX, vespers and matins of vol. I (data/pearls.ts) — and the class's program, each a version with
// book notes (the synthesizer plays them, so no recording has to be opened for the member). Of the pearls, the short
// answers, the litanies and a tone's own pieces (a sticheron, a troparion, the dogmatikon) are left out: a round needs a
// melody one can tell by its name. A class's program keeps everything its teacher put in.

const PLAIN = new Set(['ამინ', 'უფალო შეგუწყალენ', 'და სულისაცა', 'შენ, უფალო', 'ალილუია', 'დასდებელი აღდგომისაჲ', 'ტროპარი აღდგომისაჲ', 'დოგმატიკი'].map(nameKey));
const nameable = (title: string) => { const k = nameKey(title); return !PLAIN.has(k) && !k.includes('კუერექსი'); };

export const knownChants = (program: readonly string[] = []): KnownChant[] => {
  const out: KnownChant[] = [];
  const seen = new Set<string>();
  const add = (id: string, all: boolean) => {
    if (seen.has(id)) return;
    seen.add(id);
    const info = findVersion(id);
    const num = info?.variant.bookNums?.[0];
    if (!info || !num) return;
    const title = chantName(info.chant.title);
    if (all || nameable(title)) out.push({ id, title, service: info.service, book: info.variant.book || 'book', num });
  };
  program.forEach(id => add(id, true));
  CHESTS.forEach(c => c.pearls.forEach(id => add(id, false)));
  return out;
};
