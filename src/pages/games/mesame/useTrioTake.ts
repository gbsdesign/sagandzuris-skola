import { useEffect, useRef, useState } from 'react';
import { ChantSynth, playLessonNotes, stopLessonNotes, type BookScore } from '../../../utils/chantSynth';
import { startSinging, type SingFrame, type SingSession } from '../../../utils/singCapture';
import { fitDelay, placeOf, scoreTrio, type TrioFrame, type TrioNote } from '../../../utils/trio';
import { triggerHaptic } from '../../../utils/haptics';
import { hushSnippets } from '../rounds/useSnippet';

// One take of „მესამე ხმა“: the microphone opens, my first note sounds while 3-2-1 is counted, then the phone sings the
// other voices from `from` and listens to mine until `to` (or until I stop). The take is placed on the score by the delay
// it fits best (utils/trio.ts) and scored; its MP3 is kept for the trio's mix.

export interface TrioPlan {
  score: BookScore;
  voice: number;
  from: number;
  to: number;
  speed: number;
  /** my own voice softly with the others */
  guide: boolean;
  /** my voice's notes in the section (score seconds) */
  notes: TrioNote[];
  /** a take stopped early still counts the whole section (a room's round: the notes not sung are not right) */
  strict?: boolean;
}

export type TakeState = 'idle' | 'count' | 'sing' | 'score' | 'done';

export interface TakeResult {
  pct: number;
  credits: number[];
  /** the score second the take stopped at (Infinity: it ran to the end) */
  until: number;
  complete: boolean;
  /** where in the take the section begins */
  delay: number;
  frames: TrioFrame[];
  mp3: Blob | null;
  /** the MP3 is still being made (the score does not wait for it) */
  making: boolean;
}

/** what the phone plays reaches the ear this much later, and the microphone hears the voice later too (a first guess) */
const LAG = 0.12;
const COUNT_MS = 800;

export type TrioTake = ReturnType<typeof useTrioTake>;

export const useTrioTake = () => {
  const [state, setState] = useState<TakeState>('idle');
  const [count, setCount] = useState(3);
  const [now, setNow] = useState(0);
  const [problem, setProblem] = useState('');
  const [result, setResult] = useState<TakeResult | null>(null);
  const run = useRef<{
    plan: TrioPlan; session: SingSession; synth: ChantSynth | null; guess: number; raf: number; timers: number[]; over: boolean;
  } | null>(null);

  const release = () => {
    const r = run.current;
    if (!r) return null;
    r.over = true;
    window.cancelAnimationFrame(r.raf);
    r.timers.forEach(t => window.clearTimeout(t));
    r.synth?.dispose();
    stopLessonNotes();
    return r;
  };

  const finish = async (complete: boolean) => {
    const r = run.current;
    if (!r || r.over) return;
    const stoppedAt = r.synth ? r.synth.position() : r.plan.from;
    release();
    setState('score');
    // the microphone stops at once; the take's MP3 follows (a long one takes seconds), the score is counted now
    const made = r.session.stop();
    run.current = null;
    const frames: TrioFrame[] = r.session.frames.map((f: SingFrame) => ({ t: f.t / 1000, midi: f.midi }));
    const { plan } = r;
    const until = complete || plan.strict ? Infinity : stoppedAt;
    const delay = fitDelay(plan.notes, frames, plan.from, plan.speed, r.guess, until);
    const s = scoreTrio(plan.notes, frames, placeOf(plan.from, delay, plan.speed), until);
    triggerHaptic(s.pct >= 80 ? 30 : 12);
    setResult({ pct: s.pct, credits: s.credits, until, complete, delay, frames, mp3: null, making: true });
    setState('done');
    const take = await made.catch(() => null);
    // only if this take is still the one shown
    setResult(cur => (cur && cur.frames === frames ? { ...cur, mp3: take?.mp3 ?? null, making: false } : cur));
  };

  const go = async () => {
    const r = run.current;
    if (!r || r.over) return;
    const { plan } = r;
    const synth = new ChantSynth(plan.score);
    plan.score.voices.forEach((_, i) => {
      if (i !== plan.voice) return;
      if (plan.guide) synth.setVolume(i, 0.22); else synth.setMuted(i, true);
    });
    if (plan.speed !== 1) synth.setSpeed(plan.speed);
    synth.onEnd = () => { void finish(true); };
    r.synth = synth;
    await synth.play(plan.from);
    if (r.over) { synth.dispose(); return; }
    // the section starts sounding 50 ms after play() (ChantSynth.startAt), then reaches the ear
    r.guess = (performance.now() - r.session.t0) / 1000 + 0.05 + LAG;
    setState('sing');
    const frame = () => {
      if (r.over) return;
      const pos = synth.position();
      setNow(pos);
      if (pos >= plan.to - 0.02) { void finish(true); return; }
      r.raf = window.requestAnimationFrame(frame);
    };
    r.raf = window.requestAnimationFrame(frame);
  };

  const start = async (plan: TrioPlan) => {
    if (run.current) return;
    hushSnippets();
    // wakes the phone's sound inside the tap (the synthesizer starts later, after the count)
    void playLessonNotes([]);
    setProblem('');
    setResult(null);
    let session: SingSession;
    try {
      session = await startSinging(() => undefined);
    } catch {
      setProblem('მიკროფონი ვერ ჩაირთო — ბრაუზერს მიკროფონის ნება მიეცი და კიდევ სცადე.');
      return;
    }
    const r = { plan, session, synth: null, guess: 0, raf: 0, timers: [] as number[], over: false };
    run.current = r;
    triggerHaptic(12);
    setNow(plan.from);
    setCount(3);
    setState('count');
    // my first note while counting in
    const first = plan.notes[0]?.[2];
    if (first != null) void playLessonNotes([[0, (COUNT_MS * 3) / 1000 - 0.15, first]]);
    r.timers.push(window.setTimeout(() => setCount(2), COUNT_MS));
    r.timers.push(window.setTimeout(() => setCount(1), COUNT_MS * 2));
    r.timers.push(window.setTimeout(() => { void go(); }, COUNT_MS * 3));
  };

  /** ends the take now and scores what was sung */
  const stop = () => {
    const r = run.current;
    if (!r) return;
    if (!r.synth) { cancel(); return; }
    void finish(false);
  };

  /** drops the take without a score */
  const cancel = () => {
    const r = release();
    if (!r) return;
    r.session.cancel();
    run.current = null;
    setState(s => (s === 'done' ? s : 'idle'));
  };

  const reset = () => { cancel(); setResult(null); setState('idle'); };

  useEffect(() => () => { const r = release(); r?.session.cancel(); run.current = null; }, []);

  return {
    state, count, now, problem, result, start, stop, cancel, reset,
    /** the frames heard so far (seconds since listening began) and where they lie on the score, for the live mirror */
    live: () => {
      const r = run.current;
      if (!r) return null;
      return { frames: r.session.frames, place: placeOf(r.plan.from, r.guess || 1e9, r.plan.speed) };
    },
  };
};
