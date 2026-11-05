import { SAMOSI_PARTS } from '../data/samosiData';
import { KABA_PARTS } from '../data/kabaData';
import { CHEST_COUNT } from './pathPearls';
import { nameGender } from '../data/georgianNames';

// „ჯილდო სამოსისთვის“: since 2026-11-05 (the user: „3 სკივრის გახსნაზე თითო ჩოხის ნაწილს იძლეოდეს“, answer „მხოლოდ
// სკივრები“) every chest of „ნასწავლი“ that opens (utils/pathPearls.ts, ten polished pearls each, three in all) gives the
// member's outfit in „ჩემი სამოსი“ its next part — the old „every five shining pearls“ rule is gone. The member's own app adds
// the part (hooks/usePearlGifts.ts), the path page shows it once (components/pearls/PearlGift.tsx) and the chest keeps it on
// show (components/pearls/LearnChests.tsx). Kept in students/{uid}.pearlGifts = { chestParts, parts, seen }:
//   chestParts  the part each chest gave, in the chests' order ('' when the outfit was already complete); its length is
//               how many chests were rewarded — a chest that closes again (pearls taken back) is not rewarded twice
//   parts       every part given, in order (also the older „steps“ rule's, whose `steps` field is no longer read)
//   seen        how many of `parts` the member has seen
// Pure helpers, tested in tests/pearlGifts.test.ts.

export type Outfit = 'chokha' | 'kaba';
export interface PearlGifts { chestParts: string[]; parts: string[]; seen: number }

const EXTRA_HATS = new Set(SAMOSI_PARTS.filter(p => p.extraHat).map(p => p.id));

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** The record as Firestore holds it, made safe. */
export const readGifts = (v: unknown): PearlGifts => {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const parts = strings(o.parts);
  const chestParts = strings(o.chestParts).slice(0, CHEST_COUNT);
  const seen = typeof o.seen === 'number' && o.seen > 0 ? Math.min(Math.floor(o.seen), parts.length) : 0;
  return { chestParts, parts, seen };
};

/** The outfit „ჩემი სამოსი“ shows, decided as ChemiSamosi does: the member's choice once the kaba is out, else the
 *  kaba for a girl's name. */
export const outfitOf = (choice: unknown, firstName: string, kabaOn: boolean): Outfit =>
  !kabaOn ? 'chokha' : choice === 'chokha' || choice === 'kaba' ? choice : nameGender(firstName) === 'f' ? 'kaba' : 'chokha';

/** The outfit's parts still to collect, in its order. The chokha's extra hats count as one part: the first of them is
 *  offered while none is owned. */
export const partsLeft = (outfit: Outfit, owned: string[]): string[] => {
  const have = new Set(owned);
  if (outfit === 'kaba') return KABA_PARTS.map(p => p.id).filter(id => !have.has(id));
  const hatOwned = owned.some(id => EXTRA_HATS.has(id));
  let hatOffered = false;
  const out: string[] = [];
  for (const p of SAMOSI_PARTS) {
    if (have.has(p.id)) continue;
    if (EXTRA_HATS.has(p.id)) {
      if (hatOwned || hatOffered) continue;
      hatOffered = true;
    }
    out.push(p.id);
  }
  return out;
};

/** What the open chests owe now: the record's new `chestParts` and the parts to add, one for each newly opened chest
 *  while parts are left; null when nothing is owed. */
export const giftDue = (opened: number, gifts: PearlGifts, outfit: Outfit, owned: string[]): { chestParts: string[]; parts: string[] } | null => {
  const done = gifts.chestParts.length;
  const n = Math.min(opened, CHEST_COUNT) - done;
  if (n <= 0) return null;
  const parts = partsLeft(outfit, owned).slice(0, n);
  return { chestParts: [...gifts.chestParts, ...Array.from({ length: n }, (_, k) => parts[k] ?? '')], parts };
};

/** The part chest `index` holds: the one it gave, else the one it will give (`left` = partsLeft, before the chests still
 *  owed are rewarded); null when it has none. */
export const partInChest = (index: number, chestParts: string[], left: string[]): string | null =>
  index < chestParts.length ? chestParts[index] || null : left[index - chestParts.length] ?? null;

/** The chest the next part waits in: the first that has neither opened nor been rewarded; null once all three have. */
export const nextChest = (opened: number, rewarded: number): number | null => {
  const i = Math.max(opened, rewarded);
  return i < CHEST_COUNT ? i : null;
};

/** A given part's name (a chokha's or a kaba's). */
export const giftPartLabel = (id: string) =>
  SAMOSI_PARTS.find(p => p.id === id)?.label ?? KABA_PARTS.find(p => p.id === id)?.label ?? id;

/** „ქამარი“, „ახალუხი და მასრები“, „ა, ბ და გ“. */
export const joinGe = (names: string[]) =>
  names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} და ${names[names.length - 1]}`;
