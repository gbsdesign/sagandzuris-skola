import test from 'node:test';
import assert from 'node:assert/strict';
import { TS_LINES, tsLineById } from '../src/data/tsartseraLines';
import {
  assign, clearGuess, countsOf, finished, givenLetters, givenOfDay, hintFor, hintsOf, isFull, isSolved, letterCount, lettersOf, lineOfDay,
  longestWord, modeOf, nextOpen, randomLine, readKnown, scriptOf, timeOf, tsMeta, tsShareText, tsStats, usable, withKnown, wrongOf,
} from '../src/utils/tsartsera';
import { mulberry32 } from '../src/utils/otkheuli';

test('the lines: unique ids, today\'s letters only, a fit length, a phone row holds every word', () => {
  const ids = new Set<string>();
  for (const l of TS_LINES) {
    assert.ok(!ids.has(l.id), `twice: ${l.id}`);
    ids.add(l.id);
    assert.ok(usable(l), `${l.id} is not usable`);
    assert.ok(letterCount(l.text) <= 110, `${l.id} is too long`);
    assert.ok(longestWord(l.text) <= 15, `${l.id}: a word of ${longestWord(l.text)}`);
    assert.ok(/^[ა-ჰ\s,.;:!?…„“—-]+$/.test(l.text), `${l.id} has an odd sign: ${l.text}`);
    assert.ok(l.by.trim().length > 0);
  }
  assert.ok(TS_LINES.length >= 60);
  for (const kind of ['rustaveli', 'poetry', 'fathers', 'proverb'] as const) assert.ok(TS_LINES.filter(l => l.kind === kind).length >= 8, kind);
  assert.equal(tsLineById('v1')?.by, 'შოთა რუსთაველი');
});

test('letters, counts and the open letters of a board', () => {
  const text = 'ნათქვამს ნაქნარი სჯობია.';
  assert.deepEqual(lettersOf('აბა ბგ'), ['ა', 'ბ', 'გ']);
  assert.equal(countsOf(text)['ნ'], 3);
  assert.equal(letterCount(text), 21);
  const given = givenLetters(text, mulberry32(7));
  assert.deepEqual(given, ['ა']); // 21 letters → one, the most frequent
  const long = TS_LINES.find(l => letterCount(l.text) >= 70)!;
  const g3 = givenLetters(long.text, mulberry32(3));
  assert.equal(g3.length, 3);
  assert.equal(new Set(g3).size, 3);
  // the day's are the same everywhere
  assert.deepEqual(givenOfDay(long, '2026-11-02'), givenOfDay(long, '2026-11-02'));
});

test('guesses: a letter used under another moves, clearing, full and solved, the wrong ones', () => {
  const text = 'ერთობაში ძალაა.';
  let g = assign({}, 'ე', 'ა');
  g = assign(g, 'რ', 'ა'); // „ა“ moves from ე to რ
  assert.deepEqual(g, { 'რ': 'ა' });
  g = clearGuess(g, 'რ');
  assert.deepEqual(g, {});
  const open = ['ა'];
  for (const c of lettersOf(text)) if (c !== 'ა') g = assign(g, c, c);
  assert.ok(isFull(text, g, open));
  assert.ok(isSolved(text, g, open));
  const swapped = assign(assign(g, 'ე', 'რ'), 'რ', 'ე');
  assert.ok(isFull(text, swapped, open));
  assert.ok(!isSolved(text, swapped, open));
  assert.deepEqual(wrongOf(text, swapped, open).sort(), ['ე', 'რ'].sort());
});

test('a hint opens the letter asked, else the most frequent one not right; the next letter to fill', () => {
  const text = 'ძაღლი ყეფს, ქარავანი მიდის.';
  assert.equal(hintFor(text, {}, [], 'ყ'), 'ყ');
  assert.equal(hintFor(text, {}, []), 'ა');
  assert.equal(hintFor(text, { 'ა': 'ა' }, ['ი']), 'ს'); // ა is right, ი is open: ს comes twice
  const all = Object.fromEntries(lettersOf(text).map(c => [c, c]));
  assert.equal(hintFor(text, all, []), null);
  assert.equal(nextOpen(text, {}, [], null), 'ძ');
  assert.equal(nextOpen(text, {}, ['ა'], 'ძ'), 'ღ');
  assert.equal(nextOpen(text, all, [], 'ძ'), null);
  // round to the start
  const order = lettersOf(text);
  assert.equal(nextOpen(text, {}, [], order[order.length - 1]), order[0]);
});

test('the day\'s line is the same for everyone and never yesterday\'s; more lines avoid the day\'s', () => {
  const a = lineOfDay(TS_LINES, '2026-11-05')!;
  assert.equal(a.id, lineOfDay(TS_LINES, '2026-11-05')!.id);
  for (const iso of ['2026-11-06', '2026-11-07', '2026-12-01', '2027-01-01']) {
    const prev = new Date(Date.parse(`${iso}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
    assert.notEqual(lineOfDay(TS_LINES, iso)!.id, lineOfDay(TS_LINES, prev)!.id);
  }
  for (let s = 1; s < 40; s++) assert.notEqual(randomLine(TS_LINES, s, [a.id])!.id, a.id);
});

test('the record: time, hints, script, way; stats, share and the hub line', () => {
  const d = finished('2026-11-02|v1', true, 95.4, 1, 'nuskhuri', 'secret');
  assert.equal(timeOf(d), 95);
  assert.equal(hintsOf(d), 1);
  assert.equal(scriptOf(d), 'nuskhuri');
  assert.equal(modeOf(d), 'secret');
  const days = {
    '2026-11-01': finished('2026-11-01|a1', true, 140, 0, 'asomtavruli', 'secret'),
    '2026-11-02': d,
  };
  const st = tsStats(days, '2026-11-02');
  assert.equal(st.played, 2);
  assert.equal(st.won, 2);
  assert.equal(st.streak, 2);
  assert.equal(st.fastest, 95);
  assert.equal(st.clean, 1);
  assert.equal(tsShareText(6, d), 'ხუცური წარწერა №6 · ნუსხურით\n✅ 1:35 · მინიშნება 1\nსაგანძურის სკოლა · sagandzureli.ge');
  const keyed = finished('x', true, 61, 0, 'asomtavruli', 'key');
  assert.match(tsShareText(1, keyed), /ასომთავრულით, გასაღებით\n✅ 1:01 · მინიშნების გარეშე/);
  assert.equal(tsMeta(days, '2026-11-02'), 'დღეს ამოხსენი · 1:35');
  assert.equal(tsMeta(days, '2026-11-03'), 'სერია: 2 დღე');
});

test('the learnt letters: by script, each once, only letters; a broken store is cleaned', () => {
  let k = withKnown({}, 'asomtavruli', ['ა', 'ბ', 'ა']);
  k = withKnown(k, 'asomtavruli', ['გ']);
  k = withKnown(k, 'nuskhuri', ['ა']);
  assert.deepEqual(k, { asomtavruli: ['ა', 'ბ', 'გ'], nuskhuri: ['ა'] });
  assert.deepEqual(readKnown({ asomtavruli: ['ა', 'x', 3, 'ა', 'ჰ'], mkhedruli: ['ა'] }), { asomtavruli: ['ა', 'ჰ'] });
  assert.deepEqual(readKnown(null), {});
});
