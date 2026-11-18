// „პატარა თეორია“ of the AI lesson (src/utils/aiTheory.ts): what a phrase of my voice shows, where, and the words.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findTheory, pickTheory, placeWords, theoryEntry, theoryOverrides, whereLine, type LineNote } from '../src/utils/aiTheory';
import { AI_THEORY } from '../src/data/aiTheory';

/** notes one after another: [midi, length s], a rest as [null, length] */
const line = (spec: [number | null, number][]): LineNote[] => {
  let t = 0;
  const out: LineNote[] = [];
  for (const [m, len] of spec) { if (m != null) out.push([t, len, m]); t += len; }
  return out;
};
const ids = (l: LineNote[], lowest = false) => findTheory(l, { lowest }).map(h => h.id);

test('a plain step-wise phrase shows nothing', () => {
  assert.deepEqual(ids(line([[60, 0.5], [62, 0.5], [64, 0.5], [62, 0.5], [60, 0.6]])), []);
  assert.deepEqual(findTheory([]), []);
});

test('a long held end: „ამ ფრაზაში ის ბოლო ნოტზეა.“', () => {
  const l = line([[62, 0.5], [64, 0.5], [65, 0.5], [64, 0.5], [62, 2.4]]);
  const [h] = findTheory(l);
  assert.equal(h.id, 'long');
  assert.equal(h.at, 4);
  assert.equal(whereLine(theoryEntry('long'), h, 5), 'ამ ფრაზაში ის ბოლო ნოტზეა.');
  // the example plays from the note before it
  assert.deepEqual([h.s0, h.s1], [1.5, 4.4]);
  // a short phrase of long notes: nothing stands out
  assert.deepEqual(ids(line([[62, 1.5], [64, 1.5], [62, 2]])), []);
});

test('a leap of a fifth or more, the widest one', () => {
  const l = line([[60, 0.5], [62, 0.5], [69, 0.5], [67, 0.5], [55, 0.5], [57, 0.5]]);
  const h = findTheory(l).find(x => x.id === 'leap')!;
  assert.equal(h.at, 3); // 67 → 55 (12) beats 62 → 69 (7)
  assert.equal(placeWords(h, 6), 'მეოთხე და მეხუთე ნოტს შორისაა');
  assert.ok(!ids(line([[60, 0.5], [65, 0.5], [60, 0.5]])).includes('leap')); // a fourth is not named
  const first = findTheory(line([[60, 0.5], [67, 0.5], [65, 0.5]])).find(x => x.id === 'leap')!;
  assert.equal(placeWords(first, 3), 'პირველ და მეორე ნოტს შორისაა');
});

test('a rest, a reciting tone, a half-tone step', () => {
  const l = line([[62, 0.5], [64, 0.5], [null, 0.6], [64, 0.4], [64, 0.4], [64, 0.4], [64, 0.4], [65, 0.6]]);
  const hits = findTheory(l);
  const rest = hits.find(h => h.id === 'rest')!;
  assert.equal(placeWords(rest, 3), 'მეორე ნოტის შემდეგაა');
  const recite = hits.find(h => h.id === 'recite')!;
  assert.equal(recite.at, 1);
  assert.equal(whereLine(theoryEntry('recite'), recite, 3), 'ამ ფრაზაში ის მეორე ნოტზეა.');
  const half = hits.find(h => h.id === 'half')!;
  assert.equal(placeWords(half, 3), 'მეორე და ბოლო ნოტს შორისაა');
  // in the texts' order
  assert.deepEqual(hits.map(h => h.id), ['rest', 'recite', 'half']);
});

test('the drone belongs to the bass alone', () => {
  const l = line([[50, 4], [48, 0.5], [50, 0.5]]);
  assert.ok(!ids(l).includes('drone'));
  const h = findTheory(l, { lowest: true }).find(x => x.id === 'drone')!;
  assert.equal(h.who, 'all');
  assert.equal(placeWords(h, 3), 'პირველ ნოტზეა');
});

test('each rule once: the first one not met yet', () => {
  const hits = findTheory(line([[62, 0.5], [70, 0.5], [null, 0.6], [69, 0.5], [62, 2.5]]));
  assert.deepEqual(hits.map(h => h.id), ['long', 'leap', 'rest', 'half']);
  assert.equal(pickTheory(hits, [])?.id, 'long');
  assert.equal(pickTheory(hits, ['long', 'leap'])?.id, 'rest');
  assert.equal(pickTheory(hits, ['long', 'leap', 'rest', 'half']), null);
});

test('the school wording is laid over the texts, the rest stays', () => {
  const over = theoryOverrides({ long: { term: '  ფერმატა ', meaning: '' }, leap: { meaning: 'x'.repeat(400) }, nope: { term: 'a' }, rest: 5 });
  assert.equal(over.long?.term, 'ფერმატა');
  assert.equal(over.long?.meaning, AI_THEORY[0].meaning);
  assert.equal(over.leap?.meaning.length, 300);
  assert.equal(over.leap?.term, 'ნახტომი');
  assert.equal(Object.keys(over).length, 2);
  assert.equal(theoryEntry('long', over).term, 'ფერმატა');
  assert.equal(theoryEntry('rest', over).term, 'პაუზა');
  assert.deepEqual(theoryOverrides(null), {});
});

test('the texts: one sentence each, a place in every where, no blaming word', () => {
  for (const t of AI_THEORY) {
    assert.ok(t.term && t.meaning && t.where, t.id);
    assert.match(t.where, /\{(on|between|after)\}/, t.id);
    assert.equal(t.meaning.split(/(?<=[.!?])\s/).length, 1, t.id);
    assert.ok(!/ცუდია|არასწორია|ისევ შეცდი/.test(t.meaning + t.where), t.id);
  }
  assert.equal(new Set(AI_THEORY.map(t => t.id)).size, AI_THEORY.length);
});
