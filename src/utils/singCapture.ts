// The microphone while a member sings a pearl's phrase: the pitch every 40 ms for the live mirror and the score,
// and the take itself (MP3) for the teacher and the AI teacher. One stream feeds both.
import { detectPitch, freqToMidi } from './pitch';
import { pickMime, toMp3 } from './voiceRecorder';

export interface SingTake { frames: { t: number; midi: number | null }[]; mp3: Blob | null; seconds: number }
export interface SingSession { stop: () => Promise<SingTake>; cancel: () => void }

export const singingSupported = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window.AudioContext !== 'undefined';

// iPhone (Safari 16.4+): with the microphone on, sound goes to the quiet ear speaker and may stay there after it
// is off, so „მოსმენა“ grew faint after singing. The audio session is set for recording only while singing.
const setAudioSession = (type: 'play-and-record' | 'auto') => {
  const s = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (s) try { s.type = type; } catch { /* not supported */ }
};

/** Asks for the microphone and starts listening; throws if the member refuses access. */
export const startSinging = async (onPitch: (midi: number | null, t: number) => void): Promise<SingSession> => {
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
  const frames: SingTake['frames'] = [];
  const t0 = performance.now();
  const timer = window.setInterval(() => {
    analyser.getFloatTimeDomainData(buf);
    const f = detectPitch(buf, ctx.sampleRate);
    const midi = f ? freqToMidi(f) : null;
    const t = performance.now() - t0;
    frames.push({ t, midi });
    onPitch(midi, t);
  }, 40);

  let rec: MediaRecorder | null = null;
  const chunks: Blob[] = [];
  if (typeof MediaRecorder !== 'undefined') {
    try {
      const mime = pickMime();
      rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.start(1000);
    } catch { rec = null; }
  }
  const release = () => {
    window.clearInterval(timer);
    stream.getTracks().forEach(t => t.stop());
    ctx.close().catch(() => undefined);
    setAudioSession('auto');
  };

  return {
    stop: () => new Promise<SingTake>(resolve => {
      const seconds = (performance.now() - t0) / 1000;
      const done = (mp3: Blob | null) => resolve({ frames, mp3, seconds });
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
