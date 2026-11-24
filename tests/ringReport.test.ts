// Whom a call's ring reached, in the call screen's words (src/utils/ringReport.ts, 2026-11-24).
// Run: npx tsx --test tests/ringReport.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { kindsLine, reachedOf, rowsOf, stateOf } from '../src/utils/ringReport';

const p = (uid: string, phones: number, ok: number, quiet = false, why: string[] = [], kinds: string[] = []) =>
  ({ uid, phones, ok, quiet, why, kinds });

test('a person\'s state: rang · quiet hours · no phone for calls · refused', () => {
  assert.equal(stateOf(p('a', 2, 1)), 'rang');
  assert.equal(stateOf(p('b', 1, 0, true)), 'quiet');
  assert.equal(stateOf(p('c', 0, 0)), 'noPhone');
  assert.equal(stateOf(p('d', 1, 0, false, ['android:SENDER_ID_MISMATCH'])), 'failed');
});

test('the rows: those not reached first, then by name; names from the class, else „წევრი“', () => {
  const rows = rowsOf([p('a', 1, 1), p('b', 0, 0), p('c', 1, 0, false, ['web:410']), p('d', 1, 1)], { a: 'ნინო', b: 'გიორგი', c: 'ანა' });
  assert.deepEqual(rows.map(r => [r.name, r.state]), [['ანა', 'failed'], ['გიორგი', 'noPhone'], ['ნინო', 'rang'], ['წევრი', 'rang']]);
  assert.deepEqual(reachedOf(rows), { rang: 2, all: 4 });
});

test('where it rang, in words', () => {
  assert.equal(kindsLine(['android']), 'აპში');
  assert.equal(kindsLine(['android', 'web']), 'აპში და ბრაუზერში');
  assert.equal(kindsLine(['ios']), 'iPhone-ის აპში');
});
