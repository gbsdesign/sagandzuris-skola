import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_LEVEL, DIRS, LEVELS, LEVEL_IDS, MIN_WORDS, badeMeta, badeShareText, badeStats, buildBade, clock, countWord, foundOf, gaveUp, gridOfDay,
  indexCells, lineOf, randomGrid, scriptOf, themesFor, timeOf, usableWords, withFound, withTime, wordOnLine, type BadeGrid, type BadeTheme,
} from '../src/utils/bade';
import { mulberry32 } from '../src/utils/otkheuli';
import { emptyDay } from '../src/utils/hangi';
import { ALPHABET, LETTER_NAMES, toMkhedruli, toScript } from '../src/utils/oldScripts';
import { BADE_THEMES } from '../src/data/badeThemes';

const THEME: BadeTheme = { id: 't', title: 'ხილი', words: ['ვაშლი', 'მსხალი', 'ატამი', 'ბროწეული', 'ყურძენი', 'ლეღვი', 'ხურმა', 'კომში', 'ბალი', 'ალუბალი', 'ია', 'ტყემალი'] };

const wordAt = (g: BadeGrid, cells: number[]) => cells.map(i => g.cells[i]).join('');

test('the three scripts: a letter moves by a fixed step and back', () => {
  assert.equal(ALPHABET.length, 33);
  assert.equal(LETTER_NAMES.length, 33);
  const u = (...codes: number[]) => String.fromCharCode(...codes);
  assert.equal(toScript('ანი', 'nuskhuri'), u(0x2d00, 0x2d0c, 0x2d08));
  assert.equal(toScript('ჰაე', 'asomtavruli'), u(0x10c0, 0x10a0, 0x10a4));
  assert.equal(toScript('ბადე 10!', 'asomtavruli'), `${u(0x10a1, 0x10a0, 0x10a3, 0x10a4)} 10!`);
  for (const s of ['nuskhuri', 'asomtavruli'] as const) assert.equal(toMkhedruli(toScript(ALPHABET.join(''), s)), ALPHABET.join(''));
});

test('a theme gives words that fit: one word, letters only, 3 letters or more, none hiding in another', () => {
  assert.deepEqual(usableWords(['ია', 'ორი სიტყვა', 'კინ-ძა-ძა', 'მუხა', 'მუხა', 'ნათლისღება'], 8), ['მუხა']);
  for (const level of LEVEL_IDS) {
    const g = buildBade(THEME, level, mulberry32(7))!;
    assert.ok(g, level);
    const words = g.placed.map(p => p.word);
    assert.equal(new Set(words).size, words.length);
    assert.ok(!(words.includes('ბალი') && words.includes('ალუბალი')), 'ბალი hides in ალუბალი');
    assert.ok(words.length >= MIN_WORDS && words.length <= LEVELS[level].words);
  }
});

test('every hidden word sits on its cells, runs the level’s ways and can be read exactly once', () => {
  for (const level of LEVEL_IDS) {
    for (let seed = 1; seed <= 25; seed++) {
      const g = buildBade(THEME, level, mulberry32(seed))!;
      const { size, dirs } = LEVELS[level];
      assert.equal(g.cells.length, size * size);
      assert.ok(g.cells.every(c => ALPHABET.includes(c)));
      for (const p of g.placed) {
        assert.equal(wordAt(g, indexCells(p, size)), p.word);
        assert.ok(DIRS.slice(0, dirs).some(([dr, dc]) => dr === p.dr && dc === p.dc), `${level}: ${p.word} runs a way the level has not`);
        assert.equal(countWord(g.cells, size, p.word), 1, `${level}/${seed}: ${p.word}`);
      }
    }
  }
});

test('the same seed gives the same grid; a theme too small gives none', () => {
  assert.deepEqual(buildBade(THEME, 'mid', mulberry32(3)), buildBade(THEME, 'mid', mulberry32(3)));
  assert.equal(buildBade({ id: 's', title: 'S', words: ['ვაშლი', 'მსხალი', 'ატამი', 'ლეღვი'] }, 'easy', mulberry32(1)), undefined);
});

test('a drawn line snaps to the eight ways and finds its word either way', () => {
  const size = 10;
  assert.deepEqual(lineOf(0, 3, size), [0, 1, 2, 3]);
  assert.deepEqual(lineOf(0, 30, size), [0, 10, 20, 30]);
  assert.deepEqual(lineOf(0, 33, size), [0, 11, 22, 33]);
  assert.deepEqual(lineOf(33, 0, size), [33, 22, 11, 0]);
  assert.deepEqual(lineOf(0, 31, size), [0, 10, 20, 30], 'nearly down snaps down');
  assert.deepEqual(lineOf(5, 5, size), [5]);
  assert.deepEqual(lineOf(97, 9, size).slice(0, 3), [97, 87, 77], 'mostly up snaps up');
  assert.deepEqual(lineOf(52, 8, size), [52, 43, 34, 25, 16, 7], 'up and right, cut at the edge');
  const g = buildBade(THEME, 'hard', mulberry32(11))!;
  g.placed.forEach((p, i) => {
    const cells = indexCells(p, g.size);
    assert.equal(wordOnLine(g, cells), i);
    assert.equal(wordOnLine(g, [...cells].reverse()), i, 'drawn from its end');
    assert.equal(wordOnLine(g, cells.slice(0, -1)), -1, 'one letter short');
  });
});

test('the day’s grid is the same for everyone and changes with the day; every theme of the game can make a grid', () => {
  const a = gridOfDay(BADE_THEMES, '2026-11-01')!;
  assert.ok(a);
  assert.deepEqual(gridOfDay(BADE_THEMES, '2026-11-01'), a);
  assert.equal(a.level, DAY_LEVEL);
  assert.equal(a.placed.length, LEVELS[DAY_LEVEL].words);
  assert.notEqual(gridOfDay(BADE_THEMES, '2026-11-02')!.theme.id, a.theme.id, 'never two days of one theme');
  for (const level of LEVEL_IDS) {
    const themes = themesFor(BADE_THEMES, level);
    assert.ok(themes.length >= 30, `${level}: ${themes.length} themes`);
    for (const t of themes) assert.ok(buildBade(t, level, mulberry32(5)), `${level}: ${t.id}`);
  }
  const r = randomGrid(BADE_THEMES, 'easy', 42, [a.theme.id])!;
  assert.notEqual(r.theme.id, a.theme.id);
  assert.equal(r.size, LEVELS.easy.size);
});

test('the day’s record: words in order, the time and the script; the stats and the share line', () => {
  const g = buildBade(THEME, 'easy', mulberry32(2))!;
  const words = g.placed.map(p => p.word);
  let d = emptyDay(g.key);
  d = withFound(d, g, words[0], 12, 'nuskhuri');
  d = withFound(d, g, words[0], 20, 'nuskhuri');
  assert.deepEqual(foundOf(d), [words[0]], 'a word counts once');
  assert.equal(timeOf(d), 20);
  assert.equal(scriptOf(d), 'nuskhuri');
  assert.equal(d.done, false);
  d = withTime(d, 31, 'asomtavruli');
  assert.equal(timeOf(d), 31);
  assert.equal(scriptOf(d), 'asomtavruli');
  for (const w of words.slice(1)) d = withFound(d, g, w, 95, 'asomtavruli');
  assert.equal(d.won, true);
  assert.equal(d.done, true);
  assert.ok(d.guesses.length <= 20);
  assert.equal(clock(95), '1:35');
  assert.match(badeShareText(4, g, d), /№4 · ხილი\n✅ \d\/\d · 1:35 · ასომთავრულით/);
  const lost = gaveUp(withFound(emptyDay('k'), g, words[1], 40, 'mkhedruli'), 50, 'mkhedruli');
  assert.equal(lost.done, true);
  assert.equal(lost.won, false);
  assert.match(badeShareText(5, g, lost), /🔎 1\//);
  const days = { '2026-10-31': d, '2026-11-01': { ...d, guesses: [...foundOf(d), 't:70', 's:mkhedruli'] } };
  const st = badeStats(days, '2026-11-01');
  assert.equal(st.played, 2);
  assert.equal(st.streak, 2);
  assert.equal(st.fastest, 70);
  assert.equal(badeMeta(days, '2026-11-01'), 'დღეს ყველა იპოვე · 1:10');
  assert.equal(badeMeta({ '2026-11-01': lost }, '2026-11-01'), 'დღეს იპოვე 1');
});
