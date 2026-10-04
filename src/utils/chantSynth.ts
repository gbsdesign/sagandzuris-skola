// Sheet music of the chant books, read from their PDFs (public/notes/<book>/NNN.json:
// book = Gelati school, vol. I; kk = Kartli-Kakheti, vol. III), and a small Web Audio
// synthesizer that plays its voices (three; four in the 4-voice litany of vol. III).

export interface BookScore {
  nums: number[];
  page: number;
  tempos: [beat: number, bpm: number][];
  dur: number; // beats (quarter notes)
  voices: [beat: number, beats: number, midi: number][][]; // I, II, III (bass)[, IV (low bass)]
  img: { src: string; w: number; h: number; page: number }[];
  // one entry per system (line of music): image index, box as fractions of the image, beat range
  sys: [img: number, x: number, y: number, w: number, h: number, t0: number, t1: number][];
  base: string; // folder of the images (added on load)
}

const pad3 = (n: number) => String(n).padStart(3, '0');
export const bookImageUrl = (score: BookScore, src: string) => score.base + src;

const scoreCache = new Map<string, Promise<BookScore>>();
// A version spanning several numbers (e.g. a litany) is one file, named after its first number
export const loadBookScore = (firstNum: number, book = 'book'): Promise<BookScore> => {
  const base = `/notes/${book}/`;
  const key = base + firstNum;
  let p = scoreCache.get(key);
  if (!p) {
    p = fetch(`${base}${pad3(firstNum)}.json`).then(r => {
      if (!r.ok) throw new Error(`score ${book} ${firstNum}: ${r.status}`);
      return r.json();
    }).then(score => ({ ...score, base }));
    p.catch(() => scoreCache.delete(key));
    scoreCache.set(key, p);
  }
  return p;
};

// beats <-> seconds, honouring tempo changes inside a chant
export const makeTimeMap = (tempos: BookScore['tempos']) => {
  const segs = (tempos.length ? tempos : [[0, 60] as [number, number]]).map(([t, bpm]) => ({ t, spb: 60 / bpm, s: 0 }));
  for (let i = 1; i < segs.length; i++) segs[i].s = segs[i - 1].s + (segs[i].t - segs[i - 1].t) * segs[i - 1].spb;
  const segAt = (key: 't' | 's', v: number) => {
    let k = 0;
    while (k + 1 < segs.length && segs[k + 1][key] <= v) k++;
    return segs[k];
  };
  return {
    toSec: (beat: number) => { const g = segAt('t', beat); return g.s + (beat - g.t) * g.spb; },
    toBeat: (sec: number) => { const g = segAt('s', sec); return g.t + (sec - g.s) / g.spb; },
  };
};

interface Note { s: number; e: number; m: number; v: number } // score seconds at speed 1

// Two singers of one voice on the same pitch (a shared head, or one holding while the other sings it again)
// would give two oscillators on one frequency: twice as loud for a moment. Per voice and pitch, notes that start
// together become one, and a note struck again while it still sounds ends there and the new one carries on.
export const singleStrike = (voices: BookScore['voices']): [beat: number, beats: number, midi: number, voice: number][] => {
  const out: [number, number, number, number][] = [];
  voices.forEach((list, v) => {
    const byPitch = new Map<number, { t: number; e: number }[]>();
    for (const [t, d, m] of list) {
      if (!byPitch.has(m)) byPitch.set(m, []);
      byPitch.get(m)!.push({ t, e: t + d });
    }
    for (const [m, notes] of byPitch) {
      notes.sort((a, b) => a.t - b.t || b.e - a.e);
      let cur: { t: number; e: number } | null = null;
      for (const n of notes) {
        if (cur && n.t < cur.e - 1e-6) {
          if (n.t - cur.t < 1e-6) { cur.e = Math.max(cur.e, n.e); continue; }
          const end = Math.max(cur.e, n.e);
          cur.e = n.t;
          n.e = end;
        }
        if (cur) out.push([cur.t, cur.e - cur.t, m, v]);
        cur = n;
      }
      if (cur) out.push([cur.t, cur.e - cur.t, m, v]);
    }
  });
  return out;
};

let sharedCtx: AudioContext | null = null;
const getCtx = () => {
  if (!sharedCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedCtx = new Ctor();
  }
  return sharedCtx;
};

// Soft "choir pad": two slightly detuned oscillators through a low-pass filter
const playNote = (ctx: BaseAudioContext, dest: AudioNode, midi: number, bass: boolean, at: number, len: number) => {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const env = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = Math.min(2400, freq * 5);
  filter.Q.value = 0.6;
  filter.connect(env);
  env.connect(dest);
  const oscs = (['triangle', 'sawtooth'] as OscillatorType[]).map((type, i) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = i ? 6 : -4;
    const g = ctx.createGain();
    g.gain.value = i ? 0.35 : 0.9;
    o.connect(g).connect(filter);
    return o;
  });
  const level = bass ? 0.95 : 0.8;
  const attack = Math.min(0.06, len / 3), release = Math.min(0.12, len / 2);
  const end = at + len;
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(level, at + attack);
  env.gain.setValueAtTime(level, Math.max(at + attack, end - release));
  env.gain.linearRampToValueAtTime(0, end);
  oscs.forEach(o => { o.start(at); o.stop(end + 0.02); });
  return { oscs, env };
};

// voice gains -> master -> compressor -> makeup gain -> limiter -> output; returns the master and one input per voice
const buildMix = (ctx: BaseAudioContext, gains: number[]) => {
  // the limiter only catches the note-onset peaks of the 4-voice chants that the boost would push past 0 dB
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -2;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.1;
  limiter.connect(ctx.destination);
  // +30 % loudness, after the compressor so every passage gets it in full;
  // 1.14 because the limiter adds its own automatic makeup gain (~1.1 dB)
  const out = ctx.createGain();
  out.gain.value = 1.14;
  out.connect(limiter);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  comp.connect(out);
  const master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(comp);
  const voices = gains.map(v => {
    const g = ctx.createGain();
    g.gain.value = v;
    g.connect(master);
    return g;
  });
  return { master, voices };
};

const LOOKAHEAD = 0.25; // seconds of audio scheduled ahead
const TICK_MS = 40;

export class ChantSynth {
  readonly duration: number; // score seconds at speed 1
  readonly toSec: (beat: number) => number;
  readonly toBeat: (sec: number) => number;
  onEnd?: () => void;

  private notes: Note[];
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voiceGains: GainNode[] = [];
  private live = new Set<{ oscs: OscillatorNode[]; env: GainNode }>();
  private timer: number | null = null;
  private next = 0;
  private startCtx = 0;
  private startSec = 0;
  private pausedAt = 0;
  private speed = 1;
  private transpose = 0;
  private muted: boolean[];
  private volume: number[];
  private loopA: number | null = null; // loop A -> B (or A -> end while B is unset)
  private loopB: number | null = null;
  playing = false;
  private starting = false;

  constructor(score: BookScore) {
    const map = makeTimeMap(score.tempos);
    this.toSec = map.toSec;
    this.toBeat = map.toBeat;
    this.duration = map.toSec(score.dur);
    this.notes = singleStrike(score.voices)
      .map(([t, d, m, v]) => ({ s: map.toSec(t), e: map.toSec(t + d), m, v }))
      .sort((a, b) => a.s - b.s);
    this.muted = score.voices.map(() => false);
    this.volume = score.voices.map(() => 1);
  }

  /** Current position in score seconds */
  position() {
    if (!this.playing || !this.ctx) return this.pausedAt;
    return Math.min(this.duration, this.startSec + (this.ctx.currentTime - this.startCtx) * this.speed);
  }

  async play(from = this.pausedAt) {
    if (this.playing || this.starting) return;
    const ctx = (this.ctx ??= getCtx());
    if (ctx.state !== 'running') {
      this.starting = true;
      try { await ctx.resume(); } finally { this.starting = false; }
    }
    if (!this.master) {
      const mix = buildMix(ctx, this.volume.map((v, i) => (this.muted[i] ? 0 : v)));
      this.master = mix.master;
      this.voiceGains = mix.voices;
    }
    this.startAt(from >= this.duration - 0.05 ? (this.loopA ?? 0) : Math.max(0, from));
    this.playing = true;
    this.tick();
    this.timer = window.setInterval(() => this.tick(), TICK_MS);
  }

  pause() {
    if (!this.playing) return;
    this.pausedAt = this.position();
    this.playing = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.silence();
  }

  seek(sec: number) {
    const was = this.playing;
    this.pause();
    this.pausedAt = Math.max(0, Math.min(this.duration, sec));
    if (was) void this.play();
  }

  setSpeed(k: number) { this.restartWith(() => { this.speed = k; }); }
  setTranspose(n: number) { this.restartWith(() => { this.transpose = n; }); }

  setMuted(voice: number, mute: boolean) {
    if (voice >= this.muted.length) return;
    this.muted[voice] = mute;
    this.applyGain(voice);
  }

  setVolume(voice: number, gain: number) {
    if (voice >= this.volume.length) return;
    this.volume[voice] = gain;
    this.applyGain(voice);
  }

  /** Loop A -> B in score seconds; B = null loops A -> end; A = null switches looping off */
  setLoop(a: number | null, b: number | null = null) {
    this.loopA = a;
    this.loopB = a === null ? null : b;
  }

  dispose() {
    this.pause();
    this.master?.disconnect();
    this.master = null;
    this.voiceGains = [];
  }

  private get loopEnd() {
    return this.loopA === null ? this.duration : this.loopB ?? this.duration;
  }

  private applyGain(voice: number) {
    const g = this.voiceGains[voice];
    if (g && this.ctx) g.gain.setTargetAtTime(this.muted[voice] ? 0 : this.volume[voice], this.ctx.currentTime, 0.02);
  }

  private restartWith(change: () => void) {
    const was = this.playing;
    this.pause();
    change();
    if (was) void this.play();
  }

  // start the clock at `sec` and find the first note still sounding there. Notes are sorted by start, not by end:
  // a long note of one voice can still sound after shorter, later notes of another voice have ended,
  // so this is a scan (notes in between that have already ended are skipped by tick()).
  private startAt(sec: number) {
    this.startSec = sec;
    this.startCtx = this.ctx!.currentTime + 0.05;
    let i = 0;
    while (i < this.notes.length && this.notes[i].e <= sec) i++;
    this.next = i;
  }

  private tick() {
    const ctx = this.ctx;
    if (!ctx || !this.playing) return;
    const end = this.loopEnd;
    const horizon = Math.min(this.position() + LOOKAHEAD * this.speed, end);
    while (this.next < this.notes.length && this.notes[this.next].s < horizon) {
      const n = this.notes[this.next++];
      const start = Math.max(n.s, this.startSec);
      const at = this.startCtx + (start - this.startSec) / this.speed;
      const len = (Math.min(n.e, end) - start) / this.speed; // notes stop at the loop end
      if (len > 0.02) this.voice(n.m + this.transpose, n.v, Math.max(at, ctx.currentTime), len);
    }
    if (this.position() >= end) {
      if (this.loopA !== null) {
        this.silence();
        this.startAt(this.loopA);
        return;
      }
      this.pause();
      this.pausedAt = 0;
      this.onEnd?.();
    }
  }

  private voice(midi: number, v: number, at: number, len: number) {
    const rec = playNote(this.ctx!, this.voiceGains[v], midi, v >= 2, at, len); // III and IV are basses
    this.live.add(rec);
    rec.oscs[0].onended = () => { this.live.delete(rec); rec.env.disconnect(); };
  }

  // stop everything already scheduled, with a short fade to avoid clicks
  private silence() {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const { oscs, env } of this.live) {
      try {
        env.gain.cancelScheduledValues(now);
        env.gain.setValueAtTime(env.gain.value, now);
        env.gain.linearRampToValueAtTime(0, now + 0.04);
        oscs.forEach(o => o.stop(now + 0.05));
      } catch { /* already stopped */ }
    }
    this.live.clear();
  }
}

// ---- export: render the voices offline and encode them as MP3 (in a worker)

const RENDER_RATE = 32000;

export interface RenderOptions {
  speed: number;
  transpose: number;
  gains: number[]; // per voice, 0 = left out
}

export const renderScore = (score: BookScore, o: RenderOptions): Promise<AudioBuffer> => {
  const map = makeTimeMap(score.tempos);
  const lead = 0.1;
  const length = lead + map.toSec(score.dur) / o.speed + 0.6;
  const ctx = new OfflineAudioContext(1, Math.ceil(length * RENDER_RATE), RENDER_RATE);
  const { voices } = buildMix(ctx, o.gains);
  const notes = singleStrike(score.voices)
    .filter(([, , , v]) => o.gains[v])
    .map(([t, d, m, v]) => ({ v, m, at: lead + map.toSec(t) / o.speed, len: (map.toSec(t + d) - map.toSec(t)) / o.speed }))
    .filter(n => n.len > 0.02)
    .sort((a, b) => a.at - b.at);
  // Nodes are created a window ahead and dropped when they end: a graph holding every note
  // of a long chant from the first sample renders many times slower.
  let next = 0;
  const addUntil = (t: number) => {
    while (next < notes.length && notes[next].at < t) {
      const n = notes[next++];
      const rec = playNote(ctx, voices[n.v], n.m + o.transpose, n.v >= 2, n.at, n.len);
      rec.oscs[0].onended = () => rec.env.disconnect();
    }
  };
  const WINDOW = 2;
  if (typeof ctx.suspend === 'function') {
    for (let t = WINDOW; t < length - 0.01; t += WINDOW) {
      ctx.suspend(t).then(
        () => { addUntil(t + WINDOW + 0.05); return ctx.resume(); },
        () => addUntil(Infinity),
      );
    }
    addUntil(WINDOW + 0.05);
  } else {
    addUntil(Infinity); // no suspend() on offline contexts in this browser: schedule everything up front
  }
  return ctx.startRendering();
};

export const encodeMp3 = (buffer: AudioBuffer, onProgress?: (p: number) => void): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./mp3Worker.ts', import.meta.url), { type: 'module' });
    const samples = buffer.getChannelData(0).slice();
    worker.onmessage = (e: MessageEvent<{ progress?: number; chunks?: Uint8Array[] }>) => {
      if (e.data.progress !== undefined) onProgress?.(e.data.progress);
      if (e.data.chunks) {
        resolve(new Blob(e.data.chunks as BlobPart[], { type: 'audio/mpeg' }));
        worker.terminate();
      }
    };
    worker.onerror = err => { reject(err); worker.terminate(); };
    worker.postMessage({ samples, sampleRate: buffer.sampleRate, kbps: 128 }, [samples.buffer]);
  });

// Save a generated file (MP3 / PDF) with a readable name
export const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};
