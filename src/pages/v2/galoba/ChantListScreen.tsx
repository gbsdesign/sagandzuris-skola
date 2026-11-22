import React, { useEffect, useMemo, useState } from 'react';
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, ChevronDown, ChevronRight, CircleCheck, GraduationCap, Search, Trash2, WifiOff } from 'lucide-react';
import { useNavigation, useAuth } from '../../../context';
import { useMyClasses } from '../../../hooks/useClasses';
import { ChantItem, isChantGroup } from '../../../data';
import { getChantMedia } from '../../../data/chantMediaRegistry';
import { chantRecordings, isRecordingVersion } from '../../../data/chantRecordings';
import { useRecordingBindings } from '../../../data/runtimeRecordings';
import { canOpenNotes } from '../../../data/chantLookup';
import { SERVICE_CHANTS, chantMatches } from '../../galoba/chantSearch';
import { SECTIONS } from '../../galoba/ServiceTabs';
import { Button, Card, Dot, Num, Rows, Sheet, TopBar } from '../../../components/ui2';
import { askConfirm } from '../../../components/ui/kit';
import { useLongPress } from '../../../hooks/useLongPress';
import { arrange, moveChant, setArchived, setDeleted, useChantListEdits } from '../../../utils/chantListEdits';
import { cx } from '../../../components/ui2/cx';
import { OfflineButton } from '../../../components/offline/OfflineButton';
import { useOffline } from '../../../utils/offlineFiles';
import { isOffline, onOfflineChange } from '../../../utils/offlineNotes';
import { triggerHaptic } from '../../../utils/haptics';
import { prepareSearch } from '../../../utils/searchUtils';
import { Versions } from './Versions';
import { HelpButton } from '../mkitkhe/HelpButton';

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

/** A chant's row; an admin's long press opens the arrangement window. */
const RowButton: React.FC<{ onClick: () => void; onLong?: () => void; className: string; open: boolean; children: React.ReactNode }> = ({ onClick, onLong, className, open, children }) => {
  const press = useLongPress(() => onLong?.());
  return (
    <button type="button" onClick={onClick} aria-expanded={open} className={cx(className, onLong && 'select-none [-webkit-touch-callout:none]')} {...(onLong ? press : {})}>
      {children}
    </button>
  );
};

const savedOf = (chant: ChantItem) => (chant.variants ?? []).filter(v => canOpenNotes(chant, v)).some(v => isOffline(v.id));

/** x-sagaloblebi / x-oplain-sia / x-versiebi / x-desk-sia — one service's chants. */
export const ChantListScreen: React.FC = () => {
  const { selectedService, expandedChantId, setExpandedChantId, chantSearch, setChantSearch, handleGoBack } = useNavigation();
  const { user, isTeacher, isAdmin } = useAuth();
  const edits = useChantListEdits();
  const [editing, setEditing] = useState<ChantItem | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editErr, setEditErr] = useState('');
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

  const edit = selectedService ? edits[selectedService] : undefined;
  // the admin's arrangement (settings/chantListEdits): order, the archive's fold at the end, deleted ones gone
  const arranged = useMemo(() => arrange(selectedService ? SERVICE_CHANTS[selectedService] : [], edit), [selectedService, edit]);
  const classFilter = (list: ChantItem[]) => (classOnly
    ? list.map(c => ({ ...c, variants: (c.variants || []).filter(v => programIds.has(v.id)) })).filter(c => c.variants.length > 0)
    : list);
  const serviceChants = useMemo(() => classFilter(arranged.main), // eslint-disable-next-line react-hooks/exhaustive-deps
    [arranged, classOnly, programIds]);
  const archivedChants = useMemo(() => classFilter(arranged.archived), // eslint-disable-next-line react-hooks/exhaustive-deps
    [arranged, classOnly, programIds]);

  const query = useMemo(() => prepareSearch(chantSearch || ''), [chantSearch]);
  const filtered = useMemo(() => (query ? serviceChants.filter(c => chantMatches(c, query)) : serviceChants), [query, serviceChants]);
  const filteredArchive = useMemo(() => (query ? archivedChants.filter(c => chantMatches(c, query)) : archivedChants), [query, archivedChants]);

  const bindings = useRecordingBindings();
  const recorded = useMemo(() => {
    const keys = new Set<string>();
    for (const c of [...serviceChants, ...archivedChants]) for (const v of c.variants || []) if (getChantMedia(c.id, v.code) || chantRecordings(v.id).length) keys.add(`${c.id}|${v.code}`);
    return keys;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceChants, archivedChants, bindings, user]);

  // keep an opened row in view on the phone
  useEffect(() => {
    if (wide || !expandedChantId) return;
    document.getElementById(`chant-row-${expandedChantId}`)?.scrollIntoView({ block: 'nearest' });
  }, [expandedChantId, wide]);

  const title = SECTIONS.find(s => s.service === selectedService)?.title ?? 'საგალობლები';
  const current = wide ? ([...filtered, ...filteredArchive].find(c => c.id === expandedChantId) ?? filtered[0]) : undefined;
  const offlineMode = !online;

  const toggle = (id: string) => {
    triggerHaptic(10);
    if (wide) setExpandedChantId(id);
    else setExpandedChantId(prev => (prev === id ? null : id));
  };

  const row = (chant: ChantItem, idx: number) => {
    const open = wide ? current?.id === chant.id : expandedChantId === chant.id;
    const saved = offlineMode ? savedOf(chant) : true;
    const meta = metaOf(chant);
    return (
      <div key={chant.id} id={`chant-row-${chant.id}`}>
        <RowButton
          onClick={() => toggle(chant.id)}
          onLong={isAdmin && selectedService ? () => { setEditErr(''); setEditing(chant); } : undefined}
          open={open}
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
        </RowButton>
        {!wide && open && (
          <div className="px-3 pb-3">
            <Versions chant={chant} recorded={recorded} />
          </div>
        )}
      </div>
    );
  };

  const list = (
    // „მკითხე“'s „სად ვნახო ნოტები?“ / „როგორ ვისწავლო?“ light the list: a chant is picked here first
    <Rows data-help="1 3">
      {filtered.map(chant => row(chant, serviceChants.findIndex(c => c.id === chant.id) + 1))}
    </Rows>
  );

  // the arrangement window (admins): ▲ ▼ among the visible list, archive, delete
  const mainIds = arranged.main.map(c => c.id);
  const editIdx = editing ? mainIds.indexOf(editing.id) : -1;
  const inArchive = !!editing && editIdx < 0;
  const run = async (f: () => Promise<unknown>, close = false) => {
    setEditErr('');
    try { await f(); triggerHaptic(10); if (close) setEditing(null); } catch { setEditErr('ვერ შეინახა — სცადე თავიდან.'); }
  };
  const remove = async (c: ChantItem) => {
    const ok = await askConfirm({ title: `„${cleanTitle(c)}“ — წაშლა?`, text: 'სიიდან ყველასთვის გაქრება. დაბრუნება შეიძლება ადმინის პანელიდან.', ok: 'წაშლა', danger: true });
    if (ok && selectedService) await run(() => setDeleted(selectedService, c.id, true), true);
  };
  const editSheet = editing && selectedService && (
    <Sheet open title={cleanTitle(editing)} onClose={() => setEditing(null)}>
      <div className="flex flex-col gap-2.5">
        {!inArchive && (
          <div className="flex items-center gap-2.5">
            <span className="flex-1 text-body text-mut">ადგილი სიაში: <b className="text-ink">{editIdx + 1}</b> / {mainIds.length}</span>
            <Button kind="soft" size="md" icon={<ArrowUp />} aria-label="მაღლა" disabled={editIdx <= 0}
              onClick={() => void run(() => moveChant(selectedService, mainIds, editing.id, -1))}>მაღლა</Button>
            <Button kind="soft" size="md" icon={<ArrowDown />} aria-label="დაბლა" disabled={editIdx >= mainIds.length - 1}
              onClick={() => void run(() => moveChant(selectedService, mainIds, editing.id, 1))}>დაბლა</Button>
          </div>
        )}
        <Button kind="ghost" size="md" full icon={inArchive ? <ArchiveRestore /> : <Archive />}
          onClick={() => void run(() => setArchived(selectedService, editing.id, !inArchive), true)}>
          {inArchive ? 'არქივიდან დაბრუნება' : 'არქივში გადატანა'}
        </Button>
        <Button kind="ghost" size="md" full icon={<Trash2 />} className="text-danger" onClick={() => void remove(editing)}>წაშლა</Button>
        <p className="text-meta text-mut">ცვლილება ყველასთვის ჩანს.</p>
        {editErr && <p className="text-meta font-semibold text-danger">{editErr}</p>}
      </div>
    </Sheet>
  );

  const archive = filteredArchive.length > 0 && (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={() => setArchiveOpen(v => !v)} aria-expanded={archiveOpen}
        className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-full bg-surf px-4 text-left text-body font-bold text-mut active:bg-soft">
        <Archive aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={2} />
        <span className="flex-1">არქივი · {filteredArchive.length}</span>
        <ChevronDown aria-hidden="true" className={cx('size-[18px] shrink-0 transition-transform', archiveOpen && 'rotate-180')} strokeWidth={2} />
      </button>
      {archiveOpen && <Rows>{filteredArchive.map((chant, i) => row(chant, serviceChants.length + i + 1))}</Rows>}
    </div>
  );

  return (
    <div className="mx-auto w-full pb-4 lg:grid lg:max-w-6xl lg:grid-cols-[420px_minmax(0,1fr)] lg:items-start lg:gap-7">
      <div className="flex min-w-0 flex-col gap-2.5">
        <TopBar title={title} sub={`${serviceChants.length} საგალობელი`} onBack={handleGoBack} right={(
          <>
            <span data-help="5" className="flex rounded-full"><OfflineButton kind="galoba" /></span>
            <HelpButton page="list" />
          </>
        )} />

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
        {archive}
        {editSheet}
        {query && filtered.length === 0 && filteredArchive.length === 0 && <p className="px-1.5 text-meta text-mut">ამ მსახურებაში ვერ მოიძებნა.</p>}
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
