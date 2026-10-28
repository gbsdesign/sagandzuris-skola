import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RANGES, TASKS, pickItem, pickTask, roundSeconds, startOffset, tally } from '../src/utils/churchkhela';
import { mulberry32 } from '../src/utils/otkheuli';

test('roundSeconds stays inside the chosen range', () => {
  const rnd = mulberry32(3);
  for (const r of RANGES) {
    for (let i = 0; i < 50; i++) {
      const s = roundSeconds(r.id, rnd);
      assert.ok(s >= r.min && s <= r.max, `${r.label}: ${s}`);
    }
  }
  assert.ok(roundSeconds(99, () => 0.5) >= RANGES[1].min);
});

test('pickTask follows the mode and never repeats the last card', () => {
  assert.equal(pickTask('none', () => 0), null);
  const rnd = mulberry32(7);
  for (let i = 0; i < 30; i++) assert.equal(pickTask('sing', rnd)?.kind, 'sing');
  const first = pickTask('random', () => 0)!;
  const next = pickTask('random', () => 0, first.id)!;
  assert.notEqual(next.id, first.id);
  assert.ok(TASKS.every(t => t.text.length <= 90));
  // a mode with one card still gives that card
  assert.equal(pickTask('where', () => 0, 'nope')?.kind, 'where');
});

test('pickItem avoids the recent ones and startOffset keeps the snippet inside', () => {
  const pool = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const rnd = mulberry32(2);
  for (let i = 0; i < 20; i++) assert.equal(pickItem(pool, rnd, ['a', 'b'])?.id, 'c');
  assert.ok(pickItem(pool, rnd, ['a', 'b', 'c']));
  assert.equal(pickItem([], rnd, []), undefined);
  assert.equal(startOffset(20, 15, () => 0.9), 0);
  assert.equal(startOffset(NaN, 15, () => 0.9), 0);
  const off = startOffset(120, 20, () => 0.999);
  assert.ok(off + 20 + 10 <= 120 && off > 0);
});

test('tally counts the rounds', () => {
  const t = tally([
    { title: 'x', sub: '', task: null, ok: true },
    { title: 'y', sub: '', task: null, ok: false },
    { title: 'z', sub: '', task: null, ok: null },
  ]);
  assert.deepEqual(t, { played: 3, ok: 1, failed: 1 });
});
