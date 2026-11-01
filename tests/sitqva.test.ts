import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KIND_HINT, afterTry, candidatesOfDay, dayIndex, fits, isSaintDay, keyMarks, nameWord, scoreGuess, sitqvaShareText,
  wordOfDay, type SitqvaCandidate, type SitqvaKind,
} from '../src/utils/sitqva';
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

// the bank's own kinds; a feast and a saint come only from the calendar
const BANK_KINDS: SitqvaKind[] = ['church', 'region', 'food', 'nature', 'hero', 'culture'];

test('the bank: every word once, 4–6 Georgian letters, a kind with a hint, all six kinds', () => {
  assert.ok(ANSWER_BANK.length >= 150);
  assert.equal(new Set(ANSWER_BANK.map(c => c.word)).size, ANSWER_BANK.length);
  for (const c of ANSWER_BANK) {
    assert.ok(fits(c.word), c.word);
    assert.ok(BANK_KINDS.includes(c.kind), c.word);
    assert.ok(KIND_HINT[c.kind], c.word);
  }
  for (const k of BANK_KINDS) assert.ok(ANSWER_BANK.some(c => c.kind === k), k);
});

test('wordOfDay: a feast always, a saint every third day, else the bank — the same for the whole day', () => {
  const saints: SitqvaCandidate[] = [{ word: 'გიორგი', kind: 'saint' }, { word: 'ნინო', kind: 'saint' }];
  // 2026-11-23 is day 27 — a saint's day
  assert.equal(isSaintDay('2026-11-23'), true);
  const a = wordOfDay('2026-11-23', saints, ANSWER_BANK);
  assert.deepEqual(a, wordOfDay('2026-11-23', saints, ANSWER_BANK));
  assert.equal(a?.kind, 'saint');
  const other = wordOfDay('2026-11-23', saints, ANSWER_BANK, a!.word);
  assert.notEqual(other?.word, a!.word);
  // a saint's name too long for the grid is skipped
  assert.notEqual(wordOfDay('2026-11-23', [{ word: 'შუშანიკი', kind: 'saint' }], ANSWER_BANK)?.kind, 'saint');
  // the next day the bank speaks, though the day has saints
  assert.equal(isSaintDay('2026-11-24'), false);
  const bank = wordOfDay('2026-11-24', saints, ANSWER_BANK);
  assert.ok(bank && BANK_KINDS.includes(bank.kind));
  // a feast wins on any day
  const feast: SitqvaCandidate = { word: 'ხარება', kind: 'feast' };
  assert.deepEqual(wordOfDay('2026-11-24', [...saints, feast], ANSWER_BANK), feast);
  // the words differ from day to day
  const week = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07'];
  assert.ok(new Set(week.map(d => wordOfDay(d, [], ANSWER_BANK)?.word)).size >= 6);
  assert.equal(wordOfDay('2026-11-23', [], [{ word: 'შუშანიკიანი', kind: 'hero' }]), undefined);
});

test('afterTry ends the day on the word or after six tries', () => {
  let d = emptyDay('ხორუმი');
  d = afterTry(d, 'სამაია');
  assert.equal(d.done, false);
  d = afterTry(d, 'ხორუმი');
  assert.equal(d.won, true);
  assert.equal(d.done, true);
  assert.equal(afterTry(d, 'ლეკური').guesses.length, 2);
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
