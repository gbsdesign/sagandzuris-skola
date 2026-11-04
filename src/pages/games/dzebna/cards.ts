import { buildPdf, type PdfImage } from '../../../utils/scorePdf';
import {
  KIND_LABEL, codeLabel, letterAt, routeOf, startOf, stationUrl, type HuntConf, type HuntWord, type Task,
} from '../../../utils/dzebna';
import { TEAM_TINT } from '../rounds/teams';

// The yard hunt's printout (2026-11-04), drawn on canvases in the browser — no server: the stations' cards four an A4 page
// (cut along the dashed lines; each card's QR code opens its station on a team's phone, its code and number are typed when a
// camera can't read it), the teams' start slips, and the teacher's key (each team's word and route, every task's answer, the
// hiding places). Each page one JPEG in the app's small PDF writer (utils/scorePdf.ts: A4 less 28 pt, so 1617×2356 px ≈ 216 dpi
// fills it).

const W = 1617;
const H = 2356;
const WINE = '#7a2028';
const INK = '#4a3426';
const MUTED = '#8a7560';
const PAPER = '#fbf6ec';
const GOLD = '#c9a227';
const SANS = '"Noto Sans Georgian", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SERIF = '"Noto Serif Georgian", "Noto Sans Georgian", Georgia, serif';

export interface PrintHunt {
  conf: HuntConf;
  code: string;
  words: HuntWord[];
  tasks: (Task | null)[];
  places: string[];
  origin: string;
}

const page = () => {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  return { c, ctx };
};

/** text broken into lines no wider than `max` (a word longer than a line stays whole) */
const wrap = (ctx: CanvasRenderingContext2D, text: string, max: number): string[] => {
  const out: string[] = [];
  text.split('\n').forEach(par => {
    let line = '';
    par.split(/\s+/).filter(Boolean).forEach(w => {
      const next = line ? `${line} ${w}` : w;
      if (ctx.measureText(next).width <= max || !line) line = next;
      else { out.push(line); line = w; }
    });
    out.push(line);
  });
  return out;
};
/** draws wrapped lines from `y` down, returns the y under them */
const lines = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number, align: CanvasTextAlign = 'left') => {
  ctx.textAlign = align;
  wrap(ctx, text, max).forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  return y + wrap(ctx, text, max).length * lh;
};

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/** the dashed lines to cut along */
const cutLines = (ctx: CanvasRenderingContext2D, cols: number, rows: number) => {
  ctx.save();
  ctx.strokeStyle = '#b9ab98';
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 14]);
  for (let i = 1; i < cols; i++) { ctx.beginPath(); ctx.moveTo((W * i) / cols, 0); ctx.lineTo((W * i) / cols, H); ctx.stroke(); }
  for (let i = 1; i < rows; i++) { ctx.beginPath(); ctx.moveTo(0, (H * i) / rows); ctx.lineTo(W, (H * i) / rows); ctx.stroke(); }
  ctx.restore();
};

/** the chest, small, as on the app's screens */
const chest = (ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) => {
  ctx.save();
  ctx.translate(cx - 32 * s, cy - 30 * s);
  ctx.scale(s, s);
  ctx.fillStyle = '#7d4521'; roundRect(ctx, 6, 30, 52, 26, 4); ctx.fill();
  ctx.fillStyle = '#5e3216'; ctx.fillRect(6, 30, 52, 5);
  ctx.fillStyle = '#e0b44a'; ctx.fillRect(15, 30, 6, 26); ctx.fillRect(43, 30, 6, 26);
  ctx.fillStyle = '#9a5b2e';
  ctx.beginPath(); ctx.moveTo(6, 30); ctx.quadraticCurveTo(6, 12, 32, 12); ctx.quadraticCurveTo(58, 12, 58, 30); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f3d27a'; roundRect(ctx, 26.5, 25, 11, 13, 2.5); ctx.fill();
  ctx.fillStyle = '#5e3216'; ctx.beginPath(); ctx.arc(32, 30, 2, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(31.1, 30, 1.8, 4.5);
  ctx.restore();
};

type QrLib = (typeNumber: 0, level: 'M') => { addData: (s: string) => void; make: () => void; getModuleCount: () => number; isDark: (r: number, c: number) => boolean };

const qrAt = (ctx: CanvasRenderingContext2D, qrcode: QrLib, url: string, cx: number, top: number, size: number) => {
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount();
  const cell = Math.floor(size / (n + 8));
  const side = cell * (n + 8);
  const x0 = Math.round(cx - side / 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x0, top, side, side);
  ctx.fillStyle = '#111111';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(x0 + (c + 4) * cell, top + (r + 4) * cell, cell, cell);
  return side;
};

/** a station's card: its number, the QR code of its link (carrying the next card's hiding place), the code to type */
const stationCard = (ctx: CanvasRenderingContext2D, qrcode: QrLib, h: PrintHunt, s: number, x: number, y: number, w: number, hh: number) => {
  const pad = 34;
  ctx.save();
  ctx.fillStyle = PAPER;
  roundRect(ctx, x + pad, y + pad, w - 2 * pad, hh - 2 * pad, 36);
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = WINE;
  ctx.stroke();
  const cx = x + w / 2;
  ctx.fillStyle = WINE;
  ctx.font = `700 50px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillText('საგანძურის ძებნა', cx, y + 128);
  // the number in a golden round
  ctx.fillStyle = GOLD;
  ctx.beginPath(); ctx.arc(cx, y + 246, 82, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 92px ${SANS}`;
  ctx.fillText(String(s + 1), cx, y + 278);
  ctx.fillStyle = MUTED;
  ctx.font = `700 30px ${SANS}`;
  ctx.fillText('სადგური', cx, y + 365);
  const next = h.places[(s + 1) % h.conf.stations];
  const side = qrAt(ctx, qrcode, stationUrl(h.origin, h.code, s, next), cx, y + 392, 500);
  let yy = y + 392 + side + 52;
  ctx.fillStyle = INK;
  ctx.font = `700 34px ${SANS}`;
  ctx.fillText('დაასკანერეთ ტელეფონის კამერით', cx, yy);
  yy += 64;
  ctx.fillStyle = MUTED;
  ctx.font = `600 25px ${SANS}`;
  yy = lines(ctx, 'ვერ ასკანერებთ? აპში: თამაშები → საგანძურის ძებნა → ჰიბრიდული → „სადგურის გახსნა“', cx, yy, w - 2 * pad - 80, 34, 'center');
  ctx.fillStyle = INK;
  ctx.font = `800 36px ${SANS}`;
  ctx.fillText(`კოდი ${codeLabel(h.code)} · სადგური ${s + 1}`, cx, yy + 22);
  ctx.restore();
};

const stationPages = (qrcode: QrLib, h: PrintHunt) => {
  const out: HTMLCanvasElement[] = [];
  for (let first = 0; first < h.conf.stations; first += 4) {
    const { c, ctx } = page();
    for (let k = 0; k < 4 && first + k < h.conf.stations; k++) {
      stationCard(ctx, qrcode, h, first + k, (k % 2) * (W / 2), Math.floor(k / 2) * (H / 2), W / 2, H / 2);
    }
    cutLines(ctx, 2, 2);
    out.push(c);
  }
  return out;
};

/** the teams' start slips: the team's colour, where it starts, how the hunt goes */
const slipsPage = (h: PrintHunt) => {
  const { c, ctx } = page();
  const cols = 2;
  const rows = 3;
  const w = W / cols;
  const hh = H / rows;
  for (let t = 0; t < h.conf.teams; t++) {
    const x = (t % cols) * w;
    const y = Math.floor(t / cols) * hh;
    const pad = 34;
    ctx.save();
    roundRect(ctx, x + pad, y + pad, w - 2 * pad, hh - 2 * pad, 32);
    ctx.fillStyle = PAPER; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = TEAM_TINT[t]; ctx.stroke();
    ctx.beginPath();
    roundRect(ctx, x + pad, y + pad, w - 2 * pad, 132, 32);
    ctx.fillStyle = TEAM_TINT[t]; ctx.fill();
    ctx.fillRect(x + pad, y + pad + 80, w - 2 * pad, 52);
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 62px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText(`გუნდი ${t + 1}`, x + w / 2, y + pad + 90);
    const start = startOf(h.conf, t);
    ctx.fillStyle = INK;
    ctx.font = `800 46px ${SANS}`;
    ctx.fillText(`დაიწყეთ № ${start + 1} სადგურიდან`, x + w / 2, y + pad + 222);
    let yy = y + pad + 290;
    const place = h.places[start]?.trim();
    if (place) {
      ctx.fillStyle = WINE;
      ctx.font = `700 36px ${SANS}`;
      yy = lines(ctx, place, x + w / 2, yy, w - 2 * pad - 70, 46, 'center') + 18;
    }
    ctx.fillStyle = '#5a4a3c';
    ctx.font = `500 28px ${SANS}`;
    ['ყოველ სადგურზე დაასკანერეთ QR კოდი და ამოხსენით დავალება.', 'სწორი პასუხი — ერთი ასო და შემდეგი სადგურის ადგილი.', 'ყველა ასოთი სიტყვა შეადგინეთ და მიიტანეთ სკივრთან!']
      .forEach(t2 => { yy = lines(ctx, t2, x + w / 2, yy, w - 2 * pad - 80, 38, 'center') + 8; });
    chest(ctx, x + w / 2, Math.min(y + hh - pad - 70, yy + 64), 1.5);
    ctx.restore();
  }
  cutLines(ctx, cols, rows);
  return c;
};

/** the teacher's key: the code, each team's word and route, every station's task and answer, the hiding places; a second
 *  page when eight stations' tasks don't fit one */
const keyPages = (h: PrintHunt): HTMLCanvasElement[] => {
  const out: HTMLCanvasElement[] = [];
  const left = 110;
  const max = W - 2 * left;
  let ctx = page().ctx;
  let y = 0;
  const begin = () => {
    const p = page();
    out.push(p.c);
    ctx = p.ctx;
    y = 150;
  };
  /** room for a block of about `need` px, else on to a new page */
  const room = (need: number) => { if (y + need > H - 150) { begin(); y = 110; } };
  begin();
  ctx.fillStyle = WINE;
  ctx.font = `700 64px ${SERIF}`;
  ctx.textAlign = 'left';
  ctx.fillText('საგანძურის ძებნა — მასწავლებლის გასაღები', left, y);
  ctx.fillStyle = INK;
  ctx.font = `700 40px ${SANS}`;
  ctx.fillText(`ძებნის კოდი: ${codeLabel(h.code)} · ${h.conf.stations} სადგური · ${h.conf.teams} გუნდი`, left, y + 80);
  ctx.fillStyle = MUTED;
  ctx.font = `500 28px ${SANS}`;
  y = lines(ctx, 'ეს ფურცელი მხოლოდ თქვენთვისაა. თქვენი ტელეფონი სკივრია: აპში „სკივრი“ გახსენით და გუნდებს მოტანილი სიტყვა იქ აკრიფეთ.', left, y + 140, max, 38) + 30;

  ctx.fillStyle = INK;
  ctx.font = `800 40px ${SANS}`;
  ctx.fillText('გუნდები', left, y);
  y += 26;
  h.words.forEach((w, t) => {
    room(150);
    y += 50;
    ctx.fillStyle = TEAM_TINT[t];
    ctx.beginPath(); ctx.arc(left + 20, y - 13, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = `800 34px ${SANS}`;
    ctx.textAlign = 'left';
    ctx.fillText(`გუნდი ${t + 1}: ${w.word}`, left + 58, y);
    ctx.fillStyle = MUTED;
    ctx.font = `500 26px ${SANS}`;
    const route = routeOf(h.conf, t).map(s => `${s + 1}·${letterAt(h.conf, t, w.word, s)}`).join('  →  ');
    y = lines(ctx, `${w.hint}. გზა: ${route}  →  სკივრი`, left + 58, y + 40, max - 58, 34);
  });

  room(160);
  y += 50;
  ctx.fillStyle = INK;
  ctx.font = `800 40px ${SANS}`;
  ctx.textAlign = 'left';
  ctx.fillText('სადგურები', left, y);
  y += 20;
  h.tasks.forEach((t, s) => {
    if (!t) return;
    room(190);
    y += 52;
    ctx.fillStyle = GOLD;
    ctx.beginPath(); ctx.arc(left + 22, y - 12, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 26px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(s + 1), left + 22, y - 3);
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.font = `700 29px ${SANS}`;
    const ask = t.old ? `${t.ask} (${t.old.script === 'asomtavruli' ? 'ასომთავრული' : 'ნუსხური'})` : t.ask;
    y = lines(ctx, `${KIND_LABEL[t.kind]}: ${ask}`, left + 62, y, max - 62, 38);
    ctx.fillStyle = '#2f7d4f';
    ctx.font = `700 28px ${SANS}`;
    y = lines(ctx, `პასუხი: ${t.options[t.right]}`, left + 62, y + 2, max - 62, 36);
    const place = h.places[s]?.trim();
    if (place) {
      ctx.fillStyle = MUTED;
      ctx.font = `500 26px ${SANS}`;
      y = lines(ctx, `ადგილი: ${place}`, left + 62, y + 2, max - 62, 34);
    }
  });
  ctx.fillStyle = '#a8998a';
  ctx.font = `500 24px ${SANS}`;
  ctx.textAlign = 'left';
  lines(ctx, 'კითხვები და ადგილები აპის თამაშებიდანაა (ნაწილი Claude-მა დაწერა) — მასწავლებელს ჯერ არ შეუმოწმებია.', left, H - 90, max, 32);
  return out;
};

const jpeg = (c: HTMLCanvasElement) => new Promise<PdfImage>((ok, fail) => c.toBlob(b => {
  if (!b) { fail(new Error('canvas')); return; }
  b.arrayBuffer().then(buf => ok({ jpeg: new Uint8Array(buf), w: c.width, h: c.height }), fail);
}, 'image/jpeg', 0.9));

/** the whole printout as one PDF */
export const huntPdf = async (h: PrintHunt): Promise<Blob> => {
  const { default: qrcode } = await import('qrcode-generator');
  try {
    await Promise.all(['700 40px "Noto Serif Georgian"', '500 40px "Noto Sans Georgian"', '700 40px "Noto Sans Georgian"', '800 40px "Noto Sans Georgian"']
      .map(f => document.fonts.load(f, 'საგანძური')));
  } catch { /* the system's font draws it */ }
  const canvases = [...stationPages(qrcode as unknown as QrLib, h), slipsPage(h), ...keyPages(h)];
  const pages: PdfImage[] = [];
  for (const c of canvases) pages.push(await jpeg(c));
  return buildPdf(pages, `საგანძურის ძებნა ${codeLabel(h.code)}`);
};
