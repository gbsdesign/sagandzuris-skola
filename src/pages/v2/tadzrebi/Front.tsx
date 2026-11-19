import React, { useMemo, useState } from 'react';
import { Globe, Map as MapIcon, MapPin, Search, X } from 'lucide-react';
import { useRealAuth } from '../../../context';
import { Dot, Hero, Note, Row, Rows, RoundButton, SectionLabel, Small, TopBar } from '../../../components/ui2';
import { FOLK_REGIONS, type FolkRegion } from '../../../data/songsData';
import { matchChurch, type Church, type ChurchData } from '../../../data/churches';
import { nextFeastDayWithChurches, tbilisiToday } from '../../../data/churchFeasts';
import { CHURCH_SERVICES } from '../../../data/churchServices';
import { MONASTERY_FILMS } from '../../../data/monasteryVideos';
import type { Visits } from '../../../hooks/useChurchVisits';
import { readRecentChurches } from '../../../utils/churchShare';
import { triggerHaptic } from '../../../utils/haptics';
import { Chev, ChurchList, ChurchRow, MapCard, Page, PillRow, SearchPill, big, byName, churchRegionName, shortDay, useFolded } from './parts';

// „ეკლესია-მონასტრები“'s first screen in the new look (board x-tadzrebi; the canvas's note: „ოთხი თანაბარი ფილიდან ერთი გახდა
// მთავარი („ახლოს ჩემთან“), სამი — პატარა ჩიპი. რუკა და კუთხეები იგივეა“): the bar with 🔍 (every church by name or village),
// the wine card „ახლოს ჩემთან“, one row of pills — the next feast, the pilgrim's book, the teachers' „მსახურებები“ and the dots
// map —, the regions' map (a tap grows the region, the light runs round it, then it opens), the regions as rows, the monasteries
// abroad, the last churches opened on this device.

const FILMS_ABROAD = MONASTERY_FILMS.filter(f => f[3] === 'abroad').length;

export const Front: React.FC<{
  data: ChurchData; visits: Visits; onGo: (item: string) => void; onOpen: (id: string) => void; onBack: () => void;
}> = ({ data, visits, onGo, onOpen, onBack }) => {
  const search = useFolded();
  const found = useMemo(() => (search.query.length >= 2 ? byName(data.list.filter(c => matchChurch(c, search.query)), search.query) : null), [data, search.query]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const x of data.list) c[x.region] = (c[x.region] ?? 0) + 1;
    return c;
  }, [data]);
  const active = useMemo(() => data.list.filter(c => c.kind !== 'x').length, [data]);
  const today = tbilisiToday();
  const next = useMemo(() => nextFeastDayWithChurches(data.list, today), [data, today]);
  const mine = Object.keys(visits).filter(id => data.byId.has(id)).length;
  // „მსახურებები“ only for admins and teachers
  const { isTeacher } = useRealAuth();
  const services = isTeacher ? CHURCH_SERVICES.filter(s => data.byId.has(s.id)).length : 0;
  const regions = useMemo(() => [...FOLK_REGIONS].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0)), [counts]);
  const [recentIds] = useState(readRecentChurches);
  const recent = recentIds.map(id => data.byId.get(id)).filter((c): c is Church => !!c);

  return (
    <Page>
      <TopBar
        title="ტაძრები"
        onBack={onBack}
        right={(
          <RoundButton label={search.open ? 'ძებნის დახურვა' : 'ტაძრის ძებნა'} tone={search.open ? 'wine' : 'surf'} onClick={() => { triggerHaptic(10); search.toggle(); }}>
            {search.open ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
          </RoundButton>
        )}
      />
      {search.open && <SearchPill value={search.q} onChange={search.setQ} autoFocus placeholder="ტაძრის ან სოფლის ძებნა" onEscape={search.toggle} />}

      {found ? (
        <ChurchList items={found} empty="ასეთი ტაძარი ვერ მოიძებნა" render={c => <ChurchRow key={c.id} c={c} been={visits[c.id]} onOpen={onOpen} />} />
      ) : (
        <>
          <Hero kicker="ახლოს ჩემთან" title="იპოვე უახლოესი ტაძარი" action={{ label: 'მაჩვენე', icon: <MapPin aria-hidden="true" />, onClick: () => { triggerHaptic(10); onGo('near'); } }} />
          <PillRow label="ტაძრების სხვა გზები" items={[
            ...(next ? [{ id: 'feast', label: `ტაძრობა · ${next.day === today ? 'დღეს' : shortDay(next.day)}`, onClick: () => onGo('feast') }] : []),
            { id: 'book', label: mine ? `წიგნაკი · ${mine}` : 'წიგნაკი', onClick: () => onGo('book') },
            ...(services ? [{ id: 'services', label: `მსახურებები · ${services}`, onClick: () => onGo('services') }] : []),
            { id: 'map', label: 'რუკა', onClick: () => onGo('map') },
          ]} />
          <MapCard
            title="ეკლესია-მონასტრები"
            count={id => counts[id] ?? 0}
            label={n => `${n} ტაძარი`}
            regionName={churchRegionName}
            onSelect={(r: FolkRegion) => onGo(r.id)}
          />
          <Note>საქართველოს {big(data.list.length)} ტაძარი · {big(active)} მოქმედი</Note>

          <SectionLabel label="კუთხეები" />
          <Rows>
            {regions.map(r => {
              const n = counts[r.id] ?? 0;
              return (
                <Row key={r.id} lead={<Dot icon={<MapPin />} color={n ? 'tint' : 'soft'} />} title={churchRegionName(r)}
                  sub={n ? `${big(n)} ტაძარი` : 'ოკუპირებული ტერიტორია'} onClick={() => { triggerHaptic(10); onGo(r.id); }} />
              );
            })}
            {FILMS_ABROAD > 0 && (
              <Row lead={<Dot icon={<Globe />} />} title="უცხოეთის მონასტრები" sub="ვიდეოები: ათონი, იერუსალიმი, პეტრიწონი…" wrap
                right={<><Small>{FILMS_ABROAD}</Small><Chev /></>} onClick={() => { triggerHaptic(10); onGo('v:abroad'); }} />
            )}
          </Rows>

          {recent.length > 0 && (
            <>
              <SectionLabel label="ბოლოს ნანახი" />
              <Rows>{recent.map(c => <ChurchRow key={c.id} c={c} been={visits[c.id]} onOpen={onOpen} />)}</Rows>
            </>
          )}
        </>
      )}
    </Page>
  );
};

/** the round 🗺 of a list's bar: its churches on the dots map */
export const MapRound: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <RoundButton label="რუკაზე ნახვა" onClick={() => { triggerHaptic(10); onClick(); }}><MapIcon aria-hidden="true" /></RoundButton>
);
