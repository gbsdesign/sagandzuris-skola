import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Flag, KeyRound, LayoutGrid, Play, RotateCcw, Timer, Trophy, Undo2, X, Zap } from 'lucide-react';
import { SAIDUMLO_POOL } from '../../../data/saidumloWords';
import {
  CODE_COUNT, TURN_SECONDS, boardOfCode, codeText, newSdTable, other, parseCode, parseSdTable, tableView, type SdBoard,
  type SdTable, type Team,
} from '../../../utils/saidumlo';
import { bell, buzz, chime, closeAudio, openAudio, tick, type AudioRef } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { useTurnClock } from '../rounds/teams';
import { Board, SIDE_LOOK, TEAM, TeamsLeft, Tile, type TileLook } from './parts';
import { HowTo } from '../../../components/games/HowTo';

// „საიდუმლო სახელები“ for the class (the hub's „ჰიბრიდული“, 2026-11-01): one phone (or the class's screen) lies on the table
// with the board of 25 words and its four-digit code; the two captains open „კაპიტნის გასაღები“ on their own phones and type
// the code — the same words and key come up, nothing is sent. A captain says one word and a number, the team touches words on
// the board: their own keeps the turn, any other passes it, the trap loses. A turn's clock is a choice. With one phone only,
// the captains peek at the key behind a confirm. The game is kept on this phone after every touch (`sg-saidumlo-game`).

const GAME_KEY = 'sg-saidumlo-game';
const CONF_KEY = 'sg-saidumlo-table';
const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, v: unknown) => { try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };
const secs = (s: number) => (!s ? 'უდროოდ' : s === 60 ? '1 წუთი' : s === 90 ? '1,5 წუთი' : `${s / 60} წუთი`);
const randomCode = () => Math.floor(Math.random() * CODE_COUNT);

/** a phone on its side: the board fills the height, everything else stands beside it */
const SHORT = '(max-height: 500px)';
const useShort = () => {
  const [short, setShort] = useState(() => window.matchMedia(SHORT).matches);
  useEffect(() => {
    const m = window.matchMedia(SHORT);
    const h = () => setShort(m.matches);
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, []);
  return short;
};

/** the key: every word in its side's colour, who starts */
const KeyGrid: React.FC<{ b: SdBoard; short?: boolean; note?: React.ReactNode }> = ({ b, short, note }) => {
  const line = (
    <p className="text-center text-[14px] font-bold leading-snug" style={{ color: TEAM[b.first].color }}>
      იწყებენ {TEAM[b.first].label} — მათ 9 სიტყვა აქვთ, {TEAM[other(b.first)].label}ს 8
    </p>
  );
  const legend = (
    <div className="flex flex-wrap justify-center gap-1.5 text-[12px] font-bold">
      {(['blue', 'red', 'none', 'trap'] as const).map(s => (
        <span key={s} className="h-7 px-2.5 rounded-full inline-flex items-center gap-1" style={{ background: SIDE_LOOK[s].bg, color: SIDE_LOOK[s].fg }}>
          {s === 'trap' && <Zap className="w-3.5 h-3.5" aria-hidden="true" />}{SIDE_LOOK[s].label}
        </span>
      ))}
    </div>
  );
  const board = (
    <Board label="გასაღები" fill={short}>
      {b.words.map((w, i) => <Tile key={w} word={w} look={{ kind: 'side', side: b.sides[i] }} size={short ? 'fill' : 'lg'} />)}
    </Board>
  );
  if (short) {
    return (
      <div className="flex-1 min-h-0 flex gap-3 py-1">
        <div className="w-[30%] max-w-[240px] shrink-0 flex flex-col justify-center gap-3 overflow-y-auto">{line}{legend}{note}</div>
        <div className="flex-1 min-w-0 min-h-0">{board}</div>
      </div>
    );
  }
  return <div className="space-y-3">{line}{board}{legend}{note}</div>;
};

/** the captain's own phone: the key of a typed code */
const CaptainKey: React.FC<{ code: number; onClose: () => void }> = ({ code, onClose }) => {
  const b = useMemo(() => boardOfCode(code, SAIDUMLO_POOL), [code]);
  const short = useShort();
  const note = (
    <p className="text-center text-[13px] leading-snug text-[#75685a]">
      შენი გუნდის სიტყვებს ერთი სიტყვით და რიცხვით ანიშნე — მაგალითად „მდინარე 2“. ეკრანი გუნდს არ აჩვენო. შავ ხაფანგს მოერიდე!
    </p>
  );
  return (
    <TableScreen
      title={`კაპიტნის გასაღები · ${codeText(code)}`}
      onClose={onClose}
      footer={short ? undefined : <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-14">დახურვა</Btn>}
    >
      {short ? <KeyGrid b={b} short note={note} /> : <div className="my-auto w-full max-w-3xl mx-auto py-3"><KeyGrid b={b} note={note} /></div>}
    </TableScreen>
  );
};

const lineOf = (side: string, turn: Team, next: Team, over: boolean) =>
  over ? '' : side === turn ? `${SIDE_LOOK[side as Team].label}! ${TEAM[turn].label} აგრძელებენ.`
    : side === 'none' ? `არავისია — ჯერი ${TEAM[next].label}ზეა.` : `${TEAM[next].label}ს სიტყვაა — ჯერი მათზეა.`;

const BoardGame: React.FC<{ g: SdTable; setG: (g: SdTable) => void; onClose: () => void; onNew: () => void }> = ({ g, setG, onClose, onNew }) => {
  const audio: AudioRef = useRef<AudioContext | null>(null);
  useEffect(() => () => closeAudio(audio), []);
  const short = useShort();
  const b = useMemo(() => boardOfCode(g.code, SAIDUMLO_POOL), [g.code]);
  const v = tableView(b, g.log);
  const [line, setLine] = useState('');
  const [peek, setPeek] = useState(false);
  const [t0, setT0] = useState(() => Date.now());
  useEffect(() => { setT0(Date.now()); }, [v.switches, g.code]);
  const timed = g.seconds > 0 && !v.over;
  const left = useTurnClock(audio, t0, g.seconds, timed, () => {
    triggerHaptic(150);
    setLine(`დრო! ჯერი ${TEAM[other(v.turn)].label}ზეა.`);
    setG({ ...g, log: [...g.log, { pass: true }] });
  });

  const touch = (i: number) => {
    if (v.over || v.opened.has(i)) return;
    openAudio(audio);
    const side = b.sides[i];
    const next = tableView(b, [...g.log, { i }]);
    if (side === 'trap') { buzz(audio.current); triggerHaptic(200); }
    else if (next.over) { chime(audio.current, 3); triggerHaptic(60); }
    else if (side === v.turn) { chime(audio.current, 1); triggerHaptic(20); }
    else { tick(audio.current, true); triggerHaptic(40); }
    setLine(lineOf(side, v.turn, next.turn, !!next.over));
    setG({ ...g, log: [...g.log, { i }] });
  };
  const pass = () => {
    if (v.over) return;
    openAudio(audio);
    triggerHaptic(12);
    setLine(`ჯერი ${TEAM[other(v.turn)].label}ზეა.`);
    setG({ ...g, log: [...g.log, { pass: true }] });
  };
  const undo = () => {
    if (!g.log.length) return;
    triggerHaptic(6);
    setLine('ბოლო სვლა გაუქმდა.');
    setG({ ...g, log: g.log.slice(0, -1) });
  };
  const askPeek = async () => {
    if (await askConfirm({ title: 'გასაღები მხოლოდ კაპიტნებს', text: 'გუნდებმა ეკრანს არ უნდა შეხედონ. ნახვის მერე დახურე.', ok: 'ვაჩვენო' })) setPeek(true);
  };

  const lookOf = (i: number): TileLook => {
    if (v.opened.has(i)) return { kind: 'side', side: b.sides[i] };
    if (v.over) return { kind: 'side', side: b.sides[i], faint: true };
    return { kind: 'closed' };
  };
  const over = v.over;
  const h = short ? '!h-12' : '!h-14';
  const side = 'shrink-0 rounded-2xl bg-white ring-1 ring-[#e8dcc8] inline-flex items-center justify-center cursor-pointer';
  const undoBtn = <button type="button" onClick={undo} disabled={!g.log.length} aria-label="ბოლო სვლის გაუქმება" className={`${side} ${short ? 'h-12' : 'w-12 h-14'} text-[#7a2028] disabled:opacity-40 disabled:cursor-default`}><Undo2 className="w-5 h-5" /></button>;
  const keyBtn = <button type="button" onClick={() => { void askPeek(); }} aria-label="გასაღები" className={`${side} ${short ? 'h-12' : 'w-12 h-14'} text-[#4a3426]`}><KeyRound className="w-5 h-5" /></button>;
  const passBtn = (
    <button type="button" onClick={pass} className={`${short ? 'w-full min-h-12 py-2 text-[14px]' : 'flex-1 h-14 text-[15px]'} px-3 rounded-2xl text-white font-bold leading-tight inline-flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]`} style={{ background: TEAM[v.turn].color }}>
      <Flag className="w-5 h-5 shrink-0" aria-hidden="true" /><span>{TEAM[v.turn].label}: სვლის დასრულება</span>
    </button>
  );
  const controls = over ? (
    <div className={`grid gap-2 ${short ? 'grid-cols-1' : 'grid-cols-2'}`}>
      <Btn kind="ghost" size="lg" full onClick={onClose} className={`${h} !text-[15px]`}>დახურვა</Btn>
      <Btn size="lg" full icon={<RotateCcw />} onClick={onNew} className={`${h} !text-[15px]`}>ახალი ბადე</Btn>
    </div>
  ) : short ? (
    <div className="space-y-2">{passBtn}<div className="grid grid-cols-2 gap-2">{undoBtn}{keyBtn}</div></div>
  ) : (
    <div className="flex items-center gap-2">{undoBtn}{passBtn}{keyBtn}</div>
  );
  const status = over ? (
    <div className={`rounded-2xl text-center text-white ${short ? 'px-3 py-2' : 'px-4 py-3'}`} style={{ background: TEAM[over.winner].color }} role="status">
      {!short && <Trophy className="w-6 h-6 mx-auto mb-1" aria-hidden="true" />}
      <p className={`font-serif-ge font-bold leading-tight ${short ? 'text-[16px]' : 'text-[20px]'}`}>გაიმარჯვეს {TEAM[over.winner].of}!</p>
      <p className="mt-0.5 text-[13px] leading-snug text-white/85">{over.trap ? `${TEAM[other(over.winner)].label} ხაფანგს შეეხნენ.` : 'ყველა თავისი სიტყვა იპოვეს.'}</p>
    </div>
  ) : (
    <p className={`min-h-[20px] font-bold leading-snug ${short ? 'text-[13px]' : 'text-center text-[13.5px]'}`} style={{ color: TEAM[v.turn].color }} role="status" aria-live="polite">
      {line || `${TEAM[v.turn].label}: კაპიტანი ერთ სიტყვას და რიცხვს ამბობს, გუნდი სიტყვებს ეხება.`}
    </p>
  );
  const board = (
    <Board fill={short}>
      {b.words.map((w, i) => <Tile key={w} word={w} look={lookOf(i)} onTap={over ? undefined : () => touch(i)} size={short ? 'fill' : 'lg'} />)}
    </Board>
  );

  return (
    <TableScreen
      title={`საიდუმლო სახელები · კოდი ${codeText(g.code)}`}
      onClose={onClose}
      right={timed ? <span className={`px-1 text-[15px] font-bold tabular-nums ${left <= 10 ? 'text-[#b23a48]' : 'text-[#4a3426]'}`}>{Math.ceil(left)}</span> : undefined}
      footer={short ? undefined : controls}
    >
      {short ? (
        <div className="flex-1 min-h-0 flex gap-3 py-1">
          <div className="w-[34%] max-w-[260px] shrink-0 flex flex-col gap-2 overflow-y-auto px-0.5 pb-1">
            <TeamsLeft left={v.left} turn={over ? null : v.turn} wins={g.wins} stack />
            {status}
            <div className="mt-auto">{controls}</div>
          </div>
          <div className="flex-1 min-w-0 min-h-0">{board}</div>
        </div>
      ) : (
        <div className="w-full max-w-4xl mx-auto py-2 space-y-3">
          <TeamsLeft left={v.left} turn={over ? null : v.turn} wins={g.wins} />
          {status}
          {board}
        </div>
      )}
      {peek && (
        <div className="fixed inset-0 z-[75] bg-[#fbf6ec] flex flex-col safe-top safe-bottom safe-x" role="dialog" aria-label="გასაღები">
          <div className="flex items-center gap-2 px-3 h-12 shrink-0">
            <button type="button" onClick={() => setPeek(false)} aria-label="დახურვა" className="w-10 h-10 rounded-full flex items-center justify-center text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer"><X className="w-5 h-5" /></button>
            <p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">გასაღები · მხოლოდ კაპიტნებს</p>
          </div>
          {short ? (
            <div className="flex-1 min-h-0 flex flex-col px-4 pb-3"><KeyGrid b={b} short /></div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 pb-4"><div className="max-w-3xl mx-auto py-2"><KeyGrid b={b} /></div></div>
          )}
        </div>
      )}
    </TableScreen>
  );
};

export const SaidumloTable: React.FC = () => {
  const [seconds, setSecondsState] = useState<number>(() => {
    const o = load(CONF_KEY) as { seconds?: number } | null;
    return TURN_SECONDS.includes(o?.seconds as number) ? (o!.seconds as number) : 0;
  });
  const setSeconds = (s: number) => { setSecondsState(s); save(CONF_KEY, { seconds: s }); };
  const [game, setGameState] = useState<SdTable | null>(() => parseSdTable(load(GAME_KEY)));
  const setGame = useCallback((g: SdTable | null) => { setGameState(g); save(GAME_KEY, g); }, []);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [captain, setCaptain] = useState<number | null>(null);
  const audio: AudioRef = useRef<AudioContext | null>(null);
  useEffect(() => () => closeAudio(audio), []);

  const view = useMemo(() => (game ? tableView(boardOfCode(game.code, SAIDUMLO_POOL), game.log) : null), [game]);
  const fresh = (wins?: SdTable['wins']) => newSdTable(randomCode(), seconds, wins);
  const start = async () => {
    if (game && view && !view.over && game.log.length && !(await askConfirm({ title: 'ახალი ბადე?', text: 'მიმდინარე თამაში წაიშლება.', ok: 'ახალი ბადე' }))) return;
    triggerHaptic(10);
    openAudio(audio);
    bell(audio.current);
    const wins = { ...(game?.wins ?? { blue: 0, red: 0 }) };
    if (view?.over) wins[view.over.winner] += 1;
    setGame(fresh(wins));
    setOpen(true);
  };
  const next = () => {
    if (!game || !view) return;
    const wins = { ...game.wins };
    if (view.over) wins[view.over.winner] += 1;
    setGame(fresh(wins));
  };
  const code = parseCode(typed);

  if (captain !== null) return <CaptainKey code={captain} onClose={() => setCaptain(null)} />;
  if (open && game) return <BoardGame g={game} setG={g => setGame(g)} onClose={() => setOpen(false)} onNew={next} />;

  return (
    <div className="space-y-4">
      {game && view && !view.over && game.log.length > 0 && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული თამაში · კოდი {codeText(game.code)}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">ლურჯებს დარჩა {view.left.blue}, წითლებს — {view.left.red}</p>
            </div>
            <Btn onClick={() => setOpen(true)} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <HowTo id="saidumlo-table" steps={[
        'ორი გუნდი — ლურჯები და წითლები, თითოს თავისი კაპიტანი.',
        'კაპიტნები გასაღებს ხედავენ, გუნდები — მხოლოდ სიტყვებს.',
        'კაპიტანი ამბობს ერთ სიტყვას და რიცხვს („ზღვა 2“), გუნდი ბადეში ამდენ სიტყვას ეხება.',
        'თავისი სიტყვა — გუნდი აგრძელებს; სხვისი ან არავისი — ჯერი გადადის; შავი ხაფანგი — წააგო.',
        'იგებს, ვინც პირველი გახსნის ყველა თავის სიტყვას.',
      ]} />
      <Card className="!p-4 space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-[#7a2028] text-[#fbf6ec] inline-flex items-center justify-center shrink-0"><LayoutGrid className="w-5 h-5" /></span>
          <div className="min-w-0">
            <p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">ბადე ამ ტელეფონზე</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">მაგიდაზე დევს ან კლასის ეკრანზე ჩანს — ორივე გუნდი ხედავს.</p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Timer className="w-4 h-4 text-[#7a2028]" /> სვლის დრო</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="სვლის დრო">
            {TURN_SECONDS.map(s => <Chip key={s} on={seconds === s} onClick={() => setSeconds(s)}>{secs(s)}</Chip>)}
          </div>
        </div>
        <Btn size="lg" full icon={<Play />} onClick={() => { void start(); }} className="!h-14 !text-[15.5px]">ახალი ბადე</Btn>
      </Card>
      <Card className="!p-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-[#2a211b] text-[#f0d9a0] inline-flex items-center justify-center shrink-0"><KeyRound className="w-5 h-5" /></span>
          <div className="min-w-0">
            <p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">კაპიტნის გასაღები</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">ჩაწერე ბადის ოთხციფრიანი კოდი — ნახავ, რომელი სიტყვა ვისია.</p>
          </div>
        </div>
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (code !== null) { triggerHaptic(10); setCaptain(code); } }}>
          <input
            value={typed}
            onChange={e => setTyped(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0000"
            aria-label="ბადის კოდი"
            className="min-w-0 flex-1 h-12 rounded-2xl bg-white ring-1 ring-[#e0d2bb] px-4 text-[22px] font-bold tracking-[0.3em] tabular-nums text-[#4a3426] text-center outline-none focus:ring-2 focus:ring-[#7a2028]"
          />
          <Btn type="submit" size="lg" icon={<Eye />} disabled={code === null} className="!h-12 shrink-0">ნახვა</Btn>
        </form>
      </Card>
      <p className="px-1 text-[12px] leading-snug text-[#9a8b7b]">სიტყვები „ამიხსენის“ ბანკიდანაა. ერთი ტელეფონია? კაპიტნებს გასაღები ბადის ეკრანზეც აქვთ — 🔑 ღილაკით.</p>
    </div>
  );
};
