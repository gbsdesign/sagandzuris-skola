import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/utils/otkheuli';
import { MAX_TRIES } from '../src/utils/sitqva';
import { ANSWER_BANK } from '../src/data/sitqvaAnswers';
import { drawSqWord, newSqTeams, parseSqTeams, sqFinder, sqGuess, sqNext, sqPoints, sqTime } from '../src/utils/sitqvaTeams';

const start = () => newSqTeams(['ა', 'ბ'], 3, 45, false, { word: 'გურია', kind: 'region' }, 1000);

test('points by the row: 6 for the first, 1 for the sixth', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(sqPoints), [6, 5, 4, 3, 2, 1]);
});

test('teams take turns; the one that finds it scores by its row', () => {
  let g = start();
  g = sqGuess(g, 'მთები', 2000);
  assert.equal(g.turn, 1);
  assert.deepEqual(g.by, [0]);
  assert.equal(sqGuess(g, 'მთები', 2100), g, 'a word tried is not tried again');
  assert.equal(sqGuess(g, 'მთა', 2100), g, 'the length must fit');
  g = sqGuess(g, 'გურია', 3000);
  assert.equal(g.phase, 'word');
  assert.deepEqual(g.scores, [0, sqPoints(2)]);
  assert.equal(sqFinder(g), 1);
  assert.equal(sqGuess(g, 'ფშავი', 3100), g, 'no rows after the word is found');
});

test('the clock passes the turn without a row; six rows end the word with nobody', () => {
  let g = start();
  g = sqTime(g, 2000);
  assert.equal(g.turn, 1);
  assert.equal(g.guesses.length, 0);
  assert.deepEqual(g.last, { team: 0 });
  for (const w of ['მთები', 'ფშავი', 'ქალაქ', 'ბარდი', 'ტყეში', 'ზღვაო']) g = sqGuess(g, w, 3000);
  assert.equal(g.guesses.length, MAX_TRIES);
  assert.equal(g.phase, 'word');
  assert.equal(sqFinder(g), -1);
  assert.deepEqual(g.scores, [0, 0]);
});

test('the next word goes to the next team; the game ends after its count', () => {
  let g = start();
  g = sqGuess(g, 'გურია', 2000);
  g = sqNext(g, { word: 'ფშავი', kind: 'region' }, 3000);
  assert.equal(g.at, 1);
  assert.equal(g.first, 1);
  assert.equal(g.turn, 1);
  assert.deepEqual(g.guesses, []);
  assert.deepEqual(g.used, ['გურია', 'ფშავი']);
  g = sqGuess(g, 'ფშავი', 4000);
  g = sqNext(g, { word: 'ხაჭო', kind: 'food' }, 5000);
  assert.equal(g.first, 0);
  g = sqGuess(g, 'ხაჭო', 6000);
  g = sqNext(g, { word: 'ტყემალი'.slice(0, 6), kind: 'food' }, 7000);
  assert.equal(g.phase, 'over');
  assert.deepEqual(g.scores, [6 + 6, 6]);
});

test('a word is drawn from the bank, not one this game had', () => {
  const rnd = mulberry32(5);
  const used: string[] = [];
  for (let i = 0; i < 30; i++) {
    const c = drawSqWord(ANSWER_BANK, used, rnd)!;
    assert.ok(c.word.length >= 4 && c.word.length <= 6);
    assert.ok(!used.includes(c.word));
    used.push(c.word);
  }
  assert.equal(drawSqWord([], [], rnd), undefined);
});

test('a kept game reads back; a broken one does not', () => {
  let g = start();
  g = sqGuess(g, 'მთები', 2000);
  assert.deepEqual(parseSqTeams(JSON.parse(JSON.stringify(g))), g);
  assert.equal(parseSqTeams({ ...g, by: [] }), null);
  assert.equal(parseSqTeams({ ...g, guesses: ['მთა'], by: [0] }), null);
  assert.equal(parseSqTeams({ ...g, kind: 'other' }), null);
  assert.equal(parseSqTeams({ ...g, word: 'ab' }), null);
});
