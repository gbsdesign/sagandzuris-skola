import { useEffect, useSyncExternalStore } from 'react';
import { ChantSynth, loadBookScore } from './chantSynth';

// A quick listen from a list: the synthesizer of a chant version or the recording of a song. Only one sounds at a
// time; tapping it again, opening a notes or song page, hiding the app or folding the list away stops it.

type Phase = 'loading' | 'playing';
type Player = { play: () => Promise<unknown>; stop: () => void };

let state: { id: string; phase: Phase } | null = null;
let token: object | null = null;
let stopCurrent: (() => void) | null = null;
const listeners = new Set<() => void>();
const set = (s: typeof state) => { state = s; listeners.forEach(l => l()); };

export const stopPreview = () => {
  const stop = stopCurrent;
  stopCurrent = null;
  token = null;
  stop?.();
  if (state) set(null);
};

const start = async (id: string, prepare: (ended: () => void) => Promise<Player>) => {
  stopPreview();
  const mine = {};
  token = mine;
  set({ id, phase: 'loading' });
  const ended = () => { if (token === mine) { stopCurrent = null; token = null; set(null); } };
  let player: Player | null = null;
  try {
    player = await prepare(ended);
    if (token !== mine) { player.stop(); return; }
    stopCurrent = player.stop;
    await player.play();
    if (token === mine) set({ id, phase: 'playing' });
  } catch {
    player?.stop();
    ended();
  }
};

/** Play a chant version on the synthesizer (the notes file named after its first book number), or stop it */
export const toggleSynthPreview = (id: string, firstNum: number, book?: string) => {
  if (state?.id === id) return stopPreview();
  void start(id, async ended => {
    const synth = new ChantSynth(await loadBookScore(firstNum, book));
    synth.onEnd = ended;
    return { play: () => synth.play(0), stop: () => synth.dispose() };
  });
};

/** Play a recording, or stop it */
export const toggleAudioPreview = (id: string, url: string) => {
  if (state?.id === id) return stopPreview();
  void start(id, async ended => {
    const audio = new Audio(url);
    audio.onended = ended;
    audio.onerror = ended;
    return { play: () => audio.play(), stop: () => { audio.pause(); audio.removeAttribute('src'); audio.load(); } };
  });
};

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** What the list item `id` is doing now; it stops when the item leaves the screen (its list is folded away) */
export const usePreview = (id: string): Phase | null => {
  const s = useSyncExternalStore(subscribe, () => state);
  useEffect(() => () => { if (state?.id === id) stopPreview(); }, [id]);
  return s?.id === id ? s.phase : null;
};

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopPreview(); });
}
