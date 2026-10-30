import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KIDS_SPEECH, SPEECH, TRADES, accusedOf, checkAnswer, chronicle, dayNext, dealNext, dealRoles, introNext, markAsks, morningNext, newGame,
  nightNext, parseGame, piperOptional, resolveNight, roleSet, rolesFromMarks, speakOrder, speechOf, stepReady, stepsOf, targetsOf, tieNext,
  toggleMark, verdictNext, voteDone, voteResult, winner,
  type Marks, type RoleId, type SamGame,
} from '../src/utils/samshvilde';
import { mulberry32 } from '../src/utils/otkheuli';

const count = (roles: RoleId[], r: RoleId) => roles.filter(x => x === r).length;

test('roleSet follows the printed table for 6–16 players', () => {
  // players → spies, boss, warden, guard, healer, elder, piper (with the piper chosen where it is optional)
  const table: Record<number, number[]> = {
    6: [1, 0, 1, 0, 1, 0, 0], 7: [2, 0, 1, 0, 1, 0, 0], 8: [2, 0, 1, 0, 1, 0, 0], 9: [1, 1, 1, 0, 1, 1, 0], 10: [1, 1, 1, 0, 1, 1, 0],
    11: [2, 1, 1, 0, 1, 1, 1], 12: [2, 1, 1, 0, 1, 1, 1], 13: [2, 1, 1, 1, 1, 1, 1], 14: [2, 1, 1, 1, 1, 1, 1], 15: [3, 1, 1, 1, 1, 1, 1], 16: [3, 1, 1, 1, 1, 1, 1],
  };
  for (let n = 6; n <= 16; n++) {
    const roles = roleSet({ players: n, piper: true, kids: false });
    assert.equal(roles.length, n, `${n}`);
    const got = (['spy', 'boss', 'warden', 'guard', 'healer', 'elder', 'piper'] as RoleId[]).map(r => count(roles, r));
    assert.deepEqual(got, table[n], `${n}`);
    // without the piper an optional one gives its place to a citizen
    const plain = roleSet({ players: n, piper: false, kids: false });
    assert.equal(count(plain, 'piper'), piperOptional(n) ? 0 : table[n][6], `${n}`);
    assert.equal(plain.length, n);
  }
  assert.deepEqual(roleSet({ players: 5, piper: false, kids: false }), []);
  assert.deepEqual(roleSet({ players: 17, piper: false, kids: false }), []);
});

test('the little ones play with spies, the warden, the healer and citizens — and only up to nine', () => {
  const nine = roleSet({ players: 9, piper: false, kids: true });
  assert.deepEqual([count(nine, 'spy'), count(nine, 'boss'), count(nine, 'warden'), count(nine, 'healer'), count(nine, 'elder'), count(nine, 'citizen')], [2, 0, 1, 1, 0, 5]);
  const ten = roleSet({ players: 10, piper: false, kids: true });
  assert.equal(count(ten, 'boss'), 1, 'ten players play the whole game');
  const g = newGame(Array.from({ length: 7 }, (_, i) => `ბავშვი ${i + 1}`), { deal: 'phone', piper: false, kids: true }, mulberry32(3))!;
  assert.equal(g.kids, true);
  assert.equal(speechOf(g), KIDS_SPEECH);
  const big = newGame(Array.from({ length: 12 }, (_, i) => `${i + 1}`), { deal: 'phone', piper: false, kids: true }, mulberry32(3))!;
  assert.equal(big.kids, false);
  assert.equal(speechOf(big), SPEECH);
});

test('dealRoles gives every name one role and the citizens different trades', () => {
  const names = Array.from({ length: 16 }, (_, i) => `მოთამაშე ${i + 1}`);
  const roles = roleSet({ players: 16, piper: true, kids: false });
  const players = dealRoles(names, roles, mulberry32(11));
  assert.deepEqual(players.map(p => p.name), names);
  assert.deepEqual([...players.map(p => p.role)].sort(), [...roles].sort());
  const trades = players.filter(p => p.role === 'citizen').map(p => p.trade);
  assert.equal(new Set(trades).size, trades.length);
  assert.ok(trades.every(t => TRADES.includes(t!)));
  assert.ok(players.filter(p => p.role !== 'citizen').every(p => p.trade === undefined));
  assert.deepEqual(dealRoles(names, roles, mulberry32(11)), players, 'the same seed deals the same');
});

test('newGame: 6–16 names; the phone deals first, the printed cards start with the first night', () => {
  const names = (n: number) => Array.from({ length: n }, (_, i) => `${i + 1}`);
  assert.equal(newGame(names(5), { deal: 'phone', piper: false, kids: false }), null);
  assert.equal(newGame(names(17), { deal: 'phone', piper: false, kids: false }), null);
  const p = newGame(names(8), { deal: 'phone', piper: false, kids: false }, mulberry32(1))!;
  assert.deepEqual(p.phase, { kind: 'deal', at: 0, show: false });
  const c = newGame(names(8), { deal: 'cards', piper: false, kids: false }, mulberry32(1))!;
  assert.equal(c.phase.kind, 'night');
  assert.ok(c.players.every(x => x.role === 'citizen'), 'nobody is known before the marks');
  assert.equal(c.roles.length, 8);
});

// a game with known seats: 0 spy, 1 boss, 2 warden, 3 guard, 4 healer, 5 elder, 6 piper, 7–12 citizens
const SEATS: RoleId[] = ['spy', 'boss', 'warden', 'guard', 'healer', 'elder', 'piper', 'citizen', 'citizen', 'citizen', 'citizen', 'citizen', 'citizen'];
const fixed = (roles: RoleId[] = SEATS): SamGame => ({
  v: 1, deal: 'phone', kids: false, roles: [...roles], players: roles.map((role, i) => ({ name: `ს${i}`, role })), out: roles.map(() => null),
  shield: true, nights: [], days: [], phase: { kind: 'night', n: 2, step: 0, acts: {}, marks: {} },
});

test('the nights keep the printed order; every role wakes once on the first night', () => {
  const g = fixed();
  assert.deepEqual(stepsOf(g, 1), ['dusk', 'meetSpies', 'meetWarden', 'meetHealer', 'meetElder', 'meetPiper']);
  assert.deepEqual(stepsOf(g, 2), ['dusk', 'piper', 'spies', 'healer', 'check']);
  const small = fixed(['spy', 'warden', 'healer', 'citizen', 'citizen', 'citizen']);
  assert.deepEqual(stepsOf(small, 3), ['dusk', 'spies', 'healer', 'check']);
});

test('targetsOf: the piper and the healer never twice in a row, the spies never their own, the warden not his pair', () => {
  const g = fixed();
  g.nights = [{ n: 2, acts: { piper: 9, spies: 8, healer: 8, check: 7 }, taken: null, why: 'healed', answer: 'no' }];
  const piper = targetsOf(g, 'piper', 3);
  assert.ok(!piper.includes(6) && !piper.includes(9) && piper.includes(8));
  const healer = targetsOf(g, 'healer', 3);
  assert.ok(healer.includes(4), 'the healer may keep their own house');
  assert.ok(!healer.includes(8));
  assert.deepEqual(targetsOf(g, 'spies', 3), [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const check = targetsOf(g, 'check', 3);
  assert.ok(!check.includes(2) && !check.includes(3) && check.includes(0));
  // a role that is out keeps its words, but has nobody to point at
  g.out[6] = { by: 'jailed', at: 2 };
  assert.deepEqual(targetsOf(g, 'piper', 3), []);
  assert.equal(stepReady(g, 'piper', 3, {}, {}), true);
  assert.equal(stepReady(g, 'spies', 3, {}, {}), false);
  assert.equal(stepReady(g, 'spies', 3, { spies: null }, {}), true, '„ვერ შეთანხმდნენ“ is a choice');
});

test('resolveNight: the healer, the elder, the piper and the spies that cannot agree', () => {
  const g = fixed();
  assert.deepEqual(resolveNight(g, { spies: 8 }), { taken: 8, why: null, shieldUsed: false });
  assert.deepEqual(resolveNight(g, { spies: null }), { taken: null, why: 'noAgree', shieldUsed: false });
  assert.deepEqual(resolveNight(g, { spies: 8, healer: 8 }), { taken: null, why: 'healed', shieldUsed: false });
  // the healer put to sleep protects nobody
  assert.deepEqual(resolveNight(g, { piper: 4, spies: 8, healer: 8 }), { taken: 8, why: null, shieldUsed: false });
  // the elder outlives the first capture only
  assert.deepEqual(resolveNight(g, { spies: 5 }), { taken: null, why: 'elder', shieldUsed: true });
  assert.deepEqual(resolveNight({ ...g, shield: false }, { spies: 5 }), { taken: 5, why: null, shieldUsed: false });
  // one of two spies asleep: the other still takes; the last spy asleep takes nobody
  assert.equal(resolveNight(g, { piper: 0, spies: 8 }).taken, 8);
  const lone = fixed();
  lone.out[1] = { by: 'jailed', at: 2 };
  assert.deepEqual(resolveNight(lone, { piper: 0, spies: 8 }), { taken: null, why: 'asleep', shieldUsed: false });
});

test('checkAnswer: a spy is shown, the boss looks a citizen, a sleeping warden gets no answer, the guard goes on alone', () => {
  const g = fixed();
  assert.equal(checkAnswer(g, { check: 0 }), 'spy');
  assert.equal(checkAnswer(g, { check: 1 }), 'no');
  assert.equal(checkAnswer(g, { check: 8 }), 'no');
  assert.equal(checkAnswer(g, { piper: 2, check: 0 }), 'none');
  assert.equal(checkAnswer(g, { piper: 3, check: 0 }), 'spy', 'the guard asleep does not stop the warden');
  g.out[2] = { by: 'taken', at: 2 };
  assert.equal(checkAnswer(g, { check: 0 }), 'spy');
  assert.equal(checkAnswer(g, { piper: 3, check: 0 }), 'none');
  g.out[3] = { by: 'jailed', at: 3 };
  assert.equal(checkAnswer(g, { check: 0 }), 'none');
});

test('the printed cards: the host marks who wakes on the first night, the boss among the spies', () => {
  const names = Array.from({ length: 13 }, (_, i) => `${i}`);
  let g = newGame(names, { deal: 'cards', piper: true, kids: false }, mulberry32(2))!;
  let marks: Marks = {};
  const spiesAsk = () => markAsks(g, 'meetSpies', marks);
  assert.deepEqual(spiesAsk().map(a => [a.key, a.need]), [['spies', 3], ['boss', 1]]);
  for (const i of [4, 7, 9]) marks = toggleMark(marks, spiesAsk()[0], i);
  marks = toggleMark(marks, spiesAsk()[0], 11);
  assert.deepEqual(marks.spies, [4, 7, 9], 'never more than the role needs');
  assert.deepEqual(spiesAsk()[1].from, [4, 7, 9]);
  marks = toggleMark(marks, spiesAsk()[1], 7);
  assert.equal(stepReady(g, 'meetSpies', 1, {}, marks), true);
  // untapping a spy who was the boss takes the boss away too
  marks = toggleMark(marks, spiesAsk()[0], 7);
  assert.deepEqual(marks.boss, []);
  marks = toggleMark(toggleMark(marks, spiesAsk()[0], 7), spiesAsk()[1], 7);
  const warden = markAsks(g, 'meetWarden', marks);
  assert.deepEqual(warden.map(a => a.key), ['warden', 'guard']);
  assert.ok(!warden[0].from.includes(4), 'a spy is not offered again');
  marks = toggleMark(marks, warden[0], 0);
  marks = toggleMark(marks, markAsks(g, 'meetWarden', marks)[1], 1);
  for (const [step, i] of [['meetHealer', 2], ['meetElder', 3], ['meetPiper', 5]] as const) marks = toggleMark(marks, markAsks(g, step, marks)[0], i);
  const players = rolesFromMarks(g, marks);
  assert.deepEqual(players.map(p => p.role), ['warden', 'guard', 'healer', 'elder', 'spy', 'piper', 'citizen', 'boss', 'citizen', 'spy', 'citizen', 'citizen', 'citizen']);
  // the first night's end gives the players their roles
  g = { ...g, phase: { kind: 'night', n: 1, step: stepsOf(g, 1).length - 1, acts: {}, marks } };
  g = nightNext(g);
  assert.equal(g.phase.kind, 'morning');
  assert.deepEqual(g.players.map(p => p.role), players.map(p => p.role));
});

test('voteResult: one accused needs more than half; a tie talks and votes again; a second tie jails nobody', () => {
  assert.deepEqual(voteResult([3], [5], 9, 1), { jailed: 3, tie: [] });
  assert.deepEqual(voteResult([3], [4], 9, 1), { jailed: null, tie: [] });
  assert.deepEqual(voteResult([3], [4], 8, 1), { jailed: null, tie: [] }, 'half is not more than half');
  assert.deepEqual(voteResult([3, 5, 6], [2, 4, 3], 9, 1), { jailed: 5, tie: [] });
  assert.deepEqual(voteResult([3, 5, 6], [4, 4, 1], 9, 1), { jailed: null, tie: [3, 5] });
  assert.deepEqual(voteResult([3, 5], [4, 4], 8, 2), { jailed: null, tie: [] });
  assert.deepEqual(voteResult([], [], 8, 1), { jailed: null, tie: [] });
  assert.deepEqual(accusedOf([null, 4, 2, 4, null, 7]), [4, 2, 7]);
});

test('speakOrder starts one seat further every day and skips those who are out', () => {
  const g = fixed();
  assert.deepEqual(speakOrder(g, 2).slice(0, 3), [1, 2, 3]);
  assert.deepEqual(speakOrder(g, 3).slice(0, 2), [2, 3]);
  g.out[2] = { by: 'taken', at: 3 };
  assert.deepEqual(speakOrder(g, 3).slice(0, 2), [3, 4]);
  assert.equal(speakOrder(g, 3).length, 12);
  assert.deepEqual(speakOrder(g, 14)[0], 0, 'round the circle');
});

test('a whole game: deal, nights, a day with a tie, the city wins, and the chronicle tells it', () => {
  const roles: RoleId[] = ['spy', 'warden', 'healer', 'citizen', 'citizen', 'citizen'];
  let g = newGame(['ა', 'ბ', 'გ', 'დ', 'ე', 'ვ'], { deal: 'phone', piper: false, kids: false }, mulberry32(4))!;
  // seat the roles where the test wants them
  g = { ...g, roles, players: roles.map((role, i) => ({ name: 'აბგდევ'[i], role })) };
  for (let i = 0; i < 6; i++) { g = dealNext(g); g = dealNext(g); }
  assert.deepEqual(g.phase, { kind: 'night', n: 1, step: 0, acts: {}, marks: {} });
  while (g.phase.kind === 'night') g = nightNext(g);
  assert.deepEqual(g.phase, { kind: 'morning', n: 1 });
  g = morningNext(g);
  assert.equal(g.phase.kind, 'intro');
  for (let i = 0; i < 6; i++) g = introNext(g);
  assert.deepEqual(g.phase, { kind: 'night', n: 2, step: 0, acts: {}, marks: {} });
  // night 2: the spy takes დ, the healer guards ე, the warden finds the spy
  g = { ...g, phase: { kind: 'night', n: 2, step: stepsOf(g, 2).length - 1, acts: { spies: 3, healer: 4, check: 0 }, marks: {} } };
  g = nightNext(g);
  assert.deepEqual(g.out[3], { by: 'taken', at: 2 });
  assert.equal(g.nights.at(-1)?.answer, 'spy');
  g = morningNext(g);
  assert.equal(g.phase.kind, 'day');
  if (g.phase.kind !== 'day') return;
  assert.deepEqual(g.phase.order, [1, 2, 4, 5, 0]);
  // ბ accuses ა, გ accuses ე: two accused, a tie, then ა goes to prison
  g = { ...g, phase: { ...g.phase, accuse: [0, 4, null, null, null] } };
  for (let i = 0; i < 5; i++) g = dayNext(g);
  assert.equal(g.phase.kind, 'vote');
  if (g.phase.kind !== 'vote') return;
  g = { ...g, phase: { ...g.phase, counts: [2, 2] } };
  g = voteDone(g);
  assert.equal(g.phase.kind, 'tie');
  g = tieNext(tieNext(g));
  assert.equal(g.phase.kind, 'vote');
  if (g.phase.kind !== 'vote') return;
  assert.equal(g.phase.round, 2);
  g = { ...g, phase: { ...g.phase, counts: [4, 1] } };
  g = voteDone(g);
  assert.deepEqual(g.phase, { kind: 'verdict', n: 2, jailed: 0 });
  assert.equal(winner(g), 'city');
  g = verdictNext(g);
  assert.deepEqual(g.phase, { kind: 'end', winner: 'city' });
  const ch = chronicle(g);
  assert.deepEqual(ch.map(x => x.head), ['ღამე 2', 'ბჭობა 2']);
  assert.ok(ch[0].lines.includes('ჯაშუშებმა აირჩიეს დ.'));
  assert.ok(ch[0].lines.includes('ციხისთავმა შეამოწმა ა: ჯაშუშია.'));
  assert.ok(ch[0].lines.includes('დილით: ტყვედ წაიყვანეს დ (მოქალაქე).'));
  assert.ok(ch[1].lines.includes('ფრე: ა, ე — ხელახლა ხმის მიცემა.'));
  assert.ok(ch[1].lines.includes('ციხეში ჩასვეს ა (ჯაშუში).'));
});

test('the spies win when they are as many as the rest; nobody accused means a quiet day', () => {
  const g = fixed(['spy', 'spy', 'warden', 'healer', 'citizen', 'citizen']);
  assert.equal(winner(g), null);
  g.out[4] = { by: 'taken', at: 2 };
  assert.equal(winner(g), null);
  g.out[5] = { by: 'jailed', at: 2 };
  assert.equal(winner(g), 'spies');
  const quiet = fixed();
  const day = { ...quiet, phase: { kind: 'day' as const, n: 2, order: [0, 1], at: 1, accuse: [null, null] } };
  const after = dayNext(day);
  assert.deepEqual(after.phase, { kind: 'verdict', n: 2, jailed: null });
  assert.deepEqual(after.days, [{ n: 2, accused: [], tie: [], jailed: null }]);
});

test('parseGame takes back a kept game and refuses anything else', () => {
  const g = newGame(Array.from({ length: 9 }, (_, i) => `${i}`), { deal: 'phone', piper: false, kids: false }, mulberry32(8))!;
  assert.deepEqual(parseGame(JSON.parse(JSON.stringify(g))), g);
  assert.equal(parseGame(null), null);
  assert.equal(parseGame({ ...g, v: 2 }), null);
  assert.equal(parseGame({ ...g, players: g.players.slice(0, 3) }), null);
  assert.equal(parseGame({ ...g, phase: { kind: 'night', n: 2, step: 40, acts: {}, marks: {} } }), null);
  assert.equal(parseGame({ ...g, phase: { kind: 'dance' } }), null);
  assert.equal(parseGame({ ...g, players: g.players.map(p => ({ ...p, role: 'king' })) }), null);
});
