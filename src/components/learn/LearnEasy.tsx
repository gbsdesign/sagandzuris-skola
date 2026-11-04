import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Headphones, Mic, Play, RotateCcw, Send, Snail, Square } from 'lucide-react';
import { BookScore, ChantSynth, makeTimeMap } from '../../utils/chantSynth';
import { LEARNED_SHARE, LearnPart, LearnRecord, chunksOfPart, melodyIn, partState } from '../../utils/learn';
import { noteName } from '../../utils/pearls';
import { singingSupported } from '../../utils/singCapture';
import { saveTake } from '../../hooks/usePearls';
import { triggerHaptic } from '../../utils/haptics';
import type { Voice } from '../../utils/pathItems';
import { PartPicture } from './PartPicture';
import { useSinging } from './LearnShared';

// „მარტივი“ — the beginners' way of the learning mode. A phrase (a part) is cut into small pieces of my voice
// (chunksOfPart: 3–7 notes). Each piece: hear it once (my voice alone, golden on the notes) → sing it back (the phone
// checks it, 70% is enough) → the next. Then the whole phrase is sung; 80% learns it, as in „სრული“ — the same
// record (students.learning), so the teacher's bars and the reviews do not care which way it was learned.
// One big button always says what to do now.

/** A piece is sung right enough with this share of its notes (the whole phrase needs LEARNED_SHARE). */
const PIECE_PASS = 70;
const SLOW_KEY = 'sg-learn-slow';
const readSlow = () => { try { return localStorage.getItem(SLOW_KEY) === '1'; } catch { return false; } };

type Stage = number | 'whole';

export const LearnEasy: React.FC<{
  vid: string;
  score: BookScore;
  parts: LearnPart[];
  rec: LearnRecord;
  today: string;
  loaded: boolean;
  current: number;
  onPick: (part: number) => void;
  voice: Voice;
  uid: string | null;
  sendId: (part: number) => string;
  onTry: (part: number, pct: number, ok: boolean) => void;
  onFull: () => void;
}> = ({ score, parts, rec, today, loaded, current, onPick, voice, uid, sendId, onTry, onFull }) => {
  const vi = Number(voice) - 1;
  const part = parts[current] ?? parts[0];
  const pieces = useMemo(() => chunksOfPart(score, vi, part), [score, vi, part]);
  const [stage, setStage] = useState<Stage>(0);
  const [heard, setHeard] = useState(false);
  const [passed, setPassed] = useState<boolean[]>([]);
  const [slow, setSlow] = useState(readSlow);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState<number | null>(null);
  const [sent, setSent] = useState<'no' | 'busy' | 'yes' | 'failed'>('no');
  const [selfCheck, setSelfCheck] = useState(false);
  const synth = useMemo(() => new ChantSynth(score), [score]);
  const toBeat = useMemo(() => makeTimeMap(score.tempos).toBeat, [score]);
  const raf = useRef(0);

  const whole = stage === 'whole' || pieces.length === 1;
  const range = stage === 'whole' ? { b0: part.b0, b1: part.b1, s0: part.s0, s1: part.s1 } : pieces[Math.min(stage, pieces.length - 1)];
  const target = useMemo(() => melodyIn(score, vi, range.b0, range.b1), [score, vi, range.b0, range.b1]);
  const learnedHere = (rec[current]?.level ?? 0) >= 1;

  // a new phrase or voice: start on its first piece — a learned phrase (a review) goes straight to the whole
  const startedFor = useRef('');
  useEffect(() => {
    if (!loaded) return;
    const key = `${current}|${voice}`;
    if (startedFor.current === key) return;
    startedFor.current = key;
    stop();
    setPassed([]);
    goStage(learnedHere || pieces.length === 1 ? 'whole' : 0);
  }, [current, voice, loaded, pieces.length]);

  // only my voice sounds; the bit plays once and stops back at its start
  useEffect(() => {
    synth.once = true;
    score.voices.forEach((_, i) => synth.setMuted(i, i !== vi));
  }, [synth, vi, score]);
  useEffect(() => { synth.setSpeed(slow ? 0.5 : 0.75); }, [synth, slow]);
  useEffect(() => {
    synth.setLoop(range.s0, range.s1);
    synth.seek(range.s0);
    setBeat(null);
  }, [synth, range.s0, range.s1]);
  useEffect(() => {
    synth.onEnd = () => { setPlaying(false); setBeat(null); setHeard(true); };
    return () => { cancelAnimationFrame(raf.current); synth.onEnd = undefined; synth.dispose(); };
  }, [synth]);

  const follow = () => {
    setBeat(toBeat(synth.position()));
    if (synth.playing) raf.current = requestAnimationFrame(follow);
  };
  function stop() { synth.pause(); cancelAnimationFrame(raf.current); setPlaying(false); setBeat(null); }
  const listen = async () => {
    triggerHaptic(10);
    if (synth.playing) { stop(); return; }
    await synth.play(range.s0);
    setPlaying(true);
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(follow);
  };
  function goStage(s: Stage) {
    stop();
    setStage(s);
    setHeard(false);
    setSent('no');
    setSelfCheck(false);
  }

  const singing = useSinging({
    target, cue: target[0] ?? null, seconds: range.s1 - range.s0, resetKey: `${current}|${voice}|${stage}`, onBeforeSing: stop,
    onScored: pct => {
      if (whole) { onTry(current, pct, pct >= LEARNED_SHARE); triggerHaptic(pct >= LEARNED_SHARE ? 30 : 12); return; }
      if (pct >= PIECE_PASS) setPassed(p => { const n = [...p]; n[stage as number] = true; return n; });
      triggerHaptic(pct >= PIECE_PASS ? 24 : 12);
    },
  });
  const { phase, result, live, error, busy } = singing;
  const canSing = singingSupported() && !error;
  const pass = whole ? LEARNED_SHARE : PIECE_PASS;
  const ok = result != null && result.pct >= pass;
  const hit = result ? result.hits.filter(Boolean).length : 0;

  const nextPiece = () => {
    const s = stage as number;
    if (s + 1 < pieces.length) goStage(s + 1);
    else goStage('whole');
  };
  // where to go after this phrase: the next one still to learn or review today — after it, else from the start
  const open = (i: number) => i !== current && ['new', 'learning', 'due'].includes(partState(rec[i], today));
  const nextPart = (() => {
    for (let i = current + 1; i < parts.length; i++) if (open(i)) return i;
    for (let i = 0; i < current; i++) if (open(i)) return i;
    return -1;
  })();

  // what to do now: one sentence and one big button
  let say: React.ReactNode;
  let main: { label: string; icon: React.ReactNode; run: () => void; disabled?: boolean };
  if (playing) {
    say = whole ? 'ისმის მთლიანი ფრაზა — შენი ხმა.' : 'ისმის ნაწყვეტი — მიჰყევი ოქროსფერ ადგილს ნოტებზე.';
    main = { label: 'გაჩერება', icon: <Square fill="currentColor" />, run: listen };
  } else if (phase === 'cue') {
    say = 'ისმის პირველი ნოტი…';
    main = { label: 'გაუქმება', icon: <Square fill="currentColor" />, run: singing.sing };
  } else if (phase === 'singing') {
    say = <>გისმენ{live != null ? <> · <b className="text-[#7a2028]">{noteName(live)}</b></> : '…'} <span className="text-[#8c7c6b]">გაჩუმდები — თვითონ გაჩერდება.</span></>;
    main = { label: 'დავამთავრე', icon: <Square fill="currentColor" />, run: singing.sing };
  } else if (phase === 'scoring') {
    say = 'ვამოწმებ…';
    main = { label: 'ვამოწმებ…', icon: <Mic />, run: () => undefined, disabled: true };
  } else if (selfCheck || (result && ok)) {
    // done with this bit (sung right, or said so without a microphone)
    if (!whole) {
      say = result && ok ? <><b className="text-[#2f6b43]">კარგია!</b> {hit} ნოტი {result.hits.length}-დან.</> : 'კარგია! გადავიდეთ შემდეგზე.';
      const last = (stage as number) + 1 >= pieces.length;
      main = { label: last ? 'ახლა მთლიანი ფრაზა' : 'შემდეგი ნაწყვეტი', icon: <ChevronRight />, run: nextPiece };
    } else {
      say = <><b className="text-[#2f6b43]">ყოჩაღ! ეს ფრაზა ნასწავლია.</b> გამეორებას აპი შეგახსენებს.</>;
      main = nextPart >= 0
        ? { label: nextPart > current ? 'შემდეგი ფრაზა' : `ფრაზა ${nextPart + 1}`, icon: <ChevronRight />, run: () => { triggerHaptic(10); onPick(nextPart); } }
        : { label: 'ყველა ნასწავლია — ახლა ხმები ერთად', icon: <ChevronRight />, run: onFull };
    }
  } else if (result) {
    say = <>{hit} ნოტი {result.hits.length}-დან. {whole ? `ნასწავლად ჩაითვლება ${LEARNED_SHARE}%-ზე.` : 'კიდევ მოისმინე და სცადე — გამოგივა!'}</>;
    main = { label: 'კიდევ ვცდი', icon: <Mic />, run: singing.sing };
  } else if (!heard) {
    say = whole
      ? (learnedHere ? 'გამეორება: ჯერ მოისმინე მთლიანი ფრაზა.' : 'ყველა ნაწყვეტი გაიარე! ახლა მოისმინე მთლიანი ფრაზა.')
      : 'მოისმინე ეს პატარა ნაწყვეტი — ნოტებზე ოქროსფრად ჩანს.';
    main = { label: whole ? 'მოისმინე ფრაზა' : 'მოისმინე', icon: <Play fill="currentColor" />, run: listen };
  } else if (!canSing) {
    say = whole ? 'ახლა იმღერე მთლიანი ფრაზა ხმამაღლა.' : 'ახლა იმღერე იგივე ხმამაღლა. გამოგივიდა?';
    main = { label: whole ? 'ვიცი' : 'გამომივიდა', icon: <Check />, run: () => { triggerHaptic(20); setSelfCheck(true); if (whole) onTry(current, -1, true); } };
  } else {
    say = whole ? 'ახლა შენ: იმღერე მთლიანი ფრაზა. ჯერ პირველ ნოტს გაიგებ.' : 'ახლა შენ: იმღერე იგივე. ჯერ პირველ ნოტს გაიგებ.';
    main = { label: 'ახლა შენ — იმღერე', icon: <Mic />, run: singing.sing };
  }

  const send = async () => {
    if (!result?.mp3 || !uid) return;
    setSent('busy');
    try { await saveTake(uid, sendId(current), result.mp3, Math.max(0, result.pct), voice); setSent('yes'); triggerHaptic(20); }
    catch (e) { console.warn('learn take send:', (e as { code?: string })?.code || e); setSent('failed'); }
  };

  const learned = parts.filter((_, i) => (rec[i]?.level ?? 0) >= 1).length;
  const due = parts.filter((_, i) => partState(rec[i], today) === 'due').length;
  const steps: Stage[] = pieces.length > 1 ? [...pieces.map((_, i) => i), 'whole'] : ['whole'];

  return (
    <>
      {/* where I am: the phrase, the arrows, how many are learned */}
      <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-2 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { triggerHaptic(8); onPick(current - 1); }} disabled={current <= 0} aria-label="წინა ფრაზა"
            className="w-11 h-11 shrink-0 rounded-full grid place-items-center text-[#574739] hover:bg-[#f6efe3] disabled:opacity-30 cursor-pointer disabled:cursor-default">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-[16px] font-extrabold text-[#2a2017] leading-tight">ფრაზა {current + 1} <span className="text-[#a0907c] font-bold">/ {parts.length}</span></p>
            <p className="text-[12.5px] font-semibold text-[#8c7c6b] leading-tight mt-0.5">
              {learnedHere ? (partState(rec[current], today) === 'due' ? 'დღეს გასამეორებელია' : 'ნასწავლია ✓') : 'ახალი'}
              {' · '}ნასწავლი {learned}/{parts.length}{due > 0 && !learnedHere ? ` · გასამეორებელი ${due}` : ''}
            </p>
          </div>
          <button type="button" onClick={() => { triggerHaptic(8); onPick(current + 1); }} disabled={current >= parts.length - 1} aria-label="შემდეგი ფრაზა"
            className="w-11 h-11 shrink-0 rounded-full grid place-items-center text-[#574739] hover:bg-[#f6efe3] disabled:opacity-30 cursor-pointer disabled:cursor-default">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-1 h-2 px-1" aria-hidden>
          {parts.map((_, i) => {
            const s = partState(rec[i], today);
            return <span key={i} className={`flex-1 rounded-full ${i === current ? 'outline outline-2 outline-offset-1 outline-[#7a2028]/60' : ''}`}
              style={{ background: s === 'new' ? '#efe6d6' : s === 'learning' ? '#efd6a6' : s === 'due' ? '#d79aa0' : '#c9962a' }} />;
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-white ring-2 ring-[#7a2028]/80 shadow-[0_10px_24px_-18px_rgba(122,32,40,0.7)] p-3.5 flex flex-col gap-3">
        {/* the pieces of this phrase, then the whole: done ones golden; a tap goes to one */}
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[12px] font-bold text-[#8c7c6b]">{whole ? 'მთლიანად' : `ნაწყვეტი ${(stage as number) + 1} / ${pieces.length}`}</span>
          <div role="radiogroup" aria-label="ნაწყვეტები" className="flex-1 min-w-0 flex flex-wrap justify-end gap-1.5">
            {steps.map(s => {
              const on = stage === s || (s === 'whole' && whole);
              const done = s === 'whole' ? learnedHere : passed[s as number];
              return (
                <button key={String(s)} type="button" role="radio" aria-checked={on} onClick={() => { triggerHaptic(8); goStage(s); }}
                  aria-label={s === 'whole' ? 'მთლიანი ფრაზა' : `ნაწყვეტი ${(s as number) + 1}`}
                  className={`h-8 rounded-full text-[12.5px] font-bold cursor-pointer transition ${s === 'whole' ? 'px-3' : 'w-8'} ${
                    on ? 'bg-[#7a2028] text-[#fbf6ec]' : done ? 'bg-[#c9962a] text-white' : 'bg-[#f6efe3] text-[#75685a] ring-1 ring-[#e8dcc8]'}`}>
                  {s === 'whole' ? (done && !on ? <Check className="w-4 h-4 inline" /> : 'მთლიანად') : done && !on ? <Check className="w-4 h-4 mx-auto" /> : (s as number) + 1}
                </button>
              );
            })}
          </div>
        </div>

        <PartPicture score={score} sys={part.sys} beat={beat} span={whole ? null : [range.b0, range.b1]} />

        <p className="min-h-[2.75rem] text-[15px] leading-snug font-semibold text-[#2a2017]" aria-live="polite">{say}</p>

        {result && !busy && result.hits.length > 0 && (
          <div className="flex flex-wrap gap-1" aria-hidden>
            {result.hits.map((h, i) => <span key={i} className={`w-3.5 h-3.5 rounded-full ${h ? 'bg-[#c9962a]' : 'bg-[#e8dcc8]'}`} />)}
          </div>
        )}

        <button type="button" onClick={main.run} disabled={main.disabled}
          className="relative w-full min-h-14 rounded-2xl bg-[#7a2028] text-[#fbf6ec] inline-flex items-center justify-center gap-2.5 text-[16px] font-bold cursor-pointer active:scale-[0.985] transition shadow-[0_10px_20px_-12px_rgba(122,32,40,0.9)] disabled:opacity-60 disabled:cursor-default [&_svg]:w-5 [&_svg]:h-5">
          {phase === 'singing' && <span className="absolute inset-0 rounded-2xl bg-[#7a2028]/40 animate-pulse motion-reduce:hidden" aria-hidden />}
          <span className="relative inline-flex items-center gap-2.5">{main.icon}{main.label}</span>
        </button>

        {/* the quieter choices */}
        <div className="flex flex-wrap items-center gap-2">
          {heard && !playing && !busy && (
            <button type="button" onClick={listen}
              className="h-10 px-3.5 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[13px] font-bold text-[#4a3426] inline-flex items-center gap-1.5 cursor-pointer hover:ring-[#7a2028]/40">
              <RotateCcw className="w-4 h-4" />კიდევ მოისმინე
            </button>
          )}
          <button type="button" role="switch" aria-checked={slow}
            onClick={() => { triggerHaptic(8); const n = !slow; setSlow(n); try { localStorage.setItem(SLOW_KEY, n ? '1' : '0'); } catch { /* here only */ } }}
            className={`h-10 px-3.5 rounded-full text-[13px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              slow ? 'bg-[#fbf3df] text-[#8a6a1e] ring-1 ring-[#e9cf8f]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'}`}>
            <Snail className="w-4 h-4" />ნელა{slow && <Check className="w-3.5 h-3.5" />}
          </button>
          {whole && pieces.length > 1 && !busy && (
            <button type="button" onClick={() => { triggerHaptic(8); goStage(0); }}
              className="h-10 px-3.5 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[13px] font-bold text-[#4a3426] cursor-pointer hover:ring-[#7a2028]/40">
              ნაწყვეტებით
            </button>
          )}
          {!whole && result && !ok && !busy && (
            <button type="button" onClick={() => { triggerHaptic(8); nextPiece(); }}
              className="h-10 px-3.5 rounded-full text-[13px] font-bold text-[#8c7c6b] cursor-pointer hover:text-[#4a3426]">
              გამოტოვება
            </button>
          )}
        </div>

        {error && <p className="rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-[13px] text-amber-900">{error} ან უბრალოდ იმღერე ხმამაღლა.</p>}
        {!singingSupported() && <p className="rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-[13px] text-amber-900">ამ ბრაუზერში მიკროფონი ვერ ჩაირთვება, ამიტომ აპი ვერ შეგიმოწმებს — იმღერე ხმამაღლა და თავად მონიშნე.</p>}

        {/* the whole phrase sung: hear myself, send it to the teacher */}
        {whole && result?.mp3 && !busy && (
          <div className="grid gap-2 min-[420px]:grid-cols-2">
            <button type="button" onClick={singing.playTake}
              className="min-h-11 px-4 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[13.5px] font-bold text-[#4a3426] inline-flex items-center justify-center gap-1.5 cursor-pointer hover:ring-[#7a2028]/40">
              <Headphones className="w-4 h-4" />მომისმინე
            </button>
            {uid && (sent === 'yes'
              ? <p className="min-h-11 flex items-center justify-center gap-1.5 text-[13px] font-bold text-[#8a6a1e]"><Check className="w-4 h-4" />გაეგზავნა მასწავლებელს</p>
              : <button type="button" onClick={send} disabled={sent === 'busy'}
                  className="min-h-11 px-4 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[13.5px] font-bold text-[#4a3426] inline-flex items-center justify-center gap-1.5 cursor-pointer hover:ring-[#7a2028]/40 disabled:opacity-60">
                  <Send className="w-4 h-4" />{sent === 'busy' ? 'იგზავნება…' : 'გაუგზავნე მასწავლებელს'}
                </button>)}
          </div>
        )}
        {sent === 'failed' && <p className="text-[13px] text-red-700 text-center">ვერ გაიგზავნა — ინტერნეტი შეამოწმე და კიდევ სცადე.</p>}
      </section>
    </>
  );
};
