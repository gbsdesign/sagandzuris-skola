import { test } from 'node:test';
import assert from 'node:assert/strict';
import { holder, isSpy, live, winner, type RoleId } from '../src/utils/samshvilde';
import {
  NO, againOnline, applyAct, bossPick, checksOf, closeVote, countsOf, hostNext, keyOf, matesOf, newOnline, nightAsk, parseSeat,
  parseState, parseView, publicView, seatView, seenCount, spiesAgree, startClock, uniqueNames, waitingFor,
  type OnlineState,
} from '../src/utils/samshvildeOnline';
import { mulberry32 } from '../src/utils/otkheuli';

const people = (n: number) => Array.from({ length: n }, (_, i) => ({ uid: `u${i}`, name: `მოთამაშე ${i + 1}` }));
const seatsOf = (s: OnlineState, r: RoleId) => s.g.players.flatMap((p, i) => (p.role === r ? [i] : []));
const act = (s: OnlineState, i: number, pick: number | null, end?: boolean) => applyAct(s, i, { key: s.key, pick, end });

/** every key anywhere inside a value */
const keysIn = (v: unknown, out = new Set<string>()): Set<string> => {
  if (Array.isArray(v)) v.forEach(x => keysIn(x, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { out.add(k); keysIn(x, out); }
  return out;
};
/** the room's view shows no seat's role (the game's role list and the end's whole game apart) */
const noRoles = (s: OnlineState) => {
  const { roles: _r, final: _f, ...rest } = publicView(s);
  const keys = keysIn(rest);
  assert.ok(!keys.has('role') && !keys.has('players') && !keys.has('acts'), `${s.key}: ${[...keys].join(',')}`);
};

/** deals and shows every card, then plays the first night to its end (into the morning) */
const toMorning1 = (s: OnlineState) => {
  s.uids.forEach((_, i) => { s = act(s, i, 1); });
  s = hostNext(s);
  while (s.g.phase.kind === 'night') s = hostNext(s);
  return s;
};
/** from morning 1: the introductions (each says „done“) and into night 2 */
const toNight2 = (s: OnlineState) => {
  s = hostNext(s);
  while (s.g.phase.kind === 'intro') s = act(s, s.g.phase.at, null, true);
  return s;
};

test('the online game deals at once, with names kept apart and the uids in their seats', () => {
  assert.deepEqual(uniqueNames(['ნინო', 'გიორგი', 'ნინო', ' ', 'ნინო']), ['ნინო', 'გიორგი', 'ნინო 2', 'მოთამაშე', 'ნინო 3']);
  const s = newOnline(people(8), { piper: false, kids: false }, mulberry32(1))!;
  assert.equal(s.g.phase.kind, 'deal');
  assert.equal(s.key, 'deal');
  assert.deepEqual(s.uids, people(8).map(p => p.uid));
  assert.equal(s.g.players.length, 8);
  assert.equal(newOnline(people(5), { piper: false, kids: false }), null, 'six at least');
  assert.equal(newOnline([...people(6), { uid: 'u0', name: 'x' }], { piper: false, kids: false }), null, 'one seat a person');
  noRoles(s);
});

test('the deal: each phone says „seen“; the host may start the night', () => {
  let s = newOnline(people(7), { piper: false, kids: false }, mulberry32(2))!;
  assert.equal(seenCount(s), 0);
  s = act(s, 3, 1);
  s = applyAct(s, 4, { key: 'n1.dusk', pick: 1 }); // a key of another step is left out
  assert.equal(seenCount(s), 1);
  assert.deepEqual(waitingFor(s), [0, 1, 2, 4, 5, 6]);
  assert.deepEqual((publicView(s).phase as { seen: number[] }).seen, [3]);
  s = hostNext(s);
  assert.equal(keyOf(s.g), 'n1.dusk');
  assert.equal(s.key, 'n1.dusk');
  assert.deepEqual(s.by, s.uids.map(() => null), 'a new step starts empty');
});

test('the spies learn each other at their meeting, the warden pair at theirs — a citizen never', () => {
  let s = newOnline(people(13), { piper: true, kids: false }, mulberry32(5))!;
  const spies = s.g.players.flatMap((p, i) => (isSpy(p.role) ? [i] : []));
  const [warden] = seatsOf(s, 'warden');
  const [guard] = seatsOf(s, 'guard');
  const [citizen] = seatsOf(s, 'citizen');
  assert.deepEqual(matesOf(s, spies[0]), [], 'not at the deal');
  s.uids.forEach((_, i) => { s = act(s, i, 1); });
  s = hostNext(s); // dusk
  s = hostNext(s); // meetSpies
  assert.equal(nightAsk(s, spies[0])?.step, 'meet');
  assert.equal(nightAsk(s, citizen), null);
  assert.deepEqual(matesOf(s, spies[0]).map(m => m.i), spies.filter(i => i !== spies[0]));
  assert.deepEqual(matesOf(s, warden), [], 'the warden meets later');
  s = hostNext(s); // meetWarden
  assert.deepEqual(matesOf(s, warden), [{ i: guard, role: 'guard' }]);
  assert.deepEqual(matesOf(s, guard), [{ i: warden, role: 'warden' }]);
  assert.deepEqual(matesOf(s, citizen), []);
  const seat = seatView(s, spies[0]);
  assert.equal(seat.role, s.g.players[spies[0]].role);
  assert.equal(seatView(s, citizen).trade !== undefined, true, 'a citizen has a trade');
});

test('night 2: only the role asked may answer; the spies must agree; the check is answered at once and kept', () => {
  let s = toNight2(toMorning1(newOnline(people(11), { piper: true, kids: false }, mulberry32(9))!));
  assert.equal(s.key, 'n2.dusk');
  const piper = holder(s.g, 'piper');
  const healer = holder(s.g, 'healer');
  const warden = holder(s.g, 'warden');
  const boss = holder(s.g, 'boss');
  const spies = live(s.g).filter(i => isSpy(s.g.players[i].role));
  const citizens = seatsOf(s, 'citizen');
  s = hostNext(s); // the piper
  assert.equal(s.key, 'n2.piper');
  const pa = nightAsk(s, piper);
  assert.ok(pa && pa.step === 'piper' && !pa.targets.includes(piper), 'not oneself');
  s = act(s, healer, citizens[0]); // not the healer's turn
  assert.equal(s.g.phase.kind === 'night' && s.g.phase.acts.piper, undefined);
  s = act(s, piper, citizens[0]);
  assert.equal(s.g.phase.kind === 'night' && s.g.phase.acts.piper, citizens[0]);
  s = hostNext(s); // the spies
  assert.equal(s.key, 'n2.spies');
  assert.equal(nightAsk(s, citizens[1]), null);
  s = act(s, citizens[1], citizens[2]); // a citizen's pointing is nothing
  assert.deepEqual(s.by, s.uids.map(() => null));
  assert.equal(spies.length, 3, 'two spies and their boss');
  s = act(s, spies[0], citizens[1]);
  assert.equal(spiesAgree(s), undefined, 'one spy is no agreement');
  assert.deepEqual(waitingFor(s), spies.slice(1));
  s = act(s, spies[1], citizens[2]);
  s = act(s, spies[2], citizens[1]);
  assert.equal(spiesAgree(s), undefined, 'they point at two');
  s = act(s, spies[1], citizens[1]);
  assert.equal(spiesAgree(s), citizens[1]);
  assert.equal(s.g.phase.kind === 'night' && s.g.phase.acts.spies, citizens[1]);
  const den = nightAsk(s, spies[0]);
  assert.ok(den && den.step === 'spies' && den.agreed === citizens[1] && den.den.length === spies.length);
  s = act(s, spies[0], spies[1]); // a spy is no target
  assert.equal(spiesAgree(s), citizens[1]);
  s = hostNext(s); // the healer
  s = act(s, healer, citizens[3]);
  s = hostNext(s); // the check
  const ca = nightAsk(s, warden);
  assert.ok(ca && ca.step === 'check' && ca.by === warden && ca.answer === null);
  s = act(s, warden, boss); // the boss looks like a citizen
  const after = nightAsk(s, warden);
  assert.ok(after && after.step === 'check' && after.pick === boss && after.answer === 'no');
  s = act(s, warden, spies[0]); // kept: one check a night
  assert.equal(s.g.phase.kind === 'night' && s.g.phase.acts.check, boss);
  assert.deepEqual(checksOf(s.g), [{ n: 2, who: boss, answer: 'no' }]);
  assert.deepEqual(seatView(s, warden).checks, checksOf(s.g));
  assert.deepEqual(seatView(s, citizens[0]).checks, []);
  noRoles(s);
  s = hostNext(s); // the morning
  assert.equal(s.g.phase.kind, 'morning');
  assert.equal(s.g.nights.at(-1)?.taken, citizens[1]);
  assert.equal((publicView(s).phase as { taken: number | null }).taken, citizens[1]);
});

test('spies who do not agree: the boss decides, or nobody is taken', () => {
  let s = toNight2(toMorning1(newOnline(people(12), { piper: false, kids: false }, mulberry32(4))!));
  const spies = live(s.g).filter(i => isSpy(s.g.players[i].role));
  const boss = holder(s.g, 'boss');
  const citizens = seatsOf(s, 'citizen');
  while (s.key !== 'n2.spies') s = hostNext(s);
  s = act(s, spies.find(i => i !== boss)!, citizens[0]);
  s = act(s, boss, citizens[1]);
  assert.equal(bossPick(s), citizens[1]);
  s = hostNext(s);
  assert.equal(s.g.phase.kind === 'night' && s.g.phase.acts.spies, citizens[1], 'the boss decides');

  let t = toNight2(toMorning1(newOnline(people(8), { piper: false, kids: false }, mulberry32(6))!)); // two spies, no boss
  const sp = live(t.g).filter(i => isSpy(t.g.players[i].role));
  const cit = seatsOf(t, 'citizen');
  while (t.key !== 'n2.spies') t = hostNext(t);
  t = act(t, sp[0], cit[0]);
  t = act(t, sp[1], cit[1]);
  t = hostNext(t);
  assert.equal(t.g.phase.kind === 'night' && t.g.phase.acts.spies, null, 'no boss: nobody');
});

test('the day: only the speaker accuses and ends their word; the vote counts each hand once', () => {
  let s = toNight2(toMorning1(newOnline(people(9), { piper: false, kids: false }, mulberry32(8))!));
  while (s.g.phase.kind === 'night') s = hostNext(s);
  s = hostNext(s); // the morning → the day
  assert.equal(s.g.phase.kind, 'day');
  const ph = s.g.phase as Extract<OnlineState['g']['phase'], { kind: 'day' }>;
  const [a, b, c] = ph.order;
  s = startClock(s, 5000);
  assert.deepEqual([publicView(s).clock, publicView(s).clockAt], [1, 5000], 'every phone runs the clock from the host\'s start');
  s = act(s, b, a); // not b's turn
  assert.deepEqual((s.g.phase as typeof ph).accuse, ph.accuse);
  s = act(s, a, a); // nobody accuses themselves
  assert.equal((s.g.phase as typeof ph).accuse[0], null);
  s = act(s, a, c);
  assert.equal((s.g.phase as typeof ph).accuse[0], c, 'the accusation shows before the word ends');
  s = act(s, a, c, true);
  assert.equal(s.key, `d2.1`, 'the next speaker');
  assert.deepEqual([s.clock, s.clockAt], [0, 0], 'the next speaker\'s clock waits for the host');
  assert.equal((s.g.phase as typeof ph).accuse[0], c);
  s = act(s, a, null, true); // an old word does nothing
  assert.equal(s.key, 'd2.1');
  while (s.g.phase.kind === 'day') s = act(s, (s.g.phase as typeof ph).order[(s.g.phase as typeof ph).at], null, true);
  assert.equal(s.g.phase.kind, 'vote');
  assert.equal(s.key, 'v2.1');
  const voters = live(s.g);
  voters.forEach((i, k) => { s = act(s, i, k < 5 ? c : NO); });
  s = act(s, voters[0], 99); // no such candidate: the hand stays
  assert.equal(s.by[voters[0]], c);
  assert.deepEqual(waitingFor(s), []);
  s = closeVote(s);
  assert.equal(s.g.phase.kind, 'verdict');
  const v = publicView(s).phase as { jailed: number | null; hands: { candidates: number[]; ballots: (number | null)[] } };
  assert.equal(v.jailed, c, '5 of 9 is more than half');
  assert.deepEqual(countsOf(v.hands), [5]);
  noRoles(s);
});

test('a tie talks and votes again; the round-one hands stay on the tie screen', () => {
  let s = toNight2(toMorning1(newOnline(people(8), { piper: false, kids: false }, mulberry32(12))!));
  while (s.g.phase.kind === 'night') s = hostNext(s);
  s = hostNext(s);
  const order = (s.g.phase as { order: number[] }).order;
  const [x, y] = [order[2], order[3]];
  s = act(s, order[0], x, true);
  s = act(s, order[1], y, true);
  while (s.g.phase.kind === 'day') s = act(s, (s.g.phase as { order: number[]; at: number }).order[(s.g.phase as { at: number }).at], null, true);
  const voters = live(s.g);
  voters.forEach((i, k) => { s = act(s, i, k % 2 ? x : y); });
  s = hostNext(s);
  assert.equal(s.g.phase.kind, 'tie');
  const tp = publicView(s).phase as { tied: number[]; hands: { candidates: number[]; ballots: (number | null)[] } };
  assert.deepEqual(countsOf(tp.hands), [4, 4]);
  s = act(s, tp.tied[0], null, true);
  s = act(s, tp.tied[1], null, true);
  assert.equal(s.g.phase.kind, 'vote');
  assert.equal(s.key, 'v2.2');
  live(s.g).forEach(i => { s = act(s, i, x); });
  s = hostNext(s);
  assert.equal(s.g.phase.kind === 'verdict' && s.g.phase.jailed, x);
  assert.equal(s.hands.length, 2);
});

test('an out player is asked nothing and votes no more', () => {
  let s = toNight2(toMorning1(newOnline(people(7), { piper: false, kids: false }, mulberry32(21))!));
  const healer = holder(s.g, 'healer');
  s = { ...s, g: { ...s.g, out: s.g.out.map((o, i) => (i === healer ? { by: 'taken', at: 2 } : o)) } };
  while (s.key !== 'n2.healer') s = hostNext(s);
  assert.equal(nightAsk(s, healer), null);
  assert.deepEqual(waitingFor(s), [], 'the host waits for nobody: the same words, the same pause');
});

test('whole games, many tables: every view hides the roles, the end shows them all', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const rnd = mulberry32(seed);
    const n = 6 + (seed % 11);
    let s = newOnline(people(n), { piper: seed % 2 === 0, kids: seed % 5 === 0 }, rnd)!;
    let steps = 0;
    while (s.g.phase.kind !== 'end' && steps++ < 3000) {
      noRoles(s);
      const ph = s.g.phase;
      const key = s.key;
      if (ph.kind === 'deal') { s.uids.forEach((_, i) => { s = act(s, i, 1); }); s = hostNext(s); continue; }
      if (ph.kind === 'night') {
        s.uids.forEach((_, i) => {
          const ask = nightAsk(s, i);
          if (!ask || ask.step === 'meet' || !ask.targets.length) return;
          if (ask.step === 'check' && ask.by !== i) return;
          const t = ask.step === 'spies' && rnd() < 0.8 ? ask.targets[0] : ask.targets[Math.floor(rnd() * ask.targets.length)];
          s = act(s, i, t);
        });
        s = hostNext(s);
        continue;
      }
      if (ph.kind === 'intro') { s = act(s, ph.at, null, true); continue; }
      if (ph.kind === 'day') {
        const sp = ph.order[ph.at];
        const others = ph.order.filter(i => i !== sp);
        s = act(s, sp, rnd() < 0.5 ? others[Math.floor(rnd() * others.length)] : null, true);
        continue;
      }
      if (ph.kind === 'vote') {
        live(s.g).forEach(i => {
          const c = ph.candidates;
          s = act(s, i, c.length === 1 ? (rnd() < 0.6 ? c[0] : NO) : c[Math.floor(rnd() * c.length)]);
        });
        s = hostNext(s);
        continue;
      }
      if (ph.kind === 'tie') { s = act(s, ph.tied[ph.at], null, true); continue; }
      s = hostNext(s);
      assert.notEqual(s.key, key, `stuck at ${key}`);
    }
    assert.equal(s.g.phase.kind, 'end', `seed ${seed} ended`);
    const view = publicView(s);
    assert.equal(view.phase.kind === 'end' && view.phase.winner, winner(s.g));
    assert.deepEqual(view.final?.players.map(p => p.role), s.g.players.map(p => p.role));
    // the documents read back as they were written
    assert.deepEqual(parseState(JSON.stringify(s)), s);
    assert.deepEqual(parseView(JSON.stringify(view))?.final, view.final);
    const again = againOnline(s, rnd)!;
    assert.equal(again.g.phase.kind, 'deal');
    assert.deepEqual(again.uids, s.uids);
  }
});

test('documents that are not the game read as nothing', () => {
  assert.equal(parseState(''), null);
  assert.equal(parseState('{"v":1}'), null);
  assert.equal(parseView('nonsense'), null);
  assert.equal(parseSeat(JSON.stringify({ v: 1, i: 0, role: 'king', mates: [], checks: [] })), null);
  const s = newOnline(people(6), { piper: false, kids: false }, mulberry32(30))!;
  const seat = seatView(s, 2);
  assert.deepEqual(parseSeat(JSON.stringify(seat)), seat);
  assert.deepEqual(parseView(JSON.stringify(publicView(s))), { ...publicView(s), final: undefined });
});
