// Shared pieces of the printable kits („საგანძურის თამაშები“, 2026-10-28; in the app since 2026-11-04): fonts, colours, the
// A4 page, the 3×3 card sheet with cut marks (63×88 mm), card backs, coins, ornaments and the icons (lucide's paths).
// Each game is a module in games/ whose pages are HTML strings; the games hub's „სამაგიდო · PDF“ button lays them out and
// saves the PDF in the browser (makeKit.ts) — there are no ready PDFs, so a change of a game's rules or looks reaches its
// kit by itself (the user's rule, 2026-11-04). Text sizes follow the plan doc: ≥10 pt on cards, ≥11 pt on rules sheets,
// ≥14 pt digits on tokens.
import { ICONS } from './icons.js';

export const C = {
  wine: '#7a2028', wineDark: '#5a151c', brown: '#4a3426', paper: '#fbf6ec', parch: '#e8dcc8', cream: '#f3e8d2',
  gold: '#c9a24b', goldDark: '#a67c2e', muted: '#9a8b7b', night: '#2b1e14', line: '#d9c9ad',
};

/** The series: one stripe on every cover, numbered as the plan doc lists the games. */
export const SERIES = 'საგანძურის თამაშები';
export const SCHOOL = 'საგანძურის სკოლა';

// ---------- fonts (Noto Serif / Sans Georgian, Google's OFL fonts, served from public/fonts/print) ----------
const FONTS = [
  ['SerifKa', [400, 700, 800]],
  ['SansKa', [700, 900]],
];
const fontFaces = () => FONTS.flatMap(([family, weights]) => weights.map(w =>
  `@font-face{font-family:'${family}';src:url('/fonts/print/${family}-${w}.ttf') format('truetype');font-weight:${w}}`)).join('\n');

// ---------- text helpers ----------
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** მხედრული → ასომთავრული (the letters sit 0x30 apart in Unicode; ჱ ჲ ჳ ჴ ჵ too). */
export const aso = s => String(s).replace(/[ა-ჵ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x30));

// ---------- icons: lucide's paths, drawn as plain SVG ----------
const iconNode = name => {
  const node = ICONS[name];
  if (!node) throw new Error(`icon ${name}: not in src/print/icons.js (node scripts/print-icons.mjs)`);
  return node;
};
/** One lucide icon as an inline SVG; `size` in mm. */
export const icon = (name, { size = 6, color = C.gold, width = 1.75, cls = '', style = '' } = {}) => {
  const body = iconNode(name).map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('');
  return `<svg class="${cls}" style="${style}" width="${size}mm" height="${size}mm" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
};

/** The same icon nested inside another SVG drawn in mm: `x`, `y`, `size` are that SVG's user units. */
export const iconIn = (name, { x = 0, y = 0, size = 6, color = C.gold, width = 1.75, opacity = 1 } = {}) =>
  `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}">${iconNode(name).map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('')}</svg>`;

// ---------- ornaments ----------
/** A vine tendril for a card's corner (viewBox 0 0 40 40, drawn for the top-left corner; rotate for the others). */
export const vineCorner = (color = C.gold, size = 9) => `<svg viewBox="0 0 40 40" width="${size}mm" height="${size}mm" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round">
<path d="M3 37 C3 24 8 12 20 7 C27 4 33 3 37 3"/>
<path d="M12 18 C9 15 9 10 13 8 C15 12 14 16 12 18Z" fill="${color}" fill-opacity=".55"/>
<path d="M24 7 C22 3 25 0 29 1 C29 5 27 7 24 7Z" fill="${color}" fill-opacity=".55"/>
<path d="M5 29 C2 27 1 23 4 20 C7 23 7 27 5 29Z" fill="${color}" fill-opacity=".55"/>
<path d="M16 11 C19 13 21 17 20 21" stroke-width="1.1"/>
<g fill="${color}" stroke="none" fill-opacity=".8"><circle cx="21" cy="22" r="1.7"/><circle cx="24" cy="24" r="1.7"/><circle cx="22.5" cy="26.5" r="1.7"/><circle cx="19" cy="25" r="1.7"/><circle cx="20.5" cy="28.5" r="1.5"/></g>
</svg>`;
/** The four corners of a frame (inside `.frame2`), as absolutely positioned SVGs. */
export const corners = (color = C.gold, size = 9, inset = 4) => ['tl', 'tr', 'br', 'bl'].map((k, i) =>
  `<div class="corner ${k}" style="position:absolute;${k.includes('t') ? 'top' : 'bottom'}:${inset}mm;${k.includes('l') ? 'left' : 'right'}:${inset}mm;transform:rotate(${i * 90}deg);line-height:0">${vineCorner(color, size)}</div>`).join('');

/** A braided (ჩუქურთმა) band as an SVG pattern — a rectangle `w`×`h` mm. */
export const braid = (w, h, { color = C.gold, bg = C.wine, id = 'br' } = {}) => `<svg width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}" style="display:block">
<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="8" height="${h}"><path d="M0 ${h / 2} C2 ${h * 0.12} 6 ${h * 0.12} 8 ${h / 2}" fill="none" stroke="${color}" stroke-width=".7"/><path d="M0 ${h / 2} C2 ${h * 0.88} 6 ${h * 0.88} 8 ${h / 2}" fill="none" stroke="${color}" stroke-width=".7"/><circle cx="4" cy="${h / 2}" r=".7" fill="${color}"/></pattern></defs>
<rect width="${w}" height="${h}" fill="${bg}"/><rect width="${w}" height="${h}" fill="url(#${id})"/></svg>`;

/** ვაზის მტევანი — a grape bunch with its leaf and tendril in a double ring (viewBox 0 0 100 100). The games' emblem since
 *  2026-11-01, when the user took every religious sign (the Bolnisi cross it replaced among them) out of the games. */
export const grapeEmblem = (size, color = C.gold) => {
  const rows = [[40, 4], [50.5, 3], [61, 2], [71.5, 1]];
  const grapes = rows.flatMap(([y, n]) => Array.from({ length: n }, (_, k) => `<circle cx="${(50 + (k - (n - 1) / 2) * 11.4).toFixed(1)}" cy="${y}" r="5.6"/>`));
  return `<svg viewBox="0 0 100 100" width="${size}mm" height="${size}mm" fill="${color}" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">
<circle cx="50" cy="50" r="47" fill="none" stroke-width="1.6"/><circle cx="50" cy="50" r="42" fill="none" stroke-width=".8"/>
<path d="M50 34 C50 29 48 25 45 21" fill="none" stroke-width="2.2"/>
<path d="M51 27 C55 17 66 13 75 18 C70 20 69 25 73 29 C65 31 57 31 51 27 Z" fill-opacity=".85" stroke-width="1"/>
<path d="M45 21 C38 17 32 21 34 26 C36 30 31 32 28 28" fill="none" stroke-width="1.4"/>
<g stroke="none">${grapes.join('')}</g></svg>`;
};
/** ბორჯღალი — seven curved rays (viewBox -50 -50 100 100). */
export const borjgali = (size, color = C.gold) => `<svg viewBox="-50 -50 100 100" width="${size}mm" height="${size}mm" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round">
${Array.from({ length: 7 }, (_, k) => `<path d="M0 -11 Q 22 -24 10 -46" transform="rotate(${(k * 360) / 7})"/>`).join('')}<circle cx="0" cy="0" r="11" fill="${color}" stroke="none"/></svg>`;
/** ნახევარმთვარე და შვიდი ვარსკვლავი (viewBox 0 0 100 100). */
export const crescentStars = (size, color = C.gold) => {
  const star = (x, y, r) => `<path transform="translate(${x} ${y}) scale(${r})" d="M0 -1 L.29 -.4 L.95 -.31 L.47 .12 L.59 .81 L0 .5 L-.59 .81 L-.47 .12 L-.95 -.31 L-.29 -.4 Z"/>`;
  return `<svg viewBox="0 0 100 100" width="${size}mm" height="${size}mm" fill="${color}">
<path d="M42 12 A38 38 0 1 0 42 88 A30 30 0 1 1 42 12 Z"/>
${[[62, 22, 4], [78, 34, 3], [86, 52, 4], [80, 70, 3], [64, 80, 3.5], [70, 50, 2.5], [58, 60, 2]].map(([x, y, r]) => star(x, y, r)).join('')}</svg>`;
};

// ---------- page and sheet helpers ----------
const CUT = { xs: [10.5, 73.5, 136.5, 199.5], ys: [16.5, 104.5, 192.5, 280.5] };
/** Crop marks in the margins around the 189×264 mm card grid (never across a card). */
export const cutMarks = (xs = CUT.xs, ys = CUT.ys) => `<svg class="cut" viewBox="0 0 210 297" width="210mm" height="297mm" style="position:absolute;left:0;top:0" stroke="#777" stroke-width=".2">
${xs.map(x => `<line x1="${x}" y1="8" x2="${x}" y2="${ys[0] - 1}"/><line x1="${x}" y1="${ys[ys.length - 1] + 1}" x2="${x}" y2="289"/>`).join('')}
${ys.map(y => `<line x1="3" y1="${y}" x2="${xs[0] - 1}" y2="${y}"/><line x1="${xs[xs.length - 1] + 1}" y1="${y}" x2="207" y2="${y}"/>`).join('')}</svg>`;

export const page = (inner, cls = '') => `<section class="page ${cls}">${inner}</section>`;

/** A 3×3 sheet of 63×88 mm cards. `back` mirrors the columns so backs meet their fronts after duplex printing on the long edge. */
export const cardSheet = (cards, { back = false, label = '' } = {}) => {
  const order = back ? [2, 1, 0, 5, 4, 3, 8, 7, 6] : [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const slots = order.map(i => cards[i] ?? '<div class="card blank"></div>').join('');
  return page(`${cutMarks()}<div class="grid">${slots}</div><div class="sheetLabel">ფურცელი %SHEET% · ${esc(label)}</div>`, 'sheet');
};

/** Round tokens ⌀`d` mm in a 7×10 grid (fits A4 with a 25 mm punch's spacing); `back` mirrors every row. */
export const tokenSheet = (tokens, { d = 25, gap = 1.5, cols = 7, rows = 10, back = false, label = '' } = {}) => {
  const w = cols * d + (cols - 1) * gap, h = rows * d + (rows - 1) * gap;
  const left = (210 - w) / 2, top = (297 - h) / 2;
  let out = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + (back ? cols - 1 - c : c);
    const t = tokens[i];
    if (t) out += `<div class="token" style="left:${left + c * (d + gap)}mm;top:${top + r * (d + gap)}mm;width:${d}mm;height:${d}mm">${t}</div>`;
  }
  return page(`${out}<div class="sheetLabel">ფურცელი %SHEET% · ${esc(label)}</div>`, 'tokens');
};

/** A sheet of pieces placed by hand: items { x, y, w, h, html } in mm. `back` mirrors every item left↔right, so a back meets
 * its front after duplex printing on the long edge. */
export const placedSheet = (items, { back = false, label = '', cls = 'placed' } = {}) => page(`${items.map(it =>
  `<div class="piece" style="left:${back ? 210 - it.x - it.w : it.x}mm;top:${it.y}mm;width:${it.w}mm;height:${it.h}mm">${it.html}</div>`).join('')}
${label ? `<div class="sheetLabel">ფურცელი %SHEET% · ${esc(label)}</div>` : ''}`, cls);

/** `cols`×`rows` equal pieces of `w`×`h` mm centred on the page with crop marks (slips, small cards); `back` mirrors the columns. */
export const gridSheet = (items, { cols, rows, w, h, back = false, label = '', cls = 'gsheet' }) => {
  const left = (210 - cols * w) / 2, top = (297 - rows * h) / 2;
  const xs = Array.from({ length: cols + 1 }, (_, i) => left + i * w), ys = Array.from({ length: rows + 1 }, (_, i) => top + i * h);
  let out = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const it = items[r * cols + (back ? cols - 1 - c : c)];
    if (it) out += `<div class="piece" style="left:${xs[c]}mm;top:${ys[r]}mm;width:${w}mm;height:${h}mm">${it}</div>`;
  }
  return page(`${cutMarks(xs, ys)}${out}<div class="sheetLabel">ფურცელი %SHEET% · ${esc(label)}</div>`, cls);
};

/** Corners of a pointy-top hexagon (flat sides left and right) around cx, cy with circumradius r. */
export const hexPts = (cx, cy, r) => [-90, -30, 30, 90, 150, 210].map(a => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)]);
export const ptsAttr = pts => pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

/** The whole file prints „ორმხრივად, გრძელი კიდით“: every physical sheet is { key, front, back? } and becomes two pages, a
 * one-sided sheet getting a back that says it is blank on purpose. `%SHEET%` in a page becomes its sheet number. */
export const duplex = (sheets) => sheets.flatMap((sh, i) => {
  const n = String(i + 1);
  const fill = html => html.replaceAll('%SHEET%', n);
  return [fill(sh.front), sh.back ? fill(sh.back) : page(`<div class="blankBack">ფურცელი ${n} · ეს მხარე განზრახ ცარიელია — ფაილი ორმხრივი ბეჭდვისთვისაა აწყობილი</div>`, 'blank')];
});
/** A sheet's number in the list (the cover is sheet 1). */
export const sheetNo = (sheets, key) => {
  const i = sheets.findIndex(sh => sh.key === key);
  if (i < 0) throw new Error(`no sheet ${key}`);
  return i + 1;
};

/** The series stripe for covers and rules sheets: a board game's number, or a label (the app's games: „ქართული · უტელეფონო“). */
export const stripe = (no, right = SCHOOL) => `<div class="stripe"><span class="aso">${aso(SERIES)}</span><span class="no">${typeof no === 'number' ? `№${no}` : esc(no)}</span><span class="right">${esc(right)}</span></div>`;

/** A sheet footer: the game, the series and the page number are set by CSS counters on print. */
export const foot = (text) => `<div class="foot">${text}</div>`;

export const baseCss = () => `
${fontFaces()}
:root,.kit-root{--wine:${C.wine};--wine2:${C.wineDark};--brown:${C.brown};--paper:${C.paper};--parch:${C.parch};--cream:${C.cream};--gold:${C.gold};--gold2:${C.goldDark};--muted:${C.muted};--night:${C.night};--line:${C.line}}
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body,.kit-root{margin:0;padding:0;background:#fff;color:var(--brown);font-family:'SerifKa',serif;font-size:11pt;line-height:1.35;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;height:297mm;position:relative;overflow:hidden;page-break-after:always;background:#fff}
.page:last-child{page-break-after:auto}
.aso{font-family:'SansKa',sans-serif;font-weight:900;letter-spacing:.03em}
.fit{white-space:nowrap;overflow:hidden}
.fit>span{display:inline-block}
.sheetLabel{position:absolute;left:10.5mm;top:3mm;font-size:8pt;color:#8a7a68;letter-spacing:.04em}
.blankBack{position:absolute;left:0;right:0;bottom:12mm;text-align:center;font-size:8pt;color:#b3a593}
.grid{position:absolute;left:10.5mm;top:16.5mm;width:189mm;height:264mm;display:grid;grid-template-columns:repeat(3,63mm);grid-template-rows:repeat(3,88mm)}
.card{width:63mm;height:88mm;position:relative;overflow:hidden;background:var(--paper)}
.card.blank{background:#fff}
.card .frame{position:absolute;inset:2mm;border:.7mm solid var(--wine);border-radius:2.6mm}
.card .frame2{position:absolute;inset:3.4mm;border:.25mm solid var(--gold);border-radius:1.8mm}
.card.dark{background:var(--wine)}
.card.dark .frame{border-color:var(--gold);border-width:.35mm;inset:3mm;opacity:.9}
.card.dark .frame2{display:none}
.card .body{position:absolute;inset:5.2mm;display:flex;flex-direction:column;align-items:stretch}
.token{position:absolute;border-radius:50%;overflow:hidden}
.piece{position:absolute}
.piece>svg{display:block}
.stripe{display:flex;align-items:center;gap:4mm;background:var(--wine);color:var(--paper);padding:0 8mm;height:11mm;font-size:10pt}
.stripe .aso{font-size:11pt;letter-spacing:.08em;color:#f0d9a0}
.stripe .no{font-weight:700;color:#f0d9a0}
.stripe .right{margin-left:auto;color:var(--paper);opacity:.9}
.foot{position:absolute;left:12mm;right:12mm;bottom:7mm;font-size:8.5pt;color:var(--muted);display:flex;justify-content:space-between;border-top:.2mm solid var(--line);padding-top:1.5mm}
h1.gameTitle{margin:0;color:var(--wine);font-size:30pt;line-height:1.1}
.rules{column-count:2;column-gap:8mm;font-size:10.5pt;line-height:1.38}
.rules h3{break-after:avoid;margin:3mm 0 1mm;color:var(--wine);font-size:11pt}
.rules p{margin:0 0 2mm}
.rules ol{margin:0;padding-left:5mm}
.rules li{margin:0 0 1.8mm;padding-left:.5mm}
.rules li b,.lead b{color:var(--wine)}
table.t{border-collapse:collapse;width:100%}
table.t th,table.t td{border:.2mm solid var(--line);padding:1.2mm 1.6mm;text-align:left;vertical-align:top}
table.t th{background:var(--parch);color:var(--wine);font-weight:700}
.box{border:.3mm solid var(--gold);border-radius:2mm;padding:3mm 4mm;background:var(--paper)}
.chk{display:inline-block;width:3.6mm;height:3.6mm;border:.3mm solid var(--brown);border-radius:.6mm;vertical-align:-0.6mm;margin-right:1.2mm}
.small{font-size:9pt;color:var(--muted)}
`;

/** The cover and rules sheet's look, shared by the app's word games (the board games keep their own copies). */
export const coverCss = `
.cover{padding:10mm 14mm 0}
.cover .title{font-size:26pt;color:var(--gold2);letter-spacing:.08em}
.cover .lead{font-size:12pt;margin:3mm 0 6mm;line-height:1.4}
.cover .two{display:grid;grid-template-columns:1fr 1fr;gap:8mm;font-size:10pt}
.cover h3{margin:0 0 2mm;color:var(--wine);font-size:12pt}
.cover table.comp{font-size:9.3pt}
.cover table.comp td,.cover table.comp th{padding:1.1mm 1.4mm}
.cover .how{margin:0;padding-left:4.5mm;font-size:9.8pt;line-height:1.35}
.cover .how li{margin-bottom:1.6mm}
.cover .legal{margin-top:3mm;font-size:9pt}
.rulesWrap{padding:6mm 12mm 0}
.rhead{display:flex;align-items:baseline;gap:5mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.5mm;margin-bottom:3mm}
.rtitle{font-size:20pt;color:var(--wine)}
.rsub{font-size:10.5pt;color:var(--muted)}
.lead{font-size:10.8pt;line-height:1.4;margin:0 0 3mm}
`;

/** The script that shrinks `.fit` titles until they fit their width (run after fonts load). */
export const fitScript = `document.querySelectorAll('.fit').forEach(el=>{const s=el.firstElementChild;if(!s)return;let size=parseFloat(getComputedStyle(el).fontSize);let n=0;while(s.scrollWidth>el.clientWidth+0.5&&size>6&&n++<60){size-=0.25;el.style.fontSize=size+'px';}});`;

export const document_ = ({ title, css = '', head = '', pages }) => `<!doctype html><html lang="ka"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${baseCss()}${css}</style>${head}</head><body>${pages.join('\n')}</body></html>`;
