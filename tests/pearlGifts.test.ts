import { test } from 'node:test';
import assert from 'node:assert/strict';
import { giftDue, joinGe, nextChest, outfitOf, partInChest, partsLeft, readGifts } from '../src/utils/pearlGifts';

const none = readGifts(undefined);

test('a broken or missing record reads as nothing given', () => {
  assert.deepEqual(none, { chestParts: [], parts: [], seen: 0 });
  assert.deepEqual(readGifts({ steps: 2, chestParts: ['kamari', '', 4, 'x', 'y'], parts: ['kamari', 3], seen: 9 }), {
    chestParts: ['kamari', '', 'x'], parts: ['kamari'], seen: 1,
  });
});

test('the chokha\'s parts come in order, and its extra hats as one', () => {
  assert.deepEqual(partsLeft('chokha', []).slice(0, 3), ['chokha', 'akhalukhi', 'masrebi']);
  const hats = partsLeft('chokha', ['chokha', 'akhalukhi', 'masrebi', 'kamari', 'khanjali', 'aziurebi', 'papanaki']);
  assert.deepEqual(hats, ['papakha']);
  assert.deepEqual(partsLeft('chokha', ['kakhuri']).includes('papakha'), false);
  assert.deepEqual(partsLeft('kaba', ['kaba']), ['gulispiri', 'sartqeli', 'katibi', 'lechaki']);
});

test('every chest that opens owes one part, once', () => {
  assert.equal(giftDue(0, none, 'chokha', []), null);
  assert.deepEqual(giftDue(1, none, 'chokha', ['chokha']), { chestParts: ['akhalukhi'], parts: ['akhalukhi'] });
  // a member whose two chests were already open gets two parts at once
  assert.deepEqual(giftDue(2, none, 'chokha', ['chokha']), { chestParts: ['akhalukhi', 'masrebi'], parts: ['akhalukhi', 'masrebi'] });
  // rewarded already
  const one = { chestParts: ['akhalukhi'], parts: ['akhalukhi'], seen: 1 };
  assert.equal(giftDue(1, one, 'chokha', ['chokha', 'akhalukhi']), null);
  assert.deepEqual(giftDue(3, one, 'chokha', ['chokha', 'akhalukhi']), { chestParts: ['akhalukhi', 'masrebi', 'kamari'], parts: ['masrebi', 'kamari'] });
  // a complete outfit: the chest is counted, nothing is given
  const all = ['chokha', 'akhalukhi', 'masrebi', 'kamari', 'khanjali', 'aziurebi', 'papanaki', 'svanuri'];
  assert.deepEqual(giftDue(1, none, 'chokha', all), { chestParts: [''], parts: [] });
  // the kaba's parts come the same way
  assert.deepEqual(giftDue(1, none, 'kaba', ['kaba']), { chestParts: ['gulispiri'], parts: ['gulispiri'] });
});

test('a chest that closes again is not rewarded twice; each chest shows its own part', () => {
  const one = { chestParts: ['akhalukhi'], parts: ['akhalukhi'], seen: 1 };
  assert.equal(giftDue(0, one, 'chokha', ['chokha', 'akhalukhi']), null);
  const left = partsLeft('chokha', ['chokha', 'akhalukhi']);
  // the next part waits in chest II even while chest I is shut again
  assert.equal(nextChest(0, 1), 1);
  assert.equal(partInChest(0, one.chestParts, left), 'akhalukhi');
  assert.equal(partInChest(1, one.chestParts, left), 'masrebi');
  assert.equal(partInChest(2, one.chestParts, left), 'kamari');
  // a chest just opened shows its part before the record has caught up
  assert.equal(nextChest(1, 0), 1);
  assert.equal(partInChest(0, [], partsLeft('chokha', ['chokha'])), 'akhalukhi');
  assert.equal(partInChest(1, [], partsLeft('chokha', ['chokha'])), 'masrebi');
  // all three rewarded: no next chest; a chest that gave nothing shows nothing
  assert.equal(nextChest(3, 3), null);
  assert.equal(nextChest(1, 3), null);
  assert.equal(partInChest(0, [''], []), null);
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
