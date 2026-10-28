import { test } from 'node:test';
import assert from 'node:assert/strict';
import { afterTry, candidatesOfDay, dayIndex, keyMarks, nameWord, scoreGuess, sitqvaShareText, wordOfDay, type SitqvaCandidate } from '../src/utils/sitqva';
import { ANSWER_BANK } from '../src/data/sitqvaAnswers';
import { emptyDay } from '../src/utils/hangi';

test('scoreGuess colours as Wordle does, repeated letters counted once each', () => {
  assert.deepEqual(scoreGuess('ტაძარი', 'ტაძარი'), ['hit', 'hit', 'hit', 'hit', 'hit', 'hit']);
  // answer ალილო: the guess's second ა has no ა left to match
  assert.deepEqual(scoreGuess('ლალია', 'ალილო'), ['near', 'near', 'near', 'near', 'miss']);
  // answer ბაბუა: exact places first, then the misplaced უ; ი is not in the word
  assert.deepEqual(scoreGuess('ბუბია', 'ბაბუა'), ['hit', 'near', 'hit', 'miss', 'hit']);
});

test('keyMarks keeps the best thing known about a letter', () => {
  const m1 = keyMarks(['ლალია'], 'ალილო');
  assert.equal(m1['ლ'], 'near');
  assert.equal(m1['ა'], 'near');
  assert.equal(m1['ი'], 'near');
  const m2 = keyMarks(['ლალია', 'ალილო'], 'ალილო');
  assert.equal(m2['ლ'], 'hit');
  assert.equal(m2['ო'], 'hit');
  assert.equal(keyMarks(['ბუბია'], 'ბაბუა')['ი'], 'miss');
});

test('nameWord finds a first name in its calendar case', () => {
  assert.equal(nameWord('გიორგისა'), 'გიორგი');
  assert.equal(nameWord('ნინოსი'), 'ნინო');
  assert.equal(nameWord('ნინო'), 'ნინო');
  assert.equal(nameWord('დავითისა'), 'დავითი');
  assert.equal(nameWord('მოწამისა'), undefined);
  assert.equal(nameWord('და'), undefined);
});

test('candidatesOfDay gives the feast and the saints of the day, each once', () => {
  const day = {
    t: '', p: [],
    s: [
      { n: 'ხარება ყოვლადწმიდისა ღვთისმშობლისა', b: 1 as const, l: 'marti/25-khareba' },
      { n: 'წმ. დიდმოწამე გიორგისა', l: 'noemberi/23-giorgi' },
      { n: 'წმ. გიორგისა და ნინოსი' },
    ],
  };
  const c = candidatesOfDay(day);
  assert.deepEqual(c.find(x => x.kind === 'feast'), { word: 'ხარება', kind: 'feast', life: 'marti/25-khareba' });
  assert.deepEqual(c.filter(x => x.word === 'გიორგი'), [{ word: 'გიორგი', kind: 'saint', life: 'noemberi/23-giorgi' }]);
  assert.ok(c.some(x => x.word === 'ნინო' && x.kind === 'saint'));
  assert.deepEqual(candidatesOfDay(null), []);
});

test('wordOfDay is the same for the same day, prefers the day itself and skips yesterday\'s word', () => {
  const day: SitqvaCandidate[] = [{ word: 'გიორგი', kind: 'saint' }, { word: 'ნინო', kind: 'saint' }];
  const a = wordOfDay('2026-11-23', day, ANSWER_BANK);
  const b = wordOfDay('2026-11-23', day, ANSWER_BANK);
  assert.deepEqual(a, b);
  assert.equal(a?.kind, 'saint');
  assert.ok(a && a.word.length >= 4 && a.word.length <= 6);
  const other = wordOfDay('2026-11-23', day, ANSWER_BANK, a!.word);
  assert.notEqual(other?.word, a!.word);
  const bank = wordOfDay('2026-11-23', [], ANSWER_BANK);
  assert.ok(bank && ['church', 'region'].includes(bank.kind));
  // a saint's name too long for the grid is skipped
  assert.equal(wordOfDay('2026-11-23', [{ word: 'შუშანიკი', kind: 'saint' }], ANSWER_BANK)?.kind !== 'saint', true);
});

test('afterTry ends the day on the word or after six tries', () => {
  let d = emptyDay('ლოცვა');
  d = afterTry(d, 'ტაძარი');
  assert.equal(d.done, false);
  d = afterTry(d, 'ლოცვა');
  assert.equal(d.won, true);
  assert.equal(d.done, true);
  assert.equal(afterTry(d, 'ხატი').guesses.length, 2);
  let lost = emptyDay('ლოცვა');
  for (const g of ['ტაძარი', 'ჯვარი', 'ხატი', 'კანონი', 'გალობა', 'ბერი']) lost = afterTry(lost, g);
  assert.equal(lost.done, true);
  assert.equal(lost.won, false);
});

test('share text and the day number', () => {
  const d = afterTry(afterTry(emptyDay('ალილო'), 'ლალია'), 'ალილო');
  assert.equal(sitqvaShareText(3, d, 'x.ge'), 'დღის სიტყვა №3 · 2/6\n🟨🟨🟨🟨⬛\n🟩🟩🟩🟩🟩\nx.ge');
  assert.equal(dayIndex('2026-10-28'), 1);
  assert.equal(dayIndex('2026-11-01'), 5);
});
