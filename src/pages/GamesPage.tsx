import React, { useMemo, useState } from 'react';
import {
  AudioLines, Brain, CalendarRange, Castle, ChevronRight, Crown, Dice5, Flame, Gamepad2, Gem, Headphones, Landmark, LayoutGrid, Map, MessageCircle,
  Moon, Music, Music2, Printer, Route, ScrollText, Search, Shapes, SpellCheck, Users,
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
import { BOARD_GAMES, GAME_CATEGORIES, GAMES, GameCategory, GameDef, GameMode, MODE_HINT, MODE_LABEL } from '../data/games';
import { Card, Pill, Tabs } from '../components/ui/kit';
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

// „თამაშები“: the hub of the games (2026-10-27). Three categories as tabs — მუსიკალური · ქართული · ცოცხალი — and a
// row per game with the variants it gets (ონლაინ · ჰიბრიდული · უტელეფონო). A built game opens its page: the games that live
// inside this page („დღის ჰანგი“, „ამიხსენი“ — pages/games/) are `mapItem`, so the top bar's „←“ returns to the hub; the pearls
// game stays the round button of „საგანძურის გზა“, under a switch of its own in the admin panel. The rest are the plan's next
// games, „მალე“ rows that only say so when tapped. The catalogue is data/games.ts.

type Access = ReturnType<ReturnType<typeof useAccess>['section']>;

const CAT_ICON: Record<GameCategory, React.ComponentType<{ className?: string }>> = { musical: Music, georgian: Castle, live: Users };

const ICON: Record<string, React.ReactNode> = {
  margalitebi: <Gem />, 'dghis-hangi': <Headphones />, 'sam-notshi': <Music2 />, eko: <AudioLines />, 'khmis-tsqvilebi': <LayoutGrid />,
  'dghis-sitqva': <SpellCheck />, otkheuli: <Shapes />, 'drois-khazi': <CalendarRange />, khutsuri: <ScrollText />, 'asoebis-bade': <Search />,
  amikhseni: <MessageCircle />, gatvla: <Dice5 />, 'tskheli-churchkhela': <Flame />, 'ra-sad-rodis': <Brain />, mtsqemsebi: <Moon />,
  'okros-khana': <Map />, 'samshvildis-ghame': <Castle />, qaravani: <Route />, 'ori-takhti': <Crown />, 'lurji-supra': <LayoutGrid />, 'mepis-kari': <Landmark />,
};

// the games that open inside this page, by their `mapItem`
const INNER: Record<string, React.FC> = { hangi: HangiGame, amikhseni: AmikhseniGame, sitqva: SitqvaGame, otkheuli: OtkheuliGame, gatvla: GatvlaGame, churchkhela: ChurchkhelaGame };

// the category stays chosen on this device
const CAT_KEY = 'sg-games-cat';
const rememberedCat = (): GameCategory => {
  try {
    const v = localStorage.getItem(CAT_KEY);
    if (v === 'musical' || v === 'georgian' || v === 'live') return v;
  } catch { /* storage off */ }
  return 'musical';
};

const GameRow: React.FC<{ g: GameDef; state: Access; meta?: string; onOpen: () => void }> = ({ g, state, meta, onOpen }) => {
  const ready = state === 'open' || state === 'locked';
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`w-full flex items-center gap-3 px-3 py-3 min-h-16 rounded-2xl text-left ring-1 cursor-pointer transition-[background-color,transform] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a2028]/40 ${
          ready ? 'bg-white/85 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] hover:bg-white' : 'bg-white/50 ring-[#ece2d2] hover:bg-white/70'
        }`}
      >
        <span className={`w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5 ${ready ? 'bg-[#7a2028]/[0.08] text-[#7a2028]' : 'bg-[#f1e8d9] text-[#9a8b7b]'}`}>
          {ICON[g.id] ?? <Gamepad2 />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`font-serif-ge text-[15px] font-bold leading-snug ${ready ? 'text-[#4a3426]' : 'text-[#6b5b4b]'}`}>{g.title}</span>
            {g.original && <span className="text-[12px] text-[#9a8b7b]">{g.original}</span>}
            {!ready && <Pill tone="amber" className="!h-6">მალე</Pill>}
          </span>
          <span className="block mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{g.text}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {g.modes.map(m => <Pill key={m} tone={ready ? 'wine' : 'muted'} className="!h-6">{MODE_LABEL[m]}</Pill>)}
            {meta && <span className="text-[12px] font-bold tabular-nums text-[#7a2028]">{meta}</span>}
          </span>
        </span>
        {ready && <ChevronRight className="w-5 h-5 shrink-0 text-[#b3a593]" />}
      </button>
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
  const [cat, setCat] = useState<GameCategory>(rememberedCat);
  const [soon, setSoon] = useState<string | null>(null);
  const today = useMemo(() => tbilisiToday(), []);

  const Inner = mapItem ? INNER[mapItem] : undefined;
  if (Inner) return <Inner />;

  const pick = (c: GameCategory) => {
    setCat(c);
    try { localStorage.setItem(CAT_KEY, c); } catch { /* storage off */ }
  };

  // a built game follows its section's switch and the member's features; the rest are „მალე“
  const rows = GAMES.map(g => ({ g, state: (g.section ? access.section(g.section) : 'soon') as Access })).filter(r => r.state !== 'hidden');
  const inCat = rows.filter(r => r.g.category === cat);
  const ready = rows.filter(r => r.state === 'open' || r.state === 'locked').length;
  const total = rows.length + BOARD_GAMES.length;

  // the pearls row shows how far the member is; the daily game's row today's result or the streak
  const pearlIds = CHESTS.flatMap(c => c.pearls);
  const polished = pearlIds.filter(id => { const s = pearlState(pearls[id], shine[id]); return s === 'polished' || s === 'shining'; }).length;
  const pearlMeta = user && loaded ? `გაპრიალებული ${polished}/${pearlIds.length}` : undefined;
  const meta = (g: GameDef) =>
    g.id === 'margalitebi' ? pearlMeta
      : g.id === 'dghis-hangi' && hangi.loaded ? hangiMeta(hangi.days, today)
      : g.id === 'dghis-sitqva' && sitqva.loaded ? hangiMeta(sitqva.days, today)
      : g.id === 'otkheuli' && otkheuli.loaded ? otkheuliMeta(otkheuli.days, today)
      : undefined;

  const open = (g: GameDef, state: Access) => {
    triggerHaptic(10);
    if (state === 'locked') { askSignIn(g.title); return; }
    if (state === 'open' && g.item) { openMapItem(g.item); return; }
    if (state === 'open' && g.page) { if (g.panel) openPathPanel(g.panel); navigateTo(g.page); return; }
    setSoon(`„${g.title}“ ჯერ მზადდება — მალე დაემატება`);
  };

  const category = GAME_CATEGORIES.find(c => c.id === cat);

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Card tone="wine" className="!p-4 sm:!p-5">
        <p className="font-serif-ge text-[17px] font-bold leading-snug">ითამაშე და ისწავლე</p>
        <p className="mt-1 text-[13px] leading-snug text-[#fbf6ec]/85">სამი კატეგორია. ყველა თამაშს სამი ვარიანტი ექნება:</p>
        <ul className="mt-2 space-y-1 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          {(Object.keys(MODE_LABEL) as GameMode[]).map(m => (
            <li key={m}><span className="font-bold text-[#fbf6ec]">{MODE_LABEL[m]}</span> — {MODE_HINT[m]}</li>
          ))}
        </ul>
        <p className="mt-2.5 text-[12px] tabular-nums text-[#fbf6ec]/70">მზადაა {ready} · მზადდება {total - ready}</p>
      </Card>

      <Tabs items={GAME_CATEGORIES.map(c => ({ id: c.id, label: c.label, Icon: CAT_ICON[c.id] }))} value={cat} onChange={pick} />
      {category && <p className="px-1 text-[13px] leading-snug text-[#8a7a6a]">{category.text}</p>}

      <ul className="space-y-2.5">
        {inCat.map(({ g, state }) => (
          <GameRow key={g.id} g={g} state={state} meta={meta(g)} onOpen={() => open(g, state)} />
        ))}
      </ul>

      {cat === 'live' && (
        <section className="pt-2">
          <div className="flex items-center gap-2 px-1 mb-1">
            <Printer className="w-4 h-4 shrink-0 text-[#7a2028]" />
            <h2 className="font-serif-ge text-[15px] font-bold text-[#4a3426]">სამაგიდო თამაშები ქართულად</h2>
          </div>
          <p className="px-1 mb-2.5 text-[12.5px] leading-snug text-[#8a7a6a]">ექვსი ცნობილი თამაში ქართულ თემაზე — სკოლა თვითონ დაბეჭდავს და ააწყობს; მერე ჰიბრიდული და ონლაინ ვარიანტებიც.</p>
          <ul className="space-y-2.5">
            {BOARD_GAMES.map(g => <GameRow key={g.id} g={g} state="soon" onOpen={() => open(g, 'soon')} />)}
          </ul>
        </section>
      )}

      <Toast message={soon || ''} type="info" isVisible={!!soon} onClose={() => setSoon(null)} />
    </div>
  );
};

export default GamesPage;
