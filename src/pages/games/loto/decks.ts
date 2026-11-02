import { knownChants } from '../../../data/chantGamePool';
import { PLAIN_OPENINGS } from '../../../data/lotoKit';
import { kutkhePool } from '../../../data/kutkhePool';
import { nameKey } from '../../../utils/chantRounds';
import { KUTKHE_REGIONS, type KutkheSong } from '../../../utils/kutkhe';
import { CARD_SIZE, LOTO_ROUNDS, shuffled, type LotoDeck, type LotoPiece } from '../../../utils/loto';
import { regionName } from '../kutkhe/KutkheMap';

// „საგალობო ლოტო“'s decks, made from the app's own pieces: the well-known chants (data/chantGamePool.ts — the pearls' nameable
// ones and the class's program, its own first) on the synthesizer from their book notes; the folk songs recorded most (the
// best known), one take each; or the songs map's regions, each with one of its songs. The recordings' decks only while the
// recordings are open for this member (data/kutkhePool.ts is empty otherwise).

export interface Deck { names: string[]; pieces: LotoPiece[] }

export const DECK_LABEL: Record<LotoDeck, string> = { chants: 'საგალობლები', songs: 'ხალხური სიმღერები', regions: 'კუთხეები' };
export const DECK_HINT: Record<LotoDeck, string> = {
  chants: 'ცნობილი საგალობლების დასაწყისი, სამივე ხმით, წიგნის ნოტებით — კლასის სასწავლო პროგრამისა პირველად.',
  songs: 'ყველაზე ხშირად ჩაწერილი ხალხური სიმღერები, არქივის ჩანაწერებიდან.',
  regions: 'ბარათზე კუთხეებია: სიმღერა ჟღერს, შენ მისი კუთხე უნდა მონიშნო.',
};

/** the songs that make a deck: the most recorded, one of a title */
const SONG_TOP = 40;
const round2 = (x: number) => Math.round(x * 100) / 100;
const takeOf = (s: KutkheSong, rnd: () => number) => s.takes[Math.floor(rnd() * s.takes.length)];
const fromOf = (rnd: () => number) => round2(0.1 + rnd() * 0.35);
const byTakes = (list: KutkheSong[]) => [...list].sort((a, b) => b.takes.length - a.takes.length);

/** the decks this member can play (the recordings' ones need the recordings) */
export const openDecks = (): LotoDeck[] => (kutkhePool().length ? ['chants', 'songs', 'regions'] : ['chants']);

export const chantDeck = (size: number, program: readonly string[] = [], rnd: () => number = Math.random): Deck | null => {
  const seen = new Set<string>();
  // a reciting tone cannot be told by its sound: those chants stay out (a melodic version of the same name stays in)
  const all = knownChants(program).filter(c => {
    if (PLAIN_OPENINGS.has(c.id)) return false;
    const k = nameKey(c.title);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const mine = new Set(program);
  const list = [...shuffled(all.filter(c => mine.has(c.id)), rnd), ...shuffled(all.filter(c => !mine.has(c.id)), rnd)].slice(0, size);
  if (list.length < Math.min(size, CARD_SIZE + 1)) return null;
  return { names: list.map(c => c.title), pieces: list.map(c => ({ id: c.id, book: c.book, num: c.num, service: c.service })) };
};

export const songDeck = (size: number, rnd: () => number = Math.random): Deck | null => {
  const seen = new Set<string>();
  const top = byTakes(kutkhePool()).filter(s => { const k = nameKey(s.song); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, SONG_TOP);
  const list = shuffled(top, rnd).slice(0, size);
  if (list.length < Math.min(size, CARD_SIZE + 1)) return null;
  return {
    names: list.map(s => s.song),
    pieces: list.map(s => {
      const t = takeOf(s, rnd);
      const place = [regionName(s.region), s.place].filter(Boolean).join(' · ');
      return { id: `${s.id}|${t.id}`.slice(0, 200), url: t.url, from: fromOf(rnd), ...(place ? { place } : {}), ...(t.who ? { who: t.who } : {}) };
    }),
  };
};

/** every region with songs, each with one of its better-known songs */
export const regionDeck = (rnd: () => number = Math.random): Deck | null => {
  const by = new Map<number, KutkheSong[]>();
  for (const s of kutkhePool()) by.set(s.region, [...(by.get(s.region) ?? []), s]);
  const regions = KUTKHE_REGIONS.map((_, i) => i).filter(i => by.has(i));
  if (regions.length < CARD_SIZE + 1) return null;
  return {
    names: regions.map(regionName),
    pieces: regions.map(r => {
      const songs = byTakes(by.get(r)!).slice(0, 8);
      const s = songs[Math.floor(rnd() * songs.length)];
      const t = takeOf(s, rnd);
      return { id: `${s.id}|${t.id}`.slice(0, 200), url: t.url, from: fromOf(rnd), song: s.song, ...(s.place ? { place: s.place } : {}), ...(t.who ? { who: t.who } : {}) };
    }),
  };
};

/** a deck of a kind: the room's and the solo game's thirteen (a region's deck: every region with songs) */
export const makeDeck = (deck: LotoDeck, size = LOTO_ROUNDS, program: readonly string[] = [], rnd: () => number = Math.random): Deck | null =>
  deck === 'songs' ? songDeck(size, rnd) : deck === 'regions' ? regionDeck(rnd) : chantDeck(size, program, rnd);
