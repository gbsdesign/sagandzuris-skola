// A made voice for trying the ear (tests/ear.test.ts): harmonics through a vowel's formants, with vibrato, the room's
// noise, a phone's weak bass and a rough (creaky) voice — so the ear is tried on something nearer a singer than a sine.
let seed = 12345;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
export const reseed = (s: number) => { seed = s; };

const VOWELS: Record<string, [number, number, number]> = {
  a: [700, 1150, 2600], i: [300, 2300, 3000], o: [480, 900, 2500], u: [320, 800, 2400], m: [250, 1100, 2400],
};

/** weak: the share of the lowest partial left (a phone, a far voice); fry: every second pulse weaker (a rough voice) */
export interface VoiceOpts { vowel?: string; vibrato?: number; noise?: number; phone?: boolean; amp?: number; weak?: number; fry?: number }

/** `seconds` of a voice at f0(t) Hz */
export const voice = (f0: (t: number) => number, seconds: number, rate: number, o: VoiceOpts = {}) => {
  const n = Math.round(seconds * rate);
  const out = new Float32Array(n);
  const F = VOWELS[o.vowel ?? 'a'];
  const env = (f: number) => {
    let g = 0.1;
    F.forEach((c, k) => { g += [1, 0.6, 0.3][k] / (1 + ((f - c) / [90, 110, 160][k]) ** 2); });
    return g / (1 + (f / 500) ** 1.2) * (o.phone ? 1 / (1 + (150 / f) ** 4) : 1);
  };
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const f = f0(t) * (o.vibrato ? 2 ** ((o.vibrato / 12) * Math.sin(2 * Math.PI * 5.5 * t)) : 1);
    phase += f / rate;
    let s = 0;
    for (let h = 1; h * f < 3600; h++) s += (h === 1 && o.weak !== undefined ? o.weak : 1) * env(h * f) * Math.sin(2 * Math.PI * h * phase + h * 0.7);
    if (o.fry) s *= 1 - o.fry * (0.5 + 0.5 * Math.cos(Math.PI * phase));
    out[i] = s;
  }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  const amp = o.amp ?? 0.3;
  for (let i = 0; i < n; i++) out[i] = (out[i] * amp) / (peak || 1) + (o.noise ?? 0) * (rnd() - 0.5) * 2 * amp;
  return out;
};

/** breath: noise with no note in it */
export const breath = (seconds: number, rate: number, amp = 0.05) => {
  const n = Math.round(seconds * rate);
  const out = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) { lp += 0.3 * ((rnd() - 0.5) * 2 - lp); out[i] = amp * ((rnd() - 0.5) * 2 * 0.6 + lp); }
  return out;
};
