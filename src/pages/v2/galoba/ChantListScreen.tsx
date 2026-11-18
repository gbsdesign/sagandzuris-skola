import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, CircleCheck, GraduationCap, Search, WifiOff } from 'lucide-react';
import { useNavigation, useAuth } from '../../../context';
import { useMyClasses } from '../../../hooks/useClasses';
import { ChantItem, isChantGroup } from '../../../data';
import { getChantMedia } from '../../../data/chantMediaRegistry';
import { chantRecordings, isRecordingVersion } from '../../../data/chantRecordings';
import { useRecordingBindings } from '../../../data/runtimeRecordings';
import { canOpenNotes } from '../../../data/chantLookup';
import { SERVICE_CHANTS, chantMatches } from '../../galoba/chantSearch';
import { SECTIONS } from '../../galoba/ServiceTabs';
import { Button, Card, Dot, Num, Rows, TopBar } from '../../../components/ui2';
import { cx } from '../../../components/ui2/cx';
import { OfflineButton } from '../../../components/offline/OfflineButton';
import { useOffline } from '../../../utils/offlineFiles';
import { isOffline, onOfflineChange } from '../../../utils/offlineNotes';
import { triggerHaptic } from '../../../utils/haptics';
import { prepareSearch } from '../../../utils/searchUtils';
import { Versions } from './Versions';

const useWide = () => {
  const mq = '(min-width: 1024px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(mq).matches);
  useEffect(() => {
    const m = window.matchMedia(mq);
    const f = () => setWide(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return wide;
};

const cleanTitle = (c: ChantItem) => (c.title || '').replace(/[;\s]+$/, '');

/** "გვ. 69 · 3 ვერსია" as the old accordion builds it */
const metaOf = (chant: ChantItem) => {
  const book = (chant.variants ?? []).filter(v => v.version !== undefined && !isRecordingVersion(v.id));
  const page = book.find(v => v.page)?.page;
  return [
    page && `გვ. ${page}`,
    book.length > 1 && `${book.length} ${isChantGroup(chant.id) ? 'საგალობელი' : 'ვერსია'}`,
  ].filter(Boolean).join(' · ');
};

const savedOf = (chant: ChantItem) => (chant.variants ?? []).filter(v => canOpenNotes(chant, v)).some(v => isOffline(v.id));

/** x-sagaloblebi / x-oplain-sia / x-versiebi / x-desk-sia — one service's chants. */
export const ChantListScreen: React.FC = () => {
  const { selectedService, expandedChantId, setExpandedChantId, chantSearch, setChantSearch, handleGoBack } = useNavigation();
  const { user, isTeacher } = useAuth();
  const myClasses = useMyClasses(user?.uid);
  const wide = useWide();
  const { online } = useOffline();
  const [, bump] = useState(0);
  useEffect(() => onOfflineChange(() => bump(x => x + 1)), []);

  // class mode: only the program's versions, one tap shows all
  const modeClass = isTeacher ? undefined : myClasses.find(c => c.classMode && c.program.some(p => p.id));
  const programIds = useMemo(() => new Set((modeClass?.program || []).map(p => p.id).filter(Boolean) as string[]), [modeClass]);
  const [showAll, setShowAll] = useState(() => { try { return sessionStorage.getItem('sg-class-mode-all') === '1'; } catch { return false; } });
  const classOnly = Boolean(modeClass) && !showAll;
  const toggleShowAll = () => {
    triggerHaptic(10);
    setShowAll(v => { try { sessionStorage.setItem('sg-class-mode-all', v ? '0' : '1'); } catch { /* storage blocked */ } return !v; });
  };

  const serviceChants = useMemo(() => {
    const all = selectedService ? SERVICE_CHANTS[selectedService] : [];
    return classOnly
      ? all.map(c => ({ ...c, variants: (c.variants || []).filter(v => programIds.has(v.id)) })).filter(c => c.variants.length > 0)
      : all;
  }, [selectedService, classOnly, programIds]);

  const query = useMemo(() => prepareSearch(chantSearch || ''), [chantSearch]);
  const filtered = useMemo(() => (query ? serviceChants.filter(c => chantMatches(c, query)) : serviceChants), [query, serviceChants]);

  const bindings = useRecordingBindings();
  const recorded = useMemo(() => {
    const keys = new Set<string>();
    for (const c of serviceChants) for (const v of c.variants || []) if (getChantMedia(c.id, v.code) || chantRecordings(v.id).length) keys.add(`${c.id}|${v.code}`);
    return keys;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceChants, bindings, user]);

  // keep an opened row in view on the phone
  useEffect(() => {
    if (wide || !expandedChantId) return;
    document.getElementById(`chant-row-${expandedChantId}`)?.scrollIntoView({ block: 'nearest' });
  }, [expandedChantId, wide]);

  const title = SECTIONS.find(s => s.service === selectedService)?.title ?? 'საგალობლები';
  const current = wide ? (filtered.find(c => c.id === expandedChantId) ?? filtered[0]) : undefined;
  const offlineMode = !online;

  const toggle = (id: string) => {
    triggerHaptic(10);
    if (wide) setExpandedChantId(id);
    else setExpandedChantId(prev => (prev === id ? null : id));
  };

  const list = (
    <Rows>
      {filtered.map(chant => {
        const idx = serviceChants.findIndex(c => c.id === chant.id) + 1;
        const open = wide ? current?.id === chant.id : expandedChantId === chant.id;
        const saved = offlineMode ? savedOf(chant) : true;
        const meta = metaOf(chant);
        return (
          <div key={chant.id} id={`chant-row-${chant.id}`}>
            <button
              type="button"
              onClick={() => toggle(chant.id)}
              aria-expanded={open}
              className={cx(
                'flex min-h-row w-full cursor-pointer items-center gap-2.5 py-2 pr-3 pl-4 text-left transition-colors active:bg-soft',
                wide && open && 'bg-tint',
                !saved && 'opacity-55',
              )}
            >
              <Num n={idx} on={open} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cx('text-lead font-bold wrap-break-word', open && !wide && 'text-wine')}>{cleanTitle(chant)}</span>
                <span className="text-meta text-mut">{!saved ? 'არ არის ჩამოწერილი' : meta}</span>
              </span>
              {offlineMode && saved ? (
                <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-leaf" strokeWidth={2} />
              ) : !wide && open ? (
                <ChevronDown aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={2} />
              ) : (
                <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={2} />
              )}
            </button>
            {!wide && open && (
              <div className="px-3 pb-3">
                <Versions chant={chant} recorded={recorded} />
              </div>
            )}
          </div>
        );
      })}
    </Rows>
  );

  return (
    <div className="mx-auto w-full pb-4 lg:grid lg:max-w-6xl lg:grid-cols-[420px_minmax(0,1fr)] lg:items-start lg:gap-7">
      <div className="flex min-w-0 flex-col gap-2.5">
        <TopBar title={title} sub={`${serviceChants.length} საგალობელი`} onBack={handleGoBack} right={<OfflineButton kind="galoba" />} />

        {modeClass && (
          <Card pad="sm" className={cx('flex flex-wrap items-center gap-x-3 gap-y-2', classOnly && 'bg-tint')}>
            <Dot icon={<GraduationCap />} color={classOnly ? 'wine' : 'tint'} />
            <span className="flex min-w-40 flex-1 flex-col">
              <span className="text-body font-bold">კლასის რეჟიმი · {modeClass.name}</span>
              <span className="text-meta text-mut">{classOnly ? 'ჩანს მხოლოდ სასწავლო პროგრამის ვერსიები' : 'ახლა ყველა ვერსია ჩანს'}</span>
            </span>
            <Button kind="soft" size="md" onClick={toggleShowAll}>{classOnly ? 'ყველაფრის ჩვენება' : 'მხოლოდ პროგრამა'}</Button>
          </Card>
        )}

        <label className="flex h-[52px] w-full items-center gap-2.5 rounded-full bg-surf px-[18px] text-mut">
          <Search aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
          <input
            type="search"
            value={chantSearch || ''}
            onChange={e => setChantSearch(e.target.value)}
            placeholder="ეძებე ამ მსახურებაში"
            aria-label="ეძებე ამ მსახურებაში"
            className="h-full min-w-0 flex-1 bg-transparent text-lead text-ink outline-none placeholder:text-faint"
          />
        </label>

        {offlineMode && (
          <div className="flex items-center gap-2.5 rounded-tile bg-tint px-4 py-3 text-body font-semibold text-ink">
            <WifiOff aria-hidden="true" className="size-[18px] shrink-0 text-wine" strokeWidth={2} />
            <span>ინტერნეტი არ არის. იხსნება მხოლოდ ჩამოწერილი.</span>
          </div>
        )}

        {filtered.length > 0 && list}
        {query && filtered.length === 0 && <p className="px-1.5 text-meta text-mut">ამ მსახურებაში ვერ მოიძებნა.</p>}
      </div>

      {wide && current && (
        <aside className="sticky top-4 flex min-w-0 flex-col gap-3 pt-3.5">
          <div className="px-1">
            <h2 className="text-title font-bold wrap-break-word">{cleanTitle(current)}</h2>
            <p className="text-meta text-mut">{metaOf(current)}</p>
          </div>
          <Versions chant={current} recorded={recorded} wide />
        </aside>
      )}
    </div>
  );
};

export default ChantListScreen;
