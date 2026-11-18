import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aiVoices, hitLine, passed, triedToday, withAiPasses } from '../src/utils/aiPass';

test('passed at 90 %', () => {
  assert.equal(passed(49, 52), true);
  assert.equal(passed(46, 52), false);
  assert.equal(passed(0, 0), false);
});

test('AI passes join the teachers confirmations', () => {
  const pass = { v1: { '2': { at: 'x', hit: 9, total: 10 } }, v2: {} };
  assert.deepEqual(aiVoices(pass, 'v1'), ['2']);
  assert.deepEqual(withAiPasses({ v1: ['1'], v3: ['3'] }, pass), { v1: ['1', '2'], v3: ['3'] });
  assert.deepEqual(withAiPasses({}, null), {});
});

test('one exam a day, and the words', () => {
  assert.equal(triedToday({ 'v1:2': '2026-11-18' }, 'v1', '2', '2026-11-18'), true);
  assert.equal(triedToday({ 'v1:2': '2026-11-17' }, 'v1', '2', '2026-11-18'), false);
  assert.equal(hitLine(49, 52), '52 ნოტიდან 49 ზუსტად');
});
