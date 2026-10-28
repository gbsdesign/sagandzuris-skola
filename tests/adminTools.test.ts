// Run: npm test  (node:test through tsx)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, toCsv } from '../src/utils/csv';
import { personActivity } from '../src/utils/personActivity';
import { shortDate } from '../src/utils/dateNames';
import { duplicatesOf } from '../src/utils/duplicates';
import { DEFAULT_SECTION_STATE, stateOnDay } from '../src/data/sections';
import { activeIn7, mondayOf, monthCounts, weekSeries } from '../src/utils/growth';

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

test('possible duplicate accounts: same phone (any form) or same full name', () => {
  const d = duplicatesOf([
    { userId: 'a', name: 'ნინო კაპანაძე', phone: '+995 599 12 34 56' },
    { userId: 'b', name: 'Nino K', phone: '599123456' },
    { userId: 'c', name: 'ნინო  კაპანაძე', phone: '' },
    { userId: 'd', name: 'ნინო', phone: '' },
    { userId: 'e', name: 'ნინო', phone: '555' },
    { userId: 'f', name: 'ლუკა მაისურაძე', phone: '577000000' },
  ]);
  assert.deepEqual(d.get('a'), [{ uid: 'b', why: 'phone' }, { uid: 'c', why: 'name' }]);
  assert.deepEqual(d.get('b'), [{ uid: 'a', why: 'phone' }]);
  assert.deepEqual(d.get('c'), [{ uid: 'a', why: 'name' }]);
  assert.equal(d.has('d'), false); // one word is too common to count
  assert.equal(d.has('e'), false); // too short to be a phone
  assert.equal(d.has('f'), false);
});

test('a „მალე“ section opens by itself on its day (Georgian date), nothing else changes', () => {
  const state = { ...DEFAULT_SECTION_STATE, tamashebi: 'hidden' as const };
  const on = stateOnDay(state, { medavitneobaTopic: '2026-11-01', medavitneoba: '2026-11-05', tamashebi: '2026-10-01', galoba: 'x' }, '2026-11-01');
  assert.equal(on.medavitneobaTopic, 'open');   // its day
  assert.equal(on.medavitneoba, 'soon');        // not yet
  assert.equal(on.tamashebi, 'hidden');         // a hidden one stays hidden
  assert.equal(on.galoba, 'open');
  assert.equal(stateOnDay(state, { medavitneobaTopic: 'soon' }, '2026-11-01').medavitneobaTopic, 'soon'); // not a day
  assert.equal(state.medavitneobaTopic, 'soon'); // the stored map is left as it was
});

test('school growth: months from records, weeks from the first one kept', () => {
  assert.equal(mondayOf('2026-10-28'), '2026-10-26'); // a Wednesday
  assert.equal(mondayOf('2026-10-26'), '2026-10-26');
  assert.equal(mondayOf('2026-11-01'), '2026-10-26'); // a Sunday belongs to the week before
  const m = monthCounts(['2026-10-01T10:00:00Z', '2026-09-30T21:00:00Z', '2026-09-02T09:00:00Z', 'x', '2024-01-01T00:00:00Z'], '2026-10-28', 3);
  // 30 Sep 21:00 UTC is already 1 Oct in Tbilisi
  assert.deepEqual(m, [{ key: '2026-08', n: 0 }, { key: '2026-09', n: 1 }, { key: '2026-10', n: 2 }]);
  assert.deepEqual(monthCounts([], '2026-01-15', 2).map(x => x.key), ['2025-12', '2026-01']);
  assert.deepEqual(weekSeries({}, '2026-10-28', 4), []);
  assert.deepEqual(weekSeries({ '2026-10-12': 5, '2026-10-26': 7 }, '2026-10-28', 4),
    [{ key: '2026-10-12', n: 5 }, { key: '2026-10-19', n: null }, { key: '2026-10-26', n: 7 }]);
  assert.equal(activeIn7('2026-10-25T10:00:00Z', Date.parse('2026-10-28T10:00:00Z')), true);
  assert.equal(activeIn7('2026-10-20T10:00:00Z', Date.parse('2026-10-28T10:00:00Z')), false);
  assert.equal(activeIn7('', Date.parse('2026-10-28T10:00:00Z')), false);
});
