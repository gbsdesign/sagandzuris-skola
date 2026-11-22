import { getApp } from 'firebase/app';
import { auth } from '../../../firebase';
import type { Engine } from './enginePref';
import { startAppCheck } from '../../../utils/samosiTryOn';
import { aiGate, noteAiCall } from '../../../utils/aiRules';
import { AI_TEACHER_MODEL, AiTeacherError, type AiTeacherProblem } from '../../../utils/aiTeacher';
import { assistantPrompt, parseAnswer, type Answer, type AssistantScope, type Turn } from '../../../utils/aiAssistant';

// The assistant's one call to Gemini (Firebase AI Logic, the same App Check pass as the AI teacher), JSON out. The school's
// rules hold here too: the kids' mode and the month's budget (aiGate) stop it; every answer is counted in aiUsage.

export const ASSISTANT_PROBLEM_TEXT: Record<AiTeacherProblem, string> = {
  setup: 'ავტომატური პროგრამა ჯერ არ არის ჩართული — მალე ჩაირთვება.',
  'no-credits': 'ავტომატური პროგრამა ახლა დაიღალა — ცოტა ხანში სცადე.',
  offline: 'ინტერნეტი არ არის — ავტომატურ პროგრამას ინტერნეტი სჭირდება.',
  failed: 'პასუხი ვერ მოვიდა — ცოტა ხანში კიდევ სცადე.',
  'no-tries': 'დღეს მეტი კითხვა აღარ შეიძლება — ხვალ ისევ შეგეძლება.',
  kids: 'საბავშვო რეჟიმში ავტომატური პროგრამა არ ერთვება.',
  budget: 'ამ თვის ლიმიტი ამოიწურა — ავტომატური პროგრამა მომავალ თვემდე ჩუმადაა.',
};

const offline = () => navigator.onLine === false;

/** A failure's reason for the superadmin's eyes (Lado only): shown small under the plain words. */
export const whyOf = (e: unknown): string => String((e as { why?: string })?.why || '');
const withWhy = (e: AiTeacherError, why: string) => Object.assign(e, { why });

const LADO_SERVER = 'https://sagandzuri-reminders.mr-gabunia.workers.dev/lado';

// „ლადოს პროგრამა“: the same prompt to Claude through the Worker (the key stays there); its answer is the JSON as text
export const askLado = async (prompt: string, keep?: { chat: string; items: { k: string; t: string }[] }): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new AiTeacherError('setup');
  let res: Response;
  try {
    res = await fetch(LADO_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: await user.getIdToken(), prompt, ...(keep ? { keep } : {}) }),
    });
  } catch {
    throw new AiTeacherError(offline() ? 'offline' : 'failed');
  }
  if (res.status === 402 || res.status === 429) throw new AiTeacherError('no-credits');
  if (res.status === 503 || res.status === 403 || res.status === 404) throw new AiTeacherError('setup');
  if (!res.ok) throw withWhy(new AiTeacherError('failed'), (await res.text().catch(() => '')).slice(0, 200) || `${res.status}`);
  const data = await res.json().catch(() => null) as { text?: string } | null;
  return String(data?.text || '').trim();
};

export const askAssistant = async (uid: string, scope: AssistantScope, history: Turn[], ask: string, engine: Engine = 'google',
  keep?: { chat: string; items: { k: string; t: string }[] }): Promise<Answer> => {
  if (offline()) throw new AiTeacherError('offline');
  const stop = await aiGate(uid);
  if (stop) throw new AiTeacherError(stop);
  let raw = '';
  if (engine === 'lado') {
    raw = await askLado(assistantPrompt(scope, history, ask), keep);
    const answer = parseAnswer(raw);
    if (!answer) throw withWhy(new AiTeacherError('failed'), `პასუხი გაუგებარი იყო: ${raw.slice(0, 120)}`);
    noteAiCall(uid);
    return answer;
  }
  try {
    await startAppCheck();
    const { getAI, getGenerativeModel, GoogleAIBackend } = await import('firebase/ai');
    const model = getGenerativeModel(getAI(getApp(), { backend: new GoogleAIBackend() }), {
      model: AI_TEACHER_MODEL,
      generationConfig: { responseMimeType: 'application/json' },
    });
    const res = await model.generateContent([{ text: assistantPrompt(scope, history, ask) }]);
    raw = res.response.text().trim();
  } catch (err) {
    console.warn('AI assistant:', err);
    const msg = String((err as Error)?.message || err);
    if (/prepay|credits|depleted|quota|resource.?exhausted|429/i.test(msg)) throw new AiTeacherError('no-credits');
    if (/api.?key|not.?enabled|permission|403|billing|ai.?logic|app.?check|not found|404|recaptcha/i.test(msg)) throw new AiTeacherError('setup');
    throw new AiTeacherError(offline() ? 'offline' : 'failed');
  }
  const answer = parseAnswer(raw);
  if (!answer) throw new AiTeacherError('failed');
  noteAiCall(uid);
  return answer;
};
