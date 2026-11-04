import { mulberry32, shuffle } from './otkheuli';

// „მეფის კარი“ on phones (2026-11-04): the printed kit's Coup (src/print/games/mepis-kari.js) as rules — five
// courtiers, seven actions, the blocks and „არ მჯერა!“ in the kit's order: claim → doubt → block → doubt on the block →
// result. One engine for both variants: online (utils/kariRoom.ts) every phone holds its own two cards and the host's phone
// the deck; on paper (the hybrid, `paper`) the printed cards stay in the players' hands and the phone keeps the coins, the
// turns and the order — the host answers what the phone cannot know (did the card show? which one was turned?). Every
// change of step moves `step` on (the room's key). Pure, tested in tests/mepisKari.test.ts.

export type Role = 0 | 1 | 2 | 3 | 4;
export const ROLE_IDS: readonly Role[] = [0, 1, 2, 3, 4];

/** the courtiers as the kit names them (`dat` = the name in the dative, for „აჩვენებს ხაზინადარს“) */
export const ROLES = [
  { name: 'ხაზინადარი', full: 'მეჭურჭლეთუხუცესი', dat: 'ხაზინადარს', act: 3, does: 'ხარკი: +3 თეთრი', blocks: 'ბლოკავს უცხო ძღვენს' },
  { name: 'მანდატური', full: 'მანდატურთუხუცესი', dat: 'მანდატურს', act: 4, does: 'განდევნა: −3 თეთრი, სამიზნე კარგავს გავლენას', blocks: '' },
  { name: 'სპასალარი', full: 'ამირსპასალარი', dat: 'სპასალარს', act: 5, does: 'ლაშქრის სარჩო: +2 თეთრი სხვისგან', blocks: 'ბლოკავს ლაშქრის სარჩოს' },
  { name: 'მსახურთუხუცესი', full: 'მსახურთუხუცესი', dat: 'მსახურთუხუცესს', act: 6, does: 'გადანიშვნა: 2 ბარათი დასტიდან', blocks: 'ბლოკავს ლაშქრის სარჩოს' },
  { name: 'დედოფალი', full: 'რუსუდან დედოფალი', dat: 'დედოფალს', act: -1, does: 'მოქმედება არ აქვს', blocks: 'ბლოკავს განდევნას' },
] as const;

export interface ActDef {
  name: string;
  /** the courtier it claims (-1: anybody may) */
  claim: Role | -1;
  cost: number;
  target: boolean;
  /** who blocks it, as which courtier */
  blockers: readonly Role[];
  /** any player may block it (else only its target) */
  anyone?: boolean;
  gain: number;
}
export const ACTS: readonly ActDef[] = [
  { name: 'შემოსავალი', claim: -1, cost: 0, target: false, blockers: [], gain: 1 },
  { name: 'უცხო ძღვენი', claim: -1, cost: 0, target: false, blockers: [0], anyone: true, gain: 2 },
  { name: 'დარბაზი', claim: -1, cost: 7, target: true, blockers: [], gain: 0 },
  { name: 'ხარკი', claim: 0, cost: 0, target: false, blockers: [], gain: 3 },
  { name: 'განდევნა', claim: 1, cost: 3, target: true, blockers: [4], gain: 0 },
  { name: 'ლაშქრის სარჩო', claim: 2, cost: 0, target: true, blockers: [2, 3], gain: 2 },
  { name: 'გადანიშვნა', claim: 3, cost: 0, target: false, blockers: [], gain: 0 },
];
export const INCOME = 0, AID = 1, COUP = 2, TAX = 3, KILL = 4, STEAL = 5, SWAP = 6;
/** with this many coins at the turn's start the court („დარბაზი“) is a must */
export const MUST_COUP = 10;
export const MIN_KARI = 2;
export const MAX_KARI = 8;
/** three of each courtier; 7–8 players add the kit's five extra cards */
export const deckSize = (players: number) => (players >= 7 ? 20 : 15);

export interface KariPlayer {
  name: string;
  coins: number;
  /** the cards face down: courtiers online, -1 each on paper (unknown to the phone) */
  hand: number[];
  /** the cards turned face up (influence lost) */
  shown: Role[];
}
export interface Claim { act: number; by: number; target: number; paid: number; block: { by: number; role: Role } | null }
/** what comes after a card is lost */
export type Then = 'block' | 'resolve' | 'blocked' | 'done';
export type Phase =
  | { k: 'turn' }
  /** „არ მჯერა?“ — every living player but the claimer may doubt; `passed` let it go */
  | { k: 'doubt'; on: 'act' | 'block'; passed: number[] }
  /** paper: did the claimer show the card? (`by` doubted) */
  | { k: 'proof'; on: 'act' | 'block'; by: number }
  | { k: 'block'; passed: number[] }
  | { k: 'lose'; who: number; then: Then }
  /** the actor keeps as many cards as they hold, out of their own and the two drawn (paper: done by hand) */
  | { k: 'swap'; drawn: Role[] }
  | { k: 'end'; winner: number };
export type PhaseKind = Phase['k'];

/** the chronicle: `n` = the turn it happened in */
export type Line = { n: number } & (
  | { t: 'act'; by: number; act: number; target: number }
  | { t: 'doubt'; by: number; on: number; role: Role; truth: boolean }
  | { t: 'block'; by: number; role: Role }
  | { t: 'blocked' }
  | { t: 'lose'; who: number; role: Role }
  | { t: 'out'; who: number }
  | { t: 'coins'; who: number; n2: number; from: number }
  | { t: 'refund'; who: number; n2: number }
  | { t: 'swap'; who: number }
  | { t: 'late'; who: number }
  | { t: 'win'; who: number }
);
type Without<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type LineBody = Without<Line, 'n'>;
export const LOG_MAX = 40;

export interface KariGame {
  v: 1;
  paper: boolean;
  players: KariPlayer[];
  deck: Role[];
  turn: number;
  /** the turn's number, from 1 */
  n: number;
  /** moves on with every step (the room's key) */
  step: number;
  rng: number;
  claim: Claim | null;
  phase: Phase;
  log: Line[];
  /** who began */
  first: number;
}

const seedOf = (r: () => number) => Math.floor(r() * 0x7fffffff);
export const isLive = (g: KariGame, i: number) => i >= 0 && i < g.players.length && g.players[i].hand.length > 0;
export const living = (g: KariGame) => g.players.flatMap((p, i) => (p.hand.length ? [i] : []));
/** the next living player after `from`, round the table */
export const nextLive = (g: KariGame, from: number) => {
  for (let k = 1; k <= g.players.length; k++) {
    const i = (from + k) % g.players.length;
    if (isLive(g, i)) return i;
  }
  return from;
};
export const keyOf = (g: KariGame) => `k${g.step}`;

const note = (g: KariGame, line: LineBody): KariGame => ({ ...g, log: [...g.log, { ...line, n: g.n } as Line].slice(-LOG_MAX) });
const go = (g: KariGame, phase: Phase, claim: Claim | null = g.claim): KariGame => ({ ...g, phase, claim, step: g.step + 1 });
const setPlayer = (g: KariGame, i: number, p: KariPlayer): KariGame => ({ ...g, players: g.players.map((x, k) => (k === i ? p : x)) });
const addCoins = (g: KariGame, i: number, n: number): KariGame => setPlayer(g, i, { ...g.players[i], coins: Math.max(0, g.players[i].coins + n) });

/** a new game: two cards and two coins each (with two players the first has one), the first by lot unless named */
export const newKari = ({ names, paper = false, first, rnd = Math.random }: {
  names: readonly string[]; paper?: boolean; first?: number; rnd?: () => number;
}): KariGame | null => {
  const n = names.length;
  if (n < MIN_KARI || n > MAX_KARI) return null;
  const per = deckSize(n) / ROLE_IDS.length;
  const deck: Role[] = paper ? [] : shuffle(ROLE_IDS.flatMap(r => Array.from({ length: per }, () => r)), rnd);
  const start = first !== undefined && Number.isInteger(first) && first >= 0 && first < n ? first : Math.floor(rnd() * n);
  const players = names.map((name, i): KariPlayer => ({
    name,
    coins: n === 2 && i === start ? 1 : 2,
    hand: paper ? [-1, -1] : [deck.pop()!, deck.pop()!],
    shown: [],
  }));
  return { v: 1, paper, players, deck, turn: start, n: 1, step: 0, rng: seedOf(rnd), claim: null, phase: { k: 'turn' }, log: [], first: start };
};

/** may the player on turn declare this action (and at whom) */
export const canDeclare = (g: KariGame, act: number, target = -1) => {
  if (g.phase.k !== 'turn' || !Number.isInteger(act) || act < 0 || act >= ACTS.length) return false;
  const p = g.players[g.turn], a = ACTS[act];
  if (p.coins >= MUST_COUP && act !== COUP) return false;
  if (p.coins < a.cost) return false;
  return a.target ? target !== g.turn && isLive(g, target) : target < 0;
};

/** the claimer and the courtier claimed of the doubt on now */
const doubted = (g: KariGame, on: 'act' | 'block') => {
  const c = g.claim!;
  return on === 'act' ? { claimer: c.by, role: ACTS[c.act].claim as Role } : { claimer: c.block!.by, role: c.block!.role };
};
const blockersOf = (g: KariGame): number[] => {
  const c = g.claim;
  if (!c) return [];
  const a = ACTS[c.act];
  if (!a.blockers.length || c.block) return [];
  if (a.anyone) return living(g).filter(i => i !== c.by);
  return isLive(g, c.target) ? [c.target] : [];
};
/** who is still to answer the window on now (doubt: the living but the claimer; block: who may block) */
export const waitingOn = (g: KariGame): number[] => {
  const ph = g.phase;
  if (ph.k === 'doubt') { const { claimer } = doubted(g, ph.on); return living(g).filter(i => i !== claimer && !ph.passed.includes(i)); }
  if (ph.k === 'block') return blockersOf(g).filter(i => !ph.passed.includes(i));
  return [];
};

const finish = (g: KariGame, winner: number): KariGame => go(note(g, { t: 'win', who: winner }), { k: 'end', winner }, null);

const endTurn = (g: KariGame): KariGame => {
  const alive = living(g);
  if (alive.length <= 1) return finish(g, alive[0] ?? g.turn);
  return go({ ...g, turn: nextLive(g, g.turn), n: g.n + 1 }, { k: 'turn' }, null);
};

const gain = (g: KariGame, who: number, n: number, from: number): KariGame => {
  const s = from >= 0 ? addCoins(addCoins(g, from, -n), who, n) : addCoins(g, who, n);
  return note(s, { t: 'coins', who, n2: n, from });
};

/** the card a player turns: online its place in the hand, on paper the courtier turned */
const dropCard = (g: KariGame, who: number, choice: number): KariGame => {
  const p = g.players[who];
  const idx = g.paper ? p.hand.length - 1 : choice;
  const role = (g.paper ? choice : p.hand[idx]) as Role;
  const hand = p.hand.filter((_, k) => k !== idx);
  const out = !hand.length;
  // one who leaves the court gives the treasury back their coins
  let s = note(setPlayer(g, who, { ...p, hand, shown: [...p.shown, role], coins: out ? 0 : p.coins }), { t: 'lose', who, role });
  if (out) s = note(s, { t: 'out', who });
  return s;
};

const afterLose = (g: KariGame, then: Then): KariGame => {
  const alive = living(g);
  if (alive.length <= 1) return finish(g, alive[0] ?? g.turn);
  if (then === 'block') return isLive(g, g.claim!.by) ? blockOrResolve(g) : endTurn(g);
  if (then === 'resolve') return resolve(g);
  if (then === 'blocked') return endTurn(note(g, { t: 'blocked' }));
  return endTurn(g);
};

/** a card to lose: online one who holds a single card loses it at once; on paper the host names the card turned */
const loseStep = (g: KariGame, who: number, then: Then): KariGame =>
  (!g.paper && g.players[who].hand.length === 1 ? afterLose(dropCard(g, who, 0), then) : go(g, { k: 'lose', who, then }));

const resolve = (g: KariGame): KariGame => {
  const c = g.claim!;
  switch (c.act) {
    case STEAL: return endTurn(gain(g, c.by, Math.min(2, g.players[c.target]?.coins ?? 0), c.target));
    case COUP:
    case KILL: return isLive(g, c.target) ? loseStep(g, c.target, 'done') : endTurn(g);
    case SWAP: {
      if (g.paper) return go(g, { k: 'swap', drawn: [] });
      const deck = [...g.deck];
      const drawn = [deck.pop(), deck.pop()].filter((x): x is Role => x !== undefined);
      return go({ ...g, deck }, { k: 'swap', drawn });
    }
    default: return endTurn(gain(g, c.by, ACTS[c.act].gain, -1));
  }
};

const blockOrResolve = (g: KariGame): KariGame => (blockersOf(g).length ? go(g, { k: 'block', passed: [] }) : resolve(g));

/** the player on turn declares an action (its cost is paid at once) */
export const declare = (g: KariGame, act: number, target = -1): KariGame => {
  if (!canDeclare(g, act, target)) return g;
  const a = ACTS[act];
  const by = g.turn;
  const claim: Claim = { act, by, target: a.target ? target : -1, paid: a.cost, block: null };
  const s = { ...note(addCoins(g, by, -a.cost), { t: 'act', by, act, target: claim.target }), claim };
  return a.claim >= 0 ? go(s, { k: 'doubt', on: 'act', passed: [] }) : blockOrResolve(s);
};

/** a doubt settled: the truth said, the card shown goes back into the deck and a new one is drawn, the doubter loses a card;
 *  a bluff loses the claimer a card — the action fails (its coins come back) or the block falls */
const settleDoubt = (g: KariGame, on: 'act' | 'block', by: number, truth: boolean): KariGame => {
  const { claimer, role } = doubted(g, on);
  let s = note(g, { t: 'doubt', by, on: claimer, role, truth });
  if (truth) {
    if (!s.paper) {
      const r = mulberry32(s.rng);
      const p = s.players[claimer];
      const idx = p.hand.indexOf(role);
      const deck = shuffle([...s.deck, role], r);
      const card = deck.pop()!;
      s = { ...setPlayer(s, claimer, { ...p, hand: p.hand.map((x, k) => (k === idx ? card : x)) }), deck, rng: seedOf(r) };
    }
    return loseStep(s, by, on === 'act' ? 'block' : 'blocked');
  }
  const c = s.claim!;
  if (on === 'act' && c.paid > 0) s = note(addCoins(s, c.by, c.paid), { t: 'refund', who: c.by, n2: c.paid });
  return loseStep(s, claimer, on === 'act' ? 'done' : 'resolve');
};

/** „არ მჯერა!“ — the first one counts */
export const doubt = (g: KariGame, who: number): KariGame => {
  const ph = g.phase;
  if (ph.k !== 'doubt' || !waitingOn(g).includes(who)) return g;
  if (g.paper) return go(g, { k: 'proof', on: ph.on, by: who });
  const { claimer, role } = doubted(g, ph.on);
  return settleDoubt(g, ph.on, who, g.players[claimer].hand.includes(role));
};

/** paper: the claimer showed the card (or could not) */
export const proof = (g: KariGame, shown: boolean): KariGame => (g.phase.k === 'proof' ? settleDoubt(g, g.phase.on, g.phase.by, shown) : g);

/** the window on now closes: nobody doubted (the action goes on, a block stands) or nobody blocked (the action is done) */
export const letGo = (g: KariGame): KariGame => {
  const ph = g.phase;
  if (ph.k === 'doubt') return ph.on === 'act' ? blockOrResolve(g) : endTurn(note(g, { t: 'blocked' }));
  if (ph.k === 'block') return resolve(g);
  return g;
};

/** one lets it go; the window closes once everybody did */
export const pass = (g: KariGame, who: number): KariGame => {
  const ph = g.phase;
  if ((ph.k !== 'doubt' && ph.k !== 'block') || !waitingOn(g).includes(who)) return g;
  const s: KariGame = { ...g, phase: { ...ph, passed: [...ph.passed, who] } };
  return waitingOn(s).length ? s : letGo(s);
};

/** a block, claiming one of the action's blockers */
export const block = (g: KariGame, who: number, role: number): KariGame => {
  if (g.phase.k !== 'block' || !waitingOn(g).includes(who) || !ACTS[g.claim!.act].blockers.includes(role as Role)) return g;
  const claim: Claim = { ...g.claim!, block: { by: who, role: role as Role } };
  return go(note({ ...g, claim }, { t: 'block', by: who, role: role as Role }), { k: 'doubt', on: 'block', passed: [] }, claim);
};

/** the card turned by the one losing influence (online its place in the hand, on paper the courtier) */
export const lose = (g: KariGame, who: number, choice: number): KariGame => {
  const ph = g.phase;
  if (ph.k !== 'lose' || ph.who !== who || !Number.isInteger(choice)) return g;
  if (g.paper ? !ROLE_IDS.includes(choice as Role) : !(choice >= 0 && choice < g.players[who].hand.length)) return g;
  return afterLose(dropCard(g, who, choice), ph.then);
};

/** the swap's cards (a bit each of hand + drawn) the actor keeps — as many as they hold; the rest go back, shuffled */
export const keep = (g: KariGame, mask: number): KariGame => {
  const ph = g.phase;
  if (ph.k !== 'swap' || g.paper || !Number.isInteger(mask) || mask < 0) return g;
  const p = g.players[g.turn];
  const pool = [...p.hand, ...ph.drawn] as Role[];
  if (mask >> pool.length) return g;
  const kept = pool.filter((_, k) => mask & (1 << k));
  if (kept.length !== p.hand.length) return g;
  const r = mulberry32(g.rng);
  const deck = shuffle([...g.deck, ...pool.filter((_, k) => !(mask & (1 << k)))], r);
  return endTurn(note({ ...setPlayer(g, g.turn, { ...p, hand: kept }), deck, rng: seedOf(r) }, { t: 'swap', who: g.turn }));
};
/** paper: the actor has swapped by hand */
export const swapDone = (g: KariGame): KariGame => (g.phase.k === 'swap' && g.paper ? endTurn(note(g, { t: 'swap', who: g.turn })) : g);

/** how long a step waits online before the phone answers for whoever did not (0: it waits) */
export const KARI_SECS: Record<PhaseKind, number> = { turn: 90, doubt: 20, block: 20, proof: 0, lose: 30, swap: 45, end: 0 };

/** the step's time is over: a window closes (who did not answer lets it go), the turn takes the income (with 10 coins or
 *  more the court, on the next one), the card lost is the first, the swap keeps the old cards */
export const timeUp = (g: KariGame): KariGame => {
  const ph = g.phase;
  if (g.paper) return g;
  switch (ph.k) {
    case 'doubt':
    case 'block': return letGo(g);
    case 'turn': {
      const s = note(g, { t: 'late', who: g.turn });
      return g.players[g.turn].coins >= MUST_COUP ? declare(s, COUP, nextLive(g, g.turn)) : declare(s, INCOME);
    }
    case 'lose': return lose(note(g, { t: 'late', who: ph.who }), ph.who, 0);
    case 'swap': return keep(note(g, { t: 'late', who: g.turn }), (1 << g.players[g.turn].hand.length) - 1);
    default: return g;
  }
};

/** who won (-1: the game goes on) */
export const winnerOf = (g: KariGame) => (g.phase.k === 'end' ? g.phase.winner : -1);

// ——— kept games (the device, the host's state) read back only whole

const isInt = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const isRole = (v: unknown): v is Role => isInt(v, 0, 4);
const ints = (v: unknown, lo: number, hi: number, max: number): number[] | null =>
  (Array.isArray(v) && v.length <= max && v.every(x => isInt(x, lo, hi)) ? (v as number[]) : null);

export const parsePhase = (raw: unknown, players: number): Phase | null => {
  const o = (raw && typeof raw === 'object' ? raw : null) as Record<string, unknown> | null;
  if (!o) return null;
  const seat = (v: unknown) => isInt(v, 0, players - 1);
  const passed = ints(o.passed, 0, players - 1, players);
  switch (o.k) {
    case 'turn': return { k: 'turn' };
    case 'doubt': return (o.on === 'act' || o.on === 'block') && passed ? { k: 'doubt', on: o.on, passed } : null;
    case 'proof': return (o.on === 'act' || o.on === 'block') && seat(o.by) ? { k: 'proof', on: o.on, by: o.by as number } : null;
    case 'block': return passed ? { k: 'block', passed } : null;
    case 'lose': return seat(o.who) && ['block', 'resolve', 'blocked', 'done'].includes(o.then as string) ? { k: 'lose', who: o.who as number, then: o.then as Then } : null;
    case 'swap': { const drawn = ints(o.drawn, 0, 4, 2); return drawn ? { k: 'swap', drawn: drawn as Role[] } : null; }
    case 'end': return seat(o.winner) ? { k: 'end', winner: o.winner as number } : null;
    default: return null;
  }
};

export const parseClaim = (raw: unknown, players: number): Claim | null => {
  const o = (raw && typeof raw === 'object' ? raw : null) as Record<string, unknown> | null;
  if (!o || !isInt(o.act, 0, ACTS.length - 1) || !isInt(o.by, 0, players - 1) || !isInt(o.target, -1, players - 1) || !isInt(o.paid, 0, 7)) return null;
  const b = o.block as Record<string, unknown> | null | undefined;
  const blk = b && isInt(b.by, 0, players - 1) && isRole(b.role) ? { by: b.by as number, role: b.role as Role } : null;
  if (b && !blk) return null;
  return { act: o.act, by: o.by, target: o.target, paid: o.paid, block: blk };
};

const parseLine = (raw: unknown): Line | null => {
  const o = (raw && typeof raw === 'object' ? raw : null) as Record<string, unknown> | null;
  if (!o || !isInt(o.n, 0, 100000) || typeof o.t !== 'string') return null;
  const s = (k: string) => isInt(o[k], -1, MAX_KARI - 1);
  const ok = {
    act: s('by') && isInt(o.act, 0, ACTS.length - 1) && s('target'),
    doubt: s('by') && s('on') && isRole(o.role) && typeof o.truth === 'boolean',
    block: s('by') && isRole(o.role),
    blocked: true,
    lose: s('who') && isRole(o.role),
    out: s('who'),
    coins: s('who') && isInt(o.n2, 0, 100) && s('from'),
    refund: s('who') && isInt(o.n2, 0, 100),
    swap: s('who'),
    late: s('who'),
    win: s('who'),
  }[o.t];
  return ok ? (o as unknown as Line) : null;
};
export const parseLog = (raw: unknown): Line[] => (Array.isArray(raw) ? raw.slice(-LOG_MAX).flatMap(x => parseLine(x) ?? []) : []);

export const parseKari = (raw: unknown): KariGame | null => {
  const o = (raw && typeof raw === 'object' ? raw : null) as Partial<KariGame> | null;
  if (!o || o.v !== 1 || !Array.isArray(o.players) || o.players.length < MIN_KARI || o.players.length > MAX_KARI) return null;
  const paper = o.paper === true;
  const n = o.players.length;
  const players: KariPlayer[] = [];
  for (const p of o.players as unknown[]) {
    const q = (p && typeof p === 'object' ? p : null) as Partial<KariPlayer> | null;
    const hand = q && ints(q.hand, paper ? -1 : 0, paper ? -1 : 4, 2);
    const shown = q && ints(q.shown, 0, 4, 2);
    if (!q || typeof q.name !== 'string' || !isInt(q.coins, 0, 1000) || !hand || !shown || hand.length + shown.length !== 2) return null;
    players.push({ name: q.name.slice(0, 120), coins: q.coins, hand, shown: shown as Role[] });
  }
  const deck = ints(o.deck, 0, 4, 20);
  const phase = parsePhase(o.phase, n);
  const claim = o.claim == null ? null : parseClaim(o.claim, n);
  if (!deck || !phase || (o.claim != null && !claim) || !isInt(o.turn, 0, n - 1) || !isInt(o.n, 1, 100000) || !isInt(o.step, 0, 1e7)
    || !isInt(o.rng, 0, 0x7fffffff) || !isInt(o.first, 0, n - 1)) return null;
  if (phase.k !== 'turn' && phase.k !== 'end' && !claim) return null;
  return { v: 1, paper, players, deck: deck as Role[], turn: o.turn, n: o.n, step: o.step, rng: o.rng, claim, phase, log: parseLog(o.log), first: o.first };
};
