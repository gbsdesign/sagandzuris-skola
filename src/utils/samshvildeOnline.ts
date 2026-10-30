import {
  checkAnswer, checker, dayNext, holder, inPlay, introNext, isSpy, live, morningNext, newGame, nightNext, parseGame, stepsOf,
  targetsOf, tieNext, verdictNext, voteDone, ROLES,
  type Answer, type NightActs, type Out, type RoleId, type SamGame, type Side, type StepId,
} from './samshvilde';

// „სამშვილდის ღამე“ online (2026-10-30): every player on their own phone, the host (მემატიანე) does not play — the user's
// answers „1ა 2ა 3ა“. The host's phone keeps the whole game (OnlineState) and is the only one who writes it: the public view
// (names, who is out, the phase — never a role) goes to the room for everyone, each player's own seat (their role, their
// mates, the night choice asked of them) only to that player. Players answer with acts {key, pick, end}; the host's phone
// applies each one (applyAct) and moves the game on with the same rules as the one-phone game (utils/samshvilde.ts).
// Firestore and the screens: utils/gameRoom.ts, pages/games/samshvilde/online/. Tests: tests/samshvildeOnline.test.ts.

/** a player's answer to the step named by `key` (keyOf): a name's seat, the deal's „seen“ (1), a „no“ hand (NO) */
export interface Act { key: string; pick: number | null; end?: boolean }
/** one vote's hands by seat: a candidate's seat, NO with one accused, null — no hand */
export interface Hands { n: number; round: 1 | 2; candidates: number[]; ballots: (number | null)[] }
export interface Check { n: number; who: number; answer: Answer }

export interface OnlineState {
  v: 1;
  g: SamGame;
  /** seat → the player's uid */
  uids: string[];
  /** the step these answers belong to (keyOf); a new step starts them empty */
  key: string;
  /** the step's answers by seat: who has seen their card, the spies' pointing, the hands */
  by: (number | null)[];
  /** the speaker's clock: how many times the host started it (0 — not yet) */
  clock: number;
  /** when the host last started it (the host's ms): a phone that opens mid-speech joins the running clock */
  clockAt: number;
  /** every vote's hands, in order */
  hands: Hands[];
}

/** „არა“ — a hand against the one accused */
export const NO = -1;

/** the name of the step everybody is in: answers carry it, so a late one never lands on the next step */
export const keyOf = (g: SamGame): string => {
  const ph = g.phase;
  switch (ph.kind) {
    case 'deal': return 'deal';
    case 'night': return `n${ph.n}.${stepsOf(g, ph.n)[ph.step]}`;
    case 'morning': return `m${ph.n}`;
    case 'intro': return `i.${ph.at}`;
    case 'day': return `d${ph.n}.${ph.at}`;
    case 'vote': return `v${ph.n}.${ph.round}`;
    case 'tie': return `t${ph.n}.${ph.at}`;
    case 'verdict': return `j${ph.n}`;
    default: return 'end';
  }
};

/** a step of its own starts with no answers and its clock not started */
const settle = (s: OnlineState): OnlineState => {
  const key = keyOf(s.g);
  return s.key === key ? s : { ...s, key, by: s.uids.map(() => null), clock: 0, clockAt: 0 };
};
const withGame = (s: OnlineState, g: SamGame): OnlineState => (g === s.g ? s : settle({ ...s, g }));

/** names stay apart on every screen: a second „ნინო“ becomes „ნინო 2“ */
export const uniqueNames = (names: string[]) => {
  const seen = new Map<string, number>();
  return names.map(raw => {
    const n = raw.trim() || 'მოთამაშე';
    const k = (seen.get(n) ?? 0) + 1;
    seen.set(n, k);
    return k === 1 ? n : `${n} ${k}`;
  });
};

/** the online game of these players (in their seats' order); the phone deals at once, everybody looks on their own phone */
export const newOnline = (players: { uid: string; name: string }[], opts: { piper: boolean; kids: boolean }, rnd: () => number = Math.random): OnlineState | null => {
  if (new Set(players.map(p => p.uid)).size !== players.length) return null;
  const g = newGame(uniqueNames(players.map(p => p.name)), { deal: 'phone', piper: opts.piper, kids: opts.kids }, rnd);
  return g ? settle({ v: 1, g, uids: players.map(p => p.uid), key: '', by: [], clock: 0, clockAt: 0, hands: [] }) : null;
};

/** the same players again, the roles dealt anew */
export const againOnline = (s: OnlineState, rnd: () => number = Math.random): OnlineState | null =>
  newOnline(s.uids.map((uid, i) => ({ uid, name: s.g.players[i].name })), { piper: s.g.roles.includes('piper'), kids: s.g.kids }, rnd);

export const seenCount = (s: OnlineState) => (s.g.phase.kind === 'deal' ? s.by.filter(x => x === 1).length : s.uids.length);

const spySeats = (g: SamGame) => live(g).filter(i => isSpy(g.players[i].role));

/** the spies' one choice: every spy still in play points at the same name */
export const spiesAgree = (s: OnlineState): number | undefined => {
  const seats = spySeats(s.g);
  const picks = seats.map(i => s.by[i] ?? null);
  return seats.length > 0 && picks.every(p => p !== null && p === picks[0]) ? (picks[0] as number) : undefined;
};

/** the boss's own pointing — it counts when the spies did not agree */
export const bossPick = (s: OnlineState): number | null => {
  const b = holder(s.g, 'boss');
  return inPlay(s.g, b) ? s.by[b] ?? null : null;
};

// ——— a seat: what only its player sees

const MEET: Partial<Record<StepId, RoleId[]>> = {
  meetSpies: ['spy', 'boss'], meetWarden: ['warden', 'guard'], meetHealer: ['healer'], meetElder: ['elder'], meetPiper: ['piper'],
};

export type NightAsk =
  | { key: string; step: 'meet'; meet: StepId }
  | { key: string; step: 'piper' | 'healer'; targets: number[]; pick: number | null }
  | { key: string; step: 'spies'; targets: number[]; den: { i: number; pick: number | null }[]; agreed: number | null; boss: number }
  | { key: string; step: 'check'; targets: number[]; by: number; pick: number | null; answer: Answer | null };

/** the night's question to a seat right now (null: sleep) */
export const nightAsk = (s: OnlineState, i: number): NightAsk | null => {
  const g = s.g;
  const ph = g.phase;
  if (ph.kind !== 'night' || !inPlay(g, i)) return null;
  const step = stepsOf(g, ph.n)[ph.step];
  const role = g.players[i].role;
  const key = keyOf(g);
  const meet = MEET[step];
  if (meet) return meet.includes(role) ? { key, step: 'meet', meet: step } : null;
  if (step === 'piper' || step === 'healer') {
    return holder(g, step) === i ? { key, step, targets: targetsOf(g, step, ph.n), pick: ph.acts[step] ?? null } : null;
  }
  if (step === 'spies') {
    if (!isSpy(role)) return null;
    const b = holder(g, 'boss');
    return {
      key, step, targets: targetsOf(g, 'spies', ph.n),
      den: spySeats(g).map(j => ({ i: j, pick: s.by[j] ?? null })),
      agreed: typeof ph.acts.spies === 'number' ? ph.acts.spies : null,
      boss: inPlay(g, b) ? b : -1,
    };
  }
  if (step === 'check' && (role === 'warden' || role === 'guard')) {
    const by = checker(g);
    if (by < 0) return null;
    const pick = ph.acts.check ?? null;
    return { key, step, targets: targetsOf(g, 'check', ph.n), by, pick, answer: pick === null ? null : checkAnswer(g, ph.acts) };
  }
  return null;
};

/** the first night's meeting has reached this step (or is over) */
const met = (g: SamGame, step: StepId) => {
  const ph = g.phase;
  if (ph.kind === 'deal') return false;
  if (ph.kind === 'night' && ph.n === 1) return stepsOf(g, 1).indexOf(step) <= ph.step;
  return true;
};

/** who a seat knows: the spies each other (and their boss), the warden and the guard each other — from their meeting on */
export const matesOf = (s: OnlineState, i: number): { i: number; role: RoleId }[] => {
  const g = s.g;
  const role = g.players[i]?.role;
  const pair = (r: RoleId) => r === 'warden' || r === 'guard';
  const same = isSpy(role) ? (met(g, 'meetSpies') ? isSpy : null) : pair(role) ? (met(g, 'meetWarden') ? pair : null) : null;
  return same ? g.players.flatMap((p, j) => (j !== i && same(p.role) ? [{ i: j, role: p.role }] : [])) : [];
};

/** the warden pair's answers so far, tonight's too */
export const checksOf = (g: SamGame): Check[] => {
  const out: Check[] = g.nights.flatMap(x => (x.acts.check !== undefined && x.answer ? [{ n: x.n, who: x.acts.check, answer: x.answer }] : []));
  const ph = g.phase;
  if (ph.kind === 'night' && ph.acts.check !== undefined) out.push({ n: ph.n, who: ph.acts.check, answer: checkAnswer(g, ph.acts) });
  return out;
};

export interface SeatView {
  v: 1;
  i: number;
  role: RoleId;
  trade?: string;
  mates: { i: number; role: RoleId }[];
  night: NightAsk | null;
  checks: Check[];
}

export const seatView = (s: OnlineState, i: number): SeatView => {
  const p = s.g.players[i];
  const pair = p.role === 'warden' || p.role === 'guard';
  return { v: 1, i, role: p.role, ...(p.trade ? { trade: p.trade } : {}), mates: matesOf(s, i), night: nightAsk(s, i), checks: pair ? checksOf(s.g) : [] };
};

// ——— the room's view: what everybody sees (never a role before the end)

export type PubPhase =
  | { kind: 'deal'; seen: number[] }
  | { kind: 'night'; n: number; step: StepId; at: number; of: number }
  | { kind: 'morning'; n: number; taken: number | null }
  | { kind: 'intro'; at: number }
  | { kind: 'day'; n: number; order: number[]; at: number; accuse: (number | null)[] }
  | { kind: 'vote'; n: number; round: 1 | 2; candidates: number[]; voted: number[] }
  | { kind: 'tie'; n: number; tied: number[]; at: number; hands: Hands | null }
  | { kind: 'verdict'; n: number; jailed: number | null; accused: number[]; hands: Hands | null }
  | { kind: 'end'; winner: Side };

export interface PubView {
  v: 1;
  names: string[];
  out: (Out | null)[];
  /** the game's roles, how many of each (not who holds them) */
  roles: RoleId[];
  kids: boolean;
  key: string;
  clock: number;
  clockAt: number;
  phase: PubPhase;
  /** at the end every card is open: the whole game, for the chronicle */
  final?: SamGame;
}

const lastHands = (s: OnlineState, n: number) => [...s.hands].reverse().find(h => h.n === n) ?? null;

export const publicView = (s: OnlineState): PubView => {
  const g = s.g;
  const ph = g.phase;
  const seats = (f: (x: number | null) => boolean) => s.by.flatMap((x, i) => (f(x) ? [i] : []));
  let phase: PubPhase;
  switch (ph.kind) {
    case 'deal': phase = { kind: 'deal', seen: seats(x => x === 1) }; break;
    case 'night': { const steps = stepsOf(g, ph.n); phase = { kind: 'night', n: ph.n, step: steps[ph.step], at: ph.step, of: steps.length }; break; }
    case 'morning': phase = { kind: 'morning', n: ph.n, taken: g.nights.find(x => x.n === ph.n)?.taken ?? null }; break;
    case 'intro': phase = { kind: 'intro', at: ph.at }; break;
    case 'day': phase = { kind: 'day', n: ph.n, order: ph.order, at: ph.at, accuse: ph.accuse }; break;
    case 'vote': phase = { kind: 'vote', n: ph.n, round: ph.round, candidates: ph.candidates, voted: seats(x => x !== null) }; break;
    case 'tie': phase = { kind: 'tie', n: ph.n, tied: ph.tied, at: ph.at, hands: lastHands(s, ph.n) }; break;
    case 'verdict': phase = { kind: 'verdict', n: ph.n, jailed: ph.jailed, accused: g.days.find(d => d.n === ph.n)?.accused ?? [], hands: lastHands(s, ph.n) }; break;
    default: phase = { kind: 'end', winner: ph.winner };
  }
  return {
    v: 1, names: g.players.map(p => p.name), out: g.out, roles: g.roles, kids: g.kids, key: s.key, clock: s.clock, clockAt: s.clockAt, phase,
    ...(ph.kind === 'end' ? { final: g } : {}),
  };
};

/** a hand's meaning for the screens: how many each candidate got */
export const countsOf = (h: Pick<Hands, 'candidates' | 'ballots'>) => h.candidates.map(c => h.ballots.filter(b => b === c).length);

// ——— the players' answers (the host's phone applies each once)

const setBy = (s: OnlineState, i: number, v: number | null): OnlineState =>
  (s.by[i] === v ? s : { ...s, by: s.by.map((x, k) => (k === i ? v : x)) });

const withActs = (s: OnlineState, acts: NightActs): OnlineState => {
  const ph = s.g.phase;
  return ph.kind === 'night' ? { ...s, g: { ...s.g, phase: { ...ph, acts } } } : s;
};
const without = (acts: NightActs, k: keyof NightActs): NightActs => { const out = { ...acts }; delete out[k]; return out; };

/** one player's answer; anything not asked of that seat right now is left out */
export const applyAct = (s: OnlineState, i: number, a: Act): OnlineState => {
  const g = s.g;
  const ph = g.phase;
  if (a.key !== s.key || a.key !== keyOf(g) || i < 0 || i >= s.uids.length) return s;
  const pick = a.pick;
  switch (ph.kind) {
    case 'deal': return pick === 1 ? setBy(s, i, 1) : s;
    case 'night': {
      const ask = nightAsk(s, i);
      if (!ask || ask.step === 'meet') return s;
      const ok = pick !== null && ask.targets.includes(pick);
      if (ask.step === 'piper' || ask.step === 'healer') {
        if (pick === null) return withActs(s, without(ph.acts, ask.step));
        return ok ? withActs(s, { ...ph.acts, [ask.step]: pick }) : s;
      }
      if (ask.step === 'spies') {
        if (!ok && pick !== null) return s;
        const next = setBy(s, i, pick);
        const agreed = spiesAgree(next);
        return withActs(next, agreed === undefined ? without(ph.acts, 'spies') : { ...ph.acts, spies: agreed });
      }
      // the check: only the one who answers for the pair, once — the answer is on their phone at once
      if (ask.step !== 'check' || ask.by !== i || ph.acts.check !== undefined || !ok) return s;
      return withActs(s, { ...ph.acts, check: pick });
    }
    case 'intro': return a.end && i === ph.at ? withGame(s, introNext(g)) : s;
    case 'day': {
      if (i !== ph.order[ph.at]) return s;
      let next = s;
      if (pick === null || (pick !== i && inPlay(g, pick))) next = { ...s, g: { ...g, phase: { ...ph, accuse: ph.accuse.map((x, k) => (k === ph.at ? pick : x)) } } };
      return a.end ? withGame(next, dayNext(next.g)) : next;
    }
    case 'vote': {
      if (!inPlay(g, i)) return s;
      const ok = pick === null || ph.candidates.includes(pick) || (pick === NO && ph.candidates.length === 1);
      return ok ? setBy(s, i, pick) : s;
    }
    case 'tie': return a.end && i === ph.tied[ph.at] ? withGame(s, tieNext(g)) : s;
    default: return s;
  }
};

// ——— the host's own taps

/** the night's choices set on the host's phone (a player whose phone is gone) */
export const hostActs = (s: OnlineState, acts: NightActs): OnlineState => withActs(s, acts);

/** the speaker's accusation, set by the host */
export const hostAccuse = (s: OnlineState, accused: number | null): OnlineState => {
  const ph = s.g.phase;
  return ph.kind === 'day' ? { ...s, g: { ...s.g, phase: { ...ph, accuse: ph.accuse.map((x, k) => (k === ph.at ? accused : x)) } } } : s;
};

/** the speech clock starts (again) on every phone */
export const startClock = (s: OnlineState, now = Date.now()): OnlineState => ({ ...s, clock: s.clock + 1, clockAt: now });

/** the vote is over: the hands count as they are (no hand — for nobody) */
export const closeVote = (s: OnlineState): OnlineState => {
  const ph = s.g.phase;
  if (ph.kind !== 'vote') return s;
  const hands: Hands = { n: ph.n, round: ph.round, candidates: ph.candidates, ballots: s.by.map((b, i) => (inPlay(s.g, i) ? b : null)) };
  const g = voteDone({ ...s.g, phase: { ...ph, counts: countsOf(hands) } });
  return settle({ ...s, g, hands: [...s.hands, hands] });
};

/** the host's „next“ for every phase; at the spies' step without agreement the boss's pointing counts, else nobody */
export const hostNext = (s: OnlineState): OnlineState => {
  const g = s.g;
  const ph = g.phase;
  switch (ph.kind) {
    case 'deal': return withGame(s, { ...g, phase: { kind: 'night', n: 1, step: 0, acts: {}, marks: {} } });
    case 'night': {
      const step = stepsOf(g, ph.n)[ph.step];
      let acts = ph.acts;
      if (step === 'spies' && acts.spies === undefined && targetsOf(g, 'spies', ph.n).length) {
        const b = bossPick(s);
        acts = { ...acts, spies: b !== null && targetsOf(g, 'spies', ph.n).includes(b) ? b : null };
      }
      return withGame(s, nightNext({ ...g, phase: { ...ph, acts } }));
    }
    case 'morning': return withGame(s, morningNext(g));
    case 'intro': return withGame(s, introNext(g));
    case 'day': return withGame(s, dayNext(g));
    case 'vote': return closeVote(s);
    case 'tie': return withGame(s, tieNext(g));
    case 'verdict': return withGame(s, verdictNext(g));
    default: return s;
  }
};

/** who still owes the host an answer at this step (the host may go on anyway) */
export const waitingFor = (s: OnlineState): number[] => {
  const g = s.g;
  const ph = g.phase;
  if (ph.kind === 'deal') return s.uids.flatMap((_, i) => (s.by[i] === 1 ? [] : [i]));
  if (ph.kind === 'vote') return live(g).filter(i => s.by[i] === null);
  if (ph.kind !== 'night') return [];
  const step = stepsOf(g, ph.n)[ph.step];
  if (step === 'spies') return spiesAgree(s) === undefined && ph.acts.spies === undefined ? spySeats(g).filter(i => s.by[i] === null) : [];
  if (step === 'piper' || step === 'healer' || step === 'check') {
    const who = step === 'check' ? checker(g) : holder(g, step);
    return inPlay(g, who) && targetsOf(g, step, ph.n).length && ph.acts[step] === undefined ? [who] : [];
  }
  return [];
};

// ——— reading the room's documents back (written by the host's phone as JSON)

const json = (raw: unknown): Record<string, unknown> | null => {
  if (typeof raw !== 'string' || !raw) return null;
  try { const o = JSON.parse(raw); return o && typeof o === 'object' ? o : null; } catch { return null; }
};
const ROLE_IDS = Object.keys(ROLES);
const PHASES = ['deal', 'night', 'morning', 'intro', 'day', 'vote', 'tie', 'verdict', 'end'];
const isInt = (x: unknown) => Number.isInteger(x);

export const parseState = (raw: unknown): OnlineState | null => {
  const o = json(raw);
  if (!o || o.v !== 1 || !Array.isArray(o.uids)) return null;
  const g = parseGame(o.g);
  if (!g || o.uids.length !== g.players.length || !o.uids.every(u => typeof u === 'string')) return null;
  const by = Array.isArray(o.by) && o.by.length === g.players.length ? o.by.map(x => (isInt(x) ? (x as number) : null)) : g.players.map(() => null);
  const hands = Array.isArray(o.hands) ? (o.hands as Hands[]).filter(h => h && Array.isArray(h.candidates) && Array.isArray(h.ballots)) : [];
  return settle({ v: 1, g, uids: o.uids as string[], key: typeof o.key === 'string' ? o.key : '', by, clock: isInt(o.clock) ? (o.clock as number) : 0, clockAt: isInt(o.clockAt) ? (o.clockAt as number) : 0, hands });
};

export const parseView = (raw: unknown): PubView | null => {
  const o = json(raw);
  if (!o || o.v !== 1 || !Array.isArray(o.names) || !o.names.every(n => typeof n === 'string')) return null;
  const ph = o.phase as { kind?: unknown } | undefined;
  if (!Array.isArray(o.out) || o.out.length !== o.names.length || !ph || !PHASES.includes(String(ph.kind)) || typeof o.key !== 'string') return null;
  const v = o as unknown as PubView;
  return { ...v, roles: Array.isArray(v.roles) ? v.roles.filter(r => ROLE_IDS.includes(r)) : [], clock: isInt(v.clock) ? v.clock : 0, clockAt: isInt(v.clockAt) ? v.clockAt : 0, final: v.final ? parseGame(v.final) ?? undefined : undefined };
};

export const parseSeat = (raw: unknown): SeatView | null => {
  const o = json(raw);
  if (!o || o.v !== 1 || !isInt(o.i) || !ROLE_IDS.includes(String(o.role)) || !Array.isArray(o.mates) || !Array.isArray(o.checks)) return null;
  return o as unknown as SeatView;
};
