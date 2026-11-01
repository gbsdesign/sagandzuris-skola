import test from 'node:test';
import assert from 'node:assert/strict';
import type { KhaziCard } from '../src/utils/khazi';
import { newKhaziTeams, parseKhaziTeams, placeCard, timeUp, undo, winners } from '../src/utils/khaziTeams';

const card = (id: string, when: number): KhaziCard => ({ id, deck: 'istoria', text: id, when, label: String(when), icon: 'flag' });
// the deck in its dealt order: 1500 starts the line
const DECK = [card('s', 1500), card('a', 1100), card('b', 1900), card('c', 1700), card('d', 1300), card('e', 2000), card('f', 1000)];
const byId = (id: string) => DECK.find(c => c.id === id);
const fresh = (goal = 2) => newKhaziTeams(['ა', 'ბ'], 'istoria', DECK, goal, 30, 1000);

test('the start card opens the line; a right place scores and passes the turn, a wrong one only passes it', () => {
  let g = fresh();
  assert.deepEqual(g.placed, [{ id: 's', ok: null }]);
  assert.equal(g.at, 1);
  g = placeCard(g, 0, byId, 2000); // a = 1100 before 1500: right
  assert.deepEqual(g.scores, [1, 0]);
  assert.equal(g.turn, 1);
  assert.equal(g.t0, 2000);
  assert.deepEqual(g.last, { id: 'a', ok: true, team: 0 });
  assert.deepEqual(g.placed[1], { id: 'a', ok: true, team: 0 });
  g = placeCard(g, 0, byId, 3000); // b = 1900 at the very start: wrong
  assert.deepEqual(g.scores, [1, 0]);
  assert.equal(g.turn, 0);
  assert.deepEqual(g.placed[2], { id: 'b', ok: false });
});

test('the game ends after the whole round in which a team reached the goal, so every team had as many turns', () => {
  let g = fresh(2);
  g = placeCard(g, 0, byId, 1); // ა: a 1100 → right (1)
  g = placeCard(g, 0, byId, 2); // ბ: b 1900 → wrong
  // the line now: a 1100, s 1500, b 1900; c = 1700 goes between s and b (gap 2)
  g = placeCard(g, 2, byId, 3); // ა: right (2) — the goal, but ბ still plays
  assert.equal(g.over, false);
  // d = 1300: between a and s (gap 1)
  g = placeCard(g, 1, byId, 4); // ბ: right (1); the round is over
  assert.equal(g.over, true);
  assert.deepEqual(winners(g), ['ა']);
});

test('the deck running out ends the game; the clock\'s end places the card unanswered; „უკან“ takes one step back', () => {
  let g = fresh(99);
  g = timeUp(g, 5000);
  assert.deepEqual(g.placed[1], { id: 'a', ok: false });
  assert.equal(g.turn, 1);
  const before = g;
  g = placeCard(g, 0, byId, 6000);
  g = undo(g, 7000);
  assert.deepEqual(g.placed, before.placed);
  assert.equal(g.turn, before.turn);
  assert.equal(g.t0, 7000);
  for (let i = 0; i < 10 && !g.over; i++) g = timeUp(g, 8000 + i);
  assert.equal(g.over, true);
  assert.equal(g.at, DECK.length);
  assert.equal(timeUp(g, 9999), g);
});

test('a kept game comes back checked; junk does not', () => {
  const g = placeCard(fresh(), 0, byId, 2000);
  const back = parseKhaziTeams(JSON.parse(JSON.stringify(g)), id => !!byId(id));
  assert.ok(back);
  assert.deepEqual({ ...back, prev: null }, { ...g, prev: null });
  assert.equal(parseKhaziTeams({ names: ['ა'] }, () => true), null);
  assert.equal(parseKhaziTeams(null, () => true), null);
  assert.equal(parseKhaziTeams({ ...g, pick: 'x' }, () => true), null);
});
