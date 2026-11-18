// Small shared helpers of kit v2.

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** The one keyboard focus mark of every tappable thing (a finger never sees it). */
export const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60';

/** The same mark drawn inside, for things whose card clips its edges (rows, tiles in a row card). */
export const FOCUS_IN = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-wine/60';
