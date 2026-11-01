import React, { useEffect, useRef, useState } from 'react';
import { Check, Play, RotateCcw, Timer, Trophy, Volume2 } from 'lucide-react';
import { MELODY_POOL } from '../../../data/melodyPool';
import { EQO_START, checkTaps, eqoLine, eqoTimed, keysOf, pickMelody, rightFromStart, type Melody } from '../../../utils/eqo';
import { betterRun } from '../../../utils/soloRun';
import { tbilisiToday } from '../../../utils/hangi';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn, Card } from '../../../components/ui/kit';
import { Hint } from '../samshvilde/parts';
import { setSoloBest, useSoloBest } from '../rounds/soloStore';
import { useSnippet } from '../rounds/useSnippet';
import { Keys, Taps, useLit } from './Keys';
import { EqoOptions } from './Options';
import { BEST, lights, readSeen, rememberPlayed } from './store';

// „ექო“ alone (like Simon): a melody's opening, three notes first; every right answer adds the next note, a wrong key ends the
// run. The record is the longest phrase I tapped back whole, kept on this phone (rounds/soloStore.ts); at the end the melody
// is named — the opening of which chant or song it was.

type Phase = 'listen' | 'play' | 'good' | 'over';
interface Run {
  melody: Melody; line: number[]; keys: number[]; len: number; taps: number[]; phase: Phase; t0: number; glow: boolean;
  flash: { key: number; ok: boolean; n: number } | null; win: boolean; record: boolean;
}

export const EqoSolo: React.FC = () => {
  const best = useSoloBest(BEST);
  const [run, setRun] = useState<Run | null>(null);
  const [empty, setEmpty] = useState(false);
  const snippet = useSnippet(30);
  const lit = useLit();
  const wait = useRef(0);
  useEffect(() => () => window.clearTimeout(wait.current), []);

  const hear = (r: Run) => snippet.play({ notes: eqoTimed(r.line.slice(0, r.len)) });
  const start = () => {
    snippet.unlock();
    const melody = pickMelody(MELODY_POOL, readSeen(), 12);
    if (!melody) { setEmpty(true); return; }
    setEmpty(false);
    rememberPlayed([melody.id]);
    const line = eqoLine(melody);
    const r: Run = { melody, line, keys: keysOf(line), len: EQO_START, taps: [], phase: 'listen', t0: Date.now(), glow: lights.read(), flash: null, win: false, record: false };
    setRun(r);
    hear(r);
  };
  // the phrase has sounded: my turn
  useEffect(() => {
    if (run?.phase === 'listen' && snippet.state === 'done') setRun({ ...run, phase: 'play' });
  }, [snippet.state]); // eslint-disable-line react-hooks/exhaustive-deps
  // a tap's ring on its key, a moment
  useEffect(() => {
    if (!run?.flash) return;
    const t = window.setTimeout(() => setRun(r => (r ? { ...r, flash: null } : r)), 260);
    return () => window.clearTimeout(t);
  }, [run?.flash]);

  const end = (r: Run, win: boolean) => {
    const score = win ? r.len : r.len - 1;
    const ms = Date.now() - r.t0;
    const record = score >= EQO_START && betterRun({ score, ms }, best);
    if (record) setSoloBest(BEST, { score, right: score, ms, at: tbilisiToday() });
    setRun({ ...r, phase: 'over', win, record });
  };
  const tap = (i: number) => {
    if (!run || run.phase !== 'play') return;
    const taps = [...run.taps, i];
    const res = checkTaps(run.line.slice(0, run.len), run.keys, taps);
    const flash = { key: i, ok: res !== 'wrong', n: taps.length };
    if (res === 'wrong') { triggerHaptic(30); end({ ...run, taps, flash }, false); return; }
    if (res === 'more') { setRun({ ...run, taps, flash }); return; }
    triggerHaptic(12);
    const good: Run = { ...run, taps, flash, phase: 'good' };
    setRun(good);
    window.clearTimeout(wait.current);
    wait.current = window.setTimeout(() => {
      const len = good.len + 1;
      if (len > good.line.length) { end(good, true); return; }
      const n: Run = { ...good, len, taps: [], flash: null, phase: 'listen' };
      setRun(n);
      hear(n);
    }, 900);
  };
  const close = () => { window.clearTimeout(wait.current); snippet.stop(); setRun(null); };

  if (run && run.phase === 'over') {
    const phrase = run.line.slice(0, run.len);
    const score = run.win ? run.len : run.len - 1;
    return (
      <TableScreen
        title="ექო"
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
            <p className="mt-1 font-serif-ge text-[30px] font-bold tabular-nums text-[#4a3426]">{score} ნოტი</p>
            <Hint>{run.win ? 'მთელი დასაწყისი გაიმეორე — ბოლომდე!' : 'ყველაზე გრძელი ფრაზა, რომელიც მთლიანად გაიმეორე'}</Hint>
            {run.record && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#c9a227]/15 px-3 py-1 text-[13.5px] font-bold text-[#8a6d12]">ახალი რეკორდი!</p>}
          </div>
          <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-4 text-center space-y-3">
            <div>
              <p className="font-serif-ge text-[18px] font-bold leading-snug text-[#1e4d31] [overflow-wrap:anywhere]">„{run.melody.title}“-ის დასაწყისი</p>
              <p className="mt-0.5 text-[12.5px] text-[#75685a]">{run.melody.ref}</p>
            </div>
            {!run.win && (
              <>
                <div className="space-y-1.5">
                  <p className="text-[12.5px] font-bold text-[#75685a]">ფრაზა</p>
                  <Taps keys={run.keys} taps={phrase.map(n => run.keys.indexOf(n))} length={phrase.length} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[12.5px] font-bold text-[#75685a]">შენ აკრიფე</p>
                  <Taps keys={run.keys} taps={run.taps} length={run.taps.length} wrongFrom={rightFromStart(phrase, run.keys, run.taps)} />
                </div>
              </>
            )}
          </section>
        </div>
      </TableScreen>
    );
  }

  if (run) {
    const at = run.glow && lit.midi !== null ? run.keys.indexOf(lit.midi) : -1;
    const stuck = run.phase === 'listen' && (snippet.state === 'blocked' || snippet.state === 'error');
    return (
      <TableScreen title="ექო" onClose={close}>
        <div className="py-2 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-bold tabular-nums text-[#a0703c]">ფრაზა · {run.len} ნოტი</p>
            {best && <p className="text-[12.5px] font-bold tabular-nums text-[#8a6d12]">რეკორდი: {best.score}</p>}
          </div>
          <p className={`min-h-[2rem] text-center font-serif-ge text-[20px] font-bold leading-snug ${run.phase === 'good' ? 'text-[#2f7d4f]' : 'text-[#4a3426]'}`} role="status">
            {run.phase === 'listen' ? 'მოუსმინე…' : run.phase === 'good' ? <span className="inline-flex items-center gap-1.5"><Check className="w-6 h-6" />სწორია!</span> : 'შენი ჯერია'}
          </p>
          {stuck && <Btn full onClick={() => hear(run)} icon={<Volume2 />}>მოსმენა</Btn>}
          <Keys keys={run.keys} lit={at} flash={run.flash} disabled={run.phase !== 'play'} onTap={tap} />
          <Taps keys={run.keys} taps={run.taps} length={run.len} />
          <Hint className="text-center">ყოველი სწორი ფრაზის მერე ერთი ნოტი ემატება. ერთი შეცდომა — და თამაში მთავრდება.</Hint>
        </div>
      </TableScreen>
    );
  }

  return (
    <Card className="!p-4 sm:!p-5 space-y-4">
      <div>
        <p className="font-serif-ge text-[18px] font-bold text-[#4a3426]">რამდენ ნოტს გაიმეორებ?</p>
        <p className="mt-1.5 text-[13px] leading-snug text-[#75685a]">
          შენ მარტო: ტელეფონი სამ ნოტს უკრავს, შენ იმეორებ; მერე ოთხს, ხუთს… ყოველ ჯერზე ერთი ნოტით მეტს. ერთი შეცდომა და თამაში მთავრდება — ბოლოს გაიგებ, რომელი საგალობლის ან სიმღერის დასაწყისი იყო.
        </p>
      </div>
      {best && (
        <p className="flex items-center gap-2 rounded-2xl bg-[#c9a227]/10 px-3.5 py-2.5 text-[13.5px] font-bold text-[#6f5610]">
          <Timer className="w-4 h-4 shrink-0" />შენი რეკორდი: {best.score} ნოტი
        </p>
      )}
      <EqoOptions />
      {empty && <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-3.5 py-2.5 text-[13px] font-bold text-amber-900">მელოდიები ვერ მოიძებნა.</p>}
      <Btn size="lg" full onClick={start} icon={<Play />} className="!h-14 !text-[16px]">დაწყება</Btn>
    </Card>
  );
};
