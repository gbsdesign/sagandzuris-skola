import { useEffect, useRef, useState } from 'react';
import { AUDIO_PROXY } from '../data/chantMediaRegistry';
import { stopPreview } from './listPreview';
import { getCachedAudioUrl } from './audioCache';
import { hasTrack } from './offlineFiles';
import { triggerHaptic } from './haptics';

// The player of a list of single recordings (the chant albums, the Folklore Centre's song albums): one recording
// sounds at a time, from the device when it was kept for offline use; hiding the app pauses, leaving the page stops.

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

type Phase = 'loading' | 'playing' | 'paused';

export const useAlbumPlayer = () => {
  const audio = useRef<HTMLAudioElement | null>(null);
  const current = useRef<string | null>(null);
  const local = useRef<string | null>(null); // the device copy's object URL, freed on the next track
  const [cur, setCur] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('paused');
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    // hiding the app pauses; leaving the album stops
    const onHide = () => { if (document.hidden) audio.current?.pause(); };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      const a = audio.current;
      if (a) { a.pause(); a.removeAttribute('src'); a.load(); }
    };
  }, []);

  const element = () => {
    if (audio.current) return audio.current;
    const a = new Audio();
    // the audio Worker answers only requests that carry the site's Origin
    a.crossOrigin = 'anonymous';
    a.preload = 'metadata';
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

  const toggle = (id: string) => {
    triggerHaptic(12);
    const a = element();
    if (current.current === id) {
      if (a.paused) play(a, id);
      else a.pause();
      return;
    }
    current.current = id;
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
