import { mulberry32 } from './otkheuli';

// „ლურჯი სუფრა“ — the printed kit's game (src/print/games/lurji-supra.js; like Michael Kiesling's Azul, 2017) as code,
// for the app's two variants: one phone passed round the table (pages/games/lurji/Table.tsx) and a class's room
// (utils/lurjiRoom.ts). The apprentice side: a stamp always goes onto its own ornament's place in the row. Nothing is hidden,
// so one state serves every phone. Words as the kit's: ბეჭედი (a tile), ლანგარი (a factory), მეიდანი (the centre), დაზგის
// ზოლი (a pattern line), სუფრა (the wall), დაღვრილი საღებავი (the floor), გოდორი (the box lid), ქება (the score).

/** the five ornaments in the cloth's first row's order (the original's blue, yellow, red, black, white) */
export type Orn = 0 | 1 | 2 | 3 | 4;
export const ORNS: readonly Orn[] = [0, 1, 2, 3, 4];
export const ORN_NAMES = ['თევზი', 'ირემი', 'ჩიტი', 'ვარსკვლავი', 'ვაზი'] as const;
/** the cloth: row r, column c holds the ornament (c − r) mod 5 — every next row moves one to the right */
export const ornAt = (r: number, c: number) => (((c - r) % 5 + 5) % 5) as Orn;
export const colOf = (r: number, o: Orn) => (o + r) % 5;
/** the spilt dye's seven places and what each one costs */
export const FLOOR = [1, 1, 2, 2, 2, 3, 3] as const;
/** the უსტაბაში's token, where it lies on the floor */
export const TOKEN = 5;
export const MIN_LURJI = 2;
export const MAX_LURJI = 4;
export const PER_ORN = 20;
export const ROW_BONUS = 2;
export const COL_BONUS = 7;
export const ORN_BONUS = 10;
export const FULL = 31;
/** the trays: 2 players — 5, 3 — 7, 4 — 9 */
export const traysFor = (n: number) => 2 * n + 1;
/** the trays' letters, as the kit's (the old alphabet's numbers: ჱ = 8) */
export const TRAY_NO = ['ა', 'ბ', 'გ', 'დ', 'ე', 'ვ', 'ზ', 'ჱ', 'თ'] as const;
export const LOG_MAX = 40;

export interface LBoard {
  /** the loom's five lines: line k holds up to k + 1 stamps of one ornament (o −1: empty) */
  lines: { o: Orn | -1; n: number }[];
  /** the cloth: the printed columns of each row as a bitmask */
  wall: number[];
  /** the spilt dye: stamps and the token (5), at most 7 */
  floor: number[];
  score: number;
}
export interface Placed { r: number; c: number; pts: number }
/** a board's evening: what was printed and what it brought, the dye's cost, the praise before and after */
export interface Evening { placed: Placed[]; floor: number; from: number; to: number }
export interface Bonus { rows: number; cols: number; orns: number; pts: number }
export type LPhase =
  | { k: 'take' }
  | { k: 'evening'; report: Evening[] }
  | { k: 'end'; report: Evening[]; bonus: Bonus[]; winners: number[] };
/** a take: who took how many of which ornament from where (−1: the meidan) onto which line (−1: the dye), how many spilt */
export interface LLine { n: number; who: number; o: Orn; count: number; from: number; line: number; spilt: number; token: boolean }

export interface LurjiGame {
  v: 1;
  names: string[];
  boards: LBoard[];
  /** the bag and the box lid, counted by ornament */
  bag: number[];
  lid: number[];
  trays: Orn[][];
  /** the meidan, counted by ornament */
  meidan: number[];
  /** −1: the token lies on the meidan; else who took it today */
  token: number;
  turn: number;
  /** who began today (tomorrow: who took the token) */
  first: number;
  day: number;
  /** every take and every evening moves it on: the key of the step on now */
  step: number;
  rng: number;
  phase: LPhase;
  /** today's takes */
  log: LLine[];
}

const seedOf = (r: () => number) => Math.floor(r() * 0x7fffffff);
const sum = (a: readonly number[]) => a.reduce((x, y) => x + y, 0);
const emptyBoard = (): LBoard => ({ lines: Array.from({ length: 5 }, () => ({ o: -1 as const, n: 0 })), wall: [0, 0, 0, 0, 0], floor: [], score: 0 });
export const keyOf = (g: LurjiGame) => `l${g.step}`;
export const has = (wall: readonly number[], r: number, c: number) => r >= 0 && r < 5 && c >= 0 && c < 5 && !!(wall[r] & (1 << c));

/** one stamp out of the bag, the lid poured back in when it is empty; null: none left anywhere */
const drawOne = (bag: number[], lid: number[], r: () => number): Orn | null => {
  if (!sum(bag)) for (let o = 0; o < 5; o++) { bag[o] += lid[o]; lid[o] = 0; }
  const total = sum(bag);
  if (!total) return null;
  let x = Math.floor(r() * total);
  for (let o = 0; o < 5; o++) {
    if (x < bag[o]) { bag[o]--; return o as Orn; }
    x -= bag[o];
  }
  return null;
};

/** the morning: four stamps on every tray from the bag, the token on the meidan; the day's first begins */
const morning = (g: LurjiGame): LurjiGame => {
  const r = mulberry32(g.rng);
  const bag = [...g.bag], lid = [...g.lid];
  const trays = g.trays.map(() => {
    const t: Orn[] = [];
    for (let k = 0; k < 4; k++) {
      const o = drawOne(bag, lid, r);
      if (o === null) break;
      t.push(o);
    }
    return t.sort((a, b) => a - b);
  });
  return { ...g, bag, lid, trays, meidan: [0, 0, 0, 0, 0], token: -1, turn: g.first, rng: seedOf(r), phase: { k: 'take' }, log: [] };
};

export const newLurji = ({ names, first, rnd }: { names: string[]; first?: number; rnd: () => number }): LurjiGame | null => {
  const n = names.length;
  if (n < MIN_LURJI || n > MAX_LURJI) return null;
  const start = first !== undefined && first >= 0 && first < n ? first : Math.floor(rnd() * n);
  return morning({
    v: 1, names: [...names], boards: names.map(emptyBoard), bag: ORNS.map(() => PER_ORN), lid: [0, 0, 0, 0, 0],
    trays: Array.from({ length: traysFor(n) }, () => []), meidan: [0, 0, 0, 0, 0], token: -1, turn: start, first: start,
    day: 1, step: 0, rng: seedOf(rnd), phase: { k: 'take' }, log: [],
  });
};

/** may ornament o go onto line k: the line is not full, holds no other ornament, and the row has not printed o yet */
export const fits = (b: LBoard, k: number, o: Orn) => {
  const L = b.lines[k];
  return !!L && L.n < k + 1 && (L.o === -1 || L.o === o) && !has(b.wall, k, colOf(k, o));
};
/** how many of ornament o lie on a tray (−1: the meidan) */
export const countAt = (g: LurjiGame, src: number, o: Orn) => (src < 0 ? g.meidan[o] ?? 0 : (g.trays[src] ?? []).filter(x => x === o).length);
export const canTake = (g: LurjiGame, src: number, o: Orn, line: number) =>
  g.phase.k === 'take' && Number.isInteger(src) && src >= -1 && src < g.trays.length && ORNS.includes(o) && countAt(g, src, o) > 0
  && (line === -1 || (Number.isInteger(line) && line >= 0 && line < 5 && fits(g.boards[g.turn], line, o)));
/** every way to take on now (the dye always takes) */
export const takes = (g: LurjiGame): { src: number; o: Orn; line: number }[] => {
  const out: { src: number; o: Orn; line: number }[] = [];
  for (let src = -1; src < g.trays.length; src++) {
    for (const o of ORNS) {
      if (!countAt(g, src, o)) continue;
      for (let line = -1; line < 5; line++) if (canTake(g, src, o, line)) out.push({ src, o, line });
    }
  }
  return out;
};
export const dayOver = (g: Pick<LurjiGame, 'trays' | 'meidan'>) => g.trays.every(t => !t.length) && g.meidan.every(x => !x);

/** where a take's stamps would go: onto the line, onto the dye, into the lid */
export const landing = (b: LBoard, line: number, count: number, token: boolean) => {
  const room = line >= 0 ? line + 1 - b.lines[line].n : 0;
  const onLine = Math.min(room, count);
  const free = 7 - b.floor.length - (token && b.floor.length < 7 ? 1 : 0);
  const onFloor = Math.min(free, count - onLine);
  return { onLine, onFloor, toLid: count - onLine - onFloor };
};

/** the points a stamp brings, printed at (r, c) on this cloth (which already holds it) */
export const pointsAt = (wall: readonly number[], r: number, c: number): number => {
  let h = 1, v = 1;
  for (let x = c - 1; has(wall, r, x); x--) h++;
  for (let x = c + 1; has(wall, r, x); x++) h++;
  for (let y = r - 1; has(wall, y, c); y--) v++;
  for (let y = r + 1; has(wall, y, c); y++) v++;
  return h === 1 && v === 1 ? 1 : (h > 1 ? h : 0) + (v > 1 ? v : 0);
};
/** what k taken places of the dye cost */
export const floorCost = (k: number) => FLOOR.slice(0, Math.min(k, 7)).reduce((a, b) => a + b, 0);
export const bonusOf = (wall: readonly number[]): Bonus => {
  const rows = wall.filter(m => m === FULL).length;
  let cols = 0, orns = 0;
  for (let c = 0; c < 5; c++) if (wall.every(m => m & (1 << c))) cols++;
  for (const o of ORNS) if ([0, 1, 2, 3, 4].every(r => has(wall, r, colOf(r, o)))) orns++;
  return { rows, cols, orns, pts: rows * ROW_BONUS + cols * COL_BONUS + orns * ORN_BONUS };
};
export const fullRows = (b: LBoard) => b.wall.filter(m => m === FULL).length;
export const winnersOf = (g: LurjiGame) => (g.phase.k === 'end' ? g.phase.winners : []);

/** the evening, everybody at once: full lines print their stamp and score it, the dye costs, the rest into the lid; a full
 *  row ends the game with the bonuses */
const evening = (g: LurjiGame): LurjiGame => {
  const lid = [...g.lid];
  const report: Evening[] = [];
  const boards = g.boards.map(b => {
    const wall = [...b.wall];
    const lines = b.lines.map(l => ({ ...l }));
    const placed: Placed[] = [];
    let score = b.score;
    for (let k = 0; k < 5; k++) {
      const L = lines[k];
      if (L.o === -1 || L.n !== k + 1) continue;
      const c = colOf(k, L.o);
      wall[k] |= 1 << c;
      const pts = pointsAt(wall, k, c);
      score += pts;
      placed.push({ r: k, c, pts });
      lid[L.o] += k;
      lines[k] = { o: -1, n: 0 };
    }
    const cost = floorCost(b.floor.length);
    const to = Math.max(0, score - cost);
    for (const x of b.floor) if (x !== TOKEN) lid[x]++;
    report.push({ placed, floor: cost, from: b.score, to });
    return { lines, wall, floor: [], score: to };
  });
  const first = g.token >= 0 ? g.token : g.first;
  const next: LurjiGame = { ...g, boards, lid, first, step: g.step + 1 };
  if (boards.some(b => b.wall.includes(FULL))) return finish(next, report);
  return { ...next, phase: { k: 'evening', report } };
};

const finish = (g: LurjiGame, report: Evening[]): LurjiGame => {
  const bonus = g.boards.map(b => bonusOf(b.wall));
  const boards = g.boards.map((b, i) => ({ ...b, score: b.score + bonus[i].pts }));
  const top = Math.max(...boards.map(b => b.score));
  let winners = boards.map((b, i) => (b.score === top ? i : -1)).filter(i => i >= 0);
  const rows = Math.max(...winners.map(i => fullRows(boards[i])));
  winners = winners.filter(i => fullRows(boards[i]) === rows);
  return { ...g, boards, phase: { k: 'end', report, bonus, winners } };
};

/** a take: all of ornament o from a tray (the rest onto the meidan) or from the meidan (the day's first takes the token too),
 *  onto line `line` from the right (−1: straight onto the dye); what does not fit spills onto the dye, then into the lid */
export const take = (g: LurjiGame, src: number, o: Orn, line: number): LurjiGame => {
  if (!canTake(g, src, o, line)) return g;
  const who = g.turn;
  const meidan = [...g.meidan], trays = g.trays.map(t => [...t]), lid = [...g.lid];
  let count: number, token = g.token, tookToken = false;
  if (src < 0) {
    count = meidan[o];
    meidan[o] = 0;
    if (token < 0) { token = who; tookToken = true; }
  } else {
    count = trays[src].filter(x => x === o).length;
    for (const x of trays[src]) if (x !== o) meidan[x]++;
    trays[src] = [];
  }
  const b = g.boards[who];
  const lines = b.lines.map(l => ({ ...l }));
  const floor = [...b.floor];
  if (tookToken && floor.length < 7) floor.push(TOKEN);
  const room = line >= 0 ? line + 1 - lines[line].n : 0;
  const onLine = Math.min(room, count);
  if (line >= 0) lines[line] = { o, n: lines[line].n + onLine };
  for (let k = onLine; k < count; k++) {
    if (floor.length < 7) floor.push(o);
    else lid[o]++;
  }
  const entry: LLine = { n: g.step, who, o, count, from: src, line, spilt: count - onLine, token: tookToken };
  const next: LurjiGame = {
    ...g, boards: g.boards.map((x, i) => (i === who ? { ...b, lines, floor } : x)), trays, meidan, lid, token,
    step: g.step + 1, log: [...g.log, entry].slice(-LOG_MAX),
  };
  return dayOver(next) ? evening(next) : { ...next, turn: (who + 1) % g.names.length };
};

/** after the evening: the next day's morning (no stamps left anywhere — the game ends there) */
export const dawn = (g: LurjiGame): LurjiGame => {
  if (g.phase.k !== 'evening') return g;
  const m = morning({ ...g, day: g.day + 1, step: g.step + 1 });
  return dayOver(m) ? finish(m, g.phase.report) : m;
};

/** the phone's take for a player whose time is over: the fewest spilt, then the most laid, then the lowest line */
export const autoTake = (g: LurjiGame): { src: number; o: Orn; line: number } | null => {
  const b = g.boards[g.turn];
  let best: { src: number; o: Orn; line: number } | null = null, bestKey = [Infinity, 0, 0];
  for (const t of takes(g)) {
    const count = countAt(g, t.src, t.o);
    const { onLine } = landing(b, t.line, count, t.src < 0 && g.token < 0);
    const key = [count - onLine + (t.src < 0 && g.token < 0 ? 1 : 0), -onLine, t.line < 0 ? 9 : t.line];
    if (key[0] < bestKey[0] || (key[0] === bestKey[0] && (key[1] < bestKey[1] || (key[1] === bestKey[1] && key[2] < bestKey[2])))) { best = t; bestKey = key; }
  }
  return best;
};

/** how long a step waits online (s); the evening's report stays this long before the morning */
export const LURJI_SECS = { take: 75, evening: 14, end: 0 } as const;
/** the step's time is over: the phone takes for the player on turn, or the morning comes */
export const timeUp = (g: LurjiGame): LurjiGame => {
  if (g.phase.k === 'evening') return dawn(g);
  if (g.phase.k !== 'take') return g;
  const t = autoTake(g);
  return t ? take(g, t.src, t.o, t.line) : g;
};

/** a take as one whole number (an answer's `pick` in the room) and back */
export const takePick = (src: number, o: Orn, line: number) => ((src + 1) * 5 + o) * 6 + (line + 1);
export const fromPick = (p: number) => ({ line: (p % 6) - 1, o: (Math.floor(p / 6) % 5) as Orn, src: Math.floor(p / 30) - 1 });

// ---------- reading a stored game back (the device's or a room's JSON) ----------
const isInt = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const ints = (v: unknown, lo: number, hi: number, len?: number, max = 100): number[] | null =>
  Array.isArray(v) && (len === undefined ? v.length <= max : v.length === len) && v.every(x => isInt(x, lo, hi)) ? (v as number[]) : null;

const parseBoard = (raw: unknown): LBoard | null => {
  const o = raw as Partial<LBoard> | null;
  if (!o || typeof o !== 'object' || !Array.isArray(o.lines) || o.lines.length !== 5) return null;
  const lines = o.lines.map((l, k) => (l && isInt(l.o, -1, 4) && isInt(l.n, 0, k + 1) && (l.o === -1) === (l.n === 0) ? { o: l.o as Orn | -1, n: l.n } : null));
  const wall = ints(o.wall, 0, FULL, 5), floor = ints(o.floor, 0, 5, undefined, 7);
  if (lines.some(l => !l) || !wall || !floor || !isInt(o.score, 0, 100000)) return null;
  return { lines: lines as LBoard['lines'], wall, floor, score: o.score };
};
const parseEvening = (raw: unknown, n: number): Evening[] | null => {
  if (!Array.isArray(raw) || raw.length !== n) return null;
  const out = raw.map(e => {
    const placed = Array.isArray(e?.placed) && e.placed.length <= 5 ? e.placed.filter((p: Placed) => isInt(p?.r, 0, 4) && isInt(p?.c, 0, 4) && isInt(p?.pts, 1, 10)) : null;
    return placed && isInt(e.floor, 0, 14) && isInt(e.from, 0, 100000) && isInt(e.to, 0, 100000) ? { placed: placed.map((p: Placed) => ({ r: p.r, c: p.c, pts: p.pts })), floor: e.floor, from: e.from, to: e.to } : null;
  });
  return out.every(Boolean) ? (out as Evening[]) : null;
};
const parsePhase = (raw: unknown, n: number): LPhase | null => {
  const o = raw as { k?: string; report?: unknown; bonus?: unknown; winners?: unknown } | null;
  if (!o || typeof o !== 'object') return null;
  if (o.k === 'take') return { k: 'take' };
  const report = parseEvening(o.report, n);
  if (!report) return null;
  if (o.k === 'evening') return { k: 'evening', report };
  if (o.k !== 'end' || !Array.isArray(o.bonus) || o.bonus.length !== n) return null;
  const bonus = o.bonus.map(b => (isInt(b?.rows, 0, 5) && isInt(b?.cols, 0, 5) && isInt(b?.orns, 0, 5) && isInt(b?.pts, 0, 200) ? { rows: b.rows, cols: b.cols, orns: b.orns, pts: b.pts } : null));
  const winners = ints(o.winners, 0, n - 1, undefined, n);
  return bonus.every(Boolean) && winners && winners.length ? { k: 'end', report, bonus: bonus as Bonus[], winners } : null;
};
export const parseLog = (raw: unknown, n: number, trays: number): LLine[] => (Array.isArray(raw) ? raw : []).filter((l): l is LLine =>
  !!l && isInt(l.n, 0, 1e7) && isInt(l.who, 0, n - 1) && isInt(l.o, 0, 4) && isInt(l.count, 1, 40) && isInt(l.from, -1, trays - 1)
  && isInt(l.line, -1, 4) && isInt(l.spilt, 0, 40) && typeof l.token === 'boolean').slice(-LOG_MAX)
  .map(l => ({ n: l.n, who: l.who, o: l.o, count: l.count, from: l.from, line: l.line, spilt: l.spilt, token: l.token }));

export const parseLurji = (raw: unknown): LurjiGame | null => {
  const o = raw as Partial<LurjiGame> | null;
  if (!o || typeof o !== 'object' || o.v !== 1 || !Array.isArray(o.names) || o.names.length < MIN_LURJI || o.names.length > MAX_LURJI) return null;
  const n = o.names.length;
  const boards = Array.isArray(o.boards) && o.boards.length === n ? o.boards.map(parseBoard) : null;
  const bag = ints(o.bag, 0, PER_ORN, 5), lid = ints(o.lid, 0, PER_ORN, 5), meidan = ints(o.meidan, 0, PER_ORN * 5, 5);
  const trays = Array.isArray(o.trays) && o.trays.length === traysFor(n) ? o.trays.map(t => ints(t, 0, 4, undefined, 4)) : null;
  const phase = parsePhase(o.phase, n);
  if (!boards || boards.some(b => !b) || !bag || !lid || !meidan || !trays || trays.some(t => !t) || !phase
    || !isInt(o.token, -1, n - 1) || !isInt(o.turn, 0, n - 1) || !isInt(o.first, 0, n - 1) || !isInt(o.day, 1, 1000)
    || !isInt(o.step, 0, 1e7) || !isInt(o.rng, 0, 0x7fffffff)) return null;
  return {
    v: 1, names: o.names.map(x => String(x).slice(0, 120)), boards: boards as LBoard[], bag, lid, trays: trays as Orn[][], meidan,
    token: o.token, turn: o.turn, first: o.first, day: o.day, step: o.step, rng: o.rng, phase, log: parseLog(o.log, n, traysFor(n)),
  };
};
