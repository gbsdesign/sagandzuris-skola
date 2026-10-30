import React, { useMemo, useState } from 'react';
import {
  Brain, Castle, ChevronRight, Crown, Dice5, Flame, Gamepad2, Gem, Headphones, Landmark, LayoutGrid, Map, MessageCircle, Music, Printer, Route,
  Shapes, SpellCheck, Users,
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
import RaSadRodisGame from './games/RaSadRodisGame';
import SamshvildeGame from './games/SamshvildeGame';

// „თამაშები“: the hub of the games (2026-10-27). Three categories as tabs — მუსიკალური · ქართული · ცოცხალი — and a
// row per game with the variants it gets (ონლაინ · ჰიბრიდული · უტელეფონო). A built game opens its page: the games that live
// inside this page („დღის ჰანგი“, „ამიხსენი“ — pages/games/) are `mapItem`, so the top bar's „←“ returns to the hub; the pearls
// game stays the round button of „საგანძურის გზა“, under a switch of its own in the admin panel. A game still being built is a
// „მალე“ row that only says so when tapped; the board games are made on paper — a card and the strip that opens their
// sheets („სამშვილდის ღამე“'s card also opens its phone version). The catalogue is data/games.ts.

type Access = ReturnType<ReturnType<typeof useAccess>['section']>;

const CAT_ICON: Record<GameCategory, React.ComponentType<{ className?: string }>> = { musical: Music, georgian: Castle, live: Users };

const ICON: Record<string, React.ReactNode> = {
  margalitebi: <Gem />, 'dghis-hangi': <Headphones />, 'dghis-sitqva': <SpellCheck />, otkheuli: <Shapes />,
  amikhseni: <MessageCircle />, gatvla: <Dice5 />, 'tskheli-churchkhela': <Flame />, 'ra-sad-rodis': <Brain />,
  'okros-khana': <Map />, 'samshvildis-ghame': <Castle />, qaravani: <Route />, 'ori-takhti': <Crown />, 'lurji-supra': <LayoutGrid />, 'mepis-kari': <Landmark />,
};

// the games that open inside this page, by their `mapItem`
const INNER: Record<string, React.FC> = {
  hangi: HangiGame, amikhseni: AmikhseniGame, sitqva: SitqvaGame, otkheuli: OtkheuliGame, gatvla: GatvlaGame, churchkhela: ChurchkhelaGame, rsr: RaSadRodisGame,
  samshvilde: SamshvildeGame,
};

// the category stays chosen on this device
const CAT_KEY = 'sg-games-cat';
const rememberedCat = (): GameCategory => {
  try {
    const v = localStorage.getItem(CAT_KEY);
    if (v === 'musical' || v === 'georgian' || v === 'live') return v;
  } catch { /* storage off */ }
  return 'musical';
};

const GameRow: React.FC<{ g: GameDef; state: Access; meta?: string; onOpen?: () => void }> = ({ g, state, meta, onOpen }) => {
  // a game made only on paper (the board games) has nothing to open in the app: a plain card, its strip opens the sheets
  const paperOnly = !!g.print && !g.page && !g.item;
  const ready = paperOnly || state === 'open' || state === 'locked';
  const body = (
    <>
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
          {g.modes.map(m => <Pill key={m} tone={ready || (m === 'noPhone' && g.print) ? 'wine' : 'muted'} className="!h-6">{MODE_LABEL[m]}</Pill>)}
          {meta && <span className="text-[12px] font-bold tabular-nums text-[#7a2028]">{meta}</span>}
        </span>
      </span>
      {ready && !paperOnly && <ChevronRight className="w-5 h-5 shrink-0 text-[#b3a593]" />}
    </>
  );
  const look = ready ? 'bg-white/85 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)]' : 'bg-white/50 ring-[#ece2d2]';

  // a game already made on paper (the board games, the word games' „უტელეფონო“): a strip under the card opens its sheets
  if (g.print) {
    const head = 'w-full flex items-center gap-3 px-3 pt-3 pb-2.5 text-left';
    return (
      <li className={`rounded-2xl ring-1 overflow-hidden ${look}`}>
        {paperOnly ? <div className={head}>{body}</div> : (
          <button
            type="button"
            onClick={onOpen}
            className={`${head} cursor-pointer transition-colors hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7a2028]/40`}
          >
            {body}
          </button>
        )}
        <a
          href={g.print.href}
          target="_blank"
          rel="noopener"
          className="mx-3 mb-3 flex items-center gap-2.5 h-11 px-3.5 rounded-xl bg-[#7a2028] text-[#fbf6ec] shadow-[0_1px_2px_rgba(74,52,38,0.15)] transition-[background-color,transform] hover:bg-[#6a1b22] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7a2028]/50"
        >
          <Printer className="w-[18px] h-[18px] shrink-0" />
          <span className="min-w-0 truncate text-[14px] font-bold leading-none">დასაბეჭდი ფურცლები</span>
          <span className="ml-auto shrink-0 whitespace-nowrap text-[12px] tabular-nums leading-none text-[#fbf6ec]/80"><span className="hidden min-[400px]:inline">PDF · </span>{g.print.sheets} ფურცელი</span>
        </a>
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`w-full flex items-center gap-3 px-3 py-3 min-h-16 rounded-2xl text-left ring-1 cursor-pointer transition-[background-color,transform] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a2028]/40 ${look} ${ready ? 'hover:bg-white' : 'hover:bg-white/70'}`}
      >
        {body}
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
  const building = rows.filter(r => r.state === 'soon').length;
  const ready = rows.length - building + BOARD_GAMES.length; // the board games are ready on paper

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
    setSoon(g.print ? `„${g.title}“: დასაბეჭდი ფურცლები მზადაა (ქვემოთ); აპის ვერსია მზადდება` : `„${g.title}“ ჯერ მზადდება — მალე დაემატება`);
  };

  const category = GAME_CATEGORIES.find(c => c.id === cat);

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Card tone="wine" className="!p-4 sm:!p-5">
        <p className="font-serif-ge text-[17px] font-bold leading-snug">ითამაშე და ისწავლე</p>
        <p className="mt-1 text-[13px] leading-snug text-[#fbf6ec]/85">სამი კატეგორია და სამი ვარიანტი:</p>
        <ul className="mt-2 space-y-1 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          {(Object.keys(MODE_LABEL) as GameMode[]).map(m => (
            <li key={m}><span className="font-bold text-[#fbf6ec]">{MODE_LABEL[m]}</span> — {MODE_HINT[m]}</li>
          ))}
        </ul>
        <p className="mt-2.5 text-[12px] tabular-nums text-[#fbf6ec]/70">მზადაა {ready}{building > 0 && ` · მზადდება ${building}`}</p>
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
          <p className="px-1 mb-2.5 text-[12.5px] leading-snug text-[#8a7a6a]">ექვსი ცნობილი თამაში ქართულ თემაზე — სკოლა თვითონ დაბეჭდავს და ააწყობს. „დასაბეჭდი ფურცლები“ — ბარათები, წესები და ყველაფერი ჭრის ნიშნებით.</p>
          <ul className="space-y-2.5">
            {BOARD_GAMES.map(g => {
              // a board game with a phone version opens it while the games' section lets it; otherwise only its paper card
              const state: Access = g.item && g.section ? access.section(g.section) : 'open';
              const app = !!g.item && (state === 'open' || state === 'locked');
              return app
                ? <GameRow key={g.id} g={g} state={state} onOpen={() => open(g, state)} />
                : <GameRow key={g.id} g={{ ...g, page: undefined, item: undefined, modes: ['noPhone'] }} state="open" />;
            })}
          </ul>
        </section>
      )}

      <Toast message={soon || ''} type="info" isVisible={!!soon} onClose={() => setSoon(null)} />
    </div>
  );
};

export default GamesPage;
