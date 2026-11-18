import { encodeMp3, renderScore, type BookScore } from '../../utils/chantSynth';
import { subScore } from '../../pages/games/mesame/mix';

// „ასე ჟღერ გუნდში“ (board x-ai-gundshi): my „გალობა“ take laid on the other voices, each voice its own part so its
// level can move while it plays. The voices are rendered from the book notes one by one (renderScore, as „მესამე ხმა“'s
// trioMix does it, the section cut by its subScore); my take is laid by the delay found for it (utils/trio.ts fitDelay).
// `ChoirPlayer` plays them live; `choirMp3` renders the same mix into one MP3 to keep.

/** renderScore's silence before the first note */
const LEAD = 0.1;
const RATE = 24000;
export const WAVE_N = 32;

export interface ChoirParts {
  /** each voice of the score rendered alone; mine is null (my take sings it) */
  voices: (AudioBuffer | null)[];
  take: AudioBuffer;
  /** where in my take the section begins (s); below 0 = it began before I did */
  delay: number;
  /** the mix's length (s) */
  seconds: number;
  /** my take's gain that sits it a little over the others (trioMix's rule) */
  autoMe: number;
  /** each part's loudness in WAVE_N bars: the voices in order (mine = the take) */
  bars: number[][];
}

const rmsOf = (buf: AudioBuffer, from: number, to: number) => {
  const data = buf.getChannelData(0);
  const a = Math.max(0, Math.round(from * buf.sampleRate));
  const b = Math.min(data.length, Math.round(to * buf.sampleRate));
  let sum = 0;
  let n = 0;
  for (let i = a; i < b; i += 8) { sum += data[i] * data[i]; n++; }
  return n ? Math.sqrt(sum / n) : 0;
};

/** where a part's sound for mix time `t` lies in its buffer */
const offsetOf = (p: ChoirParts, mine: boolean, t: number) => (mine ? p.delay + t : LEAD + t);

/** the parts from my take (the MP3 of the listening) and the section sung (score seconds) */
export const prepareChoir = async (o: {
  score: BookScore; vi: number; from: number; to: number; shift: number; take: Blob; delay: number;
}): Promise<ChoirParts> => {
  const part = subScore(o.score, o.from, o.to);
  const voices = await Promise.all(part.voices.map((_, i) => (i === o.vi ? Promise.resolve(null)
    : renderScore(part, { speed: 1, transpose: o.shift, gains: part.voices.map((__, j) => (j === i ? 1 : 0)) }))));
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const probe = new Ctx();
  let take: AudioBuffer;
  try { take = await probe.decodeAudioData(await o.take.arrayBuffer()); } finally { probe.close().catch(() => undefined); }
  const seconds = o.to - o.from + 0.8;
  const base: ChoirParts = { voices, take, delay: o.delay, seconds, autoMe: 1, bars: [] };
  // levels: my voice about a third over the others together
  const others = Math.sqrt(voices.reduce((s, v) => s + (v ? rmsOf(v, LEAD, LEAD + seconds) ** 2 : 0), 0));
  const me = rmsOf(take, Math.max(0, o.delay), o.delay + seconds);
  const autoMe = others > 0 && me > 0 ? Math.min(8, Math.max(0.2, (others / me) * 1.3)) : 1;
  const bars = voices.map((v, i) => Array.from({ length: WAVE_N }, (_, b) => {
    const t0 = (b / WAVE_N) * seconds;
    const t1 = ((b + 1) / WAVE_N) * seconds;
    const buf = i === o.vi ? take : v;
    const mine = i === o.vi;
    return buf ? rmsOf(buf, offsetOf(base, mine, t0), offsetOf(base, mine, t1)) : 0;
  }));
  return { ...base, autoMe, bars };
};

/** a voice's slider (0–1) as its gain: the others' 0.6 and my 0.85 are the even mix */
export const gainOf = (p: ChoirParts, i: number, vi: number, level: number) => (i === vi ? p.autoMe * (level / 0.85) : level / 0.6);

/** the slider places the mix opens with */
export const startLevels = (p: ChoirParts, vi: number): number[] => p.voices.map((_, i) => (i === vi ? 0.85 : 0.6));

/** the waveform's bars (0.2–1) at these levels */
export const waveOf = (p: ChoirParts, vi: number, levels: number[]) => {
  const sum = Array.from({ length: WAVE_N }, (_, b) =>
    Math.sqrt(p.bars.reduce((s, bars, i) => s + (gainOf(p, i, vi, levels[i] ?? 0) * (bars[b] ?? 0)) ** 2, 0)));
  // stretched from the quietest bar to the loudest, so a choir that never stops still shows its swells
  const top = Math.max(...sum);
  const low = Math.min(...sum);
  return sum.map(v => (top > low ? 0.2 + (0.8 * (v - low)) / (top - low) : 0.6));
};

/** lays every part on a context's destination from mix time `at`; returns the sources and their gains */
const lay = (ctx: BaseAudioContext, p: ChoirParts, vi: number, levels: number[], at: number, when: number) =>
  p.voices.map((v, i) => {
    const buf = i === vi ? p.take : v;
    if (!buf) return null;
    const g = ctx.createGain();
    g.gain.value = gainOf(p, i, vi, levels[i] ?? 0);
    g.connect(ctx.destination);
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.connect(g);
    const off = offsetOf(p, i === vi, at);
    if (off >= 0) s.start(when, off); else s.start(when - off);
    return { s, g };
  });

/** The mix played live: play / pause / seek, each voice's level moved while it sounds. */
export class ChoirPlayer {
  private ctx: AudioContext | null = null;
  private nodes: ({ s: AudioBufferSourceNode; g: GainNode } | null)[] = [];
  private t0 = 0;
  private from = 0;
  playing = false;

  constructor(private p: ChoirParts, private vi: number, private levels: number[]) {}

  /** seconds into the mix */
  position() {
    if (!this.playing || !this.ctx) return this.from;
    return Math.min(this.p.seconds, this.from + this.ctx.currentTime - this.t0);
  }

  async play(at = this.from) {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
    }
    if (this.ctx.state !== 'running') await this.ctx.resume().catch(() => undefined);
    this.silence();
    this.from = at >= this.p.seconds - 0.05 ? 0 : at;
    this.t0 = this.ctx.currentTime + 0.03;
    this.nodes = lay(this.ctx, this.p, this.vi, this.levels, this.from, this.t0);
    this.playing = true;
  }

  pause() {
    this.from = this.position();
    this.silence();
    this.playing = false;
  }

  seek(at: number) {
    const was = this.playing;
    this.silence();
    this.playing = false;
    this.from = Math.max(0, Math.min(this.p.seconds, at));
    if (was) void this.play(this.from);
  }

  setLevels(levels: number[]) {
    this.levels = levels;
    const now = this.ctx?.currentTime ?? 0;
    this.nodes.forEach((n, i) => n?.g.gain.setTargetAtTime(gainOf(this.p, i, this.vi, levels[i] ?? 0), now, 0.03));
  }

  dispose() {
    this.silence();
    this.playing = false;
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }

  private silence() {
    this.nodes.forEach(n => { try { n?.s.stop(); } catch { /* not started */ } n?.g.disconnect(); });
    this.nodes = [];
  }
}

/** the mix at these levels as one MP3 (mono, 96 kbps) */
export const choirMp3 = async (p: ChoirParts, vi: number, levels: number[]): Promise<Blob> => {
  const off = new OfflineAudioContext(1, Math.ceil(p.seconds * RATE), RATE);
  lay(off, p, vi, levels, 0, 0);
  const mix = await off.startRendering();
  const data = mix.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  if (peak > 0) for (let i = 0; i < data.length; i++) data[i] *= 0.9 / peak;
  return encodeMp3(mix, undefined, 96);
};
