import { test } from 'node:test';
import assert from 'node:assert/strict';
import { examCount, examTakeId, missSentence, nearEnough, parseExamTakeId, NEAR_SENTENCE, FAR_SENTENCE } from '../src/utils/aiExam';

test('notes counted at half a credit', () => {
  assert.deepEqual(examCount([1, 0.5, 0.49, 0, 1]), { hit: 3, total: 5 });
  assert.deepEqual(examCount([]), { hit: 0, total: 0 });
});

test('take id round trip', () => {
  const id = examTakeId('v-14-1', '2');
  assert.equal(id, 'exam~v-14-1~2');
  assert.deepEqual(parseExamTakeId(id), { variantId: 'v-14-1', voice: '2' });
  assert.equal(parseExamTakeId('learn~v-1~0'), null);
});

test('a kind sentence', () => {
  assert.equal(nearEnough(40, 52), true);
  assert.equal(nearEnough(10, 52), false);
  assert.equal(missSentence(40, 52), NEAR_SENTENCE);
  assert.equal(missSentence(10, 52), FAR_SENTENCE);
});
