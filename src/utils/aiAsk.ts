// „ჰკითხე“ in the AI lesson (board x-ai-kitkhe) — the pure part. A question about the phrase being sung is answered first
// from the school's own material: a few chant words' meanings, the class's approved word questions (utils/lessonPrep.ts),
// where my voice may breathe and why it starts late (both read from the notes). Only when none of these knows is the AI
// asked (components/aiLesson/AskAi.ts). A question of faith is never answered — that is the priest's matter.
// Tested in tests/aiAsk.test.ts.

import { ordinal } from './aiLesson';

export type AskKind = 'meaning' | 'late' | 'breath' | 'free';
export interface AskQuestion {
  kind: AskKind; text: string; word?: string;
  /** typed or said by the member (a ready question is never one of faith) */
  written?: boolean;
}
export type AskSource = 'school' | 'ai' | 'faith';
export interface AskAnswer { text: string; source: AskSource }

export const FAITH_ANSWER = 'ეს სარწმუნოების კითხვაა — ჰკითხე შენს მოძღვარს.';
export const SOURCE_LINE: Record<AskSource, string> = { school: 'სკოლის მასალიდან', ai: 'AI-ს პასუხი', faith: 'მოძღვრის საკითხია' };
export const ASK_SCOPE_LINE = 'პასუხობს მხოლოდ გალობაზე და აპზე';

/** a word as it is compared: lower case, today's letters only (the old ones folded: ჲ goes, ჳ → ვი, ჴ → ხ, ჵ → ო) */
export const foldWord = (w: string) =>
  w.toLowerCase().replace(/ჲ/g, '').replace(/ჳ/g, 'ვი').replace(/ჴ/g, 'ხ').replace(/ჵ/g, 'ო').replace(/[^ა-ჰ]/g, '');

/** the words of a text, old letters kept (hyphenated compounds split) */
export const wordsOf = (text: string) =>
  text.split(/[\s\-–—,.;:!?«»„“"'()[\]]+/).map(w => w.replace(/[^\p{L}]/gu, '')).filter(Boolean);

// ---- faith ----------------------------------------------------------------------------------------------------------

const FAITH_STEMS = ['ღმერთ', 'ღმრთ', 'ღვთ', 'ცოდვ', 'ზიარ', 'მარხვ', 'აღსარებ', 'რწმენ', 'სარწმუნოებ', 'ჯოჯოხეთ', 'სამოთხ',
  'ეშმაკ', 'ცხონებ', 'სასუფევ', 'ნათლობ', 'მოძღვ', 'ღვთისმსახურ'];
// „სული“ is the soul, but „სულის მოთქმა“ is a breath; and „სულ“ alone is „always“
const SOUL = /^სულ(?:ი|ის|ს|ით|მა|იერ|იწმიდ)/;
const BREATHY = /სუნთქ|ითქვ|მოთქვ|მოთქმ/;
const PRAY = /^ლოცვ|^ვილოცო|^ილოცო|^ვლოცულობ/;
const WHY = /^რატომ|^რისთვის|^საჭირო|^უნდა$|^აუცილებ/;

/** a question about faith, not about chant (sin, God, communion, fasting, the soul, why pray…) */
export const isFaithQuestion = (text: string) => {
  const words = wordsOf(text).map(foldWord);
  if (words.some(w => FAITH_STEMS.some(s => w.startsWith(s)))) return true;
  if (!words.some(w => BREATHY.test(w)) && words.some(w => SOUL.test(w))) return true;
  return words.some(w => PRAY.test(w)) && words.some(w => WHY.test(w));
};

// ---- the school's words -------------------------------------------------------------------------------------------

/** the chant words of other tongues whose meaning is certain (written by Claude, unchecked by a teacher) */
export const CHANT_WORDS: { forms: string[]; meaning: string }[] = [
  { forms: ['ალილუია', 'ალელუია'], meaning: '„ალილუია“ ებრაული სიტყვაა და ნიშნავს „ადიდეთ უფალი“.' },
  { forms: ['ამინ'], meaning: '„ამინ“ ებრაული სიტყვაა: „ჭეშმარიტად“, „იყოს ასე“.' },
  { forms: ['ოსანა', 'ჰოსანა'], meaning: '„ოსანა“ ებრაული შეძახილია — „გვიხსენ!“. მერე დიდების შეძახილად იქცა.' },
  { forms: ['საბაოთ'], meaning: '„საბაოთ“ ებრაული სიტყვაა — „ძალთა“: „უფალი საბაოთ“ ნიშნავს „ძალთა უფალს“.' },
  { forms: ['კირიე', 'ელეისონ'], meaning: '„კირიე ელეისონ“ ბერძნულია და ნიშნავს „უფალო, შეგვიწყალე“.' },
];

const formFits = (w: string, form: string) => w === form || (w.startsWith(form) && w.length - form.length <= 3);
export const glossaryOf = (word: string): string | null => {
  const w = foldWord(word);
  if (!w) return null;
  return CHANT_WORDS.find(e => e.forms.some(f => formFits(w, f)))?.meaning ?? null;
};

/** a word's stem for a loose match: its first letters, the ending left off */
const stemOf = (w: string) => { const f = foldWord(w); return f.slice(0, Math.max(4, f.length - 2)); };

/** the class's approved word question about this word, if one names it */
export const prepAnswer = (word: string, questions: { q: string; a: string }[]): string | null => {
  const stem = stemOf(word);
  if (stem.length < 4) return null;
  const hit = questions.find(x => wordsOf(x.q).some(w => foldWord(w).startsWith(stem)));
  return hit ? hit.a : null;
};

/** the word a ready „რას ნიშნავს?“ asks about: one the school knows, else the longest of six letters or more (none of faith) */
export const pickAskWord = (lines: string[]): string | null => {
  const words = lines.flatMap(wordsOf).filter(w => !isFaithQuestion(w));
  const known = words.find(w => foldWord(w).length >= 4 && glossaryOf(w));
  if (known) return known;
  const long = words.filter(w => foldWord(w).length >= 6);
  if (!long.length) return null;
  return long.reduce((a, b) => (foldWord(b).length > foldWord(a).length ? b : a));
};

// ---- from the notes -----------------------------------------------------------------------------------------------

type Note = readonly [beat: number, beats: number, midi: number];
const inPhrase = (line: readonly Note[], b0: number, b1: number) => line.filter(n => n[0] >= b0 - 1e-3 && n[0] < b1 - 1e-3);

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const VOICE_ROLE = ['მთქმელი', 'მოძახილი', 'ბანი'];
export const voiceWord = (i: number) => `${ROMAN[i] ?? i + 1} ხმა${VOICE_ROLE[i] ? ` (${VOICE_ROLE[i]})` : ''}`;

export interface LateStart {
  /** the voice that begins */
  first: number;
  /** seconds after it my voice comes in */
  seconds: number;
  /** that voice's note my voice comes in on (from 1), or after (when it rests then) */
  on: number;
  after: boolean;
}

/** Whether my voice comes in after another in this phrase, and how. */
export const lateStart = (voices: readonly (readonly Note[])[], vi: number, b0: number, b1: number, toSec: (beat: number) => number = b => b): LateStart | null => {
  const mine = inPhrase(voices[vi] ?? [], b0, b1)[0];
  if (!mine) return null;
  let first = -1, at = Infinity;
  voices.forEach((line, i) => {
    if (i === vi) return;
    const n = inPhrase(line, b0, b1)[0];
    if (n && n[0] < at) { at = n[0]; first = i; }
  });
  if (first < 0 || at >= mine[0] - 0.05) return null;
  const theirs = inPhrase(voices[first], b0, b1);
  const sounding = theirs.findIndex(n => n[0] <= mine[0] + 1e-3 && mine[0] < n[0] + n[1] - 1e-3);
  const before = theirs.filter(n => n[0] < mine[0] - 1e-3).length;
  return {
    first,
    seconds: toSec(mine[0]) - toSec(at),
    on: sounding >= 0 ? sounding + 1 : Math.max(1, before),
    after: sounding < 0,
  };
};

export const lateAnswer = (late: LateStart | null): string => {
  if (!late) return 'ამ ფრაზაში შენი ხმა გვიან არ იწყებს — შენც დასაწყისიდან შემოდიხარ.';
  const when = late.seconds < 1 ? 'ცოტა მოგვიანებით' : `${Math.round(late.seconds)} წამის მერე`;
  const where = late.after ? `მისი ${ordinal(late.on)} ნოტის შემდეგ` : `მის ${ordinal(late.on)} ნოტზე`;
  return `ამ ფრაზას ${voiceWord(late.first)} იწყებს, შენი ხმა ${when} შემოდის. ქართულ გალობაში ხშირად ასეა: ერთი ხმა იწყებს, `
    + `დანარჩენები მერე უერთდებიან. მოუსმინე მას და შემოდი ${where}.`;
};

/** Where my voice may breathe in this phrase: its rests (counted by the notes the teacher counts — a repeated pitch is
 *  one), else after its longest note, else before the phrase. */
export const breathAnswer = (line: readonly Note[], b0: number, b1: number): string => {
  const notes = inPhrase(line, b0, b1);
  if (!notes.length) return 'ამ ფრაზაში შენი ხმა არ მღერის — ჩაისუნთქე მშვიდად და შემოდი შემდეგ ფრაზაზე.';
  // each note's place as the teacher counts them
  const place: number[] = [];
  notes.forEach((n, i) => place.push(i === 0 ? 1 : place[i - 1] + (n[2] !== notes[i - 1][2] ? 1 : 0)));
  const rests: number[] = [];
  for (let i = 0; i + 1 < notes.length; i++) {
    if (notes[i + 1][0] - (notes[i][0] + notes[i][1]) >= 0.4 && !rests.includes(place[i])) rests.push(place[i]);
  }
  if (rests.length === 1) return `ამ ფრაზაში შენს ხმას პაუზა აქვს ${ordinal(rests[0])} ნოტის შემდეგ — იქ სწრაფად ჩაისუნთქე. ფრაზის წინ კი ღრმად.`;
  if (rests.length > 1) return `შენს ხმას პაუზები აქვს ${ordinal(rests[0])} და ${ordinal(rests[1])} ნოტის შემდეგ — იქ სწრაფად ჩაისუნთქე. ფრაზის წინ კი ღრმად.`;
  let long = -1;
  for (let i = 0; i + 1 < notes.length; i++) if (notes[i][1] >= 1.5 && (long < 0 || notes[i][1] > notes[long][1])) long = i;
  if (long >= 0) return `ამ ფრაზაში პაუზა არ არის. ფრაზის წინ ღრმად ჩაისუნთქე; თუ არ გეყოფა — ${ordinal(place[long])} ნოტის მერე (ის გრძელია) სწრაფად ჩაისუნთქე.`;
  return 'ფრაზა მოკლეა და პაუზა არ აქვს — ფრაზის წინ ერთხელ ღრმად ჩაისუნთქე და ბოლომდე გეყოფა.';
};

// ---- the questions --------------------------------------------------------------------------------------------------

export const LATE_QUESTION = 'რატომ იწყებს ჩემი ხმა გვიან?';
export const BREATH_QUESTION = 'სად ჩავისუნთქო ამ ფრაზაში?';
export const meaningQuestion = (word: string) => `რას ნიშნავს „${word}“?`;

/** the three ready questions about the phrase: a word's meaning (when the phrase has one to ask), a late start (only
 *  when my voice comes in after another), the breath */
export const readyQuestions = (o: { word: string | null; late: boolean }): AskQuestion[] => [
  ...(o.word ? [{ kind: 'meaning' as const, text: meaningQuestion(o.word), word: o.word }] : []),
  ...(o.late ? [{ kind: 'late' as const, text: LATE_QUESTION }] : []),
  { kind: 'breath', text: BREATH_QUESTION },
];

const ASK_WORDS = /^(რას|რა|არის|ნიშნავს|ნიშნავ|სიტყვა|სიტყვის|მნიშვნელობა|ამ|ეს)$/;

/** what a written question asks: the breath, a late start, a word's meaning, or something else */
export const readQuestion = (text: string): AskQuestion => {
  const t = text.trim();
  const words = wordsOf(t).map(foldWord);
  if (words.some(w => BREATHY.test(w))) return { kind: 'breath', text: t, written: true };
  if (words.some(w => w.startsWith('გვიან')) || /როდის შემოვიდე|როდის შევიდე/.test(t)) return { kind: 'late', text: t, written: true };
  if (/ნიშნავ|მნიშვნელობ/.test(t)) {
    const quoted = t.match(/[„"«]([^“"»]+)[“"»]/)?.[1]?.trim();
    const word = quoted || wordsOf(t).filter(w => !ASK_WORDS.test(w)).sort((a, b) => foldWord(b).length - foldWord(a).length)[0];
    if (word) return { kind: 'meaning', text: t, word, written: true };
  }
  return { kind: 'free', text: t, written: true };
};

/** The answer from the school's own material, or null when it has none (then the AI may be asked). A written question
 *  of faith gets the fixed answer and no AI. */
export const schoolAnswer = (q: AskQuestion, m: { prep: { q: string; a: string }[]; breath: string; late: string }): AskAnswer | null => {
  if (q.written && q.kind !== 'breath' && isFaithQuestion(q.text)) return { text: FAITH_ANSWER, source: 'faith' };
  if (q.kind === 'breath') return { text: m.breath, source: 'school' };
  if (q.kind === 'late') return { text: m.late, source: 'school' };
  if (q.kind === 'meaning' && q.word) {
    const known = glossaryOf(q.word) ?? prepAnswer(q.word, m.prep);
    return known ? { text: known, source: 'school' } : null;
  }
  return null;
};

export const OFFLINE_ANSWER = 'ამაზე პასუხი სკოლის მასალაში ჯერ არ არის, AI-ს კი ინტერნეტი სჭირდება. ინტერნეტთან ერთად კიდევ მკითხე.';
