import { useEffect, useState } from 'react';
import { deleteField, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// „დღის მსახურება“'s chant list (2026-11-22, the user: „ტიპიკონის მიხედვით თავიდან თავად ალაგებდეს … თუმცა მე შემეძლოს დალაგება …
// ლადოს ღილაკი … საგალობლების დალაგება … ვერსიებიდან მოვნიშნავ სასურველს და მონიშნულები დარჩება“):
// - the list starts as the Typikon gives it — every step's chants in the service's order (`autoChants`);
// - the member's own order of a day's service (drag, or „ლადოს პროგრამა“) = students.dayPlan { "<iso>~<service>": chantIds };
// - the versions ticked under a chant stay for every day = students.chantPicks { chantId: variantIds }.

export { autoChants, moveItem, parsePlan, planKey, planList } from './dayPlanRules';

export const saveDayPlan = (uid: string, key: string, ids: string[] | null) =>
  setDoc(doc(db, 'students', uid), { dayPlan: { [key]: ids ?? deleteField() } }, { merge: true });

export const saveChantPicks = (uid: string, chantId: string, vids: string[]) =>
  setDoc(doc(db, 'students', uid), { chantPicks: { [chantId]: vids.length ? vids : deleteField() } }, { merge: true });

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : null);
const mapOf = (raw: unknown) => {
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries((raw ?? {}) as Record<string, unknown>)) { const s = strings(v); if (s) out[k] = s; }
  return out;
};

/** this member's kept orders and ticked versions, live */
export const useDayPlanStore = (uid: string | undefined) => {
  const [state, setState] = useState<{ plans: Record<string, string[]>; picks: Record<string, string[]> }>({ plans: {}, picks: {} });
  useEffect(() => {
    if (!uid) { setState({ plans: {}, picks: {} }); return; }
    return onSnapshot(doc(db, 'students', uid), s => {
      const d = s.data() ?? {};
      setState({ plans: mapOf(d.dayPlan), picks: mapOf(d.chantPicks) });
    }, () => {});
  }, [uid]);
  return state;
};
