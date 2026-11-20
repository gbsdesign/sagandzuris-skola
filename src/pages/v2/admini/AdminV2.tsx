import React, { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import { MousePointerClick } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { useWide } from '../../../components/ui/kit';
import { useAdminData } from '../../../components/admin/useAdminData';
import { filterTests, type Filter, useTwins } from '../../../components/admin/UsersTab';
import { useOpenRequest } from '../../../utils/searchOpen';
import { AdminContext, type AdminCtx } from './ctx';
import { personItem, stepOf } from './nav';
import { MsgLine, useMsg } from './parts';
import { AdminHome } from './Home';
import { PeopleScreen } from './People';
import { PersonRoute } from './Person';
import { Waiting } from '../../../components/shell/PageSkeleton';

const ClassesScreen = lazy(() => import('./Classes').then(m => ({ default: m.ClassesScreen })));
const TeachersScreen = lazy(() => import('./Teachers').then(m => ({ default: m.TeachersScreen })));
const PickScreen = lazy(() => import('./Pick').then(m => ({ default: m.PickScreen })));
const SchoolRoute = lazy(() => import('./School').then(m => ({ default: m.SchoolRoute })));

// a home button made for a former tab of the old panel („სკოლა“, „განყოფილებები“…) writes its name here before opening it
const TAB_KEY = 'sg-admin-tab';
const SCHOOL_TABS: Record<string, string> = { school: 'school', sections: 'school/sections', recordings: 'school/albums' };

/** The admin panel in the new look (boards x-admini … x-skola-zhurnali): one page whose steps are the navigation's mapItem
 *  (nav.ts). Every function of the old panel stays; the data and the quiet fixes are the old page's (useAdminData). */
export const AdminV2: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { mapItem, openMapItem, handleGoBack } = useNavigation();
  const d = useAdminData();
  const m = useMsg();
  const wide = useWide();
  const step = stepOf(mapItem);

  const { twins, twinIds } = useTwins(d.users, d.left.uids);
  const { statusOf, test } = filterTests(d.staff, d.access, isSuperAdmin, d.classes, d.left.uids, twinIds);

  // the list a computer keeps at the left while a person is open: the filter it was opened with
  const lastFilter = useRef<Filter>('all');
  if (step.at === 'people') lastFilter.current = step.filter;

  const go = (item: string | null, replace = false) => { m.clear(); openMapItem(item ?? '', replace); };
  const ctx = useMemo<AdminCtx>(() => ({
    d, test, statusOf, twins, twinIds, go, back: handleGoBack, say: m.say, fail: m.fail, wide,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [d, twins, twinIds, wide, m.say, m.fail, mapItem]);

  // the search (🔍, admins only) and a notice's link open a person straight away
  useOpenRequest('admin', uid => go(personItem(uid)));
  // an old home button of „სკოლა“ or one of its parts opens it once
  useEffect(() => {
    let stored = '';
    try { stored = localStorage.getItem(TAB_KEY) || ''; } catch { /* storage blocked */ }
    if (!SCHOOL_TABS[stored]) return;
    try { localStorage.setItem(TAB_KEY, 'users'); } catch { /* storage blocked */ }
    if (!mapItem) openMapItem(SCHOOL_TABS[stored]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const msg = <MsgLine msg={m.msg} onClose={m.clear} className="sticky top-2 z-10" />;
  const lazyPart = (el: React.ReactNode) => <Suspense fallback={<Waiting field={false} />}>{el}</Suspense>;

  let body: React.ReactNode;
  if (wide && (step.at === 'people' || step.at === 'person')) {
    // a computer: the list at the left, the person at the right (as the old panel did)
    body = (
      <div className="grid grid-cols-2 items-start gap-5">
        <PeopleScreen filter={step.at === 'people' ? step.filter : lastFilter.current} openUid={step.at === 'person' ? step.uid : null} />
        <div className="sticky top-4 min-w-0">
          {step.at === 'person' ? <PersonRoute key={step.uid} uid={step.uid} sub={step.sub} msg={msg} /> : (
            <div className="mt-16 flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-dim p-6 text-center text-mut">
              <MousePointerClick aria-hidden="true" className="size-7" />
              <p className="text-body">აირჩიე ადამიანი სიიდან — მისი გვერდი აქ გაიხსნება.</p>
            </div>
          )}
        </div>
      </div>
    );
  } else if (step.at === 'person') body = <PersonRoute key={step.uid} uid={step.uid} sub={step.sub} msg={msg} />;
  else if (step.at === 'people') body = <PeopleScreen filter={step.filter} openUid={null} />;
  else if (step.at === 'pick') body = lazyPart(<PickScreen />);
  else if (step.at === 'classes') body = lazyPart(<ClassesScreen archive={step.archive} />);
  else if (step.at === 'teachers') body = lazyPart(<TeachersScreen />);
  else if (step.at === 'school') body = lazyPart(<SchoolRoute part={step.part} />);
  else body = <AdminHome />;

  return (
    <AdminContext.Provider value={ctx}>
      <div className="mx-auto w-full max-w-[1100px]">
        {step.at !== 'person' && msg}
        {body}
      </div>
    </AdminContext.Provider>
  );
};
