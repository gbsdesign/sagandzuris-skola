// Voice messages: records the microphone and turns the take into a small MP3 (mono, 24 kHz, 48 kbps),
// so a message recorded on Android plays on an iPhone and the other way round.
import { encodeMp3 } from './chantSynth';

export const VOICE_MAX_SECONDS = 300;
const RATE = 24000;
const KBPS = 48;

export interface VoiceTake {
  mp3: Blob;
  seconds: number;
  wave: string; // WAVE_BARS digits 0-9: loudness along the take, drawn as the message's waveform
}

export const WAVE_BARS = 40;

const waveOf = (samples: Float32Array) => {
  const size = Math.max(1, Math.floor(samples.length / WAVE_BARS));
  const rms = Array.from({ length: WAVE_BARS }, (_, b) => {
    let sum = 0;
    for (let i = b * size; i < Math.min(samples.length, (b + 1) * size); i++) sum += samples[i] * samples[i];
    return Math.sqrt(sum / size);
  });
  const top = Math.max(...rms) || 1;
  return rms.map(v => Math.round((v / top) * 9)).join('');
};

export interface VoiceRecording {
  stop: () => Promise<VoiceTake>;
  cancel: () => void;
}

export const voiceRecordingSupported = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

const pickMime = () =>
  ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm']
    .find(t => MediaRecorder.isTypeSupported?.(t)) || '';

// recorder output (webm / mp4 / ogg, whatever the browser makes) -> mono 24 kHz MP3
const toMp3 = async (blob: Blob): Promise<VoiceTake> => {
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx: AudioContext = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * RATE)), RATE);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    const mono = await offline.startRendering();
    const wave = waveOf(mono.getChannelData(0));
    return { mp3: await encodeMp3(mono, undefined, KBPS), seconds: decoded.duration, wave };
  } finally {
    ctx.close?.();
  }
};

/** Asks for the microphone and starts recording; throws if the user refuses access. */
export const startVoiceRecording = async (): Promise<VoiceRecording> => {
  // no echo/noise processing: it chops sustained sung notes, and students send chant here
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.start(1000);
  const release = () => stream.getTracks().forEach(t => t.stop());

  return {
    stop: () =>
      new Promise<VoiceTake>((resolve, reject) => {
        rec.onstop = () => {
          release();
          toMp3(new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' })).then(resolve, reject);
        };
        rec.stop();
      }),
    cancel: () => {
      rec.onstop = null;
      if (rec.state !== 'inactive') rec.stop();
      release();
    },
  };
};
