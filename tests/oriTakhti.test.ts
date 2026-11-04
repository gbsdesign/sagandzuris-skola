import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mulberry32 } from '../src/utils/otkheuli';
import { CARDS, TOKENS, WONDERS } from '../src/data/takhtiCards';
import {
  COVERS, MAX_WONDERS, PLACES, SLOTS, TK, applyPick, armyPoints, begin, cardPrice, freeSlots, isUp, newTakhti, parseTakhti, pickWonder, play,
  playPick, priceFor, publicOf, revive, ruinCard, scoreOf, sellValue, takeToken, timeUp, tradePrice, wonderOk, wondersBuilt,
  type TakhtiGame,
} from '../src/utils/oriTakhti';

const byName = (n: string) => { const i = CARDS.findIndex(c => c.n === n); assert.ok(i >= 0, n); return i; };
const wonderNamed = (n: string) => { const i = WONDERS.findIndex(w => w.n === n); assert.ok(i >= 0, n); return i; };
const tokenNamed = (n: string) => { const i = TOKENS.findIndex(t => t.n === n); assert.ok(i >= 0, n); return i; };
const start = (seed = 3) => newTakhti({ names: ['ანა', 'ბექა'], first: 0, rnd: mulberry32(seed) })!;
/** through the draft by always taking the first offered */
const drafted = (seed = 3) => { let g = start(seed); while (g.phase.k === 'draft') g = pickWonder(g, g.phase.offer[0]); return g; };
/** a hand-laid table: the first free place holds `card`, the kingdoms as given */
const table = (card: number, patch: Partial<TakhtiGame> = {}): TakhtiGame => {
  const g = drafted();
  const s = freeSlots(g)[0];
  const slots = g.slots.map((c, i) => (i === s ? card : c === card ? g.slots[s] : c));
  return { ...g, slots, ...patch };
};
const city = (cards: string[] = [], coins = 7, tokens: number[] = [], wonders: { w: number; under: number }[] = []) =>
  ({ coins, cards: cards.map(byName), tokens, wonders });

test('the pieces are the kit\'s: 23 + 23 + 20 cards, 7 guilds, 12 monuments, 10 tokens, the same names in the same order', () => {
  assert.equal(CARDS.filter(c => c.age === 1).length, 23);
  assert.equal(CARDS.filter(c => c.age === 2).length, 23);
  assert.equal(CARDS.filter(c => c.age === 3 && c.t !== 'guild').length, 20);
  assert.equal(CARDS.filter(c => c.t === 'guild').length, 7);
  assert.equal(WONDERS.length, 12);
  assert.equal(TOKENS.length, 10);
  const kit = readFileSync(new URL('../scripts/print-games/games/ori-takhti.mjs', import.meta.url), 'utf8');
  const kitNames = [...kit.matchAll(/^ {2}\{ n: '([^']+)'/gm)].map(m => m[1]);
  assert.deepEqual(kitNames, [...CARDS.map(c => c.n), ...WONDERS.map(w => w.n), ...TOKENS.map(t => t.n)]);
  // every wisdom twice (the law only as a token), every chain's start before or in the age of its end
  for (const s of ['anbani', 'karabadini', 'astronomia', 'khuroba', 'ruka', 'galoba']) assert.equal(CARDS.filter(c => c.eff.sci === s).length, 2, s);
  for (const c of CARDS.filter(x => x.from)) assert.ok(CARDS.some(d => d.to === c.from && d.age < c.age), c.n);
});

test('the layouts: 20 places; the open row is the nearest; a place is free once nothing lies over it', () => {
  for (const age of [1, 2, 3] as const) assert.equal(PLACES[age].length, SLOTS);
  const g = start();
  assert.deepEqual(freeSlots({ ...g, age: 1 }), [14, 15, 16, 17, 18, 19]);
  assert.deepEqual(freeSlots({ ...g, age: 2 }), [18, 19]);
  assert.deepEqual(freeSlots({ ...g, age: 3 }), [18, 19]);
  // age III: the middle row's two cards lie under the row of four below them, and over the outer pairs above
  assert.deepEqual(PLACES[3].slice(9, 11).map(p => p.x), [-2, 2]);
  assert.deepEqual(COVERS[3][9], [11, 12]);
  assert.deepEqual([5, 6, 7, 8].map(i => COVERS[3][i]), [[9], [9], [10], [10]]);
  // age I: the face-down row turns up when the two cards below it are gone
  const a = { ...g, age: 1 as const, gone: (1 << 14) };
  assert.equal(isUp(a, 9), false);
  assert.equal(isUp({ ...a, gone: (1 << 14) | (1 << 15) }, 9), true);
});

test('a new game: 7 coins each, 5 tokens on the board, 8 monuments for the draft, 20 cards an age with 3 guilds in the third', () => {
  for (let seed = 1; seed < 40; seed++) {
    const g = start(seed);
    assert.deepEqual(g.cities.map(c => c.coins), [7, 7]);
    assert.equal(g.board.length, 5);
    assert.equal(new Set([...g.board, ...g.box]).size, 10);
    assert.equal(g.phase.k === 'draft' && g.phase.offer.length, 4);
    assert.equal(new Set([...(g.phase as { offer: number[] }).offer, ...g.draft]).size, 8);
    const all = [g.slots, ...g.next];
    assert.deepEqual(all.map(a => a.length), [20, 20, 20]);
    assert.ok(g.slots.every(c => CARDS[c].age === 1) && g.next[0].every(c => CARDS[c].age === 2) && g.next[1].every(c => CARDS[c].age === 3));
    assert.equal(g.next[1].filter(c => CARDS[c].t === 'guild').length, 3);
    assert.equal(new Set(all.flat()).size, 60);
  }
  assert.equal(newTakhti({ names: ['ერთი'], rnd: Math.random }), null);
});

test('the draft: A takes one, B two, A the last; then B first; four each, then A begins age I', () => {
  let g = start(5);
  const who: number[] = [];
  while (g.phase.k === 'draft') { who.push(g.turn); g = pickWonder(g, g.phase.offer[g.phase.offer.length - 1]); }
  assert.deepEqual(who, [0, 1, 1, 1, 0, 0]);
  assert.deepEqual(g.cities.map(c => c.wonders.length), [4, 4]);
  assert.equal(new Set(g.cities.flatMap(c => c.wonders.map(w => w.w))).size, 8);
  assert.equal(g.phase.k, 'play');
  assert.equal(g.turn, 0);
  // a wonder not offered changes nothing
  const h = start(5);
  const out = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].find(w => !(h.phase as { offer: number[] }).offer.includes(w))!;
  assert.equal(pickWonder(h, out), h);
});

test('the price: home production, the bank at 2 + what the other side makes, stores at 1, the sources of one, the masters\' mark', () => {
  const g = table(byName('ციხის კედლები'), { cities: [city(['სამტეხლო']), city(['ქვის ფერდი', 'ბოლნისის ქვა'])] }); // SS
  assert.equal(tradePrice(g, 0, 'S'), 2 + 3);
  assert.equal(tradePrice(g, 1, 'S'), 2 + 1);
  const p = priceFor(g, 0, 'SS');
  assert.deepEqual(p.buy, [{ r: 'S', n: 1, each: 5 }]);
  assert.equal(p.total, 5);
  // with ქვის საწყობი the stone costs 1
  const h = { ...g, cities: [city(['სამტეხლო', 'ქვის საწყობი']), g.cities[1]] };
  assert.equal(priceFor(h, 0, 'SSS').total, 2);
  // ბაზარი makes glass or parchment: one of them is free
  const m = { ...g, cities: [city(['ბაზარი']), city()] };
  assert.equal(priceFor(m, 0, 'GP').total, 2);
  assert.equal(priceFor(m, 0, '3GG').total, 3 + 2);
  // the mark: ცხენოსნები (to: nali) makes ცხენსაშენი free
  const c = { ...g, cities: [city(['ცხენოსნები']), city()] };
  assert.deepEqual(cardPrice(c, 0, byName('ცხენსაშენი')), { coins: 0, buy: [], trade: 0, total: 0, chain: true, ok: true });
  // ქვისმთლელები drops the two dearest of a blue card's cost
  const mason = { ...g, cities: [city([], 7, [TK.MASON]), city(['თიხნარი', 'თიხნარი'])] };
  assert.equal(cardPrice(mason, 0, byName('ბესლეთის ხიდი')).total, 0); // SW, both dropped
  assert.equal(cardPrice(mason, 0, byName('გეგუთის სასახლე')).total, 0); // KK
  assert.equal(cardPrice(mason, 0, byName('წყალსადენი')).total, 2); // SSS: one left at 2
  // not enough coins
  const poor = { ...g, cities: [city([], 1), city()] };
  assert.equal(priceFor(poor, 0, 'SS').ok, false);
});

test('a build pays and adds; a discard brings 2 + the yellow cards; the purchase goes to the other side with აბრეშუმის გზა', () => {
  const walls = byName('ციხის კედლები');
  let g = table(walls, { cities: [city([], 10), city(['ქვის ფერდი'], 3, [TK.ECON])] });
  const s = g.slots.indexOf(walls);
  const b = play(g, s, 'build');
  assert.equal(b.cities[0].coins, 10 - 6); // two stones at 3
  assert.equal(b.cities[1].coins, 3 + 6);
  assert.equal(b.pawn, 2);
  assert.equal(b.turn, 1);
  g = table(walls, { cities: [city(['ფუნდუკი', 'ქვის საწყობი'], 0), city()] });
  const d = play(g, s, 'discard');
  assert.equal(d.cities[0].coins, 4);
  assert.deepEqual(d.discard, [walls]);
  assert.equal(sellValue(g.cities[0]), 4);
  // a card not free, or not affordable, changes nothing
  const covered = g.slots.findIndex((_, i) => !freeSlots(g).includes(i));
  assert.equal(play(g, covered, 'discard'), g);
  assert.equal(play(g, s, 'build'), g);
});

test('the rider: shields push it, a tribute token passed takes 2 / 5 once, a capital reached wins', () => {
  const card = byName('მორიგე ჯარი'); // 8 coins, 3 shields
  let g = table(card, { cities: [city([], 10), city([], 4)], pawn: 1 });
  g = play(g, g.slots.indexOf(card), 'build');
  assert.equal(g.pawn, 4);
  assert.equal(g.cities[1].coins, 2);
  assert.equal(g.loot, 4);
  // the same token is not taken twice; the 5 takes what is left
  let h = table(card, { cities: [city([], 10), city([], 3)], pawn: 4, loot: 4 });
  h = play(h, h.slots.indexOf(card), 'build');
  assert.equal(h.pawn, 7);
  assert.equal(h.cities[1].coins, 0);
  assert.equal(h.log.at(-1)!.tribute, 3);
  let w = table(card, { cities: [city([], 10), city()], pawn: 6, loot: 12 });
  w = play(w, w.slots.indexOf(card), 'build');
  assert.deepEqual(w.phase, { k: 'end', why: 'army', winners: [0] });
  assert.equal(w.pawn, 9);
  // დიდგორის გეგმა: a new red card has one shield more; the east pushes west
  let e = table(card, { cities: [city(), city([], 10, [TK.STRAT])], turn: 1 });
  e = play(e, e.slots.indexOf(card), 'build');
  assert.equal(e.pawn, -4);
  assert.equal(e.cities[0].coins, 5);
});

test('wisdom: a pair asks for a token of the board; six kinds win at once (the law counts)', () => {
  const lib = byName('წიგნსაცავი'); // anbani, chained from მწიგნობართა სენაკი
  let g = table(lib, { cities: [city(['მწიგნობართა სენაკი']), city()] });
  g = play(g, g.slots.indexOf(lib), 'build');
  assert.equal(g.phase.k, 'token');
  assert.equal(g.turn, 0);
  const t = g.board[0];
  g = takeToken(g, t);
  assert.ok(g.cities[0].tokens.includes(t));
  assert.equal(g.board.length, 4);
  assert.equal(g.phase.k, 'play');
  assert.equal(g.turn, 1);
  // ვენახი: 6 coins now
  let a = table(lib, { cities: [city(['მწიგნობართა სენაკი'], 0), city()], board: [TK.AGRI] });
  a = takeToken(play(a, a.slots.indexOf(lib), 'build'), TK.AGRI);
  assert.equal(a.cities[0].coins, 6);
  // five kinds and the law: the sixth card wins
  const study = byName('ვარსკვლავთმრიცხველი');
  let s = table(study, { cities: [city(['ხუროს სახელოსნო', 'მგალობელთა დასი', 'მწიგნობართა სენაკი', 'მკურნალი'], 20, [TK.LAW]), city()] });
  s = play(s, s.slots.indexOf(study), 'build');
  assert.deepEqual(s.phase, { k: 'end', why: 'science', winners: [0] });
});

test('monuments: price and effects — again, the library, the ruin, the discard, the seventh closes the rest', () => {
  const base = drafted(9);
  const card = base.slots[freeSlots(base)[0]];
  const s = base.slots.indexOf(card);
  const sphinx = wonderNamed('სურამის ციხე');
  const withW = (w: number, me = city([], 30), opp = city(), patch: Partial<TakhtiGame> = {}): TakhtiGame =>
    ({ ...base, cities: [{ ...me, wonders: [{ w, under: -1 }] }, opp], ...patch });
  const a = play(withW(sphinx), s, 'wonder', 0);
  assert.equal(a.cities[0].wonders[0].under, card);
  assert.equal(a.turn, 0);
  assert.equal(a.phase.k, 'play');
  // ათონელთა სკოლა: every monument plays again
  const theo = play(withW(wonderNamed('სიღნაღის გალავანი'), { ...city([], 30), tokens: [TK.THEO] }), s, 'wonder', 0);
  assert.equal(theo.turn, 0);
  // ფაზისის აკადემია: three of the box to pick from
  const lib = play(withW(wonderNamed('ფაზისის აკადემია')), s, 'wonder', 0);
  assert.equal(lib.phase.k === 'token' && lib.phase.lib && lib.phase.from.length, 3);
  const picked = (lib.phase as { from: number[] }).from[1];
  const l2 = takeToken(lib, picked);
  assert.ok(l2.cities[0].tokens.includes(picked) && !l2.box.includes(picked));
  assert.equal(l2.box.length, 4);
  // უშგულის კოშკები: a brown card of the other side to the discard
  const ruin = play(withW(wonderNamed('უშგულის კოშკები'), city([], 30), city(['სამტეხლო', 'კოშკი'])), s, 'wonder', 0);
  assert.equal(ruin.phase.k, 'ruin');
  assert.equal(ruinCard(ruin, byName('კოშკი')), ruin);
  const r2 = ruinCard(ruin, byName('სამტეხლო'));
  assert.deepEqual(r2.cities[1].cards, [byName('კოშკი')]);
  assert.ok(r2.discard.includes(byName('სამტეხლო')));
  // nothing to ruin: the turn goes on
  assert.equal(play(withW(wonderNamed('შატილი')), s, 'wonder', 0).phase.k, 'play');
  // ბირთვისი: a discarded card built free
  const rev = play(withW(wonderNamed('ბირთვისი'), city([], 30), city(), { discard: [byName('ფუნდუკი')] }), s, 'wonder', 0);
  assert.equal(rev.phase.k, 'revive');
  const v2 = revive(rev, byName('ფუნდუკი'));
  assert.ok(v2.cities[0].cards.includes(byName('ფუნდუკი')));
  assert.equal(v2.cities[0].coins, rev.cities[0].coins + 4);
  // ხერთვისი: 3 coins in, 3 out of the other side, again
  const ap = play(withW(wonderNamed('ხერთვისი'), city([], 30), city([], 2)), s, 'wonder', 0);
  assert.equal(ap.cities[1].coins, 0);
  assert.equal(ap.turn, 0);
  // the seventh built: the eighth is out
  const six = (who: number) => [0, 1, 2].map(i => ({ w: who * 4 + i, under: 0 }));
  const g7: TakhtiGame = { ...base, cities: [{ ...city([], 40), wonders: [...six(0), { w: 3, under: -1 }] }, { ...city([], 40), wonders: [...six(1), { w: 7, under: -1 }] }] };
  assert.equal(wondersBuilt(g7), 6);
  assert.ok(wonderOk(g7, 0, 3));
  const after = play(g7, s, 'wonder', 3);
  assert.equal(wondersBuilt(after), MAX_WONDERS);
  assert.equal(after.cities[1].wonders[3].out, true);
  assert.equal(wonderOk(after, 1, 3), false);
});

test('an age ends with its last card: the weaker side says who begins the next', () => {
  const g = drafted(11);
  const last = freeSlots(g)[0];
  const one: TakhtiGame = { ...g, gone: ((1 << SLOTS) - 1) & ~(1 << last), pawn: 2 };
  const e = play(one, last, 'discard');
  assert.equal(e.age, 2);
  assert.equal(e.phase.k, 'start');
  assert.equal(e.turn, 1); // the rider on the east's half: the east chooses
  assert.equal(e.gone, 0);
  assert.equal(begin(e, 0).turn, 0);
  assert.equal(begin(e, 0).phase.k, 'play');
  const even = play({ ...one, pawn: 0, turn: 1 }, last, 'discard');
  assert.equal(even.turn, 1); // the one who took the last card
});

test('the glory points: cards, guilds, monuments, tokens, coins by three, the rider\'s zone; a tie goes to the blue cards', () => {
  assert.deepEqual([0, 1, 2, 3, 5, 6, 8, 9].map(p => armyPoints(p, 0)), [0, 2, 2, 5, 5, 10, 10, 10]);
  assert.equal(armyPoints(-4, 1), 5);
  assert.equal(armyPoints(4, 1), 0);
  const g = drafted();
  const x: TakhtiGame = {
    ...g, pawn: 3,
    cities: [
      { ...city(['ქალაქის კარიბჭე', 'ხუროს სახელოსნო', 'ფოთის ნავსადგური', 'მოურავთა ამქარი', 'ზარაფთა ამქარი'], 14, [TK.MATH, TK.PHIL]), wonders: [{ w: wonderNamed('სიღნაღის გალავანი'), under: 0 }] },
      city(['უფლისციხის დარბაზი', 'გოგირდის აბანო', 'სააჯო კარი'], 20),
    ],
  };
  const s = scoreOf(x, 0);
  assert.equal(s.blue, 3);
  assert.equal(s.green, 1);
  assert.equal(s.yellow, 3);
  assert.equal(s.guild, 3 + 6); // the east's three blue cards; the richer side's 20 coins
  assert.equal(s.wonder, 9);
  assert.equal(s.token, 6 + 7);
  assert.equal(s.coins, 4);
  assert.equal(s.army, 5);
  assert.equal(s.total, 3 + 1 + 3 + 9 + 9 + 13 + 4 + 5);
});

/** a random but legal move for the player on turn */
const anyMove = (g: TakhtiGame, r: () => number): number => {
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const ph = g.phase;
  switch (ph.k) {
    case 'draft': return pick(ph.offer);
    case 'token': return pick(ph.from);
    case 'ruin': return pick(g.cities[1 - g.turn].cards.filter(id => CARDS[id].t === ph.type));
    case 'revive': return pick(g.discard);
    case 'start': return pick([0, 1]);
    default: {
      const s = pick(freeSlots(g));
      const opts = [playPick(s, 'discard')];
      if (cardPrice(g, g.turn, g.slots[s]).ok) opts.push(playPick(s, 'build'), playPick(s, 'build'), playPick(s, 'build'));
      g.cities[g.turn].wonders.forEach((_, i) => { if (wonderOk(g, g.turn, i)) opts.push(playPick(s, 'wonder', i)); });
      return pick(opts);
    }
  }
};

test('whole games: always end, coins never below 0, every card in one place, the view hides what is face down', () => {
  const why = new Set<string>();
  for (let seed = 1; seed <= 150; seed++) {
    const r = mulberry32(seed * 7919);
    let g = newTakhti({ names: ['ანა', 'ბექა'], rnd: r })!;
    let guard = 0;
    while (g.phase.k !== 'end' && guard++ < 400) {
      const before = g;
      g = seed % 5 ? applyPick(g, anyMove(g, r)) : timeUp(g);
      assert.notEqual(g, before, `seed ${seed}: the move did nothing in ${before.phase.k}`);
      assert.ok(g.cities.every(c => c.coins >= 0));
      const placed = [...g.slots.filter((_, s) => !(g.gone & (1 << s))), ...g.next.flat(), ...g.discard, ...g.cities.flatMap(c => [...c.cards, ...c.wonders.filter(w => w.under >= 0).map(w => w.under)])];
      assert.equal(new Set(placed).size, placed.length, `seed ${seed}: a card twice`);
      const v = publicOf(g);
      for (let s = 0; s < SLOTS; s++) if (v.slots[s] >= 0 && !(g.gone & (1 << s))) assert.ok(isUp(g, s));
      assert.deepEqual(parseTakhti(JSON.parse(JSON.stringify(g))), g);
      assert.ok(parseTakhti(JSON.parse(JSON.stringify(v))));
    }
    assert.equal(g.phase.k, 'end', `seed ${seed} did not end`);
    if (g.phase.k === 'end') why.add(g.phase.why);
    assert.ok(wondersBuilt(g) <= MAX_WONDERS);
  }
  assert.ok(why.has('civil'));
});
