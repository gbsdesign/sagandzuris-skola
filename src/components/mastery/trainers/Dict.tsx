import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Delete, Equal, Play, Volume2 } from 'lucide-react';
import { Btn } from '../../ui/kit';
import { ROUNDS, dictTask, type DictTask, type Dir } from '../../../utils/earTrainer';
import { Dots, RangeSwitch, RunEnd, Verdict, playAndWait, stopSound, useFinish, useVoiceRange } from './shared';

// „კარნახი“: a few notes of a chant sound; the student writes each step's way — ↑ up, ↓ down, = the same. With two voices
// one holds a note and the other moves; the round says which one to write.

const ICON: Record<Dir, React.ReactNode> = {
  u: <ArrowUp className="w-6 h-6" />,
  d: <ArrowDown className="w-6 h-6" />,
  s: <Equal className="w-6 h-6" />,
};
const NAME: Record<Dir, string> = { u: 'ზემოთ', d: 'ქვემოთ', s: 'იგივე' };

export const DictRun: React.FC<{ drillId: string; notes: number; two?: boolean; intro: string }> = ({ drillId, notes, two = false, intro }) => {
  const { range, base, setRange } = useVoiceRange();
  const { best, finish } = useFinish(drillId);
  const [results, setResults] = useState<boolean[]>([]);
  const [q, setQ] = useState<DictTask | null>(null);
  const [typed, setTyped] = useState<Dir[]>([]);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const live = useRef(true);
  useEffect(() => () => { live.current = false; stopSound(); }, []);

  const play = async (t: DictTask) => { setPlaying(true); await playAndWait(t.play); if (live.current) setPlaying(false); };
  const ask = () => { const t = dictTask(notes, two, base, Math.random); setQ(t); setTyped([]); void play(t); };
  const checked = !!q && typed.length === q.answer.length;
  const ok = checked && typed.every((d, i) => d === q!.answer[i]);
  const type = (d: Dir) => {
    if (!q || checked) return;
    const t = [...typed, d];
    setTyped(t);
    if (t.length === q.answer.length) setResults(r => [...r, t.every((x, i) => x === q.answer[i])]);
  };
  const next = () => {
    if (results.length >= ROUNDS) {
      finish(Math.round((100 * results.filter(Boolean).length) / ROUNDS));
      setEnded(true);
      stopSound();
      return;
    }
    ask();
  };

  if (ended) {
    return <RunEnd pct={Math.round((100 * results.filter(Boolean).length) / ROUNDS)} best={best} detail={<>{results.filter(Boolean).length} / {ROUNDS} ფრაზა სწორად</>} onAgain={() => { setEnded(false); setResults([]); setQ(null); }} />;
  }
  if (!q) {
    return (
      <div className="space-y-4 text-center sg-in">
        <p className="text-[15px] leading-relaxed text-[#2a2017]">{intro}</p>
        <RangeSwitch range={range} onChange={setRange} />
        <Btn size="lg" full icon={<Play />} onClick={ask}>დაწყება · {ROUNDS} ფრაზა</Btn>
      </div>
    );
  }

  return (
    <div className="space-y-4 sg-in">
      <Dots results={results} total={ROUNDS} />
      <p className="text-center text-[15px] font-bold text-[#4a3426]">
        {q.voice === 'top' ? 'დაწერე ზედა ხმა' : q.voice === 'bass' ? 'დაწერე ბანი' : `${q.notes.length} ნოტი — დაწერე მიმართულება`}
      </p>
      <div className="flex justify-center">
        <Btn kind="soft" icon={<Volume2 />} disabled={playing} onClick={() => void play(q)}>{playing ? 'ჟღერს…' : 'კიდევ მოსმენა'}</Btn>
      </div>
      <div className="flex items-center justify-center gap-2" aria-label="შენი პასუხი">
        {q.answer.map((right, i) => {
          const d = typed[i];
          const tone = !checked ? (d ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white text-[#cbbca6] border-2 border-dashed border-[#d9c8ac]')
            : d === right ? 'bg-emerald-600 text-white' : 'bg-rose-500 text-white';
          return <span key={i} className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tone}`}>{d ? ICON[d] : i + 1}</span>;
        })}
      </div>
      {!checked ? (
        <div className="grid grid-cols-3 gap-2">
          {(['u', 's', 'd'] as Dir[]).map(d => (
            <button key={d} type="button" onClick={() => type(d)} aria-label={NAME[d]}
              className="min-h-14 rounded-2xl bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#7a2028] flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-[0.98] transition">
              {ICON[d]}
              <span className="text-[12px] font-bold text-[#4a3426]">{NAME[d]}</span>
            </button>
          ))}
          {typed.length > 0 && (
            <div className="col-span-3 flex justify-center">
              <Btn kind="ghost" size="sm" icon={<Delete />} onClick={() => setTyped(t => t.slice(0, -1))}>წაშლა</Btn>
            </div>
          )}
        </div>
      ) : (
        <>
          <Verdict ok={ok}>
            {!ok && <span className="inline-flex items-center gap-1">სწორი: {q.answer.map((d, i) => <span key={i} className="inline-flex">{d === 'u' ? '↑' : d === 'd' ? '↓' : '='}</span>)}</span>}
          </Verdict>
          <Btn full onClick={next}>{results.length >= ROUNDS ? 'შედეგი' : 'შემდეგი'}</Btn>
        </>
      )}
    </div>
  );
};
