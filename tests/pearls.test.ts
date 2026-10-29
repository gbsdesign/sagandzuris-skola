import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isGolden, missedNotes, pearlPatch, pearlState, phraseOf, voiceBests } from '../src/utils/pearls';
import { scoreSinging } from '../src/utils/pitch';
import type { BookScore } from '../src/utils/chantSynth';

const score = (voices: BookScore['voices']): BookScore =>
  ({ nums: [1], page: 1, tempos: [[0, 60]], dur: 40, voices, img: [], sys: [], base: '' });

test('the phrase runs to the first long note after five moves; repeated pitches are one melody note', () => {
  const v: BookScore['voices'][number] = [
    [0, 1, 60], [1, 1, 60], [2, 1, 62], [3, 1, 64], [4, 1, 62], [5, 1, 64], [6, 1, 65], [7, 2, 64], [9, 1, 60], [10, 1, 62],
  ];
  const p = phraseOf(score([v]), 0);
  assert.deepEqual(p.target, [60, 62, 64, 62, 64, 65, 64]);
  assert.equal(p.notes.length, 8);
  assert.equal(p.notes[1][1], 0.5); // the repeated 60 at a speaking pace
  assert.equal(p.seconds, 8.5);
});

test('a long recitation tone is shortened', () => {
  const v: BookScore['voices'][number] = [[0, 10, 57], [10, 1, 59], [11, 1, 61], [12, 1, 62], [13, 1, 61], [14, 1, 59], [15, 3, 57]];
  const p = phraseOf(score([v]), 0);
  assert.equal(p.notes[0][1], 2.5);
  assert.deepEqual(p.target, [57, 59, 61, 62, 61, 59, 57]);
});

test('a split voice keeps the upper note in the top voice and the lower one below', () => {
  const v: BookScore['voices'][number] = [[0, 1, 60], [0, 1, 64], [1, 1, 62]];
  assert.deepEqual(phraseOf(score([v]), 0).target, [64, 62]);
  assert.deepEqual(phraseOf(score([[], v]), 1).target, [60, 62]);
});

test('pearl states', () => {
  assert.equal(pearlState(undefined, undefined), 'new');
  assert.equal(pearlState({ best: 60, voice: '1', at: '' }, undefined), 'tried');
  assert.equal(pearlState({ best: 80, voice: '1', at: '' }, undefined), 'polished');
  assert.equal(pearlState({ best: 60, voice: '1', at: '' }, { voice: '1', by: 't', at: '' }), 'shining');
});

test('the best in each voice; an older record counts its best for its voice', () => {
  assert.deepEqual(voiceBests(undefined), {});
  assert.deepEqual(voiceBests({ best: 70, voice: '2', at: '' }), { '2': 70 });
  assert.deepEqual(voiceBests({ best: 90, voice: '1', at: '', voices: { '1': 90, '3': 40 } }), { '1': 90, '3': 40 });
});

test('golden once all three voices are polished', () => {
  assert.equal(isGolden({ best: 95, voice: '1', at: '', voices: { '1': 95, '2': 80 } }), false);
  assert.equal(isGolden({ best: 95, voice: '1', at: '', voices: { '1': 95, '2': 80, '3': 81 } }), true);
});

test('a try updates its voice, and the overall best only when it is reached', () => {
  const rec = { best: 90, voice: '1' as const, at: 'a', voices: { '1': 90, '2': 50 } };
  assert.deepEqual(pearlPatch(rec, 60, '2', 'b'), { voices: { '2': 60 } });
  assert.equal(pearlPatch(rec, 40, '2', 'b'), null);
  assert.deepEqual(pearlPatch(rec, 95, '3', 'b'), { voices: { '3': 95 }, best: 95, voice: '3', at: 'b' });
  assert.deepEqual(pearlPatch(undefined, 0, '1', 'b'), { voices: { '1': 0 }, best: 0, voice: '1', at: 'b' });
});

test('a missed note says which way the voice went, or that it was not sung', () => {
  const target = [60, 62, 64, 65];
  // in another key (+2): the second note a semitone low, the third left out
  const sung = [62, 63, 67].map((m, i) => ({ midi: m, start: i * 300, end: i * 300 + 200 }));
  const r = scoreSinging(target, sung);
  assert.deepEqual(r.hits, [true, false, false, true]);
  const miss = missedNotes(target, sung, r);
  assert.equal(miss.length, 2);
  assert.equal(miss[0].index, 1);
  assert.ok(Math.abs(miss[0].err! + 1) < 1e-9);
  assert.deepEqual(miss[1], { index: 2, err: null });
});

test('a note sung too high is told as high', () => {
  const target = [60, 62, 64];
  const sung = [60, 63.2, 64].map((m, i) => ({ midi: m, start: i * 300, end: i * 300 + 200 }));
  const r = scoreSinging(target, sung);
  const miss = missedNotes(target, sung, r);
  assert.equal(miss.length, 1);
  assert.ok(miss[0].err! > 1);
});
