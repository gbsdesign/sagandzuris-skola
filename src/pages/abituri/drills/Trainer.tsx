import React, { useState } from 'react';
import { ArrowRight, Check, Ear, X } from 'lucide-react';
import type { AbituriProgressApi } from '../../../hooks/useAbituriProgress';
import { isAnswered, isRight, isSelfGraded, makeTask, startState, type TaskKind } from '../../../utils/theoryDrills';
import { triggerHaptic } from '../../../utils/haptics';
import { CARD } from '../shared';
import { TaskView } from './TaskView';

// Endless practice: pick a kind, get a new task every time, check it; the counts go to the student's progress.

export const DRILLS: { kind: TaskKind; title: string; task?: number }[] = [
  { kind: 'mode', title: 'კილოები', task: 1 },
  { kind: 'interval', title: 'ინტერვალები', task: 2 },
  { kind: 'chord', title: 'აკორდები', task: 3 },
  { kind: 'transpose', title: 'ტრანსპონირება', task: 4 },
  { kind: 'group', title: 'დაჯგუფება', task: 5 },
  { kind: 'letter', title: 'ასოები', task: 6 },
  { kind: 'rest', title: 'პაუზები', task: 7 },
  { kind: 'earInterval', title: 'ინტერვალი სმენით' },
  { kind: 'earChord', title: 'აკორდი სმენით' },
  { kind: 'dictation', title: 'კარნახი' },
];
const title = (k: TaskKind) => DRILLS.find(d => d.kind === k)?.title ?? (k === 'motif' ? 'მოტივის გამეორება' : '');
let seq = 0; // a new task, a fresh view

const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode; stat?: [number, number] }> = ({ on, onClick, children, stat }) => (
  <button
    type="button"
    onClick={() => { triggerHaptic(10); onClick(); }}
    aria-pressed={on}
    className={`inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-full text-[13px] font-bold transition-colors cursor-pointer ${
      on ? 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_6px_14px_-8px_rgba(122,32,40,0.7)]' : 'bg-[#fbf6ec] text-[#4a3426] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/30 hover:text-[#7a2028]'
    }`}
  >
    {children}
    {stat && stat[1] > 0 && <span className={`text-[11.5px] font-semibold tabular-nums ${on ? 'text-[#fbf6ec]/75' : 'text-[#a0703c]'}`}>{stat[0]}/{stat[1]}</span>}
  </button>
);

export const Trainer: React.FC<{ progress: AbituriProgressApi; kind: TaskKind | null; setKind: (k: TaskKind | null) => void }> = ({ progress, kind, setKind }) => {
  const stats = progress.progress.drills;
  return (
    <div className="space-y-3">
      <div className={`${CARD} p-3.5 sm:p-4`}>
        <p className="px-0.5 mb-2 text-[12px] font-black uppercase tracking-wide text-[#a0703c]">ტესტის დავალებები</p>
        <div className="flex flex-wrap gap-2">
          {DRILLS.filter(d => d.task).map(d => (
            <Chip key={d.kind} on={kind === d.kind} onClick={() => setKind(kind === d.kind ? null : d.kind)} stat={stats[d.kind]}>
              <span className={`tabular-nums ${kind === d.kind ? 'text-[#fbf6ec]/70' : 'text-[#b3a28d]'}`}>{d.task}.</span> {d.title}
            </Chip>
          ))}
        </div>
        <p className="px-0.5 mt-3.5 mb-2 text-[12px] font-black uppercase tracking-wide text-[#a0703c]">სმენა</p>
        <div className="flex flex-wrap gap-2">
          {DRILLS.filter(d => !d.task).map(d => (
            <Chip key={d.kind} on={kind === d.kind} onClick={() => setKind(kind === d.kind ? null : d.kind)} stat={stats[d.kind]}>
              <Ear className="w-4 h-4" /> {d.title}
            </Chip>
          ))}
        </div>
      </div>
      {kind && <Drill key={kind} kind={kind} progress={progress} onClose={() => setKind(null)} />}
    </div>
  );
};

// a pair of choices above the task (an easy/hard level, a low/high voice); changing one gives a new task
const Toggle: React.FC<{ value: boolean; labels: [string, string]; onChange: (v: boolean) => void }> = ({ value, labels, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {[false, true].map(v => (
      <button
        key={String(v)}
        type="button"
        onClick={() => { if (v !== value) { triggerHaptic(8); onChange(v); } }}
        aria-pressed={v === value}
        className={`min-h-9 px-3.5 rounded-full text-[12.5px] font-bold cursor-pointer ${v === value ? 'bg-[#2a2017] text-[#fbf6ec]' : 'bg-[#fbf6ec] text-[#4a3426] ring-1 ring-[#e8dcc8]'}`}
      >
        {labels[v ? 1 : 0]}
      </button>
    ))}
  </div>
);

const LEVELS: Partial<Record<TaskKind, [string, string]>> = {
  earInterval: ['ხუთი მთავარი', 'ყველა ინტერვალი'],
  earChord: ['მაჟორი თუ მინორი', 'შებრუნებებითაც'],
  motif: ['3–4 ბგერა', '5–7, რიტმით'],
};

/** one kind of practice: a task, its check, the next one; the counts go to the progress */
export const Drill: React.FC<{ kind: TaskKind; progress: AbituriProgressApi; onClose: () => void }> = ({ kind, progress, onClose }) => {
  const levels = LEVELS[kind];
  const [hard, setHard] = useState(false);
  const [low, setLow] = useState(false);
  const fresh = (h = hard, l = low) => { const task = makeTask(kind, Math.random, h, l); return { task, state: startState(task), reveal: false, n: ++seq }; };
  const [cur, setCur] = useState(fresh);
  const [score, setScore] = useState({ right: 0, all: 0 });
  const self = isSelfGraded(kind);
  const graded = self ? cur.state.self !== null : cur.reveal;
  const right = cur.reveal && isRight(cur.task, cur.state);

  const count = (ok: boolean) => {
    setScore(s => ({ right: s.right + (ok ? 1 : 0), all: s.all + 1 }));
    progress.countDrill(kind, ok);
  };
  const check = () => {
    triggerHaptic(12);
    setCur(c => ({ ...c, reveal: true }));
    if (!self) count(isRight(cur.task, cur.state));
  };
  const grade = (ok: boolean) => {
    triggerHaptic(12);
    setCur(c => ({ ...c, state: { ...c.state, self: ok } }));
    count(ok);
  };
  const next = (h = hard, l = low) => { triggerHaptic(10); setCur(fresh(h, l)); };
  const sung = kind === 'motif';

  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 border-b border-[#efe5d4] bg-[#fffdf8]">
        <span className="flex-1 min-w-0 font-serif-ge text-[16px] font-bold text-[#2a2017]">{title(kind)}</span>
        {score.all > 0 && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2.5 h-8 rounded-full bg-[#edf6ef] text-[#2f6b43] text-[13px] font-bold tabular-nums">
            <Check className="w-4 h-4" /> {score.right} / {score.all}
          </span>
        )}
        <button type="button" onClick={() => { triggerHaptic(10); onClose(); }} aria-label="დახურვა" className="shrink-0 grid place-items-center w-9 h-9 rounded-full text-[#8a7a6a] hover:bg-[#f3ead9] hover:text-[#2a2017] cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>
      {levels && (
        <div className="px-3.5 sm:px-4 pt-3 space-y-2">
          <Toggle value={hard} labels={levels} onChange={h => { setHard(h); next(h, low); }} />
          {sung && <Toggle value={low} labels={['მაღალი ხმა', 'დაბალი ხმა']} onChange={l => { setLow(l); next(hard, l); }} />}
        </div>
      )}
      <div className="px-3.5 sm:px-5 py-4">
        <TaskView key={cur.n} task={cur.task} state={cur.state} set={state => setCur(c => ({ ...c, state }))} reveal={cur.reveal} />
      </div>
      <div className="px-3.5 sm:px-5 pb-4 flex flex-wrap items-center gap-2">
        {!cur.reveal && (
          <button
            type="button"
            disabled={!self && !isAnswered(cur.task, cur.state)}
            onClick={check}
            className="inline-flex items-center gap-1.5 min-h-11 px-5 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[14px] font-bold hover:bg-[#5e1820] disabled:opacity-40 cursor-pointer disabled:cursor-default"
          >
            {!self ? 'შემოწმება' : sung || kind === 'dictation' ? 'ნოტების ნახვა' : 'პასუხის ნახვა'}
          </button>
        )}
        {cur.reveal && self && cur.state.self === null && (
          <>
            <span className="w-full text-[13.5px] font-semibold text-[#4a3426]">
              {sung ? 'შეადარე ნოტებს და კიდევ მოუსმინე — სწორად გაიმეორე?' : 'შეადარე შენს ჩანაწერს — სწორად დაწერე?'}
            </span>
            <button type="button" onClick={() => grade(true)} className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-full bg-[#edf6ef] text-[#24563a] ring-1 ring-[#7fb893] text-[14px] font-bold cursor-pointer">
              <Check className="w-4 h-4" /> სწორად
            </button>
            <button type="button" onClick={() => grade(false)} className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-full bg-[#fbeeee] text-[#a3262f] ring-1 ring-[#e7a9ae] text-[14px] font-bold cursor-pointer">
              <X className="w-4 h-4" /> შევცდი
            </button>
          </>
        )}
        {graded && (
          <>
            {!self && (
              <span className={`inline-flex items-center gap-1.5 text-[14.5px] font-bold ${right ? 'text-[#2f6b43]' : 'text-[#a3262f]'}`}>
                {right ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />} {right ? 'სწორია!' : 'არასწორია'}
              </span>
            )}
            <button
              type="button"
              onClick={() => next()}
              className="ml-auto inline-flex items-center gap-1.5 min-h-11 px-5 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[14px] font-bold hover:bg-[#5e1820] cursor-pointer"
            >
              შემდეგი <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
