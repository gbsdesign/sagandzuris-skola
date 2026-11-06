import { test } from 'node:test';
import assert from 'node:assert/strict';
import { duplicatesOf, pairKey, whyLabel } from '../src/utils/duplicates';

const people = [
  { userId: 'a', name: 'გიორგი ჩუგოშვილი', phone: '+995 599 12 34 56' },
  { userId: 'b', name: 'გიორგი ჩუგოშვილი' },
  { userId: 'c', name: 'შემოქმედი საზოგადოება', phone: '599123456' },
  { userId: 'd', name: 'ნინო' },
  { userId: 'e', name: 'ნინო' },
];

test('the same phone or the same full name', () => {
  const d = duplicatesOf(people);
  assert.deepEqual(d.get('a'), [{ uid: 'c', why: 'phone' }, { uid: 'b', why: 'name' }]);
  assert.deepEqual(d.get('c'), [{ uid: 'a', why: 'phone' }]);
  assert.equal(d.has('d'), false); // one word is no name
});

test('a pair marked as two people is left out', () => {
  const d = duplicatesOf(people, new Set([pairKey('c', 'a')]));
  assert.deepEqual(d.get('a'), [{ uid: 'b', why: 'name' }]);
  assert.equal(d.has('c'), false);
});

test('the row says the phone first', () => {
  assert.equal(whyLabel([{ why: 'name' }, { why: 'phone' }]), 'იგივე ტელეფონი');
  assert.equal(whyLabel([{ why: 'name' }]), 'იგივე სახელი');
});
