import { test } from 'node:test';
import assert from 'node:assert/strict';
import { betterRun, parseBest } from '../src/utils/soloRun';

// A quick game alone (utils/soloRun.ts): the best run is the one with more points, then less time; a kept best read back.

test('alone: a better run has more points, then less time; a kept best read back', () => {
  assert.ok(betterRun({ score: 5000, ms: 60_000 }, null));
  assert.ok(betterRun({ score: 5000, ms: 60_000 }, { score: 4900, ms: 10_000 }));
  assert.ok(betterRun({ score: 5000, ms: 50_000 }, { score: 5000, ms: 60_000 }));
  assert.ok(!betterRun({ score: 5000, ms: 60_000 }, { score: 5000, ms: 60_000 }));
  assert.deepEqual(parseBest({ score: 1, right: 1, ms: 5, at: '2026-11-01' }), { score: 1, right: 1, ms: 5, at: '2026-11-01' });
  assert.equal(parseBest({ score: 'x' }), null);
  assert.equal(parseBest(null), null);
});
