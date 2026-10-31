import { useCallback, useEffect, useRef, useState } from 'react';
import { clipStart } from '../../../utils/kutkhe';
import { ChantSynth, lessonAudioReady, loadBookScore, playLessonNotes, stopLessonNotes } from '../../../utils/chantSynth';
import { firstPitches, lowerVoices, notesLength } from '../../../utils/chantClips';

// A round's piece (the quick games, pages/games/rounds/): a recording's, through one <audio> for the whole screen, so once a
// tap has let it sound (a phone lets a page make sound only after a touch), every next round plays by itself — the piece
// starts at the same share of the recording on every phone (`from`) and stops after `seconds`; every Worker URL is fetched
// with crossOrigin, as ChantPlayer does (the Worker answers only requests carrying the site's Origin). Or a chant's book
// notes on the synthesizer (2026-10-31, „ხმა-ხმად“ and „სამ ნოტში!“): its opening with only its lower voices (from their
// first note), or the top voice's first notes; the tap that unlocks the <audio> starts the synthesizer's sound too.

export type SnipState = 'idle' | 'load' | 'play' | 'done' | 'error' | 'blocked';

export interface ScoreRef { book: string; num: number }
/** what a round plays: a piece of a recording, a chant's opening (`voices`: from this voice down, 0 = all) or its first notes */
export type Clip =
  | { url: string; from: number }
  | { score: ScoreRef; voices: number; seconds: number }
  | { score: ScoreRef; pitches: number; within: number };

// the lesson notes are one stream for the whole app (a new call cuts the one before): whose notes are sounding now
let notesSeq = 0;
let notesOwner = 0;

// every screen's piece, to be silenced at once (a singer's microphone must not hear it)
const hushers = new Set<() => void>();
export const hushSnippets = () => hushers.forEach(stop => stop());

/** the synthesizer may sound without a tap: it has been let once (else a short try, then the phone wants a tap) */
const synthReady = async () => {
  if (lessonAudioReady()) return true;
  await Promise.race([playLessonNotes([]), new Promise(r => setTimeout(r, 700))]);
  return lessonAudioReady();
};

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
  // the synthesizer's piece now sounding, and the number of the last play (a later one wins)
  const synth = useRef<(() => void) | null>(null);
  const turn = useRef(0);
  const stopSynth = () => { const s = synth.current; synth.current = null; s?.(); };

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

  /** a chant's piece on the synthesizer: loaded, played, its progress followed until it ends */
  const playScore = async (clip: Exclude<Clip, { url: string }>, my: number) => {
    let score;
    try { score = await loadBookScore(clip.score.num, clip.score.book); } catch { if (turn.current === my) setState('error'); return; }
    if (turn.current !== my) return;
    if (!(await synthReady())) { if (turn.current === my) setState('blocked'); return; }
    if (turn.current !== my) return;
    let length: number;
    let position: () => number;
    let stopMine: () => void;
    if ('pitches' in clip) {
      const notes = firstPitches(score, clip.pitches, clip.within);
      length = Math.max(0.5, notesLength(notes));
      const mine = ++notesSeq;
      notesOwner = mine;
      await playLessonNotes(notes);
      const t0 = performance.now();
      position = () => (performance.now() - t0) / 1000;
      // stopped only while still its own: a newer piece of notes has already cut it
      stopMine = () => { if (notesOwner === mine) { notesOwner = 0; stopLessonNotes(); } };
    } else {
      const s = new ChantSynth(score);
      const low = lowerVoices(score, clip.voices);
      score.voices.forEach((_, v) => s.setMuted(v, v < low.first));
      const from = Math.max(0, Math.min(s.duration - 0.5, s.toSec(low.beat)));
      length = Math.max(0.5, Math.min(clip.seconds, s.duration - from));
      await s.play(from);
      position = () => s.position() - from;
      stopMine = () => s.dispose();
    }
    if (turn.current !== my) { stopMine(); return; }
    setState('play');
    const tick = window.setInterval(() => {
      const p = position() / length;
      if (p < 1) { setProg(Math.max(0, p)); return; }
      stopSynth();
      setProg(1);
      setState('done');
    }, 150);
    synth.current = () => { window.clearInterval(tick); stopMine(); };
  };

  /** the piece from its start (the same piece again when it is the same recording) */
  const play = useCallback((clip: Clip) => {
    const my = ++turn.current;
    stopSynth();
    if (!('url' in clip)) {
      // in a tap the synthesizer's sound is let here, before the notes load
      if (!lessonAudioReady()) void playLessonNotes([]);
      const a = el.current;
      if (a && !a.paused) a.pause();
      setProg(0);
      setState('load');
      void playScore(clip, my);
      return;
    }
    const { url, from } = clip;
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
    turn.current += 1;
    stopSynth();
    const a = el.current;
    if (a && !a.paused) a.pause();
    setState(s => (s === 'play' || s === 'load' ? 'done' : s));
  }, []);

  /** in a tap: lets this screen sound later by itself (the player's „შესვლა“, the host's „დაწყება“) */
  const unlock = useCallback(() => {
    if (!lessonAudioReady()) void playLessonNotes([]);
    const a = audio();
    if (cur.current || !a.paused) return;
    a.src = silence();
    a.play().then(() => a.pause()).catch(() => { /* a later tap will do */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    hushers.add(stop);
    return () => { hushers.delete(stop); };
  }, [stop]);

  useEffect(() => () => {
    turn.current += 1;
    stopSynth();
    const a = el.current;
    if (!a) return;
    a.pause();
    a.removeAttribute('src');
    a.load();
  }, []);

  return { state, prog, play, stop, unlock };
};
export type Snippet = ReturnType<typeof useSnippet>;
