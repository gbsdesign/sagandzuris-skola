import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ClipboardList, RotateCcw, X } from 'lucide-react';
import type { AbituriProgressApi, TestResult } from '../../../hooks/useAbituriProgress';
import { isRight, isSelfGraded, makeMockTest, MOCK_SECTIONS, startState, type Task, type TaskState } from '../../../utils/theoryDrills';
import { triggerHaptic } from '../../../utils/haptics';
import { CARD } from '../shared';
import { TaskView } from './TaskView';

// The mock test: the university sample's seven parts, new every time, one task at a time; the transposition and
// the grouping are written on paper and checked by the student at the end; then the score (kept in the progress).

interface Run { items: { section: number; task: Task }[]; states: TaskState[]; at: number; phase: 'answer' | 'self' | 'done' }

const MAIN = 'inline-flex items-center gap-1.5 min-h-11 px-5 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[14px] font-bold hover:bg-[#5e1820] cursor-pointer shadow-[0_6px_14px_-8px_rgba(122,32,40,0.7)]';
const PLAIN = 'inline-flex items-center gap-1.5 min-h-11 px-4 rounded-full bg-[#fbf6ec] text-[#4a3426] ring-1 ring-[#e8dcc8] text-[14px] font-bold hover:text-[#7a2028] cursor-pointer';
const day = (t: number) => new Date(t).toLocaleDateString('ka-GE', { day: 'numeric', month: 'short' });

export const MockTest: React.FC<{ progress: AbituriProgressApi }> = ({ progress }) => {
  const [run, setRun] = useState<Run | null>(null);
  const [leaving, setLeaving] = useState(false);
  const start = () => {
    triggerHaptic(12);
    const items = makeMockTest(Math.random);
    setRun({ items, states: items.map(i => startState(i.task)), at: 0, phase: 'answer' });
    setLeaving(false);
  };

  if (!run) return <StartCard onStart={start} tests={progress.progress.tests} />;

  const setState = (i: number, s: TaskState) => setRun(r => r && { ...r, states: r.states.map((x, k) => (k === i ? s : x)) });
  const selfItems = run.items.map((it, i) => ({ ...it, i })).filter(it => isSelfGraded(it.task.kind));
  const finish = (r: Run) => {
    const parts = MOCK_SECTIONS.map((_, sec) => r.items.filter((it, i) => it.section === sec && isRight(it.task, r.states[i])).length);
    const result: TestResult = { at: Date.now(), score: parts.reduce((a, b) => a + b, 0), max: r.items.length, parts };
    progress.addTest(result);
    setRun({ ...r, phase: 'done' });
  };

  if (run.phase === 'done') return <Results run={run} onAgain={start} onClose={() => setRun(null)} />;

  if (run.phase === 'self') {
    const allGraded = selfItems.every(it => run.states[it.i].self !== null);
    return (
      <div className={`${CARD} p-3.5 sm:p-5 space-y-4`}>
        <p className="text-[14.5px] leading-relaxed text-[#3a2d22]">
          ეს ორი დავალება ფურცელზე დაწერე. <b>შეადარე სწორ პასუხს</b> და მონიშნე, როგორ დაწერე:
        </p>
        {selfItems.map(it => {
          const s = run.states[it.i];
          return (
            <div key={it.i} className="rounded-2xl ring-1 ring-[#efe5d4] p-3 sm:p-4">
              <p className="mb-2 text-[12px] font-black uppercase tracking-wide text-[#a0703c]">{it.section + 1}. {MOCK_SECTIONS[it.section]}</p>
              <TaskView task={it.task} state={s} set={x => setState(it.i, x)} reveal />
              <div className="mt-3 flex flex-wrap gap-2">
                {[true, false].map(ok => (
                  <button
                    key={String(ok)}
                    type="button"
                    onClick={() => { triggerHaptic(10); setState(it.i, { ...s, self: ok }); }}
                    className={`inline-flex items-center gap-1.5 min-h-11 px-4 rounded-full text-[14px] font-bold ring-1 cursor-pointer ${
                      s.self === ok
                        ? ok ? 'bg-[#2f6b43] text-white ring-[#2f6b43]' : 'bg-[#a3262f] text-white ring-[#a3262f]'
                        : ok ? 'bg-[#edf6ef] text-[#24563a] ring-[#7fb893]' : 'bg-[#fbeeee] text-[#a3262f] ring-[#e7a9ae]'
                    }`}
                  >
                    {ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />} {ok ? 'სწორად დავწერე' : 'შევცდი'}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        <button type="button" disabled={!allGraded} onClick={() => finish(run)} className={`${MAIN} disabled:opacity-40 disabled:cursor-default`}>
          ქულის ნახვა <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // answering, one task at a time
  const item = run.items[run.at];
  const inSection = run.items.filter(it => it.section === item.section);
  const nth = run.items.slice(0, run.at + 1).filter(it => it.section === item.section).length;
  const last = run.at === run.items.length - 1;
  const go = (at: number) => { triggerHaptic(10); setRun({ ...run, at }); };
  const done = () => {
    triggerHaptic(12);
    if (selfItems.length) setRun({ ...run, phase: 'self' });
    else finish(run);
  };

  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="flex items-center gap-2 px-3.5 sm:px-4 pt-2.5 pb-2 bg-[#fffdf8]">
        <span className="flex-1 min-w-0 text-[13px] font-bold text-[#4a3426]">
          <span className="text-[#a0703c]">{item.section + 1}. {MOCK_SECTIONS[item.section]}</span>
          {inSection.length > 1 && <span className="tabular-nums text-[#8a7a6a]"> · {nth} / {inSection.length}</span>}
        </span>
        <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-[#8a7a6a]">{run.at + 1} / {run.items.length}</span>
        <button type="button" onClick={() => setLeaving(true)} aria-label="ტესტის შეწყვეტა" className="shrink-0 grid place-items-center w-9 h-9 rounded-full text-[#8a7a6a] hover:bg-[#f3ead9] hover:text-[#2a2017] cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="h-1.5 bg-[#f3ead9]">
        <div className="h-full bg-[#7a2028] transition-[width] duration-300" style={{ width: `${((run.at + 1) / run.items.length) * 100}%` }} />
      </div>
      {leaving && (
        <div className="flex flex-wrap items-center gap-2 px-3.5 sm:px-4 py-2.5 bg-[#fbeeee] border-b border-[#efc4c7]">
          <span className="flex-1 min-w-0 text-[13.5px] font-semibold text-[#a3262f]">შევწყვიტო ტესტი? პასუხები არ შეინახება.</span>
          <button type="button" onClick={() => setRun(null)} className="min-h-9 px-3.5 rounded-full bg-[#a3262f] text-white text-[13px] font-bold cursor-pointer">შეწყვეტა</button>
          <button type="button" onClick={() => setLeaving(false)} className="min-h-9 px-3.5 rounded-full bg-white text-[#4a3426] ring-1 ring-[#e8dcc8] text-[13px] font-bold cursor-pointer">გაგრძელება</button>
        </div>
      )}
      <div className="px-3.5 sm:px-5 py-4">
        <TaskView key={run.at} task={item.task} state={run.states[run.at]} set={s => setState(run.at, s)} reveal={false} />
      </div>
      <div className="px-3.5 sm:px-5 pb-4 flex items-center gap-2">
        {run.at > 0 && (
          <button type="button" onClick={() => go(run.at - 1)} className={PLAIN}>
            <ArrowLeft className="w-4 h-4" /> უკან
          </button>
        )}
        <button type="button" onClick={() => (last ? done() : go(run.at + 1))} className={`ml-auto ${MAIN}`}>
          {last ? 'დასრულება' : 'შემდეგი'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const StartCard: React.FC<{ onStart: () => void; tests: TestResult[] }> = ({ onStart, tests }) => (
  <div className={`${CARD} p-4 sm:p-5`}>
    <div className="flex items-start gap-3">
      <span className="shrink-0 grid place-items-center w-11 h-11 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028]">
        <ClipboardList className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <h3 className="font-serif-ge text-[17px] font-bold leading-snug text-[#2a2017]">საცდელი ტესტი</h3>
        <p className="mt-1 text-[13.5px] leading-relaxed text-[#6b5c4d]">
          როგორც ნამდვილ გამოცდაზე: 4 კილო, 10 ინტერვალი, 6 აკორდი, ტრანსპონირება, დაჯგუფება, 5 ასო და 5 პაუზა.
          ყოველ ჯერზე ახალი; ქულა — ბოლოს.
        </p>
      </div>
    </div>
    {tests.length > 0 && (
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tests.slice(-6).reverse().map(t => (
          <span key={t.at} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#fbf6ec] ring-1 ring-[#efe5d4] text-[12.5px] font-semibold text-[#6b5c4d]">
            {day(t.at)} <b className="tabular-nums text-[#2a2017]">{t.score}/{t.max}</b>
          </span>
        ))}
      </div>
    )}
    <button type="button" onClick={onStart} className={`mt-3.5 ${MAIN}`}>
      ტესტის დაწყება <ArrowRight className="w-4 h-4" />
    </button>
  </div>
);

const Results: React.FC<{ run: Run; onAgain: () => void; onClose: () => void }> = ({ run, onAgain, onClose }) => {
  const rows = MOCK_SECTIONS.map((name, sec) => {
    const idx = run.items.map((it, i) => ({ it, i })).filter(x => x.it.section === sec);
    return { name, sec, right: idx.filter(x => isRight(x.it.task, run.states[x.i])).length, all: idx.length };
  });
  const score = rows.reduce((a, r) => a + r.right, 0), max = run.items.length;
  const wrong = run.items.map((it, i) => ({ ...it, i })).filter(it => !isSelfGraded(it.task.kind) && !isRight(it.task, run.states[it.i]));
  const pct = score / max;
  return (
    <div className="space-y-3">
      <div className={`${CARD} p-4 sm:p-5`}>
        <p className="text-center text-[12px] font-black uppercase tracking-wide text-[#a0703c]">საცდელი ტესტის შედეგი</p>
        <p className="mt-1 text-center font-serif-ge text-[40px] font-bold leading-none tabular-nums text-[#2a2017]">
          {score}<span className="text-[22px] text-[#8a7a6a]"> / {max}</span>
        </p>
        <p className={`mt-1.5 text-center text-[14px] font-semibold ${pct >= 0.85 ? 'text-[#2f6b43]' : pct >= 0.6 ? 'text-[#a0703c]' : 'text-[#a3262f]'}`}>
          {pct >= 0.85 ? 'ძალიან კარგია!' : pct >= 0.6 ? 'კარგია — გაიმეორე სუსტი თემები.' : 'გაიმეორე გაკვეთილები და ივარჯიშე.'}
        </p>
        <ul className="mt-4 space-y-2">
          {rows.map(r => (
            <li key={r.sec} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-[13.5px] font-semibold text-[#3a2d22]">{r.sec + 1}. {r.name}</span>
              <span className="flex-1 h-2 rounded-full bg-[#f3ead9] overflow-hidden">
                <span className={`block h-full rounded-full ${r.right === r.all ? 'bg-[#4f9466]' : 'bg-[#c9a66b]'}`} style={{ width: `${(r.right / r.all) * 100}%` }} />
              </span>
              <span className="w-10 shrink-0 text-right text-[13px] font-bold tabular-nums text-[#4a3426]">{r.right}/{r.all}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onAgain} className={MAIN}><RotateCcw className="w-4 h-4" /> ახალი ტესტი</button>
          <button type="button" onClick={() => { triggerHaptic(10); onClose(); }} className={PLAIN}>დახურვა</button>
        </div>
      </div>
      {wrong.length > 0 && (
        <div className={`${CARD} p-3.5 sm:p-5`}>
          <h4 className="mb-3 font-serif-ge text-[17px] font-bold text-[#7a2028]">შეცდომები ({wrong.length})</h4>
          <ol className="space-y-3">
            {wrong.map(it => (
              <li key={it.i} className="rounded-2xl ring-1 ring-[#efe5d4] p-3 sm:p-4">
                <p className="mb-2 text-[12px] font-black uppercase tracking-wide text-[#a0703c]">{it.section + 1}. {MOCK_SECTIONS[it.section]}</p>
                <TaskView task={it.task} state={run.states[it.i]} set={() => {}} reveal />
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};
