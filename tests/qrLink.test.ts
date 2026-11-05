// Run: npx tsx --test tests/qrLink.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qrTarget } from '../src/utils/qrLink';

const known = (vid: string) => vid === 'v-1';
const here = 'https://sagandzuris-skola.pages.dev/?c=a&v=v-9';

test('a chant of the app opens in place, from any of the school sites', () => {
  for (const host of ['sagandzuris-skola.pages.dev', 'sagandzureli.ge', 'www.sagandzureli.ge', 'abc123.sagandzuris-skola.pages.dev'])
    assert.deepEqual(qrTarget(` https://${host}/?c=x&v=v-1 \n`, here, known), { kind: 'chant', vid: 'v-1' });
  assert.deepEqual(qrTarget('http://localhost:5173/?c=x&v=v-1', 'http://localhost:5173/', known), { kind: 'chant', vid: 'v-1' });
});

test('other pages of the app keep their address', () => {
  assert.deepEqual(qrTarget('https://sagandzureli.ge/?p=2026-11-10~a,b', here, known), { kind: 'app', path: '/?p=2026-11-10~a,b' });
  assert.deepEqual(qrTarget('https://sagandzureli.ge/?c=x&v=gone', here, known), { kind: 'app', path: '/?c=x&v=gone' });
});

test('another site or plain words are not opened by themselves', () => {
  assert.deepEqual(qrTarget('https://example.com/?v=v-1', here, known), { kind: 'link', url: 'https://example.com/?v=v-1' });
  assert.deepEqual(qrTarget('https://sagandzureli.ge.evil.com/', here, known).kind, 'link');
  assert.deepEqual(qrTarget('გამარჯობა', here, known), { kind: 'text', text: 'გამარჯობა' });
  assert.deepEqual(qrTarget('javascript:alert(1)', here, known).kind, 'text');
});
