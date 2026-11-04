// The songs map's Georgia on paper (2026-11-01, moved here from „საიდანაა სიმღერა?“'s kit when „რუკის ვიქტორინა“ got its
// own): the 13 regions numbered west to east as the app lists them, a card's small map (the answer green), the big map of two
// A4 pieces (39×28 cm) with a game's own head line and steps, a team sheet's key of the numbers. Used by
// games/saidanaa-simghera.mjs and games/rukis-viktorina.mjs.
import { C, SERIES, SCHOOL, aso, esc, iconIn, page } from './lib.js';
import * as __d0 from '../data/songsData';
import * as __d1 from '../data/georgiaMapShapes';
import * as __d2 from '../utils/kutkhe';

const { FOLK_REGIONS, GEORGIA_MAP_SHAPES, KUTKHE_REGIONS, KUTKHE_NEAR } = ({ ...__d0, ...__d1, ...__d2 });

// the app's reveal colours (pages/games/kutkhe/KutkheMap.tsx)
export const RIGHT = '#2f7d4f', NEAR = '#a8d1b4', REST = '#e9dfcd';
export const f = n => Number(n.toFixed(2));

// ---------- the regions, numbered as the app lists them (west to east) ----------
// the lands a region holds where its name does not say them (the songs map's places: Tusheti's songs are mostly Kakheti's)
export const LANDS = { mtianeti: 'ხევი · ხევსურეთი · ფშავი · მთიულეთი', kakheti: 'თუშეთიც', samtskhe: 'მესხეთი' };
export const REGIONS = KUTKHE_REGIONS.map((rid, i) => {
  const r = FOLK_REGIONS.find(x => x.id === rid);
  return { id: rid, no: i + 1, name: r.nameGe, color: r.color, d: GEORGIA_MAP_SHAPES[rid].d, label: GEORGIA_MAP_SHAPES[rid].label, near: KUTKHE_NEAR[rid] };
});
export const REGION = Object.fromEntries(REGIONS.map(r => [r.id, r]));
export const nameLines = r => (r.name.includes('-') ? r.name.replace('-', '-\n').split('\n') : [r.name]);

// ---------- the small map of a card's back: the paths thinned (a point every 4 units) ----------
const thin = d => {
  const out = [];
  for (const m of d.matchAll(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g)) {
    const p = [Math.round(+m[1]), Math.round(+m[2])], q = out[out.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) >= 4) out.push(p);
  }
  return `M${out.map(p => p.join(',')).join('L')}Z`;
};
export const MINI = Object.fromEntries(REGIONS.map(r => [r.id, thin(r.d)]));
const LABEL_AT = { racha: [445, 212], samtskhe: [445, 410] }; // off the big map's seam (x = 500), inside their regions
export const labelOf = r => LABEL_AT[r.id] ?? r.label;
export const numDot = (r, size, look) => {
  const [x, y] = labelOf(r);
  return `<circle cx="${x}" cy="${y}" r="${size}" fill="${look.bg}" stroke="${look.ring}" stroke-width="${size / 7}"/>
<text x="${x}" y="${f(y + size * 0.42)}" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="${f(size * 1.2)}" fill="${look.ink}">${r.no}</text>`;
};
/** the answer: the region green, its neighbours light green (`near: false` — none), each with its number; none = every region
 *  in its map colour */
export const miniMap = (rid = null, { near = true } = {}) => {
  const right = rid && REGION[rid];
  const shown = r => near && right.near.includes(r.id);
  const fill = r => (!right ? r.color : r.id === rid ? RIGHT : shown(r) ? NEAR : REST);
  const dots = REGIONS.filter(r => !right || r.id === rid || shown(r)).map(r => numDot(r, r.id === rid ? 34 : 25,
    r.id === rid ? { bg: '#fff', ring: '#fff', ink: RIGHT } : { bg: '#fffaf0', ring: right ? RIGHT : C.wine, ink: right ? '#2a5a3b' : C.wine }));
  return `<svg viewBox="-8 -8 1016 545" style="display:block;width:100%;height:auto">${REGIONS.map(r =>
    `<path d="${MINI[r.id]}" fill="${fill(r)}" stroke="#fffaf0" stroke-width="6" stroke-linejoin="round"/>`).join('')}${dots.join('')}</svg>`;
};

// ---------- the big map: 390×280 mm, two A4 pieces of 195×280 that meet at the map's x = 500 ----------
const BW = 390, BH = 280, S = 0.376, MX = 7, MY = 31;
const bx = x => f(MX + x * S), by = y => f(MY + y * S);
const halo = `paint-order="stroke" stroke="#fffaf0" stroke-linejoin="round"`;
const txt = (s, x, y, o = {}) => `<text x="${f(x)}" y="${f(y)}" text-anchor="${o.anchor ?? 'middle'}" font-family="${o.font ?? 'SerifKa'}" font-size="${o.size ?? 3.6}" font-weight="${o.weight ?? 700}" fill="${o.fill ?? C.brown}"${o.halo ? ` ${halo} stroke-width="${o.halo}"` : ''}${o.style ? ` style="${o.style}"` : ''}>${esc(s)}</text>`;

const boardLabel = r => {
  const [lx, ly] = labelOf(r), x = MX + lx * S, y = MY + ly * S;
  const dot = `<circle cx="${f(x)}" cy="${f(y - 3)}" r="3.7" fill="#fffaf0" stroke="${C.wine}" stroke-width=".5"/>${txt(String(r.no), x, y - 1.55, { font: 'SansKa', weight: 900, size: 4.3, fill: C.wine })}`;
  if (r.id === 'kalakuri') {
    // a small region: its name in a white tag under the dot
    return `${dot}<rect x="${f(x - 10.5)}" y="${f(y + 2.2)}" width="21" height="5.6" rx="1.4" fill="#fffaf0" stroke="${C.wine}" stroke-width=".3"/>${txt(r.name, x, y + 6.3, { size: 3.3 })}`;
  }
  const lines = nameLines(r);
  const names = lines.map((l, k) => txt(l, x, y + 4.6 + k * 4.1, { size: 3.7, weight: 800, halo: 0.9 })).join('');
  const lands = LANDS[r.id] ? txt(LANDS[r.id], x, y + 4.6 + lines.length * 4.1 - 0.4, { size: 2.6, weight: 400, fill: '#5d4a3a', halo: 0.8 }) : '';
  return dot + names + lands;
};

const boardStep = (x, y, name, lines) => `<circle cx="${x + 5}" cy="${y + 5}" r="5.2" fill="${C.wine}"/>${iconIn(name, { x: x + 1.9, y: y + 1.9, size: 6.2, color: '#fff', width: 2 })}
${lines.map((l, k) => txt(l, x + 13, y + 3.4 + k * 4.6, { anchor: 'start', size: 3.6, weight: k ? 400 : 700 })).join('')}`;

const compass = (x, y) => `<g transform="translate(${x} ${y})"><circle r="7" fill="#fffaf0" stroke="${C.gold}" stroke-width=".4"/>
<path d="M0 -5.6 L2 0 L0 1.2 L-2 0 Z" fill="${C.wine}"/><path d="M0 5.6 L2 0 L0 1.2 L-2 0 Z" fill="${C.gold}" opacity=".7"/>
${txt('ჩ', 0, -8.6, { size: 3.4, weight: 800, fill: C.wine })}</g>`;
const waves = (x, y) => [0, 1, 2].map(k => `<path d="M${x + k * 3} ${y + k * 4.2} q3 -1.8 6 0 t6 0 t6 0" fill="none" stroke="#7d9cbc" stroke-width=".45" stroke-linecap="round"/>`).join('');

/** the big map with a game's own head line and four steps under it: its two A4 pieces (`tilePage(1)`, `tilePage(2)`) */
export const mapBoard = ({ title, sub, steps }) => {
const BOARD = `<rect width="${BW}" height="${BH}" fill="#f8f0df"/>
<rect x="3" y="3" width="${BW - 6}" height="${BH - 6}" rx="3" fill="none" stroke="${C.gold}" stroke-width=".7"/>
<rect x="4.6" y="4.6" width="${BW - 9.2}" height="${BH - 9.2}" rx="2" fill="none" stroke="${C.gold}" stroke-width=".25"/>
${txt(aso(title), 14, 16.5, { anchor: 'start', font: 'SansKa', weight: 900, size: 8.4, fill: C.wine, style: 'letter-spacing:.06em' })}
${txt(sub, 14, 24.4, { anchor: 'start', size: 3.6, weight: 400, fill: '#7a6a58' })}
${compass(368, 22)}
<g transform="translate(${MX + 0.8} ${MY + 1.1}) scale(${S})" fill="#6b4423" opacity=".2">${REGIONS.map(r => `<path d="${r.d}"/>`).join('')}</g>
<g transform="translate(${MX} ${MY}) scale(${S})">${REGIONS.map(r => `<path d="${r.d}" fill="${r.color}" stroke="#fffaf0" stroke-width="3.4" stroke-linejoin="round"/>`).join('')}</g>
${txt('შავი ზღვა', bx(110), by(395), { size: 5, weight: 400, fill: '#5f7f9f', style: 'font-style:italic;letter-spacing:.12em' })}
${waves(bx(66), by(420))}
${REGIONS.map(boardLabel).join('')}
<line x1="14" y1="236.5" x2="${BW - 14}" y2="236.5" stroke="${C.gold}" stroke-width=".3"/>
${steps.map(([x, name, lines]) => boardStep(x, 243, name, lines)).join('\n')}
<g transform="translate(14 258)">${txt(aso(SERIES), 0, 7, { anchor: 'start', font: 'SansKa', weight: 900, size: 3.4, fill: C.goldDark, style: 'letter-spacing:.08em' })}</g>
<g transform="translate(${BW - 14} 258)">${txt(SCHOOL, 0, 7, { anchor: 'end', size: 3.4, weight: 400, fill: '#9a8b7b' })}</g>`;

const boardSvg = view => `<svg viewBox="${view.join(' ')}" width="${view[2]}mm" height="${view[3]}mm" style="display:block">${BOARD}</svg>`;
const TILE = { w: BW / 2, h: BH, x: 7.5, y: 8.5 };
const tileMarks = () => {
  const { x, y, w, h } = TILE, L = 5;
  return `<svg class="cut" viewBox="0 0 210 297" width="210mm" height="297mm" style="position:absolute;left:0;top:0" stroke="#666" stroke-width=".25">
${[[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([cx, cy]) => `<path d="M${cx < 100 ? cx - L - 1 : cx + 1} ${cy}h${L}M${cx} ${cy < 100 ? cy - L - 1 : cy + 1}v${L}"/>`).join('')}</svg>`;
};
const tilePage = n => page(`${tileMarks()}<div class="sk-tile" style="left:${TILE.x}mm;top:${TILE.y}mm">${boardSvg([(n - 1) * TILE.w, 0, TILE.w, TILE.h])}</div>
<div class="sheetLabel">ფურცელი %SHEET% · რუკა · ნაწილი ${n}/2 (${n === 1 ? 'მარცხენა' : 'მარჯვენა'}) — ცალმხრივი</div>
<div class="sk-next ${n === 1 ? 'r' : 'l'}">${n === 1 ? 'აქ ებმის ნაწილი 2 →' : '← აქ ებმის ნაწილი 1'}</div>`, 'sk-tileP');
return { tilePage };
};

// ---------- a team sheet ----------
/** dark text on a light map colour, white on a dark one (ქალაქური) */
export const inkOn = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.42 ? '#fff' : C.brown;
};
/** the numbers' key: each region's number on its map colour */
export const regionKey = () => `<div class="sk-key">${REGIONS.map(r => `<span><i style="background:${r.color};color:${inkOn(r.color)}">${r.no}</i>${esc(r.name)}</span>`).join('')}</div>`;

export const mapCss = `
.sk-tile{position:absolute;width:195mm;height:280mm;overflow:hidden}
.sk-next{position:absolute;top:128mm;font-size:8pt;color:#8a7a68;white-space:nowrap;writing-mode:vertical-rl}
.sk-next.r{right:1.8mm}
.sk-next.l{left:1.8mm;transform:rotate(180deg)}
.sk-key{display:grid;grid-template-columns:repeat(5,1fr);gap:1mm 3mm;margin:2.2mm 0 2.4mm;font-size:8.6pt;line-height:1.2}
.sk-key span{display:flex;align-items:center;gap:1.2mm;white-space:nowrap}
.sk-key i{flex:none;font-style:normal;width:4.6mm;height:4.6mm;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:7.6pt;font-weight:800;color:${C.brown};box-shadow:inset 0 0 0 .25mm rgba(74,52,38,.25)}
`;
