import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, Church as ChurchIcon, ChevronRight, ExternalLink, ImageIcon, Loader2, LocateFixed, Map as MapIcon, MapPin, RefreshCw, Search, Sparkles } from 'lucide-react';
import { useNavigation, useRealAuth } from '../context';
import { RegionLocator, RegionPuzzleMap } from '../components/maps/RegionPuzzleMap';
import { Btn, FIELD, IconBtn, Tabs } from '../components/ui/kit';
import { triggerHaptic } from '../utils/haptics';
import { FOLK_REGIONS, type FolkRegion } from '../data/songsData';
import {
  type Church, type ChurchData, type KindFilter, KIND_FILTERS, distanceText, loadChurches,
  matchChurch, nearest, passesKind, photoUrl, whereOf,
} from '../data/churches';
import { ChurchCard, Tag } from './churches/ChurchCard';
import { type FeastRule, dayText, feastsOnDay, nextFeastDayWithChurches, tbilisiToday } from '../data/churchFeasts';
import { type Visits, useChurchVisits } from '../hooks/useChurchVisits';
import { saveGooglePlacesKey, useGooglePlacesKey } from '../hooks/useGooglePhotos';

const PinsMap = lazy(() => import('./churches/PinsMap'));

// „ეკლესია-მონასტრები“ (the vine's label): Georgia's churches on the map by region (as on „ვიდეოები“) or as dots on a real
// map, a search over all of them, „ახლოს მდებარე ტაძრები“ by the phone's location, „დღეს ტაძრობაა“ (data/churchFeasts.ts)
// and „მომლოცველის წიგნაკი“ (hooks/useChurchVisits.ts). The open list is `mapItem` — a region's id, „near“, „feast“, „book“
// or „all“ (the first screen) —, an open church adds „/<its id>“, so the bar's „უკან“ first closes the church, then the list.

const SOURCE_URL = 'https://toc.ge/map/ka';
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
  if (region) return <><RegionList region={region} all={data.list.filter(c => c.region === region.id)} visits={visits} onOpen={openChurch} />{card}</>;
  return <><Overview data={data} visits={visits} onGo={go} onOpen={openChurch} />{card}</>;
};

/** the first screen: „ახლოს მდებარე“, the day's feast, my book, a search over every church, the map (regions or dots) */
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
  const visited = useCallback((id: string) => id in visits, [visits]);
  const chooseTab = (t: Tab) => { setTab(t); try { sessionStorage.setItem(TAB_KEY, t); } catch { /* private mode */ } };

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-200">
      <p className="px-1 text-[13.5px] leading-relaxed text-[#574739]">
        <b className="text-[#2a2017]">ეკლესია-მონასტრები</b> — საქართველოს {data.list.length.toLocaleString('en-US')} ტაძარი რუკაზე ({active.toLocaleString('en-US')} მოქმედი).
        დააჭირე კუთხეს ან მოძებნე სახელით: ნახავ, სად არის, მოქმედია თუ არა, და გზას Google Maps-ით.
      </p>
      <button type="button" onClick={() => onGo('near')}
        className="w-full min-h-14 px-4 py-3 rounded-2xl bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] shadow-[0_6px_16px_-8px_rgba(122,32,40,0.75)] flex items-center gap-3 text-left cursor-pointer transition active:scale-[0.99]">
        <span className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0"><LocateFixed className="w-5 h-5" /></span>
        <span className="flex-1 min-w-0 flex flex-col">
          <span className="text-[16px] font-black leading-tight">ახლოს მდებარე ტაძრები</span>
          <span className="text-[12.5px] font-semibold text-[#fbf6ec]/80 leading-snug">ჩართე ლოკაცია და ნახე უახლოესი ეკლესიები</span>
        </span>
        <ChevronRight className="w-5 h-5 shrink-0 opacity-80" />
      </button>
      <div className="grid gap-3 sm:grid-cols-2">
        <FeastCard data={data} onOpen={() => onGo('feast')} />
        <BookCard data={data} visits={visits} onOpen={() => onGo('book')} />
      </div>
      <SearchField value={q} onChange={setQ} placeholder="ტაძრის ან სოფლის ძებნა" />
      {query.length >= 2 ? (
        <Paged items={found} empty="ასეთი ტაძარი ვერ მოიძებნა" render={c => <Row key={c.id} c={c} been={visits[c.id]} onOpen={onOpen} />} />
      ) : (
        <>
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
            <Suspense fallback={<div className="w-full h-[52vh] min-h-[320px] max-h-[560px] rounded-3xl bg-[#f3e3c6] animate-pulse" />}>
              <PinsMap list={data.list} visited={visited} onOpen={onOpen} />
            </Suspense>
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
      <Source />
      <GoogleKeyBox />
    </div>
  );
};

/** „დღეს ტაძრობაა“ — or, on a day without, the next feast — with its churches' count */
const FeastCard: React.FC<{ data: ChurchData; onOpen: () => void }> = ({ data, onOpen }) => {
  const today = tbilisiToday();
  const next = useMemo(() => nextFeastDayWithChurches(data.list, today), [data, today]);
  if (!next) return null;
  const isToday = next.day === today;
  const total = next.feasts.reduce((n, f) => n + f.churches.length, 0);
  return (
    <button type="button" onClick={onOpen}
      className="w-full min-h-[5.5rem] p-3.5 rounded-2xl bg-gradient-to-br from-[#fbf0d8] to-[#f4e1bd] ring-1 ring-[#e2c9a0] flex items-start gap-3 text-left cursor-pointer transition active:scale-[0.99] hover:ring-[#b07a1e]/50">
      <span className="w-10 h-10 rounded-full bg-[#b07a1e]/15 text-[#8a5a0e] flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5" /></span>
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-[15.5px] font-black text-[#2a2017] leading-tight">{isToday ? 'დღეს ტაძრობაა' : `ტაძრობა · ${dayText(next.day)}`}</span>
        <span className="text-[13.5px] font-bold text-[#8a5a0e] leading-snug line-clamp-2">{next.feasts.map(f => f.feast.label).join(', ')}</span>
        <span className="text-[12.5px] font-semibold text-[#6b5c4e]">{total} ტაძარი</span>
      </span>
      <ChevronRight className="w-5 h-5 shrink-0 self-center text-[#b9a07a]" />
    </button>
  );
};

/** „მომლოცველის წიგნაკი“: how many I have been to, a stamp a region */
const BookCard: React.FC<{ data: ChurchData; visits: Visits; onOpen: () => void }> = ({ data, visits, onOpen }) => {
  const n = Object.keys(visits).filter(id => data.byId.has(id)).length;
  const regions = useMemo(() => regionStamps(data, visits), [data, visits]);
  const stamped = regions.filter(r => r.mine > 0).length;
  return (
    <button type="button" onClick={onOpen}
      className="w-full min-h-[5.5rem] p-3.5 rounded-2xl bg-white/85 ring-1 ring-[#e8dcc8] flex items-start gap-3 text-left cursor-pointer transition active:scale-[0.99] hover:ring-[#2f6b3a]/40">
      <span className="w-10 h-10 rounded-full bg-[#2f6b3a]/10 text-[#2f6b3a] flex items-center justify-center shrink-0"><BookOpen className="w-5 h-5" /></span>
      <span className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="text-[15.5px] font-black text-[#2a2017] leading-tight">მომლოცველის წიგნაკი</span>
        <span className="text-[12.5px] font-semibold text-[#6b5c4e]">{n ? `${n} ტაძარი · ${stamped} კუთხე` : 'მონიშნე ტაძრები, სადაც ყოფილხარ'}</span>
        <span className="flex flex-wrap gap-1 pt-0.5" aria-hidden>
          {regions.map(r => (
            <span key={r.region.id} title={churchRegionName(r.region)}
              className={`w-4 h-4 rounded-full ${r.mine ? 'ring-2 ring-[#2f6b3a] ring-offset-1' : ''}`} style={{ background: r.mine ? r.region.color : `${r.region.color}55` }} />
          ))}
        </span>
      </span>
      <ChevronRight className="w-5 h-5 shrink-0 self-center text-[#c8b8a2]" />
    </button>
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

/** the admin's place for Google's key: with it, Google Maps' photos show in every church's window */
const GoogleKeyBox: React.FC = () => {
  const { isAdmin } = useRealAuth();
  const key = useGooglePlacesKey();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'failed'>('idle');
  if (!isAdmin || key === undefined) return null;
  const save = async () => {
    setState('saving');
    try { await saveGooglePlacesKey(value); setEditing(false); setValue(''); setState('idle'); } catch { setState('failed'); }
  };
  return (
    <section className="rounded-2xl bg-white/70 border border-dashed border-[#d8c8ae] p-3.5 flex flex-col gap-2">
      <h4 className="flex items-center gap-1.5 text-[13px] font-black text-[#8a4b12]"><ImageIcon className="w-4 h-4" />Google-ის ფოტოები · მხოლოდ ადმინი ხედავს</h4>
      {key && !editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13.5px] font-semibold text-[#2f6b3a]">ჩართულია — ტაძრის ფანჯარაში Google Maps-ის ფოტოებიც ჩანს.</span>
          <Btn kind="ghost" size="sm" onClick={() => setEditing(true)}>გასაღების შეცვლა</Btn>
        </div>
      ) : (
        <>
          <p className="text-[13px] font-semibold text-[#574739] leading-snug">ჩასვი Google-ის გასაღები (Places API) — ფოტოები ყველა ტაძარში ჩაირთვება.</p>
          <div className="flex gap-2">
            <input value={value} onChange={e => setValue(e.target.value)} placeholder="AIza…" className={`${FIELD} font-mono text-[13px]`} autoComplete="off" spellCheck={false} />
            <Btn onClick={save} disabled={state === 'saving' || value.trim().length < 20}>შენახვა</Btn>
          </div>
          {state === 'failed' && <p className="text-[13px] font-bold text-red-700">ვერ შეინახა — სცადე ხელახლა.</p>}
        </>
      )}
    </section>
  );
};

/** a region's churches: where it is, the kinds, a municipality, a search line, the list */
const RegionList: React.FC<{ region: FolkRegion; all: Church[]; visits: Visits; onOpen: (id: string) => void }> = ({ region, all, visits, onOpen }) => {
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
        <RegionLocator region={region} className="w-28 sm:w-32 h-auto shrink-0" />
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
      {munis.length > 1 && (
        <select value={muni} onChange={e => { triggerHaptic(8); setMuni(e.target.value); }} className={`${FIELD} font-semibold cursor-pointer`} aria-label="მუნიციპალიტეტი">
          <option value="">ყველა მუნიციპალიტეტი ({all.length})</option>
          {munis.map(([m, n]) => <option key={m} value={m}>{m} ({n})</option>)}
        </select>
      )}
      {all.length > 0 && <SearchField value={q} onChange={setQ} placeholder="ტაძრის ან სოფლის ძებნა" />}
      {all.length > 0 && <Paged items={shown} empty="ასეთი ტაძარი ვერ მოიძებნა" render={c => <Row key={c.id} c={c} been={visits[c.id]} onOpen={onOpen} />} />}
    </div>
  );
};

// the last place found stays for the visit, so coming back from a church does not ask again
let lastFix: { lat: number; lng: number; at: number } | null = null;
type FixState = 'idle' | 'asking' | 'denied' | 'failed' | 'none';

/** „ახლოს მდებარე ტაძრები“: the phone's place, then the nearest churches with their distance */
const Nearby: React.FC<{ data: ChurchData; visits: Visits; onOpen: (id: string) => void }> = ({ data, visits, onOpen }) => {
  const [fix, setFix] = useState(lastFix);
  const [state, setState] = useState<FixState>(lastFix ? 'idle' : 'asking');
  const [kind, setKind] = useState<Filter>('active');

  const locate = () => {
    if (!('geolocation' in navigator)) { setState('none'); return; }
    setState('asking');
    navigator.geolocation.getCurrentPosition(
      p => { lastFix = { lat: p.coords.latitude, lng: p.coords.longitude, at: Date.now() }; setFix(lastFix); setState('idle'); },
      e => setState(e.code === e.PERMISSION_DENIED ? 'denied' : 'failed'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 120000 },
    );
  };
  // a place older than ten minutes is asked again
  useEffect(() => { if (!lastFix || Date.now() - lastFix.at > 600000) locate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const near = useMemo(() => (fix ? nearest(data.list.filter(c => passes(c, kind, visits)), fix.lat, fix.lng, 40) : []), [data, fix, kind, visits]);

  return (
    <div className="w-full flex flex-col gap-3 animate-in fade-in duration-200">
      <div className="flex items-center gap-3 px-1 pb-3 border-b border-[#e4d8c4]">
        <span className="w-12 h-12 rounded-2xl bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center shrink-0"><LocateFixed className="w-6 h-6" /></span>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <h3 className="text-lg sm:text-xl font-black text-[#2a2017] leading-tight">ახლოს მდებარე ტაძრები</h3>
          <span className="text-xs font-bold text-[#8a4b12]">{fix ? 'უახლოესი 40, შენგან მანძილით' : 'შენი ადგილის მიხედვით'}</span>
        </div>
        {fix && state !== 'asking' && <IconBtn label="ადგილის განახლება" onClick={locate}><RefreshCw /></IconBtn>}
      </div>
      {state === 'asking' && (
        <div className="py-12 flex flex-col items-center gap-3 text-[#8a7a6a]">
          <Loader2 className="w-7 h-7 animate-spin text-[#7a2028]" />
          <p className="text-[14px] font-bold text-center">ვეძებ შენს ადგილს…<br /><span className="font-semibold">თუ ტელეფონი იკითხავს, დაუშვი ლოკაცია.</span></p>
        </div>
      )}
      {(state === 'denied' || state === 'failed' || state === 'none') && (
        <div className="rounded-2xl bg-white/80 ring-1 ring-[#e8dcc8] p-4 flex flex-col gap-3 items-start">
          <p className="text-[14.5px] font-semibold text-[#4a3426] leading-relaxed">
            {state === 'denied'
              ? 'ლოკაცია გამორთულია. ჩართე ის ტელეფონის პარამეტრებში (ან ბრაუზერში ამ საიტისთვის) და სცადე ხელახლა.'
              : state === 'none' ? 'ამ მოწყობილობას ლოკაციის დადგენა არ შეუძლია.' : 'ადგილი ვერ დადგინდა — სცადე ხელახლა, ღია ცის ქვეშ უკეთ გამოდის.'}
          </p>
          {state !== 'none' && <Btn icon={<LocateFixed />} onClick={locate}>ხელახლა ცდა</Btn>}
        </div>
      )}
      {fix && state !== 'asking' && (
        <>
          <KindChips value={kind} onChange={setKind} />
          <Paged items={near} empty="ახლოს ტაძარი ვერ მოიძებნა" render={n => <Row key={n.church.id} c={n.church} been={visits[n.church.id]} onOpen={onOpen} badge={distanceText(n.m)} />} />
        </>
      )}
    </div>
  );
};

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
const Thumb: React.FC<{ c: Church }> = ({ c }) => {
  const [failed, setFailed] = useState(false);
  if (c.photo && !failed) {
    return <img src={photoUrl(c.photo, 160)} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className="w-14 h-14 shrink-0 rounded-xl object-cover bg-[#efe5d4]" />;
  }
  const tone = c.kind === 'x' ? 'bg-[#efe8de] text-[#a3968a]' : c.kind === 'm' ? 'bg-[#f4e6c8] text-[#9a6a14]' : 'bg-[#f4e1dc] text-[#7a2028]';
  return <span className={`w-14 h-14 shrink-0 rounded-xl flex items-center justify-center ${tone}`}><ChurchIcon className="w-6 h-6" aria-hidden /></span>;
};

const Source: React.FC = () => (
  <p className="px-1 text-[12px] font-semibold text-[#8a7a6a] leading-relaxed">
    სია: <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-bold text-[#8a4b12] hover:underline">„ეკლესიის ტერიტორიულობა“ (Indigo, 2021) <ExternalLink className="w-3 h-3" /></a>
    {' '}· ფოტოები და აღწერები: ვიკიპედია და ვიკიმედია. საათებს და დამატებით ცნობებს ადმინისტრაცია წერს.
  </p>
);

export default ChurchesPage;
