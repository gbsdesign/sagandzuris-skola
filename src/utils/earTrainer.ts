import type { Timed } from './chantClips';
import { MELODY_POOL } from '../data/melodyPool';
import { CHORD_POOL } from '../data/chordPool';
import { kindById } from './akordi';
import { mergeHeld, notesFromFrames } from './pitch';

// „ოსტატობის გზა“'s trainers (components/mastery/trainers): the questions they ask and how the microphone's frames are
// judged. A question's sound is a list of notes [start s, length s, midi] for chantSynth's playLessonNotes; the melodies
// come from the app's chants (data/melodyPool.ts), the chords from their book notes (data/chordPool.ts). `base` is the
// student's low voice (48, C3 — a man's) or high one (60, C4), as „ოსტატობა“'s other exercises (MANERA_BASE). Pure;
// tested in tests/earTrainer.test.ts.

/** rounds of a quiz or a singing trainer */
export const ROUNDS = 10;
/** a round of several notes passes with this many right (all of a short one) */
export const notesNeeded = (n: number) => (n <= 3 ? n : n - 1);

type Rnd = () => number;
const pickOf = <T,>(xs: readonly T[], rnd: Rnd): T => xs[Math.min(xs.length - 1, Math.floor(rnd() * xs.length))];
const between = (a: number, b: number, rnd: Rnd) => a + Math.min(b - a, Math.floor(rnd() * (b - a + 1)));
const median = (xs: readonly number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
export const shuffled = <T,>(xs: readonly T[], rnd: Rnd): T[] => {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};

/** how far `a` is from `b` in semitones, an octave off counting as right: −6 … +6 */
export const pcDiff = (a: number, b: number) => ((((a - b + 6) % 12) + 12) % 12) - 6;

/** octaves added so the line's middle sits near `centre` */
export const octaveShift = (notes: readonly number[], centre: number) => 12 * Math.round((centre - median(notes)) / 12);

/** notes one after another, each `len` s long with a little air */
const inRow = (notes: readonly number[], step: number, from = 0): Timed[] => notes.map((m, i) => [from + i * step, step * 0.92, m]);

const CHANTS = MELODY_POOL.filter(m => !m.song);

// ——— answers by ear ———

/** `prompt` shows with the question, `note` after the answer (the chant a chord or a heirmos is from) */
export interface Quiz { play: Timed[]; options: string[]; right: number; prompt?: string; note?: string }

export const HIGHER_OPTIONS = ['დაბლა', 'იგივე', 'მაღლა'];

/** two notes: is the second lower, the same or higher? */
export const higherQuiz = (base: number, rnd: Rnd): Quiz => {
  const a = between(base + 2, base + 7, rnd);
  const r = rnd();
  const d = r < 0.2 ? 0 : (r < 0.6 ? 1 : -1) * pickOf([1, 2, 2, 3, 4, 5, 7], rnd);
  return { play: [[0, 0.9, a], [1.15, 0.9, a + d]], options: HIGHER_OPTIONS, right: d < 0 ? 0 : d === 0 ? 1 : 2 };
};

export const INTERVAL_NAMES: Record<number, string> = {
  1: 'პატარა სეკუნდა', 2: 'დიდი სეკუნდა', 3: 'პატარა ტერცია', 4: 'დიდი ტერცია', 5: 'კვარტა', 6: 'ტრიტონი',
  7: 'კვინტა', 8: 'პატარა სექსტა', 9: 'დიდი სექსტა', 10: 'პატარა სეპტიმა', 11: 'დიდი სეპტიმა', 12: 'ოქტავა',
};

/** an interval up from a root, then both together; the answers are the set's names, smallest first */
export const intervalQuiz = (base: number, set: readonly number[], rnd: Rnd): Quiz => {
  const sorted = [...set].sort((a, b) => a - b);
  const iv = pickOf(sorted, rnd);
  const root = between(base - 2, base + 4, rnd);
  return {
    play: [[0, 0.9, root], [1.05, 0.9, root + iv], [2.3, 1.6, root], [2.3, 1.6, root + iv]],
    options: sorted.map(i => INTERVAL_NAMES[i]),
    right: sorted.indexOf(iv),
  };
};

export const chordLabel = (id: string) => { const k = kindById(id); return k ? `${k.steps} · ${k.name}` : id; };

/** a chord of a real chant or song (data/chordPool.ts): together, from the bass up, together again */
export const chordQuiz = (kinds: readonly string[], rnd: Rnd): Quiz => {
  const kind = pickOf(kinds, rnd);
  const [, top, mid, bass, title] = pickOf(CHORD_POOL.filter(s => s[0] === kind), rnd);
  const all = (at: number, len: number): Timed[] => [[at, len, bass], [at, len, mid], [at, len, top]];
  return {
    play: [...all(0, 1.8), [2.1, 0.7, bass], [2.8, 0.7, mid], [3.5, 0.7, top], ...all(4.3, 1.6)],
    options: kinds.map(chordLabel),
    right: kinds.indexOf(kind),
    note: title,
  };
};

// ——— old letters ———

const LETTER_READINGS = ['ი', 'ხ', 'ვი', 'ეი', 'ო', 'ფ', 'ყ', 'ჰ', 'უ', 'ქ'];
const LETTERS: [string, string][] = [['ჲ', 'ი'], ['ჴ', 'ხ'], ['ჳ', 'ვი'], ['ჱ', 'ეი'], ['ჵ', 'ო'], ['ჶ', 'ფ']];
/** a word of the chants' old spelling, how it is read, and three misreadings */
export const OLD_WORDS: [word: string, right: string, ...wrong: string[]][] = [
  ['დიდებაჲ', 'დიდებაი', 'დიდება', 'დიდებაია', 'დიდებაიე'],
  ['ძალაჲ', 'ძალაი', 'ძალა', 'ძალაია', 'ძალაიე'],
  ['ქებაჲ', 'ქებაი', 'ქება', 'ქებაია', 'ქებაიე'],
  ['ჴორცი', 'ხორცი', 'ყორცი', 'ქორცი', 'ჰორცი'],
  ['ჴელი', 'ხელი', 'ყელი', 'ქელი', 'ჰელი'],
  ['ჴმაჲ', 'ხმაი', 'ყმაი', 'ხმა', 'ქმაი'],
  ['ჩუენ', 'ჩვენ', 'ჩუენ', 'ჩვუენ', 'ჩუვენ'],
  ['სიტყუაჲ', 'სიტყვაი', 'სიტყუაი', 'სიტყვა', 'სიტყუა'],
  ['შეგუწყალენ', 'შეგვიწყალენ', 'შეგუწყალენ', 'შეგუიწყალენ', 'შეგწყალენ'],
  ['ღმრთისაჲ', 'ღმრთისაი', 'ღმრთისა', 'ღმრთისაია', 'ღმრთისაიე'],
];

export const lettersQuiz = (rnd: Rnd): Quiz & { show: string } => {
  if (rnd() < 0.4) {
    const [glyph, reading] = pickOf(LETTERS, rnd);
    const options = shuffled([reading, ...shuffled(LETTER_READINGS.filter(r => r !== reading), rnd).slice(0, 3)], rnd);
    return { show: glyph, play: [], options, right: options.indexOf(reading), prompt: 'როგორ იკითხება ეს ასო?' };
  }
  const [word, right, ...wrong] = pickOf(OLD_WORDS, rnd);
  const options = shuffled([right, ...wrong.slice(0, 3)], rnd);
  return { show: word, play: [], options, right: options.indexOf(right), prompt: 'როგორ წავიკითხოთ?' };
};

// ——— singing back ———

export interface SingTask {
  /** what sounds first; the student sings after it */
  cue: Timed[];
  /** what the student sings (any octave) */
  target: number[];
  /** a line over the round: „კვინტა ზემოთ“, „იმღერე ბანი“ */
  label?: string;
  /** the chant the notes come from */
  from?: string;
}

const SCALE = [0, 2, 4, 5, 7, 9, 11, 12];

/** n notes to sing back: a walk in the scale, a chant's opening, or a quick turn of three */
export const echoTask = (n: number, from: 'scale' | 'chant' | 'turn', base: number, rnd: Rnd): SingTask => {
  if (from === 'chant') {
    const m = pickOf(CHANTS, rnd);
    let start = 0;
    for (let tries = 0; tries < 30; tries++) {
      start = between(0, Math.max(0, m.top.length - n), rnd);
      if (new Set(m.top.slice(start, start + n)).size >= Math.min(3, n)) break;
    }
    const raw = m.top.slice(start, start + n);
    const k = octaveShift(raw, base + 5);
    const notes = raw.map(x => x + k);
    return { cue: inRow(notes, 0.62), target: notes, from: m.title };
  }
  if (from === 'turn') {
    const x = between(base + 2, base + 6, rnd);
    const notes = pickOf([[0, 2, 0], [0, -1, 0], [0, -2, 0], [0, 2, 4], [4, 2, 0], [0, 1, 3], [3, 1, 0], [0, -2, -4]], rnd).map(s => x + s);
    return { cue: inRow(notes, 0.34), target: notes };
  }
  if (n === 1) { const m = base + pickOf(SCALE.slice(0, 6), rnd); return { cue: [[0, 1.2, m]], target: [m] }; }
  let i = between(1, 4, rnd);
  const notes = [base + SCALE[i]];
  while (notes.length < n) {
    const j = Math.max(0, Math.min(SCALE.length - 1, i + pickOf([-2, -1, 1, 2], rnd)));
    if (j === i) continue;
    i = j;
    notes.push(base + SCALE[i]);
  }
  return { cue: inRow(notes, 0.75), target: notes };
};

/** a root, then the student sings the interval up (or down, with `both`) */
export const intervalSingTask = (base: number, set: readonly number[], both: boolean, rnd: Rnd): SingTask => {
  const iv = pickOf(set, rnd);
  const down = both && rnd() < 0.5;
  const root = down ? between(base + 5, base + 9, rnd) : iv >= 9 ? between(base - 3, base, rnd) : between(base - 2, base + 3, rnd);
  return { cue: [[0, 1.4, root]], target: [root + (down ? -iv : iv)], label: `${INTERVAL_NAMES[iv]} ${down ? 'ქვემოთ' : 'ზემოთ'}` };
};

/** a chant's opening over its first bass note (the home), the bass falling silent after the first note; sing the home */
export const homeTask = (base: number, rnd: Rnd): SingTask => {
  const m = pickOf(CHANTS.filter(x => x.top.length >= 6 && x.bass.length > 0), rnd);
  const top = m.top.slice(0, 6);
  const k = octaveShift(top, base + 7);
  let home = m.bass[0] + k;
  while (home > base + 5) home -= 12;
  while (home < base - 7) home += 12;
  return { cue: [[0, 1.3, home], ...inRow(top.map(x => x + k), 0.65)], target: [home], from: m.title };
};

/** a chord of the pool; the student sings its middle voice or its bass */
export const chordSingTask = (base: number, rnd: Rnd): SingTask & { voice: 'mid' | 'bass' } => {
  const [, top, mid, bass] = pickOf(CHORD_POOL.filter(s => s[1] !== s[2] && s[2] !== s[3]), rnd);
  const k = octaveShift([top, mid, bass], base + 5);
  const voice = rnd() < 0.5 ? 'mid' as const : 'bass' as const;
  return {
    cue: [[0, 2.2, bass + k], [0, 2.2, mid + k], [0, 2.2, top + k]],
    target: [(voice === 'mid' ? mid : bass) + k],
    label: voice === 'mid' ? 'იმღერე შუა ხმა' : 'იმღერე ბანი',
    voice,
  };
};

/** a note (or three) to read on the staff from „დო“ that sounds first; `shown` = as the treble staff writes it */
export const readTask = (n: number, base: number, rnd: Rnd): SingTask & { shown: number[]; ref: number } => {
  const naturals = [0, 2, 4, 5, 7, 9, 11, 12];
  let i = between(1, 6, rnd);
  const steps = [naturals[i]];
  while (steps.length < n) {
    const j = Math.max(0, Math.min(naturals.length - 1, i + pickOf([-2, -1, 1, 2], rnd)));
    if (j === i) continue;
    i = j;
    steps.push(naturals[i]);
  }
  const notes = steps.map(s => base + s);
  // a man's voice reads the treble an octave up, as the chant books write it
  const shown = notes.map(x => (base < 60 ? x + 12 : x));
  return { cue: [[0, 1.2, base]], target: notes, shown, ref: base < 60 ? base + 12 : base };
};

/** the sung notes, in order, matched to the target (an octave off counts): which were hit */
export const judgeSinging = (target: readonly number[], frames: { t: number; midi: number | null }[], tol = 0.5): { hits: boolean[]; sung: number[] } => {
  const notes = mergeHeld(notesFromFrames(frames, 110, 0.6));
  if (!notes.length) return { hits: target.map(() => false), sung: [] };
  if (target.length === 1) {
    const longest = notes.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a));
    return { hits: [Math.abs(pcDiff(longest.midi, target[0])) <= tol], sung: [longest.midi] };
  }
  const n = target.length;
  const m = notes.length;
  const cnt = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const ok = Math.abs(pcDiff(notes[j - 1].midi, target[i - 1])) <= tol;
      cnt[i][j] = Math.max(cnt[i - 1][j], cnt[i][j - 1], ok ? cnt[i - 1][j - 1] + 1 : 0);
    }
  }
  const hits = target.map(() => false);
  for (let i = n, j = m; i > 0 && j > 0;) {
    const ok = Math.abs(pcDiff(notes[j - 1].midi, target[i - 1])) <= tol;
    if (ok && cnt[i][j] === cnt[i - 1][j - 1] + 1) { hits[i - 1] = true; i--; j--; }
    else if (cnt[i - 1][j] >= cnt[i][j - 1]) i--;
    else j--;
  }
  return { hits, sung: notes.map(x => x.midi) };
};

/** how many cents a held note is off its target (an octave off counts): the middle of its steadiest stretch */
export const centsOff = (target: number, frames: { midi: number | null }[]): number | null => {
  const v = frames.map(f => f.midi).filter((x): x is number => x !== null);
  if (v.length < 6) return null;
  const mid = v.slice(Math.floor(v.length * 0.25), Math.ceil(v.length * 0.85));
  return Math.round(100 * pcDiff(median(mid), target));
};

// ——— dictation ———

export type Dir = 'u' | 'd' | 's';
export const contourOf = (notes: readonly number[]): Dir[] => notes.slice(1).map((x, i) => (x > notes[i] ? 'u' : x < notes[i] ? 'd' : 's'));

export interface DictTask { play: Timed[]; notes: number[]; answer: Dir[]; /** two voices: the one to write */ voice?: 'top' | 'bass' }

/** n notes of a chant (one of them sung twice now and then, so „=“ is an answer too); `two`: over or under a held note */
export const dictTask = (n: number, two: boolean, base: number, rnd: Rnd): DictTask => {
  const voice = two ? (rnd() < 0.5 ? 'top' as const : 'bass' as const) : undefined;
  const m = pickOf(CHANTS.filter(x => (voice === 'bass' ? x.bass : x.top).length >= n + 2), rnd);
  const line = voice === 'bass' ? m.bass : m.top;
  let start = 0;
  for (let tries = 0; tries < 30; tries++) {
    start = between(0, line.length - n, rnd);
    if (new Set(line.slice(start, start + n)).size >= Math.min(3, n)) break;
  }
  let notes = line.slice(start, start + n);
  if (rnd() < 0.35) { const at = between(1, n - 1, rnd); notes = [...notes.slice(0, at), notes[at - 1], ...notes.slice(at)].slice(0, n); }
  const k = octaveShift(m.top.slice(0, 8), base + 7);
  notes = notes.map(x => x + k);
  const step = 0.72;
  const play: Timed[] = inRow(notes, step);
  if (voice === 'top') play.unshift([0, n * step, m.bass[0] + k]);
  if (voice === 'bass') play.unshift([0, n * step, m.top[0] + k]);
  return { play, notes, answer: contourOf(notes), voice };
};

// ——— rhythm ———

/** four beats each; the first nine are the plain ones of „რიტმის გამეორება“ */
export const RHYTHMS: number[][] = [
  [1, 1, 1, 1], [2, 1, 1], [1, 1, 2], [1, 2, 1], [2, 2], [1, 1, 0.5, 0.5, 1], [0.5, 0.5, 1, 1, 1], [1, 0.5, 0.5, 2], [3, 1],
  [1.5, 0.5, 1, 1], [1, 1.5, 0.5, 1], [0.5, 0.5, 0.5, 0.5, 2], [2, 0.5, 0.5, 1], [1, 3], [1.5, 0.5, 2], [1, 0.5, 0.5, 0.5, 0.5, 1],
];
export const PLAIN_RHYTHMS = RHYTHMS.slice(0, 9);
export const RHYTHM_BPM = 80;
const CLICK = 88;
const TAP = 76;

/** four clicks to count in, then the rhythm's notes on one pitch; `start` = when the rhythm begins (s) */
export const rhythmPlay = (pattern: readonly number[], bpm = RHYTHM_BPM): { play: Timed[]; start: number; end: number } => {
  const b = 60 / bpm;
  const play: Timed[] = [0, 1, 2, 3].map(k => [k * b, 0.06, CLICK]);
  let at = 4;
  for (const d of pattern) { play.push([at * b, Math.min(d * b * 0.8, 0.45), TAP]); at += d; }
  return { play, start: 4 * b, end: at * b };
};

/** the rhythm and two others to tell it from (the ones nearest in their count of notes) */
export const rhythmQuiz = (rnd: Rnd): { pattern: number[]; options: number[][]; right: number } => {
  const pattern = pickOf(RHYTHMS, rnd);
  const others = shuffled(RHYTHMS.filter(p => p !== pattern), rnd)
    .sort((a, b) => Math.abs(a.length - pattern.length) - Math.abs(b.length - pattern.length)).slice(0, 4);
  const options = shuffled([pattern, ...shuffled(others, rnd).slice(0, 2)], rnd);
  return { pattern, options, right: options.indexOf(pattern) };
};

/** a rhythm tapped back (ms of each tap): every tap within `tol` beats of its place, the tempo within 20% */
export const judgeTaps = (pattern: readonly number[], taps: readonly number[], bpm = RHYTHM_BPM, tol = 0.25): boolean => {
  const onsets: number[] = [];
  let at = 0;
  for (const d of pattern) { onsets.push(at); at += d; }
  if (taps.length !== onsets.length) return false;
  const beatMs = 60000 / bpm;
  const span = onsets[onsets.length - 1];
  const scale = span > 0 ? Math.min(1.25, Math.max(0.8, (taps[taps.length - 1] - taps[0]) / (span * beatMs))) : 1;
  return onsets.every((o, i) => Math.abs((taps[i] - taps[0]) / (beatMs * scale) - o) <= tol);
};

/** the taps after the click fell silent: how near their pace stays to the beat (0–100) */
export const judgeTempo = (taps: readonly number[], bpm: number): { score: number; drift: number } => {
  if (taps.length < 6) return { score: 0, drift: 1 };
  const iois = taps.slice(1).map((t, i) => t - taps[i]);
  const beat = 60000 / bpm;
  const mean = iois.reduce((a, b) => a + b, 0) / iois.length;
  const sd = Math.sqrt(iois.reduce((a, b) => a + (b - mean) ** 2, 0) / iois.length);
  const err = Math.abs(mean - beat) / beat;
  const jitter = sd / mean;
  const score = Math.round(100 - 600 * Math.max(0, err - 0.02) - 300 * Math.max(0, jitter - 0.04));
  return { score: Math.max(0, Math.min(100, score)), drift: (mean - beat) / beat };
};

// ——— a held voice, measured ———

export interface Frame { t: number; midi: number | null; rms: number }
const FRAME_MS = 40;

/** the voiced frames' share near `ref` (a held target, else their own middle), within `band` semitones */
export const bandShare = (frames: readonly Frame[], ref: number | null, band = 0.3) => {
  const v = frames.filter(f => f.midi !== null) as (Frame & { midi: number })[];
  if (!v.length) return { share: 0, voicedMs: 0, centre: null as number | null };
  const centre = ref ?? median(v.map(f => f.midi));
  return { share: v.filter(f => Math.abs(pcDiff(f.midi, centre)) <= band).length / v.length, voicedMs: v.length * FRAME_MS, centre };
};

/** a held note's wobble: the spread around its own moving average, in cents (a straight voice ≈ 10, a vibrato 30+) */
export const wobbleCents = (frames: readonly Frame[]): number | null => {
  const v = frames.map(f => f.midi).filter((x): x is number => x !== null);
  if (v.length < 20) return null;
  const c = median(v);
  const near = v.filter(x => Math.abs(x - c) <= 1);
  if (near.length < 20) return null;
  const W = 4;
  const res: number[] = [];
  for (let i = W; i < near.length - W; i++) {
    let s = 0;
    for (let k = i - W; k <= i + W; k++) s += near[k];
    res.push(near[i] - s / (2 * W + 1));
  }
  return Math.round(100 * Math.sqrt(res.reduce((a, b) => a + b * b, 0) / res.length));
};

const voicedFactor = (voicedMs: number, seconds: number) => Math.min(1, voicedMs / (seconds * 1000 * 0.9));

/** „ერთი ნოტის დაჭერა“: in the band of the target the whole time */
export const steadyScore = (frames: readonly Frame[], target: number, seconds: number) => {
  const { share, voicedMs } = bandShare(frames, target);
  return Math.round(100 * share * voicedFactor(voicedMs, seconds));
};

/** „სწორი ხმა“: little wobble (10 cents or less = 100, 3 points off a cent above it) */
export const straightScore = (frames: readonly Frame[], seconds: number) => {
  const w = wobbleCents(frames);
  if (w === null) return { score: 0, wobble: null as number | null };
  const { voicedMs } = bandShare(frames, null);
  return { score: Math.round(Math.max(0, Math.min(100, 100 - 3 * (w - 10))) * voicedFactor(voicedMs, seconds)), wobble: w };
};

const dB = (rms: number) => 20 * Math.log10(Math.max(rms, 1e-5));

/** „ზრდა-კლება“: louder to the middle and softer again (6 dB each way = whole), the note steady meanwhile */
export const swellScore = (frames: readonly Frame[], seconds: number) => {
  const v = frames.filter(f => f.midi !== null);
  if (v.length < 20) return { score: 0, shape: 0 };
  const parts = [0, 1, 2, 3, 4].map(k => v.slice(Math.floor((k * v.length) / 5), Math.floor(((k + 1) * v.length) / 5)));
  const level = parts.map(p => p.reduce((a, f) => a + dB(f.rms), 0) / Math.max(1, p.length));
  const peak = level.indexOf(Math.max(...level));
  const rise = level[peak] - level[0];
  const fall = level[peak] - level[4];
  const shape = peak >= 1 && peak <= 3 ? (rise >= 6 && fall >= 6 ? 1 : rise >= 3 && fall >= 3 ? 0.5 : 0) : 0;
  const { share, voicedMs } = bandShare(frames, null, 0.35);
  return { score: Math.round(100 * (0.5 * shape + 0.5 * share) * voicedFactor(voicedMs, seconds)), shape };
};

/** „სირენა“: how wide (9 semitones = whole), unbroken (a gap over 0.3 s costs a third) and smooth it went */
export const sirenScore = (frames: readonly Frame[]) => {
  const v = frames.filter(f => f.midi !== null) as (Frame & { midi: number })[];
  if (v.length < 10) return { score: 0, range: 0, gaps: 0 };
  const sorted = v.map(f => f.midi).sort((a, b) => a - b);
  const range = sorted[Math.floor(sorted.length * 0.95)] - sorted[Math.floor(sorted.length * 0.05)];
  let gaps = 0;
  let jumps = 0;
  for (let i = 1; i < v.length; i++) {
    const dt = v[i].t - v[i - 1].t;
    if (dt > 300) gaps++;
    else if (dt <= 100 && Math.abs(v[i].midi - v[i - 1].midi) > 2.5) jumps++;
  }
  const score = 100 * (0.55 * Math.min(1, range / 9) + 0.3 * Math.max(0, 1 - 0.34 * gaps) + 0.15 * Math.max(0, 1 - jumps / 6));
  return { score: Math.round(score), range: Math.round(range), gaps };
};

/** „სსს“: the longest stretch over the quiet the microphone heard first (a gap under 0.25 s does not break it), seconds */
export const breathSeconds = (frames: readonly Frame[], quietFrames = 8) => {
  if (frames.length <= quietFrames) return 0;
  const floor = median(frames.slice(0, quietFrames).map(f => f.rms));
  const thr = Math.max(0.004, floor * 3);
  let best = 0;
  let from: number | null = null;
  let lastOn = 0;
  for (const f of frames.slice(quietFrames)) {
    if (f.rms >= thr) {
      if (from === null || f.t - lastOn > 250) from = f.t;
      lastOn = f.t;
      best = Math.max(best, lastOn - from);
    }
  }
  return Math.round(best / 100) / 10;
};
/** 15 s = 80, 19 s and more = 100 */
export const breathScore = (seconds: number) => Math.min(100, Math.round((seconds * 80) / 15));

/**
 * Singing along a line (`line` in s from when it began to sound, `shift` semitones under it — a study voice): the share
 * of the frames inside its notes (their first 0.2 s left out) on the right note, at the delay that fits best (the
 * phone's own lag, 0–0.5 s). 85% of the frames right = 100.
 */
export const alongScore = (frames: readonly { t: number; midi: number | null }[], line: readonly Timed[], shift = 0) => {
  let best = 0;
  for (let d = 0; d <= 0.5001; d += 0.04) {
    let total = 0;
    let hit = 0;
    for (const f of frames) {
      const tt = f.t - d;
      const n = line.find(x => tt >= x[0] + 0.2 && tt < x[0] + x[1]);
      if (!n) continue;
      total++;
      if (f.midi !== null && Math.abs(pcDiff(f.midi, n[2] + shift)) <= 0.5) hit++;
    }
    if (total) best = Math.max(best, hit / total);
  }
  return Math.min(100, Math.round((100 * best) / 0.85));
};

/** a chant's opening (top voice) to sing along with, put in the student's range; even notes, or the chant's own timing */
export const alongLine = (base: number, shift: number, rnd: Rnd): { line: Timed[]; from: string } => {
  const m = pickOf(CHANTS.filter(x => x.top.length >= 10), rnd);
  const raw = m.top.slice(0, 9);
  const k = octaveShift(raw.map(x => x + shift), base + 5);
  return { line: inRow(raw.map(x => x + k), 0.9, 0.9).map(([a, l, x], i) => [a, i === raw.length - 1 ? 1.6 : l, x] as Timed), from: m.title };
};

/** „ბანის დაჭერა“: a chant's top voice moving over the bass the student holds (put in the student's range) */
export const droneLine = (base: number, rnd: Rnd): { melody: Timed[]; bass: number; from: string } => {
  const m = pickOf(CHANTS.filter(x => x.top.length >= 10 && x.bass.length > 0), rnd);
  let bass = m.bass[0];
  const k = octaveShift([bass], base + 2);
  bass += k;
  const top = m.top.slice(0, 10).map(x => x + k);
  return { melody: inRow(top, 0.8, 1.6), bass, from: m.title };
};

// ——— a school's books ———

const expand = (ranges: string) => ranges.split(',').flatMap(r => {
  const [a, b] = r.split('-').map(Number);
  return Array.from({ length: (b || a) - a + 1 }, (_, i) => a + i);
});

/** the three schools' books (public/notes): Gelati vol. I, vol. V's Shemokmedi part, the Karbelaant mode (vol. VII) */
export const SCHOOLS: { name: string; where: string; book: string; nums: number[] }[] = [
  {
    name: 'გელათის სკოლა', where: 'დასავლეთი · იმერეთი', book: 'book',
    nums: expand('1-7,11-13,15-57,59,63-78,84-106,108-135,137,141-149,153-154,157-160,162-185,187,189,191,194,199-205,208,210-213,215-230,233-244,247-255'),
  },
  { name: 'შემოქმედის სკოლა', where: 'გურია · დუმბაძეების კილო', book: 'v5', nums: expand('120-142') },
  { name: 'კარბელაანთ კილო', where: 'აღმოსავლეთი · ქართლ-კახეთი', book: 'karb', nums: expand('1-187') },
];
