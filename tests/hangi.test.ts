import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FIRST_DAY, MAX_TRIES, afterGuess, dayBefore, dayNumber, emptyDay, hangiMeta, hangiStats, hash32, pickOfDay, shareText, suggestTitles,
  tbilisiToday, unlockedSeconds,
} from '../src/utils/hangi';

const pool = Array.from({ length: 40 }, (_, i) => ({ id: `r:${i}`, title: `საგალობელი ${i}` }));

test('the day is Georgia\'s day (UTC+4), counted from the first day', () => {
  assert.equal(tbilisiToday(Date.UTC(2026, 9, 27, 21, 30)), '2026-10-28'); // 01:30 in Tbilisi
  assert.equal(tbilisiToday(Date.UTC(2026, 9, 27, 19, 30)), '2026-10-27');
  assert.equal(dayBefore('2026-11-01'), '2026-10-31');
  assert.equal(dayNumber(FIRST_DAY), 1);
  assert.equal(dayNumber('2026-11-06'), 10);
});

test('the hash is stable and the day\'s pick is the same on every device, never the same as the day before', () => {
  assert.equal(hash32('2026-10-28|r:1'), hash32('2026-10-28|r:1'));
  assert.notEqual(hash32('a'), hash32('b'));
  const a = pickOfDay(pool, '2026-10-28');
  assert.equal(a?.id, pickOfDay([...pool].reverse(), '2026-10-28')?.id);
  let day = '2026-10-28';
  let prev = pickOfDay(pool, dayBefore(day))!.id;
  const seen = new Set<string>();
  for (let i = 0; i < 60; i++) {
    const p = pickOfDay(pool, day)!;
    assert.notEqual(p.id, prev);
    seen.add(p.id);
    prev = p.id;
    day = new Date(Date.parse(day) + 86_400_000).toISOString().slice(0, 10);
  }
  assert.ok(seen.size > 20, 'the picks spread over the pool');
  assert.equal(pickOfDay([], '2026-10-28'), undefined);
});

test('a pool that grows keeps most past picks', () => {
  const bigger = [...pool, { id: 'r:new', title: 'ახალი' }];
  let same = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(Date.parse('2026-10-28') + i * 86_400_000).toISOString().slice(0, 10);
    if (pickOfDay(pool, d)!.id === pickOfDay(bigger, d)!.id) same++;
  }
  assert.ok(same >= 25);
});

test('tries climb the ladder, a right title ends the day, six wrong ones too', () => {
  let d = emptyDay('r:1');
  assert.equal(unlockedSeconds(d), 1);
  d = afterGuess(d, '', 'ღირს არს');
  assert.equal(unlockedSeconds(d), 2);
  d = afterGuess(d, 'წმიდაო ღმერთო', 'ღირს არს');
  assert.equal(unlockedSeconds(d), 4);
  assert.equal(d.done, false);
  const won = afterGuess(d, 'ღირს  არს', 'ღირს არს');
  assert.equal(won.won, true);
  assert.equal(won.done, true);
  assert.equal(unlockedSeconds(won), Infinity);
  assert.equal(afterGuess(won, 'x', 'ღირს არს'), won);
  let lost = d;
  while (!lost.done) lost = afterGuess(lost, 'სხვა', 'ღირს არს');
  assert.equal(lost.guesses.length, MAX_TRIES);
  assert.equal(lost.won, false);
});

test('stats: played, won, the streak up to today or yesterday, the best streak, the spread of tries', () => {
  const won = (n: number): ReturnType<typeof emptyDay> => ({ id: 'x', guesses: Array.from({ length: n }, () => 'a'), won: true, done: true });
  const lost = { id: 'x', guesses: ['a', 'b', 'c', 'd', 'e', 'f'], won: false, done: true };
  const days = { '2026-10-28': won(2), '2026-10-29': won(1), '2026-10-30': lost, '2026-10-31': won(3), '2026-11-01': won(6) };
  const s = hangiStats(days, '2026-11-02'); // today not played yet: the streak runs to yesterday
  assert.deepEqual([s.played, s.won, s.streak, s.best], [5, 4, 2, 2]);
  assert.deepEqual(s.dist, [1, 1, 1, 0, 0, 1]);
  assert.equal(hangiStats(days, '2026-11-03').streak, 0); // a day was missed
  assert.equal(hangiStats({ ...days, '2026-11-02': lost }, '2026-11-02').streak, 0);
  assert.equal(hangiStats({ ...days, '2026-11-02': won(4) }, '2026-11-02').streak, 3);
  assert.equal(hangiMeta(days, '2026-11-02'), 'სერია: 2 დღე');
  assert.equal(hangiMeta(days, '2026-11-01'), 'დღეს გამოიცანი: 6/6');
  assert.equal(hangiMeta(days, '2026-10-30'), 'დღეს ვერ გამოიცანი');
  assert.equal(hangiMeta({}, '2026-10-30'), undefined);
});

test('the share text shows the tries as squares and never the answer', () => {
  const day = { id: 'r:1', guesses: ['', 'წმიდაო ღმერთო', 'ღირს არს'], won: true, done: true };
  assert.equal(shareText(3, day), 'დღის ჰანგი №3 · 3/6\n⬛🟥🟩⬜⬜⬜\nსაგანძურის სკოლა · sagandzureli.ge');
  assert.equal(shareText(4, { ...day, won: false, guesses: ['a', 'b', 'c', 'd', 'e', 'f'] }).split('\n')[1], '🟥🟥🟥🟥🟥🟥');
  assert.equal(shareText(3, day).includes('ღირს'), false);
});

test('suggestions: the typed text anywhere in the title, closest to the start first, at most eight', () => {
  const titles = ['ღირს არს', 'წმიდაო ღმერთო', 'რომელი ქერუბიმთა', 'შენ გიგალობთ', 'მრავალჟამიერ', ...Array.from({ length: 10 }, (_, i) => `ალილუია ${i}`)];
  assert.deepEqual(suggestTitles(titles, 'ღ'), ['ღირს არს', 'წმიდაო ღმერთო']);
  assert.deepEqual(suggestTitles(titles, '  '), []);
  assert.equal(suggestTitles(titles, 'ალილ').length, 8);
});
