import React, { useEffect, useRef, useState } from 'react';
import { Hand, Play, Volume2 } from 'lucide-react';
import { Btn } from '../../ui/kit';
import { PLAIN_RHYTHMS, ROUNDS, judgeTaps, judgeTempo, rhythmPlay } from '../../../utils/earTrainer';
import { playLessonNotes } from '../../../utils/chantSynth';
import { triggerHaptic } from '../../../utils/haptics';
import { Dots, RunEnd, Verdict, playAndWait, stopSound, useFinish } from './shared';
import { RhythmBlocks } from './Quiz';

// Taps on a big pad: a rhythm sounds after four clicks and is tapped back, or the click falls silent and the student keeps
// its pace. The phone's own taps are timed (performance.now), so neither needs the microphone.

const TapPad: React.FC<{ onTap: (t: number) => void; label: string; hot?: boolean }> = ({ onTap, label, hot }) => (
  <button
    type="button"
    onPointerDown={e => { e.preventDefault(); onTap(performance.now()); triggerHaptic(8); }}
    className={`w-full h-40 rounded-3xl select-none touch-none cursor-pointer flex flex-col items-center justify-center gap-2 transition-transform active:scale-[0.97] ${hot ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#7a2028]/[0.08] text-[#7a2028]'}`}
  >
    <Hand className="w-9 h-9" />
    <span className="text-[15px] font-bold">{label}</span>
  </button>
);

export const RhythmCopyRun: React.FC<{ drillId: string; intro: string }> = ({ drillId, intro }) => {
  const { best, finish } = useFinish(drillId);
  const [results, setResults] = useState<boolean[]>([]);
  const [pattern, setPattern] = useState<number[] | null>(null);
  const [phase, setPhase] = useState<'listen' | 'tap' | 'judged'>('listen');
  const [taps, setTaps] = useState<number[]>([]);
  const [ok, setOk] = useState(false);
  const [ended, setEnded] = useState(false);
  const live = useRef(true);
  useEffect(() => () => { live.current = false; stopSound(); }, []);

  const run = async (p: number[]) => {
    setPhase('listen');
    setTaps([]);
    await playAndWait(rhythmPlay(p).play, 0.1);
    if (live.current) setPhase('tap');
  };
  const ask = () => { const p = PLAIN_RHYTHMS[Math.floor(Math.random() * PLAIN_RHYTHMS.length)]; setPattern(p); void run(p); };
  const tap = (t: number) => {
    if (phase !== 'tap' || !pattern) return;
    const next = [...taps, t];
    setTaps(next);
    if (next.length === pattern.length) {
      const good = judgeTaps(pattern, next);
      setOk(good);
      setResults(r => [...r, good]);
      setPhase('judged');
    }
  };
  const next = () => {
    if (results.length >= ROUNDS) { finish(Math.round((100 * results.filter(Boolean).length) / ROUNDS)); setEnded(true); return; }
    ask();
  };

  if (ended) return <RunEnd pct={Math.round((100 * results.filter(Boolean).length) / ROUNDS)} best={best} detail={<>{results.filter(Boolean).length} / {ROUNDS} რიტმი</>} onAgain={() => { setEnded(false); setResults([]); setPattern(null); }} />;
  if (!pattern) {
    return (
      <div className="space-y-4 text-center sg-in">
        <p className="text-[15px] leading-relaxed text-[#2a2017]">{intro}</p>
        <Btn size="lg" full icon={<Play />} onClick={ask}>დაწყება · {ROUNDS} რიტმი</Btn>
      </div>
    );
  }
  return (
    <div className="space-y-4 sg-in">
      <Dots results={results} total={ROUNDS} />
      {phase === 'listen' && <p className="text-center text-[15px] font-bold text-[#4a3426]">მოუსმინე: ოთხი წკაპუნი, მერე რიტმი…</p>}
      {phase === 'tap' && <p className="text-center text-[15px] font-bold text-[#7a2028]">შენ: {taps.length} / {pattern.length}</p>}
      {phase !== 'judged' && <TapPad onTap={tap} label={phase === 'tap' ? 'დაუკარი აქ' : 'მოიცადე…'} hot={phase === 'tap'} />}
      {phase === 'judged' && (
        <>
          <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3 text-[#7a2028]"><RhythmBlocks pattern={pattern} /></div>
          <Verdict ok={ok}>{!ok && 'მოუსმინე ისევ და შეადარე გრძელი და მოკლე.'}</Verdict>
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" icon={<Volume2 />} onClick={() => void playAndWait(rhythmPlay(pattern).play)}>მოსმენა</Btn>
            <Btn onClick={next}>{results.length >= ROUNDS ? 'შედეგი' : 'შემდეგი'}</Btn>
          </div>
        </>
      )}
    </div>
  );
};

const TEMPO_BPM = 72;
const LEAD = 8;
const KEEP = 9;

export const TempoRun: React.FC<{ drillId: string; intro: string }> = ({ drillId, intro }) => {
  const { best, finish } = useFinish(drillId);
  const [phase, setPhase] = useState<'intro' | 'lead' | 'alone' | 'end'>('intro');
  const [count, setCount] = useState(0);
  const [result, setResult] = useState<{ score: number; drift: number } | null>(null);
  const taps = useRef<number[]>([]);
  const silentAt = useRef(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => { timers.current.forEach(t => window.clearTimeout(t)); stopSound(); }, []);

  const beat = 60 / TEMPO_BPM;
  const start = () => {
    taps.current = [];
    setCount(0);
    setResult(null);
    setPhase('lead');
    void playLessonNotes(Array.from({ length: LEAD }, (_, k) => [k * beat, 0.06, k % 2 ? 84 : 88]));
    silentAt.current = performance.now() + 60 + (LEAD - 0.5) * beat * 1000;
    timers.current.push(window.setTimeout(() => setPhase('alone'), (LEAD - 0.5) * beat * 1000));
    timers.current.push(window.setTimeout(() => end(), (LEAD + KEEP + 3) * beat * 1000));
  };
  const end = () => {
    const after = taps.current.filter(t => t >= silentAt.current);
    const r = judgeTempo(after.slice(0, KEEP), TEMPO_BPM);
    setResult(r);
    finish(r.score);
    setPhase('end');
  };
  const tap = (t: number) => {
    taps.current.push(t);
    if (t >= silentAt.current) {
      const n = taps.current.filter(x => x >= silentAt.current).length;
      setCount(n);
      if (n >= KEEP) { timers.current.forEach(x => window.clearTimeout(x)); timers.current = []; end(); }
    }
  };

  if (phase === 'end' && result) {
    const pct = Math.round(Math.abs(result.drift) * 100);
    return <RunEnd pct={result.score} best={best} detail={pct <= 2 ? 'ტემპი შეინარჩუნე ✓' : `${result.drift > 0 ? 'შენელდი' : 'აჩქარდი'} ${pct}%-ით`} onAgain={() => setPhase('intro')} />;
  }
  if (phase === 'intro') {
    return (
      <div className="space-y-4 text-center sg-in">
        <p className="text-[15px] leading-relaxed text-[#2a2017]">{intro}</p>
        <Btn size="lg" full icon={<Play />} onClick={start}>დაწყება</Btn>
      </div>
    );
  }
  return (
    <div className="space-y-4 sg-in">
      <p className="text-center text-[15px] font-bold text-[#4a3426]">
        {phase === 'lead' ? 'დააჭირე ყოველ წკაპუნზე…' : `წკაპუნი გაჩუმდა — გააგრძელე! ${count} / ${KEEP}`}
      </p>
      <TapPad onTap={tap} label="ტაში აქ" hot={phase === 'alone'} />
    </div>
  );
};

