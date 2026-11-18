import { getApp } from 'firebase/app';
import { startAppCheck } from '../../utils/samosiTryOn';
import { georgiaToday } from '../../utils/psalter';
import { aiGate, HINT_FIRST_LINE, noteAiCall, readHintsFirst } from '../../utils/aiRules';
import { aiNotesFor } from '../../utils/aiTeacherNotes';
import { AI_PROBLEM_TEXT, AI_TEACHER_MODEL, AiTeacherError, type AiTeacherProblem } from '../../utils/aiTeacher';
import type { AskQuestion } from '../../utils/aiAsk';

// „ჰკითხე“'s last resort: when the school's material has no answer (utils/aiAsk.ts), Gemini is asked — kept to chant and
// the app, never faith — with the same guards as the other AI calls (kids' mode, the month's budget, counted in
// aiUsage). Ten questions a day on a device.

export const ASK_DAILY = 10;
const dayKey = (uid: string) => `sg-ai-ask-${uid}-${georgiaToday()}`;
const used = (uid: string) => { try { return Number(localStorage.getItem(dayKey(uid))) || 0; } catch { return 0; } };
const offline = () => navigator.onLine === false;
const count = (uid: string) => { try { localStorage.setItem(dayKey(uid), String(used(uid) + 1)); } catch { /* not kept */ } };

export const askProblemText = (kind: AiTeacherProblem) =>
  kind === 'no-tries' ? `დღეს უკვე ${ASK_DAILY} კითხვა დასვი — ხვალ ისევ შეგეძლება.` : AI_PROBLEM_TEXT[kind];

export interface AskAbout {
  title: string;
  /** „I ხმა (მთქმელი)“ */
  voice: string;
  /** the phrase's number, from 1 */
  phrase: number;
  /** the phrase's words, roughly (may be empty) */
  words: string[];
}

const prompt = (q: AskQuestion, a: AskAbout) => [
  'შენ ხარ ქართული ტრადიციული საეკლესიო გალობის კეთილი მასწავლებელი აპში „საგანძურის სკოლა“.',
  `მოსწავლე ახლა სწავლობს საგალობელს „${a.title}“, ${a.voice}, ფრაზა ${a.phrase}.`,
  ...(a.words.length ? [`ამ ადგილის სიტყვები (დაახლოებით): ${a.words.join(' / ')}.`] : []),
  'უპასუხე მხოლოდ გალობაზე (ნოტები, ხმა, სუნთქვა, რიტმი, ხმების ერთად ჟღერა), საგალობლის ტექსტის სიტყვების მნიშვნელობაზე',
  'და აპზე. თუ კითხვა სხვა რამეზეა, ერთი წინადადებით თქვი, რომ მხოლოდ გალობაზე და აპზე პასუხობ.',
  'სარწმუნოების კითხვებზე (ღმერთი, ცოდვა, ლოცვა, ზიარება, მარხვა, სული…) არ უპასუხო — თქვი: „ეს სარწმუნოების კითხვაა — ჰკითხე შენს მოძღვარს.“',
  'თუ ზუსტად არ იცი, ასე თქვი და არაფერი გამოიგონო.',
  'უპასუხე ქართულად, 2–4 მოკლე წინადადებით, „შენ“-ით, უბრალო სიტყვებით; სათაურების, სიების და ვარსკვლავების გარეშე.',
  q.kind === 'meaning' && q.word ? `კითხვა: რას ნიშნავს სიტყვა „${q.word}“ ამ საგალობელში?` : `კითხვა: ${q.text}`,
].join(' ');

/** Gemini's answer to one question about the phrase; the try counts only when an answer came. */
export const askChantQuestion = async (uid: string, q: AskQuestion, about: AskAbout): Promise<string> => {
  if (used(uid) >= ASK_DAILY) throw new AiTeacherError('no-tries');
  if (offline()) throw new AiTeacherError('offline');
  const stop = await aiGate(uid);
  if (stop) throw new AiTeacherError(stop);
  const notes = await aiNotesFor(uid).catch(() => [] as string[]);
  const told = notes.length ? ` მასწავლებლის მითითებები (გაითვალისწინე): ${notes.join(' · ')}.` : '';
  const hint = q.kind === 'free' && (await readHintsFirst()) ? ` ${HINT_FIRST_LINE}` : '';
  let answer = '';
  try {
    await startAppCheck();
    const { getAI, getGenerativeModel, GoogleAIBackend } = await import('firebase/ai');
    const model = getGenerativeModel(getAI(getApp(), { backend: new GoogleAIBackend() }), { model: AI_TEACHER_MODEL });
    const res = await model.generateContent([{ text: `${prompt(q, about)}${told}${hint}` }]);
    answer = res.response.text().trim();
  } catch (err) {
    console.warn('AI ask:', err);
    const text = String((err as Error)?.message || err);
    if (/prepay|credits|depleted|quota|resource.?exhausted|429/i.test(text)) throw new AiTeacherError('no-credits');
    if (/api.?key|not.?enabled|permission|403|billing|ai.?logic|app.?check|not found|404|recaptcha/i.test(text)) throw new AiTeacherError('setup');
    throw new AiTeacherError(offline() ? 'offline' : 'failed');
  }
  if (!answer) throw new AiTeacherError('failed');
  noteAiCall(uid);
  count(uid);
  return answer.replace(/\*+/g, '').replace(/^#+\s*/gm, '');
};
