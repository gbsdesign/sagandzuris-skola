// „ჩემი გუნდი“'s players, made in Web Audio (live and offline alike): a clap (a few quick bursts of noise and a short tail),
// the doli's low „დუმ“ (a falling tone with a thump) and high „ტეკ“ (the rim), and a panduri string plucked
// (Karplus–Strong, made once per pitch).

const NOISE_RATE = 32000;
let noiseBuf: AudioBuffer | null = null;

const makeBuffer = (ctx: BaseAudioContext, data: Float32Array, rate: number) => {
  const b = ctx.createBuffer(1, data.length, rate);
  b.getChannelData(0).set(data);
  return b;
};

/** a second of white noise (one for every sound that needs it; the start inside it differs each time) */
const noise = (ctx: BaseAudioContext) => {
  if (!noiseBuf) {
    const data = new Float32Array(NOISE_RATE);
    let seed = 0x2545f491;
    for (let i = 0; i < data.length; i++) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      data[i] = ((seed >>> 0) / 4294967296) * 2 - 1;
    }
    noiseBuf = makeBuffer(ctx, data, NOISE_RATE);
  }
  return noiseBuf;
};

const noiseFrom = (ctx: BaseAudioContext, at: number, len: number) => {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  src.start(at, Math.random() * 0.6);
  src.stop(at + len);
  return src;
};

/** a clap of a few hands: three bursts 10 ms apart, the last with a short room tail */
export const playClap = (ctx: BaseAudioContext, dest: AudioNode, at: number, gain = 1) => {
  const src = noiseFrom(ctx, at, 0.32);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1250 + Math.random() * 150;
  band.Q.value = 0.85;
  const env = ctx.createGain();
  src.connect(band).connect(env).connect(dest);
  const g = env.gain;
  g.setValueAtTime(0, at);
  ([[0, 0.75, 0.0035], [0.0105, 0.85, 0.0035], [0.021, 1, 0.042]] as const).forEach(([d, level, tau]) => {
    g.setValueAtTime(level * gain, at + d);
    g.setTargetAtTime(0, at + d + 0.0006, tau);
  });
};

/** the doli: „დუმ“ in the middle of its skin, „ტეკ“ on its rim */
export const playDrum = (ctx: BaseAudioContext, dest: AudioNode, kind: 'dum' | 'tek', at: number, gain = 1) => {
  const env = ctx.createGain();
  env.connect(dest);
  const osc = ctx.createOscillator();
  if (kind === 'dum') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(170, at);
    osc.frequency.exponentialRampToValueAtTime(78, at + 0.13);
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(gain, at + 0.004);
    env.gain.setTargetAtTime(0, at + 0.02, 0.11);
    osc.connect(env);
    osc.start(at);
    osc.stop(at + 0.7);
    // the skin's ring higher up, so a phone's small speaker has something to play
    const ring = ctx.createOscillator();
    ring.type = 'triangle';
    ring.frequency.setValueAtTime(290, at);
    ring.frequency.exponentialRampToValueAtTime(160, at + 0.1);
    const ringEnv = ctx.createGain();
    ringEnv.gain.setValueAtTime(0, at);
    ringEnv.gain.linearRampToValueAtTime(0.4 * gain, at + 0.003);
    ringEnv.gain.setTargetAtTime(0, at + 0.01, 0.045);
    ring.connect(ringEnv).connect(dest);
    ring.start(at);
    ring.stop(at + 0.35);
    // the hand's thump on the skin
    const src = noiseFrom(ctx, at, 0.12);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 1100;
    const slap = ctx.createGain();
    slap.gain.setValueAtTime(0.5 * gain, at);
    slap.gain.setTargetAtTime(0, at + 0.002, 0.016);
    src.connect(low).connect(slap).connect(dest);
  } else {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(410, at);
    osc.frequency.exponentialRampToValueAtTime(330, at + 0.06);
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(0.5 * gain, at + 0.002);
    env.gain.setTargetAtTime(0, at + 0.006, 0.03);
    osc.connect(env);
    osc.start(at);
    osc.stop(at + 0.25);
    const src = noiseFrom(ctx, at, 0.1);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2600;
    band.Q.value = 1.1;
    const click = ctx.createGain();
    click.gain.setValueAtTime(0.9 * gain, at);
    click.gain.setTargetAtTime(0, at + 0.001, 0.014);
    src.connect(band).connect(click).connect(dest);
  }
};

// ---- the panduri: a plucked string (Karplus–Strong), one buffer per pitch, its pitch put right by the playback rate

const KS_RATE = 32000;
const KS_SECONDS = 1.5;
const strings = new Map<number, { data: Float32Array; rate: number }>();
const buffers = new WeakMap<BaseAudioContext, Map<number, AudioBuffer>>();

const stringOf = (midi: number) => {
  let s = strings.get(midi);
  if (s) return s;
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const period = KS_RATE / freq;
  // the loop's averaging adds half a sample to its period
  const n = Math.max(2, Math.floor(period - 0.5));
  const ring = new Float32Array(n);
  let seed = (midi * 7919 + 17) % 2147483647;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    seed = (seed * 16807) % 2147483647;
    const x = (seed / 2147483647) * 2 - 1;
    ring[i] = (x + prev) / 2; // a soft pick: the noise smoothed once
    prev = x;
  }
  const mean = ring.reduce((a, x) => a + x, 0) / n;
  for (let i = 0; i < n; i++) ring[i] -= mean;
  const data = new Float32Array(Math.floor(KS_RATE * KS_SECONDS));
  let k = 0, peak = 0;
  for (let i = 0; i < data.length; i++) {
    const cur = ring[k];
    const next = ring[(k + 1) % n];
    data[i] = cur;
    ring[k] = 0.996 * 0.5 * (cur + next);
    k = (k + 1) % n;
    peak = Math.max(peak, Math.abs(cur));
  }
  const fade = Math.floor(KS_RATE * 0.25);
  for (let i = 0; i < data.length; i++) {
    data[i] *= 0.9 / (peak || 1);
    if (i > data.length - fade) data[i] *= (data.length - i) / fade;
  }
  s = { data, rate: freq / (KS_RATE / (n + 0.5)) };
  strings.set(midi, s);
  return s;
};

/** a panduri string plucked at `at` (it rings about a second) */
export const playPluck = (ctx: BaseAudioContext, dest: AudioNode, midi: number, at: number, gain = 1) => {
  const s = stringOf(midi);
  let mine = buffers.get(ctx);
  if (!mine) { mine = new Map(); buffers.set(ctx, mine); }
  let buf = mine.get(midi);
  if (!buf) { buf = makeBuffer(ctx, s.data, KS_RATE); mine.set(midi, buf); }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = s.rate;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 3200;
  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, at);
  env.gain.setTargetAtTime(0, at + 1.05, 0.09);
  src.connect(tone).connect(env).connect(dest);
  src.start(at);
  src.stop(at + KS_SECONDS);
};
