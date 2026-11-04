import { CARDS, KINDS, type TKind } from '../data/takhtiCards';

// „ორი ტახტი“ — the school's own duel (rebuilt 2026-11-04; it was a copy of 7 Wonders Duel). Two kings, of the west (ქუთაისი)
// and of the east (თბილისი), meet eight times at the Likhi range, where the lands' gifts are shared: one divides, the other
// chooses. A meeting: five cards of the deck (`OFFER`) turn up; the divider splits them into two shares, each of one card at
// least (`split`: a bit a card, set = the second share); the other king takes a share, the divider gets the rest. An envoy
// in a share takes, for the one who got it, one more card (not an envoy) out of the other share — the chooser's envoys first,
// then the divider's. The roles change every meeting; after the eighth (40 of the 42 cards; two stay in the box) the courts
// are counted (`scoreOf`): a castle its points (1–3), the stronger army `ARMY_PTS` (a tie `ARMY_TIE` each), a vine with a
// vessel = one wine of `WINE_PTS`, a book as many points as the other kinds at its court. The throne goes to the higher
// total; a tie → the stronger army, then more castle points, else both. Everything lies open but the deck's order, so the
// online view (`publicOf`) only drops the deck. A move is one number (`applyPick`: the split's bits, the share 0/1, an
// envoy's card id); `botPick` is the careful move the host's phone makes for a late king.

export const SIDES = ['დასავლეთი', 'აღმოსავლეთი'] as const;
export const CAPITALS = ['ქუთაისი', 'თბილისი'] as const;
export const ROUNDS = 8;
export const OFFER = 5;
export const ARMY_PTS = 8;
export const ARMY_TIE = 4;
export const WINE_PTS = 5;
const NAME_MAX = 24;
const LINE_MAX = 40;

export type TPhase =
  | { k: 'split' }
  | { k: 'choose' }
  /** the king on turn takes `n` more cards with his envoys; then the divider his `next` */
  | { k: 'steal'; n: number; next: number }
  | { k: 'end'; winners: number[] };

export type TLine =
  | { k: 'split'; r: number; who: number; a: number[]; b: number[] }
  | { k: 'choose'; r: number; who: number; cards: number[] }
  | { k: 'steal'; r: number; who: number; card: number };

export interface TakhtiGame {
  v: 2;
  names: string[];
  /** the deck in its order — the meetings take its fives; empty in the online view */
  deck: number[];
  /** who divides at the first meeting (0 west, 1 east) */
  first: number;
  /** the meeting, from 0 (`ROUNDS` at the end) */
  round: number;
  courts: number[][];
  /** this meeting's cards */
  offer: number[];
  /** the split: bit i set = offer[i] in the second share */
  split: number;
  /** after the choice: what each king takes this meeting (the envoys move cards between them) */
  take: number[][];
  turn: number;
  phase: TPhase;
  step: number;
  log: TLine[];
}

export const keyOf = (g: TakhtiGame) => `t${g.step}`;
export const isEnvoy = (id: number) => CARDS[id]?.k === 'elchi';
export const dividerOf = (g: Pick<TakhtiGame, 'first' | 'round'>) => (g.first + g.round) % 2;
export const chooserOf = (g: Pick<TakhtiGame, 'first' | 'round'>) => 1 - dividerOf(g);
/** a split leaves a card in each share */
export const validSplit = (n: number, m: number) => Number.isInteger(m) && m >= 1 && m <= (1 << n) - 2;
/** a share of the offer: 0 the first, 1 the second */
export const shareOf = (offer: readonly number[], split: number, s: number) => offer.filter((_, i) => ((split >> i) & 1) === s);
/** meetings after this one */
export const meetingsLeft = (g: Pick<TakhtiGame, 'round'>) => Math.max(0, ROUNDS - g.round - 1);
/** cards the deck still holds, unseen (the box's two included) */
export const unseen = (g: Pick<TakhtiGame, 'round'>) => Math.max(0, CARDS.length - Math.min(ROUNDS, g.round + 1) * OFFER);

// ——— the count ———

export interface TScore {
  castle: number;
  strength: number;
  army: number;
  vines: number;
  vessels: number;
  pairs: number;
  wine: number;
  books: number;
  /** a book's points here: the court's other kinds */
  perBook: number;
  bookPts: number;
  envoys: number;
  kinds: number;
  total: number;
}

const strengthOf = (court: readonly number[]) => court.reduce((a, id) => a + (CARDS[id].k === 'lashkari' ? CARDS[id].v : 0), 0);

export const scoreOf = (courts: readonly (readonly number[])[], who: number): TScore => {
  const mine = courts[who] ?? [];
  let castle = 0, strength = 0, vines = 0, vessels = 0, books = 0, envoys = 0;
  const kinds = new Set<TKind>();
  for (const id of mine) {
    const c = CARDS[id];
    kinds.add(c.k);
    if (c.k === 'tsikhe') castle += c.v;
    else if (c.k === 'lashkari') strength += c.v;
    else if (c.k === 'ghvino') { if (c.w === 'vazi') vines++; else vessels++; }
    else if (c.k === 'tsigni') books++;
    else envoys++;
  }
  const other = strengthOf(courts[1 - who] ?? []);
  const army = strength > other ? ARMY_PTS : strength === other && strength > 0 ? ARMY_TIE : 0;
  const pairs = Math.min(vines, vessels);
  const perBook = kinds.size - (books ? 1 : 0);
  const bookPts = books * perBook;
  return { castle, strength, army, vines, vessels, pairs, wine: pairs * WINE_PTS, books, perBook, bookPts, envoys, kinds: kinds.size, total: castle + army + pairs * WINE_PTS + bookPts };
};

/** the throne's order: points, then the army's strength, then the castles' points */
export const winnersBy = (courts: readonly (readonly number[])[]) => {
  const [a, b] = [scoreOf(courts, 0), scoreOf(courts, 1)];
  const d = a.total - b.total || a.strength - b.strength || a.castle - b.castle;
  return d > 0 ? [0] : d < 0 ? [1] : [0, 1];
};
export const winnersOf = (g: TakhtiGame) => (g.phase.k === 'end' ? g.phase.winners : []);
/** the courts with this meeting's takes laid in (what the count would be now) */
export const courtsNow = (g: Pick<TakhtiGame, 'courts' | 'take'>) => [0, 1].map(i => [...g.courts[i], ...(g.take[i] ?? [])]);

// ——— the game ———

const shuffled = <T,>(list: readonly T[], rnd: () => number) => {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const newTakhti = ({ names, first, rnd }: { names: string[]; first?: number; rnd: () => number }): TakhtiGame | null => {
  if (names.length !== 2) return null;
  const deck = shuffled(CARDS.map(c => c.id), rnd);
  const f = first === 0 || first === 1 ? first : rnd() < 0.5 ? 0 : 1;
  return {
    v: 2, names: names.map(n => n.slice(0, NAME_MAX)), deck, first: f, round: 0, courts: [[], []], offer: deck.slice(0, OFFER), split: 0,
    take: [[], []], turn: f, phase: { k: 'split' }, step: 0, log: [],
  };
};

const logged = (g: TakhtiGame, line: TLine) => [...g.log, line].slice(-LINE_MAX);

const finishMeeting = (g: TakhtiGame): TakhtiGame => {
  const courts = courtsNow(g);
  const round = g.round + 1;
  if (round >= ROUNDS) return { ...g, courts, round: ROUNDS, offer: [], split: 0, take: [[], []], phase: { k: 'end', winners: winnersBy(courts) } };
  const offer = g.deck.slice(round * OFFER, round * OFFER + OFFER);
  return { ...g, courts, round, offer, split: 0, take: [[], []], turn: dividerOf({ first: g.first, round }), phase: { k: 'split' } };
};

const canSteal = (g: TakhtiGame, who: number) => (g.take[1 - who] ?? []).some(id => !isEnvoy(id));

/** `who` takes `n` cards with his envoys (when the other share has any left), then the divider his `next` */
const goSteal = (g: TakhtiGame, who: number, n: number, next: number): TakhtiGame => {
  if (n > 0 && canSteal(g, who)) return { ...g, turn: who, phase: { k: 'steal', n, next } };
  if (next > 0 && who === chooserOf(g)) return goSteal(g, dividerOf(g), next, 0);
  return finishMeeting(g);
};

const envoysIn = (cards: readonly number[]) => cards.filter(isEnvoy).length;

const doSplit = (g: TakhtiGame, m: number): TakhtiGame => {
  if (!validSplit(g.offer.length, m)) return g;
  const who = dividerOf(g);
  return { ...g, split: m, turn: chooserOf(g), phase: { k: 'choose' }, step: g.step + 1, log: logged(g, { k: 'split', r: g.round, who, a: shareOf(g.offer, m, 0), b: shareOf(g.offer, m, 1) }) };
};

const doChoose = (g: TakhtiGame, s: number): TakhtiGame => {
  if (s !== 0 && s !== 1) return g;
  const ch = chooserOf(g), dv = dividerOf(g);
  const mine = shareOf(g.offer, g.split, s), rest = shareOf(g.offer, g.split, 1 - s);
  const take: number[][] = [];
  take[ch] = mine;
  take[dv] = rest;
  const next = { ...g, take, step: g.step + 1, log: logged(g, { k: 'choose', r: g.round, who: ch, cards: mine }) };
  return goSteal(next, ch, envoysIn(mine), envoysIn(rest));
};

const moved = (take: readonly (readonly number[])[], id: number, to: number) => {
  const t = [take[0].slice(), take[1].slice()];
  t[1 - to] = t[1 - to].filter(x => x !== id);
  t[to] = [...t[to], id];
  return t;
};

const doSteal = (g: TakhtiGame, id: number): TakhtiGame => {
  const ph = g.phase;
  if (ph.k !== 'steal') return g;
  const who = g.turn;
  if (!(g.take[1 - who] ?? []).includes(id) || isEnvoy(id)) return g;
  const next = { ...g, take: moved(g.take, id, who), step: g.step + 1, log: logged(g, { k: 'steal', r: g.round, who, card: id }) };
  return goSteal(next, who, ph.n - 1, ph.next);
};

/** the move of the king on turn: a split's bits, a share (0/1), an envoy's card */
export const applyPick = (g: TakhtiGame, pick: number): TakhtiGame => {
  if (!Number.isInteger(pick)) return g;
  const k = g.phase.k;
  return k === 'split' ? doSplit(g, pick) : k === 'choose' ? doChoose(g, pick) : k === 'steal' ? doSteal(g, pick) : g;
};

/** a step's time online (0: none) */
export const TAKHTI_SECS: Record<TPhase['k'], number> = { split: 90, choose: 60, steal: 40, end: 0 };

/** the online view: everything but the deck's order */
export const publicOf = (g: TakhtiGame): TakhtiGame => ({ ...g, deck: [] });

// ——— the careful move (a late king online; the tests' games) ———

/** what a court is worth while meetings are left: the army counted smoothly, a vine or a vessel alone as half a wine */
const worth = (courts: readonly (readonly number[])[], who: number, left: number) => {
  const s = scoreOf(courts, who);
  if (!left) return s.total;
  const d = s.strength - strengthOf(courts[1 - who] ?? []);
  const army = (ARMY_PTS / 2) * (1 + Math.max(-1, Math.min(1, d / 4)));
  return s.total - s.army + army + Math.min(Math.abs(s.vines - s.vessels), 2) * 1.5;
};
const lead = (courts: readonly (readonly number[])[], who: number, left: number) => worth(courts, who, left) - worth(courts, 1 - who, left);
const withTake = (courts: readonly (readonly number[])[], take: readonly (readonly number[])[]) => [0, 1].map(i => [...courts[i], ...take[i]]);

const bestSteal = (courts: readonly (readonly number[])[], take: readonly (readonly number[])[], who: number, left: number) => {
  let best = -1, val = -Infinity;
  for (const id of take[1 - who]) {
    if (isEnvoy(id)) continue;
    const v = lead(withTake(courts, moved(take, id, who)), who, left);
    if (v > val + 1e-9) { val = v; best = id; }
  }
  return best;
};

/** the chooser's lead after taking share `s` of split `m`, both kings' envoys taking the best they can */
const chooseLead = (g: TakhtiGame, m: number, s: number) => {
  const ch = chooserOf(g), left = meetingsLeft(g);
  let take: number[][] = [];
  take[ch] = shareOf(g.offer, m, s);
  take[1 - ch] = shareOf(g.offer, m, 1 - s);
  const nC = envoysIn(take[ch]), nD = envoysIn(take[1 - ch]);
  for (const [who, n] of [[ch, nC], [1 - ch, nD]] as const) {
    for (let i = 0; i < n; i++) {
      const id = bestSteal(g.courts, take, who, left);
      if (id < 0) break;
      take = moved(take, id, who);
    }
  }
  return lead(withTake(g.courts, take), ch, left);
};

export const botPick = (g: TakhtiGame): number => {
  const ph = g.phase;
  if (ph.k === 'choose') return chooseLead(g, g.split, 1) > chooseLead(g, g.split, 0) + 1e-9 ? 1 : 0;
  if (ph.k === 'steal') return bestSteal(g.courts, g.take, g.turn, meetingsLeft(g));
  if (ph.k !== 'split') return -1;
  let best = 1, val = Infinity;
  for (let m = 1; m <= (1 << g.offer.length) - 2; m++) {
    const v = Math.max(chooseLead(g, m, 0), chooseLead(g, m, 1));
    if (v < val - 1e-9) { val = v; best = m; }
  }
  return best;
};

export const timeUp = (g: TakhtiGame): TakhtiGame => (g.phase.k === 'end' ? g : applyPick(g, botPick(g)));

// ——— reading a stored game ———

const isInt = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const idList = (v: unknown, max: number): number[] | null =>
  (Array.isArray(v) && v.length <= max && v.every(x => isInt(x, 0, CARDS.length - 1)) ? v.slice() as number[] : null);
const distinct = (...lists: number[][]) => { const all = lists.flat(); return new Set(all).size === all.length; };

const parseLine = (raw: unknown): TLine | null => {
  const o = raw as Partial<Record<string, unknown>> | null;
  if (!o || typeof o !== 'object' || !isInt(o.r, 0, ROUNDS - 1) || !isInt(o.who, 0, 1)) return null;
  if (o.k === 'split') { const a = idList(o.a, OFFER), b = idList(o.b, OFFER); return a && b ? { k: 'split', r: o.r, who: o.who, a, b } : null; }
  if (o.k === 'choose') { const cards = idList(o.cards, OFFER); return cards ? { k: 'choose', r: o.r, who: o.who, cards } : null; }
  if (o.k === 'steal') return isInt(o.card, 0, CARDS.length - 1) ? { k: 'steal', r: o.r, who: o.who, card: o.card } : null;
  return null;
};

const parsePhase = (raw: unknown): TPhase | null => {
  const o = raw as Partial<Record<string, unknown>> | null;
  if (!o || typeof o !== 'object') return null;
  if (o.k === 'split' || o.k === 'choose') return { k: o.k };
  if (o.k === 'steal') return isInt(o.n, 1, OFFER) && isInt(o.next, 0, OFFER) ? { k: 'steal', n: o.n, next: o.next } : null;
  if (o.k === 'end') {
    const w = o.winners;
    return Array.isArray(w) && w.length >= 1 && w.length <= 2 && w.every(x => isInt(x, 0, 1)) && new Set(w).size === w.length ? { k: 'end', winners: w.slice() as number[] } : null;
  }
  return null;
};

export const parseTakhti = (raw: unknown): TakhtiGame | null => {
  const o = raw as Partial<Record<keyof TakhtiGame, unknown>> | null;
  if (!o || typeof o !== 'object' || o.v !== 2) return null;
  const names = Array.isArray(o.names) && o.names.length === 2 && o.names.every(n => typeof n === 'string') ? (o.names as string[]).map(n => n.slice(0, NAME_MAX)) : null;
  const deck = idList(o.deck, CARDS.length);
  const courts = Array.isArray(o.courts) && o.courts.length === 2 ? o.courts.map(c => idList(c, CARDS.length)) : null;
  const take = Array.isArray(o.take) && o.take.length === 2 ? o.take.map(c => idList(c, OFFER)) : null;
  const offer = idList(o.offer, OFFER);
  const phase = parsePhase(o.phase);
  if (!names || !deck || (deck.length && (deck.length !== CARDS.length || !distinct(deck))) || !courts || courts.some(c => !c) || !take || take.some(c => !c)
    || !offer || !phase || !isInt(o.first, 0, 1) || !isInt(o.round, 0, ROUNDS) || !isInt(o.split, 0, (1 << OFFER) - 1) || !isInt(o.turn, 0, 1)
    || !isInt(o.step, 0, Number.MAX_SAFE_INTEGER) || !Array.isArray(o.log)) return null;
  const cs = courts as number[][], ts = take as number[][];
  if (!distinct(...cs, ...ts) || !distinct(...cs, offer)) return null;
  if ((phase.k === 'end') !== (o.round === ROUNDS)) return null;
  const log = o.log.slice(-LINE_MAX).map(parseLine);
  if (log.some(l => !l)) return null;
  return {
    v: 2, names, deck, first: o.first, round: o.round, courts: cs, offer, split: o.split, take: ts, turn: o.turn, phase, step: o.step,
    log: log as TLine[],
  };
};

/** a card's kind's name, for the words on screen and on paper */
export const KIND_NAMES: Record<TKind, string> = { tsikhe: 'ციხე', lashkari: 'ლაშქარი', ghvino: 'ღვინო', tsigni: 'წიგნი', elchi: 'ელჩი' };
export { KINDS };
