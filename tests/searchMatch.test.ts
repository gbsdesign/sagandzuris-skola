// Run: npm test  (node:test through tsx)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kathismaOfPsalm, matchScore, psalmNumber, searchNormalize, splitTrailingNumber } from '../src/utils/searchMatch';

const score = (text: string, query: string) => matchScore(searchNormalize(text), searchNormalize(query));

test('the start of a title ranks before a word inside it, and that before a part of a word', () => {
  assert.equal(score('ღირს არს', 'ღირს'), 0);
  assert.equal(score('ჭეშმარიტად ღირს არს', 'ღირს'), 1);
  assert.equal(score('დიდებაი მამასა', 'ებაი'), 2);
  assert.equal(score('ლოცვა დილის 6 საათზე', 'დილის 6'), 1);
  assert.equal(score('ლოცვა დილის 6 საათზე', 'საათზე დილის'), 3);
  assert.equal(score('ღირს არს', 'ქერუბიმთა'), null);
});

test("today's spelling finds the books' old letters", () => {
  assert.notEqual(score('ჴმაჲ ბ', 'ხმა ბ'), null);
  assert.notEqual(score('სიტყჳსა', 'სიტყვისა'), null);
  assert.notEqual(score('ჩუენ', 'ჩვენ'), null);
  assert.notEqual(score('წმიდაო ღმერთო', 'წმინდაო'), null);
  assert.notEqual(score('„მსწრაფლშემსმენელი“', 'მსწრაფლ'), null);
});

test('psalm numbers', () => {
  assert.equal(psalmNumber('50'), 50);
  assert.equal(psalmNumber('ფს 50'), 50);
  assert.equal(psalmNumber('ფს. 90'), 90);
  assert.equal(psalmNumber('ფსალმუნი 118'), 118);
  assert.equal(psalmNumber('151'), null);
  assert.equal(psalmNumber('0'), null);
  assert.equal(psalmNumber('მათე 5'), null);
});

test('a book and a chapter', () => {
  assert.deepEqual(splitTrailingNumber('მათე 5'), { words: 'მათე', n: 5 });
  assert.deepEqual(splitTrailingNumber('რომაელთა მიმართ 12'), { words: 'რომაელთა მიმართ', n: 12 });
  assert.equal(splitTrailingNumber('50'), null);
  assert.equal(splitTrailingNumber('მათე'), null);
});

test('the kathisma a psalm is read in', () => {
  const ranges = ['1–8', '9–16', '17–23', '24–31', '32–36', '37–45', '46–54', '55–63', '64–69', '70–76', '77–84', '85–90', '91–100', '101–104', '105–108', '109–117', '118', '119–133', '134–142', '143–150'];
  assert.equal(kathismaOfPsalm(1, ranges), 1);
  assert.equal(kathismaOfPsalm(50, ranges), 7);
  assert.equal(kathismaOfPsalm(118, ranges), 17);
  assert.equal(kathismaOfPsalm(150, ranges), 20);
});
