import { FOLK_REGIONS, FOLK_SONGS } from './songsData';
import { kutkhePool } from './kutkhePool';
import { LYRICS_POOL } from './lyricsPool';
import type { LyricSong } from '../utils/gagrdzele';

// „გააგრძელე!“'s songs (utils/gagrdzele.ts): the folk songs whose words data/lyricsPool.ts holds, with their title and region,
// and their whole takes (data/kutkhePool.ts) when the member may hear them — then a round plays the song's beginning first.

const OTHER: Record<string, string> = { lazeti: 'ლაზეთი', oseti: 'ოსეთი' };

let base: LyricSong[] | null = null;

export const gagrdzeleSongs = (): LyricSong[] => {
  if (!base) {
    const byId = new Map(FOLK_SONGS.map(s => [s.id, s]));
    base = LYRICS_POOL.flatMap(p => {
      const s = byId.get(p.id);
      if (!s || s.ownerOnly) return [];
      const where = FOLK_REGIONS.find(r => r.id === s.region)?.nameGe ?? OTHER[s.region];
      return [{ id: p.id, title: s.title.trim(), ...(where ? { where } : {}), lines: p.lines }];
    });
  }
  const heard = new Map(kutkhePool().map(s => [s.id, s.takes]));
  return base.map(s => (heard.has(s.id) ? { ...s, takes: heard.get(s.id) } : s));
};
