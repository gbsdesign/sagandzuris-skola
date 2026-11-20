// The app's ear (AI teacher 2.0, stage 1): the pitch of a short stretch of the microphone, steadier than the first one —
// a longer look for low voices, the pick made against the best dip (no octave slips on a strong overtone), breath and
// noise left out by how clear the tone is — then the readings of a take tidied in hindsight (`cleanFrames`: a short
// octave slip put back, a lone stray reading and a tiny gap mended). Pure functions (tests/ear.test.ts); the microphone
// is utils/singCapture.ts, which is the one place every singing part of the app listens through.

/** one look at the sound: its pitch and how clear the tone is (0…1; a sung vowel is ~0.8 and up, breath ~0.3) */
export interface Heard { hz: number; clarity: number }

/** the lowest and highest voice the ear follows: a deep bass's low C to a child's top */
export const EAR_MIN_HZ = 62;
export const EAR_MAX_HZ = 1100;
/** a dip this much worse than the best one is an overtone's, not the note's */
const NEAR_BEST = 0.1;
/** the half period is taken for the note when its dip is at least this good */
const HALF_OK = 0.16;
/** no dip under this: breath, a consonant, the room */
const UNCLEAR = 0.42;
/** quieter than this is silence (the microphone runs without automatic gain, so a soft voice is small) */
const SILENCE = 0.004;

/** midi number (69 = A4 = 440 Hz), fractional */
const midiOf = (hz: number) => 69 + 12 * Math.log2(hz / 440);

/**
 * The pitch of one stretch of sound (mono samples), or null when it is silence or not a clear tone.
 * The cumulative-mean-normalised difference (YIN) over the stretch at half the rate; the pick is the shortest period
 * whose dip is nearly as deep as the deepest one, so neither a strong overtone (an octave up) nor the double period
 * (an octave down) wins.
 */
export const hearPitch = (buf: Float32Array, sampleRate: number, minHz = EAR_MIN_HZ, maxHz = EAR_MAX_HZ): Heard | null => {
  let n = buf.length;
  if (n < 256) return null;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += buf[i];
  mean /= n;
  let power = 0;
  for (let i = 0; i < n; i++) { const v = buf[i] - mean; power += v * v; }
  if (Math.sqrt(power / n) < SILENCE) return null;

  // half the rate is plenty for a voice's period and four times less work
  let x: Float32Array;
  let rate = sampleRate;
  if (sampleRate >= 32000 && n >= 1024) {
    const half = n >> 1;
    x = new Float32Array(half);
    for (let i = 0; i < half; i++) {
      const j = 2 * i;
      const a = buf[j - 1] ?? buf[j];
      const d = buf[j + 2] ?? buf[j + 1];
      x[i] = (a + 3 * buf[j] + 3 * buf[j + 1] + d) / 8 - mean;
    }
    n = half;
    rate = sampleRate / 2;
  } else {
    x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = buf[i] - mean;
  }

  const minLag = Math.max(2, Math.floor(rate / maxHz));
  const maxLag = Math.min(Math.floor(n / 2), Math.ceil(rate / minHz) + 1);
  if (maxLag <= minLag + 2) return null;
  const span = n - maxLag;
  const cmnd = new Float32Array(maxLag + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < span; i++) { const v = x[i] - x[i + lag]; sum += v * v; }
    running += sum;
    cmnd[lag] = running ? (sum * lag) / running : 1;
  }

  let best = 1;
  for (let lag = minLag; lag < maxLag; lag++) if (cmnd[lag] < best) best = cmnd[lag];
  if (best > UNCLEAR) return null;
  const limit = Math.min(UNCLEAR, best + NEAR_BEST);
  let pick = -1;
  for (let lag = minLag; lag < maxLag; lag++) {
    if (cmnd[lag] <= limit && cmnd[lag] <= cmnd[lag - 1] && cmnd[lag] <= cmnd[lag + 1]) { pick = lag; break; }
  }
  if (pick < 0) return null;
  // a rough voice or another sound in the room doubles the period: half of it, when that is a fair dip too, is the note
  for (let again = 0; again < 2; again++) {
    const half = pick / 2;
    if (half < minLag + 1) break;
    let at = -1;
    for (let lag = Math.max(minLag, Math.floor(half * 0.96)); lag <= Math.ceil(half * 1.04); lag++) {
      if (cmnd[lag] <= cmnd[lag - 1] && cmnd[lag] <= cmnd[lag + 1] && (at < 0 || cmnd[lag] < cmnd[at])) at = lag;
    }
    if (at < 0 || cmnd[at] > HALF_OK) break;
    pick = at;
  }
  const a = cmnd[pick - 1], b = cmnd[pick], c = cmnd[pick + 1];
  const bend = a + c - 2 * b;
  const shift = bend > 0 ? Math.max(-0.5, Math.min(0.5, (a - c) / (2 * bend))) : 0;
  const hz = rate / (pick + shift);
  if (hz < minHz || hz > maxHz) return null;
  return { hz, clarity: Math.max(0, Math.min(1, 1 - b)) };
};

/** how long an octave leap must last before it is taken for a sung one, in looks (the app looks every 40 ms) */
const LEAP_LOOKS = 4;
const isOctave = (d: number) => Math.abs(Math.abs(d) - 12) < 0.8;

/**
 * The readings as they come, kept in the octave the voice is in: a look that lands an octave away from the last ones
 * is put back, and only an octave held for `LEAP_LOOKS` looks is a real leap. One follower a take.
 */
export const earFollower = () => {
  let last: number | null = null;
  let lastAt = -1e9;
  let leap = 0;
  return (heard: Heard | null, t: number): number | null => {
    if (!heard) return null;
    const midi = midiOf(heard.hz);
    if (last !== null && t - lastAt < 400 && isOctave(midi - last)) {
      leap++;
      lastAt = t;
      if (leap < LEAP_LOOKS) return midi - 12 * Math.sign(midi - last);
    }
    leap = 0;
    last = midi;
    lastAt = t;
    return midi;
  };
};

interface Reading { t: number; midi: number | null }

/** two readings this near belong to one line of the voice (a step, a slide); farther is a jump */
const SAME_LINE = 3;
/** a piece of the line shorter than this many looks is mended by the longer piece beside it */
const SHORT = 5;

/**
 * A whole take's readings tidied in hindsight, the times kept: a gap of one or two looks inside a held note is filled,
 * a short piece that sits an octave from the line beside it is put back, and a stray look or two between two pieces
 * that agree is drawn through. The first readings of a take are judged by what follows them.
 */
export const cleanFrames = <F extends Reading>(frames: F[]): F[] => {
  const m = frames.map(f => f.midi);
  const n = m.length;

  // tiny gaps inside a note
  for (let i = 1; i < n - 1; i++) {
    if (m[i] !== null || m[i - 1] === null) continue;
    let j = i;
    while (j < n && m[j] === null) j++;
    if (j < n && j - i <= 2 && Math.abs((m[j] as number) - (m[i - 1] as number)) <= 1) {
      for (let k = i; k < j; k++) m[k] = (m[i - 1] as number) + (((m[j] as number) - (m[i - 1] as number)) * (k - i + 1)) / (j - i + 1);
    }
    i = j;
  }

  // the line's pieces: readings in a row with no jump between them
  const pieces = () => {
    const out: { from: number; to: number }[] = [];
    let from = -1;
    for (let i = 0; i <= n; i++) {
      const v = i < n ? m[i] : null;
      const joins = v !== null && from >= 0 && m[i - 1] !== null && Math.abs(v - (m[i - 1] as number)) < SAME_LINE;
      if (!joins) {
        if (from >= 0) out.push({ from, to: i - 1 });
        from = v !== null ? i : -1;
      }
    }
    return out;
  };

  // an octave slip: a short piece touching a longer one, an octave from it
  for (let round = 0; round < 3; round++) {
    const ps = pieces();
    let moved = false;
    ps.forEach((p, k) => {
      const len = p.to - p.from + 1;
      if (len >= SHORT) return;
      const before = ps[k - 1], after = ps[k + 1];
      const touchB = before && before.to === p.from - 1 && before.to - before.from + 1 > len;
      const touchA = after && after.from === p.to + 1 && after.to - after.from + 1 > len;
      const dB = touchB ? (m[p.from] as number) - (m[before.to] as number) : NaN;
      const dA = touchA ? (m[p.to] as number) - (m[after.from] as number) : NaN;
      const d = isOctave(dB) ? dB : isOctave(dA) ? dA : NaN;
      if (Number.isNaN(d)) return;
      for (let i = p.from; i <= p.to; i++) m[i] = (m[i] as number) - 12 * Math.sign(d);
      moved = true;
    });
    if (!moved) break;
  }

  // a stray look or two between two pieces that agree
  const ps = pieces();
  ps.forEach((p, k) => {
    const len = p.to - p.from + 1;
    const before = ps[k - 1], after = ps[k + 1];
    if (len > 2 || !before || !after || before.to !== p.from - 1 || after.from !== p.to + 1) return;
    const a = m[before.to] as number, b = m[after.from] as number;
    if (Math.abs(a - b) > 1) return;
    for (let i = p.from; i <= p.to; i++) m[i] = a + ((b - a) * (i - p.from + 1)) / (len + 1);
  });

  return frames.map((f, i) => (f.midi === m[i] ? f : { ...f, midi: m[i] }));
};

/** how a take was heard, for the trial page: looks with a voice, gaps inside the singing, octave slips, the steadiness */
export interface EarReport { looks: number; voiced: number; breaks: number; slips: number; wobble: number; middle: number | null }

/**
 * What an ear made of one held note: of the looks while the voice sounded (`sounding`: loud enough), how many it
 * heard; how often the line broke inside; how many looks sat an octave (or more than a third) from the middle;
 * and how far the rest wander from it (semitones, the middle half's spread).
 */
export const earReport = (frames: Reading[], sounding: boolean[]): EarReport => {
  let first = sounding.indexOf(true), last = sounding.lastIndexOf(true);
  if (first < 0) return { looks: 0, voiced: 0, breaks: 0, slips: 0, wobble: 0, middle: null };
  // the first and last tenth are the voice coming in and going out
  const edge = Math.floor((last - first + 1) / 10);
  first += edge; last -= edge;
  const got: number[] = [];
  let looks = 0, breaks = 0;
  for (let i = first; i <= last; i++) {
    if (!sounding[i]) continue;
    looks++;
    const v = frames[i]?.midi ?? null;
    if (v !== null) got.push(v);
    else if (i > first && frames[i - 1]?.midi != null) breaks++;
  }
  if (!got.length) return { looks, voiced: 0, breaks, slips: 0, wobble: 0, middle: null };
  const sorted = [...got].sort((a, b) => a - b);
  const middle = sorted[Math.floor(sorted.length / 2)];
  const slips = got.filter(v => Math.abs(v - middle) > 4).length;
  const near = sorted.filter(v => Math.abs(v - middle) <= 4);
  const wobble = near.length > 3 ? near[Math.floor(near.length * 0.75)] - near[Math.floor(near.length * 0.25)] : 0;
  return { looks, voiced: got.length, breaks, slips, wobble, middle };
};
