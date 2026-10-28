import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDeck, clock, nextTeam, shuffle, totals, turnScore, winnerOf } from '../src/utils/amikhseni';

const cats = [
  { id: 'a', words: ['ჩონგური', 'ფანდური', 'დოლი'] },
  { id: 'b', words: ['ჩონგური', 'სუფრა'] },
  { id: 'c', words: ['ლელო'] },
];

test('the deck holds every chosen word once, shuffled; no choice means all', () => {
  const rnd = () => 0.5;
  assert.deepEqual([...buildDeck(cats, ['a', 'b'], rnd)].sort(), ['დოლი', 'სუფრა', 'ფანდური', 'ჩონგური']);
  assert.equal(buildDeck(cats, [], rnd).length, 5);
  assert.deepEqual(buildDeck(cats, ['c'], rnd), ['ლელო']);
  const seq = [0.1, 0.9, 0.3, 0.7];
  let i = 0;
  const s = shuffle([1, 2, 3, 4, 5], () => seq[i++ % seq.length]);
  assert.deepEqual([...s].sort(), [1, 2, 3, 4, 5]);
  assert.notDeepEqual(s, [1, 2, 3, 4, 5]);
});

test('a guessed word is a point, a skipped one costs a point only with the penalty on', () => {
  const t = { team: 0, words: [{ word: 'ა', ok: true }, { word: 'ბ', ok: false }, { word: 'გ', ok: true }] };
  assert.equal(turnScore(t, true), 1);
  assert.equal(turnScore(t, false), 2);
  assert.deepEqual(totals([t, { team: 1, words: [{ word: 'დ', ok: true }] }, { team: 0, words: [] }], 2, true), [1, 1]);
  assert.deepEqual(totals([], 3, true), [0, 0, 0]);
});

test('teams take turns in order; the winner is named only after a full round, and a tie plays on', () => {
  assert.equal(nextTeam(0, 3), 0);
  assert.equal(nextTeam(4, 3), 1);
  assert.equal(winnerOf([30, 10], 30, 1), null); // the second team still has its turn
  assert.equal(winnerOf([30, 10], 30, 2), 0);
  assert.equal(winnerOf([29, 10], 30, 2), null);
  assert.equal(winnerOf([31, 31], 30, 2), null);
  assert.equal(winnerOf([31, 33, 5], 30, 3), 1);
  assert.equal(winnerOf([], 30, 0), null);
});

test('the clock reads m:ss', () => {
  assert.equal(clock(60), '1:00');
  assert.equal(clock(7), '0:07');
  assert.equal(clock(125), '2:05');
});
