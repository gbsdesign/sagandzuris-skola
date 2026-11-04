import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpenCheck, Check, Hash, Play, RotateCcw, ScrollText, Timer, Trophy, Undo2, X } from 'lucide-react';
import { TS_LINES, tsLineById } from '../../../data/tsartseraLines';
import { KIND_LABEL, TS_SCRIPTS, countsOf, lettersOf } from '../../../utils/tsartsera';
import {
  READ_BONUS, TS_ROUNDS, TS_TURN_SECS, callLetter, drawTeamLines, hiddenOf, newTsTeams, nextLine, parseTsTeams, readLine, timeUp, undo,
  type TsTeams,
} from '../../../utils/tsartseraTeams';
import { SCRIPT_BY, SCRIPT_LABEL, isScript, toScript, type Script } from '../../../utils/oldScripts';
import { bell, buzz, chime, closeAudio, openAudio, type AudioRef } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import type { Mark } from '../../../utils/sitqva';
import { GeoKeyboard } from '../../../components/games/GeoKeyboard';
import { TableScreen } from '../../../components/games/TableScreen';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card, askConfirm, useWide } from '../../../components/ui/kit';
import { Podium, Standings, TimerRing } from '../rounds/parts';
import { TEAM_TINT, TeamChips, TeamsEditor, readTeams, teamNames, useTurnClock, type TeamsConf } from '../rounds/teams';
import { ScriptChips } from '../bade/parts';
import { TsBoard, type Tone } from './Board';
import { HowTo } from '../../../components/games/HowTo';

// „ხუცური წარწერა“ on one screen (the hub's „ჰიბრიდული“, 2026-11-01), the way of the TV's „სასწაულების ველი“: the line in the
// old letters big on the phone or a projector, the teams in turn name a letter, the teacher taps it on the screen's keys. The
// line has it — its boxes open, a point a box, the team goes on; it hasn't — the turn passes. A team that can read the whole
// line says so: the teacher opens it and marks whether they read it right. Rules: utils/tsartseraTeams.ts; the game is kept
// on this phone after every step, ✕ only pauses.

const GAME_KEY = 'sg-tsartsera-teams';
const CONF_KEY = 'sg-tsartsera-table';
const SEEN_KEY = 'sg-tsartsera-seen';
const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, v: unknown) => { try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };

interface Conf extends TeamsConf { script: Script; rounds: number; secs: number }
const readConf = (raw: unknown): Conf => {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Conf>;
  return {
    ...readTeams(o),
    script: isScript(o.script) && TS_SCRIPTS.includes(o.script) ? o.script : 'asomtavruli',
    rounds: TS_ROUNDS.includes(o.rounds as typeof TS_ROUNDS[number]) ? o.rounds! : 5,
    secs: TS_TURN_SECS.includes(o.secs as typeof TS_TURN_SECS[number]) ? o.secs! : 30,
  };
};

const readSeen = (): string[] => { const v = load(SEEN_KEY); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; };

/** the old letters opened so far, each over today's — the class learns the alphabet as it plays */
const Opened: React.FC<{ letters: string[]; script: Script }> = ({ letters, script }) => (
  letters.length ? (
    <ul className="flex flex-wrap gap-1.5" aria-label="გახსნილი ასოები">
      {letters.map(c => (
        <li key={c} className="flex flex-col items-center justify-center min-w-10 rounded-lg bg-white ring-1 ring-[#e8dcc8] px-1.5 py-1">
          <span className="font-serif-ge font-bold text-[20px] leading-none text-[#3d2a1e]">{toScript(c, script)}</span>
          <span className="mt-0.5 text-[12px] font-bold leading-none text-[#8a6416]">{c}</span>
        </li>
      ))}
    </ul>
  ) : null
);

const TeamsGame: React.FC<{ g: TsTeams; setG: (g: TsTeams) => void; onClose: () => void; onAgain: () => void }> = ({ g, setG, onClose, onAgain }) => {
  const audio: AudioRef = useRef<AudioContext | null>(null);
  useEffect(() => { openAudio(audio); return () => closeAudio(audio); }, []);
  const wide = useWide();
  const latest = useRef(g);
  latest.current = g;
  // back on the screen: the turn's clock starts afresh
  useEffect(() => { if (latest.current.phase === 'play') setG({ ...latest.current, t0: Date.now() }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // a team says it can read the line: listen first, then open it and judge
  const [claim, setClaim] = useState<'listen' | 'judge' | null>(null);
  useEffect(() => { setClaim(null); }, [g.at, g.phase]);
  // the last call shows for a moment
  const [shownLast, setShownLast] = useState(false);
  useEffect(() => {
    if (!g.last) return;
    setShownLast(true);
    const t = window.setTimeout(() => setShownLast(false), 2600);
    return () => window.clearTimeout(t);
  }, [g.said.length, g.last]);

  const line = tsLineById(g.lines[g.at]);
  const playing = g.phase === 'play' && !claim;
  const left = useTurnClock(audio, g.t0, g.secs || 1, playing && g.secs > 0, () => setG(timeUp(latest.current, Date.now())));

  if (g.phase === 'over' || !line) {
    return (
      <TableScreen
        title="ხუცური წარწერა · შედეგები"
        onClose={onClose}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-14 !text-[15.5px]">დახურვა</Btn>
            <Btn size="lg" full icon={<RotateCcw />} onClick={onAgain} className="!h-14 !text-[15.5px]">თავიდან</Btn>
          </div>
        )}
      >
        <div className="my-auto space-y-5 py-4">
          <Podium names={g.names} scores={g.scores} />
          <Standings names={g.names} scores={g.scores} />
        </div>
      </TableScreen>
    );
  }

  const counts = countsOf(line.text);
  const call = (letter: string) => {
    if (!playing) return;
    const after = callLetter(g, line, letter, Date.now());
    if (after === g) return;
    const n = counts[letter] ?? 0;
    if (after.phase === 'read') bell(audio.current);
    else if (n) chime(audio.current, n);
    else buzz(audio.current);
    triggerHaptic(n ? 15 : 35);
    setG(after);
  };
  const judge = (ok: boolean) => {
    triggerHaptic(ok ? 30 : 15);
    if (ok) bell(audio.current);
    setG(readLine(g, line, ok, Date.now()));
  };

  const reading = g.phase === 'read' || claim === 'judge';
  const shown = (c: string) => (reading || g.said.includes(c) ? c : '');
  const toneOf = (c: string): Tone => (g.said.includes(c) ? 'open' : reading ? 'won' : 'plain');
  const marks: Record<string, Mark> = {};
  for (const c of g.said) marks[c] = counts[c] ? 'hit' : 'miss';
  const opened = lettersOf(line.text).filter(c => g.said.includes(c));
  const hidden = hiddenOf(line, g.said);
  const turnName = g.names[g.turn];
  const last = shownLast ? g.last : null;

  const footer = g.phase === 'read' ? (
    <Btn size="lg" full icon={g.at + 1 >= g.lines.length ? <Trophy /> : <Play />} onClick={() => setG(nextLine(g, Date.now()))} className="!h-14 !text-[15.5px]">
      {g.at + 1 >= g.lines.length ? 'შედეგები' : 'შემდეგი წარწერა'}
    </Btn>
  ) : claim === 'listen' ? (
    <div className="space-y-2">
      <p className="text-center text-[15px] font-bold text-[#4a3426]">„{turnName}“ კითხულობს — მოუსმინეთ ბოლომდე</p>
      <div className="grid grid-cols-2 gap-2">
        <Btn kind="ghost" size="lg" full icon={<X />} onClick={() => { setClaim(null); setG({ ...g, t0: Date.now() }); }} className="!h-14">გაუქმება</Btn>
        <Btn size="lg" full icon={<BookOpenCheck />} onClick={() => setClaim('judge')} className="!h-14">გახსნა</Btn>
      </div>
    </div>
  ) : claim === 'judge' ? (
    <div className="space-y-2">
      <p className="text-center text-[15px] font-bold text-[#4a3426]">„{turnName}“ სწორად წაიკითხა?</p>
      <div className="grid grid-cols-2 gap-2">
        <Btn kind="ghost" size="lg" full icon={<X />} onClick={() => judge(false)} className="!h-14">შეცდნენ</Btn>
        <Btn size="lg" full icon={<Check />} onClick={() => judge(true)} className="!h-14">სწორია · +{hidden + READ_BONUS}</Btn>
      </div>
    </div>
  ) : (
    <GeoKeyboard
      marks={marks}
      onKey={call}
      onBack={() => setG(undo(g, Date.now()))}
      backLabel={<><Undo2 className="w-5 h-5" /> უკან</>}
      backDisabled={!g.prev}
      onEnter={() => setClaim('listen')}
      enterLabel="ამოიკითხეს!"
    />
  );

  return (
    <TableScreen title={`ხუცური წარწერა · ${g.at + 1}/${g.lines.length}`} onClose={onClose} footer={wide ? undefined : footer}>
      {/* a phone: the teams, the board, the keys at the foot; a wide screen (a projector): the board left, the rest and the keys right */}
      <div className="py-2 space-y-3 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-6 lg:items-start">
        <div className="space-y-3 lg:col-start-2 lg:row-start-1">
          <TeamChips names={g.names} scores={g.scores} turn={g.phase === 'play' ? g.turn : -1} />
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1.5 text-[15px] font-bold text-[#4a3426]">
                <ScrollText className="w-4 h-4 text-[#7a2028]" /> {KIND_LABEL[line.kind]} · {SCRIPT_LABEL[g.script]}
              </p>
              {g.phase === 'play' && (
                <p className="mt-0.5 text-[14px] leading-snug">
                  <span className="font-bold" style={{ color: TEAM_TINT[g.turn] }}>ჯერი: {turnName}</span>
                  <span className="text-[#75685a]"> · დახურულია {hidden}</span>
                </p>
              )}
            </div>
            {playing && g.secs > 0 && <TimerRing left={left} total={g.secs} size="sm" />}
          </div>

          {last && g.phase === 'play' && !claim && (
            <p
              className={`rounded-2xl px-4 py-2 text-center text-[16px] font-bold ${last.n ? 'bg-[#e6f2e9] text-[#2f7d4f]' : 'bg-[#f3ece0] text-[#8a7a6a]'}`}
              role="status"
            >
              {last.n ? `„${last.letter}“ — ${last.n} ასო! ${g.names[last.team]} +${last.n}` : `„${last.letter}“ არ არის — ჯერი გადადის`}
            </p>
          )}
          {wide && <div className="pt-1">{footer}</div>}
          {wide && g.phase === 'play' && <Opened letters={opened} script={g.script} />}
        </div>

        <div className="space-y-3 lg:col-start-1 lg:row-start-1">
          <Card className="!px-3 !py-5 sm:!px-6 lg:!py-8">
            <TsBoard text={line.text} script={g.script} shown={shown} toneOf={toneOf} big label={`წარწერა ${SCRIPT_BY[g.script]}`} />
          </Card>

          {g.phase === 'read' && (
            <Card tone="paper" className="!p-4 space-y-2">
              <p className="font-serif-ge text-[18px] font-bold text-[#7a2028]">
                {g.readBy !== null && g.readBy >= 0 ? `„${g.names[g.readBy]}“ ამოიკითხა!` : 'წარწერა გაიხსნა'}
              </p>
              <blockquote className="border-l-[3px] border-[#c9a24a] pl-3">
                <p className="font-serif-ge text-[19px] leading-snug text-[#2f2018] whitespace-pre-line">{line.text}</p>
                <p className="mt-1.5 text-[14px] font-bold text-[#7a2028]">— {line.by}{line.from ? <span className="font-normal text-[#75685a]">, „{line.from}“</span> : null}</p>
              </blockquote>
              <Standings names={g.names} scores={g.scores} />
            </Card>
          )}

          {!wide && g.phase === 'play' && <Opened letters={opened} script={g.script} />}
        </div>
      </div>
    </TableScreen>
  );
};

export const TsartseraTable: React.FC = () => {
  const [conf, setConfState] = useState<Conf>(() => readConf(load(CONF_KEY)));
  const setConf = (c: Conf) => { setConfState(c); save(CONF_KEY, c); };
  const [game, setGameState] = useState<TsTeams | null>(() => { const g = parseTsTeams(load(GAME_KEY)); return g && g.phase !== 'over' ? g : null; });
  const [open, setOpen] = useState(false);
  const setGame = useCallback((g: TsTeams | null) => { setGameState(g); save(GAME_KEY, g && g.phase !== 'over' ? g : null); }, []);

  const deal = (names: string[], c: Conf) => {
    const seen = readSeen();
    const lines = drawTeamLines(TS_LINES, c.rounds, Math.random, seen);
    save(SEEN_KEY, [...lines, ...seen.filter(id => !lines.includes(id))].slice(0, 40));
    return newTsTeams(names, c.script, c.secs, lines, Date.now());
  };
  const start = async () => {
    if (game && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
    triggerHaptic(10);
    setGame(deal(teamNames(conf), conf));
    setOpen(true);
  };
  const again = () => { if (game) setGame(deal(game.names, { ...conf, script: game.script, secs: game.secs, rounds: game.lines.length })); };

  if (open && game) return <TeamsGame g={game} setG={setGame} onClose={() => setOpen(false)} onAgain={again} />;

  return (
    <div className="space-y-4">
      {game && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული: წარწერა {game.at + 1}/{game.lines.length}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{game.names.map((n, t) => `${n} ${game.scores[t]}`).join(' · ')}</p>
            </div>
            <Btn onClick={() => setOpen(true)} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <HowTo id="tsartsera-table" steps={[
        `ეკრანზე წარწერაა ${SCRIPT_BY[conf.script]}, ყოველი ასოს ქვეშ ცარიელი უჯრით (როგორც „სასწაულების ველში“).`,
        'გუნდები რიგრიგობით ასოს ასახელებენ, მასწავლებელი მას ეკრანის კლავიატურაზე აჭერს.',
        'ასო წარწერაშია — ყველა ასეთი იხსნება, გუნდს თითო ასოზე ქულა ეწერება და ისევ ის ასახელებს. არ არის — ჯერი გადადის.',
        `ვინც წარწერას ამოიკითხავს, ამბობს „ვკითხულობ!“. სწორია — დარჩენილი ასოების ქულა და კიდევ ${READ_BONUS}; არასწორია — ქულა არავის ერგება.`,
      ]} />
      <Card className="!p-4 space-y-4">
        <TeamsEditor conf={conf} onChange={c => setConf({ ...conf, ...c })} />
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426]">დამწერლობა</p>
          <ScriptChips value={conf.script} onChange={s => setConf({ ...conf, script: s })} only={TS_SCRIPTS} />
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Hash className="w-4 h-4 text-[#7a2028]" /> წარწერები</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="წარწერები">
            {TS_ROUNDS.map(n => <Chip key={n} on={conf.rounds === n} onClick={() => setConf({ ...conf, rounds: n })}>{n}</Chip>)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Timer className="w-4 h-4 text-[#7a2028]" /> დრო სვლაზე</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="დრო სვლაზე">
            {TS_TURN_SECS.map(s => <Chip key={s} on={conf.secs === s} onClick={() => setConf({ ...conf, secs: s })}>{s ? `${s} წამი` : 'უსაათოდ'}</Chip>)}
          </div>
        </div>
      </Card>
      <Btn size="lg" full icon={<Play />} onClick={() => { void start(); }} className="!h-14 !text-[15.5px]">დაწყება</Btn>
    </div>
  );
};
