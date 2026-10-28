import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dayTakeId, parseRanges, parseReadTakeId, readingsOf, toneOf, lessonTakeId, rangesText } from '../src/utils/dayReadings';
import type { CalendarDay } from '../src/data/churchCalendar';

const year = JSON.parse(readFileSync(new URL('../src/data/calendar/2026.json', import.meta.url), 'utf8')) as { days: Record<string, CalendarDay> };

test('verse ranges: plain, several, across chapters, with spaces', () => {
  assert.deepEqual(parseRanges('2: 16-20'), [{ ch: 2, from: 16, to: 20 }]);
  assert.deepEqual(parseRanges('2: 11-14; 3: 4-7'), [{ ch: 2, from: 11, to: 14 }, { ch: 3, from: 4, to: 7 }]);
  assert.deepEqual(parseRanges('5: 22-6: 2'), [{ ch: 5, from: 22, to: 999 }, { ch: 6, from: 1, to: 2 }]);
  assert.deepEqual(parseRanges('1: 1 - 2, 10-12; 2: 6-10'), [{ ch: 1, from: 1, to: 2 }, { ch: 1, from: 10, to: 12 }, { ch: 2, from: 6, to: 10 }]);
  assert.equal(rangesText(parseRanges('1: 1 - 2, 10-12; 2: 6-10')), '1: 1-2, 10-12, 2: 6-10');
});

test('a Sunday: tone, the Liturgy Apostle and Gospel with their labels and zachalo', () => {
  const day = year.days['2026-10-25'];
  assert.equal(toneOf(day), 4);
  const r = readingsOf(day);
  const gal = r.find(x => x.abbr === 'გალ.')!;
  assert.equal(gal.label, 'ლიტ');
  assert.equal(gal.file, 'galatelta');
  assert.equal(gal.apostle, true);
  assert.equal(gal.zachalo, 203);
  assert.deepEqual(gal.ranges, [{ ch: 2, from: 16, to: 20 }]);
  const lk = r.find(x => x.abbr === 'ლკ.')!;
  assert.equal(lk.apostle, false);
  assert.equal(r.find(x => x.abbr === 'ებრ.')?.label, 'წმ. მამათა');
  assert.equal(r.find(x => x.abbr === 'ინ.' && x.label === 'ცისკ')?.ranges[0].ch, 21);
});

test('every day of the year: Apostle readings parse to real ranges', () => {
  let days = 0, apostles = 0;
  for (const day of Object.values(year.days)) {
    const r = readingsOf(day);
    if (r.some(x => x.apostle)) days++;
    for (const x of r.filter(x => x.apostle)) {
      apostles++;
      for (const g of x.ranges) assert.ok(g.ch > 0 && g.from > 0 && g.to >= g.from, `${x.abbr} ${x.ref}`);
    }
  }
  assert.ok(days > 300, `days with an Apostle reading: ${days}`);
  assert.ok(apostles > 350);
});

test('take ids round trip', () => {
  const day = year.days['2026-10-25'];
  const gal = readingsOf(day).find(x => x.abbr === 'გალ.')!;
  const id = dayTakeId(gal, '2026-10-25');
  assert.ok(!id.includes('/'));
  assert.deepEqual(parseReadTakeId(id), { kind: 'day', file: 'galatelta', ranges: gal.ranges, iso: '2026-10-25' });
  assert.deepEqual(parseReadTakeId(lessonTakeId('psalter', 3)), { kind: 'lesson', lesson: 'psalter', step: 3 });
  assert.equal(parseReadTakeId('learn~x~1'), null);
});
