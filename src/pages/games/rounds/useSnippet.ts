import { useCallback, useEffect, useRef, useState } from 'react';
import { clipStart } from '../../../utils/kutkhe';

// A round's piece of a recording (the quick games, pages/games/rounds/): one <audio> for the whole screen, so once a tap has
// let it sound (a phone lets a page make sound only after a touch), every next round plays by itself. The piece starts at the
// same share of the recording on every phone (`from`) and stops after `seconds`. Every Worker URL is fetched with
// crossOrigin, as ChantPlayer does (the Worker answers only requests carrying the site's Origin).

export type SnipState = 'idle' | 'load' | 'play' | 'done' | 'error' | 'blocked';

// a tenth of a second of silence: played in a tap, it lets the element sound later on its own
const silence = (() => {
  let url = '';
  return () => {
    if (url) return url;
    const n = 800;
    const b = new ArrayBuffer(44 + n * 2);
    const v = new DataView(b);
    const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true);
    v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    url = URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
    return url;
  };
})();

export const useSnippet = (seconds: number) => {
  const el = useRef<HTMLAudioElement | null>(null);
  const cur = useRef<{ url: string; from: number; start: number | null } | null>(null);
  const [state, setState] = useState<SnipState>('idle');
  const [prog, setProg] = useState(0);

  const audio = () => {
    if (el.current) return el.current;
    const a = new Audio();
    a.crossOrigin = 'anonymous';
    a.preload = 'auto';
    a.addEventListener('loadedmetadata', () => {
      const c = cur.current;
      if (!c || a.src !== c.url) return;
      c.start = clipStart(a.duration, c.from, seconds);
      try { a.currentTime = c.start; } catch { c.start = 0; }
    });
    a.addEventListener('playing', () => { if (cur.current && a.src === cur.current.url) setState('play'); });
    a.addEventListener('waiting', () => { if (cur.current && a.src === cur.current.url) setState('load'); });
    a.addEventListener('timeupdate', () => {
      const c = cur.current;
      if (!c || a.src !== c.url || c.start === null) return;
      const p = (a.currentTime - c.start) / seconds;
      if (p >= 1) { a.pause(); setState('done'); setProg(1); } else setProg(Math.max(0, p));
    });
    a.addEventListener('ended', () => { if (cur.current && a.src === cur.current.url) { setState('done'); setProg(1); } });
    a.addEventListener('error', () => { if (cur.current && a.src === cur.current.url) { setState('error'); setProg(0); } });
    el.current = a;
    return a;
  };

  /** the piece from its start (the same piece again when it is the same recording) */
  const play = useCallback((url: string, from: number) => {
    const a = audio();
    const same = cur.current?.url === url && a.src === url && cur.current.start !== null;
    setProg(0);
    setState('load');
    if (same) {
      try { a.currentTime = cur.current!.start!; } catch { /* not seekable yet */ }
    } else {
      cur.current = { url, from, start: null };
      a.src = url;
    }
    a.play().catch((e: unknown) => {
      const name = (e as Error)?.name;
      if (cur.current?.url !== url || name === 'AbortError') return;
      // the phone wants a touch first
      setState(name === 'NotAllowedError' ? 'blocked' : 'error');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);

  const stop = useCallback(() => {
    const a = el.current;
    if (a && !a.paused) a.pause();
    setState(s => (s === 'play' || s === 'load' ? 'done' : s));
  }, []);

  /** in a tap: lets this screen sound later by itself (the player's „შესვლა“, the host's „დაწყება“) */
  const unlock = useCallback(() => {
    const a = audio();
    if (cur.current || !a.paused) return;
    a.src = silence();
    a.play().then(() => a.pause()).catch(() => { /* a later tap will do */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    const a = el.current;
    if (!a) return;
    a.pause();
    a.removeAttribute('src');
    a.load();
  }, []);

  return { state, prog, play, stop, unlock };
};
export type Snippet = ReturnType<typeof useSnippet>;
