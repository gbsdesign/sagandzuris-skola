import test from 'node:test';
import assert from 'node:assert/strict';
import { MASTERY_LEVELS } from '../src/data/masteryPath';
import { EMPTY_RECORD, type PathRecord } from '../src/utils/masteryPath';
import { certLevels, closedOn, dateText, remainingLine, shortTitle, spanWeeks, teacherMarked, timeLeft, unseenCert } from '../src/utils/levelsView';

const l0 = MASTERY_LEVELS[0];
const rec = (ids: string[], start = 0): PathRecord => ({ ...EMPTY_RECORD, start, done: Object.fromEntries(ids.map(i => [i, true])), scores: Object.fromEntries(ids.map(i => [i, 90])) });

test('span weeks', () => {
  assert.deepEqual(spanWeeks('2–4 კვირა'), { lo: 2, hi: 4 });
  assert.equal(spanWeeks('უვადო'), null);
});

test('time left', () => {
  assert.equal(timeLeft('1–2 თვე', 7, 12), '≈ 3 კვირა');
  assert.equal(timeLeft('2–4 კვირა', 11, 12), '1 კვირაზე ნაკლები');
  assert.equal(timeLeft('6–12 თვე', 0, 10), '≈ 9 თვე');
  assert.equal(timeLeft('უვადო', 1, 10), null);
});

test('remaining line', () => {
  const name = (id: string) => id;
  const ids = l0.items.map(x => x.id);
  assert.equal(remainingLine(l0, rec(ids.slice(0, 9)), name), 'ამ დონის დასასრულებლად დაგრჩა: m-listen.'.replace('m-listen', ids[9]) );
  assert.match(remainingLine(l0, rec(ids.slice(0, 8)), name)!, /და .+\.$/);
  assert.match(remainingLine(l0, rec([]), name)!, /და კიდევ 8\.$/);
  assert.equal(remainingLine(l0, rec(ids), name), null);
});

test('short title', () => assert.equal(shortTitle('უნისონი — ერთ ბგერაში შერწყმა'), 'უნისონი'));

test('cert levels skip the test-skipped', () => {
  const ids = l0.items.map(x => x.id);
  assert.deepEqual(certLevels(rec(ids)), [0]);
  assert.deepEqual(certLevels(rec([], 1)), []);
});

test('closed on = the latest day', () => {
  const ids = l0.items.map(x => x.id);
  const days = { [ids[0]]: '2026-11-01', [ids[3]]: '2026-11-09', [ids[4]]: '2026-11-05' };
  assert.equal(closedOn(l0, rec(ids), days), '2026-11-09');
  assert.equal(closedOn(l0, rec(ids), {}), null);
});

test('teacher marked', () => {
  const ids = l0.items.map(x => x.id);
  assert.equal(teacherMarked(l0, rec(ids), new Set(['tip-10'])), true);
  assert.equal(teacherMarked(l0, rec(ids), new Set()), false);
});

test('unseen cert', () => {
  assert.deepEqual(unseenCert([0], null), { show: null, keep: [0] });
  assert.deepEqual(unseenCert([0, 1], [0]), { show: 1, keep: [0, 1] });
  assert.equal(unseenCert([0], [0]).show, null);
});

test('date text', () => assert.equal(dateText('2026-11-18'), '18 ნოემბერი, 2026'));
