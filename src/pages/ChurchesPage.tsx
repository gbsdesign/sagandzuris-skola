import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronDown, Church as ChurchIcon, ChevronRight, History, Loader2, LocateFixed, Map as MapIcon, MapPin, RefreshCw, Search, Sparkles } from 'lucide-react';
import { useNavigation } from '../context';
import { RegionLocator, RegionPuzzleMap } from '../components/maps/RegionPuzzleMap';
import { Btn, FIELD, IconBtn, Sheet, Tabs } from '../components/ui/kit';
import { triggerHaptic } from '../utils/haptics';
import { FOLK_REGIONS, type FolkRegion } from '../data/songsData';
import {
  type Church, type ChurchData, type KindFilter, KIND_FILTERS, distanceText, loadChurches,
  matchChurch, nearest, passesKind, photoUrl, whereOf,
} from '../data/churches';
import { ChurchCard, Tag } from './churches/ChurchCard';
import { type FeastRule, dayText, feastsOnDay, nextFeastDayWithChurches, tbilisiToday } from '../data/churchFeasts';
import { type Visits, useChurchVisits } from '../hooks/useChurchVisits';
import { useMyPlace } from '../hooks/useMyPlace';
import { useOpenRequest } from '../utils/searchOpen';
import { readRecentChurches, rememberChurch } from '../utils/churchShare';

const PinsMap = lazy(() => import('./churches/PinsMap'));

// „ეკლესია-მონასტრები“ (the vine's label): Georgia's churches on the map by region (as on „ვიდეოები“) or as dots on a real
// map, a search over all of them, „ახლოს მდებარე ტაძრები“ by the phone's location, „დღეს ტაძრობაა“ (data/churchFeasts.ts)
// and „მომლოცველის წიგნაკი“ (hooks/useChurchVisits.ts). The open list is `mapItem` — a region's id, „near“, „feast“, „book“
// or „all“ (the first screen) —, an open church adds „/<its id>“, so the bar's „უკან“ first closes the church, then the list.
// Tidied 2026-11-07 (the user: „დახვეწილი, მარტივად აღსაქმელი“): the search on top, the three ways as one row of tiles,
// „ბოლოს ნანახი“ (the device's last six, utils/churchShare.ts), the phone's place shared by every part (hooks/useMyPlace.ts),
// the dots map with the kinds' chips, a municipality picked in a window, and the one search's „ტაძრები“ open here.

/** Tbilisi stands for the songs map's „ქალაქური“ */
const churchRegionName = (r: FolkRegion) => (r.id === 'kalakuri' ? 'თბილისი' : r.nameGe);
const churchRegion = (id: string): FolkRegion | null => FOLK_REGIONS.find(r => r.id === id) ?? null;
const PAGE = 60;
type Filter = KindFilter | 'mine';
const passes = (c: Church, f: Filter, visits: Visits) => (f === 'mine' ? c.id in visits : passesKind(c, f));
const TAB_KEY = 'sg-churches-tab';
type Tab = 'regions' | 'pins';
const readTab = (): Tab => { try { return sessionStorage.getItem(TAB_KEY) === 'pins' ? 'pins' : 'regions'; } catch { return 'regions'; } };

export const ChurchesPage: React.FC = () => {
  const { mapItem, openMapItem, handleGoBack } = useNavigation();
  const [data, setData] = useState<ChurchData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    loadChurches().then(d => alive && setData(d), () => alive && setFailed(true));
    return () => { alive = false; };
  }, []);

  const { visits } = useChurchVisits();
  const [list, open] = (mapItem ?? '').split('/');
  const openChurch = (id: string) => { triggerHaptic(10); openMapItem(`${list || 'all'}/${id}`, false, true); };
  // the one search's „ტაძრები“ (components/search) opens the church over the first screen
  useOpenRequest('churches', id => openMapItem(`all/${id}`));
  useEffect(() => { if (open) rememberChurch(open); }, [open]);

  if (!data) {
    return (
      <div className="w-full py-24 flex flex-col items-center gap-3 text-[#8a7a6a]">
        {failed ? <p className="text-sm font-bold">სია ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.</p> : <Loader2 className="w-7 h-7 animate-spin text-[#7a2028]" />}
      </div>
    );
  }

  const church = open ? data.byId.get(open) ?? null : null;
  const card = <ChurchCard church={church} onClose={handleGoBack} />;
  const region = list ? churchRegion(list) : null;
  const go = (item: string) => { triggerHaptic(10); openMapItem(item); };

  if (list === 'near') return <><Nearby data={data} visits={visits} onOpen={openChurch} />{card}</>;
  if (list === 'feast') return <><FeastList data={data} visits={visits} onOpen={openChurch} />{card}</>;
  if (list === 'book') return <><BookList data={data} visits={visits} onOpen={openChurch} />{card}</>;
  if (region) return <><RegionList key={region.id} region={region} onRegion={id => openMapItem(id, true)} all={data.list.filter(c => c.region === region.id)} visits={visits} onOpen={openChurch} />{card}</>;
  return <><Overview data={data} visits={visits} onGo={go} onOpen={openChurch} />{card}</>;
};

/** the first screen: the search on top, the three ways in one row (ახლოს · ტაძრობა · წიგნაკი), the last churches opened, the map (regions or dots) */
const Overview: React.FC<{ data: ChurchData; visits: Visits; onGo: (item: string) => void; onOpen: (id: string) => void }> = ({ data, visits, onGo, onOpen }) => {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>(readTab);
  const query = q.trim();
  const found = useMemo(() => (query.length >= 2 ? byName(data.list.filter(c => matchChurch(c, query)), query) : []), [data, query]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const x of data.list) c[x.region] = (c[x.region] ?? 0) + 1;
    return c;
  }, [data]);
  const active = data.list.filter(c => c.kind !== 'x').length;
  const chooseTab = (t: Tab) => { setTab(t); try { sessionStorage.setItem(TAB_KEY, t); } catch { /* private mode */ } };

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-200">
      <SearchField value={q} onChange={setQ} placeholder="ტაძრის ან სოფლის ძებნა" />
      {query.length >= 2 ? (
        <Paged items={found} empty="ასეთი ტაძარი ვერ მოიძებნა" render={c => <Row key={c.id} c={c} been={visits[c.id]} onOpen={onOpen} />} />
      ) : (
        <>
          <p className="px-1 text-[13px] leading-snug text-[#8a7a6a] font-semibold">
            საქართველოს {data.list.length.toLocaleString('en-US')} ტაძარი · {active.toLocaleString('en-US')} მოქმედი
          </p>
          <WaysRow data={data} visits={visits} onGo={onGo} />
          <RecentRow data={data} visits={visits} onOpen={onOpen} />
          <Tabs<Tab>
            cols={2}
            value={tab}
            onChange={chooseTab}
            items={[
              { id: 'regions', label: 'კუთხეებით', Icon: MapPin },
              { id: 'pins', label: 'რუკა', Icon: MapIcon },
            ]}
          />
          {tab === 'pins' ? (
            <Dots data={data} visits={visits} onOpen={onOpen} />
          ) : (
            <RegionPuzzleMap
              onSelect={(r: FolkRegion) => onGo(r.id)}
              count={id => counts[id] ?? 0}
              countLabel={n => `${n} ტაძარი`}
              regionName={churchRegionName}
              title="ეკლესია-მონასტრები"
            />
          )}
        </>
      )}
    </div>
  );
};

/** the three ways in one row: „ახლოს“ (the phone's place), the day's feast (or the next), „წიგნაკი“ (how many I have been to) */
const WaysRow: React.FC<{ data: ChurchData; visits: Visits; onGo: (item: string) => void }> = ({ data, visits, onGo }) => {
  const today = tbilisiToday();
  const next = useMemo(() => nextFeastDayWithChurches(data.list, today), [data, today]);
  const mine = Object.keys(visits).filter(id => data.byId.has(id)).length;
  const feastLine = next ? (next.day === today ? 'დღეს' : dayText(next.day)) : '—';
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="ტაძრების ძებნის გზები">
      <Way icon={<LocateFixed />} title="ახლოს" line="ჩემთან" tone="wine" onClick={() => onGo('near')} />
      {next && <Way icon={<Sparkles />} title="ტაძრობა" line={feastLine} tone="gold" onClick={() => onGo('feast')} />}
      <Way icon={<BookOpen />} title="წიგნაკი" line={mine ? `${mine} ტაძარი` : 'ვიყავი'} tone="green" onClick={() => onGo('book')} />
    </div>
  );
};

const WAY_TONE = {
  wine: 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_6px_16px_-8px_rgba(122,32,40,0.75)] hover:bg-[#5e1820]',
  gold: 'bg-gradient-to-br from-[#fbf0d8] to-[#f4e1bd] ring-1 ring-[#e2c9a0] text-[#2a2017] hover:ring-[#b07a1e]/50',
  green: 'bg-white/85 ring-1 ring-[#e8dcc8] text-[#2a2017] hover:ring-[#2f6b3a]/40',
} as const;
const WAY_ICON = { wine: 'bg-white/15 text-[#fbf6ec]', gold: 'bg-[#b07a1e]/15 text-[#8a5a0e]', green: 'bg-[#2f6b3a]/10 text-[#2f6b3a]' } as const;
const WAY_LINE = { wine: 'text-[#fbf6ec]/80', gold: 'text-[#8a5a0e]', green: 'text-[#2f6b3a]' } as const;

/** one tile of the row: a round icon, the way's name, one short line under it */
const Way: React.FC<{ icon: React.ReactNode; title: string; line: string; tone: keyof typeof WAY_TONE; onClick: () => void }> = ({ icon, title, line, tone, onClick }) => (
  <button type="button" onClick={onClick}
    className={`min-h-[6.25rem] px-2 py-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition active:scale-[0.98] ${WAY_TONE[tone]}`}>
    <span className={`w-10 h-10 rounded-full flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5 ${WAY_ICON[tone]}`}>{icon}</span>
    <span className="text-[14px] font-black leading-tight">{title}</span>
    <span className={`text-[12px] font-bold leading-tight line-clamp-1 ${WAY_LINE[tone]}`}>{line}</span>
  </button>
);

/** „ბოლოს ნანახი“: the last churches opened on this device, as small chips */
const RecentRow: React.FC<{ data: ChurchData; visits: Visits; onOpen: (id: string) => void }> = ({ data, visits, onOpen }) => {
  const [ids] = useState(readRecentChurches);
  const recent = ids.map(id => data.byId.get(id)).filter((c): c is Church => !!c);
  if (!recent.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="px-1 flex items-center gap-1.5 text-[12.5px] font-bold text-[#a08a76]"><History className="w-3.5 h-3.5" aria-hidden />ბოლოს ნანახი</h4>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {recent.map(c => (
          <button key={c.id} type="button" onClick={() => onOpen(c.id)}
            className="shrink-0 w-[12.5rem] min-h-12 pl-1.5 pr-3 py-1.5 rounded-2xl bg-white/85 ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 flex items-center gap-2 text-left cursor-pointer transition active:scale-[0.98]">
            <Thumb c={c} size={8} />
            <span className="min-w-0 flex flex-col">
              <span className="text-[13px] font-bold text-[#2a2017] leading-tight line-clamp-2 break-words">{c.name}</span>
              <span className="text-[11.5px] font-semibold text-[#8a7a6a] leading-tight truncate">{visits[c.id] ? '✓ ვიყავი · ' : ''}{c.muni}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

/** „რუკა“: the kinds' chips (and „ვიყავი“) over the dots map, with how many dots are shown */
const Dots: React.FC<{ data: ChurchData; visits: Visits; onOpen: (id: string) => void }> = ({ data, visits, onOpen }) => {
  const [kind, setKind] = useState<Filter>('all');
  const located = useMemo(() => data.list.filter(c => c.located), [data]);
  const shown = useMemo(() => located.filter(c => passes(c, kind, visits)), [located, kind, visits]);
  const visited = useCallback((id: string) => id in visits, [visits]);
  return (
    <div className="flex flex-col gap-2">
      <KindChips value={kind} onChange={setKind} list={located} visits={visits} />
      <p className="px-1 text-[12.5px] font-semibold text-[#8a7a6a]">რუკაზე {shown.length.toLocaleString('en-US')} ტაძარი · დააჭირე წერტილს</p>
      <Suspense fallback={<div className="w-full h-[52vh] min-h-[320px] max-h-[560px] rounded-3xl bg-[#f3e3c6] animate-pulse" />}>
        <PinsMap list={shown} visited={visited} onOpen={onOpen} />
      </Suspense>
    </div>
  );
};

/** every region of the list with how many of its churches I have been to */
const regionStamps = (data: ChurchData, visits: Visits) =>
  FOLK_REGIONS.filter(r => data.list.some(c => c.region === r.id)).map(region => {
    const all = data.list.filter(c => c.region === region.id);
    return { region, all: all.length, mine: all.filter(c => c.id in visits).length };
  });

/** the day's feast (or the next): its churches, a chip a feast when there are several */
const FeastList: React.FC<{ data: ChurchData; visits: Visits; onOpen: (id: string) => void }> = ({ data, visits, onOpen }) => {
  const today = tbilisiToday();
  const next = useMemo(() => nextFeastDayWithChurches(data.list, today), [data, today]);
  const [feast, setFeast] = useState<FeastRule | null>(null);
  const [q, setQ] = useState('');
  const query = q.trim();
  const all = useMemo(() => (next?.feasts ?? []).flatMap(f => f.churches), [next]);
  const shown = useMemo(() => {
    const list = (feast ? next?.feasts.find(f => f.feast === feast)?.churches ?? [] : all).filter(c => !query || matchChurch(c, query));
    return query ? byName(list, query) : list;
  }, [all, feast, next, query]);
  if (!next) return null;
  const isToday = next.day === today;
  return (
    <div className="w-full flex flex-col gap-3 animate-in fade-in duration-200">
      <div className="flex items-center gap-3 px-1 pb-3 border-b border-[#e4d8c4]">
        <span className="w-12 h-12 rounded-2xl bg-[#b07a1e] text-white flex items-center justify-center shrink-0"><Sparkles className="w-6 h-6" /></span>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <h3 className="text-lg sm:text-xl font-black text-[#2a2017] leading-tight">{isToday ? 'დღეს ტაძრობაა' : `ტაძრობა · ${dayText(next.day)}`}</h3>
          <span className="text-xs font-bold text-[#8a4b12]">{all.length} ტაძარი · დღესასწაული ტაძრის სახელით</span>
        </div>
      </div>
      {next.feasts.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="დღესასწაულები">
          <Chip on={!feast} label="ყველა" n={all.length} onClick={() => setFeast(null)} />
          {next.feasts.map(f => <Chip key={f.feast.id} on={feast === f.feast} label={f.feast.label} n={f.churches.length} onClick={() => setFeast(feast === f.feast ? null : f.feast)} />)}
        </div>
      )}
      {next.feasts.length === 1 && <p className="px-1 text-[15px] font-black text-[#8a5a0e]">{next.feasts[0].feast.label}</p>}
      <SearchField value={q} onChange={setQ} placeholder="ტაძრის ან სოფლის ძებნა" />
      <Paged items={shown} empty="ასეთი ტაძარი ვერ მოიძებნა" render={c => <Row key={c.id} c={c} been={visits[c.id]} onOpen={onOpen} />} />
      <p className="px-1 text-[12px] font-semibold text-[#8a7a6a] leading-relaxed">
        ტაძრობის დღე ტაძრის სახელიდან არის ამოცნობილი (მაგ. „წმინდა გიორგის“ → გიორგობა). სადაც სახელი მხოლოდ „ღვთისმშობლისაა“, დღე არ ჩანს.
      </p>
    </div>
  );
};

/** „მომლოცველის წიგნაკი“: the regions' stamps, then the churches I marked, the newest first */
const BookList: React.FC<{ data: ChurchData; visits: Visits; onOpen: (id: string) => void }> = ({ data, visits, onOpen }) => {
  const mine = useMemo(() => Object.entries(visits)
    .filter(([id]) => data.byId.has(id))
    .sort((a, b) => b[1].localeCompare(a[1]))
    .map(([id, day]) => ({ church: data.byId.get(id)!, day })), [data, visits]);
  const regions = useMemo(() => regionStamps(data, visits), [data, visits]);
  return (
    <div className="w-full flex flex-col gap-3 animate-in fade-in duration-200">
      <div className="flex items-center gap-3 px-1 pb-3 border-b border-[#e4d8c4]">
        <span className="w-12 h-12 rounded-2xl bg-[#2f6b3a] text-white flex items-center justify-center shrink-0"><BookOpen className="w-6 h-6" /></span>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <h3 className="text-lg sm:text-xl font-black text-[#2a2017] leading-tight">მომლოცველის წიგნაკი</h3>
          <span className="text-xs font-bold text-[#2f6b3a]">{mine.length} ტაძარი · {regions.filter(r => r.mine).length} კუთხე {regions.length}-დან</span>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" role="list" aria-label="კუთხეების ბეჭდები">
        {regions.map(r => (
          <div key={r.region.id} role="listitem"
            className={`rounded-2xl p-2 flex flex-col items-center gap-1 text-center ring-1 ${r.mine ? 'bg-white ring-[#2f6b3a]/30' : 'bg-white/50 ring-[#e8dcc8]'}`}>
            <span className={`w-11 h-11 rounded-full flex items-center justify-center text-[11px] font-black ${r.mine ? 'text-white ring-[3px] ring-[#2f6b3a] ring-offset-2 ring-offset-white' : 'text-[#6b5c4e]'}`}
              style={{ background: r.mine ? r.region.color : `${r.region.color}40` }}>
              {r.mine ? <Check className="w-5 h-5" /> : r.region.regionCode}
            </span>
            <span className="text-[12px] font-bold text-[#2a2017] leading-tight">{churchRegionName(r.region)}</span>
            <span className="text-[11.5px] font-semibold text-[#8a7a6a] tabular-nums">{r.mine} / {r.all}</span>
          </div>
        ))}
      </div>
      {mine.length ? (
        <Paged items={mine} empty="" render={m => <Row key={m.church.id} c={m.church} onOpen={onOpen} badge={dayText(m.day)} been={m.day} />} />
      ) : (
        <p className="py-8 px-4 text-center text-[14px] font-semibold text-[#8a7a6a] leading-relaxed">
          ჯერ არცერთი ტაძარი არ მონიშნულა. ტაძრის ფანჯარაში დააჭირე „ვიყავი აქ“ — და აქ შეგროვდება, კუთხეებიც გაფერადდება.
        </p>
      )}
    </div>
  );
};

/** a region's churches: where it is, the kinds, a municipality, a search line, the list */
const RegionList: React.FC<{ region: FolkRegion; all: Church[]; visits: Visits; onOpen: (id: string) => void; onRegion: (id: string) => void }> = ({ region, all, visits, onOpen, onRegion }) => {
  const [kind, setKind] = useState<Filter>('all');
  const [muni, setMuni] = useState('');
  const [q, setQ] = useState('');
  const munis = useMemo(() => {
    const c = new Map<string, number>();
    for (const x of all) c.set(x.muni, (c.get(x.muni) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ka'));
  }, [all]);
  const query = q.trim();
  const inMuni = useMemo(() => all.filter(c => !muni || c.muni === muni), [all, muni]);
  const shown = useMemo(() => {
    const list = inMuni.filter(c => passes(c, kind, visits) && (!query || matchChurch(c, query)));
    return query ? byName(list, query) : list;
  }, [inMuni, kind, query, visits]);
  const monasteries = all.filter(c => c.kind === 'm').length;

  return (
    <div className="w-full flex flex-col gap-3 animate-in fade-in duration-200">
      <div className="flex items-center gap-3 px-1 pb-3 border-b border-[#e4d8c4]">
        <RegionLocator region={region} onPick={onRegion} className="w-32 sm:w-36 h-auto shrink-0" />
        <div className="min-w-0 flex flex-col gap-0.5">
          <h3 className="text-lg sm:text-xl font-black text-[#2a2017] leading-tight">{churchRegionName(region)}</h3>
          <span className="text-xs font-bold text-[#8a4b12]">{all.length ? `${all.length} ტაძარი · ${monasteries} მონასტერი` : 'ოკუპირებული ტერიტორია'}</span>
        </div>
      </div>
      {!all.length && (
        <p className="px-1 py-6 text-center text-[14px] font-semibold text-[#8a7a6a] leading-relaxed">
          აქაური ტაძრები სიაში ჯერ არ არის — წყარო ოკუპირებულ ტერიტორიებს არ მოიცავს.
        </p>
      )}
      {all.length > 0 && <KindChips value={kind} onChange={setKind} list={inMuni} visits={visits} />}
      {munis.length > 1 && <MuniPicker munis={munis} total={all.length} value={muni} onChange={setMuni} />}
      {all.length > 0 && <SearchField value={q} onChange={setQ} placeholder="ტაძრის ან სოფლის ძებნა" />}
      {all.length > 0 && <Paged items={shown} empty="ასეთი ტაძარი ვერ მოიძებნა" render={c => <Row key={c.id} c={c} been={visits[c.id]} onOpen={onOpen} />} />}
    </div>
  );
};

/** „ახლოს მდებარე ტაძრები“: the phone's place (hooks/useMyPlace.ts), then the nearest churches with their distance */
const Nearby: React.FC<{ data: ChurchData; visits: Visits; onOpen: (id: string) => void }> = ({ data, visits, onOpen }) => {
  const { fix, state, locate } = useMyPlace(true);
  const [kind, setKind] = useState<Filter>('active');
  const asking = state === 'asking';
  const near = useMemo(() => (fix ? nearest(data.list.filter(c => passes(c, kind, visits)), fix.lat, fix.lng, 40) : []), [data, fix, kind, visits]);

  return (
    <div className="w-full flex flex-col gap-3 animate-in fade-in duration-200">
      <div className="flex items-center gap-3 px-1 pb-3 border-b border-[#e4d8c4]">
        <span className="w-12 h-12 rounded-2xl bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center shrink-0"><LocateFixed className="w-6 h-6" /></span>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <h3 className="text-lg sm:text-xl font-black text-[#2a2017] leading-tight">ახლოს მდებარე ტაძრები</h3>
          <span className="text-xs font-bold text-[#8a4b12]">{fix ? 'უახლოესი 40, შენგან მანძილით' : 'შენი ადგილის მიხედვით'}</span>
        </div>
        {fix && !asking && <IconBtn label="ადგილის განახლება" onClick={() => { triggerHaptic(8); locate(); }}><RefreshCw /></IconBtn>}
      </div>
      {asking && !fix && (
        <div className="py-12 flex flex-col items-center gap-3 text-[#8a7a6a]">
          <Loader2 className="w-7 h-7 animate-spin text-[#7a2028]" />
          <p className="text-[14px] font-bold text-center">ვეძებ შენს ადგილს…<br /><span className="font-semibold">თუ ტელეფონი იკითხავს, დაუშვი ლოკაცია.</span></p>
        </div>
      )}
      {!fix && (state === 'denied' || state === 'failed' || state === 'none') && (
        <div className="rounded-2xl bg-white/80 ring-1 ring-[#e8dcc8] p-4 flex flex-col gap-3 items-start">
          <p className="text-[14.5px] font-semibold text-[#4a3426] leading-relaxed">
            {state === 'denied'
              ? 'ლოკაცია გამორთულია. ჩართე ის ტელეფონის პარამეტრებში (ან ბრაუზერში ამ საიტისთვის) და სცადე ხელახლა.'
              : state === 'none' ? 'ამ მოწყობილობას ლოკაციის დადგენა არ შეუძლია.' : 'ადგილი ვერ დადგინდა — სცადე ხელახლა, ღია ცის ქვეშ უკეთ გამოდის.'}
          </p>
          {state !== 'none' && <Btn icon={<LocateFixed />} onClick={() => locate()}>ხელახლა ცდა</Btn>}
        </div>
      )}
      {fix && (
        <>
          <KindChips value={kind} onChange={setKind} />
          <Paged items={near} empty="ახლოს ტაძარი ვერ მოიძებნა" render={n => <Row key={n.church.id} c={n.church} been={visits[n.church.id]} onOpen={onOpen} badge={distanceText(n.m)} />} />
        </>
      )}
    </div>
  );
};

/** the municipality: a button saying which is picked, a window with one row each (and their counts) */
const MuniPicker: React.FC<{ munis: [string, number][]; total: number; value: string; onChange: (m: string) => void }> = ({ munis, total, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const pick = (m: string) => { triggerHaptic(8); onChange(m); setOpen(false); };
  return (
    <>
      <button type="button" onClick={() => { triggerHaptic(8); setOpen(true); }} aria-haspopup="dialog"
        className={`${FIELD} flex items-center justify-between gap-2 text-left font-bold cursor-pointer ${value ? 'text-[#7a2028] ring-[#7a2028]/40' : ''}`}>
        <span className="truncate">{value ? value : 'ყველა მუნიციპალიტეტი'}</span>
        <span className="shrink-0 inline-flex items-center gap-1 text-[12.5px] font-bold text-[#8a7a6a] tabular-nums">{value ? munis.find(m => m[0] === value)?.[1] : total}<ChevronDown className="w-4 h-4" /></span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="მუნიციპალიტეტი">
        <ul className="flex flex-col gap-1.5">
          <li><MuniRow label="ყველა მუნიციპალიტეტი" n={total} on={!value} onClick={() => pick('')} /></li>
          {munis.map(([m, n]) => <li key={m}><MuniRow label={m} n={n} on={value === m} onClick={() => pick(m)} /></li>)}
        </ul>
      </Sheet>
    </>
  );
};

const MuniRow: React.FC<{ label: string; n: number; on: boolean; onClick: () => void }> = ({ label, n, on, onClick }) => (
  <button type="button" onClick={onClick} aria-pressed={on}
    className={`w-full min-h-12 px-4 rounded-2xl flex items-center justify-between gap-3 text-left text-[15px] font-bold cursor-pointer transition active:scale-[0.99] ${
      on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#2a2017] hover:bg-[#fcf6ea]'}`}>
    <span className="truncate">{label}</span>
    <span className={`shrink-0 inline-flex items-center gap-2 text-[13px] tabular-nums ${on ? 'text-[#fbf6ec]/80' : 'text-[#8a7a6a]'}`}>{n}{on && <Check className="w-4 h-4" />}</span>
  </button>
);

/** the kinds, and „ვიყავი“ once I have marked one of the list */
const KindChips: React.FC<{ value: Filter; onChange: (k: Filter) => void; list?: Church[]; visits?: Visits }> = ({ value, onChange, list, visits = {} }) => {
  const mine = list ? list.filter(c => c.id in visits).length : Object.keys(visits).length;
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="ტაძრის სახე">
      {KIND_FILTERS.map(k => (
        <Chip key={k.id} on={value === k.id} label={k.label} n={list ? list.filter(c => passesKind(c, k.id)).length : undefined} onClick={() => onChange(k.id)} />
      ))}
      {(mine > 0 || value === 'mine') && <Chip on={value === 'mine'} label="ვიყავი" n={list ? mine : undefined} onClick={() => onChange(value === 'mine' ? 'all' : 'mine')} />}
    </div>
  );
};

const Chip: React.FC<{ on: boolean; label: string; n?: number; onClick: () => void }> = ({ on, label, n, onClick }) => (
  <button type="button" aria-pressed={on} onClick={() => { triggerHaptic(8); onClick(); }}
    className={`min-h-9 px-3 py-1 rounded-full text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
      on ? 'bg-[#7a2028] text-[#fbf6ec] shadow-sm' : 'bg-white text-[#4a3426] ring-1 ring-[#e8dcc8] hover:bg-[#7a2028]/[0.05]'}`}>
    {label}
    {n !== undefined && <span className={`text-xs tabular-nums ${on ? 'text-[#fbf6ec]/75' : 'text-[#8a7a6a]'}`}>{n}</span>}
  </button>
);

const SearchField: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => (
  <label className="relative block">
    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b3a594]" aria-hidden />
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`${FIELD} pl-10`} type="search" />
  </label>
);

/** the search's hits whose own name holds the words first (a village of the same name after them), the rest keep their order */
const byName = (list: Church[], query: string) => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const named = (c: Church) => words.every(w => c.name.toLowerCase().includes(w));
  return [...list.filter(named), ...list.filter(c => !named(c))];
};

/** a long list in steps of 60 */
function Paged<T>({ items, empty, render }: { items: T[]; empty: string; render: (item: T) => React.ReactNode }) {
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => { setLimit(PAGE); }, [items]);
  if (!items.length) return <p className="py-10 text-center text-sm font-bold text-[#8a7a6a]">{empty}</p>;
  return (
    <div className="flex flex-col gap-3">
      <ul className="rounded-3xl bg-white/80 ring-1 ring-[#e8dcc8] divide-y divide-[#efe5d4] overflow-hidden">{items.slice(0, limit).map(render)}</ul>
      {items.length > limit && (
        <Btn kind="ghost" onClick={() => setLimit(l => l + PAGE)} className="self-center">კიდევ {Math.min(PAGE, items.length - limit)} · სულ {items.length}</Btn>
      )}
    </div>
  );
}

/** a church in a list; `been` = the day I marked it (a green ✓ on its picture), `badge` = a distance or a day at the right */
const Row: React.FC<{ c: Church; onOpen: (id: string) => void; badge?: string; been?: string }> = ({ c, onOpen, badge, been }) => (
  <li>
    <button type="button" onClick={() => onOpen(c.id)} className="group w-full flex items-center gap-3 p-2.5 text-left cursor-pointer hover:bg-[#fcf6ea] active:bg-[#f7eddc] transition-colors">
      <span className="relative shrink-0">
        <Thumb c={c} />
        {been && (
          <span className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full bg-[#2f6b3a] ring-2 ring-white text-white flex items-center justify-center" aria-label="ვიყავი">
            <Check className="w-3 h-3" strokeWidth={3} />
          </span>
        )}
      </span>
      <span className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="text-[15px] font-bold text-[#2a2017] leading-snug line-clamp-2 break-words group-hover:text-[#7a2028] transition-colors">{c.name}</span>
        <span className="text-[12.5px] font-semibold text-[#8a7a6a] leading-snug line-clamp-1 break-words">{whereOf(c)}</span>
        {(c.kind !== 'c' || c.building) && (
          <span className="flex flex-wrap gap-1">
            {c.building ? <Tag tone="amber">მშენებარე</Tag> : c.kind === 'x' && <Tag tone="muted">არ მოქმედებს</Tag>}
            {c.kind === 'm' && <Tag tone="gold">მონასტერი</Tag>}
          </span>
        )}
      </span>
      {badge ? <span className="shrink-0 px-2.5 h-8 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] text-[13px] font-black tabular-nums inline-flex items-center whitespace-nowrap">{badge}</span>
        : <ChevronRight className="w-5 h-5 shrink-0 text-[#c8b8a2] group-hover:text-[#7a2028]" />}
    </button>
  </li>
);

/** the photo when there is one, else a church tile in the kind's colour */
const Thumb: React.FC<{ c: Church; size?: 8 | 14 }> = ({ c, size = 14 }) => {
  const [failed, setFailed] = useState(false);
  const box = size === 8 ? 'w-8 h-8 rounded-full' : 'w-14 h-14 rounded-xl';
  if (c.photo && !failed) {
    return <img src={photoUrl(c.photo, 160)} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className={`${box} shrink-0 object-cover bg-[#efe5d4]`} />;
  }
  const tone = c.kind === 'x' ? 'bg-[#efe8de] text-[#a3968a]' : c.kind === 'm' ? 'bg-[#f4e6c8] text-[#9a6a14]' : 'bg-[#f4e1dc] text-[#7a2028]';
  return <span className={`${box} shrink-0 flex items-center justify-center ${tone}`}><ChurchIcon className={size === 8 ? 'w-4 h-4' : 'w-6 h-6'} aria-hidden /></span>;
};

export default ChurchesPage;
