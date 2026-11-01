import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EQO_KEYS, EQO_RULES, EQO_START, checkTaps, decodeTaps, drawEqo, encodeTaps, eqoLine, eqoPoints, eqoSeconds, eqoTimed, keysOf,
  newRing, pickMelody, pitchName, ringAnswer, ringWinners, rightFromStart, type EqoQ,
} from '../src/utils/eqo';
import { MELODY_POOL } from '../src/data/melodyPool';
import { answerRound, newRounds, publicView, roundKey } from '../src/utils/roundGames';
import { mulberry32 } from '../src/utils/otkheuli';

// „ექო“ (utils/eqo.ts): the melodies' openings and keyboards, an answer as one number, the points, a room's game (one melody,
// each round a note longer) and the circle on one phone (a miss puts one out, the phrase grows once everyone has had a turn).

test('the pool: every melody gives an opening of eight pitches at most, most a long one', () => {
  assert.ok(MELODY_POOL.length >= 30);
  assert.equal(new Set(MELODY_POOL.map(m => m.id)).size, MELODY_POOL.length);
  for (const m of MELODY_POOL) {
    const line = eqoLine(m);
    assert.ok(line.length >= 8, m.id);
    assert.ok(keysOf(line).length <= EQO_KEYS, m.id);
    assert.deepEqual(line, m.top.slice(0, line.length));
    // a pitch sung again is one note
    assert.ok(m.top.every((n, i) => i === 0 || n !== m.top[i - 1]), m.id);
  }
  assert.ok(MELODY_POOL.filter(m => eqoLine(m).length >= 14).length >= 30);
  assert.ok(MELODY_POOL.some(m => m.song));
});

test('the names and the time of a phrase', () => {
  assert.equal(pitchName(60), 'დო');
  assert.equal(pitchName(58), 'სი♭');
  assert.equal(pitchName(54), 'ფა♯');
  assert.equal(pitchName(47), 'სი');
  assert.deepEqual(eqoTimed([60, 62]).map(([at, , m]) => [Math.round(at * 100), m]), [[0, 60], [62, 62]]);
  assert.equal(eqoSeconds({ notes: [1, 2, 3] }), 12);
});

test('an answer as one number: the taps in order, a short one too; a wrong digit is no answer', () => {
  for (const taps of [[0], [7], [0, 0, 0], [3, 1, 4, 1, 5, 2, 6, 7, 0, 2, 3, 4, 5, 6], Array(16).fill(7)]) {
    assert.deepEqual(decodeTaps(encodeTaps(taps)), taps);
    assert.ok(Number.isSafeInteger(encodeTaps(taps)));
  }
  assert.equal(decodeTaps(0), null);
  assert.equal(decodeTaps(9), null); // a digit 0
  assert.equal(decodeTaps(-3), null);
  assert.equal(decodeTaps(1.5), null);
});

test('right from the start, and a tap\'s verdict', () => {
  const keys = [55, 57, 60];
  const notes = [60, 57, 55, 57];
  assert.equal(rightFromStart(notes, keys, [2, 1, 0, 1]), 4);
  assert.equal(rightFromStart(notes, keys, [2, 1, 1, 1]), 2);
  assert.equal(rightFromStart(notes, keys, [0]), 0);
  assert.equal(checkTaps(notes, keys, [2, 1]), 'more');
  assert.equal(checkTaps(notes, keys, [2, 1, 0, 1]), 'done');
  assert.equal(checkTaps(notes, keys, [2, 0]), 'wrong');
});

test('points: 100 a note right from the start, the whole phrase twice as much', () => {
  const q = { notes: [60, 57, 55], keys: [55, 57, 60] };
  assert.equal(eqoPoints(q, { pick: encodeTaps([2, 1, 0]) }), 600);
  assert.equal(eqoPoints(q, { pick: encodeTaps([2, 1]) }), 200);
  assert.equal(eqoPoints(q, { pick: encodeTaps([2, 0, 0]) }), 100);
  assert.equal(eqoPoints(q, { pick: encodeTaps([0, 1, 0]) }), 0);
});

test('a room\'s game: one melody, each round a note longer from three, one keyboard; asked ones come last', () => {
  for (const count of [5, 8, 12]) {
    const rounds = drawEqo({ melodies: MELODY_POOL, count, lights: true, rnd: mulberry32(count) });
    assert.equal(rounds.length, count);
    const line = eqoLine(MELODY_POOL.find(m => m.id === rounds[0].id)!);
    rounds.forEach((r, i) => {
      assert.ok(EQO_RULES.valid(JSON.parse(JSON.stringify(r))), JSON.stringify(r));
      assert.equal(r.notes.length, EQO_START + i);
      assert.deepEqual(r.notes, line.slice(0, EQO_START + i));
      assert.deepEqual(r.keys, rounds[0].keys);
      assert.equal(r.id, rounds[0].id);
    });
    assert.deepEqual(rounds[0].keys, keysOf(rounds[count - 1].notes));
  }
  const all = MELODY_POOL.map(m => m.id);
  const one = drawEqo({ melodies: MELODY_POOL, count: 5, lights: false, seen: all.filter(id => id !== 'v9-61'), rnd: mulberry32(3) });
  assert.equal(one[0].id, 'v9-61');
  assert.equal(one[0].lights, false);
  // all asked: the one asked longest ago
  assert.equal(drawEqo({ melodies: MELODY_POOL, count: 5, lights: true, seen: all, rnd: mulberry32(3) })[0].id, all[0]);
  assert.equal(pickMelody(MELODY_POOL, all.slice(1))!.id, all[0]);
  assert.deepEqual(drawEqo({ melodies: [], count: 5, lights: true }), []);
});

test('a round read back, and in the room: the melody\'s name stays hidden until the reveal', () => {
  const rounds = drawEqo({ melodies: MELODY_POOL, count: 5, lights: true, rnd: mulberry32(9) });
  const q = rounds[1];
  const broken: unknown[] = [
    { ...q, kind: 'otkhi' }, { ...q, keys: [q.keys[1], q.keys[0], ...q.keys.slice(2)] }, { ...q, keys: [60] },
    { ...q, notes: [...q.notes, 13] }, { ...q, notes: Array(17).fill(q.keys[0]) }, { ...q, lights: 1 }, { ...q, title: '' }, null,
  ];
  for (const b of broken) assert.ok(!EQO_RULES.valid(b), JSON.stringify(b));
  assert.ok(EQO_RULES.ok(q, encodeTaps([0, 0, 0, 0])) && EQO_RULES.ok(q, encodeTaps([0])));
  assert.ok(!EQO_RULES.ok(q, encodeTaps([0, 0, 0, 0, 0])) && !EQO_RULES.ok(q, encodeTaps([q.keys.length])) && !EQO_RULES.ok(q, 0));

  const players = ['ა', 'ბ'].map((name, i) => ({ uid: `u${i}`, name }));
  let s = newRounds(players, { game: 'eqo', rounds, sound: 'all', now: 1000 })!;
  const shown = publicView(s).q as Partial<EqoQ>;
  assert.equal(shown.title, undefined);
  assert.deepEqual(shown.notes, rounds[0].notes);
  assert.equal(publicView(s).secs, eqoSeconds(rounds[0]));
  const right = rounds[0].notes.map(n => rounds[0].keys.indexOf(n));
  s = answerRound(s, 0, { key: roundKey(s), pick: encodeTaps(right), ms: 0 });
  s = answerRound(s, 1, { key: roundKey(s), pick: encodeTaps(right.slice(0, 2)), ms: 0 });
  assert.equal(s.phase, 'reveal');
  assert.deepEqual(s.gained, [600, 200]);
  assert.equal((publicView(s).q as Partial<EqoQ>).title, rounds[0].title);
});

test('the circle: a miss puts one out, the phrase grows once everyone still in has had a turn, the last one in wins', () => {
  assert.equal(newRing(['ნინო']), null);
  let r = newRing(['ა', 'ბ', 'გ'])!;
  assert.equal(r.len, EQO_START);
  r = ringAnswer(r, true, 20); // ა
  r = ringAnswer(r, false, 20); // ბ out
  assert.deepEqual(r.alive, [true, false, true]);
  assert.equal(r.at, 2);
  r = ringAnswer(r, true, 20); // გ: everyone still in had a turn
  assert.equal(r.len, EQO_START + 1);
  assert.equal(r.at, 0);
  assert.equal(r.best, EQO_START);
  r = ringAnswer(r, true, 20); // ა at four
  r = ringAnswer(r, false, 20); // გ out: ა wins
  assert.ok(r.over);
  assert.deepEqual(ringWinners(r), [0]);
  assert.deepEqual(r.outOrder, [1, 2]);
  assert.equal(r.best, EQO_START + 1);
  assert.deepEqual(ringAnswer(r, true, 20), r);
  // the opening's end: everyone still in wins together
  let t = newRing(['ა', 'ბ'])!;
  t = ringAnswer(ringAnswer(t, true, 3), true, 3);
  assert.ok(t.over);
  assert.deepEqual(ringWinners(t), [0, 1]);
  assert.equal(t.len, EQO_START);
});
