// Web Worker: mono Float32 samples -> MP3 chunks (lamejs), so encoding never freezes the page
import { Mp3Encoder } from '@breezystack/lamejs';

interface Job { samples: Float32Array; sampleRate: number; kbps: number }

const scope = self as unknown as {
  onmessage: (e: MessageEvent<Job>) => void;
  postMessage: (msg: unknown) => void;
};

scope.onmessage = e => {
  const { samples, sampleRate, kbps } = e.data;
  // normalise to about -1 dBFS, so a single voice is as loud as the full mix
  let peak = 0;
  for (let i = 0; i < samples.length; i++) { const a = Math.abs(samples[i]); if (a > peak) peak = a; }
  const k = peak > 0 ? 0.89 / peak : 1;

  const encoder = new Mp3Encoder(1, sampleRate, kbps);
  const chunks: Uint8Array[] = [];
  const BLOCK = 1152 * 32;
  const pcm = new Int16Array(BLOCK);
  for (let i = 0, n = 0; i < samples.length; i += BLOCK, n++) {
    const len = Math.min(BLOCK, samples.length - i);
    for (let j = 0; j < len; j++) {
      const v = samples[i + j] * k;
      pcm[j] = v <= -1 ? -32768 : v >= 1 ? 32767 : Math.round(v * 32767);
    }
    const out = encoder.encodeBuffer(pcm.subarray(0, len));
    if (out.length) chunks.push(new Uint8Array(out));
    if (n % 16 === 0) scope.postMessage({ progress: i / samples.length });
  }
  const tail = encoder.flush();
  if (tail.length) chunks.push(new Uint8Array(tail));
  scope.postMessage({ chunks });
};
