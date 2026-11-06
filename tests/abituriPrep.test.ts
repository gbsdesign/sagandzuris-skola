// Run: npx tsx --test tests/abituriPrep.test.ts
// „ჩემი მომზადება“: each exam's share and the one next step.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { examStates, nextStep, PRACTICE_GOAL, QUIZ_GOAL, type PrepInput } from '../src/utils/abituriPrep';
import type { AbituriProgress } from '../src/hooks/useAbituriProgress';

const empty = (): AbituriProgress => ({ lessons: [], pieces: [], docs: [], drills: {}, tests: [] });
const pieces = [{ key: 'chant:ა', title: 'ა' }, { key: 'boys:ბ', title: 'ბ' }];
const lessons = [{ id: 'l1', title: 'ნოტები' }, { id: 'l2', title: 'ტონი' }];
const input = (progress: AbituriProgress, more: Partial<PrepInput> = {}): PrepInput => ({ progress, pieces, lessons, docsCount: 3, ...more });

test('nothing done: every share 0, the first step is the first piece', () => {
  const states = examStates(input(empty()));
  assert.deepEqual(states.map(s => s.share), [0, 0, 0, 0]);
  assert.ok(states.every(s => !s.done));
  assert.deepEqual(nextStep(input(empty())), { tab: 'program', id: 'piece-chant:ა', label: 'ისწავლე: ა' });
});

test('the next step goes to the exam furthest behind', () => {
  const p = { ...empty(), pieces: ['chant:ა'] }; // I exam at 1/2, the rest at 0 → theory (first of the ties)
  assert.equal(nextStep(input(p)).tab, 'theory');
  assert.equal(nextStep(input(p)).id, 'lesson-l1');
  const q = { ...p, lessons: ['l1'], drills: { colloquium: [5, 9] as [number, number] } };
  assert.equal(nextStep(input(q)).tab, 'admission');
});

test('theory: lessons, then practice, then the mock test', () => {
  const done = { ...empty(), pieces: ['chant:ა', 'boys:ბ'], docs: [0, 1, 2], drills: { colloquium: [QUIZ_GOAL, QUIZ_GOAL] as [number, number] } };
  assert.equal(nextStep(input(done)).id, 'lesson-l1');
  const l = { ...done, lessons: ['l1', 'l2'] };
  assert.equal(nextStep(input(l)).id, 'trainer');
  const d = { ...l, drills: { ...l.drills, mode: [PRACTICE_GOAL, PRACTICE_GOAL] as [number, number] } };
  assert.equal(nextStep(input(d)).id, 'mock');
  const t = { ...d, tests: [{ at: 1, score: 30, max: 32, parts: [] }] };
  assert.equal(nextStep(input(t)).label, 'ყველაფერი მზადაა — გაიმეორე პროგრამა');
  assert.ok(examStates(input(t)).every(s => s.done));
});

test('no song list yet: the I exam asks for it and the lessons may still be loading', () => {
  const s = examStates(input(empty(), { pieces: [], lessons: null }));
  assert.equal(s[0].note, 'აირჩიე შენი სია');
  assert.equal(s[1].share, 0);
  assert.equal(nextStep(input(empty(), { pieces: [], lessons: null })).tab, 'program');
});
