import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Flame, Heart, HeartCrack, RotateCcw, X } from 'lucide-react';
import { answered, isRight, newRun, nextItem, runLost, runWon, shuffle, rng, type Exercise, type OldScript, type Run } from '../../../utils/anbani';
import { ALPHABET, LETTER_NAMES, SCRIPT_BY, SCRIPT_LABEL, toScript, type Script } from '../../../utils/oldScripts';
import { bell, buzz, chime, closeAudio, openAudio, type AudioRef } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { fireworks } from '../../../utils/samosiFireworks';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn } from '../../../components/ui/kit';
import { TraceBoard } from './Trace';

// A lesson of „სამი დამწერლობა“ (2026-11-01), full screen: the progress bar and three hearts on top, one exercise at a time,
// and the answer's bar below („სწორია!“ / the right answer) — as Duolingo does. A miss costs a heart and the exercise comes
// back at the end; no hearts — „სცადე თავიდან“. The rules: utils/anbani.ts.

type Phase = 'ask' | 'right' | 'wrong';
const nameOf = (l: string) => LETTER_NAMES[ALPHABET.indexOf(l)] ?? '';
const OLD = 'font-serif-ge';

const Hearts: React.FC<{ n: number }> = ({ n }) => (
  <span className="h-10 px-3 rounded-full bg-white ring-1 ring-[#e8dcc8] inline-flex items-center gap-1" aria-label={`გული: ${n}`}>
    {[0, 1, 2].map(i => <Heart key={i} className={`w-[18px] h-[18px] ${i < n ? 'fill-[#c8323c] text-[#c8323c]' : 'text-[#d8cbb6]'}`} aria-hidden="true" />)}
  </span>
);

const Prompt: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="text-center font-serif-ge text-[19px] font-bold text-[#4a3426] leading-snug">{children}</p>;

const optionLook = (phase: Phase, value: string, chosen: string | null, right: string) => {
  if (phase === 'ask') return 'bg-white ring-[#e8dcc8] text-[#4a3426] active:scale-[0.97] hover:ring-[#7a2028]/40';
  if (value === right) return 'bg-[#e6f2e9] ring-[#2f7d4f] text-[#2f7d4f]';
  if (value === chosen) return 'bg-[#fbe9e7] ring-[#c8323c] text-[#a0322e]';
  return 'bg-white ring-[#e8dcc8] text-[#b9a88f]';
};

/** a 2×2 of answers; `old` draws them in the lesson's script */
const Options: React.FC<{ options: string[]; right: string; chosen: string | null; phase: Phase; onPick: (v: string) => void; draw?: (v: string) => string; big?: boolean }> = ({ options, right, chosen, phase, onPick, draw, big }) => (
  <div className="grid grid-cols-2 gap-2.5 w-full max-w-sm mx-auto">
    {options.map(o => (
      <button
        key={o}
        type="button"
        disabled={phase !== 'ask'}
        onClick={() => onPick(o)}
        className={`min-h-16 rounded-2xl px-2 py-2 ring-2 transition cursor-pointer disabled:cursor-default font-bold leading-tight [overflow-wrap:anywhere] ${optionLook(phase, o, chosen, right)} ${draw ? `${OLD} ${big ? 'text-[40px]' : 'text-[26px]'}` : big ? 'text-[30px]' : 'text-[18px]'}`}
      >
        {draw ? draw(o) : o}
      </button>
    ))}
  </div>
);

/** a line's words in order: tap the tiles, tap a placed word to take it back */
const OrderBoard: React.FC<{ ex: Extract<Exercise, { kind: 'order' }>; picked: number[]; setPicked: (p: number[]) => void; phase: Phase; seed: number }> = ({ ex, picked, setPicked, phase, seed }) => {
  const tiles = useMemo(() => shuffle(ex.words.map((w, i) => ({ w, i })), rng(seed)), [ex, seed]);
  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      <div className={`min-h-[60px] rounded-2xl px-2 py-2 flex flex-wrap gap-1.5 items-start border-2 ${phase === 'ask' ? 'bg-[#fbf6ec] border-dashed border-[#d9c9ad]' : phase === 'right' ? 'bg-[#e6f2e9] border-[#2f7d4f]' : 'bg-[#fbe9e7] border-[#c8323c]'}`} aria-label="შენი რიგი">
        {picked.map((ti, k) => (
          <button key={ti} type="button" disabled={phase !== 'ask'} onClick={() => setPicked(picked.filter((_, j) => j !== k))} className="h-11 px-3 rounded-xl bg-white ring-1 ring-[#d9c9ad] text-[16px] font-bold text-[#4a3426] cursor-pointer disabled:cursor-default">
            {tiles.find(t => t.i === ti)?.w}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {tiles.map(t => {
          const used = picked.includes(t.i);
          return (
            <button key={t.i} type="button" disabled={used || phase !== 'ask'} onClick={() => { triggerHaptic(5); setPicked([...picked, t.i]); }} className={`h-11 px-3 rounded-xl text-[16px] font-bold ring-1 transition cursor-pointer ${used ? 'bg-[#f3ece0] text-transparent ring-[#efe5d3]' : 'bg-white text-[#4a3426] ring-[#e8dcc8] shadow-[0_2px_0_#e8dcc8] active:translate-y-[1px]'}`}>
              {t.w}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const LessonScreen: React.FC<{
  script: OldScript;
  title: string;
  make: (attempt: number) => Exercise[];
  streak: number;
  /** the letters a lesson brings, for its last screen */
  fresh: string[];
  onLetter: (letter: string, right: boolean) => void;
  onWin: () => void;
  onClose: () => void;
}> = ({ script, title, make, streak, fresh, onLetter, onWin, onClose }) => {
  const audio: AudioRef = useRef<AudioContext | null>(null);
  useEffect(() => { openAudio(audio); return () => closeAudio(audio); }, []);
  const [attempt, setAttempt] = useState(0);
  const [run, setRun] = useState<Run>(() => newRun(make(0)));
  const [phase, setPhase] = useState<Phase>('ask');
  const [chosen, setChosen] = useState<string | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const won = runWon(run);
  const lost = runLost(run) && phase === 'ask';
  const told = useRef(false);
  useEffect(() => {
    if (!won || told.current) return;
    told.current = true;
    bell(audio.current);
    fireworks(true);
    onWin();
  }, [won, onWin]);

  const ex = run.items[run.at];
  const old = (s: string) => toScript(s, script);

  const answer = (right: boolean, letter?: string) => {
    if (letter) onLetter(letter, right);
    if (right) { triggerHaptic(20); chime(audio.current, 1); } else { triggerHaptic(60); buzz(audio.current); }
    setRun(r => answered(r, right));
    setPhase(right ? 'right' : 'wrong');
  };
  const pick = (v: string) => {
    if (!ex || phase !== 'ask') return;
    setChosen(v);
    answer(isRight(ex, v), ex.kind === 'pick' || ex.kind === 'find' ? ex.letter : undefined);
  };
  const next = () => {
    setRun(r => nextItem(r));
    setPhase('ask');
    setChosen(null);
    setPicked([]);
  };
  const again = () => {
    const a = attempt + 1;
    setAttempt(a);
    setRun(newRun(make(a)));
    setPhase('ask');
    setChosen(null);
    setPicked([]);
  };

  const done = run.items.length ? Math.min(1, run.at / run.items.length) : 0;
  const head = (
    <span className="flex-1 min-w-0 flex items-center gap-2">
      <span className="sr-only">{title}</span>
      <span className="flex-1 h-3.5 rounded-full bg-[#efe5d3] overflow-hidden" role="progressbar" aria-valuenow={Math.round(done * 100)} aria-valuemin={0} aria-valuemax={100}>
        <span className="block h-full rounded-full bg-[#2f7d4f] transition-[width] duration-300" style={{ width: `${Math.max(4, done * 100)}%` }} />
      </span>
    </span>
  );

  if (won) {
    return (
      <TableScreen title={title} onClose={onClose} footer={<Btn size="lg" full onClick={onClose} className="!h-14 !text-[15.5px]">გაგრძელება</Btn>}>
        <div className="my-auto w-full max-w-md mx-auto text-center space-y-4 py-4">
          <span className="samosi-pop mx-auto w-20 h-20 rounded-full bg-[#c9a227] text-white flex items-center justify-center"><Check className="w-10 h-10 stroke-[3]" aria-hidden="true" /></span>
          <p className="font-serif-ge text-[24px] font-bold text-[#7a2028]">გაკვეთილი დასრულდა!</p>
          <div className="flex justify-center gap-2.5 text-[14.5px] font-bold">
            <span className="h-11 px-4 rounded-full bg-[#fff3e0] text-[#c25b12] inline-flex items-center gap-1.5"><Flame className="w-5 h-5" aria-hidden="true" />სერია: {streak}</span>
            <span className="h-11 px-4 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] inline-flex items-center gap-1.5">{run.mistakes ? `${run.mistakes} შეცდომა` : 'უშეცდომოდ!'}</span>
          </div>
          {fresh.length > 0 && (
            <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 py-3">
              <p className="text-[13px] text-[#75685a]">ახალი ასოები — {SCRIPT_LABEL[script]}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {fresh.map(l => (
                  <span key={l} className="w-14 rounded-xl bg-[#fbf6ec] py-1.5 flex flex-col items-center">
                    <span className={`${OLD} text-[30px] leading-none text-[#7a2028]`}>{old(l)}</span>
                    <span className="mt-1 text-[14px] font-bold text-[#4a3426]">{l}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </TableScreen>
    );
  }

  if (lost) {
    return (
      <TableScreen
        title={title}
        onClose={onClose}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-14 !text-[15.5px]">დახურვა</Btn>
            <Btn size="lg" full icon={<RotateCcw />} onClick={again} className="!h-14 !text-[15.5px]">თავიდან</Btn>
          </div>
        )}
      >
        <div className="my-auto w-full max-w-md mx-auto text-center space-y-3 py-4">
          <HeartCrack className="mx-auto w-14 h-14 text-[#c8323c]" aria-hidden="true" />
          <p className="font-serif-ge text-[22px] font-bold text-[#7a2028]">გულები გათავდა</p>
          <p className="text-[15px] leading-snug text-[#4a3426]">არაფერია — ასოები მეორედ უკეთ ჩაგრჩება. სცადე თავიდან.</p>
        </div>
      </TableScreen>
    );
  }

  if (!ex) return null;
  const rightText = ex.kind === 'pick' || ex.kind === 'find' ? ex.letter : ex.kind === 'word' ? ex.word : ex.kind === 'order' ? ex.words.join(' ') : '';
  const footer = ex.kind === 'intro' ? (
    <Btn size="lg" full onClick={next} className="!h-14 !text-[15.5px]">გავიგე</Btn>
  ) : phase !== 'ask' ? (
    <div className={`-mx-1 rounded-2xl px-3 pt-2.5 pb-1 ${phase === 'right' ? 'bg-[#e6f2e9]' : 'bg-[#fbe9e7]'}`} role="status">
      <p className={`text-[16px] font-bold inline-flex items-center gap-1.5 ${phase === 'right' ? 'text-[#2f7d4f]' : 'text-[#a0322e]'}`}>
        {phase === 'right' ? <><Check className="w-5 h-5 stroke-[3]" aria-hidden="true" />სწორია!</> : <><X className="w-5 h-5 stroke-[3]" aria-hidden="true" />სწორი პასუხი:</>}
      </p>
      {phase === 'wrong' && <p className="text-[17px] font-bold text-[#4a3426] leading-snug [overflow-wrap:anywhere]">{rightText}{(ex.kind === 'pick' || ex.kind === 'find') && <span className="font-normal text-[#75685a]"> — „{nameOf(ex.letter)}“</span>}</p>}
      <Btn size="lg" full onClick={next} className={`mt-2 mb-1.5 !h-13 !text-[15.5px] ${phase === 'right' ? '!bg-[#2f7d4f]' : '!bg-[#a0322e]'}`}>გაგრძელება</Btn>
    </div>
  ) : ex.kind === 'order' ? (
    <Btn size="lg" full disabled={picked.length !== ex.words.length} onClick={() => answer(isRight(ex, picked.map(i => ex.words[i])))} className="!h-14 !text-[15.5px]">შემოწმება</Btn>
  ) : undefined;

  return (
    <TableScreen title={head} right={<Hearts n={run.hearts} />} onClose={onClose} footer={footer}>
      <div key={`${run.at}-${attempt}`} className="my-auto w-full max-w-lg mx-auto flex flex-col items-center gap-4 py-3">
        {ex.again && <p className="text-[12.5px] font-bold text-[#b5662b]">კიდევ ერთხელ</p>}
        {ex.kind === 'intro' && (
          <>
            <p className="text-[13px] font-bold tracking-wide text-[#a0703c]">ახალი ასო · {SCRIPT_LABEL[script]}</p>
            <div className="w-44 h-44 rounded-[32px] bg-white ring-1 ring-[#e8dcc8] shadow-[0_6px_18px_-10px_rgba(74,52,38,0.5)] flex items-center justify-center samosi-pop">
              <span className={`${OLD} text-[112px] leading-none text-[#7a2028]`}>{old(ex.letter)}</span>
            </div>
            <p className="text-[18px] text-[#4a3426] text-center leading-snug">ეს არის <b className="text-[30px] align-[-2px] text-[#7a2028]">{ex.letter}</b> — ძველად „{nameOf(ex.letter)}“</p>
            <div className="flex justify-center gap-2">
              {(['asomtavruli', 'nuskhuri', 'mkhedruli'] as Script[]).map(s => (
                <span key={s} className={`w-[88px] rounded-2xl py-2 flex flex-col items-center ${s === script ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}>
                  <span className={`${OLD} text-[30px] leading-none`}>{toScript(ex.letter, s)}</span>
                  <span className={`mt-1.5 text-[11.5px] font-bold ${s === script ? 'text-[#fbf6ec]/85' : 'text-[#75685a]'}`}>{SCRIPT_LABEL[s]}</span>
                </span>
              ))}
            </div>
          </>
        )}
        {ex.kind === 'pick' && (
          <>
            <Prompt>რომელი ასოა?</Prompt>
            <span className={`${OLD} text-[96px] leading-none text-[#7a2028] py-2`}>{old(ex.letter)}</span>
            <Options options={ex.options} right={ex.letter} chosen={chosen} phase={phase} onPick={pick} big />
          </>
        )}
        {ex.kind === 'find' && (
          <>
            <Prompt>როგორ იწერება {SCRIPT_BY[script]}?</Prompt>
            <span className="text-[72px] font-bold leading-none text-[#4a3426] py-1">{ex.letter}</span>
            <Options options={ex.options} right={ex.letter} chosen={chosen} phase={phase} onPick={pick} draw={old} big />
          </>
        )}
        {ex.kind === 'trace' && (
          <>
            <Prompt>მოხაზე თითით: <span className="text-[#7a2028]">{ex.letter}</span></Prompt>
            <TraceBoard glyph={old(ex.letter)} done={phase === 'right'} onPass={() => { if (phase === 'ask') answer(true); }} />
          </>
        )}
        {ex.kind === 'word' && (
          <>
            <Prompt>წაიკითხე</Prompt>
            <span className={`${OLD} text-[44px] leading-tight text-[#7a2028] text-center [overflow-wrap:anywhere] py-2`}>{old(ex.word)}</span>
            <Options options={ex.options} right={ex.word} chosen={chosen} phase={phase} onPick={pick} />
          </>
        )}
        {ex.kind === 'order' && (
          <>
            <Prompt>დაალაგე სიტყვები</Prompt>
            <p className={`${OLD} text-[25px] leading-snug text-[#7a2028] text-center [overflow-wrap:anywhere]`}>{old(ex.line)}</p>
            <OrderBoard ex={ex} picked={picked} setPicked={setPicked} phase={phase} seed={run.at + 31 * attempt + 7} />
          </>
        )}
      </div>
    </TableScreen>
  );
};
