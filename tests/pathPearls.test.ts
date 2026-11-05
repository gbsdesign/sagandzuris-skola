import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHEST_COUNT, CHEST_SIZE, chestsOf, pearlCounts, pearlOf } from '../src/utils/pathPearls';

test('a pearl is new, polished once the member marks it, shining once a teacher confirms it', () => {
  assert.equal(pearlOf({ voices: [] }, undefined), 'new');
  assert.equal(pearlOf({ voices: ['2'] }, undefined), 'polished');
  assert.equal(pearlOf({ voices: '1,3' }, []), 'polished');
  assert.equal(pearlOf({ voices: ['1'] }, ['1']), 'shining');
  // a teacher's „ჩათვლა“ shines even when the member had not marked it
  assert.equal(pearlOf({ voices: [] }, ['3']), 'shining');
  // an older record learned without voices still counts as polished
  assert.equal(pearlOf({ isLearned: true }, null), 'polished');
  assert.equal(pearlOf({ isLearned: true }, null), 'polished');
  assert.equal(pearlOf({ isLearned: false }, null), 'new');
  assert.equal(pearlOf(null, null), 'new');
});

test('the path counts its polished and shining pearls', () => {
  const path = { a: { voices: ['1'] }, b: { voices: [] }, c: { voices: ['2', '3'] }, d: { isLearned: true } };
  assert.deepEqual(pearlCounts(path, { c: ['2'], b: [], gone: ['1'] }), { polished: 3, shining: 1, total: 4 });
  assert.deepEqual(pearlCounts(null, null), { polished: 0, shining: 0, total: 0 });
});

test('a chest opens on every ten polished pearls, three in all', () => {
  assert.equal(CHEST_SIZE, 10);
  assert.equal(CHEST_COUNT, 3);
  assert.deepEqual(chestsOf(0).map(c => [c.have, c.open]), [[0, false], [0, false], [0, false]]);
  assert.deepEqual(chestsOf(7).map(c => [c.have, c.open]), [[7, false], [0, false], [0, false]]);
  assert.deepEqual(chestsOf(10).map(c => [c.have, c.open]), [[10, true], [0, false], [0, false]]);
  assert.deepEqual(chestsOf(23).map(c => [c.have, c.open]), [[10, true], [10, true], [3, false]]);
  assert.deepEqual(chestsOf(45).map(c => [c.have, c.open]), [[10, true], [10, true], [10, true]]);
});
