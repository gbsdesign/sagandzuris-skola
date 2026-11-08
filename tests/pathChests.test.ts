import test from 'node:test';
import assert from 'node:assert/strict';
import { pathChests, schoolIdOf, topChests } from '../src/utils/pathChests';

const SERVICES = ['წირვა', 'მწუხრი', 'ცისკარი', 'ზატიკი'];

test('a school mark finds its row', () => {
  assert.equal(schoolIdOf('გ.ს. გამშვ'), 'gelati');
  assert.equal(schoolIdOf('ქ.კ. №115'), 'kakheti');
  assert.equal(schoolIdOf('შ.ს.'), 'guria');
  assert.equal(schoolIdOf('ე.კ.'), null);
  assert.equal(schoolIdOf(''), null);
});

test('chants go to their service and school, the rest to their own chests', () => {
  const chests = pathChests([
    { kind: 'galoba', service: 'წირვა', school: 'გ.ს.' },
    { kind: 'galoba', service: 'წირვა', school: 'ქ.კ. გამშვ' },
    { kind: 'galoba', service: 'წირვა', school: 'ე.კ.' },
    { kind: 'galoba', service: 'ცისკარი', school: 'შ.ს.' },
    { kind: 'galoba', service: null, school: 'გ.ს.' },
    { kind: 'simghera' }, { kind: 'sakravebi' }, { kind: 'mtkmeli' },
  ], SERVICES, 4);
  const by = Object.fromEntries(chests.map(c => [c.id, c]));
  assert.equal(by['s:წირვა'].count, 3);
  assert.deepEqual(by['s:წირვა'].schools, { gelati: 1, kakheti: 1, guria: 0 });
  assert.deepEqual(by['s:ცისკარი'].schools, { gelati: 0, kakheti: 0, guria: 1 });
  assert.equal(by['s:მწუხრი'].count, 0);
  assert.equal(by.other.count, 1);
  assert.equal(by.songs.count, 2);
  assert.equal(by.songs.token, 'grape');
  assert.equal(by.poems.count, 1);
  assert.equal(by.poems.token, 'scroll');
  assert.equal(by.videos.count, 4);
  assert.equal(by.videos.token, 'medallion');
});

test('no other-chants chest while it is empty', () => {
  assert.ok(!pathChests([], SERVICES, 0).some(c => c.id === 'other'));
});

test('the top three are the fullest, else the first three', () => {
  const empty = pathChests([], SERVICES, 0);
  assert.deepEqual(topChests(empty).map(c => c.label), ['წირვა', 'მწუხრი', 'ცისკარი']);
  const some = pathChests([{ kind: 'mtkmeli' }, { kind: 'mtkmeli' }, { kind: 'galoba', service: 'ზატიკი' }], SERVICES, 1);
  assert.deepEqual(topChests(some).map(c => c.id), ['poems', 's:ზატიკი', 'videos']);
});
