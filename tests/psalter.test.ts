// Run: npm test  (node:test through tsx)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cycleOf, previousCycle, nextCycle, georgiaToday, halfIndex, ownersIn, rebase, kathismasOf, wrap,
  autoDistribute, slotState, msLeft, formatRange, nextShiftDate, readCount,
  fillDistribution, giveKanon, distributionState, changedReaders, withPast, ownersThen,
} from '../src/utils/psalter';

test('Georgian date, not the phone clock', () => {
  // 21:30 UTC on 6 Oct is already 7 Oct in Tbilisi (UTC+4)
  assert.equal(georgiaToday(new Date('2026-10-06T21:30:00Z')), '2026-10-07');
  assert.equal(georgiaToday(new Date('2026-10-06T19:59:00Z')), '2026-10-06');
});

test('two-day cycles restart on the 1st and the 15th', () => {
  assert.deepEqual(cycleOf('2026-10-01', 2), { id: '2026-10-01', start: '2026-10-01', end: '2026-10-02', half: halfIndex('2026-10-01'), days: 2 });
  assert.equal(cycleOf('2026-10-02', 2).id, '2026-10-01');
  assert.equal(cycleOf('2026-10-14', 2).id, '2026-10-13');
  assert.equal(cycleOf('2026-10-15', 2).id, '2026-10-15');
  // October has 31 days: the 15th–31st is 17 days, so the last cycle is 29–31
  assert.deepEqual([cycleOf('2026-10-31', 2).start, cycleOf('2026-10-31', 2).end], ['2026-10-29', '2026-10-31']);
  assert.equal(cycleOf('2026-10-31', 2).days, 3);
  // February 2027: 15–28 is 14 days, even
  assert.deepEqual([cycleOf('2027-02-28', 2).start, cycleOf('2027-02-28', 2).end], ['2027-02-27', '2027-02-28']);
  // a 30-day month: 15–30 is 16 days
  assert.deepEqual([cycleOf('2026-11-30', 2).start, cycleOf('2026-11-30', 2).end], ['2026-11-29', '2026-11-30']);
});

test('one-day cycles', () => {
  const c = cycleOf('2026-10-31', 1);
  assert.deepEqual([c.start, c.end, c.days], ['2026-10-31', '2026-10-31', 1]);
});

test('previous and next cycles cross months and years', () => {
  assert.equal(previousCycle(cycleOf('2026-11-01', 2), 2).id, '2026-10-29');
  assert.equal(nextCycle(cycleOf('2026-10-30', 2), 2).id, '2026-11-01');
  assert.equal(nextCycle(cycleOf('2026-12-31', 2), 2).id, '2027-01-01');
  assert.equal(previousCycle(cycleOf('2027-01-01', 1), 1).id, '2026-12-31');
});

test('kathismas move on by one on the 1st and the 15th (7 → 8, 20 → 1)', () => {
  const base = halfIndex('2026-10-01');
  const assignment = rebase({ 7: ['nino'], 20: ['giorgi'] });
  const oct1 = ownersIn(assignment, base, halfIndex('2026-10-05'));
  assert.deepEqual(kathismasOf(oct1, 'nino'), [7]);
  const oct15 = ownersIn(assignment, base, halfIndex('2026-10-20'));
  assert.deepEqual(kathismasOf(oct15, 'nino'), [8]);
  assert.deepEqual(kathismasOf(oct15, 'giorgi'), [1]);
  // ten months later everybody is back where they started
  assert.deepEqual(kathismasOf(ownersIn(assignment, base, base + 20), 'nino'), [7]);
  // and back in time too
  assert.deepEqual(kathismasOf(ownersIn(assignment, base, base - 1), 'nino'), [6]);
  assert.equal(wrap(0), 20);
  assert.equal(wrap(21), 1);
  assert.equal(wrap(-19), 1);
});

test('a distribution edited now is stored for now', () => {
  const now = halfIndex('2027-03-20');
  const owners = autoDistribute(['a', 'b', 'c']);
  const assignment = rebase(owners);
  assert.deepEqual(ownersIn(assignment, now, now), owners);
  assert.deepEqual(kathismasOf(owners, 'a'), [1, 4, 7, 10, 13, 16, 19]);
});

const people = (n: number) => Array.from({ length: n }, (_, i) => `m${i}`);

test('more than twenty readers: second readers, at most two a kathisma', () => {
  const owners = autoDistribute(people(23));
  assert.deepEqual(kathismasOf(owners, 'm0'), [1]);
  assert.deepEqual(owners[1], ['m0', 'm20']);
  assert.deepEqual(kathismasOf(owners, 'm22'), [3]);
  assert.deepEqual(distributionState(owners, people(23)).without, []);
  // past forty only the extra ones wait
  const big = autoDistribute(people(45));
  assert.ok(Object.values(big).every(l => l.length === 2));
  assert.deepEqual(distributionState(big, people(45)).without, ['m40', 'm41', 'm42', 'm43', 'm44']);
});

test('fewer than twenty readers: the round goes on, and the state says how many the busiest has', () => {
  const owners = autoDistribute(people(7));
  assert.deepEqual(kathismasOf(owners, 'm0'), [1, 8, 15]);
  assert.deepEqual(distributionState(owners, people(7)).most, 3);
  assert.deepEqual(distributionState(owners, people(7)).free, []);
});

test('filling keeps everyone in place: a newcomer takes one kathisma from the busiest reader', () => {
  const before = autoDistribute(['a', 'b', 'c']);
  const after = fillDistribution(before, ['a', 'b', 'c', 'd']);
  assert.deepEqual(kathismasOf(after, 'd'), [19]);
  assert.deepEqual(kathismasOf(after, 'a'), [1, 4, 7, 10, 13, 16]);
  assert.deepEqual(changedReaders(before, after).sort(), ['a', 'd']);
  // nothing to do → nothing changes
  assert.deepEqual(changedReaders(after, fillDistribution(after, ['a', 'b', 'c', 'd'])), []);
});

test('filling: one who left frees their kathismas, and a shared reader moves to a free one', () => {
  const twentyOne = autoDistribute(people(21)); // kathisma 1: m0 + m20
  const readers = people(21).filter(u => u !== 'm5'); // m5 (kathisma 6) is gone
  const after = fillDistribution(twentyOne, readers);
  assert.deepEqual(after[6], ['m20']);
  assert.deepEqual(after[1], ['m0']);
  assert.deepEqual(changedReaders(twentyOne, after).sort(), ['m20', 'm5']);
  // fewer than twenty: the freed kathismas go to the ones with the fewest
  const small = fillDistribution(autoDistribute(['a', 'b', 'c']), ['a', 'c']);
  assert.deepEqual(distributionState(small, ['a', 'c']).free, []);
  assert.equal(kathismasOf(small, 'a').length + kathismasOf(small, 'c').length, 20);
});

test('giving one kathisma: free first, never a third reader', () => {
  const full = autoDistribute(people(40));
  assert.equal(giveKanon(full, 'new'), null);
  assert.equal(giveKanon(full, 'm0'), null); // already reads one
  const one = giveKanon({ 1: ['a'] }, 'b')!;
  assert.deepEqual(one[2], ['b']);
});

test('history: a cycle before a change names the readers of its own distribution', () => {
  const old = { assignment: rebase(autoDistribute(['a', 'b'])), baseHalf: halfIndex('2026-10-01'), shiftDays: [1, 15] };
  const now = { assignment: rebase(autoDistribute(['c'])), baseHalf: halfIndex('2026-10-29'), shiftDays: [1, 15] };
  const log = withPast([], '2026-10-29', old)!;
  assert.equal(withPast(log, '2026-10-29', now), null); // once per cycle
  const before = cycleOf('2026-10-27', 2);
  assert.deepEqual(ownersThen(now, log, before.start, before.half)[1], ['b']); // the 15th moved a's 1 → 2
  const after = cycleOf('2026-10-29', 2);
  assert.deepEqual(ownersThen(now, log, after.start, after.half)[1], ['c']);
});

test('slot states', () => {
  assert.equal(slotState({ readBy: 'a' }, ['a'], false), 'read');
  assert.equal(slotState({ readBy: 'a' }, ['a'], true), 'read');
  assert.equal(slotState({ takenBy: 'b' }, ['a'], false), 'taken');
  assert.equal(slotState(undefined, ['a'], false), 'unread');
  assert.equal(slotState(undefined, [], false), 'free');
  assert.equal(slotState({ takenBy: 'b' }, ['a'], true), 'skipped');
  assert.equal(readCount({ 1: { readBy: 'a' }, 2: {}, 3: { readBy: 'b' }, x: { readBy: 'c' } }), 2);
});

test('time left ends at midnight after the last day, Georgian time', () => {
  const c = cycleOf('2026-10-07', 2); // 7–8 Oct
  // 8 Oct 23:00 in Tbilisi = 19:00 UTC → one hour left
  assert.equal(msLeft(c, new Date('2026-10-08T19:00:00Z')), 3600_000);
});

test('labels', () => {
  assert.equal(formatRange(cycleOf('2026-10-07', 2)), '7–8 ოქტომბერი');
  assert.equal(formatRange(cycleOf('2026-10-30', 2)), '29–31 ოქტომბერი');
  assert.equal(nextShiftDate('2026-10-07').label, '15 ოქტომბრის');
  assert.equal(nextShiftDate('2026-10-07').from, '15 ოქტომბრიდან');
  assert.equal(nextShiftDate('2026-04-20').from, '1 მაისიდან');
  assert.equal(nextShiftDate('2026-12-20').iso, '2027-01-01');
});
