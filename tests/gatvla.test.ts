import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILT_IN_RHYMES, beatsOf, cleanName, countOut, countingSteps, splitTeams, stillIn, wheelDelay, wheelPick, wheelSteps } from '../src/utils/gatvla';
import { mulberry32 } from '../src/utils/otkheuli';

test('beatsOf counts the words of a rhyme, punctuation dropped', () => {
  assert.deepEqual(beatsOf('ანი, ბანი, განი — დონი!'), ['ანი', 'ბანი', 'განი', 'დონი']);
  assert.equal(beatsOf(BUILT_IN_RHYMES[0].text).length, 33);
  assert.deepEqual(beatsOf('   '), []);
});

test('countOut lands where the last beat falls', () => {
  assert.equal(countOut(5, 1, 0), 0);
  assert.equal(countOut(5, 5, 0), 4);
  assert.equal(countOut(5, 6, 0), 0);
  assert.equal(countOut(5, 3, 4), 1);
  assert.equal(countOut(0, 3, 0), -1);
  assert.equal(countOut(3, 0, 0), -1);
});

test('countingSteps goes round those still in and ends on the pick', () => {
  const names = ['ა', 'ბ', 'გ', 'დ'];
  const steps = countingSteps(names, new Set(), 6, 0);
  assert.deepEqual(steps, [0, 1, 2, 3, 0, 1]);
  // ბ was picked already: the circle is ა გ დ, counting from the next after ბ
  const again = countingSteps(names, new Set([1]), 4, 2);
  assert.deepEqual(again, [2, 3, 0, 2]);
  assert.deepEqual(stillIn(names, new Set([1])), [0, 2, 3]);
  assert.deepEqual(countingSteps(names, new Set([0, 1, 2, 3]), 3, 0), []);
  // `from` past the last one still in starts at the first
  assert.deepEqual(countingSteps(names, new Set([3]), 2, 3), [0, 1]);
});

test('wheelPick asks the one asked least, at random among equals', () => {
  const names = ['ა', 'ბ', 'გ'];
  assert.equal(wheelPick(names, { 'ა': 2, 'ბ': 1, 'გ': 2 }, () => 0.9), 1);
  const seen = new Set<number>();
  const rnd = mulberry32(5);
  for (let i = 0; i < 40; i++) seen.add(wheelPick(names, {}, rnd));
  assert.deepEqual([...seen].sort(), [0, 1, 2]);
  assert.equal(wheelPick([], {}, () => 0), -1);
  // the first turn of a newcomer comes first
  assert.equal(wheelPick(['ა', 'ბ', 'ახალი'], { 'ა': 1, 'ბ': 1 }, () => 0.5), 2);
});

test('wheelSteps makes whole turns and stops on the pick, slowing down', () => {
  const steps = wheelSteps(4, 1, 3, 2);
  assert.equal(steps[0], 1);
  assert.equal(steps[steps.length - 1], 3);
  assert.equal(steps.length, 2 * 4 + 2 + 1);
  assert.ok(wheelDelay(0, 10) < wheelDelay(5, 10) && wheelDelay(5, 10) < wheelDelay(10, 10));
  assert.deepEqual(wheelSteps(0, 0, 0), []);
});

test('splitTeams deals everyone out evenly', () => {
  const names = Array.from({ length: 11 }, (_, i) => `n${i}`);
  const teams = splitTeams(names, 3, mulberry32(1));
  assert.deepEqual(teams.map(t => t.length), [4, 4, 3]);
  assert.deepEqual(teams.flat().sort(), [...names].sort());
  assert.equal(cleanName('  გიორგი   ბერიძე  '), 'გიორგი ბერიძე');
  assert.equal(cleanName('ა'.repeat(30)).length, 20);
});
