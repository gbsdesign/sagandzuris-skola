import test from 'node:test';
import assert from 'node:assert/strict';
import { LEAF_CAP, addDays, bunchesOf, deedsOf, harvestOf, leavesOfDay, nextBunchAt, seasonOf, vineMood, vineOf, yellowShare } from '../src/utils/vazi';
import { BUNCH_SLOTS, LEAF_SLOTS, grownTo, leafPlaces } from '../src/utils/vineShape';

test('a record gives deeds by day: habits, finished daily games, practised parts, exercises', () => {
  const deeds = deedsOf({
    habitLog: { '2026-10-30': ['prayer', 'psalms', 'prayer'], '2026-10-31': [], bad: ['x'] },
    games: { hangi: { days: { '2026-10-30': { done: true }, '2026-10-29': { done: false } } }, sitqva: { days: { '2026-10-31': { done: true } } } },
    learning: { piece: { 0: { level: 1, at: '2026-10-30' }, 1: { level: 0, at: '2026-10-31' } } },
    drillDone: { 'tip-1': '2026-10-28' },
  });
  assert.deepEqual(deeds, {
    '2026-10-30': { habits: 2, games: 1, learn: 1 },
    '2026-10-31': { games: 1, learn: 1 },
    '2026-10-28': { drills: 1 },
  });
  assert.deepEqual(deedsOf(null), {});
  assert.deepEqual(deedsOf({ habitLog: 'junk', games: [1, 2], drillDone: { x: null } }), {});
});

test('leaves a day are capped; a month gives bunches at 12, 30 and 50 leaves', () => {
  assert.equal(leavesOfDay({ habits: 20 }), LEAF_CAP);
  assert.equal(leavesOfDay(undefined), 0);
  assert.deepEqual([0, 11, 12, 29, 30, 50, 99].map(bunchesOf), [0, 0, 1, 1, 2, 3, 3]);
  assert.deepEqual([0, 12, 30, 50].map(nextBunchAt), [12, 30, 50, null]);
});

test('the season runs from November: earlier bunches are in the qvevri, this month\'s are still green', () => {
  assert.equal(seasonOf('2026-11-01'), '2026-11');
  assert.equal(seasonOf('2027-10-31'), '2026-11');
  assert.equal(seasonOf('2026-10-31'), '2025-11');
  const deeds: Record<string, { habits: number }> = {};
  // October 2026: 15 days × 2 leaves = 30 → two bunches, last season; November: 7 days × 2 = 14 → one; December so far: 6
  for (let i = 1; i <= 15; i++) deeds[`2026-10-${String(i).padStart(2, '0')}`] = { habits: 2 };
  for (let i = 1; i <= 7; i++) deeds[`2026-11-${String(i).padStart(2, '0')}`] = { habits: 2 };
  for (let i = 1; i <= 3; i++) deeds[`2026-12-${String(i).padStart(2, '0')}`] = { habits: 2 };
  deeds['2027-01-01'] = { habits: 5 }; // the future does not count
  const v = vineOf(deeds, '2026-12-05');
  assert.equal(v.leaves, 30 + 14 + 6);
  // the leaves on the vine now: 6 November – 5 December (30 days) → 6 and 7 November, 1–3 December
  assert.equal(v.recent, 4 + 6);
  assert.equal(v.cellar, 2);
  assert.deepEqual(v.ripe, [{ key: '2026-11', leaves: 14, bunches: 1 }]);
  assert.deepEqual(v.month, { key: '2026-12', leaves: 6, bunches: 0, next: 12 });
  assert.equal(v.seasonBunches, 1);
  assert.equal(v.idle, 2);
  assert.equal(v.today, 0);
  assert.equal(v.days.length, 14);
  assert.deepEqual(v.days[v.days.length - 1], { iso: '2026-12-05', leaves: 0 });
  assert.deepEqual(v.days[v.days.length - 3], { iso: '2026-12-03', leaves: 2 });
});

test('a vine left a month stands bare but keeps its wood', () => {
  const v = vineOf({ '2026-10-01': { habits: 8 }, '2026-10-02': { habits: 8 } }, '2026-11-10');
  assert.equal(v.leaves, 16);
  assert.equal(v.recent, 0);
  assert.match(vineMood(v), /ფოთოლი დაყარა/);
  assert.equal(vineOf({ '2026-10-12': { habits: 3 } }, '2026-11-10').recent, 3);
  assert.equal(vineOf({ '2026-10-11': { habits: 3 } }, '2026-11-10').recent, 0);
});

test('the leaves drawn: all of a young vine in the order it grew, a thinner one spread over all its wood', () => {
  assert.deepEqual(leafPlaces(10, 10, 2), { drawn: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], fresh: [8, 9] });
  assert.deepEqual(leafPlaces(0, 0), { drawn: [], fresh: [] });
  assert.equal(leafPlaces(5, 9).drawn.length, 5);
  const thin = leafPlaces(1000, 20, 3);
  assert.equal(thin.drawn.length, 20);
  for (let i = 1; i < thin.drawn.length; i++) assert.ok(thin.drawn[i] > thin.drawn[i - 1]);
  assert.ok(thin.drawn.every(i => i < LEAF_SLOTS.length));
  // spread: leaves near the trunk and far out on the canes alike
  assert.ok(thin.drawn.some(i => i < LEAF_SLOTS.length / 3) && thin.drawn.some(i => i >= (LEAF_SLOTS.length * 2) / 3));
  assert.equal(thin.fresh.length, 3);
  assert.ok(thin.fresh.every(i => thin.drawn.includes(i)));
  // one leaf more keeps the ones before
  const more = leafPlaces(1000, 21).drawn;
  assert.ok(thin.drawn.every(i => more.includes(i)));
});

test('a new vine has no idle days; a left one yellows more and more but never wholly', () => {
  const v = vineOf({}, '2026-11-01');
  assert.equal(v.idle, null);
  assert.equal(v.leaves, 0);
  assert.equal(yellowShare(null), 0);
  assert.equal(yellowShare(2), 0);
  assert.ok(yellowShare(3) > 0);
  assert.ok(yellowShare(30) < 1);
  for (let d = 2; d < 30; d++) assert.ok(yellowShare(d + 1) >= yellowShare(d));
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('a class\'s harvest adds up its vines', () => {
  // a: November's bunch, ripe; b: December's, still green
  const a = vineOf({ '2026-11-02': { habits: 8 }, '2026-11-03': { habits: 8 } }, '2026-12-02');
  const b = vineOf({ '2026-12-01': { habits: 8 }, '2026-12-02': { habits: 6 } }, '2026-12-02');
  assert.equal(a.seasonBunches, 1);
  assert.equal(b.seasonBunches, 1);
  assert.deepEqual(harvestOf([{ uid: 'a', vine: a }, { uid: 'b', vine: b }]), { total: 2, ripe: 1 });
});

test('the picture: leaf places grow outwards, every branch a place needs is drawn', () => {
  assert.ok(LEAF_SLOTS.length >= 50);
  for (let i = 1; i < LEAF_SLOTS.length; i++) assert.ok(LEAF_SLOTS[i].order >= LEAF_SLOTS[i - 1].order);
  assert.equal(BUNCH_SLOTS.length, 10);
  const all = grownTo(LEAF_SLOTS.length, BUNCH_SLOTS.length);
  for (const s of LEAF_SLOTS) assert.ok(all[s.branch] >= s.at, s.branch);
  // the first leaves grow on the trunk only
  assert.deepEqual(Object.keys(grownTo(2)), ['trunk']);
});
