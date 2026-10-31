import React, { useMemo, useState } from 'react';
import {
  AudioLines, Brain, Castle, Crown, Dice5, Download, Flame, Gamepad2, Gem, Headphones, Info, Landmark, LayoutGrid, ListChecks, Map, MapPinned, MessageCircle,
  Music2, Route, Shapes, SpellCheck, Users, Wifi,
} from 'lucide-react';
import { useAuth, useNavigation } from '../context';
import { useAccess } from '../hooks/useAccess';
import { usePearls } from '../hooks/usePearls';
import { useHangi } from '../hooks/useHangi';
import { useDailyRecord } from '../hooks/useDailyRecord';
import { CHESTS } from '../data/pearls';
import { pearlState } from '../utils/pearls';
import { hangiMeta, tbilisiToday } from '../utils/hangi';
import { otkheuliMeta } from '../utils/otkheuli';
import { requestOpen } from '../utils/searchOpen';
import { isRoomGame } from '../utils/gameRoom';
import { GAMES, GameDef, GameMode, MODE_HINT, MODE_LABEL } from '../data/games';
import { Card, Pill } from '../components/ui/kit';
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

// „თამაშები“: the hub of the games (2026-10-27; one list since 2026-10-30, the user's „ყველა თამაში 1 სიად“). A card per
// game: its name (the known game it answers to in brackets; ⓘ unfolds what that game is), one line, and a button per variant it
// has — ონლაინ / ჰიბრიდული open it (the games that live inside this page are `mapItem`, so the top bar's „←“ returns here;
// „სამშვილდის ღამე“ opens on the variant tapped), სამაგიდო downloads its PDF. The pearls game stays the round button of
// „საგანძურის გზა“, under a switch of its own in the admin panel. The catalogue is data/games.ts.

type Access = ReturnType<ReturnType<typeof useAccess>['section']>;

const ICON: Record<string, React.ReactNode> = {
  margalitebi: <Gem />, 'dghis-hangi': <Headphones />, 'dghis-sitqva': <SpellCheck />, otkheuli: <Shapes />,
  amikhseni: <MessageCircle />, gatvla: <Dice5 />, 'tskheli-churchkhela': <Flame />, 'ra-sad-rodis': <Brain />,
  'okros-khana': <Map />, 'samshvildis-ghame': <Castle />, 'saidanaa-simghera': <MapPinned />, 'otkhidan-erti': <ListChecks />, 'khma-khmad': <AudioLines />, 'sam-notshi': <Music2 />, qaravani: <Route />, 'ori-takhti': <Crown />, 'lurji-supra': <LayoutGrid />, 'mepis-kari': <Landmark />,
};

const MODE_ICON: Record<GameMode, React.ComponentType<{ className?: string }>> = { online: Wifi, hybrid: Users, noPhone: Download };

// the games that open inside this page, by their `mapItem`
const INNER: Record<string, React.FC> = {
  hangi: HangiGame, amikhseni: AmikhseniGame, sitqva: SitqvaGame, otkheuli: OtkheuliGame, gatvla: GatvlaGame, churchkhela: ChurchkhelaGame, rsr: RaSadRodisGame,
  samshvilde: SamshvildeGame, kutkhe: KutkheGame, otkhi: OtkhiGame, khmebi: KhmebiGame, notebi: NotebiGame,
};

const BTN = 'inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full text-[13.5px] font-bold transition-[background-color,transform] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#7a2028]/50';

/** a variant's button: the app's variants open the game, the printed kit downloads */
const ModeBtn: React.FC<{ g: GameDef; mode: GameMode; soon: boolean; onPlay: (mode: GameMode) => void }> = ({ g, mode, soon, onPlay }) => {
  const Ic = MODE_ICON[mode];
  if (mode === 'noPhone' && g.print) {
    return (
      <a
        href={g.print.href}
        download={`${g.title}.pdf`}
        onClick={() => triggerHaptic(8)}
        aria-label={`${g.title} — სამაგიდო: PDF, ${g.print.sheets} ფურცელი`}
        className={`${BTN} bg-[#7a2028]/[0.08] text-[#7a2028] ring-1 ring-[#7a2028]/15 hover:bg-[#7a2028]/[0.14]`}
      >
        <Ic className="w-4 h-4 shrink-0" />{MODE_LABEL.noPhone}<span className="font-normal opacity-75">· PDF</span>
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onPlay(mode)}
      className={`${BTN} cursor-pointer ${soon ? 'bg-[#f1e8d9] text-[#9a8b7b]' : 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_1px_2px_rgba(74,52,38,0.15)] hover:bg-[#6a1b22]'}`}
    >
      <Ic className="w-4 h-4 shrink-0" />{MODE_LABEL[mode]}
    </button>
  );
};

const GameCard: React.FC<{ g: GameDef; state: Access; meta?: string; onPlay: (mode: GameMode) => void }> = ({ g, state, meta, onPlay }) => {
  const [info, setInfo] = useState(false);
  const soon = state === 'soon';
  const infoId = `game-about-${g.id}`;
  return (
    <li className="rounded-2xl bg-white/85 ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] p-3">
      <div className="flex items-start gap-3">
        <span className={`w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5 ${soon ? 'bg-[#f1e8d9] text-[#9a8b7b]' : 'bg-[#7a2028]/[0.08] text-[#7a2028]'}`}>
          {ICON[g.id] ?? <Gamepad2 />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <h3 className="min-w-0 pt-[3px] font-serif-ge text-[15.5px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">
              {g.title}{g.like && <span className="font-normal text-[#8a7a6a]"> ({g.like})</span>}
            </h3>
            {g.about && (
              <button
                type="button"
                onClick={() => { triggerHaptic(5); setInfo(o => !o); }}
                aria-expanded={info}
                aria-controls={infoId}
                aria-label={`რა არის „${g.title}“`}
                title="რა არის"
                className={`w-9 h-9 -my-1.5 shrink-0 rounded-full flex items-center justify-center cursor-pointer transition-colors ${info ? 'bg-[#7a2028]/[0.1] text-[#7a2028]' : 'text-[#a8998a] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.07]'}`}
              >
                <Info className="w-[18px] h-[18px]" />
              </button>
            )}
            {soon && <Pill tone="amber" className="!h-6 shrink-0">მალე</Pill>}
          </div>
          <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{g.text}</p>
          {meta && <p className="mt-1 text-[12px] font-bold tabular-nums text-[#7a2028]">{meta}</p>}
        </div>
      </div>
      {info && g.about && (
        <p id={infoId} className="mt-2.5 rounded-xl bg-[#fbf6ec] ring-1 ring-[#efe3cf] px-3.5 py-2.5 text-[13px] leading-relaxed text-[#5a4a3c]">{g.about}</p>
      )}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {g.modes.map(m => <ModeBtn key={m} g={g} mode={m} soon={soon} onPlay={onPlay} />)}
      </div>
    </li>
  );
};

export const GamesPage: React.FC = () => {
  const { navigateTo, mapItem, openMapItem } = useNavigation();
  const { user } = useAuth();
  const access = useAccess();
  const { pearls, shine, loaded } = usePearls(user?.uid);
  const hangi = useHangi();
  const sitqva = useDailyRecord('sitqva');
  const otkheuli = useDailyRecord('otkheuli');
  const [soon, setSoon] = useState<string | null>(null);
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

  // the pearls card shows how far the member is; a daily game's card today's result or the streak
  const pearlIds = CHESTS.flatMap(c => c.pearls);
  const polished = pearlIds.filter(id => { const s = pearlState(pearls[id], shine[id]); return s === 'polished' || s === 'shining'; }).length;
  const pearlMeta = user && loaded ? `გაპრიალებული ${polished}/${pearlIds.length}` : undefined;
  const meta = (g: GameDef) =>
    g.id === 'margalitebi' ? pearlMeta
      : g.id === 'dghis-hangi' && hangi.loaded ? hangiMeta(hangi.days, today)
      : g.id === 'dghis-sitqva' && sitqva.loaded ? hangiMeta(sitqva.days, today)
      : g.id === 'otkheuli' && otkheuli.loaded ? otkheuliMeta(otkheuli.days, today)
      : undefined;

  const play = (g: GameDef, state: Access, mode: GameMode) => {
    triggerHaptic(10);
    if (state === 'locked') { askSignIn(g.title); return; }
    if (state !== 'open') { setSoon(`„${g.title}“ ჯერ მზადდება — მალე დაემატება`); return; }
    // a game played in a class's room („სამშვილდის ღამე“, the quick games) opens on the variant tapped
    if (isRoomGame(g.item)) requestOpen(g.item, mode === 'online' ? 'online' : 'table');
    if (g.item) { openMapItem(g.item); return; }
    if (g.page) { if (g.panel) openPathPanel(g.panel); navigateTo(g.page); }
  };

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Card tone="wine" className="!p-4 sm:!p-5">
        <p className="font-serif-ge text-[17px] font-bold leading-snug">ითამაშე და ისწავლე</p>
        <p className="mt-1 text-[13px] leading-snug text-[#fbf6ec]/85">ყველა თამაში ერთ სიაშია, თითოეულს თავისი ვარიანტები აქვს:</p>
        <ul className="mt-2 space-y-1.5 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          {(Object.keys(MODE_LABEL) as GameMode[]).map(m => {
            const Ic = MODE_ICON[m];
            return (
              <li key={m} className="flex items-start gap-2">
                <Ic className="w-4 h-4 mt-px shrink-0 text-[#e2c27a]" />
                <span><span className="font-bold text-[#fbf6ec]">{MODE_LABEL[m]}</span> — {MODE_HINT[m]}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2.5 text-[12px] tabular-nums text-[#fbf6ec]/70">მზადაა {cards.length - building} თამაში{building > 0 && ` · მზადდება ${building}`}</p>
      </Card>

      <ul className="space-y-2.5">
        {cards.map(({ g, state }) => (
          <GameCard key={g.id} g={g} state={state} meta={meta(g)} onPlay={m => play(g, state, m)} />
        ))}
      </ul>

      <Toast message={soon || ''} type="info" isVisible={!!soon} onClose={() => setSoon(null)} />
    </div>
  );
};

export default GamesPage;
