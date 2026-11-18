import test from 'node:test';
import assert from 'node:assert/strict';
import { memberWeek, practiceLabel, weekReport } from '../src/utils/weekReport';

const today = '2026-11-18';
const days = (o: Record<string, [number, number, number]>) =>
  ({ aiLesson: { days: Object.fromEntries(Object.entries(o).map(([d, [min, learned, reviews]]) => [d, { min, learned, reviews }])) } });

test('good: lessons of the last seven days only', () => {
  const r = memberWeek({ uid: 'a', name: 'ნინო', data: days({ '2026-11-18': [10, 1, 2], '2026-11-12': [5, 1, 0], '2026-11-11': [30, 9, 9] }) }, today);
  assert.deepEqual([r.lessons, r.minutes, r.newPhrases, r.status], [2, 15, 2, 'good']);
  assert.equal(r.line, '2 გაკვეთილი · 2 ახალი ფრაზა');
});

test('skip: no lesson in the week', () => {
  const r = memberWeek({ uid: 'b', name: 'მარიამი', data: days({ '2026-11-01': [10, 1, 0] }) }, today);
  assert.equal(r.status, 'skip');
  assert.equal(r.line, 'ამ კვირაში არ უვარჯიშია');
  assert.equal(memberWeek({ uid: 'c', name: 'x', data: null }, today).status, 'skip');
});

test('help: a weak leap or mostly low takes', () => {
  const base = days({ '2026-11-17': [10, 0, 1] });
  const leap = memberWeek({ uid: 'g', name: 'გიორგი', data: { ...base, aiNote: { misses: { '62>67': { n: 3, last: '2026-11-17' } } } } }, today);
  assert.equal(leap.status, 'help');
  assert.equal(leap.line, '1 გაკვეთილი · გაიჭედა');
  const takes = [1, 2, 3].map(i => ({ d: '2026-11-1' + (4 + i), p: 'a~0', h: 1, n: 6 }));
  assert.equal(memberWeek({ uid: 'g', name: 'გ', data: { ...base, aiNote: { takes } } }, today).status, 'help');
  const fine = [1, 2, 3].map(i => ({ d: '2026-11-1' + (4 + i), p: 'a~0', h: 5, n: 6 }));
  assert.equal(memberWeek({ uid: 'g', name: 'გ', data: { ...base, aiNote: { takes: fine } } }, today).status, 'good');
});

test('totals and hours label', () => {
  assert.equal(practiceLabel(40), '40 წთ');
  assert.equal(practiceLabel(300), '5 სთ');
  assert.equal(practiceLabel(90), '1,5 სთ');
  const { totals } = weekReport([
    { uid: 'a', name: 'ა', data: days({ '2026-11-18': [30, 1, 0] }) },
    { uid: 'b', name: 'ბ', data: days({ '2026-11-17': [30, 1, 0], '2026-11-16': [30, 0, 0] }) },
  ], today);
  assert.deepEqual([totals.members, totals.lessons, totals.minutes, totals.practice], [2, 3, 90, '1,5 სთ']);
});
