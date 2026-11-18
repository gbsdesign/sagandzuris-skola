// The redesign's design rules as plain values — the same as src/design/tokens.css (tests/designRules.test.ts checks
// that the two agree). For the places a class cannot reach: a canvas, an inline SVG's fill, a chart, a meta tag.
// In components use the classes (`text-ink`, `bg-surf`, `text-meta`, `rounded-card`, `min-h-tap` …).

export const COLOR = {
  page: '#f1eee9',
  surf: '#ffffff',
  line: '#e6e1d9',
  soft: '#e7e1d8',
  dim: '#cfc8be',
  ink: '#1b1816',
  mut: '#6b625a',
  faint: '#a59c92',
  wine: '#7a2028',
  wineDeep: '#5e1820',
  tint: '#f3e6e6',
  danger: '#b3261e',
  gold: '#a8781f',
  goldInk: '#7a5510',
  goldTint: '#f3e3be',
  leaf: '#3e7d55',
  leafInk: '#2f6b43',
  leafTint: '#dcebdd',
  sea: '#2f6e8e',
  seaTint: '#e7eef5',
  plum: '#7a5aa6',
  clay: '#b4552d',
  nightSurf: '#26221f',
  nightInk: '#f2ede7',
  blush: '#e9a0a7',
} as const;

export type ColorName = keyof typeof COLOR;

/** the dark look's grounds and words (tokens.css `html.sg-dark`); the colours not named here stay as in COLOR */
export const DARK = {
  page: '#141211',
  surf: '#26221f',
  line: '#3a3633',
  soft: '#34302c',
  dim: '#4a443f',
  ink: '#f2ede7',
  mut: '#a59c92',
  faint: '#756d65',
  tint: '#3f2f2f',
  goldInk: '#e3c37a',
  goldTint: '#3d3220',
  leafInk: '#8fd0a5',
  leafTint: '#23352a',
  seaTint: '#1f3540',
} as const satisfies Partial<Record<ColorName, string>>;

/** words that are an accent's ground in the light look, drawn lighter on the dark ground (index.css, html.sg-dark) */
export const DARK_WORDS = { wine: '#e9a0a7', danger: '#f2a29c', sea: '#8cc3df' } as const;

/** the seven text sizes, in px at the usual 16px root */
export const TEXT_PX = { cap: 12, meta: 13, body: 15, lead: 16, head: 18, title: 22, hero: 28 } as const;

/** the four corners (pills and round marks are fully round) */
export const RADIUS_PX = { card: 28, tile: 20, field: 14, chip: 8 } as const;

/** finger sizes: the least a tappable thing may be, a main button, a small round button, a list row */
export const TAP_PX = { tap: 44, tapLg: 48, icon: 36, row: 64 } as const;

/** the six colours of round category marks, in the order lists hand them out */
export const MARKS = [COLOR.wine, COLOR.gold, COLOR.sea, COLOR.leaf, COLOR.plum, COLOR.clay] as const;
