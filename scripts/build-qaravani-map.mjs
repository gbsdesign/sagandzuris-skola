// „ქარავანი“ in the app: writes the roads and the cities' worth and cargo for its rules (src/data/qaravaniRoutes.ts) and the map's drawing
// (src/data/qaravaniMap.ts) from the print kit (src/print/games/qaravani.js), so the app's board is the printed one.
// Run `node scripts/build-qaravani-map.mjs` again after the kit's map changes; never edit the two files by hand.
import fs from 'node:fs';
import path from 'node:path';
import { appData, ROOT } from './lib/appData.mjs';

const { appMap } = await appData({ 'print/games/qaravani.js': ['appMap'] });
const m = appMap();

// the print's drawing is finer than a phone needs: lines are thinned (Douglas–Peucker, 0.2 mm), numbers kept to 0.1 mm, and a
// long line drawn more than once (the coast's water bands) is drawn once in <defs> and used again
const r1 = n => { const v = Math.round(n * 10) / 10; return Object.is(v, -0) ? '0' : String(v); };
const simplify = (pts, tol) => {
  if (pts.length < 3) return pts;
  const keep = new Array(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop();
    const [ax, ay] = pts[i], [bx, by] = pts[j], L = Math.hypot(bx - ax, by - ay) || 1e-9;
    let best = -1, k = -1;
    for (let q = i + 1; q < j; q++) {
      const d = Math.abs((bx - ax) * (ay - pts[q][1]) - (ax - pts[q][0]) * (by - ay)) / L;
      if (d > best) { best = d; k = q; }
    }
    if (best > tol) { keep[k] = true; stack.push([i, k], [k, j]); }
  }
  return pts.filter((_, q) => keep[q]);
};
const slimD = d => {
  if (!/^[MLZ0-9.,\- ]+$/.test(d)) return d.replace(/-?\d*\.\d+/g, n => r1(+n));
  const parts = d.split('M').filter(Boolean).map(part => {
    const closed = part.trim().endsWith('Z');
    const pts = part.replace(/Z/g, '').split('L').map(p => p.trim().split(/[ ,]+/).map(Number));
    return { closed, pts };
  });
  // a point is „x,y“ or „x y“; anything else (a lone number, a missing one) keeps the path as it is, only rounded
  if (parts.some(({ pts }) => pts.some(p => p.length !== 2 || p.some(n => !Number.isFinite(n))))) return d.replace(/-?\d*\.\d+/g, n => r1(+n));
  return parts.map(({ closed, pts }) => `M${simplify(pts, 0.2).map(p => `${r1(p[0])},${r1(p[1])}`).join('L')}${closed ? 'Z' : ''}`).join('');
};
const slim = (svg, tag) => {
  let out = svg.replace(/ d="([^"]+)"/g, (_, d) => ` d="${slimD(d)}"`)
    .replace(/transform="translate\(([^)]+)\)/g, (_, t) => `transform="translate(${t.split(/[ ,]+/).map(n => r1(+n)).join(' ')})`);
  const seen = new Map();
  for (const [, d] of out.matchAll(/<path d="([^"]{300,})"/g)) seen.set(d, (seen.get(d) ?? 0) + 1);
  let defs = '', n = 0;
  for (const [d, k] of seen) {
    if (k < 2) continue;
    const id = `${tag}${n++}`;
    defs += `<path id="${id}" d="${d}"/>`;
    out = out.replaceAll(`<path d="${d}"`, `<use href="#${id}"`);
  }
  return (defs ? `<defs>${defs}</defs>` : '') + out;
};
m.bg = slim(m.bg, 'qb');
m.top = slim(m.top, 'qt');
const HEAD = '// made by `node scripts/build-qaravani-map.mjs` from the print kit (src/print/games/qaravani.js) — never edit by hand\n';
const rows = list => list.map(r => `  ${JSON.stringify(r)},`).join('\n');

const routes = `${HEAD}// „ქარავანი“'s roads and cities for the app's rules (utils/qaravani.ts); the cities' names and the drawing are in
// data/qaravaniMap.ts (only the screens load it).

/** how many cities the map has (a city is its number; names in data/qaravaniMap.ts) */
export const Q_CITY_COUNT = ${m.cities.length};
/** each city's worth (the house with most roads into it takes it at the end) */
export const Q_CITY_VALUE: readonly number[] = ${JSON.stringify(m.worth)};
/** each city's cargo: 0–7 the goods (Q_GOODS in data/qaravaniMap.ts), −1 none */
export const Q_CITY_CARGO: readonly number[] = ${JSON.stringify(m.cargo)};
/** the roads: [city a, city b, cells, a double road 1/0, a mountain road 1/0, the ships on it] */
export const Q_ROUTES: readonly (readonly number[])[] = [
${rows(m.routes.map(r => [r.a, r.b, r.n, r.double, r.pass ? 1 : 0, r.ships]))}
];
`;

const map = `${HEAD}// „ქარავანი“'s map for the screens (pages/games/qaravani/): the printed board's drawing in mm, without its score track and panels.

/** the part of the board the app shows: [x, y, w, h] in mm */
export const QMAP_BOX: readonly [number, number, number, number] = ${JSON.stringify(m.box)};
/** under the roads: the land, the regions, the sea, the border, rivers, mountains, the regions' names, the railway */
export const QMAP_BG = ${JSON.stringify(m.bg)};
/** over the roads: the passes' names (the cities' names are drawn by the screens, from Q_CITIES) */
export const QMAP_TOP = ${JSON.stringify(m.top)};
/** the cities' names as the print sets them: sizes in mm and colours */
export const QMAP_NAMES = ${JSON.stringify(m.names)};
/** a city's circle: its radius in mm, colours, the fill by its worth, and the cargo disc's radius */
export const QMAP_RING = ${JSON.stringify(m.ring)};
/** where each city's cargo disc stands from its centre (mm; null: no cargo) */
export const Q_CARGO_AT: readonly (readonly [number, number] | null)[] = ${JSON.stringify(m.cargoAt)};
/** a city: its place in mm, outside today's border, a second line (ტაო, საინგილო) and its name's place as printed —
 *  dir from the circle; the anchor point lx, ly (anchor: start / middle / end) and the second line's sy, in mm */
export interface QCity {
  key: string; name: string; x: number; y: number; outside: boolean; sub: string;
  dir: 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'; anchor: 'start' | 'middle' | 'end'; lx: number; ly: number; sy: number;
}
export const Q_CITIES: readonly QCity[] = [
${rows(m.cities)}
];
/** each road's tracks (in Q_ROUTES' order, the second track of a double road second): its cells' centres and angles in degrees */
export const Q_CELLS: readonly (readonly (readonly [number, number, number])[])[][] = [
${rows(m.routes.map(r => r.tracks))}
];
/** the cells of each road that carry a ship */
export const Q_SHIP_AT: readonly (readonly number[])[] = ${JSON.stringify(m.routes.map(r => r.shipAt))};
/** a mountain road's pass ('' for the others) */
export const Q_PASS: readonly string[] = ${JSON.stringify(m.routes.map(r => r.pass))};
/** the eight goods (the cargo kinds 0–7) */
export const Q_GOODS: readonly { k: string; name: string; color: string; dark: string; from: string }[] = [
${rows(m.goods)}
];
/** the goods' marks as the board prints them: a disc of r 10 around 0, 0 (its colour, its picture), by Q_GOODS' k */
export const Q_BADGES: Record<string, string> = ${JSON.stringify(m.badges)};
/** the five players' colours and animals (an animal in a 100×80 box, filled with currentColor) */
export const Q_PLAYERS: readonly { color: string; ink: string; animal: string; name: string }[] = ${JSON.stringify(m.players)};
export const Q_ANIMALS: Record<string, string> = ${JSON.stringify(m.animals)};
/** the inn (±5, currentColor) */
export const Q_INN_ART = ${JSON.stringify(m.inn)};
/** each city's old name ('' when the same) and a line about it, from the kit's glossary (Q_CITIES' order) */
export const Q_CITY_INFO: readonly (readonly [string, string])[] = [
${rows(m.info)}
];
`;

fs.writeFileSync(path.join(ROOT, 'src', 'data', 'qaravaniRoutes.ts'), routes);
fs.writeFileSync(path.join(ROOT, 'src', 'data', 'qaravaniMap.ts'), map);
console.log(`qaravani: ${m.cities.length} cities, ${m.routes.length} roads; map ${(map.length / 1024).toFixed(0)} KB, box ${m.box.join(' ')}`);
