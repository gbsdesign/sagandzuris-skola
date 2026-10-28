// The pearls game's music: the first phrase of one voice of a chant, as the member hears it and sings it back.
// Pure functions, tested in tests/pearls.test.ts.
import type { BookScore } from './chantSynth';
import { makeTimeMap } from './chantSynth';
import { POLISH_SHARE, mergeHeld } from './pitch';
import type { Scoring, SungNote } from './pitch';
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

/** students/{uid}.pearls[versionId]: the best try in any voice (`best` % of the phrase sung right, its voice — the
 *  take the teachers hear) and, since 2026-10-28, the best in each voice (older records have only the first). */
export interface PearlRecord { best: number; voice: Voice; at: string; voices?: Partial<Record<Voice, number>> }
export interface PearlShine { voice: Voice; by: string; at: string }

export const POLISH_PCT = POLISH_SHARE * 100;
export const VOICE_IDS: Voice[] = ['1', '2', '3'];

export const pearlState = (rec: PearlRecord | undefined, shine: PearlShine | undefined): PearlState =>
  shine ? 'shining' : !rec ? 'new' : rec.best >= POLISH_PCT ? 'polished' : 'tried';

/** The best % in each voice sung so far (an older record counts its overall best for its voice). */
export const voiceBests = (rec: PearlRecord | undefined): Partial<Record<Voice, number>> => {
  const out: Partial<Record<Voice, number>> = {};
  if (!rec) return out;
  for (const v of VOICE_IDS) {
    const n = rec.voices?.[v];
    if (typeof n === 'number') out[v] = n;
  }
  if (VOICE_IDS.includes(rec.voice) && typeof rec.best === 'number' && (out[rec.voice] ?? -1) < rec.best) out[rec.voice] = rec.best;
  return out;
};

/** Polished in all three voices: the pearl turns golden. */
export const isGolden = (rec: PearlRecord | undefined) => {
  const b = voiceBests(rec);
  return VOICE_IDS.every(v => (b[v] ?? -1) >= POLISH_PCT);
};

/** What a try of `pct` % in `voice` changes in the record: the voice's own best, and the overall best (with its
 *  voice and time) when it is reached; null when it improves nothing. Written with merge (hooks/usePearls savePearl). */
export const pearlPatch = (rec: PearlRecord | undefined, pct: number, voice: Voice, at: string): Partial<PearlRecord> | null => {
  const patch: Partial<PearlRecord> = {};
  if (pct > (voiceBests(rec)[voice] ?? -1)) patch.voices = { [voice]: pct };
  if (!rec || pct >= rec.best) Object.assign(patch, { best: pct, voice, at });
  return Object.keys(patch).length ? patch : null;
};

export const VOICE_NAMES: Record<Voice, string> = { '1': 'I ხმა', '2': 'II ხმა', '3': 'III ხმა' };

/**
 * Where a take went wrong: each phrase note that was missed (`index` into the target) and how far the voice was from
 * it in semitones (+ = too high, − = too low) — the nearest of the notes sung between the matched notes around it,
 * each used once — or null when nothing near it (a semitone and a half) was sung. `scoring` is scoreSinging's.
 */
export const missedNotes = (target: number[], sungNotes: SungNote[], scoring: Scoring): { index: number; err: number | null }[] => {
  const { matched, offset } = scoring;
  const sung = mergeHeld(sungNotes);
  const taken = new Set(matched.filter((x): x is SungNote => !!x).map(x => x.start));
  const used = new Set<number>();
  const out: { index: number; err: number | null }[] = [];
  target.forEach((t, i) => {
    if (matched[i]) return;
    // the sung notes after the matched note before this one and before the matched note after it
    let from = -Infinity;
    for (let p = i - 1; p >= 0; p--) if (matched[p]) { from = matched[p]!.start; break; }
    let to = Infinity;
    for (let q = i + 1; q < target.length; q++) if (matched[q]) { to = matched[q]!.start; break; }
    let best: { start: number; e: number } | null = null;
    for (const s of sung) {
      if (s.start <= from || s.start >= to || taken.has(s.start) || used.has(s.start)) continue;
      const e = s.midi - offset - t;
      if (Math.abs(e) <= 1.5 && (!best || Math.abs(e) < Math.abs(best.e))) best = { start: s.start, e };
    }
    if (best) used.add(best.start);
    out.push({ index: i, err: best ? best.e : null });
  });
  return out;
};

const NOTE_NAMES = ['დო', 'დო♯', 'რე', 'მი♭', 'მი', 'ფა', 'ფა♯', 'სოლ', 'სოლ♯', 'ლა', 'სი♭', 'სი'];
export const noteName = (midi: number) => NOTE_NAMES[((Math.round(midi) % 12) + 12) % 12];
