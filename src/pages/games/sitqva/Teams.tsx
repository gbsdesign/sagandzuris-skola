import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CaseUpper, Lightbulb, ListOrdered, Play, RotateCcw, Timer, Trophy } from 'lucide-react';
import { ANSWER_BANK, ANSWER_WORDS } from '../../../data/sitqvaAnswers';
import { loadCalendarYearDays } from '../../../data/churchCalendar';
import { loadSitqvaWords } from '../../../utils/sitqvaDictionary';
import { KIND_HINT, LATIN_TO_GEORGIAN, LETTERS, MAX_TRIES, isGeorgian, keyMarks, scoreGuess, type Mark } from '../../../utils/sitqva';
import {
  SQ_TURN_SECONDS, SQ_WORDS, drawSqWord, newSqTeams, parseSqTeams, sqFinder, sqGuess, sqNext, sqPoints, sqTime, type SqTeams,
} from '../../../utils/sitqvaTeams';
import { bell, closeAudio, openAudio, type AudioRef } from '../../../utils/gameSounds';
import { tbilisiToday } from '../../../utils/hangi';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { GeoKeyboard } from '../../../components/games/GeoKeyboard';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { Hint } from '../samshvilde/parts';
import { Podium, Standings, TimerRing } from '../rounds/parts';
import { TEAM_TINT, TeamChips, TeamsEditor, readTeams, teamNames, useTurnClock, type TeamsConf } from '../rounds/teams';
import { dayPick } from './dayPick';

// „დღის სიტყვა“ on one phone (the plan's hybrid, 2026-11-01): the board on the screen, 2–6 teams in turn say a word, the
// teacher types it; the colours help every team. The words come from the bank (never the day's word, so the daily game
// stays a secret). The rules are utils/sitqvaTeams.ts. The game is kept on this phone after every row, so ✕ only pauses it.

const GAME_KEY = 'sg-sitqva-teams';
const CONF_KEY = 'sg-sitqva-table';
const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, v: unknown) => { try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };

interface Conf extends TeamsConf { words: number; secs: number; firstLetter: boolean }
const readConf = (raw: unknown): Conf => {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Conf>;
  return {
    ...readTeams(o),
    words: SQ_WORDS.includes(o.words as typeof SQ_WORDS[number]) ? o.words! : 5,
    secs: SQ_TURN_SECONDS.includes(o.secs as typeof SQ_TURN_SECONDS[number]) ? o.secs! : 45,
    firstLetter: !!o.firstLetter,
  };
};

const TILE: Record<Mark, string> = {
  hit: 'bg-[#2f7d4f] text-white',
  near: 'bg-[#d9a21b] text-white',
  miss: 'bg-[#a89c8a] text-white',
};

/** the six rows; a row tried shows its team's dot */
const Board: React.FC<{ g: SqTeams; typed: string; shaking: boolean; current: boolean }> = ({ g, typed, shaking, current }) => {
  const len = g.word.length;
  const rows = Array.from({ length: MAX_TRIES }, (_, r) => {
    const w = g.guesses[r];
    if (w) return { letters: [...w], marks: scoreGuess(w, g.word) as (Mark | null)[], cur: false, team: g.by[r] };
    const cur = current && r === g.guesses.length;
    const letters = cur ? [...(g.firstLetter ? g.word[0] + typed : typed)] : [];
    return { letters, marks: null, cur, team: -1 };
  });
  return (
    <div className="mx-auto w-full space-y-1.5" style={{ maxWidth: len * 46 + (len - 1) * 6 + 22 }} role="group" aria-label={`ცდა ${g.guesses.length} ${MAX_TRIES}-დან`}>
      {rows.map((row, r) => (
        <div key={r} className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 shrink-0 rounded-full" style={{ background: row.team >= 0 ? TEAM_TINT[row.team] : 'transparent' }} aria-hidden="true" />
          <div className={`flex-1 grid gap-1.5 ${row.cur && shaking ? 'sg-shake' : ''}`} style={{ gridTemplateColumns: `repeat(${len}, minmax(0, 1fr))` }}>
            {Array.from({ length: len }, (_, c) => {
              const ch = row.letters[c];
              const m = row.marks?.[c];
              const fixed = row.cur && g.firstLetter && c === 0;
              const cls = m ? TILE[m]
                : fixed ? 'bg-[#2f7d4f]/15 ring-2 ring-[#2f7d4f]/50 text-[#24603d]'
                  : row.cur && ch ? 'bg-white ring-2 ring-[#4a3426]/45 text-[#2a2017]'
                    : row.cur ? 'bg-white ring-2 ring-[#7a2028]/30'
                      : 'bg-white/70 ring-1 ring-[#e8dcc8]';
              return (
                <div key={c} className={`aspect-square rounded-xl flex items-center justify-center font-serif-ge text-[21px] font-bold leading-none transition-colors ${cls}`}>
                  {ch ?? ''}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const TeamsGame: React.FC<{ g: SqTeams; setG: (g: SqTeams) => void; avoid: string[]; onClose: () => void; onAgain: () => void }> = ({ g, setG, avoid, onClose, onAgain }) => {
  const audio: AudioRef = useRef<AudioContext | null>(null);
  useEffect(() => { openAudio(audio); return () => closeAudio(audio); }, []);
  const [dict, setDict] = useState<Set<string> | null>(null);
  useEffect(() => { loadSitqvaWords().then(setDict); }, []);
  const [typed, setTyped] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  useEffect(() => { setTyped(''); }, [g.at, g.turn, g.guesses.length]);
  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(null), 2200);
    return () => window.clearTimeout(t);
  }, [note]);
  const playing = g.phase === 'play';
  const left = useTurnClock(audio, g.t0, g.secs, playing, () => setG(sqTime(g, Date.now())));
  useEffect(() => { if (g.phase !== 'play') bell(audio.current); }, [g.phase]);
  const marks = useMemo(() => keyMarks(g.guesses, g.word), [g.guesses, g.word]);

  const len = g.word.length;
  const room = g.firstLetter ? len - 1 : len;
  const warn = (msg: string) => { triggerHaptic(40); setNote(msg); setShaking(true); window.setTimeout(() => setShaking(false), 450); };
  const type = (ch: string) => { if (playing) setTyped(t => (t.length < room ? t + ch : t)); };
  const back = () => setTyped(t => t.slice(0, -1));
  const submit = () => {
    if (!playing) return;
    const w = g.firstLetter ? g.word[0] + typed : typed;
    if (w.length < len) { warn('ასოები აკლია'); return; }
    if (g.guesses.includes(w)) { warn('ეს სიტყვა უკვე სცადეს'); return; }
    const known = w === g.word || ANSWER_WORDS.has(w) || (dict ? dict.has(w) : isGeorgian(w));
    if (!known) { warn('ასეთი სიტყვა ლექსიკონში არ არის'); return; }
    triggerHaptic(20);
    setNote(null);
    setG(sqGuess(g, w, Date.now()));
  };
  // a physical keyboard: Georgian letters, or the Latin layout's keys as the standard Georgian layout maps them
  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName))) return;
      if (e.key === 'Enter') { e.preventDefault(); submit(); return; }
      if (e.key === 'Backspace') { e.preventDefault(); back(); return; }
      const ch = e.key.length === 1 ? (LETTERS.includes(e.key) ? e.key : LATIN_TO_GEORGIAN[e.key]) : undefined;
      if (ch) { e.preventDefault(); type(ch); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const title = `სიტყვა ${g.at + 1}/${g.count}`;

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

  if (g.phase === 'word') {
    const finder = sqFinder(g);
    const last = g.at + 1 >= g.count;
    return (
      <TableScreen
        title={title}
        onClose={onClose}
        footer={(
          <Btn size="lg" full icon={last ? <Trophy /> : <Play />} onClick={() => setG(sqNext(g, last ? undefined : drawSqWord(ANSWER_BANK, [...g.used, ...avoid], Math.random), Date.now()))} className="!h-14 !text-[15.5px]">
            {last ? 'შედეგები' : 'შემდეგი სიტყვა'}
          </Btn>
        )}
      >
        <div className="py-2 space-y-4">
          <div className="text-center">
            <p className="font-serif-ge text-[30px] font-bold leading-tight text-[#7a2028]">{g.word}</p>
            <p className="text-[12.5px] text-[#75685a]">{KIND_HINT[g.kind]}</p>
            <p className="mt-2 font-serif-ge text-[17px] font-bold leading-snug" style={{ color: finder >= 0 ? TEAM_TINT[finder] : '#75685a' }}>
              {finder >= 0 ? `${g.names[finder]} — ${g.guesses.length}-ე ცდაზე! +${sqPoints(g.guesses.length)}` : 'ვერავინ გამოიცნო'}
            </p>
          </div>
          <Board g={g} typed="" shaking={false} current={false} />
          <Standings names={g.names} scores={g.scores} />
        </div>
      </TableScreen>
    );
  }

  const who = g.names[g.turn];
  const status = note ?? (g.last ? `დრო გავიდა. ახლა: ${who}` : g.guesses.length ? `ახლა: ${who}` : `იწყებს: ${who}`);
  return (
    <TableScreen title={title} onClose={onClose} footer={<GeoKeyboard marks={marks} onKey={type} onBack={back} onEnter={submit} />}>
      <div className="py-2 space-y-3">
        <TeamChips names={g.names} scores={g.scores} turn={g.turn} />
        <p className="inline-flex items-start gap-1.5 max-w-full rounded-2xl bg-[#7a2028]/[0.07] px-3 py-1.5 text-[12.5px] font-bold leading-snug text-[#7a2028]">
          <Lightbulb className="w-4 h-4 shrink-0 mt-px" /> <span>{len} ასო · {KIND_HINT[g.kind]}</span>
        </p>
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 font-serif-ge text-[18px] font-bold leading-snug" role="status" style={{ color: note ? '#a8730f' : TEAM_TINT[g.turn] }}>{status}</p>
          <TimerRing left={left} total={g.secs} size="sm" />
        </div>
        <Board g={g} typed={typed} shaking={shaking} current />
        <p className="text-center text-[12px] text-[#9a8b7b]">გამოცნობა: {[1, 2, 3, 4, 5, 6].map(sqPoints).join(' · ')} ქულა — რიგის მიხედვით</p>
      </div>
    </TableScreen>
  );
};

export const SitqvaTeams: React.FC = () => {
  const [conf, setConfState] = useState<Conf>(() => readConf(load(CONF_KEY)));
  const setConf = (c: Conf) => { setConfState(c); save(CONF_KEY, c); };
  const [game, setGameState] = useState<SqTeams | null>(() => { const g = parseSqTeams(load(GAME_KEY)); return g && g.phase !== 'over' ? g : null; });
  const [open, setOpen] = useState(false);
  const setGame = useCallback((g: SqTeams | null) => { setGameState(g); save(GAME_KEY, g && g.phase !== 'over' ? g : null); }, []);
  // the day's word stays the daily game's secret
  const [avoid, setAvoid] = useState<string[]>([]);
  useEffect(() => {
    let on = true;
    const today = tbilisiToday();
    loadCalendarYearDays(today).then(cal => { const w = dayPick(cal, today)?.word; if (on && w) setAvoid([w]); }).catch(() => { /* offline: any word */ });
    return () => { on = false; };
  }, []);

  const deal = (names: string[], c: Conf) => {
    const pick = drawSqWord(ANSWER_BANK, avoid, Math.random);
    return pick ? newSqTeams(names, c.words, c.secs, c.firstLetter, pick, Date.now()) : null;
  };
  const start = async () => {
    if (game && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
    const g = deal(teamNames(conf), conf);
    if (!g) return;
    triggerHaptic(10);
    setGame(g);
    setOpen(true);
  };
  const again = () => { if (game) setGame(deal(game.names, { ...conf, words: game.count, secs: game.secs, firstLetter: game.firstLetter })); };

  if (open && game) return <TeamsGame g={game} setG={setGame} avoid={avoid} onClose={() => setOpen(false)} onAgain={again} />;

  return (
    <div className="space-y-4">
      {game && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული: სიტყვა {game.at + 1}/{game.count}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{game.names.map((n, t) => `${n} ${game.scores[t]}`).join(' · ')}</p>
            </div>
            <Btn onClick={() => setOpen(true)} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <Card className="!p-4 space-y-4">
        <TeamsEditor conf={conf} onChange={c => setConf({ ...conf, ...c })} />
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><ListOrdered className="w-4 h-4 text-[#7a2028]" /> სიტყვები</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="სიტყვები">
            {SQ_WORDS.map(n => <Chip key={n} on={conf.words === n} onClick={() => setConf({ ...conf, words: n })}>{n}</Chip>)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Timer className="w-4 h-4 text-[#7a2028]" /> სვლის დრო</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="სვლის დრო">
            {SQ_TURN_SECONDS.map(s => <Chip key={s} on={conf.secs === s} onClick={() => setConf({ ...conf, secs: s })}>{s} წამი</Chip>)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><CaseUpper className="w-4 h-4 text-[#7a2028]" /> სიძნელე</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="სიძნელე">
            <Chip on={!conf.firstLetter} onClick={() => setConf({ ...conf, firstLetter: false })}>ჩვეულებრივი</Chip>
            <Chip on={conf.firstLetter} onClick={() => setConf({ ...conf, firstLetter: true })}>პირველი ასო ჩანს</Chip>
          </div>
        </div>
      </Card>
      <Btn size="lg" full icon={<Play />} onClick={() => { void start(); }} className="!h-14 !text-[15.5px]">დაწყება</Btn>
      <Hint>
        ტელეფონი (ან ეკრანი) კლასს უჩვენებს დაფას და მინიშნებას. გუნდი თავის სვლაზე ერთ სიტყვას ამბობს, მასწავლებელი წერს — ფერები
        ყველა გუნდს ეხმარება. ვინც გამოიცნობს, იღებს {sqPoints(1)} ქულას პირველ ცდაზე, {sqPoints(2)}-ს მეორეზე… {sqPoints(MAX_TRIES)}-ს
        მეექვსეზე. სიტყვები დღის სიტყვისგან განსხვავებულია, ასე რომ დღის თამაშს არ გაგიფუჭებთ.
      </Hint>
    </div>
  );
};
