import { KUTKHE_REGIONS } from './kutkhe';
import type { RoundAnswer, RoundRules } from './roundGames';

// „რუკის ვიქტორინა“ (2026-11-01, the plan's №11, like Seterra): a name — a town, a lake, a dish, a fortress, a poet — or a
// folk song's piece, and each one taps its region on the songs map's Georgia, quick: the right region earns 1000 at once,
// 500 by the time's end, any other nothing (no neighbour's part, as in „საიდანაა სიმღერა?“). A song is asked with its title
// (or by its tune alone, the harder level). One round of the quick games (utils/roundGames.ts); the places are
// data/rukaPlaces.ts, the songs data/kutkhePool.ts, the screens pages/games/ruka/. Kept free of the songs' data: this file
// is in the app's first bundle (the room's store).

export const RUKA_TOPICS = [
  { id: 'song', label: 'სიმღერა' },
  { id: 'town', label: 'ქალაქი და სოფელი' },
  { id: 'nature', label: 'ბუნება' },
  { id: 'food', label: 'სუფრა და ღვინო' },
  { id: 'history', label: 'ისტორია' },
  { id: 'people', label: 'ადამიანები' },
] as const;
export type RukaTopic = typeof RUKA_TOPICS[number]['id'];
const TOPIC_IDS: readonly string[] = RUKA_TOPICS.map(t => t.id);
export const isRukaTopic = (v: unknown): v is RukaTopic => typeof v === 'string' && TOPIC_IDS.includes(v);
export const rukaTopicLabel = (id: string) => RUKA_TOPICS.find(t => t.id === id)?.label ?? '';

/** one round: a name or a song to put on the map */
export interface RukaQ {
  kind: 'ruka';
  /** the place or the song (with its take) in the pool */
  id: string;
  topic: RukaTopic;
  /** what is asked, in words; none when a song is asked by its tune alone */
  ask?: string;
  /** a song's piece: the recording and the share of it the piece starts at (the same on every phone) */
  url?: string;
  from?: number;
  /** the right answer, an index of KUTKHE_REGIONS */
  region: number;
  /** the answer's card: the name (a song's title), a line on it, who sings */
  name: string;
  note?: string;
  who?: string;
}

/** a name is placed in 15 seconds, a song heard in 20 (its piece plays the whole time) */
export const RUKA_SECONDS = 15;
export const RUKA_LISTEN = 20;
export const rukaSeconds = (q: Pick<RukaQ, 'url'>) => (q.url ? RUKA_LISTEN : RUKA_SECONDS);

/** a name that gives its region away („გურული …“, „კახური …“, „თბილისის …“): such a song is asked by its tune alone, such a
 *  place is never written */
export const NAMES_A_REGION = /კახ|იმერ|გურულ|გურია|მეგრ|სვან|რაჭ|ლეჩხ|აჭარ|ქართლ|მთიულ|ფშა|ხევსურ|თუშ|აფხაზ|ქალაქურ|ქალაქო|მესხ|ჯავახ|სამცხ|ქიზიყ|დადიან|თბილის|ტფილის|ოდიშ|ხევ/;

/** the right region: 1000 at once, 500 at the last moment */
export const rukaPoints = (q: Pick<RukaQ, 'region'>, a: Pick<RoundAnswer, 'pick' | 'ms'>, limitMs: number) => {
  if (a.pick !== q.region) return 0;
  const late = limitMs > 0 ? Math.min(1, Math.max(0, a.ms / limitMs)) : 1;
  return Math.round(1000 - 500 * late);
};

const isRegion = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < KUTKHE_REGIONS.length;
const text = (v: unknown, max = 200) => typeof v === 'string' && v.length > 0 && v.length <= max;

export const RUKA_RULES: RoundRules<RukaQ> = {
  steps: () => 1,
  seconds: q => rukaSeconds(q),
  ok: (_, pick) => isRegion(pick),
  points: rukaPoints,
  secret: ['id', 'region', 'name', 'note', 'who'],
  valid: (q): q is RukaQ => {
    const o = q as Partial<RukaQ>;
    return !!o && o.kind === 'ruka' && text(o.id) && isRukaTopic(o.topic) && isRegion(o.region) && text(o.name)
      && (o.ask === undefined || text(o.ask)) && (o.note === undefined || text(o.note, 300)) && (o.who === undefined || text(o.who))
      && (o.url === undefined ? o.from === undefined && o.ask !== undefined
        : text(o.url, 400) && typeof o.from === 'number' && o.from >= 0 && o.from < 1);
  },
};

/** the one-phone game: the host marks who put it right */
export const RUKA_MARKS = [
  { points: 1, label: 'სწორი' },
  { points: 0, label: 'ვერა' },
] as const;

// ——— a game's rounds

/** what may be asked: a place, or a song (with its whole takes to hear; none — asked by its title) */
export interface RukaItem {
  id: string;
  topic: RukaTopic;
  region: number;
  name: string;
  note?: string;
  takes?: { id: string; url: string; who?: string }[];
}

export interface RukaDraw {
  items: readonly RukaItem[];
  /** the topics chosen (none: every one with something to ask) */
  topics?: readonly RukaTopic[];
  count: number;
  /** a song with takes is asked by its tune alone */
  hideTitles?: boolean;
  /** the ids asked lately on this phone: others first */
  seen?: readonly string[];
  rnd?: () => number;
}

const shuffled = <T,>(list: readonly T[], rnd: () => number) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

/** a game's rounds: the topics in turn (shuffled each time round), a different item each, the regions spread over the map
 *  (the one asked least so far comes first — a game of ten asks ten regions), never one region twice running (so nobody
 *  counts them off), the items not asked lately first */
export const drawRuka = ({ items, topics, count, hideTitles = false, seen = [], rnd = Math.random }: RukaDraw): RukaQ[] => {
  const wanted = topics && topics.length ? topics : RUKA_TOPICS.map(t => t.id);
  const byTopic = new Map<RukaTopic, RukaItem[]>();
  for (const it of items) if (wanted.includes(it.topic) && isRegion(it.region)) byTopic.set(it.topic, [...(byTopic.get(it.topic) ?? []), it]);
  const old = new Set(seen);
  const used = new Set<string>();
  const out: RukaQ[] = [];
  let order: RukaTopic[] = [];
  let last = -1;
  const asked = KUTKHE_REGIONS.map(() => 0);
  while (out.length < count) {
    const open = [...byTopic.keys()].filter(t => byTopic.get(t)!.some(it => !used.has(it.id)));
    if (!open.length) break;
    if (!order.length) order = shuffled(open, rnd);
    const topic = order.shift()!;
    if (!open.includes(topic)) continue;
    const left = byTopic.get(topic)!.filter(it => !used.has(it.id));
    const elsewhere = left.filter(it => it.region !== last);
    const near = elsewhere.length ? elsewhere : left;
    const least = Math.min(...near.map(it => asked[it.region]));
    const regions = [...new Set(near.filter(it => asked[it.region] === least).map(it => it.region))];
    const region = regions[Math.floor(rnd() * regions.length)];
    const here = near.filter(it => it.region === region);
    const fresh = here.filter(it => !old.has(it.id));
    const list = fresh.length ? fresh : here;
    const it = list[Math.floor(rnd() * list.length)];
    used.add(it.id);
    last = it.region;
    asked[it.region] += 1;
    const take = it.takes?.length ? it.takes[Math.floor(rnd() * it.takes.length)] : null;
    out.push({
      kind: 'ruka', id: (take ? `${it.id}|${take.id}` : it.id).slice(0, 200), topic: it.topic,
      ...(take && hideTitles ? {} : { ask: it.name }),
      ...(take ? { url: take.url, from: Math.round((0.05 + rnd() * 0.5) * 100) / 100 } : {}),
      region: it.region, name: it.name, ...(it.note ? { note: it.note } : {}), ...(take?.who ? { who: take.who } : {}),
    });
  }
  return out;
};

/** the item's id from its round (the phone remembers the items it asked) */
export const rukaItemOf = (q: Pick<RukaQ, 'id'>) => q.id.split('|')[0];

// ——— alone: ten in a row, the score and the time

export const RUKA_SOLO_ROUNDS = 10;

export interface RukaSoloBest { score: number; right: number; ms: number; at: string }

/** a run is better with more points, then with less time */
export const betterRun = (a: Pick<RukaSoloBest, 'score' | 'ms'>, b: Pick<RukaSoloBest, 'score' | 'ms'> | null) =>
  !b || a.score > b.score || (a.score === b.score && a.ms < b.ms);

export const parseBest = (v: unknown): RukaSoloBest | null => {
  const o = v as Partial<RukaSoloBest> | null;
  return o && Number.isInteger(o.score) && Number.isInteger(o.right) && Number.isFinite(o.ms) && typeof o.at === 'string'
    ? { score: o.score!, right: o.right!, ms: o.ms!, at: o.at } : null;
};
