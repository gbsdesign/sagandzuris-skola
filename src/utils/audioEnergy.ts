import { getAudioArrayBufferFromIdb } from './audioIdb';

// How loud a recording is every `hop` seconds (the learning mode cuts a song where the singers breathe). The voices of
// a song recorded apart are added up. Decoded at a low rate: only the loudness matters.

const RATE = 8000;
const HOP = 0.1;

const bytesOf = async (url: string): Promise<ArrayBuffer> => {
  const saved = await getAudioArrayBufferFromIdb(url).catch(() => null);
  if (saved) return saved.slice(0);
  // a fetch carries the site's Origin, which the audio Worker wants
  const res = await fetch(url);
  if (!res.ok) throw new Error(`audio ${res.status}`);
  return res.arrayBuffer();
};

export const loudnessOf = async (urls: string[]): Promise<{ energy: Float32Array; hop: number; seconds: number }> => {
  const Offline = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!Offline) throw new Error('no audio decoding');
  const buffers = await Promise.all(urls.map(async url => new Offline(1, 1, RATE).decodeAudioData(await bytesOf(url))));
  const seconds = Math.max(...buffers.map(b => b.duration));
  const step = Math.round(RATE * HOP);
  const energy = new Float32Array(Math.ceil((seconds * RATE) / step));
  for (const b of buffers) {
    for (let ch = 0; ch < b.numberOfChannels; ch++) {
      const data = b.getChannelData(ch);
      for (let i = 0; i < energy.length; i++) {
        let sum = 0;
        const end = Math.min(data.length, (i + 1) * step);
        for (let j = i * step; j < end; j++) sum += data[j] * data[j];
        energy[i] += Math.sqrt(sum / step);
      }
    }
  }
  return { energy, hop: HOP, seconds };
};
