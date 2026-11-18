import type { Voice } from './pathItems';

// The AI teacher's exam (AI step 3, boards x-ai-gamocda-tsin / x-ai-gamocda): a member sings a chant's voice whole, at its real
// tempo, with the other voices sounding and no hints; the phone counts the notes. Passed = the pearl of that voice shines as if a
// teacher confirmed it („ჩათვალა AI მასწავლებელმა“); the teacher may hear the take and take the pass off — the last word is theirs.
// Kept in the member's own record: students/{uid}.aiPass { [variantId]: { [voice]: { at, hit, total } } } and the day of the last
// try a voice: students/{uid}.examTries { "<variantId>:<voice>": day } (one exam a day a voice; tries are not counted).

export interface AiPassEntry { at: string; hit: number; total: number }
export type AiPass = Record<string, Partial<Record<Voice, AiPassEntry>>>;

/** the share of the notes that passes the exam (the board's 49 of 52 passes) */
export const PASS_SHARE = 0.9;

export const passed = (hit: number, total: number): boolean => total > 0 && hit / total >= PASS_SHARE;

export const examKey = (variantId: string, voice: Voice) => `${variantId}:${voice}`;

/** whether the exam of this voice was already tried today (Tbilisi day „YYYY-MM-DD“) */
export const triedToday = (tries: Record<string, string> | null | undefined, variantId: string, voice: Voice, day: string): boolean =>
  (tries || {})[examKey(variantId, voice)] === day;

/** the voices the AI passed for an item */
export const aiVoices = (pass: AiPass | null | undefined, variantId: string): Voice[] =>
  (Object.keys((pass || {})[variantId] || {}) as Voice[]).filter(v => !!pass?.[variantId]?.[v]).sort();

/** a teacher's confirmations and the AI's passes together: what counts as confirmed for the pearls */
export const withAiPasses = <C extends Record<string, readonly Voice[]>>(conf: C, pass: AiPass | null | undefined): Record<string, Voice[]> => {
  const out: Record<string, Voice[]> = {};
  for (const [id, voices] of Object.entries(conf)) out[id] = [...voices];
  for (const id of Object.keys(pass || {})) {
    const ai = aiVoices(pass, id);
    if (!ai.length) continue;
    out[id] = Array.from(new Set([...(out[id] || []), ...ai])).sort();
  }
  return out;
};

/** „52 ნოტიდან 49 ზუსტად“ — no percentages anywhere (the AI teacher's rule) */
export const hitLine = (hit: number, total: number) => `${total} ნოტიდან ${hit} ზუსტად`;
