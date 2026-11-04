// „ოქროს ხანა“ (series №1) — the school's own game of riding, gathering and building on the songs map's 13 regions. Since
// 2026-11-04 it is no longer a copy of a known game: the rules are the app's (utils/okrosKhana.ts), and the kit reads its
// numbers, works and names from there and its colours from pages/games/okros/look.tsx, so paper and phone stay one game.
// A board of four A4 pieces (56×39 cm: the regions tinted by their good, each with its mark, two estate places, the work's
// place and footprints on the borders, the year track and the points track), 12 work cards A6, 12 chronicle cards with the
// four houses', the first house's and the market's cards, 4 aid cards A6, the goods' chits, estates, markers, five folded
// figures, four rule pages and a box label.
import { C, SERIES, SCHOOL, aso, esc, icon, iconIn, corners, cardSheet, placedSheet, page, stripe, foot, duplex, sheetNo } from '../lib.js';
import { REGIONS, MINI, f } from '../regionMap.js';
import * as __d0 from '../../utils/okrosKhana';
import * as __d1 from '../../pages/games/okros/look';

const {
  WORKS, REGION_GOOD, REGION_NAMES, REGION_IN, GOOD_NAMES, TBILISI, ESTATE_COST, FEAST_COST, ESTATE_PTS, FEAST_PTS, KING_FEAST,
  GUEST_PTS, BASE, HAND_MAX, RIDE, ESTATES, PLACES, OPEN_WORKS, MIN_OK, MAX_OK, yearsFor, needCount, NEAR,
  GOOD_LOOK, HOUSES, MARKET, GOLD, DEEP,
} = ({ ...__d0, ...__d1 });

export const id = 'okros-khana';
export const title = 'ოქროს ხანა';
const NO = 1;
const META = `${MIN_OK}–${MAX_OK} მოთამაშე · 8 წლიდან · 40–70 წუთი`;
const YEARS = [2, 3, 4].map(n => [n, yearsFor(n)]);

// ---------- the goods: the app's colours (look.tsx) and the same lucide marks ----------
const GOOD_ICON = ['tree-pine', 'brick-wall', 'wheat', 'grape', 'coins'];
const GL = GOOD_LOOK.map((l, k) => ({ color: l.color, tint: l.tint, ink: l.ink, name: GOOD_NAMES[k], icon: GOOD_ICON[k] }));
const goodOf = r => REGION_GOOD[r];
const tintOf = r => (goodOf(r) < 0 ? '#ecd9c4' : GL[goodOf(r)].tint);
const regionsOf = k => REGION_NAMES.filter((_, r) => goodOf(r) === k);
const needList = w => w.need.flatMap((n, k) => Array(n).fill(k));
const costList = cost => cost.flatMap((n, k) => Array(n).fill(k));

/** a good's chip (HTML) */
const chip = (k, s = 6) => `<span class="chip" style="background:${GL[k].color};width:${s}mm;height:${s}mm">${icon(GL[k].icon, { size: s * 0.64, color: '#fff', width: 2.1 })}</span>`;
const chips = (list, s) => list.map(k => chip(k, s)).join('<i class="plus">+</i>');
/** the board's footprint mark, in a line of text */
const FOOT_MARK = `<span class="fm">${icon('footprints', { size: 3.3, color: C.brown, width: 2.1 })}</span>`;
/** the same inside an SVG drawn in mm */
const chipIn = (k, x, y, s = 5.4) => `<rect x="${f(x)}" y="${f(y)}" width="${s}" height="${s}" rx="${f(s * 0.22)}" fill="${GL[k].color}" stroke="#fffaf0" stroke-width=".35"/>${iconIn(GL[k].icon, { x: f(x + s * 0.18), y: f(y + s * 0.18), size: f(s * 0.64), color: '#fff', width: 2.2 })}`;

// a rider (the app's mark: head and shoulders) and an estate (a house), in their own units
const RIDER_D = 'M12 2.6a4.6 4.6 0 1 1 0 9.2a4.6 4.6 0 1 1 0-9.2ZM4.6 22c0-6.4 3.4-9.1 7.4-9.1s7.4 2.7 7.4 9.1Z';
const HOUSE_D = 'M.6 6.6L7.5.6L14.4 6.6V14.4H.6Z';
const houseIn = (x, y, s, fill, { door = true, line = '#fffaf0', dash = false, stroke = null } = {}) => {
  const k = s / 15;
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(k)})"><path d="${HOUSE_D}" fill="${fill}" stroke="${stroke ?? line}" stroke-width="${dash ? 0.7 : 0.9}" stroke-linejoin="round"${dash ? ' stroke-dasharray="1.6 1.2"' : ''}/>${door ? `<rect x="6.1" y="9.4" width="2.8" height="5" fill="${line}"/>` : ''}</g>`;
};

/** the small map: every region in its good's tint, one region (`hl`) in `color` with a mark at its plate */
const mini = (hl, color, { mark = null, markColor = '#fff' } = {}) => {
  const [mx, my] = anchorOf(hl);
  return `<svg viewBox="-8 -8 1016 545" style="display:block;width:100%;height:auto">${REGIONS.map((r, i) =>
    `<path d="${MINI[r.id]}" fill="${i === hl ? color : tintOf(i)}" stroke="#fffaf0" stroke-width="7" stroke-linejoin="round"/>`).join('')}
${mark ? `<circle cx="${mx}" cy="${my}" r="44" fill="${color}" stroke="#fffaf0" stroke-width="8"/>${iconIn(mark, { x: mx - 27, y: my - 27, size: 54, color: markColor, width: 2.2 })}` : ''}</svg>`;
};

// ---------- the board: 560×390 mm in four A4 pieces of 280×195 (two rows of two) ----------
const BW = 560, BH = 390, S = 0.54, MX = 10, MY = 44;
const SEAM_X = 280, SEAM_Y = 195;
const bx = x => MX + x * S, by = y => MY + y * S;
const halo = w => `paint-order="stroke" stroke="#fffaf0" stroke-width="${w}" stroke-linejoin="round"`;
const txt = (s, x, y, o = {}) => `<text x="${f(x)}" y="${f(y)}" text-anchor="${o.anchor ?? 'middle'}" font-family="${o.font ?? 'SerifKa'}" font-size="${o.size ?? 3.6}" font-weight="${o.weight ?? 700}" fill="${o.fill ?? C.brown}"${o.halo ? ` ${halo(o.halo)}` : ''}${o.style ? ` style="${o.style}"` : ''}>${esc(s)}</text>`;

// where a region's plate stands (map units): its label point, moved off the pieces' seams (x 500, y 280) and into narrow land
const AT = { 0: [190, 112], 3: [440, 206], 4: [426, 322], 5: [300, 325], 6: [292, 404], 7: [452, 440], 8: [592, 322], 9: [640, 462], 10: [716, 238], 12: [714, 398] };
function anchorOf(r) { return AT[r] ?? REGIONS[r].label; }

// the footprints on the borders: the middle of the longest stretch of one region's outline lying on its neighbour's
const POLY = REGIONS.map(r => [...r.d.matchAll(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g)].map(m => [+m[1], +m[2]]));
const segDist = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
};
const onPoly = (p, poly) => poly.some((q, i) => segDist(p, q, poly[(i + 1) % poly.length]) < 2.5);
const crossing = (a, b) => {
  const A = POLY[a], on = A.map(p => onPoly(p, POLY[b])), n = A.length;
  if (!on.some(Boolean)) return null;
  let best = [], run = [];
  for (let k = 0; k < 2 * n; k++) {
    const i = k % n;
    if (on[i]) { run.push(A[i]); if (run.length > best.length && run.length <= n) best = [...run]; } else run = [];
  }
  let L = 0;
  const cum = best.map((p, i) => (L += i ? Math.hypot(p[0] - best[i - 1][0], p[1] - best[i - 1][1]) : 0));
  const i = cum.findIndex(c => c >= L / 2);
  return best[Math.max(0, i)];
};
// hand-placed (map units, points of the two outlines) where the border's middle is crowded by a plate, a seam or Tbilisi
const CROSS_AT = { '0-2': [237, 223], '1-3': [481, 179], '2-4': [356, 234], '2-5': [252, 292], '4-8': [519, 310], '5-6': [341, 360], '9-10': [667, 388] };
const PAIRS = REGIONS.flatMap((_, a) => NEAR[a].filter(b => b > a).map(b => [a, b]));

const TB = (() => { const [x, y] = anchorOf(TBILISI); return { x: bx(x), y: by(y), r: 15 }; })();
const footAt = (a, b) => {
  const key = `${a}-${b}`;
  if (CROSS_AT[key]) return CROSS_AT[key].map((v, i) => (i ? by(v) : bx(v)));
  if (a === TBILISI || b === TBILISI) {
    // Tbilisi's three: on its plate's rim, toward the neighbour
    const o = a === TBILISI ? b : a, [ox, oy] = anchorOf(o);
    const dx = bx(ox) - TB.x, dy = by(oy) - TB.y, d = Math.hypot(dx, dy);
    return [TB.x + (dx / d) * (TB.r + 1.2), TB.y + (dy / d) * (TB.r + 1.2)];
  }
  const p = crossing(a, b) ?? crossing(b, a);
  return p ? [bx(p[0]), by(p[1])] : null;
};
const footprint = (x, y) => `<g transform="translate(${f(x)} ${f(y)})"><circle r="3.5" fill="#fffaf0" stroke="${C.brown}" stroke-width=".35"/>${iconIn('footprints', { x: -2.45, y: -2.45, size: 4.9, color: C.brown, width: 2 })}</g>`;

/** a region's plate: the work's place, the good's mark, two estate places, the name */
const nameLinesOf = r => (REGION_NAMES[r].includes('-') ? REGION_NAMES[r].replace('-', '-\n').split('\n') : [REGION_NAMES[r]]);
const PLATE = { castleDy: -13.4, houseDx: 15.4, nameDy: 10.6, half: 23, top: 20, bottom: 13, line: 4.4 };
const plateBox = r => {
  const [ux, uy] = anchorOf(r), X = bx(ux), Y = by(uy), lines = nameLinesOf(r).length;
  return { X, Y, x0: X - PLATE.half, x1: X + PLATE.half, y0: Y - PLATE.top, y1: Y + PLATE.bottom + (lines - 1) * PLATE.line };
};
const plate = r => {
  const { X, Y } = plateBox(r), L = GL[goodOf(r)];
  const castle = `<circle cx="${f(X)}" cy="${f(Y + PLATE.castleDy)}" r="6.4" fill="#fffaf0" fill-opacity=".9" stroke="${DEEP}" stroke-width=".4" stroke-dasharray="1.3 1"/>${iconIn('castle', { x: X - 3.6, y: Y + PLATE.castleDy - 3.6, size: 7.2, color: DEEP, width: 1.6, opacity: 0.45 })}`;
  const houses = [-1, 1].map(s => houseIn(X + s * PLATE.houseDx - 7.6, Y - 7.4, 15.2, '#fffaf0', { door: false, dash: true, stroke: '#7d6a58' })).join('');
  const badge = `<circle cx="${f(X)}" cy="${f(Y)}" r="6.2" fill="${L.color}" stroke="#fffaf0" stroke-width="1.1"/>${iconIn(L.icon, { x: X - 4, y: Y - 4, size: 8, color: '#fff', width: 2.1 })}`;
  const names = nameLinesOf(r).map((l, k) => txt(l, X, Y + PLATE.nameDy + k * PLATE.line, { size: 4.3, weight: 800, halo: 1.3 })).join('');
  return castle + houses + badge + names;
};
const tbilisiPlate = () => {
  const { x, y, r } = TB;
  return `<circle cx="${f(x)}" cy="${f(y + 0.8)}" r="${r}" fill="#6b4423" opacity=".22"/>
<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${MARKET.tint}" stroke="${MARKET.color}" stroke-width="1"/>
<circle cx="${f(x)}" cy="${f(y)}" r="${r - 1.8}" fill="none" stroke="${GOLD}" stroke-width=".35"/>
${iconIn('store', { x: x - 4.2, y: y - 11.4, size: 8.4, color: MARKET.color, width: 1.9 })}
${txt('თბილისი', x, y + 2.6, { size: 4.1, weight: 800, fill: MARKET.color })}
${txt(`ნებისმიერი ${BASE}`, x, y + 6.8, { size: 2.8, weight: 700, fill: C.brown })}
${txt('აქ იწყება', x, y + 10.4, { size: 2.4, weight: 400, fill: '#7a6a58' })}`;
};

const compass = (x, y) => `<g transform="translate(${x} ${y})"><circle r="8" fill="#fffaf0" stroke="${C.gold}" stroke-width=".45"/>
<path d="M0 -6.4 L2.2 0 L0 1.3 L-2.2 0 Z" fill="${C.wine}"/><path d="M0 6.4 L2.2 0 L0 1.3 L-2.2 0 Z" fill="${C.gold}" opacity=".7"/>
${txt('ჩ', 0, -9.8, { size: 3.8, weight: 800, fill: C.wine })}</g>`;
/** a row of small peaks (the Caucasus over the map's north) */
const ridge = (x, y, n) => Array.from({ length: n }, (_, k) => { const px = x + k * 12.4, hh = 7 + ((k * 37) % 5); return `<path d="M${f(px)} ${y}l${f(6.2)} ${f(-hh)}l${f(6.2)} ${f(hh)}" fill="#e6dccb" stroke="#b9a78f" stroke-width=".45" stroke-linejoin="round"/><path d="M${f(px + 4.4)} ${f(y - hh * 0.72)}l${f(1.8)} ${f(-hh * 0.28)}l${f(1.8)} ${f(hh * 0.28)}" fill="#fffaf0" stroke="none"/>`; }).join('');
const waves = (x, y) => [0, 1, 2].map(k => `<path d="M${f(x + k * 3.4)} ${f(y + k * 4.6)} q3.4 -2 6.8 0 t6.8 0 t6.8 0" fill="none" stroke="#7d9cbc" stroke-width=".5" stroke-linecap="round"/>`).join('');

// the years: twelve circles in the north-east, the last year of each table marked
const YEAR_ROW = { x0: 302, step: 21.4, y: 84, r: 8.6 };
const NUMERALS = ['ა', 'ბ', 'გ', 'დ', 'ე', 'ვ', 'ზ', 'ჱ', 'თ', 'ი', 'ია', 'იბ'];
const yearTrack = () => {
  const { x0, step, y, r } = YEAR_ROW;
  const ends = Object.fromEntries(YEARS.map(([n, y]) => [y, n]));
  const circles = NUMERALS.map((nm, i) => {
    const x = x0 + i * step, end = ends[i + 1];
    return `<circle cx="${f(x)}" cy="${y}" r="${r}" fill="${end ? '#f7e9ad' : '#fffaf0'}" stroke="${end ? C.wine : C.gold}" stroke-width="${end ? 0.7 : 0.45}"/>
${txt(String(i + 1), x, y + 1.6, { size: 6, weight: 800, fill: end ? C.wine : C.brown })}
${txt(aso(nm), x, y + 5.6, { font: 'SansKa', size: 2.4, weight: 900, fill: C.goldDark })}
${end ? `${iconIn('flag', { x: x - 2.6, y: y + r + 1.6, size: 5.2, color: C.wine, width: 2 })}${txt(`${end} სახლი`, x, y + r + 10.6, { size: 3, weight: 800, fill: C.wine })}${txt('ბოლო წელი', x, y + r + 14, { size: 2.5, weight: 400, fill: C.wine })}` : ''}`;
  }).join('');
  return `${iconIn('hourglass', { x: x0 - r, y: 58.6, size: 7, color: C.wine, width: 2 })}${txt('წლები', x0 - r + 9, 65, { anchor: 'start', size: 6.2, weight: 800, fill: C.wine })}
${txt('ყოველ წელს მეფე სხვა კუთხეშია — მატიანის ბარათი ამბობს, სად.', x0 + 34 - r, 64.6, { anchor: 'start', size: 3.4, weight: 400, fill: '#6a5848' })}
${circles}
${txt('წლის ნიშანი აქ დგას. როცა რიგი პირველ სახლს დაუბრუნდება, წელი სრულდება:', x0 - r, 117, { anchor: 'start', size: 3.3, weight: 400 })}
${txt('ნიშანი ერთით წინ, მატიანის ახალი ბარათი — და მეფე ახალ კუთხეშია.', x0 - r, 121.4, { anchor: 'start', size: 3.3, weight: 400 })}`;
};

// how a turn goes, on the sea (lines short enough for the panel; costs and points in a column of their own)
const PANEL = { x: 14, y: 201, w: 102, h: 126 };
const howPanel = () => {
  const { x, y, w, h } = PANEL, L = x + 4.5, T = x + 12, C2 = x + 50, R = x + w - 4;
  const step = (n, yy, head) => `<circle cx="${f(L + 2.9)}" cy="${f(yy - 1.4)}" r="3.4" fill="${C.wine}"/>${txt(String(n), L + 2.9, yy, { size: 4, weight: 800, fill: '#fffaf0' })}${txt(head, T, yy + 0.2, { anchor: 'start', size: 4.4, weight: 800, fill: C.wine })}`;
  const line = (s, yy, o = {}) => txt(s, o.x ?? T, yy, { anchor: o.anchor ?? 'start', size: o.size ?? 3.3, weight: o.weight ?? 400, fill: o.fill ?? C.brown });
  const deed = (yy, iconName, head, cost, pts, note) => `<circle cx="${f(T + 2.6)}" cy="${f(yy - 1.6)}" r="3.1" fill="${DEEP}"/>${iconIn(iconName, { x: T + 0.4, y: yy - 3.8, size: 4.4, color: GOLD, width: 2 })}
${txt(head, T + 7, yy, { anchor: 'start', size: 3.6, weight: 800, fill: C.brown })}${cost.map((k, i) => chipIn(k, C2 + i * 6.3, yy - 4.4, 5.4)).join('')}
${line(pts, yy, { x: R, anchor: 'end', size: 3.4, weight: 800, fill: C.wine })}${line(note, yy + 4.6, { x: T + 7, size: 3.1 })}`;
  const out = [`<rect x="${x + 0.7}" y="${y + 1}" width="${w}" height="${h}" rx="3" fill="#6b4423" opacity=".16"/>
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#fffaf0" stroke="${C.gold}" stroke-width=".55"/>
<rect x="${x + 1.6}" y="${y + 1.6}" width="${w - 3.2}" height="${h - 3.2}" rx="2" fill="none" stroke="${C.gold}" stroke-width=".22"/>
${txt('შენი სვლა', x + w / 2, y + 10, { size: 5.4, weight: 800, fill: C.wine })}`];
  let yy = y + 20;
  out.push(step(1, yy, 'იარე'));
  out.push(line(`0, 1 ან ${RIDE} ნაბიჯი — მეზობელ კუთხეში:`, yy + 5.8));
  out.push(footprint(T + 2.4, yy + 11) + line('ეს ნიშანი საზღვარზეა. დარჩენაც შეიძლება.', yy + 12.2, { x: T + 7 }));
  yy += 21.4;
  out.push(step(2, yy, 'აიღე ამ კუთხის ნივთი'));
  out.push(line(`${BASE} · შენი მამულით +1 · მეფესთან +1`, yy + 5.8));
  out.push(line(`თბილისის ბაზარზე — ნებისმიერი ${BASE}.`, yy + 10.2));
  out.push(line(`ხელში ${HAND_MAX} ნივთზე მეტი არ გეჭიროს.`, yy + 14.6));
  yy += 24;
  out.push(step(3, yy, 'ერთი საქმე — ან არაფერი'));
  out.push(deed(yy + 8.4, 'house', 'მამული', costList(ESTATE_COST), `→ ${ESTATE_PTS} ქულა`, `${PLACES} ადგილი კუთხეში, შენი — ერთი.`));
  out.push(deed(yy + 21.4, 'castle', 'მეფის საქმე', [], 'ნივთი → 1 (მეფესთან 2)', 'ვინც ბოლო ყუთს შეავსებს — ბონუსი.'));
  out.push(deed(yy + 34.4, 'utensils', 'სუფრა', costList(FEAST_COST), `→ ${FEAST_PTS} (მეფესთან ${FEAST_PTS + KING_FEAST})`, `შენს მამულში; სტუმრებს +${GUEST_PTS}.`));
  yy += 50;
  const cw = (w - 8) / 5;
  out.push(GL.map((g, k) => `${chipIn(k, x + 4 + k * cw + cw / 2 - 2.9, yy - 4.6, 5.8)}${txt(g.name, x + 4 + k * cw + cw / 2, yy + 4.6, { size: 3.2, weight: 700 })}`).join(''));
  return out.join('\n');
};

// the points: 0–49 in two rows along the bottom (a box's edge on the seam), the marker turned over past 49
const SCORE = { x0: 49.6, w: 19.2, y0: 336, h: 15.4, gap: 1.6, per: 25 };
const scoreTrack = () => {
  const { x0, w, y0, h, gap, per } = SCORE, out = [];
  for (let n = 0; n < 2 * per; n++) {
    const row = Math.floor(n / per), col = n % per, x = x0 + col * w, y = y0 + row * (h + gap);
    const five = n % 5 === 0, ten = n % 10 === 0;
    out.push(`<rect x="${f(x + 0.3)}" y="${f(y)}" width="${f(w - 0.6)}" height="${h}" rx="1.6" fill="${ten ? '#f7e9ad' : five ? '#fbf3dc' : '#fffaf0'}" stroke="${ten ? C.wine : C.gold}" stroke-width="${ten ? 0.55 : 0.35}"/>
${txt(String(n), x + w / 2, y + h / 2 + 2, { size: ten ? 5.4 : 4.6, weight: ten ? 800 : 700, fill: ten ? C.wine : C.brown })}`);
  }
  const lx = 14, lw = x0 - 2 - lx, rx = x0 + per * w + 1.6, rw = BW - 14 - rx, H = 2 * h + gap;
  out.push(`<rect x="${lx}" y="${y0}" width="${f(lw)}" height="${f(H)}" rx="2" fill="${C.wine}"/>
${iconIn('trophy', { x: lx + lw / 2 - 3.8, y: y0 + 3, size: 7.6, color: '#f0d9a0', width: 1.8 })}
${txt('ქულები', lx + lw / 2, y0 + 17.4, { size: 4.6, weight: 800, fill: '#fffaf0' })}
${txt('ყოველი სახლის', lx + lw / 2, y0 + 23, { size: 2.6, weight: 400, fill: '#f0d9a0' })}
${txt('ნიშანი აქ დადის', lx + lw / 2, y0 + 26.4, { size: 2.6, weight: 400, fill: '#f0d9a0' })}
<rect x="${f(rx)}" y="${y0}" width="${f(rw)}" height="${f(H)}" rx="2" fill="#fffaf0" stroke="${C.wine}" stroke-width=".5"/>
${txt('50+', rx + rw / 2, y0 + 10.4, { size: 4.6, weight: 800, fill: C.wine })}
${iconIn('refresh-cw', { x: rx + rw / 2 - 3.6, y: y0 + 14.4, size: 7.2, color: C.wine, width: 2 })}
${txt('0-დან', rx + rw / 2, y0 + 28, { size: 2.8, weight: 700 })}`);
  return out.join('\n');
};

const BOARD = `<rect width="${BW}" height="${BH}" fill="#f8f0df"/>
<rect x="4" y="4" width="${BW - 8}" height="${BH - 8}" rx="3.4" fill="none" stroke="${C.gold}" stroke-width=".8"/>
<rect x="5.8" y="5.8" width="${BW - 11.6}" height="${BH - 11.6}" rx="2.4" fill="none" stroke="${C.gold}" stroke-width=".3"/>
${txt(aso(title), 16, 25, { anchor: 'start', font: 'SansKa', weight: 900, size: 12, fill: C.wine, style: 'letter-spacing:.06em' })}
${txt('მხედრები საქართველოს 13 კუთხეში · ნივთები, მამულები, სუფრები და მეფის დიდი საქმეები', 16, 35.4, { anchor: 'start', size: 4, weight: 400, fill: '#7a6a58' })}
${compass(538, 25)}
<g transform="translate(${MX + 1} ${MY + 1.4}) scale(${S})" fill="#6b4423" opacity=".2">${REGIONS.map(r => `<path d="${r.d}"/>`).join('')}</g>
<g transform="translate(${MX} ${MY}) scale(${S})">${REGIONS.map((r, i) => `<path d="${r.d}" fill="${tintOf(i)}" stroke="#fffaf0" stroke-width="3.2" stroke-linejoin="round"/>`).join('')}</g>
${ridge(168, 86, 9)}${txt('კავკასიონი', 222, 68, { size: 4.6, weight: 400, fill: '#8a7560', style: 'font-style:italic;letter-spacing:.18em' })}
${txt('შავი ზღვა', 64, 182.4, { size: 5.4, weight: 400, fill: '#5f7f9f', style: 'font-style:italic;letter-spacing:.12em' })}
${waves(34, 187)}${waves(76, 188.6)}
${PAIRS.map(([a, b]) => { const p = footAt(a, b); return p ? footprint(...p) : ''; }).join('')}
${REGIONS.map((_, r) => (r === TBILISI ? '' : plate(r))).join('')}
${tbilisiPlate()}
${yearTrack()}
${howPanel()}
${scoreTrack()}
${txt(`${aso(SERIES)} · №${NO}`, 16, 381, { anchor: 'start', font: 'SansKa', weight: 900, size: 3.4, fill: C.goldDark, style: 'letter-spacing:.08em' })}
${txt(SCHOOL, BW - 16, 381, { anchor: 'end', size: 3.4, weight: 400, fill: '#9a8b7b' })}`;

// nothing printed may lie across a seam, and a footprint never under a plate: the build stops if one does
const BOXES = REGIONS.map((_, r) => (r === TBILISI ? null : plateBox(r)));
BOXES.forEach((b, r) => {
  if (b && ((b.x0 < SEAM_X && b.x1 > SEAM_X) || (b.y0 < SEAM_Y && b.y1 > SEAM_Y))) throw new Error(`okros board: ${REGION_NAMES[r]}'s plate lies across a seam`);
});
for (const [a, b] of PAIRS) {
  const p = footAt(a, b);
  if (!p) throw new Error(`okros board: no border found between ${REGION_NAMES[a]} and ${REGION_NAMES[b]}`);
  const [x, y] = p, m = 3.6, name = `${REGION_NAMES[a]}–${REGION_NAMES[b]}`;
  if (Math.abs(x - SEAM_X) < m || Math.abs(y - SEAM_Y) < m) throw new Error(`okros board: the footprint ${name} lies across a seam`);
  // a plate = the work's circle on top + the band of houses, mark and name under it
  const under = BOXES.findIndex(bb => bb && (Math.hypot(x - bb.X, y - (bb.Y + PLATE.castleDy)) < 6.4 + m
    || (x > bb.x0 - m && x < bb.x1 + m && y > bb.Y - 7.6 - m && y < bb.y1 + m)));
  if (under >= 0) throw new Error(`okros board: the footprint ${name} lies under ${REGION_NAMES[under]}'s plate`);
  if (a !== TBILISI && b !== TBILISI && Math.hypot(x - TB.x, y - TB.y) < TB.r + 4.5) throw new Error(`okros board: the footprint ${name} lies on Tbilisi`);
}

const boardSvg = (view, width) => `<svg viewBox="${view.join(' ')}" width="${width}mm" height="${f(width * view[3] / view[2])}mm" style="display:block">${BOARD}</svg>`;
// a piece: the landscape A4 page (297×210) with the 280×195 window of the board, crop marks and where its neighbours join
const TILE = { w: 280, h: 195, x: 8.5, y: 7.5 };
const PIECE_NAME = ['ზედა მარცხენა', 'ზედა მარჯვენა', 'ქვედა მარცხენა', 'ქვედა მარჯვენა'];
const tileSvg = n => {
  const c = n % 2, r = Math.floor(n / 2), { x, y, w, h } = TILE, M = 5;
  const marks = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([cx, cy]) =>
    `<path d="M${cx < 100 ? cx - M - 1 : cx + 1} ${cy}h${M}M${cx} ${cy < 100 ? cy - M - 1 : cy + 1}v${M}"/>`).join('');
  const hint = (s, hx, hy, rot = 0) => `<text transform="translate(${hx} ${hy}) rotate(${rot})" text-anchor="middle" font-family="SerifKa" font-size="3" fill="#8a7a68">${esc(s)}</text>`;
  const hints = [
    c === 0 ? hint(`აქ ებმის ნაწილი ${n + 2} →`, x + w + 4.6, y + h / 2, 90) : hint(`← აქ ებმის ნაწილი ${n}`, x - 3, y + h / 2, -90),
    r === 0 ? hint(`↓ აქ ებმის ნაწილი ${n + 3}`, x + w / 2, y + h + 5) : hint(`↑ აქ ებმის ნაწილი ${n - 1}`, x + w / 2, y - 2.4),
  ].join('');
  return `<svg viewBox="0 0 297 210" width="297mm" height="210mm" style="position:absolute;left:0;top:0">
<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${c * w} ${r * h} ${w} ${h}">${BOARD}
<text x="${c * w + (c ? w - 9 : 9)}" y="${r * h + (r ? h - 9 : 12)}" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="4" fill="${C.goldDark}" opacity=".55">${n + 1}</text></svg>
<g stroke="#666" stroke-width=".25" fill="none">${marks}</g>${hints}</svg>`;
};
/** the landscape page turned onto the portrait one (the board's top edge on the page's left) */
const turned = svg => `<div style="position:absolute;left:0;top:0;width:297mm;height:210mm;transform-origin:0 0;transform:translate(0,297mm) rotate(-90deg)">${svg}</div>`;
const tileSheet = n => ({
  key: `board${n + 1}`,
  front: placedSheet([{ x: 0, y: 0, w: 210, h: 297, html: turned(tileSvg(n)) }], { label: `ოქროს ხანა · რუკა · ნაწილი ${n + 1}/4 (${PIECE_NAME[n]}) — ცალმხრივი`, cls: 'placed boardS' }),
});

// ---------- A6 cards (105×148.5, four a sheet, a 5 mm white edge) ----------
const A6W = 105, A6H = 148.5;
const a6 = (inner, { bg = C.paper, border = C.wine, cls = '' } = {}) => `<div class="a6 ${cls}"><div class="a6in" style="background:${bg};border-color:${border}">${inner}</div></div>`;
const a6Cuts = `<svg viewBox="0 0 210 297" width="210mm" height="297mm" style="position:absolute;left:0;top:0" stroke="#8a7a68" stroke-width=".25"><path d="M105 3V11M105 286V294M3 148.5H11M199 148.5H207M105 141V156M97.5 148.5H112.5"/></svg>`;
const a6Sheet = (cards, opts) => placedSheet([{ x: 0, y: 0, w: 210, h: 297, html: a6Cuts }, ...cards.map((html, i) => ({ x: (i % 2) * A6W, y: Math.floor(i / 2) * A6H, w: A6W, h: A6H, html }))], { ...opts, cls: 'placed a6sheet' });

// a work: where, what it needs (boxes the given goods are laid on), its bonus, its note
const needBoxes = w => {
  const list = needList(w), per = list.length > 4 ? 3 : 4;
  const rows = [];
  for (let i = 0; i < list.length; i += per) rows.push(list.slice(i, i + per));
  return rows.map(row => `<div class="nrow">${row.map(k => `<span class="nbox" style="background:${GL[k].tint};border-color:${GL[k].color}">${icon(GL[k].icon, { size: 8.6, color: GL[k].color, width: 1.8, style: 'opacity:.6' })}<em style="color:${GL[k].ink}">${esc(GL[k].name)}</em></span>`).join('')}</div>`).join('');
};
const workFront = w => a6(`<div class="wband"><div class="aso">${aso('მეფის დიდი საქმე')}</div><div class="wn fit"><span>${esc(w.name)}</span></div></div>
<div class="wbody">
  <div class="wwhere">${icon('map-pin', { size: 4.4, color: C.wine, width: 2.2 })}<b>${esc(REGION_NAMES[w.region])}</b><span>— აქ მიდიან და აქ აძლევენ</span></div>
  <div class="wmap">${mini(w.region, C.wine, { mark: 'castle' })}</div>
  <div class="wneedT">რა სჭირდება — ${needCount(w)} ნივთი. ჩადე ყუთებზე:</div>
  <div class="wneed">${needBoxes(w)}</div>
  <div class="wpts"><span class="medal"><b>+${w.bonus}</b>ბონუსი</span><span>ყოველი ნივთი — <b>1 ქულა</b>, მეფის კუთხეში — <b>2</b>. ვინც <b>ბოლო ყუთს</b> შეავსებს, ამ ბარათს იღებს და <b>+${w.bonus}</b>-ს.</span></div>
  <div class="wnote">${esc(w.note)}</div>
</div>`, { border: DEEP, cls: 'work' });
const ringEmblem = (name, size, { bg, ring, ink }) => `<svg width="${size}mm" height="${size}mm" viewBox="-30 -30 60 60" style="display:block">
<circle r="28.5" fill="none" stroke="${ring}" stroke-width=".8"/><circle r="25.6" fill="none" stroke="${ring}" stroke-width=".4" stroke-dasharray="1.4 1.6"/>
<circle r="21.5" fill="${bg}" stroke="${ring}" stroke-width="1"/>${iconIn(name, { x: -12.5, y: -12.5, size: 25, color: ink, width: 1.5 })}</svg>`;
const workBack = a6(`<div class="cback">${corners(GOLD, 11, 4.5)}<div class="aso ck">${aso(title)}</div>${ringEmblem('castle', 48, { bg: DEEP, ring: GOLD, ink: GOLD })}<div class="cbn">მეფის დიდი საქმე</div><div class="cbs">${WORKS.length} ბარათი · ღიად ${OPEN_WORKS} დევს</div></div>`, { bg: DEEP, border: GOLD });

// four aid cards: the turn on the front, the points and the end behind
const band = (text, color, sub = '') => `<div class="band" style="background:${color}"><div class="aso">${aso(title)}</div><div class="bt">${esc(text)}</div>${sub ? `<div class="bs">${esc(sub)}</div>` : ''}</div>`;
const aidFront = i => a6(`${band('შენი სვლა', HOUSES[i].color, `${HOUSES[i].name} სახლი`)}<div class="a6body steps">
<div class="st"><span class="n" style="background:${HOUSES[i].color}">1</span><div><b>იარე</b> — 0, 1 ან ${RIDE} ნაბიჯი. ნაბიჯი მეზობელ კუთხეშია — საზღვარზე ${FOOT_MARK} ნიშანია. დარჩენაც შეიძლება.</div></div>
<div class="st"><span class="n" style="background:${HOUSES[i].color}">2</span><div><b>აიღე</b> ამ კუთხის ნივთი: <b>${BASE}</b>, შენი მამულით <b>+1</b>, მეფესთან <b>+1</b>. თბილისის ბაზარზე — ნებისმიერი ${BASE}. ხელში ${HAND_MAX}-მდე ეტევა.</div></div>
<div class="st"><span class="n" style="background:${HOUSES[i].color}">3</span><div><b>ერთი საქმე</b> — ან არაფერი:</div></div>
<div class="deed"><div class="dh">${icon('house', { size: 4.6, color: C.wine, width: 2 })}<b>მამული</b><span class="cost">${chips(costList(ESTATE_COST), 5.6)}</span><span class="pt">+${ESTATE_PTS}</span></div><p>კუთხეში ${PLACES} ადგილია, თითო სახლს — ერთი. თბილისში არა. სულ ${ESTATES} გაქვს.</p></div>
<div class="deed"><div class="dh">${icon('castle', { size: 4.6, color: C.wine, width: 2 })}<b>მეფის საქმე</b><span class="pt">+1 / ნივთი</span></div><p>აქაურ ღია საქმეს მიეცი მისთვის საჭირო ნივთები. მეფის კუთხეში +2 ნივთზე. ბოლო ყუთი = ბარათი და ბონუსი.</p></div>
<div class="deed"><div class="dh">${icon('utensils', { size: 4.6, color: C.wine, width: 2 })}<b>სუფრა</b><span class="cost">${chips(costList(FEAST_COST), 5.6)}</span><span class="pt">+${FEAST_PTS}</span></div><p>მხოლოდ შენს მამულში. მეფესთან +${FEAST_PTS + KING_FEAST}. ვინც ამ კუთხეშია, სტუმარია: +${GUEST_PTS}.</p></div>
</div>`, { border: HOUSES[i].color, cls: 'aid' });
const aidBack = i => a6(`${band('ქულები და დასასრული', HOUSES[i].color, `${HOUSES[i].name} სახლი`)}<div class="a6body pts">
<table class="t"><tr><td>მამული</td><td><b>${ESTATE_PTS}</b></td></tr>
<tr><td>ნივთი მეფის საქმეს</td><td><b>1</b> · მეფესთან <b>2</b></td></tr>
<tr><td>საქმე დაასრულე</td><td>ბარათის ბონუსი <b>+2…+4</b></td></tr>
<tr><td>სუფრა</td><td><b>${FEAST_PTS}</b> · მეფესთან <b>${FEAST_PTS + KING_FEAST}</b></td></tr>
<tr><td>სტუმარი სხვის სუფრაზე</td><td><b>${GUEST_PTS}</b></td></tr></table>
<div class="yrs"><b>წლები:</b> ${YEARS.map(([n, y]) => `${n} სახლი — <b>${y}</b>`).join(' · ')}</div>
<p><b>დასასრული:</b> ბოლო წლის ბოლო სვლის მერე, ან როცა მეფის ყველა საქმე დასრულდება.</p>
<p><b>იგებს</b> მეტი ქულა; ტოლობისას — მეტი დასრულებული საქმე, მერე — მეტი მამული.</p>
<p class="mini">მეფე ყოველ წელს სხვა კუთხეშია: იქ <b>+1</b> ნივთი, საქმე და სუფრა მეტად ფასობს.</p>
</div>`, { border: HOUSES[i].color, cls: 'aid' });

// ---------- the small cards (63×88): 12 chronicle cards, the four houses, the first house, the market ----------
const chronFront = r => `<div class="card chron"><div class="frame" style="border-color:${GOLD}"></div><div class="frame2"></div><div class="body">
<div class="ck aso">${aso('მეფის მატიანე')}</div>
<div class="crown">${icon('crown', { size: 8.4, color: '#3a2415', width: 2 })}</div>
<div class="cl">ამ წელს მეფე</div>
<div class="cn fit"><span>${esc(REGION_IN[r])}ა</span></div>
<div class="cmap">${mini(r, GOLD, { mark: 'crown', markColor: DEEP })}</div>
<div class="cgive">${chip(goodOf(r), 5.2)}<span>აქ <b>+1 ${esc(GL[goodOf(r)].name)}</b></span></div>
<div class="crule">საქმეს — <b>2</b> ქულა ნივთზე<br>სუფრა — <b>${FEAST_PTS + KING_FEAST}</b> ქულა</div>
</div></div>`;
const cardBack = (bg, ring, iconName, word, sub = '') => `<div class="card dark cb" style="background:${bg}"><div class="frame" style="border-color:${ring}"></div>${corners(ring, 8, 4.4)}
<div class="cbIn">${ringEmblem(iconName, 30, { bg, ring, ink: ring })}<div class="cbw" style="color:${ring}">${esc(word)}</div>${sub ? `<div class="cbs2">${esc(sub)}</div>` : ''}</div></div>`;
const chronBack = cardBack(C.wine, '#f0d9a0', 'crown', 'მატიანე', 'ყოველ წელს — ერთი');
const riderSvg = (color, size) => `<svg width="${size}mm" height="${size}mm" viewBox="0 0 24 24" style="display:block"><path d="${RIDER_D}" fill="${color}" stroke="#fffaf0" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
const houseSvg = (color, size) => `<svg width="${size}mm" height="${size}mm" viewBox="0 0 15 15" style="display:block">${houseIn(0, 0, 15, color)}</svg>`;
const houseFront = i => `<div class="card hcard"><div class="frame" style="border-color:${HOUSES[i].color}"></div><div class="frame2"></div>
<div class="hband" style="background:${HOUSES[i].color}"><span class="aso">${aso('სახლი')}</span><b>${esc(HOUSES[i].name)}</b></div>
<div class="body hb">
<div class="hfig">${riderSvg(HOUSES[i].color, 17)}${houseSvg(HOUSES[i].color, 13)}</div>
<div class="hlist"><p><b>1</b> მხედარი</p><p><b>${ESTATES}</b> მამული</p><p><b>1</b> ქულის ნიშანი</p></div>
<div class="hstart">დასაწყისში:<br>${chips(costList(ESTATE_COST), 5.4)}</div>
</div></div>`;
const houseBack = i => cardBack(HOUSES[i].color, '#fffaf0', 'user', `${HOUSES[i].name} სახლი`);
const firstFront = `<div class="card first"><div class="frame" style="border-color:${GOLD}"></div><div class="frame2"></div><div class="body">
<div class="ck aso">${aso('პირველი სახლი')}</div>
<div class="crown">${icon('hourglass', { size: 8, color: '#3a2415', width: 2 })}</div>
<div class="fn">წელი შენით იწყება</div>
<p>ეს ბარათი პირველ სახლთან დევს მთელი თამაში.</p>
<p>როცა რიგი ისევ მას მოუწევს, <b>წელი დასრულდა</b>: წლის ნიშანი ერთით წინ, მატიანის ახალი ბარათი — მეფე სხვა კუთხეშია.</p>
<p class="f2">ბოლო წლის მერე თამაში მთავრდება.</p>
</div></div>`;
const firstBack = cardBack('#c9a227', '#3a2415', 'hourglass', 'პირველი სახლი');
const marketFront = `<div class="card first"><div class="frame" style="border-color:${MARKET.color}"></div><div class="frame2"></div><div class="body">
<div class="ck aso" style="color:${MARKET.color}">${aso('თბილისის ბაზარი')}</div>
<div class="crown" style="background:${MARKET.tint};border-color:${MARKET.color}">${icon('store', { size: 8, color: MARKET.color, width: 2 })}</div>
<div class="fn">ნებისმიერი ${BASE} ნივთი</div>
<p>ვინც თბილისში დაასრულებს სვლას, რომელ ${BASE} ნივთსაც უნდა, იმას იღებს — ერთნაირს ან სხვადასხვას.</p>
<p>თბილისში მამული არ შენდება, სუფრა არ იშლება, მეფე არ ჩამოდის.</p>
<p class="f2">ერთ ნაბიჯზე: მთიანეთი, ქვემო ქართლი, კახეთი.</p>
</div></div>`;
const marketBack = cardBack(MARKET.color, '#f0d9a0', 'store', 'ბაზარი');

// ---------- the pieces: goods' chits (16 mm), estates, markers, five folded figures ----------
const CHIT = 16, PER_GOOD = 22, CHIT_COLS = 11;
const chitSvg = k => `<svg width="${CHIT}mm" height="${CHIT}mm" viewBox="0 0 16 16" style="display:block"><rect width="16" height="16" fill="${GL[k].color}"/>
<rect x="1.4" y="1.4" width="13.2" height="13.2" rx="2" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".35"/>${iconIn(GL[k].icon, { x: 3.1, y: 3.1, size: 9.8, color: '#fff', width: 2 })}</svg>`;
const spareChit = `<svg width="${CHIT}mm" height="${CHIT}mm" viewBox="0 0 16 16" style="display:block"><rect x=".4" y=".4" width="15.2" height="15.2" rx="2" fill="#fff" stroke="${C.gold}" stroke-width=".35" stroke-dasharray="1 .9"/><text x="8" y="8.4" font-size="2.2" fill="${C.muted}" text-anchor="middle" font-family="SerifKa">სათადა-</text><text x="8" y="11" font-size="2.2" fill="${C.muted}" text-anchor="middle" font-family="SerifKa">რიგო</text></svg>`;
const CHITS_X = (210 - CHIT_COLS * CHIT) / 2, CHITS_Y = 14;
const chitItems = () => {
  const list = GL.flatMap((_, k) => Array(PER_GOOD).fill(k));
  return list.map((k, i) => ({ x: CHITS_X + (i % CHIT_COLS) * CHIT, y: CHITS_Y + Math.floor(i / CHIT_COLS) * CHIT, w: CHIT, h: CHIT, html: chitSvg(k) }));
};
const chitRows = Math.ceil((GL.length * PER_GOOD) / CHIT_COLS);
const chitGrid = () => {
  const x0 = CHITS_X, y0 = CHITS_Y, x1 = x0 + CHIT_COLS * CHIT, y1 = y0 + chitRows * CHIT;
  const v = Array.from({ length: CHIT_COLS + 1 }, (_, i) => `M${x0 + i * CHIT} ${y0 - 4}V${y0 - 1}M${x0 + i * CHIT} ${y1 + 1}V${y1 + 4}`).join('');
  const h = Array.from({ length: chitRows + 1 }, (_, i) => `M${x0 - 4} ${y0 + i * CHIT}H${x0 - 1}M${x1 + 1} ${y0 + i * CHIT}H${x1 + 4}`).join('');
  return { x: 0, y: 0, w: 210, h: 297, html: `<svg viewBox="0 0 210 297" width="210mm" height="297mm" style="display:block" stroke="#777" stroke-width=".2"><path d="${v}${h}"/></svg>` };
};
const SPARE_Y = CHITS_Y + chitRows * CHIT + 7;
const spareItems = () => Array.from({ length: 6 }, (_, i) => ({ x: CHITS_X + i * (CHIT + 2), y: SPARE_Y, w: CHIT, h: CHIT, html: spareChit }));
const chitInfo = { x: CHITS_X, y: SPARE_Y + CHIT + 6, w: CHIT_COLS * CHIT, h: 40, html: `<div class="tokInfo"><b>ნივთები</b> — ${PER_GOOD}-${PER_GOOD}: ${GL.map(g => g.name).join(', ')}. ორივე მხარე ერთნაირია: ჭერი ზოლებზე, ქაღალდის საჭრელით ან მაკრატლით.<br><b>თუ რომელიმე შემოგელიათ</b>, მის ნაცვლად ნებისმიერი ნიშანი გამოდგება (ღილი, კენჭი) — ან სათადარიგო კვადრატი, ფერით შეღებილი.<br><b>„ბანკი“</b> — ხუთი გროვა მაგიდაზე: აქედან იღებენ და აქ აბრუნებენ.</div>` };

const disc = (d, fill, inner, { ring = '#fffaf0', stroke = null } = {}) => `<svg width="${d}mm" height="${d}mm" viewBox="0 0 ${d} ${d}" style="display:block;overflow:visible"><circle cx="${d / 2}" cy="${d / 2}" r="${d / 2 + 0.6}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width=".25"` : ''}/><circle cx="${d / 2}" cy="${d / 2}" r="${d / 2 - 1.1}" fill="none" stroke="${ring}" stroke-opacity=".6" stroke-width=".3"/>${inner}</svg>`;
const castleToken = disc(16, DEEP, iconIn('castle', { x: 3.2, y: 3, size: 9.6, color: GOLD, width: 1.8 }) + `<text x="8" y="14.3" font-size="1.9" fill="${GOLD}" text-anchor="middle" font-family="SerifKa">ღია საქმე</text>`, { ring: GOLD });
const scoreToken = (i, back) => disc(11, HOUSES[i].color, back
  ? `<text x="5.5" y="7.1" font-size="4.6" font-weight="800" fill="#fffaf0" text-anchor="middle" font-family="SerifKa">+50</text>`
  : `<g transform="translate(1.9 1.6) scale(.3)"><path d="${RIDER_D}" fill="#fffaf0"/></g>`);
const yearToken = back => disc(15, GOLD, back
  ? `<text x="7.5" y="9.2" font-size="5" font-weight="800" fill="#3a2415" text-anchor="middle" font-family="SerifKa">წელი</text>`
  : iconIn('hourglass', { x: 3.7, y: 2.4, size: 7.6, color: '#3a2415', width: 2 }) + `<text x="7.5" y="13" font-size="2.4" fill="#3a2415" text-anchor="middle" font-family="SerifKa">წელი</text>`, { ring: '#3a2415' });
const estateToken = i => `<svg width="15mm" height="15mm" viewBox="-.6 -.6 16.2 16.2" style="display:block;overflow:visible"><path d="${HOUSE_D}" fill="${HOUSES[i].color}" stroke="${HOUSES[i].color}" stroke-width="1.4" stroke-linejoin="miter"/><rect x="6.1" y="9.4" width="2.8" height="5" fill="#fffaf0"/><rect x="3" y="7.4" width="2" height="2" fill="#fffaf0" opacity=".8"/><rect x="10" y="7.4" width="2" height="2" fill="#fffaf0" opacity=".8"/><path d="${HOUSE_D}" fill="none" stroke="#3a3027" stroke-width=".18"/></svg>`;

// a figure folded from one strip: foot · face · face upside down · foot (the two faces glued back to back)
const STRIP = { w: 22, foot: 9, face: 28 };
const stripSvg = (bg, ink, face, word) => {
  const { w, foot: ft, face: fc } = STRIP, H = 2 * ft + 2 * fc;
  const side = (y, flip) => `<g transform="translate(0 ${y})${flip ? ` rotate(180 ${w / 2} ${fc / 2})` : ''}"><rect width="${w}" height="${fc}" fill="${bg}"/>${face}<text x="${w / 2}" y="${fc - 2.6}" font-size="${f(Math.min(2.9, (w - 2.6) / (word.length * 0.7)))}" font-weight="800" fill="${ink}" text-anchor="middle" font-family="SerifKa">${esc(word)}</text></g>`;
  return `<svg width="${w}mm" height="${H}mm" viewBox="0 0 ${w} ${H}" style="display:block"><rect width="${w}" height="${ft}" fill="#d9ccb0"/>${side(ft, false)}${side(ft + fc, true)}<rect y="${H - ft}" width="${w}" height="${ft}" fill="#d9ccb0"/>
<rect width="${w}" height="${H}" fill="none" stroke="#555" stroke-width=".25"/><g stroke="#777" stroke-width=".25" stroke-dasharray="1.6 1.2"><line x1="0" x2="${w}" y1="${ft}" y2="${ft}"/><line x1="0" x2="${w}" y1="${ft + fc}" y2="${ft + fc}"/><line x1="0" x2="${w}" y1="${H - ft}" y2="${H - ft}"/></g></svg>`;
};
const riderStrip = i => stripSvg(HOUSES[i].color, '#fffaf0', `<g transform="translate(3.6 2.2) scale(.62)"><path d="${RIDER_D}" fill="#fffaf0"/></g>`, HOUSES[i].name);
const kingStrip = stripSvg(GOLD, '#3a2415', iconIn('crown', { x: 3.4, y: 3, size: 15.2, color: '#3a2415', width: 1.8 }), 'მეფე');
const STRIP_H = 2 * STRIP.foot + 2 * STRIP.face;
const figureItems = back => {
  const items = [];
  // estates: a row a house, five and one spare
  HOUSES.forEach((_, i) => {
    for (let k = 0; k <= ESTATES; k++) items.push({ x: 16 + k * 18, y: 20 + i * 19, w: 15, h: 15, html: estateToken(i) });
  });
  // the markers beside them
  const mx = 132;
  HOUSES.forEach((_, i) => items.push({ x: mx + (i % 2) * 15, y: 20 + Math.floor(i / 2) * 15, w: 11, h: 11, html: scoreToken(i, back) }));
  items.push({ x: mx + 33, y: 20, w: 15, h: 15, html: yearToken(back) });
  for (let k = 0; k < 4; k++) items.push({ x: mx + (k % 2) * 21, y: 54 + Math.floor(k / 2) * 20, w: 16, h: 16, html: castleToken });
  // the five figures (one-sided: their backs stay white)
  if (!back) {
    [...HOUSES.map((_, i) => riderStrip(i)), kingStrip].forEach((html, k) => items.push({ x: 20 + k * 36, y: 118, w: STRIP.w, h: STRIP_H, html }));
    items.push({ x: 16, y: 118 + STRIP_H + 8, w: 178, h: 46, html: `<div class="tokInfo"><b>მამულები</b> (თითო ფერში ${ESTATES} + 1 სათადარიგო) და <b>ნიშნები</b> ორივე მხარეს ფერადია — ჭერი კონტურზე. <b>ქულის ნიშანი</b>: ზურგზე „+50“ — ორმოცდაცხრამეტის მერე გადააბრუნე და ქულების გზა თავიდან დაიწყე. <b>ღია საქმის ნიშანი</b> (3 + 1) რუკაზე, ღია საქმის ციხის ადგილზე დევს.<br><b>მხედრები და მეფე</b>: ზოლი წყვეტილ ხაზებზე მოკეცე — ორი ნახატი ზურგით ერთმანეთს მიაწებე, ფეხები გვერდებზე გაშალე. ზოლების ზურგი თეთრია.</div>` });
  }
  return items;
};

// ---------- rules: four pages ----------
const SETUP = [
  ['რუკა', 'ოთხი ნაწილი შეაერთეთ: 1 და 2 ზემოთ, 3 და 4 ქვემოთ (კიდეებზე წერია, რომელი რომელს ებმის). ნივთები ხუთ გროვად დააწყვეთ — ეს „ბანკია“.'],
  ['სახლები', `თითო მოთამაშე ერთ ფერს იღებს: სახლის ბარათს, მხედარს, ${ESTATES} მამულს, ქულის ნიშანს და სვლის ბარათს. მხედრები <b>თბილისში</b> დადეთ, ქულის ნიშნები — ქულების გზის <b>0</b>-ზე. ყველა იღებს 1 ხეს, 1 ქვას და 1 პურს.`],
  ['მეფის საქმეები', `${WORKS.length} საქმის ბარათი აურიეთ და პირქვე დადეთ. ${OPEN_WORKS} ამოაბრუნეთ და რუკის გვერდით დაალაგეთ; თითოს კუთხეში, ციხის ადგილზე, ღია საქმის ნიშანი დადეთ.`],
  ['მეფე და წლები', `მატიანის ${REGIONS.length - 1} ბარათი აურიეთ, ერთი ამოაბრუნეთ და მეფე იმ კუთხეში დადგით. წლის ნიშანი — წლების გზის <b>1</b>-ზე. თამაში გრძელდება: ${YEARS.map(([n, y]) => `${n} სახლი — ${y} წელი`).join(', ')}.`],
  ['ვინ იწყებს', 'ყველაზე უმცროსი იწყებს და „პირველი სახლის“ ბარათს იღებს. მერე რიგი საათის ისრის მიმართულებით მიდის.'],
];
const TURN = [
  ['იარე', `შენი მხედარი ${RIDE}-მდე ნაბიჯს გადის. ნაბიჯი მეზობელ კუთხეშია — იმაში, რომელთანაც საზღვარი აქვს საერთო (საზღვარზე ${FOOT_MARK} ნიშანია). შეგიძლია ადგილზეც დარჩე. ერთ კუთხეში რამდენი მხედარიც გინდა, დადგება.`],
  ['აიღე', `იმ კუთხიდან, სადაც გაჩერდი, ბანკიდან იღებ მის ნივთს: <b>${BASE}</b>; თუ აქ შენი მამულია — <b>+1</b>; თუ მეფე აქაა — <b>+1</b>. <b>თბილისის ბაზარზე</b> რომელ ${BASE} ნივთსაც გინდა, იმას იღებ — ერთნაირს ან სხვადასხვას. ხელში <b>${HAND_MAX}</b> ნივთზე მეტი არ გეჭიროს: რაც არ ეტევა, არ იღებ.`],
  ['ერთი საქმე', 'მერე იქვე, სადაც დგახარ, ერთ საქმეს აკეთებ — ან არაფერს (მაშინ სვლა დასრულდა):'],
];
const DEEDS = [
  ['მამული', `გადაიხადე ხე + ქვა + პური და ამ კუთხის თავისუფალ ადგილზე მამული დადე: <b>+${ESTATE_PTS}</b>. კუთხეში ${PLACES} ადგილია, თითო სახლს იქ მხოლოდ ერთი მამული აქვს; თბილისში არ შენდება. შენი მამული ამ კუთხეს ყოველთვის +1 ნივთს გაძლევს.`],
  ['მეფის საქმე', `თუ ამ კუთხეში საქმე ღიაა, მის ბარათზე დადე ნივთები, რომლებიც მას ჯერ კიდევ სჭირდება (ყუთზე მისი ნივთი). თითო ნივთი <b>1 ქულაა</b>, მეფის კუთხეში — <b>2</b>. ვინც <b>ბოლო ყუთს</b> შეავსებს, ბარათს თავისთან ინახავს და მის ბონუსს იღებს (+2…+4); ნივთები ბანკში ბრუნდება, ახალი საქმე ამოდის და ნიშანი მის კუთხეში გადადის.`],
  ['სუფრა', `მხოლოდ შენს მამულში: გადაიხადე პური + ღვინო — <b>+${FEAST_PTS}</b>, თუ მეფე აქაა — <b>+${FEAST_PTS + KING_FEAST}</b>. ყოველი სხვა მხედარი ამ კუთხეში სტუმარია და <b>+${GUEST_PTS}</b>-ს იღებს.`],
];
const FAQ = [
  ['ორ კუთხეში სიარულისას შუა კუთხიდანაც ვიღებ ნივთს?', 'არა — მხოლოდ იქიდან, სადაც გაჩერდი.'],
  ['ბარათზე ყველა ნივთი ერთად უნდა მივიტანო?', 'არა. რამდენიც გაქვს და რამდენიც სჭირდება — იმდენი. ქულა ყოველ მიტანილ ნივთზეა.'],
  ['სხვის სუფრაზე სტუმრად ყოფნა რამე მიჯდება?', `არაფერი: სტუმარი უბრალოდ +${GUEST_PTS} ქულას იღებს.`],
  ['რა ხდება, თუ ბანკში ნივთი გათავდა?', 'ნივთის ნაცვლად ნებისმიერი ნიშანი გამოიყენეთ (ღილი, კენჭი).'],
  ['მატიანის ბარათები გათავდა?', `${yearsFor(MIN_OK)} წელი ყველაზე გრძელი თამაშია — ბარათი სწორედ ეყოფა. მოკლე თამაშში ზოგი ბარათი ამოუღებელი რჩება.`],
  ['შეიძლება ერთ სვლაში ორი საქმე?', 'არა, მხოლოდ ერთი: ან მამული, ან საქმე, ან სუფრა.'],
];
const head = sub => `<div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">${esc(sub)}</div></div>`;
const rulesFoot = n => foot(`<span>${esc(title)} · წესები ${n}/4</span><span>${esc(SCHOOL)}</span>`);
const ol = (items, start = 1) => `<ol start="${start}">${items.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol>`;
// the board's marks for the legend, drawn as on the board
const markSvg = (box, inner, s) => `<svg viewBox="${box}" width="${s}mm" height="${s}mm" class="lgm">${inner}</svg>`;
const castleMark = s => markSvg('-7 -7 14 14', `<circle r="6.4" fill="#fffaf0" stroke="${DEEP}" stroke-width=".5" stroke-dasharray="1.3 1"/>${iconIn('castle', { x: -3.6, y: -3.6, size: 7.2, color: DEEP, width: 1.6, opacity: 0.45 })}`, s);
const placeMark = s => markSvg('-.4 -.4 16 16', houseIn(0, 0, 15.2, '#fffaf0', { door: false, dash: true, stroke: '#7d6a58' }), s);
const badgeMark = (k, s) => markSvg('-7 -7 14 14', `<circle r="6.2" fill="${GL[k].color}" stroke="#fffaf0" stroke-width="1.1"/>${iconIn(GL[k].icon, { x: -4, y: -4, size: 8, color: '#fff', width: 2.1 })}`, s);
const footMark = s => markSvg('-4 -4 8 8', footprint(0, 0), s);
// a piece of the board round რაჭა's plate, with its footprint toward სვანეთი
const LEGEND_R = 3;
const legendMap = () => {
  const { X, Y } = plateBox(LEGEND_R), ft = footAt(1, LEGEND_R);
  return `<svg viewBox="${f(X - 27)} ${f(Y - 23)} 56 37" width="48mm" height="${f(48 * 37 / 56)}mm" style="display:block"><rect width="${BW}" height="${BH}" fill="#f8f0df"/>
<g transform="translate(${MX} ${MY}) scale(${S})">${REGIONS.map((r, i) => `<path d="${r.d}" fill="${tintOf(i)}" stroke="#fffaf0" stroke-width="3.2" stroke-linejoin="round"/>`).join('')}</g>${ft ? footprint(...ft) : ''}${plate(LEGEND_R)}</svg>`;
};
const legend = () => `<div class="legend"><div class="lgMap">${legendMap()}</div><div class="lgList">
<p>${castleMark(5.6)}<span><b>ციხის ადგილი</b>ღია საქმის ნიშანს</span></p>
<p>${placeMark(5.6)}<span><b>მამულის ${PLACES} ადგილი</b>ორ სხვადასხვა სახლს</span></p>
<p>${badgeMark(goodOf(LEGEND_R), 5.6)}<span><b>კუთხის ნივთი</b>რას იღებ აქ</span></p>
<p>${footMark(5.6)}<span><b>საზღვარი</b>გზა მეზობლისკენ</span></p></div></div>`;
const turnStrip = () => `<div class="strip"><h3>სვლა მოკლედ <span>დაწვრილებით — მე-2 გვერდზე</span></h3><div class="sbox">
<div><i>1</i><b>იარე</b><p>${RIDE}-მდე ნაბიჯი მეზობელ კუთხეში ${FOOT_MARK} — ან დარჩი იქვე.</p></div>
<div><i>2</i><b>აიღე</b><p>კუთხის ნივთი: <b>${BASE}</b>, შენი მამული აქ — <b>+1</b>, მეფე აქ — <b>+1</b>. თბილისი: ნებისმიერი ${BASE}.</p></div>
<div><i>3</i><b>ერთი საქმე</b><p class="sd"><span>მამული</span><span>${chips(costList(ESTATE_COST), 4.6)}</span><em>+${ESTATE_PTS}</em></p>
<p class="sd"><span>მეფის საქმე</span><span>ნივთი</span><em>+1 · მეფე +2</em></p>
<p class="sd"><span>სუფრა</span><span>${chips(costList(FEAST_COST), 4.6)}</span><em>+${FEAST_PTS} · მეფე +${FEAST_PTS + KING_FEAST}</em></p></div></div>
<div class="sbox two"><div><i>${icon('hourglass', { size: 3.4, color: '#fffaf0', width: 2.4 })}</i><b>წლის ბოლოს</b><p>როცა ყველამ ერთხელ იარა: წლის ნიშანი ერთით წინ, მატიანის ახალი ბარათი ამოდის და მეფე იმ კუთხეში გადადის.</p></div>
<div><i>${icon('trophy', { size: 3.4, color: '#fffaf0', width: 2.4 })}</i><b>დასასრული</b><p>${YEARS.map(([n, y]) => `${n} სახლი — ${y}`).join(', ')} წელი, ან როცა მეფის ყველა საქმე დასრულდება. იგებს, ვისაც მეტი ქულა აქვს.</p></div></div></div>`;
const rulesPage1 = page(`${stripe(NO, 'წესები · 1')}<div class="rulesWrap">${head(`წესები · ${META}`)}
<p class="lead">XII საუკუნეა — <b>ოქროს ხანა</b>, დავით აღმაშენებლისა და თამარ მეფის დრო. თქვენ ქვეყნის დიდი სახლები ხართ — <b>წითელი, ლურჯი, ფირუზისფერი და შავი</b>. თქვენი მხედრები საქართველოს 13 კუთხეში დადიან: კუთხეებიდან ხეს, ქვას, პურს, ღვინოს და ოქროს აგროვებენ, მამულებს აშენებენ, სუფრებს შლიან და <b>მეფის დიდ საქმეებს</b> — ციხეებს, ხიდს, სასახლეს, აკადემიას — ეხმარებიან. მეფე ყოველ წელს სხვა კუთხეშია, და სადაც ის არის, იქ ყველაფერი მეტად ფასობს. ვინც ბოლოს მეტ ქულას დააგროვებს, ის იგებს.</p>
<div class="two2 first"><div><h3>მომზადება</h3>${ol(SETUP)}</div>
<div><h3>ნივთები და კუთხეები</h3><div class="goods">${GL.map((g, k) => `<p>${chip(k, 6.4)}<b>${esc(g.name)}</b><span>${regionsOf(k).map(esc).join(', ')}</span></p>`).join('')}
<p><span class="chip mk" style="background:${MARKET.color};width:6.4mm;height:6.4mm">${icon('store', { size: 4.1, color: '#fff', width: 2.1 })}</span><b>ბაზარი</b><span>თბილისი — ნებისმიერი ${BASE}</span></p></div>
<h3>კუთხე რუკაზე</h3>${legend()}</div></div>
${turnStrip()}</div>${rulesFoot(1)}`, 'rulesP');

const EXAMPLE = [
  'ნინო (წითელი) იმერეთშია, მეფე კახეთშია. ღიაა „გეგუთის სასახლე“ (იმერეთი) და „გორის ციხე“ (შიდა ქართლი).',
  'ნინო ერთ ნაბიჯს შიდა ქართლში გადადის და ბანკიდან 2 პურს იღებს. ხელში ახლა: 1 ხე, 2 ქვა, 3 პური, 1 ღვინო.',
  'საქმედ „გორის ციხეს“ 1 ხეს, 2 ქვას და 1 ღვინოს აძლევს — ეს ბარათის ოთხივე ყუთია. 4 ნივთი = 4 ქულა, დასრულებისთვის +2 — სულ 6. ბარათი ნინოსია, ახალი საქმე ამოდის.',
  'შემდეგ წელს მეფე შიდა ქართლში რომ ყოფილიყო, ნინო 3 პურს აიღებდა, ნივთები კი ორმაგად ჩაეთვლებოდა: 8 + 2 = 10.',
];
const rulesPage2 = page(`${stripe(NO, 'წესები · 2')}<div class="rulesWrap">${head('სვლა, მეფე და დასასრული')}
<div class="flow"><h3>სვლა — სამი ნაბიჯი</h3>
<p class="pp">თამაშს პირველი სახლი იწყებს, მერე რიგი საათის ისრის მიმართულებით მიდის. შენს სვლაზე სამ რამეს აკეთებ, ამ რიგით:</p>
<ol class="turn">${TURN.map(([h, t], i) => `<li><b>${h}.</b> ${t}${i === TURN.length - 1 ? `<ul class="deeds">${DEEDS.map(([dh, dt]) => `<li><b>${dh}.</b> ${dt}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ol>
<h3>მეფე და წლები</h3>
<p class="pp">წელიწადში ყოველი სახლი ერთხელ დადის — პირველი სახლიდან დაწყებული. როცა რიგი ისევ პირველ სახლს მოუწევს, <b>წელი სრულდება</b>: წლის ნიშანი ერთით წინ, მატიანის ახალი ბარათი ამოდის და მეფე იმ კუთხეში გადადის.</p>
<p class="pp">მეფის კუთხეში: <b>+1 ნივთი</b> შეგროვებისას, საქმის ნივთი <b>2 ქულაა</b>, სუფრა — <b>${FEAST_PTS + KING_FEAST}</b>. მეფე თბილისში არ ჩამოდის.</p>
<h3>დასასრული</h3>
<p class="pp">თამაში მთავრდება ბოლო წლის ბოლო სვლის მერე (${YEARS.map(([n, y]) => `${n} სახლი — ${y}`).join(', ')} წელი) ან მაშინვე, როცა მეფის ყველა საქმე დასრულდება.</p>
<p class="pp"><b>იგებს</b>, ვისაც მეტი ქულა აქვს. ტოლობისას — ვინც მეტი საქმე დაასრულა (ბარათები), მერე — ვინც მეტი მამული ააშენა; კვლავ ტოლობისას გამარჯვება საერთოა.</p>
<h3>ქულები ერთი შეხედვით</h3>
<table class="t"><tr><th>რა</th><th>ქულა</th></tr><tr><td>მამული</td><td>${ESTATE_PTS}</td></tr><tr><td>ნივთი მეფის საქმეს</td><td>1 · მეფესთან 2</td></tr><tr><td>საქმის დასრულება</td><td>ბარათის ბონუსი (+2…+4)</td></tr><tr><td>სუფრა</td><td>${FEAST_PTS} · მეფესთან ${FEAST_PTS + KING_FEAST}</td></tr><tr><td>სტუმარი სხვის სუფრაზე</td><td>${GUEST_PTS}</td></tr></table></div>
<h3 class="exH">მაგალითი</h3><div class="ex">${EXAMPLE.map(p => `<p>${esc(p)}</p>`).join('')}</div></div>${rulesFoot(2)}`, 'rulesP');

const rulesPage3 = page(`${stripe(NO, 'წესები · 3')}<div class="rulesWrap">${head('მეფის 12 დიდი საქმე — თითო კუთხეში')}
<div class="works">${WORKS.map(w => `<div class="wk"><div class="wkh"><b>${esc(w.name)}</b><span>${esc(REGION_NAMES[w.region])}</span><i>+${w.bonus}</i></div><div class="wkn">${chips(needList(w), 4.8)}</div><p>${esc(w.note)}</p></div>`).join('')}</div>
<p class="claude">საქმეებისა და კუთხეების ცნობები Claude-მა დაწერა — მასწავლებელს ჯერ არ შეუმოწმებია.</p></div>${rulesFoot(3)}`, 'rulesP');

const TIPS = [
  'მამული ადრე ააშენე: ყოველ მოსვლაზე +1 ნივთს იძლევა და სუფრის ადგილიცაა.',
  'უყურე მატიანეს: მეფის კუთხეში მიტანილი ნივთი ორმაგად ფასობს.',
  'სუფრა იქ გაშალე, სადაც სხვები არ არიან — ან, პირიქით, მეგობრებს ქულა აჩუქე.',
  'საქმის ბოლო ყუთს ყველა უმიზნებს: დაითვალე, ვინ მიუსწრებს.',
  'ხელში ბევრი ნივთი ნუ დაგიგროვდება: ზღვარს რომ მიაღწევ, კუთხე ვეღარაფერს მოგცემს.',
];
const GLOSS = [['მამული', 'მიწა და სახლი, რომელსაც სახლის (გვარის) ხალხი უვლის'], ['მატიანე', 'წლების ჩანაწერი — ვინ, სად, როდის'], ['სუფრა', 'ქართული ნადიმი, სადაც სტუმარი ღვთის მოვლენილია'], ['ბაზარი', 'ქალაქის მოედანი, სადაც ყველაფერი იყიდება'], ['ერისთავი', 'მეფის მიერ დანიშნული მხარის მმართველი']];
const rulesPage4 = page(`${stripe(NO, 'წესები · 4')}<div class="rulesWrap">${head('კითხვები, რჩევები, ვარიანტები')}
<div class="faq first"><h3>ხშირი კითხვები</h3><div class="qa">${FAQ.map(([q, a]) => `<p><b>${esc(q)}</b> ${esc(a)}</p>`).join('')}</div></div>
<div class="two2"><div><h3>რჩევები</h3><ul class="tips">${TIPS.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
<h3>ვარიანტები</h3>
<p class="pp"><b>მოკლე თამაში (ერთი გაკვეთილი):</b> ${YEARS.map(([n, y]) => `${n} სახლი — ${Math.ceil(y * 2 / 3)}`).join(', ')} წელი.</p>
<p class="pp"><b>გუნდებით:</b> 6–8 მოსწავლე ოთხ სახლად; გუნდი ერთად წყვეტს, ერთი მოსწავლე დადის.</p>
<p class="pp"><b>უმცროსებისთვის:</b> ხელში ნივთების ზღვარი არ არის, სტუმრის ქულა არ ითვლება — მხოლოდ მამული, საქმე და სუფრა.</p>
<p class="pp"><b>ტელეფონით:</b> აპში „ოქროს ხანა“ ონლაინაც თამაშდება (ყველა თავის ტელეფონზე) და ჰიბრიდულადაც — ერთი ტელეფონი მაგიდის შუაშია და ყველაფერს ითვლის.</p></div>
<div><h3>რას ასწავლის</h3><p class="pp"><b>გეოგრაფია:</b> 13 კუთხე, მათი მეზობლები და რას იძლევა თითოეული.</p>
<p class="pp"><b>ისტორია:</b> ოქროს ხანის ციხეები, სასახლე, ხიდი, აკადემია — სად დგას და რატომ აშენდა.</p>
<p class="pp"><b>ანგარიში:</b> ნივთების დათვლა, ხელის ზღვარი, ქულების შედარება.</p>
<p class="pp"><b>ხასიათი:</b> რამდენიმე სვლით წინ დაგეგმვა, საერთო საქმისთვის წვლილის შეტანა, სტუმართმოყვარეობა სუფრაზე.</p>
<h3>ძველი სიტყვები</h3><p class="gl">${GLOSS.map(([w, d]) => `<b>${w}</b> — ${d}`).join('; ')}.</p>
<h3>ქართული ასო-რიცხვები</h3><div class="nums">${NUMERALS.map((l, i) => `<span><b class="aso">${aso(l)}</b>${i + 1}</span>`).join('')}</div></div></div>
<div class="box credits"><b>წყარო და უფლებები.</b> „ოქროს ხანა“ საგანძურის სკოლის საკუთარი თამაშია შეგროვებისა და მშენებლობის ჟანრში: წესები, რუკა, სახელები და ნახატები სკოლისაა. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება. საქმეებისა და კუთხეების ცნობები Claude-მა დაწერა — მასწავლებელს ჯერ არ შეუმოწმებია.</div></div>${rulesFoot(4)}`, 'rulesP');

// ---------- cover and box label ----------
const assembly = () => `<div class="asm">${boardSvg([0, 0, BW, BH], 80)}<svg class="asmGrid" viewBox="0 0 ${BW} ${BH}"><path d="M${SEAM_X} 0V${BH}M0 ${SEAM_Y}H${BW}" stroke="${C.wine}" stroke-width="2.4" stroke-dasharray="9 6"/>${[0, 1, 2, 3].map(n => `<circle cx="${(n % 2) * 280 + 140}" cy="${Math.floor(n / 2) * 195 + 98}" r="28" fill="${C.wine}" opacity=".88"/><text x="${(n % 2) * 280 + 140}" y="${Math.floor(n / 2) * 195 + 113}" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="42" fill="#fffaf0">${n + 1}</text>`).join('')}</svg></div>`;
const coverPage = no => page(`${stripe(NO)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">ოქროს ხანა</h1>
  <div class="lead">მხედრები საქართველოს 13 კუთხეში: აგროვე ნივთები, ააშენე მამულები, გაშალე სუფრა და დაეხმარე მეფის დიდ საქმეებს.<br><b>${META}</b></div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th><th>✓</th></tr>
        <tr><td>წესები</td><td>4 გვ.</td><td>${no('rules1')}–${no('rules2')}</td><td><span class="chk"></span></td></tr>
        <tr><td>რუკა — 4 ნაწილი, 56×39 სმ</td><td>1</td><td>${no('board1')}–${no('board4')}</td><td><span class="chk"></span></td></tr>
        <tr><td>მეფის საქმის ბარათები (A6)</td><td>${WORKS.length}</td><td>${no('works1')}–${no('works3')}</td><td><span class="chk"></span></td></tr>
        <tr><td>მატიანე, სახლები, პირველი სახლი, ბაზარი</td><td>12 + 4 + 2</td><td>${no('cards1')}–${no('cards2')}</td><td><span class="chk"></span></td></tr>
        <tr><td>სვლის ბარათები (A6)</td><td>4</td><td>${no('aid')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ნივთები (16 მმ)</td><td>${GL.length * PER_GOOD} + 6*</td><td>${no('chits')}</td><td><span class="chk"></span></td></tr>
        <tr><td>მამულები, ნიშნები, მხედრები, მეფე</td><td>24 + 9 + 5</td><td>${no('figures')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ყუთის იარლიყი</td><td>1</td><td>${no('label')}</td><td><span class="chk"></span></td></tr>
      </table>
      <p class="small">* სათადარიგო. კამათელი არ სჭირდება — ყველაფერს არჩევანი წყვეტს.</p>
      <div class="box legal"><b>ჩვენი თამაში.</b> „ოქროს ხანა“ საგანძურის სკოლის საკუთარი თამაშია შეგროვებისა და მშენებლობის ჟანრში — წესები, რუკა და სახელები სკოლისაა. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის. საქმეების ცნობები Claude-მა დაწერა — მასწავლებელს ჯერ არ შეუმოწმებია.</div>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b> („fit to page“ გამორთული) — ყოველ ფურცელს თავისი ზურგი მოსდევს.</li>
        <li>ქაღალდი: წესები — ჩვეულებრივი; ბარათები და ნიშნები (${no('works1')}–${no('figures')}) — <b>250–300 გ მუყაო</b>. რუკის ოთხი ნაწილი ცალმხრივია: ჩვეულებრივ ქაღალდზე დაბეჭდე და 2 მმ მუყაოზე დააკარი.</li>
        <li>ჭრა: რუკა — წვრილ ნიშნულებზე, ლითონის სახაზავთან (უფროსები ჭრიან); A6 ბარათები — შუა ხაზებზე; პატარა ბარათები და ნივთები — ნიშნულებზე.</li>
        <li>მხედრები და მეფე: ზოლი მოკეცე, ორი ნახატი ზურგით მიაწებე, ფეხები გაშალე.</li>
      </ol>
      <h3 class="asmT">რუკის აწყობა</h3>
      ${assembly()}
      <p class="asmP">1 და 2 ზემოთ, 3 და 4 ქვემოთ — კიდეებზე წერია, რომელი რომელს ებმის. ზურგიდან ქაღალდის ლენტით შეაერთე. ზომა 56×39 სმ.</p>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} №${NO}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const labelPage = page(`<div class="lbl lid"><div class="lin">
<div class="lt"><div class="aso big">${aso(title)}</div><div class="nm">ოქროს ხანა</div><div class="sub">მხედრები 13 კუთხეში · მამულები · მეფის დიდი საქმეები</div><div class="meta">${esc(META)}</div><div class="ser aso">${aso(SERIES)} · №${NO}</div><div class="sch">${esc(SCHOOL)}</div></div>
<div class="map">${mini(TBILISI, MARKET.color)}</div></div></div>
<div class="lbl list"><h3>ყუთში უნდა იყოს</h3><div class="items">${['რუკა (4 ნაწილი)', `${WORKS.length} საქმის ბარათი`, '12 მატიანის ბარათი', '4 სახლის ბარათი', 'პირველი სახლი, ბაზარი', '4 სვლის ბარათი', `${GL.length * PER_GOOD} ნივთი`, '20 მამული (+4)', '4 მხედარი, მეფე', '9 ნიშანი', 'წესები (4 გვერდი)'].map(s => `<span><i class="chk"></i>${esc(s)}</span>`).join('')}</div></div>
${[0, 1].map(i => `<div class="lbl side s${i}"><span class="aso">${aso(title)}</span><b>ოქროს ხანა</b><span>${esc(META)}</span><span class="aso">№${NO}</span></div>`).join('')}
<div class="lblNote">იარლიყი ფოტოქაღალდის ან ფეხსაცმლის ყუთზე (≈A4): დიდი — სახურავზე, ზოლები — გვერდებზე. მთლიანი ხაზი იჭრება.</div>`, 'labelP');

export const css = `
.boardS .sheetLabel{top:1.5mm;font-size:7.5pt}
.chip{display:inline-flex;align-items:center;justify-content:center;border-radius:1.4mm;border:.3mm solid #fbf6ec;box-shadow:0 0 0 .2mm #0002;vertical-align:middle;flex:none}
.fm{display:inline-flex;align-items:center;justify-content:center;width:4.8mm;height:4.8mm;border-radius:50%;border:.25mm solid var(--brown);background:#fffaf0;vertical-align:-1.2mm}
.plus{font-style:normal;color:var(--muted);font-size:8pt;margin:0 .5mm;vertical-align:middle}
.a6{width:105mm;height:148.5mm;padding:5mm}
.a6in{position:relative;width:100%;height:100%;border:.8mm solid;border-radius:3mm;overflow:hidden}
.a6sheet .sheetLabel{top:146.6mm;left:14mm}
.band{color:#fbf6ec;text-align:center;padding:2.2mm 3mm 2.4mm}
.band .aso{font-size:8pt;color:#f0d9a0;letter-spacing:.14em}
.band .bt{font-weight:800;font-size:15pt;line-height:1.15}
.band .bs{font-size:9.4pt;opacity:.92}
.a6body{padding:3mm 4.2mm 0}
.steps .st{display:flex;gap:2.4mm;align-items:flex-start;font-size:10pt;line-height:1.3;margin-bottom:2.2mm}
.steps .st .n{flex:none;width:6.6mm;height:6.6mm;border-radius:50%;color:#fbf6ec;font-weight:800;font-size:10.5pt;display:flex;align-items:center;justify-content:center}
.steps .st b,.deed b,.pts b{color:var(--wine)}
.deed{margin:0 0 2.2mm 9mm;border-left:.6mm solid var(--gold);padding-left:2.4mm}
.deed .dh{display:flex;align-items:center;gap:1.6mm;font-size:10.5pt}
.deed .cost{display:inline-flex;align-items:center;margin-left:auto}
.deed .pt{background:var(--gold);color:#fff;font-size:9pt;font-weight:700;padding:.2mm 1.6mm .4mm;border-radius:1mm;white-space:nowrap}
.deed .cost+.pt{margin-left:1.4mm}
.deed .dh>b+.pt{margin-left:auto}
.deed p{margin:.6mm 0 0;font-size:9.4pt;line-height:1.27;color:var(--brown)}
.pts table.t{font-size:9.8pt;margin-bottom:2.4mm}
.pts table.t td:last-child{white-space:nowrap}
.pts .yrs{font-size:10pt;margin-bottom:2mm;background:#fff8;border:.3mm solid var(--gold);border-radius:1.6mm;padding:1.4mm 2.2mm}
.pts p{margin:0 0 1.8mm;font-size:10pt;line-height:1.3}
.pts p.mini{font-size:9.4pt;color:var(--muted)}
.work .wband{background:${DEEP};color:#fbf6ec;text-align:center;padding:2.4mm 3mm 2.2mm}
.work .wband .aso{font-size:7.6pt;color:${GOLD};letter-spacing:.14em}
.work .wn{font-weight:800;font-size:15pt;line-height:1.2;color:#f7e9ad}
.work .wbody{padding:2.2mm 4mm 0;display:flex;flex-direction:column;align-items:center}
.wwhere{display:flex;align-items:center;gap:1.2mm;font-size:10.5pt;align-self:stretch;justify-content:center}
.wwhere b{color:var(--wine);font-size:11.5pt}
.wwhere span{color:var(--muted);font-size:9pt}
.wmap{width:62mm;margin:1.4mm 0 1.6mm}
.wneedT{font-size:9.4pt;color:var(--brown);margin-bottom:1.4mm}
.wneed{display:flex;flex-direction:column;gap:2mm;align-items:center}
.nrow{display:flex;gap:2.4mm}
.nbox{width:17mm;height:17mm;border:.45mm dashed;border-radius:2mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4mm}
.nbox em{font-style:normal;font-size:7.4pt;font-weight:700;line-height:1}
.wpts{display:flex;gap:2.4mm;align-items:center;margin-top:2.4mm;font-size:9.2pt;line-height:1.28;align-self:stretch}
.wpts b{color:var(--wine)}
.medal{flex:none;width:12.5mm;height:12.5mm;border-radius:50%;background:var(--gold);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;border:.4mm solid #fbf6ec;box-shadow:0 0 0 .3mm var(--gold2);font-size:6.6pt}
.medal b{color:#fff !important;font-size:13pt;line-height:.95}
.wnote{margin-top:auto;position:absolute;left:4mm;right:4mm;bottom:2.6mm;font-size:8.8pt;line-height:1.26;color:#6a5848;font-style:italic;border-top:.2mm solid var(--line);padding-top:1.2mm;text-align:center}
.cback{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4mm;color:#f7e9ad}
.cback .ck{font-size:12pt;color:${GOLD};letter-spacing:.14em}
.cback .cbn{font-weight:800;font-size:16pt}
.cback .cbs{font-size:9.6pt;opacity:.85}
.card.chron,.card.first{background:#fffaf0}
.card .body{align-items:center;text-align:center}
.ck{font-size:7.4pt;color:var(--gold2);letter-spacing:.12em;margin-top:.6mm}
.crown{width:12.5mm;height:12.5mm;border-radius:50%;background:#f7e9ad;border:.45mm solid ${GOLD};display:flex;align-items:center;justify-content:center;margin:1.4mm 0 1mm}
.cl{font-size:9.4pt;color:var(--muted)}
.cn{font-weight:800;font-size:15pt;color:var(--wine);line-height:1.15;width:100%}
.cmap{width:47mm;margin:1.2mm 0 1.4mm}
.cgive{display:flex;align-items:center;gap:1.4mm;font-size:10pt}
.cgive b{color:var(--wine)}
.crule{margin-top:auto;font-size:9pt;line-height:1.3;color:var(--brown);border-top:.2mm solid var(--line);padding-top:1mm;width:100%}
.crule b{color:var(--wine)}
.cb .cbIn{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3mm}
.cb .cbw{font-weight:800;font-size:13pt;text-align:center;padding:0 6mm;line-height:1.15}
.cb .cbs2{font-size:8.6pt;color:#f0d9a0;opacity:.9}
.hcard .hband{position:absolute;left:3.4mm;right:3.4mm;top:3.4mm;height:13mm;border-radius:1.8mm 1.8mm 0 0;color:#fffaf0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1}
.hcard .hband .aso{font-size:7pt;letter-spacing:.14em;opacity:.85}
.hcard .hband b{font-size:14pt}
.hcard .hb{top:19mm}
.hfig{display:flex;align-items:flex-end;gap:4mm;margin:1mm 0 2mm}
.hlist{font-size:10.5pt;line-height:1.25}
.hlist p{margin:0}
.hlist b{color:var(--wine)}
.hstart{margin-top:auto;font-size:9.4pt;color:var(--muted);line-height:1.6}
.first .fn{font-weight:800;font-size:12.5pt;color:var(--wine);margin-bottom:1.4mm;line-height:1.15}
.first p{margin:0 0 1.4mm;font-size:9.4pt;line-height:1.28}
.first p b{color:var(--wine)}
.first p.f2{margin-top:auto;color:var(--muted);font-size:9pt}
.tokInfo{font-size:9pt;line-height:1.38;color:var(--brown);border:.3mm solid var(--gold);border-radius:2mm;padding:2.6mm 3.4mm;background:var(--paper)}
.tokInfo b{color:var(--wine)}
.cover{padding:8mm 14mm 0}
.cover .title{font-size:24pt;color:var(--gold2);letter-spacing:.08em}
.cover .lead{font-size:12pt;margin:2mm 0 5mm;line-height:1.4}
.cover .two{display:grid;grid-template-columns:1fr 1fr;gap:7mm;font-size:10pt}
.cover h3{margin:0 0 2mm;color:var(--wine);font-size:12pt}
.cover table.comp{font-size:9.2pt}
.cover table.comp td,.cover table.comp th{padding:.9mm 1.3mm}
table.comp td:nth-child(n+2),table.comp th:nth-child(n+2){white-space:nowrap}
.cover .how{margin:0;padding-left:4.5mm;font-size:9.6pt;line-height:1.33}
.cover .how li{margin-bottom:1.5mm}
.cover .legal{font-size:9pt;margin:3mm 0 2mm}
.cover .asmT{margin-top:4mm}
.asm{position:relative;width:80mm}
.asm .asmGrid{position:absolute;left:0;top:0;width:80mm;height:${f(80 * BH / BW)}mm}
.cover .asmP{margin:1.5mm 0 0;font-size:9.4pt;line-height:1.35}
.rulesWrap{padding:6mm 12mm 0}
.rhead{display:flex;align-items:baseline;gap:5mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.5mm;margin-bottom:3mm}
.rtitle{font-size:20pt;color:var(--wine)}
.rsub{font-size:10.5pt;color:var(--muted)}
.lead{font-size:10.8pt;line-height:1.4;margin:0 0 3mm}
.lead b{color:var(--wine)}
.two2{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:4mm;font-size:10.4pt;line-height:1.36}
.two2.first{margin-top:0}
.two2 h3{margin:0 0 1.5mm;color:var(--wine);font-size:11.5pt}
.two2 h3:not(:first-child){margin-top:3mm}
.two2 ol{margin:0;padding-left:5mm}
.two2 li{margin-bottom:1.6mm}
.two2 li b,.two2 .pp b,.two2 .gl b{color:var(--wine)}
.two2 .pp,.two2 .gl{margin:0 0 1.6mm}
.two2 table.t{font-size:10pt}
.goods p{display:flex;align-items:center;gap:2mm;margin:0 0 1.6mm;font-size:10.4pt}
.goods b{color:var(--wine);min-width:14mm}
.goods span:last-child{color:var(--brown);font-size:9.8pt}
.note{font-size:9.6pt;color:var(--muted);margin:2mm 0 0}
.lgm{display:block;flex:none}
.legend{display:grid;grid-template-columns:48mm 1fr;gap:3.4mm;align-items:center;margin-top:1mm}
.lgMap{border:.3mm solid var(--line);border-radius:2mm;overflow:hidden;background:#fffaf0}
.lgList p{display:flex;align-items:center;gap:1.8mm;margin:0 0 1.4mm;font-size:9.6pt;line-height:1.22}
.lgList b{display:block;color:var(--wine)}
.lgList span{color:var(--brown)}
.strip{margin-top:5mm;border-top:.3mm solid var(--gold);padding-top:2.6mm}
.strip h3{margin:0 0 2mm;color:var(--wine);font-size:12pt}
.strip h3 span{font-weight:400;font-size:9.6pt;color:var(--muted);margin-left:2mm}
.sbox{display:grid;grid-template-columns:1fr 1fr 1.5fr;gap:3mm}
.sbox>div{position:relative;background:var(--paper);border:.3mm solid var(--gold);border-radius:2.4mm;padding:2.4mm 3mm 2.4mm 10.4mm;font-size:10pt;line-height:1.32}
.sbox>div>i{position:absolute;left:2.4mm;top:2.2mm;width:5.8mm;height:5.8mm;border-radius:50%;background:var(--wine);color:#fffaf0;font-style:normal;font-weight:800;font-size:10.5pt;display:flex;align-items:center;justify-content:center}
.sbox>div>b{display:block;color:var(--wine);font-size:11pt;margin-bottom:.8mm}
.sbox p{margin:0}
.sbox p b{color:var(--wine)}
.sbox .sd{display:grid;grid-template-columns:20mm 1fr auto;align-items:center;gap:1.4mm;margin-bottom:.9mm}
.sbox .sd span:first-child{font-weight:700}
.sbox .sd em{font-style:normal;font-weight:800;color:var(--wine);white-space:nowrap}
.sbox .plus{display:none}
.sbox.two{grid-template-columns:1fr 1fr;margin-top:3mm}
.sbox .sd .chip{margin-right:.6mm}
.flow{column-count:2;column-gap:8mm;font-size:10.4pt;line-height:1.36}
.flow h3{margin:0 0 1.5mm;color:var(--wine);font-size:11.5pt;break-after:avoid}
.flow h3:not(:first-child){margin-top:3mm}
.flow b{color:var(--wine)}
.flow .pp{margin:0 0 1.6mm}
.flow ol.turn{margin:0;padding-left:5mm}
.flow ol.turn>li{margin-bottom:1.6mm}
.flow ol.turn>li:not(:last-child),.flow ul.deeds li,.flow .pp{break-inside:avoid}
.flow ul.deeds{margin:1.2mm 0 0;padding-left:4mm;list-style:'— '}
.flow ul.deeds li{margin-bottom:1.6mm}
.flow table.t{font-size:10pt;break-inside:avoid}
.exH{margin:4mm 0 1.5mm;color:var(--wine);font-size:11.5pt}
.tips{margin:0 0 1.6mm;padding-left:4.4mm}
.tips li{margin-bottom:1.2mm}
.faq.first{margin-top:0;border-top:0;padding-top:0}
.ex{background:var(--paper);border:.3mm solid var(--gold);border-radius:2mm;padding:2.4mm 3mm;font-size:10pt;line-height:1.34}
.ex p{margin:0 0 1.4mm;break-inside:avoid}
.rulesP .ex{column-count:2;column-gap:7mm}
.faq{margin-top:4mm;border-top:.3mm solid var(--gold);padding-top:2mm}
.faq h3{margin:0 0 1.5mm;color:var(--wine);font-size:11.5pt}
.faq .qa{column-count:2;column-gap:8mm;font-size:10pt;line-height:1.32}
.faq .qa p{margin:0 0 1.8mm;break-inside:avoid}
.faq .qa b{color:var(--wine);display:block}
.works{display:grid;grid-template-columns:1fr 1fr;gap:3mm 6mm}
.wk{border:.3mm solid var(--line);border-radius:2mm;padding:2mm 2.6mm;background:var(--paper);break-inside:avoid}
.wkh{display:flex;align-items:baseline;gap:2mm;font-size:10.6pt}
.wkh b{color:var(--wine)}
.wkh span{color:var(--muted);font-size:9.4pt}
.wkh i{margin-left:auto;font-style:normal;background:var(--gold);color:#fff;font-weight:700;font-size:9pt;padding:0 1.6mm .2mm;border-radius:1mm}
.wkn{margin:1.2mm 0 1mm;display:flex;align-items:center;flex-wrap:wrap}
.wkn .plus{display:none}
.wkn .chip{margin-right:.8mm}
.wk p{margin:0;font-size:9.6pt;line-height:1.3}
.claude{margin-top:3mm;font-size:9.4pt;color:var(--muted);text-align:center}
.nums{display:grid;grid-template-columns:repeat(6,1fr);gap:1mm;font-size:9.4pt;text-align:center}
.nums span{border:.2mm solid var(--line);border-radius:1mm;padding:.5mm 0;background:var(--paper)}
.nums b{display:block;color:var(--wine);font-size:12pt}
.credits{margin-top:5mm;font-size:9.4pt;line-height:1.36}
.labelP .lbl{position:absolute;left:10mm;width:190mm;border:.25mm solid #777}
.labelP .lid{top:12mm;height:124mm;background:${DEEP};padding:5mm}
.labelP .lid .lin{position:relative;height:100%;border:.4mm solid ${GOLD};border-radius:2mm;display:flex;align-items:center;gap:6mm;padding:0 8mm}
.labelP .lid .lt{flex:1;color:#fbf6ec}
.labelP .lid .big{font-size:22pt;color:${GOLD};letter-spacing:.1em}
.labelP .lid .nm{font-weight:800;font-size:32pt;line-height:1.1;color:#f7e9ad}
.labelP .lid .sub{font-size:11.5pt;opacity:.95;margin:2mm 0 4mm}
.labelP .lid .meta{font-size:11pt}
.labelP .lid .ser{font-size:9pt;color:${GOLD};letter-spacing:.1em;margin-top:6mm}
.labelP .lid .sch{font-size:9.5pt;opacity:.85}
.labelP .lid .map{width:84mm;background:#fffaf0;border-radius:2mm;padding:2mm}
.labelP .list{top:144mm;height:44mm;background:var(--paper);padding:4mm 7mm}
.labelP .list h3{margin:0 0 2.4mm;color:var(--wine);font-size:13pt}
.labelP .list .items{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1.8mm 4mm;font-size:10.2pt}
.labelP .list .chk{display:inline-block;width:3.6mm;height:3.6mm;border:.3mm solid var(--brown);border-radius:.6mm;vertical-align:-.6mm;margin-right:1.6mm}
.labelP .side{height:22mm;background:${DEEP};color:#fbf6ec;display:flex;align-items:center;justify-content:space-around;font-size:11pt}
.labelP .side .aso{color:${GOLD};letter-spacing:.1em}
.labelP .side b{font-size:16pt;color:#f7e9ad}
.labelP .s0{top:198mm}.labelP .s1{top:228mm}
.lblNote{position:absolute;left:10mm;right:10mm;top:258mm;font-size:9pt;color:var(--muted);text-align:center}
`;

// ---------- the sheets, in printing order ----------
const cards = (key, fronts, backs, label) => ({
  key,
  front: cardSheet(fronts, { label: `ოქროს ხანა · ${label} — წინა მხარე` }),
  back: cardSheet(backs, { back: true, label: `ოქროს ხანა · ${label} — ზურგი` }),
});
const CHRON = REGIONS.map((_, r) => r).filter(r => r !== TBILISI);
const SMALL = [...CHRON.map(r => [chronFront(r), chronBack]), ...HOUSES.map((_, i) => [houseFront(i), houseBack(i)]), [firstFront, firstBack], [marketFront, marketBack]];
const workSheet = i => ({
  key: `works${i + 1}`,
  front: a6Sheet(WORKS.slice(i * 4, i * 4 + 4).map(workFront), { label: `ოქროს ხანა · მეფის საქმეები ${i + 1}/3 — წინა მხარე` }),
  back: a6Sheet(WORKS.slice(i * 4, i * 4 + 4).map(() => workBack), { back: true, label: `ოქროს ხანა · მეფის საქმეები ${i + 1}/3 — ზურგი` }),
});
const SHEETS = [
  { key: 'cover' },
  { key: 'rules1', front: rulesPage1, back: rulesPage2 },
  { key: 'rules2', front: rulesPage3, back: rulesPage4 },
  ...[0, 1, 2, 3].map(tileSheet),
  ...[0, 1, 2].map(workSheet),
  cards('cards1', SMALL.slice(0, 9).map(c => c[0]), SMALL.slice(0, 9).map(c => c[1]), 'მატიანე 1–9'),
  cards('cards2', SMALL.slice(9).map(c => c[0]), SMALL.slice(9).map(c => c[1]), 'მატიანე 10–12, სახლები, პირველი სახლი, ბაზარი'),
  { key: 'aid', front: a6Sheet(HOUSES.map((_, i) => aidFront(i)), { label: 'ოქროს ხანა · სვლის ბარათები A6 — წინა მხარე' }), back: a6Sheet(HOUSES.map((_, i) => aidBack(i)), { back: true, label: 'ოქროს ხანა · სვლის ბარათები A6 — ზურგი' }) },
  { key: 'chits', front: placedSheet([chitGrid(), ...chitItems(), ...spareItems(), chitInfo], { label: 'ოქროს ხანა · ნივთები — წინა მხარე' }), back: placedSheet([...chitItems(), ...spareItems()], { back: true, label: 'ოქროს ხანა · ნივთები — ზურგი (იგივე)' }) },
  { key: 'figures', front: placedSheet(figureItems(false), { label: 'ოქროს ხანა · მამულები, ნიშნები, მხედრები — წინა მხარე' }), back: placedSheet(figureItems(true), { back: true, label: 'ოქროს ხანა · მამულები და ნიშნები — ზურგი' }) },
  { key: 'label', front: labelPage },
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
