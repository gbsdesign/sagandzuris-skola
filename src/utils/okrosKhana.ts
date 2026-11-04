import { mulberry32 } from './otkheuli';
import { KUTKHE_NEAR, KUTKHE_REGIONS } from './kutkhe';

// „ოქროს ხანა“ (2026-11-04) — the school's own board game of the Golden Age, on the songs map's 13 regions (the app's
// data/georgiaMapShapes.ts; the print kit scripts/print-games/games/okros-khana.mjs draws the same map). Each great house sends
// its rider round Georgia: a turn is a ride of up to two regions, the region's goods (one, one more for an estate of mine there,
// one more where the king is this year), then one deed there — an estate (ხე + ქვა + პური), a share of the king's great work
// that stands in that region (a point a good, the one who finishes it takes its card), or a feast at one's own estate (ღვინო +
// პური; the riders there are its guests). Every year the chronicle sends the king to another region. Everything is open, so one
// state serves every phone: the hybrid (pages/games/okros/Table.tsx) and a class's room (utils/okrosRoom.ts).
// The works' lines were written by Claude and are not checked by a teacher (the page says so). No church in it (the rule of
// 2026-11-01): the works are fortresses, palaces, a bridge, a port, an academy.

/** the five goods: ხე (timber), ქვა (stone), პური (grain), ღვინო (wine), ოქრო (gold) */
export type Good = 0 | 1 | 2 | 3 | 4;
export const GOODS: readonly Good[] = [0, 1, 2, 3, 4];
export const GOOD_NAMES = ['ხე', 'ქვა', 'პური', 'ღვინო', 'ოქრო'] as const;
/** a good's name as the object of „აიღო“ / „გაიღო“ (ხეს, ქვას…) */
export const GOOD_DAT = ['ხეს', 'ქვას', 'პურს', 'ღვინოს', 'ოქროს'] as const;
/** the regions in the songs map's order (utils/kutkhe.ts): 0 აფხაზეთი … 11 კახეთი, 12 თბილისი */
export const REGION_COUNT = 13;
export const REGION_NAMES = ['აფხაზეთი', 'სვანეთი', 'სამეგრელო', 'რაჭა', 'იმერეთი', 'გურია', 'აჭარა', 'სამცხე-ჯავახეთი', 'შიდა ქართლი', 'ქვემო ქართლი', 'მთიანეთი', 'კახეთი', 'თბილისი'] as const;
/** „…-ში“: where one is */
export const REGION_IN = ['აფხაზეთში', 'სვანეთში', 'სამეგრელოში', 'რაჭაში', 'იმერეთში', 'გურიაში', 'აჭარაში', 'სამცხე-ჯავახეთში', 'შიდა ქართლში', 'ქვემო ქართლში', 'მთიანეთში', 'კახეთში', 'თბილისში'] as const;
export const TBILISI = 12;
/** what each region gives (−1: Tbilisi's market, any one good) */
export const REGION_GOOD: readonly (Good | -1)[] = [0, 4, 2, 3, 3, 0, 1, 1, 2, 4, 1, 3, -1];
export const MIN_OK = 2;
export const MAX_OK = 4;
export const ESTATES = 5;
/** a region's estates (one a house); Tbilisi has none */
export const PLACES = 2;
export const HAND_MAX = 10;
export const RIDE = 2;
/** what a ride brings: the region's good twice (+1 an estate of mine there, +1 the king); Tbilisi's market — any two */
export const BASE = 2;
export const OPEN_WORKS = 3;
export const ESTATE_COST: readonly number[] = [1, 1, 1, 0, 0];
export const FEAST_COST: readonly number[] = [0, 0, 1, 1, 0];
export const ESTATE_PTS = 2;
export const FEAST_PTS = 3;
export const KING_FEAST = 2;
export const GUEST_PTS = 1;
export const LOG_MAX = 40;
/** how many years a game lasts, by the players: every year each house rides once */
export const yearsFor = (n: number) => (n <= 2 ? 12 : n === 3 ? 10 : 9);

export interface OkWork {
  id: number;
  name: string;
  /** where it stands: a region of the map */
  region: number;
  /** what it needs, counted by good (ხე, ქვა, პური, ღვინო, ოქრო) */
  need: readonly number[];
  /** what its card brings to the one who finishes it */
  bonus: number;
  note: string;
}

/** the king's twelve great works, one in every region but Tbilisi */
export const WORKS: readonly OkWork[] = [
  { id: 0, name: 'ცხუმის ნავსადგური', region: 0, need: [3, 1, 0, 1, 0], bonus: 3, note: 'ცხუმი — დღევანდელი სოხუმი — შავი ზღვის ძველი ქალაქი და ნავსადგურია.' },
  { id: 1, name: 'სვანური კოშკები', region: 1, need: [1, 3, 0, 0, 0], bonus: 2, note: 'სვანეთის სოფლებში ქვის კოშკები ოჯახებს იცავდა; ბევრი მათგანი IX–XIII საუკუნეებშია აგებული.' },
  { id: 2, name: 'ნოქალაქევის გალავანი', region: 2, need: [1, 3, 0, 0, 1], bonus: 3, note: 'ნოქალაქევი ეგრისის ძველი დედაქალაქია; მისი ქვის გალავანი დღესაც დგას.' },
  { id: 3, name: 'რაჭის ერისთავის ციხე', region: 3, need: [1, 2, 1, 0, 0], bonus: 2, note: 'ოქროს ხანაში რაჭას ერისთავები განაგებდნენ; მათი ციხეები რიონის ხეობას იცავდა.' },
  { id: 4, name: 'გეგუთის სასახლე', region: 4, need: [1, 2, 0, 1, 2], bonus: 4, note: 'სამეფო სასახლე ქუთაისთან ახლოს: მეფეები აქ ნადირობდნენ და ისვენებდნენ.' },
  { id: 5, name: 'ასკანის ციხე', region: 5, need: [0, 2, 1, 1, 0], bonus: 2, note: 'გურიის შუა საუკუნეების ციხე მაღალ გორაზე; აქედან მთელი ველი მოჩანს.' },
  { id: 6, name: 'თამარის ხიდი', region: 6, need: [1, 2, 0, 0, 1], bonus: 2, note: 'მახუნცეთის თაღოვანი ქვის ხიდი აჭარისწყალზე; ხალხი მას თამარის ხიდს ეძახის.' },
  { id: 7, name: 'ხერთვისის ციხე', region: 7, need: [1, 3, 1, 0, 1], bonus: 4, note: 'მტკვრისა და ფარავნისწყლის შესართავთან, კლდეზე დგას — საქართველოს ერთ-ერთი უძველესი ციხე.' },
  { id: 8, name: 'გორის ციხე', region: 8, need: [1, 2, 0, 1, 0], bonus: 2, note: 'ქალაქის შუაგულში, მაღალ ბორცვზე დგას და ქართლის გზებს იცავდა.' },
  { id: 9, name: 'ბირთვისის ციხე', region: 9, need: [1, 2, 0, 1, 1], bonus: 3, note: 'კლდეებს შორის აგებული ციხე — შუა საუკუნეების საქართველოს ერთ-ერთი ყველაზე მიუვალი სიმაგრე.' },
  { id: 10, name: 'დარიალის კარი', region: 10, need: [2, 2, 1, 0, 0], bonus: 3, note: 'თერგის ხეობის ვიწრო გზა ჩრდილოეთისკენ; აქ ძველად ციხე კეტავდა კავკასიის კარს.' },
  { id: 11, name: 'იყალთოს აკადემია', region: 11, need: [1, 1, 0, 2, 2], bonus: 4, note: 'XII საუკუნის სასწავლებელი, სადაც არსენ იყალთოელი ასწავლიდა; გადმოცემით, აქ რუსთაველიც სწავლობდა.' },
];
export const workIn = (region: number) => WORKS.find(w => w.region === region) ?? null;
export const needCount = (w: OkWork) => w.need.reduce((a, b) => a + b, 0);

// ---------- the map's roads: neighbours and how many rides apart ----------
export const NEAR: readonly (readonly number[])[] = KUTKHE_REGIONS.map(id => KUTKHE_NEAR[id].map(x => KUTKHE_REGIONS.indexOf(x)));
const bfs = (from: number) => {
  const d = Array(REGION_COUNT).fill(-1);
  d[from] = 0;
  const q = [from];
  while (q.length) {
    const x = q.shift()!;
    for (const y of NEAR[x]) if (d[y] < 0) { d[y] = d[x] + 1; q.push(y); }
  }
  return d;
};
export const DIST: readonly (readonly number[])[] = Array.from({ length: REGION_COUNT }, (_, i) => bfs(i));

export interface OkPlayer {
  name: string;
  /** where the rider is */
  at: number;
  goods: number[];
  pts: number;
  /** estates still to build */
  left: number;
  /** the works this house finished (their ids) */
  works: number[];
}
/** an open work: its id and what it has got so far, counted by good */
export interface OkOpen { id: number; got: number[] }
/** the chronicle: a ride (and the goods it brought), a deed, a pass, a new year, a new work laid out */
export type OkLine =
  | { k: 'go'; who: number; from: number; to: number; got: number[] }
  | { k: 'build'; who: number; at: number }
  | { k: 'give'; who: number; work: number; gave: number[]; pts: number; done: boolean }
  | { k: 'feast'; who: number; at: number; pts: number; guests: number[] }
  | { k: 'pass'; who: number }
  | { k: 'year'; year: number; king: number }
  | { k: 'new'; work: number };
export type OkPhase =
  | { k: 'move' }
  | { k: 'act'; got: number[] }
  | { k: 'end'; order: number[]; winners: number[] };

export interface OkrosGame {
  v: 1;
  players: OkPlayer[];
  /** the estates on the map: by region, the houses that built there (in building order) */
  estates: number[][];
  open: OkOpen[];
  /** the works not yet laid out (ids; drawn at random when one is needed) */
  deck: number[];
  /** the chronicle: the regions the king has not visited yet (drawn at random every year) */
  chron: number[];
  king: number;
  year: number;
  years: number;
  turn: number;
  /** who rides first every year */
  first: number;
  /** every ride and every deed moves it on: the key of the step on now */
  step: number;
  rng: number;
  phase: OkPhase;
  log: OkLine[];
}

const seedOf = (r: () => number) => Math.floor(r() * 0x7fffffff);
const sum = (a: readonly number[]) => a.reduce((x, y) => x + y, 0);
const zero = () => [0, 0, 0, 0, 0];
export const keyOf = (g: OkrosGame) => `o${g.step}`;
const drawFrom = (list: number[], r: () => number) => (list.length ? list.splice(Math.floor(r() * list.length), 1)[0] : -1);

export const newOkros = ({ names, first, rnd }: { names: string[]; first?: number; rnd: () => number }): OkrosGame | null => {
  const n = names.length;
  if (n < MIN_OK || n > MAX_OK) return null;
  const start = first !== undefined && first >= 0 && first < n ? first : Math.floor(rnd() * n);
  const r = mulberry32(seedOf(rnd));
  const deck = WORKS.map(w => w.id);
  const open: OkOpen[] = [];
  for (let k = 0; k < OPEN_WORKS; k++) open.push({ id: drawFrom(deck, r), got: zero() });
  const chron = Array.from({ length: REGION_COUNT - 1 }, (_, i) => i);
  const king = drawFrom(chron, r);
  return {
    v: 1,
    players: names.map(name => ({ name, at: TBILISI, goods: [...ESTATE_COST], pts: 0, left: ESTATES, works: [] })),
    estates: Array.from({ length: REGION_COUNT }, () => []),
    open, deck, chron, king, year: 1, years: yearsFor(n), turn: start, first: start, step: 0, rng: seedOf(r),
    phase: { k: 'move' }, log: [{ k: 'year', year: 1, king }],
  };
};

// ---------- what may be done ----------
/** the regions the rider on turn may end the ride in (staying too) */
export const reach = (g: OkrosGame, seat = g.turn) => {
  const at = g.players[seat]?.at ?? TBILISI;
  return DIST[at].map((d, r) => (d >= 0 && d <= RIDE ? r : -1)).filter(r => r >= 0);
};
/** what a region gives the house that ends its ride there (Tbilisi: the two goods of its choice, `market`) */
export const yieldAt = (g: OkrosGame, seat: number, region: number, market: readonly Good[] = [0, 0]): number[] => {
  const out = zero();
  const good = REGION_GOOD[region];
  if (good === -1 || good === undefined) { for (const k of market.slice(0, BASE)) out[k]++; return out; }
  out[good] = BASE + (g.estates[region].includes(seat) ? 1 : 0) + (g.king === region ? 1 : 0);
  return out;
};
const room = (p: OkPlayer) => HAND_MAX - sum(p.goods);
const covers = (have: readonly number[], cost: readonly number[]) => cost.every((c, i) => (have[i] ?? 0) >= c);
export const canBuild = (g: OkrosGame, seat = g.turn) => {
  const p = g.players[seat];
  if (!p || g.phase.k !== 'act' || seat !== g.turn) return false;
  const here = g.estates[p.at];
  return p.at !== TBILISI && p.left > 0 && !!here && here.length < PLACES && !here.includes(seat) && covers(p.goods, ESTATE_COST);
};
export const canFeast = (g: OkrosGame, seat = g.turn) => {
  const p = g.players[seat];
  return !!p && g.phase.k === 'act' && seat === g.turn && g.estates[p.at]?.includes(seat) && covers(p.goods, FEAST_COST);
};
/** the open work where the rider stands, if any */
export const openHere = (g: OkrosGame, seat = g.turn) => {
  const p = g.players[seat];
  return p ? g.open.find(o => WORKS[o.id]?.region === p.at) ?? null : null;
};
/** the most of each good the house may give to the work where it stands */
export const giveMax = (g: OkrosGame, seat = g.turn): number[] => {
  const p = g.players[seat], o = openHere(g, seat);
  if (!p || !o || g.phase.k !== 'act' || seat !== g.turn) return zero();
  const w = WORKS[o.id];
  return GOODS.map(k => Math.max(0, Math.min(p.goods[k], w.need[k] - o.got[k])));
};
export const canGive = (g: OkrosGame, seat = g.turn) => sum(giveMax(g, seat)) > 0;
export const canAct = (g: OkrosGame, seat = g.turn) => canBuild(g, seat) || canFeast(g, seat) || canGive(g, seat);
/** how many points a feast here brings its host now */
export const feastPts = (g: OkrosGame, seat = g.turn) => FEAST_PTS + (g.king === g.players[seat]?.at ? KING_FEAST : 0);
/** the riders who would be a feast's guests */
export const guestsOf = (g: OkrosGame, seat = g.turn) => g.players.map((p, i) => (i !== seat && p.at === g.players[seat]?.at ? i : -1)).filter(i => i >= 0);
/** a good given here brings 1 point, 2 where the king is */
export const givePts = (g: OkrosGame, seat = g.turn) => 1 + (g.king === g.players[seat]?.at ? 1 : 0);

// ---------- one number a move (the online act's pick) ----------
/** the ride: a region's number; Tbilisi = TBILISI_PICK + 5 · the first good taken at its market + the second */
export const TBILISI_PICK = 20;
export const PASS_PICK = 100;
export const BUILD_PICK = 101;
export const FEAST_PICK = 102;
/** a share of the work here: GIVE_PICK + the goods counted in base 4 (ხე + 4·ქვა + 16·პური + 64·ღვინო + 256·ოქრო) */
export const GIVE_PICK = 1000;
export const ridePick = (region: number, a: Good = 0, b: Good = a) => (region === TBILISI ? TBILISI_PICK + 5 * a + b : region);
/** the market's two goods of a Tbilisi pick */
export const marketOf = (pick: number): Good[] => [Math.floor((pick - TBILISI_PICK) / 5) as Good, ((pick - TBILISI_PICK) % 5) as Good];
/** every market pick, each pair once */
export const MARKET_PICKS: readonly number[] = GOODS.flatMap(a => GOODS.filter(b => b >= a).map(b => ridePick(TBILISI, a, b)));
export const givePick = (counts: readonly number[]) => GIVE_PICK + counts.reduce((a, c, k) => a + Math.max(0, Math.min(3, c)) * 4 ** k, 0);
export const countsOf = (pick: number) => GOODS.map(k => Math.floor((pick - GIVE_PICK) / 4 ** k) % 4);

/** the turn is over: the next house rides; after the year's last, a new year sends the king on (or the game ends) */
const endTurn = (g: OkrosGame): OkrosGame => {
  const n = g.players.length;
  const turn = (g.turn + 1) % n;
  if (turn !== g.first) return { ...g, turn, phase: { k: 'move' } };
  if (g.year >= g.years) return finish({ ...g, turn });
  const r = mulberry32(g.rng);
  const chron = [...g.chron];
  if (!chron.length) for (let i = 0; i < REGION_COUNT - 1; i++) chron.push(i);
  const king = drawFrom(chron, r);
  const year = g.year + 1;
  return { ...g, turn, chron, king, year, rng: seedOf(r), phase: { k: 'move' }, log: [...g.log, { k: 'year' as const, year, king }].slice(-LOG_MAX) };
};

/** the end: the most points; a tie → more works finished, then more estates; still tied — all of them */
export const rank = (g: Pick<OkrosGame, 'players'>) => {
  const key = (i: number) => {
    const p = g.players[i];
    return [p.pts, p.works.length, ESTATES - p.left];
  };
  const cmp = (a: number, b: number) => {
    const x = key(a), y = key(b);
    for (let k = 0; k < x.length; k++) if (x[k] !== y[k]) return y[k] - x[k];
    return a - b;
  };
  const order = g.players.map((_, i) => i).sort(cmp);
  const top = key(order[0]);
  const winners = order.filter(i => key(i).every((v, k) => v === top[k]));
  return { order, winners };
};
const finish = (g: OkrosGame): OkrosGame => {
  const { order, winners } = rank(g);
  return { ...g, phase: { k: 'end', order, winners } };
};

/** the ride: to a region at most two away (or staying), and its goods (as many as the hand still holds) */
const ride = (g: OkrosGame, pick: number): OkrosGame => {
  const who = g.turn, p = g.players[who];
  const tb = pick >= TBILISI_PICK && pick < TBILISI_PICK + 25;
  const to = tb ? TBILISI : pick;
  if (!Number.isInteger(pick) || (!tb && (to < 0 || to >= TBILISI)) || !reach(g).includes(to)) return g;
  const want = yieldAt(g, who, to, tb ? marketOf(pick) : undefined);
  let free = room(p);
  const got = want.map(c => { const t = Math.min(c, free); free -= t; return t; });
  const goods = p.goods.map((c, k) => c + got[k]);
  const players = g.players.map((x, i) => (i === who ? { ...x, at: to, goods } : x));
  const next: OkrosGame = { ...g, players, step: g.step + 1, phase: { k: 'act', got }, log: [...g.log, { k: 'go' as const, who, from: p.at, to, got }].slice(-LOG_MAX) };
  // nothing to do there: the turn ends by itself
  return canAct(next) ? next : endTurn(next);
};

const act = (g: OkrosGame, pick: number): OkrosGame => {
  const who = g.turn, p = g.players[who];
  const log = (line: OkLine, extra: OkLine[] = []) => [...g.log, line, ...extra].slice(-LOG_MAX);
  if (pick === PASS_PICK) return endTurn({ ...g, step: g.step + 1, log: log({ k: 'pass', who }) });
  if (pick === BUILD_PICK) {
    if (!canBuild(g)) return g;
    const goods = p.goods.map((c, k) => c - ESTATE_COST[k]);
    const players = g.players.map((x, i) => (i === who ? { ...x, goods, left: x.left - 1, pts: x.pts + ESTATE_PTS } : x));
    const estates = g.estates.map((e, r) => (r === p.at ? [...e, who] : e));
    return endTurn({ ...g, players, estates, step: g.step + 1, log: log({ k: 'build', who, at: p.at }) });
  }
  if (pick === FEAST_PICK) {
    if (!canFeast(g)) return g;
    const pts = feastPts(g), guests = guestsOf(g);
    const players = g.players.map((x, i) => (i === who
      ? { ...x, goods: x.goods.map((c, k) => c - FEAST_COST[k]), pts: x.pts + pts }
      : guests.includes(i) ? { ...x, pts: x.pts + GUEST_PTS } : x));
    return endTurn({ ...g, players, step: g.step + 1, log: log({ k: 'feast', who, at: p.at, pts, guests }) });
  }
  if (Number.isInteger(pick) && pick >= GIVE_PICK && pick < GIVE_PICK + 1024) {
    const gave = countsOf(pick), max = giveMax(g), o = openHere(g);
    if (!o || !sum(gave) || gave.some((c, k) => c > max[k])) return g;
    const w = WORKS[o.id];
    const got = o.got.map((c, k) => c + gave[k]);
    const done = got.every((c, k) => c >= w.need[k]);
    const pts = sum(gave) * givePts(g) + (done ? w.bonus : 0);
    const players = g.players.map((x, i) => (i === who
      ? { ...x, goods: x.goods.map((c, k) => c - gave[k]), pts: x.pts + pts, works: done ? [...x.works, w.id] : x.works }
      : x));
    let open = g.open.map(x => (x === o ? { ...x, got } : x));
    let deck = g.deck, rng = g.rng;
    const extra: OkLine[] = [];
    if (done) {
      open = open.filter(x => x.id !== w.id);
      if (deck.length) {
        const r = mulberry32(rng);
        deck = [...deck];
        const id = drawFrom(deck, r);
        rng = seedOf(r);
        open = [...open, { id, got: zero() }];
        extra.push({ k: 'new', work: id });
      }
    }
    const next: OkrosGame = { ...g, players, open, deck, rng, step: g.step + 1, log: log({ k: 'give', who, work: w.id, gave, pts, done }, extra) };
    return !next.open.length ? finish(next) : endTurn(next);
  }
  return g;
};

/** a move of the house on turn: its ride (phase move) or its deed (phase act); a move that is not allowed changes nothing */
export const applyPick = (g: OkrosGame, seat: number, pick: number): OkrosGame => {
  if (seat !== g.turn || !Number.isInteger(pick)) return g;
  if (g.phase.k === 'move') return ride(g, pick);
  if (g.phase.k === 'act') return act(g, pick);
  return g;
};

// ---------- a house that thinks a little: the host's phone moves for the late, and the tests play whole games ----------
const need = (g: OkrosGame) => {
  const out = zero();
  for (const o of g.open) WORKS[o.id].need.forEach((c, k) => { out[k] += c - o.got[k]; });
  return out;
};
/** what a hand is worth to its house: goods the works still need, an estate's or a feast's set */
const handWorth = (g: OkrosGame, seat: number) => {
  const p = g.players[seat], n = need(g);
  let v = 0;
  GOODS.forEach(k => { v += Math.min(p.goods[k], n[k]) * 0.55 + Math.max(0, p.goods[k] - n[k]) * 0.15; });
  if (p.left > 0 && covers(p.goods, ESTATE_COST)) v += 1.2;
  return v;
};
/** the deed worth most now: [pick, value] */
export const bestDeed = (g: OkrosGame): [number, number] => {
  let best: [number, number] = [PASS_PICK, 0];
  const yearsLeft = g.years - g.year;
  if (canGive(g)) {
    const max = giveMax(g), o = openHere(g)!;
    const w = WORKS[o.id];
    const done = o.got.every((c, k) => c + max[k] >= w.need[k]);
    const v = sum(max) * givePts(g) + (done ? w.bonus + 0.5 : 0) - sum(max) * 0.3;
    if (v > best[1]) best = [givePick(max), v];
  }
  if (canBuild(g)) {
    const v = ESTATE_PTS + Math.min(3, yearsLeft) * 0.7 - 0.8;
    if (v > best[1]) best = [BUILD_PICK, v];
  }
  if (canFeast(g)) {
    const v = feastPts(g) - 1.1;
    if (v > best[1]) best = [FEAST_PICK, v];
  }
  return best;
};
/** the ride worth most: every reachable region (Tbilisi with each good) tried with its best deed after it */
export const bestRide = (g: OkrosGame): number => {
  const seat = g.turn;
  let best = -1, bestV = -Infinity;
  for (const r of reach(g)) {
    const picks = r === TBILISI ? MARKET_PICKS : [r];
    for (const pick of picks) {
      const after = ride(g, pick);
      if (after === g) continue;
      const mine = after.phase.k === 'act' && after.turn === seat;
      const deed = mine ? bestDeed(after)[1] : 0;
      // the goods it brings, and a little pull toward the open works and the king
      const pull = (g.open.length ? Math.min(...g.open.map(o => DIST[r][WORKS[o.id].region])) * -0.15 : 0) + (r === g.king ? 0.2 : 0);
      const v = deed + handWorth(after, seat) - handWorth(g, seat) + pull;
      if (v > bestV) { bestV = v; best = pick; }
    }
  }
  return best;
};
/** the house on turn's move, as a careful player would make it */
export const botPick = (g: OkrosGame) => (g.phase.k === 'move' ? bestRide(g) : g.phase.k === 'act' ? bestDeed(g)[0] : -1);

// ---------- kept on the device, sent through the room: checked when read back ----------
const isInt = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const ints = (v: unknown, len: number, lo: number, hi: number): v is number[] => Array.isArray(v) && v.length === len && v.every(x => isInt(x, lo, hi));
const intList = (v: unknown, max: number, lo: number, hi: number): v is number[] => Array.isArray(v) && v.length <= max && v.every(x => isInt(x, lo, hi));
const line = (o: unknown, n: number): OkLine | null => {
  const l = o as Record<string, unknown> | null;
  if (!l || typeof l !== 'object') return null;
  const who = isInt(l.who, 0, n - 1) ? l.who : -1;
  switch (l.k) {
    case 'go': return who >= 0 && isInt(l.from, 0, 12) && isInt(l.to, 0, 12) && ints(l.got, 5, 0, 9) ? { k: 'go', who, from: l.from, to: l.to, got: l.got } : null;
    case 'build': return who >= 0 && isInt(l.at, 0, 12) ? { k: 'build', who, at: l.at } : null;
    case 'give': return who >= 0 && isInt(l.work, 0, WORKS.length - 1) && ints(l.gave, 5, 0, 9) && isInt(l.pts, 0, 99) && typeof l.done === 'boolean'
      ? { k: 'give', who, work: l.work, gave: l.gave, pts: l.pts, done: l.done } : null;
    case 'feast': return who >= 0 && isInt(l.at, 0, 12) && isInt(l.pts, 0, 99) && intList(l.guests, n, 0, n - 1) ? { k: 'feast', who, at: l.at, pts: l.pts, guests: l.guests } : null;
    case 'pass': return who >= 0 ? { k: 'pass', who } : null;
    case 'year': return isInt(l.year, 1, 99) && isInt(l.king, 0, 11) ? { k: 'year', year: l.year, king: l.king } : null;
    case 'new': return isInt(l.work, 0, WORKS.length - 1) ? { k: 'new', work: l.work } : null;
    default: return null;
  }
};
export const parseOkros = (raw: unknown): OkrosGame | null => {
  const g = raw as Partial<OkrosGame> | null;
  if (!g || typeof g !== 'object' || g.v !== 1 || !Array.isArray(g.players)) return null;
  const n = g.players.length;
  if (n < MIN_OK || n > MAX_OK) return null;
  const players: OkPlayer[] = [];
  for (const p of g.players as unknown[]) {
    const x = p as Partial<OkPlayer> | null;
    if (!x || typeof x.name !== 'string' || !isInt(x.at, 0, 12) || !ints(x.goods, 5, 0, HAND_MAX) || !isInt(x.pts, 0, 999)
      || !isInt(x.left, 0, ESTATES) || !intList(x.works, WORKS.length, 0, WORKS.length - 1)) return null;
    players.push({ name: x.name.slice(0, 40), at: x.at, goods: [...x.goods], pts: x.pts, left: x.left, works: [...x.works] });
  }
  if (!Array.isArray(g.estates) || g.estates.length !== REGION_COUNT || !g.estates.every(e => intList(e, PLACES, 0, n - 1))) return null;
  if (!Array.isArray(g.open) || g.open.length > OPEN_WORKS) return null;
  const open: OkOpen[] = [];
  for (const o of g.open as unknown[]) {
    const x = o as Partial<OkOpen> | null;
    if (!x || !isInt(x.id, 0, WORKS.length - 1) || !ints(x.got, 5, 0, 9)) return null;
    open.push({ id: x.id, got: [...x.got] });
  }
  if (!intList(g.deck, WORKS.length, 0, WORKS.length - 1) || !intList(g.chron, REGION_COUNT - 1, 0, 11)) return null;
  if (!isInt(g.king, 0, 11) || !isInt(g.years, 1, 30) || !isInt(g.year, 1, g.years) || !isInt(g.turn, 0, n - 1) || !isInt(g.first, 0, n - 1)
    || !isInt(g.step, 0, 1e6) || !isInt(g.rng, 0, 0x7fffffff)) return null;
  const ph = g.phase as Record<string, unknown> | undefined;
  let phase: OkPhase;
  if (ph?.k === 'move') phase = { k: 'move' };
  else if (ph?.k === 'act' && ints(ph.got, 5, 0, 9)) phase = { k: 'act', got: [...ph.got] };
  else if (ph?.k === 'end' && intList(ph.order, n, 0, n - 1) && ph.order.length === n && intList(ph.winners, n, 0, n - 1)) phase = { k: 'end', order: [...ph.order], winners: [...ph.winners] };
  else return null;
  const log = Array.isArray(g.log) ? g.log.slice(-LOG_MAX).map(l => line(l, n)).filter((l): l is OkLine => !!l) : [];
  return {
    v: 1, players, estates: g.estates.map(e => [...e]), open, deck: [...g.deck], chron: [...g.chron], king: g.king, year: g.year,
    years: g.years, turn: g.turn, first: g.first, step: g.step, rng: g.rng, phase, log,
  };
};

/** the end's results: points, works and estates of every house, best first */
export const resultOf = (g: OkrosGame) => {
  const { order, winners } = g.phase.k === 'end' ? g.phase : rank(g);
  return { order, winners };
};
