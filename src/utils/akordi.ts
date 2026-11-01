import type { RoundAnswer, RoundRules } from './roundGames';
import { shuffle } from './amikhseni';

// „ქართული აკორდი“ (2026-11-01, the musical games, like Perfect Ear): a real chord of the app's chants and songs sounds on the
// synthesizer — first all three voices at once, then voice by voice from the bass up — and the player names it out of four:
// 1-5-8, 1-3-5, 1-5-7… Every chord is a moment of a piece's book notes where the three voices strike together (made by
// scripts/build-chord-pool.mjs into data/chordPool.ts). Two levels: the four plainest kinds, always the same four answers, or
// all nine. Online in a class's room (each on their own phone) or on one phone with the class in teams. The screens
// pages/games/akordi/face.tsx. Kept free of the pool: the room's store (and so this file) is in the app's first bundle.

export type ChordKindId = 'unison' | 'fifth' | 'fourth' | 'triad' | 'sixth' | 'sus' | 'seventh' | 'ninth' | 'second';

export interface ChordKind {
  id: ChordKindId;
  /** the voices' steps over the bass, as the chant theory names a chord */
  steps: string;
  name: string;
  /** what it sounds like, in a line */
  hint: string;
  /** its exact spacing: [middle − bass, top − bass] in semitones (one or two forms) */
  at: readonly (readonly [number, number])[];
}

export const CHORD_KINDS: readonly ChordKind[] = [
  { id: 'unison', steps: '1-1-1', name: 'უნისონი', hint: 'სამივე ხმა ერთ ბგერაზე — ასე ხშირად იწყება და მთავრდება საგალობელი.', at: [[0, 0]] },
  { id: 'fifth', steps: '1-5-8', name: 'კვინტა და ოქტავა', hint: 'ბანი, მისი კვინტა და ოქტავა: ღია, „ცარიელი“, მყარი — ქართული საგალობლისა და სიმღერის ყველაზე ხშირი დასასრული.', at: [[7, 12]] },
  { id: 'fourth', steps: '1-4-8', name: 'კვარტა და ოქტავა', hint: 'შუა ხმა ბანიდან კვარტით მაღლაა: ღიაა, მაგრამ თითქოს სადღაც მიდის.', at: [[5, 12]] },
  { id: 'triad', steps: '1-3-5', name: 'სამხმოვანება', hint: 'ბანი, ტერცია და კვინტა: სავსე და რბილი — მაჟორული (დიდი ტერცია) ან მინორული (პატარა).', at: [[4, 7], [3, 7]] },
  { id: 'sixth', steps: '1-6-8', name: 'სექსტა და ოქტავა', hint: 'ზედა ხმა ბანზე ოქტავით მაღლაა, შუა — მასზე ტერციით დაბლა; გელათის სკოლის საგალობლებში ძალიან ხშირია.', at: [[9, 12], [8, 12]] },
  { id: 'sus', steps: '1-4-5', name: 'კვარტა და კვინტა', hint: 'ზედა ორი ხმა ერთმანეთის გვერდით: დაძაბული, „მწარე“ — ქართული მრავალხმიანობის ნიშანი.', at: [[5, 7]] },
  { id: 'seventh', steps: '1-5-7', name: 'კვინტა და სეპტიმა', hint: 'ზედა ხმა ოქტავამდე ვერ ადის: დაძაბული, მაგრამ სავსე — ხშირად ოქტავაზე იხსნება.', at: [[7, 10]] },
  { id: 'ninth', steps: '1-5-9', name: 'ორი კვინტა', hint: 'კვინტა კვინტაზე: ბანი, მისი კვინტა და მასზე კიდევ ერთი კვინტა — ფართო და ღია.', at: [[7, 14]] },
  { id: 'second', steps: '1-2-5', name: 'სეკუნდა ბანზე', hint: 'შუა ხმა ბანს თითქმის ეხება, ზედა კვინტაზეა — „მწარე“, ხმები ერთმანეთს „ეხახუნება“.', at: [[2, 7]] },
];
export const kindById = (id: string) => CHORD_KINDS.find(k => k.id === id);
/** the four plainest kinds: the first level's answers, always the same four */
export const BASIC_KINDS: readonly ChordKindId[] = ['unison', 'fifth', 'triad', 'seventh'];

export type AkordiLevel = 'basic' | 'all';
export const AKORDI_LEVELS: readonly AkordiLevel[] = ['basic', 'all'];

/** a chord's kind by its notes [top, middle, bass] (a crossing of the voices or another spacing: none) */
export const kindOfChord = ([top, mid, bass]: readonly number[]): ChordKindId | null => {
  if (!(top >= mid && mid >= bass)) return null;
  const m = mid - bass, t = top - bass;
  return CHORD_KINDS.find(k => k.at.some(([a, b]) => a === m && b === t))?.id ?? null;
};

/** a kind as an answer: its steps and its name */
export const kindLabel = (k: Pick<ChordKind, 'steps' | 'name'>) => `${k.steps} · ${k.name}`;

/** one of the pool's chords: [kind, top, middle, bass, the piece, where it is] */
export type ChordSample = readonly [kind: ChordKindId, top: number, mid: number, bass: number, title: string, ref: string];

export interface AkordiQ {
  kind: 'akordi';
  /** the chord: top, middle, bass (MIDI) */
  notes: [number, number, number];
  /** the answers: kinds' labels (kindLabel) */
  options: string[];
  right: number;
  /** the piece it is from, and where */
  title: string;
  ref: string;
}

export const AKORDI_STEPS = 2;
/** the step's points: all of them at the step's start, a fifth less by its end */
export const AKORDI_TOP = [1000, 500];
export const AKORDI_SECONDS = 12;

/** what sounds at a step, [at, length, MIDI] in seconds: all three at once; then from the bass up, one voice a second */
export const akordiNotes = (notes: readonly number[], step: number): [number, number, number][] => {
  const [top, mid, bass] = notes;
  if (step <= 1) return [[0, 3, top], [0, 3, mid], [0, 3, bass]];
  return [[0, 4.6, bass], [1.2, 3.4, mid], [2.4, 2.2, top]];
};

/** the guide's piece: the chord at once, then voice by voice */
export const akordiDemo = (notes: readonly number[]): [number, number, number][] =>
  [...akordiNotes(notes, 1), ...akordiNotes(notes, 2).map(([t, len, m]): [number, number, number] => [t + 3.6, len, m])];

const stepAt = (step: number) => Math.min(AKORDI_STEPS, Math.max(1, step)) - 1;

export const akordiPoints = (q: Pick<AkordiQ, 'right'>, a: Pick<RoundAnswer, 'pick' | 'ms' | 'step'>, limitMs: number) => {
  if (a.pick !== q.right) return 0;
  const late = limitMs > 0 ? Math.min(1, Math.max(0, a.ms / limitMs)) : 1;
  return Math.round(AKORDI_TOP[stepAt(a.step)] * (1 - late / 5));
};

const text = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isIndex = (n: unknown, len: number) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < len;
const isMidi = (n: unknown) => Number.isInteger(n) && (n as number) >= 24 && (n as number) <= 96;

export const AKORDI_RULES: RoundRules<AkordiQ> = {
  steps: () => AKORDI_STEPS,
  seconds: () => AKORDI_SECONDS,
  ok: (q, pick) => isIndex(pick, q.options.length),
  points: akordiPoints,
  secret: ['right', 'title', 'ref'],
  valid: (q): q is AkordiQ => {
    if (!q || typeof q !== 'object') return false;
    const o = q as Partial<AkordiQ>;
    return o.kind === 'akordi' && Array.isArray(o.notes) && o.notes.length === 3 && o.notes.every(isMidi)
      && Array.isArray(o.options) && o.options.length >= 2 && o.options.length <= 4 && o.options.every(x => text(x, 80))
      && isIndex(o.right, o.options.length) && text(o.title, 160) && text(o.ref, 120);
  },
};

/** the one-phone game: what the host marks for a team — by the step its paper names */
export const AKORDI_MARKS = [
  { points: 2, label: 'ერთად' },
  { points: 1, label: 'ხმა-ხმად' },
  { points: 0, label: 'ვერა' },
] as const;

/** a chord remembered as asked: its kind and notes (the same chord of another piece is the same question) */
export const chordKey = (kind: string, notes: readonly number[]) => `${kind}.${notes.join('.')}`;
const sampleKey = (s: ChordSample) => chordKey(s[0], [s[1], s[2], s[3]]);

/**
 * A game's rounds: the level's kinds in turn (each about as often, never one twice running), each a chord of that kind not
 * asked lately on this phone (`seen`, chordKey) if it has one. The answers: the first level's four kinds always, in their
 * order; at the second the right kind and three others, in the kinds' order too — the same kind always stands in the same place.
 */
export const drawAkordiRounds = (
  pool: readonly ChordSample[], count: number, level: AkordiLevel = 'basic', seen: readonly string[] = [], rnd: () => number = Math.random,
): AkordiQ[] => {
  const kinds = CHORD_KINDS.filter(k => (level === 'basic' ? BASIC_KINDS.includes(k.id) : true) && pool.some(s => s[0] === k.id));
  if (kinds.length < 4) return [];
  const order: ChordKind[] = [];
  while (order.length < count) {
    let next = shuffle([...kinds], rnd);
    if (order.length && next[0].id === order[order.length - 1].id) next = [...next.slice(1), next[0]];
    order.push(...next);
  }
  const old = new Set(seen);
  const used = new Set<string>();
  return order.slice(0, count).map(k => {
    const all = pool.filter(s => s[0] === k.id && !used.has(sampleKey(s)));
    const fresh = all.filter(s => !old.has(sampleKey(s)));
    const list = fresh.length ? fresh : all.length ? all : pool.filter(s => s[0] === k.id);
    const s = list[Math.floor(rnd() * list.length)];
    used.add(sampleKey(s));
    const others = level === 'basic' ? kinds.filter(x => x.id !== k.id) : shuffle(kinds.filter(x => x.id !== k.id), rnd).slice(0, 3);
    const answers = kinds.filter(x => x === k || others.includes(x));
    return {
      kind: 'akordi', notes: [s[1], s[2], s[3]], options: answers.map(kindLabel), right: answers.indexOf(k), title: s[4], ref: s[5],
    };
  });
};

/** the chords to remember as asked (oldest first, at most `keep`) */
export const rememberChords = (seen: string[], asked: string[], keep = 120): string[] =>
  [...seen.filter(id => !asked.includes(id)), ...asked].slice(-keep);
