import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Eye, Layers, Play, Presentation, RotateCcw, Shuffle, Smartphone, Timer, Trophy, X } from 'lucide-react';
import { NAKHATI_WORDS, nakhatiNote, nakhatiThemeOf } from '../../../data/nakhatiWords';
import {
  NAKHATI_ROUNDS, NAKHATI_TURN_SECONDS, circleNow, nakhatiOver, nakhatiScores, newNakhatiTable, parseNakhatiTable, playNakhati,
  mendLast, skipWord, turnNow, wordNow, type NakhatiTable, type NakhatiWhere,
} from '../../../utils/nakhati';
import { buzz, chime, closeAudio, openAudio, type AudioRef } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { Chip } from '../../../components/games/Chip';
import { InkPad, InkView, inkWidth } from '../../../components/games/Ink';
import { Btn, Card, Toggle, askConfirm } from '../../../components/ui/kit';
import { Podium, Standings, TimerRing } from '../rounds/parts';
import { TEAM_TINT, TeamsEditor, readTeams, teamNames, useTurnClock, type TeamsConf } from '../rounds/teams';
import { DRAW_RULE, NakhatiOptions, SHORT_SIDE, ThemeTag, UNCHECKED, chosenWords, useShort } from './parts';
import { readThemes, useThemes } from './store';
import { winLine } from '../rounds/winLine';

// „ნახატობანა“ on one phone (the hub's „ჰიბრიდული“, 2026-11-01): the class in teams. A team's artist comes to the phone, sees
// the word (another one if they wish, before the clock starts), and draws it — on the class's board or a paper, the phone in
// the host's hand, or on the screen itself, the team round it. „გამოიცნეს!“ before the time is out is the team's point. After
// every circle, if chosen, „ყველა ხატავს“: every team's artist sees the same word and draws it for their team at once — the
// host taps the team that guessed it first. A turn's result can be mended; after the circles the podium. Rules
// utils/nakhati.ts; the game is kept on this phone after every turn, ✕ only pauses.

const GAME_KEY = 'sg-nakhati-game';
const CONF_KEY = 'sg-nakhati-table';
const KNOWN = new Set(NAKHATI_WORDS.map(x => x.w));
const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, v: unknown) => { try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };

interface Conf extends TeamsConf { seconds: number; rounds: number; where: NakhatiWhere; allPlay: boolean }
const readConf = (raw: unknown): Conf => {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Conf>;
  return {
    ...readTeams(o),
    seconds: NAKHATI_TURN_SECONDS.includes(o.seconds as number) ? o.seconds! : NAKHATI_TURN_SECONDS[1],
    rounds: NAKHATI_ROUNDS.includes(o.rounds as number) ? o.rounds! : NAKHATI_ROUNDS[0],
    where: o.where === 'screen' ? 'screen' : 'board',
    allPlay: o.allPlay === true,
  };
};
const secs = (s: number) => (s === 60 ? '1 წუთი' : s === 90 ? '1,5 წუთი' : s === 120 ? '2 წუთი' : `${s} წამი`);
/** the same, „…-ის ბოლოს“ */
const secsOf = (s: number) => secs(s).replace(/ი$/, 'ის');

type Phase = 'ready' | 'peek' | 'play' | 'result' | 'end';

const TableGame: React.FC<{ g: NakhatiTable; setG: (g: NakhatiTable) => void; onClose: () => void; onAgain: () => void }> = ({ g, setG, onClose, onAgain }) => {
  const audio: AudioRef = useRef<AudioContext | null>(null);
  useEffect(() => () => closeAudio(audio), []);
  const short = useShort();
  const [phase, setPhase] = useState<Phase>(g.turns.length ? 'result' : 'ready');
  const [t0, setT0] = useState(0);
  const ink = useRef('');
  const [drawn, setDrawn] = useState('');
  const scores = nakhatiScores(g);
  const team = turnNow(g);
  const all = team < 0;
  const word = wordNow(g);
  const theme = nakhatiThemeOf(word);
  const onScreen = g.where === 'screen' && !all;
  const last = g.turns[g.turns.length - 1];
  const over = nakhatiOver(g);
  const circle = Math.min(circleNow(g), g.rounds);
  const tint = all ? '#7a2028' : TEAM_TINT[team % TEAM_TINT.length];

  const finish = (won: number | null, timeUp = false) => {
    if (phase !== 'play') return;
    if (won !== null) { chime(audio.current, 1); triggerHaptic(25); } else if (!timeUp) { buzz(audio.current); triggerHaptic(30); } else triggerHaptic(150);
    setDrawn(onScreen ? ink.current : '');
    setG(playNakhati(g, won));
    setPhase('result');
  };
  const left = useTurnClock(audio, t0, g.seconds, phase === 'play', () => finish(null, true));
  const go = () => {
    openAudio(audio);
    triggerHaptic(20);
    ink.current = '';
    setT0(Date.now());
    setPhase('play');
  };
  const close = async () => {
    if (phase === 'play' && !(await askConfirm({ title: 'სვლა შეწყდეს?', text: 'ეს სიტყვა არ ჩაითვლება — გუნდი სვლას თავიდან დაიწყებს, სხვა სიტყვით.', ok: 'შეწყვეტა' }))) return;
    // a word seen is not drawn again
    if (phase === 'peek' || phase === 'play') setG(skipWord(g));
    setPhase(g.turns.length ? 'result' : 'ready');
    onClose();
  };
  const mend = (won: number | null) => { triggerHaptic(6); setG(mendLast(g, won)); };

  if (phase === 'end') {
    const best = Math.max(...scores);
    const winners = g.names.filter((_, t) => scores[t] === best);
    return (
      <TableScreen
        title="ნახატობანა · შედეგები"
        onClose={onClose}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-14 !text-[15.5px]">დახურვა</Btn>
            <Btn size="lg" full icon={<RotateCcw />} onClick={() => { onAgain(); setPhase('ready'); }} className="!h-14 !text-[15.5px]">თავიდან</Btn>
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

  /** a team's turn: guessed or not (side by side under the screen, one over the other beside the pad) */
  const hitMiss = (stacked: boolean) => (
    <div className={stacked ? 'w-full flex flex-col-reverse gap-2' : 'grid grid-cols-2 gap-2'}>
      <button type="button" onClick={() => finish(null)} className={`${short ? 'h-12' : 'h-16'} w-full rounded-2xl bg-white ring-1 ring-[#e8dcc8] text-[#8a4a2a] font-bold text-[14px] flex items-center justify-center gap-1.5 active:scale-[0.97] cursor-pointer`}>
        <X className="w-5 h-5" /> ვერ გამოიცნეს
      </button>
      <button type="button" onClick={() => finish(team)} className={`${short ? 'h-12' : 'h-16'} w-full rounded-2xl bg-[#2f7d4f] text-white font-bold text-[15px] flex items-center justify-center gap-1.5 shadow-[0_6px_16px_-8px_rgba(47,125,79,0.9)] active:scale-[0.97] cursor-pointer`}>
        <Check className="w-5 h-5" /> გამოიცნეს!
      </button>
    </div>
  );
  const footer =
    phase === 'ready' ? <Btn size="lg" full icon={<Eye />} onClick={() => { triggerHaptic(10); setPhase('peek'); }} className="!h-14 !text-[16px]">{all ? 'მხატვრებმა სიტყვა ნახონ' : 'მხატვარმა სიტყვა ნახოს'}</Btn>
    : phase === 'peek' ? (
      <div className="grid grid-cols-2 gap-2">
        <Btn kind="ghost" size="lg" full icon={<Shuffle />} onClick={() => { triggerHaptic(8); setG(skipWord(g)); }} className="!h-14 !text-[15px]">სხვა სიტყვა</Btn>
        <Btn size="lg" full icon={<Play />} onClick={go} className="!h-14 !text-[15.5px]">დაწყება</Btn>
      </div>
    )
    : phase === 'play' && !all ? (short && onScreen ? undefined : hitMiss(false))
    : phase === 'play' ? (
      <div className="space-y-2">
        <p className="text-center text-[12.5px] font-bold text-[#9a8b7b]">ვინ გამოიცნო პირველმა?</p>
        <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(104px,1fr))]">
          {g.names.map((nm, t) => (
            <button
              key={t}
              type="button"
              onClick={() => finish(t)}
              className={`${short ? 'h-11' : 'h-14'} rounded-2xl px-2 text-white font-bold text-[14px] leading-tight break-words active:scale-[0.97] cursor-pointer`}
              style={{ background: TEAM_TINT[t % TEAM_TINT.length] }}
            >
              {nm}
            </button>
          ))}
          <button type="button" onClick={() => finish(null)} className={`${short ? 'h-11' : 'h-14'} rounded-2xl bg-white ring-1 ring-[#e8dcc8] text-[#8a4a2a] font-bold text-[14px] active:scale-[0.97] cursor-pointer`}>
            ვერავინ
          </button>
        </div>
      </div>
    )
    : phase === 'result' ? (
      <Btn size="lg" full icon={over ? <Trophy /> : <ChevronRight />} onClick={() => { triggerHaptic(10); setPhase(over ? 'end' : 'ready'); }} className="!h-14 !text-[15.5px]">
        {over ? 'შედეგები' : `შემდეგი: ${all ? 'ყველა ხატავს' : g.names[team]}`}
      </Btn>
    )
    : undefined;

  const gained = last ? g.names.map((_, t) => (last.won === t ? 1 : 0)) : null;
  const lastNote = last ? nakhatiNote(last.w) : '';

  return (
    <TableScreen
      title={`ნახატობანა · ${phase === 'result' || phase === 'ready' ? `წრე ${circle}/${g.rounds}` : all ? 'ყველა ხატავს' : g.names[team]}`}
      onClose={() => { void close(); }}
      right={<span className="px-1 text-[12px] tabular-nums text-[#9a8b7b]">{secs(g.seconds)}</span>}
      footer={footer}
    >
      {phase === 'ready' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-6">
          <p className="text-[13px] font-bold text-[#9a8b7b]">ჯერია · წრე {circle}/{g.rounds}</p>
          <p className="font-serif-ge text-[36px] font-bold leading-tight break-words max-w-full" style={{ color: tint }}>{all ? 'ყველა ხატავს!' : g.names[team]}</p>
          {!all && <p className="text-[13px] tabular-nums text-[#75685a]">ქულა: {scores[team]}</p>}
          <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-[#75685a]">
            {all
              ? 'ყველა გუნდის მხატვარი მოდის ტელეფონთან და ერთსა და იმავე სიტყვას ნახავს. მერე ყველა თავის გუნდს უხატავს — დაფაზე ან ფურცელზე. ვინც პირველი გამოიცნობს, ქულა იმ გუნდისაა.'
              : g.where === 'screen'
                ? 'მხატვარი იღებს ტელეფონს: სიტყვას მარტო ნახავს და აქვე, ეკრანზე დახატავს. გუნდი უყურებს და ხმამაღლა იცნობს.'
                : 'მხატვარი მოდის ტელეფონთან და სიტყვას მარტო ნახავს, მერე დაფაზე ან ფურცელზე ხატავს. გუნდი ხმამაღლა იცნობს.'}
            {' '}{secsOf(g.seconds)} ბოლოს ზარი დარეკავს.
          </p>
        </div>
      )}

      {phase === 'peek' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-6">
          <p className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#7a2028]"><Eye className="w-4 h-4" aria-hidden="true" />{all ? 'მხოლოდ მხატვრები უყურებენ' : 'მხოლოდ მხატვარი უყურებს'}</p>
          <ThemeTag theme={theme} />
          <p className="font-serif-ge text-[clamp(36px,min(10vw,12vh),64px)] font-bold leading-[1.08] text-[#4a3426] break-words max-w-full">{word}</p>
          {nakhatiNote(word) && <p className="max-w-md text-[13px] leading-snug text-[#75685a]">{nakhatiNote(word)}</p>}
          <p className="max-w-sm text-[12.5px] leading-snug text-[#9a8b7b]">{DRAW_RULE} სიტყვა უცნობია? „სხვა სიტყვა“.</p>
        </div>
      )}

      {phase === 'play' && onScreen && (
        <div className={`flex-1 flex ${short ? 'flex-row items-start justify-center gap-3' : 'flex-col gap-2'} py-1 w-full ${short ? '' : 'max-w-2xl mx-auto'}`}>
          <div className={`flex items-center gap-3 ${short ? 'flex-col w-[156px] shrink-0 text-center gap-2.5' : ''}`}>
            <TimerRing left={left} total={g.seconds} size="sm" />
            <ThemeTag theme={theme} />
            {short && hitMiss(true)}
          </div>
          <InkPad
            key={g.at}
            onChange={t => { ink.current = t; }}
            width={short ? SHORT_SIDE : inkWidth(410)}
            aside={short}
          />
        </div>
      )}
      {phase === 'play' && !onScreen && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-4">
          <TimerRing left={left} total={g.seconds} />
          <p className="font-serif-ge text-[26px] font-bold leading-tight break-words max-w-full" style={{ color: tint }}>{all ? 'ყველა ხატავს!' : `ხატავს „${g.names[team]}“`}</p>
          <ThemeTag theme={theme} />
          <p className="max-w-sm text-[13px] leading-snug text-[#75685a]">
            {all ? 'ვინც პირველი გამოიცნობს, ქვემოთ იმ გუნდს დააჭირე.' : 'გამოიცნეს — დააჭირე „გამოიცნეს!“.'} {DRAW_RULE}
          </p>
        </div>
      )}

      {phase === 'result' && last && (
        <div className="flex-1 flex flex-col gap-3 py-2 w-full max-w-2xl mx-auto">
          <div className="text-center space-y-1">
            <p className="text-[13px] font-bold text-[#9a8b7b]">{last.team < 0 ? 'ყველა ხატავდა' : `ხატავდა „${g.names[last.team]}“`}</p>
            <p className="font-serif-ge text-[30px] font-bold leading-tight text-[#4a3426] break-words">{last.w}</p>
            {lastNote && <p className="max-w-md mx-auto text-[13px] leading-snug text-[#75685a]">{lastNote}</p>}
          </div>
          {drawn && <InkView ink={drawn} width="min(100%, 220px)" className="mx-auto" label={`ნახატი: ${last.w}`} />}
          <p className="text-center text-[18px] font-bold" style={{ color: last.won === null ? '#8a4a2a' : TEAM_TINT[last.won % TEAM_TINT.length] }} role="status">
            {last.won === null ? 'ვერავინ გამოიცნო' : `+1 · ${g.names[last.won]}`}
          </p>
          <div className="space-y-1.5">
            <p className="text-center text-[12px] text-[#9a8b7b]">შეცდომით მოინიშნა? შეასწორე:</p>
            <div className="flex flex-wrap justify-center gap-1.5" role="group" aria-label="შესწორება">
              {last.team < 0
                ? g.names.map((nm, t) => <Chip key={t} on={last.won === t} onClick={() => mend(t)}>{nm}</Chip>)
                : <Chip on={last.won === last.team} onClick={() => mend(last.team)}>გამოიცნეს</Chip>}
              <Chip on={last.won === null} onClick={() => mend(null)}>{last.team < 0 ? 'ვერავინ' : 'ვერ გამოიცნეს'}</Chip>
            </div>
          </div>
          <Standings names={g.names} scores={scores} gained={gained} />
        </div>
      )}
    </TableScreen>
  );
};

export const NakhatiTeams: React.FC = () => {
  const [conf, setConfState] = useState<Conf>(() => readConf(load(CONF_KEY)));
  const setConf = (c: Conf) => { setConfState(c); save(CONF_KEY, c); };
  const themes = useThemes();
  const [game, setGameState] = useState<NakhatiTable | null>(() => {
    const g = parseNakhatiTable(load(GAME_KEY), KNOWN);
    return g && !nakhatiOver(g) ? g : null;
  });
  const [open, setOpen] = useState(false);
  const setGame = useCallback((g: NakhatiTable | null) => { setGameState(g); save(GAME_KEY, g); }, []);

  const deal = (names: string[], c: Pick<Conf, 'seconds' | 'rounds' | 'where' | 'allPlay'>) =>
    newNakhatiTable(names, { seconds: c.seconds, rounds: c.rounds, where: c.where, allPlay: c.allPlay }, chosenWords(readThemes()).map(x => x.w));
  const paused = game && !nakhatiOver(game) ? game : null;
  const start = async () => {
    if (paused && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
    triggerHaptic(10);
    setGame(deal(teamNames(conf), conf));
    setOpen(true);
  };
  const again = () => { if (game) setGame(deal(game.names, game)); };
  const size = chosenWords(themes).length;

  if (open && game) return <TableGame g={game} setG={setGame} onClose={() => setOpen(false)} onAgain={again} />;

  const pausedScores = paused ? nakhatiScores(paused) : [];
  return (
    <div className="space-y-4">
      {paused && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული თამაში · წრე {Math.min(circleNow(paused), paused.rounds)}/{paused.rounds}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{paused.names.map((nm, t) => `${nm} ${pausedScores[t]}`).join(' · ')}</p>
            </div>
            <Btn onClick={() => setOpen(true)} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <Card className="!p-4 space-y-4">
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426]">სად ხატავს მხატვარი?</p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="სად ხატავს მხატვარი">
            {([
              { id: 'board', Icon: Presentation, title: 'დაფაზე', text: 'ან ფურცელზე; ტელეფონი წამყვანს უჭირავს' },
              { id: 'screen', Icon: Smartphone, title: 'ეკრანზე', text: 'მხატვარი ტელეფონზე ხატავს, გუნდი უყურებს' },
            ] as const).map(o => {
              const on = conf.where === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => { triggerHaptic(6); setConf({ ...conf, where: o.id }); }}
                  className={`min-h-[84px] rounded-2xl px-3 py-2.5 text-left flex flex-col gap-1 cursor-pointer transition-[background-color] ${on ? 'bg-[#7a2028]/[0.07] ring-2 ring-[#7a2028]' : 'bg-white ring-1 ring-[#e8dcc8] hover:bg-[#fbf6ec]'}`}
                >
                  <span className="inline-flex items-center gap-1.5 text-[14.5px] font-bold text-[#4a3426]"><o.Icon className="w-5 h-5 text-[#7a2028]" aria-hidden="true" />{o.title}</span>
                  <span className="text-[12.5px] leading-snug text-[#75685a]">{o.text}</span>
                </button>
              );
            })}
          </div>
        </div>
        <TeamsEditor conf={conf} onChange={c => setConf({ ...conf, ...c })} />
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Timer className="w-4 h-4 text-[#7a2028]" /> სვლის დრო</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="სვლის დრო">
            {NAKHATI_TURN_SECONDS.map(s => <Chip key={s} on={conf.seconds === s} onClick={() => setConf({ ...conf, seconds: s })}>{secs(s)}</Chip>)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Layers className="w-4 h-4 text-[#7a2028]" /> წრეები</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="წრეები">
            {NAKHATI_ROUNDS.map(r => <Chip key={r} on={conf.rounds === r} onClick={() => setConf({ ...conf, rounds: r })}>{r} წრე</Chip>)}
          </div>
        </div>
        <Toggle
          on={conf.allPlay}
          onChange={on => setConf({ ...conf, allPlay: on })}
          label="„ყველა ხატავს“ ყოველი წრის ბოლოს"
          hint="ყველა გუნდის მხატვარი ერთ სიტყვას ხატავს — ქულა იმ გუნდს, ვინც პირველი გამოიცნობს"
        />
        <NakhatiOptions />
      </Card>
      <Btn size="lg" full icon={<Play />} onClick={() => { void start(); }} disabled={!size} className="!h-14 !text-[15.5px]">დაწყება · {size} სიტყვა</Btn>
      <p className="px-1 text-[12px] leading-snug text-[#9a8b7b]">{UNCHECKED}</p>
    </div>
  );
};
