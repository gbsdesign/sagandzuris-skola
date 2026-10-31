import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TURNIRI_RULES, TURNIRI_SECONDS, drawTurniri, turniriPoints, type TurniriQ } from '../src/utils/turniri';
import type { KnownChant } from '../src/utils/chantRounds';
import {
  answerRound, hybridNext, hybridScores, markTeam, newHybrid, newRounds, parseHybrid, parseRoundsState, publicView, roundKey,
} from '../src/utils/roundGames';
import { mulberry32 } from '../src/utils/otkheuli';

// „ხმების ტურნირი“ (utils/turniri.ts): a take's points, a round read back, a game's phrases, and three rounds in the room
// and on one phone passed hand to hand.

const chant = (id: string, title: string, service = 'წირვა', num = 1): KnownChant => ({ id, title, service, book: 'v9', num });
const POOL = [
  chant('a', 'წმიდაო ღმერთო', 'წირვა', 62), chant('b', 'წმიდაო ღმერთო', 'წირვა', 63), chant('c', 'რომელი ქერუბიმთა', 'წირვა', 64),
  chant('d', 'ნათელო მხიარულო', 'მწუხრი', 45), chant('e', 'ღმერთი უფალი', 'ცისკარი', 84),
];

test('a take\'s points are the share of the phrase sung right; only a whole per cent is an answer', () => {
  assert.equal(turniriPoints({ pick: 78 }), 78);
  assert.equal(turniriPoints({ pick: 140 }), 100);
  assert.equal(turniriPoints({ pick: -3 }), 0);
  const q = drawTurniri(POOL, 1, [], mulberry32(1))[0];
  assert.ok(TURNIRI_RULES.ok(q, 0) && TURNIRI_RULES.ok(q, 100));
  assert.ok(!TURNIRI_RULES.ok(q, 101) && !TURNIRI_RULES.ok(q, -1) && !TURNIRI_RULES.ok(q, 50.5));
  assert.equal(TURNIRI_RULES.steps(q), 1);
  assert.equal(TURNIRI_RULES.seconds(q, 1), TURNIRI_SECONDS);
  assert.deepEqual(TURNIRI_RULES.secret, []);
});

test('a game\'s phrases: a chant once, those not sung lately first; a round read back only when whole', () => {
  for (let seed = 1; seed < 20; seed++) {
    const g = drawTurniri(POOL, 3, [], mulberry32(seed));
    assert.equal(g.length, 3);
    assert.equal(new Set(g.map(r => r.title)).size, 3);
    for (const r of g) {
      assert.ok(TURNIRI_RULES.valid(r));
      const c = POOL.find(x => x.id === r.id)!;
      assert.deepEqual(r, { kind: 'turniri', id: c.id, title: c.title, service: c.service, book: c.book, num: c.num });
    }
  }
  // four names: the one not sung lately comes first
  const later = drawTurniri(POOL, 1, ['a', 'b', 'c', 'd'], mulberry32(2));
  assert.equal(later[0].id, 'e');
  assert.equal(drawTurniri(POOL, 9).length, 4);
  const q = drawTurniri(POOL, 1, [], mulberry32(3))[0];
  for (const b of [{ ...q, kind: 'otkhi' }, { ...q, num: 0 }, { ...q, title: '' }, { ...q, book: undefined }, null, 'x']) {
    assert.ok(!TURNIRI_RULES.valid(b), JSON.stringify(b));
  }
});

test('three rounds in the room: every one sends their take, the table adds them up', () => {
  const rounds = drawTurniri(POOL, 3, [], mulberry32(4));
  const players = ['ა', 'ბ'].map((name, i) => ({ uid: `u${i}`, name }));
  let s = newRounds(players, { game: 'turniri', rounds, sound: 'all', now: 1 })!;
  // nothing is secret: the phrase must be known to be sung
  assert.equal((publicView(s).q as Partial<TurniriQ>).id, rounds[0].id);
  s = answerRound(s, 0, { key: roundKey(s), pick: 120, ms: 1 });
  assert.equal(s.answers[0], null);
  s = answerRound(s, 0, { key: roundKey(s), pick: 85, ms: 30_000 });
  s = answerRound(s, 1, { key: roundKey(s), pick: 40, ms: 60_000 });
  assert.equal(s.phase, 'reveal');
  assert.deepEqual(s.gained, [85, 40]);
  assert.deepEqual(publicView(s).picks, [85, 40]);
  assert.deepEqual(parseRoundsState(JSON.stringify(s)), s);
});

test('on one phone: each singer\'s take is kept as their mark, the totals add up', () => {
  const rounds = drawTurniri(POOL, 3, [], mulberry32(5));
  let h = newHybrid('turniri', ['ნინო', 'ლუკა', 'ანა'], rounds)!;
  h = markTeam(markTeam(h, 0, 72), 2, 90);
  assert.deepEqual(h.marks[0], [72, null, 90]);
  h = markTeam(hybridNext(hybridNext(h)), 1, 64);
  assert.deepEqual(hybridScores(h), [72, 64, 90]);
  assert.deepEqual(parseHybrid(JSON.parse(JSON.stringify(h))), h);
});
