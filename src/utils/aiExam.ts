import type { Voice } from './pathItems';

// The AI teacher's exam, the small rules (utils/aiPass.ts holds the pass line): which notes count, the take's id in the pearls'
// store and the teacher's one kind sentence after a try that did not pass.

/** the notes sung right out of the notes of the whole chant (a note counts at half its credit, as „მესამე ხმა“ counts it) */
export const examCount = (credits: readonly number[]): { hit: number; total: number } => ({
  hit: credits.filter(c => c >= 0.5).length,
  total: credits.length,
});

export const examTakeId = (variantId: string, voice: Voice) => `exam~${variantId}~${voice}`;

export const parseExamTakeId = (id: string): { variantId: string; voice: Voice } | null => {
  const m = /^exam~(.+)~([123])$/.exec(id);
  return m ? { variantId: m[1], voice: m[2] as Voice } : null;
};

/** the kind sentence after a try that did not pass — never „bad“ */
export const NEAR_SENTENCE = 'ახლოს ხარ. ხვალ ისევ სცადე.';
export const FAR_SENTENCE = 'ჯერ მოუსმინე და ისევ სცადე. ხვალ — ახალი ცდა.';
export const nearEnough = (hit: number, total: number) => total > 0 && hit / total >= 0.7;
export const missSentence = (hit: number, total: number) => (nearEnough(hit, total) ? NEAR_SENTENCE : FAR_SENTENCE);

/** the teacher's words at the rules screen */
export const RULES_SENTENCE = 'მზად ხარ? სამი წესია.';
