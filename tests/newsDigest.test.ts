import { test } from 'node:test';
import assert from 'node:assert/strict';
import { digestAt, newsDays } from '../src/utils/newsDigest.ts';

const news = [
  { id: 'c', date: '2026-11-22', title: 'ჩათში — გული' },
  { id: 'b', date: '2026-11-22', title: 'სწავლა' },
  { id: 'a', date: '2026-11-21', title: 'ვაზი' },
];

test('a day comes as one summary only once its evening has come', () => {
  const before = digestAt('2026-11-22') - 60_000;
  const days = newsDays(news, before);
  assert.deepEqual(days.map(d => d.id), ['day-2026-11-21']);
  assert.equal(days[0].title, 'სიახლეები · 21 ნოემბერი');
  assert.equal(days[0].text, '• ვაზი');
});

test('the evening gathers the day\'s lines, newest day first', () => {
  const days = newsDays(news, digestAt('2026-11-22'));
  assert.deepEqual(days.map(d => d.id), ['day-2026-11-22', 'day-2026-11-21']);
  assert.equal(days[0].text, '• ჩათში — გული\n• სწავლა');
  assert.equal(new Date(days[0].at).toISOString(), '2026-11-22T17:00:00.000Z');
});
