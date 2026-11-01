import { mulberry32, shuffle } from './otkheuli';
import type { Script } from './oldScripts';
import { eqoLine } from './eqo';

// „ციხის გასაღები“ (2026-11-01, the plan's Georgian game №12, like an escape room): a castle locked for the night, five doors
// one after the other and the gate. Every door opened gives a piece of the gate's key — a letter; the five letters, put in
// their order, are the word that opens the gate. Thirty minutes on the clock; a hint costs time, a wrong pick a little too.
// Alone (or friends round one phone) the run is kept on the device; on one phone with the class (`TsikheTable`) the teams
// race with paper cards and the phone is the locks: it checks a team's answer, gives its hints, plays the tunes and keeps one
// clock with each team's own penalty. The rooms are in data/tsikheRooms.ts.

export type OldScript = Exclude<Script, 'mkhedruli'>;
/** an inscription on the wall, in an old script (its text is kept in today's letters) */
export interface Carved { text: string; script: OldScript }
/** a tune on the synthesizer: a chant's or a song's book notes (book 'v9' · 'book' · 'song') */
export interface Tune { book: string; num: number }

interface DoorBase {
  title: string;
  ask: string;
  /** two hints; the third is the answer itself */
  hints: readonly [string, string];
  /** what one learns once the door is open */
  note: string;
}
export type Door = DoorBase & (
  | { kind: 'word'; answer: string; alt?: readonly string[]; carved?: Carved }
  | { kind: 'code'; answer: string; carved?: Carved; scroll?: boolean }
  | { kind: 'pick'; options: readonly string[] }
  | { kind: 'listen'; tune: Tune; options: readonly string[] }
  | { kind: 'order'; items: readonly string[] }
  | { kind: 'echo'; melody: string; count: number }
);
export type DoorKind = Door['kind'];

export interface TsikheRoom {
  id: string;
  title: string;
  where: string;
  level: 1 | 2 | 3;
  intro: string;
  doors: readonly Door[];
  /** the gate's word: its letters are the pieces, one a door */
  key: string;
  gate: { ask: string; note: string };
  outro: string;
}

export const LEVEL_LABEL: Record<TsikheRoom['level'], string> = { 1: 'ადვილი', 2: 'საშუალო', 3: 'რთული' };
export const KIND_LABEL: Record<DoorKind, string> = {
  word: 'სიტყვა', code: 'კოდი', pick: 'არჩევანი', listen: 'სმენა', order: 'რიგი', echo: 'ზარები',
};

export const ROOM_MINUTES = 30;
export const ROOM_MS = ROOM_MINUTES * 60_000;
/** what a hint costs: the first two a minute each, the answer three */
export const HINT_COST = [60_000, 60_000, 180_000] as const;
export const HINTS = HINT_COST.length;
/** a wrong pick (an option, a tune, an order) — those one could guess */
export const WRONG_COST = 30_000;
export const guessable = (d: Door) => d.kind === 'pick' || d.kind === 'listen' || d.kind === 'order';

// ---------- answers ----------
/** only the letters and the digits count: spaces, quotes and dashes do not */
export const plain = (s: string) => s.normalize('NFC').replace(/[^ა-ჰ0-9]/g, '');
export const wordRight = (d: Extract<Door, { kind: 'word' }>, typed: string) => {
  const t = plain(typed);
  return !!t && [d.answer, ...(d.alt ?? [])].some(a => plain(a) === t);
};
export const codeRight = (d: Extract<Door, { kind: 'code' }>, digits: string) => digits === d.answer;
/** the boxes of a typed answer: `_` a letter, the spaces kept („ქართლის დედა“ → „_______ ____“) */
export const shapeOf = (answer: string) => answer.trim().replace(/[ა-ჰ]/g, '_').replace(/[^_ ]/g, '').replace(/ +/g, ' ');
/** the answer as the third hint gives it */
export const answerText = (d: Door) => {
  switch (d.kind) {
    case 'word': return d.answer;
    case 'code': return d.answer;
    case 'pick': case 'listen': return d.options[0];
    case 'order': return d.items.join(' → ');
    case 'echo': return '';
  }
};

// ---------- the old letters as numbers (the scroll beside a code door) ----------
/** ა 1 … ჩ 1000 in the alphabet's old order: the archaic ჱ 8, ჲ 60 and ჳ 400 keep their places */
export const NUMERALS: readonly (readonly [string, number])[] = [
  ['ა', 1], ['ბ', 2], ['გ', 3], ['დ', 4], ['ე', 5], ['ვ', 6], ['ზ', 7], ['ჱ', 8], ['თ', 9], ['ი', 10], ['კ', 20], ['ლ', 30], ['მ', 40],
  ['ნ', 50], ['ჲ', 60], ['ო', 70], ['პ', 80], ['ჟ', 90], ['რ', 100], ['ს', 200], ['ტ', 300], ['ჳ', 400], ['ფ', 500], ['ქ', 600],
  ['ღ', 700], ['ყ', 800], ['შ', 900], ['ჩ', 1000],
];
/** the letters' numbers added (NaN for a letter the scroll does not hold) */
export const numeralSum = (s: string) => [...s].reduce((n, ch) => n + (NUMERALS.find(([l]) => l === ch)?.[1] ?? NaN), 0);

// ---------- an echo door: the bells' phrase ----------
/** the phrase to tap back: the melody's opening (as „ექო“ takes it), its first `count` notes */
export const echoNotes = (top: readonly number[], count: number) => eqoLine({ top: [...top] }).slice(0, count);

// ---------- what a door shows ----------
const seedOf = (seed: number, door: number) => (seed ^ Math.imul(door + 1, 0x9e3779b1)) >>> 0;
/** the options in the order this run shows them (the right one is the data's first) */
export const optionOrder = (n: number, seed: number, door: number): number[] => shuffle(Array.from({ length: n }, (_, i) => i), mulberry32(seedOf(seed, door)));
/** an order door's items as they lie at first — never already in their order */
export const itemsShown = (n: number, seed: number, door: number): number[] => {
  const r = mulberry32(seedOf(seed, door) ^ 0x5bd1e995);
  const id = Array.from({ length: n }, (_, i) => i);
  for (let k = 0; k < 20; k++) {
    const s = shuffle(id, r);
    if (s.some((v, i) => v !== i)) return s;
  }
  return [...id].reverse();
};
/** the order picked so far is right — every item in its place */
export const orderRight = (picked: readonly number[], n: number) => picked.length === n && picked.every((v, i) => v === i);

/** a room's own fixed number: the printed cards' order of options and items — the class's phone shows them the same way */
export const printSeed = (id: string) => {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};

/** the gate's pieces in the order the doors give them: the key's letters, never already the word (a fixed scramble a room) */
export const piecesOf = (room: Pick<TsikheRoom, 'id' | 'key'>): string[] => {
  const letters = [...room.key];
  const r = mulberry32(printSeed(room.id));
  for (let k = 0; k < 50; k++) {
    const s = shuffle(letters, r);
    if (s.join('') !== room.key) return s;
  }
  return [...letters.slice(1), letters[0]];
};

// ---------- the clock ----------
export interface Clock { spent: number; t0: number }
/** time used so far (the clock pauses while the screen is closed: `t0` = 0) */
export const clockMs = (c: Clock, now: number) => c.spent + (c.t0 ? Math.max(0, now - c.t0) : 0);
export const pauseClock = <T extends Clock>(c: T, now: number): T => (c.t0 ? { ...c, spent: clockMs(c, now), t0: 0 } : c);
export const resumeClock = <T extends Clock>(c: T, now: number): T => (c.t0 ? c : { ...c, t0: now });
/** 07:30 · 1:02:05 */
export const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

// ---------- a run: alone, or friends round one phone ----------
export interface TsikheRun extends Clock {
  room: string;
  seed: number;
  /** the door open now: 0…doors−1, doors = the gate, doors + 1 = out */
  door: number;
  /** hints shown at this door (3 = the answer) */
  hints: number;
  /** options tried wrong at this door (they go grey) */
  wrong: number[];
  /** hints shown in the whole run, and answers among them */
  used: number;
  answers: number;
  penalty: number;
  /** the time at the gate, penalty in (0 = not yet out) */
  done: number;
  /** this door is open and its note shows: the clock waits for „შემდეგი კარი“ */
  solved: boolean;
}

export const newRun = (room: string, seed: number, now: number): TsikheRun => ({
  room, seed: seed >>> 0, door: 0, hints: 0, wrong: [], used: 0, answers: 0, penalty: 0, done: 0, solved: false, spent: 0, t0: now,
});
/** the time that counts: the clock and the penalties */
export const runMs = (r: TsikheRun, now: number) => (r.done ? r.done : clockMs(r, now) + r.penalty);
export const isOut = (r: TsikheRun, doors: number) => r.door > doors;

export const runHint = (r: TsikheRun): TsikheRun => {
  if (r.hints >= HINTS) return r;
  const last = r.hints === HINTS - 1;
  return { ...r, hints: r.hints + 1, used: r.used + 1, answers: r.answers + (last ? 1 : 0), penalty: r.penalty + HINT_COST[r.hints] };
};
/** a wrong pick: its option goes grey (an order door has none) and the clock moves on */
export const runMiss = (r: TsikheRun, option?: number): TsikheRun => ({
  ...r, penalty: r.penalty + WRONG_COST, wrong: option === undefined || r.wrong.includes(option) ? r.wrong : [...r.wrong, option],
});
/** the door is open: its note shows while the clock waits */
export const runSolve = (r: TsikheRun, now: number): TsikheRun => ({ ...pauseClock(r, now), solved: true });
/** on to the next door, the clock going again — past the gate it stops for good */
export const runPass = (r: TsikheRun, doors: number, now: number): TsikheRun => {
  const next: TsikheRun = { ...r, door: r.door + 1, hints: 0, wrong: [], solved: false };
  if (next.door <= doors) return resumeClock(next, now);
  const stopped = pauseClock(next, now);
  return { ...stopped, done: Math.max(1, stopped.spent + stopped.penalty) };
};

/** ★★★ out in time without a hint, ★★ out in time, ★ out after the guard came */
export const starsOf = (done: number, used: number) => (done <= ROOM_MS ? (used === 0 ? 3 : 2) : 1);

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
export const parseRun = (raw: unknown, roomOf: (id: string) => TsikheRoom | undefined): TsikheRun | null => {
  const o = (raw && typeof raw === 'object' ? raw : null) as Partial<TsikheRun> | null;
  const room = o && typeof o.room === 'string' ? roomOf(o.room) : undefined;
  if (!o || !room) return null;
  const doors = room.doors.length;
  return {
    room: room.id,
    seed: num(o.seed) >>> 0,
    door: Math.min(doors + 1, Math.max(0, Math.round(num(o.door)))),
    hints: Math.min(HINTS, Math.max(0, Math.round(num(o.hints)))),
    wrong: Array.isArray(o.wrong) ? o.wrong.filter((v): v is number => Number.isInteger(v) && v >= 0 && v < 8) : [],
    used: Math.max(0, Math.round(num(o.used))),
    answers: Math.max(0, Math.round(num(o.answers))),
    penalty: Math.max(0, num(o.penalty)),
    done: Math.max(0, num(o.done)),
    solved: !!o.solved,
    spent: Math.max(0, num(o.spent)),
    t0: 0,
  };
};

/** the best of a room on this device: more stars, then less time */
export interface TsikheBest { ms: number; stars: number }
export const better = (a: TsikheBest | undefined, b: TsikheBest) => !a || b.stars > a.stars || (b.stars === a.stars && b.ms < a.ms);

// ---------- the class on one phone: teams race with the paper cards, the phone is the locks ----------
export interface TsikheTeam { name: string; door: number; hints: number; wrong: number[]; used: number; penalty: number; done: number }
export interface TsikheTable extends Clock {
  room: string;
  seed: number;
  teams: TsikheTeam[];
  ended: boolean;
}
export const MIN_TABLE_TEAMS = 1;
export const MAX_TABLE_TEAMS = 6;

/** the class's game: its options and items lie as on the printed cards (`printSeed`) */
export const newTable = (room: string, names: readonly string[], now: number): TsikheTable => ({
  room, seed: printSeed(room), ended: false, spent: 0, t0: now,
  teams: names.slice(0, MAX_TABLE_TEAMS).map(name => ({ name, door: 0, hints: 0, wrong: [], used: 0, penalty: 0, done: 0 })),
});
const withTeam = (t: TsikheTable, i: number, f: (x: TsikheTeam) => TsikheTeam): TsikheTable => ({ ...t, teams: t.teams.map((x, k) => (k === i ? f(x) : x)) });

/** a team's time that counts: the shared clock and its own penalties, or its time at the gate */
export const teamMs = (t: TsikheTable, i: number, now: number) => {
  const x = t.teams[i];
  return x.done || clockMs(t, now) + x.penalty;
};
export const teamHint = (t: TsikheTable, i: number): TsikheTable => withTeam(t, i, x => (x.hints >= HINTS || x.done ? x : {
  ...x, hints: x.hints + 1, used: x.used + 1, penalty: x.penalty + HINT_COST[x.hints],
}));
export const teamMiss = (t: TsikheTable, i: number, option?: number): TsikheTable => withTeam(t, i, x => ({
  ...x, penalty: x.penalty + WRONG_COST, wrong: option === undefined || x.wrong.includes(option) ? x.wrong : [...x.wrong, option],
}));
export const teamPass = (t: TsikheTable, i: number, doors: number, now: number): TsikheTable => {
  const next = withTeam(t, i, x => {
    if (x.done) return x;
    const door = x.door + 1;
    return { ...x, door, hints: 0, wrong: [], done: door > doors ? Math.max(1, clockMs(t, now) + x.penalty) : 0 };
  });
  // every team is out: the clock stops
  return next.teams.every(x => x.done) ? { ...pauseClock(next, now), ended: true } : next;
};
export const endTable = (t: TsikheTable, now: number): TsikheTable => ({ ...pauseClock(t, now), ended: true });

/** the teams in their places: out first by their time, then the rest by the door reached and their penalty */
export const tableRanking = (t: TsikheTable, now: number) => {
  const rows = t.teams.map((x, i) => ({ i, name: x.name, door: x.door, ms: teamMs(t, i, now), out: !!x.done }));
  rows.sort((a, b) => (a.out !== b.out ? (a.out ? -1 : 1) : a.out ? a.ms - b.ms : b.door - a.door || a.ms - b.ms));
  let place = 0;
  return rows.map((r, k) => {
    const prev = rows[k - 1];
    if (!prev || prev.out !== r.out || prev.door !== r.door || prev.ms !== r.ms) place = k + 1;
    return { ...r, place };
  });
};

export const parseTable = (raw: unknown, roomOf: (id: string) => TsikheRoom | undefined): TsikheTable | null => {
  const o = (raw && typeof raw === 'object' ? raw : null) as Partial<TsikheTable> | null;
  const room = o && typeof o.room === 'string' ? roomOf(o.room) : undefined;
  if (!o || !room || !Array.isArray(o.teams) || !o.teams.length) return null;
  const doors = room.doors.length;
  const teams = o.teams.slice(0, MAX_TABLE_TEAMS).map((x: Partial<TsikheTeam>) => ({
    name: typeof x?.name === 'string' && x.name.trim() ? x.name.trim().slice(0, 16) : 'გუნდი',
    door: Math.min(doors + 1, Math.max(0, Math.round(num(x?.door)))),
    hints: Math.min(HINTS, Math.max(0, Math.round(num(x?.hints)))),
    wrong: Array.isArray(x?.wrong) ? x.wrong.filter((v): v is number => Number.isInteger(v) && v >= 0 && v < 8) : [],
    used: Math.max(0, Math.round(num(x?.used))),
    penalty: Math.max(0, num(x?.penalty)),
    done: Math.max(0, num(x?.done)),
  }));
  return { room: room.id, seed: num(o.seed) >>> 0, teams, ended: !!o.ended, spent: Math.max(0, num(o.spent)), t0: 0 };
};
