import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attendanceStats, latestLessonDay, stepLessonDay } from '../src/utils/attendanceStats.ts';

test('a member\'s share, the missed row and the class average', () => {
  const days = [
    { date: '2026-11-21', present: ['a'] },
    { date: '2026-11-18', present: ['a', 'b'] },
    { date: '2026-11-14', present: [] }, // cleared — not counted
    { date: '2026-11-11', present: ['a', 'gone'] },
  ];
  const s = attendanceStats(days, ['a', 'b', 'c']);
  assert.deepEqual(s.lessons, [{ date: '2026-11-21', came: 1 }, { date: '2026-11-18', came: 2 }, { date: '2026-11-11', came: 1 }]);
  const by = Object.fromEntries(s.members.map(m => [m.uid, m]));
  assert.equal(by.a.pct, 100);
  assert.equal(by.b.came, 1);
  assert.equal(by.b.missedRow, 1);
  assert.equal(by.c.missedRow, 3);
  assert.equal(by.c.pct, 0);
  assert.equal(s.average, Math.round((4 / 9) * 100));
});

test('no lesson marked yet', () => {
  const s = attendanceStats([{ date: '2026-11-21', present: [] }], ['a']);
  assert.equal(s.average, null);
  assert.equal(s.members[0].pct, null);
});

test('stepping over the lesson weekdays, never into the future', () => {
  // 2026-11-22 is a Sunday; lessons on Tuesday (2) and Saturday (6)
  assert.equal(latestLessonDay([2, 6], '2026-11-22'), '2026-11-21');
  assert.equal(stepLessonDay([2, 6], '2026-11-21', -1, '2026-11-22'), '2026-11-17');
  assert.equal(stepLessonDay([2, 6], '2026-11-21', 1, '2026-11-22'), '2026-11-21');
  assert.equal(latestLessonDay([], '2026-11-22'), '2026-11-22');
});
