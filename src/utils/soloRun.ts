// A quick game alone (2026-11-01, first „რუკის ვიქტორინა“, then „გააგრძელე!“; screens pages/games/rounds/Solo.tsx): ten
// rounds in a row on my phone, a tap answers at once; at the end the score, the time and my best run, kept on the device.

export const SOLO_ROUNDS = 10;

export interface SoloBest { score: number; right: number; ms: number; at: string }

/** a run is better with more points, then with less time */
export const betterRun = (a: Pick<SoloBest, 'score' | 'ms'>, b: Pick<SoloBest, 'score' | 'ms'> | null) =>
  !b || a.score > b.score || (a.score === b.score && a.ms < b.ms);

export const parseBest = (v: unknown): SoloBest | null => {
  const o = v as Partial<SoloBest> | null;
  return o && Number.isInteger(o.score) && Number.isInteger(o.right) && Number.isFinite(o.ms) && typeof o.at === 'string'
    ? { score: o.score!, right: o.right!, ms: o.ms!, at: o.at } : null;
};
