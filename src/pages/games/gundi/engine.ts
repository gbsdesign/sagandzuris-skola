import { buildMix, encodeMp3, getCtx, playNote } from '../../../utils/chantSynth';
import { waveOf, type VoiceTake } from '../../../utils/voiceRecorder';
import { ROLES, activeAt, trackOf, type GundiEvent, type GundiLoop, type Role } from '../../../utils/gundi';
import { playClap, playDrum, playPluck } from './sounds';

// „ჩემი გუნდი“'s stage, heard: the phrase loops without a seam (each pass is scheduled a little ahead, the next one from the
// moment the last ends), every performer comes in or goes out at once — what they would be singing right then starts
// sounding, what they had sung stops — and a new phrase or tempo waits for the end of the pass (a new song starts at once).
// While recording, everything sounded is written down and played again offline into one MP3.

export interface Phrase { loop: GundiLoop; bpm: number; speed: number }

/** each performer's level and place between the speakers (the singers in the middle, the players to the sides) */
export const LEVEL: Record<Role, number> = { mtqmeli: 1, modzakhili: 1, bani: 1, tashi: 4, doli: 1.05, panduri: 2 };
const PAN: Record<Role, number> = { mtqmeli: -0.15, modzakhili: 0.15, bani: 0, tashi: -0.45, doli: 0.1, panduri: 0.45 };

const LOOKAHEAD = 0.3; // seconds scheduled ahead
const TICK_MS = 25;
/** a recording is at most two minutes */
export const MAX_TAKE = 120;

interface Pass {
  start: number;            // context seconds
  spb: number;              // seconds a beat
  dur: number;
  phrase: Phrase;
  done: number;             // seconds from its start scheduled so far
  bus: Record<Role, number>; // each performer's bus in this pass (a new one when they come in, change or go)
}

/** one sound, as it was heard: when (from the recording's start), into which bus, what */
type Sounded = { t: number; bus: number; role: Role; e: GundiEvent; spb: number };
export interface TakeLog { end: number; sounds: Sounded[]; cuts: Map<number, number>; roles: Map<number, Role> }

const spbOf = (p: Phrase) => 60 / (p.bpm * p.speed);

/** plays one event into a destination at a context time */
export const sound = (ctx: BaseAudioContext, dest: AudioNode, role: Role, e: GundiEvent, at: number, spb: number, len?: number) => {
  if (e.kind === 'note') playNote(ctx, dest, e.midi, role === 'bani', at, len ?? e.len * spb);
  else if (e.kind === 'pluck') playPluck(ctx, dest, e.midi, at, e.gain);
  else if (e.kind === 'clap') playClap(ctx, dest, at, e.gain);
  else playDrum(ctx, dest, e.kind, at, e.gain);
};

/** the mix: the synthesizer's chain (compressor, saturation, limiter), a track per performer with its level and place */
export const buildStage = (ctx: BaseAudioContext) => {
  const { master } = buildMix(ctx, [1, 1, 1]);
  const track = {} as Record<Role, GainNode>;
  for (const r of ROLES) {
    const g = ctx.createGain();
    g.gain.value = LEVEL[r];
    const pan = ctx.createStereoPanner();
    pan.pan.value = PAN[r];
    g.connect(pan).connect(master);
    track[r] = g;
  }
  return { master, track };
};

export class GundiStage {
  private ctx: AudioContext | null = null;
  private track = {} as Record<Role, GainNode>;
  private buses = new Map<number, GainNode>();
  private busRole = new Map<number, Role>();
  private nextBus = 1;
  private passes: Pass[] = [];
  private timer: number | null = null;
  private queued: Phrase | null = null;
  private tracks = new Map<string, GundiEvent[]>();
  private rec: (TakeLog & { t0: number }) | null = null;
  playing = false;
  phrase: Phrase;
  on: Record<Role, boolean>;
  variant: Record<Role, string>;

  constructor(phrase: Phrase, on: Role[], variant: Record<Role, string>) {
    this.phrase = phrase;
    this.on = Object.fromEntries(ROLES.map(r => [r, on.includes(r)])) as Record<Role, boolean>;
    this.variant = { ...variant };
  }

  /** a performer's part in a phrase (made once) */
  private eventsOf(loop: GundiLoop, role: Role) {
    const key = `${loop.a}:${loop.b}:${role}:${this.variant[role]}`;
    let t = this.tracks.get(key);
    if (!t) {
      t = trackOf(loop, role, this.variant[role]);
      if (this.tracks.size > 200) this.tracks.clear();
      this.tracks.set(key, t);
    }
    return t;
  }

  private newBus(role: Role) {
    const g = this.ctx!.createGain();
    g.connect(this.track[role]);
    const id = this.nextBus++;
    this.buses.set(id, g);
    this.busRole.set(id, role);
    this.rec?.roles.set(id, role);
    return id;
  }

  /** a bus falls silent (its notes already scheduled are cut) at `at` */
  private cut(id: number, at: number) {
    const g = this.buses.get(id);
    if (!g) return;
    this.buses.delete(id);
    g.gain.setTargetAtTime(0, at, 0.012);
    if (this.rec) this.rec.cuts.set(id, Math.max(0, at - this.rec.t0));
    window.setTimeout(() => g.disconnect(), Math.max(0, (at - this.ctx!.currentTime) * 1000) + 400);
  }

  private newPass(start: number, phrase: Phrase): Pass {
    const spb = spbOf(phrase);
    const bus = Object.fromEntries(ROLES.map(r => [r, this.newBus(r)])) as Record<Role, number>;
    return { start, spb, dur: phrase.loop.beats * spb, phrase, done: 0, bus };
  }

  private emit(p: Pass, role: Role, e: GundiEvent, at: number, len?: number) {
    const g = this.buses.get(p.bus[role]);
    if (!g) return;
    sound(this.ctx!, g, role, e, at, p.spb, len);
    if (this.rec && at >= this.rec.t0 - 0.01) {
      this.rec.sounds.push({ t: at - this.rec.t0, bus: p.bus[role], role, e: len != null && e.kind === 'note' ? { ...e, len: len / p.spb } : e, spb: p.spb });
    }
  }

  /** what the scheduler sounds from `from` to `to` seconds of a pass */
  private schedule(p: Pass, from: number, to: number) {
    for (const role of ROLES) {
      if (!this.on[role]) continue;
      for (const e of this.eventsOf(p.phrase.loop, role)) {
        const t = e.at * p.spb;
        if (t >= from - 1e-9 && t < to - 1e-9) this.emit(p, role, e, p.start + t);
      }
    }
  }

  private tick() {
    const ctx = this.ctx;
    if (!ctx || !this.playing) return;
    const until = ctx.currentTime + LOOKAHEAD;
    for (let guard = 0; guard < 8; guard++) {
      const p = this.passes[this.passes.length - 1];
      const end = p.start + p.dur;
      const to = Math.min(until, end) - p.start;
      if (to > p.done) { this.schedule(p, p.done, to); p.done = to; }
      if (until < end) break;
      const phrase = this.queued ?? p.phrase;
      this.queued = null;
      this.phrase = phrase;
      this.passes.push(this.newPass(end, phrase));
    }
    // passes long over let go of their buses
    while (this.passes.length > 1 && this.passes[0].start + this.passes[0].dur < ctx.currentTime - 1.5) {
      const old = this.passes.shift()!;
      for (const r of ROLES) this.cut(old.bus[r], ctx.currentTime);
    }
    if (this.rec && ctx.currentTime - this.rec.t0 >= MAX_TAKE) this.onTakeFull?.();
  }

  /** called once when a recording reaches its two minutes */
  onTakeFull?: () => void;

  async play() {
    if (this.playing) return;
    const ctx = (this.ctx ??= getCtx());
    if (ctx.state !== 'running') await ctx.resume();
    if (!this.track.bani) this.track = buildStage(ctx).track;
    if (this.playing) return;
    this.playing = true;
    this.passes = [this.newPass(ctx.currentTime + 0.08, this.phrase)];
    this.tick();
    this.timer = window.setInterval(() => this.tick(), TICK_MS);
  }

  stop() {
    if (!this.playing || !this.ctx) return;
    this.playing = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    const now = this.ctx.currentTime;
    for (const p of this.passes) for (const r of ROLES) this.cut(p.bus[r], now);
    this.passes = [];
    if (this.queued) { this.phrase = this.queued; this.queued = null; }
  }

  dispose() {
    this.stop();
    for (const g of Object.values(this.track)) g.disconnect();
    this.track = {} as Record<Role, GainNode>;
  }

  /** a performer comes in, changes or goes: their bus in every pass still sounding is cut, and they start at once */
  private redo(role: Role) {
    const ctx = this.ctx;
    if (!ctx || !this.playing) return;
    const now = ctx.currentTime + 0.02;
    for (const p of this.passes) {
      if (p.start + p.dur <= now) continue;
      this.cut(p.bus[role], now);
      p.bus[role] = this.newBus(role);
      if (!this.on[role]) continue;
      for (const e of this.eventsOf(p.phrase.loop, role)) {
        const t = p.start + e.at * p.spb;
        if (t >= p.start + p.done - 1e-9) continue; // the scheduler gets there itself
        if (t >= now) { this.emit(p, role, e, t); continue; }
        // a note already under way sounds from now for what is left of it
        if (e.kind === 'note') {
          const left = t + e.len * p.spb - now;
          if (left > 0.12) this.emit(p, role, e, now, left);
        }
      }
    }
  }

  setOn(role: Role, on: boolean) {
    if (this.on[role] === on) return;
    this.on[role] = on;
    this.redo(role);
  }

  setVariant(role: Role, id: string) {
    if (this.variant[role] === id) return;
    this.variant[role] = id;
    if (this.on[role]) this.redo(role);
  }

  /** a new phrase or tempo: from the end of this pass (`now`: at once, for a new song) */
  setPhrase(phrase: Phrase, now = false) {
    const ctx = this.ctx;
    if (!ctx || !this.playing) { this.phrase = phrase; this.queued = null; return; }
    if (now) {
      const at = ctx.currentTime + 0.04;
      for (const p of this.passes) for (const r of ROLES) this.cut(p.bus[r], at);
      this.passes = [this.newPass(at + 0.03, phrase)];
      this.phrase = phrase;
      this.queued = null;
      this.tick();
      return;
    }
    this.queued = phrase;
    // a pass already begun ahead of time with the old phrase is taken back (nothing of it sounds yet)
    const last = this.passes[this.passes.length - 1];
    if (this.passes.length > 1 && last.start > ctx.currentTime + 0.01) {
      for (const r of ROLES) this.cut(last.bus[r], ctx.currentTime);
      this.passes.pop();
    }
  }

  /** a new phrase is waiting for the end of the pass */
  get waiting() { return this.queued; }

  /** where the stage is now: the pass sounding, the beat in it, who is singing or striking right now */
  probe(): { phrase: Phrase; beat: number; busy: Record<Role, boolean>; stroke?: 'dum' | 'tek' } | null {
    const ctx = this.ctx;
    if (!ctx || !this.playing) return null;
    const t = ctx.currentTime;
    const p = [...this.passes].reverse().find(x => x.start <= t) ?? this.passes[0];
    if (!p) return null;
    const beat = Math.max(0, (t - p.start) / p.spb);
    const busy = Object.fromEntries(ROLES.map(r => [r, this.on[r] && activeAt(this.eventsOf(p.phrase.loop, r), beat)])) as Record<Role, boolean>;
    let stroke: 'dum' | 'tek' | undefined;
    for (const e of this.eventsOf(p.phrase.loop, 'doli')) if (e.at <= beat && (e.kind === 'dum' || e.kind === 'tek')) stroke = e.kind;
    return { phrase: p.phrase, beat, busy, stroke };
  }

  // ---- recording

  get recording() { return !!this.rec; }
  recSeconds() { return this.rec && this.ctx ? this.ctx.currentTime - this.rec.t0 : 0; }

  startRecording() {
    if (!this.ctx || !this.playing) return false;
    const t0 = this.ctx.currentTime;
    const rec = { t0, end: 0, sounds: [] as Sounded[], cuts: new Map<number, number>(), roles: new Map(this.busRole) };
    this.rec = rec;
    // what was scheduled before the button: the notes under way from now, the rest at their times
    for (const p of this.passes) {
      for (const role of ROLES) {
        if (!this.on[role]) continue;
        for (const e of this.eventsOf(p.phrase.loop, role)) {
          const t = p.start + e.at * p.spb;
          if (t >= p.start + p.done - 1e-9) continue;
          if (t >= t0) rec.sounds.push({ t: t - t0, bus: p.bus[role], role, e, spb: p.spb });
          else if (e.kind === 'note') {
            const left = t + e.len * p.spb - t0;
            if (left > 0.12) rec.sounds.push({ t: 0, bus: p.bus[role], role, e: { ...e, len: left / p.spb }, spb: p.spb });
          }
        }
      }
    }
    return true;
  }

  stopRecording(): TakeLog | null {
    const r = this.rec;
    this.rec = null;
    if (!r || !this.ctx) return null;
    return { end: Math.min(MAX_TAKE, this.ctx.currentTime - r.t0), sounds: r.sounds.filter(s => s.t < MAX_TAKE), cuts: r.cuts, roles: r.roles };
  }
}

const RATE = 24000;

/** the take played again offline: the same sounds into the same buses, cut where they were cut, then one MP3 */
export const renderTake = async (log: TakeLog, onProgress?: (p: number) => void): Promise<VoiceTake> => {
  const seconds = Math.max(1, log.end) + 1;
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * RATE), RATE);
  const { master, track } = buildStage(ctx);
  // the take ends softly where the recording stopped
  master.gain.setValueAtTime(master.gain.value, log.end);
  master.gain.linearRampToValueAtTime(0, log.end + 0.8);
  const buses = new Map<number, GainNode>();
  const busOf = (id: number, role: Role) => {
    let g = buses.get(id);
    if (!g) {
      g = ctx.createGain();
      g.connect(track[role]);
      const cut = log.cuts.get(id);
      if (cut !== undefined) g.gain.setTargetAtTime(0, cut, 0.012);
      buses.set(id, g);
    }
    return g;
  };
  const sounds = [...log.sounds].sort((a, b) => a.t - b.t);
  let next = 0;
  const addUntil = (t: number) => {
    while (next < sounds.length && sounds[next].t < t) {
      const s = sounds[next++];
      sound(ctx, busOf(s.bus, s.role), s.role, s.e, s.t, s.spb);
    }
  };
  // nodes are made a window ahead, as renderScore does: a graph with every note from the start renders far slower
  const WINDOW = 2;
  if (typeof ctx.suspend === 'function') {
    for (let t = WINDOW; t < seconds - 0.01; t += WINDOW) {
      ctx.suspend(t).then(() => { addUntil(t + WINDOW + 0.05); onProgress?.(Math.min(0.5, (t / seconds) * 0.5)); return ctx.resume(); }, () => addUntil(Infinity));
    }
    addUntil(WINDOW + 0.05);
  } else {
    addUntil(Infinity);
  }
  const buffer = await ctx.startRendering();
  const data = buffer.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  if (peak > 0) for (let i = 0; i < data.length; i++) data[i] *= 0.9 / peak;
  const mp3 = await encodeMp3(buffer, p => onProgress?.(0.5 + p / 2), 48);
  return { mp3, seconds, wave: waveOf(data) };
};
