// „ლურჯი სუფრა“ (series №5): the printable kit of an Azul-like game (Michael Kiesling's Azul, 2017), set in Erekle II's Tbilisi —
// masters of the dyers' guild print the blue tablecloth (wax-resist ornaments, dipped in indigo) for the king's feast, and the
// winner becomes the guild's უსტაბაში. 13 sheets, two-sided: cover, 4 pages of rules, 105 stamps (the tiles, 20 mm), four boards
// (apprentice side / master side), 9 trays, the უსტაბაში token and buttons, 9 cards, the meidan mat and the box label.
import { C, SERIES, SCHOOL, aso, esc, icon, cardSheet, placedSheet, page, stripe, foot, duplex, sheetNo } from '../lib.mjs';

export const id = 'lurji-supra';
export const title = 'ლურჯი სუფრა';
const NO = 5;
const META = '2–4 მოთამაშე · 8 წლიდან · 30–45 წუთი';

const LILA = '#1f3a5f', LILA_DEEP = '#162b48', WHITE = '#fbf7ee', CLOTH = '#f3eee2';
const WOOD = '#8a6239', WOOD_DARK = '#5b3d22', WOOD_LIGHT = '#d4b080', WOOD_CELL = '#f2e8d4';
const BOARD_BG = '#f8f2e5';
const MINUS = '−';

// ---------- the five ornaments: white on their colour, `bg` cuts the details out; drawn in a 100×100 box ----------
const ORNAMENT = {
  tevzi: (fg, bg) => `<path d="M24 50L6 31Q13 50 6 69Z" fill="${fg}"/>
<path d="M19 50C31 28 62 24 82 43Q89 50 82 57C62 76 31 72 19 50Z" fill="${fg}"/>
<path d="M41 32Q52 17 66 30Z" fill="${fg}"/><path d="M47 68Q55 80 64 67Z" fill="${fg}"/>
<path d="M68 35.5Q61 50 68 64.5" fill="none" stroke="${bg}" stroke-width="2.8" stroke-linecap="round"/>
<path d="M43 38Q37 44 43 50Q37 56 43 62M54 37Q48 43.5 54 50Q48 56.5 54 63" fill="none" stroke="${bg}" stroke-width="2.6" stroke-linecap="round"/>
<circle cx="75.5" cy="46.5" r="3.8" fill="${bg}"/>`,
  iremi: (fg, bg) => `<path d="M38 44V7" stroke="${fg}" stroke-width="2.6" stroke-linecap="round"/>
<path d="M38 8L59 10L52.5 15.5L59 21L38 21Z" fill="${fg}"/><circle cx="44" cy="14.6" r="2.3" fill="${bg}"/>
<path d="M25 54C25 47 30 43 38 43H62C68 43 72 47 72 52V58C72 63 68 66 62 66H35C29 66 25 62 25 58Z" fill="${fg}"/>
<path d="M60 47L70 29L79 31L73 51Z" fill="${fg}"/>
<path d="M69 30C71 25 77 22 82 24L93 30.5C95 32.5 94 35.5 91 35.5L80 36C75 37 71 35 69 30Z" fill="${fg}"/>
<path d="M72.5 26.5L67 20L76.5 23Z" fill="${fg}"/>
<path d="M76 24C74 18 70 14 64 11.5M72.6 18L67 18.6M70.4 14.6L71 8.6M80.5 23C81.5 17 85 13 90 10M82 17.4L87.5 18.4M84.8 13.4L85 7.4" stroke="${fg}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
<path d="M31 64L29 87M39.5 65L41.5 87M60 65L58 87M67 63L70.5 87" stroke="${fg}" stroke-width="3.6" stroke-linecap="round"/>
<path d="M26 50L17 46L22 56Z" fill="${fg}"/>
<g fill="${bg}"><circle cx="34" cy="54.5" r="2.1"/><circle cx="43.5" cy="50" r="2.1"/><circle cx="43.5" cy="59" r="2.1"/><circle cx="53" cy="54.5" r="2.1"/><circle cx="62.5" cy="50" r="2.1"/><circle cx="62.5" cy="59" r="2.1"/></g>
<circle cx="84" cy="28.6" r="1.9" fill="${bg}"/>`,
  chiti: (fg, bg) => `<path d="M33 55C22 50 15 38 13 22C21 29 29 39 40 49Z" fill="${fg}"/>
<path d="M31 61C19 63 9 56 3 45C14 49 23 53 34 57Z" fill="${fg}"/>
<path d="M28 58C28 45 44 38 58 40C68 41 73 48 71 56C69 66 54 72 42 70C35 69 28 64 28 58Z" fill="${fg}"/>
<path d="M60 44C61 33 67 24 76 23C83 22 88 27 88 33C88 39 83 41 79 42C73 44 71 50 70 54Z" fill="${fg}"/>
<path d="M86.5 28L97 32L86.5 36.5Z" fill="${fg}"/>
<path d="M50 70L47 85M58 69L61 85M42 85.5H52M56 85.5H66" stroke="${fg}" stroke-width="2.8" stroke-linecap="round"/>
<path d="M65 50C58 43 46 45 37 57C47 53 57 54 65 50Z" fill="${bg}"/><path d="M47 54.5L55 51" stroke="${fg}" stroke-width="1.6" stroke-linecap="round"/>
<circle cx="80" cy="30" r="2.7" fill="${bg}"/>`,
  varskvlavi: (fg, bg) => {
    const pt = (k, r) => { const a = (k * 22.5 - 90) * Math.PI / 180; return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`; };
    const star = Array.from({ length: 16 }, (_, k) => pt(k, k % 2 ? 30.5 : 44)).join(' ');
    const petals = Array.from({ length: 8 }, (_, k) => `<ellipse cx="50" cy="41.2" rx="3.3" ry="6.4" transform="rotate(${k * 45} 50 50)"/>`).join('');
    const holes = Array.from({ length: 8 }, (_, k) => { const a = (k * 45 - 90) * Math.PI / 180; return `<circle cx="${(50 + 33 * Math.cos(a)).toFixed(2)}" cy="${(50 + 33 * Math.sin(a)).toFixed(2)}" r="2.3"/>`; }).join('');
    return `<polygon points="${star}" fill="${fg}"/><g fill="${bg}">${holes}</g><circle cx="50" cy="50" r="19.5" fill="${bg}"/>
<circle cx="50" cy="50" r="17" fill="none" stroke="${fg}" stroke-width="1.8"/><g fill="${fg}">${petals}</g><circle cx="50" cy="50" r="3.8" fill="${bg}"/>`;
  },
  vazi: (fg, bg) => {
    const grapes = [[32, 45], [44, 45], [56, 45], [68, 45], [38, 56], [50, 56], [62, 56], [44, 67], [56, 67], [50, 78]];
    return `<path d="M50 35C50 29 52 25 50 18" stroke="${fg}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
<path d="M48 29C42 17 27 15 18 22C24 25 22 31 15 35C26 41 39 38 48 30Z" fill="${fg}"/>
<path d="M45 29C36 27 28 27 21 30M37 28L31 21.5M33 28.5L29 34" stroke="${bg}" stroke-width="1.7" fill="none" stroke-linecap="round"/>
<path d="M53 25C60 15 75 16 76 24.5C77 32 67.5 33 66.5 26.5" stroke="${fg}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
${grapes.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.3" fill="${fg}"/><circle cx="${x - 2}" cy="${y - 2}" r="1.6" fill="${bg}"/>`).join('')}`;
  },
};
/** In the order of the wall's first row (the original's blue, yellow, red, black, white); every next row moves one to the right. */
const ORN = [
  { key: 'tevzi', name: 'თევზი', color: '#2f6db0' },
  { key: 'iremi', name: 'ირემი დროშით', short: 'ირემი', color: '#a87519' },
  { key: 'chiti', name: 'ჩიტი', color: '#8e2431' },
  { key: 'varskvlavi', name: 'ვარსკვლავი', color: '#272321' },
  { key: 'vazi', name: 'ვაზი', color: '#2e7a4c' },
];
const ORN_AT = (r, c) => ORN[(c - r + 5) % 5];
const orn = (o, { x = 0, y = 0, size = 100, fg = WHITE, bg = o.color, opacity = 1 } = {}) =>
  `<g transform="translate(${x} ${y}) scale(${size / 100})" opacity="${opacity}">${ORNAMENT[o.key](fg, bg)}</g>`;
/** A stamp inside another SVG (user units = mm): its colour, a thin gold frame, the ornament. */
const stampIn = (o, x, y, s, { frame = true } = {}) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${(s * 0.07).toFixed(2)}" fill="${o.color}"/>
${frame ? `<rect x="${x + s * 0.055}" y="${y + s * 0.055}" width="${s * 0.89}" height="${s * 0.89}" rx="${(s * 0.04).toFixed(2)}" fill="none" stroke="#e8c877" stroke-width="${(s * 0.014).toFixed(3)}"/>` : ''}
${orn(o, { x: x + s * 0.1, y: y + s * 0.1, size: s * 0.8 })}`;

// ---------- the stamps (tiles): 20 mm, edge to edge, one sheet; the back is one indigo field, so a duplex shift never shows ----------
const T = 20, TX = 15, TY = 15, TCOLS = 9, TROWS = 12;
const tileSvg = o => `<svg width="20mm" height="20mm" viewBox="0 0 100 100" style="display:block;overflow:visible">
<rect x="-1.5" y="-1.5" width="103" height="103" fill="${o.color}"/>
<rect x="6.4" y="6.4" width="88" height="88" rx="4" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="1.6"/>
<rect x="5.4" y="5.4" width="88" height="88" rx="4" fill="none" stroke="#e8c877" stroke-width="1.5"/>
${orn(o, { x: 10, y: 10, size: 80 })}</svg>`;
const measureTile = `<svg width="20mm" height="20mm" viewBox="0 0 20 20" font-family="SerifKa" style="display:block"><rect x=".15" y=".15" width="19.7" height="19.7" fill="#fff" stroke="${C.muted}" stroke-width=".3" stroke-dasharray=".8 .6"/>
<text x="10" y="9" font-size="4.4" font-weight="700" fill="${C.wine}" text-anchor="middle">20 მმ</text><text x="10" y="14" font-size="2.9" fill="${C.brown}" text-anchor="middle">გაზომე</text></svg>`;
// rows 0–9: two rows of each ornament; rows 10–11: three more of each (20 + 1 spare), the ruler square and two empty places
const TILE_CELLS = [...ORN.flatMap(o => Array(18).fill(o)), ...ORN.flatMap(o => Array(3).fill(o)), 'measure'];
const tileMarks = `<svg viewBox="0 0 210 297" width="210mm" height="297mm" style="position:absolute;left:0;top:0" stroke="#777" stroke-width=".2">
${Array.from({ length: TCOLS + 1 }, (_, k) => TX + k * T).map(x => `<line x1="${x}" y1="8" x2="${x}" y2="${TY - 3}"/><line x1="${x}" y1="${TY + TROWS * T + 3}" x2="${x}" y2="${TY + TROWS * T + 8}"/>`).join('')}
${Array.from({ length: TROWS + 1 }, (_, k) => TY + k * T).map(y => `<line x1="6" y1="${y}" x2="${TX - 3}" y2="${y}"/><line x1="${TX + TCOLS * T + 3}" y1="${y}" x2="204" y2="${y}"/>`).join('')}</svg>`;
const tilesLegend = `<div class="tLegend"><div class="tl1">${ORN.map(o => `<span><svg width="9mm" height="9mm" viewBox="0 0 9 9">${stampIn(o, 0, 0, 9, { frame: false })}</svg>${esc(o.name)}</span>`).join('')}</div>
<p>105 ბეჭედი — თითო ორნამენტი 21-ჯერ (20 + 1 სათადარიგო). ჭერი ნიშნულებს შორის, სახაზავით; „20 მმ“ კვადრატით შეამოწმე, რომ ფურცელი 100%-ზე დაიბეჭდა.</p></div>`;
const tilesFront = placedSheet([
  ...TILE_CELLS.map((it, i) => ({ x: TX + (i % TCOLS) * T, y: TY + Math.floor(i / TCOLS) * T, w: T, h: T, html: it === 'measure' ? measureTile : tileSvg(it) })),
  { x: 0, y: 0, w: 210, h: 297, html: tileMarks },
  { x: 15, y: TY + TROWS * T + 11, w: 180, h: 24, html: tilesLegend },
], { label: 'ლურჯი სუფრა · ბეჭდები — წინა მხარე (სტიკერზე ბეჭდვისას — ცალკე, ცალმხრივად)' });
const tilesBackField = (() => {
  const w = TCOLS * T + 4, h = TROWS * T + 4;
  return `<svg width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}" style="display:block"><defs><pattern id="tbk" patternUnits="userSpaceOnUse" x="2" y="2" width="20" height="20">
<rect width="20" height="20" fill="${LILA}"/><circle cx="10" cy="10" r="3.1" fill="none" stroke="${CLOTH}" stroke-opacity=".28" stroke-width=".45"/><circle cx="10" cy="10" r=".9" fill="${CLOTH}" fill-opacity=".3"/>
${[[5, 5], [15, 5], [5, 15], [15, 15]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".45" fill="${CLOTH}" fill-opacity=".22"/>`).join('')}</pattern></defs><rect width="${w}" height="${h}" fill="url(#tbk)"/></svg>`;
})();
const tilesBack = placedSheet([
  { x: TX - 2, y: TY - 2, w: TCOLS * T + 4, h: TROWS * T + 4, html: tilesBackField },
  { x: 0, y: 0, w: 210, h: 297, html: tileMarks },
], { back: true, label: 'ლურჯი სუფრა · ბეჭდები — ზურგი (ყველას ერთნაირი, ტომრიდან ბრმად ამოსაღებად)' });

// ---------- the players' boards: A4 landscape, drawn in mm (297 × 210) and turned onto the portrait page ----------
const PLAYERS = [
  { name: 'ღვინისფერი', color: '#7a2028' }, { name: 'ოქროსფერი', color: '#c08f2a' },
  { name: 'ლურჯი', color: '#1f4e9c' }, { name: 'მწვანე', color: '#1d7f5f' },
];
const PITCH = 22, CELL = 21, TOP = 55, LINE_R = 133, WALL_X = 155;
const lineX = k => LINE_R - PITCH * (k + 1);                  // k = 0 is a line's rightmost place
const FLOOR = [1, 1, 2, 2, 2, 3, 3];
const splash = (x, y, s, color, opacity) => `<path transform="translate(${x} ${y}) scale(${s})" fill="${color}" opacity="${opacity}" d="M0 -8C3 -3.5 6.5 -1.5 6.5 3C6.5 6.5 3.6 8.2 0 8.2C-3.6 8.2 -6.5 6.5 -6.5 3C-6.5 -1.5 -3 -3.5 0 -8ZM6.6 -5.6A1.4 1.4 0 1 1 6.6 -5.5ZM-7 7A1 1 0 1 1 -7 7.1ZM4.2 -8A.9 .9 0 1 1 4.2 -7.9Z"/>`;
const loomPoly = () => {
  const p = 3, pts = [[LINE_R + p, TOP - p], [LINE_R + p, TOP + 4 * PITCH + CELL + p]];
  for (let r = 4; r >= 0; r--) {
    const x = lineX(r) - p, y = TOP + r * PITCH - p;
    pts.push([x, r === 4 ? TOP + 4 * PITCH + CELL + p : pts[pts.length - 1][1]], [x, y]);
  }
  return pts.map(([x, y]) => `${x},${y}`).join(' ');
};
const boardSvg = (side, P, { width = 297, marks = false } = {}) => {
  const master = side === 'master';
  let s = `<rect x="7" y="7" width="283" height="196" rx="4" fill="${BOARD_BG}" stroke="${C.gold}" stroke-width=".5"/>
<rect x="9" y="9" width="279" height="192" rx="3" fill="none" stroke="${C.gold}" stroke-width=".25" stroke-dasharray="1.2 1.2"/>`;
  // the header
  s += `<text x="13" y="16.4" font-family="SansKa" font-weight="900" font-size="2.9" letter-spacing=".45" fill="${C.goldDark}">${aso(title)}</text>
<text x="13" y="25.4" font-weight="800" font-size="6.6" fill="${C.wine}">ლურჯი სუფრა</text>
<rect x="13" y="28.6" width="37" height="6.6" rx="3.3" fill="${master ? C.wine : LILA}"/><text x="31.5" y="33.1" font-size="3.4" font-weight="700" fill="${WHITE}" text-anchor="middle">${master ? 'ოსტატის მხარე' : 'შეგირდის მხარე'}</text>
<circle cx="16" cy="41.4" r="2.7" fill="${P.color}" stroke="#fff" stroke-width=".5"/><text x="20.6" y="42.6" font-size="3.3" fill="${C.brown}">შენი ღილი — ${esc(P.name)}</text>`;
  // the praise track 0–100: five rows of twenty
  s += `<rect x="94.5" y="11" width="9.5" height="7" rx="1" fill="${LILA}"/><text x="99.25" y="16.1" font-size="3.9" font-weight="700" fill="${WHITE}" text-anchor="middle">0</text>
<text transform="translate(100.4 32.6) rotate(-90)" font-size="3.2" fill="${C.muted}" text-anchor="middle">ქების ბილიკი</text>`;
  for (let k = 0; k < 5; k++) for (let j = 0; j < 20; j++) {
    const n = k * 20 + j + 1, x = 106 + j * 9, y = 11 + k * 7;
    s += `<rect x="${x}" y="${y}" width="9" height="7" fill="${n % 5 ? '#fffaf1' : '#f2e1b4'}" stroke="${C.line}" stroke-width=".3"/><text x="${x + 4.5}" y="${y + 5.15}" font-size="3.7" text-anchor="middle" fill="${n % 5 ? '#8f8070' : C.wine}" font-weight="${n % 10 ? 400 : 700}">${n}</text>`;
  }
  // the loom: five lines of 1–5 places, filled from the right
  s += `<polygon points="${loomPoly()}" fill="${WOOD}" stroke="${WOOD}" stroke-width="2.4" stroke-linejoin="round"/>`;
  for (let r = 0; r < 5; r++) {
    const y = TOP + r * PITCH;
    s += `<line x1="${lineX(r) - 1.5}" y1="${y + CELL + 1.9}" x2="${LINE_R + 1.5}" y2="${y + CELL + 1.9}" stroke="${WOOD_DARK}" stroke-width=".35" opacity=".5"/>`;
    for (let k = 0; k <= r; k++) {
      const x = lineX(k);
      s += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="1.2" fill="${WOOD_CELL}" stroke="${WOOD_DARK}" stroke-width=".4"/><rect x="${x + 1.6}" y="${y + 1.6}" width="${CELL - 3.2}" height="${CELL - 3.2}" rx=".8" fill="none" stroke="#c7ae88" stroke-width=".3" stroke-dasharray="1 1"/>`;
    }
    s += `<circle cx="${lineX(r) - 6.6}" cy="${y + CELL / 2}" r="3.3" fill="#fffaf1" stroke="${WOOD_DARK}" stroke-width=".4"/><text x="${lineX(r) - 6.6}" y="${y + CELL / 2 + 1.35}" font-size="3.7" font-weight="700" fill="${WOOD_DARK}" text-anchor="middle">${r + 1}</text>
<polygon points="${LINE_R + 4.6},${y + CELL / 2 - 3.6} ${LINE_R + 11.6},${y + CELL / 2} ${LINE_R + 4.6},${y + CELL / 2 + 3.6}" fill="${C.gold}"/>`;
  }
  s += master
    ? `<text x="13" y="61.5" font-size="4" font-weight="800" fill="${WOOD_DARK}">დაზგის ზოლები</text>
<text x="13" y="67" font-size="3.05" fill="${C.brown}">ოსტატის მხარე: ბეჭედი რიგის</text><text x="13" y="71" font-size="3.05" fill="${C.brown}">ნებისმიერ ცარიელ უჯრაზე ჯდება,</text><text x="13" y="75" font-size="3.05" fill="${C.brown}">ოღონდ სვეტში ორნამენტი არ მეორდება.</text>`
    : `<text x="13" y="61.5" font-size="4" font-weight="800" fill="${WOOD_DARK}">დაზგის ზოლები</text>
<text x="13" y="67" font-size="3.05" fill="${C.brown}">ერთ ზოლში — ერთი ორნამენტი.</text><text x="13" y="71" font-size="3.05" fill="${C.brown}">ბეჭდები მარჯვნიდან ეწყობა.</text>`;
  // the cloth: the 5×5 field of the tablecloth on indigo, with a white printed border
  s += `<rect x="148" y="49" width="124" height="122" rx="1.6" fill="${LILA}"/>
<rect x="150.2" y="51.2" width="119.6" height="117.6" rx="1" fill="none" stroke="${CLOTH}" stroke-width=".5"/>
<rect x="151.9" y="52.9" width="116.2" height="114.2" fill="none" stroke="${CLOTH}" stroke-width=".95" stroke-dasharray="0 2.25" stroke-linecap="round"/>`;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const x = WALL_X + c * PITCH, y = TOP + r * PITCH, o = ORN_AT(r, c);
    s += master
      ? `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="1.2" fill="#fff" fill-opacity=".07" stroke="${CLOTH}" stroke-opacity=".5" stroke-width=".35"/>`
      : `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="1.2" fill="${o.color}" fill-opacity=".5"/>${orn(o, { x: x + 2.1, y: y + 2.1, size: CELL - 4.2, opacity: 0.55 })}`;
  }
  // the spilt dye: seven places and their penalties
  for (let k = 0; k < 7; k++) {
    const x = 13 + k * PITCH;
    s += `<text x="${x + CELL / 2}" y="177.6" font-size="3.9" font-weight="800" fill="${C.wine}" text-anchor="middle">${MINUS}${FLOOR[k]}</text>
<rect x="${x}" y="180" width="${CELL}" height="${CELL}" rx="1.2" fill="${WOOD_CELL}" stroke="${WOOD_DARK}" stroke-width=".4"/>${splash(x + CELL / 2, 190.5, 0.95, "#3d6896", 0.3)}`;
  }
  s += `<rect x="171" y="175.5" width="114" height="25.5" rx="2" fill="#fffaf1" stroke="${C.gold}" stroke-width=".4"/>
<text x="175" y="181.6" font-size="3.25" fill="${C.brown}"><tspan font-weight="800" fill="${C.wine}">◀ დაღვრილი საღებავი</tspan> — ზედმეტი ბეჭდები; საღამოს ჯარიმაა.</text>
<text x="175" y="188.4" font-size="3.25" font-weight="700" fill="${C.wine}">თამაშის ბოლოს — ბონუსები:</text>
${[['+2', 'სრული რიგი', 175], ['+7', 'სრული სვეტი', 206], ['+10', 'ორნამენტის ხუთივე', 239]].map(([b, t, x]) => `<rect x="${x}" y="191.6" width="${b.length > 2 ? 8 : 6.6}" height="5.4" rx="1.2" fill="${C.gold}"/><text x="${x + (b.length > 2 ? 4 : 3.3)}" y="195.4" font-size="3.2" font-weight="800" fill="#fff" text-anchor="middle">${b}</text><text x="${x + (b.length > 2 ? 9.4 : 8)}" y="195.5" font-size="3.05" fill="${C.brown}">${t}</text>`).join('')}`;
  if (marks) s += [[200, 29, 1], [38, 104, 2], [210, 110, 3], [88, 205, 4], [172, 176, 5]].map(([x, y, n]) =>
    `<g transform="translate(${x} ${y})"><circle r="6.2" fill="${C.wine}" stroke="#fff" stroke-width="1.2"/><text y="2.6" font-size="7.4" font-weight="800" fill="#fff" text-anchor="middle">${n}</text></g>`).join('');
  return `<svg width="${width}mm" height="${(width * 210 / 297).toFixed(2)}mm" viewBox="0 0 297 210" font-family="SerifKa" style="display:block;overflow:visible">${s}</svg>`;
};
/** The landscape board turned onto the portrait page: the board's top edge on the page's left (front) — on the back the same
 * physical edge is the page's right, so both sides share their top. */
const turned = (svg, back) => `<div style="position:absolute;left:0;top:0;width:297mm;height:210mm;transform-origin:0 0;transform:${back ? 'translate(210mm,0) rotate(90deg)' : 'translate(0,297mm) rotate(-90deg)'}">${svg}</div>`;
const boardSheet = (P, i) => ({
  key: `board${i + 1}`,
  front: placedSheet([{ x: 0, y: 0, w: 210, h: 297, html: turned(boardSvg('apprentice', P), false) }], { label: `ლურჯი სუფრა · დაფა ${i + 1}/4 (${P.name}) — შეგირდის მხარე`, cls: 'placed boardS' }),
  back: placedSheet([{ x: 0, y: 0, w: 210, h: 297, html: turned(boardSvg('master', P), true) }], { back: true, label: `ლურჯი სუფრა · დაფა ${i + 1}/4 — ოსტატის მხარე`, cls: 'placed boardS' }),
});

// ---------- the trays (⌀90 mm, wood from above, a carved vine on the rim), the უსტაბაში token and the buttons ----------
const TRAY_NO = ['ა', 'ბ', 'გ', 'დ', 'ე', 'ვ', 'ზ', 'ჱ', 'თ'];
const forPlayers = i => (i < 5 ? '2–4' : i < 7 ? '3–4' : '4');
const vineRing = (r) => {
  const n = 180, pts = Array.from({ length: n + 1 }, (_, k) => { const t = (k / n) * 2 * Math.PI, rr = r + 1.25 * Math.sin(t * 22); return `${(rr * Math.cos(t)).toFixed(2)},${(rr * Math.sin(t)).toFixed(2)}`; });
  const leaves = Array.from({ length: 22 }, (_, k) => { const a = ((k + 0.25) / 22) * 360; return `<ellipse cx="${(r + 2.2).toFixed(2)}" cy="0" rx="1.25" ry=".6" transform="rotate(${a.toFixed(2)})"/>`; }).join('');
  return `<polyline points="${pts.join(' ')}" fill="none" stroke="${WOOD_LIGHT}" stroke-width=".45" opacity=".85"/><g fill="${WOOD_LIGHT}" opacity=".8">${leaves}</g>`;
};
const grain = Array.from({ length: 7 }, (_, k) => `<ellipse cx="${k % 2 ? 1.1 : -0.7}" cy="${(k % 3) - 1}" rx="${5 + k * 4.7}" ry="${4.4 + k * 4.5}" fill="none" stroke="${WOOD_DARK}" stroke-width=".3" opacity=".2"/>`).join('');
const trayFront = i => `<svg width="94mm" height="94mm" viewBox="-47 -47 94 94" font-family="SerifKa" style="display:block;overflow:visible">
<circle r="46.2" fill="${WOOD_DARK}"/><circle r="44.3" fill="none" stroke="${WOOD_LIGHT}" stroke-width=".3" opacity=".6"/>${vineRing(41.4)}
<circle r="38.6" fill="${WOOD_LIGHT}" stroke="#3f2914" stroke-width=".7"/>${grain}
${[[-21.5, -21.5], [1.5, -21.5], [-21.5, 1.5], [1.5, 1.5]].map(([x, y]) => `<rect x="${x}" y="${y}" width="20" height="20" rx="1.4" fill="none" stroke="${WOOD_DARK}" stroke-width=".35" stroke-dasharray="1.2 1.2" opacity=".45"/>`).join('')}
<g transform="translate(0 -41.4)"><circle r="3.9" fill="${C.wine}" stroke="#f0d9a0" stroke-width=".4"/><text y="1.45" font-family="SansKa" font-weight="900" font-size="4" fill="#f0d9a0" text-anchor="middle">${aso(TRAY_NO[i])}</text></g>
<g transform="translate(0 41.4)"><rect x="-6.4" y="-2.7" width="12.8" height="5.4" rx="2.7" fill="${C.paper}" stroke="#f0d9a0" stroke-width=".3"/><text y="1.25" font-size="3.5" font-weight="800" fill="${WOOD_DARK}" text-anchor="middle">${forPlayers(i)}</text></g>
<circle r="45" fill="none" stroke="#2b1e14" stroke-width=".25"/></svg>`;
const trayBack = `<svg width="94mm" height="94mm" viewBox="-47 -47 94 94" style="display:block;overflow:visible"><circle r="47" fill="${WOOD_DARK}"/><circle r="38.6" fill="${WOOD}"/>${grain}
${orn(ORN[3], { x: -9, y: -9, size: 18, fg: WOOD_LIGHT, bg: WOOD })}</svg>`;
const ustabashi = (cut = true) => `<svg width="20mm" height="20mm" viewBox="0 0 100 100" style="display:block;overflow:visible"><rect x="-7" y="-7" width="114" height="114" fill="${C.gold}"/>
<rect x="7" y="7" width="86" height="86" rx="7" fill="none" stroke="${C.wine}" stroke-width="2.6"/><text x="50" y="75" font-family="SansKa" font-weight="900" font-size="66" fill="${C.wine}" text-anchor="middle">${aso('უ')}</text>
${cut ? `<rect width="100" height="100" fill="none" stroke="#2b1e14" stroke-width=".9"/>` : ''}</svg>`;
const button = (P, cut = true) => `<svg width="8mm" height="8mm" viewBox="-4 -4 8 8" style="display:block;overflow:visible"><circle r="4.6" fill="${P.color}"/><circle r="2.7" fill="none" stroke="#fff" stroke-width=".35" opacity=".8"/>
${cut ? `<circle r="4" fill="none" stroke="#2b1e14" stroke-width=".12"/>` : ''}</svg>`;
const trayAt = k => [[10, 8], [106, 8], [10, 101], [106, 101], [10, 194], [106, 194]][k];
const trays1 = {
  key: 'trays1',
  front: placedSheet([0, 1, 2, 3, 4, 5].map(i => { const [x, y] = trayAt(i); return { x, y, w: 94, h: 94, html: trayFront(i) }; }), { label: 'ლურჯი სუფრა · ლანგრები ა–ვ — დააკარი 1.5–2 მმ მუყაოზე, მერე ამოჭერი' }),
  back: placedSheet([0, 1, 2, 3, 4, 5].map(i => { const [x, y] = trayAt(i); return { x, y, w: 94, h: 94, html: trayBack }; }), { back: true, label: 'ლურჯი სუფრა · ლანგრები — ზურგი' }),
};
const piecesInfo = `<div class="pInfo"><div><h4>ლანგრები</h4><p>ცხრა ლანგარია: <b>2–4</b> — ყოველთვის, <b>3–4</b> — 3 და 4 მოთამაშისას, <b>4</b> — მხოლოდ 4-ისას. ზედა ასო (ა–თ) მხოლოდ დასათვლელია. დააკარი 1.5–2 მმ მუყაოზე და წრეზე ამოჭერი — ზურგი მაინც დაიმალება.</p>
<h4>უსტაბაშის ნიშანი</h4><p>ბეჭდის ზომისაა (20 მმ), რომ დაღვრილი საღებავის უჯრაში ჩაეტიოს; ჯობია სქელ მუყაოზე. მეორე — სათადარიგოა.</p></div>
<div><h4>ქების ღილები</h4><p>ბილიკის უჯრა 9 მმ-ია — ჯობია ნამდვილი ღილი ან მძივი (≤ 8 მმ). ქაღალდის ღილი მუყაოზე დააკარი; თითო ფერი სათადარიგოა.</p>
<h4>ტომარა და გოდორი</h4><p>ლურჯი ბამბის ნაჭერი 25×55 სმ: შუაზე მოკეცე, ორი გვერდი გაკერე, ზემოთ თასმა გაუყარე. გოდორი — პატარა კალათა, ჯამი ან ყუთის თავსახური.</p></div></div>`;
const TOKEN_AT = [[127, 109], [153, 109]];
const BUTTON_AT = PLAYERS.flatMap((P, j) => [0, 1].map(h => ({ P, x: 114 + (j * 2 + h) * 10, y: 146 })));
const capPiece = (x, y, w, text) => ({ x, y, w, h: 6, html: `<div class="tokCap">${text}</div>` });
const trays2 = {
  key: 'trays2',
  front: placedSheet([
    ...[6, 7, 8].map((i, k) => { const [x, y] = trayAt(k); return { x, y, w: 94, h: 94, html: trayFront(i) }; }),
    ...TOKEN_AT.map(([x, y]) => ({ x, y, w: 20, h: 20, html: ustabashi() })),
    capPiece(106, 132, 94, 'უსტაბაშის ნიშანი · მეორე — სათადარიგო'),
    ...BUTTON_AT.map(b => ({ x: b.x, y: b.y, w: 8, h: 8, html: button(b.P) })),
    capPiece(106, 158, 94, 'ქების ღილები · ⌀8 მმ, თითო ფერი ორჯერ'),
    { x: 10, y: 202, w: 190, h: 66, html: piecesInfo },
  ], { label: 'ლურჯი სუფრა · ლანგრები ზ–თ, უსტაბაშის ნიშანი, ღილები' }),
  back: placedSheet([
    ...[0, 1, 2].map(k => { const [x, y] = trayAt(k); return { x, y, w: 94, h: 94, html: trayBack }; }),
    ...TOKEN_AT.map(([x, y]) => ({ x, y, w: 20, h: 20, html: ustabashi(false) })),
    ...BUTTON_AT.map(b => ({ x: b.x, y: b.y, w: 8, h: 8, html: button(b.P, false) })),
  ], { back: true, label: 'ლურჯი სუფრა · ლანგრები და ნიშნები — ზურგი' }),
};

// ---------- cards (63×88): four reminders for the players and five praise examples ----------
const miniCell = 6.1, miniGap = 0.55, miniPad = 1.6;
const miniPos = n => miniPad + n * (miniCell + miniGap);
const miniWall = (ex, scale = 1) => {
  const W = 2 * miniPad + 5 * miniCell + 4 * miniGap;
  const has = new Set([...ex.tiles, ex.add].map(p => p.join()));
  const band = ([r0, c0, r1, c1], color) => `<rect x="${miniPos(c0) - 0.9}" y="${miniPos(r0) - 0.9}" width="${miniPos(c1) - miniPos(c0) + miniCell + 1.8}" height="${miniPos(r1) - miniPos(r0) + miniCell + 1.8}" rx="1.4" fill="${color}"/>`;
  let s = `<rect width="${W}" height="${W}" rx="1.4" fill="${LILA}"/>`;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (!has.has(`${r},${c}`)) s += `<rect x="${miniPos(c)}" y="${miniPos(r)}" width="${miniCell}" height="${miniCell}" rx=".5" fill="${ORN_AT(r, c).color}" fill-opacity=".3"/>`;
  if (ex.h) s += band(ex.h, C.gold);
  if (ex.v) s += band(ex.v, '#e2735f');
  for (const [r, c] of ex.tiles) s += stampIn(ORN_AT(r, c), miniPos(c), miniPos(r), miniCell, { frame: false });
  const [ar, ac] = ex.add;
  s += stampIn(ORN_AT(ar, ac), miniPos(ac), miniPos(ar), miniCell, { frame: false });
  s += `<rect x="${miniPos(ac) - 0.35}" y="${miniPos(ar) - 0.35}" width="${miniCell + 0.7}" height="${miniCell + 0.7}" rx=".8" fill="none" stroke="#fff" stroke-width=".7"/>`;
  return `<svg width="${(W * scale).toFixed(2)}mm" height="${(W * scale).toFixed(2)}mm" viewBox="0 0 ${W} ${W}" style="display:block">${s}</svg>`;
};
const miniFloor = (n, scale = 1) => {
  const c = 6.1, g = 0.7, W = 7 * c + 6 * g + 0.6;
  let s = '<g transform="translate(.3 0)">';
  for (let k = 0; k < 7; k++) {
    const x = k * (c + g);
    s += `<text x="${x + c / 2}" y="3" font-size="2.9" font-weight="800" fill="${C.wine}" text-anchor="middle">${MINUS}${FLOOR[k]}</text><rect x="${x}" y="4.2" width="${c}" height="${c}" rx=".6" fill="${WOOD_CELL}" stroke="${WOOD_DARK}" stroke-width=".3"/>`;
    if (k === 0 && n) s += `<rect x="${x}" y="4.2" width="${c}" height="${c}" rx=".6" fill="${C.gold}"/><text x="${x + c / 2}" y="9.1" font-family="SansKa" font-weight="900" font-size="4.6" fill="${C.wine}" text-anchor="middle">${aso('უ')}</text>`;
    else if (k < n) s += stampIn(ORN[(k + 1) % 5], x, 4.2, c, { frame: false });
  }
  s += '</g>';
  return `<svg width="${(W * scale).toFixed(2)}mm" height="${((c + 4.4) * scale).toFixed(2)}mm" viewBox="0 0 ${W} ${c + 4.4}" font-family="SerifKa" style="display:block">${s}</svg>`;
};
const EXAMPLES = [
  { name: 'მარტო', tiles: [[0, 4], [1, 4], [3, 0]], add: [2, 2], sum: '1', text: 'გვერდით არაფერი უდევს — 1 ქულა.' },
  { name: 'რიგში', tiles: [[1, 0], [1, 1], [3, 3]], add: [1, 2], h: [1, 0, 1, 2], sum: '3', text: 'ჰორიზონტალურად 3 ბეჭედი, ახალთან ერთად.' },
  { name: 'ჯვარედინად', tiles: [[2, 0], [2, 1], [1, 2]], add: [2, 2], h: [2, 0, 2, 2], v: [1, 2, 2, 2], sum: '3 + 2 = 5', text: 'ახალი ბეჭედი ორივე ჯაჭვში ითვლება.' },
  { name: 'გაწყვეტილი', tiles: [[3, 0], [3, 1], [3, 4], [4, 3], [0, 3]], add: [3, 3], h: [3, 3, 3, 4], v: [3, 3, 4, 3], sum: '2 + 2 = 4', text: 'ცარიელი უჯრა ჯაჭვს წყვეტს — შორს მდგომი არ ითვლება.' },
  { name: 'დაღვრილი საღებავი', floor: 4, sum: `${MINUS}1 ${MINUS}1 ${MINUS}2 ${MINUS}2 = ${MINUS}6`, text: 'უსტაბაშის ნიშანიც უჯრას იკავებს. ქება 0-ზე ქვემოთ არ ჩადის.' },
];
const cardBand = (text, bg = LILA) => `<div class="cband" style="background:${bg}"><span class="aso">${aso(title)}</span><b>${esc(text)}</b></div>`;
const remCard = `<div class="card lcard"><div class="lframe"></div>${cardBand('სამუშაო დღე')}<div class="cbody">
<div class="rstep"><span class="ri" style="background:#c98a2b">${icon('sunrise', { size: 4.6, color: '#fff', width: 2.2 })}</span><div><b>დილა.</b> ყოველ ლანგარზე 4 ბეჭედი, ნიშანი — მეიდანზე.</div></div>
<div class="rstep"><span class="ri" style="background:${C.gold}">${icon('sun', { size: 4.6, color: '#fff', width: 2.2 })}</span><div><b>დღე.</b> აიღე ერთი ორნამენტის ყველა ბეჭედი: ლანგრიდან (დანარჩენი — მეიდანზე) ან მეიდნიდან (პირველს — ნიშანიც). ერთ ზოლზე, მარჯვნიდან.</div></div>
<div class="rstep"><span class="ri" style="background:${LILA}">${icon('moon', { size: 4.4, color: '#fff', width: 2.2 })}</span><div><b>საღამო.</b> სავსე ზოლიდან 1 ბეჭედი — სუფრაზე და ქება, დანარჩენი — გოდორში. მერე ჯარიმა.</div></div>
<div class="rfloor">${miniFloor(0, 0.96)}</div></div></div>`;
const crossEx = EXAMPLES[2];
const remBack = `<div class="card lcard dk"><div class="lpanel"></div>${cardBand('ქება', C.wine)}<div class="cbody qb">
<p><b>მარტო ბეჭედი</b> — 1 ქულა.</p><p><b>გაბმული</b> — ჰორიზონტალური ჯაჭვი + ვერტიკალური; ახალი ორივეში ითვლება.</p>
<div class="qx">${miniWall(crossEx, 0.62)}<span>3 + 2 = <b>5</b></span></div>
<div class="bon"><b>ბოლოს:</b> +2 რიგი · +7 სვეტი · +10 ორნამენტის ხუთივე.</div>
<p class="tie">ტოლობა — ვისაც მეტი სრული რიგი აქვს.</p></div></div>`;
const exCard = (ex, i) => `<div class="card lcard ex"><div class="lframe"></div>${cardBand(`ქების მაგალითი ${i + 1}`)}<div class="cbody">
<div class="exn">${esc(ex.name)}</div><div class="exw">${ex.floor ? miniFloor(ex.floor, 1.15) : miniWall(ex, 1.02)}</div>
<div class="exs">${ex.sum}</div><div class="ext">${esc(ex.text)}</div></div></div>`;
const clothField = (w, h, cell, { fg = WHITE, bg = LILA, opacity = 1, shift = 0 } = {}) => {
  let s = '';
  for (let r = 0; r * cell < h + cell; r++) for (let c = 0; c * cell < w + cell; c++) {
    const o = ORN[(c + 2 * r + shift) % 5];
    s += orn(o, { x: c * cell + cell * 0.18, y: r * cell + cell * 0.18, size: cell * 0.64, fg, bg, opacity });
    s += `<circle cx="${c * cell}" cy="${r * cell}" r="${cell * 0.045}" fill="${fg}" opacity="${opacity}"/>`;
  }
  return s;
};
const clothStrip = (w, h) => `<svg width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}" style="display:block"><rect width="${w}" height="${h}" fill="${LILA}"/>
<line x1="0" y1="1.6" x2="${w}" y2="1.6" stroke="${CLOTH}" stroke-width=".4"/><line x1="0" y1="${h - 1.6}" x2="${w}" y2="${h - 1.6}" stroke="${CLOTH}" stroke-width=".4"/>
${Array.from({ length: Math.floor(w / 13) }, (_, k) => orn(ORN[k % 5], { x: 3 + k * 13 + (w - 13 * Math.floor(w / 13)) / 2, y: (h - 10) / 2, size: 10, bg: LILA })).join('')}</svg>`;
const genericBack = `<div class="card lcard gback"><svg width="63mm" height="88mm" viewBox="0 0 63 88" font-family="SerifKa" style="display:block">
<rect width="63" height="88" fill="${LILA}"/><g transform="translate(-3.5 -2)">${clothField(70, 92, 11.6, { bg: LILA, opacity: 0.2 })}</g>
<rect x="3" y="3" width="57" height="82" rx="2.2" fill="none" stroke="${CLOTH}" stroke-width=".4"/><rect x="4.4" y="4.4" width="54.2" height="79.2" rx="1.6" fill="none" stroke="${CLOTH}" stroke-width=".7" stroke-dasharray="0 1.7" stroke-linecap="round"/>
<circle cx="31.5" cy="40" r="15" fill="${LILA}" stroke="${CLOTH}" stroke-width=".5"/>${orn(ORN[3], { x: 20.5, y: 29, size: 22, bg: LILA })}
<text x="31.5" y="66" font-family="SansKa" font-weight="900" font-size="3.6" letter-spacing=".5" fill="#f0d9a0" text-anchor="middle">${aso(title)}</text></svg></div>`;
const cardsSheet = {
  key: 'cards',
  front: cardSheet([remCard, remCard, remCard, remCard, ...EXAMPLES.map(exCard)], { label: 'ლურჯი სუფრა · შემახსენებელი და ქების მაგალითები — წინა მხარე' }),
  back: cardSheet([remBack, remBack, remBack, remBack, ...EXAMPLES.map(() => genericBack)], { back: true, label: 'ლურჯი სუფრა · ბარათები — ზურგი' }),
};

// ---------- the meidan: the table's middle, where the trays' leftover stamps are thrown ----------
const skyline = () => `<svg width="194mm" height="${(74 * 194 / 186).toFixed(2)}mm" viewBox="0 0 186 74" style="display:block">
<path d="M0 66C16 56 30 40 48 35C60 32 72 37 84 50L92 66Z" fill="${LILA}" opacity=".88"/>
<path d="M30 45L33 41L36 42L40 37L46 35L52 34L58 33L64 34L70 37L76 41" fill="none" stroke="${LILA}" stroke-width="2.2"/>
${[[36, 31, 7, 12], [55, 24, 8, 11], [71, 31, 6, 10]].map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${LILA}"/>${Array.from({ length: Math.floor(w / 2) }, (_, k) => `<rect x="${x + k * 2 + 0.3}" y="${y - 1.6}" width="1.2" height="1.8" fill="${LILA}"/>`).join('')}`).join('')}
<path d="M112 66L116 50C119 46 126 45 134 45H180L183 66Z" fill="${LILA}" opacity=".88"/>
<rect x="132" y="30" width="38" height="15.5" fill="${LILA}"/><polygon points="129,31 151,21 173,31" fill="${LILA}"/>
<rect x="146" y="12" width="10" height="11" fill="${LILA}"/><polygon points="144.5,13 151,3.5 157.5,13" fill="${LILA}"/>
<path d="M151 3.8V-.6M149.2 1.1H152.8" stroke="${LILA}" stroke-width=".9"/>
${[[148.3, 15], [152.6, 15], [137, 35], [142.5, 35], [159.5, 35], [165, 35]].map(([x, y]) => `<rect x="${x}" y="${y}" width="1.6" height="4.2" rx=".8" fill="${CLOTH}"/>`).join('')}
<path d="M86 58H116V61H112C110 61 108 63 108 66H104C104 62 100 60 97 60C94 60 90 62 90 66H86Z" fill="${LILA}"/>
<rect x="0" y="65.5" width="186" height="8.5" fill="#3d6896"/>
${[8, 30, 52, 74, 96, 118, 140, 162].map(x => `<path d="M${x} 69q3 -1.6 6 0t6 0" fill="none" stroke="${CLOTH}" stroke-width=".45" opacity=".8"/>`).join('')}</svg>`;
const cobbles = `<svg width="194mm" height="205mm" viewBox="0 0 194 205" style="display:block"><defs><pattern id="cob" patternUnits="userSpaceOnUse" width="14" height="10">
<rect width="14" height="10" fill="#ece2cf"/><rect x=".6" y=".6" width="6" height="3.9" rx="1.4" fill="#e3d6be" stroke="#d3c3a5" stroke-width=".25"/><rect x="7.6" y=".6" width="5.8" height="3.9" rx="1.4" fill="#e6dac3" stroke="#d3c3a5" stroke-width=".25"/>
<rect x="-2.9" y="5.6" width="6" height="3.9" rx="1.4" fill="#e6dac3" stroke="#d3c3a5" stroke-width=".25"/><rect x="4.1" y="5.6" width="6" height="3.9" rx="1.4" fill="#e3d6be" stroke="#d3c3a5" stroke-width=".25"/><rect x="11.1" y="5.6" width="6" height="3.9" rx="1.4" fill="#e6dac3" stroke="#d3c3a5" stroke-width=".25"/></pattern></defs>
<rect width="194" height="205" fill="url(#cob)"/></svg>`;
const meidanRing = `<svg width="160mm" height="160mm" viewBox="-84 -84 168 168" font-family="SerifKa" style="display:block"><defs><path id="ringPath" d="M0 -73A73 73 0 1 1 -.01 -73"/></defs>
<circle r="82" fill="${LILA}"/><circle r="79.5" fill="none" stroke="${CLOTH}" stroke-width=".6"/><circle r="77.6" fill="none" stroke="${CLOTH}" stroke-width="1.1" stroke-dasharray="0 2.6" stroke-linecap="round"/>
<text font-size="4.4" fill="${CLOTH}" letter-spacing=".25"><textPath href="#ringPath" startOffset="25%" text-anchor="middle">ლანგრებიდან დარჩენილი ბეჭდები აქ იყრება</textPath></text>
<text font-size="4.4" fill="${CLOTH}" letter-spacing=".25"><textPath href="#ringPath" startOffset="75%" text-anchor="middle">ვინც პირველი აიღებს აქედან — ნიშანსაც იღებს</textPath></text>
<clipPath id="mdClip"><circle r="66"/></clipPath>
<circle r="66" fill="#fbf6ec"/><g clip-path="url(#mdClip)" opacity=".09"><g transform="translate(-66 -66)">${clothField(132, 132, 22, { fg: LILA, bg: '#fbf6ec', shift: 1 })}</g></g>
<circle r="66" fill="none" stroke="${C.gold}" stroke-width=".6"/>
<rect x="-12" y="-58" width="24" height="24" rx="2" fill="#fff" stroke="${C.gold}" stroke-width=".6" stroke-dasharray="1.6 1.2"/><text y="-44" font-family="SansKa" font-weight="900" font-size="12" fill="${C.gold}" opacity=".55" text-anchor="middle">${aso('უ')}</text>
<text y="-28.5" font-size="3.7" fill="${C.brown}" text-anchor="middle">უსტაბაშის ნიშანი — დილით აქ</text></svg>`;
const meidanPage = page(`<div class="mdPanel"><div class="mdTop">${skyline()}</div>
<div class="mdField">${cobbles}</div>
<div class="mdTitle"><div class="aso">${aso('მეიდანი')}</div><b>მეიდანი</b><span>ძველი თბილისის სავაჭრო მოედანი, მეტეხის ხიდთან</span></div>
<div class="mdRing">${meidanRing}</div>
<div class="mdDay">${[['sunrise', 'დილა', 'ლანგრები ივსება'], ['sun', 'დღე', 'ბეჭდებს იღებენ'], ['moon', 'საღამო', 'ბეჭდავენ და ითვლიან']].map(([ic, n, t]) => `<span>${icon(ic, { size: 6, color: LILA, width: 2 })}<b>${n}</b>${t}</span>`).join('<i>→</i>')}</div></div>
<div class="sheetLabel">ფურცელი %SHEET% · ლურჯი სუფრა · მეიდანი — მაგიდის შუაში; ლანგრები ირგვლივ წრედ</div>`, 'meidanP');

// ---------- two worked figures for the rules: a turn (taking) and an evening (printing) ----------
const arrow = (x1, y1, x2, y2, color, bend = 0) => {
  const len = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
  const cx = (x1 + x2) / 2 + nx * bend, cy = (y1 + y2) / 2 + ny * bend;
  const a = Math.atan2(y2 - cy, x2 - cx), bx = x2 - 2.4 * Math.cos(a), by = y2 - 2.4 * Math.sin(a);
  const w = [[bx + 1.15 * Math.sin(a), by - 1.15 * Math.cos(a)], [bx - 1.15 * Math.sin(a), by + 1.15 * Math.cos(a)]].map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  return `<path d="M${x1} ${y1}Q${cx.toFixed(2)} ${cy.toFixed(2)} ${bx.toFixed(2)} ${by.toFixed(2)}" fill="none" stroke="${color}" stroke-width=".75" stroke-linecap="round"/><polygon points="${x2},${y2} ${w}" fill="${color}"/>`;
};
const label = (x, y, text, { anchor = 'middle', size = 3.1, color = C.brown, weight = 400 } = {}) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${text}</text>`;
const trayMini = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${WOOD_DARK}"/><circle cx="${cx}" cy="${cy}" r="${(r * 0.86).toFixed(2)}" fill="${WOOD_LIGHT}"/>`;
const meidanMini = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${LILA}"/><circle cx="${cx}" cy="${cy}" r="${r - 1.6}" fill="#fbf6ec"/>`;
/** A loom line of `n` places (9 mm, 10 mm apart) ending at `xr`; `items` fill it from the right. */
const loomLine = (xr, y, n, items = []) => {
  let s = `<rect x="${xr - 10 * n - 0.5}" y="${y - 1.5}" width="${10 * n + 2}" height="12" rx="1.2" fill="${WOOD}"/>`;
  for (let k = 0; k < n; k++) {
    const x = xr - 10 * (k + 1) + 1, it = items[k];
    s += it ? stampIn(it, x, y, 9, { frame: false }) : `<rect x="${x}" y="${y}" width="9" height="9" rx=".8" fill="${WOOD_CELL}" stroke="${WOOD_DARK}" stroke-width=".3"/>`;
  }
  return s;
};
const tokenMini = (x, y, sz) => `<rect x="${x}" y="${y}" width="${sz}" height="${sz}" rx="${sz * 0.1}" fill="${C.gold}"/><text x="${x + sz / 2}" y="${(y + sz * 0.78).toFixed(2)}" font-family="SansKa" font-weight="900" font-size="${(sz * 0.72).toFixed(2)}" fill="${C.wine}" text-anchor="middle">${aso('უ')}</text>`;
const badge = (x, y, t) => `<circle cx="${x}" cy="${y}" r="3" fill="${C.wine}"/><text x="${x}" y="${y + 1.15}" font-size="3.4" font-weight="800" fill="#fff" text-anchor="middle">${t}</text>`;
const [FISH, DEER, BIRD, STAR, VINE] = ORN;
const turnFigure = () => {
  let s = badge(3.2, 3.4, 'ა');
  s += trayMini(20, 27, 18);
  [[FISH, 10.5, 17.5], [DEER, 20.5, 17.5], [FISH, 10.5, 27.5], [BIRD, 20.5, 27.5]].forEach(([o, x, y]) => { s += stampIn(o, x, y, 9, { frame: false }); });
  s += label(20, 50.5, 'ლანგარი', { color: C.muted });
  s += loomLine(90, 5, 3, [FISH, FISH]) + label(57.5, 11.6, 'ზოლი 3', { anchor: 'end', size: 2.9, color: WOOD_DARK, weight: 700 });
  s += label(75.5, 21.4, 'ორი თევზი — ზოლი 3-ზე', { size: 3 });
  s += arrow(37, 19, 46, 11, C.goldDark, -2);
  s += meidanMini(68, 38, 10.5) + stampIn(DEER, 60.5, 34.5, 7, { frame: false }) + stampIn(BIRD, 68.5, 34.5, 7, { frame: false });
  s += label(68, 53.5, 'დანარჩენი — მეიდანზე', { size: 3 });
  s += arrow(37, 35, 55.8, 38, LILA, 1.5);
  s += `<line x1="99" y1="2" x2="99" y2="54" stroke="${C.line}" stroke-width=".35" stroke-dasharray="1.2 1.2"/>`;
  s += badge(104, 3.4, 'ბ');
  s += meidanMini(122, 27, 17) + tokenMini(119, 13.2, 6);
  [[BIRD, 114.5, 22], [BIRD, 122.5, 22], [VINE, 114.5, 30], [STAR, 122.5, 30]].forEach(([o, x, y]) => { s += stampIn(o, x, y, 7, { frame: false }); });
  s += label(122, 50.5, 'მეიდანი', { color: C.muted });
  s += loomLine(184, 5, 2, [BIRD, BIRD]) + label(161.5, 11.6, 'ზოლი 2', { anchor: 'end', size: 2.9, color: WOOD_DARK, weight: 700 });
  s += label(185, 21.4, 'ორი ჩიტი — ზოლი 2-ზე', { anchor: 'end', size: 3 });
  s += arrow(139.5, 22, 146.5, 12, C.goldDark, -1.5);
  FLOOR.slice(0, 4).forEach((n, k) => { const x = 149 + k * 9; s += label(x + 4, 31.6, `${MINUS}${n}`, { size: 2.8, color: C.wine, weight: 800 }) + (k ? `<rect x="${x}" y="33" width="8" height="8" rx=".7" fill="${WOOD_CELL}" stroke="${WOOD_DARK}" stroke-width=".3"/>` : tokenMini(x, 33, 8)); });
  s += label(185, 46.6, 'ნიშანი — საღებავზე,', { anchor: 'end', size: 3 }) + label(185, 50.6, 'ხვალ შენ იწყებ', { anchor: 'end', size: 3 });
  s += arrow(126, 17, 147.5, 35.5, C.wine, -4);
  return `<svg width="186mm" height="56mm" viewBox="0 0 186 56" font-family="SerifKa" style="display:block">${s}</svg>`;
};
const eveningFigure = () => {
  let s = '';
  const rowY = r => 5 + 11 * r, cellX = c => 63 + 10 * c;
  const lines = [[STAR], [BIRD], [FISH, FISH, FISH]];
  lines.forEach((items, r) => { s += loomLine(54, rowY(r), r + 1, items) + `<circle cx="${54 - 10 * (r + 1) - 4}" cy="${rowY(r) + 4.5}" r="2.6" fill="#fffaf1" stroke="${WOOD_DARK}" stroke-width=".3"/>` + label(54 - 10 * (r + 1) - 4, rowY(r) + 5.6, r + 1, { size: 3, color: WOOD_DARK, weight: 700 }); });
  s += `<rect x="61" y="3" width="53" height="35" rx="1.2" fill="${LILA}"/>`;
  const had = { '0,4': VINE, '1,2': DEER, '2,1': VINE }, added = { '0,3': STAR, '2,2': FISH };
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
    const k = `${r},${c}`, o = had[k] ?? added[k];
    s += o ? stampIn(o, cellX(c), rowY(r), 9, { frame: false }) : `<rect x="${cellX(c)}" y="${rowY(r)}" width="9" height="9" rx=".6" fill="${ORN_AT(r, c).color}" fill-opacity=".32"/>`;
    if (added[k]) s += `<rect x="${cellX(c) - 0.35}" y="${rowY(r) - 0.35}" width="9.7" height="9.7" rx=".9" fill="none" stroke="#fff" stroke-width=".7"/>`;
  }
  s += label(87.5, 42.6, '… სუფრის დანარჩენი რიგები', { size: 2.8, color: C.muted });
  s += arrow(53, 6.5, cellX(3) + 0.5, 6.5, C.goldDark, -3.2);
  s += arrow(53, rowY(2) + 1.5, cellX(2) + 0.5, rowY(2) + 1.5, C.goldDark, -3.2);
  s += stampIn(FISH, 12.5, 47, 8, { frame: false }) + stampIn(FISH, 21.5, 47.6, 8, { frame: false });
  s += `<polygon points="8,52 36,52 33,64 11,64" fill="${WOOD_LIGHT}" stroke="${WOOD_DARK}" stroke-width=".5"/>${[55, 58, 61].map(y => `<line x1="${8 + (y - 52) * 0.25}" y1="${y}" x2="${36 - (y - 52) * 0.25}" y2="${y}" stroke="${WOOD_DARK}" stroke-width=".3" opacity=".6"/>`).join('')}`;
  s += label(39, 60.4, 'გოდორი', { anchor: 'start', color: C.muted });
  s += arrow(30, rowY(2) + 10.5, 22, 46, LILA, -3);
  return `<svg width="118mm" height="67mm" viewBox="0 0 118 67" font-family="SerifKa" style="display:block">${s}</svg>`;
};

// ---------- rules: four pages ----------
const RULES = [
  ['მომზადება', 'ყველა იღებს დაფას ერთი და იმავე მხარით — დამწყებები შეგირდის მხარით (ფერადი ორნამენტებით) — და თავის ღილს ქების ბილიკის 0-ზე დებს. მეიდნის ფურცელი მაგიდის შუაში დადეთ, ლანგრები მის ირგვლივ წრედ: 2 მოთამაშე — 5, 3 — 7, 4 — 9 (ლანგრის კიდეზე წერია, ვისთვისაა). 100 ბეჭედი ტომარაში ჩაყარეთ. უსტაბაშის ნიშანს იღებს, ვისაც ბოლოს უნახავს ნამდვილი ლურჯი სუფრა (ვერ გაარკვიეთ — ყველაზე უმცროსი).'],
  ['დილა', 'უსტაბაში ყოველ ლანგარზე ტომარიდან ბრმად 4 ბეჭედს დებს, ნიშანს კი მეიდანზე. ტომარა თუ დაიცალა, გოდორიდან შეავსეთ და განაგრძეთ; ორივე თუ ცარიელია, დღე იმდენი ბეჭდით იწყება, რამდენიც დარჩა.'],
  ['დღე: აღება', 'უსტაბაში იწყებს, მერე — საათის ისრით. შენს სვლაზე ან <b>ა)</b> ერთი ლანგრიდან იღებ ერთი ორნამენტის ყველა ბეჭედს და იმ ლანგრის დანარჩენ ბეჭდებს მეიდანზე ყრი, ან <b>ბ)</b> მეიდნიდან იღებ ერთი ორნამენტის ყველა ბეჭედს. ვინც დღეში პირველი აიღებს მეიდნიდან, უსტაბაშის ნიშანსაც იღებს და დაღვრილი საღებავის პირველ თავისუფალ უჯრაზე დებს — ხვალ ის იწყებს, ოღონდ ამ უჯრის ჯარიმას იხდის.'],
  ['ზოლზე დადება', 'აღებულ ბეჭდებს ყველას ერთ ზოლზე დებ, მარჯვნიდან მარცხნივ. ზოლში მხოლოდ ერთი ორნამენტი შეიძლება; დაწყებულ ზოლს იმავე ორნამენტით აგრძელებ. რაც ზოლს არ ეტევა, დაღვრილ საღებავზე გადადის, მარცხნიდან მარჯვნივ; იქაც 7 უჯრა თუ სავსეა, ზედმეტი გოდორში მიდის ჯარიმის გარეშე. შეგიძლია ბეჭდები პირდაპირ საღებავზეც დადო.'],
  ['აკრძალვა', 'ზოლზე ვერ დადებ ორნამენტს, რომელიც ამ ზოლის გასწვრივ, სუფრის იმავე რიგში უკვე დაბეჭდილია. აღება სავალდებულოა — სვლას ვერ გამოტოვებ, თუნდაც ყველაფერი საღებავზე დაიღვაროს.'],
  ['დღის დასასრული', 'დღე მთავრდება, როცა ლანგრებიც და მეიდანიც ცარიელია. იწყება საღამო.'],
  ['საღამო: ბეჭდვა', 'ყველა ერთად, ზოლებს ზემოდან ქვემოთ: სავსე ზოლის ყველაზე მარჯვენა ბეჭედი სუფრის იმავე რიგში, თავისი ორნამენტის უჯრაზე გადადის და მაშინვე ქებას მოგიტანს. სავსე ზოლის დანარჩენი ბეჭდები გოდორში მიდის. ნახევრად სავსე ზოლი ბეჭდებიანად ხვალისთვის რჩება.'],
  ['ქება', 'ახალ ბეჭედს გვერდით თუ არაფერი უდევს — <b>1 ქულა</b>. თუ უდევს, დაითვალე მასთან უწყვეტად გაბმული ბეჭდები ჰორიზონტალურად (ახალთან ერთად) და ცალკე — ვერტიკალურად (ახალთან ერთად); ორივე რიცხვი მიამატე და ღილი ქების ბილიკზე წაიწიე.'],
  ['ჯარიმა', `დაღვრილი საღებავის ყოველი დაკავებული უჯრა თავის ციფრს აკლებს: ${FLOOR.map(n => `${MINUS}${n}`).join(' ')} (უსტაბაშის ნიშანიც უჯრას იკავებს). ქება 0-ზე ქვემოთ არ ჩადის. მერე ბეჭდები გოდორში მიდის, ნიშანი კი პატრონს წინ ედება.`],
  ['შემდეგი დღე', 'თუ არავის აქვს სუფრაზე სრული ჰორიზონტალური რიგი, ახალი დილა იწყება (წესი 2).'],
  ['დასასრული', 'თამაში მთავრდება იმ საღამოს, როცა ვინმეს სუფრაზე სრული ჰორიზონტალური რიგი (5 ბეჭედი) გაჩნდება — ჯერ ყველა ამთავრებს ბეჭდვასაც და ჯარიმასაც. მერე ბონუსები: <b>+2</b> ყოველ სრულ ჰორიზონტალურ რიგზე, <b>+7</b> ყოველ სრულ ვერტიკალურ სვეტზე, <b>+10</b> ყოველ ორნამენტზე, რომლის ხუთივე ბეჭედი სუფრაზეა.'],
  ['გამარჯვება', 'ყველაზე მეტი ქება — ამქარი მას უსტაბაშად ირჩევს! ტოლობისას იგებს, ვისაც მეტი სრული ჰორიზონტალური რიგი აქვს; ისევ ტოლობისას ორივე უსტაბაშია. გამარჯვებულის სუფრა კლასს უჩვენეთ.'],
];
const rulesList = (items, start) => `<ol start="${start}">${items.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol>`;
const FAQ = [
  ['ბეჭდები ორ ზოლზე გავანაწილო?', 'არა. ერთი აღების ყველა ბეჭედი ერთ ზოლზე იდება; რაც არ ეტევა — საღებავზე.'],
  ['სავსე ზოლს ხვალისთვის დავიტოვებ?', 'არა. საღამოს ყოველი სავსე ზოლი იბეჭდება.'],
  ['ზოლზე სხვა რიგში დაბეჭდილი ორნამენტი შეიძლება?', 'კი. აკრძალვა მხოლოდ ზოლის გასწვრივ, იმავე რიგს ეხება.'],
  ['ნიშანი რატომ მაკლებს ქულას?', 'უსტაბაშობა ფასიანია: ნიშანი საღებავის უჯრას იკავებს, სამაგიეროდ ხვალ შენ იწყებ.'],
  ['ქება 100-ს გადასცდა?', 'ღილი ბილიკის თავიდან განაგრძე და დაიმახსოვრე: +100.'],
];
const GLOSS = [['ლილა', 'ინდიგო, ლურჯი საღებავი'], ['ყალიბი', 'ხის ბეჭედი ამოკვეთილი ორნამენტით'], ['ამქარი', 'ერთი ხელობის ოსტატების კავშირი'], ['ჯამაათი', 'ამქრის ძველი სახელი'],
  ['უსტაბაში', 'ამქრის არჩეული თავი'], ['ქარგალი', 'შეგირდსა და ოსტატს შორის მდგომი ხელოსანი'], ['მეიდანი', 'თბილისის სავაჭრო მოედანი მეტეხის ხიდთან'], ['გოდორი', 'წნული კალათა']];
const TIMELINE = [
  ['XVII ს. ბოლო', 'უძველესი შემორჩენილი ლურჯი სუფრები'], ['XVIII ს.', 'ხის ყალიბით ბეჭდვა'], ['1762', 'ერეკლე II ქართლ-კახეთის მეფე ხდება'],
  ['1795', 'კრწანისის ბრძოლა, თბილისი იწვის'], ['1798', 'ერეკლე II გარდაიცვალა'], ['XIX ს.', 'ვრცელდება სიტყვა „ამქარი“'], ['2017', 'ლურჯი სუფრა — არამატერიალური კულტურული მემკვიდრეობის ძეგლი'],
];
const head = (sub) => `<div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">${esc(sub)}</div></div>`;
const rulesFoot = n => foot(`<span>${esc(title)} · წესები ${n}/4</span><span>${esc(SCHOOL)}</span>`);
const exampleRow = `<div class="exRow">${EXAMPLES.slice(0, 4).map((ex, i) => `<div class="exI"><div class="exT">${i + 1}. ${esc(ex.name)}</div>${miniWall(ex, 0.84)}<div class="exS">${ex.sum}</div></div>`).join('')}
<div class="exI fl"><div class="exT">5. ${esc(EXAMPLES[4].name)}</div>${miniFloor(4, 0.8)}<div class="exS">${EXAMPLES[4].sum}</div></div></div>`;
const rulesPage1 = page(`${stripe(NO, 'წესები · 1')}<div class="rulesWrap">${head(`წესები · ${META}`)}
<p class="lead">XVIII საუკუნის ბოლოა, ერეკლე II-ის თბილისი. მეიდანზე, მეტეხის ხიდთან, მღებავების ამქრის ოსტატები ეჯიბრებიან, ვინ დაბეჭდავს ყველაზე ლამაზ ლურჯ სუფრას მეფის ნადიმისთვის. ყოველ დღეს ლანგრებიდან ბეჭდებს იღებთ, დაზგის ზოლებს ავსებთ და საღამოს სუფრაზე ბეჭდავთ: გვერდიგვერდ დაბეჭდილი ორნამენტები <b>ქებას</b> მოგიტანთ, ზედმეტი ბეჭდები კი საღებავს დაღვრის. ვისაც ბოლოს ყველაზე მეტი ქება ექნება, ის გახდება <b>უსტაბაში</b>.</p>
<div class="rules">${rulesList(RULES.slice(0, 7), 1)}</div>
<h3 class="exH">სვლის მაგალითები <span>— ა) ლანგრიდან · ბ) დღეში პირველად მეიდნიდან</span></h3>${turnFigure()}</div>${rulesFoot(1)}`, 'rulesP');
const rulesPage2 = page(`${stripe(NO, 'წესები · 2')}<div class="rulesWrap"><div class="rules">${rulesList(RULES.slice(7), 8)}</div>
<h3 class="exH">საღამოს მაგალითი</h3><div class="eve">${eveningFigure()}<ol>
<li><b>ზოლი 1</b> სავსეა: ვარსკვლავი სუფრის პირველ რიგში ჯდება. მარჯვნივ ვაზი უდევს — <b>2 ქულა</b>.</li>
<li><b>ზოლი 2</b> სავსე არ არის — ჩიტი ხვალისთვის რჩება.</li>
<li><b>ზოლი 3</b> სავსეა: ერთი თევზი სუფრაზე — ვაზთან და ირემთან გაბმულია: <b>2 + 2 = 4</b>. დანარჩენი ორი — გოდორში.</li></ol></div>
<h3 class="exH">ქების მაგალითები <span>— ახალი ბეჭედი თეთრ ჩარჩოშია; ოქროსფერი — ჰორიზონტალური ჯაჭვი, ვარდისფერი — ვერტიკალური</span></h3>${exampleRow}
<div class="two2"><div><h3>დღის რიგი</h3><table class="t"><tr><th>დილა</th><td>ლანგრებზე 4-4 ბეჭედი</td></tr><tr><th>დღე</th><td>აღება და ზოლზე დადება</td></tr><tr><th>საღამო</th><td>ბეჭდვა, ქება, ჯარიმა</td></tr></table></div>
<div><h3>ბონუსები ბოლოს</h3><table class="t"><tr><td>ყოველი სრული ჰორიზონტალური რიგი</td><td><b>+2</b></td></tr><tr><td>ყოველი სრული ვერტიკალური სვეტი</td><td><b>+7</b></td></tr><tr><td>ერთი ორნამენტის ხუთივე ბეჭედი</td><td><b>+10</b></td></tr></table></div></div></div>${rulesFoot(2)}`, 'rulesP');
const rulesPage3 = page(`${stripe(NO, 'წესები · 3')}<div class="rulesWrap">${head('დაფა, ოსტატის მხარე, კითხვები')}
<div class="bdBox">${boardSvg('apprentice', PLAYERS[0], { width: 184, marks: true })}</div>
<div class="bdLegend"><span><i>1</i>ქების ბილიკი 0–100</span><span><i>2</i>დაზგის ზოლები</span><span><i>3</i>სუფრა — 5×5</span><span><i>4</i>დაღვრილი საღებავი</span><span><i>5</i>ბონუსები</span></div>
<div class="two2"><div><h3>ოსტატის მხარე — გამოცდილთათვის</h3><p class="pp">დაფის მეორე მხარეზე სუფრა ცარიელია. წესები იგივეა, ოღონდ საღამოს სავსე ზოლის ბეჭედი სუფრის იმავე რიგის <b>ნებისმიერ</b> ცარიელ უჯრაზე ჯდება, თუ ამ სვეტში ეს ორნამენტი ჯერ არ არის: ერთ რიგსა და ერთ სვეტში ერთი ორნამენტი ორჯერ არ უნდა იყოს. ზოლს თუ დასაშვები უჯრა არსად აქვს, მთელი ზოლი დაღვრილ საღებავზე გადადის. ამქარშიც ასე იყო: შეგირდი → ქარგალი → ოსტატი.</p>
<h3>კლასში</h3><p class="pp">პირველი დღე მასწავლებელთან ერთად ითამაშეთ: ყველამ ხმამაღლა თქვას, რას იღებს და რატომ. ქების მაგალითის ბარათები მაგიდაზე დადეთ. 2 მოთამაშით ≈30 წუთია, 4 ბავშვით ≈60 — ერთ გაკვეთილზე 2–3 მოთამაშე ჯობია. ბეჭდები პატარაა — ნაკრები 8 წლიდანაა.</p></div>
<div class="faq1"><h3>ხშირი კითხვები</h3>${FAQ.map(([q, a]) => `<p><b>${esc(q)}</b> ${esc(a)}</p>`).join('')}</div></div></div>${rulesFoot(3)}`, 'rulesP');
const rulesPage4 = page(`${stripe(NO, 'წესები · 4')}<div class="rulesWrap">${head('ლურჯი სუფრის ამბავი')}
<div class="two2 first"><div><h3>როგორ იბეჭდება</h3><p class="pp">ლურჯი სუფრა თეთრ ტილოზე იბეჭდება: ოსტატი ხის ყალიბს — ბეჭედს — ცვილისა და ქონის ნაზავს ასვამს და ტილოს აჭერს, მერე ტილოს ლილაში, ინდიგოში, ყვინთავს. სადაც ცვილი იყო, საღებავი ვერ აღწევს და ორნამენტი თეთრი რჩება. უძველესი ნიმუშები XVII საუკუნის ბოლოსია, ხის ყალიბით ბეჭდვა XVIII საუკუნიდან ვრცელდება. 2017 წლის 2 ივნისიდან „ლურჯი სუფრის დამზადების ტრადიციული ტექნოლოგია და კულტურა“ არამატერიალური კულტურული მემკვიდრეობის ძეგლია.</p>
<h3>ამქარი</h3><p class="pp">ერეკლე II-ის თბილისში (მეფობდა 1762–1798) ხელოსნები ამქრებად იყვნენ გაერთიანებული — მაშინ ამქარს „ჯამაათსაც“ ეძახდნენ, სიტყვა „ამქარი“ XIX საუკუნეში გავრცელდა. მღებავების ამქრის დროშაზე თადეოზ მოციქული იყო ხელთუქმნელი ხატით. შეგირდი 12–18 წლისა იყო, 2–5 წელში ქარგალი ხდებოდა, მერე — ოსტატი; ოსტატები საერთო კრებაზე უსტაბაშს ირჩევდნენ.</p>
<p class="pp small">მეფის ნადიმი და ოსტატების შეჯიბრი გამოგონილია; ნამდვილია ლურჯი სუფრა, მღებავების ამქარი, უსტაბაშის არჩევა და მეიდანი.</p></div>
<div><h3>ხუთი ორნამენტი</h3><div class="orns">${ORN.map(o => `<span><svg width="12mm" height="12mm" viewBox="0 0 12 12">${stampIn(o, 0, 0, 12)}</svg>${esc(o.name)}</span>`).join('')}</div>
<p class="pp">ხუთივე მოტივი ნამდვილი ლურჯი სუფრებიდანაა. ფერიც და ნახატიც განსხვავდება — ფერთა ვერგამრჩევსაც ნახატი ეხმარება.</p>
<h3>თარიღები</h3><div class="tl">${TIMELINE.map(([y, t]) => `<p><b>${y}</b><span>${esc(t)}</span></p>`).join('')}</div></div></div>
<div class="two2"><div><h3>ძველი სიტყვები</h3><p class="gl">${GLOSS.map(([w, d]) => `<b>${w}</b> — ${d}`).join('; ')}.</p></div>
<div><h3>რას ასწავლის</h3><p class="pp"><b>ისტორია და ხელობა:</b> ლურჯი სუფრა, ლილა და ხის ყალიბით ბეჭდვა, თბილისის ამქრები, უსტაბაში და მეიდანი.</p>
<p class="pp"><b>გონების ჩვევა:</b> წინასწარ დაგეგმვა, ზომიერება — აიღე იმდენი, რამდენსაც ბოლომდე მიიყვან, მეტოქის სვლის გათვლა და წაგების ღირსეულად მიღება.</p></div></div>
<div class="box credits"><b>წყარო და უფლებები.</b> შექმნილია „აზულის“ (მიხაელ კიზლინგი, 2017) წესების მიხედვით; სახელი, ნახატები და წესების ტექსტი საგანძურის სკოლისაა. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება. ლურჯი სუფრისა და ამქრის ამბავი ისტორიის მასწავლებელმა ერთხელ გადახედოს.</div>
<div class="strip">${clothStrip(186, 17)}</div></div>${rulesFoot(4)}`, 'rulesP');

// ---------- cover and box label ----------
const tableSvg = (width) => {
  const tray = (x, y) => `<circle cx="${x}" cy="${y}" r="5.4" fill="${WOOD_LIGHT}" stroke="${WOOD_DARK}" stroke-width=".7"/>`;
  const ring = Array.from({ length: 9 }, (_, k) => { const a = (k / 9) * 2 * Math.PI - Math.PI / 2; return tray(50 + 23 * Math.cos(a), 50 + 23 * Math.sin(a)); }).join('');
  const board = (x, y, w, h, P) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="${BOARD_BG}" stroke="${P.color}" stroke-width="1.2"/><rect x="${x + (w > h ? w * 0.52 : 2)}" y="${y + (w > h ? 2 : h * 0.52)}" width="${w > h ? w * 0.4 : w - 4}" height="${w > h ? h - 4 : h * 0.4}" fill="${LILA}"/>`;
  return `<svg width="${width}mm" height="${width}mm" viewBox="0 0 100 100" font-family="SerifKa" style="display:block">
<rect width="100" height="100" rx="3" fill="#efe6d4"/>${board(26, 3, 48, 16, PLAYERS[0])}${board(81, 26, 16, 48, PLAYERS[1])}${board(26, 81, 48, 16, PLAYERS[2])}${board(3, 26, 16, 48, PLAYERS[3])}
<rect x="41" y="38" width="18" height="24" rx="1" fill="#e2d4b8" stroke="${LILA}" stroke-width=".5"/><circle cx="50" cy="50" r="6.5" fill="${LILA}"/><rect x="47.6" y="40.2" width="4.8" height="4.8" fill="${C.gold}"/>${ring}</svg>`;
};
const coverPage = no => page(`${stripe(NO)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">ლურჯი სუფრა</h1>
  <div class="lead">მღებავების ამქრის ოსტატები ერეკლე II-ის თბილისში ეჯიბრებიან, ვინ დაბეჭდავს ყველაზე ლამაზ სუფრას მეფის ნადიმისთვის.<br><b>${META}</b></div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th><th>✓</th></tr>
        <tr><td>წესები</td><td>4 გვ.</td><td>${no('rules1')}–${no('rules2')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ბეჭდები (ფილები) 20 მმ</td><td>100 + 5*</td><td>${no('tiles')}</td><td><span class="chk"></span></td></tr>
        <tr><td>დაფები — შეგირდის / ოსტატის მხარე</td><td>4</td><td>${no('board1')}–${no('board4')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ლანგრები ⌀90 მმ</td><td>9</td><td>${no('trays1')}–${no('trays2')}</td><td><span class="chk"></span></td></tr>
        <tr><td>უსტაბაშის ნიშანი</td><td>1 + 1*</td><td>${no('trays2')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ქების ღილები</td><td>4 + 4*</td><td>${no('trays2')}</td><td><span class="chk"></span></td></tr>
        <tr><td>შემახსენებელი ბარათები</td><td>4</td><td>${no('cards')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ქების მაგალითები</td><td>5</td><td>${no('cards')}</td><td><span class="chk"></span></td></tr>
        <tr><td>მეიდანი — მაგიდის შუა</td><td>1</td><td>${no('meidan')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ყუთის იარლიყი</td><td>1</td><td>${no('label')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ტომარა, გოდორი</td><td>—</td><td>შესაკერი</td><td><span class="chk"></span></td></tr>
      </table>
      <p class="small">* სათადარიგო. ღილის ნაცვლად ნამდვილი ღილი ან მძივიც გამოდგება.</p>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „აზულის“ (მიხაელ კიზლინგი, 2017) წესების მიხედვით. სახელი, ნახატები და წესების ტექსტი საგანძურის სკოლისაა. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
      <h3 class="asmT">მაგიდაზე</h3>
      <div class="tbl">${tableSvg(46)}<p>შუაში მეიდანი და უსტაბაშის ნიშანი, ირგვლივ ლანგრები (2 მოთამაშე — 5, 3 — 7, 4 — 9), ყველას წინ — თავისი დაფა.</p></div>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b> („fit to page“ გამორთული). ჯერ ერთი საცდელი ფურცელი: ბეჭედი 20 მმ უნდა იყოს.</li>
        <li>ქაღალდი: წესები — ჩვეულებრივი; დაფები (${no('board1')}–${no('board4')}) — 200–250 გ, სურვილით მქრქალი ლამინაცია; ბარათები — 300 გ; ლანგრები და ნიშანი (${no('trays1')}–${no('trays2')}) — 1.5–2 მმ მუყაოზე დააკარი და ამოჭერი.</li>
        <li><b>ბეჭდები — სამი გზა:</b> ა) ფურცელი ${no('tiles')}-ის ორივე გვერდი ცალ-ცალკე სტიკერის ქაღალდზე და 20 მმ ხის კვადრატებზე — ყველაზე მყარი; ბ) 300 გ ქაღალდზე ორმხრივად და 2 მმ მუყაოზე; გ) მზა ფილებზე სტიკერი (ჯერ გაზომეთ). ზემოდან ფართო სკოჩი ან ლამინაცია, კუთხეები ოდნავ მოამრგვალე.</li>
        <li>ჭრა: ბეჭდები და ბარათები — ნიშნულებს შორის, დანით სახაზავთან (უფროსები ჭრიან); ლანგრები — წრეზე, მაკრატლით.</li>
        <li>ტომარა: ლურჯი ბამბის ნაჭერი 25×55 სმ, ერთი ნაკერი და თასმა; იდეალურია ნამდვილი ლურჯი სუფრის ნაჭერი.</li>
      </ol>
      <div class="covTiles">${ORN.map(o => `<span><svg width="15mm" height="15mm" viewBox="0 0 15 15">${stampIn(o, 0, 0, 15)}</svg>${esc(o.short ?? o.name)}</span>`).join('')}</div>
      <p class="small">ნახატების ადგილას ჯერ ორნამენტები და ნიშნებია — სურათები (ოსტატები მეიდანზე, მეტეხი და ნარიყალა) მერე დაემატება.</p>
      <div class="covBoard">${boardSvg('apprentice', PLAYERS[1], { width: 84 })}<p class="small">დაფა — შეგირდის მხარე (ზურგზე ოსტატის მხარეა).</p></div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} №${NO}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const lidCloth = (w, h) => `<svg width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}" style="display:block"><rect width="${w}" height="${h}" fill="${LILA}"/>${clothField(w, h, 17, { opacity: 0.9 })}</svg>`;
const labelPage = page(`<div class="lbl lid"><div class="lidCloth">${lidCloth(180, 114)}</div><div class="lin">
<div class="lt"><div class="aso big">${aso(title)}</div><div class="nm">ლურჯი სუფრა</div><div class="sub">მღებავების ამქრის ოსტატები ერეკლე II-ის თბილისში</div><div class="meta">${esc(META)}</div><div class="ser aso">${aso(SERIES)} · №${NO}</div><div class="sch">${esc(SCHOOL)}</div></div></div></div>
<div class="lbl list"><h3>ყუთში უნდა იყოს</h3><div class="items">${['105 ბეჭედი (5 სათადარიგო)', '4 ორმხრივი დაფა', '9 ლანგარი', 'უსტაბაშის ნიშანი', '4 ღილი', '4 შემახსენებელი ბარათი', '5 ქების მაგალითი', 'მეიდნის ფურცელი', 'ტომარა', 'გოდორი', 'წესები (4 გვერდი)', 'სათადარიგო ღილები'].map(t => `<span><i class="chk"></i>${esc(t)}</span>`).join('')}</div></div>
${[0, 1].map(i => `<div class="lbl side s${i}"><span class="aso">${aso(title)}</span><b>ლურჯი სუფრა</b><span>${esc(META)}</span><span class="aso">№${NO}</span></div>`).join('')}
<div class="lblNote">იარლიყი ფოტოქაღალდზე: დიდი — სახურავზე, ზოლები — გვერდებზე. მთლიანი ხაზი იჭრება.</div>`, 'labelP');

export const css = `
.boardS .sheetLabel{top:1.5mm;font-size:7.5pt}
.tLegend{font-size:9.4pt;line-height:1.35;color:var(--brown)}
.tLegend .tl1{display:flex;justify-content:space-between;margin-bottom:1.6mm}
.tLegend .tl1 span{display:flex;align-items:center;gap:1.6mm;font-weight:700;color:var(--wine)}
.tLegend p{margin:0}
.pInfo{font-size:10pt;line-height:1.38;color:var(--brown);border:.3mm solid var(--gold);border-radius:2mm;padding:3.4mm 4.4mm;background:var(--paper);height:100%;display:grid;grid-template-columns:1fr 1fr;gap:7mm}
.tokCap{font-size:9pt;color:var(--brown);text-align:center;line-height:6mm}
.pInfo h4{margin:0 0 1mm;color:var(--wine);font-size:10.5pt}
.pInfo p{margin:0 0 2.4mm}
.pInfo b{color:var(--wine)}
.card.lcard{background:#fbf7ee}
.card.lcard .lframe{position:absolute;inset:2.2mm;border:.45mm solid ${LILA};border-radius:2.6mm}
.card.lcard.dk{background:${LILA}}
.card.lcard.dk .lpanel{position:absolute;inset:3mm;background:#fbf7ee;border-radius:2.2mm}
.cband{position:absolute;left:3.3mm;right:3.3mm;top:3.3mm;height:12mm;border-radius:1.8mm 1.8mm .5mm .5mm;color:#fbf7ee;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.15}
.dk .cband{left:3mm;right:3mm;top:3mm;border-radius:2.2mm 2.2mm 0 0}
.cband .aso{font-size:7pt;color:#f0d9a0;letter-spacing:.14em}
.cband b{font-size:13pt}
.cbody{position:absolute;left:5mm;right:4.6mm;top:17.6mm;bottom:4.4mm;display:flex;flex-direction:column}
.rstep{display:flex;gap:1.8mm;align-items:flex-start;font-size:8.8pt;line-height:1.24;margin-bottom:1.8mm}
.rstep b{color:var(--wine)}
.rstep .ri{flex:none;width:6.6mm;height:6.6mm;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-top:.3mm}
.rfloor{margin-top:auto;display:flex;justify-content:center}
.qb p{margin:0 0 1.4mm;font-size:8.8pt;line-height:1.24}
.qb p b{color:var(--wine)}
.qx{display:flex;align-items:center;gap:3mm;justify-content:center;margin:.6mm 0 2mm}
.qx span{font-size:11pt}
.qx b{color:var(--wine);font-size:14pt}
.qb .bon{font-size:8.8pt;line-height:1.28;background:#c9a24b22;border-radius:1.4mm;padding:1.2mm 1.8mm;margin-bottom:1.6mm}
.qb .bon b{color:var(--wine)}
.qb .tie{font-size:8.6pt;color:var(--muted);margin:0}
.ex .cbody{align-items:center;text-align:center}
.exn{font-weight:800;font-size:12pt;color:var(--wine);margin:0 0 2mm}
.exw{display:flex;justify-content:center}
.exs{font-size:15pt;font-weight:800;color:${LILA};margin-top:2.2mm}
.ext{font-size:9pt;line-height:1.28;margin-top:1.4mm}
.gback{background:${LILA}}
.meidanP .mdPanel{position:absolute;left:8mm;top:8mm;width:194mm;height:282mm;border-radius:3mm;overflow:hidden;border:.4mm solid var(--gold);background:#f6efe0}
.meidanP .mdTop{position:absolute;left:0;top:2mm}
.meidanP .mdField{position:absolute;left:0;top:79mm}
.meidanP .mdTitle{position:absolute;left:24mm;right:24mm;top:83mm;text-align:center;background:#fbf6ec;border:.4mm solid var(--gold);border-radius:2mm;padding:1.6mm 3mm 2mm;line-height:1.18}
.mdTitle .aso{font-size:9pt;color:var(--gold2);letter-spacing:.16em}
.mdTitle b{display:block;font-size:22pt;color:${LILA}}
.mdTitle span{font-size:10.5pt;color:var(--brown)}
.meidanP .mdRing{position:absolute;left:17mm;top:108mm}
.meidanP .mdDay{position:absolute;left:6mm;right:6mm;bottom:3mm;display:flex;align-items:center;justify-content:center;gap:2.6mm;font-size:10pt;color:var(--brown);background:#fbf6ecee;border-radius:2mm;padding:1mm 0}
.mdDay span{display:flex;align-items:center;gap:1.2mm}
.mdDay b{color:${LILA}}
.mdDay i{font-style:normal;color:var(--gold2)}
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
.cover .asmT{margin-top:3mm}
.cover .tbl{display:flex;gap:4mm;align-items:center}
.cover .tbl svg{flex:none}
.cover .tbl p{margin:0;font-size:9.4pt;line-height:1.35}
.covTiles{display:flex;justify-content:space-between;margin:3mm 0 2mm}
.covBoard{margin-top:3mm}
.covBoard p{margin:1.4mm 0 0}
.covTiles span{display:flex;flex-direction:column;align-items:center;gap:1mm;font-size:9pt;font-weight:700;color:var(--wine)}
.rulesWrap{padding:6mm 12mm 0}
.rhead{display:flex;align-items:baseline;gap:5mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.5mm;margin-bottom:3mm}
.rtitle{font-size:20pt;color:var(--wine);white-space:nowrap}
.rsub{font-size:10.5pt;color:var(--muted)}
.lead{font-size:10.8pt;line-height:1.4;margin:0 0 3mm}
.lead b{color:var(--wine)}
.two2{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:4mm;font-size:10pt;line-height:1.35}
.two2 h3{margin:0 0 1.5mm;color:var(--wine);font-size:11pt}
.two2 h3+*{margin-top:0}
.two2.first{margin-top:0}
.two2 table.t{font-size:9.6pt;margin-bottom:2mm}
.two2 table.t th{white-space:nowrap}
.two2 .pp,.two2 .gl{margin:0 0 1.6mm}
.two2 .pp b,.two2 .gl b{color:var(--wine)}
.exH{margin:4mm 0 2mm;color:var(--wine);font-size:11pt}
.exH span{font-weight:400;color:var(--muted);font-size:9.4pt}
.exRow{display:flex;justify-content:space-between;align-items:flex-end}
.eve{display:flex;gap:5mm;align-items:center}
.eve svg{flex:none}
.eve ol{margin:0;padding-left:4.6mm;font-size:9.8pt;line-height:1.34}
.eve li{margin-bottom:1.6mm}
.eve b{color:var(--wine)}
.strip{margin-top:4mm;border-radius:1.6mm;overflow:hidden}
.exI{display:flex;flex-direction:column;align-items:center;gap:1.2mm}
.exT{font-size:9.6pt;font-weight:700;color:var(--wine)}
.exS{font-size:11pt;font-weight:800;color:${LILA}}
.bdBox{display:flex;justify-content:center;margin:1mm 0 2mm}
.bdLegend{display:flex;justify-content:center;flex-wrap:wrap;gap:1.6mm 4mm;font-size:9.4pt}
.bdLegend span{display:flex;align-items:center;gap:1.4mm}
.bdLegend i{font-style:normal;width:5mm;height:5mm;border-radius:50%;background:var(--wine);color:#fff;font-weight:800;font-size:8.6pt;display:flex;align-items:center;justify-content:center}
.faq1 p{margin:0 0 1.8mm;font-size:9.6pt;line-height:1.3}
.faq1 b{color:var(--wine);display:block}
.orns{display:flex;justify-content:space-between;margin-bottom:2mm}
.orns span{display:flex;flex-direction:column;align-items:center;gap:.8mm;font-size:8.6pt;font-weight:700;color:var(--wine);text-align:center;max-width:16mm;line-height:1.15}
.tl p{display:flex;gap:3mm;margin:0 0 1.1mm;font-size:9.6pt;line-height:1.28}
.tl b{flex:none;width:25mm;color:var(--wine);text-align:right;white-space:nowrap}
.credits{margin-top:4mm;font-size:9.2pt;line-height:1.35}
.labelP .lbl{position:absolute;left:10mm;width:190mm;border:.25mm solid #777}
.labelP .lid{top:12mm;height:124mm;background:${LILA};padding:5mm}
.labelP .lidCloth{position:absolute;left:5mm;top:5mm;opacity:.55}
.labelP .lid .lin{position:relative;height:100%;display:flex;align-items:center;justify-content:center}
.labelP .lid .lt{background:#fbf7ee;border:.6mm solid var(--gold);border-radius:3mm;padding:6mm 12mm;text-align:center;color:var(--brown);box-shadow:0 0 0 2.4mm ${LILA}}
.labelP .lid .big{font-size:18pt;color:var(--gold2);letter-spacing:.1em}
.labelP .lid .nm{font-weight:800;font-size:34pt;line-height:1.1;color:${LILA}}
.labelP .lid .sub{font-size:12pt;margin:1.5mm 0 3mm}
.labelP .lid .meta{font-size:11pt;color:var(--wine);font-weight:700}
.labelP .lid .ser{font-size:9pt;color:var(--gold2);letter-spacing:.1em;margin-top:4mm}
.labelP .lid .sch{font-size:9.5pt;color:var(--muted)}
.labelP .list{top:144mm;height:44mm;background:var(--paper);padding:4mm 7mm}
.labelP .list h3{margin:0 0 2.4mm;color:${LILA};font-size:13pt}
.labelP .list .items{display:grid;grid-template-columns:1fr 1fr 1fr;gap:2mm 4mm;font-size:10.5pt}
.labelP .list .chk{display:inline-block;width:3.6mm;height:3.6mm;border:.3mm solid var(--brown);border-radius:.6mm;vertical-align:-.6mm;margin-right:1.6mm}
.labelP .side{height:22mm;background:${LILA};color:#fbf7ee;display:flex;align-items:center;justify-content:space-around;font-size:11pt}
.labelP .side .aso{color:#f0d9a0;letter-spacing:.1em}
.labelP .side b{font-size:16pt}
.labelP .s0{top:198mm}.labelP .s1{top:228mm}
.lblNote{position:absolute;left:10mm;right:10mm;top:258mm;font-size:9pt;color:var(--muted);text-align:center}
`;

// ---------- the sheets, in printing order ----------
const SHEETS = [
  { key: 'cover' },
  { key: 'rules1', front: rulesPage1, back: rulesPage2 },
  { key: 'rules2', front: rulesPage3, back: rulesPage4 },
  { key: 'tiles', front: tilesFront, back: tilesBack },
  ...PLAYERS.map(boardSheet),
  trays1, trays2,
  cardsSheet,
  { key: 'meidan', front: meidanPage },
  { key: 'label', front: labelPage },
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
