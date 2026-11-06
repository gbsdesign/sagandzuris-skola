import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Church, ExternalLink, Loader2, MapPin, Play, Search, Tv } from 'lucide-react';
import { useNavigation } from '../context';
import { RegionLocator, RegionPuzzleMap } from '../components/maps/RegionPuzzleMap';
import { Btn, FIELD, Sheet, Tabs } from '../components/ui/kit';
import { triggerHaptic } from '../utils/haptics';
import type { FolkRegion } from '../data/songsData';
import {
  ABROAD, ETNOFORI_CHANNEL, ETNO_EXTRA, EtnoData, clock, dayText, embedOf, etnoRegion, etnoRegionName, loadEtnofori, thumbOf, watchOf,
} from '../data/etnofori';
import { MONASTERY_FILMS } from '../data/monasteryVideos';

// „ვიდეოები“ (the vine's label), three tabs: „ეთნოფორი“'s songs on the map of Georgia (as on „მთქმელი“), TV reports on the
// monasteries on the same map, and „ეთნოფორი“'s full episodes. The open list is `mapItem` — a region's id for the songs,
// „m:<region>“ for the monasteries, „ep“ for the episodes —, an open film adds „/<YouTube id>“, so the bar's „უკან“ (and the
// phone's) first closes the film, then the region.
type Tab = 'map' | 'mon' | 'ep';
const TAB_KEY = 'sg-videos-tab';
const readTab = (): Tab => {
  try { const t = sessionStorage.getItem(TAB_KEY); return t === 'ep' || t === 'mon' ? t : 'map'; } catch { return 'map'; }
};

/** one film of a list, as a row and in the player; `place` = its chip (a municipality, a monastery) */
interface Film { id: string; title: string; sub: string; secs: number; place?: string }

const MON_EXTRA: FolkRegion[] = [ABROAD];

export const VideosPage: React.FC = () => {
  const { mapItem, openMapItem, handleGoBack } = useNavigation();
  const [data, setData] = useState<EtnoData | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>(readTab);
  useEffect(() => {
    let alive = true;
    loadEtnofori().then(d => alive && setData(d), () => alive && setFailed(true));
    return () => { alive = false; };
  }, []);
  const chooseTab = (t: Tab) => { setTab(t); try { sessionStorage.setItem(TAB_KEY, t); } catch { /* private mode */ } };

  const item = mapItem ?? '';
  const mon = item.startsWith('m:');
  const [list, open] = (mon ? item.slice(2) : item).split('/');
  const region = list && list !== 'ep' ? etnoRegion(list) : null;
  // a film opens over the list without moving it (`stay`); ‹ › turn it in place (`replace`)
  const prefix = mon ? `m:${list}` : list;
  const play = (id: string) => { triggerHaptic(10); openMapItem(`${prefix}/${id}`, false, true); };
  const move = (id: string) => openMapItem(`${prefix}/${id}`, true, true);

  if (mon && region) {
    return <RegionFilms region={region} films={monasteryFilms(region.id)} kind="mon" open={open} onPlay={play} onMove={move} onClose={handleGoBack} />;
  }

  if (!data) {
    return (
      <div className="w-full py-24 flex flex-col items-center gap-3 text-[#8a7a6a]">
        {failed ? <p className="text-sm font-bold">ვიდეოები ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.</p> : <Loader2 className="w-7 h-7 animate-spin text-[#7a2028]" />}
      </div>
    );
  }

  if (region) {
    return <RegionFilms region={region} films={songFilms(data, region.id)} kind="songs" open={open} onPlay={play} onMove={move} onClose={handleGoBack} />;
  }

  const shown: Tab = list === 'ep' ? 'ep' : tab;
  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-200">
      <Tabs<Tab>
        cols={3}
        stack
        value={shown}
        onChange={t => { chooseTab(t); if (list) openMapItem('', true); }}
        items={[
          { id: 'map', label: 'სიმღერები', Icon: MapPin, count: data.songs.length },
          { id: 'mon', label: 'მონასტრები', Icon: Church, count: MONASTERY_FILMS.length },
          { id: 'ep', label: 'გადაცემები', Icon: Tv, count: data.episodes.length },
        ]}
      />
      {shown === 'mon' ? (
        <p className="px-1 text-[13.5px] leading-relaxed text-[#574739]">
          <b className="text-[#2a2017]">მონასტრები</b> — სატელევიზიო რეპორტაჟები საქართველოს მონასტრებზე: მათი ისტორია და იქ მცხოვრებთა ცხოვრება.
          იმედი, პირველი არხი, ერთსულოვნება და სხვა არხები.
        </p>
      ) : (
        <p className="px-1 text-[13.5px] leading-relaxed text-[#574739]">
          <b className="text-[#2a2017]">„ეთნოფორი“</b> — აჭარის ტელევიზიის გადაცემა ხალხურ სიმღერასა და გალობაზე. ავტორი და წამყვანი მიხეილ გაბაიძე.{' '}
          <a href={ETNOFORI_CHANNEL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-bold text-[#8a4b12] hover:underline">
            არხი YouTube-ზე <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      )}
      {shown === 'ep' ? (
        <Episodes data={data} open={list === 'ep' ? open : undefined} onPlay={id => { triggerHaptic(10); openMapItem(`ep/${id}`, false, true); }} onMove={id => openMapItem(`ep/${id}`, true, true)} onClose={handleGoBack} />
      ) : shown === 'mon' ? (
        <RegionMap counts={MON_COUNTS} title="მონასტრები" extra={MON_EXTRA} onSelect={id => { triggerHaptic(10); openMapItem(`m:${id}`); }} />
      ) : (
        <RegionMap counts={songCounts(data)} title="ეთნოფორი" extra={ETNO_EXTRA} onSelect={id => { triggerHaptic(10); openMapItem(id); }} />
      )}
    </div>
  );
};

const countBy = (regions: string[]) => {
  const c: Record<string, number> = {};
  for (const r of regions) c[r] = (c[r] ?? 0) + 1;
  return c;
};
const MON_COUNTS = countBy(MONASTERY_FILMS.map(f => f[3]));
let songCountsOf: { data: EtnoData; counts: Record<string, number> } | null = null;
const songCounts = (data: EtnoData) => {
  if (songCountsOf?.data !== data) songCountsOf = { data, counts: countBy(data.songs.map(s => s[3])) };
  return songCountsOf.counts;
};

const songFilms = (data: EtnoData, regionId: string): Film[] => data.songs
  .filter(s => s[3] === regionId)
  .map(s => ({ id: s[0], title: s[1], sub: s[2] || s[4], secs: s[5], place: s[4] }));
const monasteryFilms = (regionId: string): Film[] => MONASTERY_FILMS
  .filter(f => f[3] === regionId)
  .map(f => ({ id: f[0], title: f[1], sub: `${f[4]} · ${f[2]}`, secs: f[5], place: f[4] }));

const RegionMap: React.FC<{ counts: Record<string, number>; title: string; extra: FolkRegion[]; onSelect: (id: string) => void }> = ({ counts, title, extra, onSelect }) => (
  <RegionPuzzleMap
    onSelect={r => onSelect(r.id)}
    count={id => counts[id] ?? 0}
    countLabel={n => `${n} ვიდეო`}
    regionName={etnoRegionName}
    title={title}
    extraRegions={extra}
  />
);

/** a region's films: where it is, its places (or monasteries) as chips, a search line for a long list, then the films */
const RegionFilms: React.FC<{ region: FolkRegion; films: Film[]; kind: 'songs' | 'mon'; open?: string; onPlay: (id: string) => void; onMove: (id: string) => void; onClose: () => void }> = ({ region, films: all, kind, open, onPlay, onMove, onClose }) => {
  const places = useMemo(() => {
    const c = new Map<string, number>();
    for (const f of all) if (f.place) c.set(f.place, (c.get(f.place) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ka'));
  }, [all]);
  const [place, setPlace] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const films = useMemo(() => all.filter(f =>
    (!place || f.place === place) && (!query || `${f.title} ${f.sub}`.toLowerCase().includes(query))), [all, place, query]);
  const line = kind === 'mon'
    ? `${places.length} მონასტერი · ${all.length} ვიდეო`
    : `${all.length} ვიდეო · „ეთნოფორი“`;

  return (
    <div className="w-full flex flex-col gap-3 animate-in fade-in duration-200">
      <div className="flex items-center gap-3 px-1 pb-3 border-b border-[#e4d8c4]">
        <RegionLocator region={region} className="w-28 sm:w-32 h-auto shrink-0" />
        <div className="min-w-0 flex flex-col gap-0.5">
          <h3 className="text-lg sm:text-xl font-black text-[#2a2017] leading-tight">{etnoRegionName(region)}</h3>
          <span className="text-xs font-bold text-[#8a4b12]">{line}</span>
        </div>
      </div>

      {places.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={kind === 'mon' ? 'მონასტრები' : 'ადგილები'}>
          <Chip on={!place} onClick={() => setPlace(null)} label="ყველა" n={all.length} />
          {places.map(([p, n]) => <Chip key={p} on={place === p} onClick={() => setPlace(place === p ? null : p)} label={p} n={n} />)}
        </div>
      )}
      {all.length > 20 && (
        <label className="relative block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b3a594]" aria-hidden />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={kind === 'mon' ? 'მონასტრის ძებნა' : 'სიმღერის ან სოფლის ძებნა'} className={`${FIELD} pl-10`} type="search" />
        </label>
      )}

      <FilmList films={films} onPlay={onPlay} empty="ასეთი ვიდეო ვერ მოიძებნა" />
      <Player films={films} open={open} onMove={onMove} onClose={onClose} />
    </div>
  );
};

/** the full episodes, newest first; a year's chips narrow them */
const Episodes: React.FC<{ data: EtnoData; open?: string; onPlay: (id: string) => void; onMove: (id: string) => void; onClose: () => void }> = ({ data, open, onPlay, onMove, onClose }) => {
  const years = useMemo(() => [...new Set(data.episodes.map(e => e[2].slice(-4)))], [data]);
  const [year, setYear] = useState<string | null>(null);
  const films: Film[] = useMemo(() => data.episodes
    .filter(e => !year || e[2].endsWith(year))
    .map(e => ({ id: e[0], title: `გადაცემა №${e[1]}${e[3] ? ` · ${e[3]}` : ''}`, sub: dayText(e[2]), secs: e[4] })), [data, year]);
  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="წლები">
        <Chip on={!year} onClick={() => setYear(null)} label="ყველა" n={data.episodes.length} />
        {years.map(y => <Chip key={y} on={year === y} onClick={() => setYear(year === y ? null : y)} label={y} />)}
      </div>
      <FilmList films={films} onPlay={onPlay} empty="ამ წელს გადაცემა არ არის" />
      <Player films={films} open={open} onMove={onMove} onClose={onClose} />
    </div>
  );
};

const Chip: React.FC<{ on: boolean; onClick: () => void; label: string; n?: number }> = ({ on, onClick, label, n }) => (
  <button
    type="button"
    onClick={() => { triggerHaptic(8); onClick(); }}
    aria-pressed={on}
    className={`min-h-9 px-3 py-1 rounded-full text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
      on ? 'bg-[#7a2028] text-[#fbf6ec] shadow-sm' : 'bg-white text-[#4a3426] ring-1 ring-[#e8dcc8] hover:bg-[#7a2028]/[0.05]'
    }`}
  >
    {label}
    {n !== undefined && <span className={`text-xs tabular-nums ${on ? 'text-[#fbf6ec]/75' : 'text-[#8a7a6a]'}`}>{n}</span>}
  </button>
);

const FilmList: React.FC<{ films: Film[]; onPlay: (id: string) => void; empty: string }> = ({ films, onPlay, empty }) => {
  if (!films.length) return <p className="py-10 text-center text-sm font-bold text-[#8a7a6a]">{empty}</p>;
  return (
    <ul className="rounded-3xl bg-white/80 ring-1 ring-[#e8dcc8] divide-y divide-[#efe5d4] overflow-hidden">
      {films.map(f => (
        <li key={f.id}>
          <button type="button" onClick={() => onPlay(f.id)} className="group w-full flex items-center gap-3 p-2.5 text-left cursor-pointer hover:bg-[#fcf6ea] active:bg-[#f7eddc] transition-colors">
            <span className="relative w-28 sm:w-36 aspect-video shrink-0 rounded-xl overflow-hidden bg-[#3a2c22]">
              <img src={thumbOf(f.id)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover opacity-95 group-hover:opacity-100 transition-opacity" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-9 h-9 rounded-full bg-black/45 group-hover:bg-[#7a2028]/85 flex items-center justify-center transition-colors">
                  <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                </span>
              </span>
              <span className="absolute right-1 bottom-1 px-1.5 rounded-md bg-black/70 text-white text-[11px] font-bold tabular-nums leading-[18px]">{clock(f.secs)}</span>
            </span>
            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-[15px] font-bold text-[#2a2017] leading-snug line-clamp-2 break-words group-hover:text-[#7a2028] transition-colors">{f.title}</span>
              <span className="text-[12.5px] font-semibold text-[#8a7a6a] leading-snug line-clamp-2 break-words">{f.sub}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};

/** the open film in a window: YouTube's own player, then ‹ › through the same list */
const Player: React.FC<{ films: Film[]; open?: string; onMove: (id: string) => void; onClose: () => void }> = ({ films, open, onMove, onClose }) => {
  if (!open) return null;
  const i = films.findIndex(f => f.id === open);
  // a film no longer in the list (a chip changed meanwhile) still plays alone
  const film = i >= 0 ? films[i] : null;
  const prev = i > 0 ? films[i - 1] : null;
  const next = i >= 0 && i < films.length - 1 ? films[i + 1] : null;
  return (
    <Sheet
      open
      wide
      onClose={onClose}
      title={film?.title ?? 'ვიდეო'}
      footer={
        <div className="flex items-center gap-2">
          <Btn kind="ghost" icon={<ChevronLeft />} disabled={!prev} onClick={() => prev && onMove(prev.id)} className="flex-1">წინა</Btn>
          {i >= 0 && <span className="shrink-0 text-xs font-bold text-[#8a7a6a] tabular-nums">{i + 1} / {films.length}</span>}
          <Btn kind="ghost" disabled={!next} onClick={() => next && onMove(next.id)} className="flex-1">შემდეგი <ChevronRight className="w-4 h-4" /></Btn>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-md">
          <iframe
            key={open}
            className="w-full h-full"
            src={embedOf(open)}
            title={film?.title ?? 'ვიდეო'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        {film && <p className="text-[14px] font-semibold text-[#574739] leading-snug">{film.sub}</p>}
        <a href={watchOf(open)} target="_blank" rel="noopener noreferrer" className="self-start inline-flex items-center gap-1 text-[13px] font-bold text-[#8a4b12] hover:underline">
          YouTube-ზე გახსნა <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </Sheet>
  );
};
