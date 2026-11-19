import { getApp } from 'firebase/app';
import { startAppCheck } from '../../../utils/samosiTryOn';
import { AI_TEACHER_MODEL } from '../../../utils/aiTeacher';
import { aiGate, noteAiCall } from '../../../utils/aiRules';
import { mkAiCount, mkAiLeft, mkPrompt, parseMkReply, type MkAiReply } from '../../../utils/mkitkhe';

// „მკითხე“'s second step: only when no ready answer was found, only while the school's „AI მასწავლებელი“ is open for the
// person. The same Gemini call as the AI teacher's (utils/aiTeacher.ts: Firebase AI Logic behind App Check), counted in the
// school's month budget (utils/aiRules — the kids' mode gets none) and ten a day on the device (utils/mkitkhe `mkAiLeft`).

export type MkAiProblem = 'limit' | 'offline' | 'kids' | 'budget' | 'setup' | 'failed';
export class MkAiError extends Error {
  constructor(public kind: MkAiProblem) { super(kind); }
}

/** a quiet line under „ვერ გავიგე…“ when the AI could not answer (the limit and the lost internet have screens of their own) */
export const MK_AI_PROBLEM: Record<Exclude<MkAiProblem, 'limit' | 'offline'>, string> = {
  kids: 'საბავშვო რეჟიმში AI არ ერთვება — მუშაობს მზა პასუხები.',
  budget: 'ამ თვის AI-ს ლიმიტი ამოიწურა. მზა პასუხები ყოველთვის მუშაობს.',
  setup: 'AI ჯერ არ არის ჩართული. მზა პასუხები ყოველთვის მუშაობს.',
  failed: 'AI-ს პასუხი ვერ მოვიდა — ცოტა ხანში კიდევ სცადე.',
};

// read anew each time (the connection may drop while the AI thinks)
const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/** Asks the AI; the try is counted only when an answer came. */
export const askMkitkheAi = async (uid: string, question: string): Promise<MkAiReply> => {
  if (mkAiLeft(uid) <= 0) throw new MkAiError('limit');
  if (offline()) throw new MkAiError('offline');
  const stop = await aiGate(uid);
  if (stop) throw new MkAiError(stop);
  let raw = '';
  try {
    await startAppCheck();
    const { getAI, getGenerativeModel, GoogleAIBackend } = await import('firebase/ai');
    const model = getGenerativeModel(getAI(getApp(), { backend: new GoogleAIBackend() }), {
      model: AI_TEACHER_MODEL,
      generationConfig: { responseMimeType: 'application/json' },
    });
    const res = await model.generateContent([{ text: mkPrompt(question) }]);
    raw = res.response.text().trim();
  } catch (err) {
    console.warn('mkitkhe AI:', err);
    const text = String((err as Error)?.message || err);
    if (/prepay|credits|depleted|quota|resource.?exhausted|429/i.test(text)) throw new MkAiError('budget');
    if (/api.?key|not.?enabled|permission|403|billing|ai.?logic|app.?check|not found|404|recaptcha/i.test(text)) throw new MkAiError('setup');
    throw new MkAiError(offline() ? 'offline' : 'failed');
  }
  const reply = parseMkReply(raw);
  if (!reply) throw new MkAiError('failed');
  noteAiCall(uid);
  mkAiCount(uid);
  return reply;
};
