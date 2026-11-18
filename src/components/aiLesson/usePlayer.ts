import { useEffect, useMemo, useRef, useState } from 'react';
import { ChantSynth, countIn, playStartNotes, type BookScore } from '../../utils/chantSynth';

// The lesson's sound: one synthesizer a phrase. `listen` plays a stretch once (my voice alone, the others, or all);
// `along` leads in with my first note and two taps, then goes round `rounds` times with a breath between, calling
// `onRound` after each and `onDone` after the last. The place (seconds from the stretch's start) follows for the roll.
// `transpose` moves everything that sounds (semitones) — „ნოტები ჩემს ხმაზე“; the singing is checked in any key anyway.

export type Who = 'mine' | 'others' | 'all';
const BREATH = 1.5;

export const usePlayer = (score: BookScore | null, vi: number, speed: number, transpose = 0) => {
  const synth = useMemo(() => (score ? new ChantSynth(score) : null), [score]);
  const [playing, setPlaying] = useState(false);
  const [counting, setCounting] = useState(false);
  const [at, setAt] = useState<number | null>(null);
  const raf = useRef(0);
  const countTimer = useRef(0);
  const range = useRef({ s0: 0, s1: 0 });
  // when the last stretch began to sound (performance.now(); the synth starts 50 ms after play()) — a take laid on it
  const started = useRef(0);
  const rounds = useRef({ left: 0, last: 0, onRound: undefined as undefined | ((n: number) => void), onDone: undefined as undefined | (() => void), n: 0 });

  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    window.clearTimeout(countTimer.current);
    if (synth) { synth.onEnd = undefined; synth.dispose(); }
  }, [synth]);
  useEffect(() => { synth?.setSpeed(speed); }, [synth, speed]);
  useEffect(() => { synth?.setTranspose(transpose); }, [synth, transpose]);

  const mix = (who: Who) => {
    if (!synth || !score) return;
    score.voices.forEach((_, i) => synth.setMuted(i, who === 'mine' ? i !== vi : who === 'others' ? i === vi : false));
  };

  const stop = () => {
    window.clearTimeout(countTimer.current);
    cancelAnimationFrame(raf.current);
    synth?.pause();
    setPlaying(false); setCounting(false); setAt(null);
    rounds.current.left = 0;
  };

  const follow = () => {
    if (!synth) return;
    const pos = synth.position();
    const r = rounds.current;
    // back at the stretch's start: one more round done
    if (r.left > 0 && pos < r.last - 0.2) {
      r.n += 1;
      r.onRound?.(r.n);
      if (r.n >= r.left) { const done = r.onDone; stop(); done?.(); return; }
    }
    r.last = pos;
    setAt(pos - range.current.s0);
    if (synth.playing) raf.current = requestAnimationFrame(follow);
  };

  const begin = async (s0: number, s1: number, who: Who, once: boolean) => {
    if (!synth) return;
    stop();
    range.current = { s0, s1 };
    mix(who);
    synth.once = once;
    synth.loopGap = once ? 0 : BREATH;
    synth.setLoop(s0, s1);
    synth.onEnd = () => { cancelAnimationFrame(raf.current); setPlaying(false); setAt(null); };
    rounds.current.last = s0;
    await synth.play(s0);
    started.current = performance.now() + 50;
    setPlaying(true);
    raf.current = requestAnimationFrame(follow);
  };

  /** the stretch once */
  const listen = (s0: number, s1: number, who: Who = 'mine') => begin(s0, s1, who, true);

  /** sing along: my first note and two taps, then round and round */
  const along = async (s0: number, s1: number, who: Who, first: number | null, opts: { rounds: number; onRound?: (n: number) => void; onDone?: () => void }) => {
    if (!synth) return;
    stop();
    setCounting(true);
    const beat = (synth.toSec(synth.toBeat(s0) + 1) - s0) / speed;
    const wait = await countIn(first, beat, transpose).catch(() => 0);
    countTimer.current = window.setTimeout(async () => {
      setCounting(false);
      await begin(s0, s1, who, false);
      rounds.current = { ...rounds.current, left: opts.rounds, n: 0, last: s0, onRound: opts.onRound, onDone: opts.onDone };
    }, Math.max(0, wait - 50));
  };

  /** one note alone, a little longer (the note the teacher named) */
  const note = (midi: number) => { stop(); void playStartNotes([midi], transpose, false, 0.5, 1.4).catch(() => undefined); };

  return { ready: !!synth, playing, counting, at, listen, along, note, stop, startedAt: () => started.current };
};
