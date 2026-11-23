import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bakeMelody, decodeMelody, encodeMelody, isBlack, keyRangeOf, noteNameOf, partOf, shapeMelody, soundingSeconds, stepSpeed, stepTone,
  toneLabel, trimMelody, type Melody,
} from '../src/utils/melody';

const mel: Melody = { i: 'flute', n: [[60, 0, 400], [62, 500, 400], [64, 1000, 800]] };

test('a melody goes into a message and back', () => {
  assert.deepEqual(decodeMelody(encodeMelody(mel)), mel);
  assert.equal(decodeMelody(''), null);
  assert.equal(decodeMelody('{oops'), null);
  assert.equal(decodeMelody('{"n":[]}'), null);
  assert.equal(decodeMelody('{"i":"x","n":[[60,0,300]]}')?.i, 'piano');
});

test('the silence before the first note is dropped', () => {
  const t = trimMelody({ i: 'piano', n: [[62, 1700, 300], [60, 1200, 300]] });
  assert.deepEqual(t.n, [[60, 0, 300], [62, 500, 300]]);
});

test('tone and pace shape it', () => {
  const s = shapeMelody(mel, 2, 2);
  assert.deepEqual(s.map(x => x.midi), [62, 64, 66]);
  assert.equal(s[1].at, 0.25);
  assert.equal(soundingSeconds(s), 0.9);
  const baked = bakeMelody(mel, -1, 0.5);
  assert.deepEqual(baked.n[2], [63, 2000, 1600]);
});

test('a part starts at 0 and keeps its places', () => {
  const p = partOf(shapeMelody(mel), 1, 2);
  assert.equal(p.length, 2);
  assert.equal(p[0].at, 0);
  assert.equal(p[0].idx, 1);
});

test('steps stay in their bounds', () => {
  assert.equal(stepSpeed(1, 1), 1.1);
  assert.equal(stepSpeed(2, 1), 2);
  assert.equal(stepSpeed(0.5, -1), 0.5);
  assert.equal(stepTone(12, 1), 12);
  assert.equal(toneLabel(-3), '−3');
  assert.equal(toneLabel(2), '+2');
});

test('keys: names, black ones and the range a melody needs', () => {
  assert.equal(noteNameOf(60), 'დო');
  assert.equal(noteNameOf(69), 'ლა');
  assert.ok(isBlack(61) && !isBlack(64));
  assert.deepEqual(keyRangeOf([{ midi: 62 }, { midi: 67 }]), [60, 84]);
  assert.deepEqual(keyRangeOf([{ midi: 55 }, { midi: 86 }]), [48, 96]);
});
