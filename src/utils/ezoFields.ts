import type { EzoId } from '../data/ezoGames';

// „ეზოს მსაჯი“: each yard game's field as a small drawing (an SVG string, viewBox 200×120) — the rules' picture in the app
// (pages/games/ezo/Field.tsx) and in the printed kit (src/print/games/ezos-msaji.js). Plain shapes only, no words
// but the few labels the rules name; built from constants, never from what anybody typed.

const BLUE = '#2b5f8a';
const RED = '#b23a48';
const GRASS = '#e7efd9';
const GRASS_EDGE = '#c9d8b4';
const CHALK = '#ffffff';
const INK = '#4a3426';

const label = (x: number, y: number, text: string, anchor: 'start' | 'middle' | 'end' = 'middle', size = 6.5) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="700" fill="${INK}" text-anchor="${anchor}">${text}</text>`;
const kid = (x: number, y: number, color: string) => `<circle cx="${x}" cy="${y}" r="4.3" fill="${color}" stroke="#fff" stroke-width="1.2"/>`;
const arrow = (x1: number, y1: number, x2: number, y2: number, color: string) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = (d: number) => `${(x2 - 5 * Math.cos(a + d)).toFixed(1)},${(y2 - 5 * Math.sin(a + d)).toFixed(1)}`;
  return `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${color}" stroke-width="1.6" stroke-dasharray="3 2" fill="none" stroke-linecap="round"/>`
    + `<path d="M${h(0.5)} L${x2} ${y2} L${h(-0.5)}" stroke="${color}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
};
const field = (fill = GRASS, edge = GRASS_EDGE) => `<rect x="3" y="3" width="194" height="114" rx="10" fill="${fill}" stroke="${edge}" stroke-width="1.5"/>`;
const halves = () =>
  `<path d="M13 3H100V117H13A10 10 0 0 1 3 107V13A10 10 0 0 1 13 3Z" fill="${BLUE}" fill-opacity=".09"/>`
  + `<path d="M100 3H187A10 10 0 0 1 197 13V107A10 10 0 0 1 187 117H100Z" fill="${RED}" fill-opacity=".09"/>`;
const flag = (x: number, y: number, color: string, dir: 1 | -1) =>
  `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${CHALK}" stroke-width="1.8"/>`
  + `<path d="M${x - 3 * dir} ${y + 8}V${y - 9}" stroke="#6b5544" stroke-width="1.6" stroke-linecap="round"/>`
  + `<path d="M${x - 3 * dir} ${y - 9}L${x + 9 * dir} ${y - 5}L${x - 3 * dir} ${y - 1}Z" fill="${color}"/>`;
const prison = (x: number, y: number) => `<rect x="${x}" y="${y}" width="24" height="19" rx="2" fill="none" stroke="${CHALK}" stroke-width="1.8" stroke-dasharray="3 2"/>`;

const ordrosha = () => [
  field(), halves(),
  `<path d="M100 6V114" stroke="${CHALK}" stroke-width="2.2" stroke-dasharray="5 3"/>`,
  flag(24, 60, BLUE, 1), flag(176, 60, RED, -1),
  prison(9, 9), prison(167, 92),
  label(21, 35, 'ციხე'), label(179, 88, 'ციხე'),
  kid(15, 19, RED), kid(185, 101, BLUE),
  kid(48, 28, BLUE), kid(62, 86, BLUE), kid(76, 48, BLUE), kid(40, 100, BLUE),
  kid(126, 28, RED), kid(150, 84, RED), kid(136, 104, RED), kid(160, 34, RED),
  kid(140, 58, BLUE), arrow(146, 59, 163, 60, BLUE),
  kid(52, 64, RED), arrow(46, 63, 35, 61, RED),
  `<rect x="78" y="7" width="44" height="11" rx="5.5" fill="#fff" fill-opacity=".85"/>`, label(100, 14.6, 'შუა ხაზი'),
].join('');

const lelo = () => [
  field(),
  `<path d="M13 3H22V117H13A10 10 0 0 1 3 107V13A10 10 0 0 1 13 3Z" fill="${BLUE}" fill-opacity=".14"/>`,
  `<path d="M178 3H187A10 10 0 0 1 197 13V107A10 10 0 0 1 187 117H178Z" fill="${RED}" fill-opacity=".14"/>`,
  `<path d="M22 6V114M178 6V114" stroke="${CHALK}" stroke-width="2.8"/>`,
  `<circle cx="100" cy="60" r="13" fill="none" stroke="${CHALK}" stroke-width="1.8"/>`,
  `<ellipse cx="100" cy="60" rx="6.5" ry="4.5" fill="#8a5a22"/><path d="M96 60H104" stroke="#f3e3c6" stroke-width="1"/>`,
  `<g transform="rotate(-90 12 60)">${label(12, 62.3, 'ლურჯების ლელო', 'middle', 6)}</g>`,
  `<g transform="rotate(90 188 60)">${label(188, 62.3, 'წითლების ლელო', 'middle', 6)}</g>`,
  kid(70, 34, BLUE), kid(58, 72, BLUE), kid(80, 96, BLUE), kid(44, 50, BLUE),
  kid(130, 30, RED), kid(142, 72, RED), kid(122, 96, RED), kid(156, 50, RED),
  arrow(110, 22, 168, 22, BLUE), arrow(90, 108, 32, 108, RED),
].join('');

const damalobana = () => [
  field(),
  `<rect x="37" y="55" width="7" height="30" rx="2" fill="#7a5a3c"/>`,
  `<circle cx="40" cy="44" r="22" fill="#7fa761"/><circle cx="31" cy="38" r="9" fill="#8fb872"/><circle cx="50" cy="48" r="8" fill="#6f9a55"/>`,
  `<rect x="27" y="90" width="26" height="12" rx="6" fill="#fff"/>`, label(40, 98.3, 'შინ'),
  kid(52, 76, '#7a2028'), label(68, 72, '…29, 30!', 'start', 6),
  `<path d="M108 52c-6 0-8-8-2-11 1-7 10-8 13-3 6-3 13 1 12 7 5 2 4 8-1 8Z" fill="#6f9a55"/>`,
  `<path d="M146 100c-6 0-8-8-2-11 1-7 10-8 13-3 6-3 13 1 12 7 5 2 4 8-1 8Z" fill="#6f9a55"/>`,
  `<rect x="150" y="14" width="40" height="11" rx="1.5" fill="#cbbfae"/><path d="M160 14V25M170 14V25M180 14V25" stroke="#b3a594" stroke-width=".8"/>`,
  kid(124, 38, '#2b5f8a'), kid(176, 9.5, '#5b3f8c'), kid(164, 92, '#c08a1e'),
  kid(96, 82, '#2f7d4f'), arrow(90, 82, 58, 82, '#2f7d4f'),
].join('');

const stick = (x: number, y: number, color: string, pose: number) => {
  const arms = [
    `M${x - 7} ${y - 2}L${x} ${y + 2}L${x + 7} ${y - 2}`, // up-ish
    `M${x - 8} ${y + 6}L${x} ${y + 2}L${x + 6} ${y - 6}`, // one up
    `M${x - 7} ${y - 7}L${x} ${y + 2}L${x + 7} ${y - 7}`, // both up
    `M${x - 8} ${y + 2}L${x + 8} ${y + 2}`, // out
    `M${x - 4} ${y + 9}L${x} ${y + 2}L${x + 8} ${y - 1}`, // waving
  ][pose % 5];
  const legs = [
    `M${x - 5} ${y + 20}L${x} ${y + 11}L${x + 5} ${y + 20}`,
    `M${x - 2} ${y + 20}L${x} ${y + 11}L${x + 7} ${y + 15}`, // one leg up
    `M${x - 6} ${y + 20}L${x} ${y + 11}L${x + 6} ${y + 20}`,
    `M${x - 3} ${y + 20}L${x} ${y + 11}L${x + 3} ${y + 20}`,
    `M${x - 7} ${y + 19}L${x} ${y + 11}L${x + 4} ${y + 20}`,
  ][pose % 5];
  return `<circle cx="${x}" cy="${y - 4.5}" r="4" fill="${color}"/>`
    + `<path d="M${x} ${y}V${y + 11}${arms}${legs}" stroke="${color}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
};

const zghva = () => [
  field(),
  `<path d="M13 3H187A10 10 0 0 1 197 13V44H3V13A10 10 0 0 1 13 3Z" fill="#cfe2ef"/>`,
  ...[14, 25, 36].map((y, i) => `<path d="M${6 + i * 4} ${y}q8-6 16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0" stroke="#2b5f8a" stroke-opacity="${0.75 - i * 0.18}" stroke-width="2" fill="none" stroke-linecap="round"/>`),
  stick(30, 70, '#7a2028', 0), stick(58, 80, '#2b5f8a', 1), stick(88, 68, '#2f7d4f', 2), stick(118, 82, '#5b3f8c', 3), stick(146, 70, '#c08a1e', 4),
  `<circle cx="180" cy="79" r="4" fill="${INK}"/><path d="M180 83.5V95M174 89H186M176 105L180 95L184 105" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
  `<path d="M154 50h38a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-12l-2 6-4-6h-20a4 4 0 0 1-4-4v-8a4 4 0 0 1 4-4Z" fill="#fff"/>`,
  label(173, 60.3, 'გაშეშდი!', 'middle', 7),
].join('');

/** hopscotch's ten classes, walked from left to right: x, y, w, h of each (the tenth is the half circle) */
export const KLASI_CELLS: { n: number; x: number; y: number; w: number; h: number }[] = [
  { n: 1, x: 18, y: 45, w: 22, h: 30 }, { n: 2, x: 40, y: 45, w: 22, h: 30 }, { n: 3, x: 62, y: 45, w: 22, h: 30 },
  { n: 4, x: 84, y: 30, w: 22, h: 30 }, { n: 5, x: 84, y: 60, w: 22, h: 30 }, { n: 6, x: 106, y: 45, w: 22, h: 30 },
  { n: 7, x: 128, y: 30, w: 22, h: 30 }, { n: 8, x: 128, y: 60, w: 22, h: 30 }, { n: 9, x: 150, y: 45, w: 22, h: 30 },
  { n: 10, x: 172, y: 45, w: 15, h: 30 },
];

const klasobana = (pebble = 3, done = 0) => {
  const line = '#8a7560';
  const cells = KLASI_CELLS.map(c => {
    const fill = c.n === pebble ? '#c9a227' : c.n <= done ? '#2f7d4f' : 'none';
    const op = c.n === pebble ? '.32' : c.n <= done ? '.14' : '0';
    const shape = c.n === 10
      ? `<path d="M172 45A15 15 0 0 1 172 75Z" fill="${fill}" fill-opacity="${op}" stroke="${line}" stroke-width="1.6"/>`
      : `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="${fill}" fill-opacity="${op}" stroke="${line}" stroke-width="1.6"/>`;
    const tx = c.n === 10 ? 179.5 : c.x + c.w / 2;
    return `${shape}<text x="${tx}" y="${c.y + c.h / 2 + 3.4}" font-size="${c.n === 10 ? 8.5 : 10}" font-weight="700" fill="${INK}" fill-opacity="${c.n === pebble ? '.35' : '1'}" text-anchor="middle">${c.n}</text>`;
  }).join('');
  const p = KLASI_CELLS.find(c => c.n === pebble);
  const stone = p ? `<ellipse cx="${p.n === 10 ? 179.5 : p.x + p.w / 2}" cy="${p.y + p.h / 2}" rx="5.5" ry="3.8" fill="#7d756c" stroke="#fff" stroke-width="1.2"/>` : '';
  return [
    field('#efe9df', '#ddd3c4'),
    cells, stone,
    arrow(22, 18, 182, 18, '#7a2028'), label(102, 13, 'წინ — ცალ ფეხზე', 'middle', 6),
    arrow(182, 102, 22, 102, '#7a2028'), label(102, 113, 'უკან — კენჭი აიღე', 'middle', 6),
  ].join('');
};

export interface FieldOpts { pebble?: number; done?: number }

/** the field of a game as an SVG document's markup */
export const fieldSvg = (id: EzoId, opts: FieldOpts = {}) => {
  const body = id === 'ordrosha' ? ordrosha()
    : id === 'lelo' ? lelo()
    : id === 'damalobana' ? damalobana()
    : id === 'zghva' ? zghva()
    : klasobana(opts.pebble, opts.done);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" aria-hidden="true">${body}</svg>`;
};
