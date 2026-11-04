import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/utils/otkheuli';
import {
  FULL, TOKEN, autoTake, bonusOf, canTake, colOf, countAt, dawn, floorCost, fromPick, newLurji, ornAt, parseLurji, pointsAt, take, takePick,
  takes, timeUp, traysFor,
  type LurjiGame, type Orn,
} from '../src/utils/lurjiSupra';

const NAMES = ['ანა', 'ბექა', 'გიო', 'დათო'];
const start = (n = 2, seed = 7) => newLurji({ names: NAMES.slice(0, n), first: 0, rnd: mulberry32(seed) })!;
/** a game with the trays and the meidan laid by hand */
const laid = (trays: Orn[][], meidan = [0, 0, 0, 0, 0], n = 2): LurjiGame => {
  const g = start(n);
  return { ...g, trays: [...trays, ...Array.from({ length: traysFor(n) - trays.length }, () => [] as Orn[])], meidan };
};
const wallOf = (cells: [number, number][]) => { const w = [0, 0, 0, 0, 0]; for (const [r, c] of cells) w[r] |= 1 << c; return w; };
/** every stamp is somewhere: the bag, the lid, the trays, the meidan, the lines, the dye, the cloths */
const total = (g: LurjiGame) => g.bag.reduce((a, b) => a + b, 0) + g.lid.reduce((a, b) => a + b, 0) + g.trays.reduce((a, t) => a + t.length, 0)
  + g.meidan.reduce((a, b) => a + b, 0)
  + g.boards.reduce((a, b) => a + b.lines.reduce((x, l) => x + l.n, 0) + b.floor.filter(x => x !== TOKEN).length
    + b.wall.reduce((x, m) => x + [0, 1, 2, 3, 4].filter(c => m & (1 << c)).length, 0), 0);

test('a new table: 5 / 7 / 9 trays of four, the rest in the bag, the token on the meidan', () => {
  for (const n of [2, 3, 4]) {
    const g = start(n);
    assert.equal(g.trays.length, traysFor(n));
    assert.ok(g.trays.every(t => t.length === 4));
    assert.equal(g.bag.reduce((a, b) => a + b, 0), 100 - 4 * traysFor(n));
    assert.equal(g.token, -1);
    assert.equal(g.turn, 0);
    assert.equal(total(g), 100);
  }
  assert.equal(newLurji({ names: ['ერთი'], rnd: Math.random }), null);
  assert.equal(newLurji({ names: ['1', '2', '3', '4', '5'], rnd: Math.random }), null);
});

test('the cloth: every row moves one to the right; an ornament has one place a row', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(c => ornAt(0, c)), [0, 1, 2, 3, 4]);
  assert.deepEqual([0, 1, 2, 3, 4].map(c => ornAt(1, c)), [4, 0, 1, 2, 3]);
  for (let r = 0; r < 5; r++) for (const o of [0, 1, 2, 3, 4] as Orn[]) assert.equal(ornAt(r, colOf(r, o)), o);
});

test('a take from a tray: all of one ornament onto a line, the rest onto the meidan, then the next one', () => {
  const g = laid([[0, 0, 2, 4]]);
  const h = take(g, 0, 0, 2);
  assert.deepEqual(h.boards[0].lines[2], { o: 0, n: 2 });
  assert.deepEqual(h.meidan, [0, 0, 1, 0, 1]);
  assert.deepEqual(h.trays[0], []);
  assert.equal(h.turn, 1);
  assert.equal(h.log.at(-1)?.count, 2);
  assert.equal(take(h, 0, 0, 2), h, 'an empty tray gives nothing');
});

test('a line takes one ornament, and none its row has printed; what does not fit spills onto the dye, then into the lid', () => {
  let g = laid([[1, 1, 1, 1], [2, 2, 2, 2], [3, 3, 3, 3]]);
  g = { ...g, boards: g.boards.map((b, i) => (i === 0 ? { ...b, lines: b.lines.map((l, k) => (k === 3 ? { o: 4 as Orn, n: 1 } : l)), wall: wallOf([[1, colOf(1, 1)]]) } : b)) };
  assert.equal(canTake(g, 0, 1, 3), false, 'line 4 holds vines');
  assert.equal(canTake(g, 0, 1, 1), false, 'row 2 has printed its deer');
  assert.equal(canTake(g, 0, 1, 0), true);
  const h = take(g, 0, 1, 0);
  assert.deepEqual(h.boards[0].lines[0], { o: 1, n: 1 });
  assert.deepEqual(h.boards[0].floor, [1, 1, 1]);
  // seven places only: the eighth goes into the lid
  let k = { ...h, turn: 0, boards: h.boards.map((b, i) => (i === 0 ? { ...b, floor: [1, 1, 1, 1, 1] } : b)) };
  k = take(k, 1, 2, -1);
  assert.equal(k.boards[0].floor.length, 7);
  assert.equal(k.lid[2], 2);
});

test('the meidan: the day\'s first take from it takes the token too, onto the dye — tomorrow they begin', () => {
  const g = laid([[0, 1, 2, 3]], [2, 0, 0, 0, 0]);
  const h = take(g, -1, 0, 4);
  assert.equal(h.token, 0);
  assert.deepEqual(h.boards[0].floor, [TOKEN]);
  assert.equal(h.log.at(-1)?.token, true);
  const k = take({ ...h, meidan: [0, 3, 0, 0, 0] }, -1, 1, 4);
  assert.deepEqual(k.boards[1].floor, [], 'the token is taken only once');
});

test('the points of a stamp: alone 1, chains across and down, a gap breaks a chain (the kit\'s examples)', () => {
  assert.equal(pointsAt(wallOf([[0, 4], [1, 4], [3, 0], [2, 2]]), 2, 2), 1);
  assert.equal(pointsAt(wallOf([[1, 0], [1, 1], [3, 3], [1, 2]]), 1, 2), 3);
  assert.equal(pointsAt(wallOf([[2, 0], [2, 1], [1, 2], [2, 2]]), 2, 2), 5);
  assert.equal(pointsAt(wallOf([[3, 0], [3, 1], [3, 4], [4, 3], [0, 3], [3, 3]]), 3, 3), 4);
  assert.equal(floorCost(4), 6);
  assert.equal(floorCost(7), 14);
});

test('the evening: full lines print and score, the rest into the lid, the dye costs, never below 0; the token begins tomorrow', () => {
  const g = laid([[3, 3, 3, 3]], [0, 0, 0, 0, 0]);
  const set = { ...g, token: 1, turn: 0, boards: g.boards.map((b, i) => (i === 0
    ? { ...b, score: 2, lines: [{ o: 0 as Orn, n: 1 }, { o: 2 as Orn, n: 1 }, { o: 4 as Orn, n: 3 }, { o: -1 as const, n: 0 }, { o: -1 as const, n: 0 }], floor: [1] }
    : { ...b, floor: [TOKEN, 2, 2] })) };
  const h = take(set, 0, 3, 3);   // the last take of the day: four stars onto line 4 (full)
  assert.equal(h.phase.k, 'evening');
  const b = h.boards[0];
  assert.ok(b.wall[0] & (1 << colOf(0, 0)) && b.wall[2] & (1 << colOf(2, 4)) && b.wall[3] & (1 << colOf(3, 3)));
  assert.deepEqual(b.lines[1], { o: 2, n: 1 }, 'a half line waits for tomorrow');
  assert.equal(b.floor.length, 0);
  if (h.phase.k !== 'evening') return;
  const r = h.phase.report[0];
  assert.equal(r.placed.length, 3);
  assert.equal(r.floor, 1);
  assert.equal(r.to, 2 + r.placed.reduce((a, p) => a + p.pts, 0) - 1);
  assert.equal(h.phase.report[1].to, 0, 'praise never goes below 0');
  assert.equal(h.first, 1);
  const m = dawn(h);
  assert.equal(m.phase.k, 'take');
  assert.equal(m.day, 2);
  assert.equal(m.turn, 1);
  assert.equal(m.token, -1);
  assert.ok(m.trays.every(t => t.length === 4));
});

test('the end: a full row ends it that evening; bonuses +2 a row, +7 a column, +10 an ornament; ties go by full rows', () => {
  assert.deepEqual(bonusOf([FULL, FULL, FULL, FULL, FULL]), { rows: 5, cols: 5, orns: 5, pts: 10 + 35 + 50 });
  assert.deepEqual(bonusOf(wallOf([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]])), { rows: 0, cols: 1, orns: 0, pts: 7 });
  const diag = wallOf([0, 1, 2, 3, 4].map(r => [r, colOf(r, 2)] as [number, number]));
  assert.equal(bonusOf(diag).orns, 1);
  const g = laid([[1, 1, 1, 1]], [0, 0, 0, 0, 0]);
  const row = (o: Orn) => [{ o: -1 as const, n: 0 }, { o: -1 as const, n: 0 }, { o: -1 as const, n: 0 }, { o: -1 as const, n: 0 }, { o, n: 5 }];
  const set = { ...g, turn: 0, boards: g.boards.map((b, i) => (i === 0
    ? { ...b, score: 10, wall: [0, 0, 0, 0, FULL & ~(1 << colOf(4, 0))], lines: row(0) }
    : { ...b, score: 22 })) };
  const h = take(set, 0, 1, -1);
  assert.equal(h.phase.k, 'end');
  if (h.phase.k !== 'end') return;
  assert.equal(h.phase.bonus[0].rows, 1);
  assert.equal(h.boards[0].score, 10 + 5 - floorCost(4) + 2);
  assert.deepEqual(h.phase.winners, [1]);
  const tie = { ...set, boards: set.boards.map((b, i) => (i === 1 ? { ...b, score: 10 + 5 - floorCost(4) + 2 } : b)) };
  const t = take(tie, 0, 1, -1);
  assert.ok(t.phase.k === 'end' && t.phase.winners.length === 1 && t.phase.winners[0] === 0, 'the full row breaks the tie');
});

test('time over: the phone takes what spills least; after the evening the morning comes', () => {
  const g = laid([[0, 0, 0, 1], [2, 2, 3, 3]]);
  const t = autoTake(g)!;
  assert.equal(countAt(g, t.src, t.o) - Math.min(countAt(g, t.src, t.o), t.line + 1), 0, 'nothing spills');
  const h = timeUp(g);
  assert.equal(h.step, g.step + 1);
  assert.ok(takes(g).length > 0);
});

test('a take as a number and back', () => {
  for (const src of [-1, 0, 8]) for (const o of [0, 4] as Orn[]) for (const line of [-1, 0, 4]) assert.deepEqual(fromPick(takePick(src, o, line)), { src, o, line });
});

test('whole games play to their end, every stamp kept, and come back from JSON', () => {
  for (const [n, seed] of [[2, 1], [3, 5], [4, 9]]) {
    let g = start(n, seed);
    const r = mulberry32(seed + 100);
    let guard = 0;
    while (g.phase.k !== 'end' && guard++ < 2000) {
      if (g.phase.k === 'evening') { g = dawn(g); continue; }
      const all = takes(g);
      const t = r() < 0.5 ? autoTake(g)! : all[Math.floor(r() * all.length)];
      g = take(g, t.src, t.o, t.line);
      assert.equal(total(g), 100);
      assert.deepEqual(parseLurji(JSON.parse(JSON.stringify(g))), g);
    }
    assert.equal(g.phase.k, 'end');
    if (g.phase.k === 'end') assert.ok(g.phase.winners.length >= 1);
  }
  assert.equal(parseLurji({ v: 1, names: ['a'] }), null);
});
