import type { RoundRules } from './roundGames';

// „ცხელი ჩურჩხელა“ in a class's room (games hub, 2026-11-04; the one-phone game is utils/churchkhela.ts): everybody holds a
// hot churchkhela on their own phone while the music plays there. It stops at a moment nobody knows, and whoever still holds
// it then is burnt and does the round's task in the call. Let go early and you are safe but earn little; the later, the more
// (up to 1000). Each phone keeps the round's time itself and stops its own music at the burn (pages/games/churchkhela/), so a
// slow download burns nobody. Pure and tested in tests/churchkhelaRounds.test.ts.

export interface ChurchkhelaQ {
  kind: 'churchkhela';
  /** the round's own token: a phone's clock of the round keys on it */
  id: string;
  /** the music: a recording of the pool, its piece from a share of its length (the same piece on every phone) */
  url: string;
  from: number;
  /** what played, shown at the reveal */
  title: string;
  sub: string;
  /** when the music stops and the churchkhela burns: ms from the round's start on each phone */
  burn: number;
  /** the task card of the one who burns, and its kind */
  task: string;
  taskKind: string;
}

export const BURN_MIN = 6000;
export const BURN_MAX = 24000;
/** the round's clock runs this long past the burn (s), so the answers of phones whose music came late still come in */
export const BURN_GRACE = 5;
/** the music's piece: longer than any burn — each phone stops its own at the burn */
export const CHURCHKHELA_CLIP = 30;

/** a pick: 0 — still held when the music stopped; else when it was let go, in tenths of a second from the round's start, + 1 */
export const releasePick = (ms: number) => Math.max(0, Math.floor(ms / 100)) + 1;
export const releasedMs = (pick: number) => (pick - 1) * 100;
/** let go before the burn */
export const isSafe = (q: Pick<ChurchkhelaQ, 'burn'>, pick: number | null | undefined): pick is number =>
  typeof pick === 'number' && pick >= 1 && releasedMs(pick) < q.burn;
/** what holding it earned: the share of the time it was held, up to 1000; burnt — nothing */
export const holdPoints = (q: Pick<ChurchkhelaQ, 'burn'>, pick: number | null | undefined) =>
  (isSafe(q, pick) ? Math.max(10, Math.round((1000 * releasedMs(pick)) / q.burn)) : 0);

/** who does the task: whoever burnt (an answer that never came is a churchkhela still held); nobody — the one who let go first */
export const taskSeats = (q: Pick<ChurchkhelaQ, 'burn'>, picks: readonly (number | null | undefined)[]) => {
  const burnt = picks.flatMap((p, i) => (isSafe(q, p) ? [] : [i]));
  if (burnt.length) return burnt;
  let first = -1;
  picks.forEach((p, i) => { if (isSafe(q, p) && (first < 0 || p < (picks[first] as number))) first = i; });
  return first < 0 ? [] : [first];
};

/** seconds with one decimal, Georgian style: 8,3 */
export const secondsText = (ms: number) => (Math.round(ms / 100) / 10).toFixed(1).replace('.', ',');

const str = (v: unknown, max: number, empty = true) => typeof v === 'string' && v.length <= max && (empty || v.length > 0);

export const CHURCHKHELA_RULES: RoundRules<ChurchkhelaQ> = {
  steps: () => 1,
  seconds: q => Math.ceil(q.burn / 1000) + BURN_GRACE,
  ok: (q, pick) => Number.isInteger(pick) && pick >= 0 && pick <= (Math.ceil(q.burn / 1000) + BURN_GRACE) * 10 + 1,
  points: (q, a) => holdPoints(q, a.pick),
  secret: ['title', 'sub', 'task', 'taskKind'],
  valid: (q): q is ChurchkhelaQ => {
    const o = q as Partial<ChurchkhelaQ>;
    return o.kind === 'churchkhela' && str(o.id, 40, false) && str(o.url, 400, false)
      && typeof o.from === 'number' && o.from >= 0 && o.from < 1
      && str(o.title, 120) && str(o.sub, 160)
      && Number.isInteger(o.burn) && o.burn! >= BURN_MIN && o.burn! <= BURN_MAX
      && str(o.task, 200) && str(o.taskKind, 30);
  },
};

const shuffled = <T,>(list: readonly T[], rnd: () => number) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * A game's rounds: a different recording each round (the ones not played lately first), its piece from a random share of
 * it, the burn at a random tenth of a second between `BURN_MIN` and `BURN_MAX`, a task card never the same twice running.
 */
export const drawChurchkhela = ({ pool, tasks, count, recent = [], rnd = Math.random }: {
  pool: readonly { url: string; title: string; sub: string }[];
  tasks: readonly { text: string; kind: string }[];
  count: number;
  recent?: readonly string[];
  rnd?: () => number;
}): ChurchkhelaQ[] => {
  const usable = pool.filter(p => p.url && p.url.length <= 400);
  if (!usable.length || count < 1) return [];
  const order = [...shuffled(usable.filter(p => !recent.includes(p.url)), rnd), ...shuffled(usable.filter(p => recent.includes(p.url)), rnd)];
  const token = Math.floor(rnd() * 36 ** 6).toString(36);
  const steps = (BURN_MAX - BURN_MIN) / 100;
  const out: ChurchkhelaQ[] = [];
  let lastTask = -1;
  for (let i = 0; i < count; i++) {
    const p = order[i % order.length];
    let t = tasks.length ? Math.floor(rnd() * tasks.length) : -1;
    if (tasks.length > 1 && t === lastTask) t = (t + 1 + Math.floor(rnd() * (tasks.length - 1))) % tasks.length;
    lastTask = t;
    out.push({
      kind: 'churchkhela',
      id: `${token}-${i}`,
      url: p.url,
      from: Math.round((0.05 + rnd() * 0.6) * 100) / 100,
      title: p.title.slice(0, 120),
      sub: p.sub.slice(0, 160),
      burn: BURN_MIN + Math.floor(rnd() * (steps + 1)) * 100,
      task: t < 0 ? '' : tasks[t].text.slice(0, 200),
      taskKind: t < 0 ? '' : tasks[t].kind.slice(0, 30),
    });
  }
  return out;
};
