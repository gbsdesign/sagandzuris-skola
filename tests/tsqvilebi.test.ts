import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TSQ_RULES, closeMiss, dealCards, decodeResult, drawTsqvilebi, encodeResult, flipCard, isClear, isName, newBoard, pairOf,
  parseBoard, pickItems, softBreaks, tsqPoints, tsqSeconds, type TsqItem,
} from '../src/utils/tsqvilebi';

const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const chant = (i: number, name = `საგალობელი ${i}`): TsqItem => ({ id: `c${i}`, name, sub: 'წირვა', sound: { book: 'book', num: i + 1 } });
const song = (i: number): TsqItem => ({ id: `s${i}`, name: `სიმღერა ${i}`, sub: 'გურია', sound: { url: `https://example.org/${i}`, from: 0.12 } });

test('a deal holds every card once, a sound and its pair', () => {
  const cards = dealCards(6, seeded(3));
  assert.equal(cards.length, 12);
  assert.deepEqual([...cards].sort((a, b) => a - b), Array.from({ length: 12 }, (_, i) => i));
  assert.equal(pairOf(7), 3);
  assert.equal(isName(7, 'name'), true);
  assert.equal(isName(7, 'same'), false);
  assert.equal(isName(6, 'name'), false);
});

test('two cards a move: a pair stays open, a miss closes, a third card closes the miss at once', () => {
  const cards = [0, 2, 1, 3]; // pair 0 at 0 and 2, pair 1 at 1 and 3
  let b = newBoard(4);
  let r = flipCard(b, cards, 0);
  assert.equal(r.event, 'open');
  assert.equal(flipCard(r.board, cards, 0).event, 'none', 'the same card again is nothing');
  r = flipCard(r.board, cards, 1);
  assert.equal(r.event, 'miss');
  assert.deepEqual(r.board.open, [0, 1]);
  assert.equal(r.board.moves, 1);
  b = r.board;
  r = flipCard(b, cards, 2); // a third card: the miss closes, this one opens
  assert.equal(r.event, 'open');
  assert.deepEqual(r.board.open, [2]);
  r = flipCard(r.board, cards, 0);
  assert.equal(r.event, 'match');
  assert.equal(r.board.pairs, 1);
  assert.deepEqual(r.board.open, []);
  assert.equal(flipCard(r.board, cards, 0).event, 'none', 'a found card does not flip');
  r = flipCard(r.board, cards, 1);
  r = flipCard(r.board, cards, 3);
  assert.equal(r.event, 'match');
  assert.equal(r.board.moves, 3);
  assert.ok(isClear(r.board));
  assert.deepEqual(closeMiss({ ...b }).open, []);
});

test('a board read back from the phone', () => {
  const b = { open: [1], done: [true, false, true, false], moves: 2, pairs: 1 };
  assert.deepEqual(parseBoard(b, 4), b);
  assert.equal(parseBoard({ ...b, pairs: 2 }, 4), null);
  assert.equal(parseBoard({ ...b, open: [9] }, 4), null);
  assert.equal(parseBoard('x', 4), null);
});

test('a result as one int, and its points', () => {
  const q = { items: [chant(0), chant(1), chant(2), chant(3), chant(4), chant(5)] };
  assert.deepEqual(decodeResult(encodeResult(4, 11)), { pairs: 4, moves: 11 });
  assert.equal(tsqPoints(q, encodeResult(0, 5)), 0);
  assert.equal(tsqPoints(q, encodeResult(4, 11)), 400);
  assert.equal(tsqPoints(q, encodeResult(6, 6)), 1200, 'every move a pair: the whole bonus');
  assert.equal(tsqPoints(q, encodeResult(6, 12)), 900, 'twice the moves: half of it');
  assert.equal(tsqSeconds(q), 114);
});

test('a round is checked when read back, an answer before it counts', () => {
  const [q] = drawTsqvilebi({ groups: [[0, 1, 2, 3, 4, 5].map(i => chant(i))], count: 1, pairs: 4, mode: 'name', rnd: seeded(5) });
  assert.ok(TSQ_RULES.valid(q));
  assert.ok(TSQ_RULES.valid(JSON.parse(JSON.stringify(q))));
  assert.equal(TSQ_RULES.valid({ ...q, cards: [0, 0, 1, 2, 3, 4, 5, 6] }), false);
  assert.equal(TSQ_RULES.valid({ ...q, mode: 'x' }), false);
  assert.equal(TSQ_RULES.valid({ ...q, items: [{ ...q.items[0], sound: { url: 'http://x', from: 0 } }, ...q.items.slice(1)] }), false);
  assert.ok(TSQ_RULES.ok(q, encodeResult(4, 9)));
  assert.equal(TSQ_RULES.ok(q, encodeResult(5, 9)), false, 'more pairs than the board has');
  assert.equal(TSQ_RULES.ok(q, encodeResult(3, 2)), false, 'fewer moves than pairs');
});

test('a board: different names, the unseen first, half of each kind', () => {
  const chants = [chant(0, 'მამაო ჩუენო'), chant(1, 'მამაო ჩვენო'), chant(2), chant(3), chant(4)];
  const songs = [song(0), song(1), song(2), song(3)];
  for (let s = 1; s < 30; s++) {
    const items = pickItems([chants, songs], 6, [], seeded(s));
    assert.equal(items.length, 6);
    assert.equal(items.filter(it => it.id.startsWith('c')).length, 3);
    assert.ok(!(items.some(it => it.id === 'c0') && items.some(it => it.id === 'c1')), 'one way of writing a name only');
  }
  const seen = ['c3', 'c4']; // c0 and c1 are one name: the unseen are that one and c2
  const items = pickItems([chants], 2, seen, seeded(9));
  assert.ok(items.every(it => !seen.includes(it.id)), 'the ones not asked lately first');
  // a small group: the other fills its places
  assert.equal(pickItems([chants, songs.slice(0, 1)], 6, [], seeded(4)).length, 5);
});

test('a long word breaks between its syllables on a small card', () => {
  const shy = (s: string) => softBreaks(s).replace(/­/g, '-');
  assert.equal(shy('მდინარეთა ზედა ბაბილოვნისათა'), 'მდი-ნა-რეთა ზედა ბა-ბი-ლოვ-ნი-სათა');
  assert.equal(shy('ღმრთისმშობელო ქალწულო'), 'ღმრთის-მშო-ბელო ქალწულო');
  assert.equal(shy('ყოველთა და ყოვლისათვის'), 'ყოველთა და ყოვ-ლი-სათ-ვის');
  assert.equal(shy('მოვედით, თაყუანის-ვსცეთ'), 'მოვედით, თა-ყუა-ნის-ვსცეთ');
  assert.equal(softBreaks('ალილო'), 'ალილო', 'a short word stays whole');
});

test('a room game: every board with other items while there are', () => {
  const chants = Array.from({ length: 20 }, (_, i) => chant(i));
  const games = drawTsqvilebi({ groups: [chants], count: 3, pairs: 6, mode: 'same', rnd: seeded(11) });
  assert.equal(games.length, 3);
  const ids = games.flatMap(q => q.items.map(it => it.id));
  assert.equal(new Set(ids).size, 18);
  assert.ok(games.every(q => q.cards.length === 12 && q.mode === 'same' && TSQ_RULES.valid(q)));
});
