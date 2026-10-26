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

/**
 * How well the sung notes follow the phrase (target midi numbers), in the singer's own key: any key or octave is
 * fine. The key is the shift that lets the most target notes be found, in order, among the sung notes within a
 * quarter tone (a semitone off is a wrong note). Returns which target notes were hit, the sung note each was
 * matched to (syllables on one pitch merged into one note), the share hit (0..1) and the shift found.
 */
export interface Scoring { hits: boolean[]; matched: (SungNote | null)[]; share: number; offset: number }

export const scoreSinging = (target: number[], sungNotes: SungNote[]): Scoring => {
  if (!target.length) return { hits: [], matched: [], share: 0, offset: 0 };
  // syllables sung on one pitch are one melody note, as the target's repeated pitches are
  const sung: SungNote[] = [];
  sungNotes.forEach((n, i) => {
    if (i > 0 && Math.abs(n.midi - sungNotes[i - 1].midi) <= 0.5) sung[sung.length - 1].end = n.end;
    else sung.push({ ...n });
  });
  if (!sung.length) return { hits: target.map(() => false), matched: target.map(() => null), share: 0, offset: 0 };
  const TOL = 0.55;
  const match = (offset: number) => {
    const hits: boolean[] = [];
    const matched: (SungNote | null)[] = [];
    let j = 0;
    let err = 0;
    for (const t of target) {
      let found: SungNote | null = null;
      // look a few sung notes ahead (a slip or an extra note does not throw the rest off)
      for (let k = j; k < Math.min(sung.length, j + 3); k++) {
        const e = Math.abs(sung[k].midi - offset - t);
        if (e <= TOL) { found = sung[k]; err += e; j = k + 1; break; }
      }
      hits.push(!!found);
      matched.push(found);
    }
    return { offset, hits, matched, n: hits.filter(Boolean).length, err };
  };
  // the key is tried from the first few sung notes against the first few target notes (the first may be a slip)
  let best = match(sung[0].midi - target[0]);
  for (let i = 0; i < Math.min(3, sung.length); i++) {
    for (let j = 0; j < Math.min(3, target.length); j++) {
      const m = match(sung[i].midi - target[j]);
      if (m.n > best.n || (m.n === best.n && m.err < best.err)) best = m;
    }
  }
  return { hits: best.hits, matched: best.matched, share: best.n / target.length, offset: best.offset };
};

/** A pearl is polished when this share of the phrase's notes was sung right. */
export const POLISH_SHARE = 0.8;
