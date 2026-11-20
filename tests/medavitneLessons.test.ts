// The reader's course (data/medavitneLessons.ts): every lesson can be shown — its quiz answers exist, its psalms and Bible
// books are in the app — and the two lessons of 2026-11-19 (Lent, Pascha) are there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { LESSONS, lessonById } from '../src/data/medavitneLessons';

const root = new URL('../', import.meta.url);

test('ten lessons with their own ids, the new ones last', () => {
  assert.equal(LESSONS.length, 10);
  assert.equal(new Set(LESSONS.map(l => l.id)).size, LESSONS.length);
  assert.deepEqual(LESSONS.slice(-2).map(l => l.id), ['lent', 'pascha']);
  assert.equal(lessonById('lent')?.title, 'დიდი მარხვა');
});

test('every step can be shown', () => {
  for (const l of LESSONS) {
    assert.ok(l.steps.length >= 4, l.id);
    assert.ok(l.minutes >= 10 && l.minutes <= 30, l.id);
    for (const s of l.steps) {
      if (s.kind === 'quiz') {
        assert.ok(s.options.length >= 2 && s.answer >= 0 && s.answer < s.options.length, `${l.id}: ${s.question}`);
        assert.ok(s.explain.length > 0);
      }
      if (s.kind === 'read') {
        assert.ok(s.lines?.length || s.psalms?.length || s.bible, `${l.id}: ${s.title} has nothing to read`);
        for (const n of s.psalms ?? []) assert.ok(Number.isInteger(n) && n >= 1 && n <= 150, `${l.id}: psalm ${n}`);
        if (s.bible) assert.ok(existsSync(new URL(`public/bible/${s.bible.book}.json`, root)), `${l.id}: ${s.bible.book}`);
        for (const line of s.lines ?? []) assert.ok(line.trim().length > 0);
      }
      if (s.kind === 'order') assert.ok(s.items.length >= 3, `${l.id}: ${s.title}`);
    }
  }
});

test('a part of the Psalter is „კანონი“ in every line a learner reads', () => {
  const all = JSON.stringify(LESSONS);
  assert.ok(!/კათი[ზს]მ/.test(all));
});

test('St Ephrem\'s prayer and the Paschal Hours stand whole in their lessons', () => {
  const lent = lessonById('lent')!.steps.find(s => s.kind === 'read' && s.title === 'ეფრემ ასურის ლოცვა');
  assert.ok(lent && lent.kind === 'read' && lent.lines?.length === 4);
  assert.match(lent.lines![0], /^უფალო და მეუფეო ცხოვრებისა ჩემისაო/);
  assert.match(lent.lines![3], /^ღმერთო, მილხინე ცოდვილსა ამას/);
  const hours = lessonById('pascha')!.steps.find(s => s.kind === 'read' && s.title === 'პასექის ჟამნი');
  assert.ok(hours && hours.kind === 'read' && hours.lines!.length === 14);
  assert.match(hours.lines![0], /^ქრისტე აღსდგა/);
  assert.match(hours.lines![13], /ლოცვითა წმიდათა მამათა/);
});
