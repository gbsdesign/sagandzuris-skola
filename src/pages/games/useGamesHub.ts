import { useMemo, useState } from 'react';
import { useNavigation } from '../../context';
import { useAccess } from '../../hooks/useAccess';
import { useHangi } from '../../hooks/useHangi';
import { useDailyRecord } from '../../hooks/useDailyRecord';
import { hangiMeta, tbilisiToday } from '../../utils/hangi';
import { otkheuliMeta } from '../../utils/otkheuli';
import { badeMeta } from '../../utils/bade';
import { tsMeta } from '../../utils/tsartsera';
import { khaziMeta } from '../../utils/khazi';
import { anbaniMeta } from '../../utils/anbani';
import { tabuMeta } from '../../utils/tabuDay';
import { vinMeta } from '../../utils/vin';
import { saidumloMeta } from '../../utils/saidumlo';
import { utskhoMeta } from '../../utils/utskho';
import { dzebnaMeta } from '../../utils/dzebna';
import { requestOpen, type OpenTarget } from '../../utils/searchOpen';
import { isRoomGame } from '../../utils/gameRoom';
import { DAILY_GAMES, GAMES, GAME_GROUPS, type GameDef, type GameMode } from '../../data/games';
import { askSignIn } from '../../components/access/SignInPrompt';
import { openPathPanel } from '../../components/views/pathPanelOpen';
import { triggerHaptic } from '../../utils/haptics';

// The games hub's data and its one way of opening a game, shared by both looks (pages/GamesPage.tsx, pages/v2/tamashebi):
// which games show (a game's app variants follow its section's switch, a printed kit is always there), each daily game's
// line for today, the headings' lists and the daily tiles.

export type GameAccess = ReturnType<ReturnType<typeof useAccess>['section']>;
export interface HubCard { g: GameDef; state: GameAccess }

/** how well a search fits a game: every word must be in its name, its known game, its line or its ⓘ — the name counts most */
const fold = (t: string) => t.toLocaleLowerCase('ka').replace(/[„“"'()!?.,:;·—–-]/g, ' ').replace(/\s+/g, ' ').trim();
export const scoreOf = (g: GameDef, q: string) => {
  const parts: [string, number][] = [[fold(g.title), 8], [fold(g.like ?? ''), 4], [fold(g.text), 2], [fold(g.about ?? ''), 1]];
  let total = 0;
  for (const w of fold(q).split(' ').filter(Boolean)) {
    const best = Math.max(0, ...parts.map(([t, weight]) => (t.includes(w) ? weight : 0)));
    if (!best) return 0;
    total += best;
  }
  return total;
};

/** the games whose page has a variant to open on (a class's room, teams on one phone…) */
const ON_VARIANT = new Set(['gundi', 'sitqva', 'otkheuli', 'bade', 'tsartsera', 'khazi', 'chaitsvi', 'anbani', 'tsikhe', 'tsinapari', 'tabu',
  'minishneba', 'vin', 'saidumlo', 'utskho', 'dzebna', 'ezo']);

export const useGamesHub = () => {
  const { navigateTo, openMapItem } = useNavigation();
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
  const [soon, setSoon] = useState<string | null>(null);
  const today = useMemo(() => tbilisiToday(), []);

  // a game's app variants follow its section's switch and the member's features; a printed kit is always there
  const cards: HubCard[] = GAMES.flatMap(g => {
    const state = (g.section ? access.section(g.section) : 'open') as GameAccess;
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
      : undefined;

  // a daily game played today (its record: the member's, the device's for guests)
  const RECORD: Record<string, { days: Record<string, { done?: boolean }>; loaded: boolean }> = {
    'dghis-hangi': hangi, 'dghis-sitqva': sitqva, otkheuli, 'asoebis-bade': bade, 'khutsuri-tsartsera': tsartsera, 'drois-khazi': khazi,
    'nu-itqvi': tabu, 'vin-var-me': vin, 'saidumlo-sakhelebi': saidumlo, 'utskho-sopelshi': utskho, 'sagandzuris-dzebna': dzebna,
  };
  const dayDone = (id: string) => { const r = RECORD[id]; return !!r?.loaded && !!r.days[today]?.done; };

  const play = (g: GameDef, state: GameAccess, mode: GameMode) => {
    triggerHaptic(10);
    if (state === 'locked') { askSignIn(g.title); return; }
    if (state !== 'open') { setSoon(`„${g.title}“ ჯერ მზადდება — მალე დაემატება`); return; }
    // a game played in a class's room („სამშვილდის ღამე“, the quick games), „ჩემი გუნდი“ and the word games with teams open
    // on the variant tapped
    if (isRoomGame(g.item) || (g.item && ON_VARIANT.has(g.item))) requestOpen(g.item as OpenTarget, mode === 'online' ? 'online' : 'table');
    if (g.item) { openMapItem(g.item); return; }
    if (g.page) { if (g.panel) openPathPanel(g.panel); navigateTo(g.page); }
  };

  const byId = new Map(cards.map(c => [c.g.id, c]));
  const groups = GAME_GROUPS.map(gr => ({ ...gr, list: gr.games.flatMap(id => byId.get(id) ?? []) })).filter(gr => gr.list.length);
  // the daily games whose day's game (online) is there, with today's mark
  const daily = DAILY_GAMES.flatMap(id => {
    const c = byId.get(id);
    return c && c.g.modes.includes('online') && c.state !== 'hidden' ? [{ ...c, done: !!dayDone(id) }] : [];
  });
  const search = (query: string) => (query.trim()
    ? cards.map(c => ({ c, score: scoreOf(c.g, query) })).filter(x => x.score > 0).sort((a, b) => b.score - a.score).map(x => x.c)
    : null);

  return { cards, byId, groups, daily, films, meta, dayDone, play, search, soon, setSoon };
};
