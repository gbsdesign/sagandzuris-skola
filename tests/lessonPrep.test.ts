import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyse, drillsFor, leapsText, levelOf, parseQuestions, quizFor, rangeText, readRecord } from '../src/utils/lessonPrep';
import { findDrill } from '../src/data/vocalDrills';

const line = (midis: number[]): [number, number, number][] => midis.map((m, i) => [i * 2, 2, m]);

test('leaps are steps wider than a fourth, counted inside a phrase', () => {
  const a = analyse([line([60, 62, 64, 72, 71])], [{ b0: 0, b1: 10 }]);
  assert.equal(a.leaps, 1);
  assert.equal(a.biggest, 8);
  assert.equal(a.range, 12);
  assert.equal(rangeText(a.range), 'ოქტავა');
});

test('a leap across two phrases is not counted', () => {
  const a = analyse([line([60, 62, 72, 74])], [{ b0: 0, b1: 4 }, { b0: 4, b1: 8 }]);
  assert.equal(a.leaps, 0);
  assert.equal(a.phrases, 2);
});

test('the voice with most leaps counts', () => {
  const a = analyse([line([60, 61, 62]), line([50, 58, 50, 58])], [{ b0: 0, b1: 10 }]);
  assert.equal(a.leaps, 3);
  assert.equal(leapsText(a.leaps), 'სამი ნახტომი');
});

test('difficulty thresholds', () => {
  assert.equal(levelOf({ leaps: 1, range: 7 }), 'easy');
  assert.equal(levelOf({ leaps: 2, range: 7 }), 'mid');
  assert.equal(levelOf({ leaps: 0, range: 12 }), 'mid');
  assert.equal(levelOf({ leaps: 0, range: 13 }), 'hard');
  assert.equal(levelOf({ leaps: 5, range: 5 }), 'hard');
});

test('drills fit the chant and all exist', () => {
  const all = new Set<string>();
  for (const a of [
    { leaps: 0, biggest: 0, lengths: 1, longest: 8 }, { leaps: 2, biggest: 7, lengths: 3, longest: 30 },
    { leaps: 4, biggest: 12, lengths: 2, longest: 12 },
  ]) {
    const d = drillsFor(a);
    assert.equal(d.length, 3);
    d.forEach(id => { assert.ok(findDrill(id), id); all.add(id); });
  }
  assert.deepEqual(drillsFor({ leaps: 2, biggest: 7, lengths: 3, longest: 30 }), ['m-iv-basic-sing', 'm-rhythm-dict', 'm-chain-breath']);
});

test('the AI\'s questions are cleaned; too few = none', () => {
  const ok = JSON.stringify({ questions: [{ q: 'ა?', a: 'ბ' }, { q: 'გ **?**', a: 'დ' }, { q: 'ე?', a: 'ვ' }, { q: '', a: 'x' }] });
  assert.equal(parseQuestions(ok)?.length, 3);
  assert.equal(parseQuestions(ok)?.[1].q, 'გ ?');
  assert.equal(parseQuestions('```json\n[{"q":"a","a":"b"},{"q":"a","a":"b"},{"q":"a","a":"b"}]\n```')?.length, 3);
  assert.equal(parseQuestions('[{"q":"a","a":"b"}]'), null);
  assert.equal(parseQuestions('nonsense'), null);
});

test('a stored record is read safely; the quiz is stable for a day', () => {
  assert.equal(readRecord(undefined), null);
  const r = readRecord({ approved: true, level: 'x', questions: [{ q: 'a', a: 'b' }, 5] });
  assert.equal(r?.level, 'mid');
  assert.equal(r?.questions.length, 1);
  const qs = [1, 2, 3, 4].map(i => ({ q: `q${i}`, a: `a${i}` }));
  assert.deepEqual(quizFor(qs, '2026-11-18'), quizFor(qs, '2026-11-18'));
  assert.equal(quizFor(qs, '2026-11-18').length, 2);
  assert.equal(quizFor([], 'x').length, 0);
});
