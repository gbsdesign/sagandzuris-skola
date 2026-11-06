import React, { useEffect, useMemo, useState } from 'react';
import { Church as ChurchIcon, ChevronRight, ExternalLink, Loader2, LocateFixed, RefreshCw, Search } from 'lucide-react';
import { useNavigation } from '../context';
import { RegionLocator, RegionPuzzleMap } from '../components/maps/RegionPuzzleMap';
import { Btn, FIELD, IconBtn } from '../components/ui/kit';
import { triggerHaptic } from '../utils/haptics';
import { FOLK_REGIONS, type FolkRegion } from '../data/songsData';
import {
  type Church, type ChurchData, type KindFilter, KIND_FILTERS, distanceText, loadChurches,
  matchChurch, nearest, passesKind, photoUrl, whereOf,
} from '../data/churches';
import { ChurchCard, Tag } from './churches/ChurchCard';

// „ეკლესია-მონასტრები“ (the vine's label): Georgia's churches on the map by region (as on „ვიდეოები“), a search over all of
// them and „ახლოს მდებარე ტაძრები“ by the phone's location. The open list is `mapItem` — a region's id, „near“ or „all“ (the
// search on the first screen) —, an open church adds „/<its id>“, so the bar's „უკან“ first closes the church, then the list.

const SOURCE_URL = 'https://toc.ge/map/ka';
/** Tbilisi stands for the songs map's „ქალაქური“ */
const churchRegionName = (r: FolkRegion) => (r.id === 'kalakuri' ? 'თბილისი' : r.nameGe);
const churchRegion = (id: string): FolkRegion | null => FOLK_REGIONS.find(r => r.id === id) ?? null;
const PAGE = 60;

export const ChurchesPage: React.FC = () => {
  const { mapItem, openMapItem, handleGoBack } = useNavigation();
  const [data, setData] = useState<ChurchData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    loadChurches().then(d => alive && setData(d), () => alive && setFailed(true));
    return () => { alive = false; };
  }, []);

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
  const region = list && list !== 'all' && list !== 'near' ? churchRegion(list) : null;

  if (list === 'near') return <><Nearby data={data} onOpen={openChurch} />{card}</>;
  if (region) return <><RegionList region={region} all={data.list.filter(c => c.region === region.id)} onOpen={openChurch} />{card}</>;
  return <><Overview data={data} onRegion={id => { triggerHaptic(10); openMapItem(id); }} onNear={() => { triggerHaptic(10); openMapItem('near'); }} onOpen={openChurch} />{card}</>;
};

/** the first screen: „ახლოს მდებარე“, a search over every church, the map */
const Overview: React.FC<{ data: ChurchData; onRegion: (id: string) => void; onNear: () => void; onOpen: (id: string) => void }> = ({ data, onRegion, onNear, onOpen }) => {
  const [q, setQ] = useState('');
  const query = q.trim();
  const found = useMemo(() => (query.length >= 2 ? byName(data.list.filter(c => matchChurch(c, query)), query) : []), [data, query]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const x of data.list) c[x.region] = (c[x.region] ?? 0) + 1;
    return c;
  }, [data]);
  const active = data.list.filter(c => c.kind !== 'x').length;

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-200">
      <p className="px-1 text-[13.5px] leading-relaxed text-[#574739]">
        <b className="text-[#2a2017]">ეკლესია-მონასტრები</b> — საქართველოს {data.list.length.toLocaleString('en-US')} ტაძარი რუკაზე ({active.toLocaleString('en-US')} მოქმედი).
        დააჭირე კუთხეს ან მოძებნე სახელით: ნახავ, სად არის, მოქმედია თუ არა, და გზას Google Maps-ით.
      </p>
      <button type="button" onClick={onNear}
        className="w-full min-h-14 px-4 py-3 rounded-2xl bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] shadow-[0_6px_16px_-8px_rgba(122,32,40,0.75)] flex items-center gap-3 text-left cursor-pointer transition active:scale-[0.99]">
        <span className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0"><LocateFixed className="w-5 h-5" /></span>
        <span className="flex-1 min-w-0 flex flex-col">
          <span className="text-[16px] font-black leading-tight">ახლოს მდებარე ტაძრები</span>
          <span className="text-[12.5px] font-semibold text-[#fbf6ec]/80 leading-snug">ჩართე ლოკაცია და ნახე უახლოესი ეკლესიები</span>
        </span>
        <ChevronRight className="w-5 h-5 shrink-0 opacity-80" />
      </button>
      <SearchField value={q} onChange={setQ} placeholder="ტაძრის ან სოფლის ძებნა" />
      {query.length >= 2 ? (
        <Paged items={found} empty="ასეთი ტაძარი ვერ მოიძებნა" render={c => <Row key={c.id} c={c} onOpen={onOpen} />} />
      ) : (
        <RegionPuzzleMap
          onSelect={(r: FolkRegion) => onRegion(r.id)}
          count={id => counts[id] ?? 0}
          countLabel={n => `${n} ტაძარი`}
          regionName={churchRegionName}
          title="ეკლესია-მონასტრები"
        />
      )}
      <Source />
    </div>
  );
};

/** a region's churches: where it is, the kinds, a municipality, a search line, the list */
const RegionList: React.FC<{ region: FolkRegion; all: Church[]; onOpen: (id: string) => void }> = ({ region, all, onOpen }) => {
  const [kind, setKind] = useState<KindFilter>('all');
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
    const list = inMuni.filter(c => passesKind(c, kind) && (!query || matchChurch(c, query)));
    return query ? byName(list, query) : list;
  }, [inMuni, kind, query]);
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
      {all.length > 0 && <KindChips value={kind} onChange={setKind} list={inMuni} />}
      {munis.length > 1 && (
        <select value={muni} onChange={e => { triggerHaptic(8); setMuni(e.target.value); }} className={`${FIELD} font-semibold cursor-pointer`} aria-label="მუნიციპალიტეტი">
          <option value="">ყველა მუნიციპალიტეტი ({all.length})</option>
          {munis.map(([m, n]) => <option key={m} value={m}>{m} ({n})</option>)}
        </select>
      )}
      {all.length > 0 && <SearchField value={q} onChange={setQ} placeholder="ტაძრის ან სოფლის ძებნა" />}
      {all.length > 0 && <Paged items={shown} empty="ასეთი ტაძარი ვერ მოიძებნა" render={c => <Row key={c.id} c={c} onOpen={onOpen} />} />}
    </div>
  );
};

// the last place found stays for the visit, so coming back from a church does not ask again
let lastFix: { lat: number; lng: number; at: number } | null = null;
type FixState = 'idle' | 'asking' | 'denied' | 'failed' | 'none';

/** „ახლოს მდებარე ტაძრები“: the phone's place, then the nearest churches with their distance */
const Nearby: React.FC<{ data: ChurchData; onOpen: (id: string) => void }> = ({ data, onOpen }) => {
  const [fix, setFix] = useState(lastFix);
  const [state, setState] = useState<FixState>(lastFix ? 'idle' : 'asking');
  const [kind, setKind] = useState<KindFilter>('active');

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

  const near = useMemo(() => (fix ? nearest(data.list.filter(c => passesKind(c, kind)), fix.lat, fix.lng, 40) : []), [data, fix, kind]);

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
          <Paged items={near} empty="ახლოს ტაძარი ვერ მოიძებნა" render={n => <Row key={n.church.id} c={n.church} onOpen={onOpen} distance={distanceText(n.m)} />} />
        </>
      )}
    </div>
  );
};

const KindChips: React.FC<{ value: KindFilter; onChange: (k: KindFilter) => void; list?: Church[] }> = ({ value, onChange, list }) => (
  <div className="flex flex-wrap gap-1.5" role="group" aria-label="ტაძრის სახე">
    {KIND_FILTERS.map(k => {
      const on = value === k.id;
      const n = list ? list.filter(c => passesKind(c, k.id)).length : undefined;
      return (
        <button key={k.id} type="button" aria-pressed={on} onClick={() => { triggerHaptic(8); onChange(k.id); }}
          className={`min-h-9 px-3 py-1 rounded-full text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
            on ? 'bg-[#7a2028] text-[#fbf6ec] shadow-sm' : 'bg-white text-[#4a3426] ring-1 ring-[#e8dcc8] hover:bg-[#7a2028]/[0.05]'}`}>
          {k.label}
          {n !== undefined && <span className={`text-xs tabular-nums ${on ? 'text-[#fbf6ec]/75' : 'text-[#8a7a6a]'}`}>{n}</span>}
        </button>
      );
    })}
  </div>
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

const Row: React.FC<{ c: Church; onOpen: (id: string) => void; distance?: string }> = ({ c, onOpen, distance }) => (
  <li>
    <button type="button" onClick={() => onOpen(c.id)} className="group w-full flex items-center gap-3 p-2.5 text-left cursor-pointer hover:bg-[#fcf6ea] active:bg-[#f7eddc] transition-colors">
      <Thumb c={c} />
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
      {distance ? <span className="shrink-0 px-2.5 h-8 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] text-[13px] font-black tabular-nums inline-flex items-center">{distance}</span>
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
