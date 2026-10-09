import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import {
  BookOpen, CalendarDays, ExternalLink, Globe, Link2, Music, Music2, Plus, ScrollText, Search, Sparkles, Users, X,
} from 'lucide-react';
import { SEARCH_GROUPS, SearchGroupId } from '../../data/searchIndex';
import { coreOf, sectionOfShortcut } from '../../utils/shortcuts';
import { HabitLink, MAX_LINKS, MAX_NOTE, MyHabit, normalizeUrl, siteName } from '../../utils/myHabits';
import { shortcutIcon } from '../home/ShortcutShelf';
import { Btn, FIELD } from '../ui/kit';

// A habit's own buttons (anything the one search finds, or another site) and its note: the chips under a
// habit, and the part of the habit's edit sheet where they are chosen.

const SearchPanel = lazy(() => import('../search/SearchPanel').then(m => ({ default: m.SearchPanel })));

const GROUP_ICON: Record<SearchGroupId, React.ReactNode> = {
  fn: <Sparkles />, chant: <Music2 />, prayer: <ScrollText />, psalter: <BookOpen />, song: <Music />, ancestor: <Users />, feast: <CalendarDays />,
};

export const linkIcon = (l: HabitLink): React.ReactNode =>
  l.kind === 'url' ? <Globe /> : l.icon ? shortcutIcon(l.icon) : GROUP_ICON[l.group] || <Sparkles />;

const linkSub = (l: HabitLink) => (l.kind === 'url' ? siteName(l.url) : l.sub || SEARCH_GROUPS.find(g => g.id === l.group)?.title || '');

/** what a picked button keeps: the button id (utils/shortcuts) opens it */
const fromButton = (id: string, title: string, sub?: string): HabitLink => ({
  kind: 'find',
  title,
  group: 'fn',
  icon: id,
  section: sectionOfShortcut(id),
  open: { kind: 'shortcut', id },
  // Firestore takes no undefined
  ...(sub ? { sub } : {}),
});

const buttonOf = (l: HabitLink) => (l.kind === 'find' && l.open.kind === 'shortcut' ? coreOf(l.open.id) : null);

const sameLink = (a: HabitLink, b: HabitLink) =>
  a.kind === 'url' ? b.kind === 'url' && a.url === b.url : b.kind === 'find' && JSON.stringify(a.open) === JSON.stringify(b.open);

const CHIP =
  'min-h-9 max-w-full px-3 rounded-full inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#7a2028] bg-[#7a2028]/[0.06] hover:bg-[#7a2028]/[0.12] cursor-pointer active:scale-[0.97] transition [&>svg]:w-3.5 [&>svg]:h-3.5 [&>svg]:shrink-0';

/** One of a habit's buttons, under its name: a site opens in a new tab, the rest open in the app. */
export const HabitLinkChip: React.FC<{ link: HabitLink; onOpen: () => void }> = ({ link, onOpen }) =>
  link.kind === 'url' ? (
    <a href={link.url} target="_blank" rel="noopener noreferrer" className={CHIP} title={link.url}>
      {linkIcon(link)}
      <span className="truncate">{link.title}</span>
      <ExternalLink className="opacity-60" />
    </a>
  ) : (
    <button type="button" onClick={onOpen} className={CHIP}>
      {linkIcon(link)}
      <span className="truncate">{link.title}</span>
    </button>
  );

const LABEL = 'flex items-center gap-1.5 px-0.5 pb-2 text-[13px] font-bold text-[#6a5646] [&>svg]:w-4 [&>svg]:h-4 [&>svg]:text-[#7a2028]';

// "ლინკის ჩასმა": the address, and a name for its button (the site's name when left empty)
const UrlForm: React.FC<{ onAdd: (l: HabitLink) => void; onCancel: () => void }> = ({ onAdd, onCancel }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [bad, setBad] = useState(false);
  const add = () => {
    const href = normalizeUrl(url);
    if (!href) { setBad(true); return; }
    onAdd({ kind: 'url', url: href, title: title.trim() || siteName(href) });
  };
  return (
    <div className="space-y-2.5 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] p-3 animate-in fade-in duration-150">
      <input
        value={url}
        onChange={e => { setUrl(e.target.value); setBad(false); }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        type="url"
        inputMode="url"
        placeholder="მისამართი, მაგ. galoba.edu.ge"
        aria-label="მისამართი"
        aria-invalid={bad}
        className={`${FIELD} ${bad ? '!ring-2 !ring-red-300' : ''}`}
        autoFocus
      />
      {bad && <p className="px-1 text-[12.5px] font-semibold text-red-700">მისამართი ვერ ვიცანი — მაგ. https://galoba.edu.ge</p>}
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        maxLength={40}
        placeholder="ღილაკის სახელი (არასავალდებულო)"
        aria-label="ღილაკის სახელი"
        className={FIELD}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Btn size="sm" kind="ghost" onClick={onCancel}>გაუქმება</Btn>
        <Btn size="sm" icon={<Plus />} disabled={!url.trim()} onClick={add}>დამატება</Btn>
      </div>
    </div>
  );
};

/** In a habit's edit sheet: its buttons (found by the search or a site's address) and its note. */
export const HabitExtras: React.FC<{
  habit: MyHabit;
  onLinks: (links: HabitLink[]) => void;
  onNote: (note: string) => void;
}> = ({ habit, onLinks, onNote }) => {
  const links = habit.links || [];
  const [finding, setFinding] = useState(false);
  const [typing, setTyping] = useState(false);
  const full = links.length >= MAX_LINKS;
  const add = (l: HabitLink) => {
    if (!links.some(x => sameLink(x, l))) onLinks([...links, l]);
  };

  // the note is saved when the field is left, and when the sheet goes away with it still open
  const [note, setNote] = useState(habit.note || '');
  const latest = useRef({ note, saved: habit.note || '', onNote });
  latest.current.note = note;
  latest.current.onNote = onNote;
  const flush = () => {
    const { note: n, saved } = latest.current;
    if (n.trim() === saved.trim()) return;
    latest.current.saved = n;
    latest.current.onNote(n);
  };
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <section>
        <h4 className={LABEL}>
          <Link2 />
          სხვა ღილაკები
          <span className="ml-auto text-[12px] font-semibold text-[#a08a76] tabular-nums">{links.length} / {MAX_LINKS}</span>
        </h4>
        {links.length > 0 && (
          <ul className="mb-2.5 rounded-2xl ring-1 ring-[#e8dcc8] bg-white divide-y divide-[#f1e8d9]">
            {links.map((l, i) => (
              <li key={i} className="flex items-center gap-2.5 pl-3 pr-1.5 py-1.5">
                <span className="w-8 h-8 shrink-0 rounded-lg bg-[#7a2028]/[0.07] text-[#7a2028] flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4">
                  {linkIcon(l)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-medium leading-snug text-[#2a2017] truncate">{l.title}</span>
                  <span className="block text-[11.5px] text-[#8a7a6a] truncate">{linkSub(l)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onLinks(links.filter((_, j) => j !== i))}
                  aria-label={`${l.title} — მოხსნა`}
                  className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[#a08a76] hover:text-red-700 hover:bg-red-50 cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {typing ? (
          <UrlForm onAdd={l => { add(l); setTyping(false); }} onCancel={() => setTyping(false)} />
        ) : full ? (
          <p className="px-1 text-[12.5px] text-[#8a7a6a]">მეტი ღილაკი აღარ ეტევა — ჯერ ერთი მოხსენი.</p>
        ) : (
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2">
            <Btn kind="soft" icon={<Search />} onClick={() => setFinding(true)}>ძებნით</Btn>
            <Btn kind="soft" icon={<Globe />} onClick={() => setTyping(true)}>ლინკი</Btn>
          </div>
        )}
      </section>

      <section>
        <label htmlFor={`note-${habit.id}`} className={LABEL}>
          <ScrollText />
          ჩანაწერი
          <span className="ml-auto text-[12px] font-semibold text-[#a08a76]">ჩანს ⓘ-ზე შეხებით</span>
        </label>
        <textarea
          id={`note-${habit.id}`}
          value={note}
          onChange={e => setNote(e.target.value.slice(0, MAX_NOTE))}
          onBlur={flush}
          rows={3}
          placeholder="მაგ. რომელი წიგნი ვიკითხო, რა უნდა მახსოვდეს…"
          className={`${FIELD} !h-auto min-h-[88px] py-2.5 leading-relaxed resize-y`}
        />
      </section>

      {finding && (
        <Suspense fallback={<div className="fixed inset-0 z-[88] bg-[#2a2017]/45" />}>
          <SearchPanel
            onClose={() => setFinding(false)}
            pick={{
              title: `„${habit.label}“ — რა მივამაგრო? · ${links.length}/${MAX_LINKS}`,
              isOn: id => links.some(l => buttonOf(l) === coreOf(id)),
              full,
              fullNote: 'მეტი ღილაკი აღარ ეტევა — ჯერ ერთი მოხსენი.',
              // a second tap takes it off again
              onPick: (id, title, sub) =>
                links.some(l => buttonOf(l) === coreOf(id))
                  ? onLinks(links.filter(l => buttonOf(l) !== coreOf(id)))
                  : !full && add(fromButton(id, title, sub)),
            }}
          />
        </Suspense>
      )}
    </div>
  );
};
