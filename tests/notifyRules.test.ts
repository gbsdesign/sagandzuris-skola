import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOTIFY_DEFAULTS, inQuiet, prefsOf } from '../src/utils/notifyRules';

test('prefsOf fills what is missing and drops broken values', () => {
  assert.deepEqual(prefsOf(undefined), NOTIFY_DEFAULTS);
  const p = prefsOf({ summary: true, at: '7:00', items: { feast: true, chat: 'no' }, from: '23:30' });
  assert.equal(p.summary, true);
  assert.equal(p.at, '09:00');
  assert.equal(p.items.feast, true);
  assert.equal(p.items.chat, true);
  assert.equal(p.from, '23:30');
  assert.equal(p.to, '08:00');
});

test('inQuiet: over midnight, within a day, and off', () => {
  const night = { quiet: true, from: '22:00', to: '08:00' };
  assert.equal(inQuiet(night, 22 * 60), true);
  assert.equal(inQuiet(night, 3 * 60), true);
  assert.equal(inQuiet(night, 8 * 60), false);
  assert.equal(inQuiet(night, 12 * 60), false);
  const day = { quiet: true, from: '13:00', to: '15:00' };
  assert.equal(inQuiet(day, 14 * 60), true);
  assert.equal(inQuiet(day, 15 * 60), false);
  assert.equal(inQuiet({ ...night, quiet: false }, 23 * 60), false);
  assert.equal(inQuiet({ quiet: true, from: '10:00', to: '10:00' }, 600), false);
});
