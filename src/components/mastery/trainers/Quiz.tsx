import React, { useEffect, useRef, useState } from 'react';
import { Play, Volume2 } from 'lucide-react';
import { Btn } from '../../ui/kit';
import { ROUNDS, type Quiz } from '../../../utils/earTrainer';
import { Dots, RangeSwitch, RunEnd, Verdict, playAndWait, stopSound, useFinish, useVoiceRange } from './shared';

// A quiz by ear (or by eye — the old letters): ten rounds, a question sounds, the student taps an answer. Higher or
// lower, intervals, Georgian chords, the old letters, rhythms. Wrong answers show the right one; a right one moves on.

export type QuizQ = Quiz & { show?: string; patterns?: number[][] };

export const QuizRun: React.FC<{
  drillId: string;
  make: (base: number) => QuizQ;
  /** the voice switch (questions that sound in the student's range) */
  pitched?: boolean;
  intro: string;
  cols?: 1 | 2 | 3;
  /** an option's own picture (a rhythm) */
  renderOption?: (q: QuizQ, i: number) => React.ReactNode;
}> = ({ drillId, make, pitched, intro, cols = 2, renderOption }) => {
  const { range, base, setRange } = useVoiceRange();
  const { best, finish } = useFinish(drillId);
  const [results, setResults] = useState<boolean[]>([]);
  const [q, setQ] = useState<QuizQ | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const auto = useRef<number | null>(null);
  useEffect(() => () => { stopSound(); if (auto.current) window.clearTimeout(auto.current); }, []);

  const play = async (question: QuizQ) => {
    if (!question.play.length) return;
    setPlaying(true);
    await playAndWait(question.play);
    setPlaying(false);
  };
  const ask = (n: number) => {
    const next = make(base);
    setQ(next);
    setPicked(null);
    if (n === 0) setResults([]);
    void play(next);
  };
  const next = () => {
    if (auto.current) { window.clearTimeout(auto.current); auto.current = null; }
    if (results.length >= ROUNDS) {
      const right = results.filter(Boolean).length;
      finish(Math.round((100 * right) / ROUNDS));
      setEnded(true);
      stopSound();
      return;
    }
    ask(results.length);
  };
  const nextRef = useRef(next);
  nextRef.current = next;
  const answer = (i: number) => {
    if (!q || picked !== null) return;
    setPicked(i);
    const ok = i === q.right;
    setResults(r => [...r, ok]);
    if (ok) auto.current = window.setTimeout(() => { auto.current = null; nextRef.current(); }, 1100);
  };
  const again = () => { setEnded(false); setResults([]); setQ(null); setPicked(null); };

  if (ended) return <RunEnd pct={Math.round((100 * results.filter(Boolean).length) / ROUNDS)} best={best} detail={<>{results.filter(Boolean).length} / {ROUNDS} სწორი</>} onAgain={again} />;

  if (!q) {
    return (
      <div className="space-y-4 text-center sg-in">
        <p className="text-[15px] leading-relaxed text-[#2a2017]">{intro}</p>
        {pitched && <RangeSwitch range={range} onChange={setRange} />}
        <Btn size="lg" full icon={<Play />} onClick={() => ask(0)}>დაწყება · {ROUNDS} კითხვა</Btn>
      </div>
    );
  }

  const grid = cols === 1 ? 'grid-cols-1' : cols === 3 ? 'grid-cols-3' : 'grid-cols-2';
  return (
    <div className="space-y-4 sg-in">
      <Dots results={results} total={ROUNDS} />
      {q.show && <p className="text-center font-serif-ge text-[44px] leading-tight text-[#2a2017] break-words">{q.show}</p>}
      {q.prompt && <p className="text-center text-[14px] text-[#8a7a6a]">{q.prompt}</p>}
      {q.play.length > 0 && (
        <div className="flex justify-center">
          <Btn kind="soft" icon={<Volume2 />} disabled={playing} onClick={() => void play(q)}>{playing ? 'ჟღერს…' : 'კიდევ მოსმენა'}</Btn>
        </div>
      )}
      <div className={`grid ${grid} gap-2`}>
        {q.options.map((label, i) => {
          const right = picked !== null && i === q.right;
          const wrong = picked === i && i !== q.right;
          return (
            <button
              key={i}
              type="button"
              disabled={picked !== null}
              onClick={() => answer(i)}
              className={`min-h-12 px-3 py-2 rounded-2xl text-[14px] font-bold leading-snug ring-1 transition cursor-pointer active:scale-[0.98] disabled:cursor-default ${
                right ? 'bg-emerald-600 text-white ring-emerald-600' : wrong ? 'bg-rose-500 text-white ring-rose-500' : 'bg-white text-[#2a2017] ring-[#e8dcc8] hover:ring-[#7a2028]/40'
              }`}
            >
              {renderOption ? renderOption(q, i) : label}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <>
          <Verdict ok={picked === q.right}>
            {picked !== q.right && <>სწორი: <b>{renderOption ? `${q.options[q.right]} ვარიანტი` : q.options[q.right]}</b></>}
            {q.note && <p className="text-[12.5px] opacity-80">საგალობლიდან: {q.note}</p>}
          </Verdict>
          <Btn full onClick={next}>{results.length >= ROUNDS ? 'შედეგი' : 'შემდეგი'}</Btn>
        </>
      )}
    </div>
  );
};

/** a rhythm as blocks: a long note a long block, a short one a short */
export const RhythmBlocks: React.FC<{ pattern: number[] }> = ({ pattern }) => (
  <span className="flex w-full items-center gap-1 py-1" aria-hidden>
    {pattern.map((d, i) => (
      <span key={i} className="h-5 rounded-md bg-current opacity-80" style={{ flexGrow: d, flexBasis: 0 }} />
    ))}
  </span>
);
