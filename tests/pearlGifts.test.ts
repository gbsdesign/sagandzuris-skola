import { test } from 'node:test';
import assert from 'node:assert/strict';
import { giftDue, joinGe, nextGift, outfitOf, partsLeft, readGifts, shiningCount } from '../src/utils/pearlGifts';
import { CHESTS } from '../src/data/pearls';

const none = readGifts(undefined);
const pearls = CHESTS.flatMap(c => c.pearls);
const shine = (n: number) => Object.fromEntries(pearls.slice(0, n).map(id => [id, { voice: '1', by: 't', at: '' }]));

test('only the chests\' pearls count as shining (other approvals share the map)', () => {
  assert.equal(shiningCount({ ...shine(3), 'learn~x~0': { voice: '1' }, 'read~y': { voice: '1' } }), 3);
  assert.equal(shiningCount(undefined), 0);
});

test('a broken or missing record reads as nothing given', () => {
  assert.deepEqual(none, { steps: 0, parts: [], seen: 0 });
  assert.deepEqual(readGifts({ steps: 2.7, parts: ['kamari', 3], seen: 9 }), { steps: 2, parts: ['kamari'], seen: 1 });
});

test('the chokha\'s parts come in order, and its extra hats as one', () => {
  assert.deepEqual(partsLeft('chokha', []).slice(0, 3), ['chokha', 'akhalukhi', 'masrebi']);
  const hats = partsLeft('chokha', ['chokha', 'akhalukhi', 'masrebi', 'kamari', 'khanjali', 'aziurebi', 'papanaki']);
  assert.deepEqual(hats, ['papakha']);
  assert.deepEqual(partsLeft('chokha', ['kakhuri']).includes('papakha'), false);
  assert.deepEqual(partsLeft('kaba', ['kaba']), ['gulispiri', 'sartqeli', 'katibi', 'lechaki']);
});

test('every five shining pearls owe one part, once', () => {
  assert.equal(giftDue(4, none, 'chokha', []), null);
  assert.deepEqual(giftDue(5, none, 'chokha', []), { steps: 1, parts: ['chokha'] });
  // a member who already had twelve shining gets two parts at once
  assert.deepEqual(giftDue(12, none, 'chokha', ['chokha']), { steps: 2, parts: ['akhalukhi', 'masrebi'] });
  // rewarded already
  assert.equal(giftDue(9, { steps: 1, parts: ['chokha'], seen: 1 }, 'chokha', ['chokha']), null);
  // a complete outfit: the five is counted, nothing is given
  const all = ['chokha', 'akhalukhi', 'masrebi', 'kamari', 'khanjali', 'aziurebi', 'papanaki', 'svanuri'];
  assert.deepEqual(giftDue(5, none, 'chokha', all), { steps: 1, parts: [] });
});

test('a five a teacher took back is not rewarded again', () => {
  const gifts = { steps: 2, parts: ['chokha', 'akhalukhi'], seen: 2 };
  assert.equal(giftDue(10, gifts, 'chokha', ['chokha', 'akhalukhi']), null);
  assert.equal(giftDue(14, gifts, 'chokha', ['chokha', 'akhalukhi']), null);
  assert.deepEqual(nextGift(8, gifts, 'chokha', ['chokha', 'akhalukhi']), { left: 7, part: 'masrebi' });
  assert.deepEqual(nextGift(13, gifts, 'chokha', ['chokha', 'akhalukhi']), { left: 2, part: 'masrebi' });
});

test('the outfit follows the member\'s choice once the kaba is out', () => {
  assert.equal(outfitOf('kaba', 'ნინო', false), 'chokha');
  assert.equal(outfitOf('chokha', 'ნინო', true), 'chokha');
  assert.equal(outfitOf(undefined, 'ნინო', true), 'kaba');
  assert.equal(outfitOf(undefined, 'გიორგი', true), 'chokha');
});

test('names are joined the Georgian way', () => {
  assert.equal(joinGe(['ქამარი']), 'ქამარი');
  assert.equal(joinGe(['ახალუხი', 'მასრები']), 'ახალუხი და მასრები');
  assert.equal(joinGe(['ა', 'ბ', 'გ']), 'ა, ბ და გ');
});
