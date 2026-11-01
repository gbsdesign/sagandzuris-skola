import { encodeMp3, makeTimeMap, renderScore, type BookScore } from '../../../utils/chantSynth';
import { VOICE_MAX_SECONDS, waveOf, type VoiceTake } from '../../../utils/voiceRecorder';

// „მესამე ხმა“ heard whole: the phone's two voices rendered from the book notes (only the section sung) and my take laid
// on them where it was sung, made one MP3 for the class chat (a voice message, as the class studio sends its mix).

const RATE = 24000;
/** the renderer's lead before the first note (chantSynth.ts renderScore) */
const LEAD = 0.1;

/** the section's own score: its notes moved to beat 0, its tempo from there on */
const subScore = (score: BookScore, from: number, to: number): BookScore => {
  const map = makeTimeMap(score.tempos);
  const b0 = map.toBeat(from);
  const b1 = map.toBeat(to);
  const before = (score.tempos.length ? score.tempos : [[0, 60] as [number, number]]).filter(([b]) => b <= b0 + 1e-6);
  const startBpm = before.length ? before[before.length - 1][1] : 60;
  const tempos: [number, number][] = [[0, startBpm], ...score.tempos.filter(([b]) => b > b0 + 1e-6 && b < b1).map(([b, bpm]) => [b - b0, bpm] as [number, number])];
  const voices = score.voices.map(list => list
    .filter(([b]) => b >= b0 - 1e-6 && b < b1 - 1e-6)
    .map(([b, d, m]) => [b - b0, Math.min(d, b1 - b), m] as [number, number, number]));
  return { ...score, tempos, dur: b1 - b0, voices };
};

const rmsOf = (data: Float32Array, from: number, to: number) => {
  let sum = 0;
  let n = 0;
  for (let i = Math.max(0, from); i < Math.min(data.length, to); i += 8) { sum += data[i] * data[i]; n++; }
  return n ? Math.sqrt(sum / n) : 0;
};

export interface MixPlan {
  score: BookScore;
  /** my voice (left out of the phone's) */
  voice: number;
  from: number;
  to: number;
  speed: number;
}

/**
 * The trio in one take: the others from the notes, my take on them (`delay` = where in my take the section begins), my
 * voice a little over the others, the whole at one level.
 */
export const trioMix = async (plan: MixPlan, take: Blob, delay: number): Promise<VoiceTake> => {
  const part = subScore(plan.score, plan.from, plan.to);
  const synth = await renderScore(part, { speed: plan.speed, transpose: 0, gains: part.voices.map((_, i) => (i === plan.voice ? 0 : 1)) });
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const probe = new Ctx();
  let voice: AudioBuffer;
  try { voice = await probe.decodeAudioData(await take.arrayBuffer()); } finally { probe.close().catch(() => undefined); }
  const seconds = Math.min(VOICE_MAX_SECONDS, (plan.to - plan.from) / plan.speed + 0.8);
  const off = new OfflineAudioContext(1, Math.ceil(seconds * RATE), RATE);
  // levels: my voice about a third louder than the two others together
  const synthRms = rmsOf(synth.getChannelData(0), Math.round(LEAD * synth.sampleRate), synth.length);
  const skip = Math.max(0, delay);
  const voiceRms = rmsOf(voice.getChannelData(0), Math.round(skip * voice.sampleRate), Math.round((skip + seconds) * voice.sampleRate));
  const voiceGain = voiceRms > 0 && synthRms > 0 ? Math.min(8, Math.max(0.2, (synthRms / voiceRms) * 1.3)) : 1;
  const a = off.createBufferSource();
  a.buffer = synth;
  a.connect(off.destination);
  a.start(0, LEAD);
  const g = off.createGain();
  g.gain.value = voiceGain;
  g.connect(off.destination);
  const b = off.createBufferSource();
  b.buffer = voice;
  b.connect(g);
  if (delay >= 0) b.start(0, delay); else b.start(-delay);
  const mix = await off.startRendering();
  const data = mix.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  if (peak > 0) for (let i = 0; i < data.length; i++) data[i] *= 0.9 / peak;
  return { mp3: await encodeMp3(mix, undefined, 48), seconds, wave: waveOf(data) };
};
