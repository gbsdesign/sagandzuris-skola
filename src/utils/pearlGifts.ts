import { SAMOSI_PARTS } from '../data/samosiData';
import { KABA_PARTS } from '../data/kabaData';
import { CHESTS } from '../data/pearls';
import { nameGender } from '../data/georgianNames';

// „ჯილდო სამოსისთვის“ (2026-10-28): every GIFT_EVERY pearls a teacher has approved (they shine) give the member's
// outfit in „ჩემი სამოსი“ its next part, so the two games go together. The member's own app adds the part
// (hooks/usePearlGifts.ts) and the path page shows it once (components/pearls/PearlGift.tsx). Kept in
// students/{uid}.pearlGifts = { steps, parts, seen }:
//   steps  the fives already rewarded (one a teacher takes back is not rewarded again)
//   parts  the part ids given, in order (fewer than the steps once the outfit was complete)
//   seen   how many of `parts` the member has seen
// Pure helpers, tested in tests/pearlGifts.test.ts.

export const GIFT_EVERY = 5;
export type Outfit = 'chokha' | 'kaba';
export interface PearlGifts { steps: number; parts: string[]; seen: number }

const PEARL_IDS = new Set(CHESTS.flatMap(c => c.pearls));
const EXTRA_HATS = new Set(SAMOSI_PARTS.filter(p => p.extraHat).map(p => p.id));

/** How many of the chests' pearls shine (students.pearlShine also keeps other approvals: learn~…, read~…). */
export const shiningCount = (shine: Record<string, unknown> | null | undefined) =>
  Object.entries(shine || {}).filter(([id, v]) => !!v && PEARL_IDS.has(id)).length;

/** The record as Firestore holds it, made safe. */
export const readGifts = (v: unknown): PearlGifts => {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const parts = Array.isArray(o.parts) ? o.parts.filter((x): x is string => typeof x === 'string') : [];
  const steps = typeof o.steps === 'number' && o.steps > 0 ? Math.floor(o.steps) : 0;
  const seen = typeof o.seen === 'number' && o.seen > 0 ? Math.min(Math.floor(o.seen), parts.length) : 0;
  return { steps, parts, seen };
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

/** What the shining pearls owe now: the fives reached (`steps`) and the parts to add, one for each new five while
 *  parts are left; null when nothing is owed. */
export const giftDue = (shining: number, gifts: PearlGifts, outfit: Outfit, owned: string[]): { steps: number; parts: string[] } | null => {
  const steps = Math.floor(shining / GIFT_EVERY);
  if (steps <= gifts.steps) return null;
  return { steps, parts: partsLeft(outfit, owned).slice(0, steps - gifts.steps) };
};

/** The way to the next part: how many more pearls must shine (1–5; more after a teacher took some back) and the part
 *  they will give (null once the outfit is complete). */
export const nextGift = (shining: number, gifts: PearlGifts, outfit: Outfit, owned: string[]) => {
  const steps = Math.max(gifts.steps, Math.floor(shining / GIFT_EVERY));
  return { left: (steps + 1) * GIFT_EVERY - shining, part: partsLeft(outfit, owned)[0] ?? null };
};

/** A given part's name (a chokha's or a kaba's). */
export const giftPartLabel = (id: string) =>
  SAMOSI_PARTS.find(p => p.id === id)?.label ?? KABA_PARTS.find(p => p.id === id)?.label ?? id;

/** „ქამარი“, „ახალუხი და მასრები“, „ა, ბ და გ“. */
export const joinGe = (names: string[]) =>
  names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} და ${names[names.length - 1]}`;
