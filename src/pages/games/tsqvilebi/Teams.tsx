import React, { useEffect, useState } from 'react';
import { Minus, Play, Plus, RotateCcw, Trophy, Users } from 'lucide-react';
import { tsqGroups } from '../../../data/tsqvilebiPool';
import {
  TSQ_RULES, drawTsqvilebi, isClear, newBoard, pairOf, parseBoard, type TsqBoard, type TsqvilebiQ,
} from '../../../utils/tsqvilebi';
import { MAX_TEAMS, MIN_TEAMS } from '../../../utils/roundGames';
import { TEAM_NAMES } from '../../../utils/amikhseni';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn, Card, FIELD, askConfirm } from '../../../components/ui/kit';
import { Hint } from '../samshvilde/parts';
import { readHybridConf, type HybridConf } from '../rounds/RoundsHybrid';
import { Podium, Standings } from '../rounds/parts';
import { Board, TEAM_TINT, useBoardPlay } from './Board';
import { BoardLine } from './face';
import { PairsList } from './Pairs';
import { TsqvilebiOptions } from './Options';
import { TEAMS_CONF, TEAMS_GAME, loadKey, readSeen, rememberAsked, save, sizes, modes, whats } from './store';

// „ხმის წყვილები“ on one phone (the plan's hybrid): the phone on the table, 2–6 teams in turn open two cards; a team that finds a
// pair goes again, a miss passes the turn on. A found pair takes its team's colour. The most pairs win. The game is kept on this
// phone after every move, so ✕ only pauses it.

interface Game {
  v: 1;
  q: TsqvilebiQ;
  board: TsqBoard;
  names: string[];
  /** the team that began this board (the next board begins with the one after it), and whose turn it is */
  first: number;
  turn: number;
  /** a pair's finder (a team), -1 while it is not found */
  owner: number[];
  /** the last move: who, and whether it found a pair */
  last: { team: number; found: boolean } | null;
  over: boolean;
}

const parseGame = (raw: unknown): Game | null => {
  const g = raw as Partial<Game> | null;
  if (!g || g.v !== 1 || !TSQ_RULES.valid(g.q) || g.over) return null;
  const board = parseBoard(g.board, g.q.cards.length);
  const names = g.names;
  if (!board || !Array.isArray(names) || names.length < MIN_TEAMS || names.length > MAX_TEAMS || !names.every(n => typeof n === 'string')) return null;
  const owner = g.owner;
  if (!Array.isArray(owner) || owner.length !== g.q.items.length || !owner.every(t => Number.isInteger(t) && t >= -1 && t < names.length)) return null;
  const seat = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < names.length;
  if (!seat(g.turn)) return null;
  return { v: 1, q: g.q, board: { ...board, open: [] }, names, first: seat(g.first) ? g.first! : 0, turn: g.turn!, owner, last: null, over: false };
};

const countOf = (g: Pick<Game, 'names' | 'owner'>) => g.names.map((_, t) => g.owner.filter(o => o === t).length);

const TeamChips: React.FC<{ g: Game }> = ({ g }) => {
  const counts = countOf(g);
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="გუნდები">
      {g.names.map((n, t) => {
        const on = t === g.turn && !g.over;
        return (
          <li
            key={t}
            className={`h-10 pl-2.5 pr-3 rounded-full inline-flex items-center gap-2 text-[13.5px] font-bold ${on ? 'text-white shadow-[0_2px_6px_rgba(74,52,38,0.25)]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}
            style={on ? { background: TEAM_TINT[t] } : undefined}
            aria-current={on ? 'true' : undefined}
          >
            <span className="w-3 h-3 rounded-full" style={{ background: on ? '#ffffff' : TEAM_TINT[t] }} aria-hidden="true" />
            <span className="max-w-[8rem] truncate">{n}</span>
            <span className="tabular-nums">{counts[t]}</span>
          </li>
        );
      })}
    </ul>
  );
};

const TeamsGame: React.FC<{ g: Game; setG: (g: Game) => void; onClose: () => void; onAgain: () => void }> = ({ g, setG, onClose, onAgain }) => {
  const { q, board } = g;
  const play = useBoardPlay({
    items: q.items, cards: q.cards, mode: q.mode, board,
    apply: (b, event, card) => {
      if (event === 'match') {
        const owner = g.owner.slice();
        owner[pairOf(q.cards[card])] = g.turn;
        setG({ ...g, board: b, owner, last: { team: g.turn, found: true } });
      } else if (event === 'miss') {
        setG({ ...g, board: b, turn: (g.turn + 1) % g.names.length, last: { team: g.turn, found: false } });
      } else setG({ ...g, board: b, last: event === 'close' ? g.last : null });
    },
  });
  const clear = isClear(board);
  // the last pair is seen turning before the end shows
  useEffect(() => {
    if (!clear || g.over) return;
    const t = window.setTimeout(() => setG({ ...g, over: true }), 1100);
    return () => window.clearTimeout(t);
  }, [clear, g, setG]);
  const tint = (pair: number) => (g.owner[pair] >= 0 ? TEAM_TINT[g.owner[pair]] : null);

  if (g.over) {
    const counts = countOf(g);
    return (
      <TableScreen
        title="ხმის წყვილები"
        onClose={onClose}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-14 !text-[15.5px]">დახურვა</Btn>
            <Btn size="lg" full onClick={onAgain} icon={<RotateCcw />} className="!h-14 !text-[15.5px]">ახალი დაფა</Btn>
          </div>
        )}
      >
        <div className="py-2 space-y-4">
          <div className="text-center">
            <Trophy className="w-9 h-9 mx-auto text-[#c9a227]" />
            <p className="mt-1 font-serif-ge text-[22px] font-bold text-[#4a3426]">დაფა გაიწმინდა!</p>
            <Hint>{board.moves} სვლა · {q.items.length} წყვილი</Hint>
          </div>
          <Podium names={g.names} scores={counts} />
          <Standings names={g.names} scores={counts} />
          <PairsList items={q.items} tint={tint} />
        </div>
      </TableScreen>
    );
  }

  const last = g.last;
  const who = g.names[g.turn];
  return (
    <TableScreen title="ხმის წყვილები" onClose={onClose}>
      <div className="py-2 space-y-3">
        <TeamChips g={g} />
        <p className="min-h-[1.75rem] font-serif-ge text-[17px] font-bold leading-snug" role="status" style={{ color: TEAM_TINT[g.turn] }}>
          {clear ? 'დაფა გაიწმინდა!'
            : last?.found ? `${g.names[last.team]} — წყვილი! კიდევ ერთხელ.`
              : last ? `ვერა. ახლა: ${who}`
                : `ჯერი: ${who}`}
        </p>
        <BoardLine board={board} pairs={q.items.length} />
        <Board items={q.items} cards={q.cards} mode={q.mode} board={board} play={play} tint={i => tint(pairOf(q.cards[i]))} />
        <Hint className="text-center">გუნდი ორ ბარათს ხსნის. ხმიან ბარათზე ხელახლა დაჭერა ხმას ისევ რთავს.</Hint>
      </div>
    </TableScreen>
  );
};

export const TsqvilebiTeams: React.FC = () => {
  const [conf, setConfState] = useState<HybridConf>(() => readHybridConf(loadKey(TEAMS_CONF)));
  const setConf = (c: HybridConf) => { setConfState(c); save(TEAMS_CONF, { teams: c.teams, names: c.names }); };
  const [game, setGameState] = useState<Game | null>(() => parseGame(loadKey(TEAMS_GAME)));
  const [open, setOpen] = useState(false);
  const [empty, setEmpty] = useState(false);
  const setGame = React.useCallback((g: Game | null) => { setGameState(g); save(TEAMS_GAME, g && !g.over ? g : null); }, []);

  const deal = (names: string[], first = 0): Game | null => {
    const [q] = drawTsqvilebi({ groups: tsqGroups(whats.read()), count: 1, pairs: sizes.read() / 2, mode: modes.read(), seen: readSeen() });
    if (!q) return null;
    rememberAsked(q.items.map(it => it.id));
    return { v: 1, q, board: newBoard(q.cards.length), names, first, turn: first, owner: q.items.map(() => -1), last: null, over: false };
  };
  const start = async () => {
    if (game && !game.over && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
    const g = deal(conf.names.slice(0, conf.teams).map(n => n.trim() || 'გუნდი'));
    if (!g) { setEmpty(true); return; }
    setEmpty(false);
    setGame(g);
    setOpen(true);
  };
  const again = () => {
    if (!game) return;
    // the next board: the team after the last board's first one begins
    const g = deal(game.names, (game.first + 1) % game.names.length);
    if (g) setGame(g);
  };

  if (open && game) return <TeamsGame g={game} setG={setGame} onClose={() => setOpen(false)} onAgain={again} />;

  const paused = game && !game.over ? game : null;
  return (
    <div className="space-y-4">
      {paused && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული დაფა · {paused.board.pairs} / {paused.q.items.length} წყვილი</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{paused.names.join(' · ')}</p>
            </div>
            <Btn onClick={() => setOpen(true)} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <Card className="!p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Users className="w-4 h-4 text-[#7a2028]" /> გუნდები · {conf.teams}</p>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="ერთით ნაკლები" disabled={conf.teams <= MIN_TEAMS} onClick={() => { triggerHaptic(5); setConf({ ...conf, teams: conf.teams - 1 }); }} className="w-11 h-11 rounded-full flex items-center justify-center text-[#7a2028] ring-1 ring-[#e8dcc8] bg-white disabled:opacity-35 cursor-pointer disabled:cursor-default"><Minus className="w-4 h-4" /></button>
            <button type="button" aria-label="ერთით მეტი" disabled={conf.teams >= MAX_TEAMS} onClick={() => { triggerHaptic(5); setConf({ ...conf, teams: conf.teams + 1 }); }} className="w-11 h-11 rounded-full flex items-center justify-center text-[#7a2028] ring-1 ring-[#e8dcc8] bg-white disabled:opacity-35 cursor-pointer disabled:cursor-default"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {conf.names.slice(0, conf.teams).map((n, i) => (
            <div key={i} className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full" style={{ background: TEAM_TINT[i] }} aria-hidden="true" />
              <input
                value={n}
                maxLength={16}
                aria-label={`გუნდი ${i + 1}`}
                onChange={e => setConf({ ...conf, names: conf.names.map((x, k) => (k === i ? e.target.value : x)) })}
                onBlur={() => { if (!conf.names[i].trim()) setConf({ ...conf, names: conf.names.map((x, k) => (k === i ? TEAM_NAMES[i] : x)) }); }}
                className={`${FIELD} !h-11 !pl-8 !text-[14px] font-bold`}
              />
            </div>
          ))}
        </div>
        <TsqvilebiOptions />
        {empty && <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-2.5 text-[13px] font-bold leading-snug text-amber-800">ხმები ვერ მოიძებნა.</p>}
        <Btn size="lg" full onClick={() => { void start(); }} icon={<Play />} className="!h-14 !text-[16px]">{paused ? 'ახალი თამაში' : 'თამაშის დაწყება'}</Btn>
      </Card>
    </div>
  );
};
