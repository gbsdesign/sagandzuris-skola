import React, { useState } from 'react';
import { Users, Wifi } from 'lucide-react';
import { useOpenRequest } from '../../utils/searchOpen';
import { parseStationRequest } from '../../utils/dzebna';
import { Tabs } from '../../components/ui/kit';
import { DzebnaSolo } from './dzebna/Solo';
import { DzebnaTable } from './dzebna/Table';
import { HuntStation } from './dzebna/Station';
import { TAB_KEY } from './dzebna/store';

// „საგანძურის ძებნა“ (2026-11-04, the plan's №5, like Geocaching and a school's treasure hunt): the day's hunt across Georgia's
// map alone — „ონლაინ“ — and the hunt in the yard with printed QR cards, a phone a team and the teacher's phone the chest —
// „ჰიბრიდული“. A card's link (/?open=dzebna&h=<code>&s=<station>&n=<next place>, App.tsx) opens its station over the tabs; the
// hub's buttons open their tab (requestOpen('dzebna', 'online' | 'table')). Its printed kit is public/games/print/sagandzuris-dzebna.pdf.

type Tab = 'online' | 'table';
interface Open { code: string; s: number; next: string }

const DzebnaGame: React.FC = () => {
  const [tab, setTabState] = useState<Tab>(() => { try { return localStorage.getItem(TAB_KEY) === 'table' ? 'table' : 'online'; } catch { return 'online'; } });
  const setTab = (t: Tab) => { setTabState(t); try { localStorage.setItem(TAB_KEY, t); } catch { /* private mode */ } };
  const [station, setStation] = useState<Open | null>(null);
  useOpenRequest('dzebna', id => {
    const st = parseStationRequest(id);
    if (st) { setStation({ code: st.code, s: st.s, next: st.next }); setTab('table'); window.scrollTo({ top: 0 }); return; }
    setTab(id === 'table' ? 'table' : 'online');
  });
  return (
    <div className="w-full max-w-2xl space-y-4">
      {station ? (
        <HuntStation key={`${station.code}-${station.s}`} code={station.code} s={station.s} next={station.next} onClose={() => setStation(null)} />
      ) : (
        <>
          <Tabs cols={2} value={tab} onChange={setTab} items={[{ id: 'online', label: 'ონლაინ', Icon: Wifi }, { id: 'table', label: 'ჰიბრიდული', Icon: Users }]} />
          {tab === 'online' ? <DzebnaSolo /> : <DzebnaTable onStation={(code, s) => { setStation({ code, s, next: '' }); window.scrollTo({ top: 0 }); }} />}
        </>
      )}
    </div>
  );
};

export default DzebnaGame;
