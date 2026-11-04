import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/utils/otkheuli';
import { Q_CITY_COUNT, Q_ROUTES } from '../src/data/qaravaniRoutes';
import { Q_CITIES, Q_GOODS } from '../src/data/qaravaniMap';
import {
  CARGO_PTS, CITY_CARGO, CITY_VALUE, COINS0, GUEST, INNS, INN_COST, INN_PTS, NEXT, ROUTE_TRACKS, START_MAX, TRACKS, TRADE,
  TRADE_PICK, applyPick, botPick, canTake, cartsFor, claimPick, diceFor, diceOpen, hasPair, hasSix, holdersOf, innPick, innSpots,
  joins, keyOf, legalPicks, netOf, newQaravani, parseQaravani, resultOf, roadOpen, roundsFor, scoreOf, sumsOf, takeable, timeUp,
  tweakPick, type QGame,
} from '../src/utils/qaravani';

const city = (key: string) => { const i = Q_CITIES.findIndex(c => c.key === key); assert.ok(i >= 0, key); return i; };
const track = (a: string, b: string, lane = 0) => {
  const r = Q_ROUTES.findIndex(([x, y]) => (x === city(a) && y === city(b)) || (x === city(b) && y === city(a)));
  assert.ok(r >= 0, `${a}-${b}`);
  return ROUTE_TRACKS[r][lane];
};
const NAMES = ['ანა', 'ბექა', 'გიო', 'დათო', 'ეკა'];
const fresh = (n = 3, seed = 7) => newQaravani({ names: NAMES.slice(0, n), first: 0, rnd: mulberry32(seed) })!;
/** past the start: the houses' first caravanserais in the towns given (the last house first, as the game asks) */
const started = (towns: string[], seed = 7) => {
  const n = towns.length;
  let g = fresh(n, seed);
  for (let k = 0; k < n; k++) {
    const p = g.turn, next = applyPick(g, p, innPick(city(towns[p])));
    assert.notEqual(next, g, `${towns[p]} for ${p}`);
    g = next;
  }
  return g;
};
/** the same game with these dice on the table */
const withDice = (g: QGame, dice: number[]): QGame => ({ ...g, dice: [...dice], rolled: [...dice] });

test('the map is the kit\'s: 47 cities with their worth and cargo, 74 roads with 82 tracks', () => {
  assert.equal(Q_CITY_COUNT, 47);
  assert.equal(Q_CITIES.length, 47);
  assert.equal(Q_ROUTES.length, 74);
  assert.equal(TRACKS.length, 82);
  assert.equal(TRACKS.filter(t => t.mountain).length, 13);
  assert.equal(new Set(TRACKS.filter(t => t.water).map(t => t.route)).size, 4);
  assert.equal(CITY_VALUE.length, 47);
  assert.equal(CITY_CARGO.length, 47);
  assert.equal(CITY_VALUE[city('tbilisi')], 5);
  assert.equal(CITY_VALUE[city('kutaisi')], 4);
  assert.ok(CITY_VALUE.every(v => v >= 1 && v <= 5));
  // eight kinds: wine in three places, the blue tablecloth in Tbilisi alone, the rest in two
  const count = Q_GOODS.map((_, k) => CITY_CARGO.filter(c => c === k).length);
  assert.deepEqual(count, [3, 2, 2, 1, 2, 2, 2, 2]);
  assert.equal(Q_GOODS[CITY_CARGO[city('tbilisi')]].name, 'ლურჯი სუფრა');
  assert.equal(Q_GOODS[CITY_CARGO[city('telavi')]].name, 'ღვინო');
  // the map is one piece: every city reaches every other
  const seen = new Set([0]), todo = [0];
  while (todo.length) for (const y of NEXT[todo.pop()!]) if (!seen.has(y)) { seen.add(y); todo.push(y); }
  assert.equal(seen.size, 47);
});

test('the dice: sums of one, two or three, the pair, the six, the dice a road uses', () => {
  assert.deepEqual(sumsOf([1, 2, 4]), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(sumsOf([3, 3, 3]), [3, 6, 9]);
  assert.equal(hasPair([2, 5, 2]), true);
  assert.equal(hasPair([1, 2, 3]), false);
  assert.equal(hasSix([6, 1, 1]), true);
  assert.deepEqual(diceFor([1, 2, 4], 4), [2]);
  assert.deepEqual(diceFor([1, 2, 4], 3), [0, 1]);
  assert.deepEqual(diceFor([1, 2, 4], 7), [0, 1, 2]);
  assert.equal(diceFor([5, 5, 5], 4), null);
  // a mountain road wants a pair, a water road a six
  const pass = track('ananuri', 'stepantsminda'), water = track('poti', 'samtredia');
  assert.equal(TRACKS[pass].mountain, true);
  assert.equal(diceOpen([3, 5, 1], pass), false, 'three cells, but no pair');
  assert.equal(diceOpen([3, 1, 1], pass), true);
  assert.equal(diceOpen([2, 1, 4], water), false);
  assert.equal(diceOpen([2, 6, 4], water), true);
});

test('the start: every house places a caravanserai in a town, the last house first, then the first house rolls', () => {
  let g = fresh(3);
  assert.equal(g.phase.k, 'start');
  assert.equal(g.turn, 2, 'the house before the first one chooses first');
  const spots = innSpots(g);
  assert.ok(spots.length > 20);
  assert.ok(spots.every(x => CITY_VALUE[x] <= START_MAX));
  assert.ok(!spots.includes(city('tbilisi')) && !spots.includes(city('kutaisi')) && !spots.includes(city('batumi')));
  assert.equal(applyPick(g, 0, innPick(city('mestia'))), g, 'not the first house yet');
  g = applyPick(g, 2, innPick(city('sagarejo')));
  assert.equal(g.turn, 1);
  // not next to another caravanserai
  assert.ok(!innSpots(g).includes(city('gurjaani')));
  assert.ok(!innSpots(g).includes(city('sagarejo')));
  g = applyPick(g, 1, innPick(city('mestia')));
  g = applyPick(g, 0, innPick(city('ozurgeti')));
  assert.equal(g.phase.k, 'turn');
  assert.equal(g.turn, 0);
  assert.equal(g.round, 1);
  assert.equal(g.dice.length, 3);
  assert.ok(g.dice.every(d => d >= 1 && d <= 6));
  assert.deepEqual(g.players.map(p => p.inns), [INNS - 1, INNS - 1, INNS - 1]);
  assert.deepEqual(g.players.map(p => p.coins), [COINS0, COINS0, COINS0], 'the start caravanserai is free');
  assert.deepEqual([...netOf(g.owner, g.inn, 1)], [city('mestia')]);
});

test('a road: its cells are some dice\'s sum, it touches the caravan, the carts pay for it', () => {
  const g = withDice(started(['ozurgeti', 'mestia', 'sagarejo']), [1, 4, 5]);
  const toKob = track('kobuleti', 'ozurgeti'), toSam = track('ozurgeti', 'samtredia'), far = track('batumi', 'kobuleti');
  assert.equal(canTake(g, 0, toKob), true);
  assert.equal(canTake(g, 0, toSam), false, 'two cells: no die nor sum gives 2');
  assert.equal(canTake(g, 0, far), false, 'not at my caravan');
  assert.deepEqual(takeable(g).sort(), [toKob]);
  const x = applyPick(g, 0, claimPick(toKob));
  assert.equal(x.owner[toKob], 0);
  assert.equal(x.players[0].carts, cartsFor(3) - 1);
  assert.equal(x.turn, 1, 'a road ends the turn');
  assert.deepEqual(x.log.at(-1), { k: 'road', p: 0, t: toKob, spent: 0 });
  // now Kobuleti is mine: Batumi's road joins
  assert.equal(joins(x.owner, x.inn, 20, 3, 0, far), true);
  assert.equal(applyPick(g, 1, claimPick(toKob)), g, 'not your turn');
});

test('an abazi moves a die by one; a trade brings two and ends the turn', () => {
  const g = withDice(started(['ozurgeti', 'mestia', 'sagarejo']), [3, 4, 5]);
  const toSam = track('ozurgeti', 'samtredia');
  assert.equal(canTake(g, 0, toSam), false);
  const t = applyPick(g, 0, tweakPick(0, false));
  assert.deepEqual(t.dice, [2, 4, 5]);
  assert.deepEqual(t.rolled, [3, 4, 5]);
  assert.equal(t.players[0].coins, COINS0 - 1);
  assert.equal(t.spent, 1);
  assert.equal(t.turn, 0, 'still my turn');
  assert.equal(canTake(t, 0, toSam), true);
  assert.equal(applyPick(t, 0, tweakPick(1, true)), t, 'no abazi left');
  const six = withDice(g, [6, 4, 5]);
  assert.equal(applyPick(six, 0, tweakPick(0, true)), six, 'a die stays within 1–6');
  const tr = applyPick(g, 0, TRADE_PICK);
  assert.equal(tr.players[0].coins, COINS0 + TRADE);
  assert.equal(tr.turn, 1);
  assert.deepEqual(tr.log.at(-1), { k: 'trade', p: 0, spent: 0 });
  assert.notEqual(keyOf(tr), keyOf(g));
});

test('a caravanserai: three abazi, a city of one\'s caravan, once a city; a guest\'s road brings its owner an abazi', () => {
  let g = started(['ozurgeti', 'mestia', 'sagarejo']);
  g = { ...g, players: g.players.map((p, i) => (i === 0 ? { ...p, coins: 7 } : p)) };
  const toKob = track('kobuleti', 'ozurgeti');
  g = applyPick(withDice(g, [1, 2, 3]), 0, claimPick(toKob));
  // round the table to me again: the others trade
  g = applyPick(g, 1, TRADE_PICK);
  g = applyPick(g, 2, TRADE_PICK);
  assert.equal(g.turn, 0);
  assert.deepEqual(innSpots(g), [city('kobuleti')], 'Ozurgeti has mine already');
  const x = applyPick(g, 0, innPick(city('kobuleti')));
  assert.equal(x.players[0].coins, 7 - INN_COST);
  assert.equal(x.players[0].inns, INNS - 2);
  assert.equal(x.turn, 0, 'building does not end the turn');
  assert.deepEqual(innSpots(x), []);
  assert.equal(applyPick(g, 0, innPick(city('batumi'))), g, 'not at my caravan');
  // a guest's road into Kobuleti: house 1 jumps there (its own roads are far) — it may only when nothing touches its caravan
  const blocked = { ...x, turn: 1, owner: x.owner.map((o, t) => (TRACKS[t].a === city('mestia') || TRACKS[t].b === city('mestia') ? 2 : o)) };
  const bk = track('batumi', 'kobuleti');
  assert.equal(joins(blocked.owner, blocked.inn, 20, 3, 1, bk), true, 'no free road touches Mestia: anywhere');
  const y = applyPick(withDice(blocked, [1, 1, 1]), 1, claimPick(bk));
  assert.equal(y.owner[bk], 1);
  assert.equal(y.players[0].coins, 7 - INN_COST + GUEST);
  assert.deepEqual(y.log.slice(-2).map(l => l.k), ['road', 'guest']);
});

test('double roads: never both lanes for one house, one lane only with three or fewer', () => {
  const owner = TRACKS.map(() => -1);
  const a = track('mtskheta', 'tbilisi', 0), b = track('mtskheta', 'tbilisi', 1);
  assert.equal(TRACKS[a].twin, b);
  owner[a] = 0;
  assert.equal(roadOpen(owner, 20, 3, 1, b), false);
  assert.equal(roadOpen(owner, 20, 4, 1, b), true);
  assert.equal(roadOpen(owner, 20, 4, 0, b), false);
  assert.equal(roadOpen(owner, 0, 4, 1, b), false, 'no carts');
});

test('the journeys: the game ends after the last house of the last round', () => {
  for (const n of [2, 3, 4, 5]) {
    let g = started(['ozurgeti', 'mestia', 'sagarejo', 'akhalkalaki', 'lagodekhi'].slice(0, n));
    let turns = 0;
    while (g.phase.k !== 'end') { g = applyPick(g, g.turn, TRADE_PICK); turns++; }
    assert.equal(turns, roundsFor(n) * n);
    if (n === 2) assert.equal(g.log.filter(l => l.k === 'round').length, roundsFor(2) - 1);
    assert.equal(applyPick(g, g.turn, TRADE_PICK), g);
  }
});

test('the score: cities by most roads (a caravanserai counts two, a tie shares rounded down), cargo kinds, caravanserais', () => {
  const owner = TRACKS.map(() => -1), inn = Array(Q_CITY_COUNT).fill(0);
  const tb = city('tbilisi'), mt = city('mtskheta'), sg = city('sagarejo');
  owner[track('mtskheta', 'tbilisi', 0)] = 0;
  owner[track('tbilisi', 'sagarejo', 0)] = 1;
  assert.deepEqual(holdersOf(owner, inn, 3, tb), [0, 1]);
  let rows = scoreOf(owner, inn, 3);
  // Tbilisi (5) shared: 2 each; Mtskheta to 0, Sagarejo to 1
  assert.equal(rows[0].cityPts, Math.floor(5 / 2) + CITY_VALUE[mt]);
  assert.equal(rows[1].cityPts, Math.floor(5 / 2) + CITY_VALUE[sg]);
  // both reach Tbilisi's tablecloth
  assert.deepEqual(rows[0].cargo, [CITY_CARGO[tb]]);
  assert.equal(rows[0].cargoPts, CARGO_PTS[1]);
  inn[tb] = 1 << 1;
  rows = scoreOf(owner, inn, 3);
  assert.deepEqual(holdersOf(owner, inn, 3, tb), [1]);
  assert.equal(rows[1].cityPts, 5 + CITY_VALUE[sg]);
  assert.equal(rows[1].inns, 1);
  assert.equal(rows[1].total, rows[1].cityPts + rows[1].cargoPts + INN_PTS);
  assert.equal(rows[2].total, 0);
  // the cargo table
  assert.deepEqual([...CARGO_PTS], [0, 1, 3, 5, 8, 11, 15, 20, 25]);
});

test('the result: most points, then most cities, then most abazi', () => {
  const g = started(['ozurgeti', 'mestia', 'sagarejo']);
  const r = resultOf(g);
  // three lone caravanserais: each holds its town + 2 for the caravanserai; Ozurgeti's tea and Mestia's honey are cargo too
  assert.equal(r.rows[0].total, CITY_VALUE[city('ozurgeti')] + CARGO_PTS[1] + INN_PTS);
  assert.equal(r.rows[2].total, CITY_VALUE[city('sagarejo')] + INN_PTS);
  assert.deepEqual(r.winners, [0, 1], 'the same points, cities and abazi');
  assert.equal(r.order[2], 2);
  const tied = { ...g, inn: g.inn.map(() => 0) };
  const t = resultOf({ ...tied, players: tied.players.map((p, i) => ({ ...p, coins: i === 2 ? 5 : 1 })) });
  assert.deepEqual(t.winners, [2], 'all zero: the most abazi');
});

test('random games end, every move is legal, the bot never stalls, a kept game reads back', () => {
  for (const n of [2, 3, 4, 5]) for (let k = 0; k < 6; k++) {
    const rnd = mulberry32(100 * n + k);
    let g = newQaravani({ names: NAMES.slice(0, n), rnd })!;
    let steps = 0;
    while (g.phase.k !== 'end' && steps < 2000) {
      const legal = legalPicks(g);
      assert.ok(legal.length > 0);
      const pick = k % 2 ? botPick(g) : legal[Math.floor(rnd() * legal.length)];
      assert.ok(legal.includes(pick), `bot's ${pick} is legal`);
      const x = applyPick(g, g.turn, pick);
      assert.notEqual(x, g);
      g = x;
      steps++;
      if (steps % 17 === 0) assert.deepEqual(parseQaravani(JSON.parse(JSON.stringify(g))), g);
    }
    assert.equal(g.phase.k, 'end');
    assert.ok(g.players.every(p => p.carts >= 0 && p.coins >= 0 && p.inns >= 0));
    assert.deepEqual(parseQaravani(JSON.parse(JSON.stringify(g))), g);
    const r = resultOf(g);
    assert.equal(r.order.length, n);
    assert.ok(r.winners.length >= 1);
  }
});

test('time up: the careful move, and the game moves on', () => {
  const g = fresh(4, 3);
  let x = g, guard = 0;
  while (x.phase.k !== 'end' && guard++ < 500) {
    const y = timeUp(x);
    assert.notEqual(y, x);
    x = y;
  }
  assert.equal(x.phase.k, 'end');
  assert.equal(timeUp(x), x);
});

test('a kept game must be whole', () => {
  const g = started(['ozurgeti', 'mestia', 'sagarejo']);
  assert.equal(parseQaravani(null), null);
  assert.equal(parseQaravani({ ...g, v: 1 }), null);
  assert.equal(parseQaravani({ ...g, owner: g.owner.slice(1) }), null);
  assert.equal(parseQaravani({ ...g, dice: [1, 2] }), null);
  assert.equal(parseQaravani({ ...g, players: g.players.slice(0, 1) }), null);
  assert.equal(parseQaravani({ ...g, round: roundsFor(3) + 1 }), null);
  assert.equal(parseQaravani({ ...g, inn: g.inn.map(() => 8) }), null);
});
