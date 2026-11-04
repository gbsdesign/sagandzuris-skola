import { buildPdf, type PdfImage } from '../../../utils/scorePdf';
import { CARDS, KINDS, type TCard, type TKind } from '../../../data/takhtiCards';
import { ARMY_PTS, ARMY_TIE, CAPITALS, OFFER, ROUNDS, WINE_PTS, scoreOf, winnersBy } from '../../../utils/oriTakhti';
import { KIND_INFO, SIDE_COLOR, subOf } from './words';

// „ორი ტახტი“'s printed kit (სამაგიდო), made in the browser when the hub's „სამაგიდო · PDF“ is tapped (2026-11-04, the user's
// rule: the app makes a kit's PDF itself, nothing is built ahead). Seven sheets, two-sided: the rules, the 42 cards with the two
// thrones and „ლიხის ქვა“ (63 × 88 mm, nine a sheet, the backs mirrored for long-edge duplex) and eight score boxes. Everything
// is drawn on canvases from the app's own cards, words and numbers, so a card changed in data/takhtiCards.ts changes here too;
// one JPEG a page in the app's PDF writer (utils/scorePdf.ts fits it to A4 less 28 pt — 1617 px = 190.24 mm).

const W = 1617, H = 2356;
const MM = W / 190.24;
const PW = 190.24, PH = H / MM;
const PT = 0.3528;
const TITLE = 'ორი ტახტი';
const WINE = '#7a2028', INK = '#3b2a1c', BROWN = '#4a3426', MUTED = '#8a7560', PAPER = '#fbf6ec', LINE = '#d9c9ad', PARCH = '#e8dcc8';
const GOLD = '#c9a24b', GOLD_D = '#a67c2e', GOLD_L = '#f1d793', NIGHT = '#2b1e14';
const SANS = '"Noto Sans Georgian", system-ui, sans-serif';
const SERIF = '"Noto Serif Georgian", "Noto Sans Georgian", Georgia, serif';
const IN_BOX = CARDS.length - ROUNDS * OFFER;
const HALF = ROUNDS / 2;
const NUM_WORD: Record<number, string> = { 2: 'ორჯერ', 3: 'სამჯერ', 4: 'ოთხჯერ', 5: 'ხუთჯერ', 6: 'ექვსჯერ' };

type G = CanvasRenderingContext2D;
/** a font: weight, size in points (the pages are drawn in millimetres) */
const font = (w: number, pt: number, fam = SERIF) => `${w} ${(pt * PT).toFixed(3)}px ${fam}`;
const aso = (s: string) => s.replace(/[ა-ჵ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x30));

// ---------- lucide's marks (the app's), as paths in their 24-unit box; [cx, cy, r] = a circle ----------
type Shape = string | [number, number, number];
const ICONS: Record<string, Shape[]> = {
  castle: ['M10 5V3', 'M14 5V3', 'M15 21v-3a3 3 0 0 0-6 0v3', 'M18 3v8', 'M18 5H6', 'M22 11H2', 'M22 9v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9', 'M6 3v8'],
  swords: ['M14.5 17.5L3 6L3 3L6 3L17.5 14.5', 'M13 19L19 13', 'M16 16L20 20', 'M19 21L21 19', 'M14.5 6.5L18 3L21 3L21 6L17.5 9.5', 'M5 14L9 18', 'M7 17L4 20', 'M3 19L5 21'],
  grape: ['M22 5V2l-5.89 5.89', [16.6, 15.89, 3], [8.11, 7.4, 3], [12.35, 11.65, 3], [13.91, 5.85, 3], [18.15, 10.09, 3], [6.56, 13.2, 3], [10.8, 17.44, 3], [5, 19, 3]],
  amphora: ['M10 2v5.632c0 .424-.272.795-.653.982A6 6 0 0 0 6 14c.006 4 3 7 5 8', 'M10 5H8a2 2 0 0 0 0 4h.68', 'M14 2v5.632c0 .424.272.795.652.982A6 6 0 0 1 18 14c0 4-3 7-5 8', 'M14 5h2a2 2 0 0 1 0 4h-.68', 'M18 22H6', 'M9 2h6'],
  book: ['M12 7v14', 'M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z'],
  handshake: ['m11 17 2 2a1 1 0 1 0 3-3', 'm14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4', 'm21 3 1 11h-2', 'M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3', 'M3 4h8'],
  crown: ['M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z', 'M5 21h14'],
};
const KIND_ICON: Record<TKind, string> = { tsikhe: 'castle', lashkari: 'swords', ghvino: 'grape', tsigni: 'book', elchi: 'handshake' };
const iconOf = (c: TCard) => (c.k === 'ghvino' && c.w === 'chuch' ? 'amphora' : KIND_ICON[c.k]);

const icon = (g: G, name: string, x: number, y: number, size: number, color: string, width = 2) => {
  g.save();
  g.translate(x, y);
  g.scale(size / 24, size / 24);
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const s of ICONS[name]) {
    if (typeof s === 'string') g.stroke(new Path2D(s));
    else { g.beginPath(); g.arc(s[0], s[1], s[2], 0, Math.PI * 2); g.stroke(); }
  }
  g.restore();
};

// ---------- shapes and text ----------
/** a rounded rectangle's path; `r` = one radius or [top-left, top-right, bottom-right, bottom-left] */
const box = (g: G, x: number, y: number, w: number, h: number, r: number | [number, number, number, number]) => {
  const [a, b, c, d] = typeof r === 'number' ? [r, r, r, r] : r;
  g.beginPath();
  g.moveTo(x + a, y);
  g.lineTo(x + w - b, y); g.arcTo(x + w, y, x + w, y + b, b);
  g.lineTo(x + w, y + h - c); g.arcTo(x + w, y + h, x + w - c, y + h, c);
  g.lineTo(x + d, y + h); g.arcTo(x, y + h, x, y + h - d, d);
  g.lineTo(x, y + a); g.arcTo(x, y, x + a, y, a);
  g.closePath();
};
const circle = (g: G, x: number, y: number, r: number, fill?: string, stroke?: string, lw = 0.3) => {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
};
const hline = (g: G, x1: number, x2: number, y: number, color = LINE, lw = 0.25) => {
  g.beginPath(); g.moveTo(x1, y); g.lineTo(x2, y); g.strokeStyle = color; g.lineWidth = lw; g.stroke();
};
const text = (g: G, s: string, x: number, y: number, f: string, color: string, align: CanvasTextAlign = 'left') => {
  g.font = f; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y);
};
/** one line, its font made smaller until it fits `maxW` */
const fit = (g: G, s: string, x: number, y: number, maxW: number, w: number, pt: number, color: string, align: CanvasTextAlign = 'center', fam = SERIF) => {
  let p = pt;
  g.font = font(w, p, fam);
  while (g.measureText(s).width > maxW && p > 5) { p -= 0.25; g.font = font(w, p, fam); }
  text(g, s, x, y, g.font, color, align);
};

interface Piece { t: string; b: boolean; w: number }
interface Word { pieces: Piece[]; w: number }
interface Para { pt?: number; lh?: number; color?: string; bold?: string; align?: 'left' | 'center'; fam?: string; weight?: number; draw?: boolean }
/** a paragraph with **bold** parts, wrapped to `maxW`; drawn from `y` when `draw`; returns its height */
const para = (g: G, s: string, x: number, y: number, maxW: number, o: Para = {}) => {
  const { pt = 10, lh = 1.36, color = BROWN, bold = WINE, align = 'left', fam = SERIF, weight = 400, draw = true } = o;
  const words: Word[] = [];
  let glue = false;
  s.split('**').forEach((run, i) => {
    for (const bit of run.split(/(\s+)/)) {
      if (!bit) continue;
      if (/^\s+$/.test(bit)) { glue = false; continue; }
      g.font = font(i % 2 ? 700 : weight, pt, fam);
      const p = { t: bit, b: i % 2 === 1, w: g.measureText(bit).width };
      if (glue && words.length) { const wd = words[words.length - 1]; wd.pieces.push(p); wd.w += p.w; }
      else words.push({ pieces: [p], w: p.w });
      glue = true;
    }
  });
  g.font = font(weight, pt, fam);
  const space = g.measureText(' ').width;
  const lines: { words: Word[]; w: number }[] = [];
  let cur: Word[] = [], cw = 0;
  for (const wd of words) {
    const add = (cur.length ? space : 0) + wd.w;
    if (cur.length && cw + add > maxW) { lines.push({ words: cur, w: cw }); cur = [wd]; cw = wd.w; }
    else { cur.push(wd); cw += add; }
  }
  if (cur.length) lines.push({ words: cur, w: cw });
  const step = pt * PT * lh;
  if (draw) {
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    lines.forEach((ln, i) => {
      let cx = align === 'center' ? x + (maxW - ln.w) / 2 : x;
      const cy = y + step * (i + 0.5);
      ln.words.forEach((wd, j) => {
        if (j) cx += space;
        for (const p of wd.pieces) {
          g.font = font(p.b ? 700 : weight, pt, fam);
          g.fillStyle = p.b ? bold : color;
          g.fillText(p.t, cx, cy);
          cx += p.w;
        }
      });
    });
  }
  return lines.length * step;
};

/** the paper's ornament: little four-petal rosettes on a grid */
const rosettes = (g: G, x0: number, y0: number, w: number, h: number, color: string, alpha: number, cell = 8) => {
  g.save();
  g.beginPath(); g.rect(x0, y0, w, h); g.clip();
  g.globalAlpha = alpha;
  g.fillStyle = color;
  for (let y = y0; y <= y0 + h + 0.01; y += cell) for (let x = x0; x <= x0 + w + 0.01; x += cell) {
    const cx = x + cell / 2, cy = y + cell / 2, a = cell * 0.22, b = cell * 0.12;
    g.beginPath();
    g.moveTo(cx - a, cy); g.quadraticCurveTo(cx, cy - b, cx + a, cy); g.quadraticCurveTo(cx, cy + b, cx - a, cy);
    g.moveTo(cx, cy - a); g.quadraticCurveTo(cx + b, cy, cx, cy + a); g.quadraticCurveTo(cx - b, cy, cx, cy - a);
    g.fill();
    g.beginPath(); g.arc(x, y, cell * 0.07, 0, Math.PI * 2); g.fill();
  }
  g.restore();
};

/** the Likhi range between the two crowns, in a gold ring (drawn for r = 16 around 31.5, 42 and scaled) */
const medallion = (g: G, cx: number, cy: number, r: number) => {
  const s = r / 16;
  const P = (x: number, y: number): [number, number] => [cx + (x - 31.5) * s, cy + (y - 42) * s];
  const poly = (pts: [number, number][], fill: string) => {
    g.beginPath();
    pts.forEach(([x, y], i) => { const [a, b] = P(x, y); if (i) g.lineTo(a, b); else g.moveTo(a, b); });
    g.closePath(); g.fillStyle = fill; g.fill();
  };
  circle(g, cx, cy, r, NIGHT, GOLD, 0.55 * s);
  g.save(); g.setLineDash([0.7 * s, 0.9 * s]); circle(g, cx, cy, r - 2.2 * s, undefined, GOLD, 0.25 * s); g.restore();
  poly([[18.4, 50], [23.6, 43.6], [26.6, 46.2], [31.5, 38.8], [36.6, 45.6], [39.4, 43.2], [44.6, 50]], GOLD);
  poly([[29.9, 41.2], [31.5, 38.8], [33.2, 41.1], [32.3, 40.6], [31.5, 41.7], [30.7, 40.6]], GOLD_L);
  g.save();
  g.setLineDash([1.2 * s, 1 * s]);
  g.beginPath(); g.moveTo(...P(20.8, 52.8)); g.lineTo(...P(42.2, 52.8)); g.strokeStyle = GOLD; g.lineWidth = 0.4 * s; g.lineCap = 'round'; g.stroke();
  g.restore();
  icon(g, 'crown', ...P(22, 31), 7.2 * s, GOLD_L, 1.8);
  icon(g, 'crown', ...P(33.8, 31), 7.2 * s, GOLD_L, 1.8);
};

// ---------- the cards, 63 × 88 mm, each drawn from its top-left corner ----------
const FI = 2;
const frame = (g: G, color: string, band: number, bandColor = color) => {
  g.fillStyle = bandColor;
  box(g, FI, FI, 63 - 2 * FI, band - FI, [2.4, 2.4, 0, 0]); g.fill();
  g.strokeStyle = color; g.lineWidth = 0.8;
  box(g, FI, FI, 63 - 2 * FI, 88 - 2 * FI, 2.4); g.stroke();
};

const cardFront = (g: G, c: TCard) => {
  const K = KIND_INFO[c.k];
  g.fillStyle = K.tint; g.fillRect(0, 0, 63, 88);
  rosettes(g, 4, 15, 55, 56, K.color, 0.07, 9);
  g.save(); g.globalAlpha = 0.13; g.fillStyle = K.color; box(g, FI, 73.6, 63 - 2 * FI, 88 - FI - 73.6, [0, 0, 2.4, 2.4]); g.fill(); g.restore();
  hline(g, FI, 63 - FI, 73.6, K.color, 0.3);
  frame(g, K.color, 13.5);
  circle(g, 31.5, 31.4, 13.4, '#fffaf0', K.color, 0.7);
  g.save(); g.globalAlpha = 0.75; g.setLineDash([0.7, 0.9]); circle(g, 31.5, 31.4, 11.6, undefined, K.color, 0.25); g.restore();
  icon(g, iconOf(c), 23, 22.9, 17, K.color, 1.55);
  text(g, K.name, 5.6, 7.9, font(900, 8.6, SANS), '#fffaf0');
  if (c.v > 0) {
    circle(g, 54.2, 7.75, 4.3, '#fffaf0');
    text(g, String(c.v), 54.2, 7.95, font(900, 15, SANS), K.color, 'center');
  }
  fit(g, c.n, 31.5, 51.9, 54, 800, 12.6, INK);
  text(g, subOf(c), 31.5, 57.7, font(700, 8.6), K.color, 'center');
  para(g, c.note, 5.4, 60.6, 52.2, { pt: 8, lh: 1.25, color: '#5b4a3c', align: 'center' });
  const ruleH = para(g, K.rule, 5, 0, 53, { pt: 7.8, lh: 1.22, draw: false });
  para(g, K.rule, 5, 79.8 - ruleH / 2, 53, { pt: 7.8, lh: 1.22, color: INK, weight: 700, align: 'center' });
};

const cardBack = (g: G) => {
  g.fillStyle = NIGHT; g.fillRect(0, 0, 63, 88);
  rosettes(g, 2.6, 2.6, 57.8, 82.8, GOLD, 0.13, 8);
  g.strokeStyle = GOLD; g.lineWidth = 0.45; box(g, 4.6, 4.6, 53.8, 78.8, 1.6); g.stroke();
  text(g, aso(TITLE), 31.5, 12.4, font(900, 10.2, SANS), GOLD, 'center');
  medallion(g, 31.5, 41, 16);
  text(g, 'ლიხის შეხვედრა', 31.5, 65.2, font(800, 13), GOLD_L, 'center');
  g.save(); g.globalAlpha = 0.85; text(g, `${CAPITALS[0]} · ${CAPITALS[1]}`, 31.5, 71, font(400, 9.4), GOLD_L, 'center'); g.restore();
};

/** an aid card: paper, a coloured head band with its title */
const aid = (g: G, head: string, color: string) => {
  g.fillStyle = PAPER; g.fillRect(0, 0, 63, 88);
  frame(g, color, 13);
  fit(g, head, 31.5, 7.6, 54, 800, 11, '#fbf3dc');
};
/** numbered steps with **bold** leads; returns the y under them */
const steps = (g: G, list: string[], y: number, { pt = 8.4, gap = 1.5, x = 5.6, w = 51.8 } = {}) => {
  list.forEach((s, i) => {
    circle(g, x + 1.9, y + 1.9, 1.9, WINE);
    text(g, String(i + 1), x + 1.9, y + 2, font(800, 6.6, SANS), '#fffaf0', 'center');
    y += para(g, s, x + 5, y, w - 5, { pt, lh: 1.25, color: INK }) + gap;
  });
  return y;
};

const SHORT: Record<TKind, string> = {
  tsikhe: 'რამდენიც აწერია (1–3)',
  lashkari: `ძლიერს ${ARMY_PTS}, ტოლს ${ARMY_TIE}-${ARMY_TIE}`,
  ghvino: `ვაზი + ჭურჭელი = ${WINE_PTS}`,
  tsigni: '1 ყოველ სხვა სახეზე',
  elchi: '0 — ბარათს კი იბირებს',
};
const kindChip = (g: G, k: TKind, x: number, y: number, r = 2.3) => {
  circle(g, x, y, r, KIND_INFO[k].color);
  icon(g, KIND_ICON[k], x - r * 0.68, y - r * 0.68, r * 1.36, '#fff', 2.4);
};

const throneFront = (g: G, side: number) => {
  aid(g, side ? 'აღმოსავლეთის ტახტი' : 'დასავლეთის ტახტი', SIDE_COLOR[side]);
  circle(g, 31.5, 25.6, 9.6, SIDE_COLOR[side], GOLD, 0.7);
  g.save(); g.setLineDash([0.7, 0.9]); circle(g, 31.5, 25.6, 8.2, undefined, GOLD_L, 0.3); g.restore();
  icon(g, 'crown', 25.8, 19.6, 11.4, GOLD_L, 1.9);
  para(g, `დედაქალაქი — **${CAPITALS[side]}**`, 4, 37.4, 55, { pt: 9.2, align: 'center', color: INK, bold: SIDE_COLOR[side] });
  text(g, 'ქულები ბოლოს', 31.5, 45.6, font(700, 7.6, SANS), MUTED, 'center');
  KINDS.forEach((k, i) => {
    const y = 50.6 + i * 5.6;
    kindChip(g, k, 8, y);
    text(g, KIND_INFO[k].name, 11.6, y + 0.1, font(700, 8.6), KIND_INFO[k].color);
    g.font = font(700, 8.6);
    const x = 11.6 + g.measureText(KIND_INFO[k].name).width + 1.6;
    fit(g, SHORT[k], x, y + 0.1, 58.4 - x, 400, 8.2, INK, 'left');
  });
  hline(g, 6, 57, 78.4, GOLD, 0.3);
  fit(g, 'ტოლობა: ძლიერი ლაშქარი, მერე ციხეები', 31.5, 82, 52, 700, 7.6, WINE);
};
const MEETING = [
  `**ძღვენი.** გამყოფი ${OFFER} ბარათს შლის.`,
  '**გაყოფა.** ორ წილად — ორივეში ერთი მაინც.',
  '**არჩევა.** მეორე მეფე წილს ირჩევს; დანარჩენი გამყოფისაა.',
  '**ელჩები.** თითო ელჩი მეორე წილიდან ერთ ბარათს გადმოიბირებს — ჯერ ამრჩევისა.',
  '**კარი.** ბარათები კარზე; ლიხის ქვა მეორეს გადაეცი.',
];
const throneBack = (g: G, side: number) => {
  aid(g, 'ერთი შეხვედრა', SIDE_COLOR[side]);
  steps(g, MEETING, 17.4);
  hline(g, 6, 57, 78.4, GOLD, 0.3);
  fit(g, `${ROUNDS} შეხვედრა · ${ROUNDS * OFFER} ბარათი · ${IN_BOX} ყუთში რჩება`, 31.5, 82, 52, 700, 7.6, WINE);
};
const stoneFront = (g: G) => {
  aid(g, 'ლიხის ქვა', NIGHT);
  medallion(g, 31.5, 29.4, 12.6);
  let y = 46;
  y += para(g, 'ვისთანაც ეს ბარათი დევს, **ის ყოფს** ძღვენს.', 5, y, 53, { pt: 10, lh: 1.25, align: 'center', color: INK }) + 2.4;
  y += para(g, 'შეხვედრის ბოლოს ქვა მეორე მეფეს გადაეცი — ყოფა რიგრიგობითაა.', 5, y, 53, { pt: 8.6, lh: 1.25, align: 'center', color: INK }) + 2.4;
  para(g, `${ROUNDS} შეხვედრაში ყოველი მეფე ${NUM_WORD[HALF] ?? `${HALF}-ჯერ`} ყოფს და ${NUM_WORD[HALF] ?? `${HALF}-ჯერ`} ირჩევს.`, 5, y, 53, { pt: 8.6, lh: 1.25, align: 'center', color: MUTED });
};
const stoneBack = (g: G) => {
  const E = KIND_INFO.elchi;
  aid(g, 'ელჩების რიგი', E.color);
  circle(g, 31.5, 25, 8.4, E.color, GOLD, 0.6);
  icon(g, 'handshake', 26, 19.5, 11, '#fffaf0', 1.9);
  const y = steps(g, ['**ჯერ ამრჩევის ელჩები:** თითო ელჩი გამყოფის წილიდან ერთ ბარათს გადმოიბირებს.', '**მერე გამყოფის ელჩები:** თითო ელჩი ამრჩევის წილიდან ერთ ბარათს.'], 37.6);
  para(g, 'ელჩი ელჩს ვერ წაიყვანს. თუ მეორე წილში მხოლოდ ელჩებია, ელჩი ხელცარიელი რჩება.', 5.6, y + 1.4, 51.8, { pt: 8.2, lh: 1.25, color: MUTED });
};

// ---------- the pages ----------
interface Page { draw: (g: G) => void }
const stripe = (g: G, right: string) => {
  g.fillStyle = WINE; g.fillRect(0, 0, PW, 10);
  text(g, aso('საგანძურის თამაშები'), 6, 5.1, font(900, 9.6, SANS), '#f0d9a0');
  g.font = font(900, 9.6, SANS);
  text(g, '№4', 6 + g.measureText(aso('საგანძურის თამაშები')).width + 4, 5.1, font(700, 9.6), '#f0d9a0');
  text(g, right, PW - 6, 5.1, font(400, 9.6), PAPER, 'right');
};
const footer = (g: G, left: string, n: number) => {
  hline(g, 6, PW - 6, PH - 7.2, LINE, 0.2);
  text(g, left, 6, PH - 4.2, font(400, 8), MUTED);
  text(g, `${TITLE} · ფურცელი ${n}`, PW - 6, PH - 4.2, font(400, 8), MUTED, 'right');
};

/** a rules block: a heading, a kind's heading, a paragraph or a numbered item; drawn at (x, y) in a column `w` wide, returns
 *  its height */
type Block = { h: string } | { kind: TKind } | { p: string; pt?: number } | { li: string; n: number };
const isHead = (b: Block) => 'h' in b || 'kind' in b;
const block = (g: G, b: Block, x: number, y: number, w: number, draw: boolean) => {
  if ('h' in b) {
    if (draw) text(g, b.h, x, y + 4.4, font(800, 11.5), WINE);
    return 7.4;
  }
  if ('kind' in b) {
    if (draw) {
      kindChip(g, b.kind, x + 2.4, y + 4.2, 2.4);
      text(g, `${KIND_INFO[b.kind].name} · ${count(b.kind)}`, x + 6.4, y + 4.4, font(800, 11), KIND_INFO[b.kind].color);
    }
    return 7.8;
  }
  if ('p' in b) return para(g, b.p, x, y, w, { pt: b.pt ?? 10, draw }) + (b.pt ? 0.9 : 1.8);
  if (draw) {
    circle(g, x + 2.2, y + 2.3, 2.2, WINE);
    text(g, String(b.n), x + 2.2, y + 2.4, font(800, 7.6, SANS), '#fffaf0', 'center');
  }
  return para(g, b.li, x + 6, y, w - 6, { pt: 10, draw }) + 1.8;
};
/** the blocks in two balanced columns from `y` (a heading never ends a column); returns the y under the longer one */
const columns = (g: G, list: Block[], y: number, colW = 87, gap = 4.24) => {
  const hs = list.map(b => block(g, b, 0, 0, colW, false));
  const total = hs.reduce((a, b) => a + b, 0);
  let best = 1, bestH = Infinity, run = 0;
  for (let k = 1; k < list.length; k++) {
    run += hs[k - 1];
    if (isHead(list[k - 1])) continue;
    const h = Math.max(run, total - run);
    if (h < bestH) { bestH = h; best = k; }
  }
  const xs = [6, 6 + colW + gap];
  let cy = y, col = 0;
  list.forEach((b, i) => {
    if (i === best) { col = 1; cy = y; }
    cy += block(g, b, xs[col], cy, colW, true);
  });
  return y + bestH;
};

// the meeting of the example: five gifts, two shares, the chooser's envoy takes a castle
const byName = (n: string) => {
  const c = CARDS.find(x => x.n === n);
  if (!c) throw new Error(`takhti print: no card ${n}`);
  return c;
};
const chipW = (g: G, c: TCard) => { g.font = font(700, 8.6); return 7.4 + g.measureText(c.n + (c.v ? ` ${c.v}` : '')).width + 2.2; };
const chip = (g: G, c: TCard, x: number, y: number) => {
  const K = KIND_INFO[c.k], w = chipW(g, c);
  g.fillStyle = K.tint; box(g, x, y, w, 6.4, 3.2); g.fill();
  g.strokeStyle = K.color; g.lineWidth = 0.25; g.stroke();
  circle(g, x + 3.3, y + 3.2, 2.35, K.color);
  icon(g, iconOf(c), x + 3.3 - 1.6, y + 3.2 - 1.6, 3.2, '#fff', 2.4);
  text(g, c.n, x + 6.6, y + 3.3, font(700, 8.6), INK);
  if (c.v) { g.font = font(700, 8.6); text(g, ` ${c.v}`, x + 6.6 + g.measureText(c.n).width, y + 3.3, font(800, 8.6), K.color); }
  return w;
};
const chipRow = (g: G, cards: TCard[], x: number, y: number) => cards.reduce((cx, c) => cx + chip(g, c, cx, y) + 1.6, x);

const meetingFigure = (g: G, x: number, y: number, w: number) => {
  const gifts = ['ნარიყალა', 'მონასპა', 'რქაწითელი', 'ქვევრი', 'ტაოს ელჩი'].map(byName);
  const [castle, warrior, vine, vessel, envoy] = gifts;
  const a = [castle, warrior], b = [vine, vessel, envoy];
  const won = scoreOf([[...b, castle].map(c => c.id), []], 0);
  const h = 74;
  g.fillStyle = PAPER; box(g, x, y, w, h, 2.4); g.fill();
  g.strokeStyle = GOLD; g.lineWidth = 0.35; g.stroke();
  text(g, 'ერთი შეხვედრა, მაგალითად', x + 5, y + 6, font(800, 11), WINE);
  const row = (n: number, yy: number) => {
    circle(g, x + 7.2, yy + 3.2, 2.4, WINE);
    text(g, String(n), x + 7.2, yy + 3.3, font(800, 8, SANS), '#fffaf0', 'center');
  };
  const lx = x + 12;
  let yy = y + 11;
  row(1, yy);
  g.font = font(700, 10);
  text(g, 'ძღვენი:', lx, yy + 3.3, font(700, 10), WINE);
  chipRow(g, gifts, lx + g.measureText('ძღვენი:').width + 3, yy);
  yy += 10;
  row(2, yy);
  text(g, 'გაყოფა:', lx, yy + 3.3, font(700, 10), WINE);
  let cx = lx + g.measureText('გაყოფა:').width + 3;
  text(g, 'ა', cx, yy + 3.3, font(800, 10), BROWN);
  cx = chipRow(g, a, cx + 4, yy) + 3;
  text(g, 'ბ', cx, yy + 3.3, font(800, 10), BROWN);
  chipRow(g, b, cx + 4, yy);
  yy += 10;
  row(3, yy);
  para(g, `**არჩევა.** ამრჩევი **ბ**-ს იღებს — მასში ელჩია. ელჩი **ა**-დან ${castle.n}ს გადმოიბირებს (ელჩს ელჩი ვერ წაიყვანდა).`, lx, yy + 0.4, w - 17, { pt: 10 });
  yy += 13;
  row(4, yy);
  text(g, 'კარზე:', lx, yy + 3.3, font(700, 10), WINE);
  cx = chipRow(g, [...b, castle], lx + g.measureText('კარზე:').width + 3, yy);
  yy += 8.6;
  para(g, `ამრჩევს ერგო ღვინო (${won.wine}) და ციხე (${won.castle}) — ${won.total} ქულა; გამყოფს — მხოლოდ ${warrior.n} (ძალა ${warrior.v}).`, lx, yy, w - 17, { pt: 10 });
  yy += 6.4;
  para(g, '**რჩევა:** ელჩი წილს ერთი ბარათით ზრდის — გაყოფისას ის არ დაგავიწყდეს.', lx, yy + 1.4, w - 17, { pt: 10, color: MUTED });
  return y + h;
};

const LEAD = `„ორი ტახტი“ ორი მეფის თამაშია — **დასავლეთისა**, ქუთაისში, და **აღმოსავლეთისა**, თბილისში. ისინი ლიხის ქედზე ${ROUNDS}-ჯერ ხვდებიან და ქვეყნის ძღვენს ინაწილებენ: **ერთი ყოფს, მეორე ირჩევს.** ციხეები, ლაშქარი, ვაზი და ქვევრი, წიგნები და ელჩები — ვისი კარიც უფრო დიდებული გამოვა, იმის ქალაქში დადგება ერთიანი საქართველოს ტახტი.`;
const count = (k: TKind) => CARDS.filter(c => c.k === k).length;
const vines = CARDS.filter(c => c.w === 'vazi').length, vessels = CARDS.filter(c => c.w === 'chuch').length;
const RULES_1: Block[] = [
  { h: 'ყუთში' },
  { p: `${CARDS.length} ბარათი: ${count('tsikhe')} ციხე, ${count('lashkari')} ლაშქარი, ${count('ghvino')} ღვინისა (${vines} ვაზი და ${vessels} ჭურჭელი), ${count('tsigni')} წიგნი, ${count('elchi')} ელჩი. ასევე ორი ტახტის ბარათი, „ლიხის ქვა“ და დათვლის ფურცლები. ფანქარი თქვენ მოიტანეთ.` },
  { h: 'მომზადება' },
  { li: `**ტახტები.** წილი იყარეთ, ვინ იქნება დასავლეთი (${CAPITALS[0]}) და ვინ — აღმოსავლეთი (${CAPITALS[1]}). თითომ თავისი ტახტის ბარათი აიღოს — მასზე ქულები წერია.`, n: 1 },
  { li: `**დასტა.** ${CARDS.length} ბარათი აურიეთ. ${IN_BOX} უნახავად ყუთში ჩადეთ — ამ თამაშში ისინი არ მონაწილეობს. ${ROUNDS * OFFER} პირქვე დასტად შუაში დადეთ.`, n: 2 },
  { li: '**ლიხის ქვა.** წილი იყარეთ, ვინ ყოფს პირველად — მან „ლიხის ქვა“ წინ დაიდოს.', n: 3 },
  { h: `შეხვედრა — სულ ${ROUNDS}-ჯერ` },
  { li: `**ძღვენი.** გამყოფი — ვისაც ლიხის ქვა უდევს — დასტიდან ${OFFER} ბარათს პირაღმა შლის.`, n: 1 },
  { li: `**გაყოფა.** გამყოფი ბარათებს ორ წილად (ორ გროვად) ყოფს, როგორც უნდა: 1 და ${OFFER - 1}, ან 2 და ${OFFER - 2}. ორივეში ერთი ბარათი მაინც უნდა იყოს.`, n: 2 },
  { li: '**არჩევა.** მეორე მეფე — ამრჩევი — ერთ წილს იღებს. მეორე წილი გამყოფს რჩება.', n: 3 },
  { li: '**ელჩები.** ვისაც ახალ წილში ელჩი აქვს, თითო ელჩზე მეორე წილიდან ერთ ბარათს თავისთან გადმოიბირებს — ელჩს ვერა. ჯერ ამრჩევის ელჩები, მერე გამყოფის. თუ მეორე წილში ელჩების გარდა აღარაფერია, ელჩი ხელცარიელი რჩება.', n: 4 },
  { li: `**კარი.** თითომ თავისი ბარათები თავის კარზე — მაგიდაზე თავის წინ, პირაღმა, სახეებად — დაალაგოს. ლიხის ქვა მეორე მეფეს გადაეცით: შემდეგ შეხვედრაზე ის ყოფს. ასე ყოველი მეფე ${NUM_WORD[HALF] ?? `${HALF}-ჯერ`} ყოფს და ${NUM_WORD[HALF] ?? `${HALF}-ჯერ`} ირჩევს.`, n: 5 },
  { h: 'დასასრული' },
  { p: `${ROUNDS} შეხვედრის მერე დასტა ცარიელია. ორივე კარი დაითვალეთ — როგორ, მეორე გვერდზე წერია.` },
];

const rules1: Page = {
  draw: g => {
    stripe(g, 'წესები · 1');
    text(g, aso(TITLE), 6, 16.6, font(900, 12, SANS), GOLD_D);
    text(g, TITLE, 6, 25.6, font(800, 26), WINE);
    text(g, '2 მოთამაშე ან 2 გუნდი · 7 წლიდან · 20–30 წუთი', 6, 33.4, font(400, 10.5), MUTED);
    let y = 37.6;
    y += para(g, LEAD, 6, y, PW - 12, { pt: 11 }) + 3.4;
    y = columns(g, RULES_1, y) + 3;
    meetingFigure(g, 6, y, PW - 12);
    footer(g, 'ბეჭდვა: ორმხრივად, გრძელი კიდით, 100%-ზე — ბარათი 63 × 88 მმ. ბარათები — სქელ ქაღალდზე.', 1);
  },
};

// the count and its example (two whole courts of twenty, two cards in the box)
const COURTS = [
  ['ნარიყალა', 'უქიმერიონი', 'ანანური', 'სურამი', 'შატილი', 'მუცო', 'მშვილდოსანი', 'შუბოსანი', 'მხედარი', 'მონასპა', 'ჯავშნოსანი', 'რქაწითელი', 'საფერავი', 'ცოლიკოური', 'ქვევრი', 'ჭური', 'ვეფხისტყაოსანი', 'ამირანდარეჯანიანი', 'ტაოს ელჩი', 'კლარჯეთის ელჩი'],
  ['გონიო', 'ხერთვისი', 'შორაპანი', 'ბირთვისი', 'თმოგვი', 'მეფარე', 'მეციხოვნე', 'მთიელი მოლაშქრე', 'ამირსპასალარი', 'ოჯალეში', 'ალექსანდროული', 'ხელადა', 'ყანწი', 'აზარფეშა', 'ვისრამიანი', 'თამარიანი', 'აბდულმესიანი', 'ქართლის ცხოვრება', 'ჰერეთის ელჩი', 'სვანეთის ელჩი'],
].map(list => list.map(n => byName(n).id));
const SIDE_NAME = ['დასავლეთი', 'აღმოსავლეთი'];

const tableRow = (g: G, cells: string[], xs: number[], ws: number[], y: number, o: Para = {}) => {
  const h = Math.max(...cells.map((c, i) => para(g, c, 0, 0, ws[i], { ...o, draw: false })));
  cells.forEach((c, i) => para(g, c, xs[i], y + 1.4, ws[i], o));
  return h + 2.8;
};

const SCORE_ROWS: { k: TKind; n: string; t: string }[] = [
  { k: 'tsikhe', n: `${count('tsikhe')}`, t: 'იმდენი ქულა, რამდენიც აწერია: 1, 2 ან 3.' },
  { k: 'lashkari', n: `${count('lashkari')}`, t: `მეომრების ძალა (1–3) შეკრიბე. უფრო ძლიერ ლაშქარს — **${ARMY_PTS} ქულა**, ტოლს — ${ARMY_TIE}-${ARMY_TIE}; ორივეს 0 თუ აქვს — არავის.` },
  { k: 'ghvino', n: `${vines} ვაზი, ${vessels} ჭურჭელი`, t: `ვაზი და ჭურჭელი ერთად ერთი ღვინოა — **${WINE_PTS} ქულა.** 2 ვაზს და 1 ქვევრს — 1 ღვინო; მარტო ვაზი ან მარტო ჭურჭელი — 0.` },
  { k: 'tsigni', n: `${count('tsigni')}`, t: 'თითო წიგნი იმდენ ქულას იძლევა, რამდენი **სხვა სახეც** გაქვს — ციხე, ლაშქარი, ღვინო, ელჩი (თითო ბარათიც კმარა): 0-დან 4-მდე.' },
  { k: 'elchi', n: `${count('elchi')}`, t: '0 ქულა. სამაგიეროდ ბარათს იბირებს და წიგნისთვის სახედ ითვლება.' },
];
const kindsLine = (ids: number[]) => {
  const n = (f: (c: TCard) => boolean) => ids.filter(id => f(CARDS[id])).length;
  return [`${n(c => c.k === 'tsikhe')} ციხე`, `${n(c => c.k === 'lashkari')} მეომარი`, `${n(c => c.w === 'vazi')} ვაზი`, `${n(c => c.w === 'chuch')} ჭურჭელი`, `${n(c => c.k === 'tsigni')} წიგნი`, `${n(c => c.k === 'elchi')} ელჩი`].join(', ');
};

const RULES_2: Block[] = [
  { h: 'რჩევები' },
  { p: '**გამყოფს:** ისე გაყავი, რომ ორივე წილი ერთნაირად გინდოდეს — რომელსაც არ უნდა აირჩევს მეორე, შენ ცუდი არ დაგრჩება.' },
  { p: '**ამრჩევს:** დათვალე, რას მოგცემს წილი და რას — მეორეს. ზოგჯერ ის წილი სჯობს, რომელიც მეტოქეს ყველაზე მეტად სჭირდება.' },
  { p: `**ღვინო** წყვილად ითვლება, **ლაშქარი** — ან ${ARMY_PTS}, ან არაფერი. ${IN_BOX} ბარათი ყუთშია: ყველაფერი ბოლომდე არ გამოჩნდება.` },
  { h: 'გუნდებით' },
  { p: 'კლასი ორ გუნდად — დასავლეთი და აღმოსავლეთი. გუნდი თათბირობს, ერთი წევრი კი ყოფს ან ირჩევს — ყოველ შეხვედრაზე სხვა.' },
  { h: 'პატარებთან' },
  { p: `ელჩები ყუთში დატოვეთ და ყოველ შეხვედრაზე 4 ბარათი გაშალეთ (1 და 3, ან 2 და 2). ${ROUNDS} შეხვედრაში ${ROUNDS * 4} ბარათი გაიშლება, ${CARDS.length - count('elchi') - ROUNDS * 4} ყუთში რჩება.` },
];

// behind the score boxes: the Likhi story, every card with its note, the phone, whose game it is
const LIST: Block[] = KINDS.flatMap((k): Block[] => [
  { kind: k },
  ...CARDS.filter(c => c.k === k).map(c => ({ p: `**${c.n}${c.v ? ` ${c.v}` : ''}**${c.k === 'ghvino' ? ` (${c.w === 'vazi' ? 'ვაზი' : 'ჭურჭელი'})` : ''} — ${c.note}`, pt: 9.2 })),
]);
const listPage: Page = {
  draw: g => {
    stripe(g, 'ბარათები და ამბავი');
    text(g, 'ლიხის ამბავი', 6, 18.4, font(800, 16), WINE);
    let y = 23.4;
    y += para(g, 'ლიხის ქედი საქართველოს დასავლეთად და აღმოსავლეთად ყოფს. 1008 წელს ბაგრატ III-მ ორივე მხარე ერთ სამეფოდ შეკრა — ტახტი ქუთაისში იდგა; 1122 წელს დავით აღმაშენებელმა თბილისი გაათავისუფლა და დედაქალაქი იქ გადაიტანა. ჩვენს თამაშში ტახტი იქ დგება, ვისი კარიც უფრო დიდებულია.', 6, y, PW - 12, { pt: 10 }) + 4;
    text(g, `${CARDS.length} ბარათი`, 6, y + 4, font(800, 13), WINE);
    y = columns(g, LIST, y + 9) + 3;
    y += para(g, '**ტელეფონით.** საგანძურის სკოლის აპში — „თამაშები“ → „ორი ტახტი“: ჰიბრიდული — ერთი ტელეფონი ორ მეფეს შორის ბარათებს შლის და ითვლის; ონლაინ — ორივე თავის ტელეფონზე თამაშობს, კლასს ყურება შეუძლია.', 6, y, PW - 12, { pt: 9.6 }) + 2;
    para(g, '**ჩვენი თამაში.** „ერთი ყოფს, მეორე ირჩევს“ ძველი სამართლიანი წესია; ბარათები, სახელები და ქულები საგანძურის სკოლისაა. ბარათების განმარტებები და ეს ამბავი ჯერ მასწავლებელს არ შეუმოწმებია.', 6, y, PW - 12, { pt: 9.6, color: MUTED });
    footer(g, 'სკოლის შიდა, არაკომერციული გამოყენებისთვის.', SHEET_COUNT + 2);
  },
};

const rules2: Page = {
  draw: g => {
    stripe(g, 'წესები · 2');
    text(g, 'დათვლა', 6, 19, font(800, 20), WINE);
    para(g, `${ROUNDS} შეხვედრის მერე ორივე კარს ითვლით; ქულებს დათვლის ფურცელზე წერთ.`, 6, 25.4, PW - 12, { pt: 10, color: MUTED });
    // the kinds' table
    let y = 32.4;
    const xs = [6, 40, 70], ws = [32, 28, PW - 6 - 70];
    hline(g, 6, PW - 6, y, WINE, 0.35);
    y += tableRow(g, ['**სახე**', '**რამდენია**', '**ქულა**'], xs, ws, y, { pt: 9.6 });
    for (const r of SCORE_ROWS) {
      hline(g, 6, PW - 6, y);
      const h = tableRow(g, ['', r.n, r.t], xs, ws, y, { pt: 9.6 });
      kindChip(g, r.k, xs[0] + 2.4, y + 3.6);
      text(g, KIND_INFO[r.k].name, xs[0] + 6.2, y + 3.7, font(700, 10), KIND_INFO[r.k].color);
      y += h;
    }
    hline(g, 6, PW - 6, y, WINE, 0.35);
    y += 4;
    text(g, 'ვინ იგებს', 6, y + 3.4, font(800, 11.5), WINE);
    y += 7;
    y += para(g, 'ვისაც მეტი ქულა აქვს, იმის ქალაქში დგება ერთიანი საქართველოს ტახტი. ქულა ტოლია? — იგებს უფრო ძლიერი ლაშქარი; ისიც ტოლია? — ციხეების მეტი ქულა. ესეც ტოლია? — ორი ტახტი ერთად დგას.', 6, y, PW - 12, { pt: 10 }) + 3;
    // the example: two whole courts
    const s = [scoreOf(COURTS, 0), scoreOf(COURTS, 1)];
    const win = winnersBy(COURTS);
    text(g, 'მაგალითი', 6, y + 3.4, font(800, 11.5), WINE);
    y += 7;
    const ex = [6, 40, 115], ew = [32, 73, PW - 6 - 115];
    hline(g, 6, PW - 6, y, WINE, 0.35);
    const hy = y;
    y += tableRow(g, ['', `**${SIDE_NAME[0]}** · ${CAPITALS[0]}`, `**${SIDE_NAME[1]}** · ${CAPITALS[1]}`], ex, ew, y, { pt: 9.6 });
    circle(g, ex[1] - 1.6, hy + 3.5, 1.1, SIDE_COLOR[0]);
    circle(g, ex[2] - 1.6, hy + 3.5, 1.1, SIDE_COLOR[1]);
    const rows: string[][] = [
      ['კარზე', kindsLine(COURTS[0]), kindsLine(COURTS[1])],
      ['ციხეები', `${s[0].castle}`, `${s[1].castle}`],
      ['ლაშქარი', `ძალა ${s[0].strength} → ${s[0].army}`, `ძალა ${s[1].strength} → ${s[1].army}`],
      ['ღვინო', `${s[0].pairs} ღვინო → ${s[0].wine}`, `${s[1].pairs} ღვინო → ${s[1].wine}`],
      ['წიგნები', `${s[0].books} წიგნი × ${s[0].perBook} სახე → ${s[0].bookPts}`, `${s[1].books} წიგნი × ${s[1].perBook} სახე → ${s[1].bookPts}`],
      ['ელჩები', `${s[0].envoys} → 0`, `${s[1].envoys} → 0`],
    ];
    for (const r of rows) { hline(g, 6, PW - 6, y); y += tableRow(g, r, ex, ew, y, { pt: 9.6 }); }
    hline(g, 6, PW - 6, y);
    y += tableRow(g, ['**სულ**', `**${s[0].total}**`, `**${s[1].total}**`], ex, ew, y, { pt: 10.4 });
    hline(g, 6, PW - 6, y, WINE, 0.35);
    y += 2.4;
    let why = '';
    if (win.length === 1) {
      const w = win[0], l = 1 - w, d = s[w].total - s[l].total;
      why = `**${SIDE_NAME[w]} ${d} ქულით იგებს** — ტახტი ${w ? 'თბილისში' : 'ქუთაისში'} დგება.`;
      // what one warrior more on the other side would have done
      const weak = CARDS.filter(c => c.k === 'lashkari' && COURTS[w].includes(c.id)).sort((a, b) => a.v - b.v)[0];
      if (weak) {
        const moved = [COURTS[0].filter(id => id !== weak.id), COURTS[1].filter(id => id !== weak.id)];
        moved[l] = [...moved[l], weak.id];
        const t = [scoreOf(moved, 0), scoreOf(moved, 1)], wb = winnersBy(moved);
        if (wb.length === 1 && wb[0] === l) why += ` ლაშქარმა გადაწყვიტა: ერთი ${weak.n} ${SIDE_NAME[l]}ს რომ წაეღო, ძალა ${t[0].strength}:${t[1].strength} იქნებოდა და ${SIDE_NAME[l]} ${t[l].total}:${t[w].total} მოიგებდა.`;
      }
    } else why = '**ტოლია** — ორი ტახტი ერთად დგას.';
    y += para(g, why, 6, y, PW - 12, { pt: 10 }) + 4;
    columns(g, RULES_2, y);
    footer(g, `ბარათების სია და ლიხის ამბავი — ${SHEET_COUNT + 2}-ე ფურცლის მეორე მხარეს.`, 1);
  },
};

// ---------- card sheets: nine a page, the backs mirrored for long-edge duplex ----------
const GX = (PW - 189) / 2, GY = (PH - 264) / 2;
type Face = (g: G) => void;
const FRONTS: Face[] = [...CARDS.map(c => (g: G) => cardFront(g, c)), g => throneFront(g, 0), g => throneFront(g, 1), stoneFront];
const BACKS: Face[] = [...CARDS.map(() => cardBack), g => throneBack(g, 0), g => throneBack(g, 1), stoneBack];
const SHEET_COUNT = Math.ceil(FRONTS.length / 9);

const cardPage = (faces: Face[], back: boolean, label: string): Page => ({
  draw: g => {
    text(g, label, GX, GY / 2, font(400, 8), MUTED);
    faces.forEach((face, i) => {
      const r = Math.floor(i / 3), c = back ? 2 - (i % 3) : i % 3;
      g.save();
      g.translate(GX + c * 63, GY + r * 88);
      g.beginPath(); g.rect(0, 0, 63, 88); g.clip();
      face(g);
      g.restore();
    });
    // the cut lines: the grid of the cards drawn
    const rows = Math.ceil(faces.length / 3);
    g.strokeStyle = '#9a8b7b'; g.lineWidth = 0.15;
    for (let r = 0; r <= rows; r++) { g.beginPath(); g.moveTo(GX, GY + r * 88); g.lineTo(GX + 189, GY + r * 88); g.stroke(); }
    for (let c = 0; c <= 3; c++) { g.beginPath(); g.moveTo(GX + c * 63, GY); g.lineTo(GX + c * 63, GY + rows * 88); g.stroke(); }
  },
});
const kindsOf = (from: number, to: number) => {
  const names = [...new Set(CARDS.slice(from, to).map(c => KIND_INFO[c.k].name))];
  return names.join(', ') + (to > CARDS.length ? ', ტახტები, ლიხის ქვა' : '');
};

// ---------- the score boxes: four a page ----------
const QW = PW / 2, QH = PH / 2;
const scoreBox = (g: G) => {
  const x0 = 7, w = QW - 14;
  text(g, aso(TITLE), x0, 9, font(900, 9, SANS), GOLD_D);
  text(g, 'დათვლის ფურცელი', x0 + w, 9, font(800, 11), WINE, 'right');
  const cx = [x0 + 40, x0 + 40 + (w - 40) / 2], cw = (w - 40) / 2;
  let y = 15;
  [0, 1].forEach(i => {
    circle(g, cx[i] + 3, y + 3.4, 2.4, SIDE_COLOR[i]);
    icon(g, 'crown', cx[i] + 3 - 1.6, y + 3.4 - 1.6, 3.2, GOLD_L, 2.4);
    text(g, CAPITALS[i], cx[i] + 6.6, y + 3.5, font(700, 9.4), SIDE_COLOR[i]);
  });
  y += 7.4;
  const rows: [string, string][] = [
    ['მეფე', ''],
    ['ციხეები', 'ქულების ჯამი'],
    ['ლაშქრის ძალა', 'მეომრების ჯამი'],
    ['ლაშქარი', `ძლიერს ${ARMY_PTS} · ტოლს ${ARMY_TIE}`],
    ['ღვინო', `წყვილი × ${WINE_PTS}`],
    ['წიგნები', 'წიგნი × სხვა სახე'],
    ['სულ', ''],
  ];
  rows.forEach(([a, b], i) => {
    const h = 11, last = i === rows.length - 1;
    hline(g, x0, x0 + w, y, last ? WINE : LINE, last ? 0.4 : 0.25);
    text(g, a, x0, y + (b ? 4 : h / 2), font(last ? 800 : 700, last ? 10.4 : 9.4), last ? WINE : INK);
    if (b) text(g, b, x0, y + 8, font(400, 7.6), MUTED);
    [0, 1].forEach(j => {
      g.strokeStyle = last ? WINE : '#bfae94'; g.lineWidth = last ? 0.4 : 0.25;
      box(g, cx[j] + 1, y + 1.6, cw - 2, h - 3.2, 1.4); g.stroke();
    });
    y += h;
  });
  hline(g, x0, x0 + w, y, WINE, 0.4);
  y += 6;
  text(g, 'შეხვედრა:', x0, y + 2.6, font(700, 9), INK);
  g.font = font(700, 9);
  const mx = x0 + g.measureText('შეხვედრა:').width + 2.6;
  const step = Math.min(6.4, (x0 + w - mx) / ROUNDS);
  for (let r = 0; r < ROUNDS; r++) {
    g.strokeStyle = '#bfae94'; g.lineWidth = 0.25; box(g, mx + r * step, y, step - 1.2, 5.2, 0.9); g.stroke();
    text(g, String(r + 1), mx + r * step + (step - 1.2) / 2, y + 2.7, font(400, 6.4), MUTED, 'center');
  }
  y += 10;
  text(g, 'ტახტი დადგა:', x0, y + 2.4, font(700, 9), INK);
  g.font = font(700, 9);
  let bx = x0 + g.measureText('ტახტი დადგა:').width + 3;
  for (const where of ['ქუთაისში', 'თბილისში']) {
    g.strokeStyle = BROWN; g.lineWidth = 0.3; box(g, bx, y + 0.4, 4, 4, 0.7); g.stroke();
    text(g, where, bx + 5.4, y + 2.5, font(400, 9), INK);
    g.font = font(400, 9);
    bx += 5.4 + g.measureText(where).width + 4;
  }
  y += 8.6;
  para(g, 'ტოლობისას იგებს ძლიერი ლაშქარი, მერე — ციხეების მეტი ქულა.', x0, y, w, { pt: 8, color: MUTED });
};
const scorePage = (n: number): Page => ({
  draw: g => {
    for (let q = 0; q < 4; q++) {
      g.save();
      g.translate((q % 2) * QW, Math.floor(q / 2) * QH);
      scoreBox(g);
      g.restore();
    }
    g.save();
    g.setLineDash([1.6, 1.4]);
    g.strokeStyle = '#9a8b7b'; g.lineWidth = 0.2;
    g.beginPath(); g.moveTo(QW, 0); g.lineTo(QW, PH); g.moveTo(0, QH); g.lineTo(PW, QH); g.stroke();
    g.restore();
    text(g, `ფურცელი ${n} · დათვლის ფურცლები — გაჭერი წყვეტილ ხაზებზე`, PW / 2, PH - 2.2, font(400, 7.4), MUTED, 'center');
  },
});

const PAGES: Page[] = [
  rules1,
  rules2,
  ...Array.from({ length: SHEET_COUNT }, (_, s) => {
    const from = s * 9, to = from + 9, label = `ფურცელი ${s + 2} · ${kindsOf(from, to)}`;
    return [cardPage(FRONTS.slice(from, to), false, label), cardPage(BACKS.slice(from, to), true, `${label} — ზურგი`)];
  }).flat(),
  scorePage(SHEET_COUNT + 2),
  listPage,
];
/** the kit's sheets (two-sided), for the hub's button */
export const TAKHTI_SHEETS = PAGES.length / 2;

const jpeg = (c: HTMLCanvasElement) => new Promise<PdfImage>((ok, fail) => c.toBlob(b => {
  if (!b) { fail(new Error('canvas')); return; }
  b.arrayBuffer().then(buf => ok({ jpeg: new Uint8Array(buf), w: c.width, h: c.height }), fail);
}, 'image/jpeg', 0.85));

/** the whole kit as one PDF, page by page (one canvas at a time — a phone's memory) */
export const takhtiPdf = async (): Promise<Blob> => {
  try {
    await Promise.all(['400 40px "Noto Serif Georgian"', '700 40px "Noto Serif Georgian"', '800 40px "Noto Serif Georgian"', '700 40px "Noto Sans Georgian"', '900 40px "Noto Sans Georgian"']
      .map(f => document.fonts.load(f, `ორი ტახტი ${aso('ორი ტახტი')}`)));
  } catch { /* the system's font draws it */ }
  const out: PdfImage[] = [];
  for (const p of PAGES) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;
    g.fillStyle = '#fff';
    g.fillRect(0, 0, W, H);
    g.scale(MM, MM);
    p.draw(g);
    out.push(await jpeg(c));
    c.width = 1;
    c.height = 1;
  }
  return buildPdf(out, TITLE);
};
