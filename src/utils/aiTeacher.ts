import { getApp } from 'firebase/app';
import { startAppCheck } from './samosiTryOn';
import { georgiaToday } from './psalter';

// „AI მასწავლებელი“ in the pearls game: Gemini (through Firebase AI Logic, the same App Check pass as the chokha
// try-on) listens to a member's take of a pearl's phrase and answers in Georgian: what went well, the one thing to
// fix, a small exercise. A few a day per device (the owner and superadmins: no limit); nothing is kept.

export const AI_TEACHER_MODEL = 'gemini-3.8-flash';
export const AI_TEACHER_DAILY = 3;

const dayKey = (uid: string) => `sg-ai-teacher-${uid}-${georgiaToday()}`;
const usedToday = (uid: string) => { try { return Number(localStorage.getItem(dayKey(uid))) || 0; } catch { return 0; } };

export const aiTriesLeft = (uid: string, unlimited: boolean) => (unlimited ? Infinity : Math.max(0, AI_TEACHER_DAILY - usedToday(uid)));

export type AiTeacherProblem = 'setup' | 'no-credits' | 'offline' | 'failed' | 'no-tries';
export class AiTeacherError extends Error {
  constructor(public kind: AiTeacherProblem) { super(kind); }
}

export const AI_PROBLEM_TEXT: Record<AiTeacherProblem, string> = {
  setup: 'AI მასწავლებელი ჯერ არ არის ჩართული — მალე ჩაირთვება.',
  'no-credits': 'AI მასწავლებელი დღეს დაიღალა — ხვალ სცადე.',
  offline: 'ინტერნეტი არ არის — AI მასწავლებელს ინტერნეტი სჭირდება.',
  failed: 'პასუხი ვერ მოვიდა — ცოტა ხანში კიდევ სცადე.',
  'no-tries': `დღეს AI მასწავლებელს ${AI_TEACHER_DAILY}-ჯერ უკვე ჰკითხე — ხვალ ისევ შეგეძლება.`,
};

export interface TakeAbout {
  title: string;     // the chant
  voice: string;     // „I ხმა“
  notes: string[];   // the phrase's melody, note names
  hit: number;       // notes the phone heard right
  report: string[];  // the phone's measurements (utils/takeReport.ts)
}

const prompt = (a: TakeAbout) => [
  'შენ ხარ ქართული ტრადიციული საეკლესიო გალობის კეთილი და ზუსტი მასწავლებელი.',
  `მოსწავლემ ტელეფონში იმღერა საგალობლის „${a.title}“ ${a.voice}ის პირველი ფრაზა (გელათის სკოლა).`,
  `ფრაზის მელოდია, თანმიმდევრობით (მოსწავლეს შეუძლია სხვა ტონალობაში იმღეროს): ${a.notes.join(' – ')}.`,
  `ტელეფონის სმენამ ამოიცნო, რომ ${a.notes.length} ნოტიდან ${a.hit} სწორად იმღერა.`,
  ...(a.report.length ? [
    'ტელეფონის ზუსტი გაზომვები (ცენტი = ნახევარტონის მეასედი, მოსწავლის საკუთარ ტონალობასთან შედარებით):',
    a.report.join('; ') + '.',
    'გამოიყენე ეს გაზომვები, რომ რჩევა კონკრეტული იყოს (რომელი ნოტი, რამდენით, სად), მაგრამ ენდე შენს სმენასაც:',
    'თუ ჩანაწერში სხვაგვარად ისმის, შენი სმენა სჯობს. ცენტებს მოსწავლეს ნუ ჩამოუთვლი — უთხარი უბრალო სიტყვებით.',
  ] : []),
  'მოუსმინე ჩანაწერს და უპასუხე ქართულად, 3–5 მოკლე წინადადებით, მოსწავლეს მიმართე „შენ“-ით:',
  'ჯერ რა გამოუვიდა კარგად; მერე ერთი ყველაზე მნიშვნელოვანი, რაც უნდა გამოასწოროს (ინტონაცია — სად აიწია ან დაიწია,',
  'რიტმი, სუნთქვა ან ხმის ბგერა); ბოლოს ერთი პატარა სავარჯიშო. არ დაწერო სათაურები, სიები ან ვარსკვლავები.',
  'თუ ჩანაწერში გალობა არ ისმის, ეს თქვი ერთი წინადადებით.',
].join(' ');

const offline = () => navigator.onLine === false;

const blobToBase64 = (b: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] || '');
  r.onerror = () => reject(r.error);
  r.readAsDataURL(b);
});

/** Asks the AI teacher about one take (MP3); counts the try only when an answer came. */
export const askAiTeacher = async (uid: string, mp3: Blob, about: TakeAbout, unlimited = false): Promise<string> => {
  if (aiTriesLeft(uid, unlimited) <= 0) throw new AiTeacherError('no-tries');
  if (offline()) throw new AiTeacherError('offline');
  const audio = await blobToBase64(mp3);
  let answer = '';
  try {
    await startAppCheck();
    const { getAI, getGenerativeModel, GoogleAIBackend } = await import('firebase/ai');
    const model = getGenerativeModel(getAI(getApp(), { backend: new GoogleAIBackend() }), { model: AI_TEACHER_MODEL });
    const res = await model.generateContent([{ text: prompt(about) }, { inlineData: { mimeType: 'audio/mp3', data: audio } }]);
    answer = res.response.text().trim();
  } catch (err) {
    console.warn('AI teacher note:', err);
    const text = String((err as Error)?.message || err);
    if (/prepay|credits|depleted|quota|resource.?exhausted|429/i.test(text)) throw new AiTeacherError('no-credits');
    if (/api.?key|not.?enabled|permission|403|billing|ai.?logic|app.?check|not found|404|recaptcha/i.test(text)) throw new AiTeacherError('setup');
    throw new AiTeacherError(offline() ? 'offline' : 'failed');
  }
  if (!answer) throw new AiTeacherError('failed');
  if (!unlimited) { try { localStorage.setItem(dayKey(uid), String(usedToday(uid) + 1)); } catch { /* storage off */ } }
  return answer.replace(/\*+/g, '');
};
