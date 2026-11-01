import test from 'node:test';
import assert from 'node:assert/strict';
import { TABU_CARDS } from '../src/data/tabuCards';
import {
  JO_CARDS, baseOf, giversOf, guessTable, guesserOf, joClues, joGuess, joNext, joOver, joPass, joScore, joVerdict, judgeClues, mendGuess,
  newJoRun, newJoTable, nextTableCard, notesOf, openWord, parseJoRun, parseJoTable, sameClue, strikeClue, tableOver, writeClue,
} from '../src/utils/minishneba';

const card = (i: number) => TABU_CARDS.find(c => c.id === i)!;

test('the same clue: one word with its plural or its last vowel, never two words', () => {
  assert.ok(sameClue('ზარი', 'ზარები'));
  assert.ok(sameClue('ხე', 'ხეები'));
  assert.ok(sameClue('რქა', 'რქები'));
  assert.ok(sameClue('ცომი', 'ცომს'));
  assert.ok(!sameClue('ზარი', 'ზღვა'));
  assert.ok(!sameClue('', ''));
  assert.equal(baseOf('ხორცები'), 'ხორც');
  assert.deepEqual(judgeClues(['ხორცი', 'ხორცები', 'წვენი', 'ხინკალს', ''], 'ხინკალი'), ['same', 'same', 'ok', 'part', 'empty']);
});

test('alone: thirteen cards, the clues left after the same ones struck, one try, a wrong one loses the next card', () => {
  const run0 = newJoRun(42);
  assert.equal(run0.rounds.length, JO_CARDS);
  assert.equal(new Set(run0.rounds.map(r => r.card)).size, JO_CARDS);
  const seen = run0.rounds.map(r => r.card);
  assert.ok(newJoRun(43, seen).rounds.every(r => !seen.includes(r.card)), 'the cards not met lately first');
  const c0 = joClues(run0, 0);
  assert.equal(c0.shown.length, 5 - run0.rounds[0].struck);
  assert.ok(c0.shown.every(x => card(run0.rounds[0].card).no.includes(x)));
  let r = joGuess(run0, c0.word);
  assert.equal(r.res[0], 'right');
  r = joNext(r);
  r = joGuess(r, 'სულ-სხვა');
  assert.deepEqual(r.res.slice(0, 3), ['right', 'wrong', 'lost']);
  r = joNext(r);
  assert.equal(r.at, 3, 'the lost card is skipped');
  r = joNext(joPass(r));
  assert.equal(r.res[3], 'pass');
  while (!joOver(r)) {
    const { word } = joClues(r, r.at);
    r = joNext(r.at === JO_CARDS - 1 ? joGuess(r, 'არა') : joGuess(r, word));
  }
  assert.equal(r.penalty, 1, 'a wrong last guess costs a won card');
  assert.equal(joScore(r), 1 + (JO_CARDS - 5) - 1);
  assert.match(joVerdict(13), /უნაკლო/);
  assert.deepEqual(parseJoRun(JSON.parse(JSON.stringify(r))), r);
  assert.equal(parseJoRun({ rounds: [] }), null);
});

test('the class: the clues go round the givers, the same ones cancel, the guesser tries, the host may mend the verdict', () => {
  assert.equal(newJoTable(['ა', 'ბ'], [0]), null, 'three players at least');
  let g = newJoTable(['ანა', 'ბექა', 'გიო', 'დათო'], TABU_CARDS.slice(0, JO_CARDS).map(c => c.id))!;
  assert.equal(guesserOf(g), 0);
  assert.deepEqual(giversOf(g), [1, 2, 3]);
  assert.equal(g.giver, 1);
  const word = card(g.deck[0]).w;
  assert.deepEqual(writeClue(g, 'x'), g, 'the word opens first');
  g = writeClue(openWord(g), 'ცომი');
  assert.equal(g.phase, 'pass');
  assert.equal(g.giver, 2);
  g = writeClue(openWord(g), 'ცომს');
  g = writeClue(openWord(g), 'წვენი');
  assert.equal(g.phase, 'guess');
  assert.deepEqual(judgeClues(g.clues, word), ['empty', 'same', 'same', 'ok']);
  assert.deepEqual(notesOf(g).map(n => [n.seat, n.fate]), [[1, 'same'], [2, 'same'], [3, 'ok']]);
  // the givers strike a word the phone kept (a word of the same family), and may take it back; only in this step, only a giver's
  const struck = strikeClue(g, 3);
  assert.deepEqual(notesOf(struck).map(n => n.fate), ['same', 'same', 'same']);
  assert.deepEqual(strikeClue(struck, 3).off, []);
  assert.equal(strikeClue(g, 0), g, 'the guesser has no clue to strike');
  const open = { ...g, phase: 'reveal' as const };
  assert.equal(strikeClue(open, 3), open, 'only before the guesser has the phone');
  assert.deepEqual(parseJoTable(JSON.parse(JSON.stringify(struck)))?.off, [3]);
  g = guessTable(g, 'ფანდური');
  assert.equal(g.phase, 'reveal');
  assert.deepEqual(g.res.slice(0, 2), ['wrong', 'lost']);
  g = mendGuess(g);
  assert.deepEqual(g.res.slice(0, 2), ['right', undefined]);
  g = nextTableCard(g);
  assert.equal(g.at, 1);
  assert.equal(guesserOf(g), 1);
  assert.deepEqual(giversOf(g), [2, 3, 0]);
  assert.deepEqual(g.clues, ['', '', '', '']);
  assert.deepEqual(g.off, [], 'a new card: no strikes');
  assert.deepEqual(parseJoTable(JSON.parse(JSON.stringify(g))), g);
  g = guessTable({ ...g, phase: 'guess' }, null);
  assert.equal(g.res[1], 'pass');
  for (let i = 0; i < 20 && !tableOver(g); i++) g = nextTableCard(guessTable({ ...g, phase: 'guess' }, card(g.deck[g.at]).w));
  assert.ok(tableOver(g));
  assert.equal(joScore(g), JO_CARDS - 1);
  const broken = parseJoTable({ names: ['ა', 'ბ', 'გ'], deck: [0, 1], phase: 'write', giver: 0 });
  assert.equal(broken?.giver, 1, 'a writer that cannot be: the card goes back to its first giver');
});
