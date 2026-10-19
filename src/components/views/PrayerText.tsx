import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2, X } from 'lucide-react';
import { useNavigation } from '../../context';
import { Commemoration, NameListId, inGroupOrder, isCategoryList, namesText, useCommemoration } from '../../utils/commemoration';
import { GirsArsSection, girsArsFor, loadGirsArs } from '../../data/girsArs';
import { useAuth } from '../../context';
import { groupPrayerText, useGroupPrayerNames } from '../../hooks/usePsalter';
import { GLORY_PRAYER_HTML } from '../../data/gloryPrayer';
import { WEEK_DAYS } from '../../data/prayers';

// The text of a prayer, with these additions woven in:
// • "(სახელი)" / "(სახელები მათი)" show the student's names from მოსახსენებელი (tap → edit the lists);
// • under every "ღირს არს ჭეშმარიტად" a button shows what replaces it today;
// • the prayer for one's spiritual father gets "დამატებით" — the fuller prayer, unfolded in place;
// • the morning and evening prayers end with today's weekday prayer, folded.

export const PROSE =
  'font-serif-ge text-[17px] leading-[1.75] text-[#2a2017] [&_p]:mb-3.5 [&_p.c]:text-center [&_p.c]:mt-5 [&_p.c]:text-[#7a2028] ' +
  '[&_h2]:font-bold [&_h2]:text-[#7a2028] [&_h2]:text-center [&_h2]:text-lg max-[359px]:[&_h2]:text-[17px] [&_h2]:mt-6 [&_h2]:mb-3 [&_h2:first-child]:mt-0 ' +
  '[&_h3]:font-bold [&_h3]:text-[#7a2028] [&_h3]:text-center [&_h3]:text-[16px] [&_h3]:mt-6 [&_h3]:mb-2 ' +
  '[&_blockquote]:pl-4 [&_blockquote]:border-l-2 [&_blockquote]:border-[#e8dcc8] [&_blockquote]:text-[#4a3426] ' +
  '[&_em]:text-[#6b5544] [&_sup]:text-[11px] [&_hr]:my-5 [&_hr]:border-[#e8dcc8]';

// a span, not a button: a button stays one box, so a long list could not wrap from line to line
const NAME_CHIP =
  'inline rounded-md px-1 -mx-0.5 font-semibold text-[#7a2028] bg-[#7a2028]/[0.07] hover:bg-[#7a2028]/[0.13] cursor-pointer ' +
  '[box-decoration-break:clone] [-webkit-box-decoration-break:clone] [overflow-wrap:anywhere]';
const FOLD_BTN =
  'inline-flex items-center align-baseline px-2.5 py-0.5 rounded-full whitespace-nowrap text-[13px] font-sans font-bold text-[#7a2028] ring-1 ring-[#7a2028]/30 hover:bg-[#7a2028]/[0.06] cursor-pointer';
// a list longer than FOLD_AT shows its first FOLD_SHOW names and „კიდევ N ▾“; unfolded, it reads smaller, a category a line
const FOLD_AT = 12;
const FOLD_SHOW = 8;

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const plain = (html: string) => html.replace(/<[^>]+>/g, '');

// Which list a "(სახელი)" stands for, judged by the words just before it; null leaves it as written
// (one's spiritual father, patron saint, the patriarch, oneself).
const listFor = (before: string): NameListId | null => {
  const near = plain(before).slice(-220);
  if (/(გარდაცვალებულ|გარდაცვლილ|მიცვალებულ|განუსვენე|შესვენებულ)/.test(near)) return 'deceased';
  if (/(მოძღვ|მასწავლელ)/.test(near.slice(-45))) return null;
  if (/(წმიდაო|მამაჲ ჩუენი|მამა ჩვენი|მონასა შენსა|მონისა შენისა|შეპყრობილნი|წარტაცებულნი)[\s,:]*$/.test(near.slice(-70))) return null;
  // „განჰკურნენ მონანი ესე შენნი (სახელები)“ — the prayer for the sick
  if (/(განჰკურნ|სნეულ|უძლურ)/.test(near.slice(-60))) return 'sick';
  return 'living';
};

const NAMES_TITLE: Partial<Record<NameListId, string>> = {
  living: 'ცოცხალთა სახელები',
  deceased: 'გარდაცვლილთა სახელები',
  group: 'ჯგუფის წევრები',
  sick: 'უძლურებასა და განსაცდელსა შინა მყოფნი',
  trial: 'განსაცდელსა შინა მყოფნი',
};

const namesAttrs = (list: NameListId) => `role="button" tabindex="0" data-names="${list}" title="${NAMES_TITLE[list]} — შეცვლა"`;

// a list's names in a prayer, tapped to change them; `empty` shows while the list has none
const namesChip = (list: NameListId, names: string, empty: string) =>
  `<span ${namesAttrs(list)} class="${NAME_CHIP}${names ? '' : ' !font-normal !text-[#8a7a6a]'}">${names ? escapeHtml(names) : empty}</span>`;

// the names without a category first, then each category's
const nameGroups = (lists: Commemoration, list: NameListId) =>
  [{ title: '', names: lists[list] }, ...(isCategoryList(list) ? lists.sections[list] : [])].filter(g => g.names.length);

// a long list: folded — its first names and „კიდევ N ▾“; unfolded — a small box, a category a line, „ჩაკეცვა ▴“ under it
const foldedNames = (list: NameListId, lists: Commemoration, key: string, open: boolean) => {
  const groups = nameGroups(lists, list);
  const count = groups.reduce((n, g) => n + g.names.length, 0);
  if (count <= FOLD_AT) return namesChip(list, namesText(lists, list), '');
  if (!open) {
    let left = FOLD_SHOW;
    const parts: string[] = [];
    for (const g of groups) {
      if (left <= 0) break;
      const some = g.names.slice(0, left);
      left -= some.length;
      parts.push(`${g.title ? `${g.title}: ` : ''}${some.join(', ')}`);
    }
    return `${namesChip(list, `${parts.join('; ')} …`, '')} <button type="button" data-fold="${key}" aria-expanded="false" class="${FOLD_BTN}">კიდევ ${count - FOLD_SHOW} ▾</button>`;
  }
  const rows = groups
    .map(
      g =>
        `<span class="block mt-1.5 first:mt-0">${
          g.title ? `<span class="mr-0.5 whitespace-nowrap font-sans text-[11.5px] font-bold text-[#8a7a6a]">${escapeHtml(g.title)}</span> ` : ''
        }${escapeHtml(g.names.join(', '))}</span>`
    )
    .join('');
  return (
    `<span class="block my-2 rounded-xl bg-[#7a2028]/[0.045] ring-1 ring-[#7a2028]/12 px-3 pt-2 pb-1.5 text-left">` +
    `<span ${namesAttrs(list)} class="block text-[15px] leading-[1.6] font-semibold text-[#7a2028] cursor-pointer [overflow-wrap:anywhere]">${rows}</span>` +
    `<span class="flex justify-center mt-1.5"><button type="button" data-fold="${key}" aria-expanded="true" class="${FOLD_BTN}">ჩაკეცვა ▴</button></span>` +
    `</span>`
  );
};

const counter = (prefix: string) => {
  let n = 0;
  return () => `${prefix}${n++}`;
};

// `open`: the unfolded lists' keys; `nextKey` numbers each list in the text, so a list keeps its key while names change
const withNames = (block: string, lists: Commemoration, open: string[], nextKey: () => string) =>
  block.replace(/\((სახელ[^()]{0,30})\)/g, (match, _inner, offset: number) => {
    const list = listFor(block.slice(0, offset));
    if (!list) return match;
    const key = nextKey();
    return nameGroups(lists, list).length ? foldedNames(list, lists, key, open.includes(key)) : namesChip(list, '', match);
  });

type Segment = { kind: 'html'; html: string } | { kind: 'girs' } | { kind: 'modzgvari' } | { kind: 'glory'; n: number } | { kind: 'day' };

// where the closing notes (a rule and "¹ …" footnotes) begin: the day's prayer goes just before them
const notesStart = (blocks: string[]) => {
  let i = blocks.length;
  while (i > 0 && /^(<hr>|<p><sup>|\s*$)/.test(blocks[i - 1])) i--;
  return i;
};

// a kathisma's "დიდებაი." (the end of a stasis): tapping it unfolds the glory prayer with the group's names
const GLORY = /დიდებაი\.?\s*$/;
const GLORY_WORD = /(დიდებაი\.?)((?:\s|<\/[a-z0-9]+>)*)$/;

const GIRS = /ღირს[\s-]*არს\s+ჭეშმარიტად/;
const MODZGVARI_BTN =
  '<button type="button" data-extra="modzgvari" class="inline-flex items-center gap-0.5 align-baseline ml-1 px-2 py-0.5 rounded-full text-[13px] font-sans font-bold text-[#7a2028] ring-1 ring-[#7a2028]/30 hover:bg-[#7a2028]/[0.06] cursor-pointer">დამატებით ▾</button>';
const isModzgvari = (block: string) => /სულიერი\s+მამა/.test(block) && /\(მეტანია\)/.test(block);

const segment = (html: string, lists: Commemoration, glory: boolean, day: boolean, open: string[]): Segment[] => {
  const out: Segment[] = [];
  let buffer = '';
  let glories = 0;
  const nextKey = counter('n');
  const flush = () => {
    if (buffer) out.push({ kind: 'html', html: buffer });
    buffer = '';
  };
  // a <br> between two blocks (or after the last one) is only spacing — dropped; any other tag outside the
  // blocks (a line break between loose lines, <em>…) stays whole, so no "br>" turns up as text
  const cleaned = html.replace(/(<\/(?:p|h2|h3|blockquote)>|<hr>)(?:\s*<br\s*\/?>)+(?=\s*(?:<(?:p|h2|h3|blockquote|hr)\b|$))/gi, '$1');
  const blocks = cleaned.match(/<(p|h2|h3|blockquote)\b[^>]*>[\s\S]*?<\/\1>|<hr>|<[^>]*>|[^<]+/g) || [cleaned];
  const dayAt = day ? notesStart(blocks) : -1;
  for (const [i, raw] of blocks.entries()) {
    if (i === dayAt) {
      flush();
      out.push({ kind: 'day' });
    }
    let block = raw;
    const modzgvari = isModzgvari(block);
    const isGlory = glory && !modzgvari && GLORY.test(plain(block).trim());
    block = withNames(block, lists, open, nextKey);
    if (isGlory) {
      block = block.replace(
        GLORY_WORD,
        `<button type="button" data-glory="${glories}" class="inline-flex items-center gap-1 align-baseline px-2 -mx-0.5 rounded-lg font-bold text-[#7a2028] bg-[#7a2028]/[0.06] ring-1 ring-[#7a2028]/25 hover:bg-[#7a2028]/[0.1] cursor-pointer">$1 <span class="text-[12px]">▾</span></button>$2`
      );
    }
    if (modzgvari) {
      block = block.replace(
        /(\(მეტანია\)\.?)/,
        `$1 ${MODZGVARI_BTN}`
      );
    }
    buffer += block;
    if (modzgvari) {
      flush();
      out.push({ kind: 'modzgvari' });
    } else if (GIRS.test(plain(block))) {
      flush();
      out.push({ kind: 'girs' });
    } else if (isGlory) {
      flush();
      out.push({ kind: 'glory', n: glories++ });
    }
  }
  flush();
  if (dayAt === blocks.length) out.push({ kind: 'day' });
  return out;
};

/** `dayPrayer`: a weekday prayer's id, folded at the end of the text (before its footnotes). */
export const PrayerText: React.FC<{ html: string; glory?: boolean; dayPrayer?: string }> = ({ html, glory = false, dayPrayer }) => {
  const { openCommemoration } = useNavigation();
  const { lists } = useCommemoration();
  const { user } = useAuth();
  const fromGroups = useGroupPrayerNames(glory ? user?.uid : null);
  const groupNames = useMemo(
    () => [
      ...inGroupOrder(fromGroups, lists).map(groupPrayerText),
      ...lists.group.filter(n => !fromGroups.some(g => g.name === n)),
    ],
    [fromGroups, lists]
  );
  const [modzgvariOpen, setModzgvariOpen] = useState(false);
  const [gloryOpen, setGloryOpen] = useState<number[]>([]);
  const [namesOpen, setNamesOpen] = useState<string[]>([]);
  const gloryHtml = useMemo(
    () =>
      withNames(GLORY_PRAYER_HTML, lists, namesOpen, counter('g'))
        .replace('(ჯგუფი)', namesChip('group', groupNames.join(', '), '(სახელები)'))
        .replace(/(\(მეტანია\)\.?)(<\/p>)<!--extra-->/, `$1 ${MODZGVARI_BTN}$2<!--extra-->`),
    [groupNames, lists, namesOpen]
  );
  // folded under the group's names at „დიდებაი“: those in sickness and trials, then those in trials
  const sickHtml = useMemo(
    () =>
      `<p>მოიხსენე, უფალო, უძლურებასა და განსაცდელსა შინა მყოფნი მონანი და მხევალნი შენნი: ${namesChip('sick', lists.sick.join(', '), '(სახელები)')} <em>(მეტანია)</em>.</p>` +
      `<p>მოიხსენე, უფალო, განსაცდელსა შინა მყოფნი მონანი და მხევალნი შენნი: ${namesChip('trial', lists.trial.join(', '), '(სახელები)')} <em>(მეტანია)</em>.</p>`,
    [lists.sick, lists.trial]
  );
  const sickCount = lists.sick.length + lists.trial.length;
  const segments = useMemo(() => segment(html, lists, glory, Boolean(dayPrayer), namesOpen), [html, lists, glory, dayPrayer, namesOpen]);

  const onClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const fold = target.closest('[data-fold]');
    if (fold) {
      const key = fold.getAttribute('data-fold') || '';
      setNamesOpen(open => (open.includes(key) ? open.filter(k => k !== key) : [...open, key]));
      return;
    }
    if (target.closest('[data-names]')) openCommemoration();
    if (target.closest('[data-extra="modzgvari"]')) setModzgvariOpen(o => !o);
    const g = target.closest('[data-glory]');
    if (g) {
      const n = Number(g.getAttribute('data-glory'));
      setGloryOpen(list => (list.includes(n) ? list.filter(x => x !== n) : [...list, n]));
    }
  };

  return (
    <div
      className={PROSE}
      onClick={onClick}
      onKeyDown={e => {
        // the names are spans: Enter or Space opens the lists, as a button would
        if ((e.key === 'Enter' || e.key === ' ') && (e.target as HTMLElement).matches('[data-names]')) {
          e.preventDefault();
          openCommemoration();
        }
      }}
    >
      {segments.map((s, i) =>
        s.kind === 'html' ? (
          <div key={i} dangerouslySetInnerHTML={{ __html: s.html }} />
        ) : s.kind === 'girs' ? (
          <GirsArs key={i} />
        ) : s.kind === 'glory' ? (
          gloryOpen.includes(s.n) && (
            <GloryPrayer key={i} html={gloryHtml} sickHtml={sickHtml} sickCount={sickCount} extraOpen={modzgvariOpen} onCloseExtra={() => setModzgvariOpen(false)} onClose={() => setGloryOpen(list => list.filter(x => x !== s.n))} />
          )
        ) : s.kind === 'day' ? (
          dayPrayer && <DayPrayer key={i} id={dayPrayer} />
        ) : (
          modzgvariOpen && <ExtraPrayer key={i} id="modzgvari-extra" onClose={() => setModzgvariOpen(false)} />
        )
      )}
    </div>
  );
};

// Under a kathisma's "დიდებაი", once tapped: the glory prayer, with the group's members and one's departed by name;
// after the group, a fold for those in sickness and trials.
const GloryPrayer: React.FC<{
  html: string;
  sickHtml: string;
  sickCount: number;
  extraOpen: boolean;
  onCloseExtra: () => void;
  onClose: () => void;
}> = ({ html, sickHtml, sickCount, extraOpen, onCloseExtra, onClose }) => {
  const [sickOpen, setSickOpen] = useState(false);
  const [before, after = ''] = html.split('<!--extra-->');
  const [mid, rest = ''] = after.split('<!--sick-->');
  return (
    <div className="-mt-1.5 mb-5 rounded-2xl bg-[#7a2028]/[0.035] ring-1 ring-[#7a2028]/12 px-3.5 pt-3 pb-1.5 [&_p]:mb-2.5 [&_hr]:my-3">
      <div dangerouslySetInnerHTML={{ __html: before }} />
      {extraOpen && <ExtraPrayer id="modzgvari-extra" onClose={onCloseExtra} />}
      <div dangerouslySetInnerHTML={{ __html: mid }} />
      <div className="mb-2.5">
        <button
          type="button"
          onClick={() => setSickOpen(o => !o)}
          aria-expanded={sickOpen}
          className="inline-flex items-center gap-1.5 max-w-full min-h-9 px-3 py-1 rounded-full font-sans text-left text-[13px] leading-snug font-bold text-[#7a2028] ring-1 ring-[#7a2028]/30 hover:bg-[#7a2028]/[0.06] cursor-pointer"
        >
          უძლურებასა და განსაცდელსა შინა მყოფნი
          {sickCount > 0 && <span className="font-semibold text-[#b5a48c]">{sickCount}</span>}
          <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${sickOpen ? 'rotate-180' : ''}`} />
        </button>
        {sickOpen && <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-200" dangerouslySetInnerHTML={{ __html: sickHtml }} />}
      </div>
      <div dangerouslySetInnerHTML={{ __html: rest }} />
      <div className="text-center">
        <button type="button" onClick={onClose} className="h-9 px-3 rounded-full font-sans text-[12.5px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.06] cursor-pointer">დახურვა ▴</button>
      </div>
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

// Today's weekday prayer at the end of the morning or evening prayers: its name, unfolded by a tap.
const DayPrayer: React.FC<{ id: string }> = ({ id }) => (
  <FoldedPrayer id={id} label={`დღის ლოცვა · ${WEEK_DAYS[Number(id.split('-')[1])]}`} className="mt-7 mb-5" />
);

// A prayer folded under its name, unfolded by a tap (inside PROSE). The file's own heading becomes
// the name, so it is not repeated inside. `load` gives the html from elsewhere (a psalm cut out of its
// kathisma); `onRemove` adds a ✕ that takes it off one's own list; `woven` shows it as PrayerText (with the
// "ღირს არს" replacement button and names).
export const FoldedPrayer: React.FC<{ id: string; label: string; className?: string; load?: () => Promise<string>; onRemove?: () => void; woven?: boolean }> = ({
  id,
  label,
  className = '',
  load,
  onRemove,
  woven = false,
}) => {
  const [text, setText] = useState<{ title: string; body: string } | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    (load ? load() : fetch(`/prayers/${id}.json`).then(r => r.json()).then((d: { html: string }) => d.html))
      .then(html => {
        const head = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
        const title = head ? plain(head[1].replace(/,?\s*<br\s*\/?>\s*/g, ', ')).replace(/\s+/g, ' ').trim() : '';
        alive && setText({ title, body: head ? html.replace(head[0], '') : html });
      })
      .catch(() => alive && setText({ title: '', body: '<p>ლოცვის ჩატვირთვა ვერ მოხერხდა.</p>' }));
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <section className={`${className} rounded-2xl bg-[#7a2028]/[0.035] ring-1 ring-[#7a2028]/15`}>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="flex-1 min-w-0 min-h-14 px-4 py-3 flex items-center gap-3 text-left cursor-pointer rounded-2xl hover:bg-[#7a2028]/[0.04] transition-colors"
        >
          <span className="flex-1 min-w-0">
            <span className="block font-sans text-[12px] font-bold text-[#8a7a6a]">{label}</span>
            {text?.title && <span className="block mt-0.5 text-[16px] font-bold leading-snug text-[#7a2028]">{text.title}</span>}
          </span>
          <ChevronDown className={`w-5 h-5 shrink-0 text-[#7a2028] transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="სიიდან ამოღება"
            title="სიიდან ამოღება"
            className="w-9 h-9 mr-2 shrink-0 rounded-full flex items-center justify-center text-[#8a7a6a] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.06] cursor-pointer active:scale-90 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && (
        <div className="px-4 pb-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {text === null ? (
            <Loader2 className="w-5 h-5 my-3 animate-spin text-[#7a2028] mx-auto" />
          ) : woven ? (
            <PrayerText html={text.body} />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: text.body }} />
          )}
          <div className="text-center">
            <button type="button" onClick={() => setOpen(false)} className="h-9 px-3 rounded-full font-sans text-[12.5px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.06] cursor-pointer">
              ჩაკეცვა ▴
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
