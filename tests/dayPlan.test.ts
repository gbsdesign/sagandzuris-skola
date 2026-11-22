import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoChants, moveItem, parsePlan, planKey, planList } from '../src/utils/dayPlanRules';

test('the Typikon list: each step’s chants in order, each once', () => {
  assert.deepEqual(autoChants([{ chants: ['a', 'b'] }, {}, { chants: ['b', 'c'] }]), ['a', 'b', 'c']);
});

test('a kept order wins and drops chants that no longer exist', () => {
  const known = (id: string) => id !== 'x';
  assert.deepEqual(planList(undefined, ['a', 'b'], known), ['a', 'b']);
  assert.deepEqual(planList(['b', 'x', 'a', 'b'], ['a', 'b'], known), ['b', 'a']);
});

test('moving an item', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
  assert.deepEqual(moveItem(['a', 'b', 'c'], 2, 0), ['c', 'a', 'b']);
});

test('Lado’s answer keeps only the offered chants', () => {
  const offered = new Set(['a', 'b', 'c']);
  assert.deepEqual(parsePlan('აი: {"ids":["c","z","a","c"],"note":"კვირა"}', offered), { ids: ['c', 'a'], note: 'კვირა' });
  assert.equal(parsePlan('{"ids":["z"]}', offered), null);
  assert.equal(parsePlan('არაფერი', offered), null);
  assert.equal(planKey('2026-11-23', 'liturgy'), '2026-11-23~liturgy');
});
