import { dayNumber, hangiStats, hash32, type HangiDay } from './hangi';
import { mulberry32, shuffle } from './otkheuli';
import { answerKey } from './otkhi';

// „საგანძურის ძებნა“ (2026-11-04, the plan's №5, like Geocaching or a school's treasure hunt): stations, a task at each, and
// for every task solved a letter of the treasure's word; the letters come scrambled, the word opens the chest.
// In the yard („ჰიბრიდული“) the teacher prints the stations' cards (a QR code each) and hides them; a team's phone opens a
// card's task by its code, a right answer gives the team its letter — every team has a word of its own — and where the next
// card hides; the teacher's phone is the chest: it knows every team's word and keeps the time. Nothing goes through a server:
// the hunt is an eight-digit code (the seed, the stations, the teams, the kinds of tasks) and every phone works it out alike.
// In the app („ონლაინ“) the day's hunt goes across Georgia's map: a station is a region found by its places, then its task.
// Pure; tests in tests/dzebna.test.ts.

export type TaskKind = 'quiz' | 'region' | 'year' | 'old' | 'chant';
export const TASK_KINDS: readonly TaskKind[] = ['quiz', 'region', 'year', 'old', 'chant'];
export const KIND_LABEL: Record<TaskKind, string> = { quiz: 'კითხვა', region: 'კუთხე', year: 'დრო', old: 'ხუცური', chant: 'მოისმინე' };
export const KIND_HINT: Record<TaskKind, string> = {
  quiz: 'ოთხი პასუხიდან ერთი',
  region: 'რომელ კუთხეშია?',
  year: 'რა მოხდა ყველაზე ადრე?',
  old: 'წაიკითხე ძველი ასოებით',
  chant: 'რომელი საგალობელი ჟღერს?',
};
export const isTaskKind = (v: unknown): v is TaskKind => typeof v === 'string' && (TASK_KINDS as readonly string[]).includes(v);

/** a station's task: a question and its answers in the order shown */
export interface Task {
  kind: TaskKind;
  /** the pool's item it was made of */
  id: string;
  ask: string;
  /** a word in old letters to read (kind „ხუცური“) */
  old?: { word: string; script: 'nuskhuri' | 'asomtavruli' };
  /** a chant's opening to hear on the synthesizer (kind „მოისმინე“) */
  tune?: { book: string; num: number };
  options: string[];
  /** the right one, an index of `options` */
  right: number;
  /** a line or two shown once it is solved */
  note?: string;
}

// ---------- what the tasks are made of (data/dzebnaPools.ts gathers them from the app) ----------
/** a written question, the right answer first */
export interface QuizSource { id: string; q: string; a: string[]; note?: string }
/** a place and its region (an index of the songs map's regions, utils/kutkhe.ts KUTKHE_REGIONS) */
export interface PlaceSource { id: string; topic: string; name: string; region: number; note?: string }
/** an event with its year */
export interface YearSource { id: string; text: string; when: number; label: string }
export interface ChantSource { id: string; title: string; service: string; book: string; num: number }
export interface DzebnaPools {
  quiz: QuizSource[];
  places: PlaceSource[];
  /** the regions' names, as the options say them */
  regionNames: string[];
  year: YearSource[];
  /** words to read in old letters */
  old: string[];
  chant: ChantSource[];
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const rndOf = (s: string) => mulberry32(hash32(s));

/** how a place is asked by its topic (data/rukaPlaces.ts's topics) */
export const placeAsk = (p: Pick<PlaceSource, 'topic' | 'name'>) =>
  p.topic === 'people' ? `რომელ კუთხეში დაიბადა ${p.name}?`
  : p.topic === 'food' ? `რომელი კუთხისაა „${p.name}“?`
  : p.topic === 'history' ? `რომელ კუთხეს უკავშირდება „${p.name}“?`
  : `რომელ კუთხეშია „${p.name}“?`;

const quizTask = (q: QuizSource, rnd: () => number): Task | null => {
  const seen = new Set<string>();
  const answers: string[] = [];
  q.a.forEach(a => {
    const t = a.trim();
    const k = answerKey(t);
    if (t && k && !seen.has(k)) { seen.add(k); answers.push(t); }
  });
  if (answers.length < 2 || !q.q.trim()) return null;
  const options = shuffle([answers[0], ...shuffle(answers.slice(1), rnd).slice(0, 3)], rnd);
  return { kind: 'quiz', id: q.id, ask: q.q.trim(), options, right: options.indexOf(answers[0]), ...(q.note ? { note: q.note } : {}) };
};

const placeTask = (p: PlaceSource, names: readonly string[], rnd: () => number): Task | null => {
  if (!names[p.region]) return null;
  const others = shuffle(range(names.length).filter(i => i !== p.region), rnd).slice(0, 3);
  const order = shuffle([p.region, ...others], rnd);
  return { kind: 'region', id: p.id, ask: placeAsk(p), options: order.map(i => names[i]), right: order.indexOf(p.region), ...(p.note ? { note: p.note } : {}) };
};

/** three events of different years: which came first; the note lists them in time */
const yearTask = (events: YearSource[], rnd: () => number): Task | null => {
  if (events.length < 3 || new Set(events.map(e => e.when)).size < 3) return null;
  const order = shuffle(events, rnd);
  const first = events.reduce((a, b) => (b.when < a.when ? b : a));
  const inTime = [...events].sort((a, b) => a.when - b.when);
  return {
    kind: 'year', id: events.map(e => e.id).join('+'), ask: 'რომელი მოხდა ყველაზე ადრე?',
    options: order.map(e => e.text), right: order.indexOf(first),
    note: inTime.map(e => `${e.label} — ${e.text}`).join('\n'),
  };
};

const letterCount = (w: string) => [...w].length;

const oldTask = (word: string, pool: readonly string[], rnd: () => number): Task | null => {
  const n = letterCount(word);
  const near = (d: number) => pool.filter(w => w !== word && Math.abs(letterCount(w) - n) <= d);
  const others = shuffle(near(0).length >= 3 ? near(0) : near(1), rnd).slice(0, 3);
  if (others.length < 3) return null;
  const options = shuffle([word, ...others], rnd);
  const script = rnd() < 0.5 ? 'asomtavruli' : 'nuskhuri';
  return { kind: 'old', id: word, ask: 'რა წერია ძველი ასოებით?', old: { word, script }, options, right: options.indexOf(word) };
};

const chantTask = (c: ChantSource, pool: readonly ChantSource[], rnd: () => number): Task | null => {
  const key = (t: string) => answerKey(t);
  const taken = new Set([key(c.title)]);
  const others: string[] = [];
  // the wrong three of the same service first (two vespers' chants are harder to tell apart than a vespers' and a Liturgy's)
  const pick = (list: readonly ChantSource[]) => shuffle([...list], rnd).forEach(x => {
    if (others.length < 3 && !taken.has(key(x.title))) { taken.add(key(x.title)); others.push(x.title); }
  });
  pick(pool.filter(x => x.service === c.service && x.id !== c.id));
  pick(pool.filter(x => x.id !== c.id));
  if (others.length < 3) return null;
  const options = shuffle([c.title, ...others], rnd);
  return {
    kind: 'chant', id: c.id, ask: 'რომელი საგალობელი ჟღერს?', tune: { book: c.book, num: c.num },
    options, right: options.indexOf(c.title), note: c.service,
  };
};

/** the kinds of the stations in turn: the chosen kinds in an order of the seed, round and round */
export const kindsOf = (seed: number, kinds: readonly TaskKind[], n: number): TaskKind[] => {
  const order = shuffle([...kinds], rndOf(`dzebna-kinds|${seed}`));
  return range(n).map(s => order[s % order.length]);
};

const poolSize = (p: DzebnaPools, kind: TaskKind) =>
  kind === 'quiz' ? p.quiz.length : kind === 'region' ? p.places.length : kind === 'year' ? Math.floor(p.year.length / 3)
  : kind === 'old' ? p.old.length : p.chant.length;

/** the task of the stations' `s`-th: the j-th station of its kind takes the j-th item of the kind's pool in an order of the
 *  seed, so no item comes twice in one hunt (while the pool lasts); an item that makes no task gives way to the next */
export const taskAt = (p: DzebnaPools, seed: number, kinds: readonly TaskKind[], s: number): Task | null => {
  const kind = kinds[s];
  if (!kind) return null;
  const size = poolSize(p, kind);
  if (!size) return null;
  const j = kinds.slice(0, s).filter(k => k === kind).length;
  const order = shuffle(range(size), rndOf(`dzebna-pool|${seed}|${kind}`));
  const rnd = rndOf(`dzebna-task|${seed}|${s}`);
  for (let k = 0; k < Math.min(size, 12); k++) {
    const i = order[(j + k * kinds.length) % size];
    const t = kind === 'quiz' ? quizTask(p.quiz[i], rnd)
      : kind === 'region' ? placeTask(p.places[i], p.regionNames, rnd)
      : kind === 'year' ? yearTask(p.year.slice(i * 3, i * 3 + 3), rnd)
      : kind === 'old' ? oldTask(p.old[i], p.old, rnd)
      : chantTask(p.chant[i], p.chant, rnd);
    if (t) return t;
  }
  return null;
};

// ---------- the yard's hunt: its code ----------
export const MIN_STATIONS = 4;
export const MAX_STATIONS = 8;
export const MAX_TEAMS = 6;
export const SEEDS = 1024;

export interface HuntConf { seed: number; stations: number; teams: number; kinds: TaskKind[] }

const maskOf = (kinds: readonly TaskKind[]) => TASK_KINDS.reduce((m, k, i) => (kinds.includes(k) ? m | (1 << i) : m), 0);
const check = (v: number) => hash32(`dzebna|${v}`) % 100;

/** eight digits: the hunt's seed, stations, teams and kinds in one number, and two digits that catch a typo */
export const huntCode = (c: HuntConf): string => {
  const mask = maskOf(c.kinds);
  const v = (c.seed % SEEDS) + SEEDS * ((c.stations - MIN_STATIONS) + 5 * ((c.teams - 1) + 6 * (Math.max(1, mask) - 1)));
  return String(v * 100 + check(v)).padStart(8, '0');
};
export const parseHuntCode = (raw: string): HuntConf | null => {
  const d = raw.replace(/\D/g, '');
  if (d.length !== 8) return null;
  const n = Number(d);
  const v = Math.floor(n / 100);
  if (n % 100 !== check(v)) return null;
  let r = Math.floor(v / SEEDS);
  const stations = MIN_STATIONS + (r % 5); r = Math.floor(r / 5);
  const teams = 1 + (r % 6); r = Math.floor(r / 6);
  const mask = r + 1;
  if (mask > 31) return null;
  return { seed: v % SEEDS, stations, teams, kinds: TASK_KINDS.filter((_, i) => mask & (1 << i)) };
};
/** „4821 3907“ */
export const codeLabel = (code: string) => `${code.slice(0, 4)} ${code.slice(4)}`;

/** the kinds of a hunt's stations */
export const huntKinds = (c: HuntConf) => kindsOf(c.seed, c.kinds, c.stations);
export const huntTask = (p: DzebnaPools, c: HuntConf, s: number) => taskAt(p, c.seed, huntKinds(c), s);

// ---------- the teams: a word each, a letter a station ----------
export interface HuntWord { word: string; hint: string }
const letterKey = (w: string) => [...w].sort().join('');

/** a word a team, as many letters as stations; no two of the same letters (an anagram of one team's could not be another's).
 *  The words follow the seed and the stations only, so a team keeps its word when more teams join. */
export const teamWords = (c: Pick<HuntConf, 'seed' | 'stations' | 'teams'>, bank: readonly HuntWord[]): HuntWord[] => {
  const pool = shuffle(bank.filter(w => letterCount(w.word) === c.stations), rndOf(`dzebna-words|${c.seed}|${c.stations}`));
  const out: HuntWord[] = [];
  const keys = new Set<string>();
  for (const w of pool) {
    const k = letterKey(w.word);
    if (keys.has(k)) continue;
    keys.add(k);
    out.push(w);
    if (out.length === c.teams) break;
  }
  return out;
};

/** the stations a team goes through: from its own start, one after another round the yard (the teams start apart) */
export const startOf = (c: Pick<HuntConf, 'stations' | 'teams'>, t: number) => Math.floor((t * c.stations) / c.teams) % c.stations;
export const routeOf = (c: Pick<HuntConf, 'stations' | 'teams'>, t: number) => range(c.stations).map(i => (startOf(c, t) + i) % c.stations);

/** which letter of the team's word each station gives: shuffled, and never the word itself in the order the team walks */
export const letterOrder = (c: Pick<HuntConf, 'seed' | 'stations' | 'teams'>, t: number, word: string): number[] => {
  const letters = [...word];
  const route = routeOf(c, t);
  let order = range(c.stations);
  for (let k = 0; k < 24; k++) {
    order = shuffle(range(c.stations), rndOf(`dzebna-perm|${c.seed}|${t}|${k}`));
    if (route.map(s => letters[order[s]]).join('') !== word) break;
  }
  return order;
};
export const letterAt = (c: Pick<HuntConf, 'seed' | 'stations' | 'teams'>, t: number, word: string, s: number) => [...word][letterOrder(c, t, word)[s]];

/** after station `s`, where a team goes: its route's next station not yet solved, or the chest (null) */
export const nextFor = (c: Pick<HuntConf, 'stations' | 'teams'>, t: number, found: readonly number[], s: number): number | null => {
  const route = routeOf(c, t);
  const at = Math.max(0, route.indexOf(s));
  for (let i = 1; i <= route.length; i++) {
    const x = route[(at + i) % route.length];
    if (!found.includes(x)) return x;
  }
  return null;
};

/** the chest: whose word it is, or whose letters (the right letters, another word), or nobody's */
export type ChestAnswer = { team: number } | { near: number } | { none: true };
export const cleanWord = (s: string) => [...s.trim()].filter(ch => /[ა-ჰ]/.test(ch)).join('');
export const chestCheck = (words: readonly HuntWord[], typed: string): ChestAnswer => {
  const w = cleanWord(typed);
  const exact = words.findIndex(x => x.word === w);
  if (exact >= 0) return { team: exact };
  const near = w ? words.findIndex(x => letterKey(x.word) === letterKey(w)) : -1;
  return near >= 0 ? { near } : { none: true };
};

// ---------- where the next card hides: carried in the card's link ----------
// The teacher may write each card's hiding place; card s's link carries the place of card s+1, so a team reads it only once
// its task is solved. Georgian letters are one character each in the link (a short QR code); anything else is escaped.
export const PLACE_MAX = 40;
const GEO0 = 0x10d0; // ა; the 33 letters run to ჰ (U+10F0)
const GEO_MAP = 'abcdefghijklmnopqrstuvwxyzABCDEFG';
const PUNCT: Record<string, string> = { ' ': '_', ',': 'H', '.': 'I', '-': 'J', '!': 'K', '?': 'L', '(': 'M', ')': 'N', '„': 'O', '“': 'P', ':': 'Q', ';': 'R', '–': 'S', '"': 'T' };
const PUNCT_BACK = Object.fromEntries(Object.entries(PUNCT).map(([k, v]) => [v, k]));

export const packPlace = (s: string): string => [...s.trim().slice(0, PLACE_MAX)].map(ch => {
  const c = ch.codePointAt(0) ?? 0;
  if (c >= GEO0 && c <= GEO0 + 32) return GEO_MAP[c - GEO0];
  if (/^[0-9]$/.test(ch)) return ch;
  if (PUNCT[ch]) return PUNCT[ch];
  return c <= 0xffff ? `~${c.toString(16).padStart(4, '0')}` : '';
}).join('');
export const unpackPlace = (p: string): string => {
  let out = '';
  for (let i = 0; i < p.length && out.length < PLACE_MAX * 2; i++) {
    const ch = p[i];
    const g = GEO_MAP.indexOf(ch);
    if (g >= 0) out += String.fromCodePoint(GEO0 + g);
    else if (/^[0-9]$/.test(ch)) out += ch;
    else if (PUNCT_BACK[ch]) out += PUNCT_BACK[ch];
    else if (ch === '~' && /^[0-9a-f]{4}$/.test(p.slice(i + 1, i + 5))) { out += String.fromCharCode(parseInt(p.slice(i + 1, i + 5), 16)); i += 4; }
  }
  return out.slice(0, PLACE_MAX);
};

/** a station's link (its card's QR code): stations are counted from 1 for people */
export const stationUrl = (origin: string, code: string, s: number, next?: string) =>
  `${origin}/?open=dzebna&h=${code}&s=${s + 1}${next && next.trim() ? `&n=${packPlace(next)}` : ''}`;
/** the hub's open request of a card (App.tsx reads the link): `st:<code>:<station from 1>:<packed next place>` */
export const stationRequest = (code: string, s1: string, next: string) => `st:${code}:${s1}:${next}`;
export const parseStationRequest = (id: string): { conf: HuntConf; code: string; s: number; next: string } | null => {
  const m = /^st:(\d{8}):(\d{1,2}):?(.*)$/.exec(id);
  if (!m) return null;
  const conf = parseHuntCode(m[1]);
  const s = Number(m[2]) - 1;
  if (!conf || s < 0 || s >= conf.stations) return null;
  return { conf, code: m[1], s, next: unpackPlace(m[3] ?? '') };
};

// ---------- the day's hunt across the map (online, alone) ----------
export const SOLO_STATIONS = 6;
export const SOLO_KINDS: readonly TaskKind[] = ['quiz', 'year', 'old', 'chant'];
/** seconds added: a wrong region on the map, a wrong answer, a wrong word at the chest */
export const PENALTY = { map: 10, task: 15, chest: 10 } as const;
/** a station's clues: one place a topic, the hardest first */
const CLUE_ORDER = ['history', 'nature', 'people', 'food', 'town'];
export const CLUES = 3;

export interface SoloStation { region: number; clues: PlaceSource[]; task: Task }
export interface SoloHunt { seed: number; stations: SoloStation[]; word: HuntWord; order: number[] }

const cluesOf = (p: DzebnaPools, region: number, rnd: () => number): PlaceSource[] => {
  const here = shuffle(p.places.filter(x => x.region === region), rnd);
  const out: PlaceSource[] = [];
  CLUE_ORDER.forEach(t => { const x = here.find(y => y.topic === t); if (x && out.length < CLUES) out.push(x); });
  here.forEach(x => { if (out.length < CLUES && !out.includes(x)) out.push(x); });
  return out;
};

/** six regions, each found by its places and opened by a task; the word of six letters, one a station, scrambled */
export const soloHunt = (p: DzebnaPools, bank: readonly HuntWord[], seed: number): SoloHunt | null => {
  const rnd = rndOf(`dzebna-solo|${seed}`);
  const regions = shuffle(range(p.regionNames.length).filter(r => p.places.filter(x => x.region === r).length >= CLUES), rnd).slice(0, SOLO_STATIONS);
  const kinds = kindsOf(seed, SOLO_KINDS.filter(k => poolSize(p, k) > 0), regions.length);
  const stations: SoloStation[] = [];
  regions.forEach((region, s) => {
    const task = taskAt(p, seed, kinds, s);
    if (task) stations.push({ region, clues: cluesOf(p, region, rnd), task });
  });
  const words = shuffle(bank.filter(w => letterCount(w.word) === stations.length), rnd);
  if (stations.length < MIN_STATIONS || !words.length) return null;
  const word = words[0];
  const c = { seed, stations: stations.length, teams: 1 };
  return { seed, stations, word, order: letterOrder(c, 0, word.word) };
};
/** the day's hunt: the same for the whole school */
export const daySeed = (iso: string) => hash32(`dzebna-day|${iso}`) % 1_000_000_007;

/** stars by the mistakes: none ★★★, up to three ★★, more ★ */
export const soloStars = (mistakes: number) => (mistakes <= 0 ? 3 : mistakes <= 3 ? 2 : 1);
export const mmss = (secs: number) => `${Math.floor(secs / 60)}:${String(Math.max(0, secs) % 60).padStart(2, '0')}`;

/** the day's record: the word, the time with the penalties (`t:`), the mistakes a station and at the chest (`x:`) */
export const dzebnaDay = (word: string, secs: number, miss: readonly number[]): HangiDay => ({
  id: word, guesses: [`t:${Math.round(secs)}`, `x:${miss.map(m => Math.min(9, Math.max(0, m))).join('')}`], won: true, done: true,
});
export const readDay = (d: HangiDay | undefined): { secs: number; miss: number[] } | null => {
  if (!d?.done) return null;
  const t = d.guesses.find(g => g.startsWith('t:'));
  const x = d.guesses.find(g => g.startsWith('x:'));
  const secs = t ? Number(t.slice(2)) : NaN;
  if (!Number.isFinite(secs)) return null;
  return { secs, miss: x ? [...x.slice(2)].map(Number).filter(Number.isFinite) : [] };
};
const total = (miss: readonly number[]) => miss.reduce((a, b) => a + b, 0);

export const dzebnaMeta = (days: Record<string, HangiDay>, today: string): string | undefined => {
  const r = readDay(days[today]);
  if (r) return `დღეს: ${mmss(r.secs)} · ${'★'.repeat(soloStars(total(r.miss)))}`;
  const { streak } = hangiStats(days, today);
  return streak ? `სერია: ${streak} დღე` : undefined;
};
/** the result without the word: a station green without a mistake, yellow with one or two, red with more; the key last */
export const dzebnaShare = (iso: string, secs: number, miss: readonly number[], site = 'sagandzureli.ge') => {
  const mark = (m: number) => (m <= 0 ? '🟢' : m <= 2 ? '🟡' : '🔴');
  const stations = miss.slice(0, -1).map(mark).join('');
  return `საგანძურის ძებნა №${dayNumber(iso)} · ${mmss(secs)} · ${'★'.repeat(soloStars(total(miss)))}\n${stations}🗝️\nსაგანძურის სკოლა · ${site}`;
};

// ---------- the day's hunt as it is played: map → task → letter, six times, then the chest ----------
export type SoloPhase = 'map' | 'task' | 'got' | 'chest' | 'done';
export interface SoloRun {
  seed: number;
  /** the day it is the hunt of; none for a free hunt */
  iso?: string;
  /** the station at */
  at: number;
  phase: SoloPhase;
  /** the clues of the station shown so far */
  clues: number;
  /** the regions tried at the station */
  out: number[];
  /** the answers struck at the station's task */
  struck: number[];
  /** the mistakes a station, the chest's last */
  miss: number[];
  /** the seconds added by mistakes */
  penalty: number;
  /** the clock: time run before `t0`, and since when it runs (0 = stopped) */
  spent: number;
  t0: number;
}

export const newSoloRun = (h: Pick<SoloHunt, 'seed' | 'stations'>, now: number, iso?: string): SoloRun => ({
  seed: h.seed, ...(iso ? { iso } : {}), at: 0, phase: 'map', clues: 1, out: [], struck: [],
  miss: Array(h.stations.length + 1).fill(0), penalty: 0, spent: 0, t0: now,
});
const missAt = (miss: readonly number[], i: number) => miss.map((m, k) => (k === i ? m + 1 : m));

export const runMs = (r: Pick<SoloRun, 'spent' | 't0'>, now: number) => r.spent + (r.t0 ? Math.max(0, now - r.t0) : 0);
export const pauseRun = (r: SoloRun, now: number): SoloRun => (r.t0 ? { ...r, spent: runMs(r, now), t0: 0 } : r);
export const resumeRun = (r: SoloRun, now: number): SoloRun => (r.t0 || r.phase === 'done' ? r : { ...r, t0: now });
/** the hunt's time: the clock and the penalties, in whole seconds */
export const runSeconds = (r: SoloRun, now: number) => Math.round(runMs(r, now) / 1000) + r.penalty;

/** a region tapped on the map: the station's own opens its task; another is crossed out, +10 s, and the next clue shows */
export const soloMap = (h: SoloHunt, r: SoloRun, region: number): SoloRun => {
  const st = h.stations[r.at];
  if (r.phase !== 'map' || !st || r.out.includes(region)) return r;
  if (region === st.region) return { ...r, phase: 'task', struck: [] };
  return { ...r, out: [...r.out, region], clues: Math.min(st.clues.length, r.clues + 1), miss: missAt(r.miss, r.at), penalty: r.penalty + PENALTY.map };
};
/** an answer of the station's task: the right one gives the letter, a wrong one is struck, +15 s */
export const soloTask = (h: SoloHunt, r: SoloRun, pick: number): SoloRun => {
  const st = h.stations[r.at];
  if (r.phase !== 'task' || !st || r.struck.includes(pick) || pick < 0 || pick >= st.task.options.length) return r;
  if (pick === st.task.right) return { ...r, phase: 'got' };
  return { ...r, struck: [...r.struck, pick], miss: missAt(r.miss, r.at), penalty: r.penalty + PENALTY.task };
};
/** on to the next station, or to the chest after the last */
export const soloNext = (h: SoloHunt, r: SoloRun): SoloRun => {
  if (r.phase !== 'got') return r;
  const at = r.at + 1;
  return at >= h.stations.length
    ? { ...r, at, phase: 'chest', clues: 0, out: [], struck: [] }
    : { ...r, at, phase: 'map', clues: 1, out: [], struck: [] };
};
/** the letters given so far, in the order the stations gave them */
export const soloLetters = (h: SoloHunt, r: Pick<SoloRun, 'at' | 'phase'>) => {
  const n = r.phase === 'got' || r.phase === 'chest' || r.phase === 'done' ? Math.min(h.stations.length, r.at + 1) : r.at;
  return h.order.slice(0, n).map(i => [...h.word.word][i]);
};
/** the word tried at the chest: the treasure's opens it (the clock stops), another costs 10 s */
export const soloChest = (h: SoloHunt, r: SoloRun, typed: string, now: number): SoloRun => {
  if (r.phase !== 'chest') return r;
  if (cleanWord(typed) === h.word.word) return { ...pauseRun(r, now), phase: 'done' };
  return { ...r, miss: missAt(r.miss, h.stations.length), penalty: r.penalty + PENALTY.chest };
};

const PHASES: readonly SoloPhase[] = ['map', 'task', 'got', 'chest', 'done'];
const int = (v: unknown, lo: number, hi: number) => (Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi ? (v as number) : null);
const ints = (v: unknown, hi: number) => (Array.isArray(v) ? v.filter((x): x is number => int(x, 0, hi) !== null) : []);
/** a run kept on the device, if it still fits its hunt (the clock stopped: it goes on when the page shows again) */
export const parseSoloRun = (raw: unknown, h: SoloHunt | null): SoloRun | null => {
  const o = raw as Partial<SoloRun> | null;
  if (!o || typeof o !== 'object' || !h || o.seed !== h.seed) return null;
  const n = h.stations.length;
  const at = int(o.at, 0, n);
  const phase = PHASES.includes(o.phase as SoloPhase) ? (o.phase as SoloPhase) : null;
  if (at === null || !phase || (phase === 'chest' || phase === 'done' ? at !== n : at >= n)) return null;
  const miss = ints(o.miss, 999);
  return {
    seed: h.seed, ...(typeof o.iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.iso) ? { iso: o.iso } : {}),
    at, phase, clues: int(o.clues, 0, CLUES) ?? 1, out: ints(o.out, 12), struck: ints(o.struck, 3),
    miss: miss.length === n + 1 ? miss : Array(n + 1).fill(0),
    penalty: int(o.penalty, 0, 1e6) ?? 0, spent: Number.isFinite(o.spent) && (o.spent as number) >= 0 ? (o.spent as number) : 0, t0: 0,
  };
};
