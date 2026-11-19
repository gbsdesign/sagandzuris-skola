import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Check, ChevronDown, Clapperboard, Drama, Gamepad2, Info, Loader2, Search, Smile, X } from 'lucide-react';
import { useNavigation } from '../context';
import { Pill, Tabs } from '../components/ui/kit';
import { setGameSearchOpen, useGameSearchOpen } from '../components/maps/songSearch';
import { Toast } from '../components/ui/Toast';
import { triggerHaptic } from '../utils/haptics';
import type { GameDef } from '../data/games';
import { GAME_ICON as ICON } from '../components/games/gameIcons';
import { INNER_GAMES as INNER, GameWaiting } from './games/inner';
import { useGamesHub, type GameAccess as Access } from './games/useGamesHub';

import type { FilmKind } from '../data/georgianFilms';
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

/** which kinds' headings are unfolded — kept for the visit (2026-11-09, the user: the chips went, the headings fold) */
const OPEN_KEY = 'sg-games-open';
const readOpen = (): string[] => {
  try { const v = JSON.parse(sessionStorage.getItem(OPEN_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};

export const GamesPage: React.FC = () => {
  const { mapItem, openMapItem, handleGoBack } = useNavigation();
  const { cards, groups, daily, films, meta, play, search, soon, setSoon } = useGamesHub();
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

  const Inner = mapItem ? INNER[mapItem] : undefined;
  if (Inner) return <Suspense fallback={<GameWaiting />}><Inner /></Suspense>;
  // a film open from a tab: `kino/<YouTube id>` (the bar's „უკან“ closes it); an old `kino` opens the films' tab
  const [kinoList, kinoFilm] = (mapItem ?? '').split('/');
  const inKino = kinoList === 'kino';

  const card = ({ g, state }: { g: GameDef; state: Access }) => <GameCard key={g.id} g={g} state={state} meta={meta(g)} onOpen={() => play(g, state, 'online')} />;
  const found = search(query);

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
