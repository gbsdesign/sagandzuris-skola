import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MPRINAVI_LIVES, MPRINAVI_NOTES, MPRINAVI_RULES, MPRINAVI_SECONDS, NOTE_NAMES, POS_MAX, POS_MIN, drawMprinavi, flightAnswer, flightNotes,
  flightSeconds, mprinaviPoints, namedRight, naturalsOf, newFlight, staffPos, stepOf, type MprinaviQ,
} from '../src/utils/mprinavi';
import { encodeTaps } from '../src/utils/eqo';
import { MELODY_POOL } from '../src/data/melodyPool';
import { answerRound, newRounds, publicView, roundKey } from '../src/utils/roundGames';
import { mulberry32 } from '../src/utils/otkheuli';

// „მფრინავი ნოტები“ (utils/mprinavi.ts): the notes' places on the two staves, a melody's natural notes on each clef, a room's
// rounds (four notes, every round another melody), the points and the flight alone or round the circle.

test('the staff: the bottom line, the spaces, the ledger lines; the names', () => {
  assert.equal(staffPos(64, 'treble'), 0); // მი on the bottom line
  assert.equal(staffPos(65, 'treble'), 1);
  assert.equal(staffPos(77, 'treble'), 8); // ფა on the top line
  assert.equal(staffPos(60, 'treble'), -2); // დო on a ledger line
  assert.equal(staffPos(43, 'bass'), 0); // სოლ
  assert.equal(staffPos(57, 'bass'), 8); // ლა
  assert.equal(staffPos(60, 'bass'), 10);
  assert.equal(stepOf(60), 0);
  assert.equal(stepOf(71), 6);
  assert.equal(stepOf(70), null);
  assert.equal(NOTE_NAMES.abc[6], 'H');
  assert.equal(NOTE_NAMES.syl[4], 'სოლ');
});

test('a melody\'s natural notes: the top voice an octave up on the treble clef, the bass on the bass clef, all on the staff', () => {
  for (const m of MELODY_POOL) {
    for (const clef of ['treble', 'bass'] as const) {
      const line = naturalsOf(m, clef);
      for (const [i, n] of line.entries()) {
        assert.notEqual(stepOf(n), null, `${m.id} ${n}`);
        assert.ok(staffPos(n, clef) >= POS_MIN && staffPos(n, clef) <= POS_MAX, `${m.id} ${clef} ${n}`);
        if (i) assert.notEqual(n, line[i - 1]);
      }
    }
  }
  const m = MELODY_POOL[0];
  assert.deepEqual(naturalsOf(m, 'treble').slice(0, 3), m.top.filter(n => stepOf(n) !== null).slice(0, 3).map(n => n + 12));
  assert.ok(MELODY_POOL.filter(x => naturalsOf(x, 'treble').length >= 12 && naturalsOf(x, 'bass').length >= 12).length >= 25);
});

test('a room\'s rounds: four notes in a row of a melody, another melody each round, the clefs in turn', () => {
  for (const clefs of ['treble', 'bass', 'both'] as const) {
    const rounds = drawMprinavi({ melodies: MELODY_POOL, count: 12, clefs, names: 'syl', rnd: mulberry32(4) });
    assert.equal(rounds.length, 12);
    assert.equal(new Set(rounds.map(r => r.id)).size, 12);
    rounds.forEach((r, i) => {
      assert.ok(MPRINAVI_RULES.valid(JSON.parse(JSON.stringify(r))), JSON.stringify(r));
      assert.equal(r.notes.length, MPRINAVI_NOTES);
      assert.equal(r.clef, clefs === 'both' ? (i % 2 ? 'bass' : 'treble') : clefs);
      const line = naturalsOf(MELODY_POOL.find(m => m.id === r.id)!, r.clef).join('.');
      assert.ok(line.includes(r.notes.join('.')), r.id);
    });
  }
  const all = MELODY_POOL.map(m => m.id);
  const fresh = drawMprinavi({ melodies: MELODY_POOL, count: 2, clefs: 'treble', names: 'abc', seen: all.slice(2), rnd: mulberry32(1) });
  assert.deepEqual(fresh.map(r => r.id).sort(), all.slice(0, 2).sort());
  assert.equal(fresh[0].names, 'abc');
});

test('points: 250 a note named in its place, half of it by the time\'s end', () => {
  const q = { notes: [64, 67, 65, 72] }; // მი სოლ ფა დო
  const lim = MPRINAVI_SECONDS * 1000;
  assert.equal(namedRight(q.notes, [2, 4, 3, 0]), 4);
  assert.equal(namedRight(q.notes, [2, 3, 4, 0]), 2);
  assert.equal(mprinaviPoints(q, { pick: encodeTaps([2, 4, 3, 0]), ms: 0 }, lim), 1000);
  assert.equal(mprinaviPoints(q, { pick: encodeTaps([2, 4, 3, 0]), ms: lim }, lim), 500);
  assert.equal(mprinaviPoints(q, { pick: encodeTaps([2, 4]), ms: lim / 2 }, lim), 375);
  assert.equal(mprinaviPoints(q, { pick: encodeTaps([0, 0, 0, 1]), ms: 0 }, lim), 0);
});

test('a round read back, and in the room', () => {
  const rounds = drawMprinavi({ melodies: MELODY_POOL, count: 3, clefs: 'both', names: 'syl', rnd: mulberry32(8) });
  const q = rounds[0];
  const broken: unknown[] = [
    { ...q, kind: 'eqo' }, { ...q, clef: 'alto' }, { ...q, notes: [61, 62, 64, 65] }, { ...q, notes: [96, 64, 65, 67] }, { ...q, notes: [] },
    { ...q, names: 'latin' }, { ...q, ref: '' }, null,
  ];
  for (const b of broken) assert.ok(!MPRINAVI_RULES.valid(b), JSON.stringify(b));
  assert.ok(MPRINAVI_RULES.ok(q, encodeTaps([6, 6, 6, 6])) && !MPRINAVI_RULES.ok(q, encodeTaps([7])) && !MPRINAVI_RULES.ok(q, encodeTaps([0, 0, 0, 0, 0])));

  const players = ['ა', 'ბ'].map((name, i) => ({ uid: `u${i}`, name }));
  let s = newRounds(players, { game: 'mprinavi', rounds, sound: 'all', now: 1000 })!;
  assert.equal((publicView(s).q as Partial<MprinaviQ>).title, undefined);
  assert.deepEqual((publicView(s).q as Partial<MprinaviQ>).notes, q.notes);
  const right = q.notes.map(n => stepOf(n)!);
  s = answerRound(s, 0, { key: roundKey(s), pick: encodeTaps(right), ms: 0 });
  s = answerRound(s, 1, { key: roundKey(s), pick: encodeTaps([...right.slice(0, 3), (right[3] + 1) % 7]), ms: 0 });
  assert.deepEqual(s.gained, [1000, 750]);
});

test('the flight: melodies one after another on their clefs, faster after every four, three misses end it', () => {
  const notes = flightNotes(MELODY_POOL, 'both', [], mulberry32(2), 300);
  assert.equal(notes.length, 300);
  assert.ok(notes.some(n => n.clef === 'treble') && notes.some(n => n.clef === 'bass'));
  // a melody's notes come together, in its order
  const first = notes.filter(n => n.melody === notes[0].melody && n.clef === notes[0].clef).map(n => n.midi);
  assert.deepEqual(first.slice(0, 5), naturalsOf(MELODY_POOL.find(m => m.id === notes[0].melody)!, notes[0].clef).slice(0, 5));
  assert.equal(flightSeconds(0), 7);
  assert.ok(flightSeconds(8) < flightSeconds(4) && flightSeconds(4) < flightSeconds(0));
  assert.equal(flightSeconds(1000), 2.2);
  let f = newFlight();
  assert.equal(f.lives, MPRINAVI_LIVES);
  f = flightAnswer(flightAnswer(f, true, 10), false, 10);
  assert.deepEqual([f.at, f.right, f.lives, f.over], [2, 1, 2, false]);
  f = flightAnswer(flightAnswer(f, false, 10), false, 10);
  assert.ok(f.over);
  assert.deepEqual(flightAnswer(f, true, 10), f);
  assert.ok(flightAnswer(newFlight(), true, 1).over);
});
