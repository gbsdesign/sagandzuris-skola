import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/utils/otkheuli';
import { BUILT_IN_RHYMES, beatsOf } from '../src/utils/gatvla';
import { GATVLA_RULES, GATVLA_SECONDS, drawGatvla, landing, shortNames, type GatvlaQ } from '../src/utils/gatvlaRounds';
import { answerRound, newRounds, publicView, roundKey } from '../src/utils/roundGames';

const NAMES = ['ანა', 'ბექა', 'გიო', 'დათო', 'ელე'];

test('where the rhyme lands: its last word, counted round the circle from the first one', () => {
  const q = { names: NAMES, words: ['ერთი', 'ორი', 'სამი'], from: 0 };
  assert.equal(landing(q), 2);
  assert.equal(landing({ ...q, from: 4 }), 1);
  assert.equal(landing({ ...q, words: beatsOf(BUILT_IN_RHYMES[0].text) }), (33 - 1) % 5);
});

test('a game: each round one fewer in the circle, the one picked before gone, the rhymes in turn', () => {
  const rounds = drawGatvla({ players: NAMES, rhymes: BUILT_IN_RHYMES, count: 12, rnd: mulberry32(4) });
  assert.equal(rounds.length, NAMES.length - 1, 'at most one round fewer than the players');
  rounds.forEach((q, i) => {
    assert.ok(GATVLA_RULES.valid(q), JSON.stringify(q));
    assert.equal(q.names.length, NAMES.length - i);
    assert.equal(q.before.length, i);
    if (i > 0) {
      const prev = rounds[i - 1];
      const picked = prev.names[landing(prev)];
      assert.deepEqual(q.before, [...prev.before, picked]);
      assert.ok(!q.names.includes(picked), `${picked} is still in the circle`);
      assert.notEqual(q.title, prev.title, 'the same rhyme twice running');
    }
  });
  assert.equal(drawGatvla({ players: NAMES, rhymes: BUILT_IN_RHYMES, count: 2, rnd: mulberry32(1) }).length, 2);
  // a lone player, or no rhyme of two words, gives no game; a name twice is one
  assert.deepEqual(drawGatvla({ players: ['ანა'], rhymes: BUILT_IN_RHYMES, count: 5 }), []);
  assert.deepEqual(drawGatvla({ players: NAMES, rhymes: [{ title: 'x', text: 'ერთი' }], count: 5 }), []);
  assert.equal(drawGatvla({ players: ['ანა', 'ანა', 'ბექა'], rhymes: BUILT_IN_RHYMES, count: 5 }).length, 1);
});

test('the circle\'s names: first names, the whole one where two share it', () => {
  assert.deepEqual(shortNames(['ნინო ბერიძე', 'ნინო კაპანაძე', 'ლუკა მაისურაძე', 'ანა']), ['ნინო ბერიძე', 'ნინო კაპანაძე', 'ლუკა', 'ანა']);
});

test('a round is valid only whole', () => {
  const q: GatvlaQ = { kind: 'gatvla', names: NAMES, title: 'ლექსი', words: ['ერთი', 'ორი'], from: 1, before: [] };
  assert.ok(GATVLA_RULES.valid(q));
  assert.ok(!GATVLA_RULES.valid({ ...q, from: 5 }));
  assert.ok(!GATVLA_RULES.valid({ ...q, names: ['ანა'], from: 0 }));
  assert.ok(!GATVLA_RULES.valid({ ...q, words: [] }));
  assert.ok(!GATVLA_RULES.ok(q, 5));
  assert.ok(GATVLA_RULES.ok(q, 4));
});

test('in the room: nothing is kept from the players, the right one by speed', () => {
  const players = [{ uid: 'a', name: 'ანა' }, { uid: 'b', name: 'ბექა' }];
  const q: GatvlaQ = { kind: 'gatvla', names: NAMES, title: 'ლექსი', words: ['ერთი', 'ორი', 'სამი'], from: 0, before: [] };
  let s = newRounds(players, { game: 'gatvla', rounds: [q], sound: 'all', now: 1000 })!;
  assert.deepEqual((publicView(s).q as GatvlaQ).names, NAMES);
  const key = roundKey(s);
  s = answerRound(s, 0, { key, pick: 2, ms: 0 });
  s = answerRound(s, 1, { key, pick: 3, ms: GATVLA_SECONDS * 500 });
  assert.equal(s.phase, 'reveal');
  assert.deepEqual(s.gained, [1000, 0]);
});
