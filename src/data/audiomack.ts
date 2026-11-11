import { useEffect, useState } from 'react';
import { AUDIO_PROXY } from './chantMediaRegistry';
import { audiomackEmbedUrl } from './folkCentre';

// The Folklore Centre's recordings play from Audiomack (2026-11-11, the user: „ყველა სიმღერა … აუდიო მაკიდან მიამაგრე …
// დრაივიდან … მხოლოდ ოფლაინ რეჟიმისთვის … და ჩამოტვირთვისასაც“): a Drive file the school keeps has its Audiomack twin in
// public/centre/am/<n>.json (n = the char code of the id's last character), made by scripts/audiomack/. Listening online goes
// through Audiomack's player; the Drive copy stays for the learning mode, the offline copy and the MP3. A file with no sure
// twin keeps playing from the Drive.

type Shard = Record<string, string>;
const shards = new Map<number, Promise<Shard>>();
const loaded = new Map<number, Shard>();

const shardOf = (id: string) => id.charCodeAt(id.length - 1);

const loadShard = (n: number): Promise<Shard> => {
  let p = shards.get(n);
  if (!p) {
    p = fetch(`/centre/am/${n}.json`)
      .then(r => (r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : {}))
      .catch(() => ({}))
      .then((d: Shard) => { loaded.set(n, d); return d; });
    shards.set(n, p);
  }
  return p;
};

/** The Drive file id inside a player address (the audio Worker's or Drive's own), else '' */
export const driveIdOf = (url?: string): string => {
  if (!url) return '';
  if (url.startsWith(`${AUDIO_PROXY}/`)) return url.slice(AUDIO_PROXY.length + 1).split(/[?#]/)[0];
  const m = url.match(/[?&]id=([\w-]{20,})/) || url.match(/\/d\/([\w-]{20,})/);
  return m ? m[1] : '';
};

const known = (ids: string[]) => ids.every(id => loaded.has(shardOf(id)));
const lookup = (ids: string[]) => ids.map(id => (id ? loaded.get(shardOf(id))?.[id] : undefined));

/** The Audiomack slugs of these Drive files (undefined where there is none); null while they load */
export const useAudiomack = (ids: string[]): (string | undefined)[] | null => {
  const real = ids.filter(Boolean);
  const key = real.join('|');
  const [, tick] = useState(0);
  useEffect(() => {
    if (known(real)) return;
    let live = true;
    Promise.all([...new Set(real.map(shardOf))].map(loadShard)).then(() => { if (live) tick(t => t + 1); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return known(real) ? lookup(ids) : null;
};

/** Audiomack's own player for one song */
export const audiomackSongEmbed = (slug: string) => audiomackEmbedUrl(`folkcentre/song/${slug}`);

/** Whether the phone is online now (the player falls back to the Drive copy without the internet) */
export const useOnline = () => {
  const [on, setOn] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
  useEffect(() => {
    const up = () => setOn(true);
    const down = () => setOn(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return on;
};
