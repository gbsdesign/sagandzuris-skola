import { dayNumber, hangiStats, hash32, type HangiDay } from './hangi';
import { mulberry32, shuffle } from './otkheuli';

// „უცხო სოფელში“ (2026-11-01, like Spyfall). Everybody knows the place but the stranger; questions show who does not.
// Alone („ონლაინ“): I am the stranger — the villagers' answers come one by one, I find the place on a board of 25; an answer
// more, a hint (four wrong places crossed out) or a wrong guess cost points. One place a day for the whole school.
// The class („ჰიბრიდული“): one phone goes round, each sees their card in secret (the place and a role, or „უცხო“), the clock
// runs, anybody may stop it to accuse, the stranger may stop it to name the place; points as in the original.
// Pure; tests in tests/utskho.test.ts.

/** what the rules need of a place (data/utskhoPlaces.ts) */
export interface UPlace { id: string; name: string; roles: string[]; answers: [string, string][] }

// ---------- alone: I am the stranger ----------
export const BOARD = 25;
export const ANSWERS = 5;
export const HINTS = 3;
export const HINT_CUT = 4;
export const MAX_WRONG = 3;
export const START_POINTS = 10;

export interface USolo { place: string; board: string[] }

const byName = (places: readonly UPlace[]) => (a: string, b: string) =>
  (places.find(p => p.id === a)?.name ?? a).localeCompare(places.find(p => p.id === b)?.name ?? b, 'ka');

/** the place and a board of 25 around it, in the alphabet's order */
export const soloDeal = (place: string, places: readonly UPlace[], rnd: () => number): USolo => {
  const others = shuffle(places.filter(p => p.id !== place).map(p => p.id), rnd).slice(0, BOARD - 1);
  return { place, board: [place, ...others].sort(byName(places)) };
};
/** the day's place: every one once in a round of days, the same for the whole school */
export const placeOfDay = (iso: string, places: readonly UPlace[]): string => {
  const n = places.length;
  const d = dayNumber(iso);
  const order = shuffle(places.map(p => p.id), mulberry32(hash32(`utskho|${Math.floor(d / n)}`)));
  return order[((d % n) + n) % n];
};
export const dayDeal = (iso: string, places: readonly UPlace[]): USolo =>
  soloDeal(placeOfDay(iso, places), places, mulberry32(hash32(`utskho-board|${iso}`)));
export const freeDeal = (places: readonly UPlace[], seed: number): USolo => {
  const rnd = mulberry32(seed);
  return soloDeal(places[Math.floor(rnd() * places.length)].id, places, rnd);
};

/** a step alone: 'a' = the next answer, 'h' = a hint, 'g:<place>' = a guess */
export type USoloAct = string;
export interface USoloView { shown: number; hints: number; cut: string[]; wrong: string[]; won: boolean; lost: boolean; points: number }
/** the board after the steps: what is shown, crossed out and guessed, and the points (10 − an answer more − a hint − 2 a miss) */
export const soloView = (d: USolo, acts: readonly USoloAct[]): USoloView => {
  let shown = 1;
  let hints = 0;
  let won = false;
  const cut: string[] = [];
  const wrong: string[] = [];
  const order = shuffle(d.board.filter(id => id !== d.place), mulberry32(hash32(`utskho-cut|${d.place}|${d.board.join(',')}`)));
  for (const a of acts) {
    if (won || wrong.length >= MAX_WRONG) break;
    if (a === 'a') { if (shown < ANSWERS) shown++; continue; }
    if (a === 'h') {
      if (hints >= HINTS) continue;
      hints++;
      let n = 0;
      for (const id of order) {
        if (n === HINT_CUT) break;
        if (!cut.includes(id) && !wrong.includes(id)) { cut.push(id); n++; }
      }
      continue;
    }
    if (!a.startsWith('g:')) continue;
    const id = a.slice(2);
    if (!d.board.includes(id) || cut.includes(id) || wrong.includes(id)) continue;
    if (id === d.place) won = true;
    else wrong.push(id);
  }
  const raw = START_POINTS - (shown - 1) - hints - 2 * wrong.length;
  return { shown, hints, cut, wrong, won, lost: !won && wrong.length >= MAX_WRONG, points: won ? Math.max(1, raw) : Math.max(0, raw) };
};
export const soloOver = (v: USoloView) => v.won || v.lost;
/** a step taken only when it does something (an answer left, a hint left, a guess on a place still open) */
export const soloStep = (d: USolo, acts: readonly USoloAct[], a: USoloAct): USoloAct[] => {
  const before = soloView(d, acts);
  if (soloOver(before)) return [...acts];
  const after = soloView(d, [...acts, a]);
  const same = after.shown === before.shown && after.hints === before.hints && after.wrong.length === before.wrong.length && after.won === before.won;
  return same ? [...acts] : [...acts, a];
};
/** ★★★ from 8 points, ★★ from 5 */
export const soloStars = (v: USoloView) => (!v.won ? 0 : v.points >= 8 ? 3 : v.points >= 5 ? 2 : 1);

export const utskhoDay = (d: USolo, acts: readonly USoloAct[]): HangiDay => {
  const v = soloView(d, acts);
  return { id: d.place, guesses: acts.slice(0, 20), won: v.won, done: soloOver(v) };
};
export const utskhoMeta = (days: Record<string, HangiDay>, today: string): string | undefined => {
  const t = days[today];
  if (t?.done) return t.won ? 'დღეს: გამოიცანი' : 'დღეს ვერ გამოიცანი';
  const { streak } = hangiStats(days, today);
  return streak ? `სერია: ${streak} დღე` : undefined;
};
/** the result without the place: 💬 an answer heard, 💡 a hint, ❌ a miss, ✅ found */
export const utskhoShare = (n: number, d: USolo, acts: readonly USoloAct[], site = 'sagandzureli.ge') => {
  const v = soloView(d, acts);
  const marks = ['💬', ...soloStepsOf(d, acts).map(a => (a === 'a' ? '💬' : a === 'h' ? '💡' : a === `g:${d.place}` ? '✅' : '❌'))];
  return `უცხო სოფელში №${n} · ${v.won ? `${v.points} ქულა` : 'X'}\n${marks.join('')}\nსაგანძურის სკოლა · ${site}`;
};
/** the steps that counted, in order */
export const soloStepsOf = (d: USolo, acts: readonly USoloAct[]): USoloAct[] =>
  acts.reduce<USoloAct[]>((done, a) => soloStep(d, done, a), []);

// ---------- the class: one phone goes round ----------
export const MINUTES = [6, 8, 10];
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;

/** how a round ended: a vote the table agreed on (`late` = after the time), the stranger naming the place, or the time over
 *  with no one the table agreed on */
export type UEnd =
  | { kind: 'vote'; accused: number; accuser: number | null; late: boolean }
  | { kind: 'guess'; guess: string }
  | { kind: 'timeout' };
export type UPhase = 'deal' | 'play' | 'end';
export interface URound {
  place: string;
  stranger: number;
  /** each player's role; the stranger's is '' */
  roles: string[];
  first: number;
  dealt: number;
  phase: UPhase;
  /** the clock: started at, paused at (while an accusation is heard), paused for so far */
  startAt: number | null;
  pausedAt: number | null;
  pausedMs: number;
  accusers: number[];
  end: UEnd | null;
}
export interface UTable { names: string[]; minutes: number; round: URound; scores: number[]; used: string[]; played: number }

/** a round: a place not used yet in this game, a stranger (not last round's when there is a choice), roles dealt from the place's */
export const newRound = (names: readonly string[], places: readonly UPlace[], used: readonly string[], lastStranger: number | null, rnd: () => number): URound => {
  const fresh = places.filter(p => !used.includes(p.id));
  const pool = fresh.length ? fresh : places;
  const place = pool[Math.floor(rnd() * pool.length)];
  const can = names.map((_, i) => i).filter(i => i !== lastStranger || names.length < 2);
  const stranger = can[Math.floor(rnd() * can.length)];
  const deck = shuffle([...place.roles], rnd);
  let k = 0;
  const roles = names.map((_, i) => (i === stranger ? '' : deck[k++ % deck.length]));
  return {
    place: place.id, stranger, roles, first: Math.floor(rnd() * names.length), dealt: 0, phase: 'deal',
    startAt: null, pausedAt: null, pausedMs: 0, accusers: [], end: null,
  };
};
export const newTable = (names: readonly string[], minutes: number, places: readonly UPlace[], rnd: () => number): UTable => ({
  names: [...names], minutes: MINUTES.includes(minutes) ? minutes : 8, round: newRound(names, places, [], null, rnd),
  scores: names.map(() => 0), used: [], played: 0,
});

/** ms left on the round's clock at `now` */
export const leftMs = (t: UTable, now: number) => {
  const r = t.round;
  if (r.startAt === null) return t.minutes * 60_000;
  const at = r.pausedAt ?? now;
  return Math.max(0, t.minutes * 60_000 - (at - r.startAt - r.pausedMs));
};
export const dealNext = (t: UTable, now: number): UTable => {
  const r = t.round;
  if (r.phase !== 'deal') return t;
  const dealt = r.dealt + 1;
  return dealt < t.names.length ? { ...t, round: { ...r, dealt } } : { ...t, round: { ...r, dealt, phase: 'play', startAt: now } };
};
export const pause = (t: UTable, now: number): UTable => (t.round.phase !== 'play' || t.round.pausedAt !== null ? t : { ...t, round: { ...t.round, pausedAt: now } });
export const resume = (t: UTable, now: number): UTable => {
  const r = t.round;
  if (r.pausedAt === null) return t;
  return { ...t, round: { ...r, pausedMs: r.pausedMs + Math.max(0, now - r.pausedAt), pausedAt: null } };
};
/** an accusation the table did not agree on: the accuser has used theirs, the clock goes on */
export const accusationFailed = (t: UTable, accuser: number | null, now: number): UTable => {
  const r = resume(t, now).round;
  return { ...t, round: { ...r, accusers: accuser === null || r.accusers.includes(accuser) ? r.accusers : [...r.accusers, accuser] } };
};

/** whether the stranger won the round */
export const strangerWon = (r: URound, end: UEnd) =>
  (end.kind === 'guess' ? end.guess === r.place : end.kind === 'timeout' || end.accused !== r.stranger);
/**
 * the round's points, as in the original: the villagers win → each 1, the one who accused 2; the stranger wins → 2 (the time
 * ran out), and 4 when they named the place or the table accused one of their own before the time was up
 */
export const roundPoints = (r: URound, end: UEnd, n: number): number[] => {
  const pts = Array.from({ length: n }, () => 0);
  if (strangerWon(r, end)) {
    pts[r.stranger] = end.kind === 'guess' || (end.kind === 'vote' && !end.late) ? 4 : 2;
    return pts;
  }
  for (let i = 0; i < n; i++) if (i !== r.stranger) pts[i] = 1;
  if (end.kind === 'vote' && end.accuser !== null && end.accuser !== r.stranger) pts[end.accuser] = 2;
  return pts;
};
export const finish = (t: UTable, end: UEnd, now: number): UTable => {
  if (t.round.phase !== 'play') return t;
  const pts = roundPoints(t.round, end, t.names.length);
  const r = { ...t.round, pausedAt: t.round.pausedAt ?? now, phase: 'end' as const, end };
  return { ...t, round: r, scores: t.scores.map((s, i) => s + pts[i]), used: [...t.used, t.round.place], played: t.played + 1 };
};
export const nextRound = (t: UTable, places: readonly UPlace[], rnd: () => number): UTable =>
  (t.round.phase !== 'end' ? t : { ...t, round: newRound(t.names, places, t.used, t.round.stranger, rnd) });

export const parseTable = (raw: unknown, places: readonly UPlace[]): UTable | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<UTable>;
  const names = Array.isArray(o.names) ? o.names.filter((x): x is string => typeof x === 'string' && !!x.trim()) : [];
  const r = o.round as Partial<URound> | undefined;
  if (names.length < MIN_PLAYERS || names.length > MAX_PLAYERS || !r || !places.some(p => p.id === r.place)) return null;
  const n = names.length;
  const idx = (x: unknown) => Number.isInteger(x) && (x as number) >= 0 && (x as number) < n;
  if (!idx(r.stranger) || !idx(r.first) || !Array.isArray(r.roles) || r.roles.length !== n) return null;
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
  const phase: UPhase = r.phase === 'play' || r.phase === 'end' ? r.phase : 'deal';
  const e = r.end as UEnd | null | undefined;
  const end: UEnd | null = !e ? null
    : e.kind === 'guess' && typeof e.guess === 'string' ? { kind: 'guess', guess: e.guess }
    : e.kind === 'timeout' ? { kind: 'timeout' }
    : e.kind === 'vote' && idx(e.accused) ? { kind: 'vote', accused: e.accused, accuser: idx(e.accuser) ? e.accuser : null, late: !!e.late }
    : null;
  if (phase === 'end' && !end) return null;
  return {
    names,
    minutes: MINUTES.includes(o.minutes as number) ? (o.minutes as number) : 8,
    round: {
      place: r.place as string, stranger: r.stranger as number, roles: r.roles.map(x => (typeof x === 'string' ? x : '')), first: r.first as number,
      dealt: Math.min(n, Math.max(0, Number.isInteger(r.dealt) ? (r.dealt as number) : 0)), phase,
      startAt: num(r.startAt), pausedAt: num(r.pausedAt), pausedMs: Math.max(0, num(r.pausedMs) ?? 0),
      accusers: Array.isArray(r.accusers) ? r.accusers.filter(idx) as number[] : [], end,
    },
    scores: names.map((_, i) => (Array.isArray(o.scores) && Number.isInteger(o.scores[i]) ? Math.max(0, o.scores[i]) : 0)),
    used: Array.isArray(o.used) ? o.used.filter((x): x is string => typeof x === 'string') : [],
    played: Number.isInteger(o.played) ? Math.max(0, o.played as number) : 0,
  };
};
