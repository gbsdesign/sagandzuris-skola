// The microphone while a member sings: the pitch every 40 ms for the live mirror and the score, and the take itself
// (MP3) for the teacher and the AI teacher. One stream feeds both. Every singing part of the app listens through here.
// With the new ear (utils/ear.ts; its switch `newEar` — utils/earChoice.ts) each look is kept in the voice's octave as
// it comes and the whole take is tidied on `stop`; without it the first ear listens as before.
import { cleanFrames, earFollower, hearPitch } from './ear';
import { oldDetectPitch } from './earOld';
import { newEarOn } from './earChoice';
import { freqToMidi } from './pitch';
import { pickMime, toMp3 } from './voiceRecorder';
import { singingOnOthersPage } from './othersPage';
import { holdUpdates, holdUpdatesFor } from './appUpdate';

/** one look at the microphone: ms since the start, the sung note (null: no voice) and the loudness (RMS) */
export interface SingFrame { t: number; midi: number | null; rms: number }
export interface SingTake { frames: SingFrame[]; mp3: Blob | null; seconds: number }
/** `frames` grows while listening (an exercise's score reads it round by round); `t0` is its performance.now() zero */
export interface SingSession { stop: () => Promise<SingTake>; cancel: () => void; frames: SingFrame[]; t0: number }

export { singingOnOthersPage } from './othersPage';

/** A copy of a session's looks so far, tidied as `stop` tidies them — for the parts that read `frames` without stopping. */
export const tidyFrames = <F extends { t: number; midi: number | null }>(frames: F[]): F[] =>
  (newEarOn() ? cleanFrames(frames) : [...frames]);

export const singingSupported = () =>
  !singingOnOthersPage()
  && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window.AudioContext !== 'undefined';

// iPhone (Safari 16.4+): with the microphone on, sound goes to the quiet ear speaker and may stay there after it
// is off, so „მოსმენა“ grew faint after singing. The audio session is set for recording only while singing.
const setAudioSession = (type: 'play-and-record' | 'auto') => {
  const s = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (s) try { s.type = type; } catch { /* not supported */ }
};

/** `tap` gets each look's raw sound (the same buffer every time — read it at once); `newEar` asks for the new ear
 *  whatever the switch says; `record: false` keeps no MP3, so `stop` answers at once — all three are the trial page's. */
export interface SingOptions {
  tap?: (buf: Float32Array, sampleRate: number, t: number) => void;
  newEar?: boolean;
  record?: boolean;
}

/** Asks for the microphone and starts listening; throws if the member refuses access. */
export const startSinging = async (
  onPitch: (midi: number | null, t: number) => void, everyMs = 40, o: SingOptions = {},
): Promise<SingSession> => {
  setAudioSession('play-and-record');
  // no echo/noise processing: it chops sustained sung notes
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  }).catch(e => { setAudioSession('auto'); throw e; });
  const ctx = new AudioContext();
  if (ctx.state !== 'running') await ctx.resume().catch(() => undefined);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  const frames: SingFrame[] = [];
  const t0 = performance.now();
  // the ear is chosen once a take
  const fresh = o.newEar ?? newEarOn();
  const follow = earFollower();
  const timer = window.setInterval(() => {
    analyser.getFloatTimeDomainData(buf);
    const t = performance.now() - t0;
    let midi: number | null;
    if (fresh) midi = follow(hearPitch(buf, ctx.sampleRate), t);
    else { const f = oldDetectPitch(buf, ctx.sampleRate); midi = f ? freqToMidi(f) : null; }
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    frames.push({ t, midi, rms: Math.sqrt(sum / buf.length) });
    o.tap?.(buf, ctx.sampleRate, t);
    onPitch(midi, t);
  }, everyMs);

  let rec: MediaRecorder | null = null;
  const chunks: Blob[] = [];
  if (o.record !== false && typeof MediaRecorder !== 'undefined') {
    try {
      const mime = pickMime();
      rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.start(1000);
    } catch { rec = null; }
  }
  // no restart for a new version while singing, nor in the minute after: the take waits to be heard and sent
  holdUpdates('sing', true);
  const release = () => {
    holdUpdatesFor('sing', 60_000);
    holdUpdates('sing', false);
    window.clearInterval(timer);
    stream.getTracks().forEach(t => t.stop());
    ctx.close().catch(() => undefined);
    setAudioSession('auto');
  };

  return {
    frames,
    t0,
    stop: () => new Promise<SingTake>(resolve => {
      const seconds = (performance.now() - t0) / 1000;
      // in hindsight: a short octave slip, a stray look and a tiny gap are mended before anything is scored
      const done = (mp3: Blob | null) => resolve({ frames: fresh ? cleanFrames(frames) : frames, mp3, seconds });
      window.clearInterval(timer);
      if (!rec || rec.state === 'inactive') { release(); done(null); return; }
      rec.onstop = () => {
        release();
        // the score does not wait on the MP3: a take that cannot be turned into one is simply not kept
        toMp3(new Blob(chunks, { type: rec!.mimeType || 'audio/webm' })).then(t => done(t.mp3), () => done(null));
      };
      rec.stop();
    }),
    cancel: () => {
      if (rec) { rec.onstop = null; if (rec.state !== 'inactive') rec.stop(); }
      release();
    },
  };
};
