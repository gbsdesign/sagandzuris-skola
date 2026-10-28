// „ამიხსენი“ — the Alias-like table game of the games hub (2026-10-28): one player explains words to their team without
// saying them, the phone counts the minute and the points and passes from team to team. These helpers are pure and
// tested in tests/amikhseni.test.ts; the page is pages/games/AmikhseniGame.tsx, the word cards data/amikhseniWords.ts.

export interface AliasSettings {
  teams: number;
  seconds: number;
  target: number;
  /** a skipped word costs a point (the classic rule) */
  penalty: boolean;
  /** chosen card categories; none chosen = all */
  categories: string[];
}

/** The teams are named after the instruments, in the order the phone passes. */
export const TEAM_NAMES = ['ჩონგური', 'ფანდური', 'დოლი', 'სალამური', 'ჭუნირი', 'ჩანგი'];
export const MAX_TEAMS = TEAM_NAMES.length;
export const SECONDS_CHOICES = [60, 90, 120];
export const TARGET_CHOICES = [20, 30, 50];
export const DEFAULT_SETTINGS: AliasSettings = { teams: 2, seconds: 60, target: 30, penalty: true, categories: [] };

export interface TurnWord { word: string; ok: boolean }
/** One team's minute: the words shown, each guessed (ok) or skipped. */
export interface Turn { team: number; words: TurnWord[] }

export const shuffle = <T>(a: T[], rnd: () => number = Math.random): T[] => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

/** The deck: every word of the chosen categories (all when none is chosen) once, shuffled. */
export const buildDeck = (cats: { id: string; words: string[] }[], chosen: string[], rnd: () => number = Math.random): string[] => {
  const use = chosen.length ? cats.filter(c => chosen.includes(c.id)) : cats;
  return shuffle([...new Set(use.flatMap(c => c.words))], rnd);
};

export const turnScore = (t: Turn, penalty: boolean) => t.words.reduce((s, w) => s + (w.ok ? 1 : penalty ? -1 : 0), 0);

export const totals = (turns: Turn[], teams: number, penalty: boolean): number[] => {
  const s = Array.from({ length: teams }, () => 0);
  turns.forEach(t => { if (t.team < teams) s[t.team] += turnScore(t, penalty); });
  return s;
};

export const nextTeam = (turnsPlayed: number, teams: number) => turnsPlayed % teams;

/** The winner once every team has had the same number of turns and one is at the target: the highest; a tie plays on. */
export const winnerOf = (scores: number[], target: number, turnsPlayed: number): number | null => {
  if (!scores.length || turnsPlayed === 0 || turnsPlayed % scores.length !== 0) return null;
  const max = Math.max(...scores);
  if (max < target) return null;
  const leaders = scores.map((s, i) => (s === max ? i : -1)).filter(i => i >= 0);
  return leaders.length === 1 ? leaders[0] : null;
};

/** m:ss for the timer. */
export const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
