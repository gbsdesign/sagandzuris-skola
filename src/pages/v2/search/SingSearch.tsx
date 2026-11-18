import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNotes } from '../../../context/NotesContext';
import { findVersion } from '../../../data/chantLookup';
import { startSinging, type SingSession } from '../../../utils/singCapture';
import { hummedNotes, matchHum, MIN_STEPS, type HumHit } from '../../../utils/humMatch';
import { loadBookScore, playLessonNotes, stopLessonNotes } from '../../../utils/chantSynth';
import { firstPitches } from '../../../utils/chantClips';
import type { HumEntry } from '../../../data/humIndex';
import { SingView, type SingRow, type SingStage } from './SingView';

// „ძებნა სიმღერით“ — a screen of its own over the search page with its own history step (`sgSing`), so the phone's „back“
// closes it. The pitch comes from the learning mode's microphone code (singCapture); the tune is compared with the chants'
// openings (utils/humMatch + data/humIndex, loaded only here).

const LISTEN_SECONDS = 10;
const TICK_MS = 100;

export const SingSearch: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { openNotes } = useNotes();
  const [stage, setStage] = useState<SingStage>('start');
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [hits, setHits] = useState<HumHit<HumEntry>[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [error, setError] = useState('');
  const session = useRef<SingSession | null>(null);
  const timer = useRef(0);
  const alive = useRef(true);

  // its own history step
  useEffect(() => {
    try { window.history.pushState({ ...(window.history.state || {}), sgSing: 1 }, ''); } catch { /* closes by its own button */ }
    const onPop = (e: PopStateEvent) => { if (!e.state?.sgSing) onClose(); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const back = () => { if (window.history.state?.sgSing) window.history.back(); else onClose(); };

  const release = useCallback(() => {
    window.clearInterval(timer.current);
    session.current?.cancel();
    session.current = null;
  }, []);
  useEffect(() => { alive.current = true; return () => { alive.current = false; release(); stopLessonNotes(); }; }, [release]);

  const finish = useCallback(async () => {
    const s = session.current;
    if (!s) return;
    const frames = s.frames.slice();
    release();
    const notes = hummedNotes(frames);
    let found: HumHit<HumEntry>[] = [];
    if (notes.length > MIN_STEPS) {
      const { HUM_INDEX } = await import('../../../data/humIndex');
      found = matchHum(notes, HUM_INDEX, 3);
    }
    if (!alive.current) return;
    setHits(found);
    setStage(found.length ? 'results' : 'none');
  }, [release]);

  const start = useCallback(async () => {
    stopLessonNotes();
    setPlaying(null);
    setError('');
    try {
      session.current = await startSinging(() => undefined);
    } catch {
      setError('მიკროფონი არ არის დაშვებული. ჩართე ბრაუზერის პარამეტრებში.');
      setStage('start');
      return;
    }
    if (!alive.current) { release(); return; }
    setSeconds(0);
    setLevels([]);
    setStage('listening');
    timer.current = window.setInterval(() => {
      const s = session.current;
      if (!s) return;
      const sec = (performance.now() - s.t0) / 1000;
      const rms = s.frames[s.frames.length - 1]?.rms ?? 0;
      setSeconds(sec);
      setLevels(l => [...l.slice(-40), Math.min(1, rms * 9)]);
      if (sec >= LISTEN_SECONDS) void finish();
    }, TICK_MS);
  }, [finish, release]);

  const rows: SingRow[] = hits.map(h => ({ key: h.entry.v, title: h.entry.t, sub: [h.entry.s, h.entry.sc].filter(Boolean).join(' · '), label: h.label }));

  // the chant's opening on the synthesizer, to compare by ear; a second tap stops it
  const play = async (key: string) => {
    if (playing === key) { stopLessonNotes(); setPlaying(null); return; }
    const v = findVersion(key)?.variant;
    if (!v?.bookNums?.length) return;
    setPlaying(key);
    try {
      const notes = firstPitches(await loadBookScore(v.bookNums[0], v.book), 8, 10);
      await playLessonNotes(notes);
      const end = notes.reduce((m, [at, len]) => Math.max(m, at + len), 0);
      window.setTimeout(() => { if (alive.current) setPlaying(p => (p === key ? null : p)); }, end * 1000 + 300);
    } catch { setPlaying(null); }
  };

  return (
    <div className="fixed inset-0 z-[76] overflow-y-auto overscroll-contain bg-page pt-[env(safe-area-inset-top)] text-ink safe-x">
      <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col px-4">
        <SingView
          stage={stage}
          seconds={seconds}
          total={LISTEN_SECONDS}
          levels={levels}
          rows={rows}
          playing={playing}
          error={error}
          onBack={back}
          onStart={() => void start()}
          onStop={() => void finish()}
          onWords={back}
          onPlay={key => void play(key)}
          onOpen={key => { stopLessonNotes(); setPlaying(null); openNotes(key, 'list'); }}
        />
      </div>
    </div>
  );
};
