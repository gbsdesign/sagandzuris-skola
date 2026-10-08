// Endless practice for the abituri theory test: every call makes a new task in the test's own form, its answer
// computed by utils/musicTheory. Pure functions of a random source, so tests can replay them
// (tests/theoryDrills.test.ts).

import {
  abc, chord, fifths, interval, keyAlts, keyName, letter, midi, note, scale, syl, syllable, tonicName,
  type ChordKind, type ChordShape, type ModeName, type Note,
} from './musicTheory';
import { DICTATIONS } from '../data/abituriDictations';

export type Rng = () => number;

/** a small seeded random source (mulberry32) */
export const seeded = (seed: number): Rng => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const int = (r: Rng, n: number) => Math.floor(r() * n);
export const pick = <T,>(r: Rng, xs: readonly T[]): T => xs[int(r, xs.length)];
export const shuffle = <T,>(r: Rng, xs: readonly T[]): T[] => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = int(r, i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const notes = (...ss: string[]) => ss.map(note);
/** the same written note, octave aside */
export const sameName = (a: Note, b: Note) => a.step === b.step && a.alt === b.alt;
const plain = (ns: Note[]) => ns.every(n => Math.abs(n.alt) <= 1);

/** where a picked name sits above `base`: the first such note up, or the octave for an 8 */
export const placeAbove = (base: Note, step: number, alt: number, octave = false): Note => {
  if (step > base.step) return { step, alt, oct: base.oct };
  if (step < base.step) return { step, alt, oct: base.oct + 1 };
  return { step, alt, oct: octave ? base.oct + 1 : base.oct };
};

// ---------- 1. modes ----------

export const CHURCH_MODES: ModeName[] = ['იონიური', 'დორიული', 'ფრიგიული', 'ლიდიური', 'მიქსოლიდიური', 'ეოლიური', 'ლოკრიული'];
const MINOR_LIKE = new Set<ModeName>(['დორიული', 'ფრიგიული', 'ეოლიური', 'ლოკრიული', 'ნატურალური მინორი', 'ჰარმონიული მინორი', 'მელოდიური მინორი']);
export const isMinorLike = (m: ModeName) => MINOR_LIKE.has(m);

export interface ModeTask { kind: 'mode'; tonic: Note; mode: ModeName; answer: Note[] }
export const makeMode = (r: Rng, mode?: ModeName): ModeTask => {
  for (;;) {
    const tonic = pick(r, notes('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B3', 'Bb3', 'Eb4', 'F#4'));
    const m = mode ?? pick(r, CHURCH_MODES);
    const answer = scale(tonic, m);
    if (plain(answer)) return { kind: 'mode', tonic, mode: m, answer };
  }
};
/** „D მიქსოლიდიური“, „c დორიული“ — as the test writes it */
export const modeTitle = (t: { tonic: Note; mode: ModeName }) => `${tonicName(t.tonic, isMinorLike(t.mode))} ${t.mode}`;

// ---------- 2. intervals ----------

export const INTERVAL_LABELS = ['პ.2', 'დ.2', 'პ.3', 'დ.3', 'წ.4', 'გად.4', 'შემც.5', 'წ.5', 'პ.6', 'დ.6', 'პ.7', 'დ.7', 'წ.8'];

export interface IntervalTask { kind: 'interval'; given: Note; label: string; answer: Note }
export const makeInterval = (r: Rng): IntervalTask => {
  const given = pick(r, notes('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'));
  const label = r() < 0.06 ? 'წ.1' : pick(r, INTERVAL_LABELS);
  return { kind: 'interval', given, label, answer: interval(given, label) };
};

// ---------- 3. chords ----------

export const CHORD_KINDS: ChordKind[] = ['მაჟ.', 'მინ.'];
export const CHORD_SHAPES: ChordShape[] = ['5/3', '6', '6/4'];

export interface ChordTask { kind: 'chord'; bass: Note; chordKind: ChordKind; shape: ChordShape; answer: Note[] }
export const makeChord = (r: Rng, chordKind?: ChordKind, shape?: ChordShape): ChordTask => {
  for (;;) {
    const bass = pick(r, notes('B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4'));
    const k = chordKind ?? pick(r, CHORD_KINDS), s = shape ?? pick(r, CHORD_SHAPES);
    const answer = chord(bass, k, s);
    if (plain(answer)) return { kind: 'chord', bass, chordKind: k, shape: s, answer };
  }
};

// ---------- 4. transposition ----------

// melodies in a major key, by degree: „#4:2“ = the raised IV, a quarter (lengths in eighths); „5v“ = the V an octave
// down; tokens joined by a comma share a beam, „|“ is a bar line
const MELODIES: { meter: string; tune: string }[] = [
  { meter: '2/4', tune: '1:2 3:2 | 4:2 #4:2 | 5:2 6:1,b6:1 | 5:1,3:1 2:1,b2:1 | 1:4' },
  { meter: '2/4', tune: '5v:2 1:2 | 2:1,3:1 4:2 | 3:2 #2:2 | 3:1,2:1 1:1,7v:1 | 1:4' },
  { meter: '3/4', tune: '1:2 2:2 3:2 | 4:4 #4:2 | 5:2 b7:2 6:2 | 5:2 4:2 b3:2 | 2:4 7v:2 | 1:6' },
  { meter: '4/4', tune: '1:2 3:2 5:2 8:2 | 7:2 b7:2 6:4 | 5:2 #4:2 5:2 b6:2 | 5:4 2:2 7v:2 | 1:8' },
  { meter: '2/4', tune: '3:2 4:1,3:1 | 2:2 #1:2 | 2:2 5v:2 | b6v:1,5v:1 #4v:1,5v:1 | 1:4' },
  { meter: '3/4', tune: '5:4 6:2 | 5:2 4:2 3:2 | b3:2 2:2 #1:2 | 2:6 | 5v:2 6v:2 7v:2 | 1:6' },
  { meter: '4/4', tune: '1:1,2:1 3:1,4:1 5:2 3:2 | 6:1,5:1 4:1,3:1 2:4 | #2:2 3:2 b6:2 5:2 | 1:8' },
  { meter: '2/4', tune: '1:2 5:2 | 6:1,5:1 4:1,3:1 | #4:2 5:2 | b3:1,2:1 #1:1,2:1 | 1:4' },
];

interface MelodyNote { n: Note; len: number }
type Melody = MelodyNote[][][]; // bars → beamed groups → notes

const realize = (tune: string, tonic: Note): Melody => {
  const sc = scale(tonic, 'მაჟორი');
  return tune.split('|').map(bar => bar.trim().split(/\s+/).map(group => group.split(',').map(tok => {
    const m = /^([#b]?)([1-8])(v?):(\d+)$/.exec(tok);
    if (!m) throw new Error(`bad melody token ${tok}`);
    const base = sc[Number(m[2]) - 1];
    return { n: { step: base.step, oct: base.oct - (m[3] ? 1 : 0), alt: base.alt + (m[1] === '#' ? 1 : m[1] === 'b' ? -1 : 0) }, len: Number(m[4]) };
  })));
};
const flat = (m: Melody) => m.flat(2).map(x => x.n);

/** the melody in ABC under the key of `tonic`: accidentals only where the key and the bar so far don't give them */
export const writeMelody = (m: Melody, tonic: Note) => {
  const sig = keyAlts(tonic);
  return m.map(bar => {
    const now = new Map<string, number>(); // step:octave → the alteration in force in this bar
    return bar.map(group => group.map(({ n, len }) => {
      const k = `${n.step}:${n.oct}`, cur = now.get(k) ?? sig[n.step];
      const acc = n.alt === cur ? '' : n.alt > 0 ? '^'.repeat(n.alt) : n.alt < 0 ? '_'.repeat(-n.alt) : '=';
      now.set(k, n.alt);
      return acc + abc({ ...n, alt: 0 }) + (len === 1 ? '' : len);
    }).join('')).join(' ');
  }).join(' | ') + ' |]';
};

export const TRANSPOSE_LABELS = ['დ.2', 'პ.2', 'პ.3', 'დ.3', 'წ.4', 'წ.5'];

export interface TransposeTask { kind: 'transpose'; label: string; down: boolean; from: Note; to: Note; given: string; answer: string }
export const makeTranspose = (r: Rng): TransposeTask => {
  for (;;) {
    const { meter, tune } = pick(r, MELODIES);
    let from = pick(r, notes('C4', 'G4', 'D4', 'A4', 'F4', 'Bb4', 'Eb4', 'E4'));
    const label = pick(r, TRANSPOSE_LABELS), down = r() < 0.5;
    // keep the tune on the staff: its lowest note not under A3, its highest not over A5
    const lo = Math.min(...flat(realize(tune, from)).map(midi));
    if (lo < 57) from = { ...from, oct: from.oct + 1 };
    if (Math.max(...flat(realize(tune, from)).map(midi)) > 81) from = { ...from, oct: from.oct - 1 };
    const to = interval(from, label, down);
    if (Math.abs(to.alt) > 1 || Math.abs(fifths(to)) > 6) continue;
    const a = realize(tune, from), b = realize(tune, to);
    const all = [...flat(a), ...flat(b)];
    // both on the staff: from A3 to A5
    if (!plain(all) || Math.min(...all.map(midi)) < 57 || Math.max(...all.map(midi)) > 81) continue;
    const head = (t: Note) => `M:${meter}\nL:1/8\nK:${keyName(t)}\n`;
    return { kind: 'transpose', label, down, from, to, given: head(from) + writeMelody(a, from), answer: head(to) + writeMelody(b, to) };
  }
};

// ---------- 5. grouping ----------

export type Meter = '2/4' | '3/4' | '4/4' | '3/8' | '6/8';
// lengths in eighths: a bar, a beat, how many bars, and the 4/4 middle that must stay visible
const METERS: Record<Meter, { bar: number; beat: number; bars: number; middle?: number }> = {
  '2/4': { bar: 4, beat: 2, bars: 5 },
  '3/4': { bar: 6, beat: 2, bars: 4 },
  '4/4': { bar: 8, beat: 2, bars: 4, middle: 4 },
  '3/8': { bar: 3, beat: 3, bars: 6 },
  '6/8': { bar: 6, beat: 3, bars: 4 },
};
// rhythm cells, in eighths (negative: a rest); each starts on a beat and fills whole beats
const SIMPLE_CELLS = [[2], [2], [1, 1], [1, 1], [4], [6], [3, 1], [8], [1, 1, 1, 1], [-2]];
const COMPOUND_CELLS = [[3], [3], [1, 1, 1], [1, 1, 1], [2, 1], [1, 2], [6], [-3]];
const VALUES = [8, 6, 4, 3, 2, 1]; // whole, dotted half, half, dotted quarter, quarter, eighth

export interface GroupTask { kind: 'group'; meter: Meter; given: string; answer: string }
export const makeGrouping = (r: Rng, meter?: Meter): GroupTask => {
  const m = meter ?? pick(r, ['2/4', '3/4', '4/4', '4/4', '3/8', '6/8'] as Meter[]);
  const { bar, beat, bars, middle } = METERS[m];
  const total = bar * bars;
  const cells = beat === 3 ? COMPOUND_CELLS : SIMPLE_CELLS;
  // a note in written pieces: none crosses a bar line, nor (in 4/4) the middle unless it starts the bar
  const pieces = (start: number, len: number) => {
    const out: number[] = [];
    for (let p = start, left = len; left > 0;) {
      const inBar = p % bar;
      let limit = Math.min(left, bar - inBar);
      if (middle && inBar !== 0 && inBar < middle && inBar + limit > middle) limit = middle - inBar;
      const d = VALUES.find(v => v <= limit)!;
      out.push(d); p += d; left -= d;
    }
    return out;
  };
  for (;;) {
    const durs: number[] = [];
    for (let pos = 0; pos < total;) {
      const c = pick(r, cells.filter(c => c.reduce((s, d) => s + Math.abs(d), 0) <= total - pos));
      durs.push(...c);
      pos += c.reduce((s, d) => s + Math.abs(d), 0);
    }
    if (durs[durs.length - 1] < 0) continue; // ends on a note
    let pos = 0, split = 0;
    for (const d of durs) { if (d > 0 && pieces(pos, d).length > 1) split++; pos += Math.abs(d); }
    if (split < 2) continue; // something to split, as in the test

    // the given line: no bar lines, eighths beamed in runs of 2–4 as they come
    const given: string[] = [];
    for (let i = 0; i < durs.length;) {
      if (durs[i] === 1) {
        let run = 0;
        const want = 2 + int(r, 3);
        while (i < durs.length && durs[i] === 1 && run < want) { run++; i++; }
        given.push('F'.repeat(run));
      } else {
        const d = durs[i++];
        given.push((d < 0 ? 'z' : 'F') + (Math.abs(d) === 1 ? '' : Math.abs(d)));
      }
    }
    // an invisible bar line halfway lets a phone wrap the long line
    given.splice(Math.ceil(given.length / 2), 0, '[|]');

    // the answer: bars, ties across them, eighths beamed by beats
    const out: string[] = [];
    pos = 0;
    let prev: { len: number; beat: number; rest: boolean } | null = null;
    for (const d of durs) {
      const rest = d < 0;
      const parts = rest ? [-d] : pieces(pos, d);
      parts.forEach((len, k) => {
        const inBar = pos % bar;
        if (inBar === 0 && pos > 0) out.push(' | ');
        else if (prev) out.push(prev.len === 1 && len === 1 && !prev.rest && !rest && prev.beat === Math.floor(pos / beat) ? '' : ' ');
        out.push((rest ? 'z' : 'F') + (len === 1 ? '' : len) + (!rest && k < parts.length - 1 ? '-' : ''));
        prev = { len, beat: Math.floor(pos / beat), rest };
        pos += len;
      });
    }
    const head = `M:${m}\nL:1/8\nK:C\n`;
    return { kind: 'group', meter: m, given: head + given.join(' ') + ' |]', answer: head + out.join('') + ' |]' };
  }
};

// ---------- 6. letter names ----------

// the tricky ones come more often: B and H, Es and As, the white keys' sharps and flats
const LETTER_POOL = [
  ...notes('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'),
  ...notes('C#4', 'D#4', 'F#4', 'G#4', 'A#4', 'Db4', 'Eb4', 'Gb4', 'Ab4', 'Bb4'),
  ...notes('Bb4', 'B4', 'Eb4', 'Ab4', 'E#4', 'B#4', 'Cb4', 'Fb4'),
];
const enharmonic = (n: Note): Note | null => {
  for (const d of [1, -1]) {
    const s = { step: n.step + d, alt: 0, oct: n.oct };
    const t: Note = { step: ((s.step % 7) + 7) % 7, oct: s.step > 6 ? n.oct + 1 : s.step < 0 ? n.oct - 1 : n.oct, alt: 0 };
    t.alt = midi(n) - midi(t);
    if (Math.abs(t.alt) <= 1 && t.alt !== n.alt) return t;
  }
  return null;
};

export interface LetterTask { kind: 'letter'; toLetter: boolean; note: Note; options: string[]; answer: string }
export const makeLetter = (r: Rng): LetterTask => {
  const n = pick(r, LETTER_POOL);
  const toLetter = r() < 0.5;
  const flip = { ...n, alt: n.alt === 0 ? 1 : -n.alt }, natural = { ...n, alt: 0 }, enh = enharmonic(n);
  const next = { ...n, step: (n.step + 1) % 7 }, before = { ...n, step: (n.step + 6) % 7 };
  const say = toLetter ? letter : syllable;
  const answer = say(n);
  const traps: string[] = toLetter
    ? [
        n.step === 6 && n.alt === 0 ? 'B' : '', n.step === 6 && n.alt === -1 ? 'H' : '', n.step === 6 && n.alt === -1 ? 'Hes' : '',
        n.step === 2 && n.alt === -1 ? 'Ees' : '', n.step === 5 && n.alt === -1 ? 'Aes' : '',
      ]
    : [n.step === 6 && n.alt === -1 ? syllable({ ...n, alt: 0 }) : '', n.step === 6 && n.alt === 0 ? syllable({ ...n, alt: -1 }) : ''];
  const pool = [...traps, say(flip), n.alt ? say(natural) : '', enh ? say(enh) : '', say(next), say(before)]
    .filter(s => s && s !== answer);
  const options = shuffle(r, [answer, ...shuffle(r, [...new Set(pool)]).slice(0, 3)]);
  return { kind: 'letter', toLetter, note: n, options, answer };
};
/** how the question shows the note: a short syllable (სოლ♯) or its letters (Des) */
export const letterQuestion = (t: LetterTask) => (t.toLetter ? syl(t.note) : letter(t.note));

// ---------- 7. durations and rests ----------

// in sixteenths
export const DURATIONS = [16, 8, 4, 2, 1, 12, 6];
export const DURATION_NAMES: Record<number, string> = {
  16: 'მთელი', 8: 'ნახევარი', 4: 'მეოთხედი', 2: 'მერვედი', 1: 'მეთექვსმეტედი', 12: 'წერტილიანი ნახევარი', 6: 'წერტილიანი მეოთხედი',
};
/** one note (F, as in the test) or one rest */
export const durationAbc = (d: number, rest: boolean) => `L:1/16\nK:C\n${rest ? 'z' : 'F'}${d === 1 ? '' : d} |]`;

export interface RestTask { kind: 'rest'; fromNote: boolean; dur: number; options: number[] }
export const makeRest = (r: Rng): RestTask => {
  const dur = r() < 0.8 ? pick(r, [16, 8, 4, 2, 1]) : pick(r, [12, 6]);
  const options = shuffle(r, [dur, ...shuffle(r, DURATIONS.filter(d => d !== dur)).slice(0, 3)]);
  return { kind: 'rest', fromNote: r() < 0.5, dur, options };
};

// ---------- by ear ----------

export const EAR_EASY = ['პ.3', 'დ.3', 'წ.4', 'წ.5', 'წ.8'];
export interface EarIntervalTask { kind: 'earInterval'; low: Note; label: string; options: string[] }
export const makeEarInterval = (r: Rng, hard: boolean): EarIntervalTask => {
  const options = hard ? INTERVAL_LABELS : EAR_EASY;
  const low = pick(r, notes('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'Bb3', 'Eb4'));
  return { kind: 'earInterval', low, label: pick(r, options), options };
};

export interface EarChordTask { kind: 'earChord'; chordKind: ChordKind; shape: ChordShape; notes: Note[]; options: string[] }
export const makeEarChord = (r: Rng, withShapes: boolean): EarChordTask => {
  const k = pick(r, CHORD_KINDS), s = withShapes ? pick(r, CHORD_SHAPES) : '5/3';
  const bass = pick(r, notes('C4', 'D4', 'E4', 'F4', 'G4', 'A3', 'Bb3'));
  const options = withShapes ? CHORD_KINDS.flatMap(kk => CHORD_SHAPES.map(ss => `${kk} ${ss}`)) : ['მაჟ. 5/3', 'მინ. 5/3'];
  return { kind: 'earChord', chordKind: k, shape: s, notes: chord(bass, k, s), options };
};

// ---------- I round: repeat a short motif ----------

// the major key whose notes the mode uses (for the key signature)
const PARENT: Partial<Record<ModeName, [string, boolean]>> = {
  'მაჟორი': ['წ.1', false], 'ნატურალური მინორი': ['პ.3', false], 'დორიული': ['დ.2', true], 'მიქსოლიდიური': ['წ.4', false],
};
export interface MotifTask { kind: 'motif'; abc: string; low: boolean }
/** easy: 3–4 notes, even; hard: 5–7 notes with a rhythm. `low`: for a low voice, in the bass clef */
export const makeMotif = (r: Rng, hard: boolean, low: boolean): MotifTask => {
  for (;;) {
    const tonic = pick(r, low ? notes('C3', 'D3', 'F3', 'G3', 'A2') : notes('C4', 'D4', 'F4', 'G4', 'A3'));
    const mode = pick(r, ['მაჟორი', 'ნატურალური მინორი', 'დორიული', 'მიქსოლიდიური'] as ModeName[]);
    const sc = scale(tonic, mode);
    const at = (d: number): Note => { const o = Math.floor(d / 7), n = sc[((d % 7) + 7) % 7]; return { ...n, oct: n.oct + o }; };
    const len = hard ? 5 + int(r, 3) : 3 + int(r, 2);
    // degrees from the tonic (0): start on I, III or V, move by steps and small leaps, end on I, III or V
    const ds = [pick(r, [0, 2, 4])];
    for (let i = 1; i < len; i++) ds.push(Math.max(-3, Math.min(7, ds[i - 1] + pick(r, hard ? [-1, -1, 1, 1, 2, -2, 3, -3] : [-1, -1, 1, 1, 2, -2]))));
    if (![0, 2, 4, 7].includes(ds[len - 1]) || new Set(ds).size < 2) continue;
    // lengths in eighths, by beats: even quarters, or rhythm cells (two eighths share a beam); a long last note
    const cells: number[][] = [];
    if (hard) {
      for (let k = 0; k < len - 1;) {
        const c = pick(r, [[2], [2], [1, 1], [3, 1]]);
        if (k + c.length > len - 1) continue;
        cells.push(c);
        k += c.length;
      }
    } else for (let k = 0; k < len - 1; k++) cells.push([2]);
    cells.push([4]);
    let i = 0;
    const bar = cells.flatMap(c => (c[0] === 1 ? [c.map(l => ({ n: at(ds[i++]), len: l }))] : c.map(l => [{ n: at(ds[i++]), len: l }])));
    const [shift, down] = PARENT[mode]!;
    const key = interval(tonic, shift, down);
    return { kind: 'motif', low, abc: `L:1/8\nK:${keyName(key)}${low ? ' clef=bass' : ''}\n${writeMelody([bar], key)}` };
  }
};

// a three-voice dictation from data/abituriDictations (not the same one twice running)
export interface DictationTask { kind: 'dictation'; index: number }
let lastDictation = -1;
export const makeDictation = (r: Rng): DictationTask => {
  let index = int(r, DICTATIONS.length);
  if (index === lastDictation) index = (index + 1) % DICTATIONS.length;
  lastDictation = index;
  return { kind: 'dictation', index };
};

// ---------- a task and the student's answer ----------

export type Task =
  | ModeTask | IntervalTask | ChordTask | TransposeTask | GroupTask | LetterTask | RestTask | EarIntervalTask | EarChordTask
  | DictationTask | MotifTask;
export type TaskKind = Task['kind'];

/** written on paper (or sung) and checked against the shown answer by the student */
export const isSelfGraded = (k: TaskKind) => k === 'transpose' || k === 'group' || k === 'dictation' || k === 'motif';

/** `hard`: every interval by ear, chords with their inversions, longer motifs; `low`: a motif for a low voice */
export const makeTask = (kind: TaskKind, r: Rng, hard = false, low = false): Task => {
  switch (kind) {
    case 'motif': return makeMotif(r, hard, low);
    case 'mode': return makeMode(r);
    case 'interval': return makeInterval(r);
    case 'chord': return makeChord(r);
    case 'transpose': return makeTranspose(r);
    case 'group': return makeGrouping(r);
    case 'letter': return makeLetter(r);
    case 'rest': return makeRest(r);
    case 'earInterval': return makeEarInterval(r, hard);
    case 'earChord': return makeEarChord(r, hard);
    case 'dictation': return makeDictation(r);
  }
};

export interface NoteName { step: number; alt: number }
export interface TaskState {
  /** the picked notes: one for an interval, two for a chord (the middle, the top) */
  picks: (NoteName | null)[];
  /** a mode's eight signs */
  alts: number[];
  /** the chosen option */
  choice: string | number | null;
  /** a self-graded task: did the student write it right */
  self: boolean | null;
}
export const startState = (t: Task): TaskState => ({
  picks: t.kind === 'chord' ? [null, null] : [null],
  alts: t.kind === 'mode' ? t.answer.map((_, i) => (i === 0 || i === 7 ? t.tonic.alt : 0)) : [],
  choice: null,
  self: null,
});

export const isAnswered = (t: Task, s: TaskState) => {
  switch (t.kind) {
    case 'mode': return true;
    case 'interval': return Boolean(s.picks[0]);
    case 'chord': return Boolean(s.picks[0] && s.picks[1]);
    case 'transpose': case 'group': case 'dictation': case 'motif': return s.self !== null;
    default: return s.choice !== null;
  }
};

export const isRight = (t: Task, s: TaskState): boolean => {
  const is = (p: NoteName | null, n: Note) => Boolean(p) && p!.step === n.step && p!.alt === n.alt;
  switch (t.kind) {
    case 'mode': return t.answer.every((n, i) => s.alts[i] === n.alt);
    case 'interval': return is(s.picks[0], t.answer);
    case 'chord': return is(s.picks[0], t.answer[1]) && is(s.picks[1], t.answer[2]);
    case 'transpose': case 'group': case 'dictation': case 'motif': return s.self === true;
    case 'letter': return s.choice === t.answer;
    case 'rest': return s.choice === t.dur;
    case 'earInterval': return s.choice === t.label;
    case 'earChord': return s.choice === `${t.chordKind} ${t.shape}`;
  }
};

// ---------- the mock test, as the university's sample ----------

export const MOCK_SECTIONS = ['კილოები', 'ინტერვალები', 'აკორდები', 'ტრანსპონირება', 'დაჯგუფება', 'ასოები', 'პაუზები'];

/** 4 modes (two major-like, two minor-like), 10 intervals, the six chords, a transposition, a grouping, 5 letter
 * names and 5 durations — no task twice */
export const makeMockTest = (r: Rng): { section: number; task: Task }[] => {
  const unique = <T extends Task>(make: () => T, n: number, key: (t: T) => string) => {
    const out: T[] = [], seen = new Set<string>();
    while (out.length < n) { const t = make(); if (!seen.has(key(t))) { seen.add(key(t)); out.push(t); } }
    return out;
  };
  const modes = [
    ...shuffle(r, ['ლიდიური', 'მიქსოლიდიური', 'იონიური'] as ModeName[]).slice(0, 2),
    ...shuffle(r, ['დორიული', 'ფრიგიული', 'ეოლიური', 'ლოკრიული'] as ModeName[]).slice(0, 2),
  ];
  const sections: Task[][] = [
    shuffle(r, modes).map(m => makeMode(r, m)),
    unique(() => makeInterval(r), 10, t => `${t.given.step}${t.label}`),
    CHORD_KINDS.flatMap(k => CHORD_SHAPES.map(s => makeChord(r, k, s))),
    [makeTranspose(r)],
    [makeGrouping(r)],
    unique(() => makeLetter(r), 5, t => letter(t.note)),
    unique(() => makeRest(r), 5, t => `${t.dur}${t.fromNote}`),
  ];
  return sections.flatMap((ts, section) => ts.map(task => ({ section, task })));
};
