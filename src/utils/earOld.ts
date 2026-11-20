// The app's first ear, as it listened until 2026-11-21 — kept only so the trial page („ყურის შემოწმება“) can show both
// ears on the same voice. Nothing else may use it: the app listens through utils/ear.ts.

/**
 * The pitch of one stretch of sound (mono samples), or null when it is too quiet or not a clear tone.
 * A YIN-style difference function: the first dip under the threshold, refined between samples.
 */
export const oldDetectPitch = (buf: Float32Array, sampleRate: number, minHz = 70, maxHz = 1000): number | null => {
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
