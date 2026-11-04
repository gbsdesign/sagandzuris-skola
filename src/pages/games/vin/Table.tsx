import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Flag, Layers, Play, RotateCcw, Timer, Trophy, Undo2, X } from 'lucide-react';
import { VIN_PEOPLE, vinPerson, type VinPerson } from '../../../data/vinPeople';
import {
  MAX_QUESTIONS, VIN_ROUNDS, VIN_SECONDS, newVinTable, parseVinTable, playVinTurn, vinOver, vinPoints, vinScores, vinTeamNow, vinWho,
  type VinTable,
} from '../../../utils/vin';
import { buzz, chime, closeAudio, openAudio, tick, type AudioRef } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { Podium, Standings, useNow } from '../rounds/parts';
import { TEAM_TINT, TeamsEditor, readTeams, teamNames, useTurnClock, type TeamsConf } from '../rounds/teams';
import { Facts, PersonHead, bornLabel } from './parts';
import { winLine } from '../rounds/winLine';
import { HowTo } from '../../../components/games/HowTo';

// „ვინ ვარ მე?“ on one phone (the hub's „ჰიბრიდული“, 2026-11-01): the class in teams; in a team's turn one of them is the
// guesser — back to the screen, or the phone on their forehead, the screen to the class. The class sees the name (and the
// person's facts, to answer right) and says only „კი“ or „არა“; the phone counts: „კითხვა +1“ for every question (a wrong
// name too), „გამოიცნო!“ when the name is said. Twenty questions; 3 points within five, 2 within ten, 1 within twenty. The
// clock is a choice (none, 2 or 3 minutes). Rules utils/vin.ts; the game is kept on this phone after every turn, ✕ only
// pauses.

const GAME_KEY = 'sg-vin-game';
const CONF_KEY = 'sg-vin-table';
const KNOWN = new Set(VIN_PEOPLE.map(p => p.id));
const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, v: unknown) => { try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };

interface Conf extends TeamsConf { seconds: number; rounds: number }
const readConf = (raw: unknown): Conf => {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Conf>;
  return {
    ...readTeams(o),
    seconds: VIN_SECONDS.includes(o.seconds as number) ? o.seconds! : VIN_SECONDS[2],
    rounds: VIN_ROUNDS.includes(o.rounds as number) ? o.rounds! : 2,
  };
};
const secs = (s: number) => (s ? `${s / 60} წუთი` : 'უდროოდ');
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const LEAD_MS = 3000;
const POINTS_LINE = '5 კითხვამდე — 3 ქულა · 10-მდე — 2 · 20-მდე — 1';

type End = 'got' | 'gave' | 'twenty' | 'time';

/** a phone on its side (the forehead's way): the controls go in one row, the facts in two columns */
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

/** the class's screen: the name big, its facts under it, the questions counted at the bottom */
const Face: React.FC<{
  p: VinPerson; t0: number; seconds: number; left: number; q: number; audio: AudioRef;
  onAsk: () => void; onUndo: () => void; onGot: () => void; onGiveUp: () => void; onStop: () => void;
}> = ({ p, t0, seconds, left, q, audio, onAsk, onUndo, onGot, onGiveUp, onStop }) => {
  const now = useNow(true);
  const lead = Math.ceil((t0 - now) / 1000);
  const ticked = useRef(0);
  useEffect(() => {
    if (lead > 0 && lead <= 3 && ticked.current !== lead) { ticked.current = lead; tick(audio.current, false); triggerHaptic(10); }
  }, [lead, audio]);
  const ready = lead <= 0;
  const worth = vinPoints(q + 1, true);
  const short = useShort();
  const small = 'h-10 px-3 shrink-0 rounded-full text-[13.5px] font-bold text-white/80 inline-flex items-center gap-1.5 hover:bg-white/10 cursor-pointer disabled:opacity-35 disabled:cursor-default';
  const undo = (
    <button type="button" onClick={onUndo} disabled={!ready || !q} className={small}>
      <Undo2 className="w-4 h-4" aria-hidden="true" />კითხვა −1
    </button>
  );
  const giveUp = (
    <button type="button" onClick={onGiveUp} disabled={!ready} className={small}>
      <Flag className="w-4 h-4" aria-hidden="true" />ვერ გამოიცნო
    </button>
  );
  const big = (
    <div className={`grid grid-cols-2 gap-2 ${short ? 'flex-1' : 'max-w-2xl mx-auto'}`}>
      <button type="button" onClick={onAsk} disabled={!ready} className={`${short ? 'h-14' : 'h-16'} rounded-2xl bg-white/15 ring-1 ring-white/25 text-white font-bold text-[16px] flex flex-col items-center justify-center leading-tight active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:cursor-default`}>
        <span className="text-[22px] leading-none">+1</span>კითხვა
      </button>
      <button type="button" onClick={onGot} disabled={!ready} className={`${short ? 'h-14' : 'h-16'} rounded-2xl bg-[#2f7d4f] text-white font-bold text-[16px] flex flex-col items-center justify-center gap-0.5 shadow-[0_6px_16px_-8px_rgba(0,0,0,0.6)] active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:cursor-default`}>
        <Check className="w-6 h-6" aria-hidden="true" />გამოიცნო!
      </button>
    </div>
  );
  return (
    <div className="fixed inset-0 z-[75] bg-[#7a2028] text-white flex flex-col safe-top safe-bottom safe-x select-none" role="dialog" aria-label="ვინ ვარ მე?">
      <div className="h-1.5 bg-white/20 shrink-0">
        {seconds > 0 && <div className="h-full bg-[#f0d9a0] transition-[width] duration-200" style={{ width: `${ready ? (left / seconds) * 100 : 100}%` }} />}
      </div>
      <div className="flex items-center gap-2 px-3 h-12 shrink-0">
        <button type="button" onClick={onStop} aria-label="სვლის შეწყვეტა" className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 cursor-pointer"><X className="w-5 h-5" /></button>
        <p className="min-w-0 text-[15px] font-bold tabular-nums">კითხვა {q}/{MAX_QUESTIONS}</p>
        <span className="shrink-0 h-7 px-2.5 rounded-full bg-[#f0d9a0] text-[#7a2028] text-[12.5px] font-bold inline-flex items-center tabular-nums">ღირს {worth} ქულა</span>
        <span className="ml-auto text-[17px] font-bold tabular-nums">{ready && seconds > 0 ? clock(Math.ceil(left)) : ''}</span>
      </div>
      <div className="px-4 shrink-0 flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: MAX_QUESTIONS }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < q ? 'bg-[#f0d9a0]' : i === 5 || i === 10 ? 'bg-white/35' : 'bg-white/15'}`} />
        ))}
      </div>
      {!ready ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
          <p className="text-[18px] font-bold text-[#f0d9a0]">გამომცნობი — ეკრანს ზურგით!</p>
          <p className="text-[96px] font-bold leading-none tabular-nums">{Math.max(1, lead)}</p>
          <p className="max-w-sm text-[14px] leading-snug text-white/80">ან ტელეფონი შუბლზე დაიდოს, ეკრანით კლასისკენ. კლასი პასუხობს მხოლოდ „კი“ ან „არა“.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3 flex flex-col items-center text-center">
          <div className={`my-auto w-full py-2 ${short ? 'max-w-4xl space-y-2' : 'max-w-xl space-y-3'}`}>
            <p className="text-[clamp(14px,3.4vw,19px)] font-bold text-[#f0d9a0]">{p.role} · {bornLabel(p)}</p>
            <p className={`font-serif-ge font-bold leading-[1.05] [overflow-wrap:anywhere] ${short ? 'text-[clamp(28px,min(8vw,12vh),64px)]' : 'text-[clamp(34px,min(10vw,15vh),92px)]'}`}>{p.name}</p>
            <Facts p={p} light className={`text-left mx-auto ${short ? 'pt-1 columns-2 gap-8 [&>li]:break-inside-avoid' : 'pt-2 max-w-md'}`} />
          </div>
        </div>
      )}
      {short ? (
        <div className="shrink-0 px-3 pb-2 pt-1 flex items-center gap-2">{undo}{big}{giveUp}</div>
      ) : (
        <div className="shrink-0 px-3 pb-3 pt-1 space-y-2">
          <div className="flex items-center justify-between gap-2">{undo}{giveUp}</div>
          {big}
        </div>
      )}
    </div>
  );
};

type Phase = 'ready' | 'play' | 'result' | 'board';

const TableGame: React.FC<{ g: VinTable; setG: (g: VinTable) => void; onClose: () => void; onAgain: () => void }> = ({ g, setG, onClose, onAgain }) => {
  const audio: AudioRef = useRef<AudioContext | null>(null);
  useEffect(() => () => closeAudio(audio), []);
  const scores = vinScores(g);
  const team = vinTeamNow(g);
  const over = vinOver(g);
  const who = vinPerson(vinWho(g));
  const [phase, setPhase] = useState<Phase>(g.turns.length ? 'board' : 'ready');
  const [q, setQ] = useState(0);
  const [t0, setT0] = useState(0);
  const [end, setEnd] = useState<End>('got');
  const timed = g.seconds > 0;

  const finish = (e: End) => {
    setEnd(e);
    setPhase('result');
    if (e === 'got') { chime(audio.current, 3); triggerHaptic(40); } else { buzz(audio.current); triggerHaptic(80); }
  };
  const left = useTurnClock(audio, t0 + LEAD_MS, g.seconds, timed && phase === 'play', () => finish('time'));
  const go = () => {
    openAudio(audio);
    triggerHaptic(20);
    setQ(0);
    setT0(Date.now());
    setPhase('play');
  };
  const ask = () => {
    if (phase !== 'play') return;
    const n = q + 1;
    setQ(n);
    tick(audio.current, n === 5 || n === 10);
    triggerHaptic(12);
    if (n >= MAX_QUESTIONS) finish('twenty');
  };
  const got = () => { if (phase === 'play') { setQ(n => Math.min(MAX_QUESTIONS, n + 1)); finish('got'); } };
  const back = () => {
    // a slip: back into the turn (the clock goes on from where it was)
    if (end === 'got') setQ(n => Math.max(0, n - 1));
    if (end === 'twenty') setQ(MAX_QUESTIONS - 1);
    setPhase('play');
  };
  const ok = end === 'got';
  const confirm = () => {
    triggerHaptic(10);
    setG(playVinTurn(g, q, ok));
    setPhase('board');
  };
  const close = async () => {
    if (phase === 'play' || phase === 'result') {
      if (!(await askConfirm({ title: 'სვლა შეწყდეს?', text: 'ეს სვლა არ ჩაითვლება — გუნდი თავიდან დაიწყებს, სხვა სახელით არა, იმავეთი.', ok: 'შეწყვეტა' }))) return;
    }
    setPhase(g.turns.length ? 'board' : 'ready');
    onClose();
  };

  const round = Math.floor(g.turns.length / g.names.length) + 1;
  const last = g.turns[g.turns.length - 1];
  const lastWho = last ? vinPerson(last.who) : undefined;
  const gained = last ? g.names.map((_, t) => (t === last.team ? vinPoints(last.q, last.ok) : 0)) : null;

  if (over && phase === 'board') {
    const best = Math.max(...scores);
    const winners = g.names.filter((_, t) => scores[t] === best);
    return (
      <TableScreen
        title="ვინ ვარ მე? · შედეგები"
        onClose={onClose}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-14 !text-[15.5px]">დახურვა</Btn>
            <Btn size="lg" full icon={<RotateCcw />} onClick={onAgain} className="!h-14 !text-[15.5px]">თავიდან</Btn>
          </div>
        )}
      >
        <div className="my-auto space-y-5 py-4 w-full max-w-2xl mx-auto">
          {best > 0 && <Trophy className="w-10 h-10 mx-auto text-[#b8860b]" aria-hidden="true" />}
          <Podium names={g.names} scores={scores} />
          <p className="text-center text-[15px] font-bold text-[#4a3426]">
            {winLine(winners, best, n => `გაიმარჯვა „${n}“-მა`)} · {g.rounds} წრე
          </p>
          <Standings names={g.names} scores={scores} />
        </div>
      </TableScreen>
    );
  }

  const pts = vinPoints(q, ok);
  const footer =
    phase === 'ready' ? <Btn size="lg" full icon={<Play />} onClick={go} className="!h-14 !text-[16px]">წავედით!</Btn>
    : phase === 'result' ? <Btn size="lg" full icon={<Check />} onClick={confirm} className="!h-14 !text-[15.5px]">დადასტურება · {pts} ქულა</Btn>
    : phase === 'board' ? <Btn size="lg" full icon={<ChevronRight />} onClick={() => { triggerHaptic(10); setPhase('ready'); }} className="!h-14 !text-[15.5px]">შემდეგი: {g.names[team]}</Btn>
    : undefined;

  return (
    <TableScreen
      title={`ვინ ვარ მე? · ${phase === 'board' ? `წრე ${Math.min(round, g.rounds)}/${g.rounds}` : g.names[team]}`}
      onClose={() => { void close(); }}
      right={<span className="px-1 text-[12px] tabular-nums text-[#9a8b7b]">{secs(g.seconds)}</span>}
      footer={footer}
    >
      {phase === 'ready' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-6">
          <p className="text-[13px] font-bold text-[#9a8b7b]">ჯერია · წრე {round}/{g.rounds}</p>
          <p className="font-serif-ge text-[36px] font-bold leading-tight break-words max-w-full" style={{ color: TEAM_TINT[team] }}>{g.names[team]}</p>
          <p className="text-[13px] tabular-nums text-[#75685a]">ქულა: {scores[team]}</p>
          <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-[#75685a]">
            გუნდიდან ერთი გამომცნობია: დადგეს კლასის წინ ეკრანს ზურგით, ან ტელეფონი შუბლზე დაიდოს. კლასი პასუხობს მხოლოდ „კი“ ან „არა“.
            ყოველ კითხვაზე — „+1 კითხვა“; სახელის თქმაც კითხვაა.{timed ? ` ${secs(g.seconds)}-ის ბოლოს ზარი დარეკავს.` : ''}
          </p>
          <p className="text-[12.5px] font-bold text-[#7a2028]">{POINTS_LINE}</p>
        </div>
      )}

      {phase === 'play' && who && (
        <Face
          p={who} t0={t0 + LEAD_MS} seconds={g.seconds} left={left} q={q} audio={audio}
          onAsk={ask}
          onUndo={() => { triggerHaptic(6); setQ(n => Math.max(0, n - 1)); }}
          onGot={got}
          onGiveUp={() => { void askConfirm({ title: 'ვერ გამოიცნო?', text: 'სვლა დასრულდება, ქულის გარეშე.', ok: 'დასრულება' }).then(y => { if (y) finish('gave'); }); }}
          onStop={() => { void close(); }}
        />
      )}

      {phase === 'result' && who && (
        <div className="flex-1 flex flex-col gap-3 py-2 w-full max-w-2xl mx-auto">
          <div className="text-center">
            <p className={`font-serif-ge text-[26px] font-bold leading-tight ${ok ? 'text-[#2f7d4f]' : 'text-[#7a2028]'}`}>
              {ok ? `გამოიცნო ${q}-ე კითხვით!` : end === 'time' ? 'დრო ამოიწურა' : end === 'twenty' ? 'ოცი კითხვა ამოიწურა' : 'ვერ გამოიცნო'}
            </p>
            <p className="mt-1 text-[15px] font-bold" style={{ color: TEAM_TINT[team] }}>{g.names[team]}: +{pts} ქულა</p>
          </div>
          <div className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] p-4 space-y-3">
            <PersonHead p={who} big />
            <Facts p={who} />
          </div>
          {end !== 'time' && (
            <button type="button" onClick={() => { triggerHaptic(6); back(); }} className="self-center h-10 px-3 rounded-full text-[13px] font-bold text-[#7a2028] inline-flex items-center gap-1.5 hover:bg-[#7a2028]/[0.07] cursor-pointer">
              <Undo2 className="w-4 h-4" aria-hidden="true" />შეცდომით დააჭირე? სვლაში დაბრუნება
            </button>
          )}
        </div>
      )}

      {phase === 'board' && (
        <div className="flex-1 flex flex-col gap-3 py-2 w-full max-w-2xl mx-auto">
          {last && lastWho && (
            <p className="text-center text-[14px] leading-snug text-[#4a3426]">
              <b>{g.names[last.team]}</b>: {lastWho.name} — {last.ok ? `${last.q}-ე კითხვით` : 'ვერ გამოიცნო'}
            </p>
          )}
          <Standings names={g.names} scores={scores} gained={gained} />
          <p className="text-center text-[12.5px] leading-snug text-[#9a8b7b]">{POINTS_LINE}. {g.rounds} წრე — ყოველ გუნდს {g.rounds} სვლა აქვს.</p>
        </div>
      )}
    </TableScreen>
  );
};

export const VinTableGame: React.FC = () => {
  const [conf, setConfState] = useState<Conf>(() => readConf(load(CONF_KEY)));
  const setConf = (c: Conf) => { setConfState(c); save(CONF_KEY, c); };
  const [game, setGameState] = useState<VinTable | null>(() => {
    const g = parseVinTable(load(GAME_KEY), KNOWN);
    return g && !vinOver(g) ? g : null;
  });
  const [open, setOpen] = useState(false);
  const setGame = useCallback((g: VinTable | null) => { setGameState(g); save(GAME_KEY, g); }, []);

  const deck = VIN_PEOPLE.map(p => p.id);
  const deal = (names: string[], c: { rounds: number; seconds: number }) => newVinTable(names, c, deck);
  const start = async () => {
    if (game && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
    triggerHaptic(10);
    setGame(deal(teamNames(conf), conf));
    setOpen(true);
  };
  const again = () => { if (game) setGame(deal(game.names, { rounds: game.rounds, seconds: game.seconds })); };

  if (open && game) return <TableGame g={game} setG={setGame} onClose={() => setOpen(false)} onAgain={again} />;

  const paused = game ? vinScores(game) : [];
  return (
    <div className="space-y-4">
      {game && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული თამაში · {game.rounds} წრე</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{game.names.map((nm, t) => `${nm} ${paused[t]}`).join(' · ')}</p>
            </div>
            <Btn onClick={() => setOpen(true)} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <HowTo id="vin-table" steps={[
        'კლასი გუნდებად იყოფა. გუნდის სვლაში ერთი გამომცნობია — დგას ეკრანს ზურგით, ან ტელეფონი შუბლზე უდევს.',
        'კლასი ხედავს ცნობილი ქართველის სახელს და ფაქტებს.',
        'გამომცნობი კითხვებს სვამს, კლასი პასუხობს მხოლოდ „კი“ ან „არა“.',
        `ტელეფონი კითხვებს ითვლის: ${POINTS_LINE}.`,
      ]} />
      <Card className="!p-4 space-y-4">
        <TeamsEditor conf={conf} onChange={c => setConf({ ...conf, ...c })} />
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Timer className="w-4 h-4 text-[#7a2028]" /> სვლის დრო</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="სვლის დრო">
            {VIN_SECONDS.map(s => <Chip key={s} on={conf.seconds === s} onClick={() => setConf({ ...conf, seconds: s })}>{secs(s)}</Chip>)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Layers className="w-4 h-4 text-[#7a2028]" /> წრეები</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="წრეები">
            {VIN_ROUNDS.map(r => <Chip key={r} on={conf.rounds === r} onClick={() => setConf({ ...conf, rounds: r })}>{r} წრე</Chip>)}
          </div>
        </div>
      </Card>
      <Btn size="lg" full icon={<Play />} onClick={() => { void start(); }} className="!h-14 !text-[15.5px]">დაწყება · {deck.length} ადამიანი</Btn>
      <p className="px-1 text-[12px] leading-snug text-[#9a8b7b]">ადამიანები და ფაქტები Claude-მა შეარჩია სკოლისთვის — მასწავლებელს ჯერ არ შეუმოწმებია.</p>
    </div>
  );
};
