// The reminders Worker's notices' settings (2026-11-18): the stored prefs, the quiet hours and the morning summary's lines.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notifyOf, quietAt, summaryLines } from '../worker/reminders/reminders.js';

const at = (h, m) => new Date(Date.UTC(2026, 10, 18, h - 4, m)); // Tbilisi = UTC+4

test('notifyOf keeps the same defaults as the site', () => {
  const p = notifyOf({ summary: true, at: 'x', items: { feast: true } });
  assert.equal(p.summary, true);
  assert.equal(p.at, '09:00');
  assert.deepEqual(p.items, { lesson: true, chat: true, day: true, birthdays: true, feast: true });
  assert.equal(p.calls, true);
});

test('quietAt over midnight in Tbilisi time', () => {
  const p = notifyOf({ quiet: true, from: '22:00', to: '08:00' });
  assert.equal(quietAt(p, at(23, 10)), true);
  assert.equal(quietAt(p, at(7, 59)), true);
  assert.equal(quietAt(p, at(8, 0)), false);
  assert.equal(quietAt(notifyOf({ quiet: false }), at(23, 0)), false);
});

test('summaryLines: only the chosen parts, nothing to say = nothing', () => {
  const items = notifyOf({}).items;
  assert.deepEqual(summaryLines({ items }), []);
  const lines = summaryLines({
    items,
    lessons: [{ start: '18:00', note: 'სამების ტაძარი' }],
    held: 3,
    ai: 10,
    reviews: 2,
    birthdays: ['ლუკა'],
    feast: 'ნათლისღება',
  });
  assert.deepEqual(lines, [
    'გაკვეთილი დღეს 18:00 · სამების ტაძარი',
    '3 ახალი წერილი',
    'დღის გაკვეთილი: 10 წუთი AI მასწავლებელთან',
    'დღეს ლუკა — დაბადების დღე',
  ]);
  assert.deepEqual(summaryLines({ items: { ...items, day: true }, reviews: 2 }), ['გასამეორებელი: 2 საგალობელი']);
  assert.deepEqual(summaryLines({ items: { ...items, feast: true }, feast: 'ნათლისღება' }), ['ნათლისღება']);
});
