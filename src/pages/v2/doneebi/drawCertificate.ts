import { COLOR } from '../../../design/tokens';

// The certificate as a PNG (1080 × 1350), drawn on a canvas like the learned card (barati/drawCard.ts): a white card with a
// gold border on the page's paper, the logo, the school, the level big, the name, the line and the date. Colours are the tokens'.

export interface CertText {
  level: string;
  person: string;
  line: string;
  date: string;
}

const W = 1080;
const H = 1350;

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

export const drawCertificate = async (t: CertText, logo: HTMLImageElement | null): Promise<Blob> => {
  const family = getComputedStyle(document.body).fontFamily || 'sans-serif';
  try {
    await document.fonts.ready;
    await Promise.all([`700 60px ${family}`, `400 40px ${family}`].map(f => document.fonts.load(f, 'დონე საფუძველი აბგ')));
  } catch { /* the fallback font draws */ }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');

  ctx.fillStyle = COLOR.page;
  ctx.fillRect(0, 0, W, H);
  // the card with its gold border
  roundRect(ctx, 70, 150, W - 140, H - 300, 56);
  ctx.fillStyle = COLOR.surf;
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = COLOR.gold;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const cx = W / 2;
  const inner = W - 2 * 170;
  let y = 330;
  if (logo) {
    const box = 170;
    const k = Math.min(box / logo.width, box / logo.height);
    const w = logo.width * k;
    const h = logo.height * k;
    ctx.save();
    roundRect(ctx, cx - box / 2, y, box, box, 36);
    ctx.clip();
    ctx.drawImage(logo, cx - w / 2, y + box / 2 - h / 2, w, h);
    ctx.restore();
  }
  y += 170 + 90;

  ctx.fillStyle = COLOR.mut;
  ctx.font = `700 44px ${family}`;
  ctx.fillText('საგანძურის სკოლა', cx, y, inner);
  y += 130;

  ctx.fillStyle = COLOR.ink;
  let size = 96;
  for (; size > 44; size -= 4) { ctx.font = `700 ${size}px ${family}`; if (ctx.measureText(t.level).width <= inner) break; }
  ctx.fillText(t.level, cx, y, inner);
  y += 150;

  ctx.font = `400 48px ${family}`;
  ctx.fillStyle = COLOR.ink;
  const lead = 'დაასრულა: ';
  let ps = 56;
  for (; ps > 32; ps -= 4) {
    ctx.font = `400 ${ps}px ${family}`;
    const a = ctx.measureText(lead).width;
    ctx.font = `700 ${ps}px ${family}`;
    if (a + ctx.measureText(t.person).width <= inner) break;
  }
  ctx.font = `400 ${ps}px ${family}`;
  const lw = ctx.measureText(lead).width;
  ctx.font = `700 ${ps}px ${family}`;
  const pw = Math.min(ctx.measureText(t.person).width, inner - lw);
  const x0 = cx - (lw + pw) / 2;
  ctx.textAlign = 'left';
  ctx.font = `400 ${ps}px ${family}`;
  ctx.fillText(lead, x0, y);
  ctx.font = `700 ${ps}px ${family}`;
  ctx.fillText(t.person, x0 + lw, y, inner - lw);
  ctx.textAlign = 'center';
  y += 90;

  ctx.fillStyle = COLOR.mut;
  ctx.font = `400 40px ${family}`;
  ctx.fillText(t.line, cx, y, inner);
  y += 68;
  ctx.fillText(t.date, cx, y, inner);

  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('png'))), 'image/png'));
};

export const certFileName = (level: string) => `მოწმობა — ${level}`.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() + '.png';

/** „შევინახავ“: the picture goes to the downloads (the apps take a download to their share sheet) */
export const saveCertificate = (blob: Blob, level: string): boolean => {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = certFileName(level);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return true;
  } catch { return false; }
};
