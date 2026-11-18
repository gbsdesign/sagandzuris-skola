import { useEffect, useRef, useState } from 'react';
import { playStartNotes } from '../../utils/chantSynth';
import { notesFromFrames, scoreSinging } from '../../utils/pitch';
import { startSinging, type SingSession } from '../../utils/singCapture';
import { liveWord, readTake, type TakeRead } from '../../utils/aiLesson';
import { triggerHaptic } from '../../utils/haptics';

// One sung take in the AI lesson: the first note sounds as a cue, the phone listens, and stops by itself after a pause
// once something was sung (or when nothing is heard at all). While singing it gives one word — „ზუსტად“, „ოდნავ
// მაღლა“, „ოდნავ დაბლა“ — and the voice as a line for the roll; after it, the take read note by note (utils/aiLesson).
// The learning mode's useSinging (components/learn/LearnShared) is left as it is.

export type TakePhase = 'idle' | 'cue' | 'singing' | 'scoring' | 'done';
export interface TakeResult { read: TakeRead; share: number; mp3: Blob | null }
export interface VoicePoint { t: number; m: number | null }

/** Nothing heard this long after the listening began: the take ends as „not heard“. */
const SILENT_MS = 6000;
/** Once something was sung, this much quiet ends the take. */
const PAUSE_MS = 1800;

export const useTake = ({ target, lengths, transpose = 0, resetKey, onBefore }: {
  target: number[];
  /** each target note's length in seconds (for „the last note let go early“) */
  lengths: number[];
  transpose?: number;
  /** a new key (another piece or step) drops the old take */
  resetKey: string;
  /** stop whatever sounds before listening */
  onBefore?: () => void;
}) => {
  const [phase, setPhase] = useState<TakePhase>('idle');
  const [word, setWord] = useState<ReturnType<typeof liveWord>>('');
  const [result, setResult] = useState<TakeResult | null>(null);
  const [error, setError] = useState('');
  const [trace, setTrace] = useState<VoicePoint[]>([]);
  const session = useRef<SingSession | null>(null);
  const cueTimer = useRef(0);
  const offset = useRef<number | null>(null);
  const goal = useRef({ target, lengths });
  goal.current = { target, lengths };

  const drop = () => {
    window.clearTimeout(cueTimer.current);
    session.current?.cancel();
    session.current = null;
  };
  useEffect(() => drop, []);
  useEffect(() => {
    drop();
    setPhase('idle'); setResult(null); setWord(''); setTrace([]); setError('');
    offset.current = null;
  }, [resetKey]);

  const finish = async () => {
    const s = session.current;
    if (!s) return;
    session.current = null;
    setPhase('scoring');
    setWord('');
    const take = await s.stop();
    const { target: t, lengths: l } = goal.current;
    const sung = notesFromFrames(take.frames);
    const scoring = scoreSinging(t, sung);
    const read = readTake(t, l, sung, scoring);
    setResult({ read, share: t.length ? read.hits / t.length : 0, mp3: take.mp3 });
    setPhase('done');
    triggerHaptic(read.hits === t.length ? 30 : 12);
  };

  const start = async () => {
    if (phase === 'singing') { finish(); return; }
    if (phase === 'cue') { drop(); setPhase('idle'); return; }
    onBefore?.();
    drop();
    setError(''); setResult(null); setTrace([]); setWord('');
    offset.current = null;
    triggerHaptic(12);
    setPhase('cue');
    const first = goal.current.target[0];
    if (first != null) await playStartNotes([first], transpose, false, 0.5, 0.9).catch(() => undefined);
    cueTimer.current = window.setTimeout(async () => {
      let lastVoiced = 0, voiced = 0, prevT = -1, prevVoiced = false;
      // the notes sung so far, roughly, for the word's goal: a new note when the pitch moves off the running one
      let run: { sum: number; n: number; start: number } | null = null;
      let count = 0;
      const points: VoicePoint[] = [];
      let lastDraw = 0;
      try {
        session.current = await startSinging((midi, t) => {
          const tg = goal.current.target;
          if (midi != null) {
            if (prevVoiced) voiced += t - prevT;
            lastVoiced = t;
            if (run && Math.abs(midi - run.sum / run.n) <= 0.7) { run.sum += midi; run.n += 1; } else {
              if (run && t - run.start >= 140) count += 1;
              run = { sum: midi, n: 1, start: t };
            }
          } else if (run) {
            if (t - run.start >= 140) count += 1;
            run = null;
          }
          prevT = t; prevVoiced = midi != null;
          points.push({ t, m: midi });
          // the key: from the first steady note (four readings within a quarter tone)
          if (midi != null && offset.current == null && tg.length && points.length >= 4) {
            const last = points.slice(-4).map(p => p.m);
            if (last.every(m => m != null && Math.abs(m - midi) < 0.5)) offset.current = midi - tg[0];
          }
          if (midi != null && tg.length) {
            const k = Math.min(count, tg.length - 1);
            setWord(liveWord(midi, tg[k] + (offset.current ?? 0)));
          } else setWord('');
          if (t - lastDraw > 80) { lastDraw = t; setTrace(points.slice()); }
          const total = goal.current.lengths.reduce((a, b) => a + b, 0);
          const limit = (total * 2.5 + 8) * 1000;
          if (t > limit || (voiced > 1000 && t - lastVoiced > PAUSE_MS) || (voiced === 0 && t > SILENT_MS)) finish();
        });
        setPhase('singing');
      } catch (e) {
        console.warn('mic:', e);
        setError('მიკროფონი ვერ ჩაირთო. ბრაუზერს მიკროფონის ნება მიეცი და კიდევ სცადე.');
        setPhase('idle');
      }
    }, first != null ? 950 : 150);
  };

  const cancel = () => { drop(); setPhase('idle'); setWord(''); };
  const busy = phase === 'cue' || phase === 'singing' || phase === 'scoring';
  return { phase, word, result, error, trace, offset: offset.current, busy, start, stop: finish, cancel };
};
