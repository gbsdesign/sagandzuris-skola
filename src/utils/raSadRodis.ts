// „რა? სად? როდის?“ — the team quiz of the games hub (2026-10-28, hybrid): every team answers the same question on paper
// in one minute, the host's phone shows it, counts the minute with a bell, shows the answer and keeps the points. These
// helpers are pure and tested in tests/raSadRodis.test.ts; the page is pages/games/RaSadRodisGame.tsx, the written questions
// data/raSadRodisQuestions.ts, the recordings of the „მოისმინე“ questions data/hangiPool.ts.
import type { RsrQuestion } from '../data/raSadRodisQuestions';
import type { RoundAnswer, RoundRules } from './roundGames';
import { shuffle } from './amikhseni';
import { editDistance } from './chamotvale';

/** the topic of the questions made from a recording of the school */
export const LISTEN = 'mosmena';
/** the topic of the teacher's own questions, kept on the device */
export const MINE = 'chemi';

export interface RsrAudio { url: string; title: string; sub: string }
/** a question of a game: written, the teacher's own, or made from a recording */
export interface RsrPlay extends RsrQuestion { audio?: RsrAudio }

export interface RsrSettings {
  teams: number;
  count: number;
  /** the chosen topics; none chosen = all */
  topics: string[];
}

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 6;
export const COUNT_CHOICES = [6, 12, 18];
export const DEFAULT_SETTINGS: RsrSettings = { teams: 3, count: 12, topics: [] };
/** the minute to think, and when the last seconds start ticking */
export const SECONDS = 60;
export const WARN_AT = 10;
/** how long a recording's piece plays */
export const SNIPPET = 20;
/** how many asked questions the device remembers, so the next games ask others first */
export const SEEN_KEEP = 60;
export const MINE_MAX = 200;
export const Q_MAX = 300;
export const A_MAX = 120;

/** The topics of `count` slots: the chosen ones in a shuffled round, again and again, never the same twice in a row. */
export const topicPlan = (topics: string[], count: number, rnd: () => number = Math.random): string[] => {
  const out: string[] = [];
  if (!topics.length) return out;
  while (out.length < count) {
    const round = shuffle(topics, rnd);
    if (round.length > 1 && round[0] === out[out.length - 1]) [round[0], round[1]] = [round[1], round[0]];
    out.push(...round);
  }
  return out.slice(0, count);
};

/**
 * The game's questions: for every slot of the plan a question of its topic not asked before (else the one asked longest
 * ago), for a LISTEN slot one made from a recording; a topic that runs dry gives its slot to another. „ოთხიდან ერთი“
 * (utils/otkhi.ts) draws its questions the same way.
 */
export const drawGame = <T extends { id: string; topic: string }>({ bank, topics, count, seen, listen, rnd = Math.random }: {
  bank: T[];
  topics: string[];
  count: number;
  /** ids asked in earlier games, oldest first */
  seen: string[];
  /** makes a recording's question that is not one of `used` yet; null when none is left */
  listen?: (used: Set<string>) => T | null;
  rnd?: () => number;
}): T[] => {
  const age = new Map(seen.map((id, i) => [id, i]));
  const used = new Set<string>();
  const out: T[] = [];
  const pickOf = (topic: string): T | null => {
    if (topic === LISTEN) return listen?.(used) ?? null;
    const left = bank.filter(q => q.topic === topic && !used.has(q.id));
    if (!left.length) return null;
    const fresh = left.filter(q => !age.has(q.id));
    if (fresh.length) return fresh[Math.floor(rnd() * fresh.length)];
    return left.reduce((a, b) => ((age.get(a.id) ?? 0) <= (age.get(b.id) ?? 0) ? a : b));
  };
  for (const topic of topicPlan(topics, count, rnd)) {
    const q = pickOf(topic) ?? shuffle(topics.filter(t => t !== topic), rnd).reduce<T | null>((got, t) => got ?? pickOf(t), null);
    if (!q) break;
    used.add(q.id);
    out.push(q);
  }
  return out;
};

/** A recording of the pool as a question: a feast's chant asks for the feast, another chant for its name, a song for its region. */
export const listenQuestion = (item: { id: string; title: string; sub: string; url: string; kind: 'chant' | 'song' }): RsrPlay => {
  const audio = { url: item.url, title: item.title, sub: item.sub };
  const id = `l:${item.id}`;
  const [service, rest] = item.sub.split(' · ');
  if (item.kind === 'song') {
    if (rest && rest !== 'ქალაქური') return { id, topic: LISTEN, q: 'მოისმინეთ ნაწყვეტი. რომელი კუთხის სიმღერაა?', a: rest, note: `„${item.title}“`, audio };
    return { id, topic: LISTEN, q: 'მოისმინეთ ნაწყვეტი. რომელი სიმღერაა?', a: item.title, note: item.sub, audio };
  }
  if (service === 'სადღესასწაულო') {
    const [feast, when] = item.title.split(' — ');
    return { id, topic: LISTEN, q: 'მოისმინეთ ნაწყვეტი. რომელი დღესასწაულის საგალობელია?', a: feast, note: [when, rest].filter(Boolean).join(' · '), audio };
  }
  return { id, topic: LISTEN, q: 'მოისმინეთ ნაწყვეტი. რომელი საგალობელია?', a: item.title, note: item.sub, audio };
};

/** Points of each team: one for every question it answered right. */
export const scoresOf = (marks: number[][], teams: number): number[] => {
  const s = Array.from({ length: teams }, () => 0);
  marks.forEach(m => m.forEach(t => { if (t >= 0 && t < teams) s[t] += 1; }));
  return s;
};

/** Each team's place: equal points share one (5, 5, 3 → 1, 1, 3). */
export const placesOf = (scores: number[]): number[] => scores.map(s => 1 + scores.filter(o => o > s).length);

/** The asked ids to remember (a recording's are not kept: those are drawn afresh), oldest first, at most SEEN_KEEP. */
export const rememberSeen = (seen: string[], asked: string[]): string[] => {
  const keep = asked.filter(id => !id.startsWith('l:'));
  return [...seen.filter(id => !keep.includes(id)), ...keep].slice(-SEEN_KEEP);
};

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** The teacher's own questions as the device keeps them; anything broken is left out. */
export const parseMine = (raw: unknown): RsrQuestion[] => {
  if (!Array.isArray(raw)) return [];
  const out: RsrQuestion[] = [];
  raw.forEach(o => {
    const r = (o ?? {}) as Record<string, unknown>;
    const id = str(r.id, 40), q = str(r.q, Q_MAX), a = str(r.a, A_MAX), note = str(r.note, Q_MAX);
    if (!id.startsWith('m:') || !q || !a || out.some(x => x.id === id)) return;
    out.push(note ? { id, topic: MINE, q, a, note } : { id, topic: MINE, q, a });
  });
  return out.slice(0, MINE_MAX);
};

export type RsrPhase = 'ask' | 'answer' | 'end';

/** A game in play, kept on the device so a closed page can go on where it stopped. */
export interface RsrGame {
  names: string[];
  questions: RsrPlay[];
  index: number;
  /** for every question: the teams that answered it right */
  marks: number[][];
  phase: RsrPhase;
}

/** A kept game read back; null when it is broken or of another shape. */
export const parseGame = (raw: unknown): RsrGame | null => {
  const g = (raw ?? {}) as Partial<RsrGame>;
  if (!Array.isArray(g.names) || g.names.length < MIN_TEAMS || g.names.length > MAX_TEAMS || !g.names.every(n => typeof n === 'string')) return null;
  if (!Array.isArray(g.questions) || !g.questions.length || !g.questions.every(q => q && typeof q.q === 'string' && typeof q.a === 'string' && typeof q.id === 'string')) return null;
  if (!Array.isArray(g.marks) || g.marks.length !== g.questions.length || !g.marks.every(m => Array.isArray(m) && m.every(t => Number.isInteger(t)))) return null;
  if (!Number.isInteger(g.index) || (g.index as number) < 0 || (g.index as number) >= g.questions.length) return null;
  if (g.phase !== 'ask' && g.phase !== 'answer' && g.phase !== 'end') return null;
  return { names: g.names, questions: g.questions, index: g.index as number, marks: g.marks, phase: g.phase };
};

// ——— online (2026-11-04): a class's room over the quick games' engine (utils/roundGames.ts). Every player writes the
// answer on their own phone within the minute; at the reveal the words are judged by `rsrMatch` and the host may judge
// each one again — a right answer is one point, as on paper.

/** a round online: the question, its answer (secret until the reveal) and for a „მოისმინე“ one the recording's piece —
 *  `from`, the share of the recording where it starts, the same on every phone */
export interface RsrQ {
  kind: 'rsr';
  id: string;
  topic: string;
  q: string;
  a: string;
  note?: string;
  url?: string;
  from?: number;
}

/** a question of the game as a round of the room */
export const toRsrRound = (p: RsrPlay, rnd: () => number = Math.random): RsrQ => ({
  kind: 'rsr', id: p.id, topic: p.topic, q: p.q, a: p.a,
  ...(p.note ? { note: p.note } : {}),
  ...(p.audio ? { url: p.audio.url, from: 0.05 + rnd() * 0.5 } : {}),
});

// the answer and the words written, as tokens: letters and digits only, numerals (III, მესამე, ორმოცი) as digits
const NOT_WORD = /[^0-9a-zა-ჺ]+/g;
const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
const CARDINAL: Record<string, number> = {
  ერთი: 1, ორი: 2, სამი: 3, სამ: 3, ოთხი: 4, ოთხ: 4, ხუთი: 5, ხუთ: 5, ექვსი: 6, შვიდი: 7, რვა: 8, ცხრა: 9, ათი: 10,
  თერთმეტი: 11, თორმეტი: 12, ოცი: 20, ორმოცი: 40, ასი: 100,
};
const ORDINAL = ['პირველ', 'მეორე', 'მესამე', 'მეოთხე', 'მეხუთე', 'მეექვსე', 'მეშვიდე', 'მერვე', 'მეცხრე', 'მეათე', 'მეთერთმეტე', 'მეთორმეტე'];
const numeral = (t: string): string => {
  if (ROMAN[t]) return String(ROMAN[t]);
  if (CARDINAL[t]) return String(CARDINAL[t]);
  const o = ORDINAL.findIndex(w => t.startsWith(w) && t.length - w.length <= 3);
  return o >= 0 ? String(o + 1) : t;
};
const tokens = (s: string) => s.toLowerCase().replace(NOT_WORD, ' ').trim().split(' ').filter(Boolean).map(numeral);
const isNumber = (t: string) => /^\d+$/.test(t);

// a case's ending off a word (the longest that leaves three letters), so ფარნავაზს, ფარნავაზი and ფარნავაზმა are one
const ENDINGS = [
  'ებისთვის', 'ისთვის', 'თვის', 'ებიდან', 'იდან', 'დან', 'ებამდე', 'ამდე', 'მდე', 'ებისგან', 'ისგან', 'სგან', 'ებთან', 'თან',
  'ებში', 'ში', 'ებზე', 'ზე', 'ებით', 'ით', 'ებად', 'ად', 'ების', 'ის', 'ებმა', 'მა', 'ებს', 'ები', 'ებო', 'ს', 'ი', 'მ', 'ო', 'დ', 'თ',
];
export const stemOf = (w: string) => {
  if (isNumber(w)) return w;
  const e = ENDINGS.find(x => w.endsWith(x) && w.length - x.length >= 3);
  return e ? w.slice(0, -e.length) : w;
};
/** two words are one: the same stem, or a long one with one slip (მონასტერი · მონასტრის) */
export const sameWord = (a: string, b: string) => {
  if (isNumber(a) || isNumber(b)) return a === b;
  const x = stemOf(a), y = stemOf(b);
  return x === y || (Math.min(x.length, y.length) >= 6 && editDistance(x, y) <= 1);
};

// words an answer may go without (titles, kinds, units): „ქეთევანი“ is „ქეთევან დედოფალი“
const LIGHT = [
  'და', 'ან', 'წმიდა', 'წმინდა', 'მეფე', 'დედოფალი', 'მონასტერი', 'ქალაქი', 'სოფელი', 'მთა', 'მდინარე', 'ტბა', 'ციხე',
  'ტაძარი', 'ეკლესია', 'ბრძოლა', 'წელი', 'დღე', 'საუკუნე', 'თვე', 'კვირა',
];
const MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
const isLight = (t: string) => LIGHT.some(w => sameWord(t, w));
const isMonth = (t: string) => MONTHS.some(w => sameWord(t, w));

/** the forms an answer is accepted in: the words outside its brackets, and each bracket's */
export const answerForms = (answer: string): string[][] => {
  const inner = [...answer.matchAll(/\(([^)]*)\)/g)].map(m => m[1]);
  return [answer.replace(/\([^)]*\)/g, ' '), ...inner].map(tokens).filter(f => f.length > 0);
};

/** how many weighty words more than the answer's a written one may have („მგონი, ქეთევან დედოფალი“) — a list of guesses
 *  is none */
export const RSR_EXTRA = 3;

/**
 * Are the words written the answer? The host's helper (the host judges again at the reveal): every number of the answer
 * written (with its month, if it has one — „26 მაისს“), else three quarters of its weighty words, each in any case or
 * with one slip in a long one. A question asking two things (who and where) wants both. Words written past the answer's
 * own and `extra` more are a list of guesses, not an answer.
 */
export const rsrMatch = (answer: string, written: string, extra = RSR_EXTRA): boolean => {
  const said = tokens(written);
  if (!said.length) return false;
  // a written word may end in the copula too: „ფარნავაზია“, „ჩონგურია“, „ღვინოა“
  const has = (t: string) => said.some(w => sameWord(t, w) || (w.length > 3 && w.endsWith('ა') && sameWord(t, w.slice(0, -1))));
  // the written words that weigh (a short or a light one — „ეს“, „მეფე“ — does not), against a list of guesses
  const loud = said.filter(t => t.length >= 3 && !isLight(t)).length;
  return answerForms(answer).some(form => {
    if (loud > form.length + extra) return false;
    const numbers = form.filter(isNumber);
    if (numbers.length) return numbers.every(has) && form.filter(isMonth).every(has);
    const weighty = form.filter(t => t.length >= 3 && !isLight(t));
    const keys = weighty.length ? weighty : form.filter(t => t.length >= 2);
    if (!keys.length) return false;
    return keys.filter(has).length >= Math.ceil(keys.length * 0.75);
  });
};

/** the minute, one point a right answer; what the players may not see while it is asked: the answer, its note, its id */
export const RSR_RULES: RoundRules<RsrQ> = {
  steps: () => 1,
  seconds: () => SECONDS,
  ok: () => true,
  typed: true,
  points: (q, a: RoundAnswer) => ((a.ok ?? rsrMatch(q.a, a.text ?? '')) ? 1 : 0),
  secret: ['id', 'a', 'note'],
  valid: (q): q is RsrQ => {
    const o = q as Partial<RsrQ>;
    const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
    return o.kind === 'rsr' && text(o.id, 120) && text(o.topic, 40) && text(o.q, Q_MAX + 60) && text(o.a, A_MAX + 60)
      && (o.note === undefined || text(o.note, Q_MAX + 60))
      && (o.url === undefined || text(o.url, 400))
      && (o.from === undefined || (typeof o.from === 'number' && o.from >= 0 && o.from < 1));
  },
};
