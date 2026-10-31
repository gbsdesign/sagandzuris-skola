import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  answerRound, againRounds, hybridNext, hybridScores, markTeam, newHybrid, newRounds, nextRound, nextStep, parseHybrid,
  parseRoundsState, parseRoundsView, placesOf, publicView, roundKey, type RoundsState,
} from '../src/utils/roundGames';
import { KUTKHE_SECONDS, type KutkheQ } from '../src/utils/kutkhe';

// The quick games' rounds (utils/roundGames.ts), played with „საიდანაა სიმღერა?“'s rounds: answers once a round and only
// for the round on, the reveal when the last one is in, the points, the end, what the players may see.

const q = (region: number, n = 0): KutkheQ => ({ kind: 'kutkhe', id: `s${n}|f${n}`, url: `https://x/${n}`, from: 0.2, song: `სიმღერა ${n}`, region, who: 'გუნდი' });
const players = ['ა', 'ბ', 'გ'].map((name, i) => ({ uid: `u${i}`, name }));
const start = (rounds = [q(4, 1), q(11, 2)]) => newRounds(players, { game: 'kutkhe', rounds, sound: 'all', now: 1000 })!;
const act = (s: RoundsState, pick: number | null, ms = 2000, key = roundKey(s)) => ({ key, pick, ms });

test('a game starts: every seat waits for its answer, nobody has points', () => {
  const s = start();
  assert.equal(s.phase, 'ask');
  assert.equal(s.at, 0);
  assert.deepEqual(s.answers, [null, null, null]);
  assert.deepEqual(s.players.map(p => p.score), [0, 0, 0]);
  assert.equal(newRounds([], { game: 'kutkhe', rounds: [q(1)], sound: 'all' }), null);
  assert.equal(newRounds(players, { game: 'kutkhe', rounds: [], sound: 'all' }), null);
  assert.equal(newRounds(Array.from({ length: 41 }, (_, i) => ({ uid: `x${i}`, name: 'x' })), { game: 'kutkhe', rounds: [q(1)], sound: 'all' }), null);
});

test('an answer counts once, only for the round on, and the last one reveals it', () => {
  let s = start();
  const key = roundKey(s);
  s = answerRound(s, 0, act(s, 4, 0));
  assert.ok(s.answers[0]);
  // the same seat again: not changed
  const again = answerRound(s, 0, act(s, 9));
  assert.equal(again.answers[0]!.pick, 4);
  // a stale round's key is not taken
  assert.equal(answerRound(s, 1, act(s, 4, 100, '1.5.ask.1')), s);
  // an answer that is no region is not taken
  assert.equal(answerRound(s, 1, act(s, 13)), s);
  assert.equal(answerRound(s, 1, act(s, null)), s);
  s = answerRound(s, 1, act(s, 3, KUTKHE_SECONDS * 1000));
  assert.equal(s.phase, 'ask');
  s = answerRound(s, 2, { key, pick: 0, ms: 1000 });
  assert.equal(s.phase, 'reveal');
  // the right region quick: all of it; a neighbour (racha by imereti) late: its least; far away: nothing
  assert.deepEqual(s.gained, [1000, 300, 0]);
  assert.deepEqual(s.players.map(p => p.score), [1000, 300, 0]);
});

test('the time over reveals the round; the next round and the end', () => {
  let s = start();
  s = answerRound(s, 1, act(s, 4, 20_000));
  s = nextStep(s, 5000);
  assert.equal(s.phase, 'reveal');
  assert.deepEqual(s.gained, [0, 850, 0]);
  // no answer after the reveal
  assert.equal(answerRound(s, 0, act(s, 4)), s);
  s = nextRound(s, 6000);
  assert.equal(s.phase, 'ask');
  assert.equal(s.at, 1);
  assert.equal(s.t0, 6000);
  assert.deepEqual(s.answers, [null, null, null]);
  s = nextRound(nextStep(s));
  assert.equal(s.phase, 'end');
  assert.deepEqual(s.players.map(p => p.score), [0, 850, 0]);
  // the same players once more: new numbers, nought points, keys never met before
  const more = againRounds(s, [q(2, 5)], 9000)!;
  assert.equal(more.n, 2);
  assert.notEqual(roundKey(more), roundKey(start()));
  assert.deepEqual(more.players.map(p => p.score), [0, 0, 0]);
});

test('places: equal scores share a place', () => {
  assert.deepEqual(placesOf([10, 30, 30, 0]), [3, 1, 1, 4]);
});

test('while asked the players see no answer; at the reveal they see all', () => {
  let s = start();
  const v = publicView(s);
  const shown = v.q as Partial<KutkheQ>;
  assert.equal(shown.region, undefined);
  assert.equal(shown.song, undefined);
  assert.equal(shown.who, undefined);
  assert.equal(shown.url, 'https://x/1');
  assert.equal(v.picks, null);
  s = answerRound(s, 0, act(s, 4));
  assert.deepEqual(publicView(s).answered, [true, false, false]);
  s = nextStep(s);
  const open = publicView(s);
  assert.equal((open.q as Partial<KutkheQ>).region, 4);
  assert.equal((open.q as Partial<KutkheQ>).song, 'სიმღერა 1');
  assert.deepEqual(open.picks, [4, null, null]);
});

test('the documents come back as they were written; a broken one does not', () => {
  const s = answerRound(start(), 2, act(start(), 7));
  assert.deepEqual(parseRoundsState(JSON.stringify(s)), s);
  assert.deepEqual(parseRoundsView(JSON.stringify(publicView(s))), publicView(s));
  assert.equal(parseRoundsState('{"v":1}'), null);
  assert.equal(parseRoundsState(JSON.stringify({ ...s, rounds: [{ kind: 'kutkhe', region: 99 }] })), null);
  assert.equal(parseRoundsView('not json'), null);
});

test('the one-phone game: the host marks the teams, the scores add up', () => {
  let h = newHybrid('kutkhe', ['I', 'II', 'III'], [q(4, 1), q(5, 2)])!;
  assert.equal(newHybrid('kutkhe', ['I'], [q(4)]), null);
  h = hybridNext(h);
  assert.equal(h.phase, 'reveal');
  h = markTeam(markTeam(h, 0, 2), 2, 1);
  h = hybridNext(h);
  assert.equal(h.at, 1);
  assert.equal(h.phase, 'ask');
  h = markTeam(hybridNext(h), 0, 1);
  assert.deepEqual(hybridScores(h), [3, 0, 1]);
  h = hybridNext(h);
  assert.equal(h.phase, 'end');
  assert.deepEqual(parseHybrid(JSON.parse(JSON.stringify(h))), h);
  assert.equal(parseHybrid({ v: 1, game: 'kutkhe' }), null);
});
