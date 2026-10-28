import { hangiStats, hash32, type HangiDay } from './hangi';

// „ოთხეული“ (games hub, 2026-10-28, Connections-like): sixteen words, four hidden groups of four — saints, regions,
// instruments, chants… The player picks four that belong together; four mistakes end the game. One grid a day for the
// whole school (gridOfDay, the same on every phone) and as many extra grids as one likes (buildGrid with any seed). Pure;
// tests in tests/otkheuli.test.ts; the groups data/otkheuliGroups.ts; the page pages/games/OtkheuliGame.tsx. The day's
// record is the daily-game record of utils/hangi.ts: id = the grid's key, guesses = the picks ('+' solved, '-' wrong).

export const GROUP_SIZE = 4;
export const GROUPS_PER_GRID = 4;
export const MAX_MISTAKES = 4;

/** `family`: groups of one kind (the song lists, the chant lists) — a grid takes at most one of a family */
export interface OtkheuliGroup { id: string; label: string; words: string[]; family?: string }
export interface OtkheuliGrid { key: string; groups: OtkheuliGroup[]; tiles: string[] }

/** a small seeded random (mulberry32): the same seed gives the same grid on every phone */
export const mulberry32 = (seed: number) => () => {
  let t = (seed = (seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const shuffle = <T>(list: T[], rnd: () => number): T[] => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Four groups of four from the list: groups in a random order, four unused words of each; a word that belongs to two
 * groups (a saint who was a king, the church and the toast „ალავერდი“) is in the grid once — the trick of the game.
 * At most one group of a family (one region's songs, one service's chants). undefined when the list cannot fill four.
 */
export const buildGrid = (groups: OtkheuliGroup[], rnd: () => number): OtkheuliGrid | undefined => {
  const used = new Set<string>();
  const families = new Set<string>();
  const chosen: OtkheuliGroup[] = [];
  for (const g of shuffle(groups, rnd)) {
    if (g.family && families.has(g.family)) continue;
    const free = g.words.filter(w => !used.has(w));
    if (free.length < GROUP_SIZE) continue;
    if (g.family) families.add(g.family);
    const words = shuffle(free, rnd).slice(0, GROUP_SIZE);
    words.forEach(w => used.add(w));
    chosen.push({ ...g, words });
    if (chosen.length === GROUPS_PER_GRID) break;
  }
  if (chosen.length < GROUPS_PER_GRID) return undefined;
  return { key: chosen.map(g => g.id).join('+'), groups: chosen, tiles: shuffle(chosen.flatMap(g => g.words), rnd) };
};

/** the day's grid — the same for the whole school (Tbilisi day) */
export const gridOfDay = (groups: OtkheuliGroup[], iso: string) => buildGrid(groups, mulberry32(hash32(`otkheuli|${iso}`)));

export const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('\u0001') === [...b].sort().join('\u0001');

export type Verdict = { kind: 'solved'; group: OtkheuliGroup } | { kind: 'oneAway' } | { kind: 'wrong' };

export const checkPick = (grid: OtkheuliGrid, picked: string[]): Verdict => {
  const counts = grid.groups.map(g => picked.filter(w => g.words.includes(w)).length);
  const full = counts.indexOf(GROUP_SIZE);
  if (full >= 0) return { kind: 'solved', group: grid.groups[full] };
  return counts.includes(GROUP_SIZE - 1) ? { kind: 'oneAway' } : { kind: 'wrong' };
};

/** a recorded pick: '+' solved or '-' wrong, then the four words */
export const moveWords = (move: string) => move.slice(1).split('|');
export const wasTried = (moves: string[], picked: string[]) => moves.some(m => sameSet(moveWords(m), picked));

export interface OtkheuliState {
  solved: OtkheuliGroup[];
  mistakes: number;
  /** the tiles still on the board, in the grid's order */
  left: string[];
  done: boolean;
  won: boolean;
}

export const replay = (grid: OtkheuliGrid, moves: string[]): OtkheuliState => {
  const solved: OtkheuliGroup[] = [];
  let mistakes = 0;
  for (const m of moves) {
    if (m.startsWith('+')) {
      const g = grid.groups.find(x => sameSet(x.words, moveWords(m)));
      if (g && !solved.includes(g)) solved.push(g);
    } else mistakes++;
  }
  const won = solved.length === grid.groups.length;
  const gone = new Set(solved.flatMap(g => g.words));
  return { solved, mistakes, left: grid.tiles.filter(w => !gone.has(w)), done: won || mistakes >= MAX_MISTAKES, won };
};

/** the record after a pick of four (the caller has checked it is new) and what the pick was */
export const afterPick = (day: HangiDay, grid: OtkheuliGrid, picked: string[]): { day: HangiDay; verdict: Verdict } => {
  const verdict = checkPick(grid, picked);
  const guesses = [...day.guesses, `${verdict.kind === 'solved' ? '+' : '-'}${picked.join('|')}`];
  const st = replay(grid, guesses);
  return { day: { ...day, guesses, won: st.won, done: st.done }, verdict };
};

/** the group's colour by its place in the grid (the share squares use the same order) */
export const groupIndex = (grid: OtkheuliGrid, word: string) => grid.groups.findIndex(g => g.words.includes(word));
const SQUARES = ['🟨', '🟩', '🟦', '🟪'];

export const otkheuliShareText = (n: number, grid: OtkheuliGrid, moves: string[], site = 'sagandzureli.ge') => {
  const st = replay(grid, moves);
  const head = `ოთხეული №${n} · ${st.won ? (st.mistakes ? `${st.mistakes} შეცდომით` : 'უშეცდომოდ') : 'ვერ ვიპოვე'}`;
  const rows = moves.map(m => moveWords(m).map(w => SQUARES[groupIndex(grid, w)] ?? '⬜').join(''));
  return [head, ...rows, `საგანძურის სკოლა · ${site}`].join('\n');
};

const mistakesOf = (d: HangiDay) => d.guesses.filter(m => m.startsWith('-')).length;

export interface OtkheuliStats { played: number; won: number; streak: number; best: number; /** won by 0–3 mistakes, index 4 = lost */ dist: number[] }

export const otkheuliStats = (days: Record<string, HangiDay>, today: string): OtkheuliStats => {
  const { played, won, streak, best } = hangiStats(days, today);
  const dist = [0, 0, 0, 0, 0];
  for (const d of Object.values(days)) if (d.done) dist[d.won ? Math.min(mistakesOf(d), MAX_MISTAKES - 1) : MAX_MISTAKES]++;
  return { played, won, streak, best, dist };
};

/** One line for the games hub's row: today's result, or the streak while today is still open. */
export const otkheuliMeta = (days: Record<string, HangiDay>, today: string): string | undefined => {
  const d = days[today];
  if (d?.done) {
    const m = mistakesOf(d);
    return d.won ? (m ? `დღეს იპოვე ${m} შეცდომით` : 'დღეს უშეცდომოდ იპოვე') : 'დღეს ვერ იპოვე';
  }
  const { streak } = hangiStats(days, today);
  return streak ? `სერია: ${streak} დღე` : undefined;
};
