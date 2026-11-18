import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context';
import { useAccess } from '../../hooks/useAccess';
import { useMyClasses } from '../../hooks/useClasses';
import { usePlacements } from '../../data/placements';
import { SearchItem, buildSearchIndex, churchItem, personItem, runSearch } from '../../data/searchIndex';
import { loadChurches, whereOf } from '../../data/churches';
import { shownName, useDirectory } from '../../utils/directory';

// The one search's engine, shared by the old window (SearchPanel) and the new look's page (pages/shell/SearchPage): the
// index, what the person may see of it, the results, and the rows opened lately.

const RECENT_KEY = 'sgSearchRecent';
const MAX_RECENT = 6;

/** the keys of the rows opened lately, newest first */
export const readRecent = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
};
export const saveRecent = (key: string) => {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([key, ...readRecent().filter(k => k !== key)].slice(0, MAX_RECENT))); } catch { /* storage off */ }
};
export const clearRecent = () => {
  try { localStorage.removeItem(RECENT_KEY); } catch { /* storage off */ }
};

// the churches' rows for the index: made once the list is loaded, kept for the session
let churchRows: SearchItem[] | null = null;
export const useChurchItems = (wanted: boolean) => {
  const [rows, setRows] = useState<SearchItem[]>(churchRows ?? []);
  useEffect(() => {
    if (!wanted || churchRows) return;
    let alive = true;
    loadChurches().then(d => {
      churchRows = d.list.map(c => churchItem(c.id, c.name, whereOf(c)));
      if (alive) setRows(churchRows);
    }, () => {});
    return () => { alive = false; };
  }, [wanted]);
  return rows;
};

/** The index for this person and the results of `query` in it. `picking` (a button is being chosen): no people, no
 *  churches. `churches`: load the churches even before two letters are typed (a church opened lately). */
export const useSearchEngine = (query: string, { picking = false, churches: wantChurches = false }: { picking?: boolean; churches?: boolean } = {}) => {
  const { user, isOwner, isTeacher, isAdmin } = useAuth();
  const access = useAccess();
  const classes = useMyClasses(user?.uid);
  const placed = usePlacements(); // a moved recording changes the song list
  // admins find people too (name and photo from the directory); a row opens the person's window in the admin panel.
  // Never while picking a button
  const directory = useDirectory(isAdmin && !picking);
  // the churches (3 400, a lazy chunk) join the index once something is typed — never while picking a button
  const churches = useChurchItems(!picking && (wantChurches || query.trim().length >= 2));
  const index = useMemo(
    () => [
      ...buildSearchIndex({ signedIn: !!user, owner: isOwner, teacher: isTeacher, hasClass: classes.length > 0 || isTeacher }),
      ...churches,
      ...directory.people.map(p => personItem(p.uid, shownName(p), [p.name, p.churchName].filter(Boolean).join(' '))),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, isOwner, isTeacher, classes.length, placed, directory.people, churches]
  );
  // hidden sections (the admin's switches, the kids' mode) and unbuilt ones are not offered at all
  const shown = (it: SearchItem) => !it.section || (access.section(it.section) !== 'hidden' && access.section(it.section) !== 'soon');
  const isLocked = (it: SearchItem) => Boolean(it.section && access.section(it.section) === 'locked');

  const results = useMemo(
    () => runSearch(index, query).map(g => ({ ...g, hits: g.hits.filter(h => shown(h.item)) })).filter(g => g.hits.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, query, access]
  );
  return { index, results, shown, isLocked, access, classes };
};
