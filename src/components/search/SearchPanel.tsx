import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, CalendarDays, ChevronRight, Lightbulb, Lock, Music, Music2, ScrollText, Search, Sparkles, Users, X, BookOpen,
} from 'lucide-react';
import { useAuth, useNavigation } from '../../context';
import { useAccess } from '../../hooks/useAccess';
import { useMyClasses } from '../../hooks/useClasses';
import { openChurchCalendar } from '../../data/churchCalendar';
import { SEARCH_GROUPS, SearchGroupId, SearchHit, SearchItem, buildSearchIndex, runSearch } from '../../data/searchIndex';
import { requestOpen } from '../../utils/searchOpen';
import { triggerHaptic } from '../../utils/haptics';
import { shortcutIcon, useOpenShortcut } from '../home/ShortcutShelf';
import { askSignIn } from '../access/SignInPrompt';

// The one search over the whole app: chants, prayers, the psalter, songs, the great chanters, feasts and
// the app's own functions. Full screen on a phone, a centred window from sm up. GlobalSearch opens it.

const RECENT_KEY = 'sgSearchRecent';
const MAX_RECENT = 6;
const FIRST_ROWS = 5; // rows a group shows before "ყველა"
const MAX_ROWS = 80; // a long group stops here and asks for a closer query

const readRecent = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
};
const saveRecent = (key: string) => {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([key, ...readRecent().filter(k => k !== key)].slice(0, MAX_RECENT))); } catch { /* storage off */ }
};

const GROUP_ICON: Record<SearchGroupId, React.ReactNode> = {
  fn: <Sparkles />, chant: <Music2 />, prayer: <ScrollText />, psalter: <BookOpen />, song: <Music />, ancestor: <Users />, feast: <CalendarDays />,
};
const GROUP_TILE: Record<SearchGroupId, string> = {
  fn: 'bg-[#7a2028]/[0.08] text-[#7a2028]',
  chant: 'bg-[#f6ecda] text-[#8a5a2a]',
  prayer: 'bg-[#efe5f3] text-[#6b3f7a]',
  psalter: 'bg-[#e8eef6] text-[#35557a]',
  song: 'bg-[#e6f1e6] text-[#3d6b3d]',
  ancestor: 'bg-[#f3e6dc] text-[#7a4a2a]',
  feast: 'bg-[#fbe9e4] text-[#9a3324]',
};
const groupTitle = (id: SearchGroupId) => SEARCH_GROUPS.find(g => g.id === id)?.title || '';

// the typed words in bold, when they stand in the title as typed
const Marked: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  const q = query.trim();
  const at = q ? text.indexOf(q) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent text-[#7a2028] font-bold">{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
};

interface RowProps {
  it: SearchItem;
  query: string;
  locked: boolean;
  active: boolean;
  id: string;
  onPick: () => void;
  onHover: () => void;
}

const Row: React.FC<RowProps> = ({ it, query, locked, active, id, onPick, onHover }) => (
  <button
    id={id}
    type="button"
    role="option"
    aria-selected={active}
    onClick={onPick}
    onMouseMove={onHover}
    className={`w-full min-h-14 flex items-center gap-3 px-2.5 py-2 rounded-2xl text-left cursor-pointer transition-colors active:scale-[0.99] ${
      active ? 'bg-[#7a2028]/[0.06]' : 'hover:bg-[#7a2028]/[0.04]'
    }`}
  >
    <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center [&>svg]:w-[18px] [&>svg]:h-[18px] ${GROUP_TILE[it.group]}`}>
      {it.icon ? shortcutIcon(it.icon) : GROUP_ICON[it.group]}
    </span>
    <span className="flex-1 min-w-0">
      <span className="block font-serif-ge text-[15px] leading-snug text-[#2a2017] line-clamp-2">
        <Marked text={it.title} query={query} />
      </span>
      {it.sub && <span className="mt-0.5 block text-[12px] leading-snug text-[#8a7a6a] truncate">{it.sub}</span>}
    </span>
    {locked
      ? <Lock className="w-4 h-4 shrink-0 text-[#b8a68e]" aria-label="საჭიროა შესვლა" />
      : <ChevronRight className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-[#7a2028]' : 'text-[#cdbba3]'}`} />}
  </button>
);

const GroupHead: React.FC<{ title: string; count?: number; right?: React.ReactNode }> = ({ title, count, right }) => (
  <div className="flex items-center gap-2 px-2.5 pt-4 pb-1.5">
    <h3 className="text-[12px] font-bold tracking-wide text-[#8a5a2a]">{title}</h3>
    {count !== undefined && <span className="text-[11px] font-bold text-[#b8a68e] tabular-nums">{count}</span>}
    <span className="flex-1 h-px bg-[#e8dcc8]" aria-hidden />
    {right}
  </div>
);

export const SearchPanel: React.FC<{ onClose: () => void; onChoose: (action: () => void) => void }> = ({ onClose, onChoose }) => {
  const { user, isOwner, isTeacher } = useAuth();
  const { navigateTo, setSelectedService, setExpandedChantId, setChantSearch } = useNavigation();
  const access = useAccess();
  const classes = useMyClasses(user?.uid);
  const openShortcut = useOpenShortcut();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const [expanded, setExpanded] = useState<Set<SearchGroupId>>(new Set());
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState(readRecent);
  const inputRef = useRef<HTMLInputElement>(null);

  const index = useMemo(
    () => buildSearchIndex({ signedIn: !!user, owner: isOwner, teacher: isTeacher, hasClass: classes.length > 0 }),
    [user, isOwner, isTeacher, classes.length]
  );
  // hidden sections (the admin's switches, the kids' mode) and unbuilt ones are not offered at all
  const shown = (it: SearchItem) => !it.section || (access.section(it.section) !== 'hidden' && access.section(it.section) !== 'soon');
  const isLocked = (it: SearchItem) => Boolean(it.section && access.section(it.section) === 'locked');

  const results = useMemo(
    () => runSearch(index, deferred).map(g => ({ ...g, hits: g.hits.filter(h => shown(h.item)) })).filter(g => g.hits.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, deferred, access]
  );
  const total = results.reduce((n, g) => n + g.hits.length, 0);

  const byKey = useMemo(() => new Map(index.map(it => [it.key, it])), [index]);
  const recentItems = recent.map(k => byKey.get(k)).filter((x): x is SearchItem => !!x && shown(x));
  // the sections and the special pages (the library's tabs are found by name)
  const quick = index.filter(it => it.group === 'fn' && it.open.kind !== 'library' && shown(it));

  // the rows on screen, in order, for the arrow keys
  const rows: SearchItem[] = deferred.trim()
    ? results.flatMap(g => g.hits.slice(0, expanded.has(g.group) ? MAX_ROWS : FIRST_ROWS).map(h => h.item))
    : recentItems;

  useEffect(() => { setActive(0); setExpanded(new Set()); }, [deferred]);
  useEffect(() => {
    // a phone's keyboard comes up with the window
    const t = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 30);
    return () => window.clearTimeout(t);
  }, []);

  const pick = (it: SearchItem) => {
    triggerHaptic(10);
    // guests: the sign-in prompt shows once the search is closed
    if (isLocked(it)) { onChoose(() => askSignIn(it.title)); return; }
    saveRecent(it.key);
    setRecent(readRecent());
    const o = it.open;
    onChoose(() => {
      switch (o.kind) {
        case 'shortcut': openShortcut(o.id); return;
        case 'chant':
          // the service's list, narrowed to this chant and unfolded
          navigateTo('galoba');
          setSelectedService(o.service);
          setExpandedChantId(o.chantId);
          setChantSearch(o.title);
          window.scrollTo({ top: 0 });
          return;
        case 'song': requestOpen('simghera', o.id); navigateTo('simghera'); return;
        case 'ancestor': requestOpen('tsinaprebi', String(o.id)); navigateTo('tsinaprebi'); return;
        case 'library': requestOpen('biblioteka', o.tab); navigateTo('biblioteka'); return;
        case 'feast': openChurchCalendar(o.iso); return;
      }
    });
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!rows.length) return;
      e.preventDefault();
      const next = (active + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
      setActive(next);
      document.getElementById(`sg-find-${next}`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      const it = rows[active];
      if (it) { e.preventDefault(); pick(it); }
    }
  };

  let rowNo = 0;
  const row = (it: SearchItem) => {
    const n = rowNo++;
    return (
      <Row key={it.key} it={it} query={deferred} locked={isLocked(it)} active={n === active} id={`sg-find-${n}`}
        onPick={() => pick(it)} onHover={() => setActive(n)} />
    );
  };

  return (
    <div className="fixed inset-0 z-[88] flex sm:items-start justify-center sm:pt-[min(8vh,4rem)] sm:px-4 bg-[#2a2017]/45 backdrop-blur-[2px] sg-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="ძიება"
        onClick={e => e.stopPropagation()}
        onKeyDown={onKey}
        className="relative w-full sm:max-w-xl h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-2*min(8vh,4rem))] flex flex-col overflow-hidden bg-[#fbf6ec] sm:rounded-[28px] sm:ring-1 sm:ring-[#e8dcc8] shadow-2xl sg-up"
      >
        {/* the field */}
        <div className="safe-top safe-x border-b border-[#e8dcc8]">
          <div className="flex items-center gap-2 px-3 sm:px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden w-10 h-10 shrink-0 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] flex items-center justify-center cursor-pointer active:scale-95"
              aria-label="დახურვა"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <label className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#7a2028] pointer-events-none" />
              <input
                ref={inputRef}
                type="search"
                enterKeyHint="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="რას ეძებ?"
                aria-label="ძიება"
                aria-controls="sg-find-list"
                className="w-full h-12 pl-11 pr-11 rounded-2xl bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/35 outline-none text-[16px] text-[#2a2017] placeholder:text-[#a39482] [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full text-[#8a7a6a] hover:text-[#7a2028] hover:bg-[#7a2028]/5 flex items-center justify-center cursor-pointer"
                  aria-label="გასუფთავება"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </label>
            <button
              type="button"
              onClick={onClose}
              className="hidden sm:flex w-10 h-10 shrink-0 rounded-full text-[#8a7a6a] hover:text-[#7a2028] hover:bg-[#7a2028]/5 items-center justify-center cursor-pointer"
              aria-label="დახურვა"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* results, or what was opened lately and the functions */}
        <div id="sg-find-list" role="listbox" aria-label="შედეგები" className="safe-x flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="px-2 sm:px-3 pb-4">
            {deferred.trim() ? (
              total ? (
                results.map(g => {
                  const open = expanded.has(g.group);
                  const list: SearchHit[] = g.hits.slice(0, open ? MAX_ROWS : FIRST_ROWS);
                  const more = g.hits.length - list.length;
                  return (
                    <section key={g.group}>
                      <GroupHead title={groupTitle(g.group)} count={g.hits.length} />
                      {list.map(h => row(h.item))}
                      {more > 0 && !open && (
                        <button
                          type="button"
                          onClick={() => { triggerHaptic(8); setExpanded(s => new Set(s).add(g.group)); }}
                          className="ml-[3.75rem] mt-0.5 h-9 px-3 rounded-full text-[13px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.06] cursor-pointer"
                        >
                          კიდევ {more} →
                        </button>
                      )}
                      {open && more > 0 && (
                        <p className="ml-[3.75rem] mt-1 text-[12px] text-[#8a7a6a]">კიდევ {more} — დააზუსტე ძიება</p>
                      )}
                    </section>
                  );
                })
              ) : (
                <div className="py-14 px-6 text-center">
                  <Search className="w-7 h-7 mx-auto text-[#d9c8ac]" />
                  <p className="mt-3 font-serif-ge text-[15px] font-bold text-[#4a3426]">ვერაფერი მოიძებნა</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#8a7a6a]">სცადე სიტყვის ნაწილი, მაგალითად „ღირს“ ან „კანონი 5“</p>
                </div>
              )
            ) : (
              <>
                {recentItems.length > 0 && (
                  <section>
                    <GroupHead
                      title="ბოლოს გახსნილი"
                      right={
                        <button
                          type="button"
                          onClick={() => { try { localStorage.removeItem(RECENT_KEY); } catch { /* storage off */ } setRecent([]); }}
                          className="h-8 px-2.5 rounded-full text-[12px] font-bold text-[#8a7a6a] hover:text-[#7a2028] hover:bg-[#7a2028]/5 cursor-pointer"
                        >
                          გასუფთავება
                        </button>
                      }
                    />
                    {recentItems.map(row)}
                  </section>
                )}
                <GroupHead title="სწრაფი გადასვლა" />
                <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-1.5 px-1">
                  {quick.map(it => (
                    <button
                      key={it.key}
                      type="button"
                      onClick={() => pick(it)}
                      className="min-h-12 flex items-center gap-2.5 px-2.5 py-2 rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.06] hover:ring-[#7a2028]/30 text-left cursor-pointer active:scale-[0.98] transition-all"
                    >
                      <span className="relative w-8 h-8 shrink-0 rounded-lg bg-[#7a2028]/[0.07] text-[#7a2028] flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4">
                        {it.icon ? shortcutIcon(it.icon) : <Sparkles />}
                        {/* guests: a small lock on the icon, so the name keeps the width */}
                        {isLocked(it) && (
                          <span className="absolute -right-1.5 -bottom-1.5 w-[18px] h-[18px] rounded-full bg-white ring-1 ring-[#e8dcc8] flex items-center justify-center" aria-label="საჭიროა შესვლა">
                            <Lock className="!w-2.5 !h-2.5 text-[#8a7a6a]" />
                          </span>
                        )}
                      </span>
                      <span className="flex-1 min-w-0 text-[13px] font-semibold leading-tight text-[#2a2017]">{it.title}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-5 px-3 flex items-start gap-2 text-[12.5px] leading-relaxed text-[#8a7a6a]">
                  <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-[#cdbba3]" />
                  <span>მოძებნე საგალობელი, ლოცვა, დაუჯდომელი, ფსალმუნი („ფს 50“), სახარების თავი („მათე 5“), სიმღერა, მგალობელი ან დღესასწაული.</span>
                </p>
              </>
            )}
          </div>
          <div className="safe-bottom" aria-hidden />
        </div>
      </div>
    </div>
  );
};
