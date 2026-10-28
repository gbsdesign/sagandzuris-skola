// Run: npm test  (node:test through tsx)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, toCsv } from '../src/utils/csv';
import { personActivity } from '../src/utils/personActivity';
import { shortDate } from '../src/utils/dateNames';

test('CSV cells: quotes only where needed, formulas never run', () => {
  assert.equal(csvCell('ნინო'), 'ნინო');
  assert.equal(csvCell('თბილისი, ვაკე'), '"თბილისი, ვაკე"');
  assert.equal(csvCell('ის "ბანი"'), '"ის ""ბანი"""');
  assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell('+995 599 12 34 56'), "'+995 599 12 34 56");
  assert.equal(csvCell(undefined), '');
  assert.equal(csvCell(3), '3');
  assert.equal(toCsv([['ა', 'ბ'], ['1', '2']]), '﻿ა,ბ\r\n1,2\r\n');
});

test('a member\'s short picture comes from their own record', () => {
  const today = new Date(2026, 9, 28);
  const a = personActivity({
    pearls: { p1: { best: 90, voice: '1', at: '' }, p2: { best: 40, voice: '2', at: '' } },
    pearlShine: { p3: { voice: '3', by: 't', at: '' } },
    learning: { v1: { 0: { level: 1 }, 1: { level: 0 }, 2: { level: 4 } }, v2: { 0: { level: 2 } } },
    habitLog: { '2026-10-28': ['a', 'b'], '2026-10-22': ['c'], '2026-10-21': ['old'], '2026-10-29': ['future'] },
    drillDone: { d1: '2026-10-01', 'tip-3': '2026-10-27' },
  }, today);
  assert.deepEqual(a, { pearls: 2, parts: 3, habitsWeek: 3, drills: 2 });
  assert.deepEqual(personActivity(undefined, today), { pearls: 0, parts: 0, habitsWeek: 0, drills: 0 });
});

test('short dates name the year only when it is another one', () => {
  const now = new Date(2026, 9, 28);
  assert.equal(shortDate('2026-10-12T10:00:00', now), '12 ოქტ');
  assert.equal(shortDate('2025-01-05T10:00:00', now), '5 იან 2025');
  assert.equal(shortDate('', now), '');
  assert.equal(shortDate('nonsense', now), '');
});
