import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HEARTS, LETTER_UNITS, LINES_UNIT, UNITS, WORDS_UNIT, answered, buildLesson, isRight, lessonId, lessonsDone, letterOptions,
  lettersThrough, lineWords, markRead, newReadTeams, newRun, nextItem, nextRead, parseReadTeams, readOver, readRanking, readScores,
  readShown, readable, rng, runLost, runWon, streakOf, traceOk, traceScore, unitsDone, updateWeak, withLesson, wordOptions,
  type Exercise,
} from '../src/utils/anbani';
import { ALPHABET } from '../src/utils/oldScripts';
import { anbaniLines, anbaniWords } from '../src/data/anbaniWords';

const pool = anbaniWords();
const lines = anbaniLines();
const src = { pool, lines };

test('the seven units bring each of the 33 letters once', () => {
  const all = LETTER_UNITS.flat();
  assert.equal(all.length, 33);
  assert.deepEqual([...all].sort(), [...ALPHABET].sort());
  assert.equal(UNITS, 9);
  assert.deepEqual(lettersThrough(-1), []);
  assert.deepEqual(lettersThrough(1), [...LETTER_UNITS[0], ...LETTER_UNITS[1]]);
  assert.equal(lettersThrough(20).length, 33);
});

test('the words and lines to read are made of today’s letters only', () => {
  assert.ok(pool.length > 500, `${pool.length} words`);
  for (const w of pool) assert.match(w, /^[ა-ჰ]{2,9}$/);
  assert.ok(lines.length >= 30, `${lines.length} lines`);
  for (const l of lines) { const n = lineWords(l).length; assert.ok(n >= 3 && n <= 7, l); }
  // the first unit can already read a few words
  assert.ok(readable(pool, LETTER_UNITS[0]).length >= 4);
});

const check = (ex: Exercise, known: readonly string[] | null) => {
  if (ex.kind === 'pick' || ex.kind === 'find') {
    assert.equal(ex.options.length, 4);
    assert.equal(new Set(ex.options).size, 4);
    assert.ok(ex.options.includes(ex.letter));
    if (known) assert.ok(known.includes(ex.letter));
  }
  if (ex.kind === 'word') {
    assert.equal(new Set(ex.options).size, ex.options.length);
    assert.ok(ex.options.length === 4, ex.word);
    assert.ok(ex.options.includes(ex.word));
    if (known) for (const o of ex.options) assert.ok([...o].every(c => known.includes(c)), `${o} uses letters not learned yet`);
  }
  if (ex.kind === 'order') assert.deepEqual(ex.words, lineWords(ex.line));
};

test('a letters lesson meets every new letter, asks only learned letters, and reads words of them', () => {
  for (let u = 0; u < LETTER_UNITS.length; u++) {
    for (const seed of [1, 7, 99]) {
      const items = buildLesson(u, src, seed);
      const known = lettersThrough(u);
      const intros = items.filter(e => e.kind === 'intro').map(e => (e as { letter: string }).letter);
      assert.deepEqual(intros, LETTER_UNITS[u]);
      for (const l of LETTER_UNITS[u]) {
        assert.ok(items.some(e => e.kind === 'pick' && e.letter === l), `pick ${l}`);
        assert.ok(items.some(e => e.kind === 'find' && e.letter === l), `find ${l}`);
        // met before it is asked
        const met = items.findIndex(e => e.kind === 'intro' && e.letter === l);
        const asked = items.findIndex(e => (e.kind === 'pick' || e.kind === 'find') && e.letter === l);
        assert.ok(met < asked);
      }
      assert.equal(items.filter(e => e.kind === 'trace').length, 1);
      assert.equal(items.filter(e => e.kind === 'word').length, 3);
      items.forEach(e => check(e, known));
    }
  }
});

test('the words unit, the lines unit and the practice', () => {
  const words = buildLesson(WORDS_UNIT, src, 5);
  assert.equal(words.filter(e => e.kind === 'word').length, 10);
  words.forEach(e => check(e, null));
  const ls = buildLesson(LINES_UNIT, src, 5);
  assert.equal(ls.filter(e => e.kind === 'order').length, 5);
  ls.forEach(e => check(e, null));
  assert.deepEqual(buildLesson('practice', src, 3, 0), []);
  const p = buildLesson('practice', { ...src, weak: { 'მ': 5 } }, 3, 1);
  p.forEach(e => check(e, LETTER_UNITS[0]));
  assert.ok(p.some(e => (e.kind === 'pick' || e.kind === 'find') && e.letter === 'მ'), 'the weak letter comes first');
  assert.ok(buildLesson('practice', src, 3, UNITS).some(e => e.kind === 'order'));
});

test('options: the answer and three others, of the letters given while they last', () => {
  const r = rng(4);
  const o = letterOptions('ა', ['ა', 'ე'], r);
  assert.equal(o.length, 4);
  assert.ok(o.includes('ე'));
  const w = wordOptions('დედა', ['დედა', 'მამა', 'ია', 'მამიდა', 'დეიდა'], r);
  assert.equal(w.length, 4);
  assert.ok(w.includes('მამა'), 'a word of the same length first');
});

test('a run: a mistake costs a heart and comes back once at the end; three mistakes lose it', () => {
  const items = buildLesson(0, src, 2);
  let run = newRun(items);
  assert.equal(run.hearts, HEARTS);
  run = answered(run, false);
  assert.equal(run.hearts, HEARTS - 1);
  assert.equal(run.items.length, items.length + 1);
  assert.equal(run.items[run.items.length - 1].again, true);
  // a repeat missed again does not come back a third time
  const atRepeat = { ...run, at: run.items.length - 1 };
  assert.equal(answered(atRepeat, false).items.length, run.items.length);
  run = answered(nextItem(run), true);
  assert.equal(run.hearts, HEARTS - 1);
  run = answered(answered(run, false), false);
  assert.ok(runLost(run));
  let win = newRun(items.slice(0, 2));
  win = nextItem(nextItem(win));
  assert.ok(runWon(win));
});

test('answers are checked by their kind', () => {
  const pick: Exercise = { kind: 'pick', letter: 'ა', options: ['ა', 'ბ', 'გ', 'დ'] };
  assert.ok(isRight(pick, 'ა'));
  assert.ok(!isRight(pick, 'ბ'));
  const order: Exercise = { kind: 'order', line: 'ა, ბ — გ.', words: ['ა', 'ბ', 'გ'] };
  assert.ok(isRight(order, ['ა', 'ბ', 'გ']));
  assert.ok(!isRight(order, ['ბ', 'ა', 'გ']));
  assert.ok(!isRight(order, ['ა', 'ბ']));
});

test('the record: a day’s lessons, the path done unit by unit, the streak', () => {
  const day = withLesson(withLesson(undefined, 'a1'), 'a2');
  assert.deepEqual(day.guesses, ['a1', 'a2']);
  assert.ok(day.done && day.won);
  assert.deepEqual(withLesson(day, 'a1').guesses, ['a1', 'a2'], 'a lesson played again counts once');
  const days = { '2026-11-01': day, '2026-10-31': withLesson(undefined, 'n1'), '2026-10-29': withLesson(undefined, 'a3') };
  const done = lessonsDone(days);
  assert.equal(unitsDone(done, 'asomtavruli'), 3);
  assert.equal(unitsDone(done, 'nuskhuri'), 1);
  assert.equal(lessonId('nuskhuri', 0), 'n1');
  assert.equal(streakOf(days, '2026-11-01'), 2);
  assert.equal(streakOf(days, '2026-11-02'), 2, 'today still open');
  assert.equal(streakOf(days, '2026-11-03'), 0);
});

test('weak letters: a miss weighs more than a right answer', () => {
  let w = updateWeak({}, 'ა', false);
  assert.equal(w['ა'], 2);
  w = updateWeak(w, 'ა', true);
  assert.equal(w['ა'], 1);
  w = updateWeak(w, 'ა', true);
  assert.equal(w['ა'], undefined);
});

test('tracing: cover the letter and keep to it', () => {
  const n = 100;
  const glyph = new Uint8Array(n), glyphWide = new Uint8Array(n);
  for (let i = 20; i < 40; i++) glyph[i] = 1;
  for (let i = 15; i < 45; i++) glyphWide[i] = 1;
  const ink = new Uint8Array(n), inkWide = new Uint8Array(n);
  for (let i = 22; i < 38; i++) ink[i] = 1;
  for (let i = 18; i < 42; i++) inkWide[i] = 1;
  const s = traceScore({ glyph, glyphWide, ink, inkWide });
  assert.equal(s.cover, 1);
  assert.equal(s.inside, 1);
  assert.ok(traceOk(s));
  const stray = new Uint8Array(n);
  for (let i = 60; i < 90; i++) stray[i] = 1;
  assert.ok(!traceOk(traceScore({ glyph, glyphWide, ink: stray, inkWide: stray })));
});

test('teams read aloud: a point to the first, two for a line; the mark can change while the answer is open', () => {
  let g = newReadTeams({ teams: ['ა', 'ბ', 'გ'], script: 'both', what: 'letters', rounds: 10, key: true }, src, 3);
  assert.equal(g.items.length, 10);
  assert.equal(new Set(g.items.map(i => i.text)).size, 10);
  assert.ok(!readShown(g));
  assert.equal(nextRead(g), g, 'no next before the answer');
  g = markRead(g, 1);
  assert.ok(readShown(g));
  g = markRead(g, 2);
  assert.deepEqual(readScores(g), [0, 0, 1]);
  g = nextRead(g);
  g = nextRead(markRead(g, null));
  assert.deepEqual(readScores(g), [0, 0, 1]);
  assert.deepEqual(parseReadTeams(JSON.parse(JSON.stringify(g))), g);
  assert.equal(parseReadTeams({ ...g, log: [0, 0, 0, 0] }), null);
  const ls = newReadTeams({ teams: ['ა', 'ბ'], script: 'nuskhuri', what: 'lines', rounds: 5, key: false }, src, 8);
  let l = ls;
  for (let i = 0; i < 5; i++) l = nextRead(markRead(l, i % 2));
  assert.ok(readOver(l));
  assert.deepEqual(readScores(l), [6, 4]);
  assert.deepEqual(readRanking(l).map(x => [x.name, x.place]), [['ა', 1], ['ბ', 2]]);
  assert.ok(ls.items.every(i => i.script === 'nuskhuri'));
});
