/** An end screen's headline (2026-11-04, the games' review: a 0 : 0 game said „ფრეა: …“ with every team under a trophy).
 *  `top` = the best score; when nobody is above 0 nobody won — in „რა? სად? როდის?“'s words. */
export const NOBODY_WON = 'ამჯერად ქულა არავის აქვს';
export const winLine = (winners: readonly string[], top: number, one: (name: string) => string) =>
  top <= 0 ? NOBODY_WON : winners.length > 1 ? `ფრეა: ${winners.join(', ')}` : one(winners[0] ?? '');
