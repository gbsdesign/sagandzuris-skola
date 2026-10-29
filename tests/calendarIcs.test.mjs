import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIcs, churchYear, fold, pascha } from '../worker/reminders/ics.js';

const iso = (d) => d.toISOString().slice(0, 10);

test('Orthodox Pascha', () => {
  assert.equal(iso(pascha(2026)), '2026-04-12');
  assert.equal(iso(pascha(2027)), '2027-05-02');
  assert.equal(iso(pascha(2025)), '2025-04-20');
});

test('the fasts of 2026', () => {
  const fasts = churchYear(2026).filter((e) => e.kind === 'fast');
  const lent = fasts.find((e) => e.title === 'დიდი მარხვა');
  assert.equal(iso(lent.start), '2026-02-23');
  assert.equal(iso(lent.end), '2026-04-11');
  const ap = fasts.find((e) => e.title.startsWith('პეტრე'));
  assert.equal(iso(ap.start), '2026-06-08');
  assert.equal(iso(fasts.find((e) => e.title === 'შობის მარხვა').end), '2027-01-06');
});

test('lines fold at 75 bytes without cutting a letter', () => {
  const line = `SUMMARY:${'ა'.repeat(60)}`;
  const out = fold(line);
  for (const part of out.split('\r\n')) assert.ok(new TextEncoder().encode(part).length <= 75);
  assert.equal(out.split('\r\n').map((p, i) => (i ? p.slice(1) : p)).join(''), line);
});

test('a class lesson repeats weekly in Tbilisi time', () => {
  const ics = buildIcs([{ id: 'c1', name: 'გალობა, I', schedule: [{ day: 2, start: '18:30', end: '20:00', note: 'სამების ტაძარი' }] }], new Date('2026-10-29T08:00:00Z'));
  assert.match(ics, /DTSTART;TZID=Asia\/Tbilisi:20260106T183000/);
  assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=TU/);
  assert.match(ics, /SUMMARY:გაკვეთილი — გალობა\\, I/);
  assert.match(ics, /DTSTART;VALUE=DATE:20260412/);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
});
