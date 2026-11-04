// „ქარავანი“ (series №3): the printable kit of the school's own caravan-road game on a map of Georgia at the end of the XIX century —
// the Poti–Tiflis railway is new (1872), carts and caravans still cross the passes. Three dice open roads (a road's cells = some dice's
// sum; a mountain road wants a pair, a water road a six; an abazi moves a die by one), a turn without a road is a trade, caravanserais
// stand in one's caravan's cities; at the end every city goes to the house with most roads into it, the kinds of cargo one's caravan
// reaches count, and so do the caravanserais. The numbers are the app's (src/utils/qaravani.ts). 47 cities (six beyond today's border,
// shown as culture, not politics), 74 roads. The board is 78×56 cm from eight A4 pieces; the cities are placed by hand for the roads,
// and the app's region outlines (src/data/georgiaMapShapes.ts), coast, rivers and ridges are bent onto them by a thin-plate spline.
import { GEORGIA_MAP_SHAPES } from '../../data/georgiaMapShapes';
import { C, SERIES, SCHOOL, aso, esc, cardSheet, placedSheet, page, stripe, foot, duplex, sheetNo } from '../lib.js';
import * as __d0 from '../../utils/qaravani';

// the rules' numbers are the app's (src/utils/qaravani.ts)
const Q = ({ ...__d0 });

export const id = 'qaravani';
export const title = 'ქარავანი';
const NO = 3;
const META = '2–5 მოთამაშე · 8 წლიდან · 30–45 წუთი';

const f = n => +n.toFixed(2);
const P2 = p => `${f(p[0])},${f(p[1])}`;
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
/** A repeatable pseudo-random number in [0, 1) for decorations (mountains, waves). */
const rnd = (() => { let s = 20261028; return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648); })();

// ---------- the map's cities ----------
// key, name, lat, lon, kind (c town, s an old shrine or monastery, p port — not drawn: a city's circle shows its worth), x and y on the board in mm
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
/** A city's worth (printed in its circle; the house with most roads into it takes it at the end): 2 unless named here —
 * the capital 5, Kutaisi 4, the ports and the big towns 3, the small places 1. The app's rules read it (src/data/qaravaniRoutes.ts). */
const WORTH = {
  tbilisi: 5, kutaisi: 4, sokhumi: 3, poti: 3, batumi: 3, trabzon: 3, akhaltsikhe: 3, gori: 3, telavi: 3,
  bichvinta: 1, gelati: 1, vardzia: 1, manglisi: 1, bolnisi: 1, ananuri: 1, stepantsminda: 1, alaverdi: 1, garedja: 1, oshki: 1,
};
const worthOf = k => WORTH[k] ?? 2;
/** The cargo a city gives (its kind's colour and picture beside its circle): two places for each of the eight goods but the blue
 * tablecloth, Tbilisi's own. At the end every kind one's caravan reaches counts. */
const CARGO = {
  telavi: 'red', kvareli: 'red', gurjaani: 'red', ambrolauri: 'yellow', mestia: 'yellow', kobuleti: 'green', ozurgeti: 'green',
  tbilisi: 'blue', shatili: 'black', omalo: 'black', zugdidi: 'white', senaki: 'white', bolnisi: 'orange', dmanisi: 'orange',
  ganja: 'pink', zakatala: 'pink',
};

// ---------- the roads ----------
// [from, to, cells, extra] — extra: { d: 1 } a double road (two tracks), { m: pass } a mountain road (the dice want a pair),
// { s: ships } a sea or river road (the dice want a six), { bend: ±1 } which side a curved road bulges to.
const ROUTE_ROWS = [
  ['bichvinta', 'sokhumi', 2, { s: 1, bend: -7 }], ['bichvinta', 'poti', 8, { s: 2, bend: -24 }], ['batumi', 'trabzon', 6, { s: 2, bend: -9 }],
  ['poti', 'samtredia', 2, { s: 1, river: 'რიონი' }], ['sokhumi', 'zugdidi', 4],
  ['zugdidi', 'poti', 3, { bend: -1 }], ['zugdidi', 'senaki', 1], ['zugdidi', 'mestia', 5],
  ['poti', 'senaki', 1, { d: 1 }], ['poti', 'kobuleti', 2], ['batumi', 'kobuleti', 1],
  ['kobuleti', 'ozurgeti', 1], ['ozurgeti', 'samtredia', 2], ['batumi', 'akhaltsikhe', 6, { m: 'გოდერძი' }],
  ['batumi', 'oshki', 6, { bend: -1 }], ['senaki', 'samtredia', 1, { d: 1 }],
  ['samtredia', 'kutaisi', 1, { d: 1 }], ['kutaisi', 'gelati', 1],
  ['kutaisi', 'zestaponi', 1, { d: 1 }], ['kutaisi', 'tsageri', 2],
  ['kutaisi', 'akhaltsikhe', 5, { m: 'ზეკარი' }], ['gelati', 'ambrolauri', 2], ['gelati', 'chiatura', 1],
  ['zestaponi', 'chiatura', 1], ['zestaponi', 'khashuri', 2, { m: 'რიკოთი' }], ['chiatura', 'oni', 3],
  ['tsageri', 'ambrolauri', 2], ['ambrolauri', 'oni', 2], ['tsageri', 'mestia', 2, { m: 'ზაგარი' }],
  ['oni', 'vladikavkaz', 4, { m: 'მამისონი' }], ['oni', 'tskhinvali', 3], ['khashuri', 'borjomi', 1],
  ['borjomi', 'akhaltsikhe', 2, { bend: 1 }], ['borjomi', 'akhalkalaki', 2, { m: 'ცხრაწყარო' }],
  ['akhaltsikhe', 'vardzia', 2], ['vardzia', 'akhalkalaki', 2], ['akhalkalaki', 'kars', 6],
  ['oshki', 'kars', 6], ['trabzon', 'oshki', 5, { m: 'ზიგანა' }], ['akhalkalaki', 'manglisi', 2],
  ['dmanisi', 'kars', 7], ['akhaltsikhe', 'kars', 6], ['khashuri', 'gori', 1, { d: 1 }],
  ['gori', 'tskhinvali', 1], ['gori', 'mtskheta', 2, { d: 1 }], ['gori', 'manglisi', 2],
  ['tskhinvali', 'ananuri', 3], ['mtskheta', 'tbilisi', 1, { d: 1 }], ['mtskheta', 'ananuri', 2],
  ['ananuri', 'stepantsminda', 3, { m: 'ჯვარი' }], ['stepantsminda', 'vladikavkaz', 2, { m: 'დარიალი' }],
  ['ananuri', 'shatili', 3, { m: 'დათვისჯვარი' }], ['shatili', 'omalo', 2, { m: 'ატსუნტა' }],
  ['ananuri', 'alaverdi', 2], ['tbilisi', 'manglisi', 2], ['tbilisi', 'bolnisi', 2],
  ['manglisi', 'dmanisi', 2], ['bolnisi', 'dmanisi', 1], ['tbilisi', 'garedja', 3],
  ['tbilisi', 'sagarejo', 1, { d: 1 }], ['tbilisi', 'telavi', 3, { m: 'გომბორი' }],
  ['sagarejo', 'gurjaani', 2], ['sagarejo', 'garedja', 2], ['telavi', 'alaverdi', 1],
  ['telavi', 'gurjaani', 1], ['telavi', 'kvareli', 2], ['telavi', 'omalo', 3, { m: 'აბანო' }],
  ['gurjaani', 'sighnaghi', 1], ['kvareli', 'lagodekhi', 2], ['sighnaghi', 'lagodekhi', 2],
  ['sighnaghi', 'garedja', 3], ['lagodekhi', 'zakatala', 1], ['zakatala', 'ganja', 6],
  ['garedja', 'ganja', 6],
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

// ---------- the board ----------
const BW = 780, BH = 560, BAND = 22;
const CELL = { l: 20, w: 9, gap: 1.5, end: 10.5, minEnd: 8.6 };
const DOUBLE_OFF = CELL.w / 2 + 1.9; // the rail runs in the 3.8 mm between the tracks
const CITY_R = 6.3;

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
const ROUTES = ROUTE_ROWS.map(([from, to, n, extra = {}], i) => ({
  i, key: `${from}-${to}`, from, to, n, double: !!extra.d, pass: extra.m ?? null, ships: extra.s ?? 0,
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
/** Both tracks of a road (one for a single road): { cells: [{ p, ang }] }. */
const tracks = r => {
  const a = CITIES[r.from].p, b = CITIES[r.to].p;
  if (!r.double) return [{ cells: trackCells(curve(a, b, r.bend), r.n), cv: curve(a, b, r.bend) }];
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = dy / L * DOUBLE_OFF, ny = -dx / L * DOUBLE_OFF;
  return [1, -1].map(s => {
    const cv = curve([a[0] + nx * s, a[1] + ny * s], [b[0] + nx * s, b[1] + ny * s], r.bend);
    return { cells: trackCells(cv, r.n), cv };
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

const SHAPES = Object.fromEntries(Object.entries(GEORGIA_MAP_SHAPES).map(([k, v]) => [k, {
  label: v.label,
  polys: v.d.split('M').filter(Boolean).map(s => s.replace(/Z/g, '').split('L').map(p => p.split(',').map(Number))),
}]));

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

// ---------- the cargo marks: a disc of the good's colour leaning on its city's circle, where the fewest things are ----------
const BADGE_R = 3.7;
const CARGO_AT = (() => {
  const out = {};
  for (const [key, good] of Object.entries(CARGO)) {
    const c = CITIES[key], R = CITY_R + BADGE_R - 1.4;
    const tries = Array.from({ length: 16 }, (_, k) => {
      const a = -Math.PI / 4 + k * Math.PI / 8, at = [c.p[0] + Math.cos(a) * R, c.p[1] + Math.sin(a) * R];
      // its own circle does not count; up and to the right is liked best
      const own = OBST.findIndex(o => o.circle && o.circle === c.p);
      const saved = OBST.splice(own, 1);
      const score = covered(at, BADGE_R * 2, BADGE_R * 2, 0, 6, 6) * 60 + (k ? 0.2 + Math.abs(Math.sin(a / 2 + Math.PI / 8)) * 0.4 : 0) + (inInner(at, BADGE_R * 2, BADGE_R * 2) ? 0 : 100);
      OBST.splice(own, 0, ...saved);
      return { at, score };
    }).sort((x, y) => x.score - y.score);
    out[key] = { good, at: tries[0].at };
    blockCircle(tries[0].at, BADGE_R + 0.5);
  }
  return out;
})();

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

const SNOW_PEAK = `<path d="M-3.5 2.4L-.9 -2.2L.3 -.7L1.2 -1.7L3.5 2.4Z" fill="#fff" stroke="${INK}" stroke-width=".42" stroke-linejoin="round"/>`;
/** A small steamship (±4 mm): hull, deck house, funnel with smoke. */
const steamship = (color = INK, smoke = true) => `<path d="M-3.9 .4H3.9L2.9 2.5H-2.6Z" fill="${color}"/><rect x="-2.2" y="-1.1" width="3.6" height="1.5" fill="${color}"/>
<path d="M.3 -1.1V-3.1H1.4V-1.1Z" fill="${color}"/>${smoke ? `<circle cx="1.6" cy="-3.9" r=".65" fill="${color}" opacity=".55"/><circle cx="2.7" cy="-4.4" r=".8" fill="${color}" opacity=".4"/>` : ''}
<path d="M-3.4 3.3Q-2.6 2.8 -1.8 3.3T-.2 3.3T1.4 3.3T3 3.3" fill="none" stroke="${color}" stroke-width=".35"/>`;
const SHIP_MARK = `<circle r="3.7" fill="#fff" stroke="${INK}" stroke-width=".4"/><g transform="scale(.78) translate(0 -.2)">${steamship()}</g>`;
/** One cell: a light stone road with cart ruts; a mountain road's edges dashed and a snowy peak on it, a ship at sea. */
const ROAD = { color: '#e9dfca', dark: '#8a7558' };
const cellSvg = (c, { mountain = false, ship = false } = {}) => `<g transform="translate(${P2(c.p)})"><g transform="rotate(${deg(upright(c.ang))})">${mountain ? `<path d="M-10 -5.8H10M-10 5.8H10" stroke="${INK}" stroke-width=".8" stroke-dasharray="1.6 1"/>` : ''}
<rect x="-10" y="-4.5" width="20" height="9" rx="1.4" fill="${ROAD.color}" stroke="${ROAD.dark}" stroke-width=".45"/><path d="M-8.4 -2.15H8.4M-8.4 2.15H8.4" stroke="${ROAD.dark}" stroke-opacity=".55" stroke-width=".45" stroke-dasharray="2.4 .9"/></g>${mountain ? SNOW_PEAK : ''}${ship ? SHIP_MARK : ''}</g>`;
/** A city's circle with its worth (the bigger ones golden), ±CITY_R. */
const WORTH_FILL = ['', '#fbf6ec', '#fbf6ec', '#f6e8c4', '#efd896', '#e8c66a'];
const cityMark = (w, r = CITY_R) => `<circle r="${r}" fill="${WORTH_FILL[w]}" stroke="${C.wine}" stroke-width="${f(0.9 * r / CITY_R)}"/><circle r="${f(r - 1.15 * r / CITY_R)}" fill="none" stroke="${C.gold}" stroke-width="${f(0.35 * r / CITY_R)}"/>
<text x="0" y="${f(r * 0.05)}" font-family="SerifKa" font-weight="900" font-size="${f(r * 1.25)}" text-anchor="middle" dominant-baseline="central" fill="${C.wine}">${w}</text>`;
/** A good's mark: a disc of its colour with its picture, ±r. */
const goodBadge = (k, r = BADGE_R) => {
  const g = GOODS[k], white = k === 'white';
  return `<circle r="${r}" fill="${g.color}" stroke="${white ? g.dark : mix(g.dark, '#000000', 0.15)}" stroke-width="${f(r * 0.1)}"/><g transform="translate(${f(-r * 0.78)} ${f(-r * 0.78)}) scale(${f(r * 0.0156)})">${GOOD_ART[k](C.paper, white ? g.dark : mix(g.dark, '#000000', 0.2), g.color)}</g>`;
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
/** An eight-rayed sun in a ring, the folk ornament (no church sign anywhere: the user's rule, 2026-11-01), ±s/2. */
const sunMark = (cx, cy, s, color = C.gold) => `<g transform="translate(${f(cx - s / 2)} ${f(cy - s / 2)}) scale(${f(s / 100)})" fill="${color}" stroke="${color}" stroke-width="1.2" stroke-linejoin="round">
<circle cx="50" cy="50" r="47" fill="none" stroke-width="2.4"/>${Array.from({ length: 8 }, (_, i) => `<path d="M50 9L56 32H44Z" transform="rotate(${i * 45} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="15"/></g>`;
/** A caravanserai (ქარვასლა): a low house with a big arched gate, ±s/2. */
const innGlyph = (cx, cy, s, color) => `<g transform="translate(${f(cx)} ${f(cy)}) scale(${f(s / 10)})"><path d="M-5 4.6V-1.2L0 -4.8L5 -1.2V4.6Z" fill="${color}"/><path d="M-2.2 4.6V1.2A2.2 2.2 0 0 1 2.2 1.2V4.6Z" fill="${C.wine}"/><rect x="-4.1" y="-.6" width="1.3" height="1.5" fill="${C.wine}"/><rect x="2.8" y="-.6" width="1.3" height="1.5" fill="${C.wine}"/></g>`;
const compass = (cx, cy, r) => {
  const pt = (a, len, wd, fill) => `<path d="M0 0L${f(Math.cos(a - wd) * len * 0.32)} ${f(Math.sin(a - wd) * len * 0.32)}L${f(Math.cos(a) * len)} ${f(Math.sin(a) * len)}L${f(Math.cos(a + wd) * len * 0.32)} ${f(Math.sin(a + wd) * len * 0.32)}Z" fill="${fill}" stroke="${INK}" stroke-width=".25"/>`;
  const pts = [0, 1, 2, 3].map(k => pt(-Math.PI / 2 + k * Math.PI / 2, r, 0.42, k === 0 ? C.wine : '#efe1c2')).join('')
    + [0, 1, 2, 3].map(k => pt(-Math.PI / 4 + k * Math.PI / 2, r * 0.62, 0.5, '#d9c49a')).join('');
  return `<g transform="translate(${f(cx)} ${f(cy)})"><circle r="${f(r * 0.72)}" fill="none" stroke="${INK}" stroke-width=".3"/>${pts}<circle r="1" fill="${INK}"/>
${textSvg('ჩ', [0, -r - 3.2], { size: 4.2, fill: C.wine, halo: null })}</g>`;
};
const panel = ([x0, y0, x1, y1], inner, { suns = false } = {}) => `<g><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="3" fill="${ONPAPER}" stroke="${C.wine}" stroke-width="1"/>
<rect x="${x0 + 1.8}" y="${y0 + 1.8}" width="${x1 - x0 - 3.6}" height="${y1 - y0 - 3.6}" rx="1.8" fill="none" stroke="${C.gold}" stroke-width=".45"/>
${suns ? [[x0 + 6.5, y0 + 6.5], [x1 - 6.5, y0 + 6.5], [x1 - 6.5, y1 - 6.5], [x0 + 6.5, y1 - 6.5]].map(([x, y]) => sunMark(x, y, 7)).join('') : ''}${inner}</g>`;
const titleSvg = () => {
  const [x0, y0, x1] = ZONES.title, cx = (x0 + x1) / 2;
  return panel(ZONES.title, `${cartSvg(cx, y0 + 25, 44, { color: C.brown, load: `<path d="M40 27C40 15 46 9 58 9H76C88 9 92 15 92 27Z" fill="${C.wine}"/><path d="M52 9.5V27M66 9V27M80 10V27" stroke="#f0d9a0" stroke-width="1.4"/>` })}
${textSvg(aso('ქარავანი'), [cx, y0 + 52], { size: 11.5, fill: C.wine, weight: 900, halo: null, spacing: 0.5 })}
${textSvg('ქარავანი', [cx, y0 + 64], { size: 6.4, fill: INK, weight: 800, family: 'SerifKa', halo: null })}
${textSvg('საქართველოს გზები', [cx, y0 + 73], { size: 4.4, fill: INK, weight: 700, family: 'SerifKa', halo: null })}
${textSvg('XIX საუკუნის მიწურული', [cx, y0 + 80], { size: 3.6, fill: '#6b5440', weight: 400, family: 'SerifKa', italic: true, halo: null })}
<path d="M${x0 + 14} ${y0 + 85.5}H${x1 - 14}" stroke="${C.gold}" stroke-width=".4"/>
${textSvg(`${SERIES} · №${NO}`, [cx, y0 + 91], { size: 3.5, fill: C.wine, weight: 700, halo: null })}`, { suns: true });
};
const legendSvg = () => {
  const [x0, y0, x1, y1] = ZONES.legend, ix = x0 + 17, tx = x0 + 31, mid = (x0 + x1) / 2;
  const line = (s, y, o = {}) => textSvg(s, [tx, y], { size: 3.8, anchor: 'start', weight: 400, family: 'SerifKa', halo: null, ...o });
  const row = (y, icon, l1, l2) => `${icon(ix, y)}${line(l1, l2 ? y - 2.3 : y, { weight: 700 })}${l2 ? line(l2, y + 2.4) : ''}`;
  const cell = (o = {}) => (x, y) => cellSvg({ p: [x, y], ang: 0 }, o);
  const dbl = (x, y) => `${cellSvg({ p: [x, y - 6.1], ang: 0 })}${cellSvg({ p: [x, y + 6.1], ang: 0 })}${railSvg({ from: 'a', to: 'b', _a: [x - 10, y], _b: [x + 10, y] })}`;
  const worth = (x, y) => [1, 3, 5].map((w, i) => `<g transform="translate(${f(x - 8 + i * 8)} ${f(y)}) scale(.56)">${cityMark(w)}</g>`).join('');
  const inn = (x, y) => `<circle cx="${x}" cy="${y}" r="5.6" fill="${C.wine}" stroke="#4a0f15" stroke-width=".4"/>${innGlyph(x, y + 0.2, 7, '#f0d9a0')}`;
  const goods = Object.keys(GOODS).map((k, i) => {
    const gx = x0 + 15 + (i % 4) * 24.5, gy = y0 + 141 + Math.floor(i / 4) * 13;
    return `<g transform="translate(${f(gx)} ${f(gy)})">${goodBadge(k, 3.4)}</g>${textSvg(GOODS[k].name, [gx, gy + 5.6], { size: 2.9, weight: 700, family: 'SerifKa', halo: null })}`;
  }).join('');
  return panel(ZONES.legend, `${textSvg('რუკის ნიშნები', [mid, y0 + 9], { size: 5, fill: C.wine, weight: 900, halo: null })}
${row(y0 + 22, cell(), 'გზა', 'უჯრები = კამათლების ჯამი')}
${row(y0 + 37, cell({ mountain: true }), 'მთის გზა', 'კამათლებში — წყვილიც')}
${row(y0 + 52, cell({ ship: true }), 'ზღვის, მდინარის გზა', 'კამათლებში — 6-იანიც')}
${row(y0 + 70, dbl, 'ორმაგი გზა', `${Q.MIN_Q}–3 მოთამაშით — ერთი`)}
${textSvg('ორმაგს შორის — რკინიგზა (1872)', [mid, y0 + 83], { size: 3.3, weight: 400, family: 'SerifKa', italic: true, fill: '#6b5440', halo: null })}
${row(y0 + 96, worth, 'ქალაქის ფასი', 'მისია, ვისაც მეტი გზა შედის')}
${row(y0 + 112, inn, 'ქარვასლა', `ქალაქში ${Q.INN_WEIGHT} გზად ითვლება`)}
${textSvg('რვა ტვირთი', [mid, y0 + 129], { size: 4.2, fill: C.wine, weight: 900, halo: null })}
${goods}
${compass(mid, y1 - 14, 9)}`);
};
const scoreSvg = () => {
  const [x0, y0, x1] = ZONES.score, cw = 17, lx = x0 + 6, cx0 = x0 + 34;
  const pts = Q.CARGO_PTS.slice(1);
  const cells = pts.map((v, i) => `${textSvg(String(i + 1), [cx0 + i * cw + cw / 2, y0 + 42], { size: 4.6, halo: null })}
${textSvg(String(v), [cx0 + i * cw + cw / 2, y0 + 52], { size: 5.2, fill: C.wine, weight: 900, halo: null })}`).join('');
  const grid = `<path d="M${cx0} ${y0 + 37}H${cx0 + pts.length * cw}M${cx0} ${y0 + 47}H${cx0 + pts.length * cw}M${cx0} ${y0 + 57}H${cx0 + pts.length * cw}${Array.from({ length: pts.length + 1 }, (_, i) => `M${cx0 + i * cw} ${y0 + 37}V${y0 + 57}`).join('')}" stroke="${C.line}" stroke-width=".35"/>`;
  const line = (s, y, o = {}) => textSvg(s, [lx, y], { size: 3.7, anchor: 'start', weight: 400, family: 'SerifKa', halo: null, ...o });
  const rounds = [2, 3, 4, 5].map(n => `${n}${n === 2 ? ' მოთამაშით' : '-ით'} — ${Q.roundsFor(n)}`).join(', ');
  return panel(ZONES.score, `${textSvg('ქულები ბოლოს', [(x0 + x1) / 2, y0 + 9], { size: 5, fill: C.wine, weight: 900, halo: null })}
${line('ქალაქი: მისი ფასი — ვისაც მეტი გზა შედის (ქარვასლა = 2 გზა);', y0 + 18, { weight: 700 })}
${line('თანაბრად — ფასი იყოფა, ნაშთი იკარგება.', y0 + 24)}
${line('ტვირთი — რამდენ სახეს აღწევს შენი ქარავანი:', y0 + 31, { weight: 700 })}
${grid}${textSvg('სახე', [lx, y0 + 42], { size: 3.7, anchor: 'start', weight: 700, family: 'SerifKa', halo: null })}${textSvg('ქულა', [lx, y0 + 52], { size: 3.7, anchor: 'start', weight: 700, family: 'SerifKa', halo: null })}${cells}
${line(`ყოველი ქარვასლა — ${Q.INN_PTS} ქულა.`, y0 + 64, { weight: 700 })}
${line(`მოგზაურობები: ${rounds}`, y0 + 72)}
${line('თანაბარ ქულებზე იგებს, ვისაც მეტი ქალაქი აქვს, მერე — მეტი აბაზი.', y0 + 79)}`);
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
    const items = [{ layer: 'land', svg: `<rect width="${BW}" height="${BH}" fill="${LAND}"/>` }];
    for (const [k, r] of Object.entries(SHAPES)) {
      const polys = r.polys.map(poly => poly.map(bendU));
      items.push({ layer: 'bg', bb: grow(bboxOf(polys.flat()), 1), svg: `<path d="${polys.map(poly => `M${poly.map(P2).join('L')}Z`).join('')}" fill="${REGION_COLOR[k]}" fill-opacity=".36" stroke="#9c7b5c" stroke-opacity=".55" stroke-width=".3" stroke-dasharray="1.2 .8"/>` });
    }
    const seaD = `M${SEA.poly.map(P2).join('L')}Z`, coastD = `M${SEA.coast.map(P2).join('L')}`;
    const water = [7.2, 4.8, 2.4].map(d => `<path d="${coastD}" fill="none" stroke="${SEA_LINE}" stroke-opacity=".5" stroke-width="${2 * d}" stroke-linejoin="round"/><path d="${coastD}" fill="none" stroke="${SEA_C}" stroke-width="${2 * d - 0.45}" stroke-linejoin="round"/>`).join('');
    items.push({ layer: 'bg', bb: grow(bboxOf(SEA.poly), 8), svg: `<defs><clipPath id="seaClip"><path d="${seaD}"/></clipPath></defs><path d="${seaD}" fill="${SEA_C}"/><g clip-path="url(#seaClip)">${water}</g>
<path d="${coastD}" fill="none" stroke="${SEA_LINE}" stroke-width=".75" stroke-linejoin="round"/>` });
    const ring = OUTLINE.ring.map(bendU);
    items.push({ layer: 'bg', bb: grow(bboxOf(ring), 1), svg: `<path d="M${ring.map(P2).join('L')}Z" fill="none" stroke="${C.wine}" stroke-opacity=".55" stroke-width=".6" stroke-dasharray="3 1.4 .8 1.4"/>` });
    for (const r of RIVERS) items.push({ layer: 'river', line: r.line, bb: grow(bboxOf(r.line), 1.5), svg: `<path d="${smooth(r.line)}" fill="none" stroke="${RIVER_C}" stroke-width=".95" stroke-linecap="round" stroke-linejoin="round"/>` });
    for (const n of RIVER_NAMES) items.push({ layer: 'bg', bb: around(n.at, textW(n.name, RIVER_NAME) / 2 + 2), svg: textSvg(n.name, n.at, { size: RIVER_NAME, ang: n.ang, fill: '#3f7896', weight: 400, family: 'SerifKa', italic: true, halo: null }) });
    for (const p of PEAKS) items.push({ layer: 'peak', peak: p, bb: around(p.at, p.w / 2 + 1, p.h / 2 + 1), svg: peakSvg(p) });
    for (const r of REGION_LABELS) items.push({ layer: 'bg', bb: around(r.at, textW(r.name, REGION) / 2 + r.name.length * SPACING / 2 + 3, REGION), svg: textSvg(r.name, r.at, { size: REGION, fill: '#7a5a3a', weight: 700, family: 'SerifKa', spacing: SPACING, halo: null, opacity: 0.55 }) });
    items.push({ layer: 'bg', bb: around([64, 140], 48), svg: seaName() });
    for (const r of ROUTES.filter(r => RAILWAY.has(r.key))) items.push({ layer: 'bg', bb: grow(bboxOf([CITIES[r.from].p, CITIES[r.to].p]), 3), svg: railSvg(r) });
    for (const r of ROUTES) {
      const shipAt = r.ships === 1 ? [0] : r.ships === 2 ? [1, r.n - 2] : [];
      items.push({
        layer: 'cells',
        bb: grow(bboxOf(r.tracks.flatMap(t => t.cells.map(c => c.p))), 13),
        svg: r.tracks.map(t => t.cells.map((c, k) => cellSvg(c, { mountain: !!r.pass, ship: shipAt.includes(k) })).join('')).join(''),
      });
    }
    for (const p of PASSES) items.push({ layer: 'top', bb: around(p.at, textW(p.name, PASS) / 2 + 2), svg: textSvg(p.name, p.at, { size: PASS, ang: p.ang, fill: '#5e3f22', weight: 700, family: 'SerifKa', italic: true, haloW: 0.9 }) });
    for (const c of Object.values(CITIES)) items.push({ layer: 'city', bb: around(c.p, CITY_R + 1), svg: `<g transform="translate(${P2(c.p)})">${cityMark(worthOf(c.key))}</g>` });
    for (const [, b] of Object.entries(CARGO_AT)) items.push({ layer: 'city', bb: around(b.at, BADGE_R + 1), svg: `<g transform="translate(${P2(b.at)})">${goodBadge(b.good)}</g>` });
    for (const c of Object.values(CITIES)) {
      const L = LABELS[c.key], anchor = L.dir === 'e' || L.dir === 'ne' || L.dir === 'se' ? 'start' : L.dir === 'w' || L.dir === 'nw' || L.dir === 'sw' ? 'end' : 'middle';
      const x = anchor === 'start' ? L.at[0] - L.w / 2 : anchor === 'end' ? L.at[0] + L.w / 2 : L.at[0], top = L.at[1] - L.h / 2;
      items.push({
        layer: 'label',
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
/** The map for the app's „ქარავანი“ (`node scripts/build-qaravani-map.mjs` writes src/data/qaravaniRoutes.ts and
 * src/data/qaravaniMap.ts from it): the board's drawing without the score track, the title, the legend and the score table, in
 * two layers (under the roads and over them), the roads' cells and the cities as data so the app colours them by their owners.
 * The fonts become the app's own (Noto Sans / Serif Georgian, the same the kit prints with). */
export const appMap = () => {
  const items = boardItems();
  const font = svg => svg.replaceAll('font-family="SansKa"', 'font-family="Noto Sans Georgian, sans-serif"')
    .replaceAll('font-family="SerifKa"', 'font-family="Noto Serif Georgian, serif"');
  const pts = [...Object.values(CITIES).map(c => c.p), ...ROUTES.flatMap(r => r.tracks.flatMap(t => t.cells.map(c => c.p)))];
  const labelBoxes = Object.values(LABELS).flatMap(L => [[L.at[0] - L.w / 2, L.at[1] - L.h / 2], [L.at[0] + L.w / 2, L.at[1] + L.h / 2]]);
  const [x0, y0, x1, y1] = bboxOf([...pts, ...labelBoxes]);
  const m = 12, box = [Math.max(0, Math.floor(x0 - m)), Math.max(0, Math.floor(y0 - m))];
  box.push(Math.min(BW, Math.ceil(x1 + m)) - box[0], Math.min(BH, Math.ceil(y1 + m)) - box[1]);
  const layer = k => font(items.filter(it => it.layer === k).map(it => it.svg).join(''));
  // a phone needs fewer of a river's points than the print: thinned (Douglas–Peucker, 0.3 mm) before they are smoothed
  const thin = (pts, tol) => {
    const keep = pts.map((_, i) => i === 0 || i === pts.length - 1), stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [i, j] = stack.pop(), [a, b] = [pts[i], pts[j]], L = dist(a, b) || 1e-9;
      let best = -1, k = -1;
      for (let q = i + 1; q < j; q++) {
        const d = Math.abs((b[0] - a[0]) * (a[1] - pts[q][1]) - (a[0] - pts[q][0]) * (b[1] - a[1])) / L;
        if (d > best) { best = d; k = q; }
      }
      if (best > tol) { keep[k] = true; stack.push([i, k], [k, j]); }
    }
    return pts.filter((_, q) => keep[q]);
  };
  // the mountains in a dozen sizes, each drawn once and placed by <use> (the print gives every one its own size)
  const peakDefs = new Map();
  const peakUse = ({ at, w, h, snow }) => {
    const qw = 6.6 + Math.min(2, Math.round((w - 6.6) / 1.1)) * 1.1, base = snow ? 5.4 : 3.8, qh = base + Math.min(1, Math.round((h - base) / 1.2)) * 1.2;
    const k = `${f(qw)}-${f(qh)}-${snow ? 1 : 0}`;
    if (!peakDefs.has(k)) peakDefs.set(k, { id: `qp${peakDefs.size}`, svg: peakSvg({ at: [0, 0], w: qw, h: qh, snow }) });
    return `<use href="#${peakDefs.get(k).id}" x="${f(at[0])}" y="${f(at[1])}"/>`;
  };
  const bgItems = items.filter(it => ['land', 'bg', 'river', 'peak'].includes(it.layer)).map(it => (it.layer === 'river'
    ? `<path d="${smooth(thin(it.line, 0.3))}" fill="none" stroke="${RIVER_C}" stroke-width=".95" stroke-linecap="round" stroke-linejoin="round"/>`
    : it.layer === 'peak' ? peakUse(it.peak) : it.svg)).join('');
  const bg = `<defs>${[...peakDefs.values()].map(d => `<g id="${d.id}">${d.svg}</g>`).join('')}</defs>${bgItems}`;
  const keys = CITY_ROWS.map(c => c[0]), at = k => keys.indexOf(k), goodKeys = Object.keys(GOODS);
  return {
    box,
    bg: font(bg),
    top: layer('top'),
    ring: { r: CITY_R, wine: C.wine, gold: C.gold, paper: ONPAPER, fill: WORTH_FILL, badge: BADGE_R },
    /** each city's worth and cargo (0–7 the goods, −1 none), and where its cargo's disc stands from its centre (mm) */
    worth: keys.map(worthOf),
    cargo: keys.map(k => (CARGO[k] ? goodKeys.indexOf(CARGO[k]) : -1)),
    cargoAt: keys.map(k => { const b = CARGO_AT[k]; return b ? [f(b.at[0] - CITIES[k].p[0]), f(b.at[1] - CITIES[k].p[1])] : null; }),
    /** each city with its name's place as the print lays it: `dir` from the circle, and in mm the name's anchor point `lx, ly`
     *  (`anchor` start / middle / end, its central line) and the second line's `sy` (the app draws the names itself) */
    cities: CITY_ROWS.map(([key, name, , , , x, y]) => {
      const L = LABELS[key], anchor = /e/.test(L.dir) ? 'start' : /w/.test(L.dir) ? 'end' : 'middle';
      const top = L.at[1] - L.h / 2;
      return {
        key, name, x, y, outside: OUTSIDE.has(key), sub: SUB[key] ?? '', dir: L.dir, anchor,
        lx: f(anchor === 'start' ? L.at[0] - L.w / 2 : anchor === 'end' ? L.at[0] + L.w / 2 : L.at[0]),
        ly: f(top + NAME * 0.56), sy: f(top + NAME * 1.08 + SUBNAME * 0.6),
      };
    }),
    names: { size: NAME, sub: SUBNAME, ink: INK, paper: ONPAPER },
    routes: ROUTES.map(r => ({
      a: at(r.from), b: at(r.to), n: r.n, double: r.double ? 1 : 0, pass: r.pass ?? '', ships: r.ships,
      shipAt: r.ships === 1 ? [0] : r.ships === 2 ? [1, r.n - 2] : [],
      tracks: r.tracks.map(t => t.cells.map(c => [f(c.p[0]), f(c.p[1]), deg(upright(c.ang))])),
    })),
    goods: Object.entries(GOODS).map(([k, g]) => ({ k, name: g.name, color: g.color, dark: g.dark, from: g.from })),
    /** the goods' marks as the board prints them: each a disc of r 10 (its colour, its picture) */
    badges: Object.fromEntries(goodKeys.map(k => [k, goodBadge(k, 10)])),
    /** the players' colours and animals (a 100×80 box, filled with currentColor) and the inn (±5) */
    players: PLAYERS.map(p => ({ color: p.color, ink: p.ink, animal: p.animal, name: animalName(p.animal) })),
    animals: ANIMAL,
    inn: innGlyph(0, 0, 10, 'currentColor'),
    info: CITY_ROWS.map(([key]) => CITY_INFO[key] ?? ['', '']),
  };
};
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
<g fill="${p}">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path d="M50 50C47.2 43.5 47.2 37.5 50 32C52.8 37.5 52.8 43.5 50 50Z" transform="rotate(${a} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="5"/></g>
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

// ---------- cards (63×88 mm, drawn as one SVG each; wrapped text in HTML on top) ----------
const GOLD_L = '#f0d9a0';
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
/** `a` moved a share `t` of the way to `b`. */
const mix = (a, b, t) => `#${rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
const cardSvg = inner => `<svg class="cs" width="63mm" height="88mm" viewBox="0 0 63 88" font-family="SerifKa">${inner}</svg>`;
const frameSvg = (outer, inner = C.gold) => `<rect x="2.45" y="2.45" width="58.1" height="83.1" rx="2.6" fill="none" stroke="${outer}" stroke-width=".9"/>
<rect x="3.6" y="3.6" width="55.8" height="80.8" rx="1.8" fill="none" stroke="${inner}" stroke-width=".25"/>`;
const BAND_TOP = 'M2.45 11.8V5.05A2.6 2.6 0 0 1 5.05 2.45H57.95A2.6 2.6 0 0 1 60.55 5.05V11.8Z';
const bandTitle = (text, fill, ink) => `<path d="${BAND_TOP}" fill="${fill}"/>
<text x="31.5" y="8.55" text-anchor="middle" font-weight="700" font-size="3.6" fill="${ink}">${esc(text)}</text>
${(textW(text, 3.6) > 40 ? [] : [31.5 - textW(text, 3.6) / 2 - 4.2, 31.5 + textW(text, 3.6) / 2 + 4.2]).map(x => `<path d="M${f(x)} 5.6L${f(x + 1.3)} 7.3L${f(x)} 9L${f(x - 1.3)} 7.3Z" fill="${ink}" fill-opacity=".8"/>`).join('')}`;

// ---------- the houses: colours and animals ----------
const PLAYERS = [
  { name: 'ღვინისფერი', color: C.wine, ink: GOLD_L, animal: 'ox' },
  { name: 'ოქროსფერი', color: C.gold, ink: C.night, animal: 'camel' },
  { name: 'მწვანე', color: '#2f6b45', ink: GOLD_L, animal: 'horse' },
  { name: 'ლურჯი', color: '#2b5797', ink: GOLD_L, animal: 'mule' },
  { name: 'შავი', color: '#2a2522', ink: GOLD_L, animal: 'buffalo' },
];
const animalName = k => ANIMALS.find(a => a[0] === k)[1];

// ---------- small pictures: a die, an abazi, a caravanserai piece, a city's circle, a good's mark ----------
const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
/** A die's face, ±s/2 around (cx, cy), the one in wine; `gold` = an abazi turned it. */
const dieSvg = (v, cx, cy, s, { gold = false } = {}) => `<g transform="translate(${f(cx)} ${f(cy)})"><rect x="${f(-s / 2)}" y="${f(-s / 2)}" width="${f(s)}" height="${f(s)}" rx="${f(s * 0.2)}" fill="${gold ? '#fff4d6' : '#fffdf7'}" stroke="${gold ? C.gold : INK}" stroke-width="${f(s * (gold ? 0.075 : 0.045))}"/>
${PIPS[v].map(([x, y]) => `<circle cx="${f(x * s * 0.27)}" cy="${f(y * s * 0.27)}" r="${f(s * 0.095)}" fill="${v === 1 ? C.wine : INK}"/>`).join('')}</g>`;
/** An abazi, ±r: a silver coin with „ა“ (or its number), a five golden. */
const coinSvg = (cx, cy, r, v = 1, label = 'ა') => {
  const [fill, ring, ink] = v === 5 ? ['#e8c66a', '#8a6a1f', '#5a4310'] : ['#d9d4cb', '#7d756a', '#5e574d'];
  return `<g transform="translate(${f(cx)} ${f(cy)})"><circle r="${f(r)}" fill="${fill}" stroke="${ring}" stroke-width="${f(r * 0.09)}"/><circle r="${f(r * 0.76)}" fill="none" stroke="${ring}" stroke-opacity=".7" stroke-width="${f(r * 0.05)}"/>
<text y="${f(r * 0.06)}" font-family="SansKa" font-weight="900" font-size="${f(r * (label.length > 1 ? 0.86 : 1.06))}" text-anchor="middle" dominant-baseline="central" fill="${ink}">${esc(label)}</text></g>`;
};
/** A caravanserai piece: a square of the house's colour with its gate, `s` mm, centred on (x, y). */
const INN = 12.5;
const innDoor = pl => `<path d="M-5 4.6V-1.2L0 -4.8L5 -1.2V4.6Z" fill="${pl.ink}"/><path d="M-2.2 4.6V1.2A2.2 2.2 0 0 1 2.2 1.2V4.6Z" fill="${pl.color}"/><rect x="-4.1" y="-.6" width="1.3" height="1.5" fill="${pl.color}"/><rect x="2.8" y="-.6" width="1.3" height="1.5" fill="${pl.color}"/>`;
const innPiece = (pl, x, y, s = INN) => `<g transform="translate(${f(x - s / 2)} ${f(y - s / 2)}) scale(${f(s / INN)})"><rect width="${INN}" height="${INN}" fill="${pl.color}"/><rect x=".9" y=".9" width="${INN - 1.8}" height="${INN - 1.8}" rx="1" fill="none" stroke="${pl.ink}" stroke-opacity=".7" stroke-width=".3"/>
<g transform="translate(${INN / 2} ${INN / 2 + 0.2}) scale(.8)">${innDoor(pl)}</g></g>`;
const worthSvg = (w, d, inline = false) => `<svg width="${d}mm" height="${d}mm" viewBox="-6.7 -6.7 13.4 13.4" style="display:${inline ? 'inline-block;vertical-align:-.9mm' : 'block'}">${cityMark(w)}</svg>`;
const badgeSvg = (k, d, inline = false) => `<svg width="${d}mm" height="${d}mm" viewBox="-4 -4 8 8" style="display:${inline ? 'inline-block;vertical-align:-.9mm' : 'block'}">${goodBadge(k, 3.85)}</svg>`;
/** A house's animal on its colour (a disc ⌀d mm), and the animal alone in the house's ink. */
const animalDisc = (pl, d = 18) => `<svg width="${d}mm" height="${d}mm" viewBox="-9 -9 18 18" style="display:block"><circle r="9" fill="${pl.color}"/><circle r="8.1" fill="none" stroke="${pl.ink}" stroke-width=".35"/>
<g transform="translate(-7.1 -5.9) scale(.142)" fill="${pl.ink}" color="${pl.ink}">${ANIMAL[pl.animal]}</g></svg>`;
const animalGlyph = (pl, w) => `<svg width="${w}mm" height="${f(w * 0.8)}mm" viewBox="0 0 100 80" style="display:block;margin:0 auto" fill="${pl.ink}" color="${pl.ink}">${ANIMAL[pl.animal]}</svg>`;
const goodsByKind = Object.keys(GOODS).map(k => ({ k, cities: Object.values(CITIES).filter(c => CARGO[c.key] === k).sort((a, b) => a.p[0] - b.p[0]) }));
const listAnd = names => names.join(', ').replace(/, ([^,]+)$/, ' და $1');

// ---------- the cards: a help card a house, the first caravan's card with the journeys, three maps of the cargo ----------
/** A small table by the number of players: a head row 2 3 4 5, then a row a thing. */
const byPlayers = rows => `<table class="hPts hMini"><tr><th>მოთამაშე</th>${[2, 3, 4, 5].map(n => `<td>${n}</td>`).join('')}</tr>
${rows.map(([h, fn]) => `<tr><th>${h}</th>${[2, 3, 4, 5].map(n => `<td><b>${fn(n)}</b></td>`).join('')}</tr>`).join('')}</table>`;
const helpFront = pl => {
  const n = k => `<span class="n" style="background:${pl.color};color:${pl.ink}">${k}</span>`;
  return `<div class="card qh">${cardSvg(`<rect width="63" height="88" fill="${C.paper}"/>${frameSvg(pl.color)}${bandTitle('შენი სვლა', pl.color, pl.ink)}`)}
<div class="hWho">${animalDisc(pl, 5.4)}<span>${esc(animalName(pl.animal))} · ${esc(pl.name)}</span></div>
<div class="steps">
<div class="st">${n(1)}<div><b>გააგორე</b> სამი კამათელი.</div></div>
<div class="st">${n(2)}<div><b>აბაზი</b> = კამათელი ±1, რამდენჯერაც გინდა.</div></div>
<div class="st">${n(3)}<div><b>ქარვასლა</b> — ${Q.INN_COST}&nbsp;აბაზი, შენი ქარავნის ქალაქში.</div></div>
<div class="st">${n(4)}<div><b>გზა:</b> უჯრები = 1, 2 ან 3 კამათლის ჯამი, შენს ქარავანთან. <b>ან ვაჭრობა:</b> +${Q.TRADE}&nbsp;აბაზი.</div></div>
</div>
<div class="hNote">მთას — წყვილიც, ზღვას — ექვსიანიც.<br>სხვისი გზა შენს ქარვასლასთან: <b>+${Q.GUEST}&nbsp;აბაზი</b>.</div></div>`;
};
const helpBack = pl => {
  const pts = Q.CARGO_PTS.slice(1);
  return `<div class="card qh">${cardSvg(`<rect width="63" height="88" fill="${C.paper}"/>${frameSvg(pl.color)}${bandTitle('ქულები ბოლოს', pl.color, pl.ink)}`)}
<div class="hBody">
<p><b>ქალაქი</b> — მისი ფასი (1–5) იმას, ვისაც იქ მეტი გზა შედის; ქარვასლა ${Q.INN_WEIGHT} გზად ითვლება. ტოლობისას ფასი იყოფა.</p>
<div><p><b>ტვირთი</b> — რამდენ სახეს აღწევს შენი ქარავანი:</p>
<table class="hPts"><tr><th>სახე</th>${pts.map((_, i) => `<td>${i + 1}</td>`).join('')}</tr><tr><th>ქულა</th>${pts.map(p => `<td><b>${p}</b></td>`).join('')}</tr></table></div>
<p><b>ქარვასლა</b> — ${Q.INN_PTS} ქულა თითო.</p>
<div class="hEnd">${byPlayers([['მოგზაურობა', Q.roundsFor]])}<p><b>ტოლობა:</b> მეტი ქალაქი, მერე — მეტი აბაზი.</p></div>
</div></div>`;
};

/** The journeys on the first caravan's card: 12 stations in three rows that wind like a road; a gold one is a game's last. */
const JOURNEY_AT = (() => {
  const xs = [14.25, 25.75, 37.25, 48.75], ys = [30, 42.5, 55];
  return Array.from({ length: 12 }, (_, i) => { const r = Math.floor(i / 4), c = i % 4; return [xs[r % 2 ? 3 - c : c], ys[r]]; });
})();
const LAST_OF = Object.fromEntries([2, 3, 4, 5].map(n => [Q.roundsFor(n), n]));
const PERSON = `<circle cy="-.95" r=".72"/><path d="M-1.3 1.3C-1.3 .1 -.7 -.15 0 -.15C.7 -.15 1.3 .1 1.3 1.3Z"/>`;
const journeySvg = () => {
  const road = `<path d="M${JOURNEY_AT.map(P2).join('L')}" fill="none" stroke="#8a7558" stroke-width="1.3" stroke-dasharray="1.8 1.2" stroke-linejoin="round"/>`;
  return road + JOURNEY_AT.map(([x, y], i) => {
    const j = i + 1, last = LAST_OF[j];
    const tag = last ? `<g transform="translate(${f(x)} ${f(y + 6.1)})"><rect x="-3.4" y="-1.55" width="6.8" height="3.1" rx="1.55" fill="${C.wine}"/>
<g transform="translate(-1.4 .1) scale(.95)" fill="${GOLD_L}">${PERSON}</g><text x="1.25" y=".95" text-anchor="middle" font-family="SansKa" font-weight="800" font-size="2.6" fill="${GOLD_L}">${last}</text></g>` : '';
    return `<circle cx="${f(x)}" cy="${f(y)}" r="4.3" fill="${last ? '#efd896' : C.paper}" stroke="${last ? C.goldDark : C.wine}" stroke-width="${last ? 0.7 : 0.5}"/>
<text x="${f(x)}" y="${f(y + 1.45)}" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="4.1" fill="${C.wine}">${j}</text>${tag}`;
  }).join('');
};
const firstFront = `<div class="card qf">${cardSvg(`<rect width="63" height="88" fill="#f4ead3"/>${frameSvg(C.wine)}${bandTitle('პირველი ქარავანი', C.wine, GOLD_L)}${journeySvg()}`)}
<div class="fTop">შენით იწყება ყოველი მოგზაურობა</div>
<div class="fBot">რიგი ისევ შენ რომ მოგიწევს, ნიშანი ერთით წინ წაწიე. ოქროსფერი წრე — ბოლო მოგზაურობა; მის ქვეშ — რამდენი ქარავანი თამაშობს.</div></div>`;
const firstBack = `<div class="card qf">${cardSvg(`<rect width="63" height="88" fill="#f4ead3"/>${frameSvg(C.wine)}${bandTitle('დასაწყისი', C.wine, GOLD_L)}`)}
<div class="hBody">
<p><b>1.</b> ყველას — ${Q.COINS0} აბაზი, ${Q.INNS} ქარვასლა და თავისი ფერის ურმები.</p>
<p><b>2.</b> პირველ ქარვასლებს უკუღმა დგამენ: იწყებს შენი მარჯვენა მეზობელი, შენ — ბოლოს.</p>
<p><b>3.</b> ქალაქის ფასი — 1 ან 2, და მის მეზობელ ქალაქებში ქარვასლა ჯერ არ დგას.</p>
<p><b>4.</b> მერე შენ აგორებ — იწყება პირველი მოგზაურობა. ნიშანი — 1-ზე.</p>
<div class="hEnd">${byPlayers([['ურემი', Q.cartsFor]])}</div>
</div></div>`;

/** The map on a cargo card: land, sea, the roads as thin lines, the cities as dots and the cargo's marks. */
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
const cargoMap = w => `<svg width="${w}mm" height="${f(w * MINI[3] / MINI[2])}mm" viewBox="${MINI.join(' ')}" style="display:block">${miniBase}
${Object.entries(CARGO).map(([k, g]) => `<g transform="translate(${P2(CITIES[k].p)})">${goodBadge(g, 25)}</g>`).join('')}</svg>`;
const cargoFront = `<div class="card qg">${cardSvg(`<rect width="63" height="88" fill="#f4ead3"/>${frameSvg(C.night, C.gold)}${bandTitle('რვა ტვირთი', C.night, GOLD_L)}
<rect x="4.6" y="14.1" width="53.8" height="${f(53 * MINI[3] / MINI[2] + 0.8)}" rx=".8" fill="none" stroke="${C.gold}" stroke-width=".4"/>`)}
<div class="gMap">${cargoMap(53)}</div>
<div class="gList">${Object.keys(GOODS).map(k => `<span>${badgeSvg(k, 4.4)}${esc(GOODS[k].name)}</span>`).join('')}</div></div>`;
const cargoBack = `<div class="card qg">${cardSvg(`<rect width="63" height="88" fill="#f4ead3"/>${frameSvg(C.night, C.gold)}${bandTitle('სად რა ტვირთია', C.night, GOLD_L)}`)}
<div class="gWhere">${goodsByKind.map(({ k, cities }) => `<p>${badgeSvg(k, 4.2)}<span><b>${esc(GOODS[k].name)}</b> — ${esc(listAnd(cities.map(c => c.name)))}</span></p>`).join('')}</div>
<div class="gNote">ითვლება შენი გზების ბოლოები და შენი ქარვასლების ქალაქები.</div></div>`;

// ---------- the houses' pieces: carts 17×7.5 mm, caravanserais 12.5 mm, animals ⌀18 mm, the journeys' marker (both sides alike) ----------
const CART = { w: 17, h: 7.5, cols: 11, rows: 2 }; // 22 a colour: the most a game uses (2 players: 20) + 2 spare
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
const innsSvg = back => {
  const cols = back ? [...PLAYERS].reverse() : PLAYERS;
  return `<svg width="${INN * 5}mm" height="${INN * 4}mm" viewBox="0 0 ${INN * 5} ${INN * 4}">${cols.map((pl, c) => [0, 1, 2, 3].map(r => innPiece(pl, c * INN + INN / 2, r * INN + INN / 2)).join('')).join('')}</svg>`;
};
const markerSvg = d => `<svg width="${d}mm" height="${d}mm" viewBox="-6 -6 12 12" style="display:block"><circle r="6" fill="${C.gold}"/><circle r="5.25" fill="none" stroke="${C.night}" stroke-width=".3"/>${wheel(0, 0, 4.3, C.night, 0.55)}</svg>`;
const figuresSheet = back => {
  const items = [
    { x: 11.5, y: 16, w: CART.w * CART.cols, h: CART.h * CART.rows * PLAYERS.length, html: cartsSvg() },
    { x: 11.5, y: 113, w: INN * 5, h: INN * 4, html: innsSvg(back) },
    ...PLAYERS.map((pl, i) => ({ x: 92 + i * 22.2, y: 113, w: 18, h: 18, html: animalDisc(pl) })),
    ...[0, 1].map(i => ({ x: 92 + i * 16, y: 147, w: 12, h: 12, html: markerSvg(12) })),
  ];
  if (!back) items.push(
    { x: 11.5, y: 10.6, w: 187, h: 5, html: `<div class="pcCap">ურმები — 22 თითო ფერი. ჭრა — ხაზებზე, სახაზავით.</div>` },
    { x: 11.5, y: 93.6, w: 187, h: 10, html: `<div class="pcNote">თამაშში ურმები: ${[2, 3, 4, 5].map(n => `<b>${n}</b> მოთამაშით — ${Q.cartsFor(n)}`).join(', ')}; დანარჩენი სათადარიგოა და ყუთში რჩება.</div>` },
    { x: 11.5, y: 107.6, w: 75, h: 5, html: `<div class="pcCap">ქარვასლები — ${Q.INNS} + 1 სათადარიგო</div>` },
    { x: 92, y: 107.6, w: 107, h: 5, html: `<div class="pcCap">ქულების ნიშანი — ბოლოს, ბილიკზე</div>` },
    ...PLAYERS.map((pl, i) => ({ x: 89 + i * 22.2, y: 132.6, w: 24, h: 5, html: `<div class="pcCap c">${animalName(pl.animal)}</div>` })),
    { x: 124, y: 147.4, w: 75, h: 12, html: `<div class="pcNote"><b>მოგზაურობის ნიშანი</b> — „პირველი ქარავნის“ ბარათზე დგება (მეორე — სათადარიგო).</div>` },
    { x: 11.5, y: 170, w: 187, h: 12, html: `<div class="pcNote">ფერი — ცხოველი: ${PLAYERS.map(pl => `<b>${pl.name}</b> — ${animalName(pl.animal)}`).join(', ')}. ორივე მხარე ერთნაირია — ფიგურა ნებისმიერი მხრით დადე.</div>` },
    { x: 11.5, y: 184, w: 187, h: 20, html: `<div class="pcNote">ქაღალდი: 250–300 გ ან ჩვეულებრივი, მერე მუყაოზე დაკრული. ურმების ნაცვლად ფერადი ღილები ან ლეგოს 1×2 აგურებიც გამოდგება — თითო უჯრაზე ერთი; ქარვასლის ნაცვლად — იმავე ფერის ორი აგური ერთმანეთზე.</div>` },
  );
  return placedSheet(items, { back, label: back ? 'ფიგურები — მეორე მხარე' : 'ფიგურები: ურმები, ქარვასლები, ცხოველები, ნიშნები' });
};

// ---------- the abazi (16 mm chits, both sides alike) and three dice to fold ----------
const CHIT = 16, CHIT_COLS = 11, CHIT_ROWS = 6, FIVES = 11;
const COIN_VALUES = Array.from({ length: CHIT_COLS * CHIT_ROWS }, (_, i) => (i >= CHIT_COLS * (CHIT_ROWS - 1) ? 5 : 1));
if (COIN_VALUES.filter(v => v === 5).length !== FIVES) throw new Error('qaravani: the last row of abazi is the fives');
const CHITS_X = (210 - CHIT_COLS * CHIT) / 2, CHITS_Y = 23;
const chitSvg = v => `<svg width="${CHIT}mm" height="${CHIT}mm" viewBox="0 0 16 16" style="display:block"><rect width="16" height="16" fill="${v === 5 ? '#f3e6c2' : '#eee9df'}"/>
<rect x="1" y="1" width="14" height="14" rx="1.6" fill="none" stroke="${v === 5 ? C.gold : '#a59b8c'}" stroke-opacity=".7" stroke-width=".3"/>${coinSvg(8, 8, 5.8, v, String(v))}</svg>`;
const chitGrid = () => {
  const x0 = CHITS_X, y0 = CHITS_Y, x1 = x0 + CHIT_COLS * CHIT, y1 = y0 + CHIT_ROWS * CHIT;
  const v = Array.from({ length: CHIT_COLS + 1 }, (_, i) => `M${x0 + i * CHIT} ${y0 - 4}V${y0 - 1}M${x0 + i * CHIT} ${y1 + 1}V${y1 + 4}`).join('');
  const h = Array.from({ length: CHIT_ROWS + 1 }, (_, i) => `M${x0 - 4} ${y0 + i * CHIT}H${x0 - 1}M${x1 + 1} ${y0 + i * CHIT}H${x1 + 4}`).join('');
  return { x: 0, y: 0, w: 210, h: 297, html: `<svg viewBox="0 0 210 297" width="210mm" height="297mm" style="display:block" stroke="#777" stroke-width=".2"><path d="${v}${h}"/></svg>` };
};
const chitItems = () => COIN_VALUES.map((v, i) => ({ x: CHITS_X + (i % CHIT_COLS) * CHIT, y: CHITS_Y + Math.floor(i / CHIT_COLS) * CHIT, w: CHIT, h: CHIT, html: chitSvg(v) }));
/** A die to fold (18 mm a face): the cross 1 / 3-2-4 / 6 / 5 — opposite faces add up to seven — with glue tabs. */
const DIE = 18;
const dieNet = () => {
  const faces = [[1, 0, 1], [0, 1, 3], [1, 1, 2], [2, 1, 4], [1, 2, 6], [1, 3, 5]];
  const tab = (x1, y1, x2, y2, nx, ny) => {
    const d = 4, k = 0.25, ax = x1 + (x2 - x1) * k + nx * d, ay = y1 + (y2 - y1) * k + ny * d, bx = x2 - (x2 - x1) * k + nx * d, by = y2 - (y2 - y1) * k + ny * d;
    return `<polygon points="${x1},${y1} ${f(ax)},${f(ay)} ${f(bx)},${f(by)} ${x2},${y2}" fill="${C.cream}" stroke="${C.line}" stroke-width=".3"/>`;
  };
  const D = DIE;
  const tabs = [tab(D, 0, 2 * D, 0, 0, -1), tab(0, D, D, D, 0, -1), tab(2 * D, D, 3 * D, D, 0, -1), tab(0, 2 * D, 0, D, -1, 0),
    tab(3 * D, D, 3 * D, 2 * D, 1, 0), tab(0, 2 * D, D, 2 * D, 0, 1), tab(2 * D, 2 * D, 3 * D, 2 * D, 0, 1)].join('');
  const sides = faces.map(([cx, cy, v]) => `<rect x="${cx * D}" y="${cy * D}" width="${D}" height="${D}" fill="#fffdf7" stroke="${C.brown}" stroke-width=".35"/>${dieSvg(v, cx * D + D / 2, cy * D + D / 2, D * 0.9).replace(/<rect[^>]*\/>/, '')}`).join('');
  return `<svg viewBox="-5 -5 ${3 * D + 10} ${4 * D + 10}" width="${3 * D + 10}mm" height="${4 * D + 10}mm" style="display:block">${tabs}${sides}</svg>`;
};
const DICE_Y = CHITS_Y + CHIT_ROWS * CHIT + 15;
const coinsSheet = back => {
  const items = [chitGrid(), ...chitItems()];
  if (!back) items.push(
    { x: CHITS_X, y: 10.6, w: CHIT_COLS * CHIT, h: 5, html: `<div class="pcCap">აბაზი — ${COIN_VALUES.length - FIVES} ვერცხლის (1) და ${FIVES} ოქროს (5). ორივე მხარე ერთნაირია: ჭრა — ხაზებზე.</div>` },
    { x: CHITS_X, y: DICE_Y - 6.6, w: CHIT_COLS * CHIT, h: 5, html: `<div class="pcCap">კამათლები — სამი</div>` },
    ...[0, 1, 2].map(i => ({ x: (210 - 3 * (3 * DIE + 10)) / 2 + i * (3 * DIE + 10), y: DICE_Y, w: 3 * DIE + 10, h: 4 * DIE + 10, html: dieNet() })),
    { x: CHITS_X, y: DICE_Y + 4 * DIE + 14, w: CHIT_COLS * CHIT, h: 24, html: `<div class="pcNote">კამათელი: გამოჭერი კიდეზე, მოკეცე ყველა ხაზზე და ყურები შიგნიდან დააწებე — ერთიანი და ექვსიანი ერთმანეთის პირისპირ აღმოჩნდება. სამი ჩვეულებრივი კამათელიც (ნარდისაც) გამოდგება. ბანკში აბაზი თუ გათავდა, ნებისმიერი წვრილმანი (ღილი, ლობიო) აბაზად ჩათვალეთ.</div>` },
  );
  return placedSheet(items, { back, label: back ? 'აბაზი — მეორე მხარე' : 'აბაზი და კამათლები' });
};

// ---------- the score sheet: every city by its worth and cargo, west to east, a column a house ----------
const WEST_EAST = Object.values(CITIES).sort((a, b) => a.p[0] - b.p[0]);
const cityTable = list => `<table class="sc"><colgroup><col class="cnC"><col class="cwC"><col class="cgC">${PLAYERS.map(() => '<col class="cbC">').join('')}</colgroup>
<tr><th class="cn">ქალაქი</th><th>ფასი</th><th>ტვირთი</th>${PLAYERS.map(pl => `<th class="hh" style="background:${pl.color}">${animalGlyph(pl, 5.6)}</th>`).join('')}</tr>
${list.map(c => `<tr><td class="cn">${esc(c.name)}</td><td class="cw">${worthSvg(worthOf(c.key), 5)}</td><td class="cg">${CARGO[c.key] ? badgeSvg(CARGO[c.key], 4.6) : ''}</td>${PLAYERS.map(() => '<td></td>').join('')}</tr>`).join('')}</table>`;
const SUM_ROWS = [['სახელი', 'name'], ['ქალაქები — ჯამი', ''], ['ტვირთის სახე (0–8)', ''], ['ტვირთის ქულა', ''], [`ქარვასლა × ${Q.INN_PTS}`, ''], ['სულ', 'sum'], ['ქალაქი — რამდენი (ტოლობისას)', 'tie']];
const scorePage = page(`${stripe(NO, 'ქულების ფურცელი')}<div class="scWrap">
<div class="scHead"><div class="aso">${aso(title)}</div><b>ქულების ფურცელი</b><span>თარიღი ______________</span></div>
<p class="scHow">ყოველი ქალაქის ფასი ჩაწერე იმ სახლის უჯრაში, ვისაც იქ <b>მეტი გზა შედის</b> (ქარვასლა = ${Q.INN_WEIGHT} გზა). ტოლობისას ფასი გაყავით, ნაშთი იკარგება; ქალაქი, სადაც არავის გზა და ქარვასლა არ არის, არავისია. ქალაქები დასავლეთიდან აღმოსავლეთისკენ ჩამოწერილია — ისე, როგორც რუკაზე.</p>
<div class="scCols">${cityTable(WEST_EAST.slice(0, 24))}${cityTable(WEST_EAST.slice(24))}</div>
<table class="scSum"><tr><th></th>${PLAYERS.map(pl => `<th style="background:${pl.color}">${animalGlyph(pl, 6.4)}</th>`).join('')}</tr>
${SUM_ROWS.map(([h, k]) => `<tr class="${k}"><th>${esc(h)}</th>${PLAYERS.map(() => '<td></td>').join('')}</tr>`).join('')}</table>
<p class="scPts"><b>ტვირთი:</b> ${Q.CARGO_PTS.slice(1).map((p, i) => `${i + 1} — ${p}`).join(' · ')}. <b>იგებს</b> მეტი ქულა; ტოლობისას — მეტი ქალაქი, მერე — მეტი აბაზი.</p>
</div>
${foot(`<span>${esc(title)} · ქულების ფურცელი — ასლი ყოველი თამაშისთვის</span><span>${esc(SCHOOL)}</span>`)}`, 'scoreP');

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
const capSvg = (s, x, y, o = {}) => `<text x="${f(x)}" y="${f(y)}" text-anchor="${o.anchor ?? 'middle'}" font-family="SerifKa" font-size="${o.size ?? 3}" font-weight="${o.weight ?? 400}" fill="${o.fill ?? INK}">${esc(s)}</text>`;
/** One of a player's carts standing on a cell (board units). */
const cartOn = (cell, pl) => `<g transform="translate(${P2(cell.p)}) rotate(${deg(upright(cell.ang))})"><rect x="-8.5" y="-3.75" width="17" height="7.5" fill="${pl.color}" stroke="${pl.ink}" stroke-width=".3"/>${cartSvg(0.4, -0.78, 12, { color: pl.ink })}</g>`;
const cityAt = (x, y, w) => `<g transform="translate(${f(x)} ${f(y)})">${cityMark(w)}</g>`;
/** `n` cells along the angle `ang` from a city at (x, y), each with a cart of `pl` (or free). */
const roadFrom = (x, y, ang, n, { pl = null, mountain = false } = {}) => Array.from({ length: n }, (_, k) => {
  const d = CITY_R + 1 + 10 + k * 21.5, c = { p: [x + Math.cos(ang) * d, y + Math.sin(ang) * d], ang };
  return cellSvg(c, { mountain }) + (pl ? cartOn(c, pl) : '');
}).join('');
const roadEnd = n => CITY_R + 1 + 10 + (n - 1) * 21.5 + 10 + 1 + CITY_R;
const arrow = (x0, x1, y) => `<path d="M${f(x0)} ${f(y)}H${f(x1)}M${f(x1 - 2)} ${f(y - 2)}L${f(x1)} ${f(y)}L${f(x1 - 2)} ${f(y + 2)}" fill="none" stroke="${C.wine}" stroke-width=".7" stroke-linecap="round" stroke-linejoin="round"/>`;
const under = (x0, x1, y) => `<path d="M${f(x0)} ${f(y)}H${f(x1)}" stroke="${C.gold}" stroke-width="1" stroke-linecap="round"/>`;
const figSvg = (h, inner) => `<svg width="84mm" height="${h}mm" viewBox="0 0 84 ${h}" style="display:block;margin:0 auto">${inner}</svg>`;
const turnFigure = figSvg(24, `${[2, 3, 5].map((v, i) => dieSvg(v, 6 + i * 10.4, 8.5, 8.4)).join('')}${under(1.8, 20.6, 14.3)}
${capSvg('2 + 3 = 5', 11.2, 20.8, { size: 3.4, weight: 700, fill: C.wine })}${arrow(32.4, 38.6, 8.5)}
<g transform="translate(43 8.5) scale(.3)">${cityAt(0, 0, 2)}${roadFrom(0, 0, 0, 5, { pl: PLAYERS[0] })}${cityAt(roadEnd(5), 0, 3)}</g>
${capSvg('5 უჯრა — 5 ურემი', 62, 20.8, { size: 3.2 })}`);
const abaziFigure = figSvg(24, `${[2, 3, 5].map((v, i) => dieSvg(v, 5.2 + i * 9.4, 8.5, 7.6)).join('')}
${arrow(30, 38, 8.5)}${coinSvg(34, 15.4, 2.7)}${capSvg('−1', 38.6, 16.6, { size: 3, weight: 700, fill: C.wine, anchor: 'start' })}
${[2, 3, 6].map((v, i) => dieSvg(v, 45.2 + i * 9.4, 8.5, 7.6, { gold: i === 2 })).join('')}
<g transform="translate(77 8.5) scale(.34)">${cellSvg({ p: [0, 0], ang: 0 }, { ship: true })}</g>
${capSvg('2, 3, 5', 14.6, 20.8, { size: 3.1 })}${capSvg('2, 3, 6 — ზღვის გზაც', 61, 20.8, { size: 3.1, weight: 700, fill: C.wine })}`);
const weatherFigure = figSvg(24, `${[4, 4, 2].map((v, i) => dieSvg(v, 5.2 + i * 9.4, 8.5, 7.6)).join('')}${under(1.4, 18.4, 13.6)}
<g transform="translate(33.6 8.5) scale(.34)">${cellSvg({ p: [0, 0], ang: 0 }, { mountain: true })}</g>
${capSvg('წყვილი — მთის გზა', 19.6, 20.8, { size: 3.1, weight: 700, fill: C.wine })}
<path d="M42 2V22" stroke="${C.line}" stroke-width=".4"/>
${[6, 1, 3].map((v, i) => dieSvg(v, 48.2 + i * 9.4, 8.5, 7.6)).join('')}${under(44.4, 52, 13.6)}
<g transform="translate(77 8.5) scale(.34)">${cellSvg({ p: [0, 0], ang: 0 }, { ship: true })}</g>
${capSvg('ექვსიანი — ზღვის გზა', 62.6, 20.8, { size: 3.1, weight: 700, fill: C.wine })}`);
/** A tag in a house's colour: a rounded pill with a short text (board mm). */
const pill = (x, y, text, pl, w = 3 + [...text].length * 1.95) => `<g transform="translate(${f(x)} ${f(y)})"><rect x="${f(-w / 2)}" y="-2.3" width="${f(w)}" height="4.6" rx="2.3" fill="${pl.color}"/>
<text y="1.15" text-anchor="middle" font-family="SansKa" font-weight="800" font-size="3.2" fill="${pl.ink}">${esc(text)}</text></g>`;
const cityFigure = (() => {
  const [gold, wine] = [PLAYERS[1], PLAYERS[0]], W = Math.PI, NE = -0.62, SE = 0.62;
  const sw = (pl, y) => `<rect x="47" y="${f(y - 2.5)}" width="3.2" height="3.2" rx=".6" fill="${pl.color}"/>`;
  return figSvg(32, `<g transform="translate(24 14.5) scale(.44)">${roadFrom(0, 0, W, 2, { pl: gold })}${roadFrom(0, 0, NE, 1, { pl: gold })}${roadFrom(0, 0, SE, 2, { pl: wine })}
${innPiece(wine, -4.5, 14, 10)}${cityAt(0, 0, 3)}</g>
${sw(gold, 8)}${capSvg('2 გზა = 2', 52, 8, { size: 3, anchor: 'start' })}
${sw(wine, 15)}${capSvg('1 გზა + ქარვასლა', 52, 15, { size: 3, anchor: 'start' })}${capSvg(`= 1 + ${Q.INN_WEIGHT} = 3`, 52, 20.2, { size: 3, anchor: 'start' })}
${capSvg('3 ქულა — ღვინისფერს', 47, 28.4, { size: 3, weight: 700, fill: C.wine, anchor: 'start' })}`);
})();
/** Cargo counts kinds, not cities: a wine caravan through four cities. */
const cargoFigure = (() => {
  const wine = PLAYERS[0], hop = roadEnd(1), cargo = ['yellow', 'red', null, 'red'], worth = [1, 2, 1, 2];
  const net = cargo.map((g, i) => `${i ? roadFrom((i - 1) * hop, 0, 0, 1, { pl: wine }) : ''}${cityAt(i * hop, 0, worth[i])}${g ? `<g transform="translate(${f(i * hop)} -12.4)">${goodBadge(g, 4.6)}</g>` : ''}`).join('');
  return figSvg(26, `<g transform="translate(5 16) scale(.4)">${net}</g>
${arrow(52, 57, 13)}<g transform="translate(62.4 13)">${goodBadge('yellow', 2.6)}</g>${capSvg('+', 66.2, 14.1, { size: 3.4, weight: 800, fill: C.wine })}<g transform="translate(70 13)">${goodBadge('red', 2.6)}</g>
${capSvg('2 სახე', 66.2, 20.6, { size: 3, weight: 700, fill: C.wine })}${capSvg(`${Q.CARGO_PTS[2]} ქულა`, 66.2, 24.8, { size: 3, fill: C.wine })}`);
})();
/** Another house's new road into my caravanserai's city: +1 abazi to me. */
const guestFigure = (() => {
  const [gold, wine] = [PLAYERS[1], PLAYERS[0]];
  return figSvg(25, `<g transform="translate(46 11) scale(.4)">${roadFrom(0, 0, Math.PI, 3, { pl: gold })}${roadFrom(0, 0, 0, 1, { pl: wine })}
${innPiece(wine, 0, 15.5, 10)}${cityAt(0, 0, 2)}</g>
${pill(30, 4, 'ახალი გზა', gold)}${arrow(59, 65, 11)}${coinSvg(70.4, 11, 3.3)}${capSvg(`+${Q.GUEST}`, 75.2, 12.3, { size: 3.6, weight: 800, fill: C.wine, anchor: 'start' })}
${capSvg('ღვინისფერს', 72, 21, { size: 3.1, weight: 700, fill: C.wine })}`);
})();
/** A double road: with 2–3 players the second lane closes, with 4–5 another house may take it. */
const doubleFigure = (() => {
  const [gold, wine, blue] = [PLAYERS[1], PLAYERS[0], PLAYERS[3]], D = DOUBLE_OFF, L = roadEnd(2);
  const lanes = (x, other) => `<g transform="translate(${x} 10.5) scale(.42)">${roadFrom(0, -D, 0, 2, { pl: gold })}${roadFrom(0, D, 0, 2, { pl: other })}
${other ? '' : `<path d="M${f(L / 2 - 14)} ${f(D - 5)}L${f(L / 2 + 14)} ${f(D + 5)}M${f(L / 2 - 14)} ${f(D + 5)}L${f(L / 2 + 14)} ${f(D - 5)}" stroke="${C.wine}" stroke-width="1.6" stroke-linecap="round"/>`}
${cityAt(0, 0, 2)}${cityAt(L, 0, 1)}</g>`;
  return figSvg(27, `${lanes(8, null)}${capSvg(`${Q.MIN_Q}–3 მოთამაშე`, 19.8, 23.8, { size: 3.1, weight: 700, fill: C.wine })}
<path d="M41 2V25" stroke="${C.line}" stroke-width=".4"/>${lanes(51, blue)}${capSvg('4–5 მოთამაშე', 62.8, 23.8, { size: 3.1, weight: 700, fill: C.wine })}`);
})();
/** The map's marks, for the first rules page. */
const markSvg = (vb, w, h, inner) => `<svg width="${w}mm" height="${h}mm" viewBox="${vb}" style="display:block;flex:none">${inner}</svg>`;
const MARKS = [
  [markSvg('-7 -7 14 14', 7.4, 7.4, cityMark(3)), '<b>ქალაქი</b> და მისი ფასი, 1–5'],
  [markSvg('-4.2 -4.2 8.4 8.4', 6.4, 6.4, goodBadge('red', 3.9)), '<b>ტვირთი</b> — მისი ქალაქის გვერდით'],
  [markSvg('-11 -6.5 22 13', 13, 7.7, cellSvg({ p: [0, 0], ang: 0 })), '<b>უჯრა</b> — ერთი ურემი'],
  [markSvg('-11 -6.5 22 13', 13, 7.7, cellSvg({ p: [0, 0], ang: 0 }, { mountain: true })), '<b>მთის გზა</b> — წყვილიც'],
  [markSvg('-11 -6.5 22 13', 13, 7.7, cellSvg({ p: [0, 0], ang: 0 }, { ship: true })), '<b>გემის გზა</b> — ექვსიანიც'],
  [markSvg('-11 -12.4 22 24.8', 9.4, 10.6, cellSvg({ p: [0, -DOUBLE_OFF], ang: 0 }) + cellSvg({ p: [0, DOUBLE_OFF], ang: 0 })), '<b>ორმაგი გზა</b> — ორი ზოლი'],
];
const marksBox = `<div class="figBox"><h3>რუკაზე</h3><div class="marks">${MARKS.map(([svg, t]) => `<div>${svg}<span>${t}</span></div>`).join('')}</div>
<p class="figCap">ორმაგი გზის ზოლებს შორის 1872 წლის რკინიგზაა — ის მხოლოდ სანახავადაა.</p></div>`;

// ---------- the score example: two houses' caravans in Kakheti, counted by the app's own rules ----------
const EXAMPLE = (() => {
  const keys = CITY_ROWS.map(c => c[0]), X = k => keys.indexOf(k);
  const trackOf = (a, b) => Q.TRACKS.findIndex(t => (t.a === X(a) && t.b === X(b)) || (t.a === X(b) && t.b === X(a)));
  const owner = Q.TRACKS.map(() => -1), inn = keys.map(() => 0);
  const roads = [[0, [['tbilisi', 'sagarejo'], ['sagarejo', 'gurjaani'], ['gurjaani', 'telavi'], ['telavi', 'kvareli'], ['tbilisi', 'bolnisi']]],
    [1, [['mtskheta', 'tbilisi'], ['tbilisi', 'manglisi'], ['gurjaani', 'sighnaghi'], ['kvareli', 'lagodekhi']]]];
  for (const [p, list] of roads) for (const [a, b] of list) {
    const t = trackOf(a, b);
    if (t < 0 || owner[t] >= 0) throw new Error(`qaravani: the example's road ${a} — ${b}`);
    owner[t] = p;
  }
  for (const [p, list] of [[0, ['sagarejo', 'telavi', 'tbilisi']], [1, ['mtskheta']]]) for (const k of list) inn[X(k)] |= 1 << p;
  const row = Q.scoreOf(owner, inn, 2)[0], name = x => CITIES[keys[x]].name, worth = x => worthOf(keys[x]);
  const won = row.cities.map(x => ({ x, n: Q.holdersOf(owner, inn, 2, x).length })).sort((a, b) => worth(b.x) - worth(a.x));
  const full = won.filter(c => c.n === 1), shared = won.filter(c => c.n > 1), goods = Object.values(GOODS);
  const rows = [
    [`ქალაქები: ${full.map(c => `${name(c.x)} ${worth(c.x)}`).join(', ')}`, full.reduce((s, c) => s + worth(c.x), 0)],
    ...shared.map(c => [`${name(c.x)} — ტოლობა: ${worth(c.x)} ქულა ${c.n === 2 ? 'ორად' : `${c.n}-ად`} იყოფა`, Math.floor(worth(c.x) / c.n)]),
    [`ტვირთი: ${listAnd(row.cargo.map(k => goods[k].name))} — ${row.cargo.length} სახე`, row.cargoPts],
    [`${row.inns} ქარვასლა`, row.inns * Q.INN_PTS],
  ];
  if (rows.reduce((s, r) => s + r[1], 0) !== row.total) throw new Error('qaravani: the score example does not add up');
  return { rows, total: row.total };
})();

// ---------- rules (four pages) ----------
const RULES = [
  ['მომზადება', `რუკა მაგიდის შუაში დადეთ, აბაზი — ბანკად გვერდით, სამი კამათელი — ყველას ხელმისაწვდომად. თითოეული ირჩევს ფერს და იღებს ამ ფერის ${Q.INNS} ქარვასლას, თავის ცხოველს, დამხმარე ბარათს, ${Q.COINS0} აბაზს და ურმებს: ${[2, 3, 4, 5].map(n => `${n} მოთამაშით — ${Q.cartsFor(n)}`).join(', ')}.`],
  ['ვინ იწყებს', 'იწყებს ყველაზე ახალგაზრდა. ის იღებს „პირველი ქარავნის“ ბარათს და მოგზაურობის ნიშანს 1-ზე დგამს. სვლები საათის ისრის მიმართულებით მიდის.'],
  ['პირველი ქარვასლები', `დგამენ უკუღმა: იწყებს პირველის მარჯვენა მეზობელი, პირველი — ბოლოს. ქარვასლა უფასოა და დგება ქალაქში, რომლის ფასია 1 ან ${Q.START_MAX} და რომლის მეზობელ ქალაქებში (ერთი გზით მოშორებით) ქარვასლა ჯერ არ დგას. ეს ქალაქი შენი ქარავნის დასაწყისია.`],
  ['სვლა', 'ააგორე სამი კამათელი. მერე, თუ გინდა, აბაზით შეცვალე კამათლები და ააშენე ქარვასლა. სვლას ამთავრებს ერთი: <b>გზა</b> ან <b>ვაჭრობა</b>.'],
  ['გზა', 'დაიკავე ერთი თავისუფალი გზა, რომლის უჯრების რაოდენობას ერთი, ორი ან სამი კამათლის ჯამი უდრის, და ყოველ მის უჯრაზე შენი ურემი დადგი. გზა შენს ქარავანს უნდა ეხებოდეს — შენი გზის ბოლოს ან შენი ქარვასლის ქალაქს; სხვაგან მხოლოდ მაშინ, როცა შენს ქალაქებთან თავისუფალი გზა აღარ დარჩა. ურმები რომ არ გყოფნის, გზას ვერ დაიკავებ.'],
  ['ვაჭრობა', `გზას თუ ვერ ან არ იკავებ, ივაჭრე: ბანკიდან ${Q.TRADE} აბაზს იღებ.`],
  ['მთა და ზღვა', 'მთის გზას (წყვეტილი კიდეები, თოვლიანი მწვერვალი) კამათლებში წყვილიც სჭირდება — ორი ერთნაირი: კარგი ამინდია. ზღვისა და მდინარის გზას (გემი) — ექვსიანი: წყალი წყნარია. წყვილი ან ექვსიანი ჯამში შეიძლება არც შედიოდეს.'],
  ['აბაზი', 'ერთი აბაზი ერთ კამათელს ერთით ზრდის ან ამცირებს (1-დან 6-მდე, ექვსიანი ერთიანად არ იქცევა) — რამდენჯერაც გინდა, სანამ გზას აირჩევ. დახარჯული აბაზი ბანკში ბრუნდება.'],
  ['ქარვასლა', `სვლაში, გზამდე, ${Q.INN_COST} აბაზად ააშენე ქარვასლა შენი ქარავნის ქალაქში, სადაც შენი ჯერ არ დგას (სხვისის გვერდით — შეიძლება). თითოს სულ ${Q.INNS} ქარვასლა აქვს, პირველიც მათ შორისაა. ქალაქში ქარვასლა ${Q.INN_WEIGHT} გზად ითვლება.`],
  ['სტუმარი', `სხვისი ახალი გზა შენი ქარვასლის ქალაქში თუ შემოვა, ბანკიდან ${Q.GUEST} აბაზს იღებ.`],
  ['ორმაგი გზა', `ორ ზოლს ერთი სახლი ვერ დაიკავებს. ${Q.MIN_Q}–3 მოთამაშით მხოლოდ ერთი ზოლი გამოიყენება: ერთი რომ დაიკავეს, მეორე დაკეტილია.`],
  ['მოგზაურობა', `როცა ყველამ ერთხელ ითამაშა, მოგზაურობა დასრულდა: პირველი მოთამაშე ბარათზე ნიშანს ერთით წინ წევს. თამაშში ${[2, 3, 4, 5].map(n => `${n} მოთამაშით — ${Q.roundsFor(n)}`).join(', ')} მოგზაურობაა; ბოლოს ბარათზე ოქროსფერი წრე აჩვენებს.`],
  ['ქულები ბოლოს', `ბოლო მოგზაურობის მერე დათვალეთ — ქულების ფურცელზე ან ბილიკზე, ცხოველებით. <b>ქალაქი:</b> მისი ფასი (წრეში, 1–5) იმ სახლისაა, ვისაც იქ მეტი გზა შედის; ქარვასლა ${Q.INN_WEIGHT} გზაა. ტოლობისას ფასი იყოფა, ნაშთი იკარგება. <b>ტვირთი:</b> რამდენ სახეს აღწევს შენი ქარავანი — შენი გზების ბოლოები და ქარვასლები: ${Q.CARGO_PTS.slice(1).map((p, i) => `${i + 1} — ${p}`).join(', ')} ქულა. <b>ქარვასლა:</b> ${Q.INN_PTS} ქულა თითო.`],
  ['გამარჯვება', 'იგებს მეტი ქულა; ტოლობისას — მეტი ქალაქი, მერე — მეტი აბაზი.'],
];
const FAQ = [
  ['კამათლები არცერთ გზას არ ხსნის?', `აბაზით შეცვალე ან ივაჭრე: ${Q.TRADE} აბაზი შემდეგ სვლაში გამოგადგება.`],
  ['სხვის ქალაქში გზა შეიძლება?', 'კი: ქალაქი ბოლომდე არავისია — ვისაც იქ მეტი გზა შედის, იმისია. სხვის ქარვასლის ქალაქში შესვლა მას აბაზს აძლევს, მაგრამ ქალაქს შეიძლება წაართვა.'],
  ['ქარავანი ორად შეიძლება გაიყოს?', 'კი, თუ შენს ქალაქებთან თავისუფალი გზა აღარ დარჩა და სხვაგან დაიწყე. ტვირთის დათვლისას ორივე ნაწილი შენია.'],
  ['ურმები გამომელია?', 'გზას ვეღარ დაიკავებ, მაგრამ ვაჭრობა და ქარვასლა შეგიძლია — თამაში ყველასთვის ერთად მთავრდება.'],
];
const rulesList = (list, start) => `<ol start="${start}">${list.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol>`;
const head = sub => `<div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">${esc(sub)}</div></div>`;
const rulesFoot = n => foot(`<span>${esc(title)} · წესები ${n}/4</span><span>${esc(SCHOOL)}</span>`);
const ways = `<div class="wins3">
<div><svg width="12mm" height="12mm" viewBox="-7.4 -7.4 14.8 14.8">${cityMark(3)}</svg><b>ქალაქები</b><span>ვისაც მეტი გზა შედის, ქალაქის ფასი (1–5) მისია</span></div>
<div><svg width="12mm" height="12mm" viewBox="-4.6 -4.6 9.2 9.2">${goodBadge('red', 3.9)}</svg><b>ტვირთი</b><span>რამდენ სახეს აღწევს ქარავანი: 1-დან ${Q.CARGO_PTS[8]} ქულამდე</span></div>
<div><svg width="12mm" height="12mm" viewBox="0 0 12 12">${innPiece(PLAYERS[0], 6, 6, 9.6)}</svg><b>ქარვასლები</b><span>თითო ${Q.INN_PTS} ქულა; ქალაქში — ${Q.INN_WEIGHT} გზა</span></div></div>`;
const rulesPage1 = page(`${stripe(NO, 'წესები · 1')}<div class="rulesWrap">${head(`წესები · ${META}`)}
<p class="lead">XIX საუკუნის მიწურულია. ფოთიდან ტფილისამდე ახლახან გაიყვანეს რკინიგზა, მაგრამ ქვეყნის უმეტეს ნაწილში ჯერ ისევ ურმები და ქარავნები დადიან — ხეობებით, უღელტეხილებით და ზღვის პირით. თითოეული მოთამაშე ქარავნის პატრონია: კამათლები გზებს უხსნის, ის კი ქალაქიდან ქალაქში ურმებით გადის, აშენებს ქარვასლებს და აგროვებს ტვირთს — ღვინოს, თაფლს, ჩაის, ლურჯ სუფრას, ნაბადს, სულგუნს, სპილენძს და აბრეშუმს. ქულა ბოლოს სამი გზით მოდის:</p>
${ways}
<div class="rules">${rulesList(RULES.slice(0, 6), 1)}<div class="figBox"><h3>სვლის მაგალითი</h3>${turnFigure}<p class="figCap">კამათლები 2, 3 და 5: ჯამები — 2, 3, 5, 7, 8 და 10. ხუთუჯრიანი გზა 5-იანით ან 2 + 3-ით იკავება — ყოველ უჯრაზე ურემი დგება.</p></div>${marksBox}</div>
</div>${rulesFoot(1)}`, 'rulesP');
const rulesPage2 = page(`${stripe(NO, 'წესები · 2')}<div class="rulesWrap"><div class="rules">${rulesList(RULES.slice(6, 12), 7)}
<div class="figBox"><h3>აბაზი კამათელს ცვლის</h3>${abaziFigure}<p class="figCap">ერთი აბაზით 5 ექვსიანად იქცა: ჯამებში ახლა 6, 9 და 11-იც არის, ექვსიანი კი ზღვის გზასაც ხსნის — მაგ., ბათუმი — ტრაპიზონი (6 უჯრა).</p></div>
<div class="figBox"><h3>ამინდი მთაში, წყნარი ზღვა</h3>${weatherFigure}<p class="figCap">4, 4, 2: წყვილი არის — მთის გზა 2, 4, 6, 8 ან 10 უჯრისა იხსნება. 6, 1, 3: ექვსიანი არის — ზღვისა და მდინარის გზა 1, 3, 4, 6, 7, 9 ან 10 უჯრისა.</p></div>
<div class="figBox"><h3>სტუმარი</h3>${guestFigure}<p class="figCap">ოქროსფერმა ახალი გზა ღვინისფრის ქარვასლის ქალაქში შემოიყვანა — ღვინისფერი ბანკიდან ${Q.GUEST} აბაზს იღებს.</p></div>
<div class="figBox"><h3>ორმაგი გზა</h3>${doubleFigure}<p class="figCap">ერთი ზოლი ოქროსფერმა დაიკავა. ${Q.MIN_Q}–3 მოთამაშით მეორე დაკეტილია; 4–5 მოთამაშით მას სხვა სახლი იკავებს — ოქროსფერი კი არა.</p></div>
</div></div>${rulesFoot(2)}`, 'rulesP');
const rulesPage3 = page(`${stripe(NO, 'წესები · 3')}<div class="rulesWrap"><div class="rules">${rulesList(RULES.slice(12), 13)}
<div class="figBox"><h3>ქალაქი ვის რჩება</h3>${cityFigure}<p class="figCap">ქალაქის ფასი 3. ოქროსფერს 2 გზა შედის, ღვინისფერს — ერთი, მაგრამ მისი ქარვასლა ${Q.INN_WEIGHT} გზად ითვლება: 3 &gt; 2.</p></div>
<div class="figBox"><h3>ტვირთი სახეებით ითვლება</h3>${cargoFigure}<p class="figCap">ღვინისფრის ქარავანი ოთხ ქალაქშია: თაფლი ერთხელ, ღვინო ორჯერ — ეს 2 სახეა, ${Q.CARGO_PTS[2]} ქულა. ერთი სახე ორჯერ არ ითვლება.</p></div>
<div class="figBox"><h3>ქულების მაგალითი</h3><table class="t sx">${EXAMPLE.rows.map(([n, v]) => `<tr><td>${esc(n)}</td><td>${v}</td></tr>`).join('')}<tr class="sum"><td>ჯამი</td><td>${EXAMPLE.total}</td></tr></table>
<p class="figCap">ნინოს (ღვინისფერი) გზები: თბილისი — საგარეჯო — გურჯაანი — თელავი — ყვარელი და თბილისი — ბოლნისი; ქარვასლები საგარეჯოში, თელავსა და თბილისში. ყვარელში ოქროსფერსაც ერთი გზა შედის, ამიტომ ფასი იყოფა.</p></div>
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
<h3>რას ასწავლის</h3><p class="p9">საქართველოს გეოგრაფიას — 47 ქალაქი, მხარეები, მდინარეები, 13 მთის გზა და რვა ტვირთის სამშობლო; ისტორიას — XIX საუკუნის გზები, პირველი რკინიგზა, ძველი სახელები (ტფილისი, ქუთათისი, ყვირილა); ანგარიშს — კამათლების ჯამები, რამდენად ხშირია წყვილი და ექვსიანი, როდის ღირს აბაზის დახარჯვა.</p>
<h3>პირველი თამაშისთვის</h3><p class="p9">პირველად 2–3 მოთამაშით ითამაშეთ. პატარებთან მთისა და ზღვის წესი გამოტოვეთ — ყველა გზა ჩვეულებრივია. ბოლოს თითოეულმა თქვას, რომელ ქალაქებში იყო მისი ქარავანი — ქალაქების ამბავი ლექსიკონშია (ფურცელი 1, მეორე მხარე). ერთი თამაში 30–45 წუთს გრძელდება. ერთ ტელეფონზე ან კლასის ოთახშიც ითამაშება: აპში „თამაშები“ → „ქარავანი“.</p>
<h3>საზღვრის იქით</h3><p class="p9">${listAnd([...OUTSIDE].map(k => CITIES[k].name))} რუკაზე ქართული კულტურისა და ვაჭრობის ადგილებად არის, როგორც XIX საუკუნის მოგზაური ხედავდა — პოლიტიკის გარეშე. საზღვარი წყვეტილი ხაზითაა.</p>
<h3>რვა ტვირთი</h3><div class="goods8">${goodsByKind.map(({ k, cities }) => `<div>${badgeSvg(k, 9)}<span><b>${esc(GOODS[k].name)}</b> · ${esc(listAnd(cities.map(c => c.name)))}<br><i>${esc(GOODS[k].from)}</i></span></div>`).join('')}</div>
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
const glossaryPage = page(`${stripe(NO, 'ქალაქები')}<div class="rulesWrap">${head('47 ქალაქი')}
<p class="lead">ფრჩხილებში — XIX საუკუნის ან უფრო ძველი სახელი. წრეში — ქალაქის ფასი, ფერად ნიშანზე — მისი ტვირთი.</p>
<div class="gloss">${Object.values(CITIES).sort((a, b) => a.name.localeCompare(b.name, 'ka')).map(c => {
  const [old, t] = CITY_INFO[c.key];
  return `<p><span class="gm">${worthSvg(worthOf(c.key), 3.9, true)}${CARGO[c.key] ? badgeSvg(CARGO[c.key], 3.9, true) : ''}</span><b>${esc(c.name)}</b>${old ? ` <i>(${esc(old)})</i>` : ''} — ${esc(t)}</p>`;
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
  <div class="lead">XIX საუკუნის მიწურული: ძველი ქარავნის გზები და 47 ქალაქი — ბიჭვინთიდან ომალომდე. კამათლები გზას გიხსნის: გაიყვანე ქარავანი ქალაქიდან ქალაქში, ააშენე ქარვასლები, მოიპოვე ქალაქები და შეაგროვე რაც შეიძლება მეტი ტვირთის სახეობა.<br><b>${META}</b></div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th><th>✓</th></tr>
        <tr><td>წესები</td><td>4 გვ.</td><td>${no('rules1')}–${no('rules2')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ქალაქების ლექსიკონი</td><td>1 გვ.</td><td>${no('cover')}</td><td><span class="chk"></span></td></tr>
        <tr><td>დამხმარე ბარათი, 5 ფერი</td><td>5</td><td>${no('cards')}</td><td><span class="chk"></span></td></tr>
        <tr><td>„პირველი ქარავანი“</td><td>1</td><td>${no('cards')}</td><td><span class="chk"></span></td></tr>
        <tr><td>„რვა ტვირთი“ — რუკა</td><td>3</td><td>${no('cards')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ურმები, 5 ფერი</td><td>5 × 22</td><td>${no('figs')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ქარვასლები</td><td>5 × 4</td><td>${no('figs')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ცხოველები — ქულების ნიშნები</td><td>5</td><td>${no('figs')}</td><td><span class="chk"></span></td></tr>
        <tr><td>მოგზაურობის ნიშანი</td><td>2</td><td>${no('figs')}</td><td><span class="chk"></span></td></tr>
        <tr><td>აბაზი: 1 და 5</td><td>${COIN_VALUES.length - FIVES} + ${FIVES}</td><td>${no('coins')}</td><td><span class="chk"></span></td></tr>
        <tr><td>კამათელი — გასაკეცი</td><td>3</td><td>${no('coins')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ქულების ფურცელი</td><td>2 თამაში</td><td>${no('score')}</td><td><span class="chk"></span></td></tr>
        <tr><td>რუკა 78×56 სმ</td><td>8 ნაწ.</td><td>${no('map1')}–${no('map8')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ყუთის იარლიყი</td><td>1</td><td>${no('label')}</td><td><span class="chk"></span></td></tr>
      </table>
      <p class="small">სულ ${SHEETS.length} ფურცელი; ბარათი 63×88 მმ.</p>
      <div class="box legal"><b>წყარო და უფლებები.</b> „ქარავანი“ საგანძურის სკოლის საკუთარი თამაშია: წესები, რუკა, ქალაქები, ნახატები და ტექსტი სკოლისაა; რუკის საზღვრები — სკოლის აპის რუკიდან. მხოლოდ სკოლის შიდა, არაკომერციული გამოყენებისთვის — გასაყიდად არ ვრცელდება.</div>
      <h3 class="asmT">რუკის აწყობა: ზემოთ 1–4, ქვემოთ 5–8</h3>
      ${coverBoard(80)}
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b> („fit to page“ გამორთული). ჯერ ერთი საცდელი ფურცელი: ბარათი 63×88 მმ უნდა იყოს. რუკის ფურცლები ცალმხრივია — მეორე მხარე განზრახ ცარიელია.</li>
        <li>ქაღალდი: წესები და ქულების ფურცელი — ჩვეულებრივი; ბარათები, ფიგურები და აბაზი — 250–300 გ (ან 160 გ + მქრქალი ლამინაცია); რუკა — 160–200 გ. ქულების ფურცელს ყოველი თამაშისთვის ასლი გადაუღეთ.</li>
        <li>ბარათები და აბაზი ნიშნულებს შორის, დანით სახაზავთან ჭერით (უფროსები ჭრიან; სტამბაში ჭრაც შეუკვეთეთ).</li>
        <li>რუკა: თითო ნაწილი კუთხის ნიშნულებზე ამოჭერი, ნომრების რიგით მჭიდროდ მიადე ერთმანეთს და უკნიდან ქაღალდის ლენტით შეაერთე. მყარი დაფისთვის — 4 ნაწილი ერთ მუყაოზე, 4 მეორეზე: შუაზე დაიკეცება.</li>
        <li>ურმები და ქარვასლები ხაზებზე ჭრით; ცხოველები და ნიშნები — წრეზე, მაკრატლით. კამათლები მოკეცე და დააწებე — ან სამი ჩვეულებრივი აიღე.</li>
      </ol>
      <div class="covCards">${miniCardHtml(helpFront(PLAYERS[0]), 0.56)}${miniCardHtml(cargoFront, 0.56)}</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} №${NO}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');
const LID_VIEW = [22, 22, 736, 380];
const labelPage = page(`<div class="lbl lid"><svg width="190mm" height="${f(190 * LID_VIEW[3] / LID_VIEW[2])}mm" viewBox="${LID_VIEW.join(' ')}" style="display:block">${boardInner(LID_VIEW)}</svg>
<div class="lidBar"><div class="lt"><div class="aso big">${aso(title)}</div><div class="nm">ქარავანი</div></div>
<div class="rt"><div class="sub">საქართველოს გზები · XIX საუკუნის მიწურული</div><div class="meta">${META}</div><div class="ser">${esc(SERIES)} · №${NO} · ${esc(SCHOOL)}</div></div></div></div>
<div class="lbl list"><h3>ყუთში უნდა იყოს</h3><div class="items">
${['5 დამხმარე ბარათი', '„პირველი ქარავანი“', '3 ტვირთის რუკა', 'რუკა — 8 ნაწილი', '5 × 22 ურემი', '5 × 4 ქარვასლა', '5 ცხოველი, 2 ნიშანი', `${COIN_VALUES.length} აბაზი`, '3 კამათელი', 'ქულების ფურცელი', 'წესები და ლექსიკონი'].map(t => `<span><span class="chk"></span>${t}</span>`).join('')}</div></div>
${[0, 1].map(k => `<div class="lbl side s${k}"><span class="aso">${aso(title)}</span><b>ქარავანი</b><span>${META}</span></div>`).join('')}
<div class="lblNote">იარლიყი ყუთის სახურავზე და გვერდებზე; ჭრა — ხაზებზე.</div>`, 'labelP');
export const css = `
.card .cs{position:absolute;left:0;top:0}
.card.qh,.card.qf,.card.qg{background:none}
.hWho{position:absolute;left:5.6mm;right:5.6mm;top:12.6mm;height:6.4mm;display:flex;align-items:center;justify-content:center;gap:1.6mm;font-size:8.6pt;font-weight:700;color:${C.brown};white-space:nowrap}
.hWho svg{flex:none}
.steps{position:absolute;left:5.4mm;right:5.2mm;top:20.2mm;bottom:22.8mm;display:flex;flex-direction:column;justify-content:space-between}
.st{display:flex;gap:1.8mm;align-items:flex-start;font-size:8.4pt;line-height:1.2;color:${INK}}
.st .n{flex:none;width:5.4mm;height:5.4mm;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:9pt;margin-top:.1mm}
.st b{color:${C.wine}}
.hNote{position:absolute;left:5mm;right:5mm;bottom:5mm;line-height:1.24;text-align:center;font-size:8pt;font-style:italic;color:#6b5440;border-top:.25mm solid ${C.gold};padding-top:1.2mm}
.hNote b{font-style:normal;color:${C.wine}}
.hBody{position:absolute;left:5.8mm;right:5.8mm;top:14.2mm;bottom:5.4mm;font-size:8.7pt;line-height:1.26;color:${INK};display:flex;flex-direction:column;justify-content:space-between}
.hBody p{margin:0}
.hBody b{color:${C.wine}}
.hBody .hEnd{border-top:.25mm solid ${C.gold};padding-top:1.4mm;font-size:8.3pt}
table.hPts{width:100%;border-collapse:collapse;font-size:8.2pt;table-layout:fixed;margin-top:1mm}
table.hPts th,table.hPts td{border:.2mm solid ${C.line};text-align:center;padding:.5mm 0;line-height:1.1}
table.hPts th{width:9.4mm;background:${C.parch};color:${C.wine};font-size:7.4pt}
table.hPts b{color:${C.wine};font-size:9pt}
table.hMini th{width:17.5mm;text-align:left;padding-left:1mm}
.hBody .hEnd p{margin-top:1.2mm}
.fTop{position:absolute;left:6mm;right:6mm;top:13.6mm;text-align:center;font-weight:800;font-size:9.4pt;line-height:1.2;color:${C.wine}}
.fBot{position:absolute;left:6mm;right:6mm;top:65mm;bottom:5.2mm;display:flex;align-items:center;text-align:center;font-size:8pt;line-height:1.24;font-style:italic;color:#5a4330}
.gMap{position:absolute;left:5mm;top:14.5mm}
.gList{position:absolute;left:5.6mm;right:5mm;top:55mm;bottom:5.4mm;display:grid;grid-template-columns:1fr 1fr;align-content:space-between;gap:1.2mm 1.4mm}
.gList span{display:flex;align-items:center;gap:1.4mm;font-size:8.4pt;font-weight:700;color:${INK};white-space:nowrap}
.gWhere{position:absolute;left:5.4mm;right:5.2mm;top:14.2mm;display:flex;flex-direction:column;gap:1mm}
.gWhere p{margin:0;display:flex;gap:1.6mm;align-items:center;font-size:8.2pt;line-height:1.16;color:${INK}}
.gWhere svg{flex:none}
.gWhere b{color:${C.wine}}
.gNote{position:absolute;left:5.6mm;right:5.6mm;bottom:5mm;text-align:center;font-size:8pt;line-height:1.24;font-style:italic;color:#5a4330;border-top:.25mm solid ${C.gold};padding-top:1.2mm}
.scWrap{padding:4mm 10mm 0}
.scHead{display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid ${C.gold};padding-bottom:1.2mm}
.scHead .aso{font-size:15pt;color:${C.wine}}
.scHead b{font-size:13pt;color:${C.brown}}
.scHead span{margin-left:auto;font-size:9.5pt;color:${C.muted}}
.scHow{font-size:9.2pt;line-height:1.3;margin:1.6mm 0 2.2mm}
.scHow b{color:${C.wine}}
.scCols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4mm;align-items:start}
table.sc{border-collapse:collapse;width:100%;table-layout:fixed;font-size:9pt}
table.sc col.cnC{width:26.5mm}table.sc col.cwC{width:7.6mm}table.sc col.cgC{width:12mm}
table.sc th,table.sc td{border:.2mm solid ${C.line};height:6.35mm;padding:0 1mm;vertical-align:middle}
table.sc th{background:${C.parch};color:${C.wine};font-size:7.4pt;font-weight:700;text-align:center;padding:0}
table.sc .cn{text-align:left;white-space:nowrap;overflow:hidden;padding-left:1.4mm;font-size:8.4pt}
table.sc td.cw svg,table.sc td.cg svg{margin:0 auto}
table.sc tr:nth-child(odd) td{background:#faf5ea}
table.scSum{border-collapse:collapse;width:100%;table-layout:fixed;font-size:9.4pt;margin-top:3mm}
table.scSum th,table.scSum td{border:.2mm solid ${C.line};height:6.6mm;padding:0 1.6mm;vertical-align:middle}
table.scSum th{text-align:left;color:${C.brown};font-weight:700;background:${C.paper}}
table.scSum tr>th:first-child{width:52mm}
table.scSum tr:first-child th{height:7.4mm}
table.scSum tr.name td{height:8mm}
table.scSum tr.sum th,table.scSum tr.sum td{border-top:.5mm solid ${C.wine};color:${C.wine};font-size:10.4pt;height:8mm}
table.scSum tr.tie th{font-weight:400;color:${C.muted};font-size:8.8pt}
.scPts{font-size:9pt;line-height:1.3;margin:2mm 0 0;color:${C.brown}}
.scPts b{color:${C.wine}}
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
.goods8 i{color:${C.muted}}
.marks{display:grid;grid-template-columns:1fr 1fr;gap:1.8mm 3mm}
.marks>div{display:flex;align-items:center;gap:2mm;font-size:9.2pt;line-height:1.2;color:${INK}}
.marks b{color:${C.wine}}
.gloss{column-count:3;column-gap:6mm;font-size:10pt;line-height:1.32}
.gloss p{margin:0 0 2.2mm;break-inside:avoid}
.gloss .gm{display:inline-flex;gap:.6mm;margin-right:1.2mm;vertical-align:-.9mm}
.gloss .gm svg{display:block!important}
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
const CARDS = [...PLAYERS.map(helpFront), firstFront, cargoFront, cargoFront, cargoFront];
const CARD_BACKS = [...PLAYERS.map(helpBack), firstBack, cargoBack, cargoBack, cargoBack];
const SHEETS = [
  { key: 'cover', back: glossaryPage },
  { key: 'rules1', front: rulesPage1, back: rulesPage2 },
  { key: 'rules2', front: rulesPage3, back: rulesPage4 },
  { key: 'cards', front: cardSheet(CARDS, { label: 'ბარათები: 5 დამხმარე, „პირველი ქარავანი“, 3 ტვირთის რუკა' }), back: cardSheet(CARD_BACKS, { back: true, label: 'ბარათები — ზურგი' }) },
  { key: 'figs', front: figuresSheet(false), back: figuresSheet(true) },
  { key: 'coins', front: coinsSheet(false), back: coinsSheet(true) },
  { key: 'score', front: scorePage, back: scorePage },
  ...Array.from({ length: 8 }, (_, i) => ({ key: `map${i + 1}`, front: tilePage(i + 1) })),
  { key: 'label', front: labelPage },
];
if (CARDS.length !== 9) throw new Error('qaravani: the cards fill one sheet of nine');
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
