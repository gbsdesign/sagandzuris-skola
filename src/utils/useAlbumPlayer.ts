import { useEffect, useRef, useState } from 'react';
import { AUDIO_PROXY } from '../data/chantMediaRegistry';
import { stopPreview } from './listPreview';
import { getCachedAudioUrl } from './audioCache';
import { hasTrack } from './offlineFiles';
import { triggerHaptic } from './haptics';
import { followElement, hideFromControls, showInControls } from './mediaControls';

// The player of a list of single recordings (the chant albums, the Folklore Centre's song albums): one recording
// sounds at a time, from the device when it was kept for offline use. It goes on while the app is in the background
// and shows in the phone's controls (utils/mediaControls.ts); leaving the page stops it.

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

type Phase = 'loading' | 'playing' | 'paused';

/** What the phone's controls call the recording */
export interface TrackName { title: string; artist?: string }

export const useAlbumPlayer = () => {
  const audio = useRef<HTMLAudioElement | null>(null);
  const current = useRef<string | null>(null);
  const local = useRef<string | null>(null); // the device copy's object URL, freed on the next track
  const [cur, setCur] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('paused');
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => () => {
    // leaving the album stops
    const a = audio.current;
    if (a) { a.pause(); hideFromControls(a); a.removeAttribute('src'); a.load(); }
  }, []);

  const element = () => {
    if (audio.current) return audio.current;
    const a = new Audio();
    // the audio Worker answers only requests that carry the site's Origin
    a.crossOrigin = 'anonymous';
    a.preload = 'metadata';
    followElement(a);
    a.ontimeupdate = () => setTime(a.currentTime);
    a.ondurationchange = () => setDur(Number.isFinite(a.duration) ? a.duration : 0);
    a.onwaiting = () => setPhase('loading');
    a.onplaying = () => setPhase('playing');
    a.onpause = () => setPhase('paused');
    a.onended = () => setPhase('paused');
    a.onerror = () => setPhase('paused');
    return (audio.current = a);
  };

  const play = (a: HTMLAudioElement, id: string) => {
    stopPreview();
    a.play().catch(() => { if (current.current === id) setPhase('paused'); });
  };

  const toggle = (id: string, name?: TrackName) => {
    triggerHaptic(12);
    const a = element();
    if (current.current === id) {
      if (a.paused) play(a, id);
      else a.pause();
      return;
    }
    current.current = id;
    showInControls(a, name?.title || 'ჩანაწერი', name?.artist);
    setCur(id);
    setTime(0);
    setDur(0);
    setPhase('loading');
    if (local.current) { URL.revokeObjectURL(local.current); local.current = null; }
    const url = `${AUDIO_PROXY}/${id}`;
    if (!hasTrack(url)) {
      a.src = url;
      play(a, id);
      return;
    }
    // kept for offline use: plays from the device
    void getCachedAudioUrl(url).then(blobUrl => {
      if (current.current !== id) { if (blobUrl) URL.revokeObjectURL(blobUrl); return; }
      local.current = blobUrl;
      a.src = blobUrl ?? url;
      play(a, id);
    });
  };

  const seek = (t: number) => {
    if (audio.current) audio.current.currentTime = t;
    setTime(t);
  };

  /** pause what plays (e.g. before another page's player opens) */
  const stop = () => { audio.current?.pause(); };

  return { cur, phase, time, dur, toggle, seek, stop };
};
