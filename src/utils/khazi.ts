import { dayBefore, hash32, type HangiDay } from './hangi';
import { mulberry32, shuffle } from './otkheuli';

// „დროის ხაზი“ (2026-11-01, the plan's Georgian game №7, like Timeline): cards of events — a battle, a book, a film, a writer's
// birth — go one by one into a line ordered by time; the place is chosen first, the year shows after. A card in the wrong place
// still joins the line at its right place, marked, so the line always stands in order and teaches. The Liturgy deck orders the
// service's parts by their place in it instead of a year.

export type KhaziDeck = 'istoria' | 'adamianebi' | 'kultura' | 'tsirva';
/** the decks to choose: one of them, or the three of years mixed */
export type KhaziPick = KhaziDeck | 'all';
export const KHAZI_PICKS: KhaziPick[] = ['all', 'istoria', 'adamianebi', 'kultura', 'tsirva'];
export const PICK_LABEL: Record<KhaziPick, string> = {
  all: 'ყველაფერი', istoria: 'ისტორია', adamianebi: 'ქართველები', kultura: 'კულტურა', tsirva: 'წირვის რიგი',
};
export const DECK_LABEL: Record<KhaziDeck, string> = { istoria: 'ისტორია', adamianebi: 'ქართველები', kultura: 'კულტურა', tsirva: 'წირვის რიგი' };
export const isPick = (v: unknown): v is KhaziPick => KHAZI_PICKS.includes(v as KhaziPick);

/** a lucide icon's name; the page and the print kit draw it */
export type KhaziIcon =
  | 'swords' | 'crown' | 'book-open' | 'clapperboard' | 'music' | 'trophy' | 'graduation-cap' | 'globe' | 'trees' | 'feather'
  | 'flag' | 'train-front' | 'printer' | 'map' | 'shield' | 'rocket' | 'drama' | 'newspaper' | 'scroll-text' | 'castle' | 'grape'
  | 'mic-vocal' | 'landmark' | 'flame' | 'tram-front';

export interface KhaziCard {
  /** stable — a day's record and the print kit name it */
  id: string;
  deck: KhaziDeck;
  /** the event, short enough for a card */
  text: string;
  /** what orders the line: a year, or the part's place in the Liturgy */
  when: number;
  /** what the card's back shows: „1121“, „493–494“, „№ 7“ */
  label: string;
  /** a line more, shown once the card is placed */
  note?: string;
  icon: KhaziIcon;
}

export const deckOf = (cards: KhaziCard[], pick: KhaziPick) =>
  cards.filter(c => (pick === 'all' ? c.deck !== 'tsirva' : c.deck === pick));

// ---------- the line ----------

/** a card on the line: how it got there (null = the start card), and the team that placed it on one screen */
export interface Placed { id: string; ok: boolean | null; team?: number }

/** the line in time order; equal times keep the order they came in */
export const sortLine = (placed: Placed[], byId: (id: string) => KhaziCard | undefined): Placed[] =>
  placed.map((p, i) => ({ p, i, w: byId(p.id)?.when ?? 0 })).sort((a, b) => a.w - b.w || a.i - b.i).map(x => x.p);

/** is the gap `at` (0 = before the first, line.length = after the last) right for `card`? Equal times fit on either side. */
export const fits = (line: KhaziCard[], at: number, card: KhaziCard) =>
  at >= 0 && at <= line.length
  && (at === 0 || line[at - 1].when <= card.when)
  && (at === line.length || card.when <= line[at].when);

// ---------- deals ----------

/** at most one card of a time (two cards of one year would make either place right — fine, but a deal is clearer without) */
const distinct = (cards: KhaziCard[], n: number, maxOfDeck = n) => {
  const out: KhaziCard[] = [];
  const of: Partial<Record<KhaziDeck, number>> = {};
  for (const c of cards) {
    if (out.length >= n) break;
    if (out.some(o => o.when === c.when) || (of[c.deck] ?? 0) >= maxOfDeck) continue;
    out.push(c);
    of[c.deck] = (of[c.deck] ?? 0) + 1;
  }
  return out;
};

export const DAY_CARDS = 10;
/** the day's line for the whole school: ten cards of the three year decks, no deck more than four, no year twice */
export const dealOfDay = (cards: KhaziCard[], iso: string): KhaziCard[] =>
  distinct(shuffle(deckOf(cards, 'all'), mulberry32(hash32(`khazi|${iso}`))), DAY_CARDS, 4);

/** an endless game's order: the whole deck shuffled */
export const dealDeck = (cards: KhaziCard[], pick: KhaziPick, seed: number): KhaziCard[] =>
  shuffle(deckOf(cards, pick), mulberry32(seed));

// ---------- the day's record ----------
// HangiDay.guesses = one mark `r:<1 and 0, a placed card each>`; `won` = the line was played to its end (a streak counts days played).

export const LIVES = 3;
export const resultsOf = (d: HangiDay) => d.guesses.find(g => g.startsWith('r:'))?.slice(2).replace(/[^01]/g, '') ?? '';
export const rightOf = (res: string) => [...res].filter(c => c === '1').length;
export const finishedDay = (iso: string, res: string): HangiDay => ({ id: iso, won: true, done: true, guesses: [`r:${res}`] });

export interface KhaziStats { played: number; streak: number; perfect: number; best: number; average: number | null }
export const khaziStats = (days: Record<string, HangiDay>, today: string): KhaziStats => {
  const done = Object.values(days).filter(d => d.done);
  let streak = 0;
  let cursor = days[today]?.done ? today : dayBefore(today);
  while (days[cursor]?.done) { streak++; cursor = dayBefore(cursor); }
  const scores = done.map(d => rightOf(resultsOf(d)));
  return {
    played: done.length,
    streak,
    perfect: done.filter(d => { const r = resultsOf(d); return r.length > 0 && rightOf(r) === r.length; }).length,
    best: scores.length ? Math.max(...scores) : 0,
    average: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
  };
};

/** the result for the clipboard or the share sheet, without the cards */
export const khaziShareText = (n: number, day: HangiDay, site = 'sagandzureli.ge') => {
  const res = resultsOf(day);
  return [`დროის ხაზი №${n} · ${rightOf(res)}/${res.length}`, [...res].map(c => (c === '1' ? '🟩' : '🟥')).join(''), `საგანძურის სკოლა · ${site}`].join('\n');
};

/** one line for the games hub's row */
export const khaziMeta = (days: Record<string, HangiDay>, today: string): string | undefined => {
  const d = days[today];
  if (d?.done) { const r = resultsOf(d); return `დღეს: ${rightOf(r)}/${r.length}`; }
  const { streak } = khaziStats(days, today);
  return streak ? `სერია: ${streak} დღე` : undefined;
};
