// The games hub's „სამაგიდო · PDF“ button for the kits of src/print/ (2026-11-04, the user's rule: the button makes the PDF,
// so a kit follows every change of its game by itself). The kit's HTML pages are laid out in a hidden frame of this site
// (the kit fonts of public/fonts/print, abcjs, the kit's own script that draws its staves, then the titles fitted), each
// A4 page becomes a picture — an SVG of the page's own markup with the fonts inside it, drawn on a canvas at 200 dpi — and
// the pictures one PDF, edge to edge as the kit is drawn. A browser that refuses to draw such a picture gets the print
// window of the same pages instead (`null`: nothing to save).
import { buildPdf, type PdfImage } from '../utils/scorePdf';
import { loadKit } from './kits.js';
import { document_, fitScript } from './lib.js';

export type KitProgress = (done: number, total: number) => void;

interface Kit { title: string; css?: string; head?: string; script?: string; pages: string[] }

const PX_MM = 96 / 25.4;
const PAGE_W = 210 * PX_MM;
const PAGE_H = 297 * PX_MM;
const DPI = 200;
const OUT_W = Math.round((210 / 25.4) * DPI);
const OUT_H = Math.round((297 / 25.4) * DPI);
const QUALITY = 0.85;

/** the kit laid out in a hidden frame of this site, its fonts loaded */
const frameOf = (html: string) => new Promise<HTMLIFrameElement>((resolve, reject) => {
  const f = document.createElement('iframe');
  f.setAttribute('aria-hidden', 'true');
  f.tabIndex = -1;
  f.style.cssText = `position:fixed;left:-10000px;top:0;width:${Math.ceil(PAGE_W) + 40}px;height:${Math.ceil(PAGE_H)}px;border:0;visibility:hidden;pointer-events:none`;
  f.onload = () => resolve(f);
  f.onerror = () => reject(new Error('print frame'));
  f.srcdoc = html;
  document.body.appendChild(f);
});

const asDataUrl = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  const blob = await r.blob();
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
};

const FACE = /@font-face\s*\{[^}]*\}/g;
const URL_IN = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
/** a picture cannot fetch anything: the fonts go into its CSS */
const fontsInside = async (css: string) => {
  const urls = [...new Set([...css.matchAll(FACE)].flatMap(m => [...m[0].matchAll(URL_IN)].map(u => u[1])))];
  const data = new Map(await Promise.all(urls.map(async u => [u, await asDataUrl(u)] as const)));
  return css.replace(FACE, block => block.replace(URL_IN, (all, u: string) => (data.has(u) ? `url(${data.get(u)})` : all)));
};

const pictureOf = (page: Element, css: string) => {
  const xhtml = new XMLSerializer().serializeToString(page);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OUT_W}" height="${OUT_H}" viewBox="0 0 ${PAGE_W} ${PAGE_H}">`
    + `<foreignObject x="0" y="0" width="${PAGE_W}" height="${PAGE_H}"><div xmlns="http://www.w3.org/1999/xhtml" class="kit-root">`
    + `<style><![CDATA[${css}]]></style>${xhtml}</div></foreignObject></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const jpegOf = (canvas: HTMLCanvasElement) => new Promise<Uint8Array>((resolve, reject) => canvas.toBlob(b => {
  if (!b) { reject(new Error('jpeg')); return; }
  b.arrayBuffer().then(a => resolve(new Uint8Array(a)), reject);
}, 'image/jpeg', QUALITY));

/** the kit's PDF, or null when the print window was opened instead */
export const makeKit = async (id: string, progress?: KitProgress): Promise<Blob | null> => {
  const kit = (await loadKit(id)) as Kit;
  const frame = await frameOf(document_({ title: kit.title, css: kit.css ?? '', head: kit.head ?? '', pages: kit.pages }));
  let printing = false;
  try {
    const win = frame.contentWindow as (Window & { eval: (code: string) => unknown }) | null;
    const doc = frame.contentDocument;
    if (!win || !doc) throw new Error('print frame');
    await Promise.all([...doc.fonts].map(f => f.load().catch(() => undefined)));
    await doc.fonts.ready;
    if (kit.script) await win.eval(kit.script);
    win.eval(fitScript);
    const pages = [...doc.querySelectorAll('body > .page')];
    progress?.(0, pages.length);
    const css = await fontsInside([...doc.querySelectorAll('style')].map(s => s.textContent ?? '').join('\n'));
    const canvas = document.createElement('canvas');
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const g = canvas.getContext('2d');
    if (!g) throw new Error('canvas');
    const out: PdfImage[] = [];
    for (const [i, page] of pages.entries()) {
      const img = new Image();
      img.src = pictureOf(page, css);
      await img.decode();
      g.fillStyle = '#fff';
      g.fillRect(0, 0, OUT_W, OUT_H);
      g.drawImage(img, 0, 0, OUT_W, OUT_H);
      try {
        out.push({ jpeg: await jpegOf(canvas), w: OUT_W, h: OUT_H });
      } catch (e) {
        // a browser that keeps the drawn page from being read back (old Safari): the print window instead
        if (!(e instanceof DOMException) || e.name !== 'SecurityError') throw e;
        printing = true;
        win.addEventListener('afterprint', () => frame.remove(), { once: true });
        win.focus();
        win.print();
        return null;
      }
      progress?.(i + 1, pages.length);
    }
    return buildPdf(out, kit.title, { margin: 0 });
  } finally {
    if (!printing) frame.remove();
  }
};
