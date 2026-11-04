import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/utils/otkheuli';
import {
  BURN_GRACE, BURN_MAX, BURN_MIN, CHURCHKHELA_RULES, drawChurchkhela, holdPoints, isSafe, releasePick, releasedMs, secondsText,
  taskSeats, type ChurchkhelaQ,
} from '../src/utils/churchkhelaRounds';
import { answerRound, newRounds, publicView, roundKey } from '../src/utils/roundGames';

const POOL = Array.from({ length: 6 }, (_, i) => ({ url: `https://a.example/${i}`, title: `ჰანგი ${i}`, sub: `კუთხე ${i}` }));
const TASKS = [{ text: 'იმღერე', kind: 'იმღერე' }, { text: 'დაასახელე', kind: 'დაასახელე' }, { text: 'თქვი ანდაზა', kind: 'სახალისო' }];
const Q: ChurchkhelaQ = { kind: 'churchkhela', id: 'x-0', url: 'https://a.example/0', from: 0.2, title: 'ჰანგი', sub: 'კუთხე', burn: 12000, task: 'იმღერე', taskKind: 'იმღერე' };

test('a pick: when it was let go, in tenths of a second; safe only before the burn', () => {
  assert.equal(releasePick(0), 1);
  assert.equal(releasePick(8340), 84);
  assert.equal(releasedMs(84), 8300);
  assert.ok(isSafe(Q, releasePick(11999)));
  assert.ok(!isSafe(Q, releasePick(12000)));
  assert.ok(!isSafe(Q, 0));
  assert.ok(!isSafe(Q, null));
  assert.equal(secondsText(8300), '8,3');
});

test('the points: the share of the time held, nothing when burnt', () => {
  assert.equal(holdPoints(Q, releasePick(6000)), 500);
  assert.equal(holdPoints(Q, releasePick(11950)), 992);
  assert.equal(holdPoints(Q, 1), 10, 'let go at once still counts a little');
  assert.equal(holdPoints(Q, 0), 0);
  assert.equal(holdPoints(Q, releasePick(13000)), 0);
});

test('who does the task: the burnt, else the first to let go', () => {
  assert.deepEqual(taskSeats(Q, [50, 0, 90, null]), [1, 3]);
  assert.deepEqual(taskSeats(Q, [50, 31, 90]), [1]);
  assert.deepEqual(taskSeats(Q, [releasePick(12500), 40]), [0], 'let go after the burn is burnt');
  assert.deepEqual(taskSeats(Q, []), []);
});

test('a game: a recording a round, the unplayed first, the burn in its range, a task never twice running', () => {
  const recent = [POOL[0].url, POOL[1].url];
  const rounds = drawChurchkhela({ pool: POOL, tasks: TASKS, count: 8, recent, rnd: mulberry32(7) });
  assert.equal(rounds.length, 8);
  assert.ok(rounds.slice(0, 4).every(q => !recent.includes(q.url)), 'the ones not played lately come first');
  assert.equal(new Set(rounds.slice(0, 6).map(q => q.url)).size, 6);
  assert.equal(new Set(rounds.map(q => q.id)).size, 8);
  rounds.forEach((q, i) => {
    assert.ok(CHURCHKHELA_RULES.valid(q), JSON.stringify(q));
    assert.ok(q.burn >= BURN_MIN && q.burn <= BURN_MAX && q.burn % 100 === 0);
    assert.ok(q.from >= 0.05 && q.from <= 0.65);
    if (i > 0) assert.notEqual(q.task, rounds[i - 1].task);
  });
  assert.deepEqual(drawChurchkhela({ pool: [], tasks: TASKS, count: 5 }), []);
  assert.equal(drawChurchkhela({ pool: POOL, tasks: [], count: 2, rnd: mulberry32(1) })[0].task, '');
});

test('a round is valid only whole; its clock runs past the burn', () => {
  assert.ok(CHURCHKHELA_RULES.valid(Q));
  assert.ok(!CHURCHKHELA_RULES.valid({ ...Q, burn: BURN_MIN - 100 }));
  assert.ok(!CHURCHKHELA_RULES.valid({ ...Q, url: '' }));
  assert.ok(!CHURCHKHELA_RULES.valid({ ...Q, from: 1 }));
  assert.equal(CHURCHKHELA_RULES.seconds(Q, 1), 12 + BURN_GRACE);
  assert.ok(CHURCHKHELA_RULES.ok(Q, 0));
  assert.ok(CHURCHKHELA_RULES.ok(Q, (12 + BURN_GRACE) * 10 + 1));
  assert.ok(!CHURCHKHELA_RULES.ok(Q, (12 + BURN_GRACE) * 10 + 2));
});

test('in the room: the piece and the burn are public, what played and the task only at the reveal', () => {
  const players = [{ uid: 'a', name: 'ანა' }, { uid: 'b', name: 'ბექა' }, { uid: 'c', name: 'გიო' }];
  let s = newRounds(players, { game: 'churchkhela', rounds: [Q], sound: 'all', now: 1000 })!;
  const asked = publicView(s).q as Partial<ChurchkhelaQ>;
  assert.equal(asked.burn, 12000);
  assert.equal(asked.url, Q.url);
  assert.equal(asked.title, undefined);
  assert.equal(asked.task, undefined);
  const key = roundKey(s);
  s = answerRound(s, 0, { key, pick: releasePick(9000), ms: 9050 });
  s = answerRound(s, 1, { key, pick: 0, ms: 12010 });
  s = answerRound(s, 2, { key, pick: releasePick(3000), ms: 3040 });
  assert.equal(s.phase, 'reveal');
  assert.deepEqual(s.gained, [750, 0, 250]);
  const shown = publicView(s).q as Partial<ChurchkhelaQ>;
  assert.equal(shown.task, 'იმღერე');
});
