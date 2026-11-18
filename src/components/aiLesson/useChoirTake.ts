import { useEffect, useRef } from 'react';
import type { BookScore } from '../../utils/chantSynth';
import { timelineIn } from '../../utils/learn';
import { singingSupported, startSinging, type SingSession } from '../../utils/singCapture';
import { fitDelay, notesIn, type TrioNote } from '../../utils/trio';
import { prepareChoir, type ChoirParts } from './choirMix';

// „გალობა“'s take: the microphone listens while the synthesizer sings the other voices (usePlayer `along`), then the take
// is laid on the score by the delay that fits it best (utils/trio.ts, as „მესამე ხმა“ does) and made into the choir's
// parts (choirMix.ts). Nothing is scored or kept beyond the screen.

/** what the phone plays reaches the ear this much later, and the microphone hears the voice later too (useTrioTake's guess) */
const LAG = 0.12;
/** less voice than this: nothing to hear back */
const HEARD_S = 1;
const FRAME_S = 0.04;

export const useChoirTake = () => {
  const session = useRef<SingSession | null>(null);
  useEffect(() => () => { session.current?.cancel(); session.current = null; }, []);

  /** opens the microphone; false when there is none (then the lesson sings along without keeping anything) */
  const listen = async () => {
    session.current?.cancel();
    session.current = null;
    if (!singingSupported()) return false;
    try { session.current = await startSinging(() => undefined); return true; } catch { return false; }
  };

  const cancel = () => { session.current?.cancel(); session.current = null; };

  /**
   * Ends the listening. `from`–`to` = the section sung (score seconds), `startedAt` = when the others began to sound
   * (performance.now()), `complete` = it ran to its end. Null when nothing was heard or it cannot be mixed.
   */
  const finish = async (o: {
    score: BookScore; vi: number; shift: number; from: number; to: number; startedAt: number; complete: boolean;
  }): Promise<ChoirParts | null> => {
    const s = session.current;
    session.current = null;
    if (!s) return null;
    const sungFor = (performance.now() - o.startedAt) / 1000;
    const take = await s.stop().catch(() => null);
    if (!take?.mp3 || o.startedAt < s.t0) return null;
    const frames = take.frames.map(f => ({ t: f.t / 1000, midi: f.midi }));
    if (frames.filter(f => f.midi != null).length * FRAME_S < HEARD_S) return null;
    const to = o.complete ? o.to : Math.min(o.to, o.from + sungFor);
    if (to - o.from < 2) return null;
    const notes: TrioNote[] = notesIn(timelineIn(o.score, o.vi, 0, o.score.dur), o.from, to).map(([t, d, m]) => [t, d, m + o.shift]);
    const delay = fitDelay(notes, frames, o.from, 1, (o.startedAt - s.t0) / 1000 + LAG);
    try {
      return await prepareChoir({ score: o.score, vi: o.vi, from: o.from, to, shift: o.shift, take: take.mp3, delay });
    } catch (e) {
      console.warn('choir mix:', e);
      return null;
    }
  };

  return { listen, finish, cancel, listening: () => !!session.current };
};
