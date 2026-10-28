// Singing pitch in the browser (the pearls game, redesign stage 7): the pitch of a short stretch of the microphone,
// the stretches turned into sung notes, and how well the notes follow a chant's phrase. Pure functions (tested in
// tests/pitch.test.ts); the microphone and the screen are in components/pearls.

/** midi number (69 = A4 = 440 Hz), fractional */
export const freqToMidi = (f: number) => 69 + 12 * Math.log2(f / 440);

/**
 * The pitch of one stretch of sound (mono samples), or null when it is too quiet or not a clear tone.
 * A YIN-style difference function: the first dip under the threshold, refined between samples.
 */
export const detectPitch = (buf: Float32Array, sampleRate: number, minHz = 70, maxHz = 1000): number | null => {
  const n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < 0.01) return null;

  const minLag = Math.max(2, Math.floor(sampleRate / maxHz));
  const maxLag = Math.min(Math.floor(n / 2), Math.ceil(sampleRate / minHz));
  const d = new Float32Array(maxLag + 1);
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < n - maxLag; i++) {
      const x = buf[i] - buf[i + lag];
      sum += x * x;
    }
    d[lag] = sum;
  }
  // cumulative mean normalised difference
  const cmnd = new Float32Array(maxLag + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    running += d[lag];
    cmnd[lag] = running ? (d[lag] * lag) / running : 1;
  }
  const THRESHOLD = 0.15;
  let lag = -1;
  for (let t = minLag; t <= maxLag; t++) {
    if (cmnd[t] < THRESHOLD) {
      while (t + 1 <= maxLag && cmnd[t + 1] < cmnd[t]) t++;
      lag = t;
      break;
    }
  }
  if (lag < 0) return null;
  // parabolic interpolation around the dip
  const a = cmnd[lag - 1] ?? cmnd[lag];
  const b = cmnd[lag];
  const c = cmnd[lag + 1] ?? cmnd[lag];
  const shift = (a + c - 2 * b) ? (a - c) / (2 * (a + c - 2 * b)) : 0;
  return sampleRate / (lag + shift);
};

/** One sung note: its pitch (midi, fractional) and when it started and ended (ms). */
export interface SungNote { midi: number; start: number; end: number }

/**
 * Pitch readings (one every few ms: time and midi, or null for silence) turned into notes: a reading within
 * `tolerance` semitones of the note being sung carries it on; a note shorter than `minMs` is a slide, not a note.
 */
export const notesFromFrames = (frames: { t: number; midi: number | null }[], minMs = 140, tolerance = 0.7): SungNote[] => {
  const notes: SungNote[] = [];
  let cur: { readings: number[]; sum: number; start: number; end: number } | null = null;
  const close = () => {
    if (cur && cur.end - cur.start >= minMs) {
      // the middle reading, so the slide into a note does not pull it off
      const sorted = [...cur.readings].sort((a, b) => a - b);
      notes.push({ midi: sorted[Math.floor(sorted.length / 2)], start: cur.start, end: cur.end });
    }
    cur = null;
  };
  for (const f of frames) {
    if (f.midi == null) { close(); continue; }
    if (cur && Math.abs(f.midi - cur.sum / cur.readings.length) <= tolerance) {
      cur.readings.push(f.midi); cur.sum += f.midi; cur.end = f.t;
    } else {
      close();
      cur = { readings: [f.midi], sum: f.midi, start: f.t, end: f.t };
    }
  }
  close();
  return notes;
};

/** One pitch held over several syllables is one note: from its first syllable's start to its last one's end. */
export const mergeHeld = (notes: SungNote[]): SungNote[] => {
  const out: SungNote[] = [];
  notes.forEach((n, i) => {
    if (i > 0 && Math.abs(n.midi - notes[i - 1].midi) <= 0.5) out[out.length - 1].end = n.end;
    else out.push({ ...n });
  });
  return out;
};

export interface Scoring { hits: boolean[]; matched: (SungNote | null)[]; share: number; offset: number }

/**
 * How well the sung notes follow the phrase (target midi numbers), in the singer's own key: any key or octave is
 * fine. For each key tried, the most target notes are found in order among the sung notes (held notes merged)
 * within a quarter tone — a semitone off is a wrong note, an extra or a missing note does not throw the rest off —
 * and the key that finds the most (the fewest cents off on a tie) wins. The keys tried are those that put one of
 * the first sung notes on one of the first target notes. Returns which target notes were hit, the sung note each
 * was matched to, the share hit (0..1) and the shift found.
 */
export const scoreSinging = (target: number[], sungNotes: SungNote[]): Scoring => {
  if (!target.length) return { hits: [], matched: [], share: 0, offset: 0 };
  const sung = mergeHeld(sungNotes);
  if (!sung.length) return { hits: target.map(() => false), matched: target.map(() => null), share: 0, offset: 0 };
  const TOL = 0.55;
  const n = target.length;
  const m = sung.length;
  // the longest run of matches in order (an LCS with a pitch tolerance), fewest cents off among equals
  const align = (offset: number) => {
    const cnt = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
    const err = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
    const way = Array.from({ length: n + 1 }, () => new Array<0 | 1 | 2>(m + 1).fill(0)); // 0 match, 1 skip target, 2 skip sung
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        let c = cnt[i - 1][j], e = err[i - 1][j], w: 0 | 1 | 2 = 1;
        if (cnt[i][j - 1] > c || (cnt[i][j - 1] === c && err[i][j - 1] < e)) { c = cnt[i][j - 1]; e = err[i][j - 1]; w = 2; }
        const d = Math.abs(sung[j - 1].midi - offset - target[i - 1]);
        if (d <= TOL && (cnt[i - 1][j - 1] + 1 > c || (cnt[i - 1][j - 1] + 1 === c && err[i - 1][j - 1] + d < e))) {
          c = cnt[i - 1][j - 1] + 1; e = err[i - 1][j - 1] + d; w = 0;
        }
        cnt[i][j] = c; err[i][j] = e; way[i][j] = w;
      }
    }
    const matched: (SungNote | null)[] = target.map(() => null);
    for (let i = n, j = m; i > 0 && j > 0;) {
      if (way[i][j] === 0) { matched[i - 1] = sung[j - 1]; i--; j--; }
      else if (way[i][j] === 1) i--;
      else j--;
    }
    return { offset, matched, n: cnt[n][m], err: err[n][m] };
  };
  // the keys: one of the first sung notes on one of the first target notes (the first ones may be slips)
  let best: ReturnType<typeof align> | null = null;
  for (let k = 0; k < Math.min(8, m); k++) {
    for (let t = 0; t < Math.min(6, n); t++) {
      const a = align(sung[k].midi - target[t]);
      if (!best || a.n > best.n || (a.n === best.n && a.err < best.err)) best = a;
    }
  }
  const { matched, offset } = best!;
  const hits = matched.map(x => x !== null);
  return { hits, matched, share: hits.filter(Boolean).length / n, offset };
};

/** A pearl is polished when this share of the phrase's notes was sung right. */
export const POLISH_SHARE = 0.8;
