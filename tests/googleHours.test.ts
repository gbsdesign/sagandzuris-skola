// Run: npx tsx --test tests/googleHours.test.ts
// A church's hours from Google Maps as Georgian lines (utils/googleHours.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hoursLines, siteName, tbilisiWeekday, type GPeriod } from '../src/utils/googleHours';

const day = (d: number, open: [number, number], close: [number, number], closeDay = d): GPeriod =>
  ({ open: { day: d, hour: open[0], minute: open[1] }, close: { day: closeDay, hour: close[0], minute: close[1] } });

test('Sameba as Google gives it: weekdays and the weekend joined, Monday first', () => {
  const periods = [0, 1, 2, 3, 4, 5, 6].map(d => day(d, [7, 0], d === 0 || d === 6 ? [21, 0] : [22, 0]));
  assert.deepEqual(hoursLines(periods, 1), [
    { days: 'ორშაბათი–პარასკევი', hours: '7:00–22:00', today: true },
    { days: 'შაბათი, კვირა', hours: '7:00–21:00', today: false },
  ]);
});

test('the same hours every day, open round the clock, nothing known', () => {
  const same = [0, 1, 2, 3, 4, 5, 6].map(d => day(d, [9, 0], [19, 30]));
  assert.deepEqual(hoursLines(same, 3), [{ days: 'ყოველდღე', hours: '9:00–19:30', today: true }]);
  assert.deepEqual(hoursLines([{ open: { day: 0, hour: 0, minute: 0 } }], 3), [{ days: 'ყოველდღე', hours: '24 საათი', today: true }]);
  assert.deepEqual(hoursLines(undefined, 3), []);
  assert.deepEqual(hoursLines([], 3), []);
});

test('a break in the day, a closed day, closing at midnight', () => {
  const periods = [
    day(1, [15, 0], [19, 0]), day(1, [9, 0], [13, 0]),
    day(2, [9, 0], [0, 0], 3),
    day(0, [8, 0], [12, 0]),
  ];
  const lines = hoursLines(periods, 4);
  assert.deepEqual(lines[0], { days: 'ორშაბათი', hours: '9:00–13:00, 15:00–19:00', today: false });
  assert.deepEqual(lines[1], { days: 'სამშაბათი', hours: '9:00–24:00', today: false });
  assert.deepEqual(lines[2], { days: 'ოთხშაბათი–შაბათი', hours: 'დაკეტილია', today: true });
  assert.deepEqual(lines[3], { days: 'კვირა', hours: '8:00–12:00', today: false });
});

test('the site name and Tbilisi weekday', () => {
  assert.equal(siteName('https://www.sameba.ge/ka/'), 'sameba.ge');
  assert.equal(siteName('https://www.facebook.com/somechurch'), 'Facebook');
  assert.equal(siteName('not a url'), 'not a url');
  // Sat 2026-11-07 01:00 UTC is 05:00 in Tbilisi, still Saturday; Sat 22:00 UTC is Sunday 02:00 there
  assert.equal(tbilisiWeekday(Date.UTC(2026, 10, 7, 1)), 6);
  assert.equal(tbilisiWeekday(Date.UTC(2026, 10, 7, 22)), 0);
});
