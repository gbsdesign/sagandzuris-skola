import React, { useMemo, useState } from 'react';
import { Check, CircleCheck, LoaderCircle, LocateFixed, MapPin, Search, X } from 'lucide-react';
import { Bar, Button, Card, Helper, Hero, Note, Press, Rows, RoundButton, SectionLabel, TopBar, cx, FOCUS_IN } from '../../../components/ui2';
import { FOLK_REGIONS, type FolkRegion, type MapRegionId } from '../../../data/songsData';
import { distanceM, distanceText, matchChurch, nearest, type Church, type ChurchData } from '../../../data/churches';
import { type FeastRule, dayText, nextFeastDayWithChurches, tbilisiToday } from '../../../data/churchFeasts';
import { CHURCH_SERVICES, SERVICES_SOURCE, hasTime, type ChurchService, type ServiceTime } from '../../../data/churchServices';
import { MONASTERY_FILMS } from '../../../data/monasteryVideos';
import type { Visits } from '../../../hooks/useChurchVisits';
import { useMyPlace } from '../../../hooks/useMyPlace';
import { triggerHaptic } from '../../../utils/haptics';
import { PlacedVideos, monasteryFilms, type FilmNav } from '../khalkhuri/videos';
import {
  Chev, ChurchList, ChurchRow, KindPills, OtherRegion, Page, PickSheet, PillRow, SearchPill, SlotLine, big, byName, churchRegionName,
  passes, shortDay, useFolded, useMunis, type Filter,
} from './parts';
import { MapRound } from './Front';

// The lists of „ეკლესია-მონასტრები“ in the new look: a region's churches (x-tadzrebi-kutkhe), the nearest (x-tadzrebi-akhlos),
// the feast's (x-tadzroba), the pilgrim's book (x-tsignaki), the teachers' daily services, and the TV reports on monasteries.

const filmsIn = (region: string) => MONASTERY_FILMS.filter(f => f[3] === region).length;

const SearchRound: React.FC<{ open: boolean; onClick: () => void }> = ({ open, onClick }) => (
  <RoundButton label={open ? 'ძებნის დახურვა' : 'ძებნა'} tone={open ? 'wine' : 'surf'} onClick={() => { triggerHaptic(10); onClick(); }}>
    {open ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
  </RoundButton>
);

/** a region's churches: the kinds, its municipality, its monasteries' videos as pills, the list, another region on the small map */
export const RegionScreen: React.FC<{
  region: FolkRegion; all: Church[]; visits: Visits; onOpen: (id: string) => void; onGo: (item: string) => void;
  onRegion: (id: MapRegionId) => void; onBack: () => void;
}> = ({ region, all, visits, onOpen, onGo, onRegion, onBack }) => {
  const [kind, setKind] = useState<Filter>('all');
  const [muni, setMuni] = useState('');
  const [picking, setPicking] = useState(false);
  const search = useFolded();
  const munis = useMunis(all);
  const inMuni = useMemo(() => all.filter(c => !muni || c.muni === muni), [all, muni]);
  const shown = useMemo(() => {
    const list = inMuni.filter(c => passes(c, kind, visits) && (!search.query || matchChurch(c, search.query)));
    return search.query ? byName(list, search.query) : list;
  }, [inMuni, kind, visits, search.query]);
  const films = filmsIn(region.id);
  const monasteries = all.filter(c => c.kind === 'm').length;

  return (
    <Page>
      <TopBar
        title={churchRegionName(region)}
        sub={all.length ? `${big(all.length)} ტაძარი${monasteries ? ` · ${monasteries} მონასტერი` : ''}` : 'ოკუპირებული ტერიტორია'}
        onBack={onBack}
        right={all.length > 0 && <>
          {all.length > 8 && <SearchRound open={search.open} onClick={search.toggle} />}
          {all.some(c => c.located) && <MapRound onClick={() => onGo(`map:${region.id}`)} />}
        </>}
      />
      {all.length > 0 ? (
        <>
          <KindPills value={kind} onChange={setKind} list={inMuni} visits={visits} extra={[
            ...(munis.length > 1 ? [{ id: 'muni', label: muni ? `${muni} ▾` : 'მუნიციპალიტეტი ▾', on: !!muni, onClick: () => setPicking(true) }] : []),
            ...(films ? [{ id: 'films', label: `ვიდეო · ${films}`, onClick: () => onGo(`v:${region.id}`) }] : []),
          ]} />
          {search.open && <SearchPill value={search.q} onChange={search.setQ} autoFocus placeholder="ტაძრის ან სოფლის ძებნა" onEscape={search.toggle} />}
          <ChurchList items={shown} empty="ასეთი ტაძარი ვერ მოიძებნა" render={c => <ChurchRow key={c.id} c={c} been={visits[c.id]} onOpen={onOpen} local />} />
        </>
      ) : (
        <Note className="py-6 text-center">აქაური ტაძრები სიაში ჯერ არ არის — წყარო ოკუპირებულ ტერიტორიებს არ მოიცავს.</Note>
      )}
      <OtherRegion region={region} onPick={onRegion} />
      <PickSheet open={picking} title="მუნიციპალიტეტი" all="ყველა მუნიციპალიტეტი" total={all.length} items={munis} value={muni}
        onPick={m => { triggerHaptic(8); setMuni(m); }} onClose={() => setPicking(false)} />
    </Page>
  );
};

/** where the phone is not known: one sentence, one button */
const PlaceAsk: React.FC<{ state: string; locate: () => void }> = ({ state, locate }) => (
  <Card className="flex flex-col items-start gap-3">
    <p className="text-body leading-relaxed text-ink">
      {state === 'denied' ? 'ლოკაცია გამორთულია. ჩართე ის ტელეფონის (ან ბრაუზერის) პარამეტრებში და სცადე ხელახლა.'
        : state === 'none' ? 'ამ მოწყობილობას ლოკაციის დადგენა არ შეუძლია.'
        : state === 'failed' ? 'ადგილი ვერ დადგინდა — სცადე ხელახლა, ღია ცის ქვეშ უკეთ გამოდის.'
        : 'შენი ადგილის მიხედვით ვიპოვი უახლოეს ტაძრებს.'}
    </p>
    {state !== 'none' && <Button icon={<LocateFixed aria-hidden="true" />} onClick={() => { triggerHaptic(10); locate(); }}>ლოკაციის ჩართვა</Button>}
  </Card>
);

const Waiting: React.FC = () => (
  <div role="status" className="flex flex-col items-center gap-2 py-12 text-center text-body text-mut">
    <LoaderCircle aria-hidden="true" className="size-6 animate-spin text-wine" />
    <span className="font-semibold">ვეძებ შენს ადგილს…<br />თუ ტელეფონი იკითხავს, დაუშვი ლოკაცია.</span>
  </div>
);

/** the nearest churches, by distance from the phone's place */
export const Nearby: React.FC<{ data: ChurchData; visits: Visits; onOpen: (id: string) => void; onGo: (item: string) => void; onBack: () => void }> = ({
  data, visits, onOpen, onGo, onBack,
}) => {
  const { fix, state, locate } = useMyPlace(true);
  const [kind, setKind] = useState<Filter>('active');
  const asking = state === 'asking';
  const near = useMemo(() => (fix ? nearest(data.list.filter(c => passes(c, kind, visits)), fix.lat, fix.lng, 40) : []), [data, fix, kind, visits]);
  return (
    <Page>
      <TopBar title="ახლოს ჩემთან" onBack={onBack} right={fix && <MapRound onClick={() => onGo('map:near')} />} />
      {asking && !fix && <Waiting />}
      {!fix && !asking && <PlaceAsk state={state} locate={locate} />}
      {fix && (
        <>
          <KindPills value={kind} onChange={setKind} list={data.list} visits={visits} counted={false} />
          <ChurchList items={near} empty="ახლოს ტაძარი ვერ მოიძებნა"
            render={n => <ChurchRow key={n.church.id} c={n.church} been={visits[n.church.id]} onOpen={onOpen} badge={distanceText(n.m)} />} />
          <Helper icon={<MapPin />}>მანძილი შენი ადგილიდან. ყველაზე ახლო ზემოთაა.</Helper>
          <Button kind="quiet" size="md" className="self-start" disabled={asking} icon={<LocateFixed aria-hidden="true" />} onClick={() => { triggerHaptic(8); locate(); }}>
            {asking ? 'ვეძებ…' : 'ადგილის განახლება'}
          </Button>
        </>
      )}
    </Page>
  );
};

/** my region on the feast's list: picked once, kept on the device */
const MY_REGION = 'sg-churches-my-region';
const readMyRegion = () => { try { return localStorage.getItem(MY_REGION) || ''; } catch { return ''; } };

/** the next feast day: what it is, its churches — all, my region's, or the nearest first — and one pill a feast when several */
export const FeastScreen: React.FC<{ data: ChurchData; visits: Visits; onOpen: (id: string) => void; onBack: () => void }> = ({ data, visits, onOpen, onBack }) => {
  const today = tbilisiToday();
  const next = useMemo(() => nextFeastDayWithChurches(data.list, today), [data, today]);
  const [feast, setFeast] = useState<FeastRule | null>(null);
  const [scope, setScope] = useState<'all' | 'region' | 'near'>('all');
  const [myRegion, setMyRegion] = useState(readMyRegion);
  const [picking, setPicking] = useState(false);
  const search = useFolded();
  const place = useMyPlace(scope === 'near');
  const all = useMemo(() => (next?.feasts ?? []).flatMap(f => f.churches), [next]);
  const ofFeast = useMemo(() => (feast ? next?.feasts.find(f => f.feast === feast)?.churches ?? [] : all), [all, feast, next]);
  const regions = useMemo(() => FOLK_REGIONS
    .map(r => [r.id, churchRegionName(r), ofFeast.filter(c => c.region === r.id).length] as [string, string, number])
    .filter(r => r[2] > 0), [ofFeast]);
  const shown = useMemo(() => {
    let list = ofFeast.filter(c => (scope !== 'region' || c.region === myRegion) && (!search.query || matchChurch(c, search.query)));
    if (search.query) list = byName(list, search.query);
    const fix = place.fix;
    if (scope === 'near' && fix) {
      return list.filter(c => c.located)
        .map(c => ({ c, m: distanceM(fix.lat, fix.lng, c.lat, c.lng) }))
        .sort((a, b) => a.m - b.m);
    }
    return list.map(c => ({ c, m: -1 }));
  }, [ofFeast, scope, myRegion, search.query, place.fix]);
  if (!next) {
    return <Page><TopBar title="ტაძრობა" onBack={onBack} /><Note className="py-8 text-center">ახლო დღეებში ტაძრობა ვერ ვიპოვე.</Note></Page>;
  }
  const isToday = next.day === today;
  const days = Math.round((Date.parse(next.day) - Date.parse(today)) / 86_400_000);
  const regionName = FOLK_REGIONS.find(r => r.id === myRegion);
  const pickRegion = (id: string) => {
    setMyRegion(id);
    try { if (id) localStorage.setItem(MY_REGION, id); else localStorage.removeItem(MY_REGION); } catch { /* this visit only */ }
    setScope(id ? 'region' : 'all');
  };

  return (
    <Page>
      <TopBar title="ტაძრობა" onBack={onBack} right={<SearchRound open={search.open} onClick={search.toggle} />} />
      <Hero
        kicker={`${dayText(next.day)} · ${isToday ? 'დღეს' : days === 1 ? 'ხვალ' : `${days} დღეში`}`}
        title={next.feasts.map(f => f.feast.label).join(' · ')}
        sub={`${big(all.length)} ტაძარს ამ დღეს აქვს ტაძრობა`}
      />
      <PillRow label="რომელი ტაძრები" items={[
        { id: 'all', label: `ყველა ${big(ofFeast.length)}`, on: scope === 'all', onClick: () => setScope('all') },
        { id: 'region', label: scope === 'region' && regionName ? `${churchRegionName(regionName)} ▾` : 'ჩემი კუთხე', on: scope === 'region', onClick: () => setPicking(true) },
        { id: 'near', label: 'ახლოს', on: scope === 'near', onClick: () => setScope(scope === 'near' ? 'all' : 'near') },
      ]} />
      {next.feasts.length > 1 && (
        <PillRow label="დღესასწაულები" items={[
          { id: '', label: 'ყველა დღესასწაული', on: !feast, onClick: () => setFeast(null) },
          ...next.feasts.map(f => ({ id: f.feast.id, label: `${f.feast.label} · ${f.churches.length}`, on: feast === f.feast, onClick: () => setFeast(feast === f.feast ? null : f.feast) })),
        ]} />
      )}
      {search.open && <SearchPill value={search.q} onChange={search.setQ} autoFocus placeholder="ტაძრის ან სოფლის ძებნა" onEscape={search.toggle} />}
      {scope === 'near' && !place.fix ? (
        place.state === 'asking' ? <Waiting /> : <PlaceAsk state={place.state} locate={place.locate} />
      ) : (
        <ChurchList items={shown} empty="ასეთი ტაძარი ვერ მოიძებნა"
          render={({ c, m }) => <ChurchRow key={c.id} c={c} been={visits[c.id]} onOpen={onOpen} badge={m >= 0 ? distanceText(m) : undefined} />} />
      )}
      <Note>ტაძრობის დღე ტაძრის სახელიდან არის ამოცნობილი (მაგ. „წმინდა გიორგის“ → გიორგობა). სადაც სახელი მხოლოდ „ღვთისმშობლისაა“, დღე არ ჩანს.</Note>
      <PickSheet open={picking} title="ჩემი კუთხე" all="ყველა კუთხე" total={ofFeast.length} items={regions} value={scope === 'region' ? myRegion : ''}
        onPick={id => { triggerHaptic(8); pickRegion(id); }} onClose={() => setPicking(false)} />
    </Page>
  );
};

/** every region of the list with how many of its churches I have been to */
const regionStamps = (data: ChurchData, visits: Visits) =>
  FOLK_REGIONS.filter(r => data.list.some(c => c.region === r.id)).map(region => {
    const all = data.list.filter(c => c.region === region.id);
    return { region, all: all.length, mine: all.filter(c => c.id in visits).length };
  });

/** „მომლოცველის წიგნაკი“: how many I have been to, a stamp a region, then my churches, the newest first */
export const BookScreen: React.FC<{ data: ChurchData; visits: Visits; onOpen: (id: string) => void; onBack: () => void }> = ({ data, visits, onOpen, onBack }) => {
  const mine = useMemo(() => Object.entries(visits)
    .filter(([id]) => data.byId.has(id))
    .sort((a, b) => b[1].localeCompare(a[1]))
    .map(([id, day]) => ({ church: data.byId.get(id)!, day })), [data, visits]);
  const regions = useMemo(() => regionStamps(data, visits), [data, visits]);
  const stamped = regions.filter(r => r.mine).length;
  return (
    <Page>
      <TopBar title="მომლოცველის წიგნაკი" onBack={onBack} />
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="flex items-baseline gap-1.5">
            <span className="text-hero leading-none font-bold tabular-nums">{mine.length}</span>
            <span className="text-body text-mut">/ {big(data.list.length)} ტაძარი</span>
          </span>
          <span className="text-meta font-bold text-mut">{stamped} კუთხე {regions.length}-დან</span>
        </div>
        <Bar value={mine.length ? Math.max(0.015, mine.length / data.list.length) : 0.008} label="ნანახი ტაძრები" />
      </Card>
      <ul className="grid shrink-0 grid-cols-3 gap-2" aria-label="კუთხეების ბეჭდები">
        {regions.map(r => (
          <li key={r.region.id} className={cx(
            'flex min-h-[72px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-tile px-1.5 py-2 text-center',
            r.mine ? 'bg-leaf-tint text-leaf-ink' : 'bg-surf text-ink',
          )}>
            <span className="flex w-full items-center justify-center gap-1 text-meta leading-tight font-bold wrap-break-word">
              {r.mine > 0 && <Check aria-label="ნანახია" className="size-3.5 shrink-0" strokeWidth={2.6} />}
              {churchRegionName(r.region)}
            </span>
            <span className={cx('text-meta tabular-nums', r.mine ? 'font-bold' : 'text-mut')}>{r.mine} / {big(r.all)}</span>
          </li>
        ))}
      </ul>
      <Helper icon={<CircleCheck />}>ტაძრის გვერდზე დააჭირე „ვიყავი აქ“ — აქ შეგროვდება და კუთხე გაფერადდება.</Helper>
      {mine.length > 0 && (
        <>
          <SectionLabel label={`ჩემი ტაძრები · ${mine.length}`} />
          <ChurchList items={mine} empty="" render={m => <ChurchRow key={m.church.id} c={m.church} onOpen={onOpen} badge={shortDay(m.day)} been={m.day} />} />
        </>
      )}
    </Page>
  );
};

/** „მსახურებები“ (admins and teachers only): the churches the parishioners said serve every day, by the time of day */
const TIME_KEY = 'sg-services-time';
export const ServicesScreen: React.FC<{ data: ChurchData; visits: Visits; onOpen: (id: string) => void; onBack: () => void }> = ({ data, visits, onOpen, onBack }) => {
  const [when, setWhen] = useState<ServiceTime | 'all'>(() => {
    try { const v = sessionStorage.getItem(TIME_KEY); return v === 'morning' || v === 'night' ? v : 'all'; } catch { return 'all'; }
  });
  const pick = (w: ServiceTime | 'all') => { setWhen(w); try { sessionStorage.setItem(TIME_KEY, w); } catch { /* this visit only */ } };
  const all = CHURCH_SERVICES.map(s => ({ s, c: data.byId.get(s.id) })).filter((r): r is { s: ChurchService; c: Church } => !!r.c);
  const rows = all.filter(r => hasTime(r.s, when));
  return (
    <Page>
      <TopBar title="მსახურებები" sub="ხედავენ მხოლოდ ადმინები და მასწავლებლები" onBack={onBack} />
      <PillRow label="დრო" items={([['all', 'ყველა'], ['morning', 'დილით'], ['night', 'ღამით']] as const).map(([id, label]) => ({
        id, label: `${label} · ${all.filter(r => hasTime(r.s, id)).length}`, on: when === id, onClick: () => pick(id),
      }))} />
      <Rows>
        {rows.map(({ s, c }) => (
          <Press key={s.id} onClick={() => { triggerHaptic(10); onOpen(c.id); }}
            className={cx('flex w-full cursor-pointer flex-col gap-2 py-3 pr-3 pl-4 text-left transition-colors active:bg-soft', FOCUS_IN)}>
            <span className="flex items-center gap-2">
              <span className="min-w-0 flex-1 text-lead leading-snug font-bold wrap-break-word">
                {visits[c.id] && <Check aria-label="ვიყავი" className="mr-1 inline size-4 align-[-2px] text-leaf" strokeWidth={2.6} />}{s.name}
              </span>
              <Chev />
            </span>
            {s.slots.filter(x => when === 'all' || x.when === when).map(x => <SlotLine key={x.when + x.what} s={x} />)}
          </Press>
        ))}
      </Rows>
      <Note>{SERVICES_SOURCE}</Note>
    </Page>
  );
};

/** the TV reports on a region's monasteries (or abroad: Athos, Jerusalem…), the film in a window */
export const VideosScreen: React.FC<{ region: FolkRegion | null; films: FilmNav; onBack: () => void }> = ({ region, films, onBack }) => {
  const id = region?.id ?? 'abroad';
  const all = useMemo(() => monasteryFilms(id), [id]);
  return (
    <Page>
      <TopBar title={region ? `${churchRegionName(region)} · ვიდეოები` : 'უცხოეთის მონასტრები'} sub={`${all.length} ვიდეო მონასტრებზე`} onBack={onBack} />
      <PlacedVideos all={all} pills="მონასტრები" empty="ვიდეოები ჯერ არ არის" {...films} />
    </Page>
  );
};
