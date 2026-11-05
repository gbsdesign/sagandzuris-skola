import React, { Suspense, lazy, useMemo, useState } from 'react';
import {
  AudioLines, Bird, Brain, Brush, Castle, Check, Compass, Crown, Dice5, Drama, Feather, Flag, Flame, Footprints, Gamepad2, Gem, Grape, Grid2x2Check, Grid3x3, HatGlasses, Headphones, Hourglass, KeyRound, Layers3, Info, Landmark, LayoutGrid, Lightbulb, ListChecks, ListMusic, ListOrdered, Loader2, Map as MapIcon, MapPinned, MessageCircle, MessageSquareOff,
  MicVocal, Music2, Piano, Printer, Puzzle, Repeat, Route, Search, Shapes, ScrollText, Shirt, SpellCheck, TextSearch, TicketCheck, UserRoundSearch, Users, VenetianMask, Waves, Wifi, X,
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
import { DAILY_GAMES, GAMES, GAME_GROUPS, GameDef, GameMode, MODE_HINT, MODE_LABEL } from '../data/games';
import { Card, Pill } from '../components/ui/kit';
import { Toast } from '../components/ui/Toast';
import { askSignIn } from '../components/access/SignInPrompt';
import { openPathPanel } from '../components/views/IndependentWorkCard';
import { triggerHaptic } from '../utils/haptics';
import { useKitMaker, type KitMake } from '../components/games/KitButton';
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

// „თამაშები“: the hub of the games (2026-10-27; one list since 2026-10-30, the user's „ყველა თამაში 1 სიად“; made clearer
// 2026-11-04, the user's „დახვეწე, გაათანამედროვე და არ იყოს დამაბნეველი“). On top what the three variants are and a search
// field; then „დღის თამაშები“ — the daily games with today's mark, a tap opens the day's game; then every game under its kind
// (`GAME_GROUPS`, the user's own მუსიკალური · ქართული · ცოცხალი and the board games), the kinds' chips jumping to them. A card per
// game: its name (the known game it answers to in brackets; ⓘ unfolds what that game is), one line, the day's result, and a
// button per variant it has — ონლაინ / ჰიბრიდული open it (the games that live inside this page are `mapItem`, so the top bar's „←“
// returns here; some open on the variant tapped), სამაგიდო makes its PDF on the phone. The catalogue is data/games.ts.

type Access = ReturnType<ReturnType<typeof useAccess>['section']>;

const ICON: Record<string, React.ReactNode> = {
  'dghis-hangi': <Headphones />, 'dghis-sitqva': <SpellCheck />, otkheuli: <Shapes />,
  amikhseni: <MessageCircle />, gatvla: <Dice5 />, 'tskheli-churchkhela': <Flame />, 'ra-sad-rodis': <Brain />,
  'okros-khana': <MapIcon />, 'samshvildis-ghame': <Castle />, 'saidanaa-simghera': <MapPinned />, 'otkhidan-erti': <ListChecks />, 'khma-khmad': <AudioLines />, 'sam-notshi': <Music2 />, 'khmebis-turniri': <MicVocal />, 'kartuli-akordi': <Piano />, 'rva-khma': <Waves />, 'rukis-viktorina': <Compass />, gagrdzele: <ListMusic />, hangebi: <Puzzle />, eqo: <Repeat />, 'mprinavi-notebi': <Bird />, 'khmis-tsqvilebi': <Grid2x2Check />, 'mesame-khma': <Layers3 />, 'chemi-gundi': <Drama />, chamotvale: <ListOrdered />, 'asoebis-bade': <TextSearch />, 'khutsuri-tsartsera': <ScrollText />, 'drois-khazi': <Hourglass />, 'chemi-vazi': <Grape />, 'chaitsvi-qartulad': <Shirt />, 'sami-damtserloba': <Feather />, 'tsikhis-gasaghebi': <KeyRound />, 'tsinapris-gza': <Footprints />, 'nu-itqvi': <MessageSquareOff />, 'erti-minishneba': <Lightbulb />, pantomima: <VenetianMask />, 'vin-var-me': <UserRoundSearch />, 'saidumlo-sakhelebi': <Grid3x3 />, 'utskho-sopelshi': <HatGlasses />, nakhatobana: <Brush />, 'sagalobo-loto': <TicketCheck />, 'sagandzuris-dzebna': <Gem />, 'ezos-msaji': <Flag />, qaravani: <Route />, 'ori-takhti': <Crown />, 'lurji-supra': <LayoutGrid />, 'mepis-kari': <Landmark />,
};

const MODE_ICON: Record<GameMode, React.ComponentType<{ className?: string }>> = { online: Wifi, hybrid: Users, noPhone: Printer };

// the games that open inside this page, by their `mapItem`
const INNER: Record<string, React.FC> = {
  hangi: HangiGame, amikhseni: AmikhseniGame, sitqva: SitqvaGame, otkheuli: OtkheuliGame, gatvla: GatvlaGame, churchkhela: ChurchkhelaGame, rsr: RaSadRodisGame,
  samshvilde: SamshvildeGame, kutkhe: KutkheGame, otkhi: OtkhiGame, khmebi: KhmebiGame, notebi: NotebiGame, turniri: TurniriGame,
  akordi: AkordiGame, rvakhma: RvakhmaGame, ruka: RukaGame, gagrdzele: GagrdzeleGame, hangebi: HangebiGame,
  eqo: EqoGame, mprinavi: MprinaviGame, tsqvilebi: TsqvilebiGame, mesame: MesameGame, gundi: GundiGame, chamotvale: ChamotvaleGame, bade: BadeGame, tsartsera: TsartseraGame, khazi: KhaziGame, vazi: VaziGame, chaitsvi: ChaitsviGame, anbani: AnbaniGame, tsikhe: TsikheGame, tsinapari: TsinapariGame, tabu: TabuGame, minishneba: MinishnebaGame, pantomima: PantomimaGame, vin: VinGame, saidumlo: SaidumloGame, utskho: UtskhoGame, nakhati: NakhatiGame, loto: LotoGame, dzebna: DzebnaGame, ezo: EzoGame, kari: KariGame, lurji: LurjiGame, takhti: TakhtiGame, qaravani: Qaravani, okros: OkrosGame,
};

const BTN = 'inline-flex w-full min-w-0 items-center justify-center gap-1.5 h-11 px-2 rounded-xl text-[13.5px] font-bold transition-[background-color,transform] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#7a2028]/50 cursor-pointer';
const LOOK: Record<GameMode, string> = {
  online: 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_1px_2px_rgba(74,52,38,0.15)] hover:bg-[#6a1b22]',
  hybrid: 'bg-[#7a2028]/[0.08] text-[#7a2028] ring-1 ring-[#7a2028]/20 hover:bg-[#7a2028]/[0.14]',
  noPhone: 'bg-[#f4ecdf] text-[#5a4a3c] ring-1 ring-[#e3d5bf] hover:bg-[#ede1cd]',
};

/** the printed variant's button: the kit is made on the phone and saved */
const KitModeBtn: React.FC<{ g: GameDef; make: KitMake; iconCls: string }> = ({ g, make, iconCls }) => {
  const { busy, failed, share, run } = useKitMaker(make, g.title);
  const Ic = MODE_ICON.noPhone;
  return (
    <button
      type="button"
      onClick={() => { void run(); }}
      aria-busy={busy}
      aria-label={`${g.title} — სამაგიდო: PDF, ${g.print?.sheets ?? 0} ფურცელი`}
      title={`PDF · ${g.print?.sheets ?? 0} ფურცელი`}
      className={`${BTN} ${LOOK.noPhone}`}
    >
      {busy ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <Ic className={iconCls} />}
      <span className="truncate tabular-nums" aria-live="polite">{busy ? (share > 0 ? `${share}%` : 'მზადდება…') : failed ? 'ვერ შეიქმნა' : MODE_LABEL.noPhone}</span>
    </button>
  );
};

/** a variant's button: the app's variants open the game, the printed kit is made on the phone and saved */
const ModeBtn: React.FC<{ g: GameDef; mode: GameMode; soon: boolean; onPlay: (mode: GameMode) => void }> = ({ g, mode, soon, onPlay }) => {
  // three buttons in a row leave a phone (and two columns of cards on a tablet) no room for the icons: the words stay
  const iconCls = `w-4 h-4 shrink-0 ${g.modes.length > 2 ? 'hidden lg:block' : ''}`;
  if (mode === 'noPhone' && g.print) return <KitModeBtn g={g} make={g.print.make} iconCls={iconCls} />;
  const Ic = MODE_ICON[mode];
  return (
    <button type="button" onClick={() => onPlay(mode)} className={`${BTN} ${soon ? 'bg-[#f1e8d9] text-[#9a8b7b]' : LOOK[mode]}`}>
      <Ic className={iconCls} /><span className="truncate">{MODE_LABEL[mode]}</span>
    </button>
  );
};

const GameCard: React.FC<{ g: GameDef; state: Access; meta?: string; onPlay: (mode: GameMode) => void }> = ({ g, state, meta, onPlay }) => {
  const [info, setInfo] = useState(false);
  const soon = state === 'soon';
  const infoId = `game-about-${g.id}`;
  return (
    <li className="flex flex-col rounded-2xl bg-white/90 ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] p-3">
      <div className="flex items-start gap-3">
        <span className={`w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5 ${soon ? 'bg-[#f1e8d9] text-[#9a8b7b]' : 'bg-[#7a2028]/[0.08] text-[#7a2028]'}`}>
          {ICON[g.id] ?? <Gamepad2 />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <h3 className="min-w-0 flex-1 pt-[3px] font-serif-ge text-[15.5px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">
              {g.title}{g.like && <span className="font-normal text-[#8a7a6a]"> ({g.like})</span>}
            </h3>
            {soon && <Pill tone="amber" className="!h-6 shrink-0 mt-0.5">მალე</Pill>}
            {g.about && (
              <button
                type="button"
                onClick={() => { triggerHaptic(5); setInfo(o => !o); }}
                aria-expanded={info}
                aria-controls={infoId}
                aria-label={`რა არის „${g.title}“`}
                title="რა არის"
                className={`w-9 h-9 -my-1 -mr-1 shrink-0 rounded-full flex items-center justify-center cursor-pointer transition-colors ${info ? 'bg-[#7a2028]/[0.1] text-[#7a2028]' : 'text-[#a8998a] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.07]'}`}
              >
                <Info className="w-[18px] h-[18px]" />
              </button>
            )}
          </div>
          <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">{g.text}</p>
          {meta && <p className="mt-1.5 inline-flex rounded-full bg-[#7a2028]/[0.07] px-2.5 py-0.5 text-[12px] font-bold tabular-nums text-[#7a2028]">{meta}</p>}
        </div>
      </div>
      {info && g.about && (
        <p id={infoId} className="mt-2.5 rounded-xl bg-[#fbf6ec] ring-1 ring-[#efe3cf] px-3.5 py-2.5 text-[13px] leading-relaxed text-[#5a4a3c]">{g.about}</p>
      )}
      <div className="mt-auto pt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${g.modes.length}, minmax(0, 1fr))` }}>
        {g.modes.map(m => <ModeBtn key={m} g={g} mode={m} soon={soon} onPlay={onPlay} />)}
      </div>
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

/** the kinds' chips: a tap scrolls to that heading */
const jumpTo = (id: string) => {
  triggerHaptic(5);
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export const GamesPage: React.FC = () => {
  const { navigateTo, mapItem, openMapItem } = useNavigation();
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
  const today = useMemo(() => tbilisiToday(), []);

  const Inner = mapItem ? INNER[mapItem] : undefined;
  if (Inner) return <Inner />;

  // a game's app variants follow its section's switch and the member's features; a printed kit is always there
  const cards = GAMES.flatMap(g => {
    const state = (g.section ? access.section(g.section) : 'open') as Access;
    const modes = g.modes.filter(m => (m === 'noPhone' ? !!g.print : state !== 'hidden'));
    return modes.length ? [{ g: { ...g, modes }, state }] : [];
  });
  const building = cards.filter(c => c.state === 'soon').length;

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
  const card = ({ g, state }: { g: GameDef; state: Access }) => <GameCard key={g.id} g={g} state={state} meta={meta(g)} onPlay={m => play(g, state, m)} />;
  const found = query.trim()
    ? cards.map(c => ({ c, score: scoreOf(c.g, query) })).filter(x => x.score > 0).sort((a, b) => b.score - a.score).map(x => x.c)
    : null;
  const groups = GAME_GROUPS.map(gr => ({ ...gr, list: gr.games.flatMap(id => byId.get(id) ?? []) })).filter(gr => gr.list.length);
  // the daily games whose day's game (online) is there, with today's mark
  const daily = DAILY_GAMES.flatMap(id => {
    const c = byId.get(id);
    return c && c.g.modes.includes('online') && c.state !== 'hidden' ? [{ ...c, done: !!dayDone(id) }] : [];
  });
  const doneToday = daily.filter(d => d.done).length;

  return (
    <div className="w-full max-w-2xl md:max-w-5xl space-y-5">
      <Card tone="wine" className="!p-4 sm:!p-5">
        <p className="font-serif-ge text-[18px] font-bold leading-snug">ითამაშე და ისწავლე</p>
        <p className="mt-0.5 text-[13px] leading-snug tabular-nums text-[#fbf6ec]/85">
          {cards.length - building} თამაში{building > 0 && ` · მზადდება ${building}`} — თითოეულს სამამდე ვარიანტი აქვს:
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {(Object.keys(MODE_LABEL) as GameMode[]).map(m => {
            const Ic = MODE_ICON[m];
            return (
              <li key={m} className="flex items-center gap-2.5 rounded-xl bg-white/[0.07] px-2.5 py-2 ring-1 ring-white/10 sm:flex-col sm:items-start sm:gap-1.5">
                <span className="w-8 h-8 shrink-0 rounded-full bg-[#e2c27a]/15 flex items-center justify-center"><Ic className="w-4 h-4 text-[#e2c27a]" /></span>
                <span className="min-w-0 text-[12.5px] leading-snug text-[#fbf6ec]/80">
                  <span className="block text-[13.5px] font-bold text-[#fbf6ec]">{MODE_LABEL[m]}</span>{MODE_HINT[m]}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <div>
        <label className="relative block">
          <span className="sr-only">თამაშის ძებნა</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#a8998a]" />
          <input
            type="text"
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

      {found ? (
        <section aria-label="ნაპოვნი თამაშები" className="space-y-2.5">
          <p className="px-1 text-[13px] font-bold tabular-nums text-[#8a7a6a]" role="status">{found.length ? `ნაპოვნია ${found.length}` : 'ასეთი თამაში ვერ ვიპოვე'}</p>
          {found.length > 0 && <ul className="grid gap-2.5 md:grid-cols-2">{found.map(card)}</ul>}
        </section>
      ) : (
        <>
          {daily.length > 0 && (
            <section aria-labelledby="games-daily-h" className="rounded-2xl bg-white/85 ring-1 ring-[#e8dcc8] p-3 sm:p-4">
              <div className="flex items-baseline justify-between gap-3 px-1">
                <h2 id="games-daily-h" className="font-serif-ge text-[17px] font-bold text-[#4a3426]">დღის თამაშები</h2>
                <span className="shrink-0 text-[13px] font-bold tabular-nums text-[#7a2028]">დღეს {doneToday}/{daily.length}</span>
              </div>
              <p className="px-1 text-[12.5px] leading-snug text-[#8a7a6a]">ყოველ დღე ახალი, მთელ სკოლას ერთი და იგივე</p>
              <ul className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
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
          <div className="space-y-2.5">
            <h2 className="px-1 flex items-baseline gap-2 font-serif-ge text-[17px] font-bold text-[#4a3426]">ყველა თამაში<span className="text-[13px] font-bold tabular-nums text-[#a8998a]">{cards.length}</span></h2>
            <nav aria-label="თამაშების სახეები" className="flex flex-wrap gap-2">
              {groups.map(gr => (
                <button key={gr.id} type="button" onClick={() => jumpTo(`games-${gr.id}`)} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white/80 px-3.5 text-[13.5px] font-bold text-[#4a3426] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/35 cursor-pointer">
                  {gr.title}<span className="font-normal tabular-nums text-[#a8998a]">{gr.list.length}</span>
                </button>
              ))}
            </nav>
          </div>
          {groups.map(gr => (
            <section key={gr.id} id={`games-${gr.id}`} aria-labelledby={`games-${gr.id}-h`} className="scroll-mt-4 space-y-2.5">
              <div className="px-1">
                <h2 id={`games-${gr.id}-h`} className="flex items-baseline gap-2 font-serif-ge text-[19px] font-bold leading-snug text-[#4a3426]">
                  {gr.title}<span className="text-[13px] font-bold tabular-nums text-[#a8998a]">{gr.list.length}</span>
                </h2>
                <p className="mt-0.5 text-[12.5px] leading-snug text-[#8a7a6a]">{gr.hint}</p>
              </div>
              <ul className="grid gap-2.5 md:grid-cols-2">{gr.list.map(card)}</ul>
            </section>
          ))}
        </>
      )}

      <Toast message={soon || ''} type="info" isVisible={!!soon} onClose={() => setSoon(null)} />
    </div>
  );
};

export default GamesPage;
