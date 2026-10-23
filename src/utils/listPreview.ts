import { useEffect, useSyncExternalStore } from 'react';
import { ChantSynth, loadBookScore } from './chantSynth';
import { getCachedAudioUrl } from './audioCache';
import { hasTrack } from './offlineFiles';

// A quick listen from a list: the synthesizer of a chant version or the recording of a song. Only one sounds at a
// time; tapping it again, opening a notes or song page, hiding the app or folding the list away stops it.

type Phase = 'loading' | 'playing';
type Player = { play: () => Promise<unknown>; stop: () => void; progress: () => number };

let state: { id: string; phase: Phase } | null = null;
let token: object | null = null;
let stopCurrent: (() => void) | null = null;
let progressOf: (() => number) | null = null;
const listeners = new Set<() => void>();
const set = (s: typeof state) => { state = s; listeners.forEach(l => l()); };

export const stopPreview = () => {
  const stop = stopCurrent;
  stopCurrent = null;
  progressOf = null;
  token = null;
  stop?.();
  if (state) set(null);
};

const start = async (id: string, prepare: (ended: () => void) => Promise<Player>) => {
  stopPreview();
  const mine = {};
  token = mine;
  set({ id, phase: 'loading' });
  const ended = () => { if (token === mine) { stopCurrent = null; progressOf = null; token = null; set(null); } };
  let player: Player | null = null;
  try {
    player = await prepare(ended);
    if (token !== mine) { player.stop(); return; }
    stopCurrent = player.stop;
    progressOf = player.progress;
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
    return { play: () => synth.play(0), stop: () => synth.dispose(), progress: () => (synth.duration ? synth.position() / synth.duration : 0) };
  });
};

/** Play a recording, or stop it */
export const toggleAudioPreview = (id: string, url: string) => {
  if (state?.id === id) return stopPreview();
  void start(id, async ended => {
    // a recording kept for offline use plays from the device
    const local = hasTrack(url) ? await getCachedAudioUrl(url) : null;
    const audio = new Audio(local ?? url);
    audio.onended = ended;
    audio.onerror = ended;
    return {
      play: () => audio.play(),
      stop: () => { audio.pause(); audio.removeAttribute('src'); audio.load(); if (local) URL.revokeObjectURL(local); },
      progress: () => (audio.duration ? audio.currentTime / audio.duration : 0),
    };
  });
};

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** How far the list item `id` has played, 0…1 (0 when it is not the one playing) */
export const previewProgress = (id: string) => (state?.id === id && progressOf ? Math.min(1, Math.max(0, progressOf())) : 0);

/** What the list item `id` is doing now; it stops when the item leaves the screen (its list is folded away) */
export const usePreview = (id: string): Phase | null => {
  const s = useSyncExternalStore(subscribe, () => state);
  useEffect(() => () => { if (state?.id === id) stopPreview(); }, [id]);
  return s?.id === id ? s.phase : null;
};

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopPreview(); });
}
