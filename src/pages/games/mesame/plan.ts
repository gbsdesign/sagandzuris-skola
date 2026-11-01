import { useEffect, useState } from 'react';
import { loadBookScore, makeTimeMap, type BookScore } from '../../../utils/chantSynth';
import { partsOfScore, timelineIn, type LearnPart } from '../../../utils/learn';
import { notesIn, openingEnd, type TrioNote } from '../../../utils/trio';

// A chant's notes for „მესამე ხმა“: loaded once, cut into its lines (the learning mode's parts), and the section sung —
// its opening or the whole — with my voice's notes in it.

export const VOICE_LABELS = ['I · მთქმელი', 'II · მოძახილი', 'III · ბანი'];
export const VOICE_SHORT = ['I ხმა', 'II ხმა', 'III ხმა'];
export const SLOW = 0.8;

export interface LoadedChant { score: BookScore; parts: LearnPart[]; duration: number }

export const useChantScore = (book: string | undefined, num: number | undefined) => {
  const [loaded, setLoaded] = useState<LoadedChant | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setLoaded(null);
    setFailed(false);
    if (!book || !num) return;
    let live = true;
    loadBookScore(num, book).then(score => {
      if (!live) return;
      setLoaded({ score, parts: partsOfScore(score), duration: makeTimeMap(score.tempos).toSec(score.dur) });
    }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [book, num]);
  return { loaded, failed };
};

export interface Section { from: number; to: number; notes: TrioNote[] }

/** the section sung by a voice: the opening's lines or the whole chant */
export const sectionOf = (c: LoadedChant, voice: number, whole: boolean): Section => {
  const from = 0;
  const to = whole ? c.duration : Math.min(c.duration, openingEnd(c.parts) || c.duration);
  const v = Math.min(voice, c.score.voices.length - 1);
  return { from, to, notes: notesIn(timelineIn(c.score, v, 0, c.score.dur), from, to) };
};

/** a chant whose opening is already the whole of it (then there is nothing to choose) */
export const openingIsWhole = (c: LoadedChant) => sectionOf(c, 0, false).to >= c.duration - 0.05;

/** how many voices a chant has for the trio (the fourth of a litany always sounds) */
export const trioVoices = (c: LoadedChant | null) => Math.min(3, c?.score.voices.length ?? 3);

/** a section's length as people say it */
export const lengthText = (seconds: number) => {
  const s = Math.max(1, Math.round(seconds));
  return s < 60 ? `${s} წამი` : `${Math.floor(s / 60)} წთ ${s % 60 ? `${s % 60} წმ` : ''}`.trim();
};

/** the line (system) of the book's notes sounding at a score second, for the picture under the mirror */
export const systemAt = (score: BookScore, beat: number): number | null => {
  let best: number | null = null;
  score.sys.forEach((s, k) => { if (beat >= s[5] - 1e-6 && beat < s[6] - 1e-6) best = k; });
  return best;
};
