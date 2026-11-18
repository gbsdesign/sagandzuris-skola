import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BookOpen, Check, List, Pencil, Search, Star, X } from 'lucide-react';
import { useNavigation } from '../../../context';
import { prayerTitle } from '../../../data/prayers';
import { useFavPrayers, useMyKanons } from '../../../components/prayers/FavPrayers';
import { searchPrayers } from '../../../components/prayers/PrayerSearch';
import { setPrayerSearchOpen, usePrayerSearchOpen } from '../../../components/maps/songSearch';
import { NAME_LISTS, nameCount, useCommemoration } from '../../../utils/commemoration';
import { searchNormalize } from '../../../utils/searchMatch';
import { useOpenRequest } from '../../../utils/searchOpen';
import { SHELF_IDS, type ShelfId } from '../../library/Shelf';
import { offerUndo } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { Button, Card, Helper, Press, RoundButton, Row, Rows, TopBar } from '../../../components/ui2';
import { cx, FOCUS, FOCUS_IN } from '../../../components/ui2/cx';
import { Book } from './Book';

/** x-lotsvani — „ლოცვანი“ in the new look (the library's shelf `prayers`, mapItem „prayers[:<part>]“): the bar with 🔍 and
 *  „მოსახს. N“, „★ რჩეული“ (my psalter kanon first), then the book's three groups as lines (Book.tsx). The 🔍 opens the
 *  search over every prayer, kanon and chapter (searchPrayers); while it is typed the rest steps aside. */
export const LotsvaniScreen: React.FC = () => {
  const { mapItem, openMapItem, handleGoBack, openPrayer } = useNavigation();
  // a book of the shelf picked in the search while this page is open (LibraryPage's own rule)
  useOpenRequest('biblioteka', id => { if (SHELF_IDS.includes(id.split(':')[0] as ShelfId)) openMapItem(id); });
  const part = (mapItem ?? '').split(':').slice(1).join(':') || null;
  const searchOpen = usePrayerSearchOpen();
  const [q, setQ] = useState('');
  // closing the 🔍 clears the words; leaving the page closes it
  useEffect(() => { if (!searchOpen) setQ(''); }, [searchOpen]);
  useEffect(() => () => setPrayerSearchOpen(false), []);
  const searching = searchNormalize(q).length >= 2;
  const open = (id: string) => { triggerHaptic(8); openPrayer(id); };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 pb-4">
      <TopBar
        title="ლოცვანი"
        onBack={handleGoBack}
        right={(
          <>
            <RoundButton
              label={searchOpen ? 'ძებნის დახურვა' : 'ძებნა ლოცვანში'}
              aria-pressed={searchOpen}
              onClick={() => setPrayerSearchOpen(!searchOpen)}
            >
              {searchOpen ? <X strokeWidth={1.75} /> : <Search strokeWidth={1.75} />}
            </RoundButton>
            <CommemorationPill />
          </>
        )}
      />
      {searchOpen && <SearchBox value={q} onChange={setQ} />}
      {searching ? (
        <Hits query={q} onOpen={open} />
      ) : (
        <>
          <FavCard onOpen={open} />
          <Book key={part ?? ''} at={part} onOpen={open} />
        </>
      )}
    </div>
  );
};

/** „☰ მოსახს. 644“: the commemoration lists with how many names they hold. */
const CommemorationPill: React.FC = () => {
  const { openCommemoration } = useNavigation();
  const { lists } = useCommemoration();
  const n = NAME_LISTS.reduce((sum, l) => sum + nameCount(lists, l.id), 0);
  const label = `მოსახსენებელი · ${n ? `${n} სახელი` : 'ჩაწერე სახელები'}`;
  return (
    <Press
      onClick={openCommemoration}
      aria-label={label}
      title={label}
      className={cx(
        'flex h-tap shrink-0 cursor-pointer items-center gap-1 rounded-full bg-surf text-meta font-bold whitespace-nowrap text-ink transition active:scale-95 active:bg-soft',
        n ? 'pr-1.5 pl-2.5 max-[379px]:pl-2' : 'px-3',
        FOCUS,
      )}
    >
      <List aria-hidden="true" strokeWidth={1.75} className="size-[17px] text-wine" />
      {/* the narrowest phones keep the page's name whole: the word steps aside there, the count stays */}
      <span className={n ? 'max-[379px]:sr-only' : undefined}>მოსახს.</span>
      {n > 0 && (
        <span className="flex h-[26px] min-w-[26px] items-center justify-center rounded-full bg-wine px-[7px] text-cap font-bold text-white tabular-nums">
          {n > 999 ? '999+' : n}
        </span>
      )}
    </Press>
  );
};

const SearchBox: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <label className="sg-in flex h-tap-lg shrink-0 items-center gap-2.5 rounded-full bg-surf pr-1 pl-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-wine/60">
    <Search aria-hidden="true" className="size-[18px] shrink-0 text-mut" />
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      autoFocus
      placeholder="ლოცვა, ფსალმუნი, თავი…"
      aria-label="ძებნა ლოცვანში"
      className="h-full min-w-0 flex-1 bg-transparent text-lead text-ink outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
    />
    {value && (
      <RoundButton label="გასუფთავება" tone="plain" size={36} onClick={() => onChange('')}><X /></RoundButton>
    )}
  </label>
);

const Hits: React.FC<{ query: string; onOpen: (id: string) => void }> = ({ query, onOpen }) => {
  const hits = useMemo(() => searchPrayers(query), [query]);
  if (!hits.length) return <Helper icon={<Search />}>ვერაფერი მოიძებნა — სცადე სხვა სიტყვა ან ფსალმუნის ნომერი.</Helper>;
  return (
    <Rows className="sg-in">
      {hits.map(h => <Row key={h.id} title={h.title} sub={h.sub} wrap onClick={() => onOpen(h.id)} />)}
    </Rows>
  );
};

const GoldStar: React.FC<{ className?: string }> = ({ className }) => (
  <Star aria-hidden="true" strokeWidth={1.75} className={cx('shrink-0 fill-gold/70 text-gold', className)} />
);

/** „★ რჩეული“: my psalter kanon on top (no ★ — it changes with the cycle), then the starred prayers; ★ takes one off
 *  (with „გაუქმება“), ✎ puts ▲ ▼ in its place. */
const FavCard: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const fav = useFavPrayers();
  const kanons = useMyKanons();
  const [editing, setEditing] = useState(false);
  if (!fav.loaded) return null;
  const kanonIds = kanons.map(k => k.id);
  const list = fav.list.filter(id => !kanonIds.includes(id));
  if (!list.length && !kanons.length) {
    return (
      <Card pad="sm" className="px-4">
        <Helper icon={<GoldStar />}>რჩეული ლოცვები აქ გამოჩნდება — ლოცვის გვერდზე ზემოთ ☆-ს დააჭირე.</Helper>
      </Card>
    );
  }
  return (
    <section aria-label="რჩეული ლოცვები" className="flex shrink-0 flex-col divide-y divide-line overflow-hidden rounded-card bg-surf">
      <div className="flex min-h-12 items-center gap-2 pr-1 pl-4">
        <GoldStar className="size-[18px]" />
        <h2 className="min-w-0 flex-1 text-body font-bold">
          რჩეული <span className="font-semibold text-mut tabular-nums">{list.length + kanons.length}</span>
        </h2>
        {list.length > 1 && (editing ? (
          <Button kind="quiet" size="md" icon={<Check />} onClick={() => setEditing(false)}>მზადაა</Button>
        ) : (
          <RoundButton label="რჩეულის რიგის შეცვლა" tone="plain" onClick={() => setEditing(true)}>
            <Pencil strokeWidth={1.75} className="size-[18px] text-ink" />
          </RoundButton>
        ))}
      </div>
      {kanons.map(k => (
        <Press
          key={k.id}
          onClick={() => { if (!editing) onOpen(k.id); }}
          className={cx('flex min-h-[60px] w-full cursor-pointer items-center gap-2.5 py-2 pr-3 pl-4 text-left transition-colors active:bg-soft', FOCUS_IN)}
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-lead font-bold wrap-break-word">{prayerTitle(k.id)}</span>
            <span className="truncate text-meta text-mut">ჩემი კანონი · {k.group}</span>
          </span>
          <BookOpen aria-hidden="true" strokeWidth={1.75} className="size-[18px] shrink-0 text-wine" />
        </Press>
      ))}
      {list.map((id, i) => (
        <div key={id} className="flex min-h-[52px] items-center">
          <Press
            onClick={() => { if (!editing) onOpen(id); }}
            className={cx('flex min-h-[52px] min-w-0 flex-1 cursor-pointer items-center py-2 pl-4 text-left text-lead font-bold transition-colors active:bg-soft', FOCUS_IN)}
          >
            <span className="min-w-0 wrap-break-word">{prayerTitle(id)}</span>
          </Press>
          {editing ? (
            <span className="flex shrink-0 items-center pr-1">
              <RoundButton label={`${prayerTitle(id)} — ზემოთ`} tone="plain" disabled={i === 0}
                onClick={() => { triggerHaptic(8); fav.move(id, -1, kanonIds); }}>
                <ArrowUp className="size-[18px] text-wine" />
              </RoundButton>
              <RoundButton label={`${prayerTitle(id)} — ქვემოთ`} tone="plain" disabled={i === list.length - 1}
                onClick={() => { triggerHaptic(8); fav.move(id, 1, kanonIds); }}>
                <ArrowDown className="size-[18px] text-wine" />
              </RoundButton>
            </span>
          ) : (
            <RoundButton
              label={`${prayerTitle(id)} — რჩეულიდან მოხსნა`}
              tone="plain"
              className="mr-1"
              onClick={() => {
                const at = fav.list.indexOf(id);
                fav.remove(id);
                offerUndo('რჩეულიდან მოიხსნა', () => fav.restore(id, at));
              }}
            >
              <GoldStar className="size-[18px]" />
            </RoundButton>
          )}
        </div>
      ))}
    </section>
  );
};
