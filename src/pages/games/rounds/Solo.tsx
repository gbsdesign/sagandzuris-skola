import React, { useEffect, useState } from 'react';
import { Check, Play, RotateCcw, Timer, Trophy, X } from 'lucide-react';
import { rulesOf, type RoundQ } from '../../../utils/roundGames';
import { SOLO_ROUNDS, betterRun } from '../../../utils/soloRun';
import { clock } from '../../../utils/amikhseni';
import { tbilisiToday } from '../../../utils/hangi';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn, Card } from '../../../components/ui/kit';
import { Hint } from '../samshvilde/parts';
import type { RoundFace } from './face';
import { RoundHead, SnippetBox, TimerRing, useNow } from './parts';
import { setSoloBest, useSoloBest } from './soloStore';
import { useSnippet } from './useSnippet';

// A quick game alone (2026-11-01, the plan's „მარტო“ variant — first „რუკის ვიქტორინა“, then „გააგრძელე!“): ten rounds in a
// row on my phone over the game's own face (its question, answers, verdict and reveal), a tap answers at once, the answer
// shows at once, the quicker the more points (the game's own rules, utils/roundGames.ts); at the end the score, the time and
// my best run, kept on this phone (soloStore.ts). Games of one step only.

const TONE = {
  right: 'bg-[#2f7d4f] text-white',
  near: 'bg-[#a8d1b4] text-[#1e4d31]',
  wrong: 'bg-[#4a3426] text-[#fbf6ec]',
  none: 'bg-[#4a3426]/[0.08] text-[#4a3426]',
} as const;

interface Run { rounds: RoundQ[]; at: number; phase: 'ask' | 'reveal' | 'end'; t0: number; picks: (number | null)[]; ms: number[]; points: number[]; record: boolean }

const secsOf = (q: RoundQ) => rulesOf(q).seconds(q, 0);
const total = (list: number[]) => list.reduce((s, n) => s + n, 0);
const timeText = (ms: number) => clock(Math.round(ms / 1000));

export interface SoloProps {
  face: RoundFace;
  /** the card: its title and what the run is */
  heading: string;
  about: string;
  /** the game's own choices on the card (its topics…) */
  Options?: React.FC;
  /** a line under the start button (who wrote the questions) */
  note?: string;
  /** a round in the list at the end */
  line(q: RoundQ): { title: string; sub?: string };
}

export const RoundsSolo: React.FC<SoloProps> = ({ face, heading, about, Options, note, line }) => {
  const bestKey = `${face.store ?? `sg-${face.game}`}-best`;
  const best = useSoloBest(bestKey);
  const [run, setRun] = useState<Run | null>(null);
  const [empty, setEmpty] = useState(false);
  const snippet = useSnippet(face.clipSeconds);
  const now = useNow(run?.phase === 'ask');

  const q = run && run.phase !== 'end' ? run.rounds[run.at] : null;
  const left = run && q && run.phase === 'ask' ? Math.max(0, secsOf(q) - (now - run.t0) / 1000) : 0;

  /** in a tap: the round's piece plays at once (the phone lets it, the tap is the player's) */
  const begin = (rounds: RoundQ[], at: number) => {
    const c = face.clip?.(rounds[at], 0) ?? null;
    if (c) snippet.play(c); else snippet.stop();
    return Date.now();
  };
  const start = () => {
    snippet.unlock();
    const rounds = face.draw(SOLO_ROUNDS);
    if (!rounds.length) { setEmpty(true); return; }
    setEmpty(false);
    face.remember(rounds);
    const t0 = begin(rounds, 0);
    setRun({ rounds, at: 0, phase: 'ask', t0, picks: [], ms: [], points: [], record: false });
  };
  const answer = (pick: number | null) => {
    if (!run || run.phase !== 'ask') return;
    const round = run.rounds[run.at];
    const limit = secsOf(round) * 1000;
    const ms = Math.min(limit, Date.now() - run.t0);
    const points = pick === null || !rulesOf(round).ok(round, pick) ? 0 : rulesOf(round).points(round, { pick, ms, step: 0 }, limit);
    triggerHaptic(points > 0 ? 12 : 25);
    snippet.stop();
    setRun({ ...run, phase: 'reveal', picks: [...run.picks, pick], ms: [...run.ms, ms], points: [...run.points, points] });
  };
  const next = () => {
    if (!run) return;
    if (run.at + 1 < run.rounds.length) {
      const t0 = begin(run.rounds, run.at + 1);
      setRun({ ...run, at: run.at + 1, phase: 'ask', t0 });
      return;
    }
    snippet.stop();
    const score = total(run.points);
    const right = run.points.filter(p => p > 0).length;
    const ms = total(run.ms);
    const record = score > 0 && betterRun({ score, ms }, best);
    if (record) setSoloBest(bestKey, { score, right, ms, at: tbilisiToday() });
    setRun({ ...run, phase: 'end', record });
  };
  // time's up: no answer
  const timedOut = !!run && run.phase === 'ask' && left <= 0;
  useEffect(() => { if (timedOut) answer(null); }, [timedOut]); // eslint-disable-line react-hooks/exhaustive-deps
  // the run's screen closed: silence
  const close = () => { snippet.stop(); setRun(null); };

  if (run) {
    const score = total(run.points);
    if (run.phase === 'end') {
      const right = run.points.filter(p => p > 0).length;
      return (
        <TableScreen
          title={face.title}
          onClose={close}
          footer={(
            <div className="grid grid-cols-2 gap-2">
              <Btn kind="ghost" size="lg" full onClick={close} className="!h-14 !text-[15.5px]">დახურვა</Btn>
              <Btn size="lg" full onClick={start} icon={<RotateCcw />} className="!h-14 !text-[15.5px]">ხელახლა</Btn>
            </div>
          )}
        >
          <div className="py-2 space-y-4">
            <div className="text-center">
              <Trophy className="w-9 h-9 mx-auto text-[#c9a227]" />
              <p className="mt-1 font-serif-ge text-[30px] font-bold tabular-nums text-[#4a3426]">{score.toLocaleString('ka-GE')}</p>
              <Hint>ქულა · სწორი {right} / {run.rounds.length} · დრო {timeText(total(run.ms))}</Hint>
              {run.record && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#c9a227]/15 px-3 py-1 text-[13.5px] font-bold text-[#8a6d12]">ახალი რეკორდი!</p>}
            </div>
            <ol className="space-y-1.5">
              {run.rounds.map((r, i) => {
                const ok = run.points[i] > 0;
                const l = line(r);
                return (
                  <li key={i} className="flex items-center gap-2.5 rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 py-2">
                    <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${ok ? 'bg-[#2f7d4f] text-white' : 'bg-[#4a3426]/10 text-[#75685a]'}`}>
                      {ok ? <Check className="w-4 h-4" aria-label="სწორი" /> : <X className="w-4 h-4" aria-label="არასწორი" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{l.title}</span>
                      {l.sub && <span className="block text-[12.5px] leading-snug text-[#75685a] [overflow-wrap:anywhere]">{l.sub}</span>}
                    </span>
                    <span className="shrink-0 text-[13px] font-bold tabular-nums text-[#4a3426]">{run.points[i] ? `+${run.points[i]}` : '0'}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </TableScreen>
      );
    }
    const round = run.rounds[run.at];
    const clip = face.clip?.(round, 0) ?? null;
    const tapClip = () => {
      if (!clip) return;
      if (snippet.state === 'play' || snippet.state === 'load') snippet.stop(); else snippet.play(clip);
    };
    if (run.phase === 'reveal') {
      const pick = run.picks[run.at];
      const verdict = face.verdict(round, pick);
      const gained = run.points[run.at];
      const last = run.at + 1 >= run.rounds.length;
      return (
        <TableScreen
          title={face.title}
          onClose={close}
          footer={<Btn size="lg" full onClick={next} className="!h-14 !text-[16px]">{last ? 'შედეგი' : 'შემდეგი'}</Btn>}
        >
          <div className="py-2 space-y-4">
            <RoundHead at={run.at} total={run.rounds.length}>
              <span className="text-[13px] font-bold tabular-nums text-[#4a3426]">{score.toLocaleString('ka-GE')} ქულა</span>
            </RoundHead>
            <div className={`rounded-3xl px-4 py-4 flex items-center gap-3 ${TONE[verdict.tone]}`} role="status">
              <p className="min-w-0 flex-1 font-serif-ge text-[19px] font-bold leading-snug">{verdict.text}</p>
              <p className="shrink-0 font-serif-ge text-[24px] font-bold tabular-nums">{gained > 0 ? `+${gained}` : '0'}</p>
            </div>
            <face.Answer q={round} />
            <face.Reveal q={round} mine={pick} />
          </div>
        </TableScreen>
      );
    }
    return (
      <TableScreen title={face.title} onClose={close}>
        <div className="py-2 space-y-4">
          <RoundHead at={run.at} total={run.rounds.length}>
            <span className="flex items-center gap-3">
              <span className="text-[13px] font-bold tabular-nums text-[#4a3426]">{score.toLocaleString('ka-GE')} ქულა</span>
              <TimerRing left={left} total={secsOf(round)} size="sm" />
            </span>
          </RoundHead>
          {clip && <SnippetBox state={snippet.state} prog={snippet.prog} onTap={tapClip} />}
          {face.Ask
            ? <face.Ask q={round} who="player" step={0} steps={1} />
            : <p className="font-serif-ge text-[18px] font-bold leading-snug text-[#4a3426]">{face.askPlayer}</p>}
          <face.Pick key={run.at} q={round} pick={null} onPick={p => { if (p !== null) answer(p); }} />
        </div>
      </TableScreen>
    );
  }

  return (
    <Card className="!p-4 sm:!p-5 space-y-4">
      <div>
        <p className="flex items-center gap-2 font-serif-ge text-[18px] font-bold text-[#4a3426]"><face.Icon className="w-5 h-5 text-[#7a2028]" />{heading}</p>
        <p className="mt-1.5 text-[13px] leading-snug text-[#75685a]">{about}</p>
      </div>
      {best && (
        <p className="flex items-center gap-2 rounded-2xl bg-[#c9a227]/10 px-3.5 py-2.5 text-[13.5px] font-bold text-[#6f5610]">
          <Timer className="w-4 h-4 shrink-0" />შენი რეკორდი: {best.score.toLocaleString('ka-GE')} ქულა · {best.right} / {SOLO_ROUNDS} · {timeText(best.ms)}
        </p>
      )}
      {Options && <Options />}
      {empty && <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-3.5 py-2.5 text-[13px] font-bold text-amber-900">{face.empty}</p>}
      <Btn size="lg" full onClick={start} icon={<Play />} className="!h-14 !text-[16px]">დაწყება</Btn>
      {note && <Hint>{note}</Hint>}
    </Card>
  );
};
