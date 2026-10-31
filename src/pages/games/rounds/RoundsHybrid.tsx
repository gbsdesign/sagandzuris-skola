import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Eye, Mic, Minus, Play, Plus, RotateCcw, Timer, Trophy, Users } from 'lucide-react';
import { MAX_TEAMS, MIN_TEAMS, ROUND_COUNTS, hybridNext, hybridScores, hybridStep, markTeam, rulesOf, type HybridState } from '../../../utils/roundGames';
import { TEAM_NAMES } from '../../../utils/amikhseni';
import { TableScreen } from '../../../components/games/TableScreen';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card, FIELD } from '../../../components/ui/kit';
import { bell, closeAudio, openAudio } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { Hint } from '../samshvilde/parts';
import type { RoundFace } from './face';
import { useSnippet } from './useSnippet';
import { Podium, RoundHead, SnippetBox, Standings, TimerRing, useNow } from './parts';

// A quick game on one phone (the user's „ჰიბრიდული“, 2026-10-31): the host holds it, the class plays in teams. The round's
// piece plays on this phone and its time runs from the first ▶ (a round without one: from „დროის დაწყება“, once the host
// has read it out); the teams talk it over and write their answer down; the
// host opens the answer and marks each team — the phone adds it up. A round of steps (more of the piece at each) goes on
// with the host's „შემდეგი ხმა“ / „მეტი ნოტი“, which plays the next piece at once. A game of turns (`face.turns`, the
// singing tournament) goes one by one instead: the phone is passed hand to hand, each one's own `Pick` gives their points.
// The game is kept on the device after every step (the page keeps it), so ✕ only pauses it.

export interface HybridConf { teams: number; names: string[]; count: number }

export const readHybridConf = (raw: unknown): HybridConf => {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<HybridConf>;
  const teams = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, Math.round(Number(o.teams)) || 3));
  const names = TEAM_NAMES.map((n, i) => { const v = o.names?.[i]; return (typeof v === 'string' && v.trim() ? v.trim() : n).slice(0, 16); });
  return { teams, names, count: ROUND_COUNTS.includes(Number(o.count)) ? Number(o.count) : 8 };
};

export const HybridSetup: React.FC<{
  face: RoundFace; conf: HybridConf; setConf: (c: HybridConf) => void; paused: HybridState | null; empty: boolean;
  onStart: () => void; onResume: () => void;
}> = ({ face, conf, setConf, paused, empty, onStart, onResume }) => {
  const sides = face.sides ?? { many: 'გუნდები', one: 'გუნდი' };
  return (
  <div className="space-y-4">
    {paused && (
      <Card className="!p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 basis-52">
            <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული თამაში · რაუნდი {paused.at + 1} / {paused.rounds.length}</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{paused.teams.join(' · ')}</p>
          </div>
          <Btn onClick={onResume} icon={<Play />}>გაგრძელება</Btn>
        </div>
      </Card>
    )}
    <Card className="!p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Users className="w-4 h-4 text-[#7a2028]" /> {sides.many} · {conf.teams}</p>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="ერთით ნაკლები" disabled={conf.teams <= MIN_TEAMS} onClick={() => { triggerHaptic(5); setConf({ ...conf, teams: conf.teams - 1 }); }} className="w-11 h-11 rounded-full flex items-center justify-center text-[#7a2028] ring-1 ring-[#e8dcc8] bg-white disabled:opacity-35 cursor-pointer disabled:cursor-default"><Minus className="w-4 h-4" /></button>
          <button type="button" aria-label="ერთით მეტი" disabled={conf.teams >= MAX_TEAMS} onClick={() => { triggerHaptic(5); setConf({ ...conf, teams: conf.teams + 1 }); }} className="w-11 h-11 rounded-full flex items-center justify-center text-[#7a2028] ring-1 ring-[#e8dcc8] bg-white disabled:opacity-35 cursor-pointer disabled:cursor-default"><Plus className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {conf.names.slice(0, conf.teams).map((n, i) => (
          <input
            key={i}
            value={n}
            maxLength={16}
            aria-label={`${sides.one} ${i + 1}`}
            onChange={e => setConf({ ...conf, names: conf.names.map((x, k) => (k === i ? e.target.value : x)) })}
            onBlur={() => { if (!conf.names[i].trim()) setConf({ ...conf, names: conf.names.map((x, k) => (k === i ? TEAM_NAMES[i] : x)) }); }}
            className={`${FIELD} !h-11 !text-[14px] font-bold`}
          />
        ))}
      </div>
      {face.fixedRounds ? <p className="text-[13.5px] font-bold text-[#4a3426]">რაუნდები · {face.fixedRounds}</p> : (
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426]">რაუნდები</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="რაუნდები">
            {ROUND_COUNTS.map(c => <Chip key={c} on={conf.count === c} onClick={() => setConf({ ...conf, count: c })}>{c}</Chip>)}
          </div>
        </div>
      )}
      {face.Options && <face.Options />}
      {empty && <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-2.5 text-[13px] font-bold leading-snug text-amber-800">{face.empty}</p>}
      <Btn size="lg" full onClick={onStart} icon={<Play />} className="!h-14 !text-[16px]">{paused ? 'ახალი თამაში' : 'თამაშის დაწყება'}</Btn>
    </Card>
  </div>
  );
};

export const HybridGame: React.FC<{ face: RoundFace; h: HybridState; setH: (h: HybridState) => void; onClose: () => void; onAgain: () => void }> = ({
  face, h, setH, onClose, onAgain,
}) => {
  const q = h.rounds[h.at];
  const rules = rulesOf(q);
  const steps = rules.steps(q);
  const snippet = useSnippet(face.clipSeconds);
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => () => closeAudio(audio), []);
  const [endAt, setEndAt] = useState(0);
  const asking = h.phase === 'ask';
  const now = useNow(asking && endAt > 0);
  const total = rules.seconds(q, h.step);
  const left = endAt ? Math.max(0, (endAt - now) / 1000) : total;
  // a new round waits for its first ▶
  useEffect(() => { setEndAt(0); snippet.stop(); }, [h.at, h.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  const rang = useRef(0);
  useEffect(() => {
    if (asking && endAt && left <= 0 && rang.current !== endAt) { rang.current = endAt; bell(audio.current); triggerHaptic(40); }
  }, [asking, endAt, left]);

  // the step's piece; at the answer the whole of it
  const clip = face.clip?.(q, asking ? h.step : steps) ?? null;
  const tapClip = () => {
    openAudio(audio);
    if (!clip) return;
    if (snippet.state === 'play' || snippet.state === 'load') { snippet.stop(); return; }
    snippet.play(clip);
    if (!endAt && asking) setEndAt(Date.now() + total * 1000);
  };
  const more = asking && h.step < steps;
  // the next step: its piece plays at once (this tap lets it sound) and its time runs
  const moveOn = () => {
    triggerHaptic(12);
    openAudio(audio);
    const n = hybridStep(h);
    setH(n);
    if (n.phase !== 'ask') { snippet.stop(); return; }
    const c = face.clip?.(q, n.step) ?? null;
    if (c) snippet.play(c); else snippet.stop();
    setEndAt(Date.now() + rules.seconds(q, n.step) * 1000);
  };
  const startTime = () => { openAudio(audio); triggerHaptic(10); if (!endAt && asking) setEndAt(Date.now() + total * 1000); };
  const scores = hybridScores(h);
  const next = () => { triggerHaptic(12); snippet.stop(); setH(hybridNext(h)); };
  // one by one (face.turns): whose turn it is (unchosen: the first who has not had it) and their take, not kept yet
  const [turn, setTurn] = useState<number | null>(null);
  const [take, setTake] = useState<number | null>(null);
  useEffect(() => { setTurn(null); setTake(null); }, [h.at, h.phase]);

  if (h.phase === 'end') {
    return (
      <TableScreen
        title={face.title}
        onClose={onClose}
        footer={(
          <div className="space-y-2">
            <Btn size="lg" full onClick={onAgain} icon={<RotateCcw />} className="!h-14 !text-[16px]">კიდევ ერთხელ</Btn>
            <button type="button" onClick={onClose} className="w-full h-11 rounded-full text-[13px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">დახურვა</button>
          </div>
        )}
      >
        <div className="py-2 space-y-4">
          <div className="text-center">
            <Trophy className="w-9 h-9 mx-auto text-[#c9a227]" />
            <p className="mt-1 font-serif-ge text-[22px] font-bold text-[#4a3426]">თამაში დასრულდა</p>
            <Hint>{h.rounds.length} რაუნდი · {h.teams.length} გუნდი</Hint>
          </div>
          <Podium names={h.teams} scores={scores} />
          <Standings names={h.teams} scores={scores} />
        </div>
      </TableScreen>
    );
  }

  if (face.turns) {
    const marks = h.marks[h.at];
    const last = h.at + 1 >= h.rounds.length;
    if (h.phase === 'reveal') {
      return (
        <TableScreen
          title={face.title}
          onClose={onClose}
          footer={<Btn size="lg" full onClick={next} icon={last ? <Trophy /> : <ChevronRight />} className="!h-14 !text-[16px]">{last ? 'შედეგები' : 'შემდეგი რაუნდი'}</Btn>}
        >
          <div className="py-2 space-y-4">
            <RoundHead at={h.at} total={h.rounds.length} />
            <face.Answer q={q} />
            <face.Reveal q={q} picks={marks} />
            <Standings names={h.teams} scores={scores} gained={marks.map(m => m ?? 0)} />
          </div>
        </TableScreen>
      );
    }
    const waiting = marks.findIndex(m => m === null);
    const cur = turn ?? (waiting >= 0 ? waiting : null);
    const sung = marks.filter(m => m !== null).length;
    const keep = () => {
      if (cur === null || take === null) return;
      triggerHaptic(15);
      setH(markTeam(h, cur, take));
      setTurn(null);
      setTake(null);
    };
    const choose = (i: number) => { triggerHaptic(8); setTurn(i); setTake(null); };
    const sides = face.sides ?? { many: 'გუნდები', one: 'გუნდი' };
    return (
      <TableScreen
        title={face.title}
        onClose={onClose}
        footer={cur !== null ? (
          <div className="flex gap-3">
            <Btn kind="ghost" size="lg" onClick={next} icon={<Eye />} className="!h-14 !px-5">შედეგები</Btn>
            <Btn size="lg" disabled={take === null} onClick={keep} icon={<Check />} className="!h-14 !text-[15.5px] flex-1">
              {take === null ? face.confirm(q, null) : `შენახვა · ${face.pickName(q, take)}`}
            </Btn>
          </div>
        ) : <Btn size="lg" full onClick={next} icon={<Eye />} className="!h-14 !text-[16px]">შედეგები</Btn>}
      >
        <div className="py-2 space-y-4">
          <RoundHead at={h.at} total={h.rounds.length} />
          {face.Ask && <face.Ask q={q} who="teams" step={h.step} steps={steps} />}
          {cur !== null && (
            <section className="space-y-3" aria-live="polite">
              <div className="flex items-center gap-3 rounded-2xl bg-[#7a2028] px-4 py-3 text-[#fbf6ec]">
                <Mic className="w-5 h-5 shrink-0" aria-hidden="true" />
                <p className="min-w-0 flex-1 font-serif-ge text-[18px] font-bold leading-snug [overflow-wrap:anywhere]">ახლა: {h.teams[cur]}</p>
                <span className="shrink-0 text-[12.5px] font-bold text-[#fbf6ec]/80">ტელეფონი გადაეცი</span>
              </div>
              <face.Pick key={`${h.at}.${cur}`} q={q} pick={take} onPick={setTake} />
            </section>
          )}
          <section className="space-y-2">
            <p className="text-[13.5px] font-bold text-[#4a3426]">{sides.many} · {sung} / {h.teams.length}</p>
            <ul className="space-y-1.5">
              {h.teams.map((t, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => choose(i)}
                    aria-pressed={i === cur}
                    className={`w-full flex items-center gap-3 min-h-12 rounded-2xl px-3 text-left cursor-pointer ${i === cur ? 'bg-[#7a2028]/[0.07] ring-2 ring-[#7a2028]' : 'bg-white ring-1 ring-[#e8dcc8] hover:bg-[#fbf6ec]'}`}
                  >
                    <span className="min-w-0 flex-1 text-[14px] font-bold leading-tight text-[#4a3426] [overflow-wrap:anywhere]">{t}</span>
                    <span className={`shrink-0 text-[13.5px] font-bold tabular-nums ${marks[i] === null ? 'text-[#9a8b7b]' : 'text-[#2f7d4f]'}`}>
                      {marks[i] === null ? 'ჯერ არა' : face.pickName(q, marks[i]!)}
                    </span>
                    {h.at > 0 && <span className="shrink-0 min-w-[4.5rem] text-right text-[13px] font-bold tabular-nums text-[#a0703c]">ჯამი {scores[i]}</span>}
                  </button>
                </li>
              ))}
            </ul>
            <Hint>შეეხე სახელს, რომ მისი რიგი ახლავე იყოს ან თავიდან იმღეროს.</Hint>
          </section>
        </div>
      </TableScreen>
    );
  }

  if (h.phase === 'reveal') {
    const last = h.at + 1 >= h.rounds.length;
    const marks = h.marks[h.at];
    return (
      <TableScreen
        title={face.title}
        onClose={onClose}
        footer={<Btn size="lg" full onClick={next} icon={last ? <Trophy /> : <ChevronRight />} className="!h-14 !text-[16px]">{last ? 'შედეგები' : 'შემდეგი რაუნდი'}</Btn>}
      >
        <div className="py-2 space-y-4">
          <RoundHead at={h.at} total={h.rounds.length} />
          <face.Answer q={q} />
          <face.Reveal q={q} />
          <section className="space-y-2">
            <p className="text-[13.5px] font-bold text-[#4a3426]">რა დაწერა თითო გუნდმა?</p>
            <ul className="space-y-2">
              {h.teams.map((t, i) => (
                <li key={i} className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 text-[14.5px] font-bold text-[#4a3426] [overflow-wrap:anywhere]">{t}</p>
                    <p className="shrink-0 text-[14px] font-bold tabular-nums text-[#a0703c]">{scores[i]} ქულა</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`${t} — ქულა`}>
                    {face.marks.map(m => (
                      <Chip key={m.points} on={marks[i] === m.points} onClick={() => setH(markTeam(h, i, marks[i] === m.points ? null : m.points))}>
                        {m.label}{m.points > 0 ? ` · ${m.points}` : ''}
                      </Chip>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          {clip && <SnippetBox state={snippet.state} prog={snippet.prog} onTap={tapClip} />}
        </div>
      </TableScreen>
    );
  }

  return (
    <TableScreen
      title={face.title}
      onClose={onClose}
      footer={more ? (
        <div className="flex gap-3">
          <Btn kind="ghost" size="lg" onClick={next} icon={<Eye />} className="!h-14 !px-5">პასუხი</Btn>
          <Btn size="lg" onClick={moveOn} icon={<ChevronRight />} className="!h-14 !text-[16px] flex-1">{face.nextLabel ?? 'შემდეგი'}</Btn>
        </div>
      ) : <Btn size="lg" full onClick={next} icon={<Eye />} className="!h-14 !text-[16px]">პასუხის ჩვენება</Btn>}
    >
      <div className="py-2 space-y-4">
        <RoundHead at={h.at} total={h.rounds.length} />
        <div className="flex items-center gap-4">
          <TimerRing left={left} total={total} />
          <p className="min-w-0 flex-1 font-serif-ge text-[19px] font-bold leading-snug text-[#4a3426]">{face.askTeams}</p>
        </div>
        {face.Ask && <face.Ask q={q} who="teams" step={h.step} steps={steps} />}
        {clip && <SnippetBox state={snippet.state} prog={snippet.prog} onTap={tapClip} note={endAt ? undefined : 'დრო პირველ ▶-ზე დაიწყება'} />}
        {!clip && !endAt && <Btn kind="ghost" size="lg" full onClick={startTime} icon={<Timer />} className="!h-12">დროის დაწყება · {total} წამი</Btn>}
        <Standings names={h.teams} scores={scores} />
      </div>
    </TableScreen>
  );
};
