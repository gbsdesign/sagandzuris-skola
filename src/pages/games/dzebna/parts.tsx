import React, { useEffect, useRef, useState } from 'react';
import { BookOpenText, Brain, Check, Delete, Hourglass, MapPinned, Music2, RotateCcw, ScrollText, X } from 'lucide-react';
import { KIND_LABEL, mmss, type Task, type TaskKind } from '../../../utils/dzebna';
import { SCRIPT_LABEL } from '../../../utils/oldScripts';
import { triggerHaptic } from '../../../utils/haptics';
import { KeyStrip } from '../../../components/games/KeyStrip';
import { useSnippet } from '../rounds/useSnippet';
import { SnippetBox } from '../rounds/parts';
import { Letter } from '../rounds/four';
import { Shape } from '../hangebi/Bank';
import { CarvedPlate } from '../tsikhe/parts';

// „საგანძურის ძებნა“'s pieces, shared by the day's hunt and the yard's: the chest, the trail of stations, a found letter, a
// station's task with its four answers, and the letters put in order.

export const GOLD = '#c9a227';

/** the treasure chest — shut, or open on its glow */
export const ChestArt: React.FC<{ open?: boolean; className?: string }> = ({ open = false, className = '' }) => (
  <svg viewBox="0 0 64 60" className={className} aria-hidden="true">
    {open && <ellipse cx="32" cy="30" rx="30" ry="16" fill="#f7d774" opacity="0.55" />}
    <rect x="6" y="30" width="52" height="26" rx="4" fill="#7d4521" />
    <rect x="6" y="30" width="52" height="5" fill="#5e3216" />
    <rect x="15" y="30" width="6" height="26" fill="#e0b44a" />
    <rect x="43" y="30" width="6" height="26" fill="#e0b44a" />
    {open ? (
      <>
        <path d="M8 30 L12 10 Q32 2 52 10 L56 30 Z" fill="#9a5b2e" transform="rotate(-8 8 30)" />
        <rect x="18" y="22" width="28" height="10" rx="3" fill="#ffe9a3" />
        <circle cx="24" cy="25" r="3.2" fill="#f3d27a" stroke="#c9a227" />
        <circle cx="33" cy="24" r="3.6" fill="#f3d27a" stroke="#c9a227" />
        <circle cx="41" cy="26" r="3" fill="#f3d27a" stroke="#c9a227" />
      </>
    ) : (
      <>
        <path d="M6 30 Q6 12 32 12 Q58 12 58 30 Z" fill="#9a5b2e" />
        <path d="M15 30 Q15 15 21 13.2 L21 30 Z" fill="#e0b44a" />
        <path d="M43 13.2 Q49 15 49 30 L43 30 Z" fill="#e0b44a" />
        <rect x="26.5" y="25" width="11" height="13" rx="2.5" fill="#f3d27a" stroke="#a3821b" />
        <circle cx="32" cy="30" r="2" fill="#5e3216" />
        <rect x="31.1" y="30" width="1.8" height="4.5" fill="#5e3216" />
      </>
    )}
  </svg>
);

/** the stations as a path to the chest: a found one golden with its letter, the one at ringed */
export const Trail: React.FC<{ n: number; at: number; letters: string[]; open?: boolean }> = ({ n, at, letters, open = false }) => (
  <ol className="flex items-center justify-center" aria-label={`სადგური ${Math.min(at + 1, n)} / ${n}`}>
    {Array.from({ length: n }, (_, i) => {
      const got = letters[i];
      const here = i === at && !got;
      return (
        <li key={i} className="flex items-center">
          <span
            className={`w-9 h-9 rounded-full flex items-center justify-center font-serif-ge font-bold tabular-nums transition-colors ${
              got ? 'bg-[#c9a227] text-white text-[18px] shadow-[0_3px_0_#a3821b]'
              : here ? 'bg-white text-[#7a2028] text-[15px] ring-[3px] ring-[#7a2028]'
              : 'bg-white/70 text-[#9a8b7b] text-[14px] border-2 border-dashed border-[#d9c9ae]'}`}
            aria-label={got ? `${i + 1}: ${got}` : `${i + 1}`}
          >
            {got ?? i + 1}
          </span>
          <span className={`w-2.5 sm:w-4 h-0.5 ${i < letters.length ? 'bg-[#c9a227]' : 'bg-[#e3d5bd]'}`} aria-hidden="true" />
        </li>
      );
    })}
    <li><ChestArt open={open} className="w-11 h-10" /></li>
  </ol>
);

/** a letter just found: a golden tile that pops */
export const LetterTile: React.FC<{ ch: string; big?: boolean }> = ({ ch, big = false }) => (
  <span className={`samosi-pop inline-flex items-center justify-center rounded-2xl bg-[#c9a227] text-white font-serif-ge font-bold shadow-[0_5px_0_#a3821b] ${big ? 'w-24 h-28 text-[64px]' : 'w-[70px] h-[78px] text-[44px]'}`}>{ch}</span>
);

/** the clock of a hunt (with its penalties) */
export const TimePill: React.FC<{ secs: number; big?: boolean }> = ({ secs, big = false }) => (
  <span className={`inline-flex items-center rounded-full font-bold tabular-nums bg-[#7a2028]/[0.08] text-[#7a2028] ${big ? 'h-12 px-5 text-[26px]' : 'h-9 px-3 text-[15px]'}`} role="timer" aria-label={`დრო ${mmss(secs)}`}>
    {mmss(secs)}
  </span>
);

const KIND_ICON: Record<TaskKind, React.ComponentType<{ className?: string }>> = {
  quiz: Brain, region: MapPinned, year: Hourglass, old: ScrollText, chant: Music2,
};

export const KindPill: React.FC<{ kind: TaskKind; big?: boolean }> = ({ kind, big = false }) => {
  const Ic = KIND_ICON[kind];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] font-bold ${big ? 'h-10 px-4 text-[17px]' : 'h-7 px-2.5 text-[12.5px]'}`}>
      <Ic className={big ? 'w-5 h-5' : 'w-3.5 h-3.5'} />{KIND_LABEL[kind]}
    </span>
  );
};

/** a station's task: what is asked (an inscription, a chant's opening), the answers; the struck ones crossed, the right one
 *  green once found */
export const TaskView: React.FC<{
  task: Task;
  struck: readonly number[];
  onPick?: (i: number) => void;
  /** found: the right one shows, the rest stay */
  solved?: boolean;
  /** waiting (a wrong answer's pause): nothing can be tapped */
  locked?: boolean;
  big?: boolean;
}> = ({ task, struck, onPick, solved = false, locked = false, big = false }) => {
  const [keyOpen, setKeyOpen] = useState(false);
  const snip = useSnippet(14);
  const [shook, setShook] = useState<{ i: number; n: number } | null>(null);
  useEffect(() => { setKeyOpen(false); setShook(null); snip.stop(); }, [task.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (solved) snip.stop(); }, [solved]); // eslint-disable-line react-hooks/exhaustive-deps
  const tap = (i: number) => {
    if (solved || locked || struck.includes(i) || !onPick) return;
    triggerHaptic(8);
    if (i !== task.right) setShook(s => ({ i, n: (s?.n ?? 0) + 1 }));
    onPick(i);
  };
  return (
    <div className="space-y-3">
      <p className={`font-serif-ge font-bold leading-snug text-[#4a3426] ${big ? 'text-[26px]' : 'text-[18px]'}`}>{task.ask}</p>
      {task.old && (
        <div className="space-y-2">
          <CarvedPlate carved={{ text: task.old.word, script: task.old.script }} big={big} />
          <button
            type="button"
            onClick={() => { triggerHaptic(5); setKeyOpen(o => !o); }}
            aria-expanded={keyOpen}
            className="h-9 px-3 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold text-[#7a2028] bg-[#7a2028]/[0.07] hover:bg-[#7a2028]/[0.12] cursor-pointer"
          >
            <BookOpenText className="w-4 h-4" />{keyOpen ? 'გასაღების დამალვა' : `${SCRIPT_LABEL[task.old.script]} ანბანის გასაღები`}
          </button>
          {keyOpen && <KeyStrip script={task.old.script} big={big} />}
        </div>
      )}
      {task.tune && (
        <SnippetBox
          state={snip.state}
          prog={snip.prog}
          onTap={() => (snip.state === 'play' || snip.state === 'load' ? snip.stop() : snip.play({ score: task.tune!, voices: 0, seconds: 14 }))}
          note="სინთეზატორი წიგნის ნოტებით უკრავს დასაწყისს"
        />
      )}
      <ul className={`grid gap-2 ${big ? 'grid-cols-2' : 'sm:grid-cols-2'}`} role="group" aria-label="პასუხები">
        {task.options.map((o, i) => {
          const out = struck.includes(i);
          const right = solved && i === task.right;
          return (
            <li key={`${task.id}-${i}`}>
              <button
                key={shook?.i === i ? shook.n : 0}
                type="button"
                disabled={out || solved || locked || !onPick}
                onClick={() => tap(i)}
                aria-label={`${['ა', 'ბ', 'გ', 'დ'][i]}: ${o}`}
                className={`w-full h-full ${big ? 'min-h-20' : 'min-h-14'} flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-[background-color,transform,opacity] active:scale-[0.99] disabled:active:scale-100 ${
                  right ? 'bg-[#2f7d4f]/[0.1] ring-2 ring-[#2f7d4f]'
                  : out ? 'bg-[#f1ece4] opacity-60'
                  : solved ? 'bg-white ring-1 ring-[#e8dcc8] opacity-55'
                  : `bg-white ring-1 ring-[#e8dcc8] ${locked ? 'opacity-60' : 'hover:bg-[#fbf6ec] cursor-pointer'}`} ${shook?.i === i ? 'sg-shake' : ''}`}
              >
                {right
                  ? <span className="w-9 h-9 shrink-0 rounded-full bg-[#2f7d4f] flex items-center justify-center"><Check className="w-5 h-5 text-white" /></span>
                  : out
                    ? <span className="w-9 h-9 shrink-0 rounded-full bg-[#d8cfc1] flex items-center justify-center"><X className="w-4.5 h-4.5 text-white" /></span>
                    : <Letter i={i} />}
                <span className={`min-w-0 flex-1 font-bold leading-snug [overflow-wrap:anywhere] ${big ? 'text-[20px]' : 'text-[15.5px]'} ${out ? 'text-[#9a8b7b] line-through' : right ? 'text-[#1e4d31]' : 'text-[#4a3426]'}`}>{o}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/** the note under a solved task (a dated task: the three in their years, a line each) */
export const TaskNote: React.FC<{ task: Task }> = ({ task }) => (task.note ? (
  <div className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#efe3cf] px-3.5 py-2.5 space-y-1">
    {task.note.split('\n').map((line, i) => <p key={i} className="text-[13.5px] leading-snug text-[#5a4a3c]">{line}</p>)}
  </div>
) : null);

/** the letters put in order: a tap moves a letter into the first empty box, a tap on a box gives it back; `onFull` hears the
 *  word once every box is filled (none: a scratch pad, nothing is checked) */
export const LetterPad: React.FC<{
  letters: string[];
  onFull?: (word: string) => boolean;
  wrongText?: string;
  big?: boolean;
}> = ({ letters, onFull, wrongText = 'ეს სიტყვა არ არის — სხვა რიგი სცადე', big = false }) => {
  const n = letters.length;
  const [placed, setPlaced] = useState<number[]>([]);
  const [shake, setShake] = useState(0);
  const [bad, setBad] = useState(false);
  const wait = useRef(0);
  useEffect(() => () => window.clearTimeout(wait.current), []);
  useEffect(() => { setPlaced([]); setBad(false); }, [letters.join('')]); // eslint-disable-line react-hooks/exhaustive-deps
  const put = (t: number) => {
    if (placed.includes(t) || placed.length >= n) return;
    triggerHaptic(6);
    const next = [...placed, t];
    setPlaced(next);
    setBad(false);
    if (next.length < n || !onFull) return;
    if (onFull(next.map(i => letters[i]).join(''))) return;
    triggerHaptic(40);
    setShake(s => s + 1);
    setBad(true);
    window.clearTimeout(wait.current);
    wait.current = window.setTimeout(() => setPlaced([]), 1100);
  };
  const boxes = Array.from({ length: n }, (_, i) => (placed[i] === undefined ? null : letters[placed[i]]));
  return (
    <div className="space-y-3">
      <div key={shake} className={`py-1 ${shake ? 'sg-shake' : ''}`}>
        <Shape shape={'_'.repeat(n)} letters={boxes} onBox={i => { setPlaced(placed.slice(0, i)); setBad(false); }} tone={bad ? 'wrong' : 'plain'} />
      </div>
      <p className={`min-h-[1.25rem] text-center text-[13.5px] font-bold ${bad ? 'text-[#b23a48]' : 'text-[#75685a]'}`} role="status">
        {bad ? wrongText : placed.length ? '' : 'შეეხე ასოებს იმ რიგით, როგორც სიტყვაშია'}
      </p>
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="ასოები">
        {letters.map((ch, t) => {
          const used = placed.includes(t);
          return (
            <button
              key={t}
              type="button"
              disabled={used}
              onClick={() => put(t)}
              aria-label={ch}
              className={`${big ? 'w-20 h-[88px] text-[42px]' : 'w-14 h-16 text-[30px]'} rounded-2xl font-serif-ge font-bold transition-[opacity,transform] ${used ? 'opacity-25' : 'bg-[#c9a227] text-white shadow-[0_4px_0_#a3821b] active:translate-y-[2px] active:shadow-none cursor-pointer'}`}
            >
              {ch}
            </button>
          );
        })}
      </div>
      {placed.length > 0 && !bad && (
        <div className="flex justify-center gap-2">
          <button type="button" onClick={() => setPlaced(placed.slice(0, -1))} className="h-10 px-3.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] cursor-pointer active:scale-[0.97]">
            <Delete className="w-4 h-4" />წაშლა
          </button>
          {placed.length > 1 && (
            <button type="button" onClick={() => setPlaced([])} className="h-10 px-3.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] cursor-pointer active:scale-[0.97]">
              <RotateCcw className="w-4 h-4" />თავიდან
            </button>
          )}
        </div>
      )}
    </div>
  );
};
