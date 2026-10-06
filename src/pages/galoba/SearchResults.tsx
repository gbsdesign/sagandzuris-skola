import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Music2, Search, X } from 'lucide-react';
import { useAuth, useNavigation, ServiceType } from '../../context';
import { ChantItem, getFolkRegion } from '../../data';
import { requestOpen } from '../../utils/searchOpen';
import { useAccess } from '../../hooks/useAccess';
import { triggerHaptic } from '../../utils/haptics';
import { SearchQuery } from '../../utils/searchUtils';
import { ChantHit, searchChants, searchPrayers, searchSongs } from './chantSearch';

/** The roomy search field of the services page ("ძიება ყველა მსახურებაში"). */
export const SearchField: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => (
  <label className="relative flex items-center">
    <Search className="w-4 h-4 text-[#a0907c] absolute left-3.5 pointer-events-none" />
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full h-11 pl-10 pr-10 rounded-full bg-white text-[14px] text-[#2a2017] placeholder-[#a0907c] shadow-[inset_0_0_0_1px_#e4d8c4] focus:outline-none focus:shadow-[inset_0_0_0_1.5px_rgba(122,32,40,0.45)] transition-shadow [&::-webkit-search-cancel-button]:hidden"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute right-1.5 w-9 h-9 rounded-full grid place-items-center text-[#a0907c] hover:text-[#574739] cursor-pointer"
        aria-label="ძიების გასუფთავება"
        title="გასუფთავება"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </label>
);

const SHOWN = 6;

// One group of hits: a small heading, then rows in one card; long groups unfold with "კიდევ N"
function Group<T>({ title, items, row }: { title: string; items: T[]; row: (item: T) => React.ReactNode }) {
  const [all, setAll] = useState(false);
  if (!items.length) return null;
  const shown = all ? items : items.slice(0, SHOWN);
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="mx-1 text-[12px] font-extrabold text-[#8c7c6b]">
        {title} <span className="font-bold text-[#b8aa97] tabular-nums">· {items.length}</span>
      </h3>
      <div className="rounded-2xl bg-white border border-[#e4d8c4] divide-y divide-[#efe6d6] overflow-hidden shadow-[0_1px_2px_rgba(42,32,23,0.05)]">
        {shown.map(row)}
        {items.length > shown.length && (
          <button
            type="button"
            onClick={() => { triggerHaptic(10); setAll(true); }}
            className="w-full h-11 text-[13px] font-bold text-[#b4620e] hover:bg-[#fcf6ec] cursor-pointer"
          >
            კიდევ {items.length - shown.length}
          </button>
        )}
      </div>
    </section>
  );
}

const Row: React.FC<{ title: string; sub: string; icon?: React.ReactNode; onClick: () => void }> = ({ title, sub, icon, onClick }) => (
  <button
    type="button"
    onClick={() => { triggerHaptic(10); onClick(); }}
    className="w-full min-h-[52px] px-3.5 py-2 flex items-center gap-3 text-left cursor-pointer hover:bg-[#fcf6ec] active:bg-[#f7eedf] transition-colors group"
  >
    {icon && <span className="w-8 h-8 shrink-0 rounded-full grid place-items-center bg-[#f6eedf] text-[#b4620e]">{icon}</span>}
    <span className="flex-1 min-w-0">
      <span className="block text-[15px] font-bold leading-snug text-[#2a2017] break-words group-hover:text-[#7a2028]">{title}</span>
      <span className="block text-[11.5px] font-semibold text-[#8c7c6b]">{sub}</span>
    </span>
    <ChevronRight className="w-4 h-4 shrink-0 text-[#b8aa97] group-hover:text-[#7a2028]" />
  </button>
);

interface SearchResultsProps {
  query: SearchQuery;
  /** the service whose own list is already shown above */
  skipService?: ServiceType;
  /** class mode: only chants with versions in the class program */
  keepChant?: (chant: ChantItem) => boolean;
  onOpenChant: (hit: ChantHit) => void;
  /** nothing was found above either: say so */
  emptyAbove?: boolean;
}

/** Hits in the other services, the folk songs and the prayer book. */
export const SearchResults: React.FC<SearchResultsProps> = ({ query, skipService, keepChant, onOpenChant, emptyAbove = true }) => {
  const { openPrayer, navigateTo } = useNavigation();
  const { isAdmin, isSuperAdmin } = useAuth();
  const { page } = useAccess();
  const songsOpen = page('simghera') === 'open';
  const prayersOpen = page('prayer') === 'open';

  const chants = useMemo(() => searchChants(query, skipService).filter(h => !keepChant || keepChant(h.chant)), [query, skipService, keepChant]);
  const songs = useMemo(() => (songsOpen ? searchSongs(query, isAdmin || isSuperAdmin) : []), [query, songsOpen, isAdmin, isSuperAdmin]);
  const prayers = useMemo(() => (prayersOpen ? searchPrayers(query) : []), [query, prayersOpen]);

  if (!chants.length && !songs.length && !prayers.length) {
    return emptyAbove ? (
      <p className="mx-1 py-6 text-center text-[13px] font-semibold text-[#8c7c6b]">ვერაფერი მოიძებნა. სცადეთ სხვა სიტყვა.</p>
    ) : null;
  }

  return (
    <div className="flex flex-col gap-4">
      <Group
        title={skipService ? 'სხვა მსახურებებში' : 'საგალობლები'}
        items={chants}
        row={h => (
          <Row
            key={`${h.service}|${h.chant.id}`}
            title={(h.chant.title || '').replace(/[;\s]+$/, '')}
            sub={h.service}
            onClick={() => onOpenChant(h)}
          />
        )}
      />
      <Group
        title="სიმღერები"
        items={songs}
        row={s => (
          <Row
            key={s.id}
            title={s.title}
            sub={getFolkRegion(s.region).nameGe}
            icon={<Music2 className="w-4 h-4" />}
            onClick={() => { requestOpen('simghera', s.id); navigateTo('simghera'); window.scrollTo({ top: 0 }); }}
          />
        )}
      />
      <Group
        title="ლოცვები"
        items={prayers}
        row={p => (
          <Row key={p.id} title={p.title} sub="ლოცვანი" icon={<BookOpen className="w-4 h-4" />} onClick={() => openPrayer(p.id)} />
        )}
      />
    </div>
  );
};
