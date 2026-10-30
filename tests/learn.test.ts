import { test } from 'node:test';
import assert from 'node:assert/strict';
import { afterTry, allLearned, assignedProgress, beatAt, learnedShare, learnTakeId, markerAt, melodyIn, nextReviewDay, parseLearnTakeId, parseSongPiece, partState, partsAtBreaths, partsOfRecording, partsOfScore, reviewsDue, songPiece, timelineIn, wordsForPart } from '../src/utils/learn';
import type { BookScore } from '../src/utils/chantSynth';

const score = (sys: BookScore['sys'], voices: BookScore['voices'] = [[]], dur = 40): BookScore =>
  ({ nums: [1], page: 1, tempos: [[0, 60]], dur, voices, img: [], sys, base: '' });

test('one part per line of notes; a short line goes with the next, a short last one with the one before', () => {
  const parts = partsOfScore(score([
    [0, 0, 0, 1, 0.2, 0, 3], [0, 0, 0.2, 1, 0.2, 3, 15], [0, 0, 0.4, 1, 0.2, 15, 30], [0, 0, 0.6, 1, 0.2, 30, 34],
  ]));
  assert.deepEqual(parts.map(p => [p.b0, p.b1, p.sys]), [[0, 15, [0, 1]], [15, 34, [2, 3]]]);
  assert.equal(parts[1].s0, 15); // 60 bpm: a beat is a second
});

test('a recording is cut into parts of about 12 seconds that cover it all', () => {
  const parts = partsOfRecording(50);
  assert.equal(parts.length, 4);
  assert.equal(parts[3].s1, 50);
  assert.equal(partsOfRecording(5).length, 1);
  assert.equal(partsOfRecording(0).length, 0);
});

test('the melody of a part: repeated pitches once, the upper of a split note for I', () => {
  const v: BookScore['voices'][number] = [[0, 1, 60], [1, 1, 60], [2, 1, 64], [2, 1, 62], [3, 1, 65], [9, 1, 67]];
  const s = score([], [v, v]);
  assert.deepEqual(melodyIn(s, 0, 0, 5), [60, 64, 65]);
  assert.deepEqual(melodyIn(s, 1, 0, 5), [60, 62, 65]);
});

test('reviews after 1, 3 and 7 days; a failed review goes back to tomorrow', () => {
  let r = afterTry(undefined, 50, false, '2026-10-27');
  assert.equal(partState(r, '2026-10-27'), 'learning');
  r = afterTry(r, 90, true, '2026-10-27');
  assert.deepEqual([r.level, r.due, r.best], [1, '2026-10-28', 90]);
  assert.equal(partState(r, '2026-10-27'), 'learned');
  assert.equal(partState(r, '2026-10-28'), 'due');
  assert.deepEqual(afterTry(r, 95, true, '2026-10-27'), { ...r, best: 95 }); // not due yet: only the score
  r = afterTry(r, 85, true, '2026-10-28');
  assert.deepEqual([r.level, r.due], [2, '2026-10-31']);
  const failed = afterTry(r, 40, false, '2026-10-31');
  assert.deepEqual([failed.level, failed.due], [1, '2026-11-01']);
  r = afterTry(r, 85, true, '2026-10-31');
  r = afterTry(r, 85, true, '2026-11-07');
  assert.equal(partState(r, '2026-12-01'), 'kept');
  assert.equal(learnedShare({ 0: r, 1: failed, 2: { best: 10, level: 0, at: '' } }, 4), 0.5);
});

test('take ids name the piece and the part', () => {
  const piece = songPiece('fs-e8', 1);
  assert.deepEqual(parseSongPiece(piece), { songId: 'fs-e8', take: 1 });
  assert.deepEqual(parseLearnTakeId(learnTakeId(piece, 2)), { piece, part: 2 });
  assert.deepEqual(parseLearnTakeId(learnTakeId('v-5-x58', 'all')), { piece: 'v-5-x58', part: 'all' });
  assert.equal(parseLearnTakeId('v-5-x58'), null);
});

test('the timeline of a part: seconds from its start, a note sounds until the next starts', () => {
  const v: BookScore['voices'][number] = [[4, 2, 60], [5, 1, 62], [6, 4, 64], [12, 1, 65]];
  assert.deepEqual(timelineIn(score([], [v]), 0, 4, 8), [[0, 1, 60], [1, 1, 62], [2, 2, 64]]);
});

test('the marker moves across a line: after the clef at the start, near the end at the end, in order between', () => {
  const v: BookScore['voices'][number] = [[0, 1, 60], [1, 1, 62], [2, 4, 64], [6, 1, 65]];
  const s = score([[0, 0, 0, 1, 1, 0, 7]], [v], 7);
  const xs = [0, 1, 2, 4, 6, 6.99].map(b => markerAt(s, 0, b));
  assert.ok(Math.abs(xs[0] - 0.1) < 1e-9);
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] > xs[i - 1]);
  assert.ok(xs[5] < 0.97 && xs[5] > 0.9);
  // the long note (4 beats) gets more room than a short one, but not four times as much
  const short = xs[1] - xs[0], long = markerAt(s, 0, 6) - xs[2];
  assert.ok(long > short && long < 4 * short);
});

test('a dragged ball lands on the nearest note start of the line', () => {
  const v: BookScore['voices'][number] = [[0, 1, 60], [1, 1, 62], [2, 4, 64], [6, 1, 65]];
  const s = score([[0, 0, 0, 1, 1, 0, 7]], [v], 7);
  // every note start's own place gives that start back
  for (const b of [0, 1, 2, 6]) assert.equal(beatAt(s, 0, markerAt(s, 0, b)), b);
  // a bit past a start stays on it; the far edges give the first and the last note
  assert.equal(beatAt(s, 0, markerAt(s, 0, 2) + 0.01), 2);
  assert.equal(beatAt(s, 0, 0), 0);
  assert.equal(beatAt(s, 0, 1), 6);
});

test('a recording is cut at its pauses', () => {
  // 40 s, loud everywhere but pauses at 9 s and 21 s and 31 s (10 readings a second)
  const e = Array.from({ length: 400 }, (_, i) => ([90, 210, 310].some(p => Math.abs(i - p) <= 2) ? 0.01 : 1));
  const parts = partsAtBreaths(e, 0.1, 40);
  assert.deepEqual(parts.map(p => Math.round(p.s0)), [0, 9, 21, 31]);
  assert.equal(parts[3].s1, 40);
  // no pauses: still parts of 6–16 s
  const flat = partsAtBreaths(Array(400).fill(1), 0.1, 40);
  assert.ok(flat.every(p => p.s1 - p.s0 >= 6 && p.s1 - p.s0 <= 16));
});

test('the words are shared out over the parts in order', () => {
  const lines = ['a', 'b', 'c', 'd', 'e', 'f'];
  assert.deepEqual([0, 1, 2].map(i => wordsForPart(lines, i, 3)), [['a', 'b'], ['c', 'd'], ['e', 'f']]);
  assert.deepEqual(wordsForPart(['a', 'b'], 2, 4), ['b']);
});

test('the reviews due today, and the next review day', () => {
  const learning = {
    a: { 0: { best: 90, level: 1, due: '2026-10-28', at: '' }, 1: { best: 90, level: 2, due: '2026-10-30', at: '' } },
    b: { 0: { best: 90, level: 1, due: '2026-10-26', at: '' }, 1: { best: 90, level: 1, due: '2026-10-27', at: '' }, 2: { best: 9, level: 0, at: '' } },
    c: { 0: { best: 90, level: 4, at: '' } },
  };
  assert.deepEqual(reviewsDue(learning, '2026-10-28'), [{ piece: 'b', parts: [0, 1] }, { piece: 'a', parts: [0] }]);
  assert.deepEqual(nextReviewDay(learning, '2026-10-28'), { day: '2026-10-28', count: 3 });
  assert.deepEqual(nextReviewDay({ a: learning.a }, '2026-10-29'), { day: '2026-10-29', count: 1 });
  assert.equal(nextReviewDay({ c: learning.c }, '2026-10-28'), null);
});

test('an assigned piece: the bar of its parts, a song by its best-learned recording', () => {
  const r = (level: number) => ({ best: 90, level, at: '' });
  const learning = {
    'v-1': { 0: r(1), 2: r(0) },
    'song-fs-a-t0': { 0: r(1) },
    'song-fs-a-t2': { 0: r(4), 1: r(2) },
    'song-fs-ab-t0': { 0: r(1), 1: r(1), 2: r(1) },
  };
  const parts = { 'v-1': 3, 'song-fs-a-t0': 4, 'song-fs-a-t2': 2, 'song-fs-ab-t0': 3 };
  assert.deepEqual(assignedProgress('v-1', learning, parts), { piece: 'v-1', total: 3, learned: 1, marks: [2, 0, 1] });
  const song = assignedProgress('fs-a', learning, parts);
  assert.equal(song?.piece, 'song-fs-a-t2');
  assert.ok(allLearned(song));
  assert.ok(!allLearned(assignedProgress('v-1', learning, parts)));
  // not opened yet (no part count): nothing to show
  assert.equal(assignedProgress('v-2', learning, parts), null);
  assert.equal(assignedProgress('v-1', learning, {}), null);
});
