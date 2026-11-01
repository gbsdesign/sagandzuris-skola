import { hangiStats, hash32, type HangiDay } from './hangi';
import { mulberry32, shuffle, type OtkheuliGroup } from './otkheuli';

// „საიდუმლო სახელები“ (2026-11-01, like Codenames). Twenty-five words on a board; a hidden key says whose each is.
// Alone („ონლაინ“): the app is the captain — its clues are the groups of „ოთხეული“ („მდინარეები · 3“), the player finds their
// words among the others; four misses lose, and one word is a trap that loses at once. One board a day for the whole school.
// The class („ჰიბრიდული“): one phone on the table shows the board, the two captains see the key on their own phones by its
// four-digit code (the same code = the same words and key on every phone, nothing is sent); a captain gives one word and a
// number, the team touches words, the phone opens them, counts and passes the turn. Pure; tests in tests/saidumlo.test.ts.

export const GRID = 25;
export type Team = 'blue' | 'red';
export type Side = Team | 'none' | 'trap';
export const other = (t: Team): Team => (t === 'blue' ? 'red' : 'blue');

// ---------- alone: the app gives the clues ----------
export const MAX_MISSES = 4;
const CLUE_SIZES = [3, 3, 2, 2];
export interface SdClue { id: string; label: string; words: string[] }
export interface SdSolo { key: string; tiles: string[]; clues: SdClue[]; trap: string }

/** the songs' and chants' titles stay off the board: mostly several words, and known only to those who sing them */
const TITLE_FAMILIES = new Set(['songs', 'chants']);
/** a word the clue's own name holds (its stem: „სიკეთე“ in „ქართველის სიკეთეები“) — too easy as an answer, a trick as a decoy */
export const stemIn = (label: string, w: string) =>
  w.split(/[\s-]+/).some(part => { const base = part.replace(/[აეიოუ]$/, ''); return base.length >= 3 && label.includes(base); });
/**
 * Four groups as the clues (2–3 words each, ten in all), fifteen words of other groups around them, one of those the trap.
 * A clue's answer is one: no word on the board belongs to a clue's group but its own words, and no word to two clues. At most
 * one group of a family among the clues. undefined when the list cannot fill a board.
 */
export const buildSolo = (all: readonly OtkheuliGroup[], rnd: () => number): SdSolo | undefined => {
  const groups = all.filter(g => !TITLE_FAMILIES.has(g.family ?? ''));
  const sizes = shuffle([...CLUE_SIZES], rnd);
  const chosen: { g: OtkheuliGroup; words: string[] }[] = [];
  const families = new Set<string>();
  const used = new Set<string>();
  for (const g of shuffle([...groups], rnd)) {
    if (chosen.length === sizes.length) break;
    if (g.family && families.has(g.family)) continue;
    if (chosen.some(c => c.words.some(w => g.words.includes(w) || stemIn(g.label, w)))) continue;
    const free = g.words.filter(w => !used.has(w) && !chosen.some(c => c.g.words.includes(w) || stemIn(c.g.label, w)) && !stemIn(g.label, w));
    const size = sizes[chosen.length];
    if (free.length < size) continue;
    const words = shuffle(free, rnd).slice(0, size);
    words.forEach(w => used.add(w));
    if (g.family) families.add(g.family);
    chosen.push({ g, words });
  }
  if (chosen.length < sizes.length) return undefined;
  const inClue = (w: string) => chosen.some(c => c.g.words.includes(w) || stemIn(c.g.label, w));
  const others: string[] = [];
  const need = GRID - used.size;
  for (const g of shuffle(groups.filter(g => !chosen.some(c => c.g.id === g.id)), rnd)) {
    if (others.length === need) break;
    for (const w of shuffle(g.words.filter(w => !used.has(w) && !inClue(w)), rnd).slice(0, 2)) {
      if (others.length === need) break;
      used.add(w);
      others.push(w);
    }
  }
  if (others.length < need) return undefined;
  return {
    key: chosen.map(c => c.g.id).join('+'),
    tiles: shuffle([...chosen.flatMap(c => c.words), ...others], rnd),
    clues: chosen.map(c => ({ id: c.g.id, label: c.g.label, words: c.words })),
    trap: others[0],
  };
};
/** the day's board — the same for the whole school (Tbilisi day) */
export const soloOfDay = (groups: readonly OtkheuliGroup[], iso: string) => buildSolo(groups, mulberry32(hash32(`saidumlo|${iso}`)));

export interface SdSoloState { found: string[]; misses: string[]; trapped: boolean; won: boolean; lost: boolean; clue: number }
/** the board after the words touched, in order (a word twice, or after the end, counts nothing) */
export const soloState = (s: SdSolo, picks: readonly string[]): SdSoloState => {
  const ours = new Set(s.clues.flatMap(c => c.words));
  const found: string[] = [];
  const misses: string[] = [];
  let trapped = false;
  for (const w of picks) {
    if (trapped || misses.length >= MAX_MISSES || found.length === ours.size) break;
    if (!s.tiles.includes(w) || found.includes(w) || misses.includes(w)) continue;
    if (w === s.trap) trapped = true;
    else if (ours.has(w)) found.push(w);
    else misses.push(w);
  }
  const won = !trapped && found.length === ours.size;
  const clue = s.clues.findIndex(c => c.words.some(w => !found.includes(w)));
  return { found, misses, trapped, won, lost: trapped || (!won && misses.length >= MAX_MISSES), clue: clue < 0 ? s.clues.length : clue };
};
export const soloOver = (st: SdSoloState) => st.won || st.lost;
export const soloPick = (s: SdSolo, picks: readonly string[], w: string): string[] => {
  const st = soloState(s, picks);
  return soloOver(st) || !s.tiles.includes(w) || picks.includes(w) ? [...picks] : [...picks, w];
};
/** ★★★ without a miss, ★★ with one or two, ★ with three */
export const soloStars = (st: SdSoloState) => (!st.won ? 0 : st.misses.length === 0 ? 3 : st.misses.length <= 2 ? 2 : 1);

export const saidumloDay = (s: SdSolo, picks: readonly string[]): HangiDay => {
  const st = soloState(s, picks);
  return { id: s.key, guesses: picks.slice(0, 20), won: st.won, done: soloOver(st) };
};
export const saidumloMeta = (days: Record<string, HangiDay>, today: string): string | undefined => {
  const d = days[today];
  if (d?.done) return d.won ? 'დღეს: გამოიცანი' : 'დღეს ვერ გამოვიდა';
  const { streak } = hangiStats(days, today);
  return streak ? `სერია: ${streak} დღე` : undefined;
};
/** the result as squares, row by row as the board lies: a found word blue, a miss white, the trap black */
export const saidumloShare = (n: number, s: SdSolo, picks: readonly string[], site = 'sagandzureli.ge') => {
  const st = soloState(s, picks);
  const marks = picks.slice(0, st.found.length + st.misses.length + (st.trapped ? 1 : 0)).map(w => (w === s.trap ? '⬛' : st.found.includes(w) ? '🟦' : '⬜'));
  const stars = st.won ? '★'.repeat(soloStars(st)) + '☆'.repeat(3 - soloStars(st)) : 'X';
  return `საიდუმლო სახელები №${n} · ${stars}\n${marks.join('')}\nსაგანძურის სკოლა · ${site}`;
};

// ---------- the class: a board by its code ----------
export const CODE_COUNT = 10000;
export interface SdWord { w: string; theme: string }
export interface SdBoard { code: number; words: string[]; sides: Side[]; first: Team }
const PER_THEME = 3;

/** whose each of the 25 places is: the first team 9, the other 8, nobody's 7, the trap 1 */
export const sidesFor = (rnd: () => number): { sides: Side[]; first: Team } => {
  const first: Team = rnd() < 0.5 ? 'blue' : 'red';
  const sides = shuffle<Side>([...Array<Side>(9).fill(first), ...Array<Side>(8).fill(other(first)), ...Array<Side>(7).fill('none'), 'trap'], rnd);
  return { sides, first };
};
/** the board of a code: 25 words of the pool, at most three of a theme, and its key — the same on every phone */
export const boardOfCode = (code: number, pool: readonly SdWord[]): SdBoard => {
  const rnd = mulberry32(hash32(`saidumlo-board|${code}`));
  const mixed = shuffle([...pool], rnd);
  const words: string[] = [];
  const per = new Map<string, number>();
  for (const cap of [PER_THEME, Infinity]) {
    for (const x of mixed) {
      if (words.length === GRID) break;
      if (words.includes(x.w) || (per.get(x.theme) ?? 0) >= cap) continue;
      per.set(x.theme, (per.get(x.theme) ?? 0) + 1);
      words.push(x.w);
    }
  }
  return { code, words, ...sidesFor(rnd) };
};
export const codeText = (code: number) => String(code).padStart(4, '0');
/** a typed code: four digits */
export const parseCode = (raw: string): number | null => (/^\d{4}$/.test(raw.trim()) ? +raw.trim() : null);

export type SdMove = { i: number } | { pass: true };
export interface SdView { opened: Map<number, Team>; turn: Team; switches: number; left: Record<Team, number>; over: { winner: Team; trap: boolean } | null }
/** the board after the moves: a team's own word keeps its turn, any other passes it; the trap loses, the last word wins */
export const tableView = (b: SdBoard, log: readonly SdMove[]): SdView => {
  const opened = new Map<number, Team>();
  let turn = b.first;
  let switches = 0;
  let over: SdView['over'] = null;
  const leftOf = (t: Team) => b.sides.filter((s, j) => s === t && !opened.has(j)).length;
  for (const m of log) {
    if (over) break;
    if ('pass' in m) { turn = other(turn); switches++; continue; }
    if (!Number.isInteger(m.i) || m.i < 0 || m.i >= b.sides.length || opened.has(m.i)) continue;
    opened.set(m.i, turn);
    const side = b.sides[m.i];
    if (side === 'trap') { over = { winner: other(turn), trap: true }; break; }
    if (!leftOf('blue')) { over = { winner: 'blue', trap: false }; break; }
    if (!leftOf('red')) { over = { winner: 'red', trap: false }; break; }
    if (side !== turn) { turn = other(turn); switches++; }
  }
  return { opened, turn, switches, left: { blue: leftOf('blue'), red: leftOf('red') }, over };
};

export const TURN_SECONDS = [0, 60, 90, 120];
export interface SdTable { code: number; seconds: number; log: SdMove[]; wins: Record<Team, number> }
export const newSdTable = (code: number, seconds: number, wins: Record<Team, number> = { blue: 0, red: 0 }): SdTable =>
  ({ code: ((Math.round(code) % CODE_COUNT) + CODE_COUNT) % CODE_COUNT, seconds: TURN_SECONDS.includes(seconds) ? seconds : 0, log: [], wins: { ...wins } });
export const parseSdTable = (raw: unknown): SdTable | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<SdTable>;
  if (!Number.isInteger(o.code) || (o.code as number) < 0 || (o.code as number) >= CODE_COUNT) return null;
  const log = (Array.isArray(o.log) ? o.log : []).filter((m): m is SdMove =>
    !!m && typeof m === 'object' && (('pass' in m && m.pass === true) || ('i' in m && Number.isInteger(m.i) && m.i >= 0 && m.i < GRID)));
  const w = (o.wins ?? {}) as Partial<Record<Team, number>>;
  const n = (x: unknown) => (Number.isInteger(x) && (x as number) >= 0 ? (x as number) : 0);
  return {
    code: o.code as number,
    seconds: TURN_SECONDS.includes(o.seconds as number) ? (o.seconds as number) : 0,
    log: log.map(m => ('pass' in m ? { pass: true as const } : { i: m.i })),
    wins: { blue: n(w.blue), red: n(w.red) },
  };
};
