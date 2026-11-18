import { dayBefore, type HangiDay } from './hangi';

// „ნუ იტყვი!“'s day record and the hub's line, apart from the cards (data/tabuCards.ts) so the games list does not load
// them (redesign stage 3 „სიჩქარე“). utils/tabu.ts re-exports all of it; tested in tests/tabu.test.ts.

export const DAY_CARDS = 20;
export const CLUES = 5;
export const MAX_DAY_POINTS = DAY_CARDS * CLUES;

export const runScore = (r: { pts: readonly number[] }) => r.pts.reduce((a, b) => a + b, 0);

// HangiDay.guesses = one mark `p:<a digit a card, 0 … 5>`; `won` = the twenty were played (a streak counts days played).

export const pointsOf = (d: Pick<HangiDay, 'guesses'>) =>
  [...(d.guesses.find(g => g.startsWith('p:'))?.slice(2) ?? '')].filter(c => /[0-5]/.test(c)).map(Number).slice(0, DAY_CARDS);

export interface TabuStats { played: number; streak: number; best: number; average: number | null }
export const tabuStats = (days: Record<string, HangiDay>, today: string): TabuStats => {
  const done = Object.values(days).filter(d => d.done);
  let streak = 0;
  let cursor = days[today]?.done ? today : dayBefore(today);
  while (days[cursor]?.done) { streak++; cursor = dayBefore(cursor); }
  const scores = done.map(d => runScore({ pts: pointsOf(d) }));
  return {
    played: done.length,
    streak,
    best: scores.length ? Math.max(...scores) : 0,
    average: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
  };
};

/** one line for the games hub's row */
export const tabuMeta = (days: Record<string, HangiDay>, today: string): string | undefined => {
  const d = days[today];
  if (d?.done) return `დღეს: ${runScore({ pts: pointsOf(d) })}/${MAX_DAY_POINTS}`;
  const { streak } = tabuStats(days, today);
  return streak ? `სერია: ${streak} დღე` : undefined;
};
