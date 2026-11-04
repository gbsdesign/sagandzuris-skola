import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/utils/otkheuli';
import { KUTKHE_REGIONS } from '../src/utils/kutkhe';
import {
  BUILD_PICK, DIST, ESTATES, ESTATE_COST, FEAST_PICK, GIVE_PICK, HAND_MAX, MARKET_PICKS, NEAR, OPEN_WORKS, PASS_PICK, REGION_GOOD, TBILISI, WORKS,
  applyPick, botPick, canBuild, canFeast, countsOf, giveMax, givePick, keyOf, marketOf, newOkros, parseOkros, rank, reach, ridePick, workIn,
  yearsFor, yieldAt,
  type OkrosGame,
} from '../src/utils/okrosKhana';

const NAMES = ['ანა', 'ბექა', 'გიო', 'დათო'];
const start = (n = 2, seed = 7) => newOkros({ names: NAMES.slice(0, n), first: 0, rnd: mulberry32(seed) })!;
/** a game where the house on turn stands in `at` with `goods`, the king in `king` and the work of `work`'s region open */
const at = (g: OkrosGame, where: number, goods: number[], extra: Partial<OkrosGame> = {}): OkrosGame => ({
  ...g, ...extra, players: g.players.map((p, i) => (i === g.turn ? { ...p, at: where, goods: [...goods] } : p)),
});
const actAt = (g: OkrosGame, where: number, goods: number[], extra: Partial<OkrosGame> = {}): OkrosGame =>
  ({ ...at(g, where, goods, extra), phase: { k: 'act', got: [0, 0, 0, 0, 0] } });
const total = (a: readonly number[]) => a.reduce((x, y) => x + y, 0);

test('the map: thirteen regions, Tbilisi the market, each good from two or three regions, roads both ways', () => {
  assert.equal(KUTKHE_REGIONS[TBILISI], 'kalakuri');
  assert.equal(REGION_GOOD[TBILISI], -1);
  for (const k of [0, 1, 2, 3, 4]) {
    const n = REGION_GOOD.filter(x => x === k).length;
    assert.ok(n >= 2 && n <= 3, `good ${k} from ${n}`);
  }
  NEAR.forEach((list, a) => list.forEach(b => assert.ok(NEAR[b].includes(a), `${a}–${b}`)));
  assert.ok(DIST.every(row => row.every(d => d >= 0)), 'every region reachable');
  assert.equal(DIST[0][11], 5); // აფხაზეთი → კახეთი: five regions away
});

test('the works: twelve, one in every region but Tbilisi, 4–6 goods, a bonus of 2–4', () => {
  assert.equal(WORKS.length, 12);
  assert.deepEqual(WORKS.map(w => w.region).sort((a, b) => a - b), Array.from({ length: 12 }, (_, i) => i));
  WORKS.forEach((w, i) => {
    assert.equal(w.id, i);
    const n = total(w.need);
    assert.ok(n >= 4 && n <= 6, w.name);
    assert.ok(w.bonus >= 2 && w.bonus <= 4, w.name);
    assert.ok(w.need.every(c => c >= 0 && c <= 3), w.name);
    assert.ok(w.note.length > 20 && !/ეკლესი|ტაძარ|მონასტერ|ჯვარ/.test(w.note), w.name);
  });
  assert.equal(workIn(6)?.name, 'თამარის ხიდი');
  assert.equal(workIn(TBILISI), null);
});

test('a new game: everyone in Tbilisi with an estate\'s goods, three works out, the king somewhere, the years by the players', () => {
  for (const n of [2, 3, 4]) {
    const g = start(n);
    assert.equal(g.players.length, n);
    assert.ok(g.players.every(p => p.at === TBILISI && p.left === ESTATES && p.pts === 0 && p.goods.join() === ESTATE_COST.join()));
    assert.equal(g.open.length, OPEN_WORKS);
    assert.equal(g.deck.length, 12 - OPEN_WORKS);
    assert.equal(new Set([...g.open.map(o => o.id), ...g.deck]).size, 12);
    assert.ok(g.king >= 0 && g.king < TBILISI);
    assert.equal(g.chron.length, 11);
    assert.ok(!g.chron.includes(g.king));
    assert.equal(g.years, yearsFor(n));
    assert.equal(g.phase.k, 'move');
  }
  assert.equal(newOkros({ names: ['ერთი'], rnd: Math.random }), null);
  assert.equal(newOkros({ names: ['1', '2', '3', '4', '5'], rnd: Math.random }), null);
});

test('the ride: at most two regions; the region\'s good twice, +1 for my estate, +1 for the king; Tbilisi any two', () => {
  const g = start(2);
  assert.deepEqual(reach(g).sort((a, b) => a - b), [8, 9, 10, 11, 12, 7].sort((a, b) => a - b)); // from Tbilisi
  assert.equal(applyPick(g, 0, 0), g, 'აფხაზეთი is too far');
  assert.equal(applyPick(g, 1, 9), g, 'not my turn');
  const kvemo = 9; // ოქრო
  const g1 = { ...g, king: 3, estates: g.estates.map((e, r) => (r === kvemo ? [0] : e)) };
  assert.deepEqual(yieldAt(g1, 0, kvemo), [0, 0, 0, 0, 3]);
  assert.deepEqual(yieldAt({ ...g1, king: kvemo }, 0, kvemo), [0, 0, 0, 0, 4]);
  assert.deepEqual(yieldAt(g1, 1, kvemo), [0, 0, 0, 0, 2]);
  // Tbilisi's market: two goods of my choice
  const m = ridePick(TBILISI, 1, 3);
  assert.deepEqual(marketOf(m), [1, 3]);
  assert.equal(MARKET_PICKS.length, 15);
  const g2 = applyPick(at(g, 9, [0, 0, 0, 0, 0]), 0, m);
  assert.deepEqual(g2.players[0].goods, [0, 1, 0, 1, 0]);
  assert.equal(g2.players[0].at, TBILISI);
  const g9 = at(g, 9, [0, 0, 0, 0, 0]);
  assert.equal(applyPick(g9, 0, TBILISI), g9, 'Tbilisi needs its two goods');
  // the hand holds ten: the rest stays behind
  const full = applyPick(at(g, TBILISI, [3, 3, 3, 0, 0]), 0, 11);
  assert.equal(total(full.players[0].goods), HAND_MAX);
  assert.ok(full.log.some(l => l.k === 'go' && l.to === 11 && total(l.got) === 1));
});

test('a ride with nothing to do there ends the turn by itself; else the deed waits', () => {
  const g = start(2);
  // from Tbilisi with an estate's goods to ქვემო ქართლი: an estate may be built — the deed waits
  const a = applyPick(g, 0, 9);
  assert.equal(a.phase.k, 'act');
  assert.equal(a.turn, 0);
  // with nothing in hand to მთიანეთი (no work there, no estate of mine): the next house rides
  const g2 = { ...at(g, TBILISI, [0, 0, 0, 0, 0]), open: g.open.filter(o => WORKS[o.id].region !== 10) };
  const b = applyPick(g2, 0, 10);
  assert.equal(b.phase.k, 'move');
  assert.equal(b.turn, 1);
  assert.deepEqual(b.players[0].goods, [0, 2 + (g2.king === 10 ? 1 : 0), 0, 0, 0]);
});

test('an estate: ხე + ქვა + პური, two points, two houses a region, one each, none in Tbilisi, five a house', () => {
  const g = start(3);
  const a = actAt(g, 9, [1, 1, 1, 0, 0]);
  assert.ok(canBuild(a));
  const b = applyPick(a, 0, BUILD_PICK);
  assert.deepEqual(b.estates[9], [0]);
  assert.equal(b.players[0].pts, 2);
  assert.equal(b.players[0].left, ESTATES - 1);
  assert.deepEqual(b.players[0].goods, [0, 0, 0, 0, 0]);
  assert.equal(b.turn, 1);
  assert.ok(!canBuild(actAt(b, 9, [1, 1, 1, 0, 0], { turn: 0 })), 'one estate a house a region');
  assert.ok(!canBuild(actAt(g, 9, [1, 1, 0, 0, 1])), 'the cost is exact');
  assert.ok(!canBuild(actAt(g, TBILISI, [1, 1, 1, 0, 0])), 'not in Tbilisi');
  const twoThere = { ...g, estates: g.estates.map((e, r) => (r === 9 ? [1, 2] : e)) };
  assert.ok(!canBuild(actAt(twoThere, 9, [1, 1, 1, 0, 0])), 'two houses fill a region');
  const none = { ...g, players: g.players.map((p, i) => (i === 0 ? { ...p, left: 0 } : p)) };
  assert.ok(!canBuild(actAt(none, 9, [1, 1, 1, 0, 0])), 'five estates a house');
});

test('a feast at my estate: ღვინო + პური, 3 points (5 with the king), each guest rider 1', () => {
  const g = start(3);
  const mine = { ...g, estates: g.estates.map((e, r) => (r === 11 ? [0] : e)), players: g.players.map((p, i) => (i === 2 ? { ...p, at: 11 } : p)) };
  const a = actAt(mine, 11, [0, 0, 1, 1, 0], { king: 3 });
  assert.ok(canFeast(a));
  const b = applyPick(a, 0, FEAST_PICK);
  assert.equal(b.players[0].pts, 3);
  assert.equal(b.players[2].pts, 1, 'the guest');
  assert.equal(b.players[1].pts, 0);
  assert.deepEqual(b.players[0].goods, [0, 0, 0, 0, 0]);
  const k = applyPick(actAt(mine, 11, [0, 0, 1, 1, 0], { king: 11 }), 0, FEAST_PICK);
  assert.equal(k.players[0].pts, 5);
  assert.ok(!canFeast(actAt(g, 11, [0, 0, 1, 1, 0])), 'only at my estate');
  assert.ok(!canFeast(actAt(mine, 11, [0, 0, 0, 1, 1])), 'ღვინო and პური');
});

test('a work: a point a good (two with the king), only what it still needs, the one who finishes takes its card', () => {
  const g = start(2);
  const bridge = WORKS[6]; // თამარის ხიდი: ხე 1, ქვა 2, ოქრო 1 — bonus 2
  const g0: OkrosGame = { ...g, open: [{ id: 6, got: [0, 0, 0, 0, 0] }, ...g.open.filter(o => o.id !== 6).slice(0, 2)], deck: g.deck.filter(d => d !== 6), king: 3 };
  const a = actAt(g0, 6, [2, 3, 0, 0, 0]);
  assert.deepEqual(giveMax(a), [1, 2, 0, 0, 0]);
  assert.equal(applyPick(a, 0, givePick([2, 0, 0, 0, 0])), a, 'more than it needs');
  const b = applyPick(a, 0, givePick([1, 1, 0, 0, 0]));
  assert.equal(b.players[0].pts, 2);
  assert.deepEqual(b.open.find(o => o.id === 6)?.got, [1, 1, 0, 0, 0]);
  assert.deepEqual(b.players[0].goods, [1, 2, 0, 0, 0]);
  // the second house finishes it where the king is: 2 goods × 2 + the card's 2
  const c = applyPick(actAt({ ...b, turn: 1 }, 6, [0, 1, 0, 0, 1], { king: 6 }), 1, givePick([0, 1, 0, 0, 1]));
  assert.equal(c.players[1].pts, 2 * 2 + bridge.bonus);
  assert.deepEqual(c.players[1].works, [6]);
  assert.ok(!c.open.some(o => o.id === 6));
  assert.equal(c.open.length, OPEN_WORKS, 'a new work comes out');
  assert.equal(c.deck.length, g0.deck.length - 1);
  assert.ok(c.log.some(l => l.k === 'new'));
  assert.ok(c.log.some(l => l.k === 'give' && l.done));
});

test('the picks: one number a move', () => {
  for (const counts of [[1, 0, 0, 0, 0], [0, 3, 1, 2, 3], [3, 3, 3, 3, 3]]) assert.deepEqual(countsOf(givePick(counts)), counts);
  assert.ok(givePick([0, 0, 0, 0, 0]) === GIVE_PICK);
  assert.ok(new Set([PASS_PICK, BUILD_PICK, FEAST_PICK, ...MARKET_PICKS, ...Array.from({ length: 12 }, (_, i) => i)]).size === 3 + 15 + 12);
});

test('the years: everyone rides once a year, the king moves on, the end after the last year', () => {
  let g = start(2, 11);
  const kings: number[] = [g.king];
  for (let guard = 0; g.phase.k !== 'end' && guard < 500; guard++) {
    const year = g.year;
    g = applyPick(g, g.turn, g.phase.k === 'move' ? reach(g)[0] : PASS_PICK);
    if (g.year !== year) kings.push(g.king);
  }
  assert.equal(g.phase.k, 'end');
  assert.equal(kings.length, yearsFor(2));
  assert.equal(new Set(kings).size, kings.length, 'the king never visits a region twice in twelve years');
});

test('the end: most points; a tie → more works, then more estates; still tied — both', () => {
  const g = start(3);
  const ps = (rows: [number, number, number][]) => ({ players: g.players.map((p, i) => ({ ...p, pts: rows[i][0], works: Array.from({ length: rows[i][1] }, (_, k) => k), left: ESTATES - rows[i][2] })) });
  assert.deepEqual(rank(ps([[20, 1, 3], [25, 0, 0], [10, 2, 5]])).order, [1, 0, 2]);
  assert.deepEqual(rank(ps([[20, 1, 3], [20, 2, 0], [10, 2, 5]])).winners, [1]);
  assert.deepEqual(rank(ps([[20, 2, 3], [20, 2, 4], [10, 2, 5]])).winners, [1]);
  assert.deepEqual(rank(ps([[20, 2, 3], [20, 2, 3], [10, 2, 5]])).winners, [0, 1]);
});

test('whole games by careful bots: every move allowed, every game ends, the works get built', () => {
  for (const n of [2, 3, 4]) {
    let works = 0, games = 0;
    for (let s = 1; s <= 40; s++) {
      let g = newOkros({ names: NAMES.slice(0, n), rnd: mulberry32(s * 977 + n) })!;
      let guard = 0;
      while (g.phase.k !== 'end' && guard++ < 1000) {
        const key = keyOf(g);
        const next = applyPick(g, g.turn, botPick(g));
        assert.notEqual(next, g, `stuck at ${key}`);
        assert.ok(next.players.every(p => total(p.goods) <= HAND_MAX && p.goods.every(c => c >= 0)));
        g = next;
      }
      assert.equal(g.phase.k, 'end');
      works += g.players.reduce((a, p) => a + p.works.length, 0);
      games++;
    }
    const avg = works / games;
    assert.ok(avg >= 2.5 && avg <= 9, `${n} players: ${avg} works a game`);
  }
});

test('kept and sent: a game read back is the same game; a broken one is refused', () => {
  let g = start(3, 5);
  for (let k = 0; k < 12; k++) g = applyPick(g, g.turn, botPick(g));
  const back = parseOkros(JSON.parse(JSON.stringify(g)));
  assert.deepEqual(back, g);
  assert.equal(parseOkros(null), null);
  assert.equal(parseOkros({ ...g, players: g.players.slice(0, 1) }), null);
  assert.equal(parseOkros({ ...g, king: TBILISI }), null);
  assert.equal(parseOkros({ ...g, estates: g.estates.slice(1) }), null);
  assert.equal(parseOkros({ ...g, phase: { k: 'nope' } }), null);
  assert.equal(parseOkros({ ...g, players: g.players.map(p => ({ ...p, goods: [11, 0, 0, 0, 0] })) }), null);
});
