import test from 'node:test';
import assert from 'node:assert/strict';
import { TSIKHE_ROOMS, tsikheRoom } from '../src/data/tsikheRooms';
import { MELODY_POOL } from '../src/data/melodyPool';
import { keysOf } from '../src/utils/eqo';
import { nameKey } from '../src/utils/chantRounds';
import {
  HINT_COST, ROOM_MS, WRONG_COST, better, codeRight, echoNotes, endTable, itemsShown, mmss, newRun, newTable, numeralSum, optionOrder,
  orderRight, parseRun, parseTable, piecesOf, plain, printSeed, runHint, runMiss, runMs, runPass, runSolve, shapeOf, starsOf, tableRanking, teamHint,
  teamMiss, teamMs, teamPass, wordRight, type Door,
} from '../src/utils/tsikhe';

const ROOM = TSIKHE_ROOMS[0];
const DOORS = ROOM.doors.length;

test('every castle: five doors, a key of as many letters, ids apart', () => {
  assert.equal(new Set(TSIKHE_ROOMS.map(r => r.id)).size, TSIKHE_ROOMS.length);
  for (const r of TSIKHE_ROOMS) {
    assert.equal(r.doors.length, 5, r.id);
    assert.equal([...r.key].length, r.doors.length, `${r.id}: a piece a door`);
    assert.match(r.key, /^[ა-ჰ]+$/, r.id);
    assert.ok(r.intro && r.outro && r.gate.ask && r.gate.note, r.id);
    for (const d of r.doors) assert.ok(d.title && d.ask && d.note && d.hints.every(Boolean), `${r.id}: ${d.title}`);
  }
  assert.equal(tsikheRoom('gonio')?.title, 'გონიოს ციხე');
  assert.equal(tsikheRoom('nowhere'), undefined);
});

test('the pieces are the key\'s letters, never already the word, the same every time', () => {
  for (const r of TSIKHE_ROOMS) {
    const p = piecesOf(r);
    assert.notEqual(p.join(''), r.key, r.id);
    assert.deepEqual([...p].sort(), [...r.key].sort(), r.id);
    assert.deepEqual(piecesOf(r), p);
  }
});

test('the doors\' contents: options apart, an inscription that reads as the answer, codes of digits', () => {
  for (const r of TSIKHE_ROOMS) for (const d of r.doors) {
    const at = `${r.id}: ${d.title}`;
    if (d.kind === 'pick' || d.kind === 'listen') {
      assert.equal(d.options.length, 4, at);
      assert.equal(new Set(d.options.map(nameKey)).size, 4, at);
    }
    if (d.kind === 'order') {
      assert.ok(d.items.length >= 4 && d.items.length <= 6, at);
      assert.equal(new Set(d.items).size, d.items.length, at);
    }
    if (d.kind === 'word') {
      assert.ok(plain(d.answer).length >= 3, at);
      // an inscription to read: today's letters only (the old scripts hold them all), and its answer is in it
      if (d.carved) {
        assert.match(d.carved.text, /^[ა-ჰ ]+$/, at);
        assert.ok(plain(d.carved.text).includes(plain(d.answer)), at);
      }
    }
    if (d.kind === 'code') assert.match(d.answer, /^\d{3,4}$/, at);
  }
});

test('a hint\'s letter boxes („ხ _ _ _ _ _“) fit the answer', () => {
  let seen = 0;
  const fits = (shown: string[][], words: string[][]) => shown.every((w, i) => w.length === words[i].length && w.every((ch, k) => ch === '_' || ch === words[i][k]));
  for (const r of TSIKHE_ROOMS) for (const d of r.doors) {
    if (d.kind !== 'word') continue;
    for (const h of d.hints) {
      // single letters and „_“ apart by a space; two spaces between words
      for (const m of h.matchAll(/(?<![ა-ჰ])[ა-ჰ_](?: {1,2}[ა-ჰ_](?![ა-ჰ]))+/g)) {
        if (!m[0].includes('_')) continue;
        seen++;
        const shown = m[0].split('  ').map(w => w.split(' '));
        const words = d.answer.split(' ').map(w => [...w]);
        // the boxes may show some of the answer's words (its last one alone)
        const ok = Array.from({ length: words.length - shown.length + 1 }, (_, at) => at).some(at => fits(shown, words.slice(at, at + shown.length)));
        assert.ok(ok, `${r.id}: ${h}`);
      }
    }
  }
  assert.ok(seen >= 6, `only ${seen} boxed hints`);
});

test('a listen door\'s tune is the book notes of its right option; an echo door\'s phrase is what its hints tell', () => {
  for (const r of TSIKHE_ROOMS) for (const d of r.doors) {
    if (d.kind === 'listen') {
      const m = MELODY_POOL.find(x => x.id === `${d.tune.book}-${d.tune.num}`);
      assert.ok(m, `${r.id}: no notes for ${d.tune.book} ${d.tune.num}`);
      assert.equal(nameKey(m.title), nameKey(d.options[0]), r.id);
    }
    if (d.kind === 'echo') {
      const m = MELODY_POOL.find(x => x.id === d.melody);
      assert.ok(m, `${r.id}: no melody ${d.melody}`);
      const notes = echoNotes(m.top, d.count);
      assert.equal(notes.length, d.count, r.id);
      const keys = keysOf(notes);
      assert.ok(keys.length >= 3 && keys.length <= 8, r.id);
      if (r.id === 'kajeti') assert.deepEqual(notes.map(n => keys.indexOf(n)), [0, 1, 2, 3, 4, 3], 'the hints say: up five bells, one back');
    }
  }
});

test('the old letters\' numbers: the scroll\'s year is the code', () => {
  assert.equal(numeralSum('ჩღჟე'), 1795);
  assert.equal(numeralSum('ტ'), 300);
  assert.ok(Number.isNaN(numeralSum('ც')));
  for (const r of TSIKHE_ROOMS) for (const d of r.doors) {
    if (d.kind === 'code' && d.scroll && d.carved) assert.equal(String(numeralSum(d.carved.text)), d.answer, r.id);
  }
});

test('answers: letters count, spaces and quotes do not; a code is its digits', () => {
  const word = (answer: string, alt?: string[]): Extract<Door, { kind: 'word' }> => ({ kind: 'word', answer, alt, title: '', ask: '', note: '', hints: ['', ''] });
  assert.ok(wordRight(word('ქართლის დედა'), ' „ქართლის  დედა“ '));
  assert.ok(wordRight(word('ქართლის დედა'), 'ქართლისდედა'));
  assert.ok(!wordRight(word('ქართლის დედა'), 'ქართლის'));
  assert.ok(wordRight(word('ვეფხვი', ['ვეფხი']), 'ვეფხი'));
  assert.ok(!wordRight(word('ხოხობი'), ''));
  assert.ok(codeRight({ kind: 'code', answer: '1795', title: '', ask: '', note: '', hints: ['', ''] }, '1795'));
  assert.ok(!codeRight({ kind: 'code', answer: '1795', title: '', ask: '', note: '', hints: ['', ''] }, '1794'));
  assert.equal(shapeOf('ქართლის დედა'), '_______ ____');
  assert.equal(shapeOf('ხოხობი'), '______');
});

test('options are shuffled the same way for a run; an order never lies in its order', () => {
  const o = optionOrder(4, 77, 2);
  assert.deepEqual([...o].sort(), [0, 1, 2, 3]);
  assert.deepEqual(optionOrder(4, 77, 2), o);
  for (let seed = 1; seed < 60; seed++) {
    const s = itemsShown(5, seed, 4);
    assert.deepEqual([...s].sort(), [0, 1, 2, 3, 4]);
    assert.ok(s.some((v, i) => v !== i));
  }
  assert.ok(orderRight([0, 1, 2, 3], 4));
  assert.ok(!orderRight([0, 1, 3, 2], 4));
  assert.ok(!orderRight([0, 1, 2], 4));
});

test('a run: hints and wrong picks cost time, the gate stops the clock', () => {
  let r = newRun(ROOM.id, 5, 1000);
  assert.equal(runMs(r, 61_000), 60_000);
  r = runHint(r);
  assert.equal(r.penalty, HINT_COST[0]);
  r = runHint(runHint(r));
  assert.equal(r.hints, 3);
  assert.equal(r.answers, 1);
  assert.equal(runHint(r), r, 'no fourth hint');
  r = runMiss(r, 2);
  r = runMiss(r, 2);
  assert.deepEqual(r.wrong, [2]);
  assert.equal(r.penalty, HINT_COST[0] + HINT_COST[1] + HINT_COST[2] + 2 * WRONG_COST);
  r = runSolve(r, 2000);
  assert.ok(r.solved);
  assert.equal(runMs(r, 2000), runMs(r, 500_000), 'the clock waits while the note shows');
  r = runPass(r, DOORS, 500_000);
  assert.equal(r.t0, 500_000);
  assert.ok(!r.solved);
  assert.equal(r.door, 1);
  assert.equal(r.hints, 0);
  assert.deepEqual(r.wrong, []);
  for (let k = 1; k <= DOORS; k++) r = runPass(r, DOORS, 499_000 + 10 * 60_000);
  assert.equal(r.door, DOORS + 1);
  assert.equal(r.done, 10 * 60_000 + r.penalty);
  assert.equal(runMs(r, 99 * 60_000), r.done, 'the clock stood still at the gate');
  assert.equal(starsOf(r.done, r.used), 2);
  assert.equal(starsOf(ROOM_MS, 0), 3);
  assert.equal(starsOf(ROOM_MS + 1, 0), 1);
  assert.ok(better(undefined, { ms: 9, stars: 1 }));
  assert.ok(better({ ms: 5, stars: 1 }, { ms: 9, stars: 2 }));
  assert.ok(!better({ ms: 5, stars: 2 }, { ms: 9, stars: 2 }));
});

test('a kept run comes back paused; a broken one does not come back', () => {
  const r = runMiss(runHint(newRun(ROOM.id, 9, 1000)), 1);
  const back = parseRun(JSON.parse(JSON.stringify({ ...r, door: 99 })), tsikheRoom);
  assert.ok(back);
  assert.equal(back.t0, 0);
  assert.equal(back.door, DOORS + 1);
  assert.deepEqual(back.wrong, [1]);
  assert.equal(parseRun({ room: 'nowhere' }, tsikheRoom), null);
  assert.equal(parseRun(null, tsikheRoom), null);
});

test('the class: one clock, each team its own penalty and doors; out by time, the rest by doors', () => {
  let t = newTable(ROOM.id, ['ა', 'ბ', 'გ'], 1000);
  t = teamHint(t, 1);
  t = teamMiss(t, 2, 0);
  assert.equal(teamMs(t, 1, 61_000), 60_000 + HINT_COST[0]);
  assert.equal(teamMs(t, 2, 61_000), 60_000 + WRONG_COST);
  for (let k = 0; k <= DOORS; k++) t = teamPass(t, 0, DOORS, 601_000);
  assert.equal(t.teams[0].done, 600_000);
  assert.ok(!t.ended);
  t = teamPass(t, 2, DOORS, 700_000);
  const rank = tableRanking(t, 800_000);
  assert.deepEqual(rank.map(x => x.i), [0, 2, 1]);
  assert.deepEqual(rank.map(x => x.place), [1, 2, 3]);
  for (let k = 0; k <= DOORS; k++) t = teamPass(t, 1, DOORS, 900_000);
  for (let k = 0; k < DOORS; k++) t = teamPass(t, 2, DOORS, 900_000);
  assert.ok(t.ended, 'every team out: the game ends');
  assert.equal(teamMs(t, 2, 5_000_000), 899_000 + WRONG_COST);
  assert.equal(t.seed, printSeed(ROOM.id), 'the class plays the printed order');
  const kept = parseTable(JSON.parse(JSON.stringify(endTable(newTable(ROOM.id, ['x'], 10), 50))), tsikheRoom);
  assert.ok(kept?.ended);
  assert.equal(kept.teams.length, 1);
  assert.equal(parseTable({ room: ROOM.id, teams: [] }, tsikheRoom), null);
});

test('the clock reads as minutes and seconds', () => {
  assert.equal(mmss(0), '00:00');
  assert.equal(mmss(61_500), '01:01');
  assert.equal(mmss(30 * 60_000), '30:00');
  assert.equal(mmss(3_725_000), '1:02:05');
});
