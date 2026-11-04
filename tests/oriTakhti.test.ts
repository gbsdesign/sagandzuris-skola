import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/utils/otkheuli';
import { CARDS } from '../src/data/takhtiCards';
import {
  ARMY_PTS, ARMY_TIE, OFFER, ROUNDS, WINE_PTS, applyPick, botPick, chooserOf, courtsNow, dividerOf, isEnvoy, keyOf, newTakhti, parseTakhti,
  publicOf, scoreOf, shareOf, timeUp, unseen, validSplit, winnersBy, type TakhtiGame,
} from '../src/utils/oriTakhti';

const id = (n: string) => { const i = CARDS.findIndex(c => c.n === n); assert.ok(i >= 0, n); return i; };
const ids = (...names: string[]) => names.map(id);
const start = (seed = 3, first = 0) => newTakhti({ names: ['ანა', 'ბექა'], first, rnd: mulberry32(seed) })!;
/** a hand-laid meeting: the offer and the courts as given */
const laid = (offer: string[], courts: string[][] = [[], []], patch: Partial<TakhtiGame> = {}): TakhtiGame => {
  const g = start();
  const o = ids(...offer), cs = courts.map(c => ids(...c));
  const rest = g.deck.filter(x => !o.includes(x) && !cs.flat().includes(x));
  return { ...g, deck: [...o, ...rest], offer: o, courts: cs, ...patch };
};
/** the split that puts these offer cards in the second share */
const maskOf = (g: TakhtiGame, second: string[]) => g.offer.reduce((m, x, i) => (second.map(id).includes(x) ? m | (1 << i) : m), 0);
const play = (g: TakhtiGame) => { while (g.phase.k !== 'end') g = timeUp(g); return g; };

test('42 cards: 12 castles of 1–3, 9 warriors of 1–3, 5 vines and 5 vessels, 6 books, 5 envoys; no name twice', () => {
  assert.equal(CARDS.length, 42);
  const of = (k: string) => CARDS.filter(c => c.k === k);
  assert.equal(of('tsikhe').length, 12);
  assert.equal(of('tsikhe').reduce((a, c) => a + c.v, 0), 24);
  assert.equal(of('lashkari').length, 9);
  assert.equal(of('lashkari').reduce((a, c) => a + c.v, 0), 18);
  assert.equal(of('ghvino').filter(c => c.w === 'vazi').length, 5);
  assert.equal(of('ghvino').filter(c => c.w === 'chuch').length, 5);
  assert.equal(of('tsigni').length, 6);
  assert.equal(of('elchi').length, 5);
  assert.equal(new Set(CARDS.map(c => c.n)).size, 42);
  CARDS.forEach((c, i) => { assert.equal(c.id, i); assert.ok(c.note.length > 0 && c.note.length <= 48, c.n); });
  // eight meetings of five, two cards left in the box
  assert.equal(ROUNDS * OFFER, 40);
});

test('a new game: the shuffled deck, its first five on the table, the first king divides', () => {
  const g = start(5, 1);
  assert.deepEqual([...g.deck].sort((a, b) => a - b), CARDS.map(c => c.id));
  assert.deepEqual(g.offer, g.deck.slice(0, 5));
  assert.equal(g.phase.k, 'split');
  assert.equal(g.turn, 1);
  assert.equal(dividerOf(g), 1);
  assert.equal(chooserOf(g), 0);
  assert.equal(unseen(g), 37);
  assert.equal(newTakhti({ names: ['ა'], rnd: Math.random }), null);
});

test('the count: castles by their points, the stronger army, wine by pairs, a book by the other kinds', () => {
  const courts = [
    ids('ნარიყალა', 'შატილი', 'მონასპა', 'მხედარი', 'რქაწითელი', 'საფერავი', 'ქვევრი', 'ვეფხისტყაოსანი', 'თამარიანი', 'ტაოს ელჩი'),
    ids('გონიო', 'ჯავშნოსანი', 'შუბოსანი', 'ჭური', 'ვისრამიანი'),
  ];
  const a = scoreOf(courts, 0), b = scoreOf(courts, 1);
  assert.equal(a.castle, 4);
  assert.equal(a.strength, 5);
  assert.equal(b.strength, 4);
  assert.equal(a.army, ARMY_PTS);
  assert.equal(b.army, 0);
  assert.equal(a.pairs, 1);
  assert.equal(a.wine, WINE_PTS);
  // castle, army, wine, envoy besides the books: 4 each
  assert.equal(a.perBook, 4);
  assert.equal(a.bookPts, 8);
  assert.equal(a.total, 4 + ARMY_PTS + WINE_PTS + 8);
  // a vessel alone makes no wine; a book counts castle, army: 2 — the vessel's kind too: 3
  assert.equal(b.wine, 0);
  assert.equal(b.perBook, 3);
  assert.equal(b.total, 3 + 0 + 0 + 3);
  // equal armies: half each; no army at all: nobody
  const tie = [ids('მხედარი'), ids('შუბოსანი', 'მეფარე')];
  assert.equal(scoreOf(tie, 0).army, ARMY_TIE);
  assert.equal(scoreOf(tie, 1).army, ARMY_TIE);
  assert.equal(scoreOf([ids('ნარიყალა'), []], 0).army, 0);
  // a book without other kinds is worth nothing
  assert.equal(scoreOf([ids('ვეფხისტყაოსანი'), []], 0).total, 0);
});

test('the throne: more points; a tie goes to the stronger army, then the castles, else both', () => {
  assert.deepEqual(winnersBy([ids('ნარიყალა'), ids('შატილი')]), [0]);
  // 8 and 8: the west's lone archer is the stronger army
  assert.deepEqual(winnersBy([ids('მშვილდოსანი'), ids('ნარიყალა', 'რქაწითელი', 'ქვევრი')]), [0]);
  // 4 and 4, no army: the west's castle is worth more
  assert.deepEqual(winnersBy([ids('ნარიყალა', 'ვეფხისტყაოსანი'), ids('შატილი', 'ვისრამიანი', 'თამარიანი', 'აბდულმესიანი')]), [0]);
  assert.deepEqual(winnersBy([ids('ანანური'), ids('სურამი')]), [0, 1]);
});

test('a meeting: the divider splits (a card in each share), the other takes a share, the divider the rest', () => {
  let g = laid(['ნარიყალა', 'მონასპა', 'რქაწითელი', 'ქვევრი', 'ვეფხისტყაოსანი']);
  assert.equal(validSplit(5, 0), false);
  assert.equal(validSplit(5, 31), false);
  assert.equal(applyPick(g, 0), g);
  assert.equal(applyPick(g, 31), g);
  assert.equal(applyPick(g, 1.5), g);
  const k0 = keyOf(g);
  g = applyPick(g, maskOf(g, ['რქაწითელი', 'ქვევრი']));
  assert.notEqual(keyOf(g), k0);
  assert.equal(g.phase.k, 'choose');
  assert.equal(g.turn, 1);
  assert.deepEqual(shareOf(g.offer, g.split, 1), ids('რქაწითელი', 'ქვევრი'));
  assert.equal(applyPick(g, 2), g);
  g = applyPick(g, 1);
  // no envoys: the meeting is over, the courts hold the shares, the east divides next
  assert.deepEqual(g.courts[1], ids('რქაწითელი', 'ქვევრი'));
  assert.deepEqual(g.courts[0], ids('ნარიყალა', 'მონასპა', 'ვეფხისტყაოსანი'));
  assert.equal(g.round, 1);
  assert.equal(g.phase.k, 'split');
  assert.equal(g.turn, 1);
  assert.equal(g.offer.length, 5);
  assert.deepEqual(g.log.map(l => l.k), ['split', 'choose']);
});

test('envoys: the chooser\'s take a card each from the other share first, then the divider\'s — never an envoy', () => {
  let g = laid(['ტაოს ელჩი', 'ნარიყალა', 'ჰერეთის ელჩი', 'მონასპა', 'ჭური']);
  // the second share: the east's envoy, the warrior, the vessel
  g = applyPick(g, maskOf(g, ['ჰერეთის ელჩი', 'მონასპა', 'ჭური']));
  g = applyPick(g, 0);
  // the east took the first share (the Tao envoy and Narikala): its envoy takes a card out of the west's
  assert.equal(g.phase.k, 'steal');
  assert.equal(g.turn, 1);
  assert.equal(applyPick(g, id('ჰერეთის ელჩი')), g);
  assert.equal(applyPick(g, id('ნარიყალა')), g);
  g = applyPick(g, id('მონასპა'));
  // now the west's envoy takes one back out of the east's
  assert.equal(g.phase.k, 'steal');
  assert.equal(g.turn, 0);
  g = applyPick(g, id('ნარიყალა'));
  assert.equal(g.phase.k, 'split');
  assert.deepEqual([...g.courts[0]].sort(), ids('ჰერეთის ელჩი', 'ჭური', 'ნარიყალა').sort());
  assert.deepEqual([...g.courts[1]].sort(), ids('ტაოს ელჩი', 'მონასპა').sort());
  assert.deepEqual(g.log.map(l => l.k), ['split', 'choose', 'steal', 'steal']);
});

test('an envoy with nothing to take does nothing: a share of envoys alone', () => {
  let g = laid(['ტაოს ელჩი', 'კახეთის ელჩი', 'ნარიყალა', 'შატილი', 'მუცო']);
  g = applyPick(g, maskOf(g, ['ტაოს ელჩი', 'კახეთის ელჩი']));
  // the east takes the castles; the west's two envoys take two of them back
  g = applyPick(g, 0);
  assert.equal(g.phase.k, 'steal');
  assert.equal(g.turn, 0);
  assert.deepEqual(g.phase, { k: 'steal', n: 2, next: 0 });
  g = applyPick(g, id('ნარიყალა'));
  g = applyPick(g, id('შატილი'));
  assert.equal(g.round, 1);
  assert.deepEqual(g.courts[1], ids('მუცო'));
  // the other way: the east takes the envoys, the west has castles only, no envoy of its own
  let h = laid(['ტაოს ელჩი', 'კახეთის ელჩი', 'ნარიყალა', 'შატილი', 'მუცო']);
  h = applyPick(h, maskOf(h, ['ტაოს ელჩი', 'კახეთის ელჩი']));
  h = applyPick(h, 1);
  assert.deepEqual(h.phase, { k: 'steal', n: 2, next: 0 });
  assert.equal(h.turn, 1);
  // envoys with nothing left to take do nothing: the east's four take the one castle, the other three stay idle
  let e = laid(['ტაოს ელჩი', 'კახეთის ელჩი', 'სვანეთის ელჩი', 'ჰერეთის ელჩი', 'ნარიყალა']);
  e = applyPick(e, maskOf(e, ['ტაოს ელჩი', 'კახეთის ელჩი', 'სვანეთის ელჩი', 'ჰერეთის ელჩი']));
  e = applyPick(e, 1);
  assert.deepEqual(e.phase, { k: 'steal', n: 4, next: 0 });
  e = applyPick(e, id('ნარიყალა'));
  assert.equal(e.round, 1);
  assert.equal(e.courts[1].length, 5);
  assert.deepEqual(e.courts[0], []);
});

test('a whole game by the careful move: eight meetings, 40 cards laid, two in the box, the roles in turn', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    let g = start(seed, seed % 2);
    const dividers: number[] = [];
    while (g.phase.k !== 'end') {
      if (g.phase.k === 'split') dividers.push(g.turn);
      const p = botPick(g);
      const next = applyPick(g, p);
      assert.notEqual(next, g, `seed ${seed}: the careful move is a move`);
      g = next;
    }
    assert.equal(g.round, ROUNDS);
    assert.deepEqual(dividers, Array.from({ length: ROUNDS }, (_, r) => (seed % 2 + r) % 2));
    assert.equal(g.courts[0].length + g.courts[1].length, 40);
    assert.equal(new Set(g.courts.flat()).size, 40);
    assert.equal(unseen(g), 2);
    assert.deepEqual(g.phase, { k: 'end', winners: winnersBy(g.courts) });
    assert.equal(applyPick(g, 1), g);
  }
});

test('the careful move: a split of the bot leaves something to each share, the chooser takes what is worth more to it', () => {
  let g = laid(['ნარიყალა', 'გონიო', 'შატილი', 'მუცო', 'თმოგვი']);
  const m = botPick(g);
  assert.ok(validSplit(5, m));
  g = applyPick(g, m);
  const s = botPick(g);
  const pts = (x: number) => shareOf(g.offer, g.split, x).reduce((a, c) => a + CARDS[c].v, 0);
  assert.ok(pts(s) >= pts(1 - s));
  // a lone vine wants its vessel more than three castles of 1
  const h = laid(['ჭური', 'მუცო', 'შატილი', 'თმოგვი', 'ბახტრიონი'], [['რქაწითელი'], []], { first: 1, turn: 1 });
  const hs = applyPick(h, maskOf(h, ['შატილი', 'თმოგვი', 'ბახტრიონი']));
  assert.equal(hs.turn, 0);
  assert.equal(botPick(hs), 0);
});

test('a stored game reads back; the online view drops only the deck; garbage and doubled cards are refused', () => {
  const g = play(start(9));
  const mid = (() => { let x = start(9); for (let i = 0; i < 7; i++) x = timeUp(x); return x; })();
  for (const x of [start(9), mid, g]) assert.deepEqual(parseTakhti(JSON.parse(JSON.stringify(x))), x);
  const v = publicOf(mid);
  assert.deepEqual(v.deck, []);
  assert.deepEqual(parseTakhti(JSON.parse(JSON.stringify(v))), v);
  assert.equal(parseTakhti(null), null);
  assert.equal(parseTakhti({ ...mid, v: 1 }), null);
  assert.equal(parseTakhti({ ...mid, courts: [[0, 0], []] }), null);
  assert.equal(parseTakhti({ ...mid, courts: [[...mid.courts[0], mid.offer[0]], mid.courts[1]] }), null);
  assert.equal(parseTakhti({ ...mid, deck: mid.deck.slice(1) }), null);
  assert.equal(parseTakhti({ ...mid, phase: { k: 'steal', n: 0, next: 0 } }), null);
  assert.equal(parseTakhti({ ...mid, phase: { k: 'end', winners: [0] } }), null);
  assert.equal(parseTakhti({ ...mid, names: ['ა'] }), null);
  assert.equal(parseTakhti({ ...mid, log: [{ k: 'steal', r: 0, who: 0, card: 99 }] }), null);
});

test('the score now counts this meeting\'s takes; an envoy is never a castle', () => {
  const g = laid(['ნარიყალა', 'მონასპა', 'რქაწითელი', 'ქვევრი', 'ტაოს ელჩი']);
  const h = applyPick(applyPick(g, maskOf(g, ['ტაოს ელჩი'])), 0);
  // the east took four cards, the west's envoy is about to take one back
  assert.equal(h.phase.k, 'steal');
  assert.equal(courtsNow(h)[1].length, 4);
  assert.ok(isEnvoy(id('ტაოს ელჩი')));
  assert.ok(!isEnvoy(id('ნარიყალა')));
});
