import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, DoorOpen, Flag, KeyRound, Mail, Play, Printer, RotateCcw, Trophy, Users } from 'lucide-react';
import { TSIKHE_ROOMS, tsikheRoom } from '../../../data/tsikheRooms';
import {
  HINT_COST, LEVEL_LABEL, ROOM_MINUTES, ROOM_MS, WRONG_COST, clockMs, endTable, mmss, newTable, parseTable, pauseClock, piecesOf, resumeClock,
  tableRanking, teamHint, teamMiss, teamMs, teamPass, type TsikheRoom, type TsikheTable,
} from '../../../utils/tsikhe';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card, askConfirm, useWide } from '../../../components/ui/kit';
import { Hint } from '../samshvilde/parts';
import { useNow } from '../rounds/parts';
import { TEAM_TINT, TeamsEditor, readTeams, teamNames, type TeamsConf } from '../rounds/teams';
import { CastleArt, ClockPill, OpenedDoor, lookOf } from './parts';
import { DoorPanel, GatePanel, useTsikheSounds, type TsikheSounds } from './Door';

// „ციხის გასაღები“ with the class (the hub's „ჰიბრიდული“, 2026-11-01): every team has the castle's printed cards — a door a
// card, the next one face down until the lock opens — and the phone on the teacher's desk is the castle's locks. A team comes
// with its answer, the host taps the team and enters it; right — the phone says which card the team takes next and gives the
// key's piece; a hint costs that team time. One clock for all, each team's own penalty; the first out of the gate wins. The
// tunes play from this phone, the bells are tapped on it. Kept on the device (`sg-tsikhe-table`), ✕ only pauses.

const GAME_KEY = 'sg-tsikhe-table';
const CONF_KEY = 'sg-tsikhe-table-conf';
const PDF = '/games/print/tsikhis-gasaghebi.pdf';
const load = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const save = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

interface Conf extends TeamsConf { room: string; whole: boolean }
const readConf = (raw: unknown): Conf => {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Conf>;
  return { ...readTeams(o), room: typeof o.room === 'string' && tsikheRoom(o.room) ? o.room : TSIKHE_ROOMS[0].id, whole: !!o.whole };
};

/** a team's doors: the pieces it has, the door on hand */
const MiniTrail: React.FC<{ room: TsikheRoom; door: number; tint: string }> = ({ room, door, tint }) => {
  const pieces = piecesOf(room);
  return (
    <ol className="flex items-center gap-1" aria-label={`კარი ${Math.min(door + 1, room.doors.length)}`}>
      {room.doors.map((_, i) => (
        <li
          key={i}
          className={`w-7 h-7 rounded-lg flex items-center justify-center font-serif-ge text-[13px] font-bold ${i < door ? 'bg-[#c9a227] text-white' : i === door ? 'bg-white' : 'bg-[#efe7d9] text-[#b3a48c]'}`}
          style={i === door ? { boxShadow: `inset 0 0 0 2px ${tint}`, color: tint } : undefined}
        >
          {i < door ? pieces[i] : <span className="text-[11px] tabular-nums">{i + 1}</span>}
        </li>
      ))}
      <li className={`w-7 h-7 rounded-full flex items-center justify-center ${door > room.doors.length ? 'bg-[#2f7d4f] text-white' : 'bg-[#efe7d9] text-[#b3a48c]'}`}>
        <KeyRound className="w-3.5 h-3.5" />
      </li>
    </ol>
  );
};

type Opened = { team: number; door: number } | null;

const TableGame: React.FC<{ g: TsikheTable; setG: (g: TsikheTable) => void; onClose: () => void; onAgain: () => void; sounds: TsikheSounds }> = ({ g, setG, onClose, onAgain, sounds }) => {
  const room = tsikheRoom(g.room)!;
  const doors = room.doors.length;
  const look = lookOf(room.id);
  const wide = useWide();
  const now = useNow(!g.ended);
  const [team, setTeam] = useState<number | null>(null);
  const [opened, setOpened] = useState<Opened>(null);
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => { body.current?.parentElement?.scrollTo({ top: 0 }); }, [team, opened]);

  const end = async () => {
    if (!(await askConfirm({ title: 'თამაში დასრულდეს?', text: 'ვინც ჭიშკარს ჯერ ვერ მიაღწია, გაღებული კარების რიცხვით დადგება.', ok: 'დასრულება' }))) return;
    setTeam(null);
    setOpened(null);
    setG(endTable(g, Date.now()));
  };

  // a lock opened: which card the team takes next, and the piece
  if (opened) {
    const x = g.teams[opened.team];
    const out = opened.door >= doors;
    const tint = TEAM_TINT[opened.team % TEAM_TINT.length];
    return (
      <TableScreen
        title={x.name}
        right={<ClockPill ms={clockMs(g, now)} />}
        onClose={onClose}
        footer={<Btn size="lg" full icon={g.ended ? <Trophy /> : <Users />} onClick={() => { setOpened(null); setTeam(null); }} className="!h-14 !text-[16px] !flex max-w-xl mx-auto">{g.ended ? 'შედეგები' : 'გუნდებთან'}</Btn>}
      >
        <div ref={body} className="my-auto w-full max-w-xl mx-auto py-3 space-y-4 text-center">
          <OpenedDoor piece={out ? undefined : piecesOf(room)[opened.door]} tint={tint} />
          {out ? (
            <>
              <p className="font-serif-ge text-[28px] font-bold text-[#2f7d4f]">{x.name} — გამოაღწია!</p>
              <p className="text-[22px] font-bold tabular-nums text-[#4a3426]">{mmss(x.done)}</p>
              <p className="text-[15.5px] leading-relaxed text-[#4a3426]">{room.outro}</p>
            </>
          ) : (
            <>
              <p className="font-serif-ge text-[26px] font-bold text-[#2f7d4f]">კარი გაიღო!</p>
              <p className="inline-flex items-center gap-2 rounded-2xl bg-[#7a2028] px-4 py-2.5 text-[18px] font-bold text-[#fbf6ec]">
                <Mail className="w-5 h-5" />აიღეთ ბარათი №{opened.door + 2}{opened.door + 1 >= doors ? ' — ჭიშკარი' : ''}
              </p>
              <p className="text-[15px] text-[#4a3426]">გასაღების ნაწილი: <b className="font-serif-ge text-[19px] text-[#8a6d12]">{piecesOf(room)[opened.door]}</b> (ბარათზეც წერია)</p>
              <div className="rounded-2xl bg-[#f6f0e4] px-4 py-3 text-left">
                <p className="text-[12.5px] font-bold text-[#8a6416]">წაუკითხეთ: იცოდით?</p>
                <p className="mt-1 text-[15px] leading-relaxed text-[#4a3426]">{room.doors[opened.door].note}</p>
              </div>
            </>
          )}
        </div>
      </TableScreen>
    );
  }

  if (g.ended) {
    const rank = tableRanking(g, now);
    return (
      <TableScreen
        title={`${room.title} · შედეგები`}
        onClose={onClose}
        footer={(
          <div className="grid grid-cols-2 gap-2 max-w-xl mx-auto">
            <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-14 !text-[15px]">დახურვა</Btn>
            <Btn size="lg" full icon={<RotateCcw />} onClick={onAgain} className="!h-14 !text-[15px]">თავიდან</Btn>
          </div>
        )}
      >
        <div className="my-auto w-full max-w-xl mx-auto py-3 space-y-4">
          <div className="text-center">
            <Trophy className="w-10 h-10 mx-auto text-[#c9a227]" />
            <p className="mt-1 font-serif-ge text-[26px] font-bold text-[#4a3426]">{rank[0]?.out ? `${rank.filter(r => r.place === 1).map(r => r.name).join(', ')} — გამოაღწია!` : 'ჭიშკარს ვერავინ მიაღწია'}</p>
          </div>
          <ol className="space-y-2">
            {rank.map(r => (
              <li key={r.i} className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 py-2.5">
                <span className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[16px] font-bold text-white" style={{ background: TEAM_TINT[r.i % TEAM_TINT.length] }}>{r.place}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-bold text-[#4a3426] truncate">{r.name}</span>
                  <span className="block text-[13px] text-[#75685a]">{r.out ? (r.ms <= ROOM_MS ? 'გამოაღწია დროზე' : 'გამოაღწია დაგვიანებით') : `გააღო ${Math.min(r.door, doors)} კარი`}</span>
                </span>
                <span className="text-[17px] font-bold tabular-nums text-[#4a3426]">{mmss(r.ms)}</span>
              </li>
            ))}
          </ol>
          <div className="rounded-2xl bg-[#f6f0e4] px-4 py-3">
            <p className="text-[12.5px] font-bold text-[#8a6416]">იცოდი? · {room.key}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-[#4a3426]">{room.gate.note}</p>
          </div>
        </div>
      </TableScreen>
    );
  }

  // a team at the desk: its door's lock
  if (team !== null) {
    const x = g.teams[team];
    const tint = TEAM_TINT[team % TEAM_TINT.length];
    const pass = () => {
      const at = x.door;
      setG(teamPass(g, team, doors, Date.now()));
      setOpened({ team, door: at });
    };
    return (
      <TableScreen
        title={(
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: tint }} aria-hidden="true" />
            {x.name} · {x.door < doors ? `კარი ${x.door + 1}` : 'ჭიშკარი'}
          </span>
        )}
        right={<span className="flex items-center gap-1.5"><span className="hidden sm:inline text-[12.5px] font-bold text-[#9a6a3c] tabular-nums">ჯარიმა {mmss(x.penalty)}</span><ClockPill ms={teamMs(g, team, now)} /></span>}
        onClose={onClose}
      >
        <div ref={body} className="flex flex-col gap-3.5 pt-1 min-h-full">
          <button type="button" onClick={() => setTeam(null)} className="self-start h-10 px-3.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] cursor-pointer active:scale-[0.97]">
            <ArrowLeft className="w-4 h-4" />გუნდები
          </button>
          {x.door < doors ? (
            <DoorPanel
              key={`${team}-${x.door}`}
              door={room.doors[x.door]}
              index={x.door}
              seed={g.seed}
              wrong={x.wrong}
              hints={x.hints}
              tint={look.tint}
              sounds={sounds}
              big={wide}
              onRight={pass}
              onMiss={o => setG(teamMiss(g, team, o))}
              onHint={() => setG(teamHint(g, team))}
            />
          ) : (
            <GatePanel key={team} room={room} hints={x.hints} tint={look.tint} sounds={sounds} big={wide} onHint={() => setG(teamHint(g, team))} onRight={pass} />
          )}
        </div>
      </TableScreen>
    );
  }

  // the teams: who is at which door
  return (
    <TableScreen
      title={`${room.title} · ${LEVEL_LABEL[room.level]}`}
      right={<ClockPill ms={clockMs(g, now)} big={wide} />}
      onClose={onClose}
      footer={<Btn kind="ghost" size="lg" full icon={<Flag />} onClick={() => { void end(); }} className="!h-12 !flex max-w-xl mx-auto">დასრულება</Btn>}
    >
      <div ref={body} className={`w-full mx-auto py-2 space-y-3 ${wide ? 'max-w-5xl' : 'max-w-xl'}`}>
        {clockMs(g, now) > ROOM_MS && <p className="rounded-2xl bg-[#b23a48]/10 px-3.5 py-2 text-center text-[14px] font-bold text-[#8f2632]">{ROOM_MINUTES} წუთი გავიდა — მცველი მოდის!</p>}
        <p className="text-[13.5px] leading-snug text-[#75685a]">გუნდი პასუხით მოდის — შეეხე მის სახელს და შეიყვანე. მინიშნება {HINT_COST[0] / 60_000} წთ, პასუხი {HINT_COST[2] / 60_000} წთ, არასწორი არჩევანი {WRONG_COST / 1000} წმ.</p>
        <ul className={`grid gap-2.5 ${wide ? 'grid-cols-2 xl:grid-cols-3' : ''}`}>
          {g.teams.map((x, i) => {
            const tint = TEAM_TINT[i % TEAM_TINT.length];
            const out = x.door > doors;
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={out}
                  onClick={() => { triggerHaptic(10); sounds.open(); setTeam(i); }}
                  className="w-full text-left rounded-3xl bg-white px-4 py-3.5 flex flex-col gap-2.5 cursor-pointer disabled:cursor-default active:scale-[0.99] transition"
                  style={{ boxShadow: `inset 0 0 0 2px ${out ? '#2f7d4f' : tint}` }}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: tint }} aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-[17px] font-bold text-[#4a3426] truncate">{x.name}</span>
                    <span className="text-[15px] font-bold tabular-nums text-[#4a3426]">{mmss(teamMs(g, i, now))}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <MiniTrail room={room} door={x.door} tint={tint} />
                    {out
                      ? <span className="inline-flex items-center gap-1 text-[14px] font-bold text-[#2f7d4f]"><Check className="w-4 h-4" />გარეთაა</span>
                      : <span className="h-10 px-3.5 rounded-full inline-flex items-center gap-1.5 text-[14px] font-bold text-white" style={{ background: tint }}>{x.door < doors ? <><DoorOpen className="w-4 h-4" />კარი {x.door + 1}</> : <><KeyRound className="w-4 h-4" />ჭიშკარი</>}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </TableScreen>
  );
};

export const TsikheTableGame: React.FC = () => {
  const [conf, setConfState] = useState<Conf>(() => readConf(load(CONF_KEY)));
  const setConf = (c: Conf) => { setConfState(c); save(CONF_KEY, c); };
  const [game, setGameState] = useState<TsikheTable | null>(() => parseTable(load(GAME_KEY), tsikheRoom));
  const [open, setOpen] = useState(false);
  const sounds = useTsikheSounds();
  const latest = useRef(game);
  latest.current = game;
  const setGame = useCallback((g: TsikheTable | null) => { latest.current = g; setGameState(g); save(GAME_KEY, g); }, []);
  useEffect(() => {
    const keep = () => { const g = latest.current; if (g) save(GAME_KEY, pauseClock(g, Date.now())); };
    const onHide = () => { if (document.visibilityState === 'hidden') keep(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', keep);
    return () => { document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', keep); keep(); };
  }, []);

  const names = conf.whole ? ['კლასი'] : teamNames(conf);
  const start = async () => {
    if (game && !game.ended && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
    triggerHaptic(10);
    sounds.open();
    setGame(newTable(conf.room, names, Date.now()));
    setOpen(true);
  };
  const resume = () => { if (!game) return; sounds.open(); setGame(game.ended ? game : resumeClock(game, Date.now())); setOpen(true); };
  const close = () => { if (game) setGame(game.ended ? null : pauseClock(game, Date.now())); setOpen(false); };
  const again = () => { if (game) setGame(newTable(game.room, game.teams.map(t => t.name), Date.now())); };

  if (open && game) return <TableGame g={game} setG={setGame} onClose={close} onAgain={again} sounds={sounds} />;

  const paused = game && !game.ended ? game : null;
  const pausedRoom = paused ? tsikheRoom(paused.room) : undefined;
  return (
    <div className="space-y-4">
      {paused && pausedRoom && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული: {pausedRoom.title} · {mmss(clockMs(paused, 0))}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{paused.teams.map(t => `${t.name} — ${t.door > pausedRoom.doors.length ? 'გარეთ' : t.door < pausedRoom.doors.length ? `კარი ${t.door + 1}` : 'ჭიშკარი'}`).join(' · ')}</p>
            </div>
            <Btn onClick={resume} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <Card className="!p-4 space-y-4">
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426]">ციხე</p>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TSIKHE_ROOMS.map(r => {
              const on = conf.room === r.id;
              const look = lookOf(r.id);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => { triggerHaptic(6); setConf({ ...conf, room: r.id }); }}
                    aria-pressed={on}
                    className="w-full rounded-2xl p-2 flex flex-col gap-1.5 text-left cursor-pointer active:scale-[0.98] transition bg-white"
                    style={{ boxShadow: on ? `inset 0 0 0 2.5px ${look.tint}` : 'inset 0 0 0 1px #e8dcc8' }}
                  >
                    <CastleArt room={r.id} className="w-full rounded-xl" />
                    <span className="px-1 text-[14px] font-bold leading-tight" style={{ color: on ? look.tint : '#4a3426' }}>{r.title}</span>
                    <span className="px-1 text-[12px] text-[#75685a]">{LEVEL_LABEL[r.level]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426]">ვინ თამაშობს</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="ვინ თამაშობს">
            <Chip on={!conf.whole} onClick={() => setConf({ ...conf, whole: false })}>გუნდები ეჯიბრებიან</Chip>
            <Chip on={conf.whole} onClick={() => setConf({ ...conf, whole: true })}>მთელი კლასი ერთად</Chip>
          </div>
        </div>
        {!conf.whole && <TeamsEditor conf={conf} onChange={c => setConf({ ...conf, ...c })} />}
      </Card>
      <Btn size="lg" full icon={<Play />} onClick={() => { void start(); }} className="!h-14 !text-[15.5px]">დაწყება · {ROOM_MINUTES} წუთი</Btn>
      <a
        href={PDF}
        download
        className="flex items-center justify-center gap-2 h-12 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[14px] font-bold text-[#7a2028] hover:ring-[#7a2028]/40"
      >
        <Printer className="w-4.5 h-4.5" />ბარათები დასაბეჭდად · PDF
      </a>
      <Hint>
        დაბეჭდეთ ციხის ბარათები — თითო გუნდს თავისი ნაკრები: ექვსი ბარათი, ზურგით ზემოთ, ნომრების რიგით. გუნდი პირველ ბარათს
        აბრუნებს და ამოცანას ხსნის. პასუხით მასწავლებელთან მოდის — შეეხეთ გუნდს და შეიყვანეთ: სწორია — ტელეფონი გეტყვით,
        რომელი ბარათი აიღოს შემდეგ, და გასაღების ნაწილს. ჰანგს ტელეფონი უკრავს, ზარებს გუნდი თვითონ უკრავს ტელეფონზე. ჭიშკართან
        ნაწილებიდან სიტყვა უნდა ააწყონ. საათი ყველასთვის ერთია, ჯარიმა — თითოეულის თავისი; ვინც პირველი გავა, ის იგებს.
      </Hint>
    </div>
  );
};
