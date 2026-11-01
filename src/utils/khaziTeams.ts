import { fits, isPick, sortLine, type KhaziCard, type KhaziPick, type Placed } from './khazi';

// „დროის ხაზი“ on one screen (2026-11-01): the teams share one line on the phone or a projector. In turn a team gets the next
// card, says where it goes, the host taps that gap: right — the card stays in the team's colour and the team gets a point;
// wrong (or the turn's clock runs out) — the card goes to its right place, marked, and nobody scores. Either way the turn
// passes. The game ends after a whole round in which a team reached the goal (every team has had as many turns), or when the
// deck runs out.

export const KHAZI_GOALS = [5, 7, 10] as const;
export const KHAZI_TURN_SECS = [0, 30, 60] as const;

export interface KhaziTeams {
  names: string[];
  scores: number[];
  pick: KhaziPick;
  /** the deck in its dealt order; order[0] starts the line */
  order: string[];
  /** the next card to place */
  at: number;
  placed: Placed[];
  turn: number;
  goal: number;
  secs: number;
  /** when the turn's clock started */
  t0: number;
  /** the last placed card, for the reveal */
  last: { id: string; ok: boolean; team: number } | null;
  over: boolean;
  /** the step before the last one, for „უკან“ */
  prev: Omit<KhaziTeams, 'prev'> | null;
}

export const newKhaziTeams = (names: string[], pick: KhaziPick, deck: KhaziCard[], goal: number, secs: number, now: number): KhaziTeams => ({
  names, scores: names.map(() => 0), pick, order: deck.map(c => c.id), at: 1,
  placed: deck.length ? [{ id: deck[0].id, ok: null }] : [], turn: 0, goal, secs, t0: now, last: null, over: deck.length < 2, prev: null,
});

const strip = (g: KhaziTeams): Omit<KhaziTeams, 'prev'> => { const { prev: _prev, ...rest } = g; return rest; };

/** after a turn: the next team, and whether the game is over */
const passTurn = (g: KhaziTeams, now: number): KhaziTeams => {
  const turn = (g.turn + 1) % g.names.length;
  const roundDone = turn === 0;
  const over = g.at >= g.order.length || (roundDone && g.scores.some(s => s >= g.goal));
  return { ...g, turn, t0: now, over };
};

/** the team whose turn it is puts the card at gap `gap` of the sorted line */
export const placeCard = (g: KhaziTeams, gap: number, byId: (id: string) => KhaziCard | undefined, now: number): KhaziTeams => {
  if (g.over || g.at >= g.order.length) return g;
  const card = byId(g.order[g.at]);
  if (!card) return g;
  const line = sortLine(g.placed, byId).map(p => byId(p.id)).filter((c): c is KhaziCard => !!c);
  const ok = fits(line, gap, card);
  const scores = ok ? g.scores.map((s, t) => (t === g.turn ? s + 1 : s)) : g.scores;
  return passTurn({
    ...g, prev: strip(g), scores, at: g.at + 1,
    placed: [...g.placed, ok ? { id: card.id, ok, team: g.turn } : { id: card.id, ok }],
    last: { id: card.id, ok, team: g.turn },
  }, now);
};

/** the turn's clock ran out: the card goes to its place unanswered */
export const timeUp = (g: KhaziTeams, now: number): KhaziTeams => {
  if (g.over || g.at >= g.order.length) return g;
  const id = g.order[g.at];
  return passTurn({ ...g, prev: strip(g), at: g.at + 1, placed: [...g.placed, { id, ok: false }], last: { id, ok: false, team: g.turn } }, now);
};

export const undo = (g: KhaziTeams, now: number): KhaziTeams => (g.prev ? { ...g.prev, prev: null, t0: now } : g);

/** the winners: every team with the best score */
export const winners = (g: KhaziTeams) => { const best = Math.max(...g.scores); return g.names.filter((_, t) => g.scores[t] === best); };

/** a game kept on the device, checked field by field */
export const parseKhaziTeams = (raw: unknown, known: (id: string) => boolean): KhaziTeams | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<KhaziTeams>;
  const names = Array.isArray(o.names) ? o.names.filter((n): n is string => typeof n === 'string') : [];
  const order = Array.isArray(o.order) ? o.order.filter((id): id is string => typeof id === 'string' && known(id)) : [];
  if (names.length < 2 || order.length < 2 || !isPick(o.pick)) return null;
  const placed = Array.isArray(o.placed)
    ? o.placed.filter((p): p is Placed => !!p && typeof p === 'object' && typeof p.id === 'string' && known(p.id))
      .map(p => ({ id: p.id, ok: p.ok === true || p.ok === false ? p.ok : null, ...(typeof p.team === 'number' ? { team: p.team } : {}) }))
    : [];
  if (!placed.length) return null;
  const n = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  return {
    names,
    scores: names.map((_, t) => n(o.scores?.[t], 0)),
    pick: o.pick, order, at: Math.min(order.length, Math.max(1, n(o.at, 1))), placed,
    turn: Math.min(names.length - 1, Math.max(0, n(o.turn, 0))),
    goal: n(o.goal, 7), secs: n(o.secs, 0), t0: n(o.t0, 0),
    last: o.last && typeof o.last.id === 'string' ? { id: o.last.id, ok: !!o.last.ok, team: n(o.last.team, 0) } : null,
    over: !!o.over, prev: null,
  };
};
