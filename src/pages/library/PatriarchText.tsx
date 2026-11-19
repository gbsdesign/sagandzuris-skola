import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DRIVE_KEY } from '../../data/patriarchLibrary';
import { Sheet, FIELD } from '../../components/ui/kit';
import { TextSizeButton, useReaderFont } from '../v2/library/parts';

// A Patriarchate book read as text, like the prayer book (2026-11-19). The text was taken out of the book's PDF (or a
// legacy-font PDF turned into Georgian letters) and kept on the owner's Drive: one gzip piece a book, many pieces to a
// bundle file; `patriarchTexts.json` says where each book's piece starts and how long it is, so one Range request
// brings just that book. A page of the PDF is a page here too, so the „გვერდი 12“ jump matches the PDF.

export interface TextIndex {
  /** the bundles' Drive file ids */
  b: string[];
  /** a book's file id → [pages, ...its pieces as [bundle, byte offset, byte length]] — a big book comes in a few pieces */
  i: Record<string, [number, ...[number, number, number][]]>;
}

let indexP: Promise<TextIndex | null> | null = null;
export const loadTextIndex = () =>
  (indexP ??= import('../../data/patriarchTexts.json').then(m => m.default as unknown as TextIndex).catch(() => null));

export const useTextIndex = () => {
  const [ix, setIx] = useState<TextIndex | null>(null);
  useEffect(() => { let on = true; loadTextIndex().then(v => on && setIx(v)); return () => { on = false; }; }, []);
  return ix;
};

interface BookText { l: string; p: string[][] }
const texts = new Map<string, Promise<BookText>>();

const fetchPiece = async (ix: TextIndex, [b, off, len]: [number, number, number]): Promise<BookText> => {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${ix.b[b]}?alt=media&key=${DRIVE_KEY}`, {
    headers: { Range: `bytes=${off}-${off + len - 1}` },
  });
  if (!r.ok) throw new Error(String(r.status));
  // a server that ignores Range sends the whole bundle: cut the book's piece out of it
  const buf = r.status === 206 ? await r.arrayBuffer() : (await r.arrayBuffer()).slice(off, off + len);
  const plain = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(plain).text());
};
const fetchText = async (ix: TextIndex, id: string): Promise<BookText> => {
  const [, ...pieces] = ix.i[id];
  const parts = await Promise.all(pieces.map(x => fetchPiece(ix, x)));
  return { l: parts[0].l, p: parts.flatMap(x => x.p) };
};
const getText = (ix: TextIndex, id: string) => {
  let p = texts.get(id);
  if (!p) { p = fetchText(ix, id); texts.set(id, p); p.catch(() => texts.delete(id)); }
  return p;
};

const posKey = (id: string) => `sg-patriarq-page:${id}`;
const readPos = (id: string) => { try { return Math.max(0, Number(localStorage.getItem(posKey(id))) || 0); } catch { return 0; } };
const STEP = 12;

export const PatriarchText: React.FC<{ ix: TextIndex; id: string; title: string }> = ({ ix, id, title }) => {
  const [book, setBook] = useState<BookText | null>(null);
  const [err, setErr] = useState(false);
  const [font, setFont] = useReaderFont('sg-patriarq-font');
  const start = useRef(readPos(id));
  const [upto, setUpto] = useState(start.current + STEP);
  const [page, setPage] = useState(start.current);
  const [jump, setJump] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const pending = useRef<number | null>(start.current || null);

  useEffect(() => {
    let on = true;
    setBook(null); setErr(false);
    getText(ix, id).then(t => on && setBook(t)).catch(() => on && setErr(true));
    return () => { on = false; };
  }, [ix, id]);

  // where the reader stopped: scroll there once the page is drawn
  useLayoutEffect(() => {
    if (!book || pending.current == null) return;
    const el = box.current?.querySelector(`[data-page="${pending.current}"]`);
    if (el) { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); pending.current = null; }
  }, [book, upto]);

  // more pages as the end comes into view
  useEffect(() => {
    if (!book || !end.current) return;
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) setUpto(u => Math.min(book.p.length, u + STEP)); }, { rootMargin: '1200px 0px' });
    io.observe(end.current);
    return () => io.disconnect();
  }, [book]);

  // the page in view, kept on the device
  useEffect(() => {
    if (!book || !box.current) return;
    const io = new IntersectionObserver(es => {
      for (const e of es) if (e.isIntersecting) {
        const n = Number((e.target as HTMLElement).dataset.page);
        setPage(n);
        try { localStorage.setItem(posKey(id), String(n)); } catch { /* the place just isn't kept */ }
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    box.current.querySelectorAll('[data-page]').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [book, upto, id]);

  const goTo = (n: number) => {
    if (!book) return;
    const to = Math.min(book.p.length - 1, Math.max(0, n));
    pending.current = to;
    setUpto(u => Math.max(u, to + STEP));
    // the page may already be drawn
    requestAnimationFrame(() => {
      const el = box.current?.querySelector(`[data-page="${to}"]`);
      if (el) { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); pending.current = null; }
    });
  };

  if (err) return <p className="py-10 text-center text-[14px] text-[#8a7a6a]">ტექსტი ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი ან გახსენი PDF.</p>;
  if (!book) return <p className="py-10 text-center text-[14px] text-[#8a7a6a]">ტექსტი იტვირთება…</p>;

  const total = book.p.length;
  const first = Math.max(0, Math.min(start.current, upto - STEP));
  return (
    <div>
      <div className="flex items-center gap-2 pb-2">
        <p className="flex-1 min-w-0 text-[12px] leading-snug text-[#8a7a6a]">ტექსტი ავტომატურად არის ამოღებული — თუ რამე არეულია, PDF-ში შეამოწმე.</p>
        <TextSizeButton font={font} onFont={setFont} />
      </div>
      <div ref={box} lang={book.l} className="font-serif-ge leading-[1.8] text-[#2a2017] [&_p]:mb-[0.8em] [&_p]:wrap-break-word" style={{ fontSize: `${(17 * font) / 100}px` }}>
        {first > 0 && (
          <button type="button" onClick={() => { start.current = Math.max(0, first - STEP); setUpto(u => u + 0); goTo(first - 1); }}
            className="mb-4 w-full h-11 rounded-xl bg-white ring-1 ring-[#e8dcc8] text-[14px] font-semibold text-[#4a3426] cursor-pointer">
            ↑ წინა გვერდები
          </button>
        )}
        {book.p.slice(first, upto).map((ps, k) => {
          const n = first + k;
          return (
            // an empty page (a picture, a blank) keeps its place for the jump but draws no line
            <section key={n} data-page={n} aria-label={`გვერდი ${n + 1}`} className={ps.length ? '' : 'h-px'}>
              {ps.map((t, j) => <p key={j}>{t}</p>)}
              {ps.length > 0 && (
                <div className="my-5 flex items-center gap-3 text-[12px] text-[#b3a594] font-sans" aria-hidden>
                  <span className="h-px flex-1 bg-[#eadfcc]" />{n + 1}<span className="h-px flex-1 bg-[#eadfcc]" />
                </div>
              )}
            </section>
          );
        })}
        <div ref={end} />
        {upto >= total && <p className="pb-24 text-center text-[13px] text-[#8a7a6a] font-sans">— დასასრული —</p>}
      </div>
      {/* the page counter: tap it to go to a page */}
      <button type="button" onClick={() => setJump(String(page + 1))}
        className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-30 h-10 px-4 rounded-full bg-[#2a2017]/85 text-white text-[13px] font-semibold shadow-lg backdrop-blur cursor-pointer">
        გვერდი {page + 1} / {total}
      </button>
      <Sheet open={jump != null} onClose={() => setJump(null)} title="გადასვლა გვერდზე"
        footer={<button type="button" className="w-full h-12 rounded-xl bg-[#7a2028] text-white font-bold cursor-pointer" onClick={() => { goTo(Number(jump) - 1); setJump(null); }}>გადასვლა</button>}>
        <p className="mb-2 text-[13px] text-[#8a7a6a]">{title} · {total} გვერდი</p>
        <input type="number" inputMode="numeric" min={1} max={total} value={jump ?? ''} onChange={e => setJump(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { goTo(Number(jump) - 1); setJump(null); } }} className={FIELD} autoFocus />
      </Sheet>
    </div>
  );
};
