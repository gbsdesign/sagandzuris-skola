import { test } from 'node:test';
import assert from 'node:assert/strict';
import { afterTry, learnedShare, learnTakeId, melodyIn, parseLearnTakeId, parseSongPiece, partState, partsOfRecording, partsOfScore, songPiece } from '../src/utils/learn';
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
