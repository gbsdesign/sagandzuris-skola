import { useEffect, useState } from 'react';
import { collection, doc, getCountFromServer, getDoc, increment, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { georgiaToday } from './psalter';

// The AI teacher's school rules (2026-11-18, the canvas's ai-tsesebi): the school sets them, the AI follows.
//   settings/aiTeacher { budget: $ a month for the whole school, perStudent: $ a month one member may use,
//                        hintsFirst: hint before the answer, kidsNoAi: the kids' mode gets no AI (ready phrases only) }
//   aiUsage/{YYYY-MM} { calls } and aiUsage/{YYYY-MM}/people/{uid} { calls } — every AI answer counts one
//   (firestore.rules: the signed-in count up by one; a person's count is read by them and admins).
// The cost is an estimate: Gemini 3.8 Flash's price per answer (a short take and a few sentences) at the 2027 rates.

export interface AiRules { budget: number; perStudent: number; hintsFirst: boolean; kidsNoAi: boolean }
export const AI_RULES_DEFAULT: AiRules = { budget: 100, perStudent: 3, hintsFirst: true, kidsNoAi: true };
/** dollars one AI answer costs, roughly (a 15-second take in, a few sentences out) */
export const EST_USD_PER_CALL = 0.01;

const monthNow = () => georgiaToday().slice(0, 7);
const rulesOf = (d: Record<string, unknown> | undefined): AiRules => ({
  budget: typeof d?.budget === 'number' && d.budget >= 0 ? d.budget : AI_RULES_DEFAULT.budget,
  perStudent: typeof d?.perStudent === 'number' && d.perStudent >= 0 ? d.perStudent : AI_RULES_DEFAULT.perStudent,
  hintsFirst: typeof d?.hintsFirst === 'boolean' ? d.hintsFirst : AI_RULES_DEFAULT.hintsFirst,
  kidsNoAi: typeof d?.kidsNoAi === 'boolean' ? d.kidsNoAi : AI_RULES_DEFAULT.kidsNoAi,
});

export const useAiRules = () => {
  const [rules, setRules] = useState<AiRules>(AI_RULES_DEFAULT);
  useEffect(() => onSnapshot(doc(db, 'settings', 'aiTeacher'), s => setRules(rulesOf(s.data())), () => undefined), []);
  return rules;
};

export const saveAiRules = (r: Partial<AiRules>) => setDoc(doc(db, 'settings', 'aiTeacher'), { ...r, at: new Date().toISOString() }, { merge: true });

/** This month: how many AI answers, and how many people asked (admins). */
export const useAiUsage = (enabled: boolean) => {
  const [usage, setUsage] = useState<{ calls: number; people: number | null }>({ calls: 0, people: null });
  useEffect(() => {
    if (!enabled) return;
    const month = monthNow();
    getCountFromServer(collection(db, 'aiUsage', month, 'people'))
      .then(c => setUsage(u => ({ ...u, people: c.data().count })), () => undefined);
    return onSnapshot(doc(db, 'aiUsage', month), s => setUsage(u => ({ ...u, calls: Number(s.data()?.calls) || 0 })), () => undefined);
  }, [enabled]);
  return usage;
};

const bump = async (path: [string, ...string[]]) => {
  const ref = doc(db, ...path);
  try { await updateDoc(ref, { calls: increment(1) }); } catch { await setDoc(ref, { calls: 1 }).catch(() => undefined); }
};

/** One AI answer came: counted for the school and for the person (best effort). */
export const noteAiCall = (uid: string) => {
  const month = monthNow();
  void bump(['aiUsage', month]);
  void bump(['aiUsage', month, 'people', uid]);
};

/** Why the AI may not answer now: the kids' mode, or this month's money is spent. Null = it may. */
export const aiGate = async (uid: string): Promise<null | 'kids' | 'budget'> => {
  try {
    const month = monthNow();
    const [rules, me, school, person] = await Promise.all([
      getDoc(doc(db, 'settings', 'aiTeacher')).then(s => rulesOf(s.data())),
      getDoc(doc(db, 'students', uid)).then(s => s.data()),
      getDoc(doc(db, 'aiUsage', month)).then(s => Number(s.data()?.calls) || 0),
      getDoc(doc(db, 'aiUsage', month, 'people', uid)).then(s => Number(s.data()?.calls) || 0),
    ]);
    if (rules.kidsNoAi && me?.kidsMode?.on === true) return 'kids';
    if (school * EST_USD_PER_CALL >= rules.budget || person * EST_USD_PER_CALL >= rules.perStudent) return 'budget';
    return null;
  } catch {
    return null; // the rules could not be read (offline): the call itself will say so
  }
};

/** „ჯერ მინიშნება“: the sentence the AI's prompt gets when the school wants a hint before the answer. */
export const HINT_FIRST_LINE = 'პირდაპირ სწორი პასუხი ნუ უთხარი — ჯერ მიანიშნე, რას მიაქციოს ყურადღება და რა მოუსმინოს, რომ თვითონ იპოვოს.';
export const readHintsFirst = async () => {
  try { return rulesOf((await getDoc(doc(db, 'settings', 'aiTeacher'))).data()).hintsFirst; } catch { return AI_RULES_DEFAULT.hintsFirst; }
};
