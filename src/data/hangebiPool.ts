import { kutkhePool } from './kutkhePool';
import { hangebiWordPuzzles } from './hangebiWords';
import { HANGEBI_WORDS, type HangebiPuzzle } from '../utils/hangebi';

// „ოთხი ჰანგი, ერთი სიტყვა“'s puzzles (utils/hangebi.ts): by word (data/hangebiWords.ts) and, when the member may hear the
// recordings, by ear — a region with four songs or more that have a whole take (data/kutkhePool.ts, „საიდანაა სიმღერა?“'s):
// four pieces of its songs, the answer its name.

export const hangebiEar = (): HangebiPuzzle[] => {
  const byRegion = new Map<number, { title: string; takes: { url: string }[] }[]>();
  for (const s of kutkhePool()) (byRegion.get(s.region) ?? byRegion.set(s.region, []).get(s.region)!).push({ title: s.song, takes: s.takes });
  return [...byRegion].filter(([, songs]) => songs.length >= 4).map(([region, songs]) => ({
    id: `e:${region}`, level: 'ear' as const, answer: HANGEBI_WORDS[region], songs,
  }));
};

export const hangebiPuzzles = (): HangebiPuzzle[] => [...hangebiWordPuzzles(), ...hangebiEar()];
