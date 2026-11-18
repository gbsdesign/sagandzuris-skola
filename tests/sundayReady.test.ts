import test from 'node:test';
import assert from 'node:assert/strict';
import { activeFocus, comingSunday, dayName, focusOf, groupChants, readyOf, showSundayEntry, type Knowledge } from '../src/utils/sundayReady';

const rec = (level: number, at: string, due?: string) => ({ best: 90, level, due, at });
const base = (o: Partial<Knowledge> = {}): Knowledge => ({ learning: {}, parts: {}, path: {}, confirmed: {}, today: '2026-11-18', ...o });

test('the coming Sunday, and when the line shows', () => {
  assert.equal(comingSunday('2026-11-18'), '2026-11-22'); // a Wednesday
  assert.equal(comingSunday('2026-11-22'), '2026-11-22'); // the Sunday itself
  assert.equal(comingSunday('2026-11-23'), '2026-11-29');
  assert.equal(comingSunday('2026-12-30'), '2027-01-03');
  assert.equal(dayName('2026-11-22'), '22 ნოემბერი');
  assert.deepEqual(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-20', '2026-11-21', '2026-11-22'].map(showSundayEntry),
    [false, false, true, true, true, true]);
});

test('chants of a list: one per chant, unknown ones left out', () => {
  const books: Record<string, { key: string; title: string; vids: string[] }> = {
    a1: { key: 'A', title: 'ა', vids: ['a1', 'a2'] }, a2: { key: 'A', title: 'ა', vids: ['a1', 'a2'] }, b1: { key: 'B', title: 'ბ', vids: ['b1'] },
  };
  const got = groupChants(['b1', 'x', 'a2', 'a1'], v => books[v] ?? null);
  assert.deepEqual(got.map(c => `${c.key}:${c.pick}`), ['B:b1', 'A:a2']);
});

test('known, cold and new', () => {
  const chants = groupChants(['k', 'c', 'n', 'm', 'p'], v => ({ key: v, title: v, vids: [v] }));
  const k = base({
    learning: {
      k: { 0: rec(1, '2026-11-15', '2026-11-20'), 1: rec(1, '2026-11-16', '2026-11-20') },
      c: { 0: rec(1, '2026-11-06', '2026-11-07') },
      p: { 0: rec(1, '2026-11-17', '2026-11-18'), 1: rec(0, '2026-11-17') }, // one phrase still not learned
    },
    parts: { k: 2, c: 1, p: 2 },
    path: { m: { voices: ['2'], isLearned: true } },
  });
  const r = readyOf(chants, k);
  assert.deepEqual(r.rows.map(x => x.state), ['known', 'old', 'new', 'known', 'new']);
  assert.equal(r.rows[1].days, 12);
  assert.equal(r.known, 3);
  assert.equal(r.total, 5);
});

test('a confirmed voice counts; the member\'s own version wins over the default', () => {
  const chants = groupChants(['v1'], () => ({ key: 'X', title: 'X', vids: ['v1', 'v2'] }));
  assert.equal(readyOf(chants, base({ confirmed: { v2: ['1'] } })).rows[0].state, 'known');
  assert.equal(readyOf(chants, base({ confirmed: { v2: ['1'] } })).rows[0].piece, 'v2');
  assert.equal(readyOf(chants, base()).rows[0].piece, 'v1');
  const learned = base({ learning: { v2: { 0: rec(1, '2026-11-17', '2026-11-18') } }, parts: { v2: 1 } });
  assert.equal(readyOf(chants, learned).rows[0].piece, 'v2');
});

test('the wish: new first, then cold; ends after the Sunday', () => {
  const rows = [
    { key: 'a', title: 'a', piece: 'a', state: 'known' as const },
    { key: 'b', title: 'b', piece: 'b', state: 'old' as const, days: 9 },
    { key: 'c', title: 'c', piece: 'c', state: 'new' as const },
  ];
  const f = focusOf(rows, '2026-11-22');
  assert.deepEqual(f, { until: '2026-11-22', pieces: ['c', 'b'] });
  assert.deepEqual(activeFocus(f, '2026-11-22'), ['c', 'b']);
  assert.deepEqual(activeFocus(f, '2026-11-23'), []);
  assert.deepEqual(activeFocus({ until: 5 }, '2026-11-20'), []);
  assert.deepEqual(activeFocus(undefined, '2026-11-20'), []);
});
