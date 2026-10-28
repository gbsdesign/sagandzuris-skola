// Run: npm test  (node:test through tsx)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { teachersOf, teachersToDrop, teachersDiffer } from '../src/utils/classTeachers';

const A = { id: 'a', memberIds: ['s1', 's2'], teacherIds: ['t1', 't2'] };
const B = { id: 'b', memberIds: ['s1'], teacherIds: ['t2', 't3'] };
const OLD = { id: 'old', memberIds: ['s2'], teacherIds: ['t4'], archived: true };

test('a member is read by the teachers of all their classes, once each', () => {
  assert.deepEqual(teachersOf('s1', [A, B]), ['t1', 't2', 't3']);
  assert.deepEqual(teachersOf('s2', [A, B]), ['t1', 't2']);
  assert.deepEqual(teachersOf('s9', [A, B]), []);
});

test('an archived class gives no access', () => {
  assert.deepEqual(teachersOf('s2', [A, OLD]), ['t1', 't2']);
});

test('leaving a class drops only the teachers who lead none of the other classes', () => {
  // s1 leaves A: t2 leads B too
  assert.deepEqual(teachersToDrop('s1', A, [A, B]), ['t1']);
  // s2 leaves A: no other class
  assert.deepEqual(teachersToDrop('s2', A, [A, B]), ['t1', 't2']);
  // the left class itself never counts, even if it still lists the member
  assert.deepEqual(teachersToDrop('s1', B, [A, B]), ['t3']);
});

test('the list differs in either direction, order aside', () => {
  assert.equal(teachersDiffer(['t2', 't1'], ['t1', 't2']), false);
  assert.equal(teachersDiffer(undefined, []), false);
  assert.equal(teachersDiffer(['t1', 't4'], ['t1']), true);
  assert.equal(teachersDiffer(['t1'], ['t1', 't2']), true);
});
