import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Church, Clapperboard, ExternalLink, ListVideo, Loader2, MapPin, Play, Search, Tv, Users, X } from 'lucide-react';
import { useNavigation } from '../context';
import { RegionLocator, RegionPuzzleMap } from '../components/maps/RegionPuzzleMap';
import { Btn, FIELD, Sheet, Tabs } from '../components/ui/kit';
import { triggerHaptic } from '../utils/haptics';
import { useWatchedVideos } from '../hooks/useWatchedVideos';
import type { FolkRegion } from '../data/songsData';
import {
  ABROAD, ETNOFORI_CHANNEL, ETNO_EXTRA, EtnoData, clock, dayText, embedOf, etnoRegion, etnoRegionName, loadEtnofori, thumbOf, watchOf,
} from '../data/etnofori';
import { MONASTERY_FILMS } from '../data/monasteryVideos';
import { FilmGenre, FilmKind, GENRE_NAMES, GENRE_ORDER, KIND_NAMES, KINO, KinoItem } from '../data/georgianFilms';
import { PAISI_PARTS } from '../data/paisiVideos';

// „ვიდეოები“ (the vine's label), five tabs: „ეთნოფორი“'s songs on the map of Georgia (as on „მთქმელი“), TV reports on the
// monasteries on the same map, „ეთნოფორი“'s full episodes, Georgian films / plays / cartoons by genre, and the series on
// St Paisios. The open list is `mapItem` — a region's id for the songs, „m:<region>“ for the monasteries, „ep“ for the
// episodes, „k“ for the films, „p“ for St Paisios —, an open film adds „/<YouTube id>“, so the bar's „უკან“ (and the
// phone's) first closes the film, then the region.
type Tab = 'map' | 'mon' | 'ep' | 'kino' | 'paisi';
const TAB_KEY = 'sg-videos-tab';
const TABS: Tab[] = ['map', 'mon', 'ep', 'kino', 'paisi'];
const readTab = (): Tab => {
  try { const t = sessionStorage.getItem(TAB_KEY) as Tab; return TABS.includes(t) ? t : 'map'; } catch { return 'map'; }
};
/** a list's `mapItem` → its tab (a region's id is none of these) */
const LIST_TAB: Record<string, Tab> = { ep: 'ep', k: 'kino', p: 'paisi' };

/** one film of a list, as a row and in the player; `place` = its chip (a municipality, a monastery); `meta` = a quiet line
 *  under it (a film's genres), `tag` = a small mark („უფროსებისთვის“); `parts` = a film in parts, played from the window */
interface Film { id: string; title: string; sub: string; secs: number; place?: string; meta?: string; tag?: string; parts?: { id: string; label: string }[] }

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
  const listTab = LIST_TAB[list] as Tab | undefined;
  const region = list && !listTab ? etnoRegion(list) : null;
  // a film opens over the list without moving it (`stay`); ‹ › turn it in place (`replace`)
  const prefix = mon ? `m:${list}` : list;
  const play = (id: string) => { triggerHaptic(10); openMapItem(`${prefix}/${id}`, false, true); };
  const move = (id: string) => openMapItem(`${prefix}/${id}`, true, true);
  // the films' and St Paisios' lists open from the tab itself, under „k“ / „p“
  const playIn = (l: string) => (id: string) => { triggerHaptic(10); openMapItem(`${l}/${id}`, false, true); };
  const moveIn = (l: string) => (id: string) => openMapItem(`${l}/${id}`, true, true);

  if (mon && region) {
    return <RegionFilms region={region} films={monasteryFilms(region.id)} kind="mon" open={open} onPlay={play} onMove={move} onClose={handleGoBack} />;
  }

  const shown: Tab = listTab ?? tab;
  // „ეთნოფორი“'s lists wait for its file; the other tabs need nothing more
  const waiting = !data && (shown === 'map' || shown === 'ep' || !!region);
  if (waiting) {
    return (
      <div className="w-full py-24 flex flex-col items-center gap-3 text-[#8a7a6a]">
        {failed ? <p className="text-sm font-bold">ვიდეოები ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.</p> : <Loader2 className="w-7 h-7 animate-spin text-[#7a2028]" />}
      </div>
    );
  }

  if (region && data) {
    return <RegionFilms region={region} films={songFilms(data, region.id)} kind="songs" open={open} onPlay={play} onMove={move} onClose={handleGoBack} />;
  }

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-200">
      <Tabs<Tab>
        cols={5}
        stack
        value={shown}
        onChange={t => { chooseTab(t); if (list) openMapItem('', true); }}
        items={[
          { id: 'map', label: 'სიმღერები', Icon: MapPin, count: data?.songs.length },
          { id: 'mon', label: 'მონასტრები', Icon: Church, count: MONASTERY_FILMS.length },
          { id: 'ep', label: 'გადაცემები', Icon: Tv, count: data?.episodes.length },
          { id: 'kino', label: 'ქართული ფილმები', Icon: Clapperboard, count: KINO.length },
          { id: 'paisi', label: 'წმინდა პაისი', Icon: ListVideo, count: PAISI_COUNT },
        ]}
      />
      {shown === 'kino' ? (
        <p className="px-1 text-[13.5px] leading-relaxed text-[#574739]">
          <b className="text-[#2a2017]">ქართული ფილმები</b> — ქართული კინოს კლასიკა, სპექტაკლები და მულტფილმები.
        </p>
      ) : shown === 'paisi' ? (
        <p className="px-1 text-[13.5px] leading-relaxed text-[#574739]">
          <b className="text-[#2a2017]">წმინდა პაისი ათონელი</b> — სერიალი წმინდანის ცხოვრებაზე: „იმედის“ ორი სეზონი და „პაისი ათონელი“
          ქართული გახმოვანებით.
        </p>
      ) : shown === 'mon' ? (
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
      {shown === 'kino' ? (
        <Kino open={list === 'k' ? open : undefined} onPlay={playIn('k')} onMove={moveIn('k')} onClose={handleGoBack} />
      ) : shown === 'paisi' ? (
        <Paisi open={list === 'p' ? open : undefined} onPlay={playIn('p')} onMove={moveIn('p')} onClose={handleGoBack} />
      ) : shown === 'ep' && data ? (
        <Episodes data={data} open={list === 'ep' ? open : undefined} onPlay={playIn('ep')} onMove={moveIn('ep')} onClose={handleGoBack} />
      ) : shown === 'mon' ? (
        <RegionMap counts={MON_COUNTS} title="მონასტრები" extra={MON_EXTRA} onSelect={id => { triggerHaptic(10); openMapItem(`m:${id}`); }} />
      ) : data ? (
        <RegionMap counts={songCounts(data)} title="ეთნოფორი" extra={ETNO_EXTRA} onSelect={id => { triggerHaptic(10); openMapItem(id); }} />
      ) : null}
    </div>
  );
};

const PAISI_COUNT = PAISI_PARTS.reduce((n, p) => n + p.eps.length, 0);

/** a film's row: the year and the note, its parts' count; its genres as a quiet line, the grown-ups' mark */
const kinoFilm = (k: KinoItem): Film => {
  const parts = k.parts?.length ?? 0;
  const partsWord = parts ? `${parts} ${k.parts![0].label.includes('სერია') ? 'სერია' : 'ნაწილი'}` : '';
  return {
    id: k.id,
    title: k.title,
    sub: [k.year ? String(k.year) : '', k.note, partsWord].filter(Boolean).join(' · '),
    secs: k.secs,
    meta: k.genres.map(g => GENRE_NAMES[g]).join(' · '),
    tag: k.adult ? 'უფროსებისთვის' : undefined,
    parts: k.parts?.map(p => ({ id: p.id, label: p.label })),
  };
};
const KINDS: FilmKind[] = ['film', 'theatre', 'cartoon'];

/** Georgian films, plays and cartoons: their kind, a genre, „ბავშვებთან ერთად“ (no grown-ups' mark), a search line */
const Kino: React.FC<{ open?: string; onPlay: (id: string) => void; onMove: (id: string) => void; onClose: () => void }> = ({ open, onPlay, onMove, onClose }) => {
  const [kind, setKind] = useState<FilmKind | null>(null);
  const [genre, setGenre] = useState<FilmGenre | null>(null);
  const [family, setFamily] = useState(false);
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const ofKind = useMemo(() => KINO.filter(k => (!kind || k.kind === kind) && (!family || !k.adult)), [kind, family]);
  const genres = useMemo(() => GENRE_ORDER
    .map(g => [g, ofKind.some(k => k.genres.includes(g))] as const)
    .filter(([, any]) => any), [ofKind]);
  // a genre the chosen kind has none of counts as „ყველა“
  const g = genre && genres.some(([x]) => x === genre) ? genre : null;
  const films = useMemo(() => ofKind
    .filter(k => (!g || k.genres.includes(g)) && (!query || `${k.title} ${k.note}`.toLowerCase().includes(query)))
    .map(kinoFilm), [ofKind, g, query]);
  const kindCount = (x: FilmKind) => KINO.filter(k => k.kind === x && (!family || !k.adult)).length;

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="რა სახის">
        <Chip on={!kind} onClick={() => setKind(null)} label="ყველა" n={KINO.filter(k => !family || !k.adult).length} />
        {KINDS.map(x => <Chip key={x} on={kind === x} onClick={() => setKind(kind === x ? null : x)} label={KIND_NAMES[x]} n={kindCount(x)} />)}
      </div>
      {/* a genre is a toggle — none chosen = every genre; the chosen one shows ✕ */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="ჟანრები">
        {genres.map(([x]) => <Chip key={x} on={g === x} soft x={g === x} onClick={() => setGenre(g === x ? null : x)} label={GENRE_NAMES[x]} />)}
      </div>
      <div className="flex gap-2">
        <label className="relative block flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b3a594]" aria-hidden />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ძებნა" className={`${FIELD} pl-10`} type="search" />
        </label>
        <button
          type="button"
          onClick={() => { triggerHaptic(8); setFamily(!family); }}
          aria-pressed={family}
          className={`shrink-0 min-h-11 px-3.5 rounded-2xl inline-flex items-center justify-center gap-2 text-[13.5px] font-bold transition-colors cursor-pointer ${
            family ? 'bg-[#2f6b3a] text-white shadow-sm' : 'bg-white text-[#4a3426] ring-1 ring-[#e8dcc8] hover:bg-[#2f6b3a]/[0.06]'
          }`}
        >
          <Users className="w-4 h-4" />
          ბავშვებთან ერთად
        </button>
      </div>
      <FilmList films={films} onPlay={onPlay} empty="ასეთი ფილმი ვერ მოიძებნა" />
      <Player films={films} open={open} onMove={onMove} onClose={onClose} />
    </div>
  );
};

/** St Paisios: a chip a season (and the Georgian-voiced one), its episodes in order */
const Paisi: React.FC<{ open?: string; onPlay: (id: string) => void; onMove: (id: string) => void; onClose: () => void }> = ({ open, onPlay, onMove, onClose }) => {
  // after a reload the open episode picks its own part
  const [partId, setPartId] = useState(() => PAISI_PARTS.find(p => p.eps.some(e => e[0] === open))?.id ?? PAISI_PARTS[0].id);
  const part = PAISI_PARTS.find(p => p.id === partId) ?? PAISI_PARTS[0];
  const films: Film[] = useMemo(() => part.eps.map(([id, n, secs]) => ({
    id, title: `სერია ${n}`, sub: `${part.label} · ${part.sub}`, secs,
  })), [part]);
  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="სეზონები">
        {PAISI_PARTS.map(p => <Chip key={p.id} on={p.id === part.id} onClick={() => setPartId(p.id)} label={p.label} n={p.eps.length} />)}
      </div>
      <FilmList films={films} onPlay={onPlay} empty="სერიები ვერ მოიძებნა" />
      <Player films={films} open={open} onMove={onMove} onClose={onClose} />
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

/** `soft` = a second row of chips (the films' genres): gold when chosen, so the two rows read apart */
const Chip: React.FC<{ on: boolean; onClick: () => void; label: string; n?: number; soft?: boolean; x?: boolean }> = ({ on, onClick, label, n, soft, x }) => (
  <button
    type="button"
    onClick={() => { triggerHaptic(8); onClick(); }}
    aria-pressed={on}
    className={`min-h-9 px-3 py-1 rounded-full text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
      on ? (soft ? 'bg-[#a8641c] text-white shadow-sm' : 'bg-[#7a2028] text-[#fbf6ec] shadow-sm')
        : soft ? 'bg-[#fbf4e6] text-[#6b4a22] ring-1 ring-[#ead9bb] hover:bg-[#a8641c]/[0.08]' : 'bg-white text-[#4a3426] ring-1 ring-[#e8dcc8] hover:bg-[#7a2028]/[0.05]'
    }`}
  >
    {label}
    {n !== undefined && <span className={`text-xs tabular-nums ${on ? 'text-[#fbf6ec]/75' : 'text-[#8a7a6a]'}`}>{n}</span>}
    {x && <X className="w-3.5 h-3.5 -mr-0.5" aria-hidden />}
  </button>
);

/** „ნანახია“ (2026-11-08): a small round mark at a film's right — a tap marks it watched (green ✓) or takes it back; the
 *  films watched fill „ნასწავლი“'s films chest with medallions. `big` = the player's pill with its word. */
const SeenMark: React.FC<{ on: boolean; onToggle: () => void; title: string; big?: boolean }> = ({ on, onToggle, title, big }) =>
  big ? (
    <button
      type="button"
      onClick={() => { triggerHaptic(on ? 8 : 15); onToggle(); }}
      aria-pressed={on}
      className={`h-10 pl-3 pr-4 rounded-full inline-flex items-center gap-1.5 text-[13.5px] font-bold cursor-pointer transition active:scale-95 ${
        on ? 'bg-emerald-600 text-white shadow-[0_4px_12px_-6px_rgba(5,120,80,0.8)]' : 'bg-white text-[#4a3426] ring-1 ring-[#e8dcc8] hover:ring-emerald-500/50 hover:text-emerald-700'
      }`}
    >
      <span className={`w-6 h-6 rounded-full flex items-center justify-center ${on ? 'bg-white/25' : 'ring-1 ring-[#d9ccb8]'}`}>
        <Check className={`w-3.5 h-3.5 stroke-[3] ${on ? '' : 'opacity-40'}`} />
      </span>
      ნანახია
    </button>
  ) : (
    <button
      type="button"
      onClick={() => { triggerHaptic(on ? 8 : 15); onToggle(); }}
      aria-pressed={on}
      aria-label={`${title} — ${on ? 'ნანახია' : 'ნანახად მონიშვნა'}`}
      title={on ? 'ნანახია — შეეხე მოსახსნელად' : 'ნანახია?'}
      className="w-11 self-stretch shrink-0 flex items-center justify-center cursor-pointer"
    >
      <span className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
        on ? 'bg-emerald-600 text-white shadow-[0_3px_8px_-4px_rgba(5,120,80,0.8)]' : 'bg-[#f7f1e6] text-[#b8a68e] ring-1 ring-[#e8dcc8] hover:text-emerald-700 hover:ring-emerald-500/40'
      }`}>
        <Check className="w-4 h-4 stroke-[3]" />
      </span>
    </button>
  );

const FilmList: React.FC<{ films: Film[]; onPlay: (id: string) => void; empty: string }> = ({ films, onPlay, empty }) => {
  const watched = useWatchedVideos();
  if (!films.length) return <p className="py-10 text-center text-sm font-bold text-[#8a7a6a]">{empty}</p>;
  return (
    <ul className="rounded-3xl bg-white/80 ring-1 ring-[#e8dcc8] divide-y divide-[#efe5d4] overflow-hidden">
      {films.map(f => {
        const seen = watched.isSeen(f.id);
        return (
          <li key={f.id} className="flex items-stretch">
            <button type="button" onClick={() => onPlay(f.id)} className="group flex-1 min-w-0 flex items-center gap-3 p-2.5 pr-1 text-left cursor-pointer hover:bg-[#fcf6ea] active:bg-[#f7eddc] transition-colors">
              <span className="relative w-28 sm:w-36 aspect-video shrink-0 rounded-xl overflow-hidden bg-[#3a2c22]">
                <img src={thumbOf(f.id)} alt="" loading="lazy" decoding="async" className={`w-full h-full object-cover group-hover:opacity-100 transition-opacity ${seen ? 'opacity-70' : 'opacity-95'}`} />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-9 h-9 rounded-full bg-black/45 group-hover:bg-[#7a2028]/85 flex items-center justify-center transition-colors">
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  </span>
                </span>
                {seen && <span className="absolute left-1 top-1 px-1.5 rounded-md bg-emerald-600 text-white text-[11px] font-bold leading-[18px]">ნანახია</span>}
                <span className="absolute right-1 bottom-1 px-1.5 rounded-md bg-black/70 text-white text-[11px] font-bold tabular-nums leading-[18px]">{clock(f.secs)}</span>
              </span>
              <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-[15px] font-bold text-[#2a2017] leading-snug line-clamp-2 break-words group-hover:text-[#7a2028] transition-colors">{f.title}</span>
                <span className="text-[12.5px] font-semibold text-[#8a7a6a] leading-snug line-clamp-2 break-words">{f.sub}</span>
                {(f.meta || f.tag) && (
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    {f.tag && <span className="px-2 rounded-full bg-[#fdeee0] text-[#9a3b12] ring-1 ring-[#f3cfae] text-[11.5px] font-bold leading-[20px]">{f.tag}</span>}
                    {f.meta && <span className="text-[12px] font-bold text-[#a0703c] leading-snug">{f.meta}</span>}
                  </span>
                )}
              </span>
            </button>
            <SeenMark on={seen} onToggle={() => watched.toggle(f.id)} title={f.title} />
          </li>
        );
      })}
    </ul>
  );
};

/** the open film in a window: YouTube's own player, a film's parts as chips, then ‹ › through the same list */
const Player: React.FC<{ films: Film[]; open?: string; onMove: (id: string) => void; onClose: () => void }> = ({ films, open, onMove, onClose }) => {
  const watched = useWatchedVideos();
  if (!open) return null;
  const i = films.findIndex(f => f.id === open || !!f.parts?.some(p => p.id === open));
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
        {film?.parts && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="ნაწილები">
            {film.parts.map(p => <Chip key={p.id} on={p.id === open} soft onClick={() => p.id !== open && onMove(p.id)} label={p.label} />)}
          </div>
        )}
        {film && <p className="text-[14px] font-semibold text-[#574739] leading-snug">{film.sub}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SeenMark big on={watched.isSeen(open)} onToggle={() => watched.toggle(open)} title={film?.title ?? 'ვიდეო'} />
          <a href={watchOf(open)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-bold text-[#8a4b12] hover:underline">
            YouTube-ზე გახსნა <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </Sheet>
  );
};
