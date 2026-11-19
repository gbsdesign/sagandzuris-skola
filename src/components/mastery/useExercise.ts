import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context';
import { MANERA_BASE, type ManeraStep } from '../../data/maneraLessons';
import type { Drill } from '../../data/vocalDrills';
import { playLessonNotes, stopLessonNotes } from '../../utils/chantSynth';
import { markDrillDone, useManeraPractice } from '../../utils/maneraPractice';
import { startSinging, type SingSession } from '../../utils/singCapture';
import { countInBeats, myPart, onsetsOf, roundFrames, runPercent, scoreKindOf, scorePitchRound, scoreRhythmRound, scoredStep, targetAt, type ScoreKind } from '../../utils/drillScore';
import { saveDrillScore, useDrillScores } from '../../utils/drillScores';
import { AI_PROBLEM_TEXT, AiTeacherError, askAiScore } from '../../utils/aiTeacher';
import { AI_ANSWER_EVENT, isAiScoreWaiting, lastAiAnswer, markAiAnswerSeen, queueAiScore, startAiScoreQueue } from '../../utils/aiScoreQueue';
import { useNewLook } from '../../design/newLook';
import { leaveAiScore, type AiScoreState } from '../../pages/v2/ostatoba/AiScore';
import { triggerHaptic } from '../../utils/haptics';

// The timed exercise of a drill (ManeraLessonSheet's „სავარჯიშო“): its steps and rounds on a clock, the synth's notes and
// click, the vibrating beat, the scored run (notes / rhythm in the browser, a tip's take for the AI teacher) and the new
// look's AI screen. Moved out of ExerciseView so the old drawing and the new one (pages/v2/ostatoba/ExerciseV2) share it.

export type Range = keyof typeof MANERA_BASE;
const RANGE_KEY = 'sg-manera-voice';
const PART_KEY = 'sg-drill-part';
const SOUND_KEY = 'sg-manera-sound';
// the beat in the hand: the phone vibrates on every beat of a step's click (Android; iPhones have no vibration for sites),
// so the microphone hears only the singer
const VIBRATE_KEY = 'sg-manera-vibrate';
export const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;
export const BREATH = 3; // seconds to breathe between rounds
export const PART_NAMES = ['I ხმა', 'II ხმა', 'III ხმა (ბანი)'];

const load = (key: string, fallback: string) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
const save = (key: string, v: string) => { try { localStorage.setItem(key, v); } catch { /* storage off */ } };

export type Phase = 'idle' | 'run' | 'breath' | 'paused' | 'end';

export const stepTime = (s: ManeraStep) => (s.secs ? s.secs * (s.reps ?? 1) + BREATH * ((s.reps ?? 1) - 1) : 0);
const CUE = 1.2; // seconds the note to sing sounds at the start of a scored round; then the phone hears only the student
const MAX_SCORED_SECONDS = 300; // a tip's run sent to the AI teacher

/** a scored run: the microphone, what kind of score, the rounds scored so far and where the open one began (ms) */
export type Scoring = { session: SingSession; kind: ScoreKind; rounds: number[]; from: number | null; expected: number };
export type RunResult =
  | { kind: 'pct'; pct: number; record: boolean }
  | { kind: 'ai'; mp3: Blob | null; busy?: boolean; score?: number; text?: string; record?: boolean; problem?: string };

export const useExercise = (drill: Drill) => {
  const { id: drillId, exercise } = drill;
  const { user, isSuperAdmin } = useAuth();
  const best = useDrillScores(user?.uid)[drillId];
  const kind = scoreKindOf(drill);
  // the new look's AI score (boards x-ultra-ai 1–4): its own screen over the exercise; a take made offline waits on the phone
  const nl = useNewLook();
  const [aiScreen, setAiScreen] = useState<AiScoreState | null>(null);
  const [aiLast, setAiLast] = useState<AiScoreState | null>(null);
  const showAi = (st: AiScoreState) => { setAiScreen(st); if (st.kind !== 'intro' && st.kind !== 'listening') setAiLast(st); };
  const [aiArrived, setAiArrived] = useState(false);
  const [aiWaiting, setAiWaiting] = useState(false);
  useEffect(() => {
    startAiScoreQueue();
    const uid = user?.uid;
    if (!uid) return;
    const look = () => {
      const a = lastAiAnswer(uid, drillId);
      setAiArrived(!!a && !a.seen);
      void isAiScoreWaiting(uid, drillId).then(setAiWaiting);
    };
    look();
    const onAnswer = (e: Event) => { if ((e as CustomEvent<{ drillId: string }>).detail?.drillId === drillId) look(); };
    window.addEventListener(AI_ANSWER_EVENT, onAnswer);
    return () => window.removeEventListener(AI_ANSWER_EVENT, onAnswer);
  }, [user?.uid, drillId]);
  const openArrived = () => {
    const uid = user?.uid;
    const a = uid ? lastAiAnswer(uid, drillId) : null;
    if (!uid || !a) return;
    markAiAnswerSeen(uid, drillId);
    setAiArrived(false);
    showAi({ kind: 'answer', grades: a.grades, tip: a.tip });
  };
  const scoring = useRef<Scoring | null>(null);
  const [scoringOn, setScoringOn] = useState(false);
  const [liveMidi, setLiveMidi] = useState<number | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [scoreNote, setScoreNote] = useState('');
  const { doneToday } = useManeraPractice();
  const [range, setRangeState] = useState<Range>(() => (load(RANGE_KEY, 'low') === 'high' ? 'high' : 'low'));
  const [part, setPartState] = useState(() => Math.min(2, Math.max(0, Number(load(PART_KEY, '0')) || 0)));
  const [sound, setSoundState] = useState(() => load(SOUND_KEY, '1') === '1');
  const [vibrate, setVibrateState] = useState(() => canVibrate && load(VIBRATE_KEY, '0') === '1');
  const [idx, setIdx] = useState(0);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>('idle');
  const [left, setLeft] = useState(0); // seconds left in this round or breath
  const pausedFrom = useRef<'run' | 'breath'>('run');
  const endAt = useRef(0);
  const step = exercise.steps[idx];
  const reps = step?.reps ?? 1;
  const done = doneToday(drillId);
  const base = MANERA_BASE[range];

  const setRange = (v: Range) => { setRangeState(v); save(RANGE_KEY, v); };
  const setPart = (v: number) => { setPartState(v); save(PART_KEY, String(v)); };
  const setSound = (on: boolean) => { setSoundState(on); save(SOUND_KEY, on ? '1' : '0'); if (!on) stopLessonNotes(); };
  const setVibrate = (on: boolean) => { setVibrateState(on); save(VIBRATE_KEY, on ? '1' : '0'); if (on) navigator.vibrate(40); };

  // the step's sound from `elapsed` seconds into the round: its tones, the other voices, the click
  // In a scored run the phone must hear the student, not itself: the note to sing sounds only for a moment (CUE), a
  // drone on the same note as well, and a rhythm step's click only in the count-in.
  const sing = useCallback((s: ManeraStep, elapsed: number) => {
    if (!sound || !s.secs) return;
    const secs = s.secs;
    const scored = !!scoring.current && scoredStep(s, scoring.current.kind, part);
    const notes: [number, number, number][] = [];
    const line = (tones: number[], until = secs, from = 0) => {
      const d = secs / tones.length;
      tones.forEach((t, i) => {
        const a = Math.max(i * d, from), b = Math.min((i + 1) * d, until);
        if (b > a) notes.push([a, b - a, base + t]);
      });
    };
    const sung = new Set((s.sing ?? []).map(t => ((t % 12) + 12) % 12));
    if (s.tones?.length) {
      if (s.cue === 'end') line(s.tones, secs, secs - 2);
      else if (scored && scoring.current!.kind === 'pitch' && (!s.sing || s.tones.some(t => sung.has(((t % 12) + 12) % 12)))) line(s.tones, CUE);
      else line(s.tones);
    }
    const mine = myPart(s, part);
    s.parts?.forEach((p, v) => { if (v !== mine) line(p); });
    if (s.bpm) {
      const beat = 60 / s.bpm;
      const accents = s.accents ?? [0];
      const clickUntil = scored && scoring.current!.kind === 'rhythm' ? countInBeats(s) * beat - 0.05 : secs - 0.05;
      for (let i = 0; i * beat < clickUntil; i++) notes.push([i * beat, 0.08, accents.includes(i % (s.bar ?? 1)) ? 96 : 88]);
    }
    const now = notes
      .filter(([at, len]) => at + len > elapsed + 0.03)
      .map(([at, len, m]): [number, number, number] => (at < elapsed ? [0, len - (elapsed - at), m] : [at - elapsed, len, m]));
    if (now.length) void playLessonNotes(now);
  }, [sound, base, part]);

  const startRound = useCallback((s: ManeraStep, elapsed = 0) => {
    const sc = scoring.current;
    if (sc) sc.from = performance.now() - sc.session.t0 - elapsed * 1000;
    endAt.current = Date.now() + (s.secs! - elapsed) * 1000;
    setLeft(s.secs! - elapsed);
    setPhase('run');
    sing(s, elapsed);
  }, [sing]);

  // a round of a scored run is over: its frames → its score
  const closeRound = useCallback((s: ManeraStep) => {
    const sc = scoring.current;
    if (!sc || sc.from === null || !s.secs) return;
    const from = sc.from;
    sc.from = null;
    if (!scoredStep(s, sc.kind, part)) return;
    const heard = s.cue === 'end' ? s.secs - 2 : s.secs;
    const frames = roundFrames(sc.session.frames, from, from + heard * 1000);
    sc.rounds.push(sc.kind === 'rhythm' ? scoreRhythmRound(onsetsOf(frames), s) : scorePitchRound(frames, s, part, base));
  }, [part, base]);

  const stopScoring = useCallback(() => {
    scoring.current?.session.cancel();
    scoring.current = null;
    setScoringOn(false);
    setLiveMidi(null);
  }, []);

  // the run is over: the percent now (notes, rhythm), or the take for the AI teacher (the tips)
  const finishScoring = useCallback(async () => {
    const sc = scoring.current;
    if (!sc) return;
    scoring.current = null;
    setScoringOn(false);
    setLiveMidi(null);
    if (sc.kind === 'ai') {
      setResult({ kind: 'ai', mp3: null, busy: true });
      const take = await sc.session.stop();
      setResult({ kind: 'ai', mp3: take.mp3 });
      // the new look: the AI teacher listens at once, on its own screen
      if (take.mp3) askNewRef.current?.(take.mp3);
      return;
    }
    sc.session.cancel();
    const pct = runPercent(sc.rounds, sc.expected);
    const record = await saveDrillScore(drillId, pct, user?.uid, best ?? 0);
    markDrillDone(drillId, user?.uid);
    setResult({ kind: 'pct', pct, record });
  }, [drillId, user, best]);

  const goTo = useCallback((i: number) => {
    stopLessonNotes();
    setRound(1);
    if (scoring.current) scoring.current.from = null;
    if (i >= exercise.steps.length) { setPhase('end'); void finishScoring(); return; }
    setIdx(i);
    const s = exercise.steps[i];
    if (s.secs) startRound(s); else setPhase('idle');
  }, [exercise.steps, startRound, finishScoring]);

  // the vibrating metronome: every beat of the running round, the bar's accents longer
  useEffect(() => {
    if (!vibrate || phase !== 'run' || !step?.bpm || !step.secs) return;
    const beat = 60000 / step.bpm;
    const start = endAt.current - step.secs * 1000;
    const accents = step.accents ?? [0];
    let timer = 0;
    const next = () => {
      const now = Date.now();
      const i = Math.max(0, Math.ceil((now - start - 5) / beat));
      const at = start + i * beat;
      if (at > endAt.current - 50) return;
      timer = window.setTimeout(() => {
        navigator.vibrate(accents.includes(i % (step.bar ?? 1)) ? 70 : 35);
        next();
      }, Math.max(0, at - now));
    };
    next();
    return () => { window.clearTimeout(timer); navigator.vibrate(0); };
  }, [vibrate, phase, step, round]);

  // the clock: a round ends → a breath → the next round, or the next step
  useEffect(() => {
    if (phase !== 'run' && phase !== 'breath') return;
    const t = window.setInterval(() => {
      const ms = endAt.current - Date.now();
      if (ms > 0) { setLeft(ms / 1000); return; }
      window.clearInterval(t);
      triggerHaptic(12);
      if (phase === 'run') closeRound(step);
      if (phase === 'run' && round < reps) {
        endAt.current = Date.now() + BREATH * 1000;
        setLeft(BREATH);
        setPhase('breath');
      } else if (phase === 'breath') {
        setRound(r => r + 1);
        startRound(step);
      } else {
        goTo(idx + 1);
      }
    }, 100);
    return () => window.clearInterval(t);
  }, [phase, round, reps, step, idx, startRound, goTo, closeRound]);

  useEffect(() => () => { stopLessonNotes(); scoring.current?.session.cancel(); }, []);

  // a tip's run may not grow without end: past MAX_SCORED_SECONDS it ends where it is
  useEffect(() => {
    if (!scoringOn) return;
    const t = window.setInterval(() => {
      const sc = scoring.current;
      if (sc?.kind === 'ai' && performance.now() - sc.session.t0 > MAX_SCORED_SECONDS * 1000) { stopLessonNotes(); setPhase('end'); void finishScoring(); }
    }, 1000);
    return () => window.clearInterval(t);
  }, [scoringOn, finishScoring]);

  const pause = () => {
    if (scoring.current) { stopScoring(); setScoreNote('შეფასება შეწყდა — პაუზისას ის თავიდან იწყება.'); }
    pausedFrom.current = phase === 'breath' ? 'breath' : 'run';
    setLeft(Math.max(0, (endAt.current - Date.now()) / 1000));
    stopLessonNotes();
    setPhase('paused');
  };
  const resume = () => {
    if (pausedFrom.current === 'breath') {
      endAt.current = Date.now() + left * 1000;
      setPhase('breath');
    } else startRound(step, step.secs! - left);
  };
  const begin = () => (step.secs ? startRound(step) : goTo(idx + 1));
  const restart = () => { stopScoring(); stopLessonNotes(); setIdx(0); setRound(1); setPhase('idle'); setResult(null); setScoreNote(''); };

  // „შეფასებით“: the microphone on, then the run from its first step; every scored round counts
  const beginScored = async () => {
    setScoreNote('');
    setResult(null);
    stopLessonNotes();
    try {
      const session = await startSinging(m => setLiveMidi(m), kind === 'rhythm' ? 20 : 40);
      const expected = exercise.steps.reduce((a, s) => a + (scoredStep(s, kind, part) ? s.reps ?? 1 : 0), 0);
      scoring.current = { session, kind, rounds: [], from: null, expected };
      setScoringOn(true);
      setIdx(0);
      setRound(1);
      const first = exercise.steps[0];
      if (first.secs) startRound(first); else setPhase('idle');
    } catch {
      setScoreNote('მიკროფონი ვერ ჩაირთო. ნება მიეცი ბრაუზერს და სცადე თავიდან.');
    }
  };

  const askAi = async () => {
    if (result?.kind !== 'ai' || !result.mp3 || !user) return;
    setResult({ ...result, busy: true, problem: '' });
    try {
      const r = await askAiScore(user.uid, result.mp3, { title: drill.title, check: drill.lesson.check, steps: exercise.steps.map(s => s.text) }, isSuperAdmin);
      const record = await saveDrillScore(drillId, r.score, user.uid, best ?? 0);
      markDrillDone(drillId, user.uid);
      setResult({ kind: 'ai', mp3: result.mp3, score: r.score, text: r.text, record });
    } catch (e) {
      setResult({ kind: 'ai', mp3: result.mp3, problem: AI_PROBLEM_TEXT[e instanceof AiTeacherError ? e.kind : 'failed'] });
    }
  };
  // the new look: one call, its answer (or the month's limit, or no internet — then the take waits) on the AI screen
  const askNew = async (mp3: Blob) => {
    if (!nl || !user) return;
    const about = { title: drill.title, check: drill.lesson.check, steps: exercise.steps.map(s => s.text) };
    showAi({ kind: 'listening' });
    try {
      const r = await askAiScore(user.uid, mp3, about, isSuperAdmin);
      const record = await saveDrillScore(drillId, r.score, user.uid, best ?? 0);
      markDrillDone(drillId, user.uid);
      setResult({ kind: 'ai', mp3, score: r.score, text: r.text, record });
      showAi({ kind: 'answer', grades: r.grades, tip: r.tip });
    } catch (e) {
      const why = e instanceof AiTeacherError ? e.kind : 'failed';
      setResult({ kind: 'ai', mp3, problem: AI_PROBLEM_TEXT[why] });
      if (why === 'budget') showAi({ kind: 'limit' });
      else if (why === 'offline') {
        const kept = await queueAiScore({ uid: user.uid, drillId, about, mp3, best: best ?? 0 });
        setAiWaiting(kept);
        showAi({ kind: 'offline', kept });
      } else showAi({ kind: 'problem', text: AI_PROBLEM_TEXT[why] });
    }
  };
  const askNewRef = useRef(askNew);
  askNewRef.current = askNew;
  // „ჩაწერა“ / „კიდევ ერთხელ“ on the AI screen: the screen goes, the scored run starts in the same tap
  const recordForAi = () => { leaveAiScore(); setAiScreen(null); restart(); void beginScored(); };
  const toTuner = () => {
    leaveAiScore();
    setAiScreen(null);
    window.setTimeout(() => document.getElementById('drill-tuner')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  };

  const finish = () => { triggerHaptic(20); markDrillDone(drillId, user?.uid); };

  const total = Math.round(exercise.steps.reduce((a, s) => a + stepTime(s), 0) / 60) || exercise.minutes;
  const sounding = exercise.steps.some(s => s.tones?.length || s.parts?.length || s.bpm);
  const clicking = exercise.steps.some(s => s.bpm);
  const pitched = exercise.steps.some(s => s.tones?.length || s.parts?.length || s.sing?.length);
  const choosesPart = exercise.steps.some(s => s.parts && !s.listen && s.voice === undefined);
  const running = phase === 'run' || phase === 'breath';
  const frac = phase === 'breath' ? left / BREATH : step?.secs ? left / step.secs : 0;
  // the note the tuner aims at, now
  const target = step && phase !== 'breath' && phase !== 'end'
    ? targetAt(step, part, running || phase === 'paused' ? (step.secs ?? 0) - left : 0)
    : null;
  const stepPart = step ? myPart(step, part) : null;

  return {
    drill, drillId, exercise, user, best, kind, nl,
    aiScreen, setAiScreen, aiLast, showAi, aiArrived, aiWaiting, openArrived,
    scoring, scoringOn, liveMidi, result, scoreNote, setScoreNote,
    range, setRange, part, setPart, sound, setSound, vibrate, setVibrate,
    idx, round, phase, setPhase, left, step, reps, done, base,
    goTo, pause, resume, begin, restart, stopScoring, beginScored, askAi, askNew, recordForAi, toTuner, finish,
    total, sounding, clicking, pitched, choosesPart, running, frac, target, stepPart,
  };
};
