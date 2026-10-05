// Sheet music -> PDF: each book-page image on its own A4 page.
// A minimal PDF writer is enough here: the images carry all the text, so no fonts are needed.
import { BookScore, bookImageUrl } from './chantSynth';

const A4W = 595.28, A4H = 841.89, MARGIN = 28;
const enc = new TextEncoder();

// UTF-16BE hex string, so the Georgian title survives in the PDF metadata
const pdfText = (s: string) => {
  let hex = 'FEFF';
  for (let i = 0; i < s.length; i++) hex += s.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase();
  return `<${hex}>`;
};

export interface PdfImage { jpeg: Uint8Array; w: number; h: number }

export const buildPdf = (images: PdfImage[], title: string): Blob => {
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let size = 0;
  const put = (x: string | Uint8Array) => {
    const b = typeof x === 'string' ? enc.encode(x) : x;
    parts.push(b);
    size += b.length;
  };
  const begin = (id: number) => { offsets[id] = size; put(`${id} 0 obj\n`); };
  const end = () => put('\nendobj\n');

  put('%PDF-1.4\n%âãÏÓ\n');
  // objects: 1 catalog, 2 page tree, 3 info, then per page: page, content, image
  const pageId = (i: number) => 4 + 3 * i;
  begin(1); put('<< /Type /Catalog /Pages 2 0 R >>'); end();
  begin(2); put(`<< /Type /Pages /Count ${images.length} /Kids [${images.map((_, i) => `${pageId(i)} 0 R`).join(' ')}] >>`); end();
  begin(3); put(`<< /Title ${pdfText(title)} /Producer (Sagandzuri) >>`); end();
  images.forEach((im, i) => {
    const p = pageId(i), c = p + 1, x = p + 2;
    const s = Math.min((A4W - 2 * MARGIN) / im.w, (A4H - 2 * MARGIN) / im.h);
    const dw = im.w * s, dh = im.h * s;
    const draw = `q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${((A4W - dw) / 2).toFixed(2)} ${(A4H - MARGIN - dh).toFixed(2)} cm /Im0 Do Q`;
    begin(p);
    put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4W} ${A4H}] /Resources << /XObject << /Im0 ${x} 0 R >> >> /Contents ${c} 0 R >>`);
    end();
    begin(c); put(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`); end();
    begin(x);
    put(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.jpeg.length} >>\nstream\n`);
    put(im.jpeg);
    put('\nendstream');
    end();
  });
  const xref = size;
  const count = 4 + 3 * images.length;
  let table = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let id = 1; id < count; id++) table += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  put(table);
  put(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
};

// the page images are WebP; PDF embeds JPEG directly, so re-encode through a canvas
const toJpeg = async (url: string): Promise<PdfImage> => {
  const img = new Image();
  img.src = url;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.drawImage(img, 0, 0);
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('jpeg'))), 'image/jpeg', 0.9));
  return { jpeg: new Uint8Array(await blob.arrayBuffer()), w: canvas.width, h: canvas.height };
};

export const scoreToPdf = async (score: BookScore, title: string) =>
  buildPdf(await Promise.all(score.img.map(im => toJpeg(bookImageUrl(score, im.src)))), title);

/** Several chants in one file, in order (today's service): every page of each on its own A4 page. */
export const scoresToPdf = async (scores: BookScore[], title: string) => {
  const pages: PdfImage[] = [];
  for (const score of scores) for (const im of score.img) pages.push(await toJpeg(bookImageUrl(score, im.src)));
  return buildPdf(pages, title);
};
