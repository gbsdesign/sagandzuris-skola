// The iPhone app's notices (worker/reminders sendFcm): a prayer hour's words worked out on the server, and the APNs
// notice of a ring / a message. Run: node --test tests/iosPush.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { prayerMessage, apnsOf } from '../worker/reminders/reminders.js';

test('a prayer hour near: its words, its own tag and the prayer to open', () => {
  // 11:50 in Tbilisi (UTC+4) = ten minutes before the 12 o'clock prayer
  const m = prayerMessage('Asia/Tbilisi', new Date('2026-11-05T07:50:00Z'));
  assert.equal(m.body, 'დღის 12 საათის ლოცვამდე 10 წუთი დარჩა');
  assert.equal(m.tag, 'hour-12-10');
  assert.equal(m.url, '/?prayer=hour-12');
  // midnight's prayer, a minute before
  assert.equal(prayerMessage('Asia/Tbilisi', new Date('2026-11-05T19:59:00Z')).tag, 'hour-24-1');
  // no hour near: the plain line
  assert.equal(prayerMessage('Asia/Tbilisi', new Date('2026-11-05T09:00:00Z')).tag, 'prayer-hour');
  // a strange time zone falls back to Tbilisi
  assert.equal(prayerMessage('Nowhere/Else', new Date('2026-11-05T07:55:00Z')).tag, 'hour-12-5');
});

test('a ring rings with the app’s sound and buttons; its „ended“ notice replaces it quietly', () => {
  const ring = apnsOf({ kind: 'call', title: 'ნინო', body: 'გირეკავს…', tag: 'call-d-abc', url: '/?open=chat&id=abc',
    answer: '/?open=call&b=dms%2Fabc', ttl: 45, decline: { base: 'dms/abc', uid: 'u1', at: 5, t: 'sig' } });
  assert.equal(ring.payload.aps.sound, 'ring.wav');
  assert.equal(ring.payload.aps.category, 'CALL');
  assert.equal(ring.payload.aps['interruption-level'], 'time-sensitive');
  assert.equal(ring.headers['apns-collapse-id'], 'call-d-abc');
  assert.deepEqual(ring.payload.decline, { base: 'dms/abc', uid: 'u1', at: 5, t: 'sig' });
  assert.equal(ring.payload.answer, '/?open=call&b=dms%2Fabc');
  const end = apnsOf({ kind: 'call-end', title: 'ნინო', body: 'გამოტოვებული ზარი', tag: 'call-d-abc', url: '/?open=chat&id=abc', ttl: 3600 });
  assert.equal(end.payload.aps.sound, undefined);
  assert.equal(end.headers['apns-collapse-id'], 'call-d-abc');
});

test('a message keeps its text, its chat and the default sound', () => {
  const m = apnsOf({ kind: 'chat', title: 'კლასი', body: 'ნინო: გამარჯობა', tag: 'chat-c-k1', url: '/?open=chat&id=class:k1', ttl: 86400 });
  assert.deepEqual(m.payload.aps.alert, { title: 'კლასი', body: 'ნინო: გამარჯობა' });
  assert.equal(m.payload.aps.sound, 'default');
  assert.equal(m.payload.kind, 'chat');
  assert.equal(m.payload.url, '/?open=chat&id=class:k1');
});
