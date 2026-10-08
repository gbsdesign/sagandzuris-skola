// Run: npm test  (node:test through tsx)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HabitLog, dayKey, dayNeeds, doneOn, keptStreak, lastDays, periodStart, timesThisPeriod } from '../src/utils/habitsWeek';

// Thursday, 8 October 2026, midday
const NOW = new Date(2026, 9, 8, 12);
const DAILY = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

test('a week starts on Sunday, a month on the 1st', () => {
  assert.equal(dayKey(periodStart('day', NOW)), '2026-10-08');
  assert.equal(dayKey(periodStart('week', NOW)), '2026-10-04');
  assert.equal(dayKey(periodStart('month', NOW)), '2026-10-01');
  // a Sunday is the first day of its own week
  assert.equal(dayKey(periodStart('week', new Date(2026, 9, 4, 8))), '2026-10-04');
});

test('ticks are counted inside this week and this month only', () => {
  const log: HabitLog = {
    '2026-09-30': ['w'],
    '2026-10-03': ['w'],
    '2026-10-04': ['w', 'x'],
    '2026-10-08': ['w'],
  };
  assert.equal(timesThisPeriod(log, 'w', 'week', NOW), 2);
  assert.equal(timesThisPeriod(log, 'w', 'month', NOW), 3);
  assert.equal(timesThisPeriod(log, 'w', 'day', NOW), 1);
  assert.equal(timesThisPeriod(log, 'x', 'week', NOW), 1);
  assert.equal(timesThisPeriod(log, 'y', 'month', NOW), 0);
});

test('a day counts with half of the daily habits', () => {
  assert.equal(dayNeeds(8), 4);
  assert.equal(dayNeeds(7), 4);
  assert.equal(dayNeeds(1), 1);
  const log: HabitLog = { '2026-10-08': ['a', 'b', 'zzz'] };
  assert.equal(doneOn(log, DAILY, NOW), 2);
  assert.equal(doneOn(log, DAILY, new Date(2026, 9, 7)), 0);
});

test('days in a row: today joins once it counts, a gap ends the run', () => {
  const four = ['a', 'b', 'c', 'd'];
  const log: HabitLog = {
    '2026-10-04': four,
    '2026-10-05': four,
    '2026-10-06': ['a'], // too few: the run before it does not reach today
    '2026-10-07': four,
  };
  // today has nothing yet: the run up to yesterday still shows
  assert.deepEqual(keptStreak(log, DAILY, NOW), { days: 1, capped: false });
  // today counts now
  assert.deepEqual(keptStreak({ ...log, '2026-10-08': four }, DAILY, NOW), { days: 2, capped: false });
  // nothing yesterday or today
  assert.deepEqual(keptStreak({ '2026-10-05': four }, DAILY, NOW), { days: 0, capped: false });
  assert.deepEqual(keptStreak(log, [], NOW), { days: 0, capped: false });
});

test('a run as long as the whole log is marked as possibly longer', () => {
  const log: HabitLog = Object.fromEntries(lastDays(62, NOW).map(d => [dayKey(d), DAILY]));
  assert.deepEqual(keptStreak(log, DAILY, NOW), { days: 62, capped: true });
});
