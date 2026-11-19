import React, { Fragment, useEffect, useRef, useState } from 'react';
import {
  Bot, BookOpen, CalendarDays, CheckCheck, ChevronDown, Church, Clock, Guitar, Lock, Mic, Music, Music2, ScrollText, Search, Sparkles, UserRound, Users, X,
} from 'lucide-react';
import { Chips, Dot, FOCUS, Helper, Note, Press, RoundButton, Row, Rows, SectionLabel, TopBar, cx } from '../../../components/ui2';
import { SEARCH_GROUPS, type SearchGroupId } from '../../../data/searchIndex';
import { shortcutIcon } from '../../../components/home/ShortcutShelf';

// The new look's search page as a picture of its props (prototypes `dzebna`, `dzebna-shedegi`, `dzebna-carieli`): the field in
// the bar, the kinds as chips, then what was opened lately and often — or the results by group — or „ვერაფერი მოიძებნა“.

export type SearchFilter = 'all' | SearchGroupId;

/** one row of the search as the page shows it */
export interface SearchRow {
  key: string;
  group: SearchGroupId;
  title: string;
  sub?: string;
  /** a home button's id: a function's row shows that button's icon */
  icon?: string;
  /** a guest's: the row asks to sign in */
  locked?: boolean;
}

export interface SearchViewProps {
  /** the words in the field */
  query: string;
  /** the words the results are for (they follow the field a moment later) */
  searched: string;
  onQuery: (q: string) => void;
  onBack: () => void;
  filter: SearchFilter;
  onFilter: (f: SearchFilter) => void;
  /** the kinds offered after „ყველა“; none = no chips */
  chips: SearchGroupId[];
  /** the results, best group first (already narrowed to the chosen kind) */
  groups: { group: SearchGroupId; rows: SearchRow[] }[];
  /** results the chosen kind leaves out */
  elsewhere?: number;
  recent: SearchRow[];
  onClearRecent: () => void;
  /** four tiles */
  often: SearchRow[];
  onOpen: (row: SearchRow) => void;
  autoFocus?: boolean;
  /** a round 🎤 in the empty field (only where the browser can listen) */
  onVoice?: () => void;
  /** words came from speech and the field was not touched since: a small line under it */
  heardNote?: boolean;
  /** „ძებნა სიმღერით“ under the field (only where the microphone can be used) */
  onSing?: () => void;
  /** „AI დამხმარე“ — the school's assistant — under „ვერაფერი მოიძებნა“ (only where it is open for the person: teachers) */
  onAsk?: () => void;
  /** „მკითხე“, the app's helper (everyone): a quiet button under the field, and „ჰკითხე დამხმარეს“ under „ვერაფერი
   *  მოიძებნა“ with the words that found nothing */
  onHelper?: (words?: string) => void;
}

const FIRST_ROWS = 5; // rows a group shows before „კიდევ N“
const MAX_ROWS = 80; // a long group stops here and asks for a closer query

/** a chip's name: one of a kind */
export const CHIP_LABEL: Record<SearchGroupId, string> = {
  chant: 'გალობა', song: 'სიმღერა', prayer: 'ლოცვა', psalter: 'ფსალმუნი', fn: 'ფუნქცია', feast: 'დღესასწაული',
  ancestor: 'წინაპარი', church: 'ტაძარი', person: 'ადამიანი',
};
/** the chips' order (it never moves while typing) */
export const CHIP_ORDER: SearchGroupId[] = ['chant', 'song', 'prayer', 'psalter', 'fn', 'feast', 'ancestor', 'church', 'person'];

const groupTitle = (id: SearchGroupId) => SEARCH_GROUPS.find(g => g.id === id)?.title ?? '';

const GROUP_ICON: Record<SearchGroupId, React.ReactNode> = {
  fn: <Sparkles />, chant: <Music />, prayer: <BookOpen />, psalter: <ScrollText />, song: <Guitar />, ancestor: <Users />,
  feast: <CalendarDays />, church: <Church />, person: <UserRound />,
};
// the prototypes' own marks for the usual tiles
const KEY_ICON: Record<string, React.ReactNode> = {
  'special:class': <Users />, 'section:chvevebi': <CheckCheck />, 'section:galoba': <Music />, 'section:simghera': <Guitar />,
};
const iconOf = (r: SearchRow): React.ReactNode => {
  if (KEY_ICON[r.key]) return KEY_ICON[r.key];
  if (r.key.startsWith('service:')) return <Music />;
  if (r.group === 'fn' && r.icon) return shortcutIcon(r.icon);
  return GROUP_ICON[r.group];
};

const LockMark: React.FC = () => <Lock aria-label="საჭიროა შესვლა" className="size-4 shrink-0 text-mut" strokeWidth={1.75} />;

/** the field inside the bar: wine ring while focused or filled, ✕ while filled */
const Field: React.FC<{
  value: string; onChange: (q: string) => void; onEnter: () => void; inputRef: React.RefObject<HTMLInputElement | null>;
  onVoice?: () => void;
}> = ({ value, onChange, onEnter, inputRef, onVoice }) => (
  <label className={cx(
    'flex h-tap-lg min-w-0 flex-1 items-center gap-2.5 rounded-full bg-surf pl-4 text-mut transition-shadow focus-within:ring-2 focus-within:ring-wine',
    value ? 'pr-2 ring-2 ring-wine' : 'pr-4',
  )}>
    <Search aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
    <input
      ref={inputRef}
      type="search"
      enterKeyHint="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onEnter(); } }}
      placeholder="რას ეძებ?"
      aria-label="რას ეძებ?"
      autoComplete="off"
      className={cx(
        'h-full min-w-0 flex-1 bg-transparent p-0 text-lead font-semibold text-ink outline-none',
        'placeholder:text-body placeholder:font-normal placeholder:text-mut',
        '[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
      )}
    />
    {value && (
      <RoundButton label="გასუფთავება" size={36} tone="page" onClick={() => { onChange(''); inputRef.current?.focus(); }}>
        <X aria-hidden="true" strokeWidth={1.75} />
      </RoundButton>
    )}
    {!value && onVoice && (
      <RoundButton label="თქვი ხმით" size={36} tone="page" onClick={onVoice}>
        <Mic aria-hidden="true" strokeWidth={1.75} />
      </RoundButton>
    )}
  </label>
);

/** a white tile of „ხშირად გახსნილი“ */
const Tile: React.FC<{ row: SearchRow; onOpen: () => void }> = ({ row, onOpen }) => (
  <Press
    onClick={onOpen}
    className={cx(
      'flex min-h-[72px] min-w-0 cursor-pointer items-center gap-2.5 rounded-tile bg-surf px-3 py-2 text-left text-ink transition active:scale-[0.98]',
      FOCUS,
    )}
  >
    <Dot icon={iconOf(row)} />
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="text-body leading-tight font-bold wrap-break-word">{row.title}</span>
      {row.sub && <span className="truncate text-meta text-mut">{row.sub}</span>}
    </span>
    {row.locked && <LockMark />}
  </Press>
);

/** the rows opened lately as pills (under the results and when nothing was found) */
const RecentChips: React.FC<{ rows: SearchRow[]; onOpen: (r: SearchRow) => void }> = ({ rows, onOpen }) => (
  <div role="group" aria-label="ბოლოს ეძებდი" className="flex shrink-0 flex-wrap gap-x-2 gap-y-1">
    {rows.map((r, i) => (
      <Press key={`${r.key}-${i}`} onClick={() => onOpen(r)} className="group flex h-tap max-w-full shrink-0 cursor-pointer items-center rounded-full focus-visible:outline-none">
        <span className={cx(
          'flex h-10 max-w-full min-w-tap items-center justify-center gap-1.5 rounded-full bg-surf px-4 text-body font-semibold whitespace-nowrap text-ink transition',
          'group-active:scale-[0.97] group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-wine/60',
        )}>
          <span className="min-w-0 truncate">{r.title}</span>
          {r.locked && <LockMark />}
        </span>
      </Press>
    ))}
  </div>
);

export const SearchView: React.FC<SearchViewProps> = ({
  query, searched, onQuery, onBack, filter, onFilter, chips, groups, elsewhere = 0, recent, onClearRecent, often, onOpen, autoFocus, onVoice, heardNote, onSing, onAsk,
  onHelper,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const typed = searched.trim() !== '';
  const [unfolded, setUnfolded] = useState<Set<SearchGroupId>>(new Set());
  useEffect(() => { setUnfolded(new Set()); }, [searched, filter]);
  useEffect(() => {
    if (!autoFocus) return;
    // a phone's keyboard comes up with the page
    const t = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 30);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const first = groups[0]?.rows[0];
  const row = (r: SearchRow, i: number, recentRow = false) => (
    <Row
      key={`${r.key}-${i}`}
      lead={<Dot icon={recentRow ? <Clock /> : iconOf(r)} />}
      title={r.title}
      sub={r.sub}
      right={r.locked ? <LockMark /> : undefined}
      onClick={() => onOpen(r)}
    />
  );

  return (
    <div className="flex flex-col pb-5">
      <TopBar title="ძებნა" onBack={onBack} className="sticky top-[env(safe-area-inset-top,0px)] z-10 -mx-4 bg-page px-4">
        <Field value={query} onChange={onQuery} onEnter={() => first && onOpen(first)} inputRef={inputRef} onVoice={onVoice} />
      </TopBar>

      {heardNote && typed && (
        <Helper icon={<Mic />} className="pb-2">ასე გავიგე. თუ სხვა თქვი — შეეხე ველს და შეასწორე.</Helper>
      )}
      {(onSing || onHelper) && !typed && (
        // quiet ways besides the words: sing it, or ask the app's helper (they wrap under each other on a narrow phone)
        <div className="mb-1 flex shrink-0 flex-wrap gap-x-3">
          {onSing && (
            <Press
              onClick={onSing}
              className={cx('flex h-tap shrink-0 cursor-pointer items-center gap-2 self-start rounded-full px-1.5 text-body font-semibold text-wine', FOCUS)}
            >
              <Music2 aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
              ძებნა სიმღერით
            </Press>
          )}
          {onHelper && (
            <Press
              onClick={() => onHelper()}
              className={cx('flex h-tap shrink-0 cursor-pointer items-center gap-2 self-start rounded-full px-1.5 text-body font-semibold text-wine', FOCUS)}
            >
              <Bot aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
              ჰკითხე დამხმარეს
            </Press>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 pt-0.5">
        {chips.length > 0 && (
          // the pills (40px) where the prototype has them; their 44px buttons reach 2px over and under
          <div className="-my-0.5 flex shrink-0 flex-col">
            <Chips<SearchFilter>
              label="რას ეძებ"
              items={[{ id: 'all', label: 'ყველა' }, ...chips.map(g => ({ id: g, label: CHIP_LABEL[g] }))]}
              value={filter}
              onChange={onFilter}
            />
          </div>
        )}

        {!typed ? (
          <>
            {recent.length > 0 && (
              <>
                <SectionLabel
                  label="ბოლოს ნაძებნი"
                  right={
                    <Press
                      onClick={onClearRecent}
                      className={cx(
                        'relative shrink-0 cursor-pointer text-meta font-semibold whitespace-nowrap text-wine',
                        // the word stays small, the finger gets 44px
                        'before:absolute before:-inset-x-2 before:-inset-y-3',
                        FOCUS,
                      )}
                    >
                      გასუფთავება
                    </Press>
                  }
                />
                <Rows>{recent.map((r, i) => row(r, i, true))}</Rows>
              </>
            )}
            {often.length > 0 && (
              <>
                <SectionLabel label="ხშირად გახსნილი" />
                <div className="grid shrink-0 grid-cols-2 gap-2.5">
                  {often.map((r, i) => <Tile key={`${r.key}-${i}`} row={r} onOpen={() => onOpen(r)} />)}
                </div>
              </>
            )}
          </>
        ) : groups.length ? (
          <>
            {groups.map(g => {
              // one kind chosen: its whole list at once
              const all = filter !== 'all' || unfolded.has(g.group);
              const list = g.rows.slice(0, all ? MAX_ROWS : FIRST_ROWS);
              const more = g.rows.length - list.length;
              return (
                <Fragment key={g.group}>
                  <SectionLabel label={`${groupTitle(g.group)} · ${g.rows.length}`} />
                  <Rows>
                    {list.map((r, i) => row(r, i))}
                    {!all && more > 0 && (
                      <Press
                        onClick={() => setUnfolded(s => new Set(s).add(g.group))}
                        className="flex min-h-14 w-full cursor-pointer items-center gap-2.5 py-2 pr-3 pl-4 text-left text-body font-semibold text-wine transition-colors active:bg-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-wine/60"
                      >
                        <span aria-hidden="true" className="flex size-icon shrink-0 items-center justify-center">
                          <ChevronDown className="size-[18px]" strokeWidth={2} />
                        </span>
                        კიდევ {more}
                      </Press>
                    )}
                  </Rows>
                  {all && more > 0 && <Note>კიდევ {more} — დააზუსტე ძიება</Note>}
                </Fragment>
              );
            })}
            {recent.length > 0 && (
              <>
                <SectionLabel label="ბოლოს ეძებდი" />
                <RecentChips rows={recent} onOpen={onOpen} />
              </>
            )}
          </>
        ) : (
          <>
            <div role="status" className="flex shrink-0 flex-col items-center gap-1.5 px-5 pt-[26px] pb-2.5 text-center">
              <Search aria-hidden="true" className="size-[30px] text-mut" strokeWidth={1.5} />
              <div className="text-head font-bold">ვერაფერი მოიძებნა</div>
              <div className="text-body leading-normal text-mut">
                {elsewhere > 0
                  ? <>სხვა ჯგუფებში კიდევ {elsewhere} მოიძებნა — აირჩიე „ყველა“.</>
                  : <>სცადე სიტყვის ნაწილი, მაგალითად „შობილი“ ან „კანონი 5“.</>}
              </div>
            </div>
            {/* a way out of the dead end (x-dzebna-carieli): „მკითხე“ with these words; teachers also the school's assistant */}
            {(onHelper || onAsk) && (
              <Rows>
                {onHelper && (
                  <Row lead={<Dot icon={<Bot />} />} title="ჰკითხე დამხმარეს" sub="„მკითხე“ გეტყვის, სად რა არის" onClick={() => onHelper(searched)} />
                )}
                {onAsk && <Row lead={<Dot icon={<Sparkles />} />} title="AI დამხმარე" sub="სკოლის საქმეები" onClick={onAsk} />}
              </Rows>
            )}
            {recent.length > 0 && (
              <>
                <SectionLabel label="ბოლოს ეძებდი" />
                <RecentChips rows={recent} onOpen={onOpen} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
