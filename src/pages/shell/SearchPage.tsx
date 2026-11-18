import React, { Suspense, lazy, useDeferredValue, useMemo, useState } from 'react';
import { useNavigation } from '../../context';
import { SERVICE_LISTS, type ServiceName } from '../../data/chantLookup';
import { MORNING_EVENING } from '../../data/prayers';
import type { SearchGroupId, SearchItem } from '../../data/searchIndex';
import { searchNormalize } from '../../utils/searchMatch';
import { serviceName } from '../../utils/shortcuts';
import { pendingSearchQuery, setPendingQuery } from '../../utils/searchOpen';
import { readRecent, saveRecent, clearRecent, useSearchEngine } from '../../components/search/useSearchEngine';
import { useOpenSearchTarget } from '../../components/search/openSearchTarget';
import { askSignIn } from '../../components/access/SignInPrompt';
import { useVoiceSearch, voiceSupported } from './voiceSearch';
import { VoiceSheet } from './search/VoiceSheet';
import { CHIP_ORDER, SearchView, type SearchFilter, type SearchRow } from './search/SearchView';
import { countOpen, readOften } from './search/often';

const SingSearch = lazy(() => import('../v2/search/SingSearch').then(m => ({ default: m.SingSearch })));

export { SearchView, type SearchViewProps, type SearchRow, type SearchFilter } from './search/SearchView';

// The new look's one search, a page of its own (the bottom menu's 🔍, „/“ and Ctrl+K, every openSearch). The same index and
// results as the old window (components/search/useSearchEngine); a picked row opens over this page, so „უკან“ comes back here
// with the same words (kept by setPendingQuery) and the same kind chosen.

// the kind chosen, kept while the words are (the page mounts anew when „უკან“ comes back)
let lastFilter: SearchFilter = 'all';

// a service's chant list as a tile — not a row of the index
const serviceItem = (service: ServiceName): SearchItem => {
  const id = `service:${service}`;
  const n = SERVICE_LISTS.find(([s]) => s === service)?.[1].filter(c => c.variants?.length).length ?? 0;
  const title = serviceName(service);
  return { key: id, group: 'fn', title, sub: `${n} გალობა`, icon: id, section: 'galoba', open: { kind: 'shortcut', id }, nTitle: searchNormalize(title), nKeys: '' };
};
const EXTRA_ITEMS: SearchItem[] = [serviceItem('წირვა')];

/** „ხშირად გახსნილი“ before anything was opened often: the Liturgy's chants, the morning prayers, my class, the habits */
const FIRST_TILES = ['service:წირვა', `prayer:${MORNING_EVENING[0].id}`, 'special:class', 'section:chvevebi'];
const TILES = 4;

export const SearchPage: React.FC = () => {
  const { handleGoBack } = useNavigation();
  const [query, setQuery] = useState(pendingSearchQuery);
  const searched = useDeferredValue(query);
  const [filter, setFilter] = useState<SearchFilter>(() => (pendingSearchQuery().trim() ? lastFilter : 'all'));
  // coming back to the results: no keyboard over them
  const [focusFirst] = useState(() => !pendingSearchQuery().trim());
  const [recentKeys, setRecentKeys] = useState(readRecent);
  const [oftenKeys, setOftenKeys] = useState(readOften);
  // a church among them: its row needs the churches' list before anything is typed
  const wantChurches = recentKeys.some(k => k.startsWith('church:')) || oftenKeys.slice(0, TILES).some(k => k.startsWith('church:'));
  const { index, results, shown, isLocked, access } = useSearchEngine(searched, { churches: wantChurches });
  const openTarget = useOpenSearchTarget();

  const byKey = useMemo(() => new Map([...EXTRA_ITEMS, ...index].map(it => [it.key, it])), [index]);
  // the results' own rows (a psalm, a Bible chapter) are not in the index
  const live = useMemo(() => new Map(results.flatMap(g => g.hits.map(h => [h.item.key, h.item] as const))), [results]);
  const toRow = (it: SearchItem): SearchRow => ({ key: it.key, group: it.group, title: it.title, sub: it.sub, icon: it.icon, locked: isLocked(it) });

  const recent = recentKeys.map(k => byKey.get(k)).filter((it): it is SearchItem => !!it && shown(it)).map(toRow);

  const often = (() => {
    const out: SearchItem[] = [];
    const add = (it: SearchItem | undefined, canOpen = false) => {
      if (!it || out.length >= TILES || out.includes(it) || !shown(it) || (canOpen && isLocked(it))) return;
      out.push(it);
    };
    oftenKeys.forEach(k => add(byKey.get(k)));
    // too few opened yet: the usual ones the person can open, then the app's other functions
    FIRST_TILES.forEach(k => add(byKey.get(k), true));
    index.forEach(it => { if (it.group === 'fn' && it.open.kind !== 'library') add(it, true); });
    return out.map(toRow);
  })();

  // the kinds: while nothing is typed, every kind this person can find; then the kinds found
  const kinds = useMemo(() => {
    const has = new Set<SearchGroupId>(index.filter(shown).map(it => it.group));
    const churches = access.section('eklesiebi');
    if (churches !== 'hidden' && churches !== 'soon') has.add('church');
    return has;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, access]);
  const typed = searched.trim() !== '';
  const found = results.map(g => g.group);
  const chips = !typed
    ? CHIP_ORDER.filter(g => kinds.has(g))
    // results stand alone as drawn (`dzebna-shedegi`); a kind chosen before typing keeps the row, so „ყველა“ is one tap away
    : filter !== 'all' ? CHIP_ORDER.filter(g => found.includes(g) || g === filter) : [];
  const visible = filter === 'all' ? results : results.filter(g => g.group === filter);
  const elsewhere = filter === 'all' ? 0 : results.filter(g => g.group !== filter).reduce((n, g) => n + g.hits.length, 0);

  const onQuery = (q: string) => { setQuery(q); setPendingQuery(q); setHeardNote(false); };

  // speech: the sheet listens, the final words fill the field and the search runs by itself
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [heardNote, setHeardNote] = useState(false);
  const voice = useVoiceSearch(text => { setQuery(text); setPendingQuery(text); setHeardNote(true); setVoiceOpen(false); });
  const canVoice = useMemo(voiceSupported, []);
  const canSing = useMemo(() => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia, []);
  const [singing, setSinging] = useState(false);
  const closeVoice = () => { voice.stop(); setVoiceOpen(false); };
  const onFilter = (f: SearchFilter) => { setFilter(f); lastFilter = f; };

  const onOpen = (row: SearchRow) => {
    const it = live.get(row.key) ?? byKey.get(row.key);
    if (!it) return;
    // guests: the sign-in prompt
    if (isLocked(it)) { askSignIn(it.title); return; }
    saveRecent(it.key);
    countOpen(it.key);
    setRecentKeys(readRecent());
    setOftenKeys(readOften());
    lastFilter = filter;
    openTarget(it.open);
  };

  return (
    <>
    <SearchView
      query={query}
      searched={searched}
      onQuery={onQuery}
      onBack={handleGoBack}
      filter={filter}
      onFilter={onFilter}
      chips={chips}
      groups={visible.map(g => ({ group: g.group, rows: g.hits.map(h => toRow(h.item)) }))}
      elsewhere={elsewhere}
      recent={recent}
      onClearRecent={() => { clearRecent(); setRecentKeys([]); }}
      often={often}
      onOpen={onOpen}
      autoFocus={focusFirst}
      onVoice={canVoice ? () => { setVoiceOpen(true); voice.start(); } : undefined}
      heardNote={heardNote}
      onSing={canSing ? () => setSinging(true) : undefined}
    />
    <VoiceSheet open={voiceOpen} state={voice.state} heard={voice.heard} error={voice.error} onClose={closeVoice} onRetry={voice.start} />
    {singing && <Suspense fallback={null}><SingSearch onClose={() => setSinging(false)} /></Suspense>}
    </>
  );
};
