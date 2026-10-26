import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreSinging, type SungNote } from '../src/utils/pitch';
import { takeReport, targetSeconds } from '../src/utils/takeReport';

// a phrase of 1-second notes, played back to back
const phraseOf = (target: number[]) => ({
  target,
  notes: target.map((m, i) => [i, 1, m] as [number, number, number]),
  seconds: target.length,
});
const sing = (midis: number[], ms = 1000) => midis.map((m, i): SungNote => ({ midi: m, start: i * ms, end: i * ms + ms - 50 }));
const report = (target: number[], sung: SungNote[]) => {
  const p = phraseOf(target);
  return takeReport(p, scoreSinging(target, sung), sung);
};

test('the matched sung note comes back for every target note', () => {
  const target = [60, 62, 64];
  const sung = sing([55, 57.3, 63]);
  const r = scoreSinging(target, sung);
  assert.deepEqual(r.hits, [true, true, false]);
  assert.equal(r.matched[0]!.midi, 55);
  assert.equal(r.matched[1]!.midi, 57.3);
  assert.equal(r.matched[2], null);
});

test('syllables on one pitch merge into one note that lasts them all', () => {
  const sung = [60, 60.1, 60, 62].map((m, i) => ({ midi: m, start: i * 300, end: i * 300 + 250 }));
  const r = scoreSinging([60, 62], sung);
  assert.equal(r.matched[0]!.start, 0);
  assert.equal(r.matched[0]!.end, 850);
});

test('a clean take in another key is exact everywhere, keeps the key and the pace', () => {
  const lines = report([62, 64, 65, 67, 65], sing([57, 59, 60, 62, 60]));
  assert.deepEqual(lines.slice(0, 5), [
    'ნოტი 1 (რე): ზუსტად', 'ნოტი 2 (მი): ზუსტად', 'ნოტი 3 (ფა): ზუსტად', 'ნოტი 4 (სოლ): ზუსტად', 'ნოტი 5 (ფა): ზუსტად',
  ]);
  assert.equal(lines[5], 'ტონალობა: ფრაზის ბოლომდე შეინარჩუნა.');
  assert.match(lines[6], /^ტემპი: იმღერა 5 წამში, ფრაზა დაახლოებით 5 წამია — ფრაზის ტემპში\.$/);
});

test('a high or low note is told in cents against the singer’s own key; small wobbles are exact', () => {
  const lines = report([60, 62, 64, 65, 67], sing([60.05, 62, 63.6, 65.35, 67]));
  assert.equal(lines[0], 'ნოტი 1 (დო): ზუსტად');
  assert.equal(lines[2], 'ნოტი 3 (მი): −40 ცენტი (დაბლა)');
  assert.equal(lines[3], 'ნოტი 4 (ფა): +35 ცენტი (მაღლა)');
});

test('a missed note is said so', () => {
  const lines = report([60, 62, 64], sing([60, 66, 64]));
  assert.equal(lines[1], 'ნოტი 2 (რე): ვერ გაისმა');
});

test('a key sinking toward the end is told', () => {
  const lines = report([60, 62, 64, 65, 64, 62], sing([60, 62, 63.8, 64.75, 63.6, 61.6]));
  assert.ok(lines.includes('ტონალობა: ბოლოსკენ დაიწია, დაახლოებით 40 ცენტით.'), lines.join('\n'));
});

test('rushing and dragging are told', () => {
  assert.match(report([60, 62, 64, 65], sing([60, 62, 64, 65], 600)).at(-1)!, /უფრო სწრაფად/);
  assert.match(report([60, 62, 64, 65], sing([60, 62, 64, 65], 1600)).at(-1)!, /უფრო ნელა/);
});

test('a note held far too short is told with its length', () => {
  const sung = sing([60, 62, 64]);
  sung[1].end = sung[1].start + 300;
  assert.equal(report([60, 62, 64], sung)[1], 'ნოტი 2 (რე): ზუსტად, მოკლედ (0.3 წმ, ფრაზაში 1 წმ)');
});

test('nothing heard gives one line', () => {
  assert.deepEqual(report([60, 62], []), ['ტელეფონმა ფრაზის ნოტები ვერ გაარჩია.']);
});

test('repeated pitches in the phrase add up to one melody note', () => {
  assert.deepEqual(targetSeconds([[0, 0.5, 60], [0.5, 0.5, 60], [1, 1, 62]]), [1, 1]);
});
