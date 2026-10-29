// „რა? სად? როდის?“ — the team quiz of the games hub (2026-10-28, hybrid): every team answers the same question on paper
// in one minute, the host's phone shows it, counts the minute with a bell, shows the answer and keeps the points. These
// helpers are pure and tested in tests/raSadRodis.test.ts; the page is pages/games/RaSadRodisGame.tsx, the written questions
// data/raSadRodisQuestions.ts, the recordings of the „მოისმინე“ questions data/hangiPool.ts.
import type { RsrQuestion } from '../data/raSadRodisQuestions';
import { shuffle } from './amikhseni';

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
 * ago), for a LISTEN slot one made from a recording; a topic that runs dry gives its slot to another.
 */
export const drawGame = ({ bank, topics, count, seen, listen, rnd = Math.random }: {
  bank: RsrQuestion[];
  topics: string[];
  count: number;
  /** ids asked in earlier games, oldest first */
  seen: string[];
  /** makes a recording's question that is not one of `used` yet; null when none is left */
  listen?: (used: Set<string>) => RsrPlay | null;
  rnd?: () => number;
}): RsrPlay[] => {
  const age = new Map(seen.map((id, i) => [id, i]));
  const used = new Set<string>();
  const out: RsrPlay[] = [];
  const pickOf = (topic: string): RsrPlay | null => {
    if (topic === LISTEN) return listen?.(used) ?? null;
    const left = bank.filter(q => q.topic === topic && !used.has(q.id));
    if (!left.length) return null;
    const fresh = left.filter(q => !age.has(q.id));
    if (fresh.length) return fresh[Math.floor(rnd() * fresh.length)];
    return left.reduce((a, b) => ((age.get(a.id) ?? 0) <= (age.get(b.id) ?? 0) ? a : b));
  };
  for (const topic of topicPlan(topics, count, rnd)) {
    const q = pickOf(topic) ?? shuffle(topics.filter(t => t !== topic), rnd).reduce<RsrPlay | null>((got, t) => got ?? pickOf(t), null);
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
