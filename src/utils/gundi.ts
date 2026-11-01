// „ჩემი გუნდი“ (the plan's №5, like Incredibox): a stage of six performers — three singers (მთქმელი I, მოძახილი II, ბანი
// III) and three players (ტაში, დოლი, ფანდური) — loop a phrase of a folk song from its book notes, each turned on and off
// on their own. These are the rules: which phrases of a song loop well (where the song itself goes on with what the phrase
// begins with), the singers' lines in a phrase, the claps and the drum in its meter, and the panduri's chords.

export type Role = 'mtqmeli' | 'modzakhili' | 'bani' | 'tashi' | 'doli' | 'panduri';
/** the stage's order: the singers stand at the back, the players sit in front of them */
export const ROLES: Role[] = ['mtqmeli', 'modzakhili', 'bani', 'tashi', 'doli', 'panduri'];
export const SINGERS: Role[] = ['mtqmeli', 'modzakhili', 'bani'];
export const PLAYERS: Role[] = ['tashi', 'doli', 'panduri'];
export const ROLE_NAMES: Record<Role, string> = {
  mtqmeli: 'მთქმელი', modzakhili: 'მოძახილი', bani: 'ბანი', tashi: 'ტაში', doli: 'დოლი', panduri: 'ფანდური',
};
/** the voice of the book's notes a singer sings: I (top), II, III (bass) */
export const VOICE_OF: Partial<Record<Role, number>> = { mtqmeli: 0, modzakhili: 1, bani: 2 };
export const isSinger = (r: Role) => VOICE_OF[r] !== undefined;

export interface Variant { id: string; name: string; hint: string }
export const VARIANTS: Record<Role, Variant[]> = {
  mtqmeli: [{ id: 'hangi', name: 'ჰანგი', hint: 'პირველი, ზედა ხმა — წამყვანი' }],
  modzakhili: [{ id: 'hangi', name: 'ჰანგი', hint: 'მეორე, შუა ხმა — მთქმელს ეხმიანება' }],
  bani: [
    { id: 'hangi', name: 'ჰანგი', hint: 'მესამე, დაბალი ხმა — ნოტებით' },
    { id: 'burdoni', name: 'ბურდონი', hint: 'ერთ ნოტზე გაბმული ბანი, როგორც კახურში' },
  ],
  tashi: [
    { id: 'tanabrad', name: 'თანაბრად', hint: 'ყოველ დარტყმაზე' },
    { id: 'dzlierze', name: 'ძლიერზე', hint: 'მხოლოდ ტაქტის დასაწყისში' },
    { id: 'tati', name: 'ტა ტი-ტი', hint: 'ერთი გრძელი, ორი მოკლე' },
  ],
  doli: [
    { id: 'dumteki', name: 'დუმ-ტეკ', hint: 'დაბალი და მაღალი რიგრიგობით' },
    { id: 'satsekvao', name: 'საცეკვაო', hint: 'ცეკვის ჩქარი რიტმი' },
    { id: 'svla', name: 'სვლა', hint: 'ორტაქტიანი, მარშივით' },
  ],
  panduri: [
    { id: 'chamokvra', name: 'ჩამოკვრა', hint: 'სამივე სიმი ერთად' },
    { id: 'umpa', name: 'ბანი-აკორდი', hint: 'ჯერ ბანი, მერე აკორდი' },
  ],
};
export const variantOf = (role: Role, id: string | undefined) => VARIANTS[role].find(v => v.id === id) ?? VARIANTS[role][0];

/** a note of the book: [beat, beats, midi] */
export type BookNote = [beat: number, beats: number, midi: number];
/** a note of a phrase, in beats from its start */
export interface GundiNote { at: number; len: number; midi: number }
export interface GundiLoop {
  a: number;            // the phrase in the song, beats
  b: number;
  beats: number;
  meter: 2 | 3;         // the beats of its bars, for the claps and the drum
  q: number;            // how well its end goes back into its start, 0…1
  lines: GundiNote[][]; // I, II, III
}

/** the three singers' lines: a song for two choirs (six staves) has each voice in both */
export const roleLines = (voices: BookNote[][]): BookNote[][] =>
  voices.length === 6 ? [0, 1, 2].map(v => [...voices[v], ...voices[v + 3]].sort((x, y) => x[0] - y[0])) : voices.slice(0, 3);

const STEP = 0.25;  // the grid the phrases are compared on, beats
const WINDOW = 4;   // how far after a phrase's end it is compared with its start, beats
export const MIN_LOOP = 6;   // seconds
export const MAX_LOOP = 22;
const GOOD = 0.5;

const idx = (t: number) => Math.round(t / STEP);

/** the pitch each line sounds at every STEP beats (null = silent) */
const gridOf = (lines: BookNote[][], dur: number) => lines.map(line => {
  const g: (number | null)[] = new Array(idx(dur) + 1).fill(null);
  for (const [b, d, m] of line) for (let k = idx(b); k < idx(b + d) && k < g.length; k++) g[k] = m;
  return g;
});

/** how alike the music is from beat a and from beat b, over w beats: the share of grid steps where every line agrees */
const alike = (grid: (number | null)[][], a: number, b: number, w: number) => {
  let ok = 0, all = 0;
  const ka = idx(a), kb = idx(b);
  for (let k = 0; k < w / STEP; k++) {
    for (const g of grid) {
      const p = g[ka + k] ?? null, q = g[kb + k] ?? null;
      if (p == null && q == null) continue;
      all++;
      if (p === q) ok++;
    }
  }
  return all ? ok / all : 0;
};

/** a line's notes inside [a, b), moved to start at 0; a note sounding at a is kept from there, one going past b ends there */
export const sliceLine = (line: BookNote[], a: number, b: number): GundiNote[] => line
  .filter(([t, d]) => t < b - 1e-6 && t + d > a + 1e-6)
  .map(([t, d, m]) => { const s = Math.max(t, a); return { at: s - a, len: Math.min(t + d, b) - s, midi: m }; })
  .filter(n => n.len > 0.05);

/** the share of the notes' time that starts on a bar's first beat, bars of m beats from beat o */
const leanOf = (notes: { at: number; len: number }[], m: number, o: number) => {
  let on = 0, all = 0;
  for (const n of notes) {
    all += n.len;
    const r = (((n.at - o) % m) + m) % m;
    if (r < 1e-3 || m - r < 1e-3) on += n.len;
  }
  return all ? on / all : 0;
};

/** bars of three are taken only when the notes lean on them clearly more than on bars of two */
const TRIPLE = 1.15;

/** the bar of a phrase: two beats or three, whichever its length allows and its notes lean on */
export const meterOf = (lines: GundiNote[][], beats: number): 2 | 3 => {
  const fits = ([2, 3] as const).filter(m => Math.abs(beats / m - Math.round(beats / m)) < 1e-6);
  if (fits.length < 2) return fits[0] ?? 2;
  const notes = lines.flat();
  return leanOf(notes, 3, 0) > leanOf(notes, 2, 0) * TRIPLE ? 3 : 2;
};

/**
 * A song's bars, when its notes show them: two or three beats, the first bar line at beat `o` (a song may begin with an
 * upbeat). `sure` only when the notes lean on those beats clearly more than on any other place of the bar.
 */
export const songMeter = (lines: BookNote[][]): { m: 2 | 3; o: number; sure: boolean } => {
  const notes = lines.flat().map(([at, len]) => ({ at, len }));
  const best = (m: 2 | 3) => {
    const leans = Array.from({ length: m }, (_, o) => leanOf(notes, m, o));
    const o = leans.indexOf(Math.max(...leans));
    const rest = Math.max(0, ...leans.filter((_, k) => k !== o));
    return { m, o, lean: leans[o], sure: leans[o] >= 0.4 && leans[o] >= rest * 1.4 };
  };
  const two = best(2), three = best(3);
  const pick = three.lean > two.lean * TRIPLE ? three : two;
  return { m: pick.m, o: pick.o, sure: pick.sure };
};

export interface SongScore { dur: number; tempos: [beat: number, bpm: number][]; voices: BookNote[][] }

/** the tempo in effect at a beat */
export const bpmAt = (score: Pick<SongScore, 'tempos'>, beat: number) => {
  let bpm = score.tempos[0]?.[1] ?? 60;
  for (const [b, v] of score.tempos) if (b <= beat + 1e-6) bpm = v;
  return bpm;
};

/**
 * The phrases of a song that loop well, in the song's order, at most `max`: a whole number of beats (bars of two or three),
 * MIN_LOOP…MAX_LOOP seconds, every voice singing in it, two voices or more starting together at its start, and the music
 * after its end (or the song's beginning, after the last bar) like the music at its start. The best ones first, none much like
 * one already taken; a song with no good one still gets its best.
 */
export const loopsOf = (score: SongScore, max = 3): GundiLoop[] => {
  const lines = roleLines(score.voices);
  if (lines.length < 3 || lines.some(l => !l.length)) return [];
  const grid = gridOf(lines, score.dur);
  // how many lines strike at each onset; how many notes each line starts before each grid step
  const strikes = new Map<number, number>();
  lines.forEach(line => new Set(line.map(([t]) => Math.round(t * 1000) / 1000)).forEach(t => strikes.set(t, (strikes.get(t) ?? 0) + 1)));
  const counts = lines.map(line => {
    const c = new Array(idx(score.dur) + 2).fill(0);
    for (const [t] of line) c[Math.min(c.length - 1, idx(t) + 1)]++;
    for (let k = 1; k < c.length; k++) c[k] += c[k - 1];
    return c;
  });
  const notesIn = (v: number, a: number, b: number) => counts[v][Math.min(counts[v].length - 1, idx(b))] - counts[v][idx(a)];
  // a song whose bars are clear loops whole bars from a bar line; another any whole beats from where two voices strike
  const bars = songMeter(lines);
  const onBar = (t: number) => { const r = (((t - bars.o) % bars.m) + bars.m) % bars.m; return r < 1e-3 || bars.m - r < 1e-3; };
  const starts = [...strikes].filter(([t, n]) => n >= 2 && (!bars.sure || onBar(t))).map(([t]) => t).sort((x, y) => x - y);
  const found: { a: number; b: number; L: number; q: number }[] = [];
  for (const a of starts) {
    const spb = 60 / bpmAt(score, a);
    for (let L = 2; a + L <= score.dur + 1e-6; L++) {
      const sec = L * spb;
      if (sec > MAX_LOOP) break;
      if (sec < MIN_LOOP || (bars.sure ? L % bars.m : L % 2 && L % 3)) continue;
      const b = Math.round((a + L) * 1000) / 1000;
      const last = Math.abs(b - score.dur) < 1e-3;
      if (!last && !strikes.has(b)) continue;
      if ([0, 1, 2].some(v => notesIn(v, a, b) < 4)) continue;
      const w = Math.min(WINDOW, L / 2);
      found.push({ a, b, L, q: last ? alike(grid, a, 0, w) * 0.8 : alike(grid, a, b, w) });
    }
  }
  // the best first; at equal fit the one nearer a comfortable ten seconds
  const near = (f: { a: number; L: number }) => Math.abs(f.L * 60 / bpmAt(score, f.a) - 10);
  // a phrase already taken, moved by a little (a dance's figure repeats: the same music a beat later is no new phrase)
  const sameMusic = (f: { a: number; L: number }, p: { a: number; L: number }) => {
    const L = Math.min(f.L, p.L);
    for (let s = -L / 2; s <= L / 2 + 1e-6; s += STEP) if (f.a + s >= 0 && alike(grid, f.a + s, p.a, L) > 0.7) return true;
    return false;
  };
  found.sort((x, y) => y.q - x.q || near(x) - near(y) || x.a - y.a);
  const picked: typeof found = [];
  for (const f of found) {
    if (picked.length >= max) break;
    if (picked.length && f.q < GOOD) break;
    if (picked.some(p => f.a < p.b - 1 && p.a < f.b - 1)) continue;
    if (picked.some(p => sameMusic(f, p))) continue;
    picked.push(f);
  }
  return picked.sort((x, y) => x.a - y.a).map(({ a, b, L, q }) => {
    const sliced = lines.map(line => sliceLine(line, a, b));
    return { a, b, beats: L, meter: bars.sure ? bars.m : meterOf(sliced, L), q: Math.round(q * 100) / 100, lines: sliced };
  });
};

// ---- what each performer plays in a phrase (beats from its start)

export type HitKind = 'clap' | 'dum' | 'tek';
export type GundiEvent =
  | { kind: 'note'; at: number; len: number; midi: number }
  | { kind: HitKind; at: number; gain: number }
  | { kind: 'pluck'; at: number; midi: number; gain: number };

type Hit = [at: number, kind: HitKind, gain: number];
/** a pattern: its bars in turn, each in the phrase's meter */
const PATTERNS: Record<string, Record<2 | 3, Hit[][]>> = {
  tanabrad: { 2: [[[0, 'clap', 1], [1, 'clap', 0.8]]], 3: [[[0, 'clap', 1], [1, 'clap', 0.75], [2, 'clap', 0.75]]] },
  dzlierze: { 2: [[[0, 'clap', 1]]], 3: [[[0, 'clap', 1]]] },
  tati: {
    2: [[[0, 'clap', 1], [1, 'clap', 0.7], [1.5, 'clap', 0.7]]],
    3: [[[0, 'clap', 1], [1, 'clap', 0.7], [1.5, 'clap', 0.7], [2, 'clap', 0.75]]],
  },
  dumteki: { 2: [[[0, 'dum', 1], [1, 'tek', 0.8]]], 3: [[[0, 'dum', 1], [1, 'tek', 0.7], [2, 'tek', 0.7]]] },
  satsekvao: {
    2: [[[0, 'dum', 1], [0.5, 'tek', 0.5], [1, 'dum', 0.75], [1.5, 'tek', 0.65]]],
    3: [[[0, 'dum', 1], [1, 'tek', 0.65], [1.5, 'tek', 0.5], [2, 'dum', 0.7], [2.5, 'tek', 0.6]]],
  },
  svla: {
    2: [[[0, 'dum', 1], [1, 'tek', 0.7]], [[0, 'dum', 0.85], [0.5, 'dum', 0.65], [1, 'tek', 0.8], [1.5, 'tek', 0.5]]],
    3: [[[0, 'dum', 1], [2, 'tek', 0.7]], [[0, 'dum', 0.85], [1, 'dum', 0.65], [2, 'tek', 0.8], [2.5, 'tek', 0.5]]],
  },
};
type Strum = [at: number, how: 'down' | 'up' | 'bass' | 'chord', gain: number];
const STRUMS: Record<string, Record<2 | 3, Strum[]>> = {
  chamokvra: { 2: [[0, 'down', 1], [1, 'down', 0.75], [1.5, 'up', 0.55]], 3: [[0, 'down', 1], [1, 'down', 0.7], [2, 'down', 0.7]] },
  umpa: { 2: [[0, 'bass', 1], [1, 'chord', 0.75]], 3: [[0, 'bass', 1], [1, 'chord', 0.7], [2, 'chord', 0.7]] },
};
/** the strings of a strum follow each other this many beats apart */
export const STRUM_GAP = 0.03;

/** a percussion pattern over a phrase: its bars one after another, the last one cut at the phrase's end */
export const hitsOf = (beats: number, meter: 2 | 3, pattern: string) => {
  const bars = PATTERNS[pattern]?.[meter] ?? PATTERNS.tanabrad[meter];
  const out: { at: number; kind: HitKind; gain: number }[] = [];
  for (let bar = 0; bar * meter < beats - 1e-6; bar++) {
    for (const [at, kind, gain] of bars[bar % bars.length]) {
      const t = bar * meter + at;
      if (t < beats - 1e-6) out.push({ at: t, kind, gain });
    }
  }
  return out;
};

/** the pitches sounding at a beat of the phrase, low to high (a voice resting then: its next note, if it comes within a beat) */
export const chordAt = (lines: GundiNote[][], beat: number) => {
  const out = new Set<number>();
  for (const line of lines) {
    const n = line.find(x => x.at <= beat + 1e-6 && x.at + x.len > beat + 1e-6) ?? line.find(x => x.at > beat && x.at < beat + 1);
    if (n) out.add(n.midi);
  }
  return [...out].sort((x, y) => x - y);
};

/** the panduri's range: a string's note an octave up or down to sit between C3 and C5 */
export const onPanduri = (midi: number) => { let m = midi; while (m < 48) m += 12; while (m > 72) m -= 12; return m; };

/** the panduri over a phrase: the chord of the singers' notes at each stroke */
export const strumsOf = (loop: Pick<GundiLoop, 'lines' | 'beats' | 'meter'>, pattern: string) => {
  const bar = STRUMS[pattern]?.[loop.meter] ?? STRUMS.chamokvra[loop.meter];
  const out: { at: number; midi: number; gain: number }[] = [];
  for (let k = 0; k * loop.meter < loop.beats - 1e-6; k++) {
    for (const [at, how, gain] of bar) {
      const t = k * loop.meter + at;
      if (t >= loop.beats - 1e-6) continue;
      const chord = [...new Set(chordAt(loop.lines, t).map(onPanduri))].sort((x, y) => x - y);
      if (!chord.length) continue;
      const strings = how === 'bass' ? chord.slice(0, 1) : how === 'chord' && chord.length > 1 ? chord.slice(1) : how === 'up' ? [...chord].reverse() : chord;
      strings.forEach((midi, i) => out.push({ at: t + i * STRUM_GAP, midi, gain: gain * (how === 'up' ? 0.8 : 1) / Math.sqrt(strings.length) }));
    }
  }
  return out;
};

/** the bass's drone: its most sung pitch in the phrase, struck again every two bars */
export const droneOf = (loop: Pick<GundiLoop, 'lines' | 'beats' | 'meter'>): GundiNote[] => {
  const time = new Map<number, number>();
  for (const n of loop.lines[2] ?? []) time.set(n.midi, (time.get(n.midi) ?? 0) + n.len);
  if (!time.size) return [];
  const midi = [...time].sort((x, y) => y[1] - x[1] || x[0] - y[0])[0][0];
  const every = loop.meter * 2;
  const out: GundiNote[] = [];
  for (let at = 0; at < loop.beats - 1e-6; at += every) out.push({ at, len: Math.min(every, loop.beats - at), midi });
  return out;
};

/** what a performer plays in a phrase with a variant */
export const trackOf = (loop: GundiLoop, role: Role, variant?: string): GundiEvent[] => {
  const v = variantOf(role, variant).id;
  if (role === 'bani' && v === 'burdoni') return droneOf(loop).map(n => ({ kind: 'note' as const, ...n }));
  const voice = VOICE_OF[role];
  if (voice !== undefined) return (loop.lines[voice] ?? []).map(n => ({ kind: 'note' as const, ...n }));
  if (role === 'panduri') return strumsOf(loop, v).map(s => ({ kind: 'pluck' as const, ...s }));
  return hitsOf(loop.beats, loop.meter, v);
};

/** a performer is singing or playing at a beat (the figure's mouth or hands): a note till just before its end, a hit briefly */
export const activeAt = (events: GundiEvent[], beat: number) => events.some(e =>
  e.kind === 'note' ? e.at <= beat && beat < e.at + Math.max(0.1, e.len - 0.12) : e.at <= beat && beat < e.at + 0.22);

/** the panduri's strokes as a class says them when nobody has one: a strum დრინ, the bass string ბუმ, the chord after it ჩიკ */
const STRUM_WORDS: Record<Strum[1], string> = { down: 'დრინ', up: 'დრინ', bass: 'ბუმ', chord: 'ჩიკ' };

/**
 * The syllables a class says for a percussion pattern, bar by bar („|“ between bars): a beat with one stroke is ტა (a clap)
 * or დუმ / ტეკ (the drum), two strokes in one beat are joined (ტი-ტი, დუმ-ტეკ), a beat without one is „·“; the panduri's
 * patterns by STRUM_WORDS.
 */
export const patternWords = (meter: 2 | 3, pattern: string) => {
  const strums = STRUMS[pattern]?.[meter];
  if (strums) {
    return Array.from({ length: meter }, (_, k) => {
      const here = strums.filter(([at]) => at >= k - 1e-6 && at < k + 1 - 1e-6);
      return here.length ? here.map(([, how]) => STRUM_WORDS[how]).join('-') : '·';
    }).join(' ');
  }
  const bars = PATTERNS[pattern]?.[meter];
  if (!bars) return '';
  return bars.map(bar => Array.from({ length: meter }, (_, k) => {
    const hits = bar.filter(([at]) => at >= k - 1e-6 && at < k + 1 - 1e-6);
    if (!hits.length) return '·';
    return hits.map(([, kind]) => (kind === 'clap' ? (hits.length > 1 ? 'ტი' : 'ტა') : kind === 'dum' ? 'დუმ' : 'ტეკ')).join('-');
  }).join(' ')).join(' | ');
};

// ---- the stage's settings, kept on the device (`sg-gundi`)

export const SPEEDS = [0.85, 1, 1.15] as const;
export const SPEED_NAMES = ['ნელა', 'ჩვეულებრივ', 'სწრაფად'];

export interface StageConf {
  song: number;                    // the song's notes page (data/songBookChants.ts)
  loop: number;                    // which of its phrases
  speed: number;
  variant: Partial<Record<Role, string>>;
  on: Role[];
}

const isRole = (r: unknown): r is Role => typeof r === 'string' && (ROLES as string[]).includes(r);

export const parseStage = (raw: unknown, songs: number[]): StageConf => {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const song = typeof o.song === 'number' && songs.includes(o.song) ? o.song : songs[0] ?? 1;
  const loop = typeof o.loop === 'number' && Number.isInteger(o.loop) && o.loop >= 0 && o.loop < 6 ? o.loop : 0;
  const speed = (SPEEDS as readonly number[]).includes(o.speed as number) ? (o.speed as number) : 1;
  const variant: Partial<Record<Role, string>> = {};
  const v = (o.variant && typeof o.variant === 'object' ? o.variant : {}) as Record<string, unknown>;
  for (const r of ROLES) if (VARIANTS[r].some(x => x.id === v[r])) variant[r] = v[r] as string;
  const on = Array.isArray(o.on) ? [...new Set(o.on.filter(isRole))] : [];
  return { song, loop, speed, variant, on };
};

/** how a performer takes part with the class on one phone: the phone plays it, the class does it live, or nobody */
export type Part = 'phone' | 'class' | 'none';
export const PART_NAMES: Record<Part, string> = { phone: 'ტელეფონი', class: 'კლასი', none: 'არავინ' };

export interface ClassConf {
  song: number;
  loop: number;
  speed: number;
  variant: Partial<Record<Role, string>>;
  parts: Record<Role, Part>;
  record: boolean;
}

/** the class's start: the phone holds the bass and the drum, the class sings the two upper voices and claps */
export const CLASS_PARTS: Record<Role, Part> = { mtqmeli: 'class', modzakhili: 'class', bani: 'phone', tashi: 'class', doli: 'phone', panduri: 'none' };

export const parseClass = (raw: unknown, songs: number[]): ClassConf => {
  const base = parseStage(raw, songs);
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const p = (o.parts && typeof o.parts === 'object' ? o.parts : {}) as Record<string, unknown>;
  const parts = { ...CLASS_PARTS };
  for (const r of ROLES) if (p[r] === 'phone' || p[r] === 'class' || p[r] === 'none') parts[r] = p[r] as Part;
  return { song: base.song, loop: base.loop, speed: base.speed, variant: base.variant, parts, record: o.record === true };
};

/** the next part a performer's button gives on the class's screen */
export const nextPart = (p: Part): Part => (p === 'phone' ? 'class' : p === 'class' ? 'none' : 'phone');

/** a random stage: three to five performers, each with a random variant (`rnd` 0…1) */
export const randomStage = (rnd: () => number): Pick<StageConf, 'on' | 'variant'> => {
  const pool = [...ROLES];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const count = 3 + Math.floor(rnd() * 3);
  // the bass or the drum carries the rest, so one of them is always in
  const on = pool.slice(0, count);
  if (!on.includes('bani') && !on.includes('doli')) on[on.length - 1] = rnd() < 0.5 ? 'bani' : 'doli';
  const variant: Partial<Record<Role, string>> = {};
  for (const r of ROLES) variant[r] = VARIANTS[r][Math.floor(rnd() * VARIANTS[r].length)].id;
  return { on: ROLES.filter(r => on.includes(r)), variant };
};
