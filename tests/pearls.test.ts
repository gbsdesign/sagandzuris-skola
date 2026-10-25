import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phraseOf, pearlState } from '../src/utils/pearls';
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
