import React, { useDeferredValue, useMemo, useState } from 'react';
import { Check as CheckIcon, Search, X } from 'lucide-react';
import { PageSkeleton } from '../../../components/shell/PageSkeleton';
import { useAuth, useNavigation } from '../../../context';
import { Button, Check, Dot, Note, Press, Row, Rows, RoundButton, SectionLabel, TopBar, cx } from '../../../components/ui2';
import { FOCUS_IN } from '../../../components/ui2/cx';
import { useMyHabits } from '../../../hooks/useMyHabits';
import { useAccess } from '../../../hooks/useAccess';
import { useMyClasses } from '../../../hooks/useClasses';
import { buildCatalog, pruneLoaded, type CatalogNode } from '../../../data/catalog';
import { shortcutOfSearch } from '../../../data/searchIndex';
import { useSearchEngine } from '../../../components/search/useSearchEngine';
import { shortcutIcon } from '../../../components/home/ShortcutShelf';
import { MAX_SHORTCUTS, coreOf, roleAllows, saveShortcuts, sectionOfShortcut, shortcutLabel, useMyShortcuts } from '../../../utils/shortcuts';
import { triggerHaptic } from '../../../utils/haptics';
import { ErrorLine } from './parts';

// x-ghilakebi — „ჩემი ღილაკები“ (profile mapItem `ghilakebi`): the buttons under the home page's vine. The ones chosen (✕
// takes one off), a search, or the list of sources to go into — one action a row: a row with more under it opens it, a
// row that can be a button is ticked or unticked. „მზადაა“ goes back. The old window was the search panel's pick mode
// (components/home/ShortcutShelf `ShortcutPicker`); the order is still changed on the home page (a long press).

type Loaded = CatalogNode[] | 'loading' | 'error';

const PickRow: React.FC<{ title: string; sub?: string; icon: string; on: boolean; disabled: boolean; onPick: () => void }> = ({
  title, sub, icon, on, disabled, onPick,
}) => (
  <Press role="checkbox" aria-checked={on} disabled={disabled} onClick={onPick}
    className={cx('flex min-h-14 w-full cursor-pointer items-center gap-2.5 py-2 pr-3 pl-4 text-left text-ink transition-colors active:bg-soft disabled:cursor-default disabled:opacity-45', FOCUS_IN)}>
    <Dot icon={shortcutIcon(icon)} />
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="text-lead font-bold wrap-break-word">{title}</span>
      {sub && <span className="sg-fit truncate text-meta text-mut">{sub}</span>}
    </span>
    <Check on={on} size={26} />
  </Press>
);

export const ButtonsScreen: React.FC = () => {
  const { user, isOwner, isTeacher, isAdmin, isSuperAdmin } = useAuth();
  const { handleGoBack } = useNavigation();
  const access = useAccess();
  const classes = useMyClasses(user?.uid);
  const myHabits = useMyHabits(user?.uid).groups;
  const { list, loaded } = useMyShortcuts(user?.uid);
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const [trail, setTrail] = useState<CatalogNode[]>([]);
  const [kids, setKids] = useState<Record<string, Loaded>>({});
  const [error, setError] = useState('');
  const { results } = useSearchEngine(deferred, { picking: true });

  const allowed = (id: string) => {
    if (!roleAllows(id, { isTeacher, isAdmin, isSuperAdmin })) return false;
    const sec = sectionOfShortcut(id);
    return !sec || (access.section(sec) !== 'hidden' && access.section(sec) !== 'soon');
  };
  const catalog = useMemo(
    () => buildCatalog({
      signedIn: !!user, owner: isOwner, hasClass: classes.length > 0, allowed,
      habits: myHabits.flatMap(g => g.items.map(h => ({ id: h.id, label: h.label, own: h.id.startsWith('my_') }))),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, isOwner, isTeacher, isAdmin, isSuperAdmin, classes.length, access, myHabits],
  );

  if (!user) return null;
  // the list as kept (a class's own buttons until I choose mine); nothing hidden is dropped by a change here
  const classDefaults = classes.find(c => c.defaultShortcuts?.length)?.defaultShortcuts || [];
  const current = list ?? classDefaults;
  const full = current.length >= MAX_SHORTCUTS;
  const has = (id: string) => current.some(x => coreOf(x) === coreOf(id));
  const save = (next: string[]) => {
    setError('');
    saveShortcuts(user.uid, next).catch(() => setError('ვერ შეინახა — შეამოწმე ინტერნეტი.'));
  };
  const toggle = (id: string) => {
    triggerHaptic(10);
    if (has(id)) save(current.filter(x => coreOf(x) !== coreOf(id)));
    else if (!full) save([...current, id]);
  };
  const shown = current.filter(id => !!shortcutLabel(id));

  // the catalog's level now open
  const at = trail[trail.length - 1];
  const level: Loaded = !at ? catalog : at.load ? (kids[at.key] ?? 'loading') : (at.children ?? []);
  const enter = (n: CatalogNode) => {
    triggerHaptic(8);
    setTrail(t => [...t, n]);
    if (n.load && !Array.isArray(kids[n.key])) {
      setKids(k => ({ ...k, [n.key]: 'loading' }));
      n.load()
        .then(l => setKids(k => ({ ...k, [n.key]: pruneLoaded(l, { allowed }) })))
        .catch(() => setKids(k => ({ ...k, [n.key]: 'error' })));
    }
  };
  const back = () => (trail.length ? setTrail(t => t.slice(0, -1)) : handleGoBack());
  const searching = deferred.trim().length > 0;
  const hits = searching ? results.flatMap(g => g.hits).slice(0, 40).map(h => h.item) : [];

  const nodeRow = (n: CatalogNode) => {
    const more = !!(n.load || n.children?.length);
    if (more) {
      return <Row key={n.key} lead={<Dot icon={shortcutIcon(n.icon || n.id || '')} />} title={n.title} sub={n.sub} wrap onClick={() => enter(n)} />;
    }
    if (!n.id) return null;
    const on = has(n.id);
    return <PickRow key={n.key} title={n.title} sub={n.sub} icon={n.icon || n.id} on={on} disabled={!on && full} onPick={() => toggle(n.id!)} />;
  };

  return (
    <div className="flex w-full flex-col gap-3 pb-5">
      <TopBar title={at ? at.title : 'ჩემი ღილაკები'} sub={at ? 'ჩემი ღილაკები' : undefined} onBack={back} />
      <Note className="-mt-1">მთავარ გვერდზე, ვაზის ქვეშ ჩანს · {current.length} / {MAX_SHORTCUTS}</Note>

      <label className="relative block shrink-0">
        <span className="sr-only">მოძებნე</span>
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-mut" />
        <input type="search" enterKeyHint="search" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="საგალობელი, ლოცვა, გვერდი"
          className="h-[52px] w-full min-w-0 rounded-full bg-surf pr-11 pl-11 text-lead text-ink outline-none placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60 [&::-webkit-search-cancel-button]:hidden" />
        {query && (
          <RoundButton label="გასუფთავება" size={36} tone="plain" onClick={() => setQuery('')} className="absolute top-1/2 right-1.5 -translate-y-1/2"><X /></RoundButton>
        )}
      </label>
      {full && <Note>უკვე {MAX_SHORTCUTS} ღილაკია — ახლის დასამატებლად ჯერ რომელიმე მოხსენი.</Note>}
      {error && <ErrorLine>{error}</ErrorLine>}

      {searching ? (
        hits.length ? (
          <Rows>
            {hits.map(it => {
              const id = shortcutOfSearch(it);
              const on = has(id);
              return <PickRow key={it.key} title={it.title} sub={it.sub} icon={it.icon || id} on={on} disabled={!on && full} onPick={() => toggle(id)} />;
            })}
          </Rows>
        ) : (
          <Note className="py-6 text-center">ვერაფერი მოიძებნა — სცადე სიტყვის ნაწილი.</Note>
        )
      ) : (
        <>
          {!at && loaded && shown.length > 0 && (
            <>
              <SectionLabel label={`შენი ღილაკები · ${shown.length}`} />
              <Rows>
                {shown.map(id => (
                  <Row key={id} lead={<Dot icon={shortcutIcon(id)} />} title={shortcutLabel(id)!.label}
                    right={<RoundButton label={`${shortcutLabel(id)!.label} — მოხსნა`} size={36} tone="plain" onClick={() => toggle(id)}><X /></RoundButton>} />
                ))}
              </Rows>
              <Note>რიგს მთავარ გვერდზე შეცვლი — დიდხანს დააჭირე ღილაკს.</Note>
            </>
          )}
          <SectionLabel label={at ? 'აირჩიე' : 'ან აირჩიე სიიდან'} className={!at && shown.length ? 'mt-1' : undefined} />
          {level === 'loading' ? (
            <PageSkeleton field={false} rows={4} />
          ) : level === 'error' ? (
            <Note className="py-4 text-center">ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი და თავიდან გახსენი.</Note>
          ) : (
            <Rows>
              {/* a group that is a button itself: the whole of it first */}
              {at?.id && (
                <PickRow title={`მთლიანად: ${at.title}`} icon={at.icon || at.id} on={has(at.id)} disabled={!has(at.id) && full} onPick={() => toggle(at.id!)} />
              )}
              {level.map(nodeRow)}
            </Rows>
          )}
        </>
      )}

      <Button full icon={<CheckIcon />} className="mt-2" onClick={handleGoBack}>მზადაა</Button>
    </div>
  );
};
