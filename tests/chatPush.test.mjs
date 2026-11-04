// Calls and messages on the phone (worker/reminders, 2026-11-05): who hears a chat, the notice's line, the ring's signature.
// Run: node --test tests/chatPush.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { chatTargets, chatBody, ringTicket } from '../worker/reminders/reminders.js';

const cls = { name: 'კლასი ა', memberIds: ['m1', 'm2'], teacherIds: ['t1'] };

test('a class: everyone else in it; nobody outside it or in an archived class', () => {
  assert.deepEqual(chatTargets('classes', cls, 'm1'), { to: ['m2', 't1'], title: 'კლასი ა', group: true });
  assert.deepEqual(chatTargets('classes', cls, 't1')?.to, ['m1', 'm2']);
  assert.equal(chatTargets('classes', cls, 'stranger'), null);
  assert.equal(chatTargets('classes', { ...cls, archived: true }, 'm1'), null);
  assert.equal(chatTargets('classes', null, 'm1'), null);
  // an admin who does not teach it may still call or write to it
  assert.deepEqual(chatTargets('classes', cls, 'a1', ['a1'])?.to, ['m1', 'm2', 't1']);
});

test('a private chat: the other one, named by the writer', () => {
  const dm = { kind: 'teach', members: ['t1', 'm1'], names: { t1: 'ნინო', m1: 'გიორგი' } };
  assert.deepEqual(chatTargets('dms', dm, 't1'), { to: ['m1'], title: 'ნინო', group: false });
  assert.deepEqual(chatTargets('dms', dm, 'm1'), { to: ['t1'], title: 'გიორგი', group: false });
  assert.equal(chatTargets('dms', dm, 'x'), null);
});

test('the administration: the member hears „ადმინისტრაცია“, the staff hear the member', () => {
  const dm = { kind: 'admin', members: ['m1'], names: { m1: 'გიორგი' } };
  const staff = ['s1', 's2'];
  assert.deepEqual(chatTargets('dms', dm, 's1', staff), { to: ['m1'], title: 'ადმინისტრაცია', group: false });
  assert.deepEqual(chatTargets('dms', dm, 'm1', staff), { to: ['s1', 's2'], title: 'გიორგი', group: false });
  assert.equal(chatTargets('dms', dm, 'x', staff), null);
});

test('a notice line: the text (short), or what kind of message it is', () => {
  assert.equal(chatBody({ kind: 'text', text: '  გამარჯობა\n  ყველას ' }), 'გამარჯობა ყველას');
  assert.equal(chatBody({ kind: 'text', text: 'ა'.repeat(200) }).length, 140);
  assert.equal(chatBody({ kind: 'voice' }), '🎤 ხმოვანი შეტყობინება');
  assert.equal(chatBody({ kind: 'draw', text: 'x' }), '🎨 გამოიცანი, რა დავხატე!');
  assert.equal(chatBody({ kind: 'work' }), '📝 დავალება შენთვის');
  assert.equal(chatBody({ kind: 'work', text: 'ქრისტე აღდგა' }), '📝 დავალება: ქრისტე აღდგა');
  assert.equal(chatBody({ kind: 'note', text: 'კარგია!' }), '📌 კარგია!');
});

test('a ring signature belongs to one call and one person', async () => {
  const env = { VAPID_PRIVATE_JWK: '{"d":"secret"}' };
  const t = await ringTicket(env, 'dms/a_b', 'm1', 1000);
  assert.equal(await ringTicket(env, 'dms/a_b', 'm1', 1000), t);
  assert.notEqual(await ringTicket(env, 'dms/a_b', 'm2', 1000), t);
  assert.notEqual(await ringTicket(env, 'dms/a_b', 'm1', 1001), t);
  assert.match(t, /^[A-Za-z0-9_-]{43}$/);
});
