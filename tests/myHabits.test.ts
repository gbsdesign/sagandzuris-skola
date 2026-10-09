// Run: npm test  (node:test through tsx)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HABIT_GROUPS } from '../src/data/habitsAndManera';
import { addHabit, normalizeUrl, removeHabit, removedHabits, reorderGroup, resolveHabits, restoreHabit, setHabitLinks, setHabitMenu, setHabitNote, siteName } from '../src/utils/myHabits';

const ids = (setup: Parameters<typeof resolveHabits>[0], group = 'daily') => resolveHabits(setup).find(g => g.id === group)!.items.map(h => h.id);
const school = HABIT_GROUPS[0].items.map(h => h.id);

test('nothing saved: the school list', () => {
  assert.deepEqual(ids(null), school);
  assert.deepEqual(ids({}), school);
});

test('order: saved first, unknown ids dropped, new habits at the end', () => {
  const s = reorderGroup({}, 'daily', ['habit_6', 'gone', 'habit_1']);
  const got = ids(s);
  assert.deepEqual(got.slice(0, 2), ['habit_6', 'habit_1']);
  assert.equal(got.length, school.length);
});

test('remove and restore a school habit', () => {
  const s = removeHabit({}, 'habit_2');
  assert.ok(!ids(s).includes('habit_2'));
  assert.deepEqual(removedHabits(s).map(h => h.id), ['habit_2']);
  assert.deepEqual(ids(restoreHabit(s, 'habit_2')), school);
});

test('add an own habit with a menu, then remove it for good', () => {
  const s = addHabit({}, '  კითხვა ', 'weekly', 'book', 'my_x');
  const h = resolveHabits(s).find(g => g.id === 'weekly')!.items.at(-1)!;
  assert.deepEqual(h, { id: 'my_x', label: 'კითხვა', menu: 'book' });
  const gone = removeHabit(s, 'my_x');
  assert.ok(!ids(gone, 'weekly').includes('my_x'));
  assert.equal(removedHabits(gone).length, 0);
});

test('a habit menu can be changed or taken away', () => {
  const daily = (s: Parameters<typeof resolveHabits>[0]) => resolveHabits(s)[0].items.find(h => h.id === 'habit_1')!;
  assert.equal(daily(setHabitMenu({}, 'habit_1', 'none')).menu, undefined);
  assert.equal(daily(setHabitMenu({}, 'habit_1', 'book')).menu, 'book');
});

test('links and a note ride along with the habit', () => {
  let s = setHabitLinks({}, 'habit_4', [{ kind: 'url', title: 'galoba.ge', url: 'https://galoba.ge/' }]);
  s = setHabitNote(s, 'habit_4', '  ყოველ საღამოს  ');
  const h = resolveHabits(s)[0].items.find(x => x.id === 'habit_4')!;
  assert.equal(h.links?.length, 1);
  assert.equal(h.note, 'ყოველ საღამოს');
  const bare = resolveHabits(setHabitNote(s, 'habit_4', ' ')).find(g => g.id === 'daily')!.items.find(x => x.id === 'habit_4')!;
  assert.equal(bare.note, undefined);
});

test('addresses: only http(s), a scheme added when typed bare', () => {
  assert.equal(normalizeUrl('galoba.ge'), 'https://galoba.ge/');
  assert.equal(normalizeUrl('http://x.ge/a b'), null);
  assert.equal(normalizeUrl('javascript:alert(1)'), null);
  assert.equal(normalizeUrl('hello'), null);
  assert.equal(siteName('https://www.galoba.edu.ge/x'), 'galoba.edu.ge');
});
