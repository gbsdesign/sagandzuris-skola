import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cardText, dateText, learnedMap, learnedVoices, momentLine, pickFresh, shortName, voiceWord, DEFAULT_CHOICES,
} from '../src/utils/learnedCard';

const voiced = (id: string) => !id.startsWith('p');

test('learned = every marked voice confirmed', () => {
  assert.deepEqual(learnedVoices({ voices: ['1', '2'] }, ['1', '2'], true), ['1', '2']);
  assert.equal(learnedVoices({ voices: ['1', '2'] }, ['1'], true), null);
  assert.equal(learnedVoices({ voices: ['1'] }, [], true), null);
  assert.deepEqual(learnedVoices({ voices: ['2'] }, ['1', '2'], true), ['1', '2']);
  assert.deepEqual(learnedVoices({ voices: '1,2,3' }, ['3', '1', '2'], true), ['1', '2', '3']);
  assert.deepEqual(learnedVoices({ isLearned: true, voices: ['1'] }, ['1'], false), ['1']);
  assert.equal(learnedVoices({ isLearned: false }, undefined, false), null);
});

test('learnedMap over a path', () => {
  const m = learnedMap(
    { a: { voices: ['1', '2'] }, b: { voices: ['1'] }, p1: { isLearned: true } },
    { a: ['1', '2'], b: [], p1: ['1'] },
    voiced,
  );
  assert.deepEqual(Object.keys(m).sort(), ['a', 'p1']);
});

test('the first run marks everything seen, later only new ones are fresh', () => {
  assert.deepEqual(pickFresh(['a', 'b'], null), { fresh: [], seen: ['a', 'b'] });
  assert.deepEqual(pickFresh(['a', 'b', 'c'], ['a', 'b']), { fresh: ['c'], seen: ['a', 'b', 'c'] });
  assert.deepEqual(pickFresh(['a'], ['a']), { fresh: [], seen: ['a'] });
});

test('words', () => {
  assert.equal(voiceWord(['2'], true), 'II ხმა');
  assert.equal(voiceWord(['3', '1', '2'], true), 'I · II · III ხმა');
  assert.equal(voiceWord(['1'], false), '');
  assert.equal(momentLine(['1', '2', '3'], true), 'სამივე ხმა ჩათვლილია. მარგალიტი შენს საგანძურშია.');
  assert.equal(momentLine(['2'], true), 'II ხმა ჩათვლილია. მარგალიტი შენს საგანძურშია.');
  assert.equal(shortName('ნინო ბერიძე'), 'ნინო ბ.');
  assert.equal(shortName('ნინო'), 'ნინო');
  assert.equal(shortName(null), '');
  assert.equal(dateText(new Date(2026, 10, 16)), '16 ნოემბერი 2026');
});

test('the card: name off by default, no score ever', () => {
  const input = { name: 'მხოლოდ-შობილი', label: 'გელათის სკოლა', voices: ['2'], voiced: true, person: 'ნინო ბერიძე', date: new Date(2026, 10, 16) };
  const t = cardText(input, DEFAULT_CHOICES);
  assert.equal(t.line, 'II ხმა · გელათის სკოლა');
  assert.equal(t.person, '');
  assert.equal(t.footer, 'საგანძურის სკოლა · 16 ნოემბერი 2026');
  const u = cardText(input, { name: true, voice: false, school: false });
  assert.equal(u.person, 'ნინო ბ.');
  assert.equal(u.line, 'გელათის სკოლა');
  assert.equal(u.footer, '16 ნოემბერი 2026');
  assert.ok(!/%|ქულა/.test(JSON.stringify(t)));
});
