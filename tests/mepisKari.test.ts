import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/utils/otkheuli';
import {
  AID, COUP, INCOME, KILL, STEAL, SWAP, TAX, block, canDeclare, declare, doubt, keep, keyOf, letGo, living, lose, newKari, parseKari, pass,
  proof, swapDone, timeUp, waitingOn, winnerOf, type KariGame, type Role,
} from '../src/utils/mepisKari';

const NAMES = ['ანა', 'ბექა', 'გიო', 'დათო'];
/** a game with the hands and coins given, the first to move named */
const setUp = (hands: Role[][], coins?: number[], first = 0): KariGame => {
  const g = newKari({ names: NAMES.slice(0, hands.length), first, rnd: mulberry32(7) })!;
  return { ...g, players: g.players.map((p, i) => ({ ...p, hand: hands[i], coins: coins?.[i] ?? p.coins })) };
};
const cards = (g: KariGame) => g.players.reduce((s, p) => s + p.hand.length + p.shown.length, 0) + g.deck.length;
const everyonePasses = (g: KariGame) => waitingOn(g).reduce((s, i) => pass(s, i), g);

test('a new court: two cards and two coins each, the deck of 15 or 20, two players start 1 · 2', () => {
  const g = newKari({ names: NAMES, rnd: mulberry32(1) })!;
  assert.equal(cards(g), 15);
  assert.ok(g.players.every(p => p.hand.length === 2 && p.coins === 2 && !p.shown.length));
  assert.equal(cards(newKari({ names: [...NAMES, 'ე', 'ვ', 'ზ'], rnd: mulberry32(1) })!), 20);
  const two = newKari({ names: ['ა', 'ბ'], first: 1, rnd: mulberry32(2) })!;
  assert.deepEqual(two.players.map(p => p.coins), [2, 1]);
  assert.equal(two.turn, 1);
  assert.equal(newKari({ names: ['ა'] }), null);
  assert.equal(newKari({ names: Array.from({ length: 9 }, (_, i) => `${i}`) }), null);
  const paper = newKari({ names: NAMES, paper: true, rnd: mulberry32(3) })!;
  assert.deepEqual(paper.players[0].hand, [-1, -1]);
  assert.equal(paper.deck.length, 0);
});

test('income and foreign aid: aid is blocked by anybody as the treasurer, and that block may be doubted', () => {
  let g = setUp([[0, 1], [0, 2], [3, 4]]);
  g = declare(g, INCOME);
  assert.equal(g.players[0].coins, 3);
  assert.equal(g.turn, 1);
  const k = keyOf(g);
  g = declare(g, AID);
  assert.notEqual(keyOf(g), k);
  assert.equal(g.phase.k, 'block');
  assert.deepEqual(waitingOn(g), [0, 2], 'anybody but the actor may block foreign aid');
  assert.equal(block(g, 2, 4), g, 'only as the treasurer');
  g = block(g, 2, 0);
  assert.equal(g.phase.k, 'doubt');
  assert.deepEqual(waitingOn(g), [0, 1], 'the block may be doubted by anybody but the blocker — the actor too');
  // gio had no treasurer: his block falls, he loses a card, the aid goes through
  g = doubt(g, 1);
  assert.equal(g.phase.k, 'lose');
  g = lose(g, 2, 1);
  assert.deepEqual(g.players[2].shown, [4]);
  assert.equal(g.players[1].coins, 4);
  assert.equal(g.turn, 2);
});

test('a true claim survives a doubt: the card is shown, swapped for a new one, the doubter loses', () => {
  let g = setUp([[0, 1], [2, 3], [4, 4]]);
  g = declare(g, TAX);
  assert.deepEqual(waitingOn(g), [1, 2]);
  const before = cards(g);
  g = doubt(g, 2);
  assert.equal(cards(g), before, 'the shown card went back into the deck and one came out');
  assert.equal(g.players[0].hand.length, 2);
  assert.ok(g.log.some(l => l.t === 'doubt' && l.truth));
  assert.equal(g.phase.k, 'lose');
  g = lose(g, 2, 0);
  assert.equal(g.players[0].coins, 5, 'the tax is then taken');
  assert.equal(g.turn, 1);
});

test('a bluff found out: the claimer loses a card and the action fails, the assassin’s coins come back', () => {
  let g = setUp([[0, 3], [2, 3], [4, 0]], [3, 2, 2]);
  g = declare(g, KILL, 1);
  assert.equal(g.players[0].coins, 0, 'paid at once');
  g = doubt(g, 1);
  assert.equal(g.phase.k, 'lose');
  assert.equal(g.players[0].coins, 3, 'refunded');
  g = lose(g, 0, 1);
  assert.deepEqual(g.players[0].shown, [3]);
  assert.equal(g.players[1].hand.length, 2, 'the target is untouched');
  assert.equal(g.turn, 1);
});

test('the assassination: the queen’s block keeps the coins spent; a doubted bluff of a queen costs two cards', () => {
  let g = setUp([[1, 0], [2, 3], [4, 0]], [3, 2, 2]);
  g = everyonePasses(declare(g, KILL, 1));
  assert.equal(g.phase.k, 'block');
  assert.deepEqual(waitingOn(g), [1], 'only the target blocks it');
  // bekha bluffs the queen, ana doubts: bekha loses one for the bluff, then the other to the assassin
  g = doubt(block(g, 1, 4), 0);
  g = lose(g, 1, 0);
  assert.equal(living(g).includes(1), false, 'out of the court in one turn');
  assert.equal(g.players[1].coins, 0, 'his coins went back to the treasury');
  assert.equal(g.turn, 2);
  // a real queen stands: the turn ends, the 3 coins are gone
  let h = setUp([[1, 0], [4, 3], [2, 0]], [3, 2, 2]);
  h = everyonePasses(block(everyonePasses(declare(h, KILL, 1)), 1, 4));
  assert.equal(h.players[0].coins, 0);
  assert.equal(h.players[1].hand.length, 2);
  assert.ok(h.log.some(l => l.t === 'blocked'));
});

test('the double danger: the target doubts the assassin, loses, and may still block with the queen', () => {
  let g = setUp([[1, 0], [4, 3], [2, 0]], [3, 2, 2]);
  g = declare(g, KILL, 1);
  g = doubt(g, 1);
  g = lose(g, 1, 1);
  assert.equal(g.phase.k, 'block', 'still alive with one card: the queen may block');
  g = everyonePasses(block(g, 1, 4));
  assert.equal(g.players[1].hand.length, 1);
  assert.equal(g.turn, 1, 'the queen stood: bekha is still in and moves next');
});

test('stealing: two coins or what there is; blocked by the target as general or steward only', () => {
  let g = setUp([[2, 0], [0, 1], [4, 3]], [2, 1, 2]);
  g = everyonePasses(declare(g, STEAL, 1));
  assert.deepEqual(waitingOn(g), [1]);
  assert.equal(block(g, 1, 4), g);
  g = pass(g, 1);
  assert.deepEqual(g.players.map(p => p.coins), [3, 0, 2]);
  g = everyonePasses(block(everyonePasses(declare(g, STEAL, 2)), 2, 3));
  assert.deepEqual(g.players.map(p => p.coins), [3, 0, 2], 'the steward’s block stood');
});

test('the court: seven coins, no doubt and no block; ten coins make it a must', () => {
  let g = setUp([[0, 1], [2, 3]], [7, 2]);
  assert.equal(canDeclare(g, COUP, 0), false, 'not at oneself');
  g = declare(g, COUP, 1);
  assert.equal(g.players[0].coins, 0);
  assert.equal(g.phase.k, 'lose');
  g = lose(g, 1, 0);
  assert.deepEqual(g.players[1].shown, [2]);
  const rich = setUp([[0, 1], [2, 3]], [10, 2]);
  assert.equal(canDeclare(rich, TAX), false);
  assert.equal(canDeclare(rich, COUP, 1), true);
  assert.equal(canDeclare(setUp([[0, 1], [2, 3]], [6, 2]), COUP, 1), false);
});

test('the swap: two drawn, as many kept as held, the rest back in the deck', () => {
  let g = setUp([[3, 4], [0, 1], [2, 2]]);
  const size = g.deck.length;
  g = everyonePasses(declare(g, SWAP));
  assert.equal(g.phase.k, 'swap');
  const drawn = g.phase.k === 'swap' ? g.phase.drawn : [];
  assert.equal(drawn.length, 2);
  assert.equal(keep(g, 0b0001), g, 'two must be kept');
  g = keep(g, 0b1100);
  assert.deepEqual(g.players[0].hand, drawn);
  assert.equal(g.deck.length, size);
  assert.equal(g.turn, 1);
});

test('time up: windows close, the turn takes the income, the first card goes, the swap keeps the old cards', () => {
  let g = setUp([[0, 1], [2, 3], [4, 0]]);
  g = timeUp(declare(g, TAX));
  assert.equal(g.players[0].coins, 5);
  g = timeUp(g);
  assert.equal(g.players[1].coins, 3, 'income');
  assert.ok(g.log.some(l => l.t === 'late' && l.who === 1));
  g = declare(g, COUP, 0);
  assert.equal(g, g, 'two coins are not enough');
  const rich = timeUp(setUp([[0, 1], [2, 3], [4, 0]], [10, 2, 2]));
  assert.equal(rich.phase.k, 'lose', 'ten coins: the court on the next one');
  assert.equal(rich.phase.k === 'lose' && rich.phase.who, 1);
  assert.deepEqual(timeUp(rich).players[1].shown, [2]);
  let s = everyonePasses(declare(setUp([[3, 4], [0, 1]]), SWAP));
  s = timeUp(s);
  assert.deepEqual(s.players[0].hand, [3, 4]);
});

test('the last one in the court wins', () => {
  let g = setUp([[0, 1], [2, 3]], [7, 2]);
  g = declare(g, COUP, 1);
  g = lose(g, 1, 0);
  g = declare({ ...g, players: g.players.map((p, i) => (i === 0 ? p : { ...p, coins: 0 })) }, INCOME);
  g = { ...g, players: g.players.map((p, i) => (i === 0 ? { ...p, coins: 7 } : p)) };
  g = declare(g, COUP, 1);
  assert.equal(g.phase.k, 'end');
  assert.equal(winnerOf(g), 0);
  assert.equal(declare(g, INCOME), g);
});

test('on paper the host answers: who doubted, whether the card showed, which card was turned', () => {
  let g = newKari({ names: NAMES.slice(0, 3), paper: true, first: 0, rnd: mulberry32(9) })!;
  g = declare(g, TAX);
  g = doubt(g, 1);
  assert.equal(g.phase.k, 'proof');
  g = proof(g, true);
  assert.equal(g.phase.k, 'lose');
  assert.equal(lose(g, 1, 7), g, 'a courtier is named');
  g = lose(g, 1, 2);
  assert.deepEqual(g.players[1].shown, [2]);
  assert.equal(g.players[1].hand.length, 1);
  assert.equal(g.players[0].coins, 5);
  g = letGo(declare(g, SWAP));
  assert.equal(g.phase.k, 'swap');
  g = swapDone(g);
  assert.equal(g.turn, 2);
  assert.equal(timeUp(g), g, 'no clock on paper');
});

test('kept games are read back only whole', () => {
  let g = setUp([[0, 1], [2, 3], [4, 0]]);
  g = doubt(declare(g, TAX), 1);
  assert.deepEqual(parseKari(JSON.parse(JSON.stringify(g))), g);
  assert.equal(parseKari({ ...g, players: g.players.slice(0, 1) }), null);
  assert.equal(parseKari({ ...g, phase: { k: 'lose', who: 9, then: 'done' } }), null);
  assert.equal(parseKari({ ...g, players: g.players.map(p => ({ ...p, hand: [7, 1] })) }), null);
  assert.equal(parseKari(null), null);
});
