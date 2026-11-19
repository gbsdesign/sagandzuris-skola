import React, { useMemo, useState } from 'react';
import { Clapperboard, ListVideo, Search, Tv, X } from 'lucide-react';
import { useNavigation } from '../../../context';
import { Dot, Row, Rows, RoundButton, Seg, Small, TopBar } from '../../../components/ui2';
import { GENRE_NAMES, GENRE_ORDER, KINO, type FilmGenre, type FilmKind, type KinoItem } from '../../../data/georgianFilms';
import { PAISI_PARTS } from '../../../data/paisiVideos';
import { triggerHaptic } from '../../../utils/haptics';
import { PaisiV2 } from '../library/PaisiV2';
import { Chev, Loading, Page, PillRow, SearchPill } from './parts';
import { EtnoNote, PlacedVideos, VideoPlayer, VideoRows, etnoEpisodes, useEtno, type FilmNav, type VFilm } from './videos';

// „ქართული ფილმები“ in the new look (board x-pilmebi): one kind (ფილმი · სპექტაკლი · მულტფილმი — the games page's tabs, or this
// page's switch), one row of pills — „ყველა“, „ბავშვებთან ერთად“ (no grown-ups' films) and the genres —, the films with their
// length and „ნანახია“, the film in a window. `FilmsBody` is what the games page („სახალისო“) shows under its tabs.

const filmOf = (k: KinoItem): VFilm => {
  const parts = k.parts?.length ?? 0;
  const partsWord = parts ? `${parts} ${k.parts![0].label.includes('სერია') ? 'სერია' : 'ნაწილი'}` : '';
  return {
    id: k.id,
    title: k.title,
    sub: [k.genres.map(g => GENRE_NAMES[g]).join(' · '), k.year ? String(k.year) : ''].filter(Boolean).join(' · '),
    secs: k.secs,
    meta: [k.note, partsWord].filter(Boolean).join(' · ') || undefined,
    tag: k.adult ? 'უფროსებისთვის' : undefined,
    parts: k.parts?.map(p => ({ id: p.id, label: p.label })),
  };
};

/** one kind of films: the pills, the list and the open film. `searchable`: a round 🔍 leads the pills and unfolds a field (the
 *  games page's bar searches the games, so the films keep their own); else the page's own `query` filters them. */
export const FilmsBody: React.FC<FilmNav & { kind: FilmKind; query?: string; searchable?: boolean }> = ({
  kind, query: outer = '', searchable, open, onPlay, onMove, onClose,
}) => {
  const [genre, setGenre] = useState<FilmGenre | null>(null);
  const [family, setFamily] = useState(false);
  const [searching, setSearching] = useState(false);
  const [own, setOwn] = useState('');
  const query = searchable ? (searching ? own : '') : outer;
  const ofKind = useMemo(() => KINO.filter(k => k.kind === kind && (!family || !k.adult)), [kind, family]);
  const genres = useMemo(() => GENRE_ORDER.filter(g => ofKind.some(k => k.genres.includes(g))), [ofKind]);
  // a genre the kind has none of counts as „ყველა“
  const g = genre && genres.includes(genre) ? genre : null;
  const q = query.trim().toLowerCase();
  const films = useMemo(() => ofKind
    .filter(k => (!g || k.genres.includes(g)) && (!q || `${k.title} ${k.note}`.toLowerCase().includes(q)))
    .map(filmOf), [ofKind, g, q]);
  return (
    <>
      <PillRow label="ჟანრები" items={[
        ...(searchable ? [{
          id: 'search', label: searching ? 'ძებნის დახურვა' : 'ფილმის ძებნა', iconOnly: true, on: searching,
          icon: searching ? <X aria-hidden="true" /> : <Search aria-hidden="true" />,
          onClick: () => { setSearching(v => !v); setOwn(''); },
        }] : []),
        { id: 'all', label: 'ყველა', on: !g, onClick: () => setGenre(null) },
        { id: 'family', label: 'ბავშვებთან ერთად', on: family, onClick: () => setFamily(f => !f) },
        ...genres.map(x => ({ id: x, label: GENRE_NAMES[x], on: g === x, onClick: () => setGenre(g === x ? null : x) })),
      ]} />
      {searchable && searching && (
        <SearchPill value={own} onChange={setOwn} autoFocus placeholder="ფილმის ძებნა" onEscape={() => { setSearching(false); setOwn(''); }} />
      )}
      <VideoRows films={films} onPlay={onPlay} empty="ასეთი ფილმი ვერ მოიძებნა" />
      <VideoPlayer films={films} open={open} onMove={onMove} onClose={onClose} />
    </>
  );
};

const KIND_TAB_KEY = 'sg-films-kind';
const KIND_SEG: { id: FilmKind; label: string }[] = [
  { id: 'film', label: 'ფილმი' }, { id: 'theatre', label: 'სპექტაკლი' }, { id: 'cartoon', label: 'მულტფილმი' },
];
const PAISI_COUNT = PAISI_PARTS.reduce((n, p) => n + p.eps.length, 0);

/** the old page „ვიდეოები“ (a home button, an old history step) in the new look: its three lists — `mapItem` „k“ (the films),
 *  „p“ (St Paisios), „ep“ („ეთნოფორი“'s full episodes), a film adds „/<YouTube id>“ */
export const VideosV2: React.FC = () => {
  const { mapItem, openMapItem, handleGoBack } = useNavigation();
  const [list, open] = (mapItem ?? '').split('/');
  const nav: FilmNav = {
    open,
    onPlay: id => { triggerHaptic(10); openMapItem(`${list}/${id}`, false, true); },
    onMove: id => openMapItem(`${list}/${id}`, true, true),
    onClose: handleGoBack,
  };
  const [kind, setKind] = useState<FilmKind>(() => {
    try { const v = sessionStorage.getItem(KIND_TAB_KEY); return v === 'theatre' || v === 'cartoon' ? v : 'film'; } catch { return 'film'; }
  });
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const toggleSearch = () => { triggerHaptic(10); setSearching(v => !v); setQuery(''); };
  const searchButton = (
    <RoundButton label={searching ? 'ძებნის დახურვა' : 'ძებნა'} tone={searching ? 'wine' : 'surf'} onClick={toggleSearch}>
      {searching ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
    </RoundButton>
  );

  if (list === 'p') return <PaisiV2 open={open} onPlay={nav.onPlay} onMove={nav.onMove} onClose={nav.onClose} onBack={handleGoBack} />;
  if (list === 'ep') return <Episodes nav={nav} onBack={handleGoBack} />;
  if (list === 'k') {
    return (
      <Page>
        <TopBar title="ქართული ფილმები" onBack={handleGoBack} right={searchButton} />
        <Seg label="რა სახის" items={KIND_SEG} value={kind}
          onChange={k => { triggerHaptic(8); setKind(k); try { sessionStorage.setItem(KIND_TAB_KEY, k); } catch { /* this visit only */ } }} />
        {searching && <SearchPill value={query} onChange={setQuery} autoFocus placeholder="ფილმის ძებნა" onEscape={toggleSearch} />}
        <FilmsBody key={kind} kind={kind} query={query} {...nav} />
      </Page>
    );
  }
  const go = (id: string) => { triggerHaptic(10); openMapItem(id); };
  return (
    <Page>
      <TopBar title="ვიდეოები" onBack={handleGoBack} />
      <Rows>
        <Row lead={<Dot icon={<Clapperboard />} />} title="ქართული ფილმები" sub="კინო, სპექტაკლები, მულტფილმები" right={<><Small>{KINO.length}</Small><Chev /></>} onClick={() => go('k')} />
        <Row lead={<Dot icon={<ListVideo />} />} title="წმინდა პაისი" sub="სერიალი წმინდანის ცხოვრებაზე" right={<><Small>{PAISI_COUNT}</Small><Chev /></>} onClick={() => go('p')} />
        <Row lead={<Dot icon={<Tv />} />} title="სრული გადაცემები" sub="„ეთნოფორის“ ყველა გადაცემა" onClick={() => go('ep')} />
      </Rows>
    </Page>
  );
};

const Episodes: React.FC<{ nav: FilmNav; onBack: () => void }> = ({ nav, onBack }) => {
  const { data, failed } = useEtno();
  const all = useMemo(() => (data ? etnoEpisodes(data) : []), [data]);
  return (
    <Page>
      <TopBar title="სრული გადაცემები" sub="ეთნოფორი" onBack={onBack} />
      {data ? <PlacedVideos all={all} pills="წლები" note={<EtnoNote />} {...nav} /> : <Loading failed={failed} what="ვიდეოები" />}
    </Page>
  );
};

export default VideosV2;
