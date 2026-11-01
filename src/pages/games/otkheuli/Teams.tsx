import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Eraser, Eye, Grid3x3, Play, RotateCcw, Shuffle, Timer, Trophy, X } from 'lucide-react';
import { OTKHEULI_GROUPS } from '../../../data/otkheuliGroups';
import { GROUP_SIZE, buildGrid, mulberry32, shuffle, type OtkheuliGrid } from '../../../utils/otkheuli';
import {
  BY_ITSELF, NOT_YET, OTK_FIND, OTK_GRIDS, OTK_LINK, OTK_TURN_SECONDS, newOtkTeams, otkLeft, otkLink, otkNext, otkPick, otkTime, otkTried,
  otkUsed, parseOtkTeams, type OtkTeams,
} from '../../../utils/otkheuliTeams';
import { bell, closeAudio, openAudio, type AudioRef } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { Hint } from '../samshvilde/parts';
import { Podium, Standings, TimerRing } from '../rounds/parts';
import { TEAM_TINT, TeamChips, TeamsEditor, readTeams, teamNames, useTurnClock, type TeamsConf } from '../rounds/teams';

// „ოთხეული“ on one phone (the plan's hybrid, 2026-11-01): the grid on the screen (or a projector), 2–6 teams in turn say
// four words, the teacher taps them. A group found takes its team's colour; before its name shows the team says what joins
// the four and the teacher marks it. The rules are utils/otkheuliTeams.ts. The game is kept on this phone after every
// step, so ✕ only pauses it.

const GAME_KEY = 'sg-otkheuli-teams';
const CONF_KEY = 'sg-otkheuli-table';
const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, v: unknown) => { try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };

interface Conf extends TeamsConf { grids: number; secs: number }
const readConf = (raw: unknown): Conf => {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Conf>;
  return {
    ...readTeams(o),
    grids: OTK_GRIDS.includes(o.grids as typeof OTK_GRIDS[number]) ? o.grids! : 1,
    secs: OTK_TURN_SECONDS.includes(o.secs as typeof OTK_TURN_SECONDS[number]) ? o.secs! : 60,
  };
};

/** a new grid of groups the game has not asked (any groups, if those run short) */
const freshGrid = (used: string[]): OtkheuliGrid | undefined => {
  const seed = Math.floor(Math.random() * 2 ** 31);
  return buildGrid(OTKHEULI_GROUPS.filter(g => !used.includes(g.id)), mulberry32(seed)) ?? buildGrid(OTKHEULI_GROUPS, mulberry32(seed));
};

const BY_ITSELF_TINT = '#8a7a6a';

/** a found group: its finder's colour, the finder's name (or „ბოლო ოთხი“), +1 when its link was named */
const GroupBar: React.FC<{ g: OtkTeams; i: number }> = ({ g, i }) => {
  const group = g.grid.groups[i];
  const who = g.owner[i];
  return (
    <div className="rounded-2xl px-3 py-2.5 text-white" style={{ background: who >= 0 ? TEAM_TINT[who] : BY_ITSELF_TINT }}>
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-[14px] font-bold leading-snug">{group.label}</p>
        <span className="shrink-0 inline-flex items-center h-6 px-2 rounded-full bg-white/20 text-[11.5px] font-bold">
          {who >= 0 ? g.names[who] : 'ბოლო ოთხი'}{g.linked[i] ? ` · +${OTK_LINK}` : ''}
        </span>
      </div>
      <p className="mt-0.5 text-[12.5px] leading-snug text-white/90">{group.words.join(' · ')}</p>
    </div>
  );
};

/** the host's question after a find: did the team say what joins the four? The name shows on a tap, then the answer */
const LinkAsk: React.FC<{ g: OtkTeams; onAnswer: (named: boolean) => void }> = ({ g, onAnswer }) => {
  const [shown, setShown] = useState(false);
  if (!g.ask) return null;
  const { group, team } = g.ask;
  const by = g.owner[group] === BY_ITSELF;
  return (
    <Card className="!p-4 space-y-3" >
      {by
        ? <p className="text-[13px] font-bold text-[#75685a]">სამი ჯგუფი ნაპოვნია — ბოლო ოთხი თავისით ჯგუფია.</p>
        : <p className="text-[13px] font-bold text-[#2f7d4f] flex items-center gap-1.5"><Check className="w-4 h-4" />{g.names[team]} — სწორია! +{OTK_FIND}</p>}
      <p className="font-serif-ge text-[18px] font-bold leading-snug" style={{ color: TEAM_TINT[team] }}>{g.names[team]}, რა აერთიანებს ამ ოთხს?</p>
      <p className="text-[15px] font-bold leading-snug text-[#4a3426]">{g.grid.groups[group].words.join(' · ')}</p>
      {!shown ? (
        <>
          <Hint>გუნდმა ხმამაღლა თქვას, მერე გახსენი.</Hint>
          <Btn size="lg" full icon={<Eye />} onClick={() => { triggerHaptic(10); setShown(true); }} className="!h-14 !text-[15.5px]">ჯგუფის ჩვენება</Btn>
        </>
      ) : (
        <>
          <p className="rounded-2xl bg-[#7a2028]/[0.07] px-3.5 py-3 font-serif-ge text-[19px] font-bold leading-snug text-[#7a2028]">{g.grid.groups[group].label}</p>
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full icon={<X />} onClick={() => onAnswer(false)} className="!h-14 !text-[15px]">ვერ თქვეს</Btn>
            <Btn size="lg" full icon={<Check />} onClick={() => onAnswer(true)} className="!h-14 !text-[15px]">თქვეს · +{OTK_LINK}</Btn>
          </div>
        </>
      )}
    </Card>
  );
};

const TeamsGame: React.FC<{ g: OtkTeams; setG: (g: OtkTeams) => void; onClose: () => void; onAgain: () => void }> = ({ g, setG, onClose, onAgain }) => {
  const audio: AudioRef = useRef<AudioContext | null>(null);
  useEffect(() => { openAudio(audio); return () => closeAudio(audio); }, []);
  const [picked, setPicked] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>(g.grid.tiles);
  const [note, setNote] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  useEffect(() => { setOrder(g.grid.tiles); setPicked([]); }, [g.grid]);
  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(null), 2200);
    return () => window.clearTimeout(t);
  }, [note]);
  const playing = g.phase === 'play' && !g.ask;
  const left = useTurnClock(audio, g.t0, g.secs, playing, () => { setPicked([]); setG(otkTime(g, Date.now())); });
  useEffect(() => { if (g.phase !== 'play') bell(audio.current); }, [g.phase]);

  const title = `ოთხეული · ბადე ${g.at + 1}/${g.count}`;
  const done = (i: number) => g.owner[i] !== NOT_YET && !(g.ask && g.ask.group === i);
  const doneBars = g.grid.groups.map((_, i) => i).filter(done);

  if (g.phase === 'over') {
    return (
      <TableScreen
        title={title}
        onClose={onClose}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-14 !text-[15.5px]">დახურვა</Btn>
            <Btn size="lg" full onClick={onAgain} icon={<RotateCcw />} className="!h-14 !text-[15.5px]">თავიდან</Btn>
          </div>
        )}
      >
        <div className="py-2 space-y-4">
          <div className="text-center">
            <Trophy className="w-9 h-9 mx-auto text-[#c9a227]" />
            <p className="mt-1 font-serif-ge text-[22px] font-bold text-[#4a3426]">თამაში დასრულდა</p>
          </div>
          <Podium names={g.names} scores={g.scores} />
          <Standings names={g.names} scores={g.scores} />
        </div>
      </TableScreen>
    );
  }

  if (g.phase === 'grid') {
    const last = g.at + 1 >= g.count;
    return (
      <TableScreen
        title={title}
        onClose={onClose}
        footer={(
          <Btn size="lg" full icon={last ? <Trophy /> : <Grid3x3 />} onClick={() => setG(otkNext(g, last ? undefined : freshGrid(otkUsed(g)), Date.now()))} className="!h-14 !text-[15.5px]">
            {last ? 'შედეგები' : 'შემდეგი ბადე'}
          </Btn>
        )}
      >
        <div className="py-2 space-y-4">
          <p className="text-center font-serif-ge text-[20px] font-bold text-[#4a3426]">ბადე {g.at + 1} ამოხსნილია!</p>
          <div className="space-y-1.5">{g.grid.groups.map((_, i) => <GroupBar key={i} g={g} i={i} />)}</div>
          <Standings names={g.names} scores={g.scores} />
        </div>
      </TableScreen>
    );
  }

  const who = g.names[g.turn];
  const tint = TEAM_TINT[g.turn];
  const status = note ?? (
    g.last?.kind === 'oneAway' ? `ერთი აკლია! ახლა: ${who}`
      : g.last?.kind === 'wrong' ? `ვერა. ახლა: ${who}`
        : g.last?.kind === 'time' ? `დრო გავიდა. ახლა: ${who}`
          : `ჯერი: ${who}`);
  const tiles = order.filter(w => otkLeft(g).includes(w));

  const toggle = (w: string) => {
    if (!playing) return;
    triggerHaptic(5);
    setPicked(p => (p.includes(w) ? p.filter(x => x !== w) : p.length < GROUP_SIZE ? [...p, w] : p));
  };
  const check = () => {
    if (!playing || picked.length !== GROUP_SIZE) return;
    if (otkTried(g, picked)) {
      triggerHaptic(40);
      setShaking(true);
      window.setTimeout(() => setShaking(false), 450);
      setNote('ეს ოთხი უკვე სცადეს — აირჩიეთ სხვა');
      return;
    }
    const next = otkPick(g, picked, Date.now());
    triggerHaptic(next.ask ? 20 : 40);
    if (!next.ask) { setShaking(true); window.setTimeout(() => setShaking(false), 450); }
    setPicked([]);
    setNote(null);
    setG(next);
  };

  return (
    <TableScreen title={title} onClose={onClose}>
      <div className="py-2 space-y-3">
        <TeamChips names={g.names} scores={g.scores} turn={g.ask ? g.ask.team : g.turn} />
        {doneBars.length > 0 && <div className="space-y-1.5">{doneBars.map(i => <GroupBar key={i} g={g} i={i} />)}</div>}
        {g.ask ? (
          <LinkAsk key={`${g.at}-${g.ask.group}`} g={g} onAnswer={named => { triggerHaptic(named ? 20 : 10); setG(otkLink(g, named, Date.now())); }} />
        ) : (
          <>
            <div className="flex items-center gap-3">
              <p className="min-w-0 flex-1 font-serif-ge text-[18px] font-bold leading-snug" role="status" style={{ color: note || g.last?.kind === 'oneAway' ? '#a8730f' : tint }}>{status}</p>
              <TimerRing left={left} total={g.secs} size="sm" />
            </div>
            <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="სიტყვები">
              {tiles.map(w => {
                const on = picked.includes(w);
                return (
                  <button
                    key={w}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(w)}
                    className={`min-h-[60px] rounded-xl px-1 py-1.5 font-bold leading-tight text-center [overflow-wrap:anywhere] transition active:scale-95 cursor-pointer ${w.length > 8 ? 'text-[12px]' : 'text-[13.5px]'} ${on ? 'text-white shadow-[0_6px_14px_-8px_rgba(74,52,38,0.9)]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:bg-[#fbf6ec]'} ${on && shaking ? 'sg-shake' : ''}`}
                    style={on ? { background: tint } : undefined}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn kind="ghost" icon={<Shuffle />} onClick={() => setOrder(o => shuffle(o, Math.random))} className="flex-1 min-w-[120px]">არევა</Btn>
              <Btn kind="ghost" icon={<Eraser />} disabled={!picked.length} onClick={() => setPicked([])} className="flex-1 min-w-[120px]">გასუფთავება</Btn>
              <Btn size="lg" icon={<Check />} disabled={picked.length !== GROUP_SIZE} onClick={check} className="w-full !h-14 !text-[15.5px]">შემოწმება{picked.length ? ` · ${picked.length}/${GROUP_SIZE}` : ''}</Btn>
            </div>
          </>
        )}
      </div>
    </TableScreen>
  );
};

export const OtkheuliTeams: React.FC = () => {
  const [conf, setConfState] = useState<Conf>(() => readConf(load(CONF_KEY)));
  const setConf = (c: Conf) => { setConfState(c); save(CONF_KEY, c); };
  const [game, setGameState] = useState<OtkTeams | null>(() => { const g = parseOtkTeams(load(GAME_KEY)); return g && g.phase !== 'over' ? g : null; });
  const [open, setOpen] = useState(false);
  const setGame = useCallback((g: OtkTeams | null) => { setGameState(g); save(GAME_KEY, g && g.phase !== 'over' ? g : null); }, []);

  const deal = (names: string[]) => {
    const grid = freshGrid([]);
    return grid ? newOtkTeams(names, conf.grids, conf.secs, grid, Date.now()) : null;
  };
  const start = async () => {
    if (game && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
    const g = deal(teamNames(conf));
    if (!g) return;
    triggerHaptic(10);
    setGame(g);
    setOpen(true);
  };
  const again = () => { if (game) setGame(deal(game.names)); };

  if (open && game) return <TeamsGame g={game} setG={setGame} onClose={() => setOpen(false)} onAgain={again} />;

  return (
    <div className="space-y-4">
      {game && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული: ბადე {game.at + 1}/{game.count}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{game.names.map((n, t) => `${n} ${game.scores[t]}`).join(' · ')}</p>
            </div>
            <Btn onClick={() => setOpen(true)} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <Card className="!p-4 space-y-4">
        <TeamsEditor conf={conf} onChange={c => setConf({ ...conf, ...c })} />
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Grid3x3 className="w-4 h-4 text-[#7a2028]" /> ბადეები</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="ბადეები">
            {OTK_GRIDS.map(n => <Chip key={n} on={conf.grids === n} onClick={() => setConf({ ...conf, grids: n })}>{n}</Chip>)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Timer className="w-4 h-4 text-[#7a2028]" /> სვლის დრო</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="სვლის დრო">
            {OTK_TURN_SECONDS.map(s => <Chip key={s} on={conf.secs === s} onClick={() => setConf({ ...conf, secs: s })}>{s} წამი</Chip>)}
          </div>
        </div>
      </Card>
      <Btn size="lg" full icon={<Play />} onClick={() => { void start(); }} className="!h-14 !text-[15.5px]">დაწყება</Btn>
      <Hint>
        ტელეფონი (ან ეკრანი) კლასს უჩვენებს 16 სიტყვას. გუნდი თავის სვლაზე ოთხ სიტყვას ასახელებს, მასწავლებელი აჭერს და ამოწმებს.
        ნაპოვნი ჯგუფი — {OTK_FIND} ქულა, და თუ გუნდი იტყვის, რა აერთიანებს, კიდევ {OTK_LINK}. ყოველი ცდის მერე, სწორის თუ არასწორის, სვლა
        შემდეგ გუნდზე გადადის. სამი ჯგუფის მერე ბოლო ოთხი თავისით რჩება — შემდეგ გუნდს მხოლოდ კავშირის თქმა შეუძლია.
      </Hint>
    </div>
  );
};
