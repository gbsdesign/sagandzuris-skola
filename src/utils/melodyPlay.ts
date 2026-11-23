// The keyboard's sound on this phone: keys pressed by a finger, and a melody played back with its keys lit
// (utils/melody.ts holds the notes and the instruments).
import { getCtx } from './chantSynth';
import { holdUpdates } from './appUpdate';
import { soundingSeconds, voiceOn, type Instr, type Sounding, type Voice } from './melody';

let bus: GainNode | null = null;
/** the keys' own line to the speaker (the played melodies have one each, so stopping one never cuts the keys) */
const keysBus = () => {
  const ctx = getCtx();
  if (!bus) {
    bus = ctx.createGain();
    bus.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    bus.connect(comp).connect(ctx.destination);
  }
  return bus;
};

/** wakes the sound up (call it inside a tap: phones start Web Audio only from one) */
export const wakeSound = () => { void getCtx().resume().catch(() => undefined); };

/** a finger on a key: it sounds until `off` */
export const keyOn = (instr: Instr, midi: number): Voice => {
  const ctx = getCtx();
  if (ctx.state !== 'running') void ctx.resume().catch(() => undefined);
  return voiceOn(ctx, keysBus(), instr, midi, ctx.currentTime + 0.005);
};
export const nowSec = () => getCtx().currentTime;

export interface Playback { stop: () => void }
export interface PlayOptions {
  /** start this far in (s) */
  from?: number;
  /** go round with this breath (s) between the rounds until stopped */
  loopGap?: number;
  /** every frame: where it is (s) and the notes sounding (their places in `notes`) */
  onFrame?: (t: number, lit: number[]) => void;
  onEnd?: () => void;
  /** it stopped for whatever reason (another melody began too) */
  onStop?: () => void;
}

let current: Playback | null = null;
/** one melody sounds at a time */
export const stopMelody = () => { current?.stop(); current = null; };

/** plays the notes (a look ahead of half a second schedules them, so a long one never makes thousands of sounds at once) */
export const playNotes = (notes: Sounding[], instr: Instr, o: PlayOptions = {}): Playback => {
  stopMelody();
  const ctx = getCtx();
  void ctx.resume().catch(() => undefined);
  const out = ctx.createGain();
  out.connect(keysBus());
  const total = soundingSeconds(notes);
  const from = Math.max(0, Math.min(o.from ?? 0, total));
  let start = ctx.currentTime + 0.08 - from;
  let next = notes.findIndex(n => n.at >= from - 0.005);
  if (next < 0) next = notes.length;
  let stopped = false;
  let raf = 0;
  holdUpdates('melody', true);

  const pump = () => {
    const ahead = ctx.currentTime + 0.5;
    while (next < notes.length && start + notes[next].at < ahead) {
      const n = notes[next++];
      const at = Math.max(start + n.at, ctx.currentTime + 0.01);
      voiceOn(ctx, out, instr, n.midi, at).off(start + n.at + n.len);
    }
  };
  const timer = window.setInterval(() => { if (!stopped) pump(); }, 120);
  pump();

  const frame = () => {
    if (stopped) return;
    const t = ctx.currentTime - start;
    if (t >= total + 0.15) {
      if (o.loopGap !== undefined) {
        // the next round after the breath
        if (t >= total + o.loopGap) { start += total + o.loopGap; next = 0; pump(); }
        o.onFrame?.(Math.min(t, total), []);
        raf = requestAnimationFrame(frame);
        return;
      }
      playback.stop();
      o.onEnd?.();
      return;
    }
    const lit: number[] = [];
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      if (n.at > t) break;
      if (t < n.at + n.len) lit.push(i);
    }
    o.onFrame?.(Math.max(0, t), lit);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  const playback: Playback = {
    stop: () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
      window.setTimeout(() => out.disconnect(), 400);
      holdUpdates('melody', false);
      if (current === playback) current = null;
      o.onStop?.();
    },
  };
  current = playback;
  return playback;
};
