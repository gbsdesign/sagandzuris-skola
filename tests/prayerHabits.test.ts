// Run: npm test  (node:test through tsx)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { habitOfPrayer, nextInReading, readingLabel, readingListOf } from '../src/utils/prayerHabits';

test('each prayer ticks its own habit', () => {
  assert.equal(habitOfPrayer('dila'), 'habit_1');
  assert.equal(habitOfPrayer('dzili'), 'habit_1');
  assert.equal(habitOfPrayer('week-4-dzili'), 'habit_1');
  assert.equal(habitOfPrayer('hour-15'), 'habit_13');
  assert.equal(habitOfPrayer('kathisma-8'), 'habit_6');
  assert.equal(habitOfPrayer('akathist-1'), 'habit_7');
  assert.equal(habitOfPrayer('bible-mate-5'), 'habit_2');
  assert.equal(habitOfPrayer('bible-romaelta-1'), 'habit_3');
  assert.equal(habitOfPrayer('psalter-rule'), null);
  assert.equal(habitOfPrayer('bible-mate-99'), null);
});

test('reading lists: the Gospel, the Apostle, the akathists', () => {
  assert.equal(readingListOf('bible-luka-2'), 'gospel');
  assert.equal(readingListOf('bible-sakme-2'), 'apostle');
  assert.equal(readingListOf('akathist-2'), 'akathists');
  assert.equal(readingListOf('dila'), null);
});

test('"გააგრძელე" goes on after a finished chapter, stays on an unfinished one', () => {
  assert.equal(nextInReading({ id: 'bible-mate-5', finished: false }), 'bible-mate-5');
  assert.equal(nextInReading({ id: 'bible-mate-5', finished: true }), 'bible-mate-6');
  // the last chapter of a book: the next book
  assert.equal(nextInReading({ id: 'bible-mate-28', finished: true }), 'bible-markozi-1');
  // the last book: back to the first
  assert.equal(nextInReading({ id: 'bible-iovane-21', finished: true }), 'bible-mate-1');
  assert.equal(nextInReading({ id: 'bible-ebraelta-13', finished: true }), 'bible-sakme-1');
  // an akathist is read again
  assert.equal(nextInReading({ id: 'akathist-1', finished: true }), 'akathist-1');
  assert.equal(readingLabel('bible-mate-6'), 'მათე, თავი 6');
});
