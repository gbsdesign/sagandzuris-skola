// „ქარავანი“ (series №3): the printable kit of a Ticket to Ride: Europe-like game (Alan R. Moon, Days of Wonder, 2005) on a map of
// Georgia at the end of the XIX century — the Poti–Tiflis railway is new (1872), carts and caravans still cross the passes and
// Ilia's „მგზავრის წერილები“ (1871) gave the secret tickets their name. Players own caravans: they collect goods cards, claim roads
// with their carts and finish their travellers' letters. 47 cities and shrines (six beyond today's border, shown as culture, not
// politics), 74 roads. The board is 78×56 cm from eight A4 pieces; the cities are placed by hand for the roads, and the app's
// region outlines (src/data/georgiaMapShapes.ts), coast, rivers and ridges are bent onto them by a thin-plate spline.
import fs from 'node:fs';
import path from 'node:path';
import { C, ROOT, SERIES, SCHOOL, aso, esc, cardSheet, placedSheet, page, stripe, foot, duplex, sheetNo, corners } from '../lib.mjs';

export const id = 'qaravani';
export const title = 'ქარავანი';
const NO = 3;
const META = '2–5 მოთამაშე · 10 წლიდან · 45–60 წუთი';

const f = n => +n.toFixed(2);
const P2 = p => `${f(p[0])},${f(p[1])}`;
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
/** A repeatable pseudo-random number in [0, 1) for decorations (mountains, waves). */
const rnd = (() => { let s = 20261028; return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648); })();

// ---------- the map's cities ----------
// key, name, lat, lon, look (c city — a tower, s shrine — a domed church, p port — a sail), x and y on the board in mm
const CITY_ROWS = [
  ['bichvinta', 'ბიჭვინთა', 43.160, 40.340, 's', 85, 75], ['sokhumi', 'სოხუმი', 43.000, 41.020, 'p', 145, 85],
  ['zugdidi', 'ზუგდიდი', 42.508, 41.871, 'c', 230, 158], ['poti', 'ფოთი', 42.146, 41.672, 'p', 215, 235],
  ['senaki', 'სენაკი', 42.270, 42.068, 'c', 252, 200], ['samtredia', 'სამტრედია', 42.154, 42.339, 'c', 287, 234],
  ['kobuleti', 'ქობულეთი', 41.820, 41.775, 'c', 226, 297], ['batumi', 'ბათუმი', 41.645, 41.636, 'p', 205, 336],
  ['ozurgeti', 'ოზურგეთი', 41.924, 42.007, 'c', 251, 262], ['kutaisi', 'ქუთაისი', 42.270, 42.700, 'c', 326, 212],
  ['gelati', 'გელათი', 42.295, 42.768, 's', 352, 180], ['zestaponi', 'ზესტაფონი', 42.110, 43.050, 'c', 364, 242],
  ['chiatura', 'ჭიათურა', 42.290, 43.280, 'c', 389, 208], ['ambrolauri', 'ამბროლაური', 42.520, 43.150, 'c', 390, 125],
  ['oni', 'ონი', 42.580, 43.440, 'c', 452, 140], ['tsageri', 'ცაგერი', 42.645, 42.770, 'c', 333, 140],
  ['mestia', 'მესტია', 43.045, 42.730, 'c', 329, 78], ['borjomi', 'ბორჯომი', 41.840, 43.390, 'c', 405, 305],
  ['akhaltsikhe', 'ახალციხე', 41.640, 42.980, 'c', 356, 331], ['vardzia', 'ვარძია', 41.380, 43.280, 's', 378, 392],
  ['akhalkalaki', 'ახალქალაქი', 41.405, 43.480, 'c', 440, 372], ['khashuri', 'ხაშური', 41.990, 43.600, 'c', 423, 265],
  ['gori', 'გორი', 41.980, 44.110, 'c', 470, 265], ['tskhinvali', 'ცხინვალი', 42.230, 43.970, 'c', 463, 219],
  ['mtskheta', 'მცხეთა', 41.845, 44.720, 's', 535, 280], ['tbilisi', 'თბილისი', 41.715, 44.790, 'c', 556, 322],
  ['manglisi', 'მანგლისი', 41.700, 44.380, 's', 492, 318], ['bolnisi', 'ბოლნისი', 41.450, 44.540, 's', 528, 375],
  ['dmanisi', 'დმანისი', 41.330, 44.200, 'c', 488, 390], ['sagarejo', 'საგარეჯო', 41.730, 45.330, 'c', 600, 318],
  ['ananuri', 'ანანური', 42.160, 44.700, 's', 548, 215], ['stepantsminda', 'სტეფანწმინდა', 42.660, 44.640, 's', 535, 138],
  ['shatili', 'შატილი', 42.660, 45.160, 'c', 591, 138], ['omalo', 'ომალო', 42.370, 45.630, 'c', 642, 193],
  ['telavi', 'თელავი', 41.920, 45.470, 'c', 625, 278], ['alaverdi', 'ალავერდი', 42.030, 45.380, 's', 605, 238],
  ['kvareli', 'ყვარელი', 41.950, 45.810, 'c', 680, 255], ['gurjaani', 'გურჯაანი', 41.740, 45.800, 'c', 660, 312],
  ['lagodekhi', 'ლაგოდეხი', 41.830, 46.280, 'c', 725, 300], ['sighnaghi', 'სიღნაღი', 41.620, 45.920, 'c', 690, 350],
  ['garedja', 'დავითგარეჯა', 41.450, 45.380, 's', 610, 385],
  ['trabzon', 'ტრაპიზონი', 41.000, 39.720, 'p', 80, 440], ['oshki', 'ოშკი', 40.565, 41.555, 's', 205, 480],
  ['kars', 'ყარსი', 40.600, 43.100, 'c', 355, 490], ['ganja', 'განჯა', 40.680, 46.360, 'c', 721, 483],
  ['zakatala', 'ზაქათალა', 41.630, 46.640, 'c', 746, 335], ['vladikavkaz', 'ვლადიკავკაზი', 43.020, 44.680, 'c', 545, 70],
];
const CITIES = Object.fromEntries(CITY_ROWS.map(([key, name, lat, lon, look, x, y]) => [key, { key, name, lat, lon, look, p: [x, y] }]));
/** Beyond today's border: shown as places of Georgian culture and trade, without politics. */
const OUTSIDE = new Set(['trabzon', 'oshki', 'kars', 'ganja', 'zakatala', 'vladikavkaz']);

// ---------- the roads ----------
// [from, to, cells, colour, extra] — colours: the eight goods and gray (any one colour); extra: { d: colour of the second track }
// a double road, { m: pass } a mountain road, { s: ships } a sea or river road, { bend: ±1 } which side a curved road bulges to.
const ROUTE_ROWS = [
  ['bichvinta', 'sokhumi', 2, 'gray', { s: 1, bend: -7 }], ['bichvinta', 'poti', 8, 'gray', { s: 2, bend: -24 }], ['batumi', 'trabzon', 6, 'gray', { s: 2, bend: -9 }],
  ['poti', 'samtredia', 2, 'gray', { s: 1, river: 'რიონი' }], ['sokhumi', 'zugdidi', 4, 'black'],
  ['zugdidi', 'poti', 3, 'gray', { bend: -1 }], ['zugdidi', 'senaki', 1, 'red'], ['zugdidi', 'mestia', 5, 'blue'],
  ['poti', 'senaki', 1, 'pink', { d: 'green' }], ['poti', 'kobuleti', 2, 'yellow'], ['batumi', 'kobuleti', 1, 'red'],
  ['kobuleti', 'ozurgeti', 1, 'green'], ['ozurgeti', 'samtredia', 2, 'white'], ['batumi', 'akhaltsikhe', 6, 'black', { m: 'გოდერძი' }],
  ['batumi', 'oshki', 6, 'white', { bend: -1 }], ['senaki', 'samtredia', 1, 'black', { d: 'blue' }],
  ['samtredia', 'kutaisi', 1, 'pink', { d: 'orange' }], ['kutaisi', 'gelati', 1, 'black'],
  ['kutaisi', 'zestaponi', 1, 'white', { d: 'green' }], ['kutaisi', 'tsageri', 2, 'yellow'],
  ['kutaisi', 'akhaltsikhe', 5, 'red', { m: 'ზეკარი' }], ['gelati', 'ambrolauri', 2, 'red'], ['gelati', 'chiatura', 1, 'gray'],
  ['zestaponi', 'chiatura', 1, 'pink'], ['zestaponi', 'khashuri', 2, 'gray', { m: 'რიკოთი' }], ['chiatura', 'oni', 3, 'black'],
  ['tsageri', 'ambrolauri', 2, 'orange'], ['ambrolauri', 'oni', 2, 'green'], ['tsageri', 'mestia', 2, 'red', { m: 'ზაგარი' }],
  ['oni', 'vladikavkaz', 4, 'white', { m: 'მამისონი' }], ['oni', 'tskhinvali', 3, 'blue'], ['khashuri', 'borjomi', 1, 'blue'],
  ['borjomi', 'akhaltsikhe', 2, 'white', { bend: 1 }], ['borjomi', 'akhalkalaki', 2, 'orange', { m: 'ცხრაწყარო' }],
  ['akhaltsikhe', 'vardzia', 2, 'blue'], ['vardzia', 'akhalkalaki', 2, 'pink'], ['akhalkalaki', 'kars', 6, 'gray'],
  ['oshki', 'kars', 6, 'orange'], ['trabzon', 'oshki', 5, 'gray', { m: 'ზიგანა' }], ['akhalkalaki', 'manglisi', 2, 'yellow'],
  ['dmanisi', 'kars', 7, 'yellow'], ['akhaltsikhe', 'kars', 6, 'green'], ['khashuri', 'gori', 1, 'white', { d: 'orange' }],
  ['gori', 'tskhinvali', 1, 'gray'], ['gori', 'mtskheta', 2, 'blue', { d: 'red' }], ['gori', 'manglisi', 2, 'black'],
  ['tskhinvali', 'ananuri', 3, 'pink'], ['mtskheta', 'tbilisi', 1, 'yellow', { d: 'black' }], ['mtskheta', 'ananuri', 2, 'gray'],
  ['ananuri', 'stepantsminda', 3, 'gray', { m: 'ჯვარი' }], ['stepantsminda', 'vladikavkaz', 2, 'gray', { m: 'დარიალი' }],
  ['ananuri', 'shatili', 3, 'yellow', { m: 'დათვისჯვარი' }], ['shatili', 'omalo', 2, 'orange', { m: 'ატსუნტა' }],
  ['ananuri', 'alaverdi', 2, 'green'], ['tbilisi', 'manglisi', 2, 'green'], ['tbilisi', 'bolnisi', 2, 'red'],
  ['manglisi', 'dmanisi', 2, 'red'], ['bolnisi', 'dmanisi', 1, 'gray'], ['tbilisi', 'garedja', 3, 'orange'],
  ['tbilisi', 'sagarejo', 1, 'gray', { d: 'white' }], ['tbilisi', 'telavi', 3, 'pink', { m: 'გომბორი' }],
  ['sagarejo', 'gurjaani', 2, 'pink'], ['sagarejo', 'garedja', 2, 'blue'], ['telavi', 'alaverdi', 1, 'yellow'],
  ['telavi', 'gurjaani', 1, 'black'], ['telavi', 'kvareli', 2, 'red'], ['telavi', 'omalo', 3, 'blue', { m: 'აბანო' }],
  ['gurjaani', 'sighnaghi', 1, 'yellow'], ['kvareli', 'lagodekhi', 2, 'white'], ['sighnaghi', 'lagodekhi', 2, 'orange'],
  ['sighnaghi', 'garedja', 3, 'green'], ['lagodekhi', 'zakatala', 1, 'green'], ['zakatala', 'ganja', 6, 'gray'],
  ['garedja', 'ganja', 6, 'pink'],
];
/** The Poti–Tiflis railway (1872) runs between the two tracks of these double roads. */
const RAILWAY = new Set(['poti-senaki', 'senaki-samtredia', 'samtredia-kutaisi', 'kutaisi-zestaponi', 'khashuri-gori', 'gori-mtskheta', 'mtskheta-tbilisi']);

/** The eight goods (= colours of the roads and the caravan cards) and the stone road. */
const GOODS = {
  red: { name: 'ღვინო', adj: 'წითელი', color: '#b8272f', dark: '#7d151b', from: 'ქვევრის ღვინო კახეთიდან' },
  yellow: { name: 'თაფლი', adj: 'ყვითელი', color: '#e2b02c', dark: '#9a7412', from: 'მთის თაფლი რაჭიდან' },
  green: { name: 'ჩაი', adj: 'მწვანე', color: '#3e8b3e', dark: '#225a24', from: 'ჩაი გურიიდან და ჩაქვიდან' },
  blue: { name: 'ლურჯი სუფრა', adj: 'ლურჯი', color: '#2f62b2', dark: '#1a3b73', from: 'ინდიგოთი ნაბეჭდი სუფრა' },
  black: { name: 'ნაბადი', adj: 'შავი', color: '#2b2622', dark: '#000000', from: 'თექის ნაბადი თუშეთიდან' },
  white: { name: 'სულგუნი', adj: 'თეთრი', color: '#fbf8f1', dark: '#6d6359', from: 'სულგუნი სამეგრელოდან' },
  orange: { name: 'სპილენძი', adj: 'ნარინჯისფერი', color: '#da7128', dark: '#93440f', from: 'სპილენძის ქვაბი და ლანგარი' },
  pink: { name: 'აბრეშუმი', adj: 'ვარდისფერი', color: '#d97ba4', dark: '#9b3f68', from: 'აბრეშუმის ძაფი და ქსოვილი' },
};
const GRAY = { name: 'ქვის გზა', adj: 'ნაცრისფერი', color: '#b5aea4', dark: '#6f675d' };
const look = c => GOODS[c] ?? GRAY;

// ---------- the board ----------
const BW = 780, BH = 560, BAND = 22;
const CELL = { l: 20, w: 9, gap: 1.5, end: 10.5, minEnd: 8.6 };
const DOUBLE_OFF = CELL.w / 2 + 1.9; // the rail runs in the 3.8 mm between the tracks
const CITY_R = 6.3;
/** Points of a road: cells 1–8 score 1, 2, 4, 7, 10, 15, 18, 21. */
const SCORE = [0, 1, 2, 4, 7, 10, 15, 18, 21];

/** A road's centre line: a quadratic curve from a to b bulging `bend` mm to the left of a→b; points by arc length. */
const curve = (a, b, bend = 0) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = dy / L, ny = -dx / L;
  const c = [(a[0] + b[0]) / 2 + nx * 2 * bend, (a[1] + b[1]) / 2 + ny * 2 * bend];
  const at = t => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
  const N = 240, pts = [], s = [0];
  for (let i = 0; i <= N; i++) pts.push(at(i / N));
  for (let i = 1; i <= N; i++) s.push(s[i - 1] + dist(pts[i - 1], pts[i]));
  const point = u => {
    let lo = 0, hi = N;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m] < u) lo = m; else hi = m; }
    const t = (s[hi] - s[lo]) ? (u - s[lo]) / (s[hi] - s[lo]) : 0;
    const p = [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * t, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * t];
    return { p, ang: Math.atan2(pts[hi][1] - pts[lo][1], pts[hi][0] - pts[lo][0]) };
  };
  return { len: s[N], point, a, b, c };
};
/** The bend (mm) that makes a curve between a and b exactly `len` long. */
const bendFor = (a, b, len) => {
  if (dist(a, b) >= len) return 0;
  let lo = 0, hi = dist(a, b);
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (curve(a, b, m).len < len) lo = m; else hi = m; }
  return hi;
};
const need = n => n * CELL.l + (n - 1) * CELL.gap;

// extra.bend: the side (±1) a road bulges to, or a bend in mm; a road too short for its cells always bends (side picked below)
const ROUTES = ROUTE_ROWS.map(([from, to, n, color, extra = {}], i) => ({
  i, key: `${from}-${to}`, from, to, n, color, double: extra.d ?? null, pass: extra.m ?? null, ships: extra.s ?? 0,
  river: extra.river ?? null, side: extra.bend ? Math.sign(extra.bend) : 0, bendMm: Math.abs(extra.bend ?? 0) > 1 ? Math.abs(extra.bend) : 0, bend: 0,
}));

/** A track's cells: centres and angles along the curve, gaps spread a little where the road is longer than its cells. */
const trackCells = (cv, n) => {
  let gap = CELL.gap;
  const slack = cv.len - 2 * CELL.end - need(n);
  if (slack > 0 && n > 1) gap += Math.min(slack, (n - 1) * 2.2) / (n - 1);
  const used = n * CELL.l + (n - 1) * gap, start = (cv.len - used) / 2;
  return Array.from({ length: n }, (_, k) => cv.point(start + CELL.l / 2 + k * (CELL.l + gap)));
};
/** Both tracks of a road (one for a single road): { color, cells: [{ p, ang }] }. */
const tracks = r => {
  const a = CITIES[r.from].p, b = CITIES[r.to].p;
  if (!r.double) return [{ color: r.color, cells: trackCells(curve(a, b, r.bend), r.n), cv: curve(a, b, r.bend) }];
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = dy / L * DOUBLE_OFF, ny = -dx / L * DOUBLE_OFF;
  return [[1, r.color], [-1, r.double]].map(([s, color]) => {
    const cv = curve([a[0] + nx * s, a[1] + ny * s], [b[0] + nx * s, b[1] + ny * s], r.bend);
    return { color, cells: trackCells(cv, r.n), cv };
  });
};
for (const r of ROUTES) r.tracks = tracks(r);
// a road shorter than its cells (plus 9.6 mm to each city) bulges just enough; the side with fewer cells and cities in the way
// wins unless the row names it
const crowd = (r, cells) => {
  let k = 0;
  for (const c of cells) {
    for (const o of ROUTES) if (o !== r) for (const t of o.tracks) for (const d of t.cells) if (dist(c.p, d.p) < 16) k++;
    for (const city of Object.values(CITIES)) if (city.key !== r.from && city.key !== r.to && dist(c.p, city.p) < 16) k += 2;
  }
  return k;
};
for (const r of ROUTES) {
  const a = CITIES[r.from].p, b = CITIES[r.to].p, short = dist(a, b) < need(r.n) + 2 * 9.6;
  if (!short && !r.bendMm) continue;
  const mm = Math.max(r.bendMm, short ? bendFor(a, b, need(r.n) + 2 * CELL.end) : 0);
  const pick = (r.side ? [r.side] : [1, -1]).map(s => { r.bend = s * mm; return { s, k: crowd(r, tracks(r).flatMap(t => t.cells)) }; })
    .sort((x, y) => x.k - y.k)[0];
  r.bend = pick.s * mm;
  r.tracks = tracks(r);
}
/** A cell's corners (for collision tests), grown by `pad` mm. */
const cellPoly = ({ p, ang }, pad = 0) => {
  const c = Math.cos(ang), s = Math.sin(ang), hl = CELL.l / 2 + pad, hw = CELL.w / 2 + pad;
  return [[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]].map(([u, v]) => [p[0] + u * c - v * s, p[1] + u * s + v * c]);
};

// ---------- the real map, bent onto the hand-placed cities ----------
// WGS84 → UTM zone 38N → the app map's units (src/data/georgiaMapShapes.ts: x 0 at the Psou's mouth, x 1000 at the east end).
const utm = (latDeg, lonDeg, lon0 = 45) => {
  const a = 6378137, fl = 1 / 298.257223563, k0 = 0.9996, e2 = fl * (2 - fl), ep2 = e2 / (1 - e2);
  const φ = latDeg * Math.PI / 180, λ = lonDeg * Math.PI / 180, λ0 = lon0 * Math.PI / 180;
  const N = a / Math.sqrt(1 - e2 * Math.sin(φ) ** 2), T = Math.tan(φ) ** 2, Cc = ep2 * Math.cos(φ) ** 2, A = Math.cos(φ) * (λ - λ0);
  const e4 = e2 * e2, e6 = e4 * e2;
  const M = a * ((1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * φ - (3 * e2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * φ)
    + (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * φ) - (35 * e6 / 3072) * Math.sin(6 * φ));
  const x = k0 * N * (A + (1 - T + Cc) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * Cc - 58 * ep2) * A ** 5 / 120) + 500000;
  const y = k0 * (M + N * Math.tan(φ) * (A * A / 2 + (5 - T + 9 * Cc + 4 * Cc * Cc) * A ** 4 / 24 + (61 - 58 * T + T * T + 600 * Cc - 330 * ep2) * A ** 6 / 720));
  return [x, y];
};
const [UX0, UY0] = utm(43.386, 40.007);
const US = 1000 / (utm(41.40, 46.736)[0] - UX0);
const toUnits = (lat, lon) => { const [x, y] = utm(lat, lon); return [(x - UX0) * US, 33.8 - (y - UY0) * US]; };

const SHAPES = (() => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'data', 'georgiaMapShapes.ts'), 'utf8');
  const out = {};
  for (const m of src.matchAll(/ {2}([a-z]+): \{\s*label: \[(\d+), (\d+)\],\s*d: '([^']+)'/g))
    out[m[1]] = { label: [+m[2], +m[3]], polys: m[4].split('M').filter(Boolean).map(s => s.replace(/Z/g, '').split('L').map(p => p.split(',').map(Number))) };
  return out;
})();

/** Gaussian elimination with partial pivoting. */
const solve = (A0, b) => {
  const n = b.length, M = A0.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) { const k = M[r][c] / M[c][c]; if (k) for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let j = r + 1; j < n; j++) s -= M[r][j] * x[j]; x[r] = s / M[r][r]; }
  return x;
};
/** A thin-plate spline taking `src` points exactly onto `dst` and bending everything between smoothly. */
const thinPlate = (src, dst) => {
  const n = src.length, U = (a, b) => { const r2 = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2; return r2 ? r2 * Math.log(r2) : 0; };
  const A = Array.from({ length: n + 3 }, () => new Array(n + 3).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) A[i][j] = U(src[i], src[j]);
    A[i][n] = A[n][i] = 1; A[i][n + 1] = A[n + 1][i] = src[i][0]; A[i][n + 2] = A[n + 2][i] = src[i][1];
  }
  const wx = solve(A, [...dst.map(d => d[0]), 0, 0, 0]), wy = solve(A, [...dst.map(d => d[1]), 0, 0, 0]);
  return p => {
    let x = wx[n] + wx[n + 1] * p[0] + wx[n + 2] * p[1], y = wy[n] + wy[n + 1] * p[0] + wy[n + 2] * p[1];
    for (let i = 0; i < n; i++) { const u = U(p, src[i]); x += wx[i] * u; y += wy[i] * u; }
    return [x, y];
  };
};
const bendU = thinPlate(CITY_ROWS.map(c => toUnits(c[2], c[3])), CITY_ROWS.map(c => [c[5], c[6]]));
/** Densifies a line (in the app map's units) so the bending stays smooth. */
const dense = (pts, step = 4) => pts.flatMap((p, i) => {
  if (i === 0) return [p];
  const q = pts[i - 1], k = Math.max(1, Math.ceil(dist(p, q) / step));
  return Array.from({ length: k }, (_, j) => [q[0] + (p[0] - q[0]) * (j + 1) / k, q[1] + (p[1] - q[1]) * (j + 1) / k]);
});
const bendLine = (latlon, step) => dense(latlon.map(([la, lo]) => toUnits(la, lo)), step).map(bendU);

/** Georgia's outline: the region edges no other region shares, walked as one ring (the app's shapes share their borders exactly). */
const OUTLINE = (() => {
  const key = p => `${p[0]},${p[1]}`, count = new Map(), pt = new Map();
  for (const r of Object.values(SHAPES)) for (const poly of r.polys) poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length], a = key(p), b = key(q);
    if (a === b) return;
    pt.set(a, p); pt.set(b, q);
    const e = a < b ? `${a}|${b}` : `${b}|${a}`;
    count.set(e, (count.get(e) ?? 0) + 1);
  });
  const adj = new Map();
  for (const [e, c] of count) if (c === 1) {
    const [a, b] = e.split('|');
    for (const [u, v] of [[a, b], [b, a]]) { if (!adj.has(u)) adj.set(u, []); adj.get(u).push(v); }
  }
  const nearest = q => [...adj.keys()].reduce((best, k) => (dist(pt.get(k), q) < dist(pt.get(best), q) ? k : best));
  const walk = (start, first, stop) => {
    const out = [start];
    let prev = start, cur = first;
    while (cur !== stop && cur !== start) { out.push(cur); const nx = adj.get(cur).find(v => v !== prev); prev = cur; cur = nx; }
    out.push(cur);
    return out.map(k => pt.get(k));
  };
  const psou = nearest(toUnits(43.386, 40.007)), sarpi = nearest(toUnits(41.52, 41.55));
  const ways = adj.get(psou).map(first => walk(psou, first, sarpi));
  const coast = ways.reduce((a, b) => (a.length < b.length ? a : b));
  const ring = walk(psou, adj.get(psou)[0], null);
  return { coast, ring };
})();

// the coasts beyond Georgia (lat, lon): north of the Psou to Tuapse, south of Sarpi to Giresun
const COAST_NORTH = [[44.6, 37.9], [44.10, 39.07], [43.91, 39.33], [43.66, 39.65], [43.58, 39.72], [43.42, 39.93]];
const COAST_SOUTH = [[41.48, 41.52], [41.41, 41.42], [41.35, 41.30], [41.27, 41.14], [41.19, 40.98], [41.18, 40.88], [41.02, 40.52],
  [41.01, 40.36], [40.95, 40.27], [40.91, 40.12], [40.94, 40.06], [40.95, 39.85], [41.005, 39.72], [41.02, 39.57], [41.05, 39.28],
  [41.03, 39.0], [41.0, 38.82], [40.92, 38.39], [41.0, 37.5]];
const SEA = (() => {
  const north = COAST_NORTH.map(([la, lo]) => toUnits(la, lo)), south = COAST_SOUTH.map(([la, lo]) => toUnits(la, lo));
  const coast = dense([...north, ...OUTLINE.coast, ...south], 3).map(bendU);
  return { coast, poly: [...coast, [-80, coast[coast.length - 1][1]], [-80, -80], [coast[0][0], -80]] };
})();

const RIVERS = [
  { name: 'რიონი', at: 0.55, pts: [[42.72, 43.75], [42.62, 43.55], [42.58, 43.44], [42.55, 43.25], [42.52, 43.15], [42.47, 42.98], [42.38, 42.83],
    [42.30, 42.72], [42.27, 42.70], [42.22, 42.55], [42.17, 42.35], [42.18, 42.12], [42.19, 41.90], [42.17, 41.66]] },
  { name: 'მტკვარი', at: 0.62, pts: [[41.11, 42.70], [41.25, 42.95], [41.33, 43.15], [41.38, 43.28], [41.57, 43.25], [41.66, 43.05], [41.70, 43.13],
    [41.73, 43.18], [41.84, 43.39], [41.90, 43.55], [41.97, 43.70], [41.98, 43.90], [41.98, 44.11], [41.93, 44.42], [41.845, 44.72],
    [41.70, 44.80], [41.55, 45.00], [41.33, 45.10], [41.12, 45.45], [40.85, 46.00], [40.78, 46.60], [40.75, 47.2]] },
  { name: 'არაგვი', at: 0.3, pts: [[42.50, 44.62], [42.35, 44.69], [42.16, 44.70], [42.05, 44.72], [41.95, 44.72], [41.845, 44.72]] },
  { name: 'ალაზანი', at: 0.5, pts: [[42.30, 45.20], [42.15, 45.25], [42.03, 45.30], [41.95, 45.50], [41.85, 45.72], [41.75, 45.90],
    [41.62, 46.10], [41.48, 46.30], [41.30, 46.50], [41.10, 46.70], [40.95, 47.2]] },
  { name: 'ენგური', at: 0.35, pts: [[42.97, 43.05], [43.02, 42.80], [43.03, 42.65], [42.98, 42.35], [42.93, 42.18], [42.80, 42.08], [42.70, 42.03],
    [42.58, 41.88], [42.48, 41.72], [42.40, 41.56]] },
  { name: 'თერგი', at: 0.5, pts: [[42.60, 44.42], [42.58, 44.50], [42.66, 44.64], [42.75, 44.63], [42.80, 44.64], [43.02, 44.68], [43.4, 44.65]] },
  { name: 'ჭოროხი', at: 0.45, pts: [[40.60, 41.20], [40.82, 41.53], [41.10, 41.70], [41.36, 41.68], [41.55, 41.66], [41.60, 41.58]] },
].map(r => ({ ...r, line: bendLine(r.pts, 3) }));

// ridges for the mountain marks (lat, lon); `snow` ones get white caps
const RIDGES = [
  { snow: true, pts: [[43.55, 40.20], [43.42, 40.60], [43.35, 41.00], [43.25, 41.50], [43.20, 42.00], [43.12, 42.50], [43.13, 42.67], [43.00, 43.11],
    [42.85, 43.50], [42.73, 43.80], [42.70, 44.20], [42.70, 44.52], [42.62, 44.90], [42.55, 45.30], [42.40, 45.70], [42.15, 46.10], [41.95, 46.45], [41.75, 46.75]] },
  { snow: true, pts: [[42.95, 42.10], [42.85, 42.60], [42.78, 43.00]] },
  { pts: [[42.62, 42.90], [42.65, 43.30]] },
  { pts: [[42.20, 43.40], [42.05, 43.52], [41.90, 43.55]] },
  { pts: [[41.85, 42.00], [41.82, 42.40], [41.80, 42.80], [41.78, 43.20]] },
  { pts: [[41.75, 43.55], [41.72, 43.90], [41.72, 44.30]] },
  { pts: [[41.45, 43.65], [41.20, 43.70]] },
  { pts: [[41.50, 42.05], [41.20, 42.20]] },
  { snow: true, pts: [[40.95, 40.90], [40.85, 41.20], [40.75, 41.40]] },
  { pts: [[40.65, 39.40], [40.62, 39.90], [40.55, 40.40]] },
  { pts: [[41.80, 45.00], [41.92, 45.25], [42.02, 45.45]] },
  { pts: [[41.15, 44.20], [41.10, 44.70], [41.05, 45.20]] },
  { pts: [[40.95, 42.40], [40.85, 42.80]] },
  { pts: [[42.95, 44.10], [43.05, 44.40]] },
].map(r => ({ ...r, line: bendLine(r.pts, 2) }));

// ---------- what is in the way: cells, cities and names (for placing names and the mountain marks) ----------
const OBST = [];
const bboxOf = pts => [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
const block = poly => OBST.push({ poly, bb: bboxOf(poly) });
const blockBox = ([x0, y0, x1, y1]) => block([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
const blockCircle = (c, r) => OBST.push({ circle: c, r, bb: [c[0] - r, c[1] - r, c[0] + r, c[1] + r] });
const inPoly = (q, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > q[1]) !== (yj > q[1]) && q[0] < (xj - xi) * (q[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const isBlocked = q => OBST.some(o => q[0] >= o.bb[0] && q[0] <= o.bb[2] && q[1] >= o.bb[1] && q[1] <= o.bb[3]
  && (o.circle ? dist(q, o.circle) <= o.r : inPoly(q, o.poly)));
/** The share (0–1) of a w×h box centred at c and turned by `ang` that is in the way (a grid of sample points). */
const covered = (c, w, h, ang = 0, nx = 10, ny = 4) => {
  const co = Math.cos(ang), si = Math.sin(ang);
  let k = 0;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const u = (i + 0.5) / nx * w - w / 2, v = (j + 0.5) / ny * h - h / 2;
    if (isBlocked([c[0] + u * co - v * si, c[1] + u * si + v * co])) k++;
  }
  return k / (nx * ny);
};
const INNER = [BAND + 1.5, BAND + 1.5, BW - BAND - 1.5, BH - BAND - 1.5];
const inInner = (c, w, h) => c[0] - w / 2 >= INNER[0] && c[0] + w / 2 <= INNER[2] && c[1] - h / 2 >= INNER[1] && c[1] + h / 2 <= INNER[3];
/** An angle turned so text on it reads left to right. */
const upright = a => (a > Math.PI / 2 ? a - Math.PI : a <= -Math.PI / 2 ? a + Math.PI : a);
const deg = a => f(a * 180 / Math.PI);

// boxes kept free for the title, the legend and the score table (mm on the board)
const ZONES = {
  title: [646, 27, 753, 126],
  legend: [27, 186, 131, 374],
  score: [486, 446, 676, 532],
};
for (const z of Object.values(ZONES)) blockBox(z);
for (const r of ROUTES) for (const t of r.tracks) for (const c of t.cells) block(cellPoly(c, 0.9));
for (const c of Object.values(CITIES)) blockCircle(c.p, CITY_R + 1);

// Noto Sans Georgian 700's advance widths (em), measured once in Chromium, for the names' boxes
const WIDTH = Object.fromEntries([...'აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ'].map((ch, i) => [ch, [0.585, 0.598, 0.584, 0.901, 0.61, 0.581, 0.651, 0.914, 0.605,
  0.592, 1.145, 0.621, 0.621, 0.859, 0.602, 0.647, 0.858, 0.631, 0.782, 0.639, 0.897, 0.61, 0.859, 0.62, 0.621, 0.619, 0.694, 0.621, 0.615,
  0.621, 0.611, 0.581, 0.59][i]]));
const textW = (s, size) => [...s].reduce((w, ch) => w + (WIDTH[ch] ?? (ch === ' ' ? 0.26 : 0.6)), 0) * size;

// ---------- city names: each tries eight places around its mark and takes the freest ----------
const NAME = 4.4, SUBNAME = 3.2;
const SUB = { oshki: 'ტაო', zakatala: 'საინგილო' };
const LABEL_AT = {}; // a key → 'e' | 'ne' | … to force a place
const DIRS = [['e', 0], ['ne', 0.4], ['se', 0.5], ['n', 0.7], ['s', 0.8], ['w', 0.9], ['nw', 1.1], ['sw', 1.2]];
const LABELS = (() => {
  const out = {};
  const order = Object.values(CITIES).map(c => ({ c, deg: ROUTES.filter(r => r.from === c.key || r.to === c.key).length }))
    .sort((a, b) => b.deg - a.deg).map(x => x.c);
  for (const c of order) {
    const sub = SUB[c.key], w = Math.max(textW(c.name, NAME), sub ? textW(sub, SUBNAME) : 0), h = NAME * 1.08 + (sub ? SUBNAME * 1.15 : 0);
    const R = CITY_R + 1.3, d = R * 0.66;
    const box = dir => {
      const [x, y] = c.p;
      const cx = dir.includes('e') ? x + (dir === 'e' ? R : d) + w / 2 : dir.includes('w') ? x - (dir === 'w' ? R : d) - w / 2 : x;
      const cy = dir.includes('n') ? y - (dir === 'n' ? R : d) - h / 2 : dir.includes('s') ? y + (dir === 's' ? R : d) + h / 2 : y;
      return [cx, cy];
    };
    const tries = (LABEL_AT[c.key] ? [[LABEL_AT[c.key], 0]] : DIRS).map(([dir, pref]) => {
      const at = box(dir);
      return { dir, at, score: covered(at, w, h) * 60 + pref + (inInner(at, w, h) ? 0 : 100) };
    }).sort((a, b) => a.score - b.score);
    const best = tries[0];
    out[c.key] = { ...best, w, h, sub };
    blockBox([best.at[0] - w / 2 - 0.6, best.at[1] - h / 2 - 0.4, best.at[0] + w / 2 + 0.6, best.at[1] + h / 2 + 0.4]);
  }
  return out;
})();

// ---------- pass names beside the mountain roads, river names along the rivers ----------
const PASS = 3.3;
const PASSES = ROUTES.filter(r => r.pass).map(r => {
  const t = r.tracks[0], m = t.cv.point(t.cv.len / 2), ang = upright(m.ang), w = textW(r.pass, PASS) * 0.96, h = PASS * 1.1;
  const off = (r.double ? DOUBLE_OFF : 0) + CELL.w / 2 + 1.4 + h / 2;
  const tries = [1, -1].map(s => {
    const at = [m.p[0] - Math.sin(ang) * off * s, m.p[1] + Math.cos(ang) * off * s];
    return { at, score: covered(at, w, h, ang) };
  }).sort((a, b) => a.score - b.score);
  const at = tries[0].at;
  block([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([u, v]) => [at[0] + u * Math.cos(ang) - v * Math.sin(ang), at[1] + u * Math.sin(ang) + v * Math.cos(ang)]));
  return { name: r.pass, at, ang };
});
const RIVER_NAME = 3.4;
/** A point and direction on a polyline at `frac` of its length. */
const along = (line, frac) => {
  const seg = line.slice(1).map((p, i) => dist(line[i], p)), total = seg.reduce((a, b) => a + b, 0);
  let u = total * frac;
  for (let i = 0; i < seg.length; i++) {
    if (u <= seg[i] || i === seg.length - 1) {
      const t = seg[i] ? Math.min(1, u / seg[i]) : 0, a = line[i], b = line[i + 1];
      // the direction over ±8 mm, so a kink does not turn the name
      const s0 = Math.max(0, total * frac - 8), s1 = Math.min(total, total * frac + 8);
      const pa = pointAt(line, seg, s0), pb = pointAt(line, seg, s1);
      return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], ang: Math.atan2(pb[1] - pa[1], pb[0] - pa[0]) };
    }
    u -= seg[i];
  }
  return { p: line[line.length - 1], ang: 0 };
};
const pointAt = (line, seg, u) => {
  for (let i = 0; i < seg.length; i++) {
    if (u <= seg[i] || i === seg.length - 1) { const t = seg[i] ? Math.min(1, u / seg[i]) : 0; return [line[i][0] + (line[i + 1][0] - line[i][0]) * t, line[i][1] + (line[i + 1][1] - line[i][1]) * t]; }
    u -= seg[i];
  }
  return line[line.length - 1];
};
const RIVER_NAMES = RIVERS.map(r => {
  const w = textW(r.name, RIVER_NAME) * 0.95, h = RIVER_NAME * 1.05;
  for (const d of [0, 0.06, -0.06, 0.12, -0.12, 0.18, -0.18, 0.24, -0.24]) {
    const fr = r.at + d;
    if (fr < 0.05 || fr > 0.95) continue;
    const { p, ang } = along(r.line, fr), a = upright(ang), at = [p[0] + Math.sin(a) * (h / 2 + 0.8), p[1] - Math.cos(a) * (h / 2 + 0.8)];
    if (!inInner(at, w, h) || covered(at, w, h, a) > 0) continue;
    block([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([u, v]) => [at[0] + u * Math.cos(a) - v * Math.sin(a), at[1] + u * Math.sin(a) + v * Math.cos(a)]));
    return { name: r.name, at, ang: a };
  }
  return null;
}).filter(Boolean);

// ---------- region names, faint, in the freest spot near each region's own label point ----------
const REGION_NAMES = {
  abkhazeti: 'აფხაზეთი', svaneti: 'სვანეთი', samegrelo: 'სამეგრელო', racha: 'რაჭა-ლეჩხუმი', imereti: 'იმერეთი', guria: 'გურია', achara: 'აჭარა',
  samtskhe: 'სამცხე-ჯავახეთი', shidakartli: 'შიდა ქართლი', kvemokartli: 'ქვემო ქართლი', mtianeti: 'მთიანეთი', kakheti: 'კახეთი',
};
const REGION_COLOR = {
  abkhazeti: '#a3c27f', svaneti: '#dcb25e', samegrelo: '#d9a294', racha: '#a9c274', imereti: '#f0e2c6', guria: '#8fb87a', achara: '#e7b4a6',
  samtskhe: '#e9c06c', shidakartli: '#e6bcae', kvemokartli: '#a7c47e', mtianeti: '#b9786b', kakheti: '#efb460', kalakuri: '#d9b48c',
};
const REGION = 5.2, SPACING = 0.9;
const REGION_LABELS = Object.entries(REGION_NAMES).map(([k, name]) => {
  const home = bendU(SHAPES[k].label), w = textW(name, REGION) + SPACING * (name.length - 1), h = REGION * 1.05;
  let best = null;
  for (let ring = 0; ring <= 6 && !best; ring++) for (let a = 0; a < 12; a++) {
    const at = [home[0] + Math.cos(a * Math.PI / 6) * ring * 7, home[1] + Math.sin(a * Math.PI / 6) * ring * 5];
    if (inInner(at, w, h) && covered(at, w + 2, h + 1) === 0) { best = at; break; }
    if (ring === 0) break;
  }
  if (!best) return null;
  blockBox([best[0] - w / 2 - 1, best[1] - h / 2, best[0] + w / 2 + 1, best[1] + h / 2]);
  return { name, at: best, w };
}).filter(Boolean);

// ---------- mountain marks along the ridges, where nothing else is ----------
const PEAKS = (() => {
  const out = [];
  for (const ridge of RIDGES) {
    const line = ridge.line, seg = line.slice(1).map((p, i) => dist(line[i], p)), total = seg.reduce((a, b) => a + b, 0);
    for (let u = 2; u < total; u += 6.2 + rnd() * 2.4) {
      const p = pointAt(line, seg, u), q = pointAt(line, seg, Math.min(total, u + 1)), a = Math.atan2(q[1] - p[1], q[0] - p[0]);
      for (const row of ridge.snow ? [-4.2, 0, 4.2] : [-2.4, 2.4]) {
        const w = 6 + rnd() * 3.2, h = (ridge.snow ? 5.4 : 3.8) + rnd() * 1.8;
        const at = [p[0] - Math.sin(a) * row + (rnd() - 0.5) * 2, p[1] + Math.cos(a) * row + (rnd() - 0.5) * 1.6];
        if (!inInner(at, w, h) || covered(at, w + 1.6, h + 1.2, 0, 5, 3) > 0) continue;
        if (out.some(o => Math.abs(o.at[0] - at[0]) < (o.w + w) / 2 - 1 && Math.abs(o.at[1] - at[1]) < (o.h + h) / 2 - 0.8)) continue;
        out.push({ at, w, h, snow: ridge.snow && row !== (ridge.snow ? 4.2 : 99) });
      }
    }
  }
  return out.sort((a, b) => a.at[1] - b.at[1]);
})();

// ---------- drawing the board ----------
const INK = '#3b2a1c', LAND = '#f1e7cf', SEA_C = '#cfe2e2', SEA_LINE = '#6f9ba6', RIVER_C = '#5b95b4', MOUNT = '#8c6a49', ONPAPER = '#fbf6ec';
/** A smooth path through the points (Catmull-Rom as cubic curves). */
const smooth = pts => pts.reduce((d, p, i) => {
  if (i === 0) return `M${P2(p)}`;
  const p0 = pts[i - 2] ?? pts[i - 1], p1 = pts[i - 1], p3 = pts[i + 1] ?? p;
  return `${d}C${P2([p1[0] + (p[0] - p0[0]) / 6, p1[1] + (p[1] - p0[1]) / 6])} ${P2([p[0] - (p3[0] - p1[0]) / 6, p[1] - (p3[1] - p1[1]) / 6])} ${P2(p)}`;
}, '');

/** The marks inside the city circles (±4 mm): a tower for a city, a domed church for a shrine, a sail for a port. */
const CITY_GLYPH = {
  c: `<path d="M-2.5 3.6L-2.1 -1.4H-2.9V-3.7H-1.8V-2.7H-.55V-3.7H.55V-2.7H1.8V-3.7H2.9V-1.4H2.1L2.5 3.6Z" fill="${C.wine}"/>
<path d="M-.85 3.6V1.8A.85 .85 0 0 1 .85 1.8V3.6Z" fill="${ONPAPER}"/><rect x="-.45" y="-1" width=".9" height="1.3" rx=".35" fill="${ONPAPER}"/>`,
  s: `<path d="M-3.7 3.6V.8L0 -.8L3.7 .8V3.6Z" fill="${C.wine}"/><rect x="-1.3" y="-2.5" width="2.6" height="2.3" fill="${C.wine}"/>
<path d="M-1.65 -2.35L0 -4.1L1.65 -2.35Z" fill="${C.wine}"/><path d="M0 -4V-5.1M-.5 -4.65H.5" stroke="${C.wine}" stroke-width=".4"/>
<path d="M-.7 3.6V2.1A.7 .7 0 0 1 .7 2.1V3.6Z" fill="${ONPAPER}"/>`,
  p: `<path d="M-3.7 1.5H3.7L2.5 3.5H-2.5Z" fill="${C.wine}"/><path d="M0 1.5V-4" stroke="${C.wine}" stroke-width=".55"/>
<path d="M.5 -3.7L3.3 .9H.5Z" fill="${C.wine}"/><path d="M-.5 -2.7L-2.9 .9H-.5Z" fill="${C.wine}"/>`,
};
const SNOW_PEAK = `<path d="M-3.5 2.4L-.9 -2.2L.3 -.7L1.2 -1.7L3.5 2.4Z" fill="#fff" stroke="${INK}" stroke-width=".42" stroke-linejoin="round"/>`;
/** A small steamship (±4 mm): hull, deck house, funnel with smoke. */
const steamship = (color = INK, smoke = true) => `<path d="M-3.9 .4H3.9L2.9 2.5H-2.6Z" fill="${color}"/><rect x="-2.2" y="-1.1" width="3.6" height="1.5" fill="${color}"/>
<path d="M.3 -1.1V-3.1H1.4V-1.1Z" fill="${color}"/>${smoke ? `<circle cx="1.6" cy="-3.9" r=".65" fill="${color}" opacity=".55"/><circle cx="2.7" cy="-4.4" r=".8" fill="${color}" opacity=".4"/>` : ''}
<path d="M-3.4 3.3Q-2.6 2.8 -1.8 3.3T-.2 3.3T1.4 3.3T3 3.3" fill="none" stroke="${color}" stroke-width=".35"/>`;
const SHIP_MARK = `<circle r="3.7" fill="#fff" stroke="${INK}" stroke-width=".4"/><g transform="scale(.78) translate(0 -.2)">${steamship()}</g>`;
/** One cell: the road's colour, cart ruts (or paving stones on a gray road), a snowy peak on a mountain road, a ship at sea. */
const cellSvg = (c, color, { mountain = false, ship = false } = {}) => {
  const L = look(color);
  const inner = color === 'gray'
    ? [-6.3, 0, 6.3].flatMap(x => [-1.95, 1.95].map(y => `<rect x="${f(x - 2.75)}" y="${f(y - 1.4)}" width="5.5" height="2.8" rx="1" fill="#d6d0c7" stroke="#8d857b" stroke-width=".22"/>`)).join('')
    : `<path d="M-8.4 -2.15H8.4M-8.4 2.15H8.4" stroke="${color === 'white' ? '#b3a99c' : L.dark}" stroke-opacity="${color === 'white' ? 1 : 0.6}" stroke-width=".45" stroke-dasharray="2.4 .9"/>`;
  return `<g transform="translate(${P2(c.p)})"><g transform="rotate(${deg(upright(c.ang))})">${mountain ? `<path d="M-10 -5.8H10M-10 5.8H10" stroke="${INK}" stroke-width=".8" stroke-dasharray="1.6 1"/>` : ''}
<rect x="-10" y="-4.5" width="20" height="9" rx="1.4" fill="${L.color}" stroke="${L.dark}" stroke-width="${color === 'white' ? 0.5 : 0.4}"/>${inner}</g>${mountain ? SNOW_PEAK : ''}${ship ? SHIP_MARK : ''}</g>`;
};
/** The 1872 railway between a double road's tracks: two rails on sleepers. */
const railSvg = r => {
  const a = r._a ?? CITIES[r.from].p, b = r._b ?? CITIES[r.to].p, L = dist(a, b), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = -uy, ny = ux;
  const s0 = r._a ? 0 : CITY_R + 0.6, s1 = r._a ? L : L - CITY_R - 0.6, at = (s, k) => P2([a[0] + ux * s + nx * k, a[1] + uy * s + ny * k]);
  let ties = '';
  for (let s = s0 + 0.9; s < s1; s += 1.9) ties += `M${at(s, 1.3)}L${at(s, -1.3)}`;
  return `<path d="${ties}" stroke="${INK}" stroke-width=".38"/><path d="M${at(s0, 0.7)}L${at(s1, 0.7)}M${at(s0, -0.7)}L${at(s1, -0.7)}" stroke="${INK}" stroke-width=".32"/>`;
};
const peakSvg = ({ at, w, h, snow }) => {
  const hatch = [0.3, 0.5, 0.7, 0.88].map(t => `M${f(t * w / 2)} ${f(-h / 2 + t * h + 0.5)}V${f(h / 2 - 0.15)}`).join('');
  return `<g transform="translate(${P2(at)})"><path d="M${f(-w / 2)} ${f(h / 2)}Q${f(-w * 0.2)} ${f(-h * 0.12)} 0 ${f(-h / 2)}Q${f(w * 0.2)} ${f(-h * 0.08)} ${f(w / 2)} ${f(h / 2)}" fill="#efe1c2" stroke="${MOUNT}" stroke-width=".45" stroke-linejoin="round"/>
<path d="${hatch}" stroke="${MOUNT}" stroke-width=".3"/>${snow ? `<path d="M${f(-w * 0.16)} ${f(-h * 0.12)}L0 ${f(-h / 2)}L${f(w * 0.15)} ${f(-h * 0.16)}L${f(w * 0.05)} ${f(-h * 0.07)}L${f(-w * 0.03)} ${f(-h * 0.19)}Z" fill="#fff" stroke="${MOUNT}" stroke-width=".3" stroke-linejoin="round"/>` : ''}</g>`;
};
const textSvg = (s, at, { size, ang = 0, fill = INK, weight = 700, family = 'SansKa', halo = ONPAPER, haloW = 1.1, italic = false, spacing = 0, anchor = 'middle', opacity = 1 }) =>
  `<text x="0" y="0" transform="translate(${P2(at)}) rotate(${deg(ang)})" font-family="${family}" font-weight="${weight}" font-size="${size}" text-anchor="${anchor}" dominant-baseline="central"${italic ? ' font-style="italic"' : ''}${spacing ? ` letter-spacing="${spacing}"` : ''} fill="${fill}"${opacity < 1 ? ` opacity="${opacity}"` : ''}${halo ? ` stroke="${halo}" stroke-width="${haloW}" stroke-linejoin="round" paint-order="stroke"` : ''}>${esc(s)}</text>`;

// the score track: 100 places round the edge, 0 (= 100) in the top-left corner, clockwise
const TRACK = (() => {
  const top = 28, side = 20, hw = (BW - 2 * BAND) / top, hh = (BH - 2 * BAND) / side, m = BAND / 2, out = [[m, m]];
  for (let i = 0; i < top; i++) out.push([BAND + hw * (i + 0.5), m]);
  out.push([BW - m, m]);
  for (let i = 0; i < side; i++) out.push([BW - m, BAND + hh * (i + 0.5)]);
  out.push([BW - m, BH - m]);
  for (let i = 0; i < top; i++) out.push([BW - BAND - hw * (i + 0.5), BH - m]);
  out.push([m, BH - m]);
  for (let i = 0; i < side; i++) out.push([m, BH - BAND - hh * (i + 0.5)]);
  return out;
})();
const LEAF = `<path d="M0 0C-1.4 -1.2 -1.6 -3.3 -.2 -4.6C.4 -3.6 1.6 -3.5 2.3 -2.4C1.3 -2.1 .9 -1 0 0Z" fill="#6f8f3a" stroke="#4e6a25" stroke-width=".25"/>`;
const GRAPES = `<g fill="${C.wine}" stroke="#4a0f15" stroke-width=".2">${[[0, 0], [1.5, 0], [-1.5, 0], [.75, 1.3], [-.75, 1.3], [0, 2.6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".85"/>`).join('')}</g>`;
/** The score track as pieces with their boxes (see boardItems). */
const trackItems = () => {
  let vine = '';
  const marks = [], cells = [];
  for (let i = 0; i < 100; i++) {
    const a = TRACK[i], b = TRACK[(i + 1) % 100], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], L = dist(a, b), nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
    const s = i % 2 ? 1 : -1;
    vine += `${i === 0 ? `M${P2(a)}` : ''}Q${P2([mid[0] + nx * 4 * s, mid[1] + ny * 4 * s])} ${P2(b)}`;
    const at = [mid[0] + nx * 5.2 * s, mid[1] + ny * 5.2 * s];
    marks.push({ bb: [at[0] - 6, at[1] - 6, at[0] + 6, at[1] + 6], svg: `<g transform="translate(${P2(at)}) rotate(${deg(Math.atan2(ny * s, nx * s) + Math.PI / 2)})">${LEAF}</g>` });
  }
  TRACK.forEach((p, i) => {
    const big = i % 10 === 0, five = i % 5 === 0;
    const fill = i === 0 ? C.wine : big ? '#e9cf8a' : five ? '#f4e5bd' : ONPAPER;
    let svg = `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="8" fill="${fill}" stroke="${i === 0 ? '#4a0f15' : big ? C.goldDark : '#8c6a49'}" stroke-width="${big ? 0.7 : 0.45}"/>`;
    svg += i === 0
      ? textSvg('0', [p[0], p[1] - 2.2], { size: 4.6, fill: '#fff', halo: null }) + textSvg('100', [p[0], p[1] + 2.6], { size: 3.4, fill: '#f0d9a0', halo: null })
      : textSvg(String(i), p, { size: big ? 5.6 : 5, fill: big ? C.wine : INK, halo: null, weight: big ? 900 : 700 });
    if (big && i) svg += `<g transform="translate(${P2([p[0] + 6.2, p[1] - 5.8])})">${GRAPES}</g>`;
    cells.push({ bb: [p[0] - 9, p[1] - 11, p[0] + 10, p[1] + 9], svg });
  });
  return [
    { svg: `<path d="M0 0H${BW}V${BH}H0Z M${BAND} ${BAND}V${BH - BAND}H${BW - BAND}V${BAND}Z" fill="#e8d9b8" fill-rule="evenodd"/>
<path d="${vine}" fill="none" stroke="#6b4a2a" stroke-width="1" stroke-linecap="round"/>` },
    ...marks, ...cells,
    { svg: `<rect x="${BAND}" y="${BAND}" width="${BW - 2 * BAND}" height="${BH - 2 * BAND}" fill="none" stroke="${C.wine}" stroke-width=".9"/>
<rect x="${BAND + 1.3}" y="${BAND + 1.3}" width="${BW - 2 * BAND - 2.6}" height="${BH - 2 * BAND - 2.6}" fill="none" stroke="${C.gold}" stroke-width=".4"/>
<rect x="1" y="1" width="${BW - 2}" height="${BH - 2}" rx="7" fill="none" stroke="${C.wine}" stroke-width="1.4"/>` },
  ];
};

// ---------- the title, the legend and the score table ----------
/** A cart wheel with eight spokes. */
const wheel = (cx, cy, r, color = INK, w = r * 0.13) => `<g transform="translate(${f(cx)} ${f(cy)})" stroke="${color}" fill="none" stroke-linecap="round">
<circle r="${f(r - w * 0.7)}" stroke-width="${f(w * 1.4)}"/><circle r="${f(r * 0.72)}" stroke-width="${f(w * 0.45)}"/>
${Array.from({ length: 8 }, (_, k) => { const a = k * Math.PI / 4 + Math.PI / 8; return `<path d="M${f(Math.cos(a) * r * 0.24)} ${f(Math.sin(a) * r * 0.24)}L${f(Math.cos(a) * r * 0.8)} ${f(Math.sin(a) * r * 0.8)}" stroke-width="${f(w * 0.9)}"/>`; }).join('')}
<circle r="${f(r * 0.24)}" fill="${color}" stroke-width="${f(w * 0.5)}"/><circle r="${f(r * 0.08)}" fill="#fbf6ec" stroke="none"/></g>`;
/** An ox cart (ურემი) seen from the side, shaft to the left, `w` mm wide; `load` draws on its bed (a 52×20 box at 40, 8). */
const cartSvg = (cx, cy, w, { color = INK, load = '' } = {}) => `<g transform="translate(${f(cx - w / 2)} ${f(cy - w * 0.29)}) scale(${f(w / 100)})">
${load}<path d="M30 28H96V34H30Z" fill="${color}"/><path d="M33 28V13M47 28V13M61 28V13M75 28V13M89 28V13M31 14H95" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>
<path d="M33 31L3 42" stroke="${color}" stroke-width="3.2" stroke-linecap="round"/><path d="M1 35L7 49" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/>
${wheel(64, 40, 18, color, 2.4)}</g>`;
/** Bolnisi cross (the lib's, drawn in the board's own units). */
const boCross = (cx, cy, s, color = C.gold) => `<g transform="translate(${f(cx - s / 2)} ${f(cy - s / 2)}) scale(${f(s / 100)})" fill="${color}" stroke="${color}" stroke-width="1.2" stroke-linejoin="round">
<circle cx="50" cy="50" r="47" fill="none" stroke-width="2.4"/>${[0, 90, 180, 270].map(a => `<path d="M50 50 L37 10 A17 7 0 0 1 63 10 Z" transform="rotate(${a} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="7"/></g>`;
/** A caravanserai (ქარვასლა): a low house with a big arched gate, ±s/2. */
const innGlyph = (cx, cy, s, color) => `<g transform="translate(${f(cx)} ${f(cy)}) scale(${f(s / 10)})"><path d="M-5 4.6V-1.2L0 -4.8L5 -1.2V4.6Z" fill="${color}"/><path d="M-2.2 4.6V1.2A2.2 2.2 0 0 1 2.2 1.2V4.6Z" fill="${C.wine}"/><rect x="-4.1" y="-.6" width="1.3" height="1.5" fill="${C.wine}"/><rect x="2.8" y="-.6" width="1.3" height="1.5" fill="${C.wine}"/></g>`;
const compass = (cx, cy, r) => {
  const pt = (a, len, wd, fill) => `<path d="M0 0L${f(Math.cos(a - wd) * len * 0.32)} ${f(Math.sin(a - wd) * len * 0.32)}L${f(Math.cos(a) * len)} ${f(Math.sin(a) * len)}L${f(Math.cos(a + wd) * len * 0.32)} ${f(Math.sin(a + wd) * len * 0.32)}Z" fill="${fill}" stroke="${INK}" stroke-width=".25"/>`;
  const pts = [0, 1, 2, 3].map(k => pt(-Math.PI / 2 + k * Math.PI / 2, r, 0.42, k === 0 ? C.wine : '#efe1c2')).join('')
    + [0, 1, 2, 3].map(k => pt(-Math.PI / 4 + k * Math.PI / 2, r * 0.62, 0.5, '#d9c49a')).join('');
  return `<g transform="translate(${f(cx)} ${f(cy)})"><circle r="${f(r * 0.72)}" fill="none" stroke="${INK}" stroke-width=".3"/>${pts}<circle r="1" fill="${INK}"/>
${textSvg('ჩ', [0, -r - 3.2], { size: 4.2, fill: C.wine, halo: null })}</g>`;
};
const panel = ([x0, y0, x1, y1], inner, { crosses = false } = {}) => `<g><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="3" fill="${ONPAPER}" stroke="${C.wine}" stroke-width="1"/>
<rect x="${x0 + 1.8}" y="${y0 + 1.8}" width="${x1 - x0 - 3.6}" height="${y1 - y0 - 3.6}" rx="1.8" fill="none" stroke="${C.gold}" stroke-width=".45"/>
${crosses ? [[x0 + 6.5, y0 + 6.5], [x1 - 6.5, y0 + 6.5], [x1 - 6.5, y1 - 6.5], [x0 + 6.5, y1 - 6.5]].map(([x, y]) => boCross(x, y, 7)).join('') : ''}${inner}</g>`;
const titleSvg = () => {
  const [x0, y0, x1] = ZONES.title, cx = (x0 + x1) / 2;
  return panel(ZONES.title, `${cartSvg(cx, y0 + 25, 44, { color: C.brown, load: `<path d="M40 27C40 15 46 9 58 9H76C88 9 92 15 92 27Z" fill="${C.wine}"/><path d="M52 9.5V27M66 9V27M80 10V27" stroke="#f0d9a0" stroke-width="1.4"/>` })}
${textSvg(aso('ქარავანი'), [cx, y0 + 52], { size: 11.5, fill: C.wine, weight: 900, halo: null, spacing: 0.5 })}
${textSvg('ქარავანი', [cx, y0 + 64], { size: 6.4, fill: INK, weight: 800, family: 'SerifKa', halo: null })}
${textSvg('საქართველოს გზები', [cx, y0 + 73], { size: 4.4, fill: INK, weight: 700, family: 'SerifKa', halo: null })}
${textSvg('XIX საუკუნის მიწურული', [cx, y0 + 80], { size: 3.6, fill: '#6b5440', weight: 400, family: 'SerifKa', italic: true, halo: null })}
<path d="M${x0 + 14} ${y0 + 85.5}H${x1 - 14}" stroke="${C.gold}" stroke-width=".4"/>
${textSvg(`${SERIES} · №${NO}`, [cx, y0 + 91], { size: 3.5, fill: C.wine, weight: 700, halo: null })}`, { crosses: true });
};
const legendSvg = () => {
  const [x0, y0, x1, y1] = ZONES.legend, ix = x0 + 17, tx = x0 + 31;
  const line = (s, y, o = {}) => textSvg(s, [tx, y], { size: 3.8, anchor: 'start', weight: 400, family: 'SerifKa', halo: null, ...o });
  const row = (y, icon, l1, l2) => `${icon(ix, y)}${line(l1, l2 ? y - 2.3 : y, { weight: 700 })}${l2 ? line(l2, y + 2.4) : ''}`;
  const cell = (color, o = {}) => (x, y) => cellSvg({ p: [x, y], ang: 0 }, color, o);
  const dbl = (x, y) => `${cellSvg({ p: [x, y - 6.1], ang: 0 }, 'pink')}${cellSvg({ p: [x, y + 6.1], ang: 0 }, 'green')}${railSvg({ from: 'a', to: 'b', _a: [x - 10, y], _b: [x + 10, y] })}`;
  const marks = (x, y) => ['c', 's', 'p'].map((k, i) => `<g transform="translate(${f(x - 8 + i * 8)} ${f(y)}) scale(.56)"><circle r="${CITY_R}" fill="${ONPAPER}" stroke="${C.wine}" stroke-width="1.3"/>${CITY_GLYPH[k]}</g>`).join('');
  const inn = (x, y) => `<circle cx="${x}" cy="${y}" r="5.6" fill="${C.wine}" stroke="#4a0f15" stroke-width=".4"/>${innGlyph(x, y + 0.2, 7, '#f0d9a0')}`;
  return panel(ZONES.legend, `${textSvg('რუკის ნიშნები', [(x0 + x1) / 2, y0 + 9], { size: 5, fill: C.wine, weight: 900, halo: null })}
${row(y0 + 23, cell('red'), 'ფერადი გზა', 'ამ ფერის ბარათებით')}
${row(y0 + 39, cell('gray'), 'ქვის გზა', 'ნებისმიერი ერთი ფერით')}
${row(y0 + 55, cell('blue', { mountain: true }), 'მთის გზა', '„ამინდი მთაში“ — 3 ბარათი')}
${row(y0 + 71, cell('gray', { ship: true }), 'გემის ნიშანი', 'აქ ორთქლმავალი სავალდებულოა')}
${row(y0 + 91, dbl, 'ორმაგი გზა', '2–3 მოთამაშით მხოლოდ ერთი')}
${textSvg('ორმაგს შორის — რკინიგზა (1872)', [(x0 + x1) / 2, y0 + 105], { size: 3.3, weight: 400, family: 'SerifKa', italic: true, fill: '#6b5440', halo: null })}
${row(y0 + 118, marks, 'ქალაქი · სალოცავი', 'ნავსადგური')}
${row(y0 + 134, inn, 'ქარვასლა', 'მეზობლის ერთი გზა შენია')}
${compass((x0 + x1) / 2, y1 - 20, 11)}`);
};
const scoreSvg = () => {
  const [x0, y0, x1] = ZONES.score, cw = 19, lx = x0 + 6, cx0 = x0 + 34;
  const cells = SCORE.slice(1).map((pts, i) => `${textSvg(String(i + 1), [cx0 + i * cw + cw / 2, y0 + 23], { size: 5, halo: null })}
${textSvg(String(pts), [cx0 + i * cw + cw / 2, y0 + 34], { size: 5.6, fill: C.wine, weight: 900, halo: null })}`).join('');
  const grid = `<path d="M${cx0} ${y0 + 17}H${cx0 + 8 * cw}M${cx0} ${y0 + 28.5}H${cx0 + 8 * cw}M${cx0} ${y0 + 40}H${cx0 + 8 * cw}${Array.from({ length: 9 }, (_, i) => `M${cx0 + i * cw} ${y0 + 17}V${y0 + 40}`).join('')}" stroke="${C.line}" stroke-width=".35"/>`;
  const line = (s, y) => textSvg(s, [lx, y], { size: 3.7, anchor: 'start', weight: 400, family: 'SerifKa', halo: null });
  return panel(ZONES.score, `${textSvg('ქულები', [(x0 + x1) / 2, y0 + 9], { size: 5, fill: C.wine, weight: 900, halo: null })}
${grid}${textSvg('გზის უჯრა', [lx, y0 + 23], { size: 3.7, anchor: 'start', weight: 700, family: 'SerifKa', halo: null })}${textSvg('ქულა', [lx, y0 + 34], { size: 3.7, anchor: 'start', weight: 700, family: 'SerifKa', halo: null })}${cells}
${line('წერილი: შესრულებული — + ქულა, შეუსრულებელი — − ქულა', y0 + 50)}
${line('ყოველი უხმარი ქარვასლა — +4', y0 + 58)}
${line('„დიდი ქარავანი“ — ყველაზე გრძელი უწყვეტი გზა — +10', y0 + 66)}
${line('ბოლოს: ვისაც 2 ან ნაკლები ურემი დარჩა — ყველა კიდევ ერთ სვლას აკეთებს', y0 + 74)}`);
};
const seaName = () => textSvg('შავი ზღვა', [64, 140], { size: 8, fill: '#4c7f8f', weight: 400, family: 'SerifKa', italic: true, spacing: 1.6, halo: null, ang: -0.92 });

/** Everything on the board as pieces { bb: [x0, y0, x1, y1] (none = everywhere), svg } in drawing order, so a window of the board
 * (a printed A4 piece) carries only what it shows and the PDF stays light. */
const boardItems = (() => {
  let cache = null;
  const around = ([x, y], hw, hh = hw) => [x - hw, y - hh, x + hw, y + hh];
  const grow = (bb, d) => [bb[0] - d, bb[1] - d, bb[2] + d, bb[3] + d];
  return () => {
    if (cache) return cache;
    const items = [{ svg: `<rect width="${BW}" height="${BH}" fill="${LAND}"/>` }];
    for (const [k, r] of Object.entries(SHAPES)) {
      const polys = r.polys.map(poly => poly.map(bendU));
      items.push({ bb: grow(bboxOf(polys.flat()), 1), svg: `<path d="${polys.map(poly => `M${poly.map(P2).join('L')}Z`).join('')}" fill="${REGION_COLOR[k]}" fill-opacity=".36" stroke="#9c7b5c" stroke-opacity=".55" stroke-width=".3" stroke-dasharray="1.2 .8"/>` });
    }
    const seaD = `M${SEA.poly.map(P2).join('L')}Z`, coastD = `M${SEA.coast.map(P2).join('L')}`;
    const water = [7.2, 4.8, 2.4].map(d => `<path d="${coastD}" fill="none" stroke="${SEA_LINE}" stroke-opacity=".5" stroke-width="${2 * d}" stroke-linejoin="round"/><path d="${coastD}" fill="none" stroke="${SEA_C}" stroke-width="${2 * d - 0.45}" stroke-linejoin="round"/>`).join('');
    items.push({ bb: grow(bboxOf(SEA.poly), 8), svg: `<defs><clipPath id="seaClip"><path d="${seaD}"/></clipPath></defs><path d="${seaD}" fill="${SEA_C}"/><g clip-path="url(#seaClip)">${water}</g>
<path d="${coastD}" fill="none" stroke="${SEA_LINE}" stroke-width=".75" stroke-linejoin="round"/>` });
    const ring = OUTLINE.ring.map(bendU);
    items.push({ bb: grow(bboxOf(ring), 1), svg: `<path d="M${ring.map(P2).join('L')}Z" fill="none" stroke="${C.wine}" stroke-opacity=".55" stroke-width=".6" stroke-dasharray="3 1.4 .8 1.4"/>` });
    for (const r of RIVERS) items.push({ bb: grow(bboxOf(r.line), 1.5), svg: `<path d="${smooth(r.line)}" fill="none" stroke="${RIVER_C}" stroke-width=".95" stroke-linecap="round" stroke-linejoin="round"/>` });
    for (const n of RIVER_NAMES) items.push({ bb: around(n.at, textW(n.name, RIVER_NAME) / 2 + 2), svg: textSvg(n.name, n.at, { size: RIVER_NAME, ang: n.ang, fill: '#3f7896', weight: 400, family: 'SerifKa', italic: true, halo: null }) });
    for (const p of PEAKS) items.push({ bb: around(p.at, p.w / 2 + 1, p.h / 2 + 1), svg: peakSvg(p) });
    for (const r of REGION_LABELS) items.push({ bb: around(r.at, textW(r.name, REGION) / 2 + r.name.length * SPACING / 2 + 3, REGION), svg: textSvg(r.name, r.at, { size: REGION, fill: '#7a5a3a', weight: 700, family: 'SerifKa', spacing: SPACING, halo: null, opacity: 0.55 }) });
    items.push({ bb: around([64, 140], 48), svg: seaName() });
    for (const r of ROUTES.filter(r => RAILWAY.has(r.key))) items.push({ bb: grow(bboxOf([CITIES[r.from].p, CITIES[r.to].p]), 3), svg: railSvg(r) });
    for (const r of ROUTES) {
      const shipAt = r.ships === 1 ? [0] : r.ships === 2 ? [1, r.n - 2] : [];
      items.push({
        bb: grow(bboxOf(r.tracks.flatMap(t => t.cells.map(c => c.p))), 13),
        svg: r.tracks.map(t => t.cells.map((c, k) => cellSvg(c, t.color, { mountain: !!r.pass, ship: shipAt.includes(k) })).join('')).join(''),
      });
    }
    for (const p of PASSES) items.push({ bb: around(p.at, textW(p.name, PASS) / 2 + 2), svg: textSvg(p.name, p.at, { size: PASS, ang: p.ang, fill: '#5e3f22', weight: 700, family: 'SerifKa', italic: true, haloW: 0.9 }) });
    for (const c of Object.values(CITIES)) items.push({ bb: around(c.p, CITY_R + 1), svg: `<g transform="translate(${P2(c.p)})"><circle r="${CITY_R}" fill="${ONPAPER}" stroke="${C.wine}" stroke-width=".9"/><circle r="${CITY_R - 1.15}" fill="none" stroke="${C.gold}" stroke-width=".35"/>${CITY_GLYPH[c.look]}</g>` });
    for (const c of Object.values(CITIES)) {
      const L = LABELS[c.key], anchor = L.dir === 'e' || L.dir === 'ne' || L.dir === 'se' ? 'start' : L.dir === 'w' || L.dir === 'nw' || L.dir === 'sw' ? 'end' : 'middle';
      const x = anchor === 'start' ? L.at[0] - L.w / 2 : anchor === 'end' ? L.at[0] + L.w / 2 : L.at[0], top = L.at[1] - L.h / 2;
      items.push({
        bb: around(L.at, L.w / 2 + 2, L.h / 2 + 2),
        svg: textSvg(c.name, [x, top + NAME * 0.56], { size: NAME, anchor, haloW: 1.3 })
          + (L.sub ? textSvg(L.sub, [x, top + NAME * 1.08 + SUBNAME * 0.6], { size: SUBNAME, anchor, weight: 400, family: 'SerifKa', italic: true, fill: '#6b5440', haloW: 1 }) : ''),
      });
    }
    items.push({ bb: ZONES.title, svg: titleSvg() }, { bb: ZONES.legend, svg: legendSvg() }, { bb: ZONES.score, svg: scoreSvg() }, ...trackItems());
    return (cache = items);
  };
})();
/** The board's drawing for a window `view` = [x, y, w, h] (only the pieces that reach into it). */
const boardInner = (view = [0, 0, BW, BH]) => boardItems().filter(({ bb }) => !bb
  || (bb[0] <= view[0] + view[2] + 2 && bb[2] >= view[0] - 2 && bb[1] <= view[1] + view[3] + 2 && bb[3] >= view[1] - 2)).map(it => it.svg).join('');
/** The board, or a window of it: `view` = [x, y, w, h] in mm. */
const boardSvg = (view = [0, 0, BW, BH], scale = 1) => `<svg width="${f(view[2] * scale)}mm" height="${f(view[3] * scale)}mm" viewBox="${view.join(' ')}" style="display:block">${boardInner(view)}</svg>`;

// ---------- pictures: the eight goods (in a 100×100 box: `c` their colour, `d` its dark, `p` the paper) ----------
const GOOD_ART = {
  red: (c, d, p) => `<path d="M38 18H62V24C76 30 82 44 80 60C78 76 66 88 50 90C34 88 22 76 20 60C18 44 24 30 38 24Z" fill="${c}" stroke="${d}" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M34 17H66" stroke="${d}" stroke-width="4" stroke-linecap="round"/><path d="M30 46C40 42 60 42 70 46" fill="none" stroke="${p}" stroke-width="2.4" stroke-opacity=".7" stroke-linecap="round"/>
<g fill="${d}" stroke="${p}" stroke-width="1.4">${[[78, 66], [86, 66], [74, 73], [82, 73], [90, 73], [78, 80], [86, 80], [82, 87]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.6"/>`).join('')}</g>
<path d="M84 60C86 52 92 50 96 52" fill="none" stroke="${d}" stroke-width="2.2" stroke-linecap="round"/>`,
  yellow: (c, d, p) => {
    const hex = (x, y) => `<path d="M${x} ${y - 13}L${x + 11.3} ${y - 6.5}V${y + 6.5}L${x} ${y + 13}L${x - 11.3} ${y + 6.5}V${y - 6.5}Z" fill="${c}" stroke="${d}" stroke-width="2.4" stroke-linejoin="round"/><path d="M${x} ${y - 7}L${x + 6} ${y - 3.5}V${y + 3.5}L${x} ${y + 7}L${x - 6} ${y + 3.5}V${y - 3.5}Z" fill="${d}" fill-opacity=".25"/>`;
    return `${[[50, 30], [27.4, 43], [72.6, 43], [50, 56], [27.4, 69], [72.6, 69], [50, 82]].map(([x, y]) => hex(x, y)).join('')}
<path d="M72.6 82C72.6 88 70 92 72.6 96C75.2 92 72.6 88 72.6 82Z" fill="${c}" stroke="${d}" stroke-width="2"/>`;
  },
  green: (c, d, p) => `<path d="M50 94C50 70 48 46 40 20" fill="none" stroke="${d}" stroke-width="3.2" stroke-linecap="round"/>
<path d="M49 58C34 60 20 52 14 36C30 32 44 40 49 58Z" fill="${c}" stroke="${d}" stroke-width="2.4" stroke-linejoin="round"/><path d="M49 58C38 52 28 46 18 38" fill="none" stroke="${p}" stroke-opacity=".7" stroke-width="1.6"/>
<path d="M50 72C64 72 80 64 86 46C70 42 54 52 50 72Z" fill="${c}" stroke="${d}" stroke-width="2.4" stroke-linejoin="round"/><path d="M50 72C62 64 72 56 82 48" fill="none" stroke="${p}" stroke-opacity=".7" stroke-width="1.6"/>
<path d="M44 36C38 26 40 14 48 6C56 14 54 28 44 36Z" fill="${c}" stroke="${d}" stroke-width="2.4" stroke-linejoin="round"/><path d="M45 34C46 24 47 16 48 10" fill="none" stroke="${p}" stroke-opacity=".7" stroke-width="1.4"/>
<path d="M45 46C56 44 64 36 66 26C56 26 48 34 45 46Z" fill="${c}" stroke="${d}" stroke-width="2.2" stroke-linejoin="round"/>`,
  blue: (c, d, p) => `<path d="M50 8L92 50L50 92L8 50Z" fill="${c}" stroke="${d}" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M50 20L80 50L50 80L20 50Z" fill="none" stroke="${p}" stroke-width="2"/>
<g fill="${p}">${[0, 90, 180, 270].map(a => `<path d="M50 50C46 42 46 36 50 30C54 36 54 42 50 50Z" transform="rotate(${a} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="4"/></g>
<g fill="${p}">${[[50, 14], [86, 50], [50, 86], [14, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6"/>`).join('')}</g>
<path d="M92 50l4 4M88 54l4 4M84 58l4 4M80 62l4 4M76 66l4 4M72 70l4 4M8 50l-4 4M12 54l-4 4M16 58l-4 4M20 62l-4 4M24 66l-4 4M28 70l-4 4" stroke="${d}" stroke-width="2" stroke-linecap="round"/>`,
  black: (c, d, p) => `<path d="M38 14C42 10 58 10 62 14L66 20L86 26C90 28 92 32 90 36L84 88C83 92 80 94 76 94H24C20 94 17 92 16 88L10 36C8 32 10 28 14 26L34 20Z" fill="${c}" stroke="${p === '#fff' ? '#000' : '#5a524b'}" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M36 18C40 24 46 28 50 28C54 28 60 24 64 18" fill="none" stroke="#8a8178" stroke-width="2.4"/><path d="M50 28V92" stroke="#8a8178" stroke-width="2"/>
<path d="M22 40L20 86M78 40L80 86" stroke="#4b443e" stroke-width="1.8"/><circle cx="50" cy="32" r="3" fill="#c9a24b"/>`,
  white: (c, d, p) => `<path d="M10 46V64C10 76 28 84 50 84C72 84 90 76 90 64V46" fill="${c}" stroke="${d}" stroke-width="2.6"/>
<ellipse cx="50" cy="46" rx="40" ry="18" fill="${c}" stroke="${d}" stroke-width="2.6"/>
<path d="M50 46L88 52V70L50 64Z" fill="#f3e3b8" stroke="${d}" stroke-width="2.2" stroke-linejoin="round"/>
<path d="M58 54Q70 56 82 58M58 60Q70 62 82 64" fill="none" stroke="${d}" stroke-opacity=".45" stroke-width="1.4"/>
<ellipse cx="38" cy="42" rx="14" ry="5" fill="none" stroke="${d}" stroke-opacity=".3" stroke-width="1.4"/>`,
  orange: (c, d, p) => `<path d="M22 40H78C80 40 82 42 81 46L76 78C74 86 64 92 50 92C36 92 26 86 24 78L19 46C18 42 20 40 22 40Z" fill="${c}" stroke="${d}" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M16 36H84V44H16Z" fill="${c}" stroke="${d}" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M18 46C8 46 6 60 18 62M82 46C92 46 94 60 82 62" fill="none" stroke="${d}" stroke-width="3" stroke-linecap="round"/>
<path d="M30 36C30 22 40 14 50 14C60 14 70 22 70 36" fill="none" stroke="${d}" stroke-width="3"/><circle cx="50" cy="14" r="3.4" fill="${d}"/>
<path d="M30 54C34 68 40 76 48 80" fill="none" stroke="${p}" stroke-opacity=".65" stroke-width="3" stroke-linecap="round"/>`,
  pink: (c, d, p) => `<path d="M24 16H76V24H24ZM24 76H76V84H24Z" fill="${d}"/>
<path d="M30 24H70V76H30Z" fill="${c}" stroke="${d}" stroke-width="2.2"/>
<path d="M30 30L70 34M30 38L70 42M30 46L70 50M30 54L70 58M30 62L70 66M30 70L70 72" stroke="${d}" stroke-opacity=".55" stroke-width="1.6"/>
<path d="M70 52C82 54 92 62 92 74C92 84 84 90 76 88" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
<ellipse cx="18" cy="70" rx="9" ry="13" fill="${p}" stroke="${d}" stroke-width="2.2" transform="rotate(-18 18 70)"/>
<path d="M12 64Q18 66 24 63M12 71Q18 73 24 70M13 78Q18 79 23 77" fill="none" stroke="${d}" stroke-opacity=".5" stroke-width="1.3"/>`,
};
/** The locomotive of 1872 (a 100×60 box, facing left): `body` its colour, `trim` the details. */
const locomotive = (body, trim) => `<path d="M14 18H22L20 8H32L28 18" fill="${body}" stroke="${trim}" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M12 18H66V44H12C8 44 6 40 6 36V26C6 22 8 18 12 18Z" fill="${body}" stroke="${trim}" stroke-width="1.6"/>
<path d="M40 18C40 12 50 12 50 18" fill="${body}" stroke="${trim}" stroke-width="1.6"/>
<path d="M64 6H92V44H64Z" fill="${body}" stroke="${trim}" stroke-width="1.6"/><path d="M60 4H96V9H60Z" fill="${trim}"/>
<rect x="70" y="13" width="16" height="12" rx="1.5" fill="${trim}" opacity=".85"/>
<path d="M18 22H60M18 30H60" stroke="${trim}" stroke-width="1" opacity=".55"/>
<path d="M2 50L10 44H96V50Z" fill="${trim}"/>
${[[22, 50, 9], [44, 50, 9], [80, 51, 7.5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${body}" stroke="${trim}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="2" fill="${trim}"/>`).join('')}
<path d="M22 50L44 50L80 51" stroke="${trim}" stroke-width="2.2" stroke-linecap="round"/>
<g fill="${trim}" opacity=".35"><circle cx="24" cy="2" r="4"/><circle cx="16" cy="-4" r="5"/><circle cx="6" cy="-9" r="6"/></g>`;
/** The five animals of the score markers (a 100×80 box, facing left, filled with the group's colour); a leg is a tapered
 * quadrilateral from its top (x, y) to the hoof line at 76. */
const leg = (x, top, w0, w1 = w0 * 0.62, lean = 0) => `<path d="M${x - w0 / 2} ${top}L${x + w0 / 2} ${top}L${x + lean + w1 / 2} 76L${x + lean - w1 / 2} 76Z"/>`;
const legs = (front, rear, top, w0, w1, opts = {}) => [...front, ...rear].map((x, i) => leg(x, top, w0, w1, (opts.lean ?? [0, 0, 0, 0])[i])).join('');
const ANIMAL = {
  ox: `<ellipse cx="56" cy="42" rx="30" ry="15"/><path d="M30 34L40 30L42 52L28 54Z"/>
<path d="M8 40C8 34 14 30 22 30L30 32L32 50L22 50C16 50 12 50 9 47Z"/>
<path d="M20 31C14 26 12 20 15 14C17 20 21 24 26 28Z"/><path d="M26 31C28 24 32 20 38 19C34 23 32 27 32 32Z"/>
<path d="M24 48C26 56 32 58 38 54Z"/>${legs([33, 41], [72, 80], 46, 8, 5.4, { lean: [0, 1, -1, 0] })}
<path d="M85 36C89 42 90 52 89 62" fill="none" stroke="currentColor" stroke-width="2"/><path d="M89 60L92 68L86 68Z"/>`,
  buffalo: `<ellipse cx="58" cy="44" rx="32" ry="15"/><path d="M30 36L40 32L42 54L28 56Z"/>
<path d="M6 48C6 42 12 38 20 37L30 38L32 54L20 56C14 56 9 54 7 51Z"/>
<path d="M18 38C14 30 20 22 32 20C40 19 46 22 48 26C42 24 34 25 30 30C27 34 26 38 26 40Z"/>
${legs([33, 41], [74, 82], 48, 8.6, 6, { lean: [0, 1, -1, 0] })}
<path d="M89 38C92 44 93 52 92 62" fill="none" stroke="currentColor" stroke-width="2"/><path d="M92 60L95 68L89 68Z"/>`,
  horse: `<ellipse cx="60" cy="40" rx="25" ry="11"/><path d="M36 36L48 32L34 12L24 16Z"/>
<path d="M24 12C28 10 34 12 35 16L30 22L14 36C11 38 7 37 6 34C5 31 7 29 9 27Z"/><path d="M27 12L28 4L32 12Z"/>
<path d="M33 13C38 18 42 24 46 30" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>
${legs([39, 46], [74, 81], 44, 5.6, 3.6, { lean: [-2, 2, -1, 2] })}
<path d="M84 36C90 40 93 50 91 64C89 58 86 50 83 44Z"/>`,
  mule: `<ellipse cx="60" cy="41" rx="24" ry="11"/><path d="M37 37L48 33L33 14L24 18Z"/>
<path d="M24 14C28 12 34 13 35 17L30 23L14 37C11 39 7 38 6 35C5 32 7 30 9 28Z"/><path d="M24 15L19 1L28 12Z"/><path d="M28 13L29 0L33 13Z"/>
${legs([39, 46], [74, 81], 45, 5.6, 3.6, { lean: [-2, 2, -1, 2] })}
<path d="M84 38C87 44 88 52 88 60" fill="none" stroke="currentColor" stroke-width="2"/><path d="M88 58L91 68L85 68Z"/>`,
  camel: `<ellipse cx="62" cy="42" rx="23" ry="10"/><circle cx="54" cy="34" r="9"/><circle cx="71" cy="34" r="9"/>
<path d="M44 38C38 44 30 46 26 40C22 34 22 24 16 22L10 23C7 24 5 22 6 20C8 16 14 14 18 15C26 17 30 26 32 32C34 36 38 36 41 33Z"/>
<path d="M14 15L15 11L18 15Z"/>${legs([46, 52], [74, 80], 46, 5, 3.4, { lean: [-1, 2, -1, 1] })}
<path d="M85 40C88 44 89 50 88 56" fill="none" stroke="currentColor" stroke-width="2"/>`,
};
const ANIMALS = [['ox', 'ხარი'], ['camel', 'აქლემი'], ['horse', 'ცხენი'], ['mule', 'ჯორი'], ['buffalo', 'კამეჩი']];

// ---------- the travellers' letters (tickets): 40 + 6 long; a letter's points = the fewest cells between its cities ----------
const TICKETS = [
  ['chiatura', 'poti', 5, 'მანგანუმი ჭიათურის მაღაროებიდან ფოთის ნავსადგურში'], ['borjomi', 'tbilisi', 5, 'ბორჯომის მინერალური წყალი თბილისის აფთიაქებში'],
  ['kvareli', 'tbilisi', 5, 'ყვარლიდან, ილიას მშობლიური სოფლიდან, თბილისში'], ['sighnaghi', 'mtskheta', 5, 'სიღნაღიდან მცხეთობაზე — სვეტიცხოვლის დღესასწაულზე'],
  ['zugdidi', 'mestia', 5, 'ზუგდიდიდან სვანეთში — ენგურის ხეობით'], ['stepantsminda', 'alaverdi', 5, 'ხევიდან ალავერდობაზე — დიდ სახალხო დღესასწაულზე'],
  ['oni', 'kutaisi', 5, 'რაჭიდან ქუთაისის დიდ ბაზრობაზე'], ['samtredia', 'borjomi', 5, 'სამტრედიიდან ბორჯომის აგარაკზე — მინერალურ წყალზე'],
  ['vardzia', 'tbilisi', 6, 'თბილისელი მომლოცველები ვარძიაში — თამარის კლდის ქალაქში'], ['shatili', 'tbilisi', 6, 'ხევსურული ნაქარგი ტანსაცმელი თბილისის ბაზარზე'],
  ['zakatala', 'alaverdi', 6, 'საინგილოდან ალავერდობაზე'], ['oshki', 'batumi', 6, 'ოშკის ტაძრიდან ბათუმამდე — ჭოროხის ხეობით'],
  ['khashuri', 'poti', 6, 'მიხაილოვოს სადგურიდან (დღეს ხაშური) ფოთის ნავსადგურში'], ['akhalkalaki', 'kutaisi', 6, 'ჯავახეთის ხორბალი ქუთაისის წისქვილებში'],
  ['manglisi', 'kutaisi', 6, 'მანგლისის ძველი ტაძრიდან ბაგრატის ტაძრამდე'], ['akhaltsikhe', 'batumi', 6, 'ახალციხიდან ზღვამდე — გოდერძის უღელტეხილით'],
  ['senaki', 'gori', 6, 'სენაკიდან გორის ციხის სანახავად'], ['mtskheta', 'gelati', 7, 'სვეტიცხოვლიდან გელათამდე — მომლოცველის გზა'],
  ['kutaisi', 'tbilisi', 7, 'ქუთაისიდან თბილისის გიმნაზიაში — სასწავლებლად'], ['sokhumi', 'kutaisi', 7, 'სოხუმის თამბაქო ქუთაისის ბაზარზე'],
  ['tsageri', 'batumi', 7, 'ლეჩხუმიდან ბათუმში — პირველად ზღვის სანახავად'], ['vladikavkaz', 'tbilisi', 8, 'ილიას გზა: „მგზავრის წერილები“ ვლადიკავკაზიდან იწყება'],
  ['gelati', 'vardzia', 8, 'ოქროს ხანის ორი ძეგლი — დავითის გელათი და თამარის ვარძია'], ['tskhinvali', 'poti', 8, 'ლიახვის ხეობის ხილი ფოთის ნავსადგურში'],
  ['dmanisi', 'kutaisi', 8, 'დმანისის ძველი ქალაქიდან ქუთაისამდე'], ['ananuri', 'kutaisi', 8, 'ანანურის ციხიდან ქუთაისის ბაზრამდე'],
  ['kobuleti', 'gori', 8, 'ჩაქვის ჩაი გორის ბაზარზე'], ['batumi', 'mestia', 9, 'ზღვის პირიდან მესტიაში — სვანურ ქორწილში'],
  ['ganja', 'tbilisi', 9, 'განჯის აბრეშუმი თბილისის ქარვასლებში'], ['trabzon', 'poti', 9, 'ტრაპიზონის ვაჭრები ფოთის ბაზარზე'],
  ['ambrolauri', 'tbilisi', 9, 'რაჭული ღვინო თბილისის სუფრაზე'], ['zestaponi', 'telavi', 9, 'ყვირილის სადგურიდან (დღეს ზესტაფონი) თელავის ბაზარზე'],
  ['lagodekhi', 'gori', 9, 'ლაგოდეხის ტყის თხილი გორის ბაზარზე'], ['poti', 'tbilisi', 10, '1872 წლის პირველი მატარებელი — ფოთიდან თბილისამდე'],
  ['ozurgeti', 'tbilisi', 10, 'გურული მგალობლები თბილისის კონცერტზე'], ['bolnisi', 'gelati', 10, 'ბოლნისის სიონის ძველი წარწერიდან გელათის აკადემიამდე'],
  ['gurjaani', 'kutaisi', 10, 'კახელი მევენახე ქუთაისის ბაზარზე'], ['kars', 'gori', 10, 'ყარსის ბაზრიდან გორამდე — ძველი სავაჭრო გზა'],
  ['oshki', 'akhaltsikhe', 12, 'ტაოდან სამცხეში — ოშკის ტაძრიდან ახალციხემდე'], ['sagarejo', 'batumi', 13, 'საგარეჯოს ღვინო ზღვით — ბათუმის ნავსადგურიდან'],
];
const LONG = [
  ['bichvinta', 'garedja', 19, 'ზღვის პირის ტაძრიდან უდაბნოს მონასტრამდე'], ['kars', 'sokhumi', 18, 'ყარსიდან სოხუმამდე — ქარავნით ზღვამდე'],
  ['mestia', 'ganja', 20, 'სვანეთის მთებიდან განჯის ბაღებამდე'], ['trabzon', 'telavi', 21, 'შავი ზღვიდან ერეკლეს ქალაქამდე — მთელი ქვეყნის გადაკვეთა'],
  ['oshki', 'sighnaghi', 20, 'ტაოს ტაძრიდან სიღნაღის გალავნამდე'], ['batumi', 'omalo', 18, 'ზღვიდან თუშეთამდე — ბათუმიდან ომალომდე'],
];
/** The fewest cells between two cities (Dijkstra over the roads); every letter's points are checked against it. */
const fewestCells = (from, to) => {
  const d = { [from]: 0 }, done = new Set();
  for (;;) {
    let u = null;
    for (const k in d) if (!done.has(k) && (u === null || d[k] < d[u])) u = k;
    if (u === null || u === to) break;
    done.add(u);
    for (const r of ROUTES) {
      const v = r.from === u ? r.to : r.to === u ? r.from : null;
      if (v && (d[v] === undefined || d[u] + r.n < d[v])) d[v] = d[u] + r.n;
    }
  }
  return d[to];
};
for (const [a, b, v] of [...TICKETS, ...LONG]) if (fewestCells(a, b) !== v) throw new Error(`qaravani: letter ${a}–${b} says ${v}, the map gives ${fewestCells(a, b)}`);
if (TICKETS.length !== 40 || LONG.length !== 6) throw new Error('qaravani: 40 letters and 6 long ones');
{
  const named = new Set([...TICKETS, ...LONG].flatMap(t => [t[0], t[1]]));
  const missing = Object.keys(CITIES).filter(k => !named.has(k));
  if (missing.length) throw new Error(`qaravani: no letter names ${missing.join(', ')}`);
}

// ---------- cards (63×88 mm, drawn as one SVG each; wrapped text in HTML on top) ----------
const GOLD_L = '#f0d9a0';
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
/** `a` moved a share `t` of the way to `b`. */
const mix = (a, b, t) => `#${rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
const cardSvg = inner => `<svg class="cs" width="63mm" height="88mm" viewBox="0 0 63 88" font-family="SerifKa">${inner}</svg>`;
const frameSvg = (outer, inner = C.gold) => `<rect x="2.45" y="2.45" width="58.1" height="83.1" rx="2.6" fill="none" stroke="${outer}" stroke-width=".9"/>
<rect x="3.6" y="3.6" width="55.8" height="80.8" rx="1.8" fill="none" stroke="${inner}" stroke-width=".25"/>`;
/** The art window: 52×44 mm with a round top, at (5.5, 19.5); two soft ridges along its foot. */
const ARCH = 'M0 44V18A26 18 0 0 1 52 18V44Z';
const SOFT_RIDGES = ['M0 31L6 25L10 28L16 20L22 26L27 22L33 28L39 21L45 27L52 23V44H0Z', 'M0 37L8 31L14 35L20 30L28 36L35 32L42 37L48 33L52 35V44H0Z'];
let clips = 0;
const archSvg = (fill, ridge, inner) => {
  const id = `qa${clips++}`;
  return `<g transform="translate(5.5 19.5)"><defs><clipPath id="${id}"><path d="${ARCH}"/></clipPath></defs>
<g clip-path="url(#${id})">${fill}<path d="${SOFT_RIDGES[0]}" fill="${ridge}" fill-opacity=".26"/><path d="${SOFT_RIDGES[1]}" fill="${ridge}" fill-opacity=".4"/></g>
<path d="${ARCH}" fill="none" stroke="${C.gold}" stroke-width=".45"/>${inner}</g>`;
};
/** The round picture in the window (window units: centre 26, 22.5). */
const medallion = (fill, ring, art) => `<circle cx="26" cy="22.5" r="14.6" fill="${fill}" stroke="${C.gold}" stroke-width=".5"/>
<circle cx="26" cy="22.5" r="13.4" fill="none" stroke="${ring}" stroke-width=".7"/><g transform="translate(14.5 11) scale(.23)">${art}</g>`;
/** The corner marks a fanned hand shows: top left, and bottom right upside down. */
const indexes = (fill, ring, inner) => ['translate(7.7 7.7)', 'translate(55.3 80.3) rotate(180)'].map(t => `<g transform="${t}">
<circle r="4.25" fill="${C.paper}" stroke="${ring}" stroke-width=".3"/><circle r="3.75" fill="${fill}"/>${inner}</g>`).join('');
/** A small label pill (window colour ring, the good's dark tone for text). */
const pill = (text, cy, { fill = C.paper, ring, ink }) => {
  const w = textW(text, 3.3) * 1.04 + 6;
  return `<rect x="${f(31.5 - w / 2)}" y="${f(cy - 2.7)}" width="${f(w)}" height="5.4" rx="2.7" fill="${fill}" stroke="${ring}" stroke-width=".55"/>
<text x="31.5" y="${f(cy + 1.15)}" text-anchor="middle" font-family="SansKa" font-weight="700" font-size="3.3" fill="${ink}">${esc(text)}</text>`;
};
const goodBg = k => (k === 'white' ? '#ebe4d6' : mix(GOODS[k].color, C.paper, 0.84));

/** A caravan card of one good (its face as SVG in the card's own 63×88 units, so pictures in the rules reuse it). */
const goodFace = k => {
  const g = GOODS[k], white = k === 'white', ridge = k === 'black' ? '#6a625a' : g.dark;
  const window = archSvg(`<rect width="52" height="44" fill="${g.color}"/>`, ridge,
    medallion(white ? '#e6dccb' : C.paper, white ? g.dark : g.color, GOOD_ART[k](g.color, g.dark, C.paper)));
  return `<rect width="63" height="88" fill="${goodBg(k)}"/>${frameSvg(white ? g.dark : g.color)}
<text x="31.5" y="15.6" text-anchor="middle" font-weight="800" font-size="${g.name.length > 8 ? 5 : 5.6}" fill="${k === 'yellow' ? '#7a5a0c' : g.dark}">${esc(g.name)}</text>
${window}${white ? `<path d="${ARCH}" transform="translate(5.5 19.5)" fill="none" stroke="${g.dark}" stroke-width=".35"/>` : ''}
${pill(g.adj, 66.8, { ring: white ? g.dark : g.color, ink: k === 'yellow' ? '#7a5a0c' : g.dark })}
${indexes(g.color, white ? g.dark : g.color, `<g transform="translate(-2.9 -2.9) scale(.058)">${GOOD_ART[k](C.paper, white ? g.dark : mix(g.dark, '#000000', 0.2), g.color)}</g>`)}`;
};
const goodCard = k => `<div class="card qc">${cardSvg(goodFace(k))}<div class="qFrom">${esc(GOODS[k].from)}</div></div>`;

/** The locomotive (wild): night card, the eight colours in its window. */
const RAINBOW = ['red', 'orange', 'yellow', 'green', 'blue', 'pink', 'white', 'black'];
const locoFace = () => {
  const stripes = RAINBOW.map((k, i) => `<rect x="${f(i * 6.5)}" width="6.6" height="44" fill="${GOODS[k].color}"/>`).join('');
  const wheelIdx = `${RAINBOW.map((k, i) => {
    const a0 = (i / 8) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / 8) * 2 * Math.PI - Math.PI / 2, r = 3.75;
    return `<path d="M0 0L${f(r * Math.cos(a0))} ${f(r * Math.sin(a0))}A${r} ${r} 0 0 1 ${f(r * Math.cos(a1))} ${f(r * Math.sin(a1))}Z" fill="${GOODS[k].color}"/>`;
  }).join('')}<circle r="1.5" fill="${C.night}" stroke="${GOLD_L}" stroke-width=".3"/>`;
  return `<rect width="63" height="88" fill="${C.night}"/>${frameSvg(C.gold, '#8a6a3a')}
<text x="31.5" y="15.6" text-anchor="middle" font-weight="800" font-size="5.2" fill="${GOLD_L}">ორთქლმავალი</text>
${archSvg(stripes, C.night, `<circle cx="26" cy="22.5" r="14.6" fill="${C.paper}" stroke="${C.gold}" stroke-width=".5"/><circle cx="26" cy="22.5" r="13.4" fill="none" stroke="${C.night}" stroke-width=".7"/>
<g transform="translate(13 15.5) scale(.26)">${locomotive(C.night, C.gold)}</g>`)}
${pill('ნებისმიერი ფერი', 66.8, { fill: C.night, ring: C.gold, ink: GOLD_L })}
${indexes(C.night, C.gold, wheelIdx)}`;
};
const locoCard = () => `<div class="card qc loco">${cardSvg(locoFace())}<div class="qFrom">ფოთი — ტფილისი, 1872: პირველი მატარებელი</div></div>`;

/** The back of every caravan card. */
const caravanBackFace = (() => {
  const dots = Object.values(GOODS).map((g, i) => {
    const a = (i / 8) * 2 * Math.PI - Math.PI / 2;
    return `<circle cx="${f(31.5 + 19.5 * Math.cos(a))}" cy="${f(36 + 19.5 * Math.sin(a))}" r="2.1" fill="${g.color}" stroke="${GOLD_L}" stroke-width=".35"/>`;
  }).join('');
  return `<rect x="3" y="3" width="57" height="82" rx="2.2" fill="none" stroke="${C.gold}" stroke-width=".35"/>
<circle cx="31.5" cy="36" r="15.6" fill="none" stroke="${C.gold}" stroke-width=".35"/>${wheel(31.5, 36, 13, C.gold, 1.3)}${dots}
<text x="31.5" y="65" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="5.6" fill="${C.gold}" letter-spacing=".5">${aso(title)}</text>
<text x="31.5" y="71.4" text-anchor="middle" font-weight="700" font-size="3.4" fill="${GOLD_L}">ტვირთი და ორთქლმავალი</text>`;
})();
const caravanBack = `<div class="card dark">${corners(C.gold, 9, 4.6)}${cardSvg(caravanBackFace)}</div>`;

/** The map on a letter: land, sea, the roads as thin lines, the cities as dots and the letter's two cities marked. */
const MINI = [22, 22, 736, 516];
const miniBase = (() => {
  const line = (pts, step) => pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map(p => `${Math.round(p[0])},${Math.round(p[1])}`).join('L');
  const roads = ROUTES.map(r => {
    const cv = curve(CITIES[r.from].p, CITIES[r.to].p, r.bend);
    return `<path d="M${P2(cv.a)}Q${P2(cv.c)} ${P2(cv.b)}"${r.ships ? ` stroke="${SEA_LINE}" stroke-dasharray="7 5"` : ''}/>`;
  }).join('');
  return `<rect x="${MINI[0]}" y="${MINI[1]}" width="${MINI[2]}" height="${MINI[3]}" fill="#efe3c8"/><path d="M${line(SEA.poly, 6)}Z" fill="${SEA_C}"/>
<path d="M${line(SEA.coast, 6)}" fill="none" stroke="${SEA_LINE}" stroke-width="2.4"/>
<path d="M${line(OUTLINE.ring.map(bendU), 5)}Z" fill="none" stroke="${C.wine}" stroke-opacity=".32" stroke-width="2.6"/>
<g fill="none" stroke="#9a8264" stroke-width="3.4" stroke-linecap="round">${roads}</g>
<path d="${Object.values(CITIES).map(c => `M${c.p[0]} ${c.p[1]}h.01`).join('')}" stroke="${INK}" stroke-opacity=".7" stroke-width="12" stroke-linecap="round"/>`;
})();
const miniMap = (a, b, w) => `<svg width="${w}mm" height="${f(w * MINI[3] / MINI[2])}mm" viewBox="${MINI.join(' ')}" style="display:block">${miniBase}
${[a, b].map(k => { const [x, y] = CITIES[k].p; return `<circle cx="${x}" cy="${y}" r="17" fill="#fff" fill-opacity=".85"/><circle cx="${x}" cy="${y}" r="13" fill="${C.wine}"/><circle cx="${x}" cy="${y}" r="5" fill="${GOLD_L}"/>`; }).join('')}</svg>`;
const BAND_TOP = 'M2.45 11.8V5.05A2.6 2.6 0 0 1 5.05 2.45H57.95A2.6 2.6 0 0 1 60.55 5.05V11.8Z';
const bandTitle = (text, fill, ink) => `<path d="${BAND_TOP}" fill="${fill}"/>
<text x="31.5" y="8.55" text-anchor="middle" font-weight="700" font-size="3.6" fill="${ink}">${esc(text)}</text>
${(textW(text, 3.6) > 40 ? [] : [31.5 - textW(text, 3.6) / 2 - 4.2, 31.5 + textW(text, 3.6) / 2 + 4.2]).map(x => `<path d="M${f(x)} 5.6L${f(x + 1.3)} 7.3L${f(x)} 9L${f(x - 1.3)} 7.3Z" fill="${ink}" fill-opacity=".8"/>`).join('')}`;
const MAP_X = 5, MAP_Y = 21.4, MAP_W = 53;
/** A traveller's letter: regular (cream, wine) or long (gold, night). */
const ticketCard = ([a, b, pts, why], long = false) => {
  const id = `tg${clips++}`;
  const bg = long ? `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD_L}"/><stop offset="1" stop-color="#d8b765"/></linearGradient></defs><rect width="63" height="88" fill="url(#${id})"/>`
    : `<rect width="63" height="88" fill="#f4ead3"/>`;
  const mapH = MAP_W * MINI[3] / MINI[2];
  return `<div class="card qt${long ? ' long' : ''}">${cardSvg(`${bg}${frameSvg(long ? C.night : C.wine, long ? C.wine : C.gold)}
${bandTitle(long ? 'დიდი მოგზაურობა' : 'მგზავრის წერილი', long ? C.night : C.wine, GOLD_L)}
<rect x="${MAP_X - 0.4}" y="${MAP_Y - 0.4}" width="${MAP_W + 0.8}" height="${f(mapH + 0.8)}" rx=".8" fill="none" stroke="${long ? C.night : C.gold}" stroke-width=".4"/>
`)}
<div class="tMap" style="left:${MAP_X}mm;top:${MAP_Y}mm">${miniMap(a, b, MAP_W)}</div>
<svg class="cs" width="63mm" height="88mm" viewBox="0 0 63 88"><circle cx="10.9" cy="39.4" r="5.7" fill="${long ? C.wine : C.gold}" stroke="${C.paper}" stroke-width=".7"/><circle cx="10.9" cy="39.4" r="4.8" fill="none" stroke="${long ? GOLD_L : C.wine}" stroke-width=".25"/>
<text x="10.9" y="${pts > 9 ? 41.2 : 41.5}" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="${pts > 9 ? 4.7 : 5.5}" fill="${long ? GOLD_L : C.wine}">${pts}</text></svg>
<div class="tCities fit"><span>${esc(CITIES[a].name)} — ${esc(CITIES[b].name)}</span></div>
<div class="tWhy">${esc(why)}</div></div>`;
};
/** The back of a letter: an envelope sealed with the cart wheel. */
const ticketBackFace = long => {
  const ink = long ? GOLD_L : C.wine, paper = long ? '#3a2b1f' : '#f4ead3';
  return `<rect width="63" height="88" fill="${long ? C.night : '#e6d6b5'}"/>${frameSvg(long ? C.gold : C.wine, long ? '#8a6a3a' : C.gold)}
<text x="31.5" y="19" text-anchor="middle" font-weight="800" font-size="4.6" fill="${ink}">${long ? 'დიდი მოგზაურობა' : 'მგზავრის წერილი'}</text>
<rect x="10.5" y="26" width="42" height="28" rx="1.2" fill="${paper}" stroke="${ink}" stroke-width=".55"/>
<path d="M10.5 54L26.5 41.5M52.5 54L36.5 41.5" fill="none" stroke="${ink}" stroke-width=".35"/>
<path d="M10.5 26.6L31.5 43L52.5 26.6" fill="${long ? '#45331f' : '#ede0c3'}" stroke="${ink}" stroke-width=".55" stroke-linejoin="round"/>
<circle cx="31.5" cy="43" r="5.6" fill="${C.wine}" stroke="#4a0f15" stroke-width=".4"/>${wheel(31.5, 43, 3.6, GOLD_L, 0.5)}
<text x="31.5" y="66.5" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="4.4" fill="${long ? C.gold : C.goldDark}" letter-spacing=".5">${aso(title)}</text>
<text x="31.5" y="73.4" text-anchor="middle" font-size="3" font-style="italic" fill="${ink}">${long ? 'ერთი — თამაშის დასაწყისში' : '„მგზავრის წერილების“ კვალზე'}</text>`;
};
const ticketBack = long => `<div class="card qt">${cardSvg(ticketBackFace(long))}</div>`;

/** „დიდი ქარავანი“: +10 for the longest chain of one player's carts. */
const caravanLine = (x, y, s, color) => [['camel', 0], ['camel', 15], ['mule', 30]].map(([k, dx]) =>
  `<g transform="translate(${f(x + dx * s)} ${f(y)}) scale(${f(s * 0.14)})" fill="${color}">${ANIMAL[k]}</g>`).join('');
const bonusCard = () => {
  const id = `bg${clips++}`;
  const sky = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbeed0"/><stop offset="1" stop-color="#e3be78"/></linearGradient></defs><rect width="52" height="44" fill="url(#${id})"/>
<circle cx="38" cy="13" r="4.2" fill="#fff6dc" stroke="${C.gold}" stroke-width=".3"/>`;
  return `<div class="card qc bonus">${cardSvg(`<rect width="63" height="88" fill="#f1e4c4"/>${frameSvg(C.wine)}
<text x="31.5" y="15.6" text-anchor="middle" font-weight="800" font-size="5.6" fill="${C.wine}">დიდი ქარავანი</text>
${archSvg(sky, C.wine, `${caravanLine(9, 20.2, 1, INK)}<path d="M2 33.6Q26 30.4 50 33.2" fill="none" stroke="${INK}" stroke-width=".5" stroke-dasharray="1.6 1.1"/>`)}
<circle cx="31.5" cy="63.5" r="8.6" fill="${C.gold}" stroke="${C.paper}" stroke-width=".8"/><circle cx="31.5" cy="63.5" r="7.4" fill="none" stroke="${C.wine}" stroke-width=".3"/>
<text x="31.5" y="66" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="7" fill="${C.wine}">+10</text>`)}
<div class="bTxt">ყველაზე გრძელი<br>უწყვეტი გზა</div></div>`;
};
const bonusBack = `<div class="card qc bonus">${cardSvg(`<rect width="63" height="88" fill="#f1e4c4"/>${frameSvg(C.wine)}${bandTitle('როგორ დავითვალოთ', C.wine, GOLD_L)}`)}
<div class="qList"><p>თამაშის ბოლოს თითოეული ითვლის თავისი ურმების <b>ყველაზე გრძელ უწყვეტ ჯაჭვს</b> — უჯრებით.</p>
<p>ქალაქში გავლა რამდენჯერაც გინდა, შეიძლება; <b>ერთი გზა — მხოლოდ ერთხელ</b>. წრეც ითვლება.</p>
<p>ქარვასლით ნასესხები გზა <b>არ ითვლება</b>.</p>
<p>ვისაც ყველაზე გრძელი აქვს — <b>+10</b>. თანასწორობისას ყველა იღებს.</p></div></div>`;

/** The players' help card: front — a turn's four actions; back — points and the special roads. */
const ACTIONS = [
  ['ა', 'ბარათები', '2 — ღიადან ან დასტიდან; ღია ორთქლმავალი — მხოლოდ 1'],
  ['ბ', 'გზა', 'გზის ფერის ბარათები — რამდენი უჯრაცაა'],
  ['გ', 'წერილები', '3 აიღე, 1 მაინც დაიტოვე'],
  ['დ', 'ქარვასლა', '1, მერე 2, მერე 3 ერთი ფერის ბარათი'],
];
const helpCard = `<div class="card qc help">${cardSvg(`<rect width="63" height="88" fill="${C.paper}"/>${frameSvg(C.wine)}${bandTitle('ოთხი მოქმედება', C.wine, GOLD_L)}`)}
<div class="acts">${ACTIONS.map(([l, h, t]) => `<div class="act"><span class="l">${l}</span><div><b>${h}</b> ${t}</div></div>`).join('')}</div>
<div class="hNote">სვლაში — მხოლოდ ერთი.<br>ორთქლმავალი ნებისმიერ ფერს ცვლის.</div></div>`;
const helpBack = `<div class="card qc help">${cardSvg(`<rect width="63" height="88" fill="${C.paper}"/>${frameSvg(C.wine)}${bandTitle('ქულები', C.wine, GOLD_L)}`)}
<table class="hPts"><tr><th>უჯრა</th>${SCORE.slice(1).map((_, i) => `<td>${i + 1}</td>`).join('')}</tr><tr><th>ქულა</th>${SCORE.slice(1).map(p => `<td><b>${p}</b></td>`).join('')}</tr></table>
<div class="qList small2"><p><b>მთის გზა:</b> დასტიდან 3 ბარათი გახსენი; ყოველ შენს ფერზე და ორთქლმავალზე — +1 ბარათი.</p>
<p><b>გემის ნიშანი:</b> თითოზე 1 ორთქლმავალი.</p>
<p><b>ბოლოს:</b> წერილი ± ქულა, უხმარი ქარვასლა +4, „დიდი ქარავანი“ +10.</p>
<p><b>დასასრული:</b> 2 ან ნაკლები ურემი — ყველა კიდევ ერთ სვლას აკეთებს.</p></div></div>`;


// ---------- the players' pieces: carts 17×7.5 mm, caravanserais 12.5 mm, animals ⌀18 mm (one sheet, both sides alike) ----------
const PLAYERS = [
  { name: 'ღვინისფერი', color: C.wine, ink: GOLD_L, animal: 'ox' },
  { name: 'ოქროსფერი', color: C.gold, ink: C.night, animal: 'camel' },
  { name: 'მწვანე', color: '#2f6b45', ink: GOLD_L, animal: 'horse' },
  { name: 'ლურჯი', color: '#2b5797', ink: GOLD_L, animal: 'mule' },
  { name: 'შავი', color: '#2a2522', ink: GOLD_L, animal: 'buffalo' },
];
const animalName = k => ANIMALS.find(a => a[0] === k)[1];
const CART = { w: 17, h: 7.5, cols: 11, rows: 4 }; // 44 a colour: 40 + 4 spare
const cartsSvg = () => {
  const W = CART.w * CART.cols, H = CART.h * CART.rows * PLAYERS.length;
  let out = '';
  PLAYERS.forEach((pl, i) => {
    const y0 = i * CART.rows * CART.h;
    out += `<rect y="${y0}" width="${W}" height="${CART.rows * CART.h}" fill="${pl.color}"/>`;
    for (let r = 0; r < CART.rows; r++) for (let c = 0; c < CART.cols; c++) out += cartSvg(c * CART.w + 8.9, y0 + r * CART.h + 2.97, 12, { color: pl.ink });
    out += `<path d="${Array.from({ length: CART.cols - 1 }, (_, c) => `M${(c + 1) * CART.w} ${y0}V${y0 + CART.rows * CART.h}`).join('')}${Array.from({ length: CART.rows - 1 }, (_, r) => `M0 ${f(y0 + (r + 1) * CART.h)}H${W}`).join('')}" stroke="${pl.ink}" stroke-opacity=".55" stroke-width=".2"/>`;
  });
  return `<svg width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">${out}</svg>`;
};
/** Caravanserais: a column a colour, 3 + 1 spare; `back` mirrors the columns so each meets its own colour. */
const INN = 12.5;
const innsSvg = back => {
  const cols = back ? [...PLAYERS].reverse() : PLAYERS;
  const cell = (pl, x, y) => `<rect x="${x}" y="${y}" width="${INN}" height="${INN}" fill="${pl.color}"/><rect x="${x + 0.9}" y="${y + 0.9}" width="${INN - 1.8}" height="${INN - 1.8}" rx="1" fill="none" stroke="${pl.ink}" stroke-opacity=".7" stroke-width=".3"/>
<g transform="translate(${x + INN / 2} ${y + INN / 2 + 0.2}) scale(.8)"><path d="M-5 4.6V-1.2L0 -4.8L5 -1.2V4.6Z" fill="${pl.ink}"/><path d="M-2.2 4.6V1.2A2.2 2.2 0 0 1 2.2 1.2V4.6Z" fill="${pl.color}"/><rect x="-4.1" y="-.6" width="1.3" height="1.5" fill="${pl.color}"/><rect x="2.8" y="-.6" width="1.3" height="1.5" fill="${pl.color}"/></g>`;
  return `<svg width="${INN * 5}mm" height="${INN * 4}mm" viewBox="0 0 ${INN * 5} ${INN * 4}">${cols.map((pl, c) => [0, 1, 2, 3].map(r => cell(pl, c * INN, r * INN)).join('')).join('')}</svg>`;
};
const animalDisc = pl => `<svg width="18mm" height="18mm" viewBox="-9 -9 18 18"><circle r="9" fill="${pl.color}"/><circle r="8.1" fill="none" stroke="${pl.ink}" stroke-width=".35"/>
<g transform="translate(-7.1 -5.9) scale(.142)" fill="${pl.ink}" color="${pl.ink}">${ANIMAL[pl.animal]}</g></svg>`;
const figuresSheet = back => {
  const items = [
    { x: 11.5, y: 16, w: CART.w * CART.cols, h: CART.h * CART.rows * PLAYERS.length, html: cartsSvg() },
    { x: 11.5, y: 182, w: INN * 5, h: INN * 4, html: innsSvg(back) },
    ...PLAYERS.map((pl, i) => ({ x: 92 + i * 22.2, y: 182, w: 18, h: 18, html: animalDisc(pl) })),
  ];
  if (!back) items.push(
    { x: 11.5, y: 10.6, w: 187, h: 5, html: `<div class="pcCap">ურმები — თითოს 40 (5 მოთამაშით 35) + 4 სათადარიგო. ჭრა — ხაზებზე, სახაზავით.</div>` },
    { x: 11.5, y: 176.6, w: 75, h: 5, html: `<div class="pcCap">ქარვასლები — 3 + 1 სათადარიგო</div>` },
    { x: 92, y: 176.6, w: 107, h: 5, html: `<div class="pcCap">ქულების ნიშანი — ბილიკზე</div>` },
    ...PLAYERS.map((pl, i) => ({ x: 89 + i * 22.2, y: 201.6, w: 24, h: 5, html: `<div class="pcCap c">${animalName(pl.animal)}</div>` })),
    { x: 92, y: 212, w: 107, h: 20, html: `<div class="pcNote">ფერი — ცხოველი: ${PLAYERS.map(pl => `<b>${pl.name}</b> — ${animalName(pl.animal)}`).join(', ')}. ორივე მხარე ერთნაირია — ფიგურა ნებისმიერი მხრით დადე.</div>` },
    { x: 11.5, y: 240, w: 187, h: 30, html: `<div class="pcNote">ქაღალდი: 250–300 გ ან ჩვეულებრივი, მერე მუყაოზე დაკრული. ურმების ნაცვლად ფერადი ღილები ან ლეგოს 1×2 აგურებიც გამოდგება — თითო უჯრაზე ერთი.</div>` },
  );
  return placedSheet(items, { back, label: back ? 'ფიგურები — მეორე მხარე' : 'ფიგურები: ურმები, ქარვასლები, ცხოველები' });
};

// ---------- the board in eight A4 pieces (4 × 2), each 195×280 mm at 7.5, 8.5 on its page ----------
const TILE = { w: BW / 4, h: BH / 2, x: 7.5, y: 8.5 };
const tileMarks = () => {
  const { x, y, w, h } = TILE, L = 5;
  return `<svg class="cut" viewBox="0 0 210 297" width="210mm" height="297mm" style="position:absolute;left:0;top:0" stroke="#666" stroke-width=".25">
${[[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([cx, cy]) => `<path d="M${cx < 100 ? cx - L - 1 : cx + 1} ${cy}h${L}M${cx} ${cy < 100 ? cy - L - 1 : cy + 1}v${L}"/>`).join('')}</svg>`;
};
const locator = n => `<svg width="17mm" height="6.5mm" viewBox="0 0 17 6.5" style="display:block">${Array.from({ length: 8 }, (_, k) =>
  `<rect x="${(k % 4) * 4.2 + 0.2}" y="${Math.floor(k / 4) * 3.2 + 0.1}" width="3.9" height="2.9" rx=".4" fill="${k + 1 === n ? C.wine : 'none'}" stroke="${C.wine}" stroke-width=".25"/>`).join('')}</svg>`;
const tilePage = n => {
  const c = (n - 1) % 4, r = Math.floor((n - 1) / 4);
  const next = [c < 3 && ['r', n + 1], r < 1 && ['b', n + 4]].filter(Boolean);
  return page(`${tileMarks()}<div class="tile" style="left:${TILE.x}mm;top:${TILE.y}mm">${boardSvg([c * TILE.w, r * TILE.h, TILE.w, TILE.h])}</div>
<div class="sheetLabel">ფურცელი %SHEET% · რუკა · ნაწილი ${n}/8 — ცალმხრივი</div><div class="tileLoc">${locator(n)}</div>
${next.map(([side, m]) => `<div class="tileNext ${side}">ნაწილი ${m} ${side === 'r' ? '→' : '↓'}</div>`).join('')}`, 'tileP');
};


// ---------- pictures for the rules ----------
/** A card shrunk into a picture: its face drawn `w` mm wide at x, y (turned `rot`° about its centre). */
const mini = (face, x, y, w, rot = 0) => `<g transform="translate(${f(x)} ${f(y)})${rot ? ` rotate(${rot} ${f(w / 2)} ${f(w * 44 / 63)})` : ''} scale(${f(w / 63)})">
<rect x="1.2" y="1.6" width="63" height="88" rx="3" fill="#000" opacity=".16"/><rect width="63" height="88" rx="3" fill="#fff"/>${face}</g>`;
const BACK_FACE = `<rect width="63" height="88" fill="${C.wine}"/>${caravanBackFace}`;
const capSvg = (s, x, y, o = {}) => `<text x="${f(x)}" y="${f(y)}" text-anchor="${o.anchor ?? 'middle'}" font-family="SerifKa" font-size="${o.size ?? 3}" font-weight="${o.weight ?? 400}" fill="${o.fill ?? INK}">${esc(s)}</text>`;
const tableFigure = `<svg width="84mm" height="22.6mm" viewBox="0 0 84 22.6" style="display:block;margin:0 auto">
${mini(BACK_FACE, 2.6, 1.2, 10)}${mini(BACK_FACE, 1.8, 0.6, 10)}${mini(BACK_FACE, 1, 0, 10)}
${['red', 'blue', 'loco', 'green', 'yellow'].map((k, i) => mini(k === 'loco' ? locoFace() : goodFace(k), 15 + i * 11.2, 0, 10)).join('')}
${mini(ticketBackFace(false), 74.6, 1.2, 9)}${mini(ticketBackFace(false), 73.8, 0.6, 9)}${mini(ticketBackFace(false), 73, 0, 9)}
${capSvg('დასტა', 6.5, 21.2)}${capSvg('5 ღია ბარათი', 42.4, 21.2)}${capSvg('წერილები', 78, 21.2)}</svg>`;
/** One of a player's carts standing on a cell (board units). */
const cartOn = (cell, pl) => `<g transform="translate(${P2(cell.p)}) rotate(${deg(upright(cell.ang))})"><rect x="-8.5" y="-3.75" width="17" height="7.5" fill="${pl.color}" stroke="${pl.ink}" stroke-width=".3"/>${cartSvg(0.4, -0.78, 12, { color: pl.ink })}</g>`;
const cityDot = (x, y, look = 'c') => `<g transform="translate(${x} ${y})"><circle r="${CITY_R}" fill="${ONPAPER}" stroke="${C.wine}" stroke-width=".9"/><circle r="${CITY_R - 1.15}" fill="none" stroke="${C.gold}" stroke-width=".35"/>${CITY_GLYPH[look]}</g>`;
const claimFigure = (() => {
  const cells = [20.5, 42, 63.5].map(x => ({ p: [x, 0], ang: 0 }));
  return `<svg width="84mm" height="25mm" viewBox="0 0 84 25" style="display:block;margin:0 auto">
${['red', 'red', 'loco'].map((k, i) => mini(k === 'loco' ? locoFace() : goodFace(k), 2 + i * 6.4, 2.4 + Math.abs(i - 1) * 0.9, 10.5, (i - 1) * 9)).join('')}
<path d="M27.6 11.6H33.4M31.4 9.4L33.6 11.6L31.4 13.8" fill="none" stroke="${C.wine}" stroke-width=".7" stroke-linecap="round" stroke-linejoin="round"/>
<g transform="translate(38 10.6) scale(.5)">${cells.map(c => cellSvg(c, 'red')).join('')}${cells.map(c => cartOn(c, PLAYERS[0])).join('')}${cityDot(0, 0)}${cityDot(84, 0, 's')}</g>
<circle cx="59" cy="19.8" r="3.6" fill="${C.gold}" stroke="${C.paper}" stroke-width=".5"/><text x="59" y="21.1" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="3.5" fill="${C.wine}">+4</text></svg>`;
})();
const mountainFigure = `<svg width="84mm" height="26mm" viewBox="0 0 84 26" style="display:block;margin:0 auto">
${[0, 1, 2].map(i => mini(goodFace('blue'), 1 + i * 5.2, 1.4 + Math.abs(i - 1) * 0.8, 9.6, (i - 1) * 8)).join('')}
${capSvg('გადადე 3', 9.6, 24.6)}
${['blue', 'red', 'loco'].map((k, i) => mini(k === 'loco' ? locoFace() : goodFace(k), 29 + i * 10.6, 1.4, 9.6)).join('')}
${capSvg('დასტიდან 3', 44.2, 24.6)}${capSvg('✓', 33.8, 17.8, { size: 3.6, weight: 700, fill: '#2f6b45' })}${capSvg('✗', 44.4, 17.8, { size: 3.6, weight: 700, fill: C.wine })}${capSvg('✓', 55, 17.8, { size: 3.6, weight: 700, fill: '#2f6b45' })}
${[0, 1].map(i => mini(i ? locoFace() : goodFace('blue'), 66.6 + i * 7, 1.4, 9.6)).join('')}
${capSvg('დაამატე 2', 74.4, 24.6, { weight: 700, fill: C.wine })}</svg>`;

// ---------- rules (four pages) ----------
const RULES = [
  ['მომზადება', 'რუკა მაგიდის შუაში დადეთ. თითოეული ირჩევს ფერს და იღებს ამ ფერის 40 ურემს (5 მოთამაშით — 35-ს), 3 ქარვასლას და თავის ცხოველს — ქულების ნიშანს, რომელიც ბილიკზე 0-ზე დგება.'],
  ['ბარათები', 'ქარავნის 110 ბარათი აურიეთ და თითოს 4 დაურიგეთ. 5 ბარათი რუკის გვერდით პირაღმა გაშალეთ, დანარჩენი დახურულ დასტად დადეთ. „დიდი ქარავანი“ ყველას თვალწინ დადეთ, დამხმარე ბარათი ყველას მიეცით.'],
  ['წერილები', '6 „დიდი მოგზაურობა“ აურიეთ და თითოს 1 მიეცით, დარჩენილი უნახავად ყუთში ჩადეთ. 40 ჩვეულებრივი წერილი აურიეთ, თითოს 3 მიეცით, დანარჩენი დახურულ დასტად დადეთ. ყველა თავისი 4 წერილიდან 2-ს მაინც იტოვებს (შეიძლება მეტსაც); დაბრუნებული უნახავად ყუთში მიდის.'],
  ['რა ჩანს', 'დარჩენილი ურმები და ქარვასლები ყველას უნდა ჩანდეს. ხელის ბარათები და წერილები საიდუმლოა — თამაშის ბოლომდე.'],
  ['სვლა', 'იწყებს ის, ვისაც ყველაზე მეტი ქართული ქალაქი უნახავს, მერე — საათის ისრის მიმართულებით. სვლაში ზუსტად ერთ რამეს აკეთებ: <b>ა)</b> იღებ ბარათებს, <b>ბ)</b> იკავებ გზას, <b>გ)</b> იღებ წერილებს ან <b>დ)</b> აშენებ ქარვასლას.'],
  ['ა) ბარათები', 'იღებ 2 ბარათს — ღიადან ან დასტიდან, როგორც გინდა. აღებული ღია ბარათის ადგილას მაშინვე დასტიდან ახალი იშლება. ღიად აღებული ორთქლმავალი ამ სვლის ერთადერთი ბარათია; დასტიდან ბრმად ამოსული ორთქლმავალი ჩვეულებრივად ითვლება. თუ ღია 5-დან 3 ორთქლმავალია, ხუთივე იყრება და ახალი 5 იშლება. ხელში რამდენი ბარათიც გინდა, იმდენი შეიძლება გქონდეს.'],
  ['ბ) გზა', 'ორ ქალაქს შორის გზის დასაკავებლად გადადე გზის ფერის იმდენი ბარათი, რამდენი უჯრაც მას აქვს; ორთქლმავალი ნებისმიერ ფერს ცვლის. ნაცრისფერი „ქვის გზა“ ნებისმიერი ერთი ფერის ბარათებით იკავება. ყოველ უჯრაზე შენი ურემი დადგი, ბარათები გადაყარე და ქულა მაშინვე ბილიკზე გადაითვალე: 1 უჯრა — 1, 2 — 2, 3 — 4, 4 — 7, 5 — 10, 6 — 15, 7 — 18, 8 — 21. გზა მთლიანად ერთ სვლაში იკავება და შენს სხვა გზებს არ უნდა ებმოდეს.'],
  ['ორმაგი გზა', '8 ადგილას ორ ქალაქს ორი გზა აკავშირებს. ერთ მოთამაშეს ორივე არ შეუძლია. 2–3 მოთამაშით მხოლოდ ერთი გამოიყენება: ვინც პირველი დაიკავებს, მეორე ბოლომდე იკეტება. 4–5 მოთამაშით ორივე ღიაა — სხვადასხვა მოთამაშისთვის.'],
  ['მთის გზა', 'წყვეტილკიდიანი უჯრები თოვლიანი მწვერვალით უღელტეხილზე გადის (13 ასეთი გზაა). ჯერ ბარათები გადადე, მერე დასტიდან 3 ბარათი გახსენი — ეს „ამინდია მთაში“. ყოველ გახსნილ ბარათზე, რომელიც შენს ფერს ემთხვევა (ორთქლმავალი ყოველთვის ემთხვევა), კიდევ 1 ამ ფერის ბარათი ან ორთქლმავალი უნდა დაამატო. თუ არ გინდა ან არ შეგიძლია — ბარათები ხელში დაიბრუნე, სვლა დამთავრდა. გახსნილი 3 ბარათი იყრება.'],
  ['გემის გზა', 'ზღვისა და რიონის გზებზე გემის ნიშნებია (4 ასეთი გზაა). ყოველ ნიშანზე 1 ორთქლმავალი სავალდებულოა, დანარჩენი უჯრები — ერთი ფერის ბარათებით ან ორთქლმავლებით.'],
  ['გ) წერილები', 'დასტიდან 3 წერილი აიღე (თუ ნაკლებია — რამდენიც არის). 1-ს მაინც იტოვებ, შეიძლება 2-ს ან სამივეს. დაბრუნებული დასტის ბოლოში მიდის. დატოვებული წერილი ბოლომდე შენია — გადაგდება არ შეიძლება.'],
  ['დ) ქარვასლა', 'ააშენე ნებისმიერ ქალაქში, სადაც ჯერ ქარვასლა არ დგას. ფასი: პირველი — 1 ნებისმიერი ბარათი, მეორე — ერთი ფერის 2, მესამე — ერთი ფერის 3 (ორთქლმავალიც შეიძლება). თამაშის ბოლოს ქარვასლა ნებას გაძლევს, ამ ქალაქიდან გამავალი სხვისი ერთი გზა შენად ჩათვალო — ყველა შენი წერილისთვის ერთი და იგივე.'],
  ['დასასრული', 'როცა ვინმეს სვლის ბოლოს 2 ან ნაკლები ურემი დარჩება, ყველა — ის თვითონაც — კიდევ ერთ სვლას აკეთებს. მერე თამაში მთავრდება.'],
  ['ქულები', 'გზების ქულები უკვე ბილიკზეა (შეგიძლიათ გადაამოწმოთ). ყველა ხსნის წერილებს: შესრულებული — როცა ორი ქალაქი შენი ურმების უწყვეტი ჯაჭვით არის დაკავშირებული — ქულას ემატება, შეუსრულებელი აკლდება. ყოველი უხმარი ქარვასლა +4. „დიდი ქარავანი“ +10 — ვისაც ყველაზე გრძელი უწყვეტი გზა აქვს (როგორ ითვლება — ბარათის მეორე მხარეზე); თანასწორობისას ყველა იღებს.'],
  ['გამარჯვება', 'იგებს, ვისაც ყველაზე მეტი ქულა აქვს. თანასწორობისას — ვისაც მეტი წერილი შეუსრულდა; მერე — ვისაც ნაკლები ქარვასლა გამოიყენა; მერე — ვისაც „დიდი ქარავანი“ აქვს.'],
];
const FAQ = [
  ['მთის გზა მხოლოდ ორთქლმავლებით?', 'დამატება მხოლოდ გახსნილ ორთქლმავალზე გიწევს და მხოლოდ ორთქლმავლით.'],
  ['დასტაში 3-ზე ნაკლები ბარათია?', 'მთაში რამდენიც არის, იმდენს ხსნი; თუ არცერთი — დამატება არ გჭირდება. თუ დასტაც და გადაყრილიც გათავდა, ბარათებს ვერ აიღებ — სხვა მოქმედება აირჩიე.'],
  ['წერილი უმოკლესი გზით უნდა შევასრულო?', 'არა — ნებისმიერი უწყვეტი ჯაჭვი ითვლება, რაც არ უნდა გრძელი იყოს.'],
  ['ქარვასლის გზა „დიდ ქარავანში“?', 'არ ითვლება: ქარვასლა მხოლოდ წერილებს ეხმარება. რომელ გზას „ისესხებ“, თამაშის ბოლოს ირჩევ.'],
];
const SCORE_EX = [['გზები (ბილიკზე)', '64'], ['„ფოთი — თბილისი“ — შესრულდა', '+10'], ['„ბორჯომი — თბილისი“ — შესრულდა', '+5'], ['„ზუგდიდი — მესტია“ — ვერ შესრულდა', '−5'], ['1 უხმარი ქარვასლა', '+4'], ['„დიდი ქარავანი“', '+10']];
const rulesList = (list, start) => `<ol start="${start}">${list.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol>`;
const head = sub => `<div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">${esc(sub)}</div></div>`;
const rulesFoot = n => foot(`<span>${esc(title)} · წესები ${n}/4</span><span>${esc(SCHOOL)}</span>`);
const ENVELOPE = `<rect x="1" y="2.5" width="10" height="7" rx=".5" fill="#f4ead3" stroke="${C.wine}" stroke-width=".5"/><path d="M1.2 2.8L6 6.6L10.8 2.8" fill="none" stroke="${C.wine}" stroke-width=".5"/><circle cx="6" cy="6.6" r="1.4" fill="${C.wine}"/>`;
const ways = `<div class="wins3">
<div><svg width="12mm" height="12mm" viewBox="0 0 12 12">${cellSvg({ p: [6, 6], ang: -0.5 }, 'red').replace('<g transform="translate(6,6)">', '<g transform="translate(6,6) scale(.52)">')}</svg><b>გზები</b><span>დაკავებისთანავე: გრძელი გზა — მეტი ქულა</span></div>
<div><svg width="12mm" height="12mm" viewBox="0 0 12 12">${ENVELOPE}</svg><b>წერილები</b><span>ბოლოს: შესრულებული +, შეუსრულებელი −</span></div>
<div><svg width="12mm" height="12mm" viewBox="0 0 12 12">${caravanLine(0.4, 2.6, 0.36, INK)}</svg><b>დიდი ქარავანი</b><span>ყველაზე გრძელ გზას +10, უხმარ ქარვასლას +4</span></div></div>`;
const rulesPage1 = page(`${stripe(NO, 'წესები · 1')}<div class="rulesWrap">${head(`წესები · ${META}`)}
<p class="lead">XIX საუკუნის მიწურულია. ფოთიდან ტფილისამდე ახლახან გაიყვანეს რკინიგზა, მაგრამ ქვეყნის უმეტეს ნაწილში ჯერ ისევ ურმები და ქარავნები დადიან — ხეობებით, უღელტეხილებით და ზღვის პირით. თითოეული მოთამაშე ქარავნის პატრონია: აგროვებს ტვირთს, იკავებს გზებს თავისი ურმებით და ასრულებს მგზავრების წერილებს — ორი ქალაქის დაკავშირების საიდუმლო დავალებებს. ქულა სამი გზით მოდის:</p>
${ways}
<div class="rules">${rulesList(RULES.slice(0, 6), 1)}<div class="figBox"><h3>მაგიდაზე</h3>${tableFigure}<p class="figCap">რუკის გვერდით — ქარავნის დასტა, 5 ღია ბარათი და წერილების დასტა. თითოეულს ხელში 4 ბარათი და 2–4 წერილი აქვს.</p></div></div>
</div>${rulesFoot(1)}`, 'rulesP');
const rulesPage2 = page(`${stripe(NO, 'წესები · 2')}<div class="rulesWrap"><div class="rules">${rulesList(RULES.slice(6, 10), 7)}
<div class="figBox"><h3>გზის დაკავება</h3>${claimFigure}<p class="figCap">წითელი გზა 3 უჯრით: 2 წითელი ბარათი და 1 ორთქლმავალი. 3 ურემი დგება, ბილიკზე +4 ქულა.</p></div>
<div class="figBox"><h3>ამინდი მთაში</h3>${mountainFigure}<p class="figCap">ლურჯი მთის გზა 3 უჯრით. გახსნილში ერთი ლურჯია და ერთი ორთქლმავალი — კიდევ 2 ლურჯი (ან ორთქლმავალი) უნდა დაამატო. წითელი არ ითვლება.</p></div>
</div></div>${rulesFoot(2)}`, 'rulesP');
const rulesPage3 = page(`${stripe(NO, 'წესები · 3')}<div class="rulesWrap"><div class="rules">${rulesList(RULES.slice(10), 11)}
<div class="figBox"><h3>ქულების მაგალითი</h3><table class="t sx">${SCORE_EX.map(([n, v]) => `<tr><td>${n}</td><td>${v}</td></tr>`).join('')}<tr class="sum"><td>ჯამი</td><td>88</td></tr></table>
<p class="figCap">ნინომ 3 წერილიდან 2 შეასრულა, ერთი ქარვასლა არ დასჭირდა და ყველაზე გრძელი გზაც მას აქვს.</p></div>
<h3>ხშირი კითხვები</h3>${FAQ.map(([q, a]) => `<p class="faq"><b>${q}</b> ${a}</p>`).join('')}
</div></div>${rulesFoot(3)}`, 'rulesP');
const TIMELINE = [
  ['XIX ს.', 'საქართველოს სამხედრო გზა ტფილისიდან ვლადიკავკაზამდე — ჯვრის უღელტეხილითა და დარიალის ხეობით.'],
  ['1871', 'ილია ჭავჭავაძის „მგზავრის წერილები“: მოგზაურობა ვლადიკავკაზიდან ქართლისკენ.'],
  ['1872', 'პირველი რკინიგზა: ფოთი — ტფილისი.'],
  ['1879', 'ჭიათურაში მანგანუმის მოპოვება იწყება, აკაკი წერეთლის მონაწილეობით.'],
  ['1883', 'რკინიგზა ბათუმამდე მიდის.'],
  ['1890-იანი', 'ჩაქვში ჩაის პირველი დიდი პლანტაციები.'],
];
const PASS_LIST = ROUTES.filter(r => r.pass).map(r => [r.pass, `${CITIES[r.from].name} — ${CITIES[r.to].name}`]);
const rulesPage4 = page(`${stripe(NO, 'წესები · 4')}<div class="rulesWrap">${head('გზების ამბავი')}
<div class="two4"><div>
<h3>ცოტა ისტორია</h3><div class="tl">${TIMELINE.map(([d, t]) => `<p><b>${d}</b><span>${t}</span></p>`).join('')}</div>
<h3>13 მთის გზა</h3><div class="gl">${PASS_LIST.map(([n, t]) => `<p><b>${esc(n)}</b> — ${esc(t)}</p>`).join('')}</div>
<p class="small">დარიალი ხეობაა, დანარჩენი — უღელტეხილები. ზღვისა და რიონის 4 გზა გემით გადის.</p>
</div><div>
<h3>რას ასწავლის</h3><p class="p9">საქართველოს გეოგრაფიას — 47 ქალაქი და სალოცავი, მხარეები, მდინარეები და 13 მთის გზა; ისტორიას — XIX საუკუნის გზები, პირველი რკინიგზა, ძველი სახელები (ტფილისი, ქუთათისი, ყვირილა); ანგარიშს და დაგეგმვას — რომელი გზა უფრო მოკლეა და როდის ღირს მთაში წასვლის რისკი.</p>
<h3>პირველი თამაშისთვის</h3><p class="p9">პირველად 2–3 მოთამაშით ითამაშეთ, „დიდი მოგზაურობა“ გამოტოვეთ. მასწავლებელმა რუკაზე მთისა და გემის გზები აჩვენოს. ბოლოს თითოეული ხმამაღლა კითხულობს თავის წერილებს — ქალაქების ამბავი ლექსიკონშია (ფურცელი 1, მეორე მხარე). ერთი თამაში 45–60 წუთს გრძელდება.</p>
<h3>საზღვრის იქით</h3><p class="p9">${[...OUTSIDE].map(k => CITIES[k].name).join(', ').replace(/, ([^,]+)$/, ' და $1')} რუკაზე ქართული კულტურისა და ვაჭრობის ადგილებად არის, როგორც XIX საუკუნის მოგზაური ხედავდა — პოლიტიკის გარეშე. საზღვარი წყვეტილი ხაზითაა.</p>
<h3>რვა ტვირთი</h3><div class="goods8">${Object.entries(GOODS).map(([k, g]) => `<div><svg width="9mm" height="9mm" viewBox="0 0 100 100"><circle cx="50" cy="50" r="49" fill="${k === 'white' ? '#e6dccb' : goodBg(k)}" stroke="${k === 'white' ? g.dark : g.color}" stroke-width="3"/><g transform="translate(14 14) scale(.72)">${GOOD_ART[k](g.color, g.dark, C.paper)}</g></svg><span><b>${esc(g.name)}</b> · ${esc(g.adj)}<br>${esc(g.from)}</span></div>`).join('')}</div>
<div class="box credits"><b>წყარო და უფლებები.</b> შექმნილია „Ticket to Ride: Europe“-ის წესებით (ალან რ. მუნი, Days of Wonder, 2005). რუკა, ქალაქები, წერილები, ნახატები და წესების ტექსტი საგანძურის სკოლისაა; რუკის საზღვრები — სკოლის აპის რუკიდან. მხოლოდ სკოლის შიდა, არაკომერციული გამოყენებისთვის — გასაყიდად არ ვრცელდება.</div>
</div></div></div>${rulesFoot(4)}`, 'rulesP');

// ---------- the cities (the cover's back) ----------
const CITY_INFO = {
  bichvinta: ['პიტიუნტი', 'ძველი ტაძარი და ფიჭვნარი ზღვის პირას.'], sokhumi: ['ცხუმი', 'ზღვისპირა ქალაქი და ნავსადგური.'],
  zugdidi: ['', 'სამეგრელოს მთავრების, დადიანების, სასახლე.'], poti: ['ფაზისი', 'ძველი ფაზისის მახლობლად; 1872 წელს აქედან გავიდა პირველი მატარებელი.'],
  senaki: ['', 'ახლოს — ნოქალაქევი, ეგრისის ძველი დედაქალაქი.'], samtredia: ['', 'რკინიგზის კვანძი: აქედან იყოფა გზა ბათუმისკენ.'],
  kobuleti: ['', 'ზღვისპირა სოფელი; ახლოს, ჩაქვში, ჩაის პირველი დიდი პლანტაციებია.'], batumi: ['ბათომი', 'ნავსადგური; 1883 წლიდან — რკინიგზაც.'],
  ozurgeti: ['', 'გურიის ცენტრი — გურული მგალობლების მხარე.'], kutaisi: ['ქუთათისი', 'იმერეთის ცენტრი, ბაგრატის ტაძარი (XI ს.).'],
  gelati: ['', 'დავით აღმაშენებლის მონასტერი და აკადემია (1106).'], zestaponi: ['ყვირილა', 'სადგური მდინარე ყვირილის პირას.'],
  chiatura: ['', 'მანგანუმის მაღაროები — 1879 წლიდან, აკაკი წერეთლის მონაწილეობით.'], ambrolauri: ['', 'რაჭის ცენტრი; ვენახები და ხვანჭკარა.'],
  oni: ['', 'ზემო რაჭა, რიონის ხეობა.'], tsageri: ['', 'ლეჩხუმი, ცხენისწყლის ხეობა.'],
  mestia: ['', 'ზემო სვანეთი — კოშკები და ძველი ხატები.'], borjomi: ['', 'მინერალური წყალი, პარკი და სასახლე.'],
  akhaltsikhe: ['ლომსია', 'სამცხის ცენტრი, ციხე და რაბათი.'], vardzia: ['', 'თამარ მეფის კლდეში ნაკვეთი მონასტერი (XII ს.).'],
  akhalkalaki: ['', 'ჯავახეთის ზეგანი და ციხე.'], khashuri: ['მიხაილოვო', 'სადგური სურამის უღელტეხილის ძირას.'],
  gori: ['', 'ციხე; ახლოს — უფლისციხე, კლდეში ნაკვეთი ქალაქი.'], tskhinvali: ['ქრცხინვალი', 'ლიახვის ხეობა, ხილის ბაღები.'],
  mtskheta: ['', 'ძველი დედაქალაქი: სვეტიცხოველი და ჯვარი.'], tbilisi: ['ტფილისი', 'დედაქალაქი: ბაზრები, ქარვასლები, აბანოები.'],
  manglisi: ['', 'ერთ-ერთი უძველესი ქართული ტაძარი.'], bolnisi: ['', 'ბოლნისის სიონი (V ს.) — უძველესი ქართული წარწერებით.'],
  dmanisi: ['', 'შუა საუკუნეების ქალაქი სავაჭრო გზაზე.'], sagarejo: ['', 'გომბორის ქედის ძირას — კახეთის კარი.'],
  ananuri: ['', 'ციხე-ტაძარი არაგვის პირას, სამხედრო გზაზე.'], stepantsminda: ['', 'ხევი: მყინვარწვერი და გერგეტის სამება; XX საუკუნეში ყაზბეგი ერქვა.'],
  shatili: ['', 'ხევსურეთის ციხე-სოფელი.'], omalo: ['', 'თუშეთი — აბანოს უღელტეხილის იქით.'],
  telavi: ['', 'ერეკლე II-ის ქალაქი.'], alaverdi: ['', 'დიდი ტაძარი და ალავერდობის სახალხო დღესასწაული.'],
  kvareli: ['', 'ილია ჭავჭავაძის მშობლიური ადგილი.'], gurjaani: ['', 'ალაზნის ველის ვენახები.'],
  lagodekhi: ['', 'ტყე და ჩანჩქერები კავკასიონის ძირას.'], sighnaghi: ['', 'გალავნიანი ქალაქი ალაზნის ველის თავზე.'],
  garedja: ['', 'დავითგარეჯის უდაბნოს მონასტრები.'], trabzon: ['ტრაპეზუნტი', 'ბერძნული ქალაქი; 1204 წელს თამარის დახმარებით აქ სამეფო დაარსდა.'],
  oshki: ['', 'ტაოს დიდი ტაძარი (X ს.).'], kars: ['', 'ძველი ციხე-ქალაქი და სავაჭრო კვანძი.'],
  ganja: ['ელისავეტპოლი', 'ძველი ქალაქი; აქ ცხოვრობდა პოეტი ნიზამი განჯელი.'], zakatala: ['', 'საინგილო — ქართველი ინგილოების მხარე.'],
  vladikavkaz: ['', 'სამხედრო გზის ჩრდილოეთი ბოლო.'],
};
if (Object.keys(CITY_INFO).length !== Object.keys(CITIES).length) throw new Error('qaravani: every city needs a line in CITY_INFO');
const glossaryPage = page(`${stripe(NO, 'ქალაქები')}<div class="rulesWrap">${head('47 ქალაქი და სალოცავი')}
<p class="lead">ფრჩხილებში — XIX საუკუნის ან უფრო ძველი სახელი. ნიშნები რუკაზე: <b>კოშკი</b> — ქალაქი, <b>გუმბათი</b> — სალოცავი, <b>იალქანი</b> — ნავსადგური.</p>
<div class="gloss">${Object.values(CITIES).sort((a, b) => a.name.localeCompare(b.name, 'ka')).map(c => {
  const [old, t] = CITY_INFO[c.key];
  return `<p><b>${esc(c.name)}</b>${old ? ` <i>(${esc(old)})</i>` : ''} — ${esc(t)}</p>`;
}).join('')}</div></div>
${foot(`<span>${esc(title)} · ქალაქები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

// ---------- the cover and the box label ----------
const coverBoard = w => `<svg width="${w}mm" height="${f(w * BH / BW)}mm" viewBox="0 0 ${BW} ${BH}" style="display:block">${boardInner()}
<g fill="none" stroke="${C.wine}" stroke-width="3" stroke-dasharray="14 8">${[1, 2, 3].map(k => `<path d="M${k * TILE.w} 0V${BH}"/>`).join('')}<path d="M0 ${TILE.h}H${BW}"/></g>
${Array.from({ length: 8 }, (_, k) => { const x = (k % 4) * TILE.w + TILE.w / 2, y = Math.floor(k / 4) * TILE.h + TILE.h / 2; return `<circle cx="${x}" cy="${y}" r="30" fill="${C.wine}" fill-opacity=".88"/><text x="${x}" y="${y + 13}" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="38" fill="${GOLD_L}">${k + 1}</text>`; }).join('')}</svg>`;
const miniCardHtml = (html, scale) => `<div style="width:${f(63 * scale)}mm;height:${f(88 * scale)}mm;overflow:hidden;border-radius:${f(2.6 * scale)}mm;box-shadow:0 .3mm 1mm rgba(0,0,0,.25);flex:none"><div style="transform:scale(${scale});transform-origin:0 0">${html}</div></div>`;
const coverPage = no => page(`${stripe(NO)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">ქარავანი</h1>
  <div class="lead">XIX საუკუნის მიწურული: ახალი რკინიგზა, ძველი ქარავნის გზები და 47 ქალაქი — ბიჭვინთიდან ომალომდე. შეაგროვე ტვირთი, დაიკავე გზები და შეასრულე მგზავრის წერილები.<br><b>${META}</b></div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th><th>✓</th></tr>
        <tr><td>წესები</td><td>4 გვ.</td><td>${no('rules1')}–${no('rules2')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ქალაქების ლექსიკონი</td><td>1 გვ.</td><td>${no('cover')}</td><td><span class="chk"></span></td></tr>
        <tr><td><i class="sw" style="background:${C.wine}"></i>ტვირთი, 8 ფერი × 12</td><td>96</td><td>${no('car1')}–${no('car11')}</td><td><span class="chk"></span></td></tr>
        <tr><td><i class="sw" style="background:${C.wine}"></i>ორთქლმავალი</td><td>14</td><td>${no('car11')}, ${no('car12')}, ${no('mix')}</td><td><span class="chk"></span></td></tr>
        <tr><td><i class="sw" style="background:#e6d6b5"></i>მგზავრის წერილი</td><td>40</td><td>${no('tix1')}–${no('tix5')}</td><td><span class="chk"></span></td></tr>
        <tr><td><i class="sw" style="background:${C.night}"></i>დიდი მოგზაურობა</td><td>6</td><td>${no('tix5')}, ${no('mix')}</td><td><span class="chk"></span></td></tr>
        <tr><td>„დიდი ქარავანი“</td><td>1</td><td>${no('mix')}</td><td><span class="chk"></span></td></tr>
        <tr><td>დამხმარე ბარათი</td><td>5</td><td>${no('mix')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ურმები, 5 ფერი</td><td>5 × 44</td><td>${no('figs')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ქარვასლები</td><td>5 × 4</td><td>${no('figs')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ცხოველები — ქულების ნიშნები</td><td>5</td><td>${no('figs')}</td><td><span class="chk"></span></td></tr>
        <tr><td>რუკა 78×56 სმ</td><td>8 ნაწ.</td><td>${no('map1')}–${no('map8')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ყუთის იარლიყი</td><td>1</td><td>${no('label')}</td><td><span class="chk"></span></td></tr>
      </table>
      <p class="small">ფერადი კვადრატი — ბარათის ზურგის ფერი. სულ ${SHEETS.length} ფურცელი; ბარათი 63×88 მმ.</p>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „Ticket to Ride: Europe“-ის წესებით (ალან რ. მუნი, Days of Wonder, 2005). რუკა, ქალაქები, წერილები, ნახატები და ტექსტი საგანძურის სკოლისაა. მხოლოდ სკოლის შიდა, არაკომერციული გამოყენებისთვის.</div>
      <h3 class="asmT">რუკის აწყობა: ზემოთ 1–4, ქვემოთ 5–8</h3>
      ${coverBoard(80)}
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b> („fit to page“ გამორთული). ჯერ ერთი საცდელი ფურცელი: ბარათი 63×88 მმ უნდა იყოს. რუკის ფურცლები ცალმხრივია — მეორე მხარე განზრახ ცარიელია.</li>
        <li>ქაღალდი: წესები — ჩვეულებრივი; ბარათები და ფიგურები — 250–300 გ (ან 160 გ + მქრქალი ლამინაცია); რუკა — 160–200 გ.</li>
        <li>ბარათები ნიშნულებს შორის, დანით სახაზავთან ჭერით (უფროსები ჭრიან; სტამბაში ჭრაც შეუკვეთეთ — 162 ბარათია). 63×88 მმ სლივები ბარათებს გაუძლებს.</li>
        <li>რუკა: თითო ნაწილი კუთხის ნიშნულებზე ამოჭერი, ნომრების რიგით მჭიდროდ მიადე ერთმანეთს და უკნიდან ქაღალდის ლენტით შეაერთე. მყარი დაფისთვის — 4 ნაწილი ერთ მუყაოზე, 4 მეორეზე: შუაზე დაიკეცება.</li>
        <li>ურმები და ქარვასლები ხაზებზე ჭრით; ცხოველები — წრეზე, მაკრატლით. ურმების ნაცვლად ფერადი ღილები ან ლეგოს 1×2 აგურებიც გამოდგება.</li>
      </ol>
      <div class="covCards">${miniCardHtml(goodCard('red'), 0.5)}${miniCardHtml(ticketCard(TICKETS[33]), 0.5)}</div>
      <div class="covCards">${miniCardHtml(locoCard(), 0.5)}${miniCardHtml(ticketCard(LONG[3], true), 0.5)}</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} №${NO}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');
const LID_VIEW = [22, 22, 736, 380];
const labelPage = page(`<div class="lbl lid"><svg width="190mm" height="${f(190 * LID_VIEW[3] / LID_VIEW[2])}mm" viewBox="${LID_VIEW.join(' ')}" style="display:block">${boardInner(LID_VIEW)}</svg>
<div class="lidBar"><div class="lt"><div class="aso big">${aso(title)}</div><div class="nm">ქარავანი</div></div>
<div class="rt"><div class="sub">საქართველოს გზები · XIX საუკუნის მიწურული</div><div class="meta">${META}</div><div class="ser">${esc(SERIES)} · №${NO} · ${esc(SCHOOL)}</div></div></div></div>
<div class="lbl list"><h3>ყუთში უნდა იყოს</h3><div class="items">
${['110 ქარავნის ბარათი', '40 მგზავრის წერილი', '6 „დიდი მოგზაურობა“', '„დიდი ქარავანი“', '5 დამხმარე ბარათი', 'რუკა — 8 ნაწილი', '5 × 44 ურემი', '5 × 4 ქარვასლა', '5 ცხოველი', 'წესები და ლექსიკონი'].map(t => `<span><span class="chk"></span>${t}</span>`).join('')}</div></div>
${[0, 1].map(k => `<div class="lbl side s${k}"><span class="aso">${aso(title)}</span><b>ქარავანი</b><span>${META}</span></div>`).join('')}
<div class="lblNote">იარლიყი ყუთის სახურავზე და გვერდებზე; ჭრა — ხაზებზე.</div>`, 'labelP');

export const css = `
.card .cs{position:absolute;left:0;top:0}
.card.qc,.card.qt{background:none}
.qFrom{position:absolute;left:10mm;right:10.5mm;top:70.2mm;height:7.8mm;display:flex;align-items:center;justify-content:center;text-align:center;font-size:8.8pt;line-height:1.18;font-style:italic;color:#4a3426}
.loco .qFrom{color:${GOLD_L}}
.tMap{position:absolute}
.tCities{position:absolute;left:5mm;right:5mm;top:12.4mm;height:8.6mm;line-height:8.6mm;text-align:center;font-weight:800;font-size:12.5pt;color:${INK}}
.tWhy{position:absolute;left:6mm;right:6mm;top:60.4mm;bottom:5.6mm;display:flex;align-items:center;justify-content:center;text-align:center;font-size:9.2pt;line-height:1.24;font-style:italic;color:#4a3426}
.bTxt{position:absolute;left:6mm;right:6mm;top:72.8mm;bottom:5mm;text-align:center;font-size:10.4pt;line-height:1.16;font-weight:800;color:${C.wine}}
.qList{position:absolute;left:6.2mm;right:6.2mm;top:15mm;bottom:5.6mm;font-size:9pt;line-height:1.27;color:${INK}}
.qList p{margin:0 0 2.2mm}
.qList b{color:${C.wine}}
.qList.small2{top:28.4mm;font-size:8.9pt;line-height:1.26}
.qList.small2 p{margin:0 0 2mm}
.acts{position:absolute;left:5.6mm;right:5.4mm;top:15.4mm;bottom:17.6mm;display:flex;flex-direction:column;justify-content:space-between}
.act{display:flex;gap:2.2mm;align-items:flex-start;font-size:9pt;line-height:1.22;color:${INK}}
.act .l{flex:none;width:6.2mm;height:6.2mm;border-radius:50%;background:${C.wine};color:${GOLD_L};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:10pt;margin-top:.3mm}
.act b{color:${C.wine};font-size:10pt;display:block;margin-bottom:.3mm}
.hNote{position:absolute;left:6mm;right:6mm;bottom:5.2mm;line-height:1.25;text-align:center;font-size:8.6pt;font-style:italic;color:#6b5440;border-top:.25mm solid ${C.gold};padding-top:1.2mm}
table.hPts{position:absolute;left:5.6mm;right:5.6mm;top:14.4mm;width:51.8mm;border-collapse:collapse;font-size:8.6pt;table-layout:fixed}
table.hPts th,table.hPts td{border:.2mm solid ${C.line};text-align:center;padding:.6mm 0;line-height:1.15}
table.hPts th{width:11mm;background:${C.parch};color:${C.wine};font-size:8pt}
table.hPts b{color:${C.wine};font-size:9.6pt}
.pcCap{font-size:9pt;color:${C.brown};font-weight:700;white-space:nowrap}
.pcCap.c{text-align:center;font-weight:400}
.pcNote{font-size:9pt;line-height:1.3;color:${C.muted}}
.pcNote b{color:${C.brown}}
.tile{position:absolute;width:195mm;height:280mm;overflow:hidden}
.tileLoc{position:absolute;right:7.5mm;top:1.2mm}
.tileNext{position:absolute;font-size:8pt;color:#8a7a68;white-space:nowrap}
.tileNext.r{right:-1.6mm;top:148.5mm;transform:rotate(90deg);transform-origin:center}
.tileNext.b{left:0;right:0;bottom:2.4mm;text-align:center}
.rulesWrap{padding:6mm 12mm 0}
.rulesP .rules{font-size:11.2pt;line-height:1.42}
.rhead{display:flex;align-items:baseline;gap:5mm;border-bottom:.3mm solid ${C.gold};padding-bottom:1.5mm;margin-bottom:3mm}
.rtitle{font-size:20pt;color:${C.wine};white-space:nowrap}
.rsub{font-size:10.5pt;color:${C.muted}}
.lead{font-size:10.6pt;line-height:1.4;margin:0 0 3mm}
.wins3{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin:0 0 3.4mm}
.wins3>div{display:grid;grid-template-columns:12mm 1fr;column-gap:2.4mm;align-items:center;background:${C.paper};border:.3mm solid ${C.gold};border-radius:2mm;padding:2mm 2.6mm}
.wins3 svg{grid-row:1/3}
.wins3 b{color:${C.wine};font-size:10.4pt;line-height:1.2}
.wins3 span{font-size:9pt;line-height:1.25;color:${C.muted}}
.figBox{break-inside:avoid;background:${C.paper};border:.3mm solid ${C.gold};border-radius:2mm;padding:2.4mm 3mm;margin:0 0 3mm}
.rules .figBox h3{margin:0 0 1.4mm}
.rules .figCap{font-size:9.2pt;line-height:1.3;margin:1.6mm 0 0;color:#5a4330}
table.sx{font-size:9.6pt}
table.sx td,table.sx th{padding:.5mm 1.6mm}
table.sx td:nth-child(2){text-align:right;white-space:nowrap;width:12mm}
table.sx tr.sum td{font-weight:800;color:${C.wine}}
.rules .faq{font-size:9.8pt;line-height:1.32;margin:0 0 1.8mm}
.faq b{color:${C.wine};display:block}
.two4{display:grid;grid-template-columns:1fr 1fr;gap:8mm;font-size:10.5pt;line-height:1.38}
.two4 h3{margin:0 0 1.5mm;color:${C.wine};font-size:11.5pt}
.two4 h3:not(:first-child){margin-top:3.4mm}
.tl p{display:flex;gap:3mm;margin:0 0 1.4mm;font-size:10pt;line-height:1.3}
.tl b{flex:none;width:22mm;color:${C.wine};text-align:right;white-space:nowrap}
.gl p{margin:0 0 1mm;font-size:10pt;line-height:1.3}
.gl b{color:${C.wine}}
.p9{margin:0;font-size:10.2pt;line-height:1.4}
.credits{margin-top:4mm;font-size:9.2pt;line-height:1.35}
.goods8{display:grid;grid-template-columns:1fr 1fr;gap:2mm 3mm}
.goods8>div{display:flex;gap:2mm;align-items:center;font-size:8.8pt;line-height:1.2}
.goods8 svg{flex:none;display:block}
.goods8 b{color:${C.wine}}
.gloss{column-count:3;column-gap:6mm;font-size:10.2pt;line-height:1.32}
.gloss p{margin:0 0 2.3mm;break-inside:avoid}
.gloss b{color:${C.wine}}
.gloss i{color:${C.muted}}
.cover{padding:8mm 14mm 0}
.cover .title{font-size:24pt;color:${C.goldDark};letter-spacing:.08em}
.cover .lead{font-size:11.6pt;margin:2mm 0 5mm;line-height:1.4}
.cover .two{display:grid;grid-template-columns:1fr 1fr;gap:7mm;font-size:10pt}
.cover h3{margin:0 0 2mm;color:${C.wine};font-size:12pt}
.cover table.comp{font-size:8.9pt}
.cover table.comp td,.cover table.comp th{padding:.75mm 1.3mm}
table.comp td:nth-child(n+2),table.comp th:nth-child(n+2){white-space:nowrap}
table.comp td:first-child{white-space:nowrap}
table.comp .sw{display:inline-block;width:3.2mm;height:3.2mm;border-radius:.6mm;vertical-align:-.5mm;margin-right:1.4mm;border:.2mm solid #0003}
.cover .how{margin:0;padding-left:4.5mm;font-size:9.6pt;line-height:1.33}
.cover .how li{margin-bottom:1.5mm}
.cover .legal{font-size:9pt;margin:3mm 0 2mm}
.cover .asmT{margin-top:3mm}
.covCards{display:flex;justify-content:center;gap:4mm;margin:4mm 0 0}
.labelP .lbl{position:absolute;left:10mm;width:190mm;border:.25mm solid #777;overflow:hidden}
.labelP .lid{top:12mm;background:${C.night}}
.lidBar{display:flex;align-items:center;gap:6mm;padding:3mm 6mm;border-top:.8mm solid ${C.gold}}
.lidBar .lt{flex:none;text-align:center}
.lidBar .big{font-size:10pt;color:${C.gold};letter-spacing:.14em}
.lidBar .nm{font-weight:800;font-size:28pt;line-height:1.05;color:${GOLD_L}}
.lidBar .rt{border-left:.3mm solid ${C.gold};padding-left:6mm;color:#efe2c4}
.lidBar .sub{font-size:12pt;font-weight:700}
.lidBar .meta{font-size:10.5pt;margin-top:1mm}
.lidBar .ser{font-size:9pt;color:${C.gold};margin-top:1.4mm;letter-spacing:.04em}
.labelP .list{top:150mm;height:44mm;background:${C.paper};padding:4mm 7mm}
.labelP .list h3{margin:0 0 2.4mm;color:${C.wine};font-size:13pt}
.labelP .list .items{display:grid;grid-template-columns:1fr 1fr 1fr;gap:2mm 4mm;font-size:10.5pt}
.labelP .side{height:22mm;background:${C.night};color:#fbf3dc;display:flex;align-items:center;justify-content:space-around;font-size:11pt}
.labelP .side .aso{color:${GOLD_L};letter-spacing:.1em}
.labelP .side b{font-size:16pt}
.labelP .s0{top:204mm}.labelP .s1{top:234mm}
.lblNote{position:absolute;left:10mm;right:10mm;top:264mm;font-size:9pt;color:${C.muted};text-align:center}
`;
// ---------- the sheets, in printing order ----------
const CARAVAN = [...Object.keys(GOODS).flatMap(k => Array(12).fill(goodCard(k))), ...Array(14).fill(locoCard())];
const LETTERS = [...TICKETS.map(t => ticketCard(t)), ...LONG.map(t => ticketCard(t, true))];
const LETTER_BACKS = [...TICKETS.map(() => ticketBack(false)), ...LONG.map(() => ticketBack(true))];
const nine = (list, i) => list.slice(i * 9, i * 9 + 9);
const SHEETS = [
  { key: 'cover', back: glossaryPage },
  { key: 'rules1', front: rulesPage1, back: rulesPage2 },
  { key: 'rules2', front: rulesPage3, back: rulesPage4 },
  ...Array.from({ length: 12 }, (_, i) => ({
    key: `car${i + 1}`, front: cardSheet(nine(CARAVAN, i), { label: `ქარავნის ბარათები ${i + 1}/12` }),
    back: cardSheet(Array(9).fill(caravanBack), { back: true, label: `ქარავნის ბარათები ${i + 1}/12 — ზურგი` }),
  })),
  ...Array.from({ length: 5 }, (_, i) => ({
    key: `tix${i + 1}`, front: cardSheet(nine(LETTERS, i), { label: `წერილები ${i + 1}/5` }),
    back: cardSheet(nine(LETTER_BACKS, i), { back: true, label: `წერილები ${i + 1}/5 — ზურგი` }),
  })),
  {
    key: 'mix', front: cardSheet([...CARAVAN.slice(108), LETTERS[45], bonusCard(), ...Array(5).fill(helpCard)], { label: 'ორთქლმავალი, წერილი, „დიდი ქარავანი“, დამხმარე ბარათები' }),
    back: cardSheet([caravanBack, caravanBack, ticketBack(true), bonusBack, ...Array(5).fill(helpBack)], { back: true, label: 'ორთქლმავალი, წერილი, „დიდი ქარავანი“, დამხმარე — მეორე მხარე' }),
  },
  { key: 'figs', front: figuresSheet(false), back: figuresSheet(true) },
  ...Array.from({ length: 8 }, (_, i) => ({ key: `map${i + 1}`, front: tilePage(i + 1) })),
  { key: 'label', front: labelPage },
];
if (CARAVAN.length !== 110 || LETTERS.length !== 46) throw new Error('qaravani: 110 caravan cards and 46 letters');
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
