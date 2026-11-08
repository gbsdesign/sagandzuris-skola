import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  AudioLines, Bird, Brain, Brush, Castle, Check, ChevronDown, Clapperboard, Compass, Crown, Dice5, Drama, Feather, Flag, Flame, Footprints, Gamepad2, Gem, Grape, Grid2x2Check, Grid3x3, HatGlasses, Headphones, Hourglass, KeyRound, Layers3, Info, Landmark, LayoutGrid, Lightbulb, ListChecks, ListMusic, ListOrdered, Loader2, Map as MapIcon, MapPinned, MessageCircle, MessageSquareOff,
  MicVocal, Music2, Piano, Puzzle, Repeat, Route, Search, Shapes, ScrollText, Shirt, Smile, SpellCheck, TextSearch, TicketCheck, UserRoundSearch, VenetianMask, Waves, X,
} from 'lucide-react';
import { useNavigation } from '../context';
import { useAccess } from '../hooks/useAccess';
import { useHangi } from '../hooks/useHangi';
import { useDailyRecord } from '../hooks/useDailyRecord';
import { hangiMeta, tbilisiToday } from '../utils/hangi';
import { otkheuliMeta } from '../utils/otkheuli';
import { badeMeta } from '../utils/bade';
import { tsMeta } from '../utils/tsartsera';
import { khaziMeta } from '../utils/khazi';
import { anbaniMeta } from '../utils/anbani';
import { tabuMeta } from '../utils/tabu';
import { vinMeta } from '../utils/vin';
import { saidumloMeta } from '../utils/saidumlo';
import { utskhoMeta } from '../utils/utskho';
import { dzebnaMeta } from '../utils/dzebna';
import { requestOpen } from '../utils/searchOpen';
import { isRoomGame } from '../utils/gameRoom';
import { DAILY_GAMES, GAMES, GAME_GROUPS, GameDef, GameMode } from '../data/games';
import { Pill } from '../components/ui/kit';
import { setGameSearchOpen, useGameSearchOpen } from '../components/maps/songSearch';
import { Toast } from '../components/ui/Toast';
import { askSignIn } from '../components/access/SignInPrompt';
import { openPathPanel } from '../components/views/IndependentWorkCard';
import { triggerHaptic } from '../utils/haptics';
import HangiGame from './games/HangiGame';
import AmikhseniGame from './games/AmikhseniGame';
import SitqvaGame from './games/SitqvaGame';
import OtkheuliGame from './games/OtkheuliGame';
import GatvlaGame from './games/GatvlaGame';
import ChurchkhelaGame from './games/ChurchkhelaGame';
import RaSadRodisGame from './games/RaSadRodisGame';
import SamshvildeGame from './games/SamshvildeGame';
import KutkheGame from './games/KutkheGame';
import OtkhiGame from './games/OtkhiGame';
import KhmebiGame from './games/KhmebiGame';
import NotebiGame from './games/NotebiGame';
import TurniriGame from './games/TurniriGame';
import AkordiGame from './games/AkordiGame';
import RvakhmaGame from './games/RvakhmaGame';
import RukaGame from './games/RukaGame';
import GagrdzeleGame from './games/GagrdzeleGame';
import HangebiGame from './games/HangebiGame';
import EqoGame from './games/EqoGame';
import MprinaviGame from './games/MprinaviGame';
import TsqvilebiGame from './games/TsqvilebiGame';
import MesameGame from './games/MesameGame';
import GundiGame from './games/GundiGame';
import ChamotvaleGame from './games/ChamotvaleGame';
import BadeGame from './games/BadeGame';
import TsartseraGame from './games/TsartseraGame';
import KhaziGame from './games/KhaziGame';
import VaziGame from './games/VaziGame';
import ChaitsviGame from './games/ChaitsviGame';
import AnbaniGame from './games/AnbaniGame';
import TsikheGame from './games/TsikheGame';
import TsinapariGame from './games/TsinapariGame';
import TabuGame from './games/TabuGame';
import MinishnebaGame from './games/MinishnebaGame';
import PantomimaGame from './games/PantomimaGame';
import VinGame from './games/VinGame';
import SaidumloGame from './games/SaidumloGame';
import UtskhoGame from './games/UtskhoGame';
import NakhatiGame from './games/NakhatiGame';
import LotoGame from './games/LotoGame';
import DzebnaGame from './games/DzebnaGame';
import EzoGame from './games/EzoGame';
import KariGame from './games/KariGame';
import LurjiGame from './games/LurjiGame';
import TakhtiGame from './games/TakhtiGame';
import OkrosGame from './games/OkrosGame';
// „ქარავანი“ carries its map (~100 KB): it loads only when opened
const QaravaniGame = lazy(() => import('./games/QaravaniGame'));
const Qaravani: React.FC = () => (
  <Suspense fallback={<div className="py-20 flex justify-center" role="status" aria-label="იტვირთება"><span className="w-9 h-9 rounded-full border-[3px] border-[#7a2028]/20 border-t-[#7a2028] animate-spin" /></div>}>
    <QaravaniGame />
  </Suspense>
);
import { useVine } from './games/vazi/useVine';
import type { FilmKind } from '../data/georgianFilms';
import { Tabs } from '../components/ui/kit';
// „ქართული ფილმები“ (moved here from „მთქმელი“'s videos, 2026-11-09): the list loads only when opened
const KinoKind = lazy(() => import('./VideosPage').then(m => ({ default: m.KinoKind })));
// the page's tabs on top (2026-11-09, as „ხალხური“'s): the games and the three kinds of films; kept for the visit
type HubTab = 'games' | FilmKind;
const TAB_KEY = 'sg-games-tab';
const readTab = (): HubTab => {
  try { const t = sessionStorage.getItem(TAB_KEY); return t === 'film' || t === 'theatre' || t === 'cartoon' ? t : 'games'; } catch { return 'games'; }
};

// „თამაშები“: the hub of the games (2026-10-27; one list since 2026-10-30, the user's „ყველა თამაში 1 სიად“; made clearer
// 2026-11-04, the user's „დახვეწე, გაათანამედროვე და არ იყოს დამაბნეველი“). On top what the three variants are and a search
// field; then „დღის თამაშები“ — the daily games with today's mark, a tap opens the day's game; then every game under its kind
// (`GAME_GROUPS`, the user's own მუსიკალური · ქართული · ცოცხალი and the board games), each heading folds (no chips since 2026-11-09). A card per
// game: its name (the known game it answers to in brackets; ⓘ unfolds what that game is), one line, the day's result, and a
// button per variant it has — ონლაინ / ჰიბრიდული open it (the games that live inside this page are `mapItem`, so the top bar's „←“
// returns here; some open on the variant tapped), სამაგიდო makes its PDF on the phone. The catalogue is data/games.ts.

type Access = ReturnType<ReturnType<typeof useAccess>['section']>;

const ICON: Record<string, React.ReactNode> = {
  'dghis-hangi': <Headphones />, 'dghis-sitqva': <SpellCheck />, otkheuli: <Shapes />,
  amikhseni: <MessageCircle />, gatvla: <Dice5 />, 'tskheli-churchkhela': <Flame />, 'ra-sad-rodis': <Brain />,
  'okros-khana': <MapIcon />, 'samshvildis-ghame': <Castle />, 'saidanaa-simghera': <MapPinned />, 'otkhidan-erti': <ListChecks />, 'khma-khmad': <AudioLines />, 'sam-notshi': <Music2 />, 'khmebis-turniri': <MicVocal />, 'kartuli-akordi': <Piano />, 'rva-khma': <Waves />, 'rukis-viktorina': <Compass />, gagrdzele: <ListMusic />, hangebi: <Puzzle />, eqo: <Repeat />, 'mprinavi-notebi': <Bird />, 'khmis-tsqvilebi': <Grid2x2Check />, 'mesame-khma': <Layers3 />, 'chemi-gundi': <Drama />, chamotvale: <ListOrdered />, 'asoebis-bade': <TextSearch />, 'khutsuri-tsartsera': <ScrollText />, 'drois-khazi': <Hourglass />, 'chemi-vazi': <Grape />, 'chaitsvi-qartulad': <Shirt />, 'sami-damtserloba': <Feather />, 'tsikhis-gasaghebi': <KeyRound />, 'tsinapris-gza': <Footprints />, 'nu-itqvi': <MessageSquareOff />, 'erti-minishneba': <Lightbulb />, pantomima: <VenetianMask />, 'vin-var-me': <UserRoundSearch />, 'saidumlo-sakhelebi': <Grid3x3 />, 'utskho-sopelshi': <HatGlasses />, nakhatobana: <Brush />, 'sagalobo-loto': <TicketCheck />, 'sagandzuris-dzebna': <Gem />, 'ezos-msaji': <Flag />, qaravani: <Route />, 'ori-takhti': <Crown />, 'lurji-supra': <LayoutGrid />, 'mepis-kari': <Landmark />,
};

// the games that open inside this page, by their `mapItem`
const INNER: Record<string, React.FC> = {
  hangi: HangiGame, amikhseni: AmikhseniGame, sitqva: SitqvaGame, otkheuli: OtkheuliGame, gatvla: GatvlaGame, churchkhela: ChurchkhelaGame, rsr: RaSadRodisGame,
  samshvilde: SamshvildeGame, kutkhe: KutkheGame, otkhi: OtkhiGame, khmebi: KhmebiGame, notebi: NotebiGame, turniri: TurniriGame,
  akordi: AkordiGame, rvakhma: RvakhmaGame, ruka: RukaGame, gagrdzele: GagrdzeleGame, hangebi: HangebiGame,
  eqo: EqoGame, mprinavi: MprinaviGame, tsqvilebi: TsqvilebiGame, mesame: MesameGame, gundi: GundiGame, chamotvale: ChamotvaleGame, bade: BadeGame, tsartsera: TsartseraGame, khazi: KhaziGame, vazi: VaziGame, chaitsvi: ChaitsviGame, anbani: AnbaniGame, tsikhe: TsikheGame, tsinapari: TsinapariGame, tabu: TabuGame, minishneba: MinishnebaGame, pantomima: PantomimaGame, vin: VinGame, saidumlo: SaidumloGame, utskho: UtskhoGame, nakhati: NakhatiGame, loto: LotoGame, dzebna: DzebnaGame, ezo: EzoGame, kari: KariGame, lurji: LurjiGame, takhti: TakhtiGame, qaravani: Qaravani, okros: OkrosGame,
};

/** a game's card: a tap opens the game (its tabs ონლაინ · ჰიბრიდული are inside; the printed kit is the bar's „სამაგიდო“ there —
 *  2026-11-09, the user: „თამაშზე დაჭერისას იხსნებოდეს პირდაპირ … გარედან ჩანართები … მოხსენი … სია ლამაზად და კომპაქტურად“) */
const GameCard: React.FC<{ g: GameDef; state: Access; meta?: string; onOpen: () => void }> = ({ g, state, meta, onOpen }) => {
  const [info, setInfo] = useState(false);
  const soon = state === 'soon';
  const infoId = `game-about-${g.id}`;
  return (
    <li className="relative rounded-2xl bg-white/90 ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] hover:ring-[#7a2028]/35 transition-shadow">
      <button
        type="button"
        onClick={onOpen}
        className="group w-full flex items-center gap-3 py-2.5 pl-2.5 pr-11 text-left cursor-pointer rounded-2xl active:bg-[#7a2028]/[0.03]"
      >
        <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5 ${soon ? 'bg-[#f1e8d9] text-[#9a8b7b]' : 'bg-[#7a2028]/[0.08] text-[#7a2028]'}`}>
          {ICON[g.id] ?? <Gamepad2 />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="min-w-0 truncate font-serif-ge text-[15px] font-bold leading-snug text-[#4a3426] group-hover:text-[#7a2028] transition-colors">{g.title}</span>
            {soon && <Pill tone="amber" className="!h-5 shrink-0">მალე</Pill>}
          </span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-[#8a7a6a] line-clamp-2">{g.text}</span>
          {meta && <span className="mt-1 inline-flex rounded-full bg-[#7a2028]/[0.07] px-2 py-px text-[11.5px] font-bold tabular-nums text-[#7a2028]">{meta}</span>}
        </span>
      </button>
      {(g.about || g.like) && (
        <button
          type="button"
          onClick={() => { triggerHaptic(5); setInfo(o => !o); }}
          aria-expanded={info}
          aria-controls={infoId}
          aria-label={`რა არის „${g.title}“`}
          title="რა არის"
          className={`absolute top-1.5 right-1.5 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-colors ${info ? 'bg-[#7a2028]/[0.1] text-[#7a2028]' : 'text-[#b3a594] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.07]'}`}
        >
          <Info className="w-[17px] h-[17px]" />
        </button>
      )}
      {info && (g.about || g.like) && (
        <p id={infoId} className="mx-2.5 mb-2.5 rounded-xl bg-[#fbf6ec] ring-1 ring-[#efe3cf] px-3 py-2 text-[12.5px] leading-relaxed text-[#5a4a3c]">
          {g.like && <b className="text-[#4a3426]">{g.like}. </b>}{g.about}
        </p>
      )}
    </li>
  );
};

/** how well a search fits a game: every word must be in its name, its known game, its line or its ⓘ — the name counts most */
const fold = (t: string) => t.toLocaleLowerCase('ka').replace(/[„“"'()!?.,:;·—–-]/g, ' ').replace(/\s+/g, ' ').trim();
const scoreOf = (g: GameDef, q: string) => {
  const parts: [string, number][] = [[fold(g.title), 8], [fold(g.like ?? ''), 4], [fold(g.text), 2], [fold(g.about ?? ''), 1]];
  let total = 0;
  for (const w of fold(q).split(' ').filter(Boolean)) {
    const best = Math.max(0, ...parts.map(([t, weight]) => (t.includes(w) ? weight : 0)));
    if (!best) return 0;
    total += best;
  }
  return total;
};

/** which kinds' headings are unfolded — kept for the visit (2026-11-09, the user: the chips went, the headings fold) */
const OPEN_KEY = 'sg-games-open';
const readOpen = (): string[] => {
  try { const v = JSON.parse(sessionStorage.getItem(OPEN_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};

export const GamesPage: React.FC = () => {
  const { navigateTo, mapItem, openMapItem, handleGoBack } = useNavigation();
  const access = useAccess();
  const hangi = useHangi();
  const sitqva = useDailyRecord('sitqva');
  const otkheuli = useDailyRecord('otkheuli');
  const bade = useDailyRecord('bade');
  const tsartsera = useDailyRecord('tsartsera');
  const khazi = useDailyRecord('khazi');
  const anbani = useDailyRecord('anbani');
  const tabu = useDailyRecord('tabu');
  const vin = useDailyRecord('vin');
  const saidumlo = useDailyRecord('saidumlo');
  const utskho = useDailyRecord('utskho');
  const dzebna = useDailyRecord('dzebna');
  const vazi = useVine();
  const [soon, setSoon] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<string[]>(readOpen);
  const toggleGroup = (id: string) => {
    triggerHaptic(5);
    setOpenGroups(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try { sessionStorage.setItem(OPEN_KEY, JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };
  // the search folds under the bar's round 🔍 (2026-11-09); closing it clears the words
  const searchOpen = useGameSearchOpen();
  const [tab, setTab] = useState<HubTab>(readTab);
  const chooseTab = (t: HubTab) => { setTab(t); try { sessionStorage.setItem(TAB_KEY, t); } catch { /* private mode */ } if (t !== 'games') setGameSearchOpen(false); };
  useEffect(() => { if (!searchOpen) setQuery(''); }, [searchOpen]);
  useEffect(() => () => setGameSearchOpen(false), []);
  // the bar's 🔍 searches the games: on a films' tab it brings the games' tab back
  useEffect(() => { if (searchOpen && tab !== 'games') { setTab('games'); try { sessionStorage.setItem(TAB_KEY, 'games'); } catch { /* private mode */ } } }, [searchOpen, tab]);
  const today = useMemo(() => tbilisiToday(), []);

  const Inner = mapItem ? INNER[mapItem] : undefined;
  if (Inner) return <Inner />;
  // a film open from a tab: `kino/<YouTube id>` (the bar's „უკან“ closes it); an old `kino` opens the films' tab
  const [kinoList, kinoFilm] = (mapItem ?? '').split('/');
  const inKino = kinoList === 'kino';

  // a game's app variants follow its section's switch and the member's features; a printed kit is always there
  const cards = GAMES.flatMap(g => {
    const state = (g.section ? access.section(g.section) : 'open') as Access;
    const modes = g.modes.filter(m => (m === 'noPhone' ? !!g.print : state !== 'hidden'));
    return modes.length ? [{ g: { ...g, modes }, state }] : [];
  });
  const films = access.section('videoebi') === 'open';

  // a daily game's card shows today's result or the streak
  const meta = (g: GameDef) =>
    g.id === 'dghis-hangi' && hangi.loaded ? hangiMeta(hangi.days, today)
      : g.id === 'dghis-sitqva' && sitqva.loaded ? hangiMeta(sitqva.days, today)
      : g.id === 'otkheuli' && otkheuli.loaded ? otkheuliMeta(otkheuli.days, today)
      : g.id === 'asoebis-bade' && bade.loaded ? badeMeta(bade.days, today)
      : g.id === 'khutsuri-tsartsera' && tsartsera.loaded ? tsMeta(tsartsera.days, today)
      : g.id === 'drois-khazi' && khazi.loaded ? khaziMeta(khazi.days, today)
      : g.id === 'sami-damtserloba' && anbani.loaded ? anbaniMeta(anbani.days, today)
      : g.id === 'nu-itqvi' && tabu.loaded ? tabuMeta(tabu.days, today)
      : g.id === 'vin-var-me' && vin.loaded ? vinMeta(vin.days, today)
      : g.id === 'saidumlo-sakhelebi' && saidumlo.loaded ? saidumloMeta(saidumlo.days, today)
      : g.id === 'utskho-sopelshi' && utskho.loaded ? utskhoMeta(utskho.days, today)
      : g.id === 'sagandzuris-dzebna' && dzebna.loaded ? dzebnaMeta(dzebna.days, today)
      : g.id === 'chemi-vazi' && vazi.loaded && vazi.vine.leaves ? `${vazi.vine.recent} ფოთოლი · ${vazi.vine.seasonBunches} მტევანი`
      : undefined;

  // a daily game played today (its record: the member's, the device's for guests)
  const RECORD: Record<string, { days: Record<string, { done?: boolean }>; loaded: boolean }> = {
    'dghis-hangi': hangi, 'dghis-sitqva': sitqva, otkheuli, 'asoebis-bade': bade, 'khutsuri-tsartsera': tsartsera, 'drois-khazi': khazi,
    'nu-itqvi': tabu, 'vin-var-me': vin, 'saidumlo-sakhelebi': saidumlo, 'utskho-sopelshi': utskho, 'sagandzuris-dzebna': dzebna,
  };
  const dayDone = (id: string) => { const r = RECORD[id]; return !!r?.loaded && !!r.days[today]?.done; };

  const play = (g: GameDef, state: Access, mode: GameMode) => {
    triggerHaptic(10);
    if (state === 'locked') { askSignIn(g.title); return; }
    if (state !== 'open') { setSoon(`„${g.title}“ ჯერ მზადდება — მალე დაემატება`); return; }
    // a game played in a class's room („სამშვილდის ღამე“, the quick games), „ჩემი გუნდი“ and the word games with teams open
    // on the variant tapped
    if (isRoomGame(g.item) || g.item === 'gundi' || g.item === 'sitqva' || g.item === 'otkheuli' || g.item === 'bade' || g.item === 'tsartsera' || g.item === 'khazi' || g.item === 'vazi' || g.item === 'chaitsvi' || g.item === 'anbani' || g.item === 'tsikhe' || g.item === 'tsinapari' || g.item === 'tabu' || g.item === 'minishneba' || g.item === 'vin' || g.item === 'saidumlo' || g.item === 'utskho' || g.item === 'dzebna' || g.item === 'ezo') requestOpen(g.item, mode === 'online' ? 'online' : 'table');
    if (g.item) { openMapItem(g.item); return; }
    if (g.page) { if (g.panel) openPathPanel(g.panel); navigateTo(g.page); }
  };

  const byId = new Map(cards.map(c => [c.g.id, c]));
  const card = ({ g, state }: { g: GameDef; state: Access }) => <GameCard key={g.id} g={g} state={state} meta={meta(g)} onOpen={() => play(g, state, 'online')} />;
  const found = query.trim()
    ? cards.map(c => ({ c, score: scoreOf(c.g, query) })).filter(x => x.score > 0).sort((a, b) => b.score - a.score).map(x => x.c)
    : null;
  const groups = GAME_GROUPS.map(gr => ({ ...gr, list: gr.games.flatMap(id => byId.get(id) ?? []) })).filter(gr => gr.list.length);
  // the daily games whose day's game (online) is there, with today's mark
  const daily = DAILY_GAMES.flatMap(id => {
    const c = byId.get(id);
    return c && c.g.modes.includes('online') && c.state !== 'hidden' ? [{ ...c, done: !!dayDone(id) }] : [];
  });

  const shownTab: HubTab = films ? tab : 'games';
  const tabs = films && (
    <Tabs<HubTab>
      cols={4}
      stack
      value={shownTab}
      onChange={chooseTab}
      items={[
        { id: 'games', label: 'თამაში', Icon: Gamepad2 },
        { id: 'film', label: 'ფილმი', Icon: Clapperboard },
        { id: 'theatre', label: 'სპექტაკლი', Icon: Drama },
        { id: 'cartoon', label: 'მულტფილმი', Icon: Smile },
      ]}
    />
  );
  if (shownTab !== 'games' || inKino) {
    const kind: FilmKind = shownTab === 'games' ? 'film' : shownTab;
    return (
      <div className="w-full max-w-2xl md:max-w-5xl space-y-4">
        {tabs}
        <Suspense fallback={<div className="py-20 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-[#7a2028]" /></div>}>
          <KinoKind
            key={kind}
            only={kind}
            open={kinoFilm}
            onPlay={id => { triggerHaptic(10); openMapItem(`kino/${id}`, false, true); }}
            onMove={id => openMapItem(`kino/${id}`, true, true)}
            onClose={handleGoBack}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl md:max-w-5xl space-y-5">
      {tabs}
      {searchOpen && (
      <div>
        <label className="relative block">
          <span className="sr-only">თამაშის ძებნა</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#a8998a]" />
          <input
            type="text"
            autoFocus
            inputMode="search"
            enterKeyHint="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="მოძებნე თამაში"
            className="h-12 w-full rounded-full bg-white pl-11 pr-12 text-[15px] text-[#4a3426] ring-1 ring-[#e8dcc8] placeholder:text-[#a8998a] focus:outline-none focus:ring-2 focus:ring-[#7a2028]/40"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="ძებნის გასუფთავება" className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-[#8a7a6a] hover:bg-[#7a2028]/[0.07] cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </label>
      </div>
      )}

      {found ? (
        <section aria-label="ნაპოვნი თამაშები" className="space-y-2.5">
          <p className="px-1 text-[13px] font-bold tabular-nums text-[#8a7a6a]" role="status">{found.length ? `ნაპოვნია ${found.length}` : 'ასეთი თამაში ვერ ვიპოვე'}</p>
          {found.length > 0 && <ul className="grid gap-2 md:grid-cols-2">{found.map(card)}</ul>}
        </section>
      ) : (
        <>
          {daily.length > 0 && (
            <section aria-label="დღის თამაშები" className="rounded-2xl bg-white/85 ring-1 ring-[#e8dcc8] p-3 sm:p-4">
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {daily.map(({ g, state, done }) => (
                  <li key={g.id} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => play(g, state, 'online')}
                      aria-label={`${g.title}${done ? ' — დღეს გაკეთებულია' : ''}`}
                      className={`flex w-full min-h-11 items-center gap-2 rounded-2xl py-1.5 pl-1.5 pr-2.5 text-left text-[13px] font-bold leading-tight ring-1 cursor-pointer transition-colors ${done ? 'bg-[#2f7d4f]/[0.08] text-[#25603d] ring-[#2f7d4f]/25' : 'bg-white text-[#4a3426] ring-[#e8dcc8] hover:ring-[#7a2028]/35'}`}
                    >
                      <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4 ${done ? 'bg-[#2f7d4f] text-white' : 'bg-[#7a2028]/[0.08] text-[#7a2028]'}`}>
                        {done ? <Check /> : ICON[g.id] ?? <Gamepad2 />}
                      </span>
                      <span className="min-w-0 [overflow-wrap:anywhere]">{g.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <h2 className="px-1 flex items-baseline gap-2 font-serif-ge text-[17px] font-bold text-[#4a3426]">ყველა თამაში<span className="text-[13px] font-bold tabular-nums text-[#a8998a]">{cards.length}</span></h2>
          <div className="space-y-2.5 !mt-2.5">
            {groups.map(gr => {
              const open = openGroups.includes(gr.id);
              return (
                <section key={gr.id} id={`games-${gr.id}`} className="space-y-2.5">
                  <h3>
                    <button
                      type="button"
                      onClick={() => toggleGroup(gr.id)}
                      aria-expanded={open}
                      aria-controls={`games-${gr.id}-list`}
                      className={`flex w-full min-h-14 items-center gap-3 rounded-2xl px-4 py-2.5 text-left ring-1 cursor-pointer transition-colors ${open ? 'bg-white ring-[#7a2028]/25' : 'bg-white/85 ring-[#e8dcc8] hover:ring-[#7a2028]/35'}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2 font-serif-ge text-[18px] font-bold leading-snug text-[#4a3426]">
                          {gr.title}<span className="text-[13px] font-bold tabular-nums text-[#a8998a]">{gr.list.length}</span>
                        </span>
                        <span className="mt-0.5 block text-[12.5px] leading-snug text-[#8a7a6a]">{gr.hint}</span>
                      </span>
                      <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-[#7a2028]/[0.07] text-[#7a2028] transition-transform ${open ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-5 h-5" />
                      </span>
                    </button>
                  </h3>
                  {open && <ul id={`games-${gr.id}-list`} className="grid gap-2 md:grid-cols-2">{gr.list.map(card)}</ul>}
                </section>
              );
            })}
          </div>
        </>
      )}

      <Toast message={soon || ''} type="info" isVisible={!!soon} onClose={() => setSoon(null)} />
    </div>
  );
};

export default GamesPage;
