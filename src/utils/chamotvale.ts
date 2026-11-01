import type { RoundAnswer, RoundRules } from './roundGames';

// „ჩამოთვალე!“ (2026-11-01, the plan's Georgian game №11, like Sporcle): a closed list — the 12 apostles, the map's 13
// regions, the planets — to name from memory against the clock. Every member has its box; a typed name fills it at once,
// a slip of a letter or two is forgiven on „Enter“, and at the end the ones not named show. Alone (my best per list), in a
// class's room (every phone types the same list; a whole list goes in by itself, else what was found when the time runs
// out) and on one phone with teams in turn (the teacher types, a found member takes the team's colour). The lists:
// data/chamotvaleLists.ts; the screens: pages/games/chamotvale/. Kept free of the lists' data: the room's store reads this.

export interface ChamoItem { name: string; alt?: string[]; hint?: string }
export type ChamoTopic = 'kartuli' | 'rtsmena' | 'musika' | 'msoplio' | 'bavshvebi';
export interface ChamoList {
  id: string;
  title: string;
  topic: ChamoTopic;
  items: ChamoItem[];
  /** the songs map's 13 regions, in its order: the map fills as they are named */
  map?: boolean;
  /** a line under the title */
  note?: string;
  /** words near the list that are not in it, with a line on why */
  also?: Record<string, string>;
}

export const CHAMO_TOPICS: readonly { id: ChamoTopic; label: string }[] = [
  { id: 'kartuli', label: 'საქართველო' },
  { id: 'rtsmena', label: 'სარწმუნოება' },
  { id: 'musika', label: 'მუსიკა' },
  { id: 'msoplio', label: 'მსოფლიო' },
  { id: 'bavshvebi', label: 'პატარებს' },
];

export const MAX_ITEMS = 30;

/** a name as typed: letters only (spaces, hyphens and quotes go), lower case */
export const strictName = (s: string) => s.toLowerCase().replace(/[^ა-ჰa-z0-9]+/g, '');
/** a name's key: as typed, a last „ი“ dropped too (დავით = დავითი) */
export const normName = (s: string) => {
  const k = strictName(s);
  return k.length >= 4 && k.endsWith('ი') ? k.slice(0, -1) : k;
};

/** every way of writing a member → the members it may be (two Jameses share „იაკობი“: the first not found yet takes it) */
export const formsOf = (items: readonly ChamoItem[], key: (s: string) => string = normName) => {
  const forms = new Map<string, number[]>();
  items.forEach((it, i) => {
    for (const f of [it.name, ...(it.alt ?? [])]) {
      const k = key(f);
      if (!k) continue;
      const list = forms.get(k) ?? [];
      if (!list.includes(i)) list.push(i);
      forms.set(k, list);
    }
  });
  return forms;
};

/** the edit distance with a swap of two neighbours as one step (optimal string alignment) */
export const editDistance = (a: string, b: string) => {
  const A = [...a], B = [...b];
  const d: number[][] = Array.from({ length: A.length + 1 }, (_, i) => Array.from({ length: B.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= A.length; i++) {
    for (let j = 1; j <= B.length; j++) {
      const cost = A[i - 1] === B[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && A[i - 1] === B[j - 2] && A[i - 2] === B[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[A.length][B.length];
};

/** the slips forgiven in a form of this many letters: none in a short one, one from four letters, two from eight */
export const slipsFor = (len: number) => (len >= 8 ? 2 : len >= 4 ? 1 : 0);

export type Try =
  | { kind: 'found'; item: number }
  | { kind: 'again'; item: number }
  | { kind: 'also'; note: string }
  | { kind: 'none' };

/**
 * A typed text against the list. While typing (`enter` false) only a form written out whole counts (კახეთი, not კახეთ), and
 * not while it may still grow into another member's form (typing „შობა“ waits: „შობა ღვთისმშობლისა“ may follow) — so a
 * name is never taken half-typed. A form that grows into its own member's longer one („რაჭა“ → „რაჭა-ლეჩხუმი“) is taken at
 * once, the rest typed after it is let through (`continuesForm`). On „Enter“ a form counts with or without its last „ი“, a
 * near one too (`slipsFor`) when only one member is that near; a member already found says so, a word of the list's `also`
 * brings its line.
 */
export const tryName = (o: { items: readonly ChamoItem[]; also?: Record<string, string> }, found: readonly boolean[], text: string, enter: boolean): Try => {
  if (!enter) {
    const key = strictName(text);
    if (!key) return { kind: 'none' };
    const forms = formsOf(o.items, strictName);
    const free = (forms.get(key) ?? []).filter(i => !found[i]);
    if (!free.length) return { kind: 'none' };
    const grows = [...forms].some(([f, its]) => f !== key && f.startsWith(key) && its.some(i => !found[i] && i !== free[0]));
    return grows ? { kind: 'none' } : { kind: 'found', item: free[0] };
  }
  const key = normName(text);
  if (!key) return { kind: 'none' };
  const forms = formsOf(o.items);
  const exact = forms.get(key);
  if (exact) {
    const free = exact.filter(i => !found[i]);
    return free.length ? { kind: 'found', item: free[0] } : { kind: 'again', item: exact[0] };
  }
  const also = Object.entries(o.also ?? {}).find(([w]) => normName(w) === key);
  if (also) return { kind: 'also', note: also[1] };
  // a near form: the nearest members (a shared form counts once, as its first free member)
  let best = Infinity;
  let hits = new Set<number>();
  let doneHit = -1;
  for (const [f, its] of forms) {
    const dist = editDistance(key, f);
    if (dist > slipsFor(f.length) || dist > best) continue;
    const free = its.find(i => !found[i]);
    if (dist < best) { best = dist; hits = new Set(); doneHit = -1; }
    if (free !== undefined) hits.add(free);
    else if (doneHit < 0) doneHit = its[0];
  }
  if (hits.size === 1) return { kind: 'found', item: [...hits][0] };
  if (!hits.size && doneHit >= 0) return { kind: 'again', item: doneHit };
  return { kind: 'none' };
};

/** the text typed since a member was taken still spells one of its own forms („რაჭა“ taken, „-ლეჩხუმი“ typed on) */
export const continuesForm = (items: readonly ChamoItem[], item: number, typed: string) => {
  const it = items[item];
  const key = strictName(typed);
  return !!it && !!key && [it.name, ...(it.alt ?? [])].some(f => strictName(f).startsWith(key));
};

/** a list's time: 15 s and 8 s a member, between 40 s and 2½ min */
export const chamoSeconds = (n: number) => Math.min(150, Math.max(40, 15 + 8 * n));

/** the members found, as one int (a bit each) */
export const maskOf = (found: readonly boolean[]) => found.reduce((m, f, i) => (f ? m + 2 ** i : m), 0);
export const foundOf = (mask: number, n: number) => Array.from({ length: n }, (_, i) => Math.floor(mask / 2 ** i) % 2 === 1);
export const countOf = (mask: number, n: number) => foundOf(mask, n).filter(Boolean).length;

// ——— a class's room: the same list on every phone

export interface ChamotvaleQ { kind: 'chamotvale'; id: string; title: string; items: ChamoItem[]; map?: boolean; note?: string; also?: Record<string, string> }

export const toQ = (l: ChamoList): ChamotvaleQ => ({
  kind: 'chamotvale', id: l.id, title: l.title, items: l.items,
  ...(l.map ? { map: true } : {}), ...(l.note ? { note: l.note } : {}), ...(l.also ? { also: l.also } : {}),
});

export const CHAMO_ITEM = 100;
/** 100 a member; the whole list 100 more and up to 300 for the time left */
export const chamoPoints = (q: Pick<ChamotvaleQ, 'items'>, a: Pick<RoundAnswer, 'pick' | 'ms'>, limitMs: number) => {
  const n = q.items.length;
  const got = countOf(a.pick, n);
  if (got < n) return CHAMO_ITEM * got;
  const left = limitMs > 0 ? Math.max(0, 1 - a.ms / limitMs) : 0;
  return CHAMO_ITEM * n + 100 + Math.round(300 * left);
};

const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const itemOk = (it: unknown) => {
  if (!it || typeof it !== 'object') return false;
  const o = it as Partial<ChamoItem>;
  return text(o.name, 80) && (o.alt === undefined || (Array.isArray(o.alt) && o.alt.length <= 12 && o.alt.every(a => text(a, 80))))
    && (o.hint === undefined || text(o.hint, 60));
};

export const CHAMO_RULES: RoundRules<ChamotvaleQ> = {
  steps: () => 1,
  seconds: q => chamoSeconds(q.items.length),
  ok: (q, pick) => Number.isInteger(pick) && pick >= 0 && pick < 2 ** q.items.length,
  points: (q, a, limitMs) => chamoPoints(q, a, limitMs),
  secret: [],
  valid: (q): q is ChamotvaleQ => {
    if (!q || typeof q !== 'object') return false;
    const o = q as Partial<ChamotvaleQ>;
    if (o.kind !== 'chamotvale' || !text(o.id, 80) || !text(o.title, 120)) return false;
    if (!Array.isArray(o.items) || o.items.length < 2 || o.items.length > MAX_ITEMS || !o.items.every(itemOk)) return false;
    if (o.map !== undefined && o.map !== true) return false;
    if (o.note !== undefined && !text(o.note, 200)) return false;
    if (o.also !== undefined) {
      if (!o.also || typeof o.also !== 'object' || Array.isArray(o.also)) return false;
      const e = Object.entries(o.also);
      if (e.length > 20 || !e.every(([w, n]) => text(w, 80) && text(n, 200))) return false;
    }
    return true;
  },
};

/** the one-phone game is teams in turn (pages/games/chamotvale/Teams.tsx); these are the shared screens' marks, never shown */
export const CHAMO_MARKS = [
  { points: 1, label: 'იპოვა' },
  { points: 0, label: 'ვერა' },
] as const;

/**
 * A room's game: `count` lists of the topics chosen (all when none), the ones not played lately on this phone (`seen`)
 * first, else at random.
 */
export const drawChamotvale = (o: {
  lists: readonly ChamoList[]; count: number; topics?: readonly ChamoTopic[]; seen?: readonly string[]; rnd?: () => number;
}): ChamotvaleQ[] => {
  const rnd = o.rnd ?? Math.random;
  const seen = o.seen ?? [];
  const pool = o.lists.filter(l => !o.topics?.length || o.topics.includes(l.topic));
  return pool
    .map(l => ({ l, r: rnd() + (seen.includes(l.id) ? 1 + seen.indexOf(l.id) / Math.max(1, seen.length) : 0) }))
    .sort((a, b) => a.r - b.r)
    .slice(0, Math.max(0, o.count))
    .map(x => toQ(x.l));
};

// ——— one phone, teams in turn

export interface ChamoTeams {
  v: 1;
  q: ChamotvaleQ;
  names: string[];
  /** whose turn it is, and since when (this phone's clock) */
  turn: number;
  t0: number;
  /** a turn's seconds */
  secs: number;
  /** a member's finder (a team), -1 while it is not named */
  owner: number[];
  /** turns passed in a row without a name: once every team has passed, nobody remembers more and the game ends */
  passes: number;
  /** the last turn: who, what it found (-1: passed) */
  last: { team: number; item: number } | null;
  over: boolean;
}

export const TURN_SECONDS = [10, 15, 20, 30] as const;

export const newTeams = (q: ChamotvaleQ, names: string[], secs: number, first = 0, now = Date.now()): ChamoTeams => ({
  v: 1, q, names, turn: first % Math.max(1, names.length), t0: now, secs, owner: q.items.map(() => -1), passes: 0, last: null, over: false,
});

/** the team on turn named a member: it is theirs, the turn goes on (the list whole: the end) */
export const teamFind = (g: ChamoTeams, item: number, now = Date.now()): ChamoTeams => {
  if (g.over || item < 0 || item >= g.owner.length || g.owner[item] >= 0) return g;
  const owner = g.owner.slice();
  owner[item] = g.turn;
  const over = owner.every(o => o >= 0);
  return { ...g, owner, turn: (g.turn + 1) % g.names.length, t0: now, passes: 0, last: { team: g.turn, item }, over };
};

/** the team on turn could not (wrong, or its time ran out): the next one; every team in a row — the end */
export const teamPass = (g: ChamoTeams, now = Date.now()): ChamoTeams => {
  if (g.over) return g;
  const passes = g.passes + 1;
  return { ...g, turn: (g.turn + 1) % g.names.length, t0: now, passes, last: { team: g.turn, item: -1 }, over: passes >= g.names.length };
};

export const teamCounts = (g: Pick<ChamoTeams, 'names' | 'owner'>) => g.names.map((_, t) => g.owner.filter(o => o === t).length);

/** a game read back from this phone (a paused one) */
export const parseTeams = (v: unknown): ChamoTeams | null => {
  const g = v as Partial<ChamoTeams> | null;
  if (!g || g.v !== 1 || !CHAMO_RULES.valid(g.q) || g.over) return null;
  const names = g.names;
  if (!Array.isArray(names) || names.length < 2 || names.length > 6 || !names.every(n => typeof n === 'string')) return null;
  const owner = g.owner;
  if (!Array.isArray(owner) || owner.length !== g.q.items.length || !owner.every(t => Number.isInteger(t) && t >= -1 && t < names.length)) return null;
  if (!Number.isInteger(g.turn) || g.turn! < 0 || g.turn! >= names.length) return null;
  const secs = TURN_SECONDS.includes(g.secs as typeof TURN_SECONDS[number]) ? g.secs! : 15;
  const passes = Number.isInteger(g.passes) && g.passes! >= 0 ? Math.min(g.passes!, names.length - 1) : 0;
  return { v: 1, q: g.q, names, turn: g.turn!, t0: Date.now(), secs, owner, passes, last: null, over: false };
};
