// „ჩემი ვაზი“ on paper — the „უტელეფონო“ variant of the app's vine (2026-11-01). Every child has a month's vine sheet: one
// long cane winding up the page from its root, its leaves numbered in the order they come and coloured one a deed, the
// month's three bunches hanging under the 12th, 30th and 50th; the month's calendar is behind it. Leaf and bunch stickers for
// those who would rather stick than colour, the class's harvest chart with the class qvevri behind it, and the harvest's
// certificates. Rules as the app's (utils/vazi.ts): a deed is a leaf, at most LEAF_CAP a day; a month's 12th, 30th and 50th
// leaf bring a bunch, ripe when the month is over; the season runs from November, and its harvest is counted together. The
// leaf is the app's own (utils/vineShape.ts); the app's vine itself is too dense to colour, so the paper one is drawn here.
import { C, SERIES, SCHOOL, aso, esc, icon, corners, grapeEmblem, page, stripe, foot, duplex, sheetNo, coverCss } from '../lib.js';
import * as __d0 from '../../utils/vineShape';
import * as __d1 from '../../utils/vazi';

const V = ({ ...__d0, ...__d1 });
const { LEAF_PATH, LEAF_VEINS, LEAF_STALK, BUNCH_AT, LEAF_CAP } = V;

export const id = 'chemi-vazi';
export const title = 'ჩემი ვაზი';
const TAG = 'ქართული · უტელეფონო';
const META = 'ყველა ბავშვს თავისი ვაზი · 6 წლიდან · დღეში 2 წუთი, თვის ბოლოს — რთველი';
const SEASON = Array.from({ length: 12 }, (_, i) => V.MONTHS_SHORT[(V.SEASON_MONTH - 1 + i) % 12]);

const GREENS = ['#5e8f3b', '#6c9f45', '#4f7f34', '#77a94f'];
const GRAPE = { purple: ['#4b2b5f', '#36204a'], gold: ['#c9ad4b', '#a88f34'], green: ['#a6c46f', '#86a556'] };
const OUTLINE = '#8d9f78';
const MARK = C.goldDark;
const r1 = n => Math.round(n * 10) / 10;

// ---------- the paper vine (mm): one cane winding up from its root, row by row, a leaf a place ----------
const PV = { W: 186, H: 197, R: 5, K: 13, D: 37, top: 17, xl: 19, xr: 167, ground: 190 };
const GAP = (PV.xr - PV.xl) / PV.K;
const LEAF_MM = 0.205; // the app's 100-unit leaf → about 14 mm across
const rowY = r => PV.top + (PV.R - 1 - r) * PV.D;
const caneY = (x, r) => rowY(r) + 1.1 * Math.sin((6 * Math.PI * (x - PV.xl)) / (PV.xr - PV.xl));
// the places in the order the cane grows: a leaf a place, up on even columns and down on odd ones, so a column's leaves never
// meet the next row's; a bunch hangs under an upward leaf, so a place that points down is left empty when the next leaf
// brings a bunch (and the trunk's own first place)
const PATH = (() => {
  const out = [];
  let n = 0;
  for (let slot = 0; slot < PV.R * PV.K; slot++) {
    const r = Math.floor(slot / PV.K), p = slot % PV.K, c = r % 2 ? PV.K - 1 - p : p;
    const x = r1(PV.xl + (c + 0.5) * GAP), y = r1(caneY(x, r)), up = c % 2 === 0;
    if (slot === 0 || (BUNCH_AT.includes(n + 1) && !up)) { out.push({ gap: true, x, y, up, slot }); continue; }
    n++;
    out.push({ n, x, y, up, bunch: BUNCH_AT.includes(n) });
  }
  return out;
})();
const LEAVES = PATH.filter(s => !s.gap);
const PLACES = LEAVES.length;
for (const at of BUNCH_AT) if (!LEAVES.find(s => s.n === at)?.up) throw new Error(`chemi-vazi: leaf ${at} cannot hold its bunch`);

const tiltOf = s => ((s.n * 37) % 31) - 15;
const leafRot = s => (s.up ? tiltOf(s) : 180 + tiltOf(s));
const leafAt = (s, inner) => `<g transform="translate(${s.x} ${s.y}) rotate(${leafRot(s)}) scale(${LEAF_MM}) translate(-50 -72)">${inner}</g>`;
const centreOf = s => { const a = (leafRot(s) * Math.PI) / 180, k = 20 * LEAF_MM; return { x: r1(s.x + k * Math.sin(a)), y: r1(s.y - k * Math.cos(a)) }; };
const caneD = (() => {
  const pts = [];
  for (let r = 0; r < PV.R; r++) {
    const xs = Array.from({ length: 75 }, (_, i) => PV.xl + ((PV.xr - PV.xl) * i) / 74);
    for (const x of r % 2 ? xs.reverse() : xs) pts.push([x, caneY(x, r)]);
    if (r < PV.R - 1) {
      const right = r % 2 === 0, cx = right ? PV.xr : PV.xl, cy = rowY(r) - PV.D / 2, rad = PV.D / 2;
      for (let i = 1; i < 24; i++) {
        const t = Math.PI / 2 - (i * Math.PI) / 24;
        pts.push([cx + (right ? 1 : -1) * rad * Math.cos(t), cy + rad * Math.sin(t)]);
      }
    }
  }
  return `M${pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L')}`;
})();
const curl = (x, y, dir = 1, k = 1) => `<path d="M${x} ${y}c${2 * dir * k} ${-1.4 * k} ${3.4 * dir * k} ${-3.6 * k} ${2.2 * dir * k} ${-5.4 * k}c${-0.9 * dir * k} ${-1.3 * k} ${-2.6 * dir * k} ${-0.6 * k} ${-2 * dir * k} ${0.8 * k}c${0.4 * dir * k} ${1 * k} ${1.6 * dir * k} ${0.8 * k} ${1.6 * dir * k} ${-0.2 * k}" fill="none" stroke="#8a9a4a" stroke-width=".45" stroke-linecap="round"/>`;
const END = (() => { const x = PV.xr, y = rowY(PV.R - 1); return { x, y }; })();

// a bunch as the paper draws it (mm, hanging from 0 0): rows of grapes under a short stalk
const BUNCH_ROWS = [[-5.5, -1.85, 1.85, 5.5], [-3.7, 0, 3.7], [-5.5, -1.85, 1.85, 5.5], [-3.7, 0, 3.7], [-1.85, 1.85], [0]];
const BR = 1.85;
const paperBunch = (look, label = '') => `<path d="M0 0c.5 1 .3 2 0 3" stroke="#6b5a2c" stroke-width=".55" fill="none" stroke-linecap="round"/>${BUNCH_ROWS.flatMap((row, i) =>
  row.map(x => look
    ? `<circle cx="${x}" cy="${r1(4.6 + i * 3.1)}" r="${BR}" fill="${GRAPE[look][0]}" stroke="${GRAPE[look][1]}" stroke-width=".25"/><circle cx="${r1(x - 0.6)}" cy="${r1(4 + i * 3.1)}" r=".6" fill="#fff" opacity=".35"/>`
    : `<circle cx="${x}" cy="${r1(4.6 + i * 3.1)}" r="${BR}" fill="#fff" stroke="#8a6d9c" stroke-width=".3" stroke-dasharray=".9 .6"/>`)).join('')}${label ? `<text x="0" y="12.2" class="vz-bn">${label}</text>` : ''}`;

const leafDefs = p => `<g id="${p}L"><path d="${LEAF_STALK}" stroke="${OUTLINE}" stroke-width="5" stroke-linecap="round" fill="none"/>
<path d="${LEAF_PATH}" fill="#fff" stroke="${OUTLINE}" stroke-width="2.8" stroke-linejoin="round"/></g>
<g id="${p}F"><path d="${LEAF_STALK}" stroke="#6b5a2c" stroke-width="5" stroke-linecap="round" fill="none"/>
<path d="${LEAF_PATH}" fill="currentColor" stroke="rgba(40,55,20,.55)" stroke-width="2.4" stroke-linejoin="round"/>
<path d="${LEAF_VEINS}" stroke="rgba(35,60,20,.42)" stroke-width="2.6" stroke-linecap="round" fill="none"/></g>`;

/** the paper vine `w` mm wide: the first `filled` leaves coloured, `bunches` = the looks of the month's bunches so far */
const vineSvg = ({ w, filled = 0, bunches = [], numbers = true, p = 'v' }) => {
  const leaves = LEAVES.map(s => leafAt(s, `<use href="#${p}${s.n <= filled ? 'F' : 'L'}"${s.n <= filled ? ` color="${GREENS[s.n % GREENS.length]}"` : ''}/>`)).join('');
  const nums = !numbers ? '' : LEAVES.filter(s => s.n > filled).map(s => {
    const c = centreOf(s), mark = BUNCH_AT.includes(s.n);
    return `${mark ? `<circle cx="${c.x}" cy="${r1(c.y - 0.1)}" r="2.75" fill="#fff8e6" stroke="${MARK}" stroke-width=".45"/>` : ''}<text x="${c.x}" y="${r1(c.y + 1.15)}" class="vz-n${mark ? ' m' : ''}">${s.n}</text>`;
  }).join('');
  const hang = LEAVES.filter(s => s.bunch).map((s, k) => `<g transform="translate(${s.x} ${r1(s.y + 0.6)})">${paperBunch(bunches[k], numbers && !bunches[k] ? String(s.n) : '')}</g>`).join('');
  const gaps = PATH.filter(s => s.gap && s.slot > 0).map(s => curl(s.x, s.y + (s.up ? -0.6 : 0.6), 1, s.up ? 1 : -1)).join('');
  const tufts = [10, 40, 74, 112, 150, 176].map(x => `<path d="M${x} ${PV.ground + 0.3}l-1 -2.4M${x + 1} ${PV.ground + 0.3}l.3 -3M${x + 2} ${PV.ground + 0.3}l1.3 -2.1" stroke="#8fa45c" stroke-width=".5" stroke-linecap="round"/>`).join('');
  const y0 = rowY(0);
  return `<svg viewBox="0 0 ${PV.W} ${PV.H}" width="${w}mm" height="${r1((w * PV.H) / PV.W)}mm" style="display:block">
<defs>${leafDefs(p)}</defs>
<rect x="0" y="${PV.ground}" width="${PV.W}" height="${PV.H - PV.ground}" fill="#efe3cc"/>
<line x1="0" y1="${PV.ground}" x2="${PV.W}" y2="${PV.ground}" stroke="#b89b72" stroke-width=".35"/>${tufts}
<path d="M${PV.xl - 7} ${PV.ground + 1.5}C${PV.xl - 7} ${y0 + 12} ${PV.xl - 5} ${y0} ${PV.xl} ${y0}" stroke="#4d3423" stroke-width="3.6" fill="none" stroke-linecap="round"/>
<path d="M${PV.xl - 7} ${PV.ground + 1.5}C${PV.xl - 7} ${y0 + 12} ${PV.xl - 5} ${y0} ${PV.xl} ${y0}" stroke="#8a6444" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<path d="${caneD}" stroke="#5e4330" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<path d="${caneD}" stroke="#9a7a52" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
${curl(END.x + 0.6, END.y, 1, 1.6)}${gaps}${leaves}${hang}${nums}</svg>`;
};

// ---------- sheet 2: the month's vine and, behind it, the month's calendar ----------
const nameLines = `<div class="vz-lines"><span>სახელი <i></i></span><span>თვე <i class="s"></i></span></div>`;
const bunchSteps = [
  ['leaf', '#4f7f34', `<b>ყოველი საქმე — ერთი ფოთოლი.</b> შემდეგი ნომერი მწვანედ გააფერადე. დღეში ${LEAF_CAP} ფოთოლამდე.`],
  ['grape', '#6c9f45', `<b>${BUNCH_AT.join('-ე, ').replace(/, ([^,]*)$/, ' და $1')}-ე ფოთოლი მტევანს მოიტანს</b> — გააფერადე მწვანედ იმავე ნომრის მტევანი.`],
  ['sun', MARK, '<b>თვე დამთავრდა — მტევნები მწიფდება:</b> იისფრად ან ოქროსფრად გააფერადე და მასწავლებელს აჩვენე.'],
];
const vinePage = no => page(`<div class="vz-top">
  <div class="vz-tl">${grapeEmblem(13, C.wine)}<div><div class="aso vz-ttl">${aso(title)}</div><div class="vz-sub">თვის ვაზი · გააფერადე ფოთოლი ყოველ საქმეზე</div></div></div>
  ${nameLines}
</div>
<div class="vz-art">${vineSvg({ w: PV.W })}</div>
<div class="vz-bottom">
  <div class="vz-steps">${bunchSteps.map(([ic, col, t], i) => `<div class="vz-step"><span class="vz-k">${i + 1}</span>${icon(ic, { size: 6.4, color: col, width: 1.8 })}<span>${t}</span></div>`).join('')}</div>
  <div class="vz-sum box"><b>ამ თვეს ჩემს ვაზზე</b><span class="vz-cell">ფოთოლი <i></i></span><span class="vz-cell">მტევანი <i class="g"></i><i class="g"></i><i class="g"></i></span></div>
</div>
${foot(`<span>${esc(title)} · თვის ვაზი — ყოველ ბავშვს, ყოველ თვეს (ფურცელი ${no('vine')})</span><span>${esc(SCHOOL)}</span>`)}`, 'vzP');

const DEEDS = [
  ['calendar-check', 'ჩვევა', 'დღის კარგი საქმე, რაც მასწავლებელთან შეთანხმდით'],
  ['gamepad-2', 'თამაში', 'სერიის რომელიმე თამაში ბოლომდე ითამაშე'],
  ['book-open-check', 'სწავლა', 'სიმღერის ან საგალობლის ერთი ნაწილი ისწავლე'],
  ['gem', 'მარგალიტი', 'ერთი ფრაზა სუფთად იმღერე მასწავლებელთან'],
  ['dumbbell', 'სავარჯიშო', 'სმენის, რიტმის ან ხმის ერთი სავარჯიშო გააკეთე'],
];
const tinyLeaf = `<svg viewBox="4 4 92 70" class="vz-tl8"><path d="${LEAF_PATH}" fill="#f4f8ef" stroke="${OUTLINE}" stroke-width="4.4" stroke-linejoin="round"/></svg>`;
const calendarPage = no => page(`<div class="vz-top">
  <div class="vz-tl">${icon('calendar-check', { size: 11, color: C.wine, width: 1.6 })}<div><div class="aso vz-ttl">${aso('ჩემი თვე')}</div><div class="vz-sub">ყოველ საქმეზე აქაც ერთი პატარა ფოთოლი გააფერადე — იმ დღის უჯრაში</div></div></div>
  ${nameLines}
</div>
<div class="vz-deeds box">
  <h3>რა არის საქმე?</h3>
  <div class="vz-dl">${DEEDS.map(([ic, h, t]) => `<div class="vz-d">${icon(ic, { size: 5.6, color: C.wine, width: 1.8 })}<span><b>${h}</b> — ${t}</span></div>`).join('')}
  <div class="vz-d own">${icon('pencil', { size: 5.6, color: C.muted, width: 1.8 })}<span>ჩვენი საქმე: <i></i></span></div></div>
</div>
<div class="vz-days">${Array.from({ length: 31 }, (_, i) => `<div class="vz-day"><b>${i + 1}</b><div class="vz-8">${tinyLeaf.repeat(LEAF_CAP)}</div></div>`).join('')}
  <div class="vz-day end"><span>თვე დამთავრდა?</span><b>მტევნები მწიფდება!</b>${icon('grape', { size: 9, color: '#4b2b5f', width: 1.6 })}</div>
</div>
<p class="vz-note">ვაზი არასოდეს კვდება: დღე გამოტოვე — არაფერია, შემდეგი საქმე ისევ ფოთოლია. ვაზის ფურცელი შეივსო (${PLACES} ფოთოლი)? ყოჩაღ — დანარჩენი აქ მონიშნე, მტევანი კი მაინც ${BUNCH_AT.join(', ')} ფოთოლზეა.</p>
${foot(`<span>${esc(title)} · ჩემი თვე (ფურცელი ${no('vine')}-ის ზურგი)</span><span>${esc(SCHOOL)}</span>`)}`, 'vzP');

// ---------- sheets 3–4: stickers to cut along the dotted lines (or printed on a sticker sheet) ----------
const leafSticker = i => `<svg viewBox="0 0 100 100" width="12.6mm" height="12.6mm"><g transform="rotate(${((i * 37) % 50) - 25} 50 52)"><path d="M50 58L50 74" stroke="#6b5a2c" stroke-width="5" stroke-linecap="round"/><path d="${LEAF_PATH}" fill="${GREENS[i % GREENS.length]}" stroke="rgba(40,55,20,.55)" stroke-width="2.4" stroke-linejoin="round"/><path d="${LEAF_VEINS}" stroke="rgba(35,60,20,.42)" stroke-width="2.6" stroke-linecap="round" fill="none"/></g></svg>`;
const bunchSticker = look => `<svg viewBox="-8 -1 16 22" width="16mm" height="22mm">${paperBunch(look)}</svg>`;
const stickerSheet = ({ cols, rows, w, h, item, label }) => {
  const left = (210 - cols * w) / 2, top = 20;
  let cells = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells += `<div class="vz-st" style="left:${r1(left + c * w)}mm;top:${r1(top + r * h)}mm;width:${w}mm;height:${h}mm">${item(r * cols + c, r)}</div>`;
  return page(`${cells}<div class="sheetLabel">ფურცელი %SHEET% · ${esc(label)}</div>`, 'vzSt');
};
const LEAF_ST = { cols: 12, rows: 17, w: 15, h: 15 };
const leafStickers = stickerSheet({ ...LEAF_ST, item: i => leafSticker(i), label: `${title} · ფოთლის სტიკერები (${LEAF_ST.cols * LEAF_ST.rows}) — ცალმხრივი; ამოჭერი წერტილოვანი ხაზით` });
const STICKER_LOOKS = ['green', 'green', 'green', 'green', 'green', 'purple', 'purple', 'purple', 'gold', 'gold', 'gold'];
const BUNCH_ST = { cols: 10, rows: STICKER_LOOKS.length, w: 18, h: 23 };
const bunchStickers = stickerSheet({ ...BUNCH_ST, item: (_, r) => bunchSticker(STICKER_LOOKS[r]), label: `${title} · მტევნის სტიკერები (${BUNCH_ST.cols * BUNCH_ST.rows}): მწვანე — მოსხმული, იისფერი და ოქროსფერი — მწიფე; ცალმხრივი` });

// ---------- sheet 5: the class's harvest chart and, behind it, the class qvevri ----------
const ROWS = 20;
const harvestPage = no => page(`<div class="vz-top">
  <div class="vz-tl">${grapeEmblem(13, C.wine)}<div><div class="aso vz-ttl">${aso('კლასის რთველი')}</div><div class="vz-sub">თვის ბოლოს ყოველ ბავშვს მისი მწიფე მტევნები ჩაუწერე (0–3)</div></div></div>
  <div class="vz-lines"><span>კლასი <i></i></span><span>წელი <i class="s"></i></span></div>
</div>
<table class="vz-tab">
  <tr><th class="n">№</th><th class="nm">სახელი</th>${SEASON.map(m => `<th>${m}</th>`).join('')}<th class="sum">სულ</th></tr>
  ${Array.from({ length: ROWS }, (_, i) => `<tr><td class="n">${i + 1}</td><td class="nm"></td>${SEASON.map(() => '<td></td>').join('')}<td class="sum"></td></tr>`).join('')}
  <tr class="tot"><td class="n"></td><td class="nm">კლასი</td>${SEASON.map(() => '<td></td>').join('')}<td class="sum"></td></tr>
</table>
<div class="vz-big box">${icon('grape', { size: 10, color: '#4b2b5f', width: 1.6 })}<span>რთველზე: კლასის ყველა მტევანი ერთად</span><i></i><span class="small">ამდენი მარცვალი გააფერადეთ ქვევრში — ზურგზე</span></div>
${foot(`<span>${esc(title)} · კლასის რთველი (ფურცელი ${no('harvest')})</span><span>${esc(SCHOOL)}</span>`)}`, 'vzP');

// the qvevri: a wide jar narrowing to a point, buried to its shoulders; grapes fill it from the bottom up, one a bunch
const Q = { w: 176, h: 214, top: 9, max: 78, neck: 20, lip: 25, shoulder: 70 };
const qHalf = y => {
  const t = y - Q.top;
  if (t < 0) return 0;
  if (t < 7) return Q.lip;
  if (t < 15) return Q.neck;
  if (t < Q.shoulder) return Q.neck + (Q.max - Q.neck) * Math.sin(((t - 15) / (Q.shoulder - 15)) * (Math.PI / 2));
  const u = (t - Q.shoulder) / (Q.h - Q.top - Q.shoulder);
  return u >= 1 ? 0 : Q.max * Math.cos(u * (Math.PI / 2)) ** 0.85;
};
const QX = Q.w / 2;
const qOutline = (() => {
  const ys = Array.from({ length: 200 }, (_, i) => Q.top + 7 + ((Q.h - Q.top - 7) * i) / 199);
  const right = ys.map(y => `${r1(QX + qHalf(y))} ${r1(y)}`), left = ys.slice().reverse().map(y => `${r1(QX - qHalf(y))} ${r1(y)}`);
  return `M${r1(QX - Q.neck)} ${Q.top + 7}L${right.join('L')}L${left.join('L')}Z`;
})();
const GR = 4.4, DX = 9.5, DY = 8.3;
const QGRAPES = (() => {
  const out = [];
  for (let y = Q.h - 9, row = 0; y > Q.top + 26; y -= DY, row++) {
    const fit = Math.min(qHalf(y - GR), qHalf(y + GR)) - GR - 2.6;
    if (fit < 0) continue;
    const off = row % 2 ? DX / 2 : 0;
    for (let x = -Math.floor((fit + off) / DX) * DX + off; x <= fit; x += DX) if (Math.abs(x) <= fit) out.push({ x: r1(QX + x), y: r1(y) });
  }
  return out;
})();
const qvevriPage = no => page(`<div class="vz-top">
  <div class="vz-tl">${grapeEmblem(13, C.wine)}<div><div class="aso vz-ttl">${aso('კლასის ქვევრი')}</div><div class="vz-sub">რთველზე ყოველ მტევანზე ერთი მარცვალი გააფერადეთ — ძირიდან ზემოთ</div></div></div>
  <div class="vz-lines"><span>კლასი <i></i></span><span>წელი <i class="s"></i></span></div>
</div>
<div class="vz-q"><svg viewBox="0 0 ${Q.w} ${Q.h + 6}" width="${Q.w}mm" height="${Q.h + 6}mm">
  <rect x="0" y="${Q.top + 40}" width="${Q.w}" height="${Q.h - Q.top - 34}" fill="#f4ead8"/>
  <line x1="0" y1="${Q.top + 40}" x2="${Q.w}" y2="${Q.top + 40}" stroke="#b89b72" stroke-width=".4"/>
  <path d="${qOutline}" fill="#fbf1e6" stroke="#8e4f2c" stroke-width="1.1"/>
  <ellipse cx="${QX}" cy="${Q.top + 7}" rx="${Q.lip}" ry="4.2" fill="#e9d9bd" stroke="#8e4f2c" stroke-width="1.1"/>
  <ellipse cx="${QX}" cy="${Q.top + 7}" rx="${Q.neck - 3}" ry="2.4" fill="#cdb894"/>
  ${QGRAPES.map((g, i) => {
    const n = i + 1, mark = n % 50 === 0;
    return `<circle cx="${g.x}" cy="${g.y}" r="${GR}" fill="#fff" stroke="${mark ? MARK : '#9c84ad'}" stroke-width="${mark ? 0.8 : 0.4}"/><text x="${g.x}" y="${r1(g.y + 1.2)}" class="vz-qn${mark ? ' m' : ''}">${n}</text>`;
  }).join('')}
</svg></div>
<p class="vz-note c">${QGRAPES.length} მარცვალი ერთ ქვევრში. ${QGRAPES.length}-ზე მეტი მტევანი მოისხით? ყოჩაღ — მეორე ქვევრი დაბეჭდეთ (ფურცელი ${no('harvest')}-ის ზურგი).</p>
${foot(`<span>${esc(title)} · კლასის ქვევრი (ფურცელი ${no('harvest')}-ის ზურგი)</span><span>${esc(SCHOOL)}</span>`)}`, 'vzP');

// ---------- sheet 6: the harvest's certificates, four a sheet ----------
const certificate = () => `<div class="vz-cert"><div class="vz-cf"></div>${corners(C.gold, 9, 5.5)}
  <div class="vz-ci">
    ${grapeEmblem(30, C.wine)}
    <div class="aso vz-ct">${aso('რთველის სიგელი')}</div>
    <div class="vz-cs">ეს სიგელი ეკუთვნის</div>
    <div class="vz-cl"></div>
    <div class="vz-cs">მისმა ვაზმა წელს</div>
    <div class="vz-cn"><i></i><span>მტევანი მოისხა!</span></div>
    <div class="vz-cm"><span>კლასი <i></i></span><span>წელი <i></i></span></div>
    <div class="vz-cm"><span>მასწავლებელი <i></i></span></div>
  </div></div>`;
const CERT = { w: 95, h: 136 };
const certPage = page(`${[0, 1, 2, 3].map(k => `<div class="piece" style="left:${r1(10 + (k % 2) * CERT.w)}mm;top:${r1(12.5 + Math.floor(k / 2) * CERT.h)}mm;width:${CERT.w}mm;height:${CERT.h}mm">${certificate()}</div>`).join('')}
<svg class="cut" viewBox="0 0 210 297" width="210mm" height="297mm" style="position:absolute;left:0;top:0" stroke="#999" stroke-width=".2" stroke-dasharray="1.2 1.2"><line x1="105" y1="6" x2="105" y2="291"/><line x1="4" y1="${12.5 + CERT.h}" x2="206" y2="${12.5 + CERT.h}"/></svg>
<div class="sheetLabel">ფურცელი %SHEET% · ${esc(title)} · რთველის სიგელები (4) — ცალმხრივი; ამოჭერი წყვეტილი ხაზით</div>`, 'vzCert');

// ---------- sheet 1: the cover and the rules ----------
const EX_LOOKS = ['green', 'green'];
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ყოველ ბავშვს თავისი ვაზი ჰყავს. ყოველი კარგი საქმე — ნასწავლი სიმღერა, სავარჯიშო, ჩვევა — ერთი ფოთოლია: გააფერადე ვაზზე! თვეში ${BUNCH_AT[0]} ფოთოლი მტევანს მოიტანს, ${BUNCH_AT[1]} — მეორეს, ${BUNCH_AT[2]} — მესამეს. შემოდგომაზე კი რთველია: კლასი მტევნებს ერთად ითვლის და ქვევრს ავსებს. ტელეფონი არ სჭირდება.<br><b>${META}</b></div>
  <div class="vz-ex box">
    <div class="vz-exArt">${vineSvg({ w: 70, filled: 33, bunches: EX_LOOKS, numbers: false, p: 'x' })}</div>
    <div class="vz-exR">
      <h3>ასე იზრდება</h3>
      <div class="kz-step">${icon('leaf', { size: 6, color: '#4f7f34', width: 1.8 })}<span>ნინომ ამ თვეში 33 საქმე გააკეთა — 33 ფოთოლი გააფერადა.</span></div>
      <div class="kz-step">${icon('grape', { size: 6, color: '#6c9f45', width: 1.8 })}<span>${BUNCH_AT[0]}-ე და ${BUNCH_AT[1]}-ე ფოთოლზე ორი მწვანე მტევანი მოისხა. ${BUNCH_AT[2]}-მდე კიდევ ${BUNCH_AT[2] - 33} ფოთოლი აკლია.</span></div>
      <div class="kz-step">${icon('sun', { size: 6, color: MARK, width: 1.8 })}<span>თვის ბოლოს მტევნები იისფრდება — და კლასის რთველის ცხრილში ჩაიწერება.</span></div>
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>${no('cover')}-ის ზურგი</td></tr>
        <tr><td>თვის ვაზი (${PLACES} დანომრილი ფოთოლი, 3 მტევანი) და „ჩემი თვე“ ზურგზე — ყოველ ბავშვს, ყოველ თვეს</td><td>${no('vine')}</td></tr>
        <tr><td>ფოთლის სტიკერები, ${LEAF_ST.cols * LEAF_ST.rows}</td><td>${no('leaves')}</td></tr>
        <tr><td>მტევნის სტიკერები, ${BUNCH_ST.cols * BUNCH_ST.rows}</td><td>${no('bunches')}</td></tr>
        <tr><td>კლასის რთველის ცხრილი (${ROWS} ბავშვი) და კლასის ქვევრი (${QGRAPES.length} მარცვალი) ზურგზე</td><td>${no('harvest')}</td></tr>
        <tr><td>რთველის სიგელები, 4</td><td>${no('certs')}</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>.</li>
        <li>ფურცელი ${no('vine')} — იმდენი, რამდენი ბავშვიცაა; ყოველ თვეს ახალი.</li>
        <li>სტიკერები (${no('leaves')}–${no('bunches')}) — სურვილისამებრ: A4 სტიკერის ქაღალდზე ან ჩვეულებრივზე (ამოჭრა და წებო). ფერადი ფანქრებიც საკმარისია.</li>
        <li>ფურცელი ${no('harvest')} — ერთი კლასზე; ${no('certs')} — ბავშვების რაოდენობის მეოთხედი.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „ტამაგოჩის“ — ელექტრონული შინაური ცხოველის — იდეით: ვაზი ზრუნვით იზრდება. ვაზის ნახატი და წესები საგანძურის სკოლის აპისაა, ამიტომ ქაღალდიც და ტელეფონიც ერთნაირად ითვლის. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const rulesOf = no => [
  ['რა გჭირდებათ', `ყოველ ბავშვს თვის ვაზის ფურცელი (${no('vine')}) და ფერადი ფანქრები. თუ გნებავთ — ფოთლისა და მტევნის სტიკერები (${no('leaves')}–${no('bunches')}).`],
  ['თვის დასაწყისი', 'ბავშვი ფურცელზე სახელსა და თვეს წერს. ზურგზე, „რა არის საქმე?“, ხუთი საქმეა — ჩვევა, თამაში, სწავლა, მარგალიტი, სავარჯიშო; მასწავლებელს თავისიც შეუძლია ჩაწეროს.'],
  ['ფოთოლი', `ყოველი საქმე — ერთი ფოთოლი: ვაზზე შემდეგი ნომერი მწვანედ გააფერადე (ან სტიკერი დააკარი), ზურგზე კი იმ დღის უჯრაში — ერთი პატარა ფოთოლი. დღეში ${LEAF_CAP} ფოთოლამდე.`],
  ['მტევანი', `${BUNCH_AT[0]}-ე, ${BUNCH_AT[1]}-ე და ${BUNCH_AT[2]}-ე ფოთოლი მტევანს მოიტანს: ოქროსფრად შემოხაზული ნომერი მიაღწიე — იმავე ნომრის მტევანი მწვანედ გააფერადე.`],
  ['თვის ბოლო', `მტევნები მწიფდება — იისფრად ან ოქროსფრად გააფერადე (თვე-თვე მონაცვლეობით, როგორც აპში). მასწავლებელი მწიფე მტევნებს კლასის რთველის ცხრილში წერს (${no('harvest')}), ფურცელი კი ბავშვის საქაღალდეში — „ქვევრში“ — მიდის. ახალ თვეს — ახალი ვაზი.`],
  ['ვაზი არ კვდება', `დღე გამოტოვე? არაფერია — შემდეგი საქმე ისევ ფოთოლია. ფურცელი შეივსო (${PLACES} ფოთოლი)? ყოჩაღ — დანარჩენი ზურგზე მონიშნე.`],
  ['რთველი', `წელიწადი ნოემბრიდან ოქტომბრამდეა. შემოდგომაზე (ან როცა მასწავლებელი იტყვის) კლასი ცხრილის მტევნებს ერთად ითვლის — ყოველ მტევანზე ქვევრში ერთი მარცვალი ფერადდება (${no('harvest')}-ის ზურგი). მერე — ნამდვილი ყურძენი და სიგელები (${no('certs')}).`],
  ['შეჯიბრი არაა', 'ყველა ვაზი თავისი სიჩქარით იზრდება. რთველზე კლასის საერთო ქვევრი ივსება — ვისაც ცოტა მტევანი აქვს, მისი მარცვლებიც იქაა.'],
  ['პატარებთან', `ფოთოლი დღეში 3-მდე და მტევანი ${BUNCH_AT[0]}-ე და ${BUNCH_AT[1]}-ე ფოთოლზე; ფერებს მასწავლებელი აძლევს — ეს მათთვის ჯილდოა.`],
];
const rulesPage = no => page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · 6 წლიდან · დღეში 2 წუთი</div></div>
  <p class="lead">„ჩემი ვაზი“ ზრუნვის თამაშია: ყოველ ბავშვს თავისი ვაზი ჰყავს, ის კი ყოველი კარგი საქმით იზრდება. ფოთოლი ფოთოლს მოსდევს, თვეში მტევნები ება, შემოდგომაზე კი მთელი კლასის რთველია.</p>
  <div class="vz-rex">
    <div class="vz-rexA">${vineSvg({ w: 64, filled: 12, bunches: ['green'], numbers: false, p: 'r' })}<span>12 ფოთოლი — პირველი მტევანი</span></div>
    <div class="vz-rexA">${vineSvg({ w: 64, filled: 50, bunches: ['purple', 'purple', 'purple'], numbers: false, p: 's' })}<span>50 ფოთოლი, თვის ბოლო — სამი მწიფე მტევანი</span></div>
  </div>
  <div class="rules"><ol>${rulesOf(no).map(([h, t]) => `<li><b>${esc(h)}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="kz-more box"><b>აპში</b> ვაზი თავისით იზრდება: მონიშნული ჩვევა, დასრულებული დღის თამაში, სწავლის რეჟიმში ნავარჯიშები ნაწილი, გაპრიალებული მარგალიტი, ოსტატობის სავარჯიშო — ყოველი ფოთოლია. იქ ფოთოლი 30 დღე რჩება, კლასის რთველი კი ერთ ეკრანზე ჩანს — sagandzureli.ge → თამაშები → ჩემი ვაზი.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

// every page's text must end above its footer; a page that runs over stops the build
export const script = `(() => {
  const bad = [];
  document.querySelectorAll('.page').forEach((pg, i) => {
    const f = pg.querySelector('.foot');
    if (!f) return;
    const limit = f.getBoundingClientRect().top - 1;
    pg.querySelectorAll('.cover > *, .rulesWrap > *, .vz-top, .vz-art, .vz-bottom, .vz-deeds, .vz-days, .vz-note, .vz-tab, .vz-big, .vz-q').forEach(el => {
      if (el.getBoundingClientRect().bottom > limit) bad.push('page ' + (i + 1) + ': ' + (el.className || el.tagName));
    });
  });
  if (bad.length) throw new Error('chemi-vazi: runs into the footer — ' + bad.join(' · '));
})()`;

export const css = `${coverCss}
.rtitle{white-space:nowrap}
.rulesP .rules{font-size:10.2pt;line-height:1.36}
.rulesP .rules li{margin-bottom:.9mm}
.rulesP .lead{font-size:10.6pt}
.cover .lead{margin-bottom:4mm}
.kz-step{display:flex;gap:2.6mm;align-items:flex-start;font-size:10pt;line-height:1.35;margin-bottom:2.6mm}
.kz-step svg{flex:none;margin-top:.2mm}
.kz-more{margin-top:3mm;font-size:9.8pt;line-height:1.35}
.vz-ex{display:grid;grid-template-columns:auto 1fr;gap:6mm;align-items:center;margin:0 0 5mm;padding:3mm 5mm}
.vz-exArt{border-radius:2mm;overflow:hidden;background:#fffdf8;border:.25mm solid var(--line)}
.vz-exR h3{margin:0 0 3mm}
.vz-rex{display:flex;gap:6mm;justify-content:center;margin:0 0 3mm}
.vz-rexA{display:flex;flex-direction:column;align-items:center;gap:1.2mm;font-size:9pt;font-weight:700;color:var(--wine)}
.vz-rexA svg{border-radius:1.6mm;border:.25mm solid var(--line);background:#fffdf8}
.vzP{padding:0}
.vz-top{margin:10mm 10mm 0;display:flex;align-items:center;justify-content:space-between;gap:6mm;border-bottom:.35mm solid var(--gold);padding-bottom:2.4mm}
.vz-tl{display:flex;align-items:center;gap:3mm;min-width:0}
.vz-ttl{font-size:20pt;color:var(--wine);line-height:1.1;white-space:nowrap}
.vz-sub{font-size:9.6pt;color:var(--muted);line-height:1.3}
.vz-lines{display:flex;flex-direction:column;gap:2.6mm;flex:none;font-size:10.5pt;font-weight:700;color:var(--brown)}
.vz-lines span{display:flex;align-items:flex-end;gap:2mm}
.vz-lines i{display:inline-block;width:50mm;border-bottom:.3mm solid var(--brown);height:5mm}
.vz-lines i.s{width:30mm}
.vz-art{margin:2mm 12mm 0}
.vz-n{font-family:'SansKa',sans-serif;font-weight:700;font-size:3.2px;fill:#6f7f5a;text-anchor:middle}
.vz-n.m{fill:${MARK};font-size:3.3px;font-weight:900}
.vz-bn{font-family:'SansKa',sans-serif;font-weight:900;font-size:3.1px;fill:${MARK};text-anchor:middle;paint-order:stroke;stroke:#fff;stroke-width:.9px}
.vz-bottom{margin:3mm 12mm 0;display:grid;grid-template-columns:1fr 52mm;gap:5mm;align-items:center}
.vz-steps{display:flex;flex-direction:column;gap:2mm}
.vz-step{display:flex;align-items:flex-start;gap:2.4mm;font-size:10.2pt;line-height:1.33}
.vz-step svg{flex:none}
.vz-step b{color:var(--wine)}
.vz-k{flex:none;width:6.4mm;height:6.4mm;border-radius:50%;background:var(--wine);color:#fff;font-weight:700;font-size:9.6pt;display:flex;align-items:center;justify-content:center}
.vz-sum{display:flex;flex-direction:column;align-items:flex-start;gap:2.6mm;font-size:10.6pt;padding:3mm 4mm}
.vz-sum b{color:var(--brown)}
.vz-cell{display:flex;align-items:center;gap:2mm;color:var(--wine)}
.vz-cell i{display:inline-block;width:16mm;height:9mm;border:.35mm solid var(--brown);border-radius:1.6mm;background:#fff}
.vz-cell i.g{width:7mm;height:7mm;border-radius:50%;border-color:#4b2b5f}
.vz-deeds{margin:4mm 10mm 0;padding:2.6mm 4mm}
.vz-deeds h3{margin:0 0 1.6mm;color:var(--wine);font-size:11.5pt}
.vz-dl{display:grid;grid-template-columns:1fr 1fr;gap:1.4mm 6mm}
.vz-d{display:flex;align-items:flex-start;gap:2mm;font-size:9.6pt;line-height:1.3}
.vz-d svg{flex:none}
.vz-d b{color:var(--wine)}
.vz-d.own i{display:inline-block;width:46mm;border-bottom:.3mm solid var(--brown);height:4mm;vertical-align:bottom}
.vz-days{margin:4mm 10mm 0;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:1.6mm}
.vz-day{border:.3mm solid var(--line);border-radius:1.8mm;padding:1.2mm 1.4mm 1.8mm;background:#fff;height:33.5mm;display:flex;flex-direction:column}
.vz-day>b{font-family:'SansKa',sans-serif;font-size:11pt;color:var(--wine);line-height:1}
.vz-8{margin-top:auto;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1.4mm .2mm;justify-items:center}
.vz-tl8{width:5.2mm;height:4mm;display:block}
.vz-day.end{grid-column:span 4;background:var(--paper);border-color:var(--gold);flex-direction:row;align-items:center;justify-content:center;gap:3mm;font-size:10.5pt;text-align:center}
.vz-day.end span{color:var(--muted)}
.vz-day.end b{font-family:inherit;font-size:12pt;color:#4b2b5f}
.vz-note{margin:3.6mm 12mm 0;font-size:9.8pt;line-height:1.38;color:var(--brown)}
.vz-note.c{text-align:center}
.vzSt .vz-st{position:absolute;display:flex;align-items:center;justify-content:center;outline:.2mm dotted #b9ab98;outline-offset:-.1mm}
.vz-tab{margin:4mm 10mm 0;width:190mm;border-collapse:collapse;table-layout:fixed;font-size:9.6pt}
.vz-tab th,.vz-tab td{border:.25mm solid var(--line);height:9.6mm;text-align:center;padding:0}
.vz-tab th{background:var(--parch);color:var(--wine);font-weight:700;height:8mm}
.vz-tab .n{width:8mm;color:var(--muted)}
.vz-tab .nm{width:44mm;text-align:left;padding-left:2mm}
.vz-tab .sum{width:15mm;background:#f6efe2}
.vz-tab th.sum{background:var(--wine);color:#fff}
.vz-tab tr.tot td{border-top:.6mm solid var(--wine);font-weight:700;color:var(--wine);background:var(--paper)}
.vz-big{margin:4mm 10mm 0;display:flex;align-items:center;gap:3mm;font-size:11.5pt;font-weight:700;color:#4b2b5f;flex-wrap:wrap}
.vz-big i{display:inline-block;width:26mm;height:12mm;border:.45mm solid #4b2b5f;border-radius:2mm;background:#fff}
.vz-big .small{flex-basis:100%;font-weight:400;margin-top:-1mm}
.vz-q{margin:3mm auto 0;width:${Q.w}mm}
.vz-qn{font-family:'SansKa',sans-serif;font-weight:700;font-size:3.5px;fill:#8d7a9b;text-anchor:middle}
.vz-qn.m{fill:${MARK};font-weight:900;font-size:3.9px}
.vzCert .piece{padding:3mm}
.vz-cert{position:relative;width:100%;height:100%;background:var(--paper);border-radius:2.4mm}
.vz-cf{position:absolute;inset:2.2mm;border:.6mm solid var(--wine);border-radius:2mm}
.vz-ci{position:absolute;inset:9mm 9mm 12mm;display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center}
.vz-ct{font-size:16pt;color:var(--wine);white-space:nowrap}
.vz-cs{font-size:10pt;color:var(--muted)}
.vz-cl{width:66mm;border-bottom:.35mm solid var(--brown);height:9mm}
.vz-cn{display:flex;align-items:center;gap:2.6mm;font-size:12pt;font-weight:700;color:#4b2b5f}
.vz-cn i{display:inline-block;width:18mm;height:11mm;border:.45mm solid #4b2b5f;border-radius:2mm;background:#fff}
.vz-cm{display:flex;gap:4mm;font-size:9.4pt;color:var(--brown);margin-top:1mm}
.vz-cm span{display:flex;align-items:flex-end;gap:1.4mm}
.vz-cm i{display:inline-block;width:20mm;border-bottom:.3mm solid var(--brown);height:4mm}
.vz-cm:last-child i{width:42mm}
`;

const SHEETS = [{ key: 'cover' }, { key: 'vine' }, { key: 'leaves', front: leafStickers }, { key: 'bunches', front: bunchStickers }, { key: 'harvest' }, { key: 'certs', front: certPage }];
const no = k => sheetNo(SHEETS, k);
SHEETS[0].front = coverPage(no);
SHEETS[0].back = rulesPage(no);
SHEETS[1].front = vinePage(no);
SHEETS[1].back = calendarPage(no);
SHEETS[4].front = harvestPage(no);
SHEETS[4].back = qvevriPage(no);

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
