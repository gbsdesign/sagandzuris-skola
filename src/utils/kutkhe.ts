import type { MapRegionId } from '../data/songsData';
import type { RoundAnswer, RoundRules } from './roundGames';

// „საიდანაა სიმღერა?“ (2026-10-31, the tender's №17, like GeoGuessr): a piece of a folk song from the school's archive
// plays, and each one puts it on Georgia's map — the region it comes from. The right region earns the most, a region next
// to it a part, and the quicker the more. One round of the round games (utils/roundGames.ts); the pool of recordings is
// data/kutkhePool.ts, the screens pages/games/kutkhe/. Kept free of the songs' data, since the room's store (and so this
// file) is in the app's first bundle.

/** the map's regions in the songs map's order (data/songsData.ts FOLK_REGIONS); an answer is an index of this list */
export const KUTKHE_REGIONS: readonly MapRegionId[] = [
  'abkhazeti', 'svaneti', 'samegrelo', 'racha', 'imereti', 'guria', 'achara',
  'samtskhe', 'shidakartli', 'kvemokartli', 'mtianeti', 'kakheti', 'kalakuri',
];

/** the regions that share a border on the map (ქალაქური = Tbilisi, between its three neighbours) */
export const KUTKHE_NEAR: Record<MapRegionId, readonly MapRegionId[]> = {
  abkhazeti: ['samegrelo', 'svaneti'],
  svaneti: ['abkhazeti', 'samegrelo', 'racha'],
  samegrelo: ['abkhazeti', 'svaneti', 'racha', 'imereti', 'guria'],
  racha: ['svaneti', 'samegrelo', 'imereti', 'shidakartli'],
  imereti: ['samegrelo', 'racha', 'shidakartli', 'samtskhe', 'guria'],
  guria: ['samegrelo', 'imereti', 'samtskhe', 'achara'],
  achara: ['guria', 'samtskhe'],
  samtskhe: ['achara', 'guria', 'imereti', 'shidakartli', 'kvemokartli'],
  shidakartli: ['racha', 'imereti', 'samtskhe', 'kvemokartli', 'mtianeti'],
  kvemokartli: ['samtskhe', 'shidakartli', 'mtianeti', 'kalakuri', 'kakheti'],
  mtianeti: ['shidakartli', 'kvemokartli', 'kalakuri', 'kakheti'],
  kakheti: ['mtianeti', 'kvemokartli', 'kalakuri'],
  kalakuri: ['mtianeti', 'kvemokartli', 'kakheti'],
};

export const isNear = (a: number, b: number) => {
  const ra = KUTKHE_REGIONS[a], rb = KUTKHE_REGIONS[b];
  return !!ra && !!rb && KUTKHE_NEAR[ra].includes(rb);
};

/** one round: a recording to place on the map */
export interface KutkheQ {
  kind: 'kutkhe';
  /** the recording in the pool */
  id: string;
  url: string;
  /** where the piece starts: a share of the recording's length (each phone plays the same piece) */
  from: number;
  song: string;
  /** the right answer, an index of KUTKHE_REGIONS */
  region: number;
  /** the village or the land, as the archive names it */
  place?: string;
  /** who sings */
  who?: string;
}

/** the time to answer, and how long the piece plays */
export const KUTKHE_SECONDS = 40;
export const KUTKHE_CLIP = 30;
export const KUTKHE_TOP = 1000;
export const KUTKHE_NEAR_TOP = 400;

/** the right region 700–1000, a neighbour 300–400: the quicker, the more */
export const kutkhePoints = (q: Pick<KutkheQ, 'region'>, a: Pick<RoundAnswer, 'pick' | 'ms'>, limitMs: number) => {
  const late = limitMs > 0 ? Math.min(1, Math.max(0, a.ms / limitMs)) : 1;
  if (a.pick === q.region) return Math.round(KUTKHE_TOP - 300 * late);
  if (isNear(q.region, a.pick)) return Math.round(KUTKHE_NEAR_TOP - 100 * late);
  return 0;
};

const isRegion = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < KUTKHE_REGIONS.length;
const text = (v: unknown, max = 200) => typeof v === 'string' && v.length > 0 && v.length <= max;

export const KUTKHE_RULES: RoundRules<KutkheQ> = {
  steps: () => 1,
  seconds: () => KUTKHE_SECONDS,
  ok: (_, pick) => isRegion(pick),
  points: kutkhePoints,
  secret: ['id', 'song', 'region', 'place', 'who'],
  valid: (q): q is KutkheQ => {
    const o = q as Partial<KutkheQ>;
    return o.kind === 'kutkhe' && text(o.id) && text(o.url, 400) && text(o.song) && isRegion(o.region)
      && typeof o.from === 'number' && o.from >= 0 && o.from < 1
      && (o.place === undefined || text(o.place)) && (o.who === undefined || text(o.who));
  },
};

/** the one-phone game: the host marks what each team named */
export const KUTKHE_MARKS = [
  { points: 2, label: 'კუთხე' },
  { points: 1, label: 'მეზობელი' },
  { points: 0, label: 'ვერა' },
] as const;

/** a piece's start in seconds: the share asked for, as long as the piece fits before the end (a short take from 0) */
export const clipStart = (duration: number, from: number, clip = KUTKHE_CLIP) => {
  if (!Number.isFinite(duration) || duration < clip + 15) return 0;
  return Math.max(0, Math.min(duration - clip - 5, Math.floor(duration * Math.min(0.95, Math.max(0, from)))));
};

// ——— a game's rounds from the pool (data/kutkhePool.ts builds it from the songs)

export interface KutkheTake { id: string; url: string; who?: string }
export interface KutkheSong { id: string; song: string; region: number; place?: string; takes: KutkheTake[] }

/** a region is asked once it has this many songs (one with a song or two would come back again and again) */
export const KUTKHE_MIN_SONGS = 3;

/** a game's rounds: a different song each, its region drawn at random among the regions with songs enough — never the
 *  same region twice running, so nobody can count them off; the songs not asked lately on this phone (`seen`) first */
export const drawKutkhe = (pool: KutkheSong[], count: number, seen: readonly string[] = [], rnd: () => number = Math.random): KutkheQ[] => {
  const byRegion = new Map<number, KutkheSong[]>();
  for (const s of pool) if (s.takes.length) byRegion.set(s.region, [...(byRegion.get(s.region) ?? []), s]);
  const regions = [...byRegion].filter(([, l]) => l.length >= KUTKHE_MIN_SONGS).map(([r]) => r);
  const old = new Set(seen);
  const used = new Set<string>();
  const out: KutkheQ[] = [];
  let last = -1;
  for (let i = 0; i < count; i++) {
    const left = (r: number) => byRegion.get(r)!.filter(s => !used.has(s.id));
    const open = regions.filter(r => (r !== last || regions.length === 1) && left(r).length);
    if (!open.length) break;
    const region = open[Math.floor(rnd() * open.length)];
    const songs = left(region);
    const fresh = songs.filter(s => !old.has(s.id));
    const list = fresh.length ? fresh : songs;
    const song = list[Math.floor(rnd() * list.length)];
    const take = song.takes[Math.floor(rnd() * song.takes.length)];
    used.add(song.id);
    last = region;
    out.push({
      kind: 'kutkhe', id: `${song.id}|${take.id}`.slice(0, 200), url: take.url, from: Math.round((0.05 + rnd() * 0.5) * 100) / 100,
      song: song.song, region, ...(song.place ? { place: song.place } : {}), ...(take.who ? { who: take.who } : {}),
    });
  }
  return out;
};

/** a song's id from its round (the phone remembers the songs it asked) */
export const kutkheSongOf = (q: Pick<KutkheQ, 'id'>) => q.id.split('|')[0];
