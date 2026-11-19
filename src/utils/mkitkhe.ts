import { MK_AI_DAILY, MK_ANSWERS, type MkAnswer } from '../data/mkitkhe';
import { searchNormalize } from './searchMatch';
import { isFaithQuestion } from './aiAsk';
import { georgiaToday } from './psalter';

// „მკითხე“'s matching: a typed or said question → one of the 40 ready answers (data/mkitkhe.ts), a question of faith (not
// answered — the priest's matter), or nothing (then the AI, where it is on). Pure, no data but the answers: tested in
// tests/mkitkhe.test.ts. The words go through the one search's spelling (utils/searchMatch `searchNormalize`), then lose
// their case endings, so „ნოტები“, „ნოტებს“ and „ნოტების“ are one word; a verb's stem is matched inside the word
// („ჩავიწერო“ holds „ჩავიწერ“).

// words that ask but say nothing of what (they are in nearly every question)
const STOP = new Set([
  'როგორ', 'როგორა', 'სად', 'სადაა', 'რა', 'რაა', 'რას', 'რის', 'რომელი', 'რომელ', 'არის', 'არ', 'ვერ', 'მაქვს', 'მე', 'მეც',
  'ჩემი', 'ჩემს', 'ჩემო', 'ჩემთვის', 'შენი', 'და', 'ან', 'თუ', 'ეს', 'ეგ', 'ის', 'ამ', 'იმ', 'კი', 'უნდა', 'შემიძლია', 'შეიძლება',
  'შეუძლია', 'მინდა', 'მითხარი', 'მითხარით', 'გთხოვ', 'გთხოვთ', 'აპში', 'აპი', 'აპის', 'აპზე', 'აპლიკაცია', 'აპლიკაციაში',
  'საიტზე', 'საიტი', 'ხოლმე', 'რომ', 'ვინ', 'ვნახო', 'ვიპოვო', 'ვპოულობ', 'ვნახავ', 'ვნახე', 'ვხედავ', 'ჩანს', 'სადმე',
  'მოვიქცე', 'ვქნა', 'ერთი', 'ძალიან', 'ცოტა', 'ახლა', 'ხომ', 'იქ', 'აქ', 'ამას', 'ამის', 'მას', 'ვარ', 'ხარ', 'ჰო', 'დიახ',
  'ჯერ', 'მერე', 'ისე', 'ასე', 'უკვე', 'ისევ', 'კიდევ', 'მაინც', 'რატომ', 'იყო', 'იქნება', 'მაქ', 'გამოჩნდება', 'სხვა',
  'სხვას', 'ჩემმა', 'რამე', 'რაღაც', 'მქონდა', 'გუშინ', 'დღეს', 'ვეღარ', 'აღარ', 'რაღაცას', 'რაღაცა',
]);

// case endings, the longest first; a stem keeps two letters at least
const ENDINGS = [
  'ებისთვის', 'ისთვის', 'თვის', 'ებიდან', 'იდან', 'დან', 'ებამდე', 'ამდე', 'მდე', 'ებთან', 'თან', 'ებში', 'ში', 'ებზე', 'ზე',
  'ებით', 'ით', 'ებად', 'ად', 'ების', 'ის', 'ებმა', 'მა', 'ებს', 'ები', 'ებო', 'ს', 'ი', 'ო', 'ა', 'ე',
];

/** a word without its case ending: „ნოტებს“ → „ნოტ“, „ჩავიწერო“ → „ჩავიწერ“ */
export const mkStem = (w: string): string => {
  const e = ENDINGS.find(x => w.endsWith(x) && w.length - x.length >= 2);
  return e ? w.slice(0, -e.length) : w;
};

const wordsOf = (text: string) => searchNormalize(text).split(' ').map(w => w.replace(/[^a-z0-9ა-ჰ]/g, '')).filter(Boolean);

/** the words of a question that say what it is about, as stems */
export const mkWords = (text: string): string[] => [...new Set(wordsOf(text).filter(w => !STOP.has(w)).map(mkStem))];

// „საგალობელი“ → „საგალობლის“: the e of a last syllable drops before an ending
const fold = (w: string) => w.replace(/ე([ლრნ])$/, '$1');
const meets1 = (s: string, k: string) =>
  s === k || (k.length >= 3 && s.startsWith(k)) || (k.length >= 5 && s.includes(k)) || (s.length >= 4 && k.startsWith(s));
/** a query's stem against an answer's: the same, one starts with the other, or a long one inside it */
const meets = (s: string, k: string) => meets1(s, k) || meets1(fold(s), fold(k));

// the words of an answer's sentences that only say how to tap (they would tie every answer to every other)
const HOW = new Set(['შეეხე', 'დააჭირე', 'გახსენი', 'აირჩიე', 'თავში', 'გვერდზე', 'გვერდის', 'გვერდიდან', 'მერე', 'ერთხელ', 'ყველგან',
  'ზემოთ', 'ქვემოთ', 'იქ', 'ან', 'და', 'რომელიც', 'ერთი', 'შენი', 'შენ', 'გაჩვენებს', 'გთხოვს', 'ნაბიჯია']);

interface Term { key: string; words: string[]; weight: number; said?: boolean }
// what a term weighs before its rarity: the question's own words most, a key marked „!“ more, the answer's words least
const OWN = 1.25;
const STRONG = 1.5;
const SAID = 0.6;

const termsOf = (a: MkAnswer): Term[] => {
  const out = new Map<string, Term>();
  const add = (words: string[], weight: number) => {
    const key = words.join(' ');
    const had = out.get(key);
    if (!had || had.weight < weight) out.set(key, { key, words, weight, said: weight === SAID });
  };
  for (const w of mkWords(a.question)) add([w], OWN);
  // keys are written as stems already; a phrase's words are matched as typed (a stop word may be one of them)
  for (const k of a.keys) {
    const strong = k.startsWith('!');
    const words = searchNormalize(strong ? k.slice(1) : k).split(' ').filter(Boolean);
    if (words.length) add(words, strong ? STRONG : 1);
  }
  // a short stem of the answer's words would start too many others („შედი“ → „შედეგები“)
  for (const w of a.answer.flatMap(wordsOf)) {
    const st = mkStem(w);
    if (!STOP.has(w) && !HOW.has(w) && st.length >= 4) add([st], SAID);
  }
  return [...out.values()];
};

const RAW = MK_ANSWERS.map(a => ({ a, terms: termsOf(a) }));
// how many answers hold a term: one held by few tells more
const DF = new Map<string, number>();
for (const { terms } of RAW) for (const t of terms) DF.set(t.key, (DF.get(t.key) ?? 0) + 1);
const idf = (key: string) => Math.log2(1 + MK_ANSWERS.length / (DF.get(key) ?? 1));
const INDEX = RAW.map(({ a, terms }) => ({ a, terms: terms.map(t => ({ ...t, weight: t.weight * idf(t.key) })) }));

/** each answer's score for these words (for the tests); sorted, best first */
export const mkScores = (text: string): { id: number; score: number }[] => {
  const q = mkWords(text);
  if (!q.length) return [];
  // a phrase may hold a stop word („რაც ვისწავლე“)
  const all = [...new Set(wordsOf(text).map(mkStem))];
  const out: { id: number; score: number }[] = [];
  for (const { a, terms } of INDEX) {
    let score = 0;
    // only an answer's own question or keys make it the answer; words of its sentences alone only add weight
    let firm = false;
    // a one-word term: each query word takes the answer's best term it meets
    for (const s of q) {
      let best: Term | null = null;
      for (const t of terms) if (t.words.length === 1 && t.weight > (best?.weight ?? 0) && meets(s, t.words[0])) best = t;
      if (best) { score += best.weight; firm ||= !best.said; }
    }
    // a phrase: every one of its words is in the question
    for (const t of terms) if (t.words.length > 1 && t.words.every(w => all.some(s => meets(s, w)))) { score += t.weight; firm = true; }
    if (score > 0 && firm) out.push({ id: a.id, score });
  }
  // a tie goes to the earlier answer (the list runs from the most asked)
  return out.sort((x, y) => y.score - x.score || x.id - y.id);
};

/** below this nothing is near enough to be the answer */
export const MK_MIN_SCORE = 3;
/** a question with words of faith is still the app's when it matches this well („სად არის ღვთისმსახურება?“) */
const FAITH_OVER = 7;

export type MkMatch =
  | { kind: 'answer'; id: number; score: number }
  | { kind: 'faith' }
  | { kind: 'none' };

/** What a question is: a ready answer, a question of faith, or nothing near. */
export const matchQuestion = (text: string): MkMatch => {
  const t = text.trim();
  if (!t) return { kind: 'none' };
  // a ready question picked or typed as it is
  const norm = searchNormalize(t);
  const same = MK_ANSWERS.find(a => searchNormalize(a.question) === norm);
  if (same) return { kind: 'answer', id: same.id, score: Infinity };
  const best = mkScores(t)[0];
  // „ღვთისმსახურება“ is the app's page, not a question of faith
  const faith = isFaithQuestion(t.replace(/ღვთისმსახურ[ა-ჰ]*/g, ' '));
  if (faith && (!best || best.score < FAITH_OVER)) return { kind: 'faith' };
  if (best && best.score >= MK_MIN_SCORE) return { kind: 'answer', id: best.id, score: best.score };
  return { kind: 'none' };
};

/** the same topic's other questions, for the chips under an answer */
export const relatedOf = (id: number, n = 3): number[] => {
  const a = MK_ANSWERS.find(x => x.id === id);
  if (!a) return [];
  const same = MK_ANSWERS.filter(x => x.topic === a.topic && x.id !== id);
  // the ones after it first, then the ones before
  return [...same.filter(x => x.id > id), ...same.filter(x => x.id < id)].slice(0, n).map(x => x.id);
};

// ——— the AI step ———

const dayKey = (uid: string) => `sg-mkitkhe-ai-${uid}-${georgiaToday()}`;
/** AI answers this device may still get today */
export const mkAiLeft = (uid: string): number => {
  try { return Math.max(0, MK_AI_DAILY - (Number(localStorage.getItem(dayKey(uid))) || 0)); } catch { return MK_AI_DAILY; }
};
export const mkAiCount = (uid: string) => {
  try { localStorage.setItem(dayKey(uid), String(MK_AI_DAILY - mkAiLeft(uid) + 1)); } catch { /* storage off */ }
};

/** the app's places the AI is told of (the bottom menu's four and what lies under them) */
const PLACES = [
  'ქვედა მენიუ: მთავარი · გზა · წერილები · პროფილი, და ძებნის ღილაკი.',
  'მთავარი: ვაზი და მისი ღილაკები — ღვთისმსახურება (მსახურებები → საგალობლები → ნოტები), ხალხური, ლოცვანი, ტაძრები, სახალისო (თამაშები), მთქმელი, ბიბლიოთეკა; ზემოთ შეტყობინებები.',
  'ნოტების გვერდი: ქვედა ზოლი — ბგერა, სწავლა, დაკვრა, ტაძარი, მეტი; დამკვრელში ხმები I · II · III და ტემპი; „მეტში“ ტონი, ზომა, ფურცელი, გაზიარება და QR, ჩამოწერა ოფლაინისთვის, PDF და MP3.',
  'გზა (საგანძურის გზა): სამოსი, საგანძური (ნასწავლი, დავალებები, მარგალიტები), ჩვევები, ბიბლიოთეკა, კლასი; კლასის გვერდი — პროგრამა · ჩათი · წევრები, თავში შემდეგი გაკვეთილი; ფსალმუნთა ჯგუფი.',
  'წერილები: პირადი და კლასის ჩატები, ადმინისტრაციასთან მიწერა; ჩატში ხმოვანი წერილი და ზარი.',
  'პროფილი: ფოტო, პირადი ინფორმაცია, ჩემი კლასი, ჩემი ხმა, ჩემი სამოსი, ჩემი ღილაკები; პარამეტრები — შეხსენებები, შეტყობინებები (ჩუმი საათები, დილის შეჯამება), ტექსტის ზომა, იერი, ხუცური, ვიჯეტი, კალენდარი ტელეფონში, აპის დაყენება, გამოსვლა, ანგარიშის წაშლა.',
  'ლოცვანი: დილის და საღამოს ლოცვები, შვიდგზის ლოცვა, ფსალმუნები, სახარება, სამოციქულო, დაუჯდომლები; ლოცვის გვერდზე — ზომა · ღამე · ხუცური · ავტო. კალენდარი: დღის წმინდანები და საკითხავი.',
];

/** The AI's question: the app's places, the 40 ready answers, the rules (only the app, 1–3 sentences, JSON). */
export const mkPrompt = (question: string): string => [
  'შენ ხარ „საგანძურის სკოლის“ აპის დამხმარე „მკითხე“. პასუხობ მხოლოდ იმაზე, სად რა არის ამ აპში და როგორ კეთდება.',
  'აპის ადგილები:',
  ...PLACES,
  'მზა პასუხები (ნომერი. კითხვა — პასუხი):',
  ...MK_ANSWERS.map(a => `${a.id}. ${a.question} — ${a.answer.join(' ')}`),
  'წესები: უპასუხე ქართულად, 1–3 მოკლე წინადადებით, „შენ“-ით, მარტივი სიტყვებით; ღილაკებს და გვერდებს უწოდე ისე, როგორც ზემოთ წერია;',
  'არაფერი გამოიგონო, რაც ზემოთ არ წერია. თუ კითხვა აპზე არ არის (სარწმუნოება, მარხვა, ცხოვრება, სხვა რამ), app = false და text ცარიელი.',
  'target = იმ მზა პასუხის ნომერი, რომლის გვერდზეც უნდა გადავიდეს მომხმარებელი (ან null).',
  'უპასუხე მხოლოდ JSON-ით: {"app": true, "text": "…", "target": 12}.',
  `კითხვა: ${question.slice(0, 300)}`,
].join('\n');

export interface MkAiReply { app: boolean; text: string; target: number | null }

/** The AI's JSON read leniently (a fenced block, extra words around it); null = nothing usable. */
export const parseMkReply = (raw: string): MkAiReply | null => {
  const m = /\{[\s\S]*\}/.exec(raw || '');
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]) as Record<string, unknown>;
    const app = o.app !== false;
    const text = typeof o.text === 'string' ? o.text.replace(/\*+/g, '').replace(/\s+/g, ' ').trim().slice(0, 420) : '';
    const n = typeof o.target === 'number' ? o.target : typeof o.target === 'string' ? Number(o.target) : NaN;
    const target = Number.isInteger(n) && MK_ANSWERS.some(a => a.id === n) ? n : null;
    if (app && !text) return null;
    return { app, text: app ? text : '', target: app ? target : null };
  } catch {
    return null;
  }
};

// ——— „დაგეხმარა?“: the AI's answers kept on the device only (no Firestore) ———

const LOG_KEY = 'sg-mkitkhe-log';
const LOG_MAX = 30;
export interface MkLogLine { q: string; a: string; target: number | null; at: number; helped?: boolean }
export const readMkLog = (): MkLogLine[] => {
  try { const v = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};
/** keeps an AI answer; `helped` set later by the two buttons (matched by its time) */
export const keepMkAnswer = (line: MkLogLine) => {
  try {
    const all = readMkLog().filter(l => l.at !== line.at);
    localStorage.setItem(LOG_KEY, JSON.stringify([...all, line].slice(-LOG_MAX)));
  } catch { /* storage off */ }
};
