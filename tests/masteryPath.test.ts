import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXTRA_DRILL_IDS, LESSON_LIBRARY, MASTERY_LEVELS, PATH_ITEMS, levelOfDrill } from '../src/data/masteryPath';
import { MASTERY_DRILLS } from '../src/data/masteryDrills';
import { ALL_DRILLS, LEVEL_DRILL_GROUPS, drillGroupTitle, findDrill } from '../src/data/vocalDrills';
import {
  EMPTY_RECORD, PASS, currentLevel, dayPlan, itemPassed, levelState, lineMarks, pathSummary, placement, recordFromDoc, type PathRecord,
} from '../src/utils/masteryPath';

// „ოსტატობის გზა“ (data/masteryPath.ts, data/masteryDrills.ts, utils/masteryPath.ts): the plan's 66 exercises in six levels,
// each a drill the sheet can open; passing, the levels, the day's plan, the entry test's placement, the record read back.

const rec = (o: Partial<PathRecord> = {}): PathRecord => ({ ...EMPTY_RECORD, ...o });

test('the path: six levels, 66 exercises as the plan numbers them, each a drill', () => {
  assert.deepEqual(MASTERY_LEVELS.map(l => l.items.length), [12, 12, 12, 14, 10, 6]);
  assert.equal(PATH_ITEMS.length, 66);
  assert.equal(new Set(PATH_ITEMS.map(x => x.id)).size, 66, 'an exercise stands once');
  for (const l of MASTERY_LEVELS) {
    l.items.forEach((x, i) => assert.equal(x.no, `${l.n}.${i + 1}`, x.id));
    assert.ok(findDrill(l.items[0].id));
    // every level but the master's has three lines at least
    if (l.n < 5) assert.ok(new Set(l.items.map(x => x.line)).size >= 3, `level ${l.n}`);
  }
  for (const x of PATH_ITEMS) assert.ok(findDrill(x.id), `${x.no} ${x.id} has a drill`);
});

test('the new drills: ids unique, each on the path or in the lessons, the right kind of exercise', () => {
  const ids = ALL_DRILLS.map(d => d.id);
  assert.equal(new Set(ids).size, ids.length, 'no id twice among all drills');
  const library = new Set(LESSON_LIBRARY.flatMap(g => g.ids));
  for (const d of MASTERY_DRILLS) {
    assert.ok(d.id.startsWith('m-'), d.id);
    assert.ok(levelOfDrill(d.id) !== null || library.has(d.id), `${d.id} is reachable`);
    assert.ok(d.lesson.why && d.lesson.how.length && d.lesson.mistakes.length && d.lesson.check, `${d.id} has a whole lesson`);
    const kinds = [d.trainer, d.open, d.read].filter(Boolean).length;
    assert.ok(kinds <= 1, `${d.id}: one kind`);
    if (kinds) assert.equal(d.exercise.steps.length, 0, `${d.id}: no timed steps`);
    else assert.ok(d.exercise.steps.length > 0, `${d.id}: timed steps`);
  }
  // a check by score needs something that scores
  for (const x of PATH_ITEMS) {
    const d = findDrill(x.id)!;
    if (x.check === 'quiz') assert.ok(d.trainer, `${x.no}: a quiz is a trainer`);
    if (x.check === 'self' || x.check === 'teacher') assert.ok(d.open || d.read, `${x.no}: ticked by the student`);
  }
});

test('the lessons: eleven tips and seven new ones; the extra drills are the old ones off the path', () => {
  const ids = LESSON_LIBRARY.flatMap(g => g.ids);
  assert.equal(ids.length, 18);
  assert.equal(ids.filter(i => i.startsWith('tip-')).length, 11);
  for (const id of ids) assert.ok(findDrill(id), id);
  for (const id of EXTRA_DRILL_IDS) { assert.ok(findDrill(id), id); assert.equal(levelOfDrill(id), null, id); }
  assert.equal(LEVEL_DRILL_GROUPS.length, 6);
  assert.equal(drillGroupTitle('m-echo3'), 'დონე 1 · ხმა და სმენა');
  assert.equal(drillGroupTitle('tip-2'), 'რჩევები');
  assert.equal(drillGroupTitle('ear-unison'), 'სმენა და ინტონაცია');
});

test('passing: a scored exercise at 80%, any other once done', () => {
  const quiz = PATH_ITEMS.find(x => x.id === 'm-higher')!;
  const timer = PATH_ITEMS.find(x => x.id === 'm-trill')!;
  assert.equal(itemPassed(quiz, rec({ scores: { 'm-higher': PASS - 1 } })), false);
  assert.equal(itemPassed(quiz, rec({ scores: { 'm-higher': PASS } })), true);
  assert.equal(itemPassed(quiz, rec({ done: { 'm-higher': true } })), false, 'done is not enough for a quiz');
  assert.equal(itemPassed(timer, rec({ done: { 'm-trill': true } })), true);
});

test('levels: closed at 80% of their exercises; the entry test skips the ones below it', () => {
  const l0 = MASTERY_LEVELS[0];
  const pass = (ids: string[]): PathRecord => rec({ scores: Object.fromEntries(ids.map(i => [i, 100])) });
  assert.equal(levelState(l0, EMPTY_RECORD).need, 10);
  assert.equal(currentLevel(EMPTY_RECORD), 0);
  assert.equal(currentLevel(pass(l0.items.slice(0, 9).map(x => x.id))), 0);
  assert.equal(currentLevel(pass(l0.items.slice(0, 10).map(x => x.id))), 1);
  assert.equal(currentLevel(rec({ start: 2 })), 2);
  assert.equal(levelState(MASTERY_LEVELS[1], rec({ start: 2 })).skipped, true);
  const all = pass(PATH_ITEMS.map(x => x.id));
  assert.equal(currentLevel(all), 5);
  assert.deepEqual(pathSummary(all), { level: 5, passed: 6, total: 6, need: 5, pct: 100 });
  assert.deepEqual(pathSummary(EMPTY_RECORD), { level: 0, passed: 0, total: 12, need: 10, pct: 0 });
});

test('a level\'s lines: all, some or none passed', () => {
  const r = rec({ scores: { 'm-hold': 90 }, done: { 'm-trill': true, 'tip-10': true, 'tip-1': true, 'm-hum': true, 'm-care': true } });
  const marks = Object.fromEntries(lineMarks(MASTERY_LEVELS[0], r).map(m => [m.line, m.mark]));
  assert.deepEqual(marks, { voice: 'some', ear: 'some', rhythm: 'none', chant: 'none' });
});

test('the day\'s plan: the warm-up, the weakest line\'s next, the chant line\'s next; a teacher\'s first', () => {
  const plan = dayPlan(EMPTY_RECORD, () => false);
  assert.equal(plan.length, 3);
  assert.deepEqual(plan.map(p => p.why), ['warmup', 'weak', 'chant']);
  assert.equal(plan[0].id, 'm-trill');
  assert.equal(plan[2].id, 'm-listen');
  const withWork = dayPlan(EMPTY_RECORD, () => false, 'ear-unison');
  assert.equal(withWork.length, 4);
  assert.equal(withWork[0].id, 'ear-unison');
  // on level 1 the warm-up is the three-minute one, and the ear line (nothing passed) is the weakest
  const l1 = dayPlan(rec({ start: 1, scores: { 'm-straight': 90 } }), () => false);
  assert.equal(l1[0].id, 'm-warmup');
  assert.equal(PATH_ITEMS.find(x => x.id === l1[1].id)!.line, 'ear');
  // an exercise done today stays in the plan
  const r = rec({ scores: { 'm-echo1': 100 } });
  const before = dayPlan(EMPTY_RECORD, () => false);
  const after = dayPlan(r, id => id === 'm-echo1');
  if (before.some(p => p.id === 'm-echo1')) assert.ok(after.some(p => p.id === 'm-echo1'));
  // the chant line passed on level 2 or later: a review
  const l2 = MASTERY_LEVELS[2];
  const chantDone = rec({ start: 2, done: Object.fromEntries(l2.items.filter(x => x.line === 'chant').map(x => [x.id, true])) });
  assert.ok(dayPlan(chantDone, () => false).some(p => p.id === 'm-review'));
});

test('the entry test: 0, 1 or 2', () => {
  const good = { hold: 0.9, higher: 1, echo1: 1, echo3: 1, intervals: 1 };
  assert.equal(placement(good), 2);
  assert.equal(placement({ ...good, hold: 0.4 }), 0);
  assert.equal(placement({ ...good, echo1: 1 / 3 }), 0);
  assert.equal(placement({ ...good, higher: 0.5 }), 1);
  assert.equal(placement({ ...good, intervals: 1 / 3 }), 1);
});

test('a record read back: scores, a teacher\'s mark winning, done days, the entry test', () => {
  const r = recordFromDoc({
    drillScore: { 'm-higher': 70, 'tip-1': 40, bad: 'x' },
    maneraReview: { 1: { v: 90, note: 'კარგია' }, 2: { v: 'x' } },
    drillDone: { 'm-trill': '2026-11-07', odd: 5 },
    mastery: { start: 1, at: 1, range: 'low' },
  }, { scores: { 'm-higher': 85 }, done: { 'm-hum': true }, start: 0 });
  assert.equal(r.scores['m-higher'], 85, 'the better of the device\'s and the record\'s');
  assert.equal(r.scores['tip-1'], 90, 'the teacher\'s mark wins');
  assert.equal(r.scores['tip-2'], undefined);
  assert.deepEqual(r.done, { 'm-hum': true, 'm-trill': true });
  assert.equal(r.start, 1, 'the record\'s test');
  assert.equal(recordFromDoc(undefined, { start: 2 }).start, 2, 'a guest\'s on the device');
  assert.equal(recordFromDoc({ mastery: { start: 9 } }).start, 5);
});
