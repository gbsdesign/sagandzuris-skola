import test from 'node:test';
import assert from 'node:assert/strict';
import { editDistance, matchCommand, normalSpeech } from '../src/utils/voiceCommands';

test('the five commands as they are said', () => {
  assert.equal(matchCommand('კიდევ ერთხელ'), 'again');
  assert.equal(matchCommand('ნელა'), 'slow');
  assert.equal(matchCommand('შემდეგი'), 'next');
  assert.equal(matchCommand('მომასმენინე'), 'listen');
  assert.equal(matchCommand('შეჩერდი'), 'stop');
});

test('other forms and the recogniser\'s punctuation', () => {
  assert.equal(matchCommand('კიდევ ერთხელ.'), 'again');
  assert.equal(matchCommand('თავიდან'), 'again');
  assert.equal(matchCommand('უფრო ნელა!'), 'slow');
  assert.equal(matchCommand('ნელ-ნელა'), 'slow');
  assert.equal(matchCommand('შემდეგი ფრაზა'), 'next');
  assert.equal(matchCommand('გავაგრძელოთ'), 'next');
  assert.equal(matchCommand('გაჩერდი'), 'stop');
  assert.equal(matchCommand('სტოპ'), 'stop');
  assert.equal(matchCommand('წინ'), 'next');
});

test('a small slip in a long word still counts, not in a short one', () => {
  assert.equal(matchCommand('კიდევ ერტხელ'), 'again');
  assert.equal(matchCommand('მომასმენინეთ'), 'listen');
  assert.equal(matchCommand('შეჩერდით'), 'stop');
  assert.equal(matchCommand('შემდეგო'), 'next');
  assert.equal(matchCommand('წინა'), null);
  assert.equal(matchCommand('ნელო'), null);
});

test('the longest form wins; talk and other words are not commands', () => {
  assert.equal(matchCommand('კიდევ ერთხელ ნელა'), 'again');
  assert.equal(matchCommand('გამარჯობა'), null);
  assert.equal(matchCommand(''), null);
  assert.equal(matchCommand('დღეს ძალიან კარგი ამინდია და მინდა კიდევ ერთხელ ვიმღერო ეს ფრაზა'), null);
});

test('helpers', () => {
  assert.equal(normalSpeech('  კიდევ,  ერთხელ! '), 'კიდევ ერთხელ');
  assert.equal(editDistance('ნელა', 'ნელა'), 0);
  assert.equal(editDistance('ერთხელ', 'ერტხელ'), 1);
});
