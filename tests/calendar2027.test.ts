import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { CalendarDay } from '../src/data/churchCalendar';
import { readingsOf, toneOf } from '../src/utils/dayReadings';
import { buildServices, guessRank } from '../src/utils/dayService';

// The church year 2027 put together by scripts/calendar-gen until orthodoxy.ge publishes its own.
const year = JSON.parse(readFileSync(new URL('../src/data/calendar/2027.json', import.meta.url), 'utf8')) as {
  year: number; computed?: boolean; days: Record<string, CalendarDay>;
};
const day = (iso: string) => year.days[iso];
const text = (iso: string) => day(iso).p.map(p => p.map(r => r[0]).join('')).join('\n');

test('every day from 14 January 2027 to 13 January 2028, each with a name, saints and the computed mark', () => {
  assert.equal(year.year, 2027);
  if (!year.computed) return; // orthodoxy.ge's own year has come: nothing of ours is left to check
  const isos = Object.keys(year.days).sort();
  assert.equal(isos.length, 365);
  assert.equal(isos[0], '2027-01-14');
  assert.equal(isos[isos.length - 1], '2028-01-13');
  for (const iso of isos) {
    const d = day(iso);
    assert.ok(d.t.trim(), iso);
    assert.ok(d.p[0]?.map(r => r[0]).join('').trim(), `${iso}: no commemorations`);
    assert.equal(d.c, 1, iso);
    for (const s of d.s) {
      if (!s.at) continue;
      const shown = d.p[s.at[0]].map(r => r[0]).join('').slice(s.at[1], s.at[2]);
      assert.ok(shown.startsWith(s.n.slice(0, 12)) || s.n.startsWith(shown.slice(0, 12)), `${iso}: ${s.n} ≠ ${shown}`);
    }
  }
});

test('the movable year: Pascha on 2 May, the Triodion tones, the eves and the feasts', () => {
  if (!year.computed) return;
  assert.match(text('2027-05-02'), /ბრწყინვალე აღდგომა/);
  assert.match(day('2027-02-21').t, /მეზვერისა და ფარისევლის კვირიაკე\. ხმა V\./);
  assert.match(text('2027-02-21'), /სახ\. მე-5, ლკ\. 24: 12-35/);
  assert.match(day('2027-06-20').t, /მეერგასე/);
  assert.match(text('2027-01-18'), /ბასილი დიდისა\. დიდნი ჟამნი/); // Theophany's eve on a Monday
  assert.match(text('2027-01-19'), /ტიტ\. 2: 11-14/);
  assert.match(text('2027-04-07'), /ხსნილია თევზით/); // Annunciation in Lent
  assert.match(text('2027-04-27'), /მთ\. 24: 36 - 26: 2 \(დას\. 102\)/); // Holy Tuesday
  assert.match(text('2028-01-07'), /გალ\. 4: 4-7/);
  assert.match(text('2028-01-07'), /2028 წლის 5 \(18\) იანვრამდე/);
  assert.doesNotMatch(JSON.stringify(year.days), /ილია IL-ისა|ილია II-ის აღსაყდრების/);
  assert.match(text('2027-05-12'), /შიო III-ის აღსაყდრების/);
});

test('a great saint moves the weekday readings to a neighbour (ზედმობმით), never to a Sunday', () => {
  if (!year.computed) return;
  assert.match(text('2027-08-03'), /1 კორ\. 5: 9 - 6: 11 \(დას\. 134\).*- ორშ\. ზედმობმით/); // Elijah's Monday
  for (const [iso, d] of Object.entries(year.days)) {
    if (new Date(iso).getUTCDay() === 0) assert.doesNotMatch(text(iso), /ზედმობმით/, iso);
    void d;
  }
});

test('the day pages work on every day: readings parse, tones, the services', () => {
  if (!year.computed) return;
  let apostles = 0;
  for (const d of Object.values(year.days)) {
    for (const x of readingsOf(d).filter(r => r.apostle)) {
      apostles++;
      for (const g of x.ranges) assert.ok(g.ch > 0 && g.from > 0 && g.to >= g.from, `${x.abbr} ${x.ref}`);
    }
  }
  assert.ok(apostles > 350, `Apostle readings: ${apostles}`);
  assert.equal(toneOf(day('2027-08-22')), 8);
  for (const iso of ['2027-01-19', '2027-04-30', '2027-05-03', '2027-08-19', '2027-11-23']) {
    const sv = buildServices({ iso, day: day(iso), tone: 1, rank: guessRank(iso, day(iso), null), patron: null });
    assert.equal(sv.length, 4, iso);
  }
});
