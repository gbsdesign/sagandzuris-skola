import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { RoundButton, TopBar } from '../../../components/ui2';
import { FOLK_REGIONS, FOLK_SUB_AREAS, type FolkRegion, type FolkSong, type MapRegionId } from '../../../data/songsData';
import { instrumentsIn } from '../../../data/instrumentsData';
import { useMtkmeliCount } from '../../../components/maps/MtkmeliMap';
import { askSignIn } from '../../../components/access/SignInPrompt';
import { useAccess } from '../../../hooks/useAccess';
import { triggerHaptic } from '../../../utils/haptics';
import { Loading, OtherRegion, Page, PillRow, SearchPill } from './parts';
import { SongRows, useSongSearch } from './Songs';
import { InstrumentRows } from './Instruments';
import { PoetsList } from './Poets';
import { EtnoNote, PlacedVideos, etnoSongs, useEtno, type FilmNav } from './videos';

// A region of „ხალხური“ in the new look (board x-kutkhe): its own page — the name and how many there are, one row of pills
// to move between its songs, videos („ეთნოფორი“), instruments and poets (each by its own switch; a closed or empty one
// stands aside, a locked one asks to sign in), then that list. The small map „სხვა კუთხე“ at the bottom opens another
// region on the same pill. `mapItem` „<region>[~e|~i|~m]“ as before.

export type RegionTab = 'songs' | 'instruments' | 'poets' | 'etno';
// what is counted under the region's name („12 ვიდეო“) …
const WORD: Record<RegionTab, string> = { songs: 'სიმღერა', etno: 'ვიდეო', instruments: 'საკრავი', poets: 'მთქმელი' };
// … and the pills' names — the same four words as the big map's switch (KhalkhuriV2 `SEG`): the films' pill is „ეთნოფორი“
// here too (the user's pick of 2026-11-20; it said „ვიდეო“ while the map said „ეთნოფორი“)
const PILL: Record<RegionTab, string> = { ...WORD, etno: 'ეთნოფორი' };

export const RegionScreen: React.FC<{
  region: FolkRegion;
  tab: RegionTab;
  onTab: (t: RegionTab) => void;
  onRegion: (id: MapRegionId) => void;
  onBack: () => void;
  onReciters: () => void;
  films: FilmNav;
  songs: FolkSong[];
  selected: Record<string, unknown>;
  onTogglePoem?: (poemId: string, poemTitle: string, author: string, regionCode: string, regionName: string) => void;
}> = ({ region, tab, onTab, onRegion, onBack, onReciters, films, songs, selected, onTogglePoem }) => {
  const access = useAccess();
  const onMap = FOLK_REGIONS.some(r => r.id === region.id);
  const instruments = access.section('sakravebi');
  const poets = access.section('mtkmeli');
  const videosOpen = access.section('videoebi') === 'open';
  const shownOrLocked = (s: string) => s === 'open' || s === 'locked';
  const nInstruments = onMap ? instrumentsIn(region.id).length : 0;
  const nPoets = useMtkmeliCount(region.id);
  const etno = useEtno(videosOpen);
  const etnoFilms = useMemo(() => (etno.data ? etnoSongs(etno.data, region.id) : []), [etno.data, region.id]);
  const nEtno: number | null = !videosOpen ? 0 : etno.data ? etnoFilms.length : etno.failed ? 0 : null;

  const counts: Record<RegionTab, number | null> = { songs: songs.length, etno: nEtno, instruments: nInstruments, poets: nPoets };
  const tabs = ([
    (region.id as string) !== 'abroad' && 'songs',
    nEtno !== 0 && 'etno',
    shownOrLocked(instruments) && nInstruments > 0 && 'instruments',
    shownOrLocked(poets) && onMap && nPoets > 0 && 'poets',
  ].filter(Boolean)) as RegionTab[];
  // a pill the person may not see (or empty here) falls back to the first one; „ვიდეო“ waits while its list loads
  const shown: RegionTab = tabs.includes(tab) ? tab : nEtno === null && tab === 'etno' ? 'etno' : tabs[0] ?? 'songs';
  const choose = (t: RegionTab) => {
    if (t === 'instruments' && instruments === 'locked') { askSignIn('საკრავები'); return; }
    if (t === 'poets' && poets === 'locked') { askSignIn('მთქმელი'); return; }
    if (t !== shown) onTab(t);
  };

  // the songs' own places (ხევი, ხევსურეთი…) and the search (🔍 on the bar)
  const areas = useMemo(() => FOLK_SUB_AREAS.filter(a => songs.some(s => s.area === a)), [songs]);
  const [area, setArea] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const inArea = useMemo(() => (area ? songs.filter(s => s.area === area) : songs), [songs, area]);
  const found = useSongSearch(inArea, query, access.member);
  const canSearch = (shown === 'songs' && songs.length > 8) || (shown === 'etno' && etnoFilms.length > 8);
  const toggleSearch = () => { triggerHaptic(10); setSearching(v => !v); setQuery(''); };

  const n = counts[shown];
  return (
    <Page>
      <TopBar
        title={region.nameGe}
        sub={n !== null ? `${n} ${WORD[shown]}` : undefined}
        onBack={onBack}
        right={canSearch && (
          <RoundButton label={searching ? 'ძებნის დახურვა' : 'ძებნა'} tone={searching ? 'wine' : 'surf'} onClick={toggleSearch}>
            {searching ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
          </RoundButton>
        )}
      />
      {tabs.length > 1 && (
        <PillRow
          label="რა ვნახო"
          items={tabs.map(t => ({ id: t, label: counts[t] ? `${PILL[t]} · ${counts[t]}` : PILL[t], on: t === shown, onClick: () => choose(t) }))}
        />
      )}
      {searching && canSearch && (
        <SearchPill value={query} onChange={setQuery} autoFocus placeholder={shown === 'etno' ? 'სიმღერის ან სოფლის ძებნა' : `ძებნა: ${region.nameGe}`} onEscape={toggleSearch} />
      )}

      {shown === 'instruments' ? (
        <InstrumentRows list={instrumentsIn(region.id)} line={i => i.here?.[region.id] ?? i.where} selected={selected} />
      ) : shown === 'poets' ? (
        <PoetsList region={region} selected={selected} onToggle={onTogglePoem} onReciters={onReciters} />
      ) : shown === 'etno' ? (
        etno.data
          ? <PlacedVideos all={etnoFilms} query={query} pills="ადგილები" note={<EtnoNote />} {...films} />
          : <Loading failed={etno.failed} what="ვიდეოები" />
      ) : (
        <>
          {areas.length > 0 && (
            <PillRow label="ქვეკუთხე" items={[
              { id: '', label: `ყველა · ${songs.length}`, on: !area, onClick: () => setArea(null) },
              ...areas.map(a => ({ id: a, label: `${a} · ${songs.filter(s => s.area === a).length}`, on: area === a, onClick: () => setArea(area === a ? null : a) })),
            ]} />
          )}
          <SongRows songs={found ?? inArea} selected={selected}
            empty={songs.length ? 'ასეთი სიმღერა ვერ მოიძებნა' : 'ამ კუთხის სიმღერები ჯერ არ დამატებულა'} />
        </>
      )}

      {onMap && <OtherRegion region={region} onPick={onRegion} />}
    </Page>
  );
};
