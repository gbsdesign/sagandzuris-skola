// Run: npm test  (node:test through tsx)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, showPhone, validBirth, profileComplete } from '../src/utils/profileFields';

test('Georgian phone numbers in the ways people type them', () => {
  for (const typed of ['599 12 34 56', '599123456', '+995 599 12 34 56', '995599123456', '00995 599 123 456', '0 599 12 34 56', '(599) 12-34-56']) {
    assert.equal(normalizePhone(typed), '+995599123456', typed);
  }
  assert.equal(showPhone('+995599123456'), '+995 599 12 34 56');
});

test('foreign numbers keep their code; nonsense is refused', () => {
  assert.equal(normalizePhone('+1 202 555 0123'), '+12025550123');
  assert.equal(normalizePhone('0049 151 2345678'), '+491512345678');
  assert.equal(showPhone('+12025550123'), '+12025550123');
  for (const bad of ['', '123', '59912345', 'ნომერი', '+12']) assert.equal(normalizePhone(bad), null, bad);
});

test('birth dates', () => {
  assert.ok(validBirth({ year: 1950, month: 2, day: 28 }));
  assert.ok(validBirth({ year: 2000, month: 2, day: 29 }));
  assert.ok(!validBirth({ year: 2001, month: 2, day: 29 }));
  assert.ok(!validBirth({ year: 1990, month: 4, day: 31 }));
  assert.ok(!validBirth({ year: 0, month: 1, day: 1 }));
  assert.ok(!validBirth({ year: new Date().getFullYear() + 1, month: 1, day: 1 }));
});

const full = {
  profile: {
    firstName: 'ნინო', lastName: 'ბერიძე', birthDate: { year: 1956, month: 3, day: 7 }, region: 'იმერეთი', city: 'ქუთაისი',
    phone: '+995599123456', experienceLevel: ['ვგალობ'], voices: ['2'],
  },
};

test('a profile is complete only with every field', () => {
  assert.ok(profileComplete(full));
  const without = (patch: Record<string, unknown>) => ({ profile: { ...full.profile, ...patch } });
  assert.ok(!profileComplete(without({ lastName: 'Beridze' })));
  assert.ok(!profileComplete(without({ region: 'ქართლი' })), 'free-text region from the old card');
  assert.ok(!profileComplete(without({ city: '' })));
  assert.ok(!profileComplete(without({ phone: '' })));
  assert.ok(!profileComplete(without({ experienceLevel: [] })));
  assert.ok(profileComplete(without({ experienceLevel: 'დამწყები' })), 'old single-string status');
  assert.ok(!profileComplete(without({ voices: [] })));
  assert.ok(profileComplete({ ...without({ voices: [] }), firstMeeting: { voiceUnknown: true } }), '"არ ვიცი"');
  assert.ok(!profileComplete(null));
});

test('the old card default 2000-01-01 counts only once confirmed in the first meeting', () => {
  const placeholder = { profile: { ...full.profile, birthDate: { year: 2000, month: 1, day: 1 } } };
  assert.ok(!profileComplete(placeholder));
  assert.ok(profileComplete({ ...placeholder, firstMeeting: { at: '2026-10-06' } }));
});
