// Elementary music theory for the "აბიტურიენტს" lessons: notes, their Georgian and letter names, intervals,
// chords and modes, written as the university's theory test writes them (წ.5, დ.3, პ.6, მაჟ. 6/4…).
// The lesson answers are computed here, so they can't be mistyped (tests/musicTheory.test.ts).

/** step 0–6 = C D E F G A H; alt −2…2 (♭♭ … ♯♯); oct as in C4 = the first octave's დო */
export interface Note { step: number; alt: number; oct: number }

const LETTERS = 'CDEFGAB';
const STEP_SEMI = [0, 2, 4, 5, 7, 9, 11];

/** 'C4', 'F#4', 'Bb3', 'Ebb5' (English letters: B is H, Bb is B) */
export const note = (s: string): Note => {
  const m = /^([A-G])(#{1,2}|b{1,2})?(\d)$/.exec(s);
  if (!m) throw new Error(`bad note: ${s}`);
  const alt = m[2] ? (m[2][0] === '#' ? m[2].length : -m[2].length) : 0;
  return { step: LETTERS.indexOf(m[1]), alt, oct: Number(m[3]) };
};

export const midi = (n: Note) => 12 * (n.oct + 1) + STEP_SEMI[n.step] + n.alt;

/** the note in ABC notation; `natural` writes ♮ on a plain note */
export const abc = (n: Note, natural = false) => {
  const acc = n.alt > 0 ? '^'.repeat(n.alt) : n.alt < 0 ? '_'.repeat(-n.alt) : natural ? '=' : '';
  const L = LETTERS[n.step];
  if (n.oct >= 5) return acc + L.toLowerCase() + "'".repeat(n.oct - 5);
  return acc + L + ','.repeat(4 - n.oct);
};

const GER = ['C', 'D', 'E', 'F', 'G', 'A', 'H'];
/** letter name: Cis, Des, Es, As, B (= სი♭), H, Fisis, Heses */
export const letter = (n: Note) => {
  const L = GER[n.step];
  if (n.alt >= 0) return L + 'is'.repeat(n.alt);
  if (n.step === 6) return n.alt === -1 ? 'B' : 'Heses';
  const flat = n.step === 2 ? 'Es' : n.step === 5 ? 'As' : `${L}es`;
  return n.alt === -1 ? flat : `${flat}es`;
};

const SYL = ['დო', 'რე', 'მი', 'ფა', 'სოლ', 'ლა', 'სი'];
const ALT_WORD: Record<number, string> = { 2: 'დუბლ-დიეზი', 1: 'დიეზი', [-1]: 'ბემოლი', [-2]: 'დუბლ-ბემოლი' };
const ALT_SIGN: Record<number, string> = { 2: '𝄪', 1: '♯', [-1]: '♭', [-2]: '𝄫' };
/** syllable name in words: „ფა დიეზი“ */
export const syllable = (n: Note) => SYL[n.step] + (n.alt ? ` ${ALT_WORD[n.alt]}` : '');
/** short syllable name: „ფა♯“ */
export const syl = (n: Note) => SYL[n.step] + (n.alt ? ALT_SIGN[n.alt] : '');

// ---------- intervals ----------

/** the test's labels: წ.1 პ.2 დ.2 პ.3 დ.3 წ.4 გად.4 შემც.5 წ.5 პ.6 დ.6 პ.7 დ.7 წ.8 */
export type IntervalLabel = string;

const PERFECT = new Set([1, 4, 5, 8]);
const BASE_SEMI = [0, 0, 2, 4, 5, 7, 9, 11, 12]; // by number: perfect or major size

const semitones = (label: IntervalLabel) => {
  const m = /^(წ|დ|პ|გად|შემც)\.([1-8])$/.exec(label);
  if (!m) throw new Error(`bad interval: ${label}`);
  const num = Number(m[2]), q = m[1];
  const perfect = PERFECT.has(num);
  if (perfect && (q === 'დ' || q === 'პ')) throw new Error(`no ${label}`);
  if (!perfect && q === 'წ') throw new Error(`no ${label}`);
  const shift = q === 'გად' ? 1 : q === 'შემც' ? (perfect ? -1 : -2) : q === 'პ' ? -1 : 0;
  return { num, semi: BASE_SEMI[num] + shift };
};

const moveSteps = (n: Note, steps: number): Note => {
  const abs = n.oct * 7 + n.step + steps;
  return { step: ((abs % 7) + 7) % 7, oct: Math.floor(abs / 7), alt: 0 };
};

/** the note `label` above (or below) `n` */
export const interval = (n: Note, label: IntervalLabel, down = false): Note => {
  const { num, semi } = semitones(label);
  const t = moveSteps(n, down ? -(num - 1) : num - 1);
  t.alt = midi(n) + (down ? -semi : semi) - midi(t);
  if (Math.abs(t.alt) > 2) throw new Error(`${label} from ${letter(n)} needs a triple sign`);
  return t;
};

/** the name of the interval from `a` up to `b` (simple intervals, up to the octave) */
export const intervalName = (a: Note, b: Note): IntervalLabel => {
  const num = (b.oct * 7 + b.step) - (a.oct * 7 + a.step) + 1;
  const semi = midi(b) - midi(a);
  if (num < 1 || num > 8) throw new Error('only simple intervals');
  const d = semi - BASE_SEMI[num];
  if (PERFECT.has(num)) {
    const q = d === 0 ? 'წ' : d === 1 ? 'გად' : d === -1 ? 'შემც' : null;
    if (q) return `${q}.${num}`;
  } else {
    const q = d === 0 ? 'დ' : d === -1 ? 'პ' : d === 1 ? 'გად' : d === -2 ? 'შემც' : null;
    if (q) return `${q}.${num}`;
  }
  throw new Error(`odd interval ${letter(a)}–${letter(b)}`);
};

/** full Georgian name: დ.3 → „დიდი ტერცია“ */
const NUM_NAME = ['', 'პრიმა', 'სეკუნდა', 'ტერცია', 'კვარტა', 'კვინტა', 'სექსტა', 'სეპტიმა', 'ოქტავა'];
const Q_NAME: Record<string, string> = { წ: 'წმინდა', დ: 'დიდი', პ: 'პატარა', გად: 'გადიდებული', შემც: 'შემცირებული' };
export const intervalWords = (label: IntervalLabel) => {
  const [q, n] = label.split('.');
  return `${Q_NAME[q]} ${NUM_NAME[Number(n)]}`;
};

// ---------- chords ----------

export type ChordKind = 'მაჟ.' | 'მინ.' | 'გად.' | 'შემც.';
export type ChordShape = '5/3' | '6' | '6/4';

// the notes above the bass, as intervals from it
const CHORD_IV: Record<ChordKind, Record<ChordShape, [IntervalLabel, IntervalLabel]>> = {
  'მაჟ.': { '5/3': ['დ.3', 'წ.5'], '6': ['პ.3', 'პ.6'], '6/4': ['წ.4', 'დ.6'] },
  'მინ.': { '5/3': ['პ.3', 'წ.5'], '6': ['დ.3', 'დ.6'], '6/4': ['წ.4', 'პ.6'] },
  'გად.': { '5/3': ['დ.3', 'გად.5'], '6': ['დ.3', 'პ.6'], '6/4': ['შემც.4', 'პ.6'] },
  'შემც.': { '5/3': ['პ.3', 'შემც.5'], '6': ['პ.3', 'დ.6'], '6/4': ['გად.4', 'დ.6'] },
};

/** the chord built up from `bass` (the given note is its lowest note) */
export const chord = (bass: Note, kind: ChordKind, shape: ChordShape): Note[] =>
  [bass, ...CHORD_IV[kind][shape].map(l => interval(bass, l))];

// ---------- modes ----------

export type ModeName =
  | 'მაჟორი' | 'ნატურალური მინორი' | 'ჰარმონიული მინორი' | 'მელოდიური მინორი'
  | 'იონიური' | 'დორიული' | 'ფრიგიული' | 'ლიდიური' | 'მიქსოლიდიური' | 'ეოლიური' | 'ლოკრიული';

const MODE_IV: Record<ModeName, IntervalLabel[]> = {
  'მაჟორი': ['დ.2', 'დ.3', 'წ.4', 'წ.5', 'დ.6', 'დ.7'],
  'ნატურალური მინორი': ['დ.2', 'პ.3', 'წ.4', 'წ.5', 'პ.6', 'პ.7'],
  'ჰარმონიული მინორი': ['დ.2', 'პ.3', 'წ.4', 'წ.5', 'პ.6', 'დ.7'],
  'მელოდიური მინორი': ['დ.2', 'პ.3', 'წ.4', 'წ.5', 'დ.6', 'დ.7'],
  'იონიური': ['დ.2', 'დ.3', 'წ.4', 'წ.5', 'დ.6', 'დ.7'],
  'დორიული': ['დ.2', 'პ.3', 'წ.4', 'წ.5', 'დ.6', 'პ.7'],
  'ფრიგიული': ['პ.2', 'პ.3', 'წ.4', 'წ.5', 'პ.6', 'პ.7'],
  'ლიდიური': ['დ.2', 'დ.3', 'გად.4', 'წ.5', 'დ.6', 'დ.7'],
  'მიქსოლიდიური': ['დ.2', 'დ.3', 'წ.4', 'წ.5', 'დ.6', 'პ.7'],
  'ეოლიური': ['დ.2', 'პ.3', 'წ.4', 'წ.5', 'პ.6', 'პ.7'],
  'ლოკრიული': ['პ.2', 'პ.3', 'წ.4', 'შემც.5', 'პ.6', 'პ.7'],
};

/** the eight notes of the mode, up from the tonic to its octave */
export const scale = (tonic: Note, mode: ModeName): Note[] =>
  [tonic, ...MODE_IV[mode].map(l => interval(tonic, l)), interval(tonic, 'წ.8')];

/** where the tones (ტ) and semitones (ნ) fall between neighbours */
export const steps = (notes: Note[]) =>
  notes.slice(1).map((n, i) => (midi(n) - midi(notes[i]) === 1 ? 'ნ' : midi(n) - midi(notes[i]) === 2 ? 'ტ' : '?'));

/** a tonic written as the test writes it: major-like modes with a capital letter (D), minor-like small (c, h) */
export const tonicName = (n: Note, minorLike: boolean) => (minorLike ? letter(n).toLowerCase() : letter(n));

// ---------- keys ----------

/** the major key's signature: sharps (+) or flats (−) — G 1, F −1, Fis 6 */
export const fifths = (tonic: Note) => [0, 2, 4, -1, 1, 3, 5][tonic.step] + 7 * tonic.alt;

const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6]; // ფა დო სოლ რე ლა მი სი
const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3]; // სი მი ლა რე სოლ დო ფა

/** the alteration each step carries in the major key of `tonic` */
export const keyAlts = (tonic: Note) => {
  const f = fifths(tonic), alts = [0, 0, 0, 0, 0, 0, 0];
  (f > 0 ? SHARP_ORDER.slice(0, f) : FLAT_ORDER.slice(0, -f)).forEach(s => { alts[s] = f > 0 ? 1 : -1; });
  return alts;
};

/** the key for ABC's K: field (F#, Bb) */
export const keyName = (tonic: Note) => LETTERS[tonic.step] + (tonic.alt > 0 ? '#' : tonic.alt < 0 ? 'b' : '');

/** „ერთი დიეზი“, „4 ბემოლი“, „ნიშნების გარეშე“ */
export const signsWords = (tonic: Note) => {
  const f = fifths(tonic);
  if (!f) return 'ნიშნების გარეშე';
  const k = Math.abs(f);
  return `${k === 1 ? 'ერთი' : k} ${f > 0 ? 'დიეზი' : 'ბემოლი'}`;
};
