// „ოქროს ხანა“ — the school's Catan (plan doc, tab „6 სამაგიდო თამაში“), series №1: 19 lands (79 mm flat to flat, the
// original's size), a sea-and-mountains frame of six A4 pieces with nine named gates, 18 number and 9 trade tokens,
// 95 harvest and 25 development cards, 8 A6 cards, paper figures in four colours, four rule pages and a box label.
import { C, SERIES, SCHOOL, aso, esc, icon, iconIn, corners, cardSheet, placedSheet, hexPts, ptsAttr, page, stripe, foot, duplex, sheetNo } from '../lib.mjs';

export const id = 'okros-khana';
export const title = 'ოქროს ხანა';
const NO = 1;
const META = '3–4 მოთამაშე · 10 წლიდან · 60–120 წუთი';
const MONO = aso('ოხ');

// ---------- harvests ----------
const RES = {
  wood: { name: 'ხე', land: 'ტყე', color: '#2e5e3e', ink: '#5f9c6d', soft: '#e1ecdc', icon: 'tree-pine', builds: 'გზა · სოფელი' },
  stone: { name: 'ქვა', land: 'ბორცვი', color: '#a65f45', ink: '#d39479', soft: '#f4e2d9', icon: 'brick-wall', builds: 'გზა · სოფელი' },
  wool: { name: 'მატყლი', land: 'საძოვარი', color: '#6c9a43', ink: '#a6cd7d', soft: '#e8f1dc', icon: 'sheep', builds: 'სოფელი · განვითარება' },
  grain: { name: 'პური', land: 'ყანა', color: '#c39120', ink: '#e9c86a', soft: '#f7ecd1', icon: 'wheat', builds: 'სოფელი · ქალაქი · განვითარება' },
  ore: { name: 'მადანი', land: 'მთა', color: '#53647b', ink: '#8e9fb5', soft: '#e0e5ec', icon: 'pickaxe', builds: 'ქალაქი · განვითარება' },
};
const RK = ['wood', 'stone', 'wool', 'grain', 'ore'];
const DESERT = { land: 'უდაბნო', color: '#d8c38e', ink: '#f0e3bb' };

// two drawings lucide lacks, in its 24-unit grid
const CUSTOM = {
  sheep: c => `<path d="M8 12.5A2 2 0 0 1 9.6 9A2.2 2.2 0 0 1 13.5 8A2.2 2.2 0 0 1 17.4 9A2 2 0 0 1 19.6 12.5A2 2 0 0 1 17.4 16A2.2 2.2 0 0 1 13.5 17A2.2 2.2 0 0 1 9.6 16A2 2 0 0 1 8 12.5Z"/><ellipse cx="6" cy="11.6" rx="2.3" ry="1.8" fill="${c}"/><path d="M5.2 9.9 3.6 9"/><path d="M10.8 17v3.4M16.2 17v3.4"/>`,
  robber: c => `<path d="M12 2.5c2.3 0 4 1.9 4 4.3 0 1.4-.6 2.6-1.5 3.4 2.6 1.1 4.3 3.9 4.6 7.8l.4 3.5h-15l.4-3.5c.3-3.9 2-6.7 4.6-7.8-.9-.8-1.5-2-1.5-3.4 0-2.4 1.7-4.3 4-4.3z" fill="${c}" stroke="none"/>`,
};
const svgIcon = (name, attrs, color, width) => `<svg ${attrs} viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${CUSTOM[name](color)}</svg>`;
const ic = (name, o = {}) => CUSTOM[name] ? svgIcon(name, `style="${o.style ?? ''}" width="${o.size ?? 6}mm" height="${o.size ?? 6}mm"`, o.color ?? C.gold, o.width ?? 1.75) : icon(name, o);
const icIn = (name, o = {}) => CUSTOM[name] ? svgIcon(name, `x="${o.x ?? 0}" y="${o.y ?? 0}" width="${o.size ?? 6}" height="${o.size ?? 6}" opacity="${o.opacity ?? 1}"`, o.color ?? C.gold, o.width ?? 1.75) : iconIn(name, o);

// ---------- the 19 lands; `at` = the place in the learning layout (axial q, r; north on top) ----------
const LANDS = [
  { name: 'სვანეთი', res: 'ore', mon: 'სვანური კოშკები', at: [0, -2] },
  { name: 'რაჭა', res: 'wood', mon: 'ნიკორწმინდა', at: [1, -2] },
  { name: 'ხევი', res: 'ore', mon: 'მყინვარწვერი', at: [2, -2] },
  { name: 'აფხაზეთი', res: 'wood', mon: 'ბიჭვინთა', at: [-1, -1] },
  { name: 'იმერეთი', res: 'grain', mon: 'ბაგრატის ტაძარი', at: [0, -1] },
  { name: 'მთიულეთი', res: 'wool', mon: 'არაგვის ხეობა', at: [1, -1] },
  { name: 'თუშეთი', res: 'wool', mon: 'თუშური ფარა', at: [2, -1] },
  { name: 'სამეგრელო', res: 'wood', mon: 'მარტვილი', at: [-2, 0] },
  { name: 'ჯავახეთი', res: 'wool', mon: 'ფარავნის ტბა', at: [-1, 0] },
  { name: 'ქვათახევი', res: 'stone', mon: 'მონასტერი', at: [0, 0] },
  { name: 'შიდა ქართლი', res: 'grain', mon: 'უფლისციხე', at: [1, 0] },
  { name: 'კახეთი', res: 'grain', mon: 'ალავერდი', at: [2, 0] },
  { name: 'აჭარა', res: 'wood', mon: 'გონიო', at: [-2, 1] },
  { name: 'სამცხე', res: 'grain', mon: 'საფარა', at: [-1, 1] },
  { name: 'თრიალეთი', res: 'wool', mon: 'ბეთანია', at: [0, 1] },
  { name: 'საყდრისი', res: 'ore', mon: 'ოქროს მაღარო', at: [1, 1] },
  { name: 'დმანისი', res: 'stone', mon: 'დმანისის ციხე', at: [-2, 2] },
  { name: 'ბოლნისი', res: 'stone', mon: 'ბოლნისის სიონი', at: [-1, 2] },
  { name: 'ელდარი', res: null, mon: 'გარეჯის უდაბნო', at: [0, 2] },
];

// ---------- board geometry (mm, y down, centre of the island at 0,0) ----------
const S3 = Math.sqrt(3);
const HW = 79, HR = HW / S3, HH = 2 * HR;          // a land: 79 mm flat to flat, 91.2 corner to corner
const hexC = ([q, r]) => [HW * (q + r / 2), 1.5 * HR * r];
const inIsland = ([q, r]) => Math.abs(q) <= 2 && Math.abs(r) <= 2 && Math.abs(q + r) <= 2;
const ISLAND = LANDS.map(l => l.at);
const NB = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]]; // across the edges facing −60°, 0°, 60°, 120°, 180°, 240°
const adjacent = (a, b) => NB.some(([dq, dr]) => a[0] + dq === b[0] && a[1] + dr === b[1]);
const angOf = (x, y) => ((Math.atan2(y, x) * 180 / Math.PI) + 360.0001) % 360;
const rot = ([x, y], deg) => { const a = deg * Math.PI / 180; return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]; };
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const dirOf = deg => [Math.cos(deg * Math.PI / 180), Math.sin(deg * Math.PI / 180)];

// the 30 coast edges, clockwise from the one facing east; e0, e5 … e25 are cut in half by the frame's joints
const COAST = (() => {
  const out = [];
  for (const h of ISLAND) {
    const pts = hexPts(...hexC(h), HR);
    NB.forEach(([dq, dr], i) => {
      if (inIsland([h[0] + dq, h[1] + dr])) return;
      const a = pts[i], b = pts[(i + 1) % 6], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ang = angOf(...m);
      const rel = p => ((angOf(...p) - ang + 540) % 360) - 180;
      const [lo, hi] = rel(a) < rel(b) ? [a, b] : [b, a];
      out.push({ hex: h, face: -60 + 60 * i, m, lo, hi, ang });
    });
  }
  return out.sort((x, y) => x.ang - y.ang);
})();
if (COAST.length !== 30 || [0, 5, 10, 15, 20, 25].some((j, k) => Math.abs(COAST[j].ang % 360 - 60 * k) > 0.01)) throw new Error('coast geometry');

const FIT = 1.006;             // the frame's opening is ~1 mm wider than the island
const A_OUT = 216;             // the frame's outer hexagon: apothem; its corners sit on the joints
const R_OUT = A_OUT * 2 / S3;
const SLOT_R = 13.6, SLOT_GAP = 4; // the round place of a trade token (⌀25) beside its coast edge

// nine gates: the coast edge, the name, where it is, and what it trades in the learning layout
const GATES = [
  { e: 3, name: 'განძის კარი', learn: '3' },
  { e: 6, name: 'ლორე', learn: 'ore' },
  { e: 9, name: 'ტაო-კლარჯეთი', learn: 'stone' },
  { e: 13, name: 'ფოთი', learn: 'wood' },
  { e: 16, name: 'ცხუმი', learn: '3' },
  { e: 19, name: 'ნიკოფსია', learn: '3' },
  { e: 23, name: 'დარიალი', learn: 'wool' },
  { e: 26, name: 'დარუბანდი', learn: '3' },
  { e: 29, name: 'ჰერეთი', learn: 'grain' },
];
const gateAt = g => { const ed = COAST[g.e], m = [ed.m[0] * FIT, ed.m[1] * FIT]; return { ...g, edge: ed, c: add(m, dirOf(ed.face), SLOT_GAP + SLOT_R), a: [ed.lo[0] * FIT, ed.lo[1] * FIT], b: [ed.hi[0] * FIT, ed.hi[1] * FIT] }; };
const GATE_POS = GATES.map(gateAt);

// the six frame pieces: k spans the angles 60k…60(k+1); the people's numbers go clockwise from the north (k = 4)
const userNo = k => ((k + 2) % 6) + 1;
const PIECES = [
  { k: 4, name: 'დიდი კავკასიონი', look: 'mount', note: 'ჩრდილოეთი' },
  { k: 5, name: 'დიდი კავკასიონი', look: 'mount' },
  { k: 0, name: 'მტკვრის ველი', look: 'valley' },
  { k: 1, name: 'მცირე კავკასიონი', look: 'hills' },
  { k: 2, name: 'შავი ზღვა', look: 'sea' },
  { k: 3, name: 'შავი ზღვა', look: 'sea' },
];
const piecePoly = k => {
  const chain = [COAST[(5 * k) % 30].m, ...[0, 1, 2, 3, 4].map(i => COAST[(5 * k + i) % 30].hi), COAST[(5 * k + 5) % 30].m].map(([x, y]) => [x * FIT, y * FIT]);
  return [dirOf(60 * k).map(v => v * R_OUT), dirOf(60 * k + 60).map(v => v * R_OUT), ...chain.reverse()];
};

// ---------- the number tokens: letters ა…ს go round the island, outside in (the original's A…R) ----------
const LETTERS = 'ა ბ გ დ ე ვ ზ თ ი კ ლ მ ნ ო პ ჟ რ ს'.split(' ');
const SPIRAL_NUMS = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];
const NUMERAL = { 2: 'ბ', 3: 'გ', 4: 'დ', 5: 'ე', 6: 'ვ', 8: 'ჱ', 9: 'თ', 10: 'ი', 11: 'ია', 12: 'იბ' };
const PIPS = n => 6 - Math.abs(7 - n);
const spiralOrder = (startDeg) => {
  const ringOf = d => ISLAND.filter(h => (Math.abs(h[0]) + Math.abs(h[1]) + Math.abs(h[0] + h[1])) / 2 === d);
  const fromStart = h => ((startDeg - angOf(...hexC(h)) + 360.5) % 360);
  return [...ringOf(2).sort((a, b) => fromStart(a) - fromStart(b)), ...ringOf(1).sort((a, b) => fromStart(a) - fromStart(b)), ...ringOf(0)];
};
const numbersFor = (desertAt, startDeg) => {
  const nums = new Map(); let i = 0;
  for (const h of spiralOrder(startDeg)) { if (h[0] === desertAt[0] && h[1] === desertAt[1]) continue; nums.set(h.join(), { n: SPIRAL_NUMS[i], letter: LETTERS[i] }); i++; }
  return nums;
};
const redsApart = nums => ISLAND.every(a => ISLAND.every(b => !(adjacent(a, b) && [6, 8].includes(nums.get(a.join())?.n) && [6, 8].includes(nums.get(b.join())?.n))));
// the learning layout: of the six corners to start the spiral from, the one that keeps 6 and 8 apart and shares the
// harvests most evenly (pips = how many of the 36 dice throws bring a land in)
const LEARN = (() => {
  const desert = LANDS.find(l => !l.res).at;
  const spread = nums => { const by = Object.fromEntries(RK.map(k => [k, 0])); for (const l of LANDS) if (l.res) by[l.res] += PIPS(nums.get(l.at.join()).n); const v = Object.values(by); return Math.max(...v) - Math.min(...v); };
  const ok = [0, 60, 120, 180, 240, 300].map(s => ({ start: s, nums: numbersFor(desert, s) })).filter(o => redsApart(o.nums));
  if (!ok.length) throw new Error('no spiral start keeps 6 and 8 apart');
  return ok.sort((a, b) => spread(a.nums) - spread(b.nums))[0];
})();

// ---------- a land: front and back ----------
const LOOK = k => (k ? RES[k] : DESERT);
const SPOTS = [[11, 27.5], [68, 27.5], [8.5, 43], [70.5, 43], [12, 56.5], [67, 56.5], [24.5, 26.5], [54.5, 26.5]];
const tuft = ([x, y], c) => `<path d="M${x} ${y}l-1.1-2.3M${x} ${y}v-2.9M${x} ${y}l1.1-2.3" stroke="${c}" stroke-width=".55" stroke-linecap="round" fill="none"/>`;
const stones = ([x, y], c) => [[-4.6, 0], [0.2, 0], [-2.2, -2.7]].map(([dx, dy]) => `<rect x="${x + dx}" y="${y + dy}" width="4.2" height="2.3" rx=".6" fill="none" stroke="${c}" stroke-width=".55"/>`).join('');
const landDecor = (res, ink) => {
  const at = (name, i, size = 9, width = 1.5) => icIn(name, { x: SPOTS[i][0] - size / 2, y: SPOTS[i][1] - size / 2, size, color: ink, width });
  if (res === 'wood') return SPOTS.map((_, i) => at('tree-pine', i, i < 6 ? 9.5 : 7.5)).join('');
  if (res === 'ore') return SPOTS.map((_, i) => at('mountain-snow', i, i < 6 ? 10 : 7.5, 1.4)).join('');
  if (res === 'grain') return Array.from({ length: 16 }, (_, i) => `<path d="M-10 ${i * 7 - 8} l100 -34" stroke="${ink}" stroke-width=".5" opacity=".75"/>`).join('') + [0, 1, 4, 5].map(i => at('wheat', i, 9, 1.5)).join('');
  if (res === 'wool') return [[18, 36], [61, 36], [15, 49], [64, 49], [30, 58.5], [49, 58.5], [20, 18], [59, 18], [39.5, 7.5]].map(p => tuft(p, ink)).join('') + [0, 5].map(i => at('sheep', i, 10.5, 1.3)).join('') + [2, 3].map(i => at('sheep', i, 7.5, 1.4)).join('');
  if (res === 'stone') return SPOTS.map(p => stones(p, ink)).join('') + `<path d="M-4 40 q12 -8 24 0 M58 40 q12 -8 24 0" stroke="${ink}" stroke-width=".6" fill="none"/>`;
  return Array.from({ length: 9 }, (_, i) => `<path d="M-6 ${i * 11 + 2} q10 -4 20 0 t20 0 t20 0 t20 0 t20 0" stroke="${ink}" stroke-width=".6" fill="none"/>`).join('');
};
let clipN = 0;
const landFront = l => {
  const look = LOOK(l.res), pts = hexPts(HW / 2, HR, HR), inner = hexPts(HW / 2, HR, HR - 3), id = `lf${clipN++}`;
  const pill = l.res
    ? `<rect x="25" y="11.6" width="29" height="7.6" rx="3.8" fill="#000" fill-opacity=".38"/>${icIn(RES[l.res].icon, { x: 27.3, y: 12.4, size: 6, color: '#fbf6ec', width: 1.9 })}<text x="35.2" y="17.25" font-size="3.5" font-weight="700" fill="#fbf6ec">${esc(RES[l.res].name)}</text>`
    : `<rect x="24.5" y="11.6" width="30" height="7.6" rx="3.8" fill="#000" fill-opacity=".3"/><text x="39.5" y="17.25" font-size="3.4" font-weight="700" fill="#fbf6ec" text-anchor="middle">უდაბნო</text>`;
  const middle = l.res
    ? `<circle cx="39.5" cy="${HR}" r="13.4" fill="#fbf6ec" fill-opacity=".3" stroke="#fbf6ec" stroke-opacity=".75" stroke-width=".45"/>`
    : `${icIn('robber', { x: 29, y: HR - 11.5, size: 21, color: '#3b2b1f', opacity: 0.55 })}<text x="39.5" y="${HR + 13.6}" font-size="2.9" fill="#4a3426" text-anchor="middle" opacity=".85">მოთარეშე აქ იწყებს</text>`;
  return `<svg width="83mm" height="${HH + 4}mm" viewBox="-2 -2 83 ${HH + 4}" font-family="SerifKa">
<defs><clipPath id="${id}"><polygon points="${ptsAttr(pts)}"/></clipPath></defs>
<polygon points="${ptsAttr(pts)}" fill="${look.color}" stroke="${look.color}" stroke-width="3" stroke-linejoin="miter"/>
<g clip-path="url(#${id})">${landDecor(l.res, look.ink)}</g>
<polygon points="${ptsAttr(inner)}" fill="none" stroke="#fbf6ec" stroke-opacity=".85" stroke-width=".45"/>
${pill}${middle}
<rect x="14" y="61" width="51" height="14.2" rx="2" fill="#f6ecd6" stroke="${C.gold}" stroke-width=".4"/>
<text x="39.5" y="68.4" font-size="4.7" font-weight="800" fill="${C.wine}" text-anchor="middle">${esc(l.name)}</text>
<text x="39.5" y="72.9" font-size="2.85" fill="${C.brown}" text-anchor="middle">${esc(l.mon)}</text>
<path d="M39.5 78.6l1.6 1.6-1.6 1.6-1.6-1.6z" fill="#fbf6ec" fill-opacity=".85"/>
<polygon points="${ptsAttr(pts)}" fill="none" stroke="#3a3027" stroke-width=".22"/>
</svg>`;
};
const landBack = () => {
  const pts = hexPts(HW / 2, HR, HR), inner = hexPts(HW / 2, HR, HR - 3.4);
  return `<svg width="83mm" height="${HH + 4}mm" viewBox="-2 -2 83 ${HH + 4}" font-family="SansKa">
<polygon points="${ptsAttr(pts)}" fill="${C.wine}" stroke="${C.wine}" stroke-width="3.4" stroke-linejoin="miter"/>
<polygon points="${ptsAttr(inner)}" fill="none" stroke="${C.gold}" stroke-width=".5"/>
${inner.map(([x, y]) => `<circle cx="${(x * 0.82 + HW / 2 * 0.18).toFixed(2)}" cy="${(y * 0.82 + HR * 0.18).toFixed(2)}" r="1" fill="${C.gold}"/>`).join('')}
<g transform="translate(39.5 ${HR})" fill="none" stroke="${C.gold}"><circle r="17" stroke-width=".45"/><circle r="14.6" stroke-width=".3" stroke-dasharray="1 1.4"/>
${Array.from({ length: 12 }, (_, k) => `<path d="M0 -17 C1.6 -15.6 1.6 -14 0 -12.6 C-1.6 -14 -1.6 -15.6 0 -17Z" fill="${C.gold}" fill-opacity=".75" stroke="none" transform="rotate(${k * 30})"/>`).join('')}</g>
<text x="39.5" y="${HR + 3.2}" font-size="8.6" font-weight="900" fill="${C.gold}" text-anchor="middle" letter-spacing=".3">${MONO}</text>
</svg>`;
};

// ---------- tokens (⌀25 mm) ----------
const numFront = n => {
  const red = n === 6 || n === 8, nm = aso(NUMERAL[n]), w = nm.length * 1.25 + 0.4;
  return `<svg width="25mm" height="25mm" viewBox="0 0 25 25" font-family="SerifKa"><circle cx="12.5" cy="12.5" r="12.2" fill="#f6ecd6" stroke="${C.gold}" stroke-width=".5"/><circle cx="12.5" cy="12.5" r="10.8" fill="none" stroke="${C.goldDark}" stroke-width=".22"/>
<text x="12.5" y="${red ? 12.9 : 12.5}" font-size="${red ? 9.2 : 8.2}" font-weight="800" fill="${red ? C.wine : C.brown}" text-anchor="middle">${n}</text>
<line x1="${12.5 - w}" x2="${12.5 + w}" y1="14.15" y2="14.15" stroke="${red ? C.wine : C.brown}" stroke-width=".3"/>
<text x="12.5" y="17.3" font-size="2.7" font-family="SansKa" font-weight="900" fill="${red ? C.wine : C.brown}" text-anchor="middle">${nm}</text>
${Array.from({ length: PIPS(n) }, (_, i) => `<circle cx="${12.5 + (i - (PIPS(n) - 1) / 2) * 1.75}" cy="20.2" r=".62" fill="${red ? C.wine : C.brown}"/>`).join('')}</svg>`;
};
const numBack = letter => `<svg width="25mm" height="25mm" viewBox="0 0 25 25" font-family="SerifKa" style="overflow:visible"><circle cx="12.5" cy="12.5" r="13.4" fill="${C.wine}"/><circle cx="12.5" cy="12.5" r="10.8" fill="none" stroke="${C.gold}" stroke-width=".35"/>
<text x="12.5" y="16.4" font-size="11" font-weight="800" fill="#f0d9a0" text-anchor="middle">${letter}</text></svg>`;
const SEA = '#2d6a96', SEA_DEEP = '#234f72';
const tradeFront = k => {
  const r = k === '3' ? null : RES[k];
  return `<svg width="25mm" height="25mm" viewBox="0 0 25 25" font-family="SerifKa"><circle cx="12.5" cy="12.5" r="12.2" fill="${r ? r.color : SEA}" stroke="#f6ecd6" stroke-width=".5"/><circle cx="12.5" cy="12.5" r="10.8" fill="none" stroke="#f6ecd6" stroke-opacity=".6" stroke-width=".25"/>
${icIn(r ? r.icon : 'anchor', { x: 9.4, y: 2.6, size: 6.2, color: '#fbf6ec', width: 2 })}
<text x="12.5" y="16.3" font-size="6.6" font-weight="800" fill="#fbf6ec" text-anchor="middle">${r ? '2:1' : '3:1'}</text>
<text x="12.5" y="20.6" font-size="${r ? 2.9 : 2.7}" fill="#fbf6ec" text-anchor="middle">${r ? esc(r.name) : 'ნებისმიერი'}</text></svg>`;
};
const tradeBack = `<svg width="25mm" height="25mm" viewBox="0 0 25 25" font-family="SerifKa" style="overflow:visible"><circle cx="12.5" cy="12.5" r="13.4" fill="${SEA_DEEP}"/><circle cx="12.5" cy="12.5" r="10.8" fill="none" stroke="#f0d9a0" stroke-width=".3"/>
${icIn('landmark', { x: 8, y: 4.6, size: 9, color: '#f0d9a0', width: 1.6 })}<text x="12.5" y="19.6" font-size="2.6" fill="#f0d9a0" text-anchor="middle">კარიბჭე</text></svg>`;
const spareToken = `<svg width="25mm" height="25mm" viewBox="0 0 25 25" font-family="SerifKa"><circle cx="12.5" cy="12.5" r="12.2" fill="#fff" stroke="${C.gold}" stroke-width=".4" stroke-dasharray="1 1"/><text x="12.5" y="13.4" font-size="2.8" fill="${C.muted}" text-anchor="middle">სათადარიგო</text></svg>`;

// the robber, folded from one strip: foot · figure · figure upside down · foot
const robberStrip = (() => {
  const fig = (y, flip) => `<g transform="translate(0 ${y})${flip ? ' rotate(180 12 20)' : ''}"><rect width="24" height="40" fill="#e9dfcc"/>${icIn('robber', { x: 1, y: 3, size: 22, color: '#2f241b' })}<text x="12" y="36.5" font-size="2.9" fill="${C.brown}" text-anchor="middle" font-family="SerifKa">მოთარეშე</text></g>`;
  return `<svg width="24mm" height="98mm" viewBox="0 0 24 98"><rect y="0" width="24" height="9" fill="#cdbf9f"/>${fig(9, false)}${fig(49, true)}<rect y="89" width="24" height="9" fill="#cdbf9f"/>
<rect width="24" height="98" fill="none" stroke="#555" stroke-width=".25"/><g stroke="#777" stroke-width=".25" stroke-dasharray="1.6 1.2"><line x1="0" x2="24" y1="9" y2="9"/><line x1="0" x2="24" y1="49" y2="49"/><line x1="0" x2="24" y1="89" y2="89"/></g></svg>`;
})();

// ---------- the frame: six pieces, drawn as the southern one (k = 1) and turned ----------
const canon = (p, k) => rot(p, 60 - 60 * k);
const CANON_POLY = piecePoly(1);
const LOOKS = {
  sea: { base: SEA, a: '#86b6dc', b: '#9cc8ea' },
  mount: { base: '#7a8376', a: '#a3ab9c', b: '#5f685c' },
  hills: { base: '#7c8a63', a: '#a1ad83', b: '#64714f' },
  valley: { base: '#c1ab72', a: '#ad965c', b: '#5d93bf' },
};
const JOINT = 'ა ბ გ დ ე ვ'.split(' ');
const jointOfRay = j => JOINT[(j + 1) % 6];
const peaks = (y0, step, hBase, hVar, fill, snow, seed) => {
  let s = '';
  for (let i = 0, x = -140 + (seed % step); x < 140; i++, x += step) {
    const h = hBase + hVar * Math.sin(i * 1.7 + seed), w = step * 0.75;
    s += `<polygon points="${(x - w).toFixed(1)},${y0} ${x.toFixed(1)},${(y0 - h).toFixed(1)} ${(x + w).toFixed(1)},${y0}" fill="${fill}"/>`;
    s += `<polygon points="${(x - w * 0.32).toFixed(1)},${(y0 - h * 0.68).toFixed(1)} ${x.toFixed(1)},${(y0 - h).toFixed(1)} ${(x + w * 0.32).toFixed(1)},${(y0 - h * 0.68).toFixed(1)} ${(x + w * 0.12).toFixed(1)},${(y0 - h * 0.6).toFixed(1)} ${(x - w * 0.1).toFixed(1)},${(y0 - h * 0.66).toFixed(1)}" fill="${snow}"/>`;
  }
  return s;
};
const pieceArt = look => {
  const L = LOOKS[look];
  if (look === 'sea') {
    let s = '';
    for (let r = 0, y = 166; y < 218; r++, y += 6.2) for (let x = -136 + (r % 2) * 5.5; x < 136; x += 11) s += `<path d="M${x} ${y.toFixed(1)}q2.75 -1.8 5.5 0t5.5 0" stroke="${L.a}" stroke-width=".45" fill="none"/>`;
    return s + `<polyline points="${ptsAttr(CANON_POLY.slice(2))}" fill="none" stroke="${L.b}" stroke-opacity=".5" stroke-width="7"/>`;
  }
  if (look === 'valley') {
    let s = '';
    for (let i = 0; i < 9; i++) s += `<path d="M${-140 + i * 32} 214 q16 -11 32 0" fill="${L.a}" opacity=".55"/>`;
    s += `<path d="M-140 196 C-100 186 -80 206 -40 197 S20 186 60 198 S120 206 140 195" stroke="${L.b}" stroke-width="3" fill="none"/><path d="M-140 196 C-100 186 -80 206 -40 197 S20 186 60 198 S120 206 140 195" stroke="#a9cfe9" stroke-width="1" fill="none"/>`;
    for (let i = 0; i < 16; i++) s += `<circle cx="${-118 + i * 15.5}" cy="${184 + (i % 3) * 3.5}" r="1.9" fill="#8a7442" opacity=".7"/><circle cx="${-115.6 + i * 15.5}" cy="${185.2 + (i % 3) * 3.5}" r="1.4" fill="#8a7442" opacity=".55"/>`;
    return s;
  }
  const back = peaks(212, 15, look === 'mount' ? 24 : 16, look === 'mount' ? 8 : 5, L.a, '#f2efe7', 3);
  const front = peaks(218, 19, look === 'mount' ? 15 : 10, look === 'mount' ? 5 : 3, L.b, '#e9e5da', 7);
  return back + front + (look === 'hills' ? [-96, -40, 18, 74].map(x => icIn('tree-pine', { x, y: 199, size: 7, color: '#4c5e3a', width: 1.6 })).join('') : '');
};
const framePiece = P => {
  const id = `fp${P.k}`, slots = GATE_POS.filter(g => Math.floor(g.e / 5) === P.k).map(g => ({ ...g, c: canon(g.c, P.k), a: canon(g.a, P.k), b: canon(g.b, P.k) }));
  const nameX = slots.length === 1 ? 46 : 0;
  const slotSvg = g => {
    const pier = p => { const d = [g.c[0] - p[0], g.c[1] - p[1]], len = Math.hypot(...d), e = add(p, d, (len - SLOT_R + 0.4) / len); return `<line x1="${p[0].toFixed(2)}" y1="${p[1].toFixed(2)}" x2="${e[0].toFixed(2)}" y2="${e[1].toFixed(2)}" stroke="#6b4b2e" stroke-width="2" stroke-linecap="round"/><line x1="${p[0].toFixed(2)}" y1="${p[1].toFixed(2)}" x2="${e[0].toFixed(2)}" y2="${e[1].toFixed(2)}" stroke="#c9a26b" stroke-width=".8" stroke-linecap="round"/>`; };
    const w = g.name.length * 2.05 + 5;
    return `${pier(g.a)}${pier(g.b)}<circle cx="${g.c[0].toFixed(2)}" cy="${g.c[1].toFixed(2)}" r="${SLOT_R}" fill="#f6ecd6" stroke="#6b4b2e" stroke-width=".5" stroke-dasharray="1.6 1"/>
<text x="${g.c[0].toFixed(2)}" y="${(g.c[1] + 1).toFixed(2)}" font-size="2.9" fill="${C.muted}" text-anchor="middle">კარიბჭე</text>
<rect x="${(g.c[0] - w / 2).toFixed(2)}" y="${(g.c[1] + SLOT_R + 1.2).toFixed(2)}" width="${w.toFixed(2)}" height="5.6" rx="1.2" fill="#f6ecd6" stroke="${C.gold}" stroke-width=".35"/>
<text x="${g.c[0].toFixed(2)}" y="${(g.c[1] + SLOT_R + 5.2).toFixed(2)}" font-size="3.4" font-weight="700" fill="${C.wine}" text-anchor="middle">${esc(g.name)}</text>`;
  };
  const joint = (side) => { // side +1: the right end (ray 60k), −1: the left end (ray 60k + 60)
    const x = 110.8 * side, y = 201.8, j = side > 0 ? P.k : (P.k + 1) % 6;
    return `<circle cx="${x}" cy="${y}" r="3.8" fill="#f6ecd6" stroke="${C.gold}" stroke-width=".4"/><text x="${x}" y="${y + 1.25}" font-size="3.6" font-weight="800" fill="${C.wine}" text-anchor="middle">${jointOfRay(j)}</text>`;
  };
  return `<svg width="58.6mm" height="252.6mm" viewBox="159 ${-R_OUT / 2 - 1.6} 58.6 252.6" font-family="SerifKa"><g transform="rotate(-90)">
<defs><clipPath id="${id}"><polygon points="${ptsAttr(CANON_POLY)}"/></clipPath></defs>
<polygon points="${ptsAttr(CANON_POLY)}" fill="${LOOKS[P.look].base}" stroke="${LOOKS[P.look].base}" stroke-width="3.2" stroke-linejoin="miter"/>
<g clip-path="url(#${id})">${pieceArt(P.look)}</g>
${slots.map(slotSvg).join('')}
${P.note ? `<text x="${nameX}" y="201.5" font-size="3.2" fill="#fbf6ec" text-anchor="middle" stroke="#000" stroke-opacity=".35" stroke-width=".5" paint-order="stroke">${esc(P.note)}</text>` : ''}
<text x="${nameX}" y="209.6" font-size="5.2" font-weight="800" fill="#fbf6ec" text-anchor="middle" letter-spacing=".2" stroke="#000" stroke-opacity=".4" stroke-width=".7" paint-order="stroke">${userNo(P.k)} · ${esc(P.name)}</text>
${joint(1)}${joint(-1)}
<polygon points="${ptsAttr(CANON_POLY)}" fill="none" stroke="#3a3027" stroke-width=".22"/>
</g></svg>`;
};

// ---------- the pieces' shapes: a darbazi house (village), a tower with a dome (city), a road ----------
const PLAYERS = [
  { name: 'ღვინისფერი', color: '#7a2028' },
  { name: 'ოქროსფერი', color: '#c08f2a' },
  { name: 'ლურჯი', color: '#1f4e9c' },
  { name: 'მწვანე', color: '#1d7f5f' },
];
const FIG = {
  village: { w: 16, h: 16, d: 'M0 7L8 0L16 7V16H0Z', inner: '<path d="M6.3 16v-5.2h3.4V16"/><path d="M7 3.6h2v1.8H7z"/>' },
  city: { w: 20, h: 25, d: 'M0 25V11H5V5A5 5 0 0 1 15 5V11H20V25Z', inner: '<path d="M7.6 25v-5a2.4 2.4 0 0 1 4.8 0v5"/><path d="M3 14.5h3v3H3zM14 14.5h3v3h-3z"/>' },
  road: { w: 38, h: 6, d: 'M.8 0H37.2A.8 .8 0 0 1 38 .8V5.2A.8 .8 0 0 1 37.2 6H.8A.8 .8 0 0 1 0 5.2V.8A.8 .8 0 0 1 .8 0Z', inner: '<path d="M3 3H35" stroke-dasharray="2.2 1.6"/>' },
};
/** A piece drawn `w`×`h` mm (its own units), filled with `color`, white details; `bleed` grows the fill for cutting. */
const figSvg = (kind, color, { scale = 1, bleed = 0, cut = false, line = '#fbf6ec' } = {}) => {
  const f = FIG[kind], pad = 1.5, w = f.w * scale, h = f.h * scale;
  return `<svg width="${w + 2 * pad * scale}mm" height="${h + 2 * pad * scale}mm" viewBox="${-pad} ${-pad} ${f.w + 2 * pad} ${f.h + 2 * pad}" style="display:block">
<path d="${f.d}" fill="${color}" stroke="${color}" stroke-width="${bleed * 2}" stroke-linejoin="miter"/>
<g fill="none" stroke="${line}" stroke-width=".55" stroke-linecap="round" stroke-linejoin="round">${f.inner}</g>
${cut ? `<path d="${f.d}" fill="none" stroke="#3a3027" stroke-width=".2"/>` : `<path d="${f.d}" fill="none" stroke="${line}" stroke-opacity=".7" stroke-width=".35"/>`}</svg>`;
};

// ---------- harvest cards (63×88): 19 of each, one back for all ----------
const RES_LANDS = Object.fromEntries(RK.map(k => [k, LANDS.filter(l => l.res === k).map(l => l.name)]));
const NEEDS = { wood: ['road', 'village'], stone: ['road', 'village'], wool: ['village', 'dev'], grain: ['village', 'city', 'dev'], ore: ['city', 'dev'] };
const devMini = (h = 5.4) => `<svg width="${h * 0.72}mm" height="${h}mm" viewBox="0 0 7.2 10" style="display:block"><rect x=".3" y=".3" width="6.6" height="9.4" rx=".9" fill="${C.brown}"/><rect x="1.1" y="1.1" width="5" height="7.8" rx=".5" fill="none" stroke="${C.gold}" stroke-width=".4"/><circle cx="3.6" cy="5" r="1.4" fill="none" stroke="${C.gold}" stroke-width=".4"/></svg>`;
const needIcon = (kind, color = C.brown) => kind === 'dev' ? devMini() : figSvg(kind, color, { scale: kind === 'road' ? 0.2 : kind === 'city' ? 0.22 : 0.3 });
const cardFrame = color => `<div class="frame" style="border-color:${color}"></div><div class="frame2"></div>`;
const resIndex = (k, pos) => `<div class="idx ${pos}" style="background:${RES[k].color}">${ic(RES[k].icon, { size: 5.4, color: '#fbf6ec', width: 2 })}</div>`;
const resArt = k => {
  const r = RES[k], id = `ra${clipN++}`, shape = 'M0 44V18A26 18 0 0 1 52 18V44Z';
  return `<svg width="52mm" height="44mm" viewBox="0 0 52 44" style="display:block">
<defs><clipPath id="${id}"><path d="${shape}"/></clipPath></defs>
<path d="${shape}" fill="${r.color}"/>
<g clip-path="url(#${id})"><g transform="translate(-1 0) scale(.68 .72)">${landDecor(k, r.ink)}</g></g>
<path d="${shape}" fill="none" stroke="${C.gold}" stroke-width=".5"/>
<circle cx="26" cy="24.5" r="13" fill="#fbf6ec" stroke="${C.gold}" stroke-width=".5"/>
${icIn(r.icon, { x: 16, y: 14.5, size: 20, color: r.color, width: 1.6 })}</svg>`;
};
const resCard = k => {
  const r = RES[k];
  return `<div class="card res" style="background:${r.soft}">${cardFrame(r.color)}${resIndex(k, 'tl')}${resIndex(k, 'br')}
<div class="body"><div class="rname" style="color:${r.color}">${esc(r.name)}</div>
<div class="art">${resArt(k)}</div>
<div class="from"><b style="color:${r.color}">${esc(r.land)}:</b> ${RES_LANDS[k].map(esc).join(' · ')}</div>
<div class="need"><span>სჭირდება:</span>${NEEDS[k].map(n => needIcon(n)).join('')}</div></div></div>`;
};
const leafRing = (r, color, n = 12) => `<circle r="${r}" fill="none" stroke="${color}" stroke-width=".45"/><circle r="${r - 2.4}" fill="none" stroke="${color}" stroke-width=".3" stroke-dasharray="1 1.4"/>
${Array.from({ length: n }, (_, i) => `<path d="M0 ${-r} C1.6 ${-r + 1.4} 1.6 ${-r + 3} 0 ${-r + 4.4} C-1.6 ${-r + 3} -1.6 ${-r + 1.4} 0 ${-r}Z" fill="${color}" fill-opacity=".8" transform="rotate(${(i * 360) / n})"/>`).join('')}`;
const cardBack = (bg, word) => `<div class="card dark" style="background:${bg}"><div class="frame"></div>${corners(C.gold, 9, 4.6)}
<svg class="backArt" width="63mm" height="88mm" viewBox="0 0 63 88" font-family="SansKa"><g transform="translate(31.5 41)">${leafRing(18, C.gold)}</g>
<text x="31.5" y="45.2" font-size="11" font-weight="900" fill="${C.gold}" text-anchor="middle" letter-spacing=".3">${MONO}</text>
<text x="31.5" y="70" font-size="4.6" font-family="SerifKa" font-weight="800" fill="#f0d9a0" text-anchor="middle">${esc(word)}</text>
<text x="31.5" y="79.2" font-size="2.9" fill="${C.gold}" text-anchor="middle" letter-spacing=".5">${aso(title)}</text></svg></div>`;
const resBack = cardBack(C.wine, 'მოსავალი');
const spareCard = (color = C.wine) => `<div class="card">${cardFrame(color)}<div class="body"><div class="spare">სათადარიგო ბარათი<br><span>დაკარგულის ნაცვლად — სახელი მარკერით</span></div></div></div>`;

// ---------- development cards (63×88): 14 + 2 + 2 + 2 + 5 treasures ----------
const flared = (cx, cy, s, color) => `<g transform="translate(${cx} ${cy}) scale(${s})" fill="${color}">${[0, 90, 180, 270].map(a => `<path d="M0 0L-2.6 -8A2.8 1.2 0 0 1 2.6 -8Z" transform="rotate(${a})"/>`).join('')}<circle r="1.3"/></g>`;
const DEV_ART = {
  knight: () => `${icIn('swords', { x: 10, y: 1.5, size: 30, color: C.goldDark, width: 1.1, opacity: 0.55 })}
<path d="M25 4.5L35 8V17C35 23.5 30.6 28 25 30C19.4 28 15 23.5 15 17V8Z" fill="${C.wine}" stroke="${C.gold}" stroke-width=".7"/>
<path d="M25 7L32.6 9.8V17C32.6 22 29.3 25.8 25 27.4C20.7 25.8 17.4 22 17.4 17V9.8Z" fill="none" stroke="${C.gold}" stroke-width=".3"/>${flared(25, 17, 0.78, C.gold)}`,
  bridge: () => `<path d="M3 26 q5.5 -2.4 11 0 t11 0 t11 0 t11 0" stroke="#5d93bf" stroke-width=".8" fill="none"/><path d="M3 29 q5.5 -2.4 11 0 t11 0 t11 0 t11 0" stroke="#86b6dc" stroke-width=".6" fill="none"/>
<path d="M4 13Q25 3 46 13V16H4Z" fill="#b7a58a" stroke="${C.brown}" stroke-width=".6" stroke-linejoin="round"/><path d="M8 16.4H42V24H36A11 9 0 0 0 14 24H8Z" fill="#cdbb9c" stroke="${C.brown}" stroke-width=".6"/>
${[11, 17, 23, 29, 35].map(x => `<path d="M${x} 9.6v-.1" stroke="${C.brown}" stroke-width=".4"/>`).join('')}<path d="M4 13Q25 3 46 13" fill="none" stroke="${C.brown}" stroke-width=".4" stroke-dasharray="1.6 1.2" transform="translate(0 1.6)"/>
${icIn('hammer', { x: 38, y: 0.6, size: 9, color: C.wine, width: 1.8 })}`,
  plenty: () => `${icIn('sun', { x: 19, y: 0.4, size: 12, color: C.gold, width: 1.5 })}${icIn('grape', { x: 4.5, y: 7.5, size: 21, color: C.wine, width: 1.5 })}${icIn('wheat', { x: 24.5, y: 7.5, size: 21, color: C.goldDark, width: 1.5 })}`,
  toll: () => `${icIn('warehouse', { x: 4, y: 7, size: 20, color: C.brown, width: 1.4 })}${icIn('stamp', { x: 26, y: 3.5, size: 18, color: C.wine, width: 1.5 })}${icIn('coins', { x: 42.2, y: 20.8, size: 8, color: C.goldDark, width: 1.7 })}`,
  gelati: () => `${icIn('church', { x: 5, y: 3, size: 25, color: C.wine, width: 1.3 })}${icIn('book-open', { x: 28, y: 9, size: 17, color: C.brown, width: 1.5 })}`,
  ikalto: () => `${icIn('landmark', { x: 4.5, y: 4, size: 23, color: C.wine, width: 1.35 })}${icIn('scroll-text', { x: 28, y: 8, size: 17, color: C.brown, width: 1.5 })}`,
  vardzia: () => `<path d="M2 29L13 8L20 14L27 3L38 15L48 29Z" fill="#d9c3a0" stroke="${C.brown}" stroke-width=".6" stroke-linejoin="round"/>
${[[14, 19], [19.5, 18], [25, 15.5], [30.5, 18], [36, 21], [17, 24], [23, 23], [29, 23.5], [35, 25.6]].map(([x, y]) => `<path d="M${x - 1.3} ${y + 1.6}v-1.6a1.3 1.3 0 0 1 2.6 0v1.6z" fill="${C.brown}"/>`).join('')}`,
  sveti: () => `${icIn('church', { x: 9.5, y: 1, size: 29, color: C.wine, width: 1.25 })}`,
  vepkhis: () => `${icIn('book-open', { x: 4, y: 5, size: 24, color: C.wine, width: 1.35 })}${icIn('feather', { x: 28, y: 4, size: 18, color: C.goldDark, width: 1.5 })}`,
};
const devArt = kind => `<svg width="50mm" height="31mm" viewBox="0 0 50 31" style="display:block">${DEV_ART[kind]()}</svg>`;
const DEV = [
  { key: 'knight', n: 14, name: 'მეციხოვნე', rule: 'მოთარეშე სხვა მხარეზე გადაიყვანე და იქ მდგომ ერთ მოთამაშეს 1 მოსავლის ბარათი ამოფარებით წაართვი.', cap: 'გაშლილი შენ წინ რჩება · სამი — დიდი ლაშქარი' },
  { key: 'bridge', n: 2, name: 'ხიდის ოსტატი', rule: 'ააშენე 2 გზა უფასოდ.', cap: 'ბესლეთისა და დანდალოს ქვის ხიდები' },
  { key: 'plenty', n: 2, name: 'ბარაქა', rule: 'აიღე ბანკიდან ნებისმიერი 2 მოსავალი — შეიძლება ორივე ერთნაირი.', cap: 'რთველი და კალო' },
  { key: 'toll', n: 2, name: 'სამეფო ბაჟი', rule: 'დაასახელე ერთი მოსავალი — ყველა მოთამაშე ასეთ ყველა ბარათს შენ გაძლევს.', cap: 'მეფის ბეჭედი და ქარვასლა' },
];
const TREASURES = [
  { key: 'gelati', name: 'გელათის აკადემია', date: '1106', about: 'დავით აღმაშენებლის აკადემია ქუთაისთან' },
  { key: 'ikalto', name: 'იყალთოს აკადემია', date: 'XII ს.', about: 'არსენ იყალთოელის სკოლა კახეთში' },
  { key: 'vardzia', name: 'ვარძია', date: '1185', about: 'თამარ მეფის კლდის მონასტერი' },
  { key: 'sveti', name: 'სვეტიცხოველი', date: '1029', about: 'მცხეთის დიდი ტაძარი' },
  { key: 'vepkhis', name: '„ვეფხისტყაოსანი“', date: '≈1200', about: 'შოთა რუსთაველის პოემა' },
];
const devCard = d => `<div class="card dev">${cardFrame(C.wine)}${corners(C.gold, 7, 4.2)}
<div class="body"><div class="kind aso">${aso('განვითარება')}</div><div class="dname">${esc(d.name)}</div>
<div class="art">${devArt(d.key)}</div><div class="rule">${esc(d.rule)}</div><div class="cap">${esc(d.cap)}</div></div></div>`;
const treasureCard = t => `<div class="card dev tre">${cardFrame(C.wine)}${corners(C.gold, 7, 4.2)}
<div class="body"><div class="kind aso">${aso('საგანძური')}</div><div class="dname fit"><span>${esc(t.name)}</span></div>
<div class="art">${devArt(t.key)}<div class="date">${esc(t.date)}</div><div class="pt"><b>1</b>ქულა</div></div>
<div class="rule">ფარულად შეინახე. გახსენი, როცა 10 ქულა შეგიგროვდება.</div><div class="cap">${esc(t.about)}</div></div></div>`;
const devBack = cardBack(C.brown, 'განვითარება');

// ---------- A6 cards (105×148.5, four to a sheet; a 5 mm white edge, so a printer's margin never touches them) ----------
const A6W = 105, A6H = 148.5;
const a6 = (inner, { bg = C.paper, border = C.wine, cls = '' } = {}) => `<div class="a6 ${cls}"><div class="a6in" style="background:${bg};border-color:${border}">${inner}</div></div>`;
// cut marks only where no card is: ticks at the edges and a cross in the middle (the cards keep a 5 mm white edge)
const a6Cuts = `<svg viewBox="0 0 210 297" width="210mm" height="297mm" style="position:absolute;left:0;top:0" stroke="#8a7a68" stroke-width=".25"><path d="M105 3V11M105 286V294M3 148.5H11M199 148.5H207M105 141V156M97.5 148.5H112.5"/></svg>`;
const a6Sheet = (cards, opts) => placedSheet([{ x: 0, y: 0, w: 210, h: 297, html: a6Cuts }, ...cards.map((html, i) => ({ x: (i % 2) * A6W, y: Math.floor(i / 2) * A6H, w: A6W, h: A6H, html }))], { ...opts, cls: 'placed a6sheet' });

const chip = (k, s = 7.6) =>`<span class="chip" style="background:${RES[k].color};width:${s}mm;height:${s}mm">${ic(RES[k].icon, { size: s * 0.66, color: '#fbf6ec', width: 2.1 })}</span>`;
const COSTS = [
  { what: 'გზა', fig: 'road', need: ['wood', 'stone'], note: 'შენი გზის, სოფლის ან ქალაქის გვერდით' },
  { what: 'სოფელი', fig: 'village', pts: '1 ქულა', need: ['wood', 'stone', 'wool', 'grain'], note: 'შენი გზის ბოლოს · მეზობელ კუთხეებში არავინ დგას' },
  { what: 'ციხე-ქალაქი', fig: 'city', pts: '2 ქულა', need: ['ore', 'ore', 'ore', 'grain', 'grain'], note: 'შენი სოფლის ადგილას — სოფელი მარაგში ბრუნდება' },
  { what: 'განვითარება', fig: 'dev', need: ['ore', 'wool', 'grain'], note: 'დასტის ზედა ბარათი — არავის აჩვენო' },
];
const costFig = (fig, color, k = 1) => fig === 'dev' ? devMini(12 * k) : figSvg(fig, color, { scale: (fig === 'road' ? 0.36 : fig === 'city' ? 0.5 : 0.62) * k });
const costRows = color => COSTS.map(c => `<div class="crow"><div class="cfig">${costFig(c.fig, color)}</div><div class="cwhat"><b>${esc(c.what)}</b>${c.pts ? `<span class="pts">${c.pts}</span>` : ''}</div>
<div class="cneed">${c.need.map(k => chip(k)).join('')}</div><div class="cnote">${esc(c.note)}</div></div>`).join('');
const band = (text, color, sub = '') => `<div class="band" style="background:${color}"><div class="aso">${aso(title)}</div><div class="bt">${esc(text)}</div>${sub ? `<div class="bs">${esc(sub)}</div>` : ''}</div>`;
const costCard = p => a6(`${band('მშენებლობის ფასები', p.color, p.name)}<div class="a6body">${costRows(p.color)}
<div class="ptsBox"><b>ქულები:</b> სოფელი 1 · ციხე-ქალაქი 2 · აბრეშუმის გზა 2 · დიდი ლაშქარი 2 · საგანძური 1.<br><b class="win">10 ქულა შენს სვლაზე — გამარჯვება!</b><div class="stock">მარაგი: 5 სოფელი · 4 ციხე-ქალაქი · 15 გზა</div></div></div>`, { border: p.color });
const diceChart = () => {
  const bars = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n, i) => {
    const pips = 6 - Math.abs(7 - n), x = 4 + i * 7.6, red = n === 7;
    return `${Array.from({ length: pips }, (_, j) => `<circle cx="${x + 3}" cy="${20 - j * 3}" r="1.1" fill="${red || n === 6 || n === 8 ? C.wine : C.brown}" fill-opacity="${red ? 1 : n === 6 || n === 8 ? 0.85 : 0.7}"/>`).join('')}
<text x="${x + 3}" y="26" font-size="3.4" font-weight="${red || n === 6 || n === 8 ? 800 : 400}" fill="${red ? C.wine : C.brown}" text-anchor="middle">${n}</text>`;
  }).join('');
  return `<svg width="88mm" height="27mm" viewBox="0 0 88 27" font-family="SerifKa" style="display:block;margin:0 auto">${bars}</svg>`;
};
const turnCard = p => a6(`${band('შენი სვლა', p.color, 'სამი ნაბიჯი')}<div class="a6body steps">
<div class="st"><span class="n" style="background:${p.color}">1</span><div><b>კამათელი.</b> აგორე ორი კამათელი. ამოსული რიცხვის მხარეები მოსავალს აძლევს — სოფელს 1 ბარათს, ქალაქს 2-ს.</div></div>
<div class="st seven"><span class="n" style="background:${C.wine}">7</span><div><b>7-იანი:</b> მოსავალი არავის. ვისაც 8 ან მეტი მოსავლის ბარათი აქვს, ნახევარს აგდებს. შენ მოთარეშე გადაიყვანე და მეზობელს 1 ბარათი წაართვი.</div></div>
<div class="st"><span class="n" style="background:${p.color}">2</span><div><b>ვაჭრობა.</b> მოთამაშეებთან — როგორც შეთანხმდებით. ბანკთან 4 ერთნაირი → 1; შენს კარიბჭესთან 3:1 ან 2:1.</div></div>
<div class="st"><span class="n" style="background:${p.color}">3</span><div><b>მშენებლობა.</b> ააშენე და იყიდე, რაც გეყოფა — ფასები მეორე მხარესაა.</div></div>
<div class="devNote">განვითარების ბარათი: სვლაში ერთი, ნებისმიერ დროს — ოღონდ არა ამ სვლაში ნაყიდი.</div>
<div class="chartT">36 გაგორებიდან რამდენჯერ ამოდის ყოველი რიცხვი</div>${diceChart()}<div class="chartC">6 და 8 ყველაზე ხშირია · 7 — მოთარეშის რიცხვია</div></div>`, { border: p.color });

// the two big 2-point cards, framed with a carpet's border
const carpet = (w, h, { bg = C.wine, fg = C.gold, field = C.paper, id }) => {
  const tw = w / Math.round(w / 8), th = h / Math.round(h / 8);
  return `<svg width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}" style="position:absolute;left:0;top:0;display:block">
<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="${tw}" height="${th}"><rect width="${tw}" height="${th}" fill="${bg}"/><path d="M${tw / 2} .7L${tw - 0.7} ${th / 2}L${tw / 2} ${th - 0.7}L.7 ${th / 2}Z" fill="none" stroke="${fg}" stroke-width=".55"/><path d="M${tw / 2} ${th / 2 - 1.5}L${tw / 2 + 1.5} ${th / 2}L${tw / 2} ${th / 2 + 1.5}L${tw / 2 - 1.5} ${th / 2}Z" fill="${fg}"/></pattern></defs>
<rect width="${w}" height="${h}" fill="url(#${id})"/>${field ? `<rect x="${tw}" y="${th}" width="${w - 2 * tw}" height="${h - 2 * th}" fill="${field}" stroke="${fg}" stroke-width=".6"/><rect x="${tw - 1.3}" y="${th - 1.3}" width="${w - 2 * tw + 2.6}" height="${h - 2 * th + 2.6}" fill="none" stroke="${fg}" stroke-width=".3"/>` : ''}</svg>`;
};
const IW = A6W - 10 - 1.6, IH = A6H - 10 - 1.6; // inside an A6 card's border
const SPECIAL = [
  { key: 'road', name: 'აბრეშუმის გზა', rule: 'ვინც პირველი ააშენებს 5 ან მეტ გადაბმულ გზას, ეს ბარათი მისია. ვინც უფრო გრძელს ააშენებს, წაართმევს; თანაბარზე ბარათი პატრონთან რჩება.', cap: 'გზა, რომელიც მეზობლებს აკავშირებს',
    art: `<path d="M6 52C20 44 18 30 34 30S50 44 64 34S74 12 86 10" fill="none" stroke="#b39a73" stroke-width="7" stroke-linecap="round"/><path d="M6 52C20 44 18 30 34 30S50 44 64 34S74 12 86 10" fill="none" stroke="#f6ecd6" stroke-width=".7" stroke-dasharray="2.4 2"/>
${[[6, 52], [34, 30], [64, 34], [86, 10]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.3" fill="${C.wine}" stroke="#f6ecd6" stroke-width=".7"/>`).join('')}
${icIn('warehouse', { x: 39, y: 6, size: 15, color: C.brown, width: 1.4 })}${icIn('sailboat', { x: 4, y: 20, size: 15, color: SEA, width: 1.5 })}${icIn('mountain-snow', { x: 66, y: 38, size: 16, color: '#53647b', width: 1.4 })}` },
  { key: 'army', name: 'დიდი ლაშქარი', rule: 'ვინც პირველი გახსნის 3 მეციხოვნეს, ეს ბარათი მისია. ვინც მეტს გახსნის, წაართმევს; თანაბარზე ბარათი პატრონთან რჩება.', cap: 'ქვეყნის დაცვა და არა თავდასხმა · დიდგორი, 1121',
    art: `${[[18, 8, -12], [74, 8, 12]].map(([x, y, a]) => `<g transform="rotate(${a} ${x} ${y + 24})"><line x1="${x}" y1="${y}" x2="${x}" y2="${y + 48}" stroke="${C.brown}" stroke-width="1.1"/><path d="M${x} ${y + 1}h13l-3 5 3 5h-13z" fill="${C.wine}"/>${flared(x + 5.6, y + 6, 0.32, C.gold)}</g>`).join('')}
<path d="M46 6L64 12.5V29C64 41 56 49 46 53C36 49 28 41 28 29V12.5Z" fill="${C.wine}" stroke="${C.gold}" stroke-width="1"/><path d="M46 10L60.4 15.2V29C60.4 38.6 54 45.4 46 48.8C38 45.4 31.6 38.6 31.6 29V15.2Z" fill="none" stroke="${C.gold}" stroke-width=".4"/>${flared(46, 29, 1.45, C.gold)}` },
];
const specialCard = s => a6(`${carpet(IW, IH, { id: `cp${s.key}` })}<div class="spc"><div class="aso sk">${aso('ოქროს ხანა')}</div><div class="sn">${esc(s.name)}</div>
<svg width="70mm" height="44.1mm" viewBox="0 0 92 58" style="display:block;margin:2mm auto 0;overflow:visible">${s.art}</svg>
<div class="medal"><b>2</b><span>ქულა</span></div><div class="sr">${esc(s.rule)}</div><div class="sc">${esc(s.cap)}</div></div>`, { border: C.gold, cls: 'special' });
const specialBack = s => a6(`${carpet(IW, IH, { id: `cb${s.key}`, field: null })}<div class="sback"><svg width="60mm" height="60mm" viewBox="-30 -30 60 60" font-family="SansKa">${leafRing(26, C.gold, 16)}<circle r="21" fill="${C.wine}"/>
<text y="5" font-size="14" font-weight="900" fill="${C.gold}" text-anchor="middle">${MONO}</text></svg><div class="sbn">${esc(s.name)} · 2 ქულა</div></div>`, { border: C.gold, cls: 'special' });

// the setup card: steps on the front, the token spiral of the learning layout on the back
const spiralSvg = () => {
  const s = 0.17, order = spiralOrder(LEARN.start), desert = LANDS.find(l => !l.res).at, pts = order.map(hexC);
  const hexes = ISLAND.map(h => { const [x, y] = hexC(h), d = h.join() === desert.join(); return `<polygon points="${ptsAttr(hexPts(x, y, HR - 1.5))}" fill="${d ? DESERT.color : '#f6ecd6'}" stroke="${C.gold}" stroke-width="2.2"/>`; }).join('');
  const marks = order.map(h => { const [x, y] = hexC(h), v = LEARN.nums.get(h.join()); return v ? `<circle cx="${x}" cy="${y}" r="15" fill="${C.wine}"/><text x="${x}" y="${y + 6.6}" font-size="19" font-weight="800" fill="#f0d9a0" text-anchor="middle">${v.letter}</text>` : `<text x="${x}" y="${y + 4}" font-size="11.5" fill="${C.brown}" text-anchor="middle">უდაბნო</text><text x="${x}" y="${y + 17}" font-size="9.5" fill="${C.brown}" text-anchor="middle">გამოტოვე</text>`; }).join('');
  const path = `<polyline points="${ptsAttr(pts)}" fill="none" stroke="${C.goldDark}" stroke-width="3.2" stroke-dasharray="8 5" marker-mid="url(#arw)"/>`;
  const [sx, sy] = pts[0];
  return `<svg width="${430 * s}mm" height="${410 * s}mm" viewBox="-215 -205 430 410" font-family="SerifKa" style="display:block;margin:0 auto">
<defs><marker id="arw" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M1 1L9 5L1 9Z" fill="${C.goldDark}"/></marker></defs>
${hexes}${path}${marks}<text x="${sx - 26}" y="${sy - 34}" font-size="16" font-weight="800" fill="${C.wine}" text-anchor="middle">დაწყება ▸</text></svg>`;
};
const LETTER_TABLE = LETTERS.map((l, i) => `<span><b>${l}</b>${SPIRAL_NUMS[i]}</span>`).join('');
const setupCard = a6(`${band('მომზადება', C.wine, 'წესი 1–4 · მოკლედ')}<div class="a6body list"><ol>
<li><b>ჩარჩო:</b> 6 ნაწილი ასოებით შეაერთე (ა-ს ა…), 1 — ჩრდილოეთი — ზემოთ.</li>
<li><b>მხარეები:</b> 19 ამოფარებით აურიე, ჩაალაგე 3-4-5-4-3 — ან სასწავლო განლაგება (წესები, გვ. 3).</li>
<li><b>კარიბჭეები:</b> 9 ჟეტონი ამოფარებით, თითო მრგვალ ადგილზე.</li>
<li><b>რიცხვები:</b> ასოებით ზემოთ, ა → ს სპირალით (ზურგზე), მერე გადააბრუნე.</li>
<li><b>მოთარეშე</b> — უდაბნოზე.</li>
<li><b>ბანკი:</b> მოსავალი 5 დასტად; განვითარება არეული, პირქვე.</li>
<li><b>ყველას:</b> 5 სოფელი, 4 ქალაქი, 15 გზა და ფასების ბარათი.</li>
<li><b>პირველი სოფლები:</b> ორ წრედ — საათის ისრით, მერე უკან; მეორე სოფელი პირველ მოსავალს იძლევა.</li></ol></div>`);
const spiralCard = a6(`${band('რიცხვების სპირალი', C.wine, 'სასწავლო განლაგება')}<div class="a6body spiral">${spiralSvg()}
<p>დაიწყე კუთხიდან და იარე <b>საათის ისრის საწინააღმდეგოდ</b>: ჯერ გარე წრე, მერე შიდა, ბოლოს შუა. ყოველ შემთხვევით დაფაზეც ასე.</p>
<div class="lt">${LETTER_TABLE}</div><p class="small">ასო → რიცხვი: დაკარგულ ჟეტონს ასე აღადგენ.</p></div>`);
const teacherCard = a6(`${band('მასწავლებლისთვის', C.brown, 'ბანკი · 7-იანი · მოთარეშე')}<div class="a6body list"><ul>
<li><b>ბანკი შენ ხარ:</b> არიგებ მოსავალს და ამოწმებ ფასებს — ბავშვები ითვლიან, შენ ადასტურებ.</li>
<li><b>7-იანი:</b> „ვის აქვს 8 ან მეტი მოსავალი?“ — ყველა ხმამაღლა ითვლის, ნახევარი (დაბლა დამრგვალებით) ბანკში.</li>
<li><b>მოთარეშე:</b> ჯერ გადაიყვანე, მერე იქ მდგომთაგან ერთს ამოფარებით 1 ბარათი.</li>
<li><b>ვაჭრობა:</b> მხოლოდ მოსიარულეს; ხმაურში — „ვაჭრობის ერთი წუთი“.</li>
<li><b>დავა:</b> ჯერ წესს ვკითხულობთ (წესები, 13 პუნქტი), მერე ვწყვეტთ.</li>
<li><b>ქება:</b> ყოველ სვლაზე ერთი კარგი სიტყვა — ვინ კარგად ივაჭრა, ვინ სიტყვა შეასრულა.</li></ul></div>`, { border: C.brown });
const variantCard = a6(`${band('სასკოლო ვარიანტი', C.brown, '45–60 წუთი · ერთი გაკვეთილი')}<div class="a6body list"><ul>
<li><b>8 ქულამდე</b> ითამაშეთ, არა 10-მდე.</li>
<li><b>სასწავლო განლაგება</b> — წესების მე-3 გვერდიდან; შემთხვევითი დაფა — როცა უკვე იციან.</li>
<li><b>ოთხ ჯგუფად:</b> დიდ კლასში თითო ფერს 2–3 ბავშვი თამაშობს და ერთად წყვეტს.</li>
<li><b>სვლის საათი:</b> 90 წამი — ქვიშის საათით ან ტელეფონით.</li>
<li><b>ბოლოს ყველამ თქვას:</b> რომელ მხარეებზე იდგა მისი სოფლები და რა ძეგლია იქ?</li></ul>
<div class="hint">„ვაჭრობა ნათქვამი სიტყვის შესრულებაა“ — შეთანხმება ბოლომდე სრულდება.</div></div>`, { border: C.brown });

// ---------- the paper pieces (one sheet, four colours, coloured on both sides) ----------
const figuresSheet = (back) => {
  const items = [];
  PLAYERS.forEach((p, i) => {
    const bx = 12 + (i % 2) * 96, by = 16 + Math.floor(i / 2) * 136;
    items.push({ x: bx, y: by, w: 90, h: 7, html: `<div class="fhead" style="color:${p.color}">${back ? '' : `${esc(p.name)} · 5 სოფელი · 4 ციხე-ქალაქი · 15 გზა`}</div>` });
    for (let v = 0; v < 5; v++) items.push({ x: bx + v * 18.4 - 1.5, y: by + 9 - 1.5, w: 19, h: 19, html: figSvg('village', p.color, { bleed: 0.7, cut: true }) });
    for (let c = 0; c < 4; c++) items.push({ x: bx + c * 23 - 1.5, y: by + 30 - 1.5, w: 23, h: 28, html: figSvg('city', p.color, { bleed: 0.7, cut: true }) });
    for (let r = 0; r < 15; r++) items.push({ x: bx + (r % 2) * 46 - 1.5, y: by + 60 + Math.floor(r / 2) * 8.6 - 1.5, w: 41, h: 9, html: figSvg('road', p.color, { bleed: 0.7, cut: true }) });
  });
  return items;
};

// ---------- the whole board, small: the learning layout for the rules, the assembly drawing for the cover ----------
const boardSvg = (mode, width) => {
  const [padX, padTop, padBot] = mode === 'learn' ? [40, 40, 40] : [30, 58, 30];
  const vb = [-R_OUT - padX, -A_OUT - padTop, 2 * (R_OUT + padX), 2 * A_OUT + padTop + padBot];
  const frame = PIECES.map(P => `<polygon points="${ptsAttr(piecePoly(P.k))}" fill="${LOOKS[P.look].base}" stroke="#fbf6ec" stroke-width="2.4"/>`).join('');
  let inner = '';
  if (mode === 'assembly') {
    inner += ISLAND.map(h => `<polygon points="${ptsAttr(hexPts(...hexC(h), HR))}" fill="#efe4cc" stroke="#fbf6ec" stroke-width="2.4"/>`).join('');
    inner += PIECES.map(P => { const [x, y] = dirOf(60 * P.k + 30).map(v => v * 200); return `<text x="${x}" y="${y + 15}" font-size="42" font-weight="800" fill="#fbf6ec" text-anchor="middle" stroke="#000" stroke-opacity=".35" stroke-width="2" paint-order="stroke">${userNo(P.k)}</text>`; }).join('');
    inner += [0, 1, 2, 3, 4, 5].map(j => { const [x, y] = dirOf(60 * j).map(v => v * (R_OUT + 2)); return `<circle cx="${x}" cy="${y}" r="17" fill="#f6ecd6" stroke="${C.gold}" stroke-width="2"/><text x="${x}" y="${y + 7.5}" font-size="22" font-weight="800" fill="${C.wine}" text-anchor="middle">${jointOfRay(j)}</text>`; }).join('');
    inner += `<text x="0" y="${-A_OUT - 26}" font-size="26" font-weight="700" fill="${C.wine}" text-anchor="middle">▲ ჩრდილოეთი</text>`;
  } else {
    inner += GATE_POS.map(g => [g.a, g.b].map(p => `<line x1="${g.c[0]}" y1="${g.c[1]}" x2="${p[0]}" y2="${p[1]}" stroke="#f6ecd6" stroke-width="3" stroke-linecap="round"/>`).join('')).join('');
    inner += LANDS.map(l => {
      const [x, y] = hexC(l.at), look = LOOK(l.res), v = LEARN.nums.get(l.at.join()), red = v && (v.n === 6 || v.n === 8);
      const words = l.name.split(' '), two = words.length > 1, w = two ? 46 : 60;
      const name = two ? words.map((t, i) => `<text x="${x}" y="${y + 20.5 + i * 9.5}" font-size="9" font-weight="700" fill="${C.wine}" text-anchor="middle">${esc(t)}</text>`).join('')
        : `<text x="${x}" y="${y + 23.2}" font-size="9" font-weight="700" fill="${C.wine}" text-anchor="middle">${esc(l.name)}</text>`;
      return `<polygon points="${ptsAttr(hexPts(x, y, HR))}" fill="${look.color}" stroke="#fbf6ec" stroke-width="2.4"/>
${l.res ? icIn(RES[l.res].icon, { x: x - 7, y: y - 38, size: 14, color: '#fbf6ec', width: 2 }) : icIn('robber', { x: x - 12, y: y - 20, size: 24, color: '#3b2b1f', opacity: 0.6 })}
${v ? `<circle cx="${x}" cy="${y - 5}" r="13" fill="#f6ecd6" stroke="${C.gold}" stroke-width="1.2"/><text x="${x}" y="${y + 0.6}" font-size="16" font-weight="800" fill="${red ? C.wine : C.brown}" text-anchor="middle">${v.n}</text>` : ''}
<rect x="${x - w / 2}" y="${y + 13}" width="${w}" height="${two ? 20 : 13.5}" rx="3" fill="#f6ecd6" fill-opacity=".94"/>${name}`;
    }).join('');
    inner += GATE_POS.map(g => {
      const r = g.learn === '3' ? null : RES[g.learn], ang = angOf(...g.c), phi = (((ang % 60) + 60) % 60) - 30;
      const d = A_OUT / Math.cos(phi * Math.PI / 180) + 9, [x, y] = dirOf(ang).map(v => v * d);
      const anchor = Math.abs(x) < 70 ? 'middle' : x < 0 ? 'end' : 'start', y0 = y < -100 ? y - 15 : y > 100 ? y + 11 : y - 2;
      return `<circle cx="${g.c[0]}" cy="${g.c[1]}" r="${SLOT_R}" fill="${r ? r.color : SEA}" stroke="#f6ecd6" stroke-width="2"/>
<text x="${g.c[0]}" y="${g.c[1] + 3.6}" font-size="10.5" font-weight="800" fill="#fbf6ec" text-anchor="middle">${r ? '2:1' : '3:1'}</text>
<text x="${x}" y="${y0}" font-size="11" font-weight="700" fill="${C.wine}" text-anchor="${anchor}">${esc(g.name)}</text>
${r ? `<text x="${x}" y="${y0 + 11.5}" font-size="9.5" fill="${C.brown}" text-anchor="${anchor}">2:1 · ${esc(r.name)}</text>` : ''}`;
    }).join('');
  }
  return `<svg width="${width}mm" height="${(width * vb[3] / vb[2]).toFixed(2)}mm" viewBox="${vb.join(' ')}" font-family="SerifKa" style="display:block;margin:0 auto">${frame}${inner}</svg>`;
};

// ---------- rules: four pages ----------
const RULES = [
  ['ჩარჩო და მხარეები', 'ჩარჩოს ექვსი ნაწილი წრედ შეაერთეთ — ბოლოებზე ასოები ერთმანეთს უნდა დაემთხვეს (ა-ს ა, ბ-ს ბ …); 1 — „ჩრდილოეთი“ — ზემოთ. 19 მხარე ზურგით ზემოთ აურიეთ, გადააბრუნეთ და ჩარჩოში ჩააწყვეთ 3-4-5-4-3 რიგებად. პირველ თამაშებში ჯობია სასწავლო განლაგება (გვ. 3). კარიბჭის 9 ჟეტონი ზურგით ზემოთ აურიეთ, ჩარჩოს 9 მრგვალ ადგილზე დაალაგეთ და გადააბრუნეთ. მოთარეშე უდაბნოზე დადგით.'],
  ['რიცხვები და ბანკი', 'რიცხვის 18 ჟეტონი ასოებით ზემოთ დააწყვეთ, ა-დან ს-მდე: დაიწყეთ ნებისმიერი კუთხის მხარიდან და იარეთ საათის ისრის საწინააღმდეგოდ — ჯერ გარე წრე, მერე შიდა, ბოლოს შუა; უდაბნოს გამოტოვებთ. მერე ყველა ჟეტონი რიცხვით ზემოთ გადააბრუნეთ — ასე 6 და 8 ერთმანეთის გვერდით არასოდეს მოხვდება. მოსავლის ბარათები ხუთ დასტად დააწყვეთ — ეს „ბანკია“. განვითარების ბარათები აურიეთ და პირქვე დადეთ; „აბრეშუმის გზა“, „დიდი ლაშქარი“ და კამათელი — გვერდით.'],
  ['მოთამაშეები', 'თითოეული იღებს ერთი ფერის ფიგურებს — 5 სოფელს, 4 ციხე-ქალაქს, 15 გზას — და ფასების ბარათს. სამნი თუ ხართ, ერთი ფერი არ თამაშობს. ვინც ორი კამათლით ყველაზე მეტს აგორებს, ის არის დამწყები.'],
  ['პირველი სოფლები', 'პირველ წრეზე დამწყები, მერე დანარჩენები საათის ისრით, დგამს 1 სოფელს მხარეების რომელიმე კუთხეში და 1 გზას მის გვერდით, კიდეზე. მეორე წრეზე ბოლო მოთამაშე იწყებს და რიგი უკან ბრუნდება — დამწყები ბოლოს დგამს. მეორე სოფლის ყოველი მეზობელი მხარიდან თითო მოსავალს იღებ ბანკიდან. მერე თამაშს დამწყები იწყებს. <b>მანძილის წესი</b> ყოველთვის მოქმედებს: სოფელი ვერ დადგება იქ, სადაც მეზობელ კუთხეში, ერთი გზის მოშორებით, უკვე დგას სოფელი ან ქალაქი — საკუთარიც.'],
  ['სვლა: კამათელი', 'სვლა სამი ნაბიჯია: კამათელი, ვაჭრობა, მშენებლობა. აგორე ორივე კამათელი. ყოველი მხარე, რომლის რიცხვიც ამოვიდა, მოსავალს აძლევს ყველას, ვისაც მის კუთხეში დგას სოფელი (1 ბარათი) ან ქალაქი (2 ბარათი) — შენც და სხვებსაც. მოთარეშიანი მხარე არაფერს იძლევა. თუ ბანკში რომელიმე მოსავალი ყველას არ ეყოფა, იმ მოსავალს არავინ იღებს (თუ მხოლოდ ერთ მოთამაშეს ეკუთვნის — ის იღებს, რაც დარჩა).'],
  ['სვლა: ვაჭრობა', 'შენს სვლაზე შეგიძლია ივაჭრო სხვებთან — როგორც შეთანხმდებით; სხვები ერთმანეთში არ ვაჭრობენ. ერთნაირი ბარათების გაცვლა, საჩუქრად მიცემა და განვითარების ბარათით ვაჭრობა არ შეიძლება. ბანკთან: 4 ერთნაირი ბარათი — 1 ნებისმიერში. თუ შენი სოფელი ან ქალაქი კარიბჭის ორი ბოძიდან ერთ-ერთთან დგას, უკეთესი კურსი გაქვს: 3:1 კარიბჭესთან ნებისმიერ 3 ერთნაირს 1-ში ცვლი, 2:1 კარიბჭესთან — 2 იმ მოსავალს, რაც ჟეტონზე ხატია. რამდენი ბარათი გიჭირავს, ყველამ უნდა იცოდეს; რა გიჭირავს — არა.'],
  ['სვლა: მშენებლობა', '<b>გზა</b> = ხე + ქვა: შენი გზის, სოფლის ან ქალაქის გვერდით; ერთ კიდეზე ერთი გზა; სხვისი სოფელი ან ქალაქი შენს გზას წყვეტს. <b>სოფელი</b> = ხე + ქვა + მატყლი + პური: შენი გზის ბოლოს, მანძილის წესით (1 ქულა). <b>ციხე-ქალაქი</b> = 3 მადანი + 2 პური: შენი სოფლის ადგილას — სოფელი მარაგში ბრუნდება (2 ქულა). <b>განვითარების ბარათი</b> = მადანი + მატყლი + პური: იღებ დასტის ზედას და არავის აჩვენებ. ააშენე, რამდენიც გინდა და გეყოფა — ოღონდ მარაგში დარჩენილი ფიგურებით.'],
  ['7-იანი', 'ვინც 7-იანს აგორებს, იმ სვლაზე მოსავალს არავინ იღებს. ჯერ ყველა, ვისაც ხელში 8 ან მეტი მოსავლის ბარათი აქვს, ნახევარს ბანკში აბრუნებს — თვითონ ირჩევს რომელს (9-დან 4-ს, 11-დან 5-ს); განვითარების ბარათები არ ითვლება. მერე ამგორებელი მოთარეშეს სხვა მხარეზე (ან უდაბნოში) გადაიყვანს და იქ მდგომი სოფლის ან ქალაქის ერთ პატრონს ამოფარებით 1 მოსავლის ბარათს წაართმევს. სანამ მოთარეშე მხარეზე დგას, ის მოსავალს არ იძლევა.'],
  ['განვითარების ბარათები', 'სვლაში მხოლოდ ერთს გახსნი, შენი სვლის ნებისმიერ დროს — კამათლამდეც; ამავე სვლაში ნაყიდს — არა. <b>მეციხოვნე</b>: მოთარეშე გადაიყვანე და 1 ბარათი წაართვი, როგორც 7-იანზე, ოღონდ ბარათების დაყრის გარეშე; გახსნილი მეციხოვნე შენ წინ რჩება. <b>ხიდის ოსტატი</b>: 2 გზა უფასოდ. <b>ბარაქა</b>: 2 ნებისმიერი მოსავალი ბანკიდან. <b>სამეფო ბაჟი</b>: ასახელებ ერთ მოსავალს და ყველა ასეთ ბარათს ყველა მოთამაშე შენ გაძლევს. <b>საგანძური</b>: 1 ქულა; ფარულად ინახავ და გამარჯვებისას ხსნი — ყიდვის სვლაშიც, თუ ის შენი მეათე ქულაა.'],
  ['აბრეშუმის გზა', 'ვინც პირველი ააშენებს 5 ან მეტ ერთმანეთზე გადაბმულ გზას, ამ ბარათს იღებს (2 ქულა). განშტოებებიდან მხოლოდ ერთი, ყველაზე გრძელი ბილიკი ითვლება. ვინც უფრო გრძელს ააშენებს, ბარათს წაართმევს; თანაბარზე ბარათი პატრონთან რჩება. თუ სხვისმა სოფელმა გზა გაგიწყვიტა და ახლა უგრძესი არავის აქვს ან ორს თანაბრად აქვს, ბარათი გვერდზე იდება.'],
  ['დიდი ლაშქარი', 'ვინც პირველი გახსნის 3 მეციხოვნეს, ამ ბარათს იღებს (2 ქულა). ვინც მეტს გახსნის, წაართმევს; თანაბარზე ბარათი პატრონთან რჩება.'],
  ['დასასრული', 'სვლის ბოლოს კამათელი მარცხნივ მჯდომს გადაეცი. ვინც თავის სვლაზე 10 ქულას მოაგროვებს, იგებს — ოქროს ხანა დგება! ქულები: სოფელი 1, ციხე-ქალაქი 2, აბრეშუმის გზა 2, დიდი ლაშქარი 2, საგანძური 1. სხვის სვლაზე მოგროვებული 10 ქულა ჯერ არ ითვლება — შენს სვლას დაელოდე.'],
  ['სასკოლო ვარიანტი', 'ერთ გაკვეთილზე ითამაშეთ 8 ქულამდე (≈45–60 წუთი), სასწავლო განლაგებით. 10–12 წლის ბავშვებთან ბანკი მასწავლებელია — ის არიგებს მოსავალს და ამოწმებს ფასებს. თამაშის ბოლოს ყველამ თქვას: რომელ მხარეებზე იდგა მისი სოფლები და რა ძეგლია იქ.'],
];
const rulesList = (items, start) => `<ol start="${start}">${items.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol>`;
const costTable = `<table class="t costs"><tr><th>რა</th><th>ფასი</th><th>ქულა</th></tr>${COSTS.map(c => `<tr><td><div class="cf"><span class="cfi">${costFig(c.fig, C.wine, 0.62)}</span><b>${esc(c.what)}</b></div></td><td class="cc">${c.need.map(k => chip(k, 6)).join('')}</td><td>${c.pts ? c.pts.split(' ')[0] : '—'}</td></tr>`).join('')}</table>`;
const NUMERALS = [['ა', 1], ['ბ', 2], ['გ', 3], ['დ', 4], ['ე', 5], ['ვ', 6], ['ზ', 7], ['ჱ', 8], ['თ', 9], ['ი', 10], ['ია', 11], ['იბ', 12]];
const GLOSS = [['ერისთავი', 'მეფის მიერ დანიშნული მხარის მმართველი'], ['მეციხოვნე', 'ციხის მცველი'], ['ბაჟი', 'სავაჭრო გადასახადი'], ['ქარვასლა', 'ვაჭრების სადგომი გზაზე'], ['ბარაქა', 'უხვი მოსავალი'], ['კალო', 'პურის სალეწი მოედანი'], ['რთველი', 'ყურძნის კრეფა'], ['კარიბჭე', 'დიდი კარი, შესასვლელი']];
const GATE_NOTES = {
  'ნიკოფსია': 'ჩრდილო-დასავლეთის საზღვარი შავ ზღვაზე', 'ცხუმი': 'დღევანდელი სოხუმი', 'ფოთი': 'ძველი ფაზისი, რიონის შესართავთან',
  'ტაო-კლარჯეთი': 'სამხრეთ-დასავლეთის ქართული მხარე', 'ლორე': 'ციხე-ქალაქი სამხრეთით, დავით აღმაშენებელმა აიღო', 'განძის კარი': 'დემეტრე I-მა განძის კარი გელათში ჩამოიტანა',
  'ჰერეთი': 'აღმოსავლეთის მხარე', 'დარუბანდი': 'დერბენტი კასპიის ზღვაზე', 'დარიალი': 'კავკასიონის კარი',
};
const FAQ = [
  ['ზღვის ან მთის პირას სოფელი შეიძლება?', 'კი — ჩარჩოს გასწვრივ კუთხეებიც ითვლება. თუ ის კარიბჭის ბოძთანაა, კარიბჭეც შენია.'],
  ['7-იანზე განვითარების ბარათები ითვლება?', 'არა. 8+ წესი მხოლოდ მოსავლის ბარათებს ეხება; მოთარეშეც მხოლოდ მოსავალს ართმევს.'],
  ['სხვის გზაზე გავლა შეიძლება?', 'არა — ერთ კიდეზე ერთი გზაა, სხვისი სოფელი კი შენს გზას წყვეტს.'],
  ['ვაჭრობა რამდენჯერ შეიძლება?', 'შენს სვლაზე — რამდენჯერაც გინდა. სხვის სვლაზე მხოლოდ მოსიარულესთან ივაჭრებ.'],
];
const TIMELINE = [
  ['1089', 'დავით აღმაშენებელი მეფდება'], ['1106', 'გელათის მონასტრისა და აკადემიის დაარსება'], ['1121', 'დიდგორის ბრძოლა'],
  ['1122', 'თბილისის განთავისუფლება — დედაქალაქი თბილისში გადადის'], ['1139', 'დემეტრე I განძას იღებს — მისი კარი გელათშია'],
  ['1184', 'თამარის ერთპიროვნული მეფობის დასაწყისი'], ['1185', 'ვარძიის მთავარი ტაძარი'], ['≈1200', 'შოთა რუსთაველის „ვეფხისტყაოსანი“'], ['1213', 'თამარ მეფის გარდაცვალება'],
];
const head = (sub) =>`<div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">${esc(sub)}</div></div>`;
const rulesFoot = n => foot(`<span>${esc(title)} · წესები ${n}/4</span><span>${esc(SCHOOL)}</span>`);
const rulesPage1 = page(`${stripe(NO, 'წესები · 1')}<div class="rulesWrap">${head(`ოქროს ხანა — წესები · ${META}`)}
<p class="lead">საქართველოს ოქროს ხანაა — დავით აღმაშენებლის გამეფებიდან (1089) თამარ მეფის გარდაცვალებამდე (1213). თქვენ მეფის ერისთავები ხართ: ყოველი თავის მხარეებში გზებს, სოფლებსა და ციხე-ქალაქებს აშენებს, მოსავალს აგროვებს და მეზობლებთან ვაჭრობს — „პურს გაძლევ, ქვა მომეცი!“ ვინც პირველი მოაგროვებს <b>10 ქულას</b>, იმარჯვებს — ოქროს ხანა დგება.</p>
<div class="rules">${rulesList(RULES.slice(0, 7), 1)}</div></div>${rulesFoot(1)}`, 'rulesP');
const rulesPage2 = page(`${stripe(NO, 'წესები · 2')}<div class="rulesWrap"><div class="rules">${rulesList(RULES.slice(7), 8)}</div>
<div class="two2"><div><h3>ფასები ერთი შეხედვით</h3>${costTable}</div><div><h3>ქულები</h3><table class="t"><tr><td>სოფელი</td><td>1</td></tr><tr><td>ციხე-ქალაქი</td><td>2</td></tr><tr><td>აბრეშუმის გზა (5+ გზა)</td><td>2</td></tr><tr><td>დიდი ლაშქარი (3+ მეციხოვნე)</td><td>2</td></tr><tr><td>საგანძური (ფარული)</td><td>1</td></tr><tr><th>გამარჯვება — შენს სვლაზე</th><th>10</th></tr></table>
<p class="small">მარაგი თითო ფერზე: 5 სოფელი, 4 ციხე-ქალაქი, 15 გზა. ბანკი: 19-19 მოსავალი; 25 განვითარება.</p></div></div>
<div class="faq"><h3>ხშირი კითხვები</h3><div class="qa">${FAQ.map(([q, a]) => `<p><b>${esc(q)}</b> ${esc(a)}</p>`).join('')}</div></div></div>${rulesFoot(2)}`, 'rulesP');
const rulesPage3 = page(`${stripe(NO, 'წესები · 3')}<div class="rulesWrap">${head('სასწავლო განლაგება — პირველი თამაშებისთვის')}
<div class="mapBox">${boardSvg('learn', 176)}</div>
<div class="legend">${RK.map(k => `<span><i style="background:${RES[k].color}"></i>${esc(RES[k].land)} — ${esc(RES[k].name)}</span>`).join('')}<span><i style="background:${DESERT.color}"></i>უდაბნო — მოთარეშე</span></div>
<p class="mapNote">მხარეები, რიცხვები და კარიბჭის ჟეტონები ისე დააწყვეთ, როგორც ნახატზეა. კარიბჭეების სახელები ჩარჩოზე მუდმივია, ჟეტონი კი (რას და რა კურსით ცვლის) შემთხვევითი დაფისას ამოფარებით იდება. კარიბჭე იმ ორ კუთხეს ემსახურება, რომლებთანაც მისი ბოძები მიდის.</p>
<h3 class="landsT">მხარეები და ძეგლები</h3>
<div class="lands">${LANDS.map(l => `<div><b>${esc(l.name)}</b> <span class="k">· ${l.res ? esc(RES[l.res].land) : 'უდაბნო'}</span><br>${esc(l.mon)}</div>`).join('')}</div></div>${rulesFoot(3)}`, 'rulesP');
const rulesPage4 = page(`${stripe(NO, 'წესები · 4')}<div class="rulesWrap">${head('კარიბჭეები, საგანძურები, სიტყვები')}
<div class="two2 first"><div><h3>კარიბჭეები</h3>${GATES.map(g => `<p class="pp"><b>${esc(g.name)}</b> — ${esc(GATE_NOTES[g.name])}</p>`).join('')}
<p class="pp small">„ნიკოფსიიდან დარუბანდამდე“ — ასე აღწერდნენ ოქროს ხანის საქართველოს საზღვრებს.</p></div>
<div><h3>საგანძურები</h3>${TREASURES.map(t => `<p class="pp"><b>${esc(t.name)}</b> · ${esc(t.date)} — ${esc(t.about)}</p>`).join('')}
<h3>ქართული ასო-რიცხვები</h3><div class="nums">${NUMERALS.map(([l, n]) => `<span><b class="aso">${aso(l)}</b>${l} = ${n}</span>`).join('')}</div>
<h3>ძველი სიტყვები</h3><p class="gl">${GLOSS.map(([w, d]) => `<b>${w}</b> — ${d}`).join('; ')}.</p></div></div>
<div class="two2"><div><h3>ოქროს ხანა — თარიღები</h3><div class="tl">${TIMELINE.map(([y, t]) => `<p><b>${y}</b><span>${esc(t)}</span></p>`).join('')}</div></div>
<div><h3>რას ასწავლის</h3><p class="pp"><b>ისტორია და გეოგრაფია:</b> 19 მხარე თავისი სიმდიდრით, ოქროს ხანის ძეგლები და თარიღები, სავაჭრო კარიბჭეები და გზები.</p>
<p class="pp"><b>კულტურა:</b> ასომთავრული, ქართული ასო-რიცხვები ჟეტონებზე, ჩუქურთმა და ვაზი; ხის, ქვის, მატყლისა და პურის ხელობები.</p>
<p class="pp"><b>ხასიათი:</b> რამდენიმე სვლით წინ დაგეგმვა, პატიოსანი ვაჭრობა და ნათქვამი სიტყვის შესრულება, წაგებისა და „7-იანის“ მშვიდად მიღება, თანამშრომლობა მეტოქეობის დროსაც.</p></div></div>
<div class="box credits"><b>წყარო და უფლებები.</b> შექმნილია „კატანის“ (კლაუს ტოიბერი, 1995) წესების მიხედვით; სახელი, ნახატები და წესების ტექსტი საგანძურის სკოლისაა. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება. მხარეების, ძეგლებისა და თარიღების სია ისტორიის მასწავლებელმა ერთხელ გადახედოს.</div></div>${rulesFoot(4)}`, 'rulesP');

// ---------- cover and box label ----------
const coverPage = no => page(`${stripe(NO)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">ოქროს ხანა</h1>
  <div class="lead">ერისთავები აშენებენ, ვაჭრობენ და ქვეყანას აღადგენენ — დავით აღმაშენებლიდან თამარ მეფემდე.<br><b>${META}</b></div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th><th>✓</th></tr>
        <tr><td>წესები</td><td>4 გვ.</td><td>${no('rules1')}–${no('rules2')}</td><td><span class="chk"></span></td></tr>
        <tr><td>მხარეები — ექვსკუთხა, 79 მმ</td><td>19</td><td>${no('hex1')}–${no('tokens')}</td><td><span class="chk"></span></td></tr>
        <tr><td>რიცხვის ჟეტონები ⌀25 მმ</td><td>18</td><td>${no('tokens')}</td><td><span class="chk"></span></td></tr>
        <tr><td>კარიბჭის ჟეტონები ⌀25 მმ</td><td>9</td><td>${no('tokens')}</td><td><span class="chk"></span></td></tr>
        <tr><td>მოთარეშე (ქაღალდის)</td><td>1</td><td>${no('tokens')}</td><td><span class="chk"></span></td></tr>
        <tr><td>მოსავლის ბარათები</td><td>95 + 4*</td><td>${no('res1')}–${no('res11')}</td><td><span class="chk"></span></td></tr>
        <tr><td>განვითარების ბარათები</td><td>25 + 2*</td><td>${no('dev1')}–${no('dev3')}</td><td><span class="chk"></span></td></tr>
        <tr><td>დიდი ბარათები (A6)</td><td>8</td><td>${no('a6a')}–${no('a6b')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ქაღალდის ფიგურები</td><td>4 ფერი</td><td>${no('figures')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ჩარჩო — ზღვა და მთები</td><td>6</td><td>${no('frame1')}–${no('frame2')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ყუთის იარლიყი</td><td>1</td><td>${no('label')}</td><td><span class="chk"></span></td></tr>
        <tr><td>2 კამათელი; სურვილით ხის ფიგურები</td><td>—</td><td>საყიდელია</td><td><span class="chk"></span></td></tr>
      </table>
      <p class="small">* სათადარიგო, სახელი მარკერით. ხის ფიგურები: სოფელი — 15 მმ კუბი, ქალაქი — ორი შეწებებული კუბი, გზა — 6×6 მმ ლარტყა, 40 მმ.</p>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „კატანის“ (კლაუს ტოიბერი, 1995) წესების მიხედვით. სახელი, ნახატები და წესების ტექსტი საგანძურის სკოლისაა. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
      <p class="small">ნახატების ადგილას ჯერ ორნამენტი და ნიშნებია — სურათები მერე დაემატება.</p>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b> („fit to page“ გამორთული) — ყოველ ფურცელს თავისი ზურგი მოსდევს. ჯერ ერთი საცდელი ფურცელი: მხარე 79 მმ გვერდიდან გვერდამდე, ბარათი 63×88 მმ.</li>
        <li>ქაღალდი: წესები — ჩვეულებრივი; ფურცლები ${no('hex1')}–${no('figures')} — <b>300 გ მუყაო</b>; ჩარჩო (${no('frame1')}–${no('frame2')}) ცალმხრივია — 2 მმ რუხ მუყაოზე დააკარი და მერე ამოჭერი.</li>
        <li>მხარეები და ჟეტონები — სურვილით მქრქალი ლამინაცია 125 მკმ: გამაგრდება და გაუძლებს.</li>
        <li>ჭრა: მხარეები და ჩარჩო — წვრილ ხაზზე, დანით ლითონის სახაზავთან (უფროსები ჭრიან); ბარათები — ნიშნულებზე; A6 — შუა ხაზებზე; ჟეტონები — 25 მმ წრიული პერფორატორით ან მაკრატლით.</li>
        <li>მოთარეშე: ზოლი წყვეტილ ხაზებზე მოკეცე — ორი ნახატი ზურგით ერთმანეთს, ფეხები გვერდებზე.</li>
      </ol>
      <h3 class="asmT">ჩარჩოს აწყობა</h3>
      ${boardSvg('assembly', 72)}
      <p class="asmP">1 — „დიდი კავკასიონი, ჩრდილოეთი“ — ზემოთ, მერე საათის ისრით 2–6; ბოლოებზე ასოები ემთხვევა: ა-ს ა, ბ-ს ბ … ზომა ≈50×43 სმ — მერხს ეტევა. ზურგიდან ქაღალდის ლენტით შეაერთე ან უბრალოდ მიადგი.</p>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} №${NO}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const islandMini = (width) => `<svg width="${width}mm" height="${(width * 410 / 430).toFixed(2)}mm" viewBox="-215 -205 430 410" style="display:block">${LANDS.map(l => `<polygon points="${ptsAttr(hexPts(...hexC(l.at), HR - 1))}" fill="${LOOK(l.res).color}" stroke="#f6ecd6" stroke-width="3"/>`).join('')}</svg>`;
const labelPage = page(`<div class="lbl lid"><div class="lin">
<div class="lt"><div class="aso big">${aso(title)}</div><div class="nm">ოქროს ხანა</div><div class="sub">ერისთავები აშენებენ, ვაჭრობენ და ქვეყანას აღადგენენ</div><div class="meta">${esc(META)}</div><div class="ser aso">${aso(SERIES)} · №${NO}</div><div class="sch">${esc(SCHOOL)}</div></div>
<div class="map">${islandMini(76)}</div></div></div>
<div class="lbl list"><h3>ყუთში უნდა იყოს</h3><div class="items">${['19 მხარე', '6 ჩარჩოს ნაწილი', '18 რიცხვის ჟეტონი', '9 კარიბჭის ჟეტონი', 'მოთარეშე', '95 მოსავლის ბარათი', '25 განვითარების ბარათი', '8 დიდი ბარათი', '4 ფერის ფიგურები', '2 კამათელი', 'წესები (4 გვერდი)', 'სათადარიგო ბარათები'].map(t => `<span><i class="chk"></i>${esc(t)}</span>`).join('')}</div></div>
${[0, 1].map(i => `<div class="lbl side s${i}"><span class="aso">${aso(title)}</span><b>ოქროს ხანა</b><span>${esc(META)}</span><span class="aso">№${NO}</span></div>`).join('')}
<div class="lblNote">იარლიყი ფოტოქაღალდის ან ფეხსაცმლის ყუთზე (≈A4): დიდი — სახურავზე, ზოლები — გვერდებზე. მთლიანი ხაზი იჭრება.</div>`, 'labelP');

export const css = `
.card.res .frame{border-width:.9mm}
.card .idx{position:absolute;width:8.2mm;height:8.2mm;border-radius:50%;display:flex;align-items:center;justify-content:center;border:.35mm solid #fbf6ec;box-shadow:0 0 0 .25mm ${C.gold};z-index:2}
.card .idx.tl{left:4.5mm;top:4.5mm}.card .idx.br{right:4.5mm;bottom:4.5mm;transform:rotate(180deg)}
.card.res .body{align-items:center}
.rname{font-weight:800;font-size:17pt;line-height:1;margin:.6mm 0 1.6mm}
.card .art{position:relative;line-height:0}
.from{margin-top:1.8mm;font-size:8.6pt;line-height:1.25;text-align:center;padding:0 1mm}
.need{margin-top:2.4mm;display:flex;align-items:center;justify-content:center;gap:1.4mm;font-size:8pt;color:var(--muted)}
.need svg{display:block}
.backArt{position:absolute;left:0;top:0}
.spare{margin:auto;text-align:center;color:var(--muted);font-size:11pt}
.spare span{font-size:8.5pt}
.card.dev .body{align-items:center}
.card.dev .kind{font-size:7.6pt;color:var(--gold2);letter-spacing:.12em;margin-top:.4mm}
.card.dev .dname{font-weight:800;font-size:15pt;color:var(--wine);line-height:1.1;margin:.6mm 0 1.4mm;text-align:center;max-width:44mm}
.card.dev .art{width:50mm;height:31mm;border:.3mm solid var(--gold);border-radius:24mm 24mm 2mm 2mm;background:radial-gradient(ellipse at 50% 40%,#fbf3e2 0%,var(--cream) 60%,#e6d6b6 100%);overflow:hidden}
.card.dev .rule{margin-top:2mm;font-size:10pt;line-height:1.28;text-align:center}
.card.dev .cap{margin-top:auto;font-size:8pt;color:var(--muted);text-align:center;line-height:1.2;border-top:.2mm solid var(--line);padding:1mm 5.4mm 0;width:100%}
.card.tre .date{position:absolute;left:2mm;bottom:1.6mm;background:var(--wine);color:#f0d9a0;font-size:8.5pt;font-weight:700;padding:.2mm 1.6mm .4mm;border-radius:1.2mm;line-height:1.2}
.card.tre .pt{position:absolute;right:1.6mm;bottom:1.2mm;width:10.5mm;height:10.5mm;border-radius:50%;background:var(--gold);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;font-size:6.4pt;border:.35mm solid #fbf6ec}
.card.tre .pt b{font-size:12pt;line-height:.95}
.a6{width:105mm;height:148.5mm;padding:5mm}
.a6in{position:relative;width:100%;height:100%;border:.8mm solid;border-radius:3mm;overflow:hidden}
.a6sheet .sheetLabel{top:146.6mm;left:14mm}
.band{color:#fbf6ec;text-align:center;padding:2.2mm 3mm 2.4mm}
.band .aso{font-size:8pt;color:#f0d9a0;letter-spacing:.14em}
.band .bt{font-weight:800;font-size:15pt;line-height:1.15}
.band .bs{font-size:9pt;opacity:.9}
.a6body{padding:3mm 4mm 0}
.crow{display:grid;grid-template-columns:15mm 1fr auto;grid-template-rows:auto auto;column-gap:2mm;align-items:center;padding:2.2mm 0;border-bottom:.2mm solid var(--line)}
.crow .cfig{grid-row:1/3;display:flex;justify-content:center}
.crow .cwhat{font-size:11.5pt;line-height:1.1}
.crow .cwhat b{color:var(--wine)}
.crow .pts{display:inline-block;margin-left:1.6mm;background:var(--gold);color:#fff;font-size:8.5pt;font-weight:700;padding:.1mm 1.4mm .3mm;border-radius:1mm;vertical-align:.4mm}
.crow .cneed{display:flex;align-items:center;gap:1mm}
.crow .cnote{grid-column:2/4;font-size:8.6pt;color:var(--muted);line-height:1.2;margin-top:.8mm}
.chip{display:inline-flex;align-items:center;justify-content:center;border-radius:1.6mm;border:.3mm solid #fbf6ec;box-shadow:0 0 0 .2mm #0002;vertical-align:middle}
.ptsBox{margin-top:3mm;font-size:9.4pt;line-height:1.35;background:#fff8;border:.3mm solid var(--gold);border-radius:2mm;padding:2mm 3mm}
.ptsBox b{color:var(--wine)}.ptsBox .win{display:block;margin-top:.8mm;font-size:10.5pt}
.ptsBox .stock{font-size:8.6pt;color:var(--muted);margin-top:.6mm}
.steps .st{display:flex;gap:2.4mm;align-items:flex-start;font-size:9.8pt;line-height:1.3;margin-bottom:2.2mm}
.steps .st .n{flex:none;width:7mm;height:7mm;border-radius:50%;color:#fbf6ec;font-weight:800;font-size:11pt;display:flex;align-items:center;justify-content:center}
.steps .st b{color:var(--wine)}
.steps .seven{background:#7a20280f;border-radius:2mm;padding:1.4mm 1.6mm;margin-left:-1.6mm;margin-right:-1.6mm}
.devNote{font-size:9pt;line-height:1.3;border-top:.2mm solid var(--line);border-bottom:.2mm solid var(--line);padding:1.4mm 0;margin:.4mm 0 2mm;color:var(--brown)}
.chartT{font-size:8.6pt;text-align:center;color:var(--muted)}
.chartC{font-size:8.4pt;text-align:center;color:var(--wine)}
.special .spc{position:absolute;inset:9.5mm;display:flex;flex-direction:column;align-items:center;text-align:center}
.spc .sk{font-size:8pt;color:var(--gold2);letter-spacing:.14em;margin-top:2mm}
.spc .sn{font-weight:800;font-size:19pt;color:var(--wine);line-height:1.1;margin-top:.6mm}
.spc .medal{width:17mm;height:17mm;border-radius:50%;background:var(--gold);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;border:.5mm solid #fbf6ec;box-shadow:0 0 0 .35mm var(--gold2);margin-top:1mm;font-size:8pt}
.spc .medal b{font-size:19pt;line-height:.9}
.spc .sr{margin-top:2.6mm;font-size:10.4pt;line-height:1.32;padding:0 1.5mm}
.spc .sc{margin-top:auto;margin-bottom:1mm;font-size:8.6pt;color:var(--muted);line-height:1.2}
.special .sback{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5mm}
.sback .sbn{background:var(--wine);color:#f0d9a0;font-weight:700;font-size:11pt;padding:1mm 4mm 1.4mm;border-radius:2mm;border:.3mm solid var(--gold)}
.list ol,.list ul{margin:0;padding-left:5mm;font-size:10pt;line-height:1.32}
.list li{margin-bottom:2mm}
.list li b{color:var(--wine)}
.list .hint{margin-top:3mm;font-size:9.4pt;font-style:italic;color:var(--brown);border-left:.8mm solid var(--gold);padding-left:2.4mm}
.spiral p{margin:2mm 0 0;font-size:9.4pt;line-height:1.3;text-align:center}
.spiral .lt{display:grid;grid-template-columns:repeat(9,1fr);gap:.8mm;margin-top:2mm;font-size:8.8pt;text-align:center}
.spiral .lt span{border:.2mm solid var(--line);border-radius:1mm;padding:.4mm 0;background:#fff8}
.spiral .lt b{display:block;color:var(--wine);font-size:10pt}
.spiral .small{margin-top:1mm}
.fhead{font-size:9pt;font-weight:700;white-space:nowrap}
.cover{padding:8mm 14mm 0}
.cover .title{font-size:24pt;color:var(--gold2);letter-spacing:.08em}
.cover .lead{font-size:12pt;margin:2mm 0 5mm;line-height:1.4}
.cover .two{display:grid;grid-template-columns:1fr 1fr;gap:7mm;font-size:10pt}
.cover h3{margin:0 0 2mm;color:var(--wine);font-size:12pt}
.cover table.comp{font-size:9.2pt}
.cover table.comp td,.cover table.comp th{padding:.9mm 1.3mm}
.cover .how{margin:0;padding-left:4.5mm;font-size:9.6pt;line-height:1.33}
.cover .how li{margin-bottom:1.5mm}
.cover .asmT{margin-top:4mm}
.cover .asmP{margin:1.5mm 0 0;font-size:9.4pt;line-height:1.35}
table.comp td:nth-child(n+2),table.comp th:nth-child(n+2){white-space:nowrap}
.cover .legal{font-size:9pt;margin:3mm 0 2mm}
.rulesWrap{padding:6mm 12mm 0}
.rhead{display:flex;align-items:baseline;gap:5mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.5mm;margin-bottom:3mm}
.rtitle{font-size:20pt;color:var(--wine)}
.rsub{font-size:10.5pt;color:var(--muted)}
.lead{font-size:10.8pt;line-height:1.4;margin:0 0 3mm}
.lead b{color:var(--wine)}
.two2{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:4mm;font-size:10pt;line-height:1.35}
.two2 h3{margin:0 0 1.5mm;color:var(--wine);font-size:11pt}
.two2 h3+*{margin-top:0}
.two2.first{margin-top:0}
.two2 table.t{font-size:9.6pt;margin-bottom:2mm}
.two2 .pp,.two2 .gl{margin:0 0 1.4mm}
.two2 .pp b,.two2 .gl b{color:var(--wine)}
table.costs td{vertical-align:middle}
table.costs .cf{display:flex;align-items:center;gap:1.6mm}
table.costs .cfi{width:11mm;display:flex;justify-content:center}
table.costs .cc{white-space:nowrap}
table.costs .chip{margin-right:.6mm}
.mapBox{margin:1mm 0 2mm}
.legend{display:flex;flex-wrap:wrap;justify-content:center;gap:2mm 5mm;font-size:9.6pt}
.legend span{display:flex;align-items:center;gap:1.4mm}
.legend i{display:inline-block;width:4mm;height:4mm;border-radius:1mm}
.mapNote{font-size:10pt;line-height:1.38;margin:3mm 6mm 0;text-align:center}
.landsT{margin:4mm 0 1.6mm;color:var(--wine);font-size:11pt}
.lands{display:grid;grid-template-columns:repeat(5,1fr);gap:1.6mm 4mm;font-size:9.4pt;line-height:1.28}
.lands b{color:var(--wine)}
.lands .k{color:var(--muted);font-size:8.6pt}
.nums{display:grid;grid-template-columns:repeat(6,1fr);gap:1mm;margin-bottom:2mm;font-size:9.4pt;text-align:center}
.nums span{border:.2mm solid var(--line);border-radius:1mm;padding:.5mm 0;background:var(--paper)}
.nums b{display:block;color:var(--wine);font-size:12pt}
.credits{margin-top:4mm;font-size:9.2pt;line-height:1.35}
.faq{margin-top:4mm;border-top:.3mm solid var(--gold);padding-top:2mm}
.faq h3{margin:0 0 1.5mm;color:var(--wine);font-size:11pt}
.faq .qa{column-count:2;column-gap:8mm;font-size:9.4pt;line-height:1.32}
.faq .qa p{margin:0 0 1.6mm;break-inside:avoid}
.faq .qa b{color:var(--wine);display:block}
.tl p{display:flex;gap:3mm;margin:0 0 1.2mm;font-size:9.8pt;line-height:1.3}
.tl b{flex:none;width:12mm;color:var(--wine);text-align:right}
.labelP .lbl{position:absolute;left:10mm;width:190mm;border:.25mm solid #777}
.labelP .lid{top:12mm;height:124mm;background:${C.wine};padding:5mm}
.labelP .lid .lin{position:relative;height:100%;border:.4mm solid var(--gold);border-radius:2mm;display:flex;align-items:center;gap:6mm;padding:0 9mm}
.labelP .lid .lt{flex:1;color:#fbf6ec}
.labelP .lid .big{font-size:24pt;color:#f0d9a0;letter-spacing:.1em}
.labelP .lid .nm{font-weight:800;font-size:34pt;line-height:1.1}
.labelP .lid .sub{font-size:12pt;opacity:.95;margin:2mm 0 4mm}
.labelP .lid .meta{font-size:11pt}
.labelP .lid .ser{font-size:9pt;color:#f0d9a0;letter-spacing:.1em;margin-top:6mm}
.labelP .lid .sch{font-size:9.5pt;opacity:.85}
.labelP .list{top:144mm;height:44mm;background:var(--paper);padding:4mm 7mm}
.labelP .list h3{margin:0 0 2.4mm;color:var(--wine);font-size:13pt}
.labelP .list .items{display:grid;grid-template-columns:1fr 1fr 1fr;gap:2mm 4mm;font-size:10.5pt}
.labelP .list .chk{display:inline-block;width:3.6mm;height:3.6mm;border:.3mm solid var(--brown);border-radius:.6mm;vertical-align:-.6mm;margin-right:1.6mm}
.labelP .side{height:22mm;background:${C.wine};color:#fbf6ec;display:flex;align-items:center;justify-content:space-around;font-size:11pt}
.labelP .side .aso{color:#f0d9a0;letter-spacing:.1em}
.labelP .side b{font-size:16pt}
.labelP .s0{top:198mm}.labelP .s1{top:228mm}
.lblNote{position:absolute;left:10mm;right:10mm;top:258mm;font-size:9pt;color:var(--muted);text-align:center}
.tokInfo{font-size:9pt;line-height:1.38;color:var(--brown);border:.3mm solid var(--gold);border-radius:2mm;padding:3mm 3.4mm;background:var(--paper);height:100%}
.tokInfo b{color:var(--wine)}
`;

// ---------- the sheets, in printing order ----------
const LANDS_PRINT = RK.flatMap(k => LANDS.filter(l => l.res === k));
const HEX_AT = [[19, 7], [108, 7], [19, 102], [108, 102], [19, 197], [108, 197]];
const hexSheet = (i) => ({
  key: `hex${i + 1}`,
  front: placedSheet(LANDS_PRINT.slice(i * 6, i * 6 + 6).map((l, j) => ({ x: HEX_AT[j][0], y: HEX_AT[j][1], w: 83, h: HH + 4, html: landFront(l) })), { label: `ოქროს ხანა · მხარეები ${i + 1}/3 — წინა მხარე` }),
  back: placedSheet(HEX_AT.map(([x, y]) => ({ x, y, w: 83, h: HH + 4, html: landBack() })), { back: true, label: `ოქროს ხანა · მხარეები ${i + 1}/3 — ზურგი` }),
});
const NUM_AT = SPIRAL_NUMS.map((_, i) => [110 + (i % 3) * 27, 9 + Math.floor(i / 3) * 27]);
const TRADES = ['3', '3', '3', '3', ...RK];
const TRADE_AT = TRADES.map((_, i) => [21 + (i % 3) * 27, 112 + Math.floor(i / 3) * 27]);
const SPARE_AT = [[140, 180], [167, 180], [140, 207], [167, 207], [140, 234], [167, 234]];
const tokenInfo = `<div class="tokInfo"><b>ჟეტონები</b> — 25 მმ წრიული პერფორატორით ან მაკრატლით.<br><b>რიცხვები:</b> ზურგზე ასოა (ა–ს) — დასაწყობად.<br><b>კარიბჭეები:</b> ზურგზე „კარიბჭე“ — ამოფარებით იდება.<br><b>მოთარეშე:</b> ზოლი წყვეტილ ხაზებზე მოკეცე — ორი ნახატი ზურგით ერთმანეთს, ფეხები გვერდებზე.<br><b>სათადარიგო</b> წრეები — დაკარგულის ნაცვლად, მარკერით.</div>`;
const tokenSheet2 = {
  key: 'tokens',
  front: placedSheet([
    { x: 19, y: 7, w: 83, h: HH + 4, html: landFront(LANDS.find(l => !l.res)) },
    ...SPIRAL_NUMS.map((n, i) => ({ x: NUM_AT[i][0], y: NUM_AT[i][1], w: 25, h: 25, html: numFront(n) })),
    ...TRADES.map((k, i) => ({ x: TRADE_AT[i][0], y: TRADE_AT[i][1], w: 25, h: 25, html: tradeFront(k) })),
    { x: 110, y: 180, w: 24, h: 98, html: robberStrip },
    ...SPARE_AT.map(([x, y]) => ({ x, y, w: 25, h: 25, html: spareToken })),
    { x: 21, y: 199, w: 79, h: 80, html: tokenInfo },
  ], { label: 'ოქროს ხანა · უდაბნო, 18 რიცხვი, 9 კარიბჭე, მოთარეშე — წინა მხარე' }),
  back: placedSheet([
    { x: 19, y: 7, w: 83, h: HH + 4, html: landBack() },
    ...LETTERS.map((l, i) => ({ x: NUM_AT[i][0], y: NUM_AT[i][1], w: 25, h: 25, html: numBack(l) })),
    ...TRADES.map((_, i) => ({ x: TRADE_AT[i][0], y: TRADE_AT[i][1], w: 25, h: 25, html: tradeBack })),
  ], { back: true, label: 'ოქროს ხანა · ჟეტონები — ზურგი' }),
};
const cards = (key, fronts, back, label) => ({
  key,
  front: cardSheet(fronts, { label: `ოქროს ხანა · ${label} — წინა მხარე` }),
  back: cardSheet(fronts.map(() => back), { back: true, label: `ოქროს ხანა · ${label} — ზურგი` }),
});
const resSheets = [
  ...RK.flatMap((k, j) => [0, 1].map(h => cards(`res${j * 2 + h + 1}`, Array(9).fill(resCard(k)), resBack, `მოსავალი ${j * 2 + h + 1}/11 · ${RES[k].name}`))),
  cards('res11', [...RK.map(resCard), spareCard(), spareCard(), spareCard(), spareCard()], resBack, 'მოსავალი 11/11 · თითო და სათადარიგო'),
];
const DEV_FRONTS = [...DEV.flatMap(d => Array(d.n).fill(devCard(d))), ...TREASURES.map(treasureCard), spareCard(C.brown), spareCard(C.brown)];
const devSheets = [0, 1, 2].map(i => cards(`dev${i + 1}`, DEV_FRONTS.slice(i * 9, i * 9 + 9), devBack, `განვითარება ${i + 1}/3`));
const SHEETS = [
  { key: 'cover' },
  { key: 'rules1', front: rulesPage1, back: rulesPage2 },
  { key: 'rules2', front: rulesPage3, back: rulesPage4 },
  hexSheet(0), hexSheet(1), hexSheet(2),
  tokenSheet2,
  ...resSheets,
  ...devSheets,
  { key: 'a6a', front: a6Sheet(PLAYERS.map(costCard), { label: 'ოქროს ხანა · ფასები A6 — წინა მხარე' }), back: a6Sheet(PLAYERS.map(turnCard), { back: true, label: 'ოქროს ხანა · ფასები A6 — ზურგი' }) },
  { key: 'a6b', front: a6Sheet([...SPECIAL.map(specialCard), setupCard, teacherCard], { label: 'ოქროს ხანა · დიდი ბარათები A6 — წინა მხარე' }), back: a6Sheet([...SPECIAL.map(specialBack), spiralCard, variantCard], { back: true, label: 'ოქროს ხანა · დიდი ბარათები — ზურგი' }) },
  { key: 'figures', front: placedSheet(figuresSheet(false), { label: 'ოქროს ხანა · ქაღალდის ფიგურები — წინა მხარე' }), back: placedSheet(figuresSheet(true), { back: true, label: 'ოქროს ხანა · ქაღალდის ფიგურები — ზურგი' }) },
  { key: 'frame1', front: placedSheet(PIECES.slice(0, 3).map((P, i) => ({ x: 12.1 + i * 63.6, y: 22.2, w: 58.6, h: 252.6, html: framePiece(P) })), { label: 'ოქროს ხანა · ჩარჩო 1–3 — დააკარი 2 მმ მუყაოზე, მერე ამოჭერი' }) },
  { key: 'frame2', front: placedSheet(PIECES.slice(3).map((P, i) => ({ x: 12.1 + i * 63.6, y: 22.2, w: 58.6, h: 252.6, html: framePiece(P) })), { label: 'ოქროს ხანა · ჩარჩო 4–6 — დააკარი 2 მმ მუყაოზე, მერე ამოჭერი' }) },
  { key: 'label', front: labelPage },
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
