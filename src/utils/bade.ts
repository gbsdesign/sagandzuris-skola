// „ასოების ბადე“ (games hub, 2026-11-01, the plan's Georgian game №3, like Word search): a theme's words hidden in a square of
// letters — across, down and on the diagonals, backwards too on the hardest level; the player draws a line over a word's
// letters. The grid is kept in today's letters and shown in nuskhuri or asomtavruli when asked (utils/oldScripts.ts), with the
// alphabet's key under it. One grid a day for the whole school — its record (hooks/useDailyRecord 'bade') holds the words found
// in order, then `t:<seconds>` and `s:<script>` — and more grids at random. Pure, tested in tests/bade.test.ts; the teams'
// game on one phone is utils/badeTeams.ts.

import { hangiStats, hash32, pickOfDay, type HangiDay } from './hangi';
import { mulberry32, shuffle } from './otkheuli';
import { ALPHABET, SCRIPT_BY, isScript, type Script } from './oldScripts';

export interface BadeTheme { id: string; title: string; words: string[] }

export type LevelId = 'easy' | 'mid' | 'hard';
export interface BadeLevel { id: LevelId; label: string; size: number; words: number; /** how many of DIRS */ dirs: number; note: string }

/** the ways a word may run: → ↓ ↘ ↗, then backwards ← ↑ ↖ ↙ — a level takes the first `dirs` */
export const DIRS: ReadonlyArray<readonly [number, number]> = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];

export const LEVELS: Record<LevelId, BadeLevel> = {
  easy: { id: 'easy', label: 'მარტივი', size: 8, words: 6, dirs: 2, note: '8×8 · მარჯვნივ და ქვევით' },
  mid: { id: 'mid', label: 'საშუალო', size: 10, words: 8, dirs: 4, note: '10×10 · დიაგონალზეც' },
  hard: { id: 'hard', label: 'რთული', size: 12, words: 9, dirs: 8, note: '12×12 · უკუღმაც' },
};
export const LEVEL_IDS: LevelId[] = ['easy', 'mid', 'hard'];
export const isLevel = (v: unknown): v is LevelId => LEVEL_IDS.includes(v as LevelId);
/** the day's grid: 10×10, eight words, no backward ones */
export const DAY_LEVEL: LevelId = 'mid';

export const MIN_LEN = 3;
/** fewer words than this make no game: a theme that cannot give them is left out */
export const MIN_WORDS = 5;

export interface Placed { word: string; r: number; c: number; dr: number; dc: number }
export interface BadeGrid { key: string; theme: BadeTheme; level: LevelId; size: number; cells: string[]; placed: Placed[] }

const LETTERS_ONLY = /^[ა-ჰ]+$/;

/** a theme's words that can hide in a grid of `size`: one word of letters only, 3 … size long, each once */
export const usableWords = (words: string[], size: number) =>
  [...new Set(words)].filter(w => LETTERS_ONLY.test(w) && w.length >= MIN_LEN && w.length <= size);

const reversed = (w: string) => [...w].reverse().join('');
/** two words one of which hides in the other (or in it backwards): „ბალი“ in „ალუბალი“ would be found twice */
const clash = (a: string, b: string) => a.includes(b) || b.includes(a) || a.includes(reversed(b)) || b.includes(reversed(a));

/** the grid's cells of a hidden word, as [row, column] */
export const cellsOf = (p: Placed) => Array.from({ length: p.word.length }, (_, i) => [p.r + i * p.dr, p.c + i * p.dc] as const);
/** the same as indexes into `cells` (row × size + column) */
export const indexCells = (p: Placed, size: number) => cellsOf(p).map(([r, c]) => r * size + c);

const inside = (r: number, c: number, size: number) => r >= 0 && r < size && c >= 0 && c < size;

/** how many times `word` can be read in the grid, any of the eight ways (a palindrome's two readings count once) */
export const countWord = (cells: string[], size: number, word: string): number => {
  const seen = new Set<string>();
  const n = word.length;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    if (cells[r * size + c] !== word[0]) continue;
    for (const [dr, dc] of DIRS) {
      if (!inside(r + (n - 1) * dr, c + (n - 1) * dc, size)) continue;
      let ok = true;
      for (let i = 1; i < n && ok; i++) ok = cells[(r + i * dr) * size + c + i * dc] === word[i];
      if (ok) seen.add(Array.from({ length: n }, (_, i) => (r + i * dr) * size + c + i * dc).sort((x, y) => x - y).join(','));
    }
  }
  return seen.size;
};

/** every place a word may go on the grid laid so far: inside it, on empty cells or the same letters, never wholly on a word */
const spotsFor = (grid: (string | null)[], size: number, dirs: number, word: string): Placed[] => {
  const spots: Placed[] = [];
  const n = word.length;
  for (let d = 0; d < dirs; d++) {
    const [dr, dc] = DIRS[d];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      if (!inside(r + (n - 1) * dr, c + (n - 1) * dc, size)) continue;
      let ok = true, shared = 0;
      for (let i = 0; i < n && ok; i++) {
        const v = grid[(r + i * dr) * size + c + i * dc];
        if (v === null) continue;
        if (v === word[i]) shared++; else ok = false;
      }
      if (ok && shared < n) spots.push({ word, r, c, dr, dc });
    }
  }
  return spots;
};

/** the words laid on an empty grid — the longest first; a word with no room is passed over, the next one of the theme tried */
const lay = (pool: string[], want: number, size: number, dirs: number, rnd: () => number) => {
  const grid: (string | null)[] = Array(size * size).fill(null);
  const placed: Placed[] = [];
  const picked = pool.slice(0, want).sort((a, b) => b.length - a.length);
  const spare = pool.slice(want);
  const tryWord = (word: string) => {
    if (placed.some(p => clash(p.word, word))) return;
    const spots = spotsFor(grid, size, dirs, word);
    if (!spots.length) return;
    const p = spots[Math.floor(rnd() * spots.length)];
    cellsOf(p).forEach(([r, c], i) => { grid[r * size + c] = word[i]; });
    placed.push(p);
  };
  for (const w of picked) tryWord(w);
  for (const w of spare) { if (placed.length >= want) break; tryWord(w); }
  return { grid, placed };
};

/**
 * A grid of the theme at the level, or undefined when the theme cannot give enough words. The empty cells are filled with
 * letters of the hidden words (decoys) and of the whole alphabet twice (so the grid is not all ა and ი), and filled again
 * until every hidden word can be read exactly once — so a line the player draws is a word of the list or nothing.
 */
export const buildBade = (theme: BadeTheme, level: LevelId, rnd: () => number, key = ''): BadeGrid | undefined => {
  const { size, words: want, dirs } = LEVELS[level];
  const usable = usableWords(theme.words, size);
  const need = Math.min(want, Math.max(MIN_WORDS, usable.length));
  if (usable.length < MIN_WORDS) return undefined;
  for (let attempt = 0; attempt < 40; attempt++) {
    const { grid, placed } = lay(shuffle(usable, rnd), want, size, dirs, rnd);
    // the full count first; words hiding in one another may leave fewer, then any game of five or more will do
    if (placed.length < (attempt < 30 ? need : MIN_WORDS)) continue;
    const pool = [...placed.flatMap(p => [...p.word]), ...ALPHABET, ...ALPHABET];
    for (let f = 0; f < 16; f++) {
      const cells = grid.map(v => v ?? pool[Math.floor(rnd() * pool.length)]);
      if (placed.every(p => countWord(cells, size, p.word) === 1)) {
        return { key, theme, level, size, cells, placed: [...placed].sort((a, b) => (a.word < b.word ? -1 : a.word > b.word ? 1 : 0)) };
      }
    }
  }
  return undefined;
};

/** the themes that can give a full grid at the level */
export const themesFor = (themes: BadeTheme[], level: LevelId) => themes.filter(t => usableWords(t.words, LEVELS[level].size).length >= LEVELS[level].words);

/** the day's grid, the same on every phone: the theme by the day (never yesterday's), the letters by the day's seed */
export const gridOfDay = (themes: BadeTheme[], iso: string): BadeGrid | undefined => {
  const theme = pickOfDay(themesFor(themes, DAY_LEVEL), iso);
  return theme && buildBade(theme, DAY_LEVEL, mulberry32(hash32(`bade|${iso}`)), `${iso}|${theme.id}`);
};

/** a grid at random (`avoid` = themes not wanted now, if others are left) */
export const randomGrid = (themes: BadeTheme[], level: LevelId, seed: number, avoid: string[] = []): BadeGrid | undefined => {
  const all = themesFor(themes, level);
  const fresh = all.filter(t => !avoid.includes(t.id));
  const pool = fresh.length ? fresh : all;
  if (!pool.length) return undefined;
  const rnd = mulberry32(seed);
  const theme = pool[Math.floor(rnd() * pool.length)];
  return buildBade(theme, level, rnd, `x|${theme.id}|${level}|${seed}`);
};

/**
 * The cells of a straight line from cell `a` towards cell `b`: across, down or diagonal; any other drag snaps to the nearest
 * of the eight ways, as long as the drag's longer side, cut at the grid's edge.
 */
export const lineOf = (a: number, b: number, size: number): number[] => {
  const ra = Math.floor(a / size), ca = a % size, rb = Math.floor(b / size), cb = b % size;
  const dr = rb - ra, dc = cb - ca;
  if (!dr && !dc) return [a];
  const k = Math.round(Math.atan2(dr, dc) / (Math.PI / 4));
  const sr = Math.round(Math.sin((k * Math.PI) / 4)), sc = Math.round(Math.cos((k * Math.PI) / 4));
  const out: number[] = [];
  for (let i = 0; i <= Math.max(Math.abs(dr), Math.abs(dc)); i++) {
    const r = ra + i * sr, c = ca + i * sc;
    if (!inside(r, c, size)) break;
    out.push(r * size + c);
  }
  return out;
};

/** the hidden word a line covers, read either way: its index in `placed`, or -1 */
export const wordOnLine = (grid: BadeGrid, line: number[]): number => {
  if (line.length < MIN_LEN) return -1;
  const key = [...line].sort((x, y) => x - y).join(',');
  return grid.placed.findIndex(p => indexCells(p, grid.size).sort((x, y) => x - y).join(',') === key);
};

// ---------- the day's record ----------

/** the words found, in order */
export const foundOf = (d: HangiDay) => d.guesses.filter(g => !g.includes(':'));
/** the seconds the day took so far */
export const timeOf = (d: HangiDay) => {
  const t = d.guesses.find(g => g.startsWith('t:'));
  return t ? Math.max(0, Math.round(Number(t.slice(2))) || 0) : 0;
};
/** the script the day was played in (the last one used) */
export const scriptOf = (d: HangiDay): Script => {
  const s = d.guesses.find(g => g.startsWith('s:'))?.slice(2);
  return isScript(s) ? s : 'mkhedruli';
};

const marks = (secs: number, script: Script) => [`t:${Math.max(0, Math.round(secs))}`, `s:${script}`];

/** the record after a word found (once), with the time so far; all found = won */
export const withFound = (day: HangiDay, grid: BadeGrid, word: string, secs: number, script: Script): HangiDay => {
  const found = foundOf(day);
  const all = found.includes(word) ? found : [...found, word];
  const won = grid.placed.every(p => all.includes(p.word));
  return { ...day, guesses: [...all, ...marks(secs, script)], won, done: won };
};
/** the record with the time so far (the page is left half-way) */
export const withTime = (day: HangiDay, secs: number, script: Script): HangiDay => ({ ...day, guesses: [...foundOf(day), ...marks(secs, script)] });
/** „სიტყვების ჩვენება“: the day ends with the words found so far */
export const gaveUp = (day: HangiDay, secs: number, script: Script): HangiDay => ({ ...withTime(day, secs, script), won: false, done: true });

/** 2:05 */
export const clock = (secs: number) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

export interface BadeStats { played: number; won: number; streak: number; best: number; /** seconds of the fastest whole day */ fastest: number | null }

export const badeStats = (days: Record<string, HangiDay>, today: string): BadeStats => {
  const { played, won, streak, best } = hangiStats(days, today);
  let fastest: number | null = null;
  for (const d of Object.values(days)) {
    const t = timeOf(d);
    if (d.done && d.won && t > 0 && (fastest === null || t < fastest)) fastest = t;
  }
  return { played, won, streak, best, fastest };
};

/** the result for the clipboard or the share sheet, without the words */
export const badeShareText = (n: number, grid: BadeGrid, day: HangiDay, site = 'sagandzureli.ge') => {
  const all = grid.placed.length;
  const script = scriptOf(day);
  const line = day.won ? `✅ ${all}/${all} · ${clock(timeOf(day))}` : `🔎 ${foundOf(day).length}/${all}`;
  return [`ასოების ბადე №${n} · ${grid.theme.title}`, script === 'mkhedruli' ? line : `${line} · ${SCRIPT_BY[script]}`, `საგანძურის სკოლა · ${site}`].join('\n');
};

/** One line for the games hub's row: today's result, or the streak while today is still open. */
export const badeMeta = (days: Record<string, HangiDay>, today: string): string | undefined => {
  const d = days[today];
  if (d?.done) return d.won ? `დღეს ყველა იპოვე · ${clock(timeOf(d))}` : `დღეს იპოვე ${foundOf(d).length}`;
  const { streak } = hangiStats(days, today);
  return streak ? `სერია: ${streak} დღე` : undefined;
};
