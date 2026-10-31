import type { RoundAnswer, RoundRules } from './roundGames';
import { shuffle } from './amikhseni';
import { LISTEN, MINE, drawGame } from './raSadRodis';

// „ოთხიდან ერთი“ (2026-10-31, the tender's five, like Kahoot): a question and four answers on every phone; whoever picks the
// right one earns points — the quicker, the more (1000 at once, 500 at the very end). The questions: written from the app's
// own texts (data/otkhiQuestions.ts), a recording's „მოისმინე“ (which chant, which feast, which song) and the teacher's own,
// kept on the device. One round of the round games (utils/roundGames.ts); the screens pages/games/otkhi/. Kept free of the
// questions' data, since the room's store (and so this file) is in the app's first bundle.

export { LISTEN, MINE };

/** a question as it is written: the right answer first (a round shows them shuffled) */
export interface OtkhiItem {
  id: string;
  topic: string;
  q: string;
  a: string[];
  /** one line under the answer at the reveal */
  note?: string;
  /** a recording's question: its piece */
  url?: string;
  from?: number;
}

/** one round: the question and its answers in the order shown */
export interface OtkhiQ {
  kind: 'otkhi';
  id: string;
  topic: string;
  q: string;
  /** 2–4 answers */
  options: string[];
  /** the right one, an index of `options` */
  right: number;
  note?: string;
  url?: string;
  /** where the piece starts: a share of the recording's length (each phone plays the same piece) */
  from?: number;
}

export const OTKHI_LETTERS = ['ა', 'ბ', 'გ', 'დ'];
/** the time to answer, and how long a recording's piece plays */
export const OTKHI_SECONDS = 30;
export const OTKHI_CLIP = 20;
export const OTKHI_TOP = 1000;
export const Q_MAX = 300;
export const A_MAX = 80;
export const MINE_MAX = 200;
/** how many asked questions the device remembers, so the next games ask others first */
export const SEEN_KEEP = 80;

/** the right answer 500–1000: the quicker, the more; a wrong one nothing */
export const otkhiPoints = (q: Pick<OtkhiQ, 'right'>, a: Pick<RoundAnswer, 'pick' | 'ms'>, limitMs: number) => {
  if (a.pick !== q.right) return 0;
  const late = limitMs > 0 ? Math.min(1, Math.max(0, a.ms / limitMs)) : 1;
  return Math.round(OTKHI_TOP * (1 - late / 2));
};

const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isIndex = (n: unknown, len: number) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < len;

export const OTKHI_RULES: RoundRules<OtkhiQ> = {
  steps: () => 1,
  seconds: () => OTKHI_SECONDS,
  ok: (q, pick) => isIndex(pick, q.options.length),
  points: otkhiPoints,
  secret: ['id', 'right', 'note'],
  valid: (q): q is OtkhiQ => {
    const o = q as Partial<OtkhiQ>;
    return o.kind === 'otkhi' && text(o.id, 120) && text(o.topic, 40) && text(o.q, Q_MAX + 60)
      && Array.isArray(o.options) && o.options.length >= 2 && o.options.length <= 4 && o.options.every(x => text(x, A_MAX + 60))
      && isIndex(o.right, o.options.length)
      && (o.note === undefined || text(o.note, Q_MAX + 60))
      && (o.url === undefined || text(o.url, 400))
      && (o.from === undefined || (typeof o.from === 'number' && o.from >= 0 && o.from < 1));
  },
};

/** two answers are the same when they differ only in brackets, quotes, signs or case */
export const answerKey = (s: string) => s.replace(/\([^)]*\)/g, ' ').toLowerCase().replace(/[„“"'«».,!?;:–—\-]/g, ' ').replace(/\s+/g, ' ').trim();

/** A written (or the teacher's own) question as a round: the right answer and up to three others, in a new order. */
export const toRound = (item: OtkhiItem, rnd: () => number = Math.random): OtkhiQ | null => {
  const seen = new Set<string>();
  const answers: string[] = [];
  item.a.forEach(a => {
    const t = a.trim();
    const k = answerKey(t);
    if (t && k && !seen.has(k)) { seen.add(k); answers.push(t); }
  });
  if (answers.length < 2 || !item.q.trim()) return null;
  const options = shuffle([answers[0], ...shuffle(answers.slice(1), rnd).slice(0, 3)], rnd);
  return {
    kind: 'otkhi', id: item.id, topic: item.topic, q: item.q.trim(), options, right: options.indexOf(answers[0]),
    ...(item.note ? { note: item.note } : {}),
    ...(item.url ? { url: item.url, from: item.from ?? 0.2 } : {}),
  };
};

/** a recording of the school, as data/hangiPool.ts gives it */
export interface ListenSource { id: string; title: string; sub: string; url: string; kind: 'chant' | 'song' }

const feastOf = (p: ListenSource) => p.title.split(' — ')[0].trim();
const serviceOf = (p: ListenSource) => p.sub.split(' · ')[0];

/**
 * A recording as a question of four answers: a feast's chant asks for the feast, another chant for its name, a song for
 * its name. The wrong answers are others of the same kind (a chant's from its own service while there are enough); none of
 * them is the right one under another spelling. Null when three wrong ones are not to be found.
 */
export const listenItem = (item: ListenSource, pool: ListenSource[], rnd: () => number = Math.random): OtkhiItem | null => {
  let q: string;
  let right: string;
  let others: string[];
  if (item.kind === 'song') {
    q = 'მოისმინე ნაწყვეტი. რომელი სიმღერაა?';
    right = item.title;
    others = pool.filter(p => p.kind === 'song').map(p => p.title);
  } else if (serviceOf(item) === 'სადღესასწაულო') {
    q = 'მოისმინე ნაწყვეტი. რომელი დღესასწაულის საგალობელია?';
    right = feastOf(item);
    others = pool.filter(p => p.kind === 'chant' && serviceOf(p) === 'სადღესასწაულო').map(feastOf);
  } else {
    q = 'მოისმინე ნაწყვეტი. რომელი საგალობელია?';
    right = item.title;
    const chants = pool.filter(p => p.kind === 'chant' && serviceOf(p) !== 'სადღესასწაულო');
    const same = chants.filter(p => serviceOf(p) === serviceOf(item)).map(p => p.title);
    others = new Set(same.map(answerKey).filter(k => k !== answerKey(right))).size >= 3 ? same : chants.map(p => p.title);
  }
  const rightKey = answerKey(right);
  const wrong = new Map<string, string>();
  shuffle(others, rnd).forEach(t => { const k = answerKey(t); if (k && k !== rightKey && !wrong.has(k)) wrong.set(k, t); });
  if (!right.trim() || wrong.size < 3) return null;
  return { id: `l:${item.id}`, topic: LISTEN, q, a: [right, ...[...wrong.values()].slice(0, 3)], note: item.sub, url: item.url, from: 0.05 + rnd() * 0.5 };
};

/**
 * A game's rounds: for every slot of the topics' plan a question of its topic not asked before (else the one asked longest
 * ago — utils/raSadRodis.ts `drawGame`), for a LISTEN slot one made from a recording not in this game yet.
 */
export const drawOtkhi = ({ bank, topics, count, seen, pool = [], rnd = Math.random }: {
  bank: OtkhiItem[];
  topics: string[];
  count: number;
  /** ids asked in earlier games, oldest first */
  seen: string[];
  /** the recordings for the LISTEN topic */
  pool?: ListenSource[];
  rnd?: () => number;
}): OtkhiQ[] => {
  const listen = (used: Set<string>): OtkhiItem | null => {
    const rest = shuffle(pool.filter(p => !used.has(`l:${p.id}`)), rnd);
    for (const p of rest.slice(0, 12)) {
      const item = listenItem(p, pool, rnd);
      if (item) return item;
    }
    return null;
  };
  return drawGame<OtkhiItem>({ bank, topics, count, seen, listen, rnd })
    .map(item => toRound(item, rnd))
    .filter((q): q is OtkhiQ => !!q);
};

/** The asked ids to remember (a recording's are not kept: those are drawn afresh), oldest first, at most SEEN_KEEP. */
export const rememberOtkhi = (seen: string[], asked: string[]): string[] => {
  const keep = asked.filter(id => !id.startsWith('l:'));
  return [...seen.filter(id => !keep.includes(id)), ...keep].slice(-SEEN_KEEP);
};

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** The teacher's own questions as the device keeps them (the right answer first, 1–3 wrong ones); anything broken is left out. */
export const parseMine = (raw: unknown): OtkhiItem[] => {
  if (!Array.isArray(raw)) return [];
  const out: OtkhiItem[] = [];
  raw.forEach(o => {
    const r = (o ?? {}) as Record<string, unknown>;
    const id = str(r.id, 40), q = str(r.q, Q_MAX), note = str(r.note, Q_MAX);
    const a = Array.isArray(r.a) ? r.a.map(x => str(x, A_MAX)) : [];
    if (!id.startsWith('m:') || !q || !a[0] || a.slice(1).filter(Boolean).length < 1 || out.some(x => x.id === id)) return;
    const answers = [a[0], ...a.slice(1).filter(Boolean)].slice(0, 4);
    out.push(note ? { id, topic: MINE, q, a: answers, note } : { id, topic: MINE, q, a: answers });
  });
  return out.slice(0, MINE_MAX);
};
