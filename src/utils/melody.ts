// A melody played on the chat's keyboard (2026-11-23, the user: „სინთეზატორი … პატარა მელოდიის შექმნა და გაეგზავნება ვოისის
// სახით … ტონის ასაწევ-დასაწევი … სიჩქარე … მოსწავლესაც შეეძლოს ტონის და რიტმის ცვლა გაგზავნილზე“). It goes as an ordinary voice
// message (its MP3, so every phone plays it) that also carries its notes in `mel`, so whoever hears it may move its tone and
// pace without spoiling the sound, see its keys light up and loop a part of it.

/** the keyboard's sounds */
export type Instr = 'piano' | 'organ' | 'flute' | 'pluck';
export const INSTRS: { id: Instr; name: string }[] = [
  { id: 'piano', name: 'პიანინო' },
  { id: 'organ', name: 'ორღანი' },
  { id: 'flute', name: 'სალამური' },
  { id: 'pluck', name: 'ჩონგური' },
];
export const instrName = (i: Instr) => INSTRS.find(x => x.id === i)?.name ?? 'პიანინო';

/** one note: its key (MIDI), when it starts and how long it sounds, in milliseconds */
export type MelNote = [midi: number, at: number, len: number];
export interface Melody { i: Instr; n: MelNote[] }

export const MEL_MAX_NOTES = 800;
export const MEL_MAX_MS = 300_000;
export const TONE_MIN = -12;
export const TONE_MAX = 12;
/** the pace: a share of the played one */
export const SPEEDS = [0.5, 0.6, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
/** a voice message's pace (a tap goes to the next) */
export const VOICE_SPEEDS = [1, 1.25, 1.5, 2, 0.5, 0.75];

export const speedLabel = (s: number) => `${Math.round(s * 100)}%`;
export const toneLabel = (t: number) => (t > 0 ? `+${t}` : t < 0 ? `−${-t}` : '0');
/** a step of the pace up (1) or down (-1) */
export const stepSpeed = (s: number, d: 1 | -1) => {
  const i = SPEEDS.findIndex(x => Math.abs(x - s) < 0.001);
  const at = i < 0 ? SPEEDS.indexOf(1) : i;
  return SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, at + d))];
};
export const stepTone = (t: number, d: 1 | -1) => Math.max(TONE_MIN, Math.min(TONE_MAX, t + d));

const NAMES = ['დო', 'დო♯', 'რე', 'რე♯', 'მი', 'ფა', 'ფა♯', 'სოლ', 'სოლ♯', 'ლა', 'ლა♯', 'სი'];
/** a key's name: დო, რე♯ … */
export const noteNameOf = (midi: number) => NAMES[((Math.round(midi) % 12) + 12) % 12];
export const isBlack = (midi: number) => [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);

const INSTR_IDS = INSTRS.map(x => x.id) as string[];

/** what a message keeps (`mel`): short JSON */
export const encodeMelody = (m: Melody) =>
  JSON.stringify({ v: 1, i: m.i, n: m.n.slice(0, MEL_MAX_NOTES).map(([k, a, l]) => [Math.round(k), Math.round(a), Math.round(l)]) });

/** a message's melody, or null when it has none or it is broken */
export const decodeMelody = (s: string | undefined | null): Melody | null => {
  if (!s) return null;
  try {
    const d = JSON.parse(s);
    if (!d || !Array.isArray(d.n)) return null;
    const n = (d.n as unknown[])
      .filter((x): x is number[] => Array.isArray(x) && x.length === 3 && x.every(v => typeof v === 'number' && Number.isFinite(v)))
      .map(([k, a, l]) => [Math.max(12, Math.min(120, k)), Math.max(0, a), Math.max(30, Math.min(20_000, l))] as MelNote)
      .slice(0, MEL_MAX_NOTES)
      .sort((x, y) => x[1] - y[1]);
    if (!n.length) return null;
    return { i: INSTR_IDS.includes(d.i) ? d.i : 'piano', n };
  } catch { return null; }
};

/** the melody begins at its first note (the silence before it dropped) */
export const trimMelody = (m: Melody): Melody => {
  if (!m.n.length) return m;
  const t0 = Math.min(...m.n.map(x => x[1]));
  return { ...m, n: m.n.map(([k, a, l]) => [k, a - t0, l] as MelNote).sort((x, y) => x[1] - y[1]) };
};

/** a note as it sounds: key, start and length in seconds */
export interface Sounding { midi: number; at: number; len: number; idx: number }

/** the melody moved by `tone` semitones and played at `speed` (2 = twice as fast) */
export const shapeMelody = (m: Melody, tone = 0, speed = 1): Sounding[] =>
  m.n.map(([k, a, l], idx) => ({ midi: k + tone, at: a / 1000 / speed, len: Math.max(0.05, l / 1000 / speed), idx }));

/** how long the shaped notes sound (s) */
export const soundingSeconds = (notes: Sounding[]) => notes.reduce((e, x) => Math.max(e, x.at + x.len), 0);

/** the notes from `from` to `to` (indices, both in), started at 0 */
export const partOf = (notes: Sounding[], from: number, to: number): Sounding[] => {
  const part = notes.slice(Math.max(0, from), Math.max(from, to) + 1);
  const t0 = part[0]?.at ?? 0;
  return part.map(x => ({ ...x, at: x.at - t0 }));
};

/** the melody baked into its tone and pace (what is sent: the receiver's 0 / 100% = what the sender chose) */
export const bakeMelody = (m: Melody, tone: number, speed: number): Melody => ({
  i: m.i,
  n: m.n.map(([k, a, l]) => [k + tone, Math.round(a / speed), Math.max(30, Math.round(l / speed))] as MelNote),
});

/** the keys a melody needs, widened to whole octaves (C … B), at least two */
export const keyRangeOf = (notes: { midi: number }[], fallback: [number, number] = [48, 84]): [number, number] => {
  if (!notes.length) return fallback;
  let lo = Math.floor(Math.min(...notes.map(x => x.midi)) / 12) * 12;
  let hi = Math.floor(Math.max(...notes.map(x => x.midi)) / 12) * 12 + 12;
  if (hi - lo < 24) hi = lo + 24;
  lo = Math.max(12, lo);
  hi = Math.min(120, hi);
  return [lo, hi];
};

// ---- the sounds (Web Audio) ----

const freqOf = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** one sounding key: `off(at)` lets it go (a piano's and a chonguri's die away by themselves too) */
export interface Voice { off: (at: number) => void }

/** a key starts sounding at `at` on `dest` */
export const voiceOn = (ctx: BaseAudioContext, dest: AudioNode, instr: Instr, midi: number, at: number, gain = 1): Voice => {
  const f = freqOf(midi);
  // `env` shapes the note's own sound; `rel` lets it go (apart, so letting go never cuts into a fading curve with a click)
  const rel = ctx.createGain();
  rel.connect(dest);
  const env = ctx.createGain();
  env.connect(rel);
  const oscs: OscillatorNode[] = [];
  const osc = (type: OscillatorType, mult: number, level: number, to: AudioNode, detune = 0) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f * mult;
    o.detune.value = detune;
    const g = ctx.createGain();
    g.gain.value = level;
    o.connect(g).connect(to);
    o.start(at);
    oscs.push(o);
    return o;
  };
  let release = 0.12;
  const level = 0.32 * gain;
  env.gain.setValueAtTime(0, at);
  if (instr === 'piano') {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(8000, f * 9), at);
    lp.frequency.exponentialRampToValueAtTime(Math.min(4000, f * 3), at + 0.6);
    lp.connect(env);
    osc('triangle', 1, 0.9, lp);
    osc('sine', 2, 0.25, lp);
    osc('sawtooth', 1, 0.08, lp, 3);
    env.gain.linearRampToValueAtTime(level * 1.2, at + 0.006);
    env.gain.exponentialRampToValueAtTime(level * 0.45, at + 0.35);
    env.gain.exponentialRampToValueAtTime(0.0008, at + 3.2);
    release = 0.18;
  } else if (instr === 'organ') {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(6000, f * 8);
    lp.connect(env);
    osc('sine', 1, 0.8, lp);
    osc('sine', 2, 0.4, lp);
    osc('sine', 3, 0.22, lp);
    osc('sine', 4, 0.12, lp);
    env.gain.linearRampToValueAtTime(level * 0.85, at + 0.03);
    release = 0.09;
  } else if (instr === 'flute') {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(5000, f * 4);
    lp.connect(env);
    const main = osc('sine', 1, 0.9, lp);
    osc('triangle', 2, 0.08, lp);
    // a soft vibrato that comes in a moment after the start
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.2;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, at);
    depth.gain.linearRampToValueAtTime(f * 0.006, at + 0.35);
    lfo.connect(depth).connect(main.frequency);
    lfo.start(at);
    oscs.push(lfo);
    env.gain.linearRampToValueAtTime(level, at + 0.07);
    release = 0.14;
  } else {
    // chonguri / panduri: a bright pluck whose brightness and loudness die away
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 1.2;
    lp.frequency.setValueAtTime(Math.min(9000, f * 12), at);
    lp.frequency.exponentialRampToValueAtTime(Math.max(200, f * 1.5), at + 0.5);
    lp.connect(env);
    osc('sawtooth', 1, 0.5, lp);
    osc('square', 1, 0.15, lp, 5);
    env.gain.linearRampToValueAtTime(level * 1.1, at + 0.004);
    env.gain.exponentialRampToValueAtTime(level * 0.3, at + 0.25);
    env.gain.exponentialRampToValueAtTime(0.0008, at + 1.8);
    release = 0.08;
  }
  let gone = false;
  return {
    off: (t: number) => {
      if (gone) return;
      gone = true;
      // never in the past (a key held long is let go now — a curve begun earlier would cut it with a click)
      const end = Math.max(t, at + 0.02, 'startRendering' in ctx ? 0 : ctx.currentTime);
      rel.gain.setValueAtTime(1, end);
      rel.gain.setTargetAtTime(0, end, release / 3);
      oscs.forEach(o => { try { o.stop(end + release * 2 + 0.05); } catch { /* already stopped */ } });
      if (!('startRendering' in ctx)) {
        window.setTimeout(() => rel.disconnect(), Math.max(0, (end - ctx.currentTime + release * 2 + 0.2) * 1000));
      }
    },
  };
};

/** the notes on a fresh offline context: one mono buffer (for the MP3) */
export const renderNotes = async (notes: Sounding[], instr: Instr, rate = 24000): Promise<AudioBuffer> => {
  const seconds = Math.min(MEL_MAX_MS / 1000, soundingSeconds(notes) + 0.9);
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(seconds * rate)), rate);
  const bus = off.createGain();
  bus.gain.value = 0.9;
  const comp = off.createDynamicsCompressor();
  bus.connect(comp).connect(off.destination);
  // voices that ring past the next one don't pile up: each note is let go at its end
  const OFFSET = 0.05;
  for (const n of notes) {
    if (n.at + OFFSET > seconds) break;
    voiceOn(off, bus, instr, n.midi, n.at + OFFSET).off(n.at + OFFSET + n.len);
  }
  const buf = await off.startRendering();
  const d = buf.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  if (peak > 0) for (let i = 0; i < d.length; i++) d[i] *= 0.9 / peak;
  return buf;
};
