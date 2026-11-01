import test from 'node:test';
import assert from 'node:assert/strict';
import { TABU_CARDS, TABU_THEMES } from '../src/data/tabuCards';
import {
  CLUES, DAY_CARDS, MAX_DAY_POINTS, cardOver, cycleMark, dayDeal, finishedTabuDay, giveUp, givesAway, isWord, moreClue, newTabuRun,
  newTabuTable, nextCard, parseTabuRun, parseTabuTable, playTurn, pointsOf, ptsSquare, runOver, runScore, stemOf, tabuMeta, tabuScores,
  tabuShareText, tabuStats, tabuWinner, tableCard, tryWord, turnPoints,
} from '../src/utils/tabu';

test('the bank: twelve themes, one word a card that can be typed back, five forbidden words that never give it away', () => {
  assert.equal(TABU_THEMES.length, 12);
  for (const t of TABU_THEMES) assert.ok(t.cards.length >= 15, t.id);
  assert.equal(new Set(TABU_CARDS.map(c => c.w)).size, TABU_CARDS.length, 'no word twice');
  assert.equal(new Set(TABU_CARDS.map(c => c.id)).size, TABU_CARDS.length);
  for (const c of TABU_CARDS) {
    assert.match(c.w, /^[ა-ჰ]+$/, c.w);
    assert.equal(new Set(c.no).size, 5, `${c.w}: five different words`);
    for (const n of c.no) {
      assert.ok(!givesAway(n, c.w), `${c.w}: „${n}“ gives it away`);
      assert.ok(!isWord(n, c.w), `${c.w}: „${n}“`);
    }
  }
});

test('a typed word: the same letters, or without the last vowel; spaces and Latin are not letters', () => {
  assert.ok(isWord('ჩონგური', 'ჩონგური'));
  assert.ok(isWord(' ჩონგური! ', 'ჩონგური'));
  assert.ok(isWord('ჩონგურ', 'ჩონგური'));
  assert.ok(isWord('თამარ', 'თამარი'));
  assert.ok(!isWord('ფანდური', 'ჩონგური'));
  assert.ok(!isWord('', 'ჩონგური'));
  assert.ok(!isWord('ჩონ', 'ჩონგური'));
  assert.equal(stemOf('ზარი'), 'ზარ');
  assert.equal(stemOf('ხე'), 'ხე');
  assert.ok(givesAway('ზარები', 'ზარი'));
  assert.ok(givesAway('ბურთი', 'ფეხბურთი'), 'a part of the word');
  assert.ok(!givesAway('სამრეკლო', 'ზარი'));
});

test('the day: twenty cards for the whole school, none twice in nine days', () => {
  const a = dayDeal('2026-11-05');
  assert.equal(a.length, DAY_CARDS);
  assert.deepEqual(dayDeal('2026-11-05').map(c => c.id), a.map(c => c.id));
  const days = Array.from({ length: 9 }, (_, i) => new Date(Date.UTC(2026, 10, 1 + i)).toISOString().slice(0, 10));
  // the nine days of one cycle hold every card once
  const cycleStart = days.findIndex(d => Math.floor(Date.parse(`${d}T00:00:00Z`) / 86_400_000) % 9 === 0);
  const cycle = Array.from({ length: 9 }, (_, i) => new Date(Date.parse(`${days[cycleStart]}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10));
  const ids = cycle.flatMap(d => dayDeal(d).map(c => c.id));
  assert.equal(new Set(ids).size, TABU_CARDS.length);
});

test('alone: a wrong word brings the next clue, a right one the points of the clues out, the fifth wrong loses the card', () => {
  const deal = dayDeal('2026-11-05');
  let r = newTabuRun('2026-11-05');
  r = tryWord(r, 'ნამდვილად-არა', deal[0]);
  assert.equal(r.shown, 2);
  r = tryWord(r, deal[0].w, deal[0]);
  assert.deepEqual(r.pts, [CLUES - 1]);
  assert.ok(cardOver(r));
  assert.deepEqual(tryWord(r, deal[0].w, deal[0]), r, 'one answer a card');
  r = nextCard(r);
  assert.equal(r.at, 1);
  for (let i = 0; i < CLUES; i++) r = tryWord(r, `არა${i}`, deal[1]);
  assert.deepEqual(r.pts, [4, 0]);
  r = moreClue(nextCard(r));
  assert.equal(r.shown, 2);
  r = giveUp(r);
  assert.deepEqual(r.pts, [4, 0, 0]);
  for (let i = 3; i < DAY_CARDS; i++) r = tryWord(nextCard(r), deal[i].w, deal[i]);
  r = nextCard(r);
  assert.ok(runOver(r));
  assert.equal(runScore(r), 4 + (DAY_CARDS - 3) * CLUES);
  assert.deepEqual(parseTabuRun(JSON.parse(JSON.stringify(r)), '2026-11-05'), r);
  assert.equal(parseTabuRun(r, '2026-11-06'), null, 'yesterday’s run is not today’s');
  assert.deepEqual(parseTabuRun({ iso: '2026-11-05', at: 9, shown: 9, pts: [5, 9, 3] }, '2026-11-05'), { iso: '2026-11-05', at: 2, shown: 5, wrong: [], pts: [5, 3] });
});

test('the class: a guessed word +1, a forbidden one −1, a skip 0 or −1; the deck moves on by the cards marked', () => {
  const turn = { team: 0, marks: [{ card: 0, m: 'ok' as const }, { card: 1, m: 'skip' as const }, { card: 2, m: 'taboo' as const }, { card: 3, m: 'ok' as const }] };
  assert.equal(turnPoints(turn, false), 1);
  assert.equal(turnPoints(turn, true), 0);
  assert.equal(cycleMark('ok'), 'skip');
  assert.equal(cycleMark('taboo'), 'ok');
  let g = newTabuTable(['ა', 'ბ'], { seconds: 60, target: 10, skipCost: false }, () => 0.3);
  const first = tableCard(g);
  assert.ok(first);
  g = playTurn(g, turn);
  assert.equal(g.at, 4);
  assert.notEqual(tableCard(g)?.id, first?.id);
  g = playTurn(g, { team: 1, marks: [] });
  assert.deepEqual(tabuScores(g.turns, 2, false), [1, 0]);
  assert.equal(tabuWinner(g.turns, 2, 1, false), 0);
  assert.equal(tabuWinner(g.turns, 2, 10, false), null);
  assert.deepEqual(parseTabuTable(JSON.parse(JSON.stringify(g))), g);
  assert.equal(parseTabuTable({ names: ['ა'], deck: [0] }), null);
  assert.equal(parseTabuTable({ names: ['ა', 'ბ'], deck: [0], turns: [{ team: 5, marks: [] }, { team: 1, marks: [{ card: 0, m: 'x' }] }] })?.turns.length, 1);
});

test('the day\'s record: a digit a card, the streak of days played, the share text without words', () => {
  const pts = [5, 4, 3, 2, 1, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
  const day = finishedTabuDay('2026-11-03', pts);
  assert.deepEqual(pointsOf(day), pts);
  assert.equal(runScore({ pts: pointsOf(day) }), 85);
  assert.equal(MAX_DAY_POINTS, 100);
  const days = { '2026-11-01': finishedTabuDay('2026-11-01', Array(20).fill(1)), '2026-11-02': finishedTabuDay('2026-11-02', Array(20).fill(0)), '2026-11-03': day };
  assert.deepEqual(tabuStats(days, '2026-11-03'), { played: 3, streak: 3, best: 85, average: 35 });
  assert.equal(tabuStats(days, '2026-11-04').streak, 3, 'today not played yet: the streak still stands');
  assert.equal(tabuStats(days, '2026-11-05').streak, 0);
  assert.equal(tabuMeta(days, '2026-11-03'), 'დღეს: 85/100');
  assert.equal(tabuMeta(days, '2026-11-04'), 'სერია: 3 დღე');
  assert.equal(tabuMeta({}, '2026-11-04'), undefined);
  const text = tabuShareText(7, day);
  assert.match(text, /^ნუ იტყვი! №7 · 85\/100\n/);
  assert.equal([...text.split('\n')[1]].length, 10);
  assert.ok(!dayDeal('2026-11-03').some(c => text.includes(c.w)), 'no word in the share text');
  assert.deepEqual([5, 4, 3, 2, 1, 0].map(ptsSquare), ['🟩', '🟩', '🟨', '🟨', '🟧', '⬛']);
  assert.deepEqual(pointsOf({ guesses: ['x', 'p:59a2'] }), [5, 2]);
});
