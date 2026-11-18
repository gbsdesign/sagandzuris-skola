import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Download, ExternalLink, Search, X } from 'lucide-react';
import { BookHead, BookNav } from './BookHead';
import { MiniCover } from './Shelf';
import { DRIVE_KEY, P_CATEGORIES, PCategory, isHidden } from '../../data/patriarchLibrary';
import { FIELD } from '../../components/ui/kit';

// „საპატრიარქოს ბიბლიოთეკა“ (2026-11-18): the shelf's cover opens the categories (one Drive folder each), a category
// („patriarq:saints“) its books, a book („patriarq:saints:<fileId>“) the book itself in Drive's viewer. The lists come
// live from the Drive API and are kept on the device for 6 hours (an old list still shows when offline).
// One book in several formats (pdf, epub, docx…) is one row; the pdf opens, the rest are offered to download.

interface DFile { id: string; name: string; mimeType?: string; size?: string }
interface PBook { key: string; title: string; files: { id: string; ext: string; size: number }[] }

const TTL = 6 * 60 * 60 * 1000;
const cacheKey = (folder: string) => `sg-patriarq:${folder}`;
const READABLE = ['pdf', 'doc', 'docx'];

const extOf = (name: string) => (/\.([a-z0-9]{2,5})$/i.exec(name)?.[1] ?? '').toLowerCase();
/** the title a reader sees: no extension, no „ (1)“ copy mark, „_“ as a dash, one space */
const titleOf = (name: string) =>
  name.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/\s*\(\d+\)$/, '').replace(/\s_\s/g, ' – ').replace(/_/g, ' ')
    .replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();

const fetchFolder = async (folder: string): Promise<DFile[]> => {
  const out: DFile[] = [];
  let page = '';
  do {
    const q = new URLSearchParams({
      q: `'${folder}' in parents and trashed=false`,
      fields: 'nextPageToken,files(id,name,mimeType,size)',
      pageSize: '1000',
      key: DRIVE_KEY,
      ...(page ? { pageToken: page } : {}),
    });
    const r = await fetch(`https://www.googleapis.com/drive/v3/files?${q}`);
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    out.push(...(d.files ?? []));
    page = d.nextPageToken ?? '';
  } while (page);
  return out;
};

const readCache = (folder: string): { t: number; files: DFile[] } | null => {
  try { return JSON.parse(localStorage.getItem(cacheKey(folder)) || 'null'); } catch { return null; }
};

/** a category's books, from the device first and from Drive when the kept list is older than 6 hours */
const useFolders = (cats: PCategory[]) => {
  const [lists, setLists] = useState<Record<string, DFile[] | 'error'>>(() => {
    const s: Record<string, DFile[]> = {};
    for (const c of cats) { const k = readCache(c.folder); if (k) s[c.id] = k.files; }
    return s;
  });
  const ids = cats.map(c => c.id).join(',');
  useEffect(() => {
    let live = true;
    for (const c of cats) {
      const k = readCache(c.folder);
      if (k && Date.now() - k.t < TTL) continue;
      fetchFolder(c.folder)
        .then(files => {
          try { localStorage.setItem(cacheKey(c.folder), JSON.stringify({ t: Date.now(), files })); } catch { /* full: this visit keeps it */ }
          if (live) setLists(s => ({ ...s, [c.id]: files }));
        })
        .catch(() => { if (live) setLists(s => (s[c.id] ? s : { ...s, [c.id]: 'error' })); });
    }
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  return lists;
};

const collator = new Intl.Collator('ka');
const toBooks = (files: DFile[]): PBook[] => {
  const by = new Map<string, PBook>();
  for (const f of files) {
    if (isHidden(f.name)) continue;
    const title = titleOf(f.name);
    const key = title.toLowerCase();
    const b = by.get(key) ?? { key, title, files: [] };
    // the same file twice (a „ (1)“ copy) stays one
    const ext = extOf(f.name);
    if (!b.files.some(x => x.ext === ext)) b.files.push({ id: f.id, ext, size: Number(f.size ?? 0) });
    by.set(key, b);
  }
  return [...by.values()].sort((a, b) => collator.compare(a.title, b.title));
};

const mb = (n: number) => (n > 0 ? `${n >= 10e6 ? Math.round(n / 1e6) : (n / 1e6).toFixed(1)} მბ` : '');
const primary = (b: PBook) => b.files.find(f => f.ext === 'pdf') ?? b.files.find(f => READABLE.includes(f.ext)) ?? b.files[0];

const CARD = 'rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_26px_-22px_rgba(42,32,23,0.35)]';

const SearchBox: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => (
  <label className="relative block mt-4">
    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#b3a594]" aria-hidden />
    <input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`${FIELD} pl-10 pr-10`} />
    {value && (
      <button type="button" onClick={() => onChange('')} aria-label="გასუფთავება" className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full grid place-items-center text-[#8a7a6a] hover:bg-[#f3ebdd] cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    )}
  </label>
);

const BookRow: React.FC<{ b: PBook; cat?: string; onOpen: () => void }> = ({ b, cat, onOpen }) => {
  const p = primary(b);
  const exts = b.files.map(f => f.ext).filter(Boolean);
  return (
    <li>
      <button type="button" onClick={onOpen} className="group w-full flex items-center gap-3 min-h-14 rounded-xl px-2.5 py-2 text-left hover:bg-[#4f5a2e]/[0.06] cursor-pointer active:scale-[0.99] transition-all">
        <span className="flex-1 min-w-0">
          <span className="block font-serif-ge text-[15px] font-bold leading-snug text-[#2a2017] group-hover:text-[#7a2028] transition-colors">{b.title}</span>
          <span className="mt-0.5 block text-[12px] leading-snug text-[#8a7a6a]">
            {cat && <>{cat} · </>}{exts.join(' · ').toUpperCase()}{p.size ? ` · ${mb(p.size)}` : ''}
          </span>
        </span>
        <ChevronRight className="w-5 h-5 shrink-0 text-[#cdbba3] group-hover:text-[#7a2028] group-hover:translate-x-0.5 transition-all" />
      </button>
    </li>
  );
};

/** a book open: Drive's own viewer for pdf and Word, a download for the formats it cannot show */
const BookView: React.FC<{ b: PBook }> = ({ b }) => {
  const p = primary(b);
  const viewable = READABLE.includes(p.ext);
  return (
    <div>
      <BookHead sub={<span className="font-serif-ge font-bold text-[#2a2017] text-[14px]">{b.title}</span>} />
      <div className="mt-3 flex flex-wrap gap-2">
        {b.files.map(f => (
          <a key={f.id} href={`https://drive.google.com/uc?export=download&id=${f.id}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[13px] font-semibold text-[#4a3426] hover:ring-[#7a2028]/40">
            <Download className="w-4 h-4" /> {f.ext.toUpperCase() || 'ფაილი'}{f.size ? ` · ${mb(f.size)}` : ''}
          </a>
        ))}
        <a href={`https://drive.google.com/file/d/${p.id}/view`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[13px] font-semibold text-[#4a3426] hover:ring-[#7a2028]/40">
          <ExternalLink className="w-4 h-4" /> ცალკე გახსნა
        </a>
      </div>
      {viewable ? (
        <div className={`${CARD} mt-3 overflow-hidden`}>
          <iframe title={b.title} src={`https://drive.google.com/file/d/${p.id}/preview`} className="w-full h-[78vh] min-h-[420px] border-0 bg-[#f6f1e7]" allow="autoplay" />
        </div>
      ) : (
        <p className={`${CARD} mt-3 p-4 text-[14px] leading-relaxed text-[#4a3426]`}>
          ამ ფორმატს ({p.ext.toUpperCase()}) აპი ვერ აჩვენებს — ჩამოწერე ზემოთ ღილაკით და გახსენი ტელეფონის ან კომპიუტერის წამკითხველით.
        </p>
      )}
    </div>
  );
};

export const PatriarchLibrary: React.FC<{ nav: BookNav }> = ({ nav }) => {
  const [catId, fileId] = (nav.part ?? '').split(':');
  const cat = P_CATEGORIES.find(c => c.id === catId);
  const lists = useFolders(P_CATEGORIES);
  const books = useMemo(() => {
    const m: Record<string, PBook[]> = {};
    for (const c of P_CATEGORIES) { const l = lists[c.id]; if (Array.isArray(l)) m[c.id] = toBooks(l); }
    return m;
  }, [lists]);
  const [q, setQ] = useState('');
  useEffect(() => setQ(''), [catId]);
  const qn = q.trim().toLowerCase();

  // a book
  if (cat && fileId) {
    const b = books[cat.id]?.find(x => x.files.some(f => f.id === fileId));
    if (b) return <BookView b={b} />;
    return <p className="py-10 text-center text-[14px] text-[#8a7a6a]">{lists[cat.id] === 'error' ? 'წიგნების სია ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.' : 'იტვირთება…'}</p>;
  }

  // a category's books
  if (cat) {
    const all = books[cat.id];
    const shown = all?.filter(b => !qn || b.title.toLowerCase().includes(qn));
    return (
      <div>
        <BookHead sub={<>{cat.note}{all ? ` · ${all.length} წიგნი` : ''}</>} />
        <SearchBox value={q} onChange={setQ} placeholder="სათაური ან ავტორი…" />
        {!all ? (
          <p className="py-10 text-center text-[14px] text-[#8a7a6a]">{lists[cat.id] === 'error' ? 'სია ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.' : 'იტვირთება…'}</p>
        ) : shown!.length === 0 ? (
          <p className="py-10 text-center text-[14px] text-[#8a7a6a]">ასეთი წიგნი ვერ ვიპოვე.</p>
        ) : (
          <ul className={`${CARD} mt-4 p-1.5 sm:p-2 divide-y divide-[#f1e8da]`}>
            {shown!.map(b => <BookRow key={b.key} b={b} onOpen={() => nav.go(`${cat.id}:${primary(b).id}`)} />)}
          </ul>
        )}
      </div>
    );
  }

  // the categories, and a search over all of them
  const total = P_CATEGORIES.reduce((n, c) => n + (books[c.id]?.length ?? 0), 0);
  const found = qn
    ? P_CATEGORIES.flatMap(c => (books[c.id] ?? []).filter(b => b.title.toLowerCase().includes(qn)).map(b => ({ c, b }))).slice(0, 80)
    : [];
  return (
    <div>
      <BookHead sub={<>საქართველოს საპატრიარქოს ბიბლიოთეკის წიგნები{total ? ` · ${total.toLocaleString('ka')} წიგნი` : ''}</>} />
      <SearchBox value={q} onChange={setQ} placeholder="მოძებნე ყველა წიგნში…" />
      {qn ? (
        found.length === 0 ? (
          <p className="py-10 text-center text-[14px] text-[#8a7a6a]">ასეთი წიგნი ვერ ვიპოვე.</p>
        ) : (
          <ul className={`${CARD} mt-4 p-1.5 sm:p-2 divide-y divide-[#f1e8da]`}>
            {found.map(({ c, b }) => <BookRow key={`${c.id}:${b.key}`} b={b} cat={c.title} onOpen={() => nav.go(`${c.id}:${primary(b).id}`)} />)}
          </ul>
        )
      ) : (
        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {P_CATEGORIES.map(c => {
            const n = books[c.id]?.length;
            return (
              <li key={c.id}>
                <button type="button" onClick={() => nav.go(c.id)} className={`${CARD} group w-full flex items-center gap-3.5 min-h-[72px] px-3.5 py-3 text-left hover:ring-[#4f5a2e]/30 cursor-pointer active:scale-[0.99] transition-all`}>
                  <MiniCover id="patriarq" className="w-9 h-12 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block font-serif-ge text-[15.5px] font-bold leading-snug text-[#2a2017] group-hover:text-[#7a2028] transition-colors">{c.title}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-[#8a7a6a]">{c.note}{n !== undefined ? ` · ${n}` : ''}</span>
                  </span>
                  <ChevronRight className="w-5 h-5 shrink-0 text-[#cdbba3] group-hover:text-[#7a2028] group-hover:translate-x-0.5 transition-all" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
