import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Headphones, Map as MapIcon, MapPin, Search, X } from 'lucide-react';
import { useAuth, useChants, useNavigation } from '../../../context';
import { Dot, Note, Press, Row, Rows, RoundButton, Seg, Sheet, Small, TopBar, cx, FOCUS } from '../../../components/ui2';
import {
  FOLK_EXTRA_REGIONS, FOLK_REGIONS, FOLK_SONGS, getFolkRegion, songsInRegion, type FolkRegion,
} from '../../../data/songsData';
import { usePlacements } from '../../../data/placements';
import { instrumentsIn } from '../../../data/instrumentsData';
import { authorsInRegion } from '../../../data/mtkmeliData';
import { ABROAD, etnoRegion, etnoRegionName } from '../../../data/etnofori';
import { CENTRE_SONG_ALBUMS } from '../../../data/centreSongs';
import { CENTRE_MTKMELI_ALBUMS } from '../../../data/centreOther';
import { SongPage, openSongPage } from '../../../components/maps/SongPage';
import { SongAlbumPage } from '../../../components/maps/SongAlbumPage';
import { useShownAlbums } from '../../../components/maps/CentreAlbums';
import { isFolkGroup, useReciters } from '../../../components/maps/Reciters';
import { OfflineButton } from '../../../components/offline/OfflineButton';
import { askSignIn } from '../../../components/access/SignInPrompt';
import { useAccess } from '../../../hooks/useAccess';
import { useOpenRequest } from '../../../utils/searchOpen';
import { triggerHaptic } from '../../../utils/haptics';
import folkCentreLogo from '../../../assets/images/folk-centre-logo.png';
import { Loading, MapCard, Page, PillRow, RegionGrid, SearchPill } from './parts';
import { SongRows, byRecordings, useSongSearch } from './Songs';
import { InstrumentRows } from './Instruments';
import { RecitersScreen, poetRegionName } from './Poets';
import { RegionScreen, type RegionTab } from './Region';
import { PlacedVideos, VideoPlayer, VideoRows, etnoEpisodes, etnoSongs, useEtno, type FilmNav, EtnoNote } from './videos';

// „ხალხური“ in the new look (boards x-khalkhuri, x-sakravi, x-mtkmeli, x-etnopori, x-kutkhe, x-meleqseebi; the song's page is
// x-simghera — components/maps/SongPage draws it). The steps are the old page's (components/maps/GeorgiaMap.tsx):
// `mapItem` „<region>[~i|~m|~e][/<film>]“ = a region on its pill, „<region>~r“ = its მელექსეები, „album:<id>“ = a Centre album,
// „etno[/<film>]“ = the videos' tab with a film open, „ep[/<film>]“ = „ეთნოფორი“'s full episodes, „all-i“ = every instrument,
// an old „i:<region>“ = a region's instruments. The four tabs on top are kept for the visit (`sg-khalkhuri-tab`).

const TAB_CODE: Record<RegionTab, string> = { songs: '', instruments: 'i', poets: 'm', etno: 'e' };
const CODE_TAB: Record<string, RegionTab> = { i: 'instruments', m: 'poets', e: 'etno' };
const itemOf = (regionId: string, tab: RegionTab) => (TAB_CODE[tab] ? `${regionId}~${TAB_CODE[tab]}` : regionId);
const ALL_REGIONS: FolkRegion[] = [...FOLK_REGIONS, ...FOLK_EXTRA_REGIONS, ABROAD];
const SONG_REGIONS: FolkRegion[] = [...FOLK_REGIONS, ...FOLK_EXTRA_REGIONS.filter(r => r.id !== 'unsure')];

const TAB_KEY = 'sg-khalkhuri-tab';
const savedTab = (): RegionTab => {
  try { const t = sessionStorage.getItem(TAB_KEY); return t === 'instruments' || t === 'poets' || t === 'etno' ? t : 'songs'; } catch { return 'songs'; }
};
const SEG: Record<RegionTab, string> = { songs: 'სიმღერა', instruments: 'საკრავი', poets: 'მთქმელი', etno: 'ეთნოფორი' };

export const KhalkhuriV2: React.FC<{ startTab?: 'instruments' }> = ({ startTab }) => {
  const { isOwner } = useAuth();
  const placed = usePlacements(); // a recording moved from the app: the lists follow
  const { selectedChantVariants: selected, handleTogglePoem } = useChants();
  const { mapItem, openMapItem, handleGoBack } = useNavigation();

  // a song picked in the one search: its region, the song's page over it; a region's home button („r:<region>“): the region
  useOpenRequest('simghera', id => {
    if (id.startsWith('r:')) { openMapItem(id.slice(2)); return; }
    // „<song>~<take>“ = a recording a teacher pinned (2026-11-23)
    const [songId, takeAt] = id.split('~');
    const song = FOLK_SONGS.find(s => s.id === songId);
    if (!song) return;
    openMapItem(getFolkRegion(song.region).id);
    // the song's page listens once it is on screen
    window.setTimeout(() => openSongPage(songId, Number(takeAt) || 0), 0);
  });

  const item = mapItem ?? '';
  const [head, film] = item.startsWith('album:') ? [item, undefined] : item.split('/');
  const [regionId, code] = head.startsWith('i:') ? [head.slice(2), 'i'] : head.split('~');
  const region = ALL_REGIONS.find(r => r.id === regionId) ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const songsOf = useMemo(() => (id: FolkRegion['id']) => [...songsInRegion(id, isOwner)].sort(byRecordings), [isOwner, placed]);

  // a film opens over its list without moving it; ‹ › turn it in place
  const films = (base: string): FilmNav => ({
    open: film,
    onPlay: id => { triggerHaptic(10); openMapItem(`${base}/${id}`, false, true); },
    onMove: id => openMapItem(`${base}/${id}`, true, true),
    onClose: handleGoBack,
  });

  let body: React.ReactNode;
  if (head.startsWith('album:')) {
    const id = head.slice(6);
    const album = [...CENTRE_SONG_ALBUMS, ...CENTRE_MTKMELI_ALBUMS].find(a => a[0] === id);
    body = (
      <Page>
        <TopBar title={album?.[1] ?? 'ალბომი'} sub="ფოლკლორის ცენტრი" onBack={handleGoBack} />
        <SongAlbumPage albumId={id} />
      </Page>
    );
  } else if (region && code === 'r') {
    body = <RecitersScreen region={region} onBack={handleGoBack} />;
  } else if (region) {
    body = (
      <RegionScreen
        key={region.id}
        region={region}
        tab={CODE_TAB[code ?? ''] ?? 'songs'}
        onTab={t => openMapItem(itemOf(region.id, t), true, true)}
        onRegion={id => openMapItem(itemOf(id, CODE_TAB[code ?? ''] ?? 'songs'), true)}
        onBack={handleGoBack}
        onReciters={() => openMapItem(`${region.id}~r`)}
        films={films(head)}
        songs={songsOf(region.id)}
        selected={selected}
        onTogglePoem={handleTogglePoem}
      />
    );
  } else {
    const forced: RegionTab | undefined = head === 'etno' || head === 'ep' ? 'etno' : head === 'all-i' || startTab ? 'instruments' : undefined;
    body = (
      <Front
        forced={forced}
        episodes={head === 'ep'}
        songsOf={songsOf}
        selected={selected}
        onOpen={(id, tab) => openMapItem(itemOf(id, tab))}
        films={films(head === 'ep' ? 'ep' : 'etno')}
        onBack={handleGoBack}
      />
    );
  }

  return (
    <>
      {body}
      {/* the song's page (x-simghera) over any of these screens: its own history step */}
      <SongPage />
    </>
  );
};

/** the first screen: the four tabs, each its own way (the songs' map and regions, the instruments' and poets' lists with the
 *  map one tap away, „ეთნოფორი“'s videos with their pills) */
const Front: React.FC<{
  forced?: RegionTab;
  episodes: boolean;
  songsOf: (id: FolkRegion['id']) => ReturnType<typeof songsInRegion>;
  selected: Record<string, unknown>;
  onOpen: (regionId: string, tab: RegionTab) => void;
  films: FilmNav;
  onBack: () => void;
}> = ({ forced, episodes, songsOf, selected, onOpen, films, onBack }) => {
  const access = useAccess();
  const { isOwner } = useAuth();
  const instruments = access.section('sakravebi');
  const poets = access.section('mtkmeli');
  const etnoOpen = access.section('videoebi') === 'open';
  const shownOrLocked = (s: string) => s === 'open' || s === 'locked';
  const [picked, setPicked] = useState<RegionTab>(() => forced ?? savedTab());
  const tabs = ([
    'songs',
    shownOrLocked(instruments) && 'instruments',
    shownOrLocked(poets) && 'poets',
    etnoOpen && 'etno',
  ].filter(Boolean)) as RegionTab[];
  const tab: RegionTab = tabs.includes(picked) ? picked : 'songs';
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [onMapView, setOnMapView] = useState(false);
  const choose = (t: RegionTab) => {
    if (t === 'instruments' && instruments === 'locked') { askSignIn('საკრავები'); return; }
    if (t === 'poets' && poets === 'locked') { askSignIn('მთქმელი'); return; }
    triggerHaptic(8);
    setPicked(t);
    setSearching(false);
    setQuery('');
    setOnMapView(false);
    try { sessionStorage.setItem(TAB_KEY, t); } catch { /* this visit only */ }
  };
  const toggleSearch = () => { triggerHaptic(10); setSearching(v => !v); setQuery(''); };

  // the songs' search over every song (members also by performer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allSongs = useMemo(() => FOLK_SONGS.filter(s => isOwner || !s.ownerOnly), [isOwner, songsOf]);
  const results = useSongSearch(allSongs, tab === 'songs' ? query : '', access.member);

  const searchButton = (
    <RoundButton label={searching ? 'ძებნის დახურვა' : tab === 'etno' ? 'ვიდეოს ძებნა' : 'სიმღერის ძებნა'} tone={searching ? 'wine' : 'surf'} onClick={toggleSearch}>
      {searching ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
    </RoundButton>
  );
  const mapButton = (
    <RoundButton label={onMapView ? 'სიაზე დაბრუნება' : 'რუკაზე ნახვა'} tone={onMapView ? 'wine' : 'surf'} onClick={() => { triggerHaptic(10); setOnMapView(v => !v); }}>
      <MapIcon aria-hidden="true" />
    </RoundButton>
  );
  const right = tab === 'songs' ? <><OfflineButton kind="simghera" />{searchButton}</>
    : tab === 'etno' ? searchButton
    : mapButton;

  return (
    <Page>
      <TopBar title="ხალხური" onBack={onBack} right={right} />
      {tabs.length > 1 && <Seg label="ხალხური" items={tabs.map(t => ({ id: t, label: SEG[t] }))} value={tab} onChange={choose} />}

      {tab === 'songs' && (searching ? (
        <>
          <SearchPill value={query} onChange={setQuery} autoFocus placeholder={access.member ? 'სიმღერა ან შემსრულებელი' : 'სიმღერის ძებნა'} onEscape={toggleSearch} />
          {results && <SongRows songs={results} showRegion selected={selected} empty="ასეთი სიმღერა ვერ მოიძებნა" />}
        </>
      ) : (
        <SongsFront songsOf={songsOf} onOpen={id => onOpen(id, 'songs')} />
      ))}

      {tab === 'instruments' && (onMapView ? (
        <MapCard title="საკრავები" count={id => instrumentsIn(id as FolkRegion['id']).length} label={n => `${n} საკრავი`}
          onSelect={r => onOpen(r.id, 'instruments')} />
      ) : <InstrumentRows selected={selected} />)}

      {tab === 'poets' && <PoetsFront onMap={onMapView} onOpen={id => onOpen(id, 'poets')} />}

      {tab === 'etno' && <EtnoFront query={searching ? query : ''} episodes={episodes} films={films}
        search={searching ? <SearchPill value={query} onChange={setQuery} autoFocus placeholder="სიმღერის ან სოფლის ძებნა" onEscape={toggleSearch} /> : null} />}
    </Page>
  );
};

/** „სიმღერა“: the Centre's line, the map with each region's count, then the regions two by two, the most songs first */
const SongsFront: React.FC<{ songsOf: (id: FolkRegion['id']) => unknown[]; onOpen: (id: string) => void }> = ({ songsOf, onOpen }) => {
  const [centre, setCentre] = useState(false);
  const count = (id: string) => songsOf(id as FolkRegion['id']).length;
  const regions = useMemo(() => [...SONG_REGIONS].sort((a, b) => count(b.id) - count(a.id)), [songsOf]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <Press onClick={() => { triggerHaptic(10); setCentre(true); }}
        className={cx('flex h-tap shrink-0 cursor-pointer items-center gap-2 rounded-full px-1.5 text-left text-body font-bold text-wine', FOCUS)}>
        <Headphones aria-hidden="true" className="size-[18px] shrink-0" />
        <span className="min-w-0 flex-1 truncate">ფოლკლორის ცენტრის ჩანაწერები</span>
        <ChevronRight aria-hidden="true" className="size-[18px] shrink-0" />
      </Press>
      <MapCard title="ხალხური" count={count} label={n => `${n} სიმღერა`} onSelect={r => onOpen(r.id)} />
      <RegionGrid regions={regions} count={count} onOpen={r => onOpen(r.id)} />
      <CentreSheet open={centre} onClose={() => setCentre(false)} />
    </>
  );
};

/** the Folklore Centre: whose recordings these are, and its song albums (those the person may hear) */
const CentreSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const albums = useShownAlbums();
  const { openMapItem } = useNavigation();
  return (
    <Sheet open={open} title="ფოლკლორის ცენტრის ჩანაწერები" onClose={onClose}>
      <div className="flex shrink-0 items-center gap-3 px-1">
        <img src={folkCentreLogo} alt="ფოლკლორის ცენტრის ლოგო" className="size-14 shrink-0 object-contain" draggable={false} />
        <p className="min-w-0 text-body leading-snug text-ink">სიმღერების ჩანაწერების დიდი ნაწილი საქართველოს ფოლკლორის ცენტრის არქივიდანაა.</p>
      </div>
      {albums.length > 0 ? (
        <Rows>
          {albums.map(([id, name, n]) => (
            <Row key={id} title={name} wrap right={<><Small>{n}</Small><ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" /></>}
              onClick={() => { triggerHaptic(10); onClose(); openMapItem(`album:${id}`); }} />
          ))}
        </Rows>
      ) : <Note>ალბომები ჩანს მათთვის, ვისაც ადმინი ჩაურთავს.</Note>}
    </Sheet>
  );
};

/** „მთქმელი“: the regions as rows with how many poets each has (the map one tap away) */
const PoetsFront: React.FC<{ onMap: boolean; onOpen: (id: string) => void }> = ({ onMap, onOpen }) => {
  const reciters = useReciters();
  const count = (id: string) => authorsInRegion(id as FolkRegion['id']).length + reciters.filter(r => r[2] === id && !isFolkGroup(r)).length;
  if (onMap) return <MapCard title="მთქმელი საქართველო" count={count} label={n => `${n} მთქმელი`} regionName={poetRegionName} onSelect={r => onOpen(r.id)} />;
  const rows = FOLK_REGIONS.map(r => ({ r, n: count(r.id) })).filter(x => x.n > 0).sort((a, b) => b.n - a.n);
  return (
    <Rows>
      {rows.map(({ r, n }) => (
        <Row key={r.id} lead={<Dot icon={<MapPin />} />} title={poetRegionName(r)} sub={`${n} მთქმელი`} onClick={() => { triggerHaptic(10); onOpen(r.id); }} />
      ))}
    </Rows>
  );
};

/** „ეთნოფორი“: every song's video, one row of pills (every region, abroad, the full episodes), the search on the bar */
const CHIP_KEY = 'sg-etno-chip';
const EtnoFront: React.FC<{ query: string; episodes: boolean; films: FilmNav; search: React.ReactNode }> = ({ query, episodes, films, search }) => {
  const { data, failed } = useEtno();
  const [chip, setChip] = useState<string>(() => {
    if (episodes) return 'ep';
    try { return sessionStorage.getItem(CHIP_KEY) || 'all'; } catch { return 'all'; }
  });
  const pick = (c: string) => { setChip(c); try { sessionStorage.setItem(CHIP_KEY, c); } catch { /* this visit only */ } };
  const regions = useMemo(() => {
    if (!data) return [];
    const c = new Map<string, number>();
    for (const s of data.songs) c.set(s[3], (c.get(s[3]) ?? 0) + 1);
    return [...c.entries()].map(([id, n]) => ({ r: etnoRegion(id), n })).filter((x): x is { r: FolkRegion; n: number } => !!x.r).sort((a, b) => b.n - a.n);
  }, [data]);
  const q = query.trim().toLowerCase();
  const list = useMemo(() => {
    if (!data || chip === 'ep') return [];
    const all = etnoSongs(data, chip === 'all' ? undefined : chip);
    return q ? all.filter(f => `${f.title} ${f.sub}`.toLowerCase().includes(q)) : all;
  }, [data, chip, q]);
  useEffect(() => { if (episodes) setChip('ep'); }, [episodes]);
  if (!data) return <Loading failed={failed} what="ვიდეოები" />;
  return (
    <>
      <PillRow label="რომელი ვიდეოები" items={[
        { id: 'all', label: `ყველა · ${data.songs.length.toLocaleString('en-US').replace(',', ' ')}`, on: chip === 'all', onClick: () => pick('all') },
        ...regions.map(({ r, n }) => ({ id: r.id, label: `${etnoRegionName(r)} · ${n}`, on: chip === r.id, onClick: () => pick(r.id) })),
        { id: 'ep', label: `გადაცემები · ${data.episodes.length}`, on: chip === 'ep', onClick: () => pick('ep') },
      ]} />
      {search}
      {chip === 'ep' ? (
        <PlacedVideos all={etnoEpisodes(data)} query={query} pills="წლები" note={<EtnoNote />} {...films} />
      ) : (
        <>
          <VideoRows films={list} onPlay={films.onPlay} empty="ასეთი ვიდეო ვერ მოიძებნა" />
          <Note><EtnoNote /></Note>
          <VideoPlayer films={list} open={films.open} onMove={films.onMove} onClose={films.onClose} />
        </>
      )}
    </>
  );
};

export default KhalkhuriV2;
