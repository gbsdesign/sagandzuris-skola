import React, { useEffect, useState } from 'react';
import { useNavigation, useRealAuth } from '../../../context';
import { TopBar } from '../../../components/ui2';
import { loadChurches, type ChurchData } from '../../../data/churches';
import { useChurchVisits } from '../../../hooks/useChurchVisits';
import { useOpenRequest } from '../../../utils/searchOpen';
import { rememberChurch } from '../../../utils/churchShare';
import { triggerHaptic } from '../../../utils/haptics';
import type { FilmNav } from '../khalkhuri/videos';
import { Loading, Page, churchRegion } from './parts';
import { ChurchSheet } from './ChurchSheet';
import { Front } from './Front';
import { BookScreen, FeastScreen, Nearby, RegionScreen, ServicesScreen, VideosScreen } from './Lists';
import { MapScreen } from './MapScreen';

// „ეკლესია-მონასტრები“ in the new look (boards x-tadzrebi, x-tadzrebi-kutkhe, x-tadzari, x-tadzrebi-akhlos, x-tadzroba, x-tsignaki,
// x-ruka). The steps are the old page's (pages/ChurchesPage.tsx): `mapItem` = a region's id, „near“, „feast“, „book“, „services“
// (admins and teachers), „v:<region>“ / „v:abroad“ (the TV reports on monasteries; an old „va“ too), „all“ (the first screen),
// and the new „map[:<region>|near]“ (the dots over the whole screen); an open church adds „/<its id>“ (a film „/<YouTube id>“),
// so „უკან“ first closes the window, then the list. The one search's „ტაძრები“ open here.

export const TadzrebiV2: React.FC = () => {
  const { mapItem, openMapItem, handleGoBack } = useNavigation();
  const [data, setData] = useState<ChurchData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    loadChurches().then(d => alive && setData(d), () => alive && setFailed(true));
    return () => { alive = false; };
  }, []);

  const { visits } = useChurchVisits();
  const { isTeacher } = useRealAuth();
  const [list, open] = (mapItem ?? '').split('/');
  const openChurch = (id: string) => { triggerHaptic(10); openMapItem(`${list || 'all'}/${id}`, false, true); };
  const go = (item: string) => { triggerHaptic(10); openMapItem(item); };
  useOpenRequest('churches', id => openMapItem(`all/${id}`));
  // the last churches opened on this device („ბოლოს ნანახი“)
  useEffect(() => { if (open && data?.byId.has(open)) rememberChurch(open); }, [open, data]);

  if (!data) {
    return <Page><TopBar title="ტაძრები" onBack={handleGoBack} /><Loading failed={failed} what="ტაძრების სია" /></Page>;
  }

  const church = open ? data.byId.get(open) ?? null : null;
  const sheet = <ChurchSheet church={church} onClose={handleGoBack} />;

  // the TV reports: a film opens over its list without moving it; ‹ › turn it in place
  if (list.startsWith('v:') || list === 'va') {
    const films: FilmNav = {
      open,
      onPlay: id => { triggerHaptic(10); openMapItem(`${list}/${id}`, false, true); },
      onMove: id => openMapItem(`${list}/${id}`, true, true),
      onClose: handleGoBack,
    };
    const region = list === 'va' || list === 'v:abroad' ? null : churchRegion(list.slice(2));
    return <VideosScreen key={list} region={region} films={films} onBack={handleGoBack} />;
  }

  let body: React.ReactNode;
  if (list === 'map' || list.startsWith('map:')) {
    body = <MapScreen data={data} visits={visits} scope={list.slice(4)} onOpen={openChurch} onBack={handleGoBack} />;
  } else if (list === 'near') {
    body = <Nearby data={data} visits={visits} onOpen={openChurch} onGo={go} onBack={handleGoBack} />;
  } else if (list === 'feast') {
    body = <FeastScreen data={data} visits={visits} onOpen={openChurch} onBack={handleGoBack} />;
  } else if (list === 'book') {
    body = <BookScreen data={data} visits={visits} onOpen={openChurch} onBack={handleGoBack} />;
  } else if (list === 'services' && isTeacher) {
    body = <ServicesScreen data={data} visits={visits} onOpen={openChurch} onBack={handleGoBack} />;
  } else {
    const region = list ? churchRegion(list) : null;
    body = region ? (
      <RegionScreen
        key={region.id}
        region={region}
        all={data.list.filter(c => c.region === region.id)}
        visits={visits}
        onOpen={openChurch}
        onGo={go}
        // another region on the small map takes this one's place in the history
        onRegion={id => openMapItem(id, true)}
        onBack={handleGoBack}
      />
    ) : <Front data={data} visits={visits} onGo={go} onOpen={openChurch} onBack={handleGoBack} />;
  }
  return <>{body}{sheet}</>;
};

export default TadzrebiV2;
