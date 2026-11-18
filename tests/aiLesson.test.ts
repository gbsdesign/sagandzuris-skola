// The AI teacher's day lesson, the pure part (src/utils/aiLesson.ts): a take read note by note and the ready sentences.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreSinging, type SungNote } from '../src/utils/pitch';
import {
  afterTake, closingLine, countLine, dayGap, fixLine, leftWord, liveWord, nextLine, offPitch, openingLine, ordinal, readTake,
  verdictLine, warmNotes,
} from '../src/utils/aiLesson';

const T = [62, 64, 65, 67, 69, 67, 65, 64];
const L = T.map(() => 0.5);
/** a take: the given pitches, 400 ms each with a 100 ms gap */
const take = (midis: (number | null)[], len = 400): SungNote[] =>
  midis.flatMap((m, i) => (m == null ? [] : [{ midi: m, start: i * (len + 100), end: i * (len + 100) + len }]));
const read = (midis: (number | null)[], target = T, lengths = L, len?: number) => {
  const sung = take(midis, len);
  return readTake(target, lengths, sung, scoreSinging(target, sung));
};
const ctx = (over = {}) => ({ before: [] as number[], slow: false, slowGood: 0, split: false, pass: 0.8, ...over });

test('a clean take, in another key, is all right', () => {
  const r = read(T.map(m => m - 5));
  assert.equal(r.hits, 8);
  assert.equal(fixLine(r).kind, 'none');
  assert.equal(afterTake(r, ctx()).say, 'ზუსტად!');
});

test('one flat note is named by its place', () => {
  const sung = [...T]; sung[5] = 66.2; // a semitone-ish low
  const r = read(sung);
  assert.equal(r.notes[5].hit, false);
  assert.ok(r.notes[5].dev! < -0.3);
  const fix = fixLine(r);
  assert.equal(fix.kind, 'low');
  assert.equal(fix.text, 'მეექვსე ნოტი ცოტა დაბლა იყო.');
  assert.equal(fix.focus, 5);
  // seven of eight passes the phrase: the slip is named, and the lesson goes on
  const passed = afterTake(r, ctx());
  assert.equal(passed.say, 'თითქმის ზუსტად! მეექვსე ნოტი ცოტა დაბლა იყო.');
  assert.equal(passed.move, 'done');
  // two slips do not pass: hear that note alone
  const two = [...sung]; two[7] = 63.35;
  const said = afterTake(read(two), ctx());
  assert.equal(said.say, 'თითქმის ზუსტად! მეექვსე ნოტი ცოტა დაბლა იყო. მოუსმინე მხოლოდ იმ ნოტს და კიდევ სცადე.');
  assert.equal(said.move, 'note');
});

test('a sharp note says „მაღლა“', () => {
  const sung = [...T]; sung[2] = 66.1;
  assert.equal(fixLine(read(sung)).text, 'მესამე ნოტი ცოტა მაღლა იყო.');
});

test('a missed leap is named before a single note', () => {
  const target = [60, 62, 67, 65, 64, 62];
  const sung = [60, 62, 65.6, 65, 64, 62];
  const r = read(sung, target, target.map(() => 0.5));
  assert.equal(r.jump, 2);
  assert.equal(fixLine(r).kind, 'jump');
});

test('a sagging end asks for a breath in the middle', () => {
  const sung = T.map((m, i) => (i >= 5 ? m - 0.62 : m));
  const r = read(sung);
  assert.ok(r.sag);
  assert.equal(fixLine(r).text, 'ფრაზის ბოლოს ხმა დაგიდაბლდა. შუაში ჩაისუნთქე.');
});

test('nothing heard: the phone should come closer, nothing else is said', () => {
  const r = read([]);
  assert.equal(r.heard, false);
  const said = afterTake(r, ctx());
  assert.equal(said.say, 'ხმა ვერ გავიგონე. ტელეფონი ახლოს მოიტანე.');
  assert.equal(said.move, 'again');
});

test('the first sentence follows the count', () => {
  assert.equal(verdictLine(8, 8), 'ზუსტად!');
  assert.equal(verdictLine(7, 8), 'თითქმის ზუსტად!');
  assert.equal(verdictLine(6, 8), 'თითქმის ზუსტად!');
  assert.equal(verdictLine(5, 8), 'ნახევარი გამოვიდა.');
  assert.equal(verdictLine(4, 8), 'ნახევარი გამოვიდა.');
  assert.equal(verdictLine(3, 8), 'ჯერ მოუსმინე და ისევ სცადე.');
  assert.equal(countLine(8, 10), '10 ნოტიდან 8 ზუსტად');
});

test('three tries that do not pass change the way: smaller first, another day after', () => {
  const fix = { kind: 'low' as const, focus: 2 };
  assert.equal(nextLine(0.4, fix, ctx({ before: [0.3, 0.5] })).move, 'split');
  assert.equal(nextLine(0.4, fix, ctx({ before: [0.3, 0.5], split: true })).move, 'later');
  assert.equal(nextLine(0.4, fix, ctx({ before: [0.3] })).move, 'note');
  assert.equal(nextLine(0.4, { kind: 'sag', focus: -1 }, ctx()).move, 'slow');
});

test('the pace rises by itself after two good slow tries', () => {
  const none = { kind: 'none' as const, focus: -1 };
  assert.equal(nextLine(0.9, none, ctx({ slow: true, slowGood: 0 })).move, 'again');
  assert.equal(nextLine(0.9, none, ctx({ slow: true, slowGood: 1 })).move, 'tempo');
  assert.equal(nextLine(0.9, none, ctx()).move, 'done');
});

test('praise only when true', () => {
  const r = read(T);
  assert.equal(afterTake(r, ctx({ before: [0.9] })).say, 'ზუსტად! ეს ფრაზა უკვე იცი. გადავიდეთ შემდეგზე.');
  // rising from under half: said, and the lesson does not give the place up
  const half = read([62, 64, 65, 67, null, null, null, null]);
  const rising = afterTake(half, ctx({ before: [0.2, 0.3] }));
  assert.match(rising.say, /^სამი ცდა — და უკვე ნახევარი გამოდის\./);
  assert.notEqual(rising.move, 'split');
  // stuck under the mark three times: the way changes
  assert.equal(afterTake(half, ctx({ before: [0.5, 0.5] })).say, 'ეს ადგილი ძნელია. დავყოთ ორ ნაწილად.');
});

test('never a blaming word, never more than three sentences', () => {
  const bad = /ცუდია|არასწორია|ისევ შეცდი/;
  for (const sung of [T, [], [62, 70, 50, 67], T.map(m => m + 0.6), [62, null, 65, null, 69]]) {
    for (const c of [ctx(), ctx({ before: [0.1, 0.2] }), ctx({ slow: true, slowGood: 1 })]) {
      const said = afterTake(read(sung), c);
      assert.ok(!bad.test(said.say), said.say);
      assert.ok(said.say.split(/(?<=[.!])\s/).length <= 3, said.say);
    }
  }
});

test('small helpers', () => {
  assert.equal(ordinal(1), 'პირველი');
  assert.equal(ordinal(6), 'მეექვსე');
  assert.equal(ordinal(20), 'მე-20');
  assert.deepEqual(warmNotes(48), [48, 50, 52]);
  assert.equal(offPitch(61, 48), 1);
  assert.equal(offPitch(47.5, 60), -0.5);
  assert.equal(liveWord(60.1, 48), 'ზუსტად');
  assert.equal(liveWord(59.2, 60), 'ოდნავ მაღლა');
  assert.equal(liveWord(60.8, 60), 'ოდნავ დაბლა');
  assert.equal(liveWord(null, 60), '');
  assert.equal(leftWord(8.2 * 60000), 'დარჩა 9 წთ');
  assert.equal(leftWord(10_000), 'დარჩა 1 წთ');
  assert.equal(dayGap('2026-11-14', '2026-11-18'), 4);
  assert.equal(dayGap(undefined, '2026-11-18'), 0);
  assert.equal(openingLine({ review: true, fresh: true, back: false }), 'დღეს ახალი ფრაზაა და ცოტა გამეორება. დავიწყოთ.');
  assert.equal(closingLine({ learned: 0, improved: true, nextPhrase: 4 }), 'დღეს უკეთ გამოგივიდა, ვიდრე დასაწყისში. ხვალ — მეოთხე ფრაზა.');
});

test('what today holds: reviews first by how long they waited, a new phrase from the assignment first', async () => {
  const { firstOpenPart, freshCandidates, pickReviews, lastSeenWord } = await import('../src/utils/aiLesson');
  const rec = (level: number, due?: string, at = '2026-11-10') => ({ best: 90, level, due, at });
  const learning = {
    a: { 0: rec(1, '2026-11-16'), 1: rec(2, '2026-11-18'), 2: rec(0) },
    b: { 0: rec(1, '2026-11-20'), 1: rec(1, '2026-11-17', '2026-11-12') },
    'song-x-t0': { 0: rec(1, '2026-11-01') },
  };
  const isChant = (p: string) => !p.startsWith('song-');
  assert.deepEqual(pickReviews(learning, '2026-11-18', 2, isChant).map(r => `${r.piece}${r.part}`), ['a0', 'b1']);
  assert.equal(firstOpenPart(learning.a, 5), 2);
  assert.equal(firstOpenPart({ 0: rec(1), 1: rec(1) }, 2), -1);
  assert.equal(firstOpenPart({ 0: rec(1) }, 0), 1);
  const c = freshCandidates({
    work: [{ piece: 'w', voice: '2' }, { piece: 'b' }], learning, parts: { b: 2 }, program: ['p', 'a'], starter: ['s'], isChant,
  });
  assert.deepEqual(c.map(x => `${x.piece}:${x.from}`), ['w:work', 'a:learning', 'p:program', 's:start']);
  assert.equal(c[0].voice, '2');
  assert.equal(lastSeenWord('2026-11-11', '2026-11-18'), 'ბოლოს 7 დღის წინ');
});
