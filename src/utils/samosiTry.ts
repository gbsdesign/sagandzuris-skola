import { useSyncExternalStore } from 'react';

// „ჩემი სამოსი“ (2026-11-08, the user: „მუდმივად … დარჩენა … თუ … კამერის ფუნქციით გადაუღებს საკუთარ ნამდვილ ნაწილს …
// თუ არ აქვს … ააწყობს ჩოხას … აწყობილი ჩოხა და სამოსის მწვანე პროგრეს ზოლი დაიშალოს როგორც კი გამოვა მაგ გვერდიდან“):
// a part tapped without its photo is only tried on. The tried parts live here, in memory only — never saved —, and are
// dropped when the page that shows them goes (PathOrbs and the profile's ChemiSamosi call clearTried on leaving). The
// parts that stay are the photographed ones (utils/samosiProof.ts).

export type Outfit = 'chokha' | 'kaba';

const NONE: string[] = [];
let tried = new Map<string, string[]>();
const subs = new Set<() => void>();
const keyOf = (uid: string, outfit: Outfit) => `${uid}|${outfit}`;

const emit = () => subs.forEach(f => f());
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => { subs.delete(f); };
};

/** The parts of `outfit` tried on now (not photographed). */
export const triedOf = (uid: string | undefined, outfit: Outfit) => (uid ? tried.get(keyOf(uid, outfit)) ?? NONE : NONE);

export const setTried = (uid: string, outfit: Outfit, ids: string[]) => {
  const next = new Map(tried);
  if (ids.length) next.set(keyOf(uid, outfit), ids);
  else next.delete(keyOf(uid, outfit));
  tried = next;
  emit();
};

/** Takes every tried part off (the page is left). */
export const clearTried = () => {
  if (!tried.size) return;
  tried = new Map();
  emit();
};

export const useTried = (uid: string | undefined, outfit: Outfit) =>
  useSyncExternalStore(subscribe, () => triedOf(uid, outfit), () => NONE);
