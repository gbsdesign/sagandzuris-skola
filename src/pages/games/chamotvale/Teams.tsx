import React, { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, SkipForward, Timer, Trophy } from 'lucide-react';
import { chamoListById } from '../../../data/chamotvaleLists';
import {
  TURN_SECONDS, newTeams, parseTeams, teamCounts, teamFind, teamPass, toQ, tryName, type ChamoList, type ChamoTeams,
} from '../../../utils/chamotvale';
import { bell, closeAudio, openAudio, type AudioRef } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { Hint } from '../samshvilde/parts';
import { Podium, Standings, TimerRing } from '../rounds/parts';
import { TEAM_TINT, TeamChips, TeamsEditor, readTeams, useTurnClock, type TeamsConf } from '../rounds/teams';
import { FillMap, Slots, type SlotState } from './Board';
import { Entry } from './Entry';
import { ListPicker } from './Picker';
import { UNCHECKED } from './Solo';
import { TEAMS_CONF, TEAMS_GAME, loadKey, rememberPlayed, save } from './store';

// „ჩამოთვალე!“ on one phone (the plan's hybrid): the phone shows the empty list and a clock to the class, 2–6 teams in turn
// name a member, the teacher types it; a right one takes the team's colour and the turn moves on, a wrong one or the clock's
// end passes it. Once every team has passed in a row nobody remembers more: the rest shows in red. The game is kept on this
// phone after every turn, so ✕ only pauses it.

interface Conf extends TeamsConf { secs: number; list: string | null }
const readConf = (raw: unknown): Conf => {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Conf>;
  const secs = TURN_SECONDS.includes(o.secs as typeof TURN_SECONDS[number]) ? o.secs! : 15;
  const list = typeof o.list === 'string' && chamoListById(o.list) ? o.list : null;
  return { ...readTeams(o), secs, list };
};

const TeamsGame: React.FC<{ g: ChamoTeams; setG: (g: ChamoTeams) => void; onClose: () => void; onAgain: () => void }> = ({ g, setG, onClose, onAgain }) => {
  const { q } = g;
  const audio: AudioRef = useRef<AudioContext | null>(null);
  useEffect(() => { openAudio(audio); return () => closeAudio(audio); }, []);
  const left = useTurnClock(audio, g.t0, g.secs, !g.over, () => setG(teamPass(g)));
  const [fresh, setFresh] = useState<number | null>(null);
  useEffect(() => {
    if (fresh === null) return;
    const t = window.setTimeout(() => setFresh(null), 900);
    return () => window.clearTimeout(t);
  }, [fresh]);
  useEffect(() => { if (g.over) bell(audio.current); }, [g.over]);

  const owner = (i: number) => g.owner[i];
  const tint = (i: number) => (owner(i) >= 0 ? TEAM_TINT[owner(i)] : null);
  const state = (i: number): SlotState => (owner(i) >= 0 ? 'found' : g.over ? 'missed' : 'empty');

  if (g.over) {
    const counts = teamCounts(g);
    const named = counts.reduce((a, b) => a + b, 0);
    return (
      <TableScreen
        title={q.title}
        onClose={onClose}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-14 !text-[15.5px]">დახურვა</Btn>
            <Btn size="lg" full onClick={onAgain} icon={<RotateCcw />} className="!h-14 !text-[15.5px]">ახალი სია</Btn>
          </div>
        )}
      >
        <div className="py-2 space-y-4">
          <div className="text-center">
            <Trophy className="w-9 h-9 mx-auto text-[#c9a227]" />
            <p className="mt-1 font-serif-ge text-[22px] font-bold text-[#4a3426]">{named === q.items.length ? 'მთელი სია!' : `${named} / ${q.items.length}`}</p>
            {named < q.items.length && <Hint>ვეღარავინ გაიხსენა — დანარჩენი წითლად ჩანს.</Hint>}
          </div>
          <Podium names={g.names} scores={counts} />
          <Standings names={g.names} scores={counts} />
          {q.map && <FillMap state={state} tint={tint} />}
          <Slots items={q.items} state={state} tint={tint} />
        </div>
      </TableScreen>
    );
  }

  const last = g.last;
  const who = g.names[g.turn];
  const onTry = (text: string, enter: boolean) => {
    const found = g.owner.map(o => o >= 0);
    const t = tryName(q, found, text, enter);
    if (t.kind === 'found') {
      triggerHaptic(15);
      setFresh(t.item);
      setG(teamFind(g, t.item));
    }
    return t;
  };
  return (
    <TableScreen title={q.title} onClose={onClose}>
      <div className="py-2 space-y-3">
        <TeamChips names={g.names} scores={teamCounts(g)} turn={g.turn} />
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 font-serif-ge text-[18px] font-bold leading-snug" role="status" style={{ color: TEAM_TINT[g.turn] }}>
            {last && last.item >= 0 ? `${g.names[last.team]} — სწორია! ახლა: ${who}`
              : last ? `ვერა. ახლა: ${who}`
                : `ჯერი: ${who}`}
          </p>
          <TimerRing left={left} total={g.secs} size="sm" />
        </div>
        <Entry items={q.items} onTry={onTry} forTeam>
          <Btn kind="ghost" full onClick={() => { triggerHaptic(10); setG(teamPass(g)); }} icon={<SkipForward />}>ვერ თქვეს — შემდეგი გუნდი</Btn>
          {q.map && <FillMap state={state} tint={tint} />}
          <Slots items={q.items} state={state} tint={tint} fresh={fresh} />
        </Entry>
      </div>
    </TableScreen>
  );
};

export const ChamotvaleTeams: React.FC = () => {
  const [conf, setConfState] = useState<Conf>(() => readConf(loadKey(TEAMS_CONF)));
  const setConf = (c: Conf) => { setConfState(c); save(TEAMS_CONF, c); };
  const [game, setGameState] = useState<ChamoTeams | null>(() => parseTeams(loadKey(TEAMS_GAME)));
  const [open, setOpen] = useState(false);
  const setGame = React.useCallback((g: ChamoTeams | null) => { setGameState(g); save(TEAMS_GAME, g && !g.over ? g : null); }, []);

  const deal = (list: ChamoList, names: string[]) => {
    rememberPlayed([list.id]);
    return newTeams(toQ(list), names, conf.secs);
  };
  /** a list tapped: the game begins with it */
  const start = async (list: ChamoList) => {
    setConf({ ...conf, list: list.id });
    if (game && !game.over && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
    setGame(deal(list, conf.names.slice(0, conf.teams).map(n => n.trim() || 'გუნდი')));
    setOpen(true);
  };
  /** a new list: back to the setup (the teams stay) to choose it */
  const again = () => { setOpen(false); setGame(null); };

  if (open && game) return <TeamsGame g={game} setG={setGame} onClose={() => setOpen(false)} onAgain={again} />;

  const paused = game && !game.over ? game : null;
  return (
    <div className="space-y-4">
      {paused && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული: {paused.q.title} · {paused.owner.filter(o => o >= 0).length} / {paused.q.items.length}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{paused.names.join(' · ')}</p>
            </div>
            <Btn onClick={() => setOpen(true)} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <Card className="!p-4 space-y-4">
        <TeamsEditor conf={conf} onChange={c => setConf({ ...conf, ...c })} />
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Timer className="w-4 h-4 text-[#7a2028]" /> სვლის დრო</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="სვლის დრო">
            {TURN_SECONDS.map(s => <Chip key={s} on={conf.secs === s} onClick={() => setConf({ ...conf, secs: s })}>{s} წამი</Chip>)}
          </div>
        </div>
      </Card>
      <div className="space-y-2">
        <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Play className="w-4 h-4 text-[#7a2028]" /> აირჩიე სია — თამაში დაიწყება</p>
        <ListPicker chosen={conf.list} onPick={l => { void start(l); }} />
      </div>
      <Hint>{UNCHECKED}</Hint>
    </div>
  );
};
