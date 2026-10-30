import { shuffle } from './otkheuli';

// „სამშვილდის ღამე“ on the phone (games hub, 2026-10-30, live, hybrid): the school's Mafia with the printed kit's roles,
// table and night words (scripts/print-games/games/samshvildis-game.mjs — keep the two alike). The phone deals the roles
// as it is passed round, or the host deals the printed cards and marks on the first night who woke up; then the host taps
// the night's choices and the phone works out the morning, keeps the speaking order, counts the votes and at the end
// tells the chronicle. Every step is a pure function of the game, so the page keeps the game after every tap and goes
// back a step from a copy. Tests in tests/samshvilde.test.ts; the page pages/games/SamshvildeGame.tsx.

export type RoleId = 'citizen' | 'spy' | 'boss' | 'warden' | 'guard' | 'healer' | 'elder' | 'piper';
export type Deal = 'phone' | 'cards';
export type Side = 'city' | 'spies';
/** why a night ended without a capture */
export type Quiet = 'noAgree' | 'asleep' | 'healed' | 'elder';
/** the host's nod at the warden's check */
export type Answer = 'spy' | 'no' | 'none';

export interface RoleInfo { name: string; text: string }

// the cards' words
export const ROLES: Record<RoleId, RoleInfo> = {
  citizen: { name: 'მოქალაქე', text: 'დღისით ბჭობ და ხმას აძლევ, ღამით გძინავს. ხელობა მხოლოდ სურათია — ძალა ყველას ერთნაირი აქვს: მსჯელობა და ხმა.' },
  spy: { name: 'ჯაშუში', text: 'მტრის ჯაშუში ხარ, მოქალაქედ გადაცმული. ღამით სხვა ჯაშუშებთან ერთად ერთ მოქალაქეს ტყვედ მიჰყავხართ.' },
  boss: { name: 'ჯაშუშთა თავკაცი', text: 'ჯაშუშებთან ერთად იღვიძებ; თუ ვერ შეთანხმდნენ, შენ წყვეტ. ციხისთავის შემოწმებისას მოქალაქედ ჩანხარ.' },
  warden: { name: 'ციხისთავი', text: 'ღამით ერთ კაცზე მიუთითებ — მემატიანე თავის დაქნევით გეტყვის, ჯაშუშია თუ არა. 13 მოთამაშიდან მეციხოვნე გეხმარება.' },
  guard: { name: 'მეციხოვნე', text: 'ციხისთავთან ერთად იღვიძებ, ერთად ამოწმებთ ერთ კაცს და ერთმანეთს ენდობით. თამაშობს 13 მოთამაშიდან.' },
  healer: { name: 'მკურნალი', text: 'კარაბადინის მცოდნე ხარ. ღამით ერთ სახლს ლამპრით იცავ — იქ გატაცება არ ხდება. ზედიზედ ერთსა და იმავეს არა.' },
  elder: { name: 'უხუცესი', text: 'ქალაქის პატივცემული უხუცესი ხარ. პირველ გატაცებას გადაურჩები — მეზობლები გიდარაჯებენ; მეორეს ვეღარ.' },
  piper: { name: 'მესტვირე', text: 'ღამით ერთ კაცს სტვირით აძინებ — მისი მოქმედება ამ ღამეს არ ითვლება. ზედიზედ ერთსა და იმავეს არა, შედეგს ვერ იგებ.' },
};

/** the twelve trades of the citizens' cards */
export const TRADES = ['მჭედელი', 'მეთუნე', 'მევენახე', 'მეწისქვილე', 'მქსოველი', 'მეპურე', 'მწყემსი', 'ოქრომჭედელი', 'ქვისმთლელი', 'მგალობელი', 'მწიგნობარი', 'მხატვარი'];

export const MIN_PLAYERS = 6;
export const MAX_PLAYERS = 16;
/** the little ones' game is for 6–9 players */
export const KIDS_MAX = 9;
/** seconds of a day's speech, of the little ones' speech, of a tied one's speech; the spies agree while the host counts to ten */
export const SPEECH = 60;
export const KIDS_SPEECH = 30;
export const TIE_SPEECH = 30;
export const SPIES_COUNT = 10;

export const isSpy = (r: RoleId) => r === 'spy' || r === 'boss';

// the printed table: players → spies, boss, warden, guard, healer, elder, piper ('opt' = by choice, then one citizen less)
type Row = [number, number, number, number, number, number, number | 'opt'];
const TABLE: Record<number, Row> = {
  6: [1, 0, 1, 0, 1, 0, 0], 7: [2, 0, 1, 0, 1, 0, 0], 8: [2, 0, 1, 0, 1, 0, 0], 9: [1, 1, 1, 0, 1, 1, 0], 10: [1, 1, 1, 0, 1, 1, 0],
  11: [2, 1, 1, 0, 1, 1, 'opt'], 12: [2, 1, 1, 0, 1, 1, 'opt'], 13: [2, 1, 1, 1, 1, 1, 'opt'], 14: [2, 1, 1, 1, 1, 1, 'opt'],
  15: [3, 1, 1, 1, 1, 1, 1], 16: [3, 1, 1, 1, 1, 1, 1],
};

/** the piper is up to the players for 11–14 (an experienced group) */
export const piperOptional = (players: number) => TABLE[players]?.[6] === 'opt';
export const kidsAllowed = (players: number) => players >= MIN_PLAYERS && players <= KIDS_MAX;

export interface Setup { players: number; piper: boolean; kids: boolean }

/** the roles of a game, as the printed table gives them; citizens fill the rest. The little ones' game keeps only the
 * spies (the boss plays a plain spy), the warden, the healer and citizens. */
export const roleSet = ({ players, piper, kids }: Setup): RoleId[] => {
  const row = TABLE[players];
  if (!row) return [];
  const [spies, boss, warden, guard, healer, elder, pip] = row;
  const out: RoleId[] = [];
  const add = (r: RoleId, n: number) => { for (let i = 0; i < n; i++) out.push(r); };
  if (kids && kidsAllowed(players)) {
    add('spy', spies + boss); add('warden', warden); add('healer', healer);
  } else {
    add('spy', spies); add('boss', boss); add('warden', warden); add('guard', guard); add('healer', healer); add('elder', elder);
    if (pip === 1 || (pip === 'opt' && piper)) add('piper', 1);
  }
  add('citizen', players - out.length);
  return out;
};

/** how many of each role a set has, in the cards' order */
export const roleCounts = (roles: RoleId[]) =>
  (['spy', 'boss', 'warden', 'guard', 'healer', 'elder', 'piper', 'citizen'] as RoleId[])
    .map(id => ({ id, n: roles.filter(r => r === id).length }))
    .filter(x => x.n > 0);

export interface Player { name: string; role: RoleId; trade?: string }
export interface Out { by: 'taken' | 'jailed'; at: number }
export interface NightActs { piper?: number; spies?: number | null; healer?: number; check?: number }
export interface NightLog { n: number; acts: NightActs; taken: number | null; why: Quiet | null; answer: Answer | null; checker?: number }
export interface DayLog { n: number; accused: number[]; tie: number[]; jailed: number | null }
/** who the host marked on the first night when the printed cards were dealt */
export type Marks = Partial<Record<'spies' | 'boss' | 'warden' | 'guard' | 'healer' | 'elder' | 'piper', number[]>>;

export type Phase =
  | { kind: 'deal'; at: number; show: boolean }
  | { kind: 'night'; n: number; step: number; acts: NightActs; marks: Marks }
  | { kind: 'morning'; n: number }
  | { kind: 'intro'; at: number }
  | { kind: 'day'; n: number; order: number[]; at: number; accuse: (number | null)[] }
  | { kind: 'vote'; n: number; round: 1 | 2; candidates: number[]; counts: number[]; accused: number[] }
  | { kind: 'tie'; n: number; tied: number[]; at: number; accused: number[] }
  | { kind: 'verdict'; n: number; jailed: number | null }
  | { kind: 'end'; winner: Side };

export interface SamGame {
  v: 1;
  deal: Deal;
  kids: boolean;
  roles: RoleId[];
  players: Player[];
  out: (Out | null)[];
  /** the elder's first capture is still ahead */
  shield: boolean;
  nights: NightLog[];
  days: DayLog[];
  phase: Phase;
}

/** deals the roles to the names at random; every citizen gets a trade of the printed cards, all different */
export const dealRoles = (names: string[], roles: RoleId[], rnd: () => number): Player[] => {
  const r = shuffle(roles, rnd);
  const trades = shuffle(TRADES, rnd);
  let t = 0;
  return names.map((name, i) => (r[i] === 'citizen' ? { name, role: r[i], trade: trades[t++ % trades.length] } : { name, role: r[i] }));
};

export const newGame = (names: string[], opts: { deal: Deal; piper: boolean; kids: boolean }, rnd: () => number = Math.random): SamGame | null => {
  if (names.length < MIN_PLAYERS || names.length > MAX_PLAYERS) return null;
  const kids = opts.kids && kidsAllowed(names.length);
  const roles = roleSet({ players: names.length, piper: opts.piper, kids });
  const players = opts.deal === 'phone' ? dealRoles(names, roles, rnd) : names.map(name => ({ name, role: 'citizen' as RoleId }));
  return {
    v: 1, deal: opts.deal, kids, roles, players, out: names.map(() => null), shield: true, nights: [], days: [],
    phase: opts.deal === 'phone' ? { kind: 'deal', at: 0, show: false } : { kind: 'night', n: 1, step: 0, acts: {}, marks: {} },
  };
};

export const speechOf = (g: SamGame) => (g.kids ? KIDS_SPEECH : SPEECH);
export const inPlay = (g: SamGame, i: number) => i >= 0 && i < g.players.length && !g.out[i];
export const live = (g: SamGame) => g.players.map((_, i) => i).filter(i => !g.out[i]);
/** the one who holds a role (-1: nobody) */
export const holder = (g: SamGame, role: RoleId) => g.players.findIndex(p => p.role === role);
/** who answers for the warden's pair: the warden, else the guard while the warden is out */
export const checker = (g: SamGame) => {
  const w = holder(g, 'warden');
  if (inPlay(g, w)) return w;
  const gu = holder(g, 'guard');
  return inPlay(g, gu) ? gu : -1;
};

export const winner = (g: SamGame): Side | null => {
  let spies = 0, city = 0;
  g.players.forEach((p, i) => { if (!g.out[i]) { if (isSpy(p.role)) spies++; else city++; } });
  if (!spies) return 'city';
  return spies >= city ? 'spies' : null;
};

// ——— the night

export type StepId = 'dusk' | 'meetSpies' | 'meetWarden' | 'meetHealer' | 'meetElder' | 'meetPiper' | 'piper' | 'spies' | 'healer' | 'check';

/** the night's steps: the first night every role wakes once to be known, the others in the printed order. A role whose
 * holder is out keeps its step — the host says the same words and waits the same, so nobody learns who is gone. */
export const stepsOf = (g: SamGame, n: number): StepId[] => {
  const has = (r: RoleId) => g.roles.includes(r);
  if (n === 1) {
    return ['dusk', 'meetSpies', ...(has('warden') ? ['meetWarden' as const] : []), ...(has('healer') ? ['meetHealer' as const] : []),
      ...(has('elder') ? ['meetElder' as const] : []), ...(has('piper') ? ['meetPiper' as const] : [])];
  }
  return ['dusk', ...(has('piper') ? ['piper' as const] : []), 'spies', ...(has('healer') ? ['healer' as const] : []), ...(has('warden') ? ['check' as const] : [])];
};

const prevActs = (g: SamGame, n: number) => g.nights.find(x => x.n === n - 1)?.acts ?? {};

/** whom a step may point at (an empty list: the role is out, the step is only its words and its pause) */
export const targetsOf = (g: SamGame, step: StepId, n: number): number[] => {
  const all = live(g);
  const before = prevActs(g, n);
  if (step === 'piper') {
    const p = holder(g, 'piper');
    return inPlay(g, p) ? all.filter(i => i !== p && i !== before.piper) : [];
  }
  if (step === 'spies') return all.filter(i => !isSpy(g.players[i].role));
  if (step === 'healer') {
    const h = holder(g, 'healer');
    return inPlay(g, h) ? all.filter(i => i !== before.healer) : [];
  }
  if (step === 'check') {
    const c = checker(g);
    if (c < 0) return [];
    return all.filter(i => g.players[i].role !== 'warden' && g.players[i].role !== 'guard');
  }
  return [];
};

/** the nod at a check: the boss looks a citizen; a sleeping warden gets no answer */
export const checkAnswer = (g: SamGame, acts: NightActs): Answer => {
  const c = checker(g);
  if (c < 0 || acts.check === undefined) return 'none';
  if (acts.piper === c) return 'none';
  return g.players[acts.check]?.role === 'spy' ? 'spy' : 'no';
};

/** the morning of a night: who was taken, or why the night passed quietly */
export const resolveNight = (g: SamGame, acts: NightActs): { taken: number | null; why: Quiet | null; shieldUsed: boolean } => {
  const t = acts.spies;
  if (t === null || t === undefined || !inPlay(g, t)) return { taken: null, why: 'noAgree', shieldUsed: false };
  // a lone spy put to sleep takes nobody; while others are awake they still do
  const spies = live(g).filter(i => isSpy(g.players[i].role));
  if (spies.length > 0 && spies.every(i => acts.piper === i)) return { taken: null, why: 'asleep', shieldUsed: false };
  const h = holder(g, 'healer');
  if (inPlay(g, h) && acts.piper !== h && acts.healer === t) return { taken: null, why: 'healed', shieldUsed: false };
  if (g.players[t].role === 'elder' && g.shield) return { taken: null, why: 'elder', shieldUsed: true };
  return { taken: t, why: null, shieldUsed: false };
};

// the marks the first night needs when the printed cards were dealt
const MARK_OF: Partial<Record<StepId, { key: keyof Marks; role: RoleId }[]>> = {
  meetSpies: [{ key: 'spies', role: 'spy' }, { key: 'boss', role: 'boss' }],
  meetWarden: [{ key: 'warden', role: 'warden' }, { key: 'guard', role: 'guard' }],
  meetHealer: [{ key: 'healer', role: 'healer' }],
  meetElder: [{ key: 'elder', role: 'elder' }],
  meetPiper: [{ key: 'piper', role: 'piper' }],
};

export interface MarkAsk { key: keyof Marks; role: RoleId; need: number; from: number[]; picked: number[] }

/** what the host marks at a step of the first night (the cards' game): how many, out of whom. The spies are marked with
 * their boss (spies + boss wake together), then the boss among them. */
export const markAsks = (g: SamGame, step: StepId, marks: Marks): MarkAsk[] => {
  if (g.deal !== 'cards') return [];
  const asks = MARK_OF[step] ?? [];
  const count = (r: RoleId) => g.roles.filter(x => x === r).length;
  const taken = new Set<number>();
  for (const [k, v] of Object.entries(marks)) if (k !== 'boss') (v ?? []).forEach(i => taken.add(i));
  return asks.flatMap(({ key, role }): MarkAsk[] => {
    if (key === 'boss') {
      if (!count('boss')) return [];
      const spies = marks.spies ?? [];
      return [{ key, role, need: 1, from: spies, picked: (marks.boss ?? []).filter(i => spies.includes(i)) }];
    }
    const need = key === 'spies' ? count('spy') + count('boss') : count(role);
    if (!need) return [];
    const mine = marks[key] ?? [];
    return [{ key, role, need, from: g.players.map((_, i) => i).filter(i => !taken.has(i) || mine.includes(i)), picked: mine }];
  });
};

export const marksDone = (asks: MarkAsk[]) => asks.every(a => a.picked.length === a.need);

/** a tap on a name while marking: in or out of the list, never more than it needs */
export const toggleMark = (marks: Marks, ask: MarkAsk, i: number): Marks => {
  const cur = marks[ask.key] ?? [];
  const next = cur.includes(i) ? cur.filter(x => x !== i) : ask.need === 1 ? [i] : cur.length < ask.need ? [...cur, i] : cur;
  const out: Marks = { ...marks, [ask.key]: next };
  if (ask.key === 'spies' && marks.boss) out.boss = marks.boss.filter(b => next.includes(b));
  return out;
};

/** the cards' roles from the first night's marks: the boss out of the spies, everybody unmarked a citizen */
export const rolesFromMarks = (g: SamGame, marks: Marks): Player[] => {
  const role = (i: number): RoleId => {
    if (marks.boss?.includes(i)) return 'boss';
    if (marks.spies?.includes(i)) return 'spy';
    for (const r of ['warden', 'guard', 'healer', 'elder', 'piper'] as const) if (marks[r]?.includes(i)) return r;
    return 'citizen';
  };
  return g.players.map((p, i) => ({ name: p.name, role: role(i) }));
};

/** a step is done when its choice is made (or there is none to make) */
export const stepReady = (g: SamGame, step: StepId, n: number, acts: NightActs, marks: Marks) => {
  if (step === 'piper' || step === 'spies' || step === 'healer' || step === 'check') {
    return targetsOf(g, step, n).length === 0 || acts[step] !== undefined;
  }
  return step === 'dusk' || marksDone(markAsks(g, step, marks));
};

// ——— moving on (each returns a new game)

export const dealNext = (g: SamGame): SamGame => {
  if (g.phase.kind !== 'deal') return g;
  if (!g.phase.show) return { ...g, phase: { ...g.phase, show: true } };
  const at = g.phase.at + 1;
  return { ...g, phase: at < g.players.length ? { kind: 'deal', at, show: false } : { kind: 'night', n: 1, step: 0, acts: {}, marks: {} } };
};

/** the night's next step, or its morning */
export const nightNext = (g: SamGame): SamGame => {
  const ph = g.phase;
  if (ph.kind !== 'night') return g;
  const steps = stepsOf(g, ph.n);
  if (ph.step + 1 < steps.length) return { ...g, phase: { ...ph, step: ph.step + 1 } };
  if (ph.n === 1) {
    const players = g.deal === 'cards' ? rolesFromMarks(g, ph.marks) : g.players;
    return { ...g, players, nights: [...g.nights, { n: 1, acts: {}, taken: null, why: null, answer: null }], phase: { kind: 'morning', n: 1 } };
  }
  const { taken, why, shieldUsed } = resolveNight(g, ph.acts);
  const c = checker(g);
  const answer = g.roles.includes('warden') ? checkAnswer(g, ph.acts) : null;
  const out = g.out.map((o, i) => (i === taken ? { by: 'taken' as const, at: ph.n } : o));
  return {
    ...g, out, shield: g.shield && !shieldUsed,
    nights: [...g.nights, { n: ph.n, acts: ph.acts, taken, why, answer, ...(c >= 0 ? { checker: c } : {}) }],
    phase: { kind: 'morning', n: ph.n },
  };
};

/** today's speakers in the circle's order: every day starts one seat further round */
export const speakOrder = (g: SamGame, n: number): number[] => {
  const all = live(g);
  if (!all.length) return [];
  const seat = (n - 1) % g.players.length;
  const k = all.findIndex(i => i >= seat);
  const s = k < 0 ? 0 : k;
  return [...all.slice(s), ...all.slice(0, s)];
};

export const morningNext = (g: SamGame): SamGame => {
  if (g.phase.kind !== 'morning') return g;
  const w = winner(g);
  if (w) return { ...g, phase: { kind: 'end', winner: w } };
  const n = g.phase.n;
  if (n === 1) return { ...g, phase: { kind: 'intro', at: 0 } };
  const order = speakOrder(g, n);
  return { ...g, phase: { kind: 'day', n, order, at: 0, accuse: order.map(() => null) } };
};

const night = (n: number): Phase => ({ kind: 'night', n, step: 0, acts: {}, marks: {} });

export const introNext = (g: SamGame): SamGame => {
  if (g.phase.kind !== 'intro') return g;
  const at = g.phase.at + 1;
  return { ...g, phase: at < g.players.length ? { kind: 'intro', at } : night(2) };
};

/** the accused in the order they were named, each once */
export const accusedOf = (accuse: (number | null)[]) => [...new Set(accuse.filter((x): x is number => x !== null))];

const verdict = (g: SamGame, n: number, accused: number[], tie: number[], jailed: number | null): SamGame => ({
  ...g,
  out: g.out.map((o, i) => (i === jailed ? { by: 'jailed' as const, at: n } : o)),
  days: [...g.days, { n, accused, tie, jailed }],
  phase: { kind: 'verdict', n, jailed },
});

/** the next speaker; after the last, the vote (or, with nobody accused, a day without a verdict) */
export const dayNext = (g: SamGame): SamGame => {
  const ph = g.phase;
  if (ph.kind !== 'day') return g;
  if (ph.at + 1 < ph.order.length) return { ...g, phase: { ...ph, at: ph.at + 1 } };
  const accused = accusedOf(ph.accuse);
  if (!accused.length) return verdict(g, ph.n, [], [], null);
  return { ...g, phase: { kind: 'vote', n: ph.n, round: 1, candidates: accused, counts: accused.map(() => 0), accused } };
};

/** one accused goes to prison with more than half of the hands */
export const majority = (voters: number) => Math.floor(voters / 2) + 1;

/** the day's hands: one accused — „ციხეში“ needs more than half the voters; several — the most hands win, a tie talks
 * and votes again among the tied, a second tie jails nobody */
export const voteResult = (candidates: number[], counts: number[], voters: number, round: 1 | 2): { jailed: number | null; tie: number[] } => {
  if (!candidates.length) return { jailed: null, tie: [] };
  if (candidates.length === 1) return { jailed: (counts[0] ?? 0) >= majority(voters) ? candidates[0] : null, tie: [] };
  const top = Math.max(...counts);
  const best = candidates.filter((_, i) => counts[i] === top);
  if (best.length === 1) return { jailed: best[0], tie: [] };
  return { jailed: null, tie: round === 1 ? best : [] };
};

export const voteDone = (g: SamGame): SamGame => {
  const ph = g.phase;
  if (ph.kind !== 'vote') return g;
  const { jailed, tie } = voteResult(ph.candidates, ph.counts, live(g).length, ph.round);
  if (tie.length) return { ...g, phase: { kind: 'tie', n: ph.n, tied: tie, at: 0, accused: ph.accused } };
  return verdict(g, ph.n, ph.accused, ph.round === 2 ? ph.candidates : [], jailed);
};

export const tieNext = (g: SamGame): SamGame => {
  const ph = g.phase;
  if (ph.kind !== 'tie') return g;
  if (ph.at + 1 < ph.tied.length) return { ...g, phase: { ...ph, at: ph.at + 1 } };
  return { ...g, phase: { kind: 'vote', n: ph.n, round: 2, candidates: ph.tied, counts: ph.tied.map(() => 0), accused: ph.accused } };
};

export const verdictNext = (g: SamGame): SamGame => {
  if (g.phase.kind !== 'verdict') return g;
  const w = winner(g);
  return { ...g, phase: w ? { kind: 'end', winner: w } : night(g.phase.n + 1) };
};

// ——— the chronicle, read out at the end with every card open

const QUIET_TEXT: Record<Quiet, string> = {
  noAgree: 'ჯაშუშები ვერ შეთანხმდნენ',
  asleep: 'ერთადერთ ჯაშუშს მესტვირემ ჩააძინა',
  healed: 'მკურნალმა ლამპრით დაიცვა',
  elder: 'უხუცესს მეზობლები დაუდარაჯდნენ',
};

export const roleName = (p: Player) => ROLES[p.role].name;

export const chronicle = (g: SamGame): { head: string; lines: string[] }[] => {
  const nm = (i: number | undefined | null) => (i === undefined || i === null ? '' : g.players[i]?.name ?? '');
  const who = (i: number) => `${nm(i)} (${roleName(g.players[i]).toLowerCase()})`;
  const out: { head: string; lines: string[] }[] = [];
  const last = Math.max(0, ...g.nights.map(x => x.n), ...g.days.map(x => x.n));
  for (let n = 2; n <= last; n++) {
    const ni = g.nights.find(x => x.n === n);
    if (ni) {
      const a = ni.acts;
      const lines: string[] = [];
      if (a.piper !== undefined) lines.push(`მესტვირემ ჩააძინა ${nm(a.piper)}.`);
      lines.push(a.spies === null || a.spies === undefined ? 'ჯაშუშები ვერ შეთანხმდნენ.' : `ჯაშუშებმა აირჩიეს ${nm(a.spies)}.`);
      if (a.healer !== undefined) lines.push(`მკურნალმა დაიცვა ${nm(a.healer)}${a.piper !== undefined && g.players[a.piper]?.role === 'healer' ? ' — მაგრამ ეძინა, არ ჩაითვალა' : ''}.`);
      if (a.check !== undefined) {
        const by = ni.checker !== undefined && g.players[ni.checker]?.role === 'guard' ? 'მეციხოვნემ' : 'ციხისთავმა';
        lines.push(`${by} შეამოწმა ${nm(a.check)}: ${ni.answer === 'spy' ? 'ჯაშუშია' : ni.answer === 'no' ? 'არა' : 'ეძინა, პასუხი არ ყოფილა'}.`);
      }
      lines.push(ni.taken !== null ? `დილით: ტყვედ წაიყვანეს ${who(ni.taken)}.` : `დილით: ღამე მშვიდად ჩაიარა — ${ni.why ? QUIET_TEXT[ni.why] : ''}.`);
      out.push({ head: `ღამე ${n}`, lines });
    }
    const d = g.days.find(x => x.n === n);
    if (d) {
      const lines: string[] = [];
      lines.push(d.accused.length ? `ბრალი დასდეს: ${d.accused.map(nm).join(', ')}.` : 'ბრალი არავის დასდეს.');
      if (d.tie.length) lines.push(`ფრე: ${d.tie.map(nm).join(', ')} — ხელახლა ხმის მიცემა.`);
      lines.push(d.jailed !== null ? `ციხეში ჩასვეს ${who(d.jailed)}.` : 'ციხეში არავინ ჩაჯდა.');
      out.push({ head: `ბჭობა ${n}`, lines });
    }
  }
  return out;
};

// ——— reading a kept game back

const STEP_KINDS = ['deal', 'night', 'morning', 'intro', 'day', 'vote', 'tie', 'verdict', 'end'];
const ROLE_IDS = Object.keys(ROLES);
const isIdx = (n: unknown, len: number) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < len;
const idxList = (v: unknown, len: number) => Array.isArray(v) && v.every(x => isIdx(x, len));

/** a kept game, or null when it is not one this page wrote */
export const parseGame = (raw: unknown): SamGame | null => {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as SamGame;
  if (g.v !== 1 || (g.deal !== 'phone' && g.deal !== 'cards') || !Array.isArray(g.players) || !Array.isArray(g.roles)) return null;
  const len = g.players.length;
  if (len < MIN_PLAYERS || len > MAX_PLAYERS || g.roles.length !== len) return null;
  if (!g.players.every(p => p && typeof p.name === 'string' && ROLE_IDS.includes(p.role))) return null;
  if (!g.roles.every(r => ROLE_IDS.includes(r))) return null;
  if (!Array.isArray(g.out) || g.out.length !== len || !Array.isArray(g.nights) || !Array.isArray(g.days)) return null;
  const ph = g.phase as Phase | undefined;
  if (!ph || !STEP_KINDS.includes(ph.kind)) return null;
  if (ph.kind === 'deal' && !isIdx(ph.at, len)) return null;
  if (ph.kind === 'night' && (!(ph.n >= 1) || !Number.isInteger(ph.step) || ph.step < 0 || ph.step >= stepsOf(g, ph.n).length || !ph.acts || !ph.marks)) return null;
  if (ph.kind === 'intro' && !isIdx(ph.at, len)) return null;
  if (ph.kind === 'day' && (!idxList(ph.order, len) || !isIdx(ph.at, ph.order.length) || ph.accuse?.length !== ph.order.length)) return null;
  if (ph.kind === 'vote' && (!idxList(ph.candidates, len) || ph.counts?.length !== ph.candidates.length || !idxList(ph.accused, len))) return null;
  if (ph.kind === 'tie' && (!idxList(ph.tied, len) || !isIdx(ph.at, ph.tied.length) || !idxList(ph.accused, len))) return null;
  return { ...g, kids: !!g.kids, shield: !!g.shield };
};
