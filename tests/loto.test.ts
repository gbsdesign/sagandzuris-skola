import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  CARD_SIZE, KIT_CARDS, LINES, LINE_POINTS, LOTO_RULES, LOTO_ROUNDS, NOT_MINE, addWin, cardOf, cardsOf, carryLoto, checkKitCard,
  checkNames, kitCards, lineCells, lineNews, linesOf, lotoPoints, lotoRounds, marksAfter, newLotoSolo, newLotoTable, parseLotoSolo,
  parseLotoTable, plainOpening, seeded, soloAnswer, soloDone, tableNext, tablePlayed, toLine, type LotoPiece, type LotoQ,
} from '../src/utils/loto';
import { answerRound, newRounds, nextRound, parseRoundsState, publicView, revealRound, roundKey, type RoundsState } from '../src/utils/roundGames';
import { LOTO_KIT, PLAIN_OPENINGS, kitNames, kitPieces } from '../src/data/lotoKit';
import { knownChants } from '../src/data/chantGamePool';

const names = (n: number) => Array.from({ length: n }, (_, i) => `სახელი ${i + 1}`);
const pieces = (n: number): LotoPiece[] => Array.from({ length: n }, (_, i) => ({ id: `v-${i}`, book: 'v9', num: 58 + i, service: 'წირვა' }));

test('cards: nine different names each, none twice the same nine, the same on every phone, every name on about as many', () => {
  for (const [n, count] of [[13, 40], [20, 30], [16, 25]] as const) {
    const cards = cardsOf(77, count, n);
    assert.equal(cards.length, count);
    const sets = new Set<string>();
    const used = Array.from({ length: n }, () => 0);
    for (const c of cards) {
      assert.equal(c.length, CARD_SIZE);
      assert.equal(new Set(c).size, CARD_SIZE);
      assert.ok(c.every(i => Number.isInteger(i) && i >= 0 && i < n));
      sets.add([...c].sort((a, b) => a - b).join(','));
      c.forEach(i => { used[i] += 1; });
    }
    assert.equal(sets.size, count, 'no two cards with the same nine');
    assert.ok(Math.max(...used) - Math.min(...used) <= 1, `balanced over ${n}: ${used.join(' ')}`);
  }
  // a seat's card does not depend on what was asked before
  const a = cardOf(991, 39, 13);
  const b = cardsOf(991, 3, 13);
  assert.deepEqual(cardsOf(991, 40, 13)[39], a);
  assert.deepEqual(cardsOf(991, 40, 13).slice(0, 3), b);
  assert.deepEqual(cardOf(991, 2, 13), b[2]);
  assert.deepEqual(cardsOf(5, 1, 8), [], 'a deck smaller than a card makes none');
});

test('lines: rows, columns, diagonals', () => {
  const card = [10, 11, 12, 13, 14, 15, 16, 17, 18];
  assert.equal(LINES.length, 8);
  assert.equal(linesOf(card, []), 0);
  assert.equal(linesOf(card, [10, 11, 12]), 1);
  assert.equal(linesOf(card, [10, 13, 16]), 1);
  assert.equal(linesOf(card, [10, 14, 18]), 1);
  assert.equal(linesOf(card, [12, 14, 16, 10, 18]), 2);
  assert.equal(linesOf(card, card), 8);
  assert.deepEqual([...lineCells(card, [10, 11, 12, 15])].sort(), [0, 1, 2]);
  assert.equal(toLine(card, []), 3);
  assert.equal(toLine(card, [10, 11]), 1);
  assert.equal(toLine(card, [10, 11, 12]), 0);
});

test('rounds: every name once, one seed, no marks yet', () => {
  const qs = lotoRounds('chants', names(13), pieces(13), seeded(4));
  assert.equal(qs.length, 13);
  assert.deepEqual(qs.map(q => q.right).sort((a, b) => a - b), Array.from({ length: 13 }, (_, i) => i));
  assert.equal(new Set(qs.map(q => q.seed)).size, 1);
  for (const q of qs) {
    assert.ok(LOTO_RULES.valid(q), 'a drawn round reads back');
    assert.equal(q.id, `v-${q.right}`);
    assert.deepEqual(q.marks, []);
  }
  assert.deepEqual(lotoRounds('chants', names(8), pieces(8)), [], 'too few names');
  assert.deepEqual(lotoRounds('chants', names(13), pieces(12)), [], 'a piece for every name');
  assert.ok(!LOTO_RULES.valid({ ...qs[0], right: 13 }));
  assert.ok(!LOTO_RULES.valid({ ...qs[0], marks: [[99]] }));
  assert.ok(LOTO_RULES.ok(qs[0], NOT_MINE) && LOTO_RULES.ok(qs[0], 12) && !LOTO_RULES.ok(qs[0], 13) && !LOTO_RULES.ok(qs[0], -2));
});

test('points: a mark of my own card, quicker more, a line closed 300 more', () => {
  const q = lotoRounds('chants', names(13), pieces(13), seeded(9))[0];
  const card = cardOf(q.seed, 0, 13);
  const other = Array.from({ length: 13 }, (_, i) => i).find(i => !card.includes(i))!;
  const on: LotoQ = { ...q, right: card[0] };
  assert.equal(lotoPoints(on, { pick: card[0], ms: 0 }, 25000, 0), 200);
  assert.equal(lotoPoints(on, { pick: card[0], ms: 25000 }, 25000, 0), 100);
  assert.equal(lotoPoints(on, { pick: card[1], ms: 0 }, 25000, 0), 0, 'a wrong name');
  assert.equal(lotoPoints(on, { pick: NOT_MINE, ms: 0 }, 25000, 0), 0);
  assert.equal(lotoPoints(on, { pick: card[0], ms: 0 }, 25000), 0, 'no seat, no card');
  const off: LotoQ = { ...q, right: other };
  assert.equal(lotoPoints(off, { pick: other, ms: 0 }, 25000, 0), 0, 'not on my card');
  // the third of a row
  const row: LotoQ = { ...q, right: card[2], marks: [[card[0], card[1]]], lines: [0] };
  assert.equal(lotoPoints(row, { pick: card[2], ms: 25000 }, 25000, 0), 100 + LINE_POINTS);
  // the middle of a full cross closes four lines at once
  const cross: LotoQ = { ...q, right: card[4], marks: [[card[0], card[1], card[2], card[3], card[5], card[6], card[7], card[8]]], lines: [4] };
  assert.equal(lotoPoints(cross, { pick: card[4], ms: 25000 }, 25000, 0), 100 + 4 * LINE_POINTS);
  assert.deepEqual(marksAfter(row, 0, card[2]), [card[0], card[1], card[2]]);
  assert.deepEqual(marksAfter(row, 0, card[3]), [card[0], card[1]]);
});

/** a room of three: everybody marks the piece if it is on their card */
const play = (s: RoundsState, wrong = -1): RoundsState => {
  const q = s.rounds[s.at] as LotoQ;
  let t = s;
  s.players.forEach((_, seat) => {
    const card = cardOf(q.seed, seat, q.names.length);
    const pick = seat === wrong ? card.find(i => i !== q.right)! : card.includes(q.right) ? q.right : NOT_MINE;
    t = answerRound(t, seat, { key: roundKey(t), pick, ms: 3000 });
  });
  return t;
};

test('the room: marks ride on, a line is counted once, the answer is hidden while asked', () => {
  const rounds = lotoRounds('chants', names(LOTO_ROUNDS), pieces(LOTO_ROUNDS), seeded(21));
  let s = newRounds([{ uid: 'a', name: 'ანა' }, { uid: 'b', name: 'ბექა' }, { uid: 'c', name: 'ცირა' }], { game: 'loto', rounds, sound: 'host', now: 1000 })!;
  assert.ok(s);
  const view = publicView(s);
  assert.equal((view.q as Partial<LotoQ>).right, undefined);
  assert.equal((view.q as Partial<LotoQ>).id, undefined);
  assert.ok((view.q as Partial<LotoQ>).names?.length === LOTO_ROUNDS);
  let scores = [0, 0, 0];
  for (let r = 0; r < LOTO_ROUNDS; r++) {
    s = play(s, r === 0 ? 2 : -1);
    assert.equal(s.phase, 'reveal', 'everybody answered');
    const q = s.rounds[s.at] as LotoQ;
    const { news } = lineNews(q, s.answers.map(a => a?.pick ?? null));
    s.players.forEach((p, seat) => {
      const before = q.lines[seat] ?? 0;
      const card = cardOf(q.seed, seat, q.names.length);
      const after = linesOf(card, marksAfter(q, seat, s.answers[seat]!.pick));
      const marked = s.answers[seat]!.pick === q.right && card.includes(q.right);
      assert.equal(s.gained[seat], marked ? 100 + Math.round(100 * (1 - 3000 / 25000)) + LINE_POINTS * (after - before) : 0);
      assert.equal(news.some(x => x.seat === seat), after > before);
      scores[seat] += s.gained[seat];
      assert.equal(p.score, scores[seat]);
    });
    s = nextRound(s, 2000 + r);
    if (r + 1 < LOTO_ROUNDS) {
      const nq = s.rounds[s.at] as LotoQ;
      assert.equal(nq.marks.length, 3);
      // seat 2 tapped a wrong name in the first round: one piece of its card never marked
      nq.marks.forEach((m, seat) => assert.equal(m.length, s.rounds.slice(0, s.at).filter(x => cardOf(nq.seed, seat, LOTO_ROUNDS).includes((x as LotoQ).right)).length - (seat === 2 && cardOf(nq.seed, 2, LOTO_ROUNDS).includes((s.rounds[0] as LotoQ).right) ? 1 : 0)));
      assert.ok(LOTO_RULES.valid(nq));
    }
  }
  assert.equal(s.phase, 'end');
  // every name sounded: seats 0 and 1 marked their whole card, all eight lines
  const last = s.rounds[LOTO_ROUNDS - 1] as LotoQ;
  assert.equal(linesOf(cardOf(last.seed, 0, LOTO_ROUNDS), marksAfter(last, 0, last.right)), 8);
  // the host's state reads back with the marks in it
  const back = parseRoundsState(JSON.stringify(s));
  assert.ok(back);
  assert.deepEqual((back!.rounds[5] as LotoQ).marks, (s.rounds[5] as LotoQ).marks);
});

test('a round a seat did not answer leaves its marks as they were', () => {
  const rounds = lotoRounds('songs', names(13), pieces(13), seeded(3));
  let s = newRounds([{ uid: 'a', name: 'ა' }, { uid: 'b', name: 'ბ' }], { game: 'loto', rounds, sound: 'all', now: 0 })!;
  const q = s.rounds[0] as LotoQ;
  const card = cardOf(q.seed, 0, 13);
  s = answerRound(s, 0, { key: roundKey(s), pick: card.includes(q.right) ? q.right : NOT_MINE, ms: 100 });
  s = revealRound(s);
  const next = carryLoto(s.rounds[1] as LotoQ, s);
  assert.deepEqual(next.marks[1], []);
  assert.deepEqual(next.marks[0], card.includes(q.right) ? [q.right] : []);
});

test('line news: the first line of the game, and who closed one', () => {
  const q0 = lotoRounds('regions', names(13), pieces(13), seeded(12))[0];
  const card = cardOf(q0.seed, 1, 13);
  const q: LotoQ = { ...q0, right: card[8], marks: [[], [card[0], card[4]]], lines: [0, 0] };
  const a = lineNews(q, [NOT_MINE, card[8]]);
  assert.equal(a.first, true);
  assert.deepEqual(a.news, [{ seat: 1, lines: 1, gained: 1 }]);
  const b = lineNews({ ...q, lines: [1, 0] }, [NOT_MINE, card[8]]);
  assert.equal(b.first, false);
  assert.equal(lineNews(q, [NOT_MINE, NOT_MINE]).news.length, 0);
});

test('alone: marks stay, a mistake wipes the last mark and both come back, the card fills', () => {
  let s = newLotoSolo('chants', names(13), pieces(13), seeded(8))!;
  assert.equal(s.card.length, 9);
  assert.equal(s.queue.length, 13);
  const mine = (i: number) => s.card.includes(i) && !s.marks.includes(i);
  // the first piece of my card: marked
  while (!mine(s.queue[0])) s = soloAnswer(s, NOT_MINE, 500, seeded(1));
  const first = s.queue[0];
  s = soloAnswer(s, first, 1000, seeded(1));
  assert.deepEqual(s.marks, [first]);
  assert.equal(s.last?.result, 'mark');
  // a wrong name wipes it, and it comes back
  const now = s.queue[0];
  const wrongName = s.card.find(i => i !== now)!;
  s = soloAnswer(s, wrongName, 1000, seeded(2));
  assert.equal(s.last?.result, 'wrong');
  assert.equal(s.last?.erased, first);
  assert.deepEqual(s.marks, []);
  assert.ok(s.queue.includes(first));
  assert.equal(s.mistakes, 1);
  if (s.card.includes(now)) assert.ok(s.queue.includes(now), 'my piece comes back too');
  // let a piece of mine go: it comes back
  while (!mine(s.queue[0])) s = soloAnswer(s, NOT_MINE, 500, seeded(3));
  const let1 = s.queue[0];
  s = soloAnswer(s, NOT_MINE, 500, seeded(3));
  assert.equal(s.last?.result, 'missed');
  assert.ok(s.queue.includes(let1));
  // then play it right to the end
  let guard = 0;
  while (!soloDone(s) && guard++ < 200) {
    const p = s.queue[0];
    s = soloAnswer(s, mine(p) ? p : NOT_MINE, 800, seeded(guard));
    assert.ok(s.card.every(i => s.marks.includes(i) || s.queue.includes(i)), 'every piece of mine not marked is still to come');
  }
  assert.ok(soloDone(s));
  assert.equal(s.marks.length, 9);
  assert.ok(s.firstLine !== null && s.firstLine <= s.heard);
  assert.equal(soloAnswer(s, NOT_MINE, 100), s, 'a full card takes no more');
  const back = parseLotoSolo(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back, s);
  assert.equal(parseLotoSolo({ ...s, queue: [] , marks: [] }), null, 'pieces of my card lost');
});

test('the kit: twenty chants, thirty cards, the same on paper and on the phone', () => {
  assert.equal(LOTO_KIT.length, 20);
  assert.equal(new Set(kitNames()).size, 20);
  assert.equal(new Set(LOTO_KIT.map(c => c.id)).size, 20);
  const cards = kitCards(20);
  assert.equal(cards.length, KIT_CARDS);
  assert.deepEqual(kitCards(20), cardsOf(1501, 30, 20));
  let t = newLotoTable('print', 'chants', kitNames(), kitPieces(), seeded(6))!;
  assert.equal(tablePlayed(t).length, 0);
  assert.equal(checkKitCard(t, 1)!.lines, 0);
  assert.equal(checkKitCard(t, 31), null);
  // play card 1's first row first
  const row = cards[0].slice(0, 3);
  t = { ...t, order: [...row, ...t.order.filter(i => !row.includes(i))] };
  t = tableNext(tableNext(t));
  assert.equal(checkKitCard(t, 1)!.lines, 0);
  t = tableNext(t);
  const c1 = checkKitCard(t, 1)!;
  assert.equal(c1.lines, 1);
  assert.deepEqual([...c1.cells].sort(), [0, 1, 2]);
  assert.deepEqual(checkNames(t, row), { ok: true, missing: [] });
  const notYet = t.order[5];
  assert.deepEqual(checkNames(t, [row[0], row[1], notYet]), { ok: false, missing: [notYet] });
  assert.equal(checkNames(t, row.slice(0, 2)).ok, false, 'a line is three');
  t = addWin(t, '  ბარათი №1  ', 1);
  assert.deepEqual(t.wins, [{ label: 'ბარათი №1', at: 3, lines: 1 }]);
  assert.deepEqual(parseLotoTable(JSON.parse(JSON.stringify(t))), t);
  assert.equal(parseLotoTable({ ...t, order: [1, 1, 2] }), null);
  // own cards: no numbers to check
  const own = newLotoTable('own', 'songs', names(16), pieces(16), seeded(2))!;
  assert.equal(checkKitCard(own, 1), null);
});

/** a chant's top voice from its book notes (public/notes/<book>/NNN.json) */
const topVoice = (book: string, num: number): number[][] =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'notes', book, `${String(num).padStart(3, '0')}.json`), 'utf8')).voices[0];

test('the book notes: the reciting-tone openings are listed, and the kit has none', () => {
  assert.equal(plainOpening([[0, 1, 60], [1, 1, 60], [2, 1, 62], [3, 1, 64]]), true, 'three pitches');
  assert.equal(plainOpening([[0, 1, 60], [1, 1, 62], [2, 1, 64], [3, 1, 65]]), false);
  assert.equal(plainOpening([[0, 1, 60], [0, 1, 55], [1, 1, 62], [2, 1, 64], [3, 1, 65]]), false, 'a split keeps the upper note');
  const known = knownChants();
  const plain = known.filter(c => plainOpening(topVoice(c.book, c.num))).map(c => c.id);
  assert.deepEqual(plain.sort(), [...PLAIN_OPENINGS].sort(), 'PLAIN_OPENINGS = the known chants whose opening recites');
  for (const c of LOTO_KIT) assert.equal(plainOpening(topVoice(c.book, c.num)), false, `${c.title} recites`);
  const ids = new Set(known.map(c => c.id));
  for (const c of LOTO_KIT) {
    assert.ok(ids.has(c.id), `${c.title} is one of the known chants`);
    const k = known.find(x => x.id === c.id)!;
    assert.deepEqual([k.title, k.book, k.num, k.service], [c.title, c.book, c.num, c.service], `${c.id} as the pool has it`);
  }
});
