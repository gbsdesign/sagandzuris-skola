import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { Church as ChurchIcon, Search, X } from 'lucide-react';
import { Dot, RoundButton, TopBar } from '../../../components/ui2';
import { hideNav } from '../../../design/newLook';
import { matchChurch, nearest, type ChurchData } from '../../../data/churches';
import type { Visits } from '../../../hooks/useChurchVisits';
import { useMyPlace } from '../../../hooks/useMyPlace';
import { triggerHaptic } from '../../../utils/haptics';
import { KindPills, SearchPill, big, churchRegion, churchRegionName, passes, useFolded, type Filter } from './parts';

// „რუკა“ in the new look (board x-ruka; the canvas's note: „რუკა მთელ ეკრანზეა. ფილტრები ზემოთ ერთ ხაზზე, „ჩემი ადგილი“ —
// მრგვალი ღილაკი“): the dots map over the whole screen (no bottom menu), the bar with 🔍 (the dots by name), the kinds as pills,
// a card at the bottom saying how many dots there are and the colours' key. `scope` = '' the whole country, a region's id (its
// churches, the view fitted to them) or 'near' (the forty nearest).

const PinsMap = lazy(() => import('../../churches/PinsMap'));

export const MapScreen: React.FC<{ data: ChurchData; visits: Visits; scope: string; onOpen: (id: string) => void; onBack: () => void }> = ({
  data, visits, scope, onOpen, onBack,
}) => {
  useEffect(() => hideNav(), []);
  const region = scope && scope !== 'near' ? churchRegion(scope) : null;
  const { fix } = useMyPlace();
  const [kind, setKind] = useState<Filter>('all');
  const search = useFolded();
  const located = useMemo(() => {
    const own = data.list.filter(c => c.located && (!region || c.region === region.id));
    return scope === 'near' && fix ? nearest(own, fix.lat, fix.lng, 40).map(n => n.church) : own;
    // the nearest are counted once, when the map opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, region, scope]);
  const shown = useMemo(() => located.filter(c => passes(c, kind, visits) && (search.query.length < 2 || matchChurch(c, search.query))), [located, kind, visits, search.query]);
  const visited = useCallback((id: string) => id in visits, [visits]);
  const title = region ? churchRegionName(region) : scope === 'near' ? 'ახლოს ჩემთან' : 'რუკა';

  return (
    <div className="fixed inset-0 z-[45] flex flex-col bg-page text-ink">
      <div className="safe-top safe-x shrink-0"><div className="flex flex-col gap-2 px-4 pb-2">
        <TopBar
          title={title}
          sub={region || scope === 'near' ? 'რუკაზე' : undefined}
          onBack={onBack}
          right={(
            <RoundButton label={search.open ? 'ძებნის დახურვა' : 'ტაძრის ძებნა რუკაზე'} tone={search.open ? 'wine' : 'surf'} onClick={() => { triggerHaptic(10); search.toggle(); }}>
              {search.open ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
            </RoundButton>
          )}
        />
        {search.open && <SearchPill value={search.q} onChange={search.setQ} autoFocus placeholder="ტაძრის ან სოფლის სახელი" onEscape={search.toggle} />}
        <KindPills value={kind} onChange={setKind} list={located} visits={visits} />
      </div></div>
      <div className="relative min-h-0 flex-1">
        <Suspense fallback={<div className="absolute inset-0 animate-pulse bg-soft" />}>
          <PinsMap list={shown} visited={visited} onOpen={onOpen} fill fit={!!region || scope === 'near'} below={(
            // how many dots, the colours' key
            <div className="safe-x"><div className="px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
              <div className="pointer-events-auto flex items-center gap-3 rounded-card bg-surf px-4 py-3 shadow-float">
                <Dot icon={<ChurchIcon />} size={40} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span role="status" className="text-lead leading-tight font-bold">{big(shown.length)} ტაძარი რუკაზე</span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-meta text-mut">
                    <Key className="size-2.5 bg-wine" label="ეკლესია" />
                    <Key className="size-3 bg-gold" label="მონასტერი" />
                    <Key className="size-2.5 bg-faint" label="არ მოქმედებს" />
                    <Key className="size-2.5 bg-surf ring-2 ring-leaf" label="ვიყავი" />
                  </span>
                  <span className="text-meta text-mut">დააჭირე წერტილს — გაიხსნება ტაძარი</span>
                </div>
              </div>
            </div></div>
          )} />
        </Suspense>
      </div>
    </div>
  );
};

const Key: React.FC<{ className: string; label: string }> = ({ className, label }) => (
  <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={`shrink-0 rounded-full ${className}`} />{label}</span>
);
