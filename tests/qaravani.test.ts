import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/utils/otkheuli';
import { Q_CITY_COUNT, Q_ROUTES } from '../src/data/qaravaniRoutes';
import { Q_CITIES } from '../src/data/qaravaniMap';
import {
  DECK_PICK, FACE_PICK, LOCO, PASS_PICK, QUIT_PICK, ROUTE_TRACKS, SCORE, TICKETS, TICKETS_PICK, TRACKS, applyPick, cardsIn, claimPick,
  innPick, keepPick, keyOf, legalPicks, longestOf, newQaravani, parseQaravani, payments, resultOf, ticketDone, timeUp, trackPayments,
  tunnelPayments, tunnelPick, waitingOn,
  type QGame,
} from '../src/utils/qaravani';

const city = (key: string) => { const i = Q_CITIES.findIndex(c => c.key === key); assert.ok(i >= 0, key); return i; };
const track = (a: string, b: string, lane = 0) => {
  const r = Q_ROUTES.findIndex(([x, y]) => (x === city(a) && y === city(b)) || (x === city(b) && y === city(a)));
  assert.ok(r >= 0, `${a}-${b}`);
  return ROUTE_TRACKS[r][lane];
};
const hand = (cards: Partial<Record<number, number>>) => Array.from({ length: 9 }, (_, i) => cards[i] ?? 0);
const deal = (n = 3, seed = 7) => newQaravani({ names: ['ანა', 'ბექა', 'გიო', 'დათო', 'ეკა'].slice(0, n), first: 0, rnd: mulberry32(seed) })!;
/** past the deal: everyone keeps the first two letters offered */
const dealt = (n = 3, seed = 7) => { let g = deal(n, seed); for (let s = 0; s < n; s++) g = applyPick(g, s, keepPick(0b0011)); return g; };
/** a turn of player 0 with the hand given, the deck's top cards (the last one first) as given */
const turnWith = (cards: Partial<Record<number, number>>, top: number[] = [], n = 3): QGame => {
  const g = dealt(n);
  return { ...g, players: g.players.map((p, i) => (i === 0 ? { ...p, hand: hand(cards) } : p)), deck: [...g.deck, ...top] };
};

test('the map is the kit\'s: 47 cities, 74 roads with 82 tracks, 40 letters and 6 long journeys', () => {
  assert.equal(Q_CITY_COUNT, 47);
  assert.equal(Q_CITIES.length, 47);
  assert.equal(Q_ROUTES.length, 74);
  assert.equal(TRACKS.length, 82);
  assert.equal(TRACKS.filter(t => t.mountain).length / 1, 13);
  assert.equal(new Set(TRACKS.filter(t => t.ships).map(t => t.route)).size, 4);
  assert.equal(TICKETS.length, 46);
  assert.equal(TICKETS.filter(t => t.long).length, 6);
  // a letter's points are the fewest cells between its cities (the kit checks it too)
  const fewest = (a: number, b: number) => {
    const d = new Map([[a, 0]]), done = new Set<number>();
    for (;;) {
      let u = -1;
      for (const [k, v] of d) if (!done.has(k) && (u < 0 || v < d.get(u)!)) u = k;
      if (u < 0 || u === b) break;
      done.add(u);
      for (const t of TRACKS) { const v = t.a === u ? t.b : t.b === u ? t.a : -1; if (v >= 0 && (!d.has(v) || d.get(u)! + t.n < d.get(v)!)) d.set(v, d.get(u)! + t.n); }
    }
    return d.get(b);
  };
  for (const t of TICKETS) assert.equal(fewest(t.a, t.b), t.v);
});

test('the deal: four cards each, five face up, one long journey and three letters to choose from', () => {
  const g = deal(4);
  assert.equal(cardsIn(g), 110);
  assert.equal(g.players.every(p => p.hand.reduce((a, b) => a + b, 0) === 4), true);
  assert.equal(g.face.filter(c => c >= 0).length, 5);
  assert.ok(g.face.filter(c => c === LOCO).length < 3);
  assert.equal(g.players.every(p => p.carts === 40), true);
  assert.equal(deal(5).players[0].carts, 35);
  assert.equal(g.phase.k, 'start');
  if (g.phase.k !== 'start') return;
  assert.equal(g.phase.offer.every(o => o.length === 4 && TICKETS[o[0]].long && o.slice(1).every(id => !TICKETS[id].long)), true);
  assert.equal(g.tdeck.length, 40 - 4 * 3);
  assert.deepEqual(waitingOn(g), [0, 1, 2, 3]);
  // everyone at once: one key for the whole deal; at least two kept
  assert.equal(applyPick(g, 1, keepPick(0b0001)), g);
  const a = applyPick(g, 2, keepPick(0b1010));
  assert.equal(keyOf(a), 'start');
  assert.equal(a.players[2].tickets.length, 2);
  assert.equal(applyPick(a, 2, keepPick(0b0011)), a);
  let b = a;
  for (const s of [0, 1, 3]) b = applyPick(b, s, keepPick(0b1111));
  assert.equal(b.phase.k, 'turn');
  assert.equal(b.turn, 0);
  assert.notEqual(keyOf(b), 'start');
});

test('cards: two a turn; a face-up locomotive is the only one, and never the second', () => {
  const g = dealt();
  const loco = { ...g, face: [LOCO, 0, 1, 2, 3] };
  const a = applyPick(loco, 0, FACE_PICK);
  assert.equal(a.players[0].hand[LOCO], g.players[0].hand[LOCO] + 1);
  assert.equal(a.turn, 1);
  const b = applyPick(loco, 0, FACE_PICK + 1);
  assert.equal(b.phase.k, 'second');
  assert.equal(b.turn, 0);
  if (b.phase.k === 'second') b.face[0] = LOCO;
  assert.equal(applyPick(b, 0, FACE_PICK), b);
  const c = applyPick(b, 0, DECK_PICK);
  assert.equal(c.turn, 1);
  assert.equal(c.players[0].hand.reduce((x, y) => x + y, 0), g.players[0].hand.reduce((x, y) => x + y, 0) + 2);
  assert.equal(c.log.at(-1)?.k, 'cards');
  assert.equal(cardsIn(c), 110);
  // another player may not move
  assert.equal(applyPick(g, 1, DECK_PICK), g);
});

test('three locomotives face up: all five go and five new are laid', () => {
  const g = dealt();
  const h = { ...g, face: [LOCO, LOCO, 0, 1, 2], deck: [...g.deck.filter(c => c !== LOCO), LOCO] };
  const a = applyPick(h, 0, FACE_PICK + 2);
  assert.ok(a.face.filter(c => c === LOCO).length < 3);
  assert.equal(a.log.some(l => l.k === 'wash'), true);
});

test('a road: the colour and its cells, locomotives for any colour, gray for any one colour, points at once', () => {
  const t = track('kutaisi', 'tsageri'); // yellow, 2
  assert.equal(TRACKS[t].color, 1);
  const g = turnWith({ 1: 1, 8: 1, 0: 5 });
  assert.deepEqual(trackPayments(g, 0, t), [{ c: 1, l: 1 }]);
  assert.equal(applyPick(g, 0, claimPick(t, 0, 0)), g);
  const a = applyPick(g, 0, claimPick(t, 1, 1));
  assert.equal(a.owner[t], 0);
  assert.equal(a.players[0].carts, 38);
  assert.equal(a.players[0].pts, SCORE[2]);
  assert.deepEqual(a.players[0].hand, hand({ 0: 5 }));
  assert.equal(cardsIn(a), cardsIn(g));
  const gray = track('gori', 'tskhinvali'); // gray, 1
  assert.deepEqual(trackPayments(g, 0, gray).map(p => p.c), [0, 1, LOCO]);
  // a gray road of 4 cells takes four of one colour, never two and two
  assert.equal(payments(hand({ 0: 2, 1: 2 }), 4, 8).length, 0);
  assert.deepEqual(payments(hand({ 0: 2, 1: 2, 8: 2 }), 4, 8), [{ c: 0, l: 2 }, { c: 1, l: 2 }]);
});

test('ships want a locomotive each; double roads: one for two or three players, both for four or five but not the same one', () => {
  const sea = track('bichvinta', 'sokhumi'); // gray, 2, one ship
  assert.equal(TRACKS[sea].ships, 1);
  assert.equal(trackPayments(turnWith({ 0: 2 }), 0, sea).length, 0);
  assert.deepEqual(trackPayments(turnWith({ 0: 2, 8: 1 }), 0, sea), [{ c: 0, l: 1 }]);
  const a = track('poti', 'senaki', 0), b = track('poti', 'senaki', 1);
  assert.equal(TRACKS[a].twin, b);
  const three = turnWith({ 7: 1, 2: 1 });
  const x = { ...three, owner: three.owner.map((o, i) => (i === a ? 1 : o)) };
  assert.equal(trackPayments(x, 0, b).length, 0);
  const four = turnWith({ 7: 1, 2: 1 }, [], 4);
  const y = { ...four, owner: four.owner.map((o, i) => (i === a ? 1 : o)) };
  assert.deepEqual(trackPayments(y, 0, b), [{ c: 2, l: 0 }]);
  const z = { ...four, owner: four.owner.map((o, i) => (i === a ? 0 : o)) };
  assert.equal(trackPayments(z, 0, b).length, 0);
});

test('a mountain road: three cards turned up, each matching one wants another, or the road is given up', () => {
  const t = track('ananuri', 'stepantsminda'); // gray, 3, ჯვარი
  assert.equal(TRACKS[t].mountain, true);
  const g = turnWith({ 3: 4, 8: 1 }, [5, 3, LOCO]);
  const a = applyPick(g, 0, claimPick(t, 3, 0));
  assert.equal(a.phase.k, 'tunnel');
  if (a.phase.k !== 'tunnel') return;
  assert.equal(a.phase.extra, 2);
  assert.deepEqual(tunnelPayments(a), [1]); // one blue left + the locomotive
  assert.equal(cardsIn(a), cardsIn(g));
  const paid = applyPick(a, 0, tunnelPick(1));
  assert.equal(paid.owner[t], 0);
  assert.deepEqual(paid.players[0].hand, hand({}));
  assert.equal(cardsIn(paid), cardsIn(g));
  const quit = applyPick(a, 0, QUIT_PICK);
  assert.equal(quit.owner[t], -1);
  assert.deepEqual(quit.players[0].hand, hand({ 3: 4, 8: 1 }));
  assert.equal(quit.turn, 1);
  // nothing matching: the road at once
  const b = applyPick(turnWith({ 3: 3 }, [5, 0, 1]), 0, claimPick(t, 3, 0));
  assert.equal(b.owner[t], 0);
  // paid with locomotives only: only locomotives count, only locomotives pay
  const c = applyPick(turnWith({ 8: 5, 3: 3 }, [3, 3, LOCO]), 0, claimPick(t, LOCO, 3));
  assert.equal(c.phase.k === 'tunnel' && c.phase.extra, 1);
  assert.deepEqual(tunnelPayments(c), [1]);
});

test('letters: three drawn, at least one kept, the rest under the pile', () => {
  const g = dealt();
  const a = applyPick(g, 0, TICKETS_PICK);
  assert.equal(a.phase.k, 'tickets');
  if (a.phase.k !== 'tickets') return;
  const offer = a.phase.offer;
  assert.equal(offer.length, 3);
  assert.equal(applyPick(a, 0, keepPick(0)), a);
  const b = applyPick(a, 0, keepPick(0b010));
  assert.deepEqual(b.players[0].tickets.slice(-1), [offer[1]]);
  assert.deepEqual(b.tdeck.slice(0, 2), [offer[0], offer[2]]);
  assert.equal(b.turn, 1);
});

test('inns: one card, then two, then three of one colour; one a city', () => {
  const g = turnWith({ 0: 6, 8: 1 });
  const x = city('tbilisi'), y = city('kutaisi');
  const a = applyPick(g, 0, innPick(x, 0, 0));
  assert.equal(a.inn[x], 0);
  assert.equal(a.players[0].inns, 2);
  const a2 = { ...a, turn: 0, phase: { k: 'turn' as const } };
  assert.equal(applyPick(a2, 0, innPick(x, 0, 1)), a2);
  const b = applyPick(a2, 0, innPick(y, 0, 1));
  assert.equal(b.players[0].hand[0], 4);
  assert.equal(b.players[0].hand[LOCO], 0);
  const b2 = { ...b, turn: 0, phase: { k: 'turn' as const } };
  const c = applyPick(b2, 0, innPick(city('gori'), 0, 0));
  assert.equal(c.players[0].inns, 0);
  assert.equal(c.players[0].hand[0], 1);
});

test('the last round: two carts or fewer — everyone, that one too, plays once more', () => {
  const g = turnWith({ 0: 1 });
  const t = track('zugdidi', 'senaki'); // red, 1
  const low = { ...g, players: g.players.map((p, i) => (i === 0 ? { ...p, carts: 3 } : p)) };
  let a = applyPick(low, 0, claimPick(t, 0, 0));
  assert.equal(a.left, 3);
  assert.equal(a.log.at(-1)?.k, 'last');
  for (const s of [1, 2]) { a = applyPick(a, s, DECK_PICK); a = applyPick(a, s, DECK_PICK); }
  assert.equal(a.turn, 0);
  assert.equal(a.phase.k, 'turn');
  a = applyPick(a, 0, DECK_PICK);
  a = applyPick(a, 0, DECK_PICK);
  assert.equal(a.phase.k, 'end');
});

test('the score: letters done or not, an inn lends one road, unused inns, the longest chain', () => {
  const g = dealt(2);
  const own = [track('poti', 'senaki'), track('senaki', 'samtredia'), track('samtredia', 'kutaisi')];
  const other = track('kutaisi', 'zestaponi');
  const done = TICKETS.findIndex(t => (t.a === city('poti') && t.b === city('tbilisi')) || (t.b === city('poti') && t.a === city('tbilisi')));
  const near = TICKETS.findIndex(t => t.a === city('khashuri') && t.b === city('poti'));
  assert.ok(done >= 0 && near >= 0);
  const owner = g.owner.map((_, t) => (own.includes(t) ? 0 : t === other ? 1 : -1));
  const end: QGame = { ...g, owner, phase: { k: 'end' }, players: g.players.map((p, i) => (i === 0 ? { ...p, tickets: [done, near], pts: 3 } : { ...p, tickets: [], pts: 1 })) };
  let r = resultOf(end);
  assert.deepEqual(r.rows[0].tickets.map(t => t.done), [false, false]);
  assert.equal(r.rows[0].ticketPts, -TICKETS[done].v - TICKETS[near].v);
  assert.equal(r.rows[0].innPts, 12);
  assert.equal(r.rows[0].longest, 3);
  assert.equal(r.rows[0].bonus, 10);
  // the khashuri letter by own roads to zestaponi, then the opponent's road lent by an inn in kutaisi
  const more = [...own, track('zestaponi', 'khashuri')];
  const lent: QGame = { ...end, owner: g.owner.map((_, t) => (more.includes(t) ? 0 : t === other ? 1 : -1)), inn: end.inn.map((o, x) => (x === city('kutaisi') ? 0 : o)), players: end.players.map((p, i) => (i === 0 ? { ...p, inns: 2 } : p)) };
  assert.equal(ticketDone(lent, 0, near), false);
  r = resultOf(lent);
  assert.deepEqual(r.rows[0].borrowed, [other]);
  assert.deepEqual(r.rows[0].tickets.map(t => t.done), [false, true]);
  assert.equal(r.rows[0].longest, 3); // the lent road does not join the two chains
  assert.equal(r.rows[0].innPts, 8);
  assert.deepEqual(r.winners, [0]);
  assert.equal(longestOf([track('tbilisi', 'mtskheta'), track('mtskheta', 'gori'), track('gori', 'khashuri'), track('gori', 'tskhinvali')]), 4);
});

test('time up: the deal keeps the two cheapest letters, a turn takes two cards, a mountain is given up', () => {
  const g = deal();
  const a = timeUp(g);
  assert.equal(a.phase.k, 'turn');
  assert.equal(a.players.every(p => p.tickets.length === 2 && p.tickets.every(id => !TICKETS[id].long)), true);
  const b = timeUp(a);
  assert.equal(b.turn, 1);
  assert.equal(b.players[0].hand.reduce((x, y) => x + y, 0), a.players[0].hand.reduce((x, y) => x + y, 0) + 2);
  const t = track('ananuri', 'stepantsminda');
  const m = applyPick(turnWith({ 3: 4 }, [3, 3, 3]), 0, claimPick(t, 3, 0));
  assert.equal(m.phase.k, 'tunnel');
  assert.equal(timeUp(m).owner[t], -1);
});

test('random games run to the end with every card kept, and a kept game reads back', () => {
  for (let k = 0; k < 120; k++) {
    const r = mulberry32(1000 + k), n = 2 + (k % 4);
    let g = newQaravani({ names: Array.from({ length: n }, (_, i) => `მოთამაშე ${i + 1}`), rnd: r })!;
    let moves = 0;
    while (g.phase.k !== 'end' && moves < 3000) {
      const seat = waitingOn(g)[0];
      const picks = legalPicks(g, seat);
      assert.ok(picks.length > 0);
      // claims first (a real game moves on), then anything
      const claims = picks.filter(p => p >= 10000 && p < 20000);
      const pick = claims.length && r() < 0.7 ? claims[Math.floor(r() * claims.length)] : picks[Math.floor(r() * picks.length)];
      const next = applyPick(g, seat, pick);
      assert.notEqual(next, g, `move ${pick} in ${g.phase.k}`);
      g = next;
      assert.equal(cardsIn(g), 110);
      moves++;
    }
    assert.equal(g.phase.k, 'end', `game ${k} ended`);
    const res = resultOf(g);
    assert.equal(res.rows.length, n);
    assert.ok(res.winners.length >= 1);
    assert.deepEqual(parseQaravani(JSON.parse(JSON.stringify(g))), g);
  }
});

test('a pass only when nothing else can be done', () => {
  const g = dealt();
  assert.equal(applyPick(g, 0, PASS_PICK), g);
});
