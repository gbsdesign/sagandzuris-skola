// The error log's pure part (src/utils/errorLogCore.ts): nothing personal is kept, noise is dropped, one bug = one line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allow, buildEntry, deviceKind, fingerprint, isNoise, scrub, shortStack } from '../src/utils/errorLogCore';

test('scrub drops what is personal or changing', () => {
  assert.equal(scrub('no user nino.beridze@gmail.com here'), 'no user …@… here');
  assert.equal(scrub('doc students/aB3dE5fG7hJ9kL1mN2pQ4rS6tU8 missing'), 'doc students/… missing');
  assert.equal(scrub('typed "გამარჯობა ნინო" failed'), 'typed "…" failed');
  assert.equal(scrub("reading 'someLongPropertyName'"), "reading 'someLongPropertyName'");
  assert.equal(scrub('at 1731912345678 ms'), 'at # ms');
  assert.equal(scrub('GET https://site.ge/a/b?token=x#y failed'), 'GET https://site.ge/a/b failed');
  assert.equal(scrub('at vendor-firebase-Bx8a7KQz9.js:1:2'), 'at vendor-firebase-Bx8a7KQz9.js:1:2');
  assert.equal(scrub('  two\n  lines  '), 'two lines');
});

test('shortStack keeps file names only, in both stack styles', () => {
  const v8 = 'TypeError: x is not a function\n    at go (https://sagandzureli.ge/assets/index-AbC123xy.js:1:2345)\n    at https://sagandzureli.ge/assets/vendor-Zz9.js:2:10';
  assert.equal(shortStack(v8), 'at go (index-AbC123xy.js:1:2345)\nat vendor-Zz9.js:2:10');
  const safari = 'go@https://sagandzureli.ge/assets/index-AbC123xy.js:1:2345\n@https://sagandzureli.ge/assets/index-AbC123xy.js:1:99';
  assert.equal(shortStack(safari), 'go@index-AbC123xy.js:1:2345\n@index-AbC123xy.js:1:99');
  assert.equal(shortStack(undefined), '');
  assert.equal(shortStack('a\nb\nc', 2).split('\n').length, 2);
});

test('noise is not the app’s bug', () => {
  for (const m of ['ResizeObserver loop completed with undelivered notifications.', 'Script error.', 'AbortError: The user aborted a request.',
    'TypeError: Failed to fetch', 'Load failed', 'FirebaseError: Failed to get document because the client is offline.',
    'NotAllowedError: Permission denied', 'Failed to fetch dynamically imported module: /assets/x.js', 'Importing a module script failed.']) {
    assert.ok(isNoise(m, ''), m);
  }
  assert.ok(isNoise('x is undefined', 'f@chrome-extension://abc/content.js:1:1'));
  assert.ok(!isNoise("TypeError: Cannot read properties of undefined (reading 'map')", 'at go (index.js:1:2)'));
});

test('one bug, one fingerprint across builds', () => {
  const a = fingerprint('error', 'x is not a function', 'at go (index-AbC123xy.js:1:2345)\nat run (index-AbC123xy.js:1:99)');
  const b = fingerprint('error', 'x is not a function', 'at go (index-Qw77Er88.js:1:3001)\nat run (index-Qw77Er88.js:1:150)');
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{14}$/);
  assert.notEqual(a, fingerprint('error', 'y is not a function', 'at go (index-AbC123xy.js:1:2345)'));
  assert.notEqual(a, fingerprint('promise', 'x is not a function', 'at go (index-AbC123xy.js:1:2345)\nat run (index-AbC123xy.js:1:99)'));
  // a number inside the message does not split one bug in many
  assert.equal(fingerprint('error', 'item 3 missing', ''), fingerprint('error', 'item 17 missing', ''));
});

test('the kind of device and nothing more', () => {
  const android = 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36';
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
  const pc = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0';
  const samsung = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36';
  assert.equal(deviceKind(android, null), 'android chrome');
  assert.equal(deviceKind(android, 'android'), 'android-app');
  assert.equal(deviceKind(iphone, null), 'ios safari');
  assert.equal(deviceKind(iphone, 'ios'), 'ios-app');
  assert.equal(deviceKind(pc, null), 'desktop firefox');
  assert.equal(deviceKind(samsung, null), 'android samsung');
});

const base = { where: 'gz', ver: '2026-11-18 10:00', dev: 'android chrome', now: '2026-11-18T06:00:00.000Z' };

test('anything thrown becomes one short line within the rules’ limits', () => {
  const e = new TypeError("Cannot read properties of undefined (reading 'map')");
  const line = buildEntry({ kind: 'error', error: e, ...base })!;
  assert.equal(line.msg, "TypeError: Cannot read properties of undefined (reading 'map')");
  assert.equal(line.count, 1);
  assert.equal(line.first, base.now);
  assert.match(line.id, /^[0-9a-f]{14}$/);
  assert.equal(buildEntry({ kind: 'promise', error: 'plain words', ...base })!.msg, 'plain words');
  const fb = buildEntry({ kind: 'report', error: { code: 'permission-denied', message: 'Missing or insufficient permissions.' }, ...base })!;
  assert.equal(fb.msg, 'permission-denied: Missing or insufficient permissions.');
  assert.equal(buildEntry({ kind: 'error', error: new Error('Failed to fetch'), ...base }), null);
  assert.equal(buildEntry({ kind: 'error', error: '', ...base }), null);
  assert.equal(buildEntry({ kind: 'error', error: undefined, ...base }), null);
  const long = buildEntry({ kind: 'react', error: new Error('x'.repeat(900)), extraStack: '\n    at A\n'.repeat(80), where: 'p'.repeat(90), ver: 'v'.repeat(60), dev: 'd', now: base.now })!;
  assert.ok(long.msg.length <= 300 && long.stack.length <= 1200 && long.where.length <= 60 && long.ver.length <= 40);
  assert.ok(!JSON.stringify(buildEntry({ kind: 'error', error: new Error('user ana@x.ge not found'), ...base })).includes('ana@x.ge'));
});

test('a flood is held back: once a load, five a load, twenty a day', () => {
  let s = { seen: [] as string[], day: '2026-11-18', n: 0 };
  let r = allow(s, 'a', '2026-11-18'); assert.ok(r.ok); s = r.state;
  r = allow(s, 'a', '2026-11-18'); assert.ok(!r.ok);
  for (const id of ['b', 'c', 'd', 'e']) { r = allow(s, id, '2026-11-18'); assert.ok(r.ok); s = r.state; }
  assert.ok(!allow(s, 'f', '2026-11-18').ok);
  assert.ok(!allow({ seen: [], day: '2026-11-18', n: 20 }, 'g', '2026-11-18').ok);
  assert.ok(allow({ seen: [], day: '2026-11-17', n: 20 }, 'g', '2026-11-18').ok);
});
