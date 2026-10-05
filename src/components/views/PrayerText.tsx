import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useNavigation } from '../../context';
import { Commemoration, NameListId, useCommemoration } from '../../utils/commemoration';
import { GirsArsSection, girsArsFor, loadGirsArs } from '../../data/girsArs';

// The text of a prayer, with three additions woven in:
// • "(სახელი)" / "(სახელები მათი)" show the student's names from მოსახსენებელი (tap → edit the lists);
// • under every "ღირს არს ჭეშმარიტად" a button shows what replaces it today;
// • the prayer for one's spiritual father gets "დამატებით" — the fuller prayer, unfolded in place.

export const PROSE =
  'font-serif-ge text-[17px] leading-[1.75] text-[#2a2017] [&_p]:mb-3.5 [&_p.c]:text-center [&_p.c]:mt-5 [&_p.c]:text-[#7a2028] ' +
  '[&_h2]:font-bold [&_h2]:text-[#7a2028] [&_h2]:text-center [&_h2]:text-lg max-[359px]:[&_h2]:text-[17px] [&_h2]:mt-6 [&_h2]:mb-3 [&_h2:first-child]:mt-0 ' +
  '[&_h3]:font-bold [&_h3]:text-[#7a2028] [&_h3]:text-center [&_h3]:text-[16px] [&_h3]:mt-6 [&_h3]:mb-2 ' +
  '[&_blockquote]:pl-4 [&_blockquote]:border-l-2 [&_blockquote]:border-[#e8dcc8] [&_blockquote]:text-[#4a3426] ' +
  '[&_em]:text-[#6b5544] [&_sup]:text-[11px] [&_hr]:my-5 [&_hr]:border-[#e8dcc8]';

const NAME_CHIP =
  'inline rounded-md px-1 -mx-0.5 font-semibold text-[#7a2028] bg-[#7a2028]/[0.07] hover:bg-[#7a2028]/[0.13] cursor-pointer';

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const plain = (html: string) => html.replace(/<[^>]+>/g, '');

// Which list a "(სახელი)" stands for, judged by the words just before it; null leaves it as written
// (one's spiritual father, patron saint, the patriarch, oneself).
const listFor = (before: string): NameListId | null => {
  const near = plain(before).slice(-220);
  if (/(გარდაცვალებულ|გარდაცვლილ|მიცვალებულ|განუსვენე|შესვენებულ)/.test(near)) return 'deceased';
  if (/(მოძღვ|მასწავლელ)/.test(near.slice(-45))) return null;
  if (/(წმიდაო|მამაჲ ჩუენი|მამა ჩვენი|მონასა შენსა|მონისა შენისა|შეპყრობილნი|წარტაცებულნი)[\s,:]*$/.test(near.slice(-70))) return null;
  return 'living';
};

const withNames = (block: string, lists: Commemoration) =>
  block.replace(/\((სახელ[^()]{0,30})\)/g, (match, _inner, offset: number) => {
    const list = listFor(block.slice(0, offset));
    if (!list) return match;
    const names = lists[list];
    const text = names.length ? escapeHtml(names.join(', ')) : match;
    const title = list === 'deceased' ? 'გარდაცვლილთა სახელები' : 'ცოცხალთა სახელები';
    return `<button type="button" data-names="${list}" title="${title} — შეცვლა" class="${NAME_CHIP}${names.length ? '' : ' !font-normal !text-[#8a7a6a]'}">${text}</button>`;
  });

type Segment = { kind: 'html'; html: string } | { kind: 'girs' } | { kind: 'modzgvari' };

const GIRS = /ღირს[\s-]*არს\s+ჭეშმარიტად/;
const isModzgvari = (block: string) => /სულიერი\s+მამა/.test(block) && /\(მეტანია\)/.test(block);

const segment = (html: string, lists: Commemoration): Segment[] => {
  const out: Segment[] = [];
  let buffer = '';
  const flush = () => {
    if (buffer) out.push({ kind: 'html', html: buffer });
    buffer = '';
  };
  const blocks = html.match(/<(p|h2|h3|blockquote)\b[^>]*>[\s\S]*?<\/\1>|<hr>|[^<]+/g) || [html];
  for (let block of blocks) {
    const modzgvari = isModzgvari(block);
    block = withNames(block, lists);
    if (modzgvari) {
      block = block.replace(
        /(\(მეტანია\)\.?)/,
        `$1 <button type="button" data-extra="modzgvari" class="inline-flex items-center gap-0.5 align-baseline ml-1 px-2 py-0.5 rounded-full text-[13px] font-sans font-bold text-[#7a2028] ring-1 ring-[#7a2028]/30 hover:bg-[#7a2028]/[0.06] cursor-pointer">დამატებით ▾</button>`
      );
    }
    buffer += block;
    if (modzgvari) {
      flush();
      out.push({ kind: 'modzgvari' });
    } else if (GIRS.test(plain(block))) {
      flush();
      out.push({ kind: 'girs' });
    }
  }
  flush();
  return out;
};

export const PrayerText: React.FC<{ html: string }> = ({ html }) => {
  const { openCommemoration } = useNavigation();
  const { lists } = useCommemoration();
  const [modzgvariOpen, setModzgvariOpen] = useState(false);
  const segments = useMemo(() => segment(html, lists), [html, lists]);

  const onClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-names]')) openCommemoration();
    if (target.closest('[data-extra="modzgvari"]')) setModzgvariOpen(o => !o);
  };

  return (
    <div className={PROSE} onClick={onClick}>
      {segments.map((s, i) =>
        s.kind === 'html' ? (
          <div key={i} dangerouslySetInnerHTML={{ __html: s.html }} />
        ) : s.kind === 'girs' ? (
          <GirsArs key={i} />
        ) : (
          modzgvariOpen && <ExtraPrayer key={i} id="modzgvari-extra" onClose={() => setModzgvariOpen(false)} />
        )
      )}
    </div>
  );
};

// What replaces "ღირს არს" today. The button is filled when today has its own hymn, so it is noticed while praying.
const GirsArs: React.FC = () => {
  const [sections, setSections] = useState<GirsArsSection[] | null>(null);
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);

  useEffect(() => {
    let alive = true;
    loadGirsArs()
      .then(s => alive && setSections(s))
      .catch(() => alive && setSections([]));
    return () => {
      alive = false;
    };
  }, []);

  const today = sections ? girsArsFor(sections) : [];
  const special = today.length > 0;

  return (
    <div className="-mt-1.5 mb-4 font-sans">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12.5px] font-bold transition-colors cursor-pointer ${
          special ? 'bg-[#7a2028] text-[#fbf6ec] hover:bg-[#651a21]' : 'text-[#8a7a6a] ring-1 ring-[#e8dcc8] hover:text-[#7a2028] hover:ring-[#7a2028]/30'
        }`}
      >
        {special ? 'დღეს „ღირს არს“-ის ნაცვლად' : '„ღირს არს“-ის ნაცვლად საკითხავი'}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 rounded-xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-3.5 py-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {sections === null ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#7a2028] mx-auto" />
          ) : special ? (
            today.map(s => (
              <div key={s.title} className="mb-2 last:mb-0">
                <p className="!mb-1 text-[12px] font-bold text-[#7a2028]">დღეს — {s.title}</p>
                <div className={`${PROSE} !text-[16px]`} dangerouslySetInnerHTML={{ __html: s.html }} />
              </div>
            ))
          ) : (
            <p className="!mb-0 text-[13px] text-[#6b5544]">დღეს ჩვეულებრივ „ღირს არს“ იკითხება.</p>
          )}

          {sections && sections.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setAll(a => !a)}
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-[#8a7a6a] hover:text-[#7a2028] cursor-pointer"
              >
                წლის ყველა საკითხავი
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${all ? 'rotate-180' : ''}`} />
              </button>
              {all && (
                <div className="mt-2 space-y-3 border-t border-[#e8dcc8] pt-3">
                  {sections.map(s => (
                    <div key={s.title}>
                      <p className="!mb-0.5 text-[12.5px] font-bold text-[#7a2028]">
                        {s.title}
                        {s.note && <span className="font-normal text-[#8a7a6a]"> · {s.note}</span>}
                      </p>
                      <div className={`${PROSE} !text-[15px]`} dangerouslySetInnerHTML={{ __html: s.html }} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// A prayer from public/prayers unfolded inside another one.
const ExtraPrayer: React.FC<{ id: string; onClose: () => void }> = ({ id, onClose }) => {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/prayers/${id}.json`)
      .then(r => r.json())
      .then((d: { html: string }) => alive && setHtml(d.html))
      .catch(() => alive && setHtml('<p>ლოცვის ჩატვირთვა ვერ მოხერხდა.</p>'));
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="-mt-1.5 mb-4 rounded-xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-3.5 py-3 animate-in fade-in slide-in-from-top-1 duration-200">
      {html === null ? (
        <Loader2 className="w-5 h-5 animate-spin text-[#7a2028] mx-auto" />
      ) : (
        <div className={`${PROSE} !text-[16px] [&_h2]:!text-[15px]`} dangerouslySetInnerHTML={{ __html: html }} />
      )}
      <button type="button" onClick={onClose} className="mt-1 text-[12px] font-bold font-sans text-[#8a7a6a] hover:text-[#7a2028] cursor-pointer">
        ჩაკეცვა ▴
      </button>
    </div>
  );
};
