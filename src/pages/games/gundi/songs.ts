import { useEffect, useState } from 'react';
import { SONG_BOOK, SONG_ITEMS } from '../../../data/songBookChants';
import { loadBookScore, type BookScore } from '../../../utils/chantSynth';
import { bpmAt, loopsOf, ROLES, type GundiLoop, type Role } from '../../../utils/gundi';
import type { Phrase } from './engine';

// „ჩემი გუნდი“'s songs: the admission program's folk songs printed with notes (data/songBookChants.ts) — their book notes
// are what the stage sings. 9 and 10 are pictures only (no notes the synthesizer can play).

const PICTURES_ONLY = [9, 10];

export interface GundiSong { num: number; title: string; region: string }
export const GUNDI_SONGS: GundiSong[] = SONG_ITEMS
  .filter(it => it.notes && !PICTURES_ONLY.includes(it.notes))
  .map(it => ({ num: it.notes!, title: it.title, region: it.sub.split(' · ')[0] }));
export const SONG_NUMS = GUNDI_SONGS.map(s => s.num);
export const songOf = (num: number) => GUNDI_SONGS.find(s => s.num === num) ?? GUNDI_SONGS[0];

export interface LoadedSong { score: BookScore; loops: GundiLoop[] }

/** a song's notes and the phrases of it that loop (null while loading) */
export const useSong = (num: number) => {
  const [loaded, setLoaded] = useState<{ num: number; song: LoadedSong } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    setFailed(false);
    loadBookScore(num, SONG_BOOK).then(score => {
      if (live) setLoaded({ num, song: { score, loops: loopsOf(score) } });
    }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [num]);
  return { song: loaded?.num === num ? loaded.song : null, failed };
};

/** a phrase of a loaded song at a speed */
export const phraseOf = (song: LoadedSong, loop: number, speed: number): Phrase | null => {
  const l = song.loops[Math.min(loop, song.loops.length - 1)];
  return l ? { loop: l, bpm: bpmAt(song.score, l.a), speed } : null;
};

/** a phrase's length in seconds at a speed */
export const phraseSeconds = (song: LoadedSong, l: GundiLoop, speed: number) => (l.beats * 60) / (bpmAt(song.score, l.a) * speed);

/** the lines of the book a phrase is printed on */
export const systemsOf = (score: BookScore, l: GundiLoop) =>
  score.sys.map((s, k) => [s, k] as const).filter(([s]) => s[5] < l.b - 1e-6 && s[6] > l.a + 1e-6).map(([, k]) => k);

/** each singer's first note in a phrase (for the class's start) */
export const firstsOf = (l: GundiLoop) => [0, 1, 2].map(v => l.lines[v]?.[0]?.midi ?? null);

/** a record of every role → value */
export const byRole = <T>(f: (r: Role) => T) => Object.fromEntries(ROLES.map(r => [r, f(r)])) as Record<Role, T>;
