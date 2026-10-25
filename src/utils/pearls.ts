// The pearls game's music: the first phrase of one voice of a chant, as the member hears it and sings it back.
// Pure functions, tested in tests/pearls.test.ts.
import type { BookScore } from './chantSynth';
import { makeTimeMap } from './chantSynth';
import { POLISH_SHARE } from './pitch';
import type { Voice } from './pathItems';

export interface Phrase {
  notes: [at: number, len: number, midi: number][]; // seconds from the start (for playLessonNotes)
  target: number[]; // the melody: the phrase's pitches with repeated ones taken as one
  seconds: number;
}

// a recitation tone held for many beats is shortened: the phrase is for the ear, not for timing
const MAX_NOTE_SEC = 2.5;
const MAX_REST_SEC = 0.8;
const REPEAT_SEC = 0.5;

/**
 * The first phrase of a voice (0 = I, the top): notes from the start until the melody has moved at least five
 * times and comes to a long note or a rest, or has moved ten times, or about 14–20 seconds have passed.
 */
export const phraseOf = (score: BookScore, voice: number): Phrase => {
  const list = [...(score.voices[voice] || [])].sort((a, b) => a[0] - b[0] || (voice === 0 ? b[2] - a[2] : a[2] - b[2]));
  // a voice split in two (two singers) gives two notes at one beat: the top voice keeps the upper one, the others
  // the lower one (the sort put it first)
  const line = list.filter((n, i) => i === 0 || n[0] !== list[i - 1][0]);
  const toSec = makeTimeMap(score.tempos).toSec;
  const notes: Phrase['notes'] = [];
  const target: number[] = [];
  let t = 0;
  for (let i = 0; i < line.length; i++) {
    const [beat, beats, midi] = line[i];
    const next = line[i + 1];
    const start = toSec(beat);
    // the note sounds until the next one starts (a held note under a moving one is cut there)
    const end = next ? Math.min(toSec(beat + beats), toSec(next[0])) : toSec(beat + beats);
    // syllables recited on one pitch go at a speaking pace, so the phrase reaches its melody
    const repeat = notes.length > 0 && notes[notes.length - 1][2] === midi;
    const len = Math.min(repeat ? REPEAT_SEC : MAX_NOTE_SEC, Math.max(0.15, end - start));
    notes.push([t, len, midi]);
    if (target[target.length - 1] !== midi) target.push(midi);
    t += len;
    const rest = next ? Math.max(0, toSec(next[0]) - toSec(beat + beats)) : 0;
    t += Math.min(MAX_REST_SEC, rest);
    const moves = target.length - 1;
    if (moves >= 10) break;
    if (moves >= 5 && (end - start >= 1.9 || rest > 0.2)) break;
    if ((t > 14 && moves >= 3) || t > 20) break;
  }
  return { notes, target, seconds: t };
};

export type PearlState = 'new' | 'tried' | 'polished' | 'shining';

export interface PearlRecord { best: number; voice: Voice; at: string } // best: % of the phrase sung right
export interface PearlShine { voice: Voice; by: string; at: string }

export const pearlState = (rec: PearlRecord | undefined, shine: PearlShine | undefined): PearlState =>
  shine ? 'shining' : !rec ? 'new' : rec.best >= POLISH_SHARE * 100 ? 'polished' : 'tried';

export const VOICE_NAMES: Record<Voice, string> = { '1': 'I ხმა', '2': 'II ხმა', '3': 'III ხმა' };

const NOTE_NAMES = ['დო', 'დო♯', 'რე', 'მი♭', 'მი', 'ფა', 'ფა♯', 'სოლ', 'სოლ♯', 'ლა', 'სი♭', 'სი'];
export const noteName = (midi: number) => NOTE_NAMES[((Math.round(midi) % 12) + 12) % 12];
