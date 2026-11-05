import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lettersFit, shortLabel, shortWord } from '../src/utils/shortLabel';

test('a word that fits stays whole', () => {
  assert.equal(shortWord('კანონი', lettersFit(6)), 'კანონი');
  assert.equal(shortLabel('იესოს ლოცვა', lettersFit(6)), 'იესოს ლოცვა');
});

test('known words take their usual short form', () => {
  assert.equal(shortLabel('დილის ლოცვები', lettersFit(6)), 'დილის ლოც.');
  assert.equal(shortWord('საღამოს', lettersFit(6)), 'საღ.');
  // never „დღეს.“ — it would read as „today“
  assert.equal(shortWord('დღესასწაულები', lettersFit(9)), 'დღესასწ.');
  assert.equal(shortWord('დღესასწაულები', lettersFit(6)), 'დღესას.');
});

test('other words are cut after a consonant, only as much as needed', () => {
  assert.equal(shortWord('სახარება', lettersFit(6)), 'სახარ.');
  assert.equal(shortWord('სახარება', lettersFit(8)), 'სახარება');
  assert.equal(shortWord('ზიარება', lettersFit(6)), 'ზიარ.');
  assert.equal(shortWord('მოსახსენებელი', lettersFit(9)), 'მოსახსენ.');
});

test('numbers and signs stay whole', () => {
  assert.equal(shortLabel('09:00 ლოცვა', lettersFit(4)), '09:00 ლოც.');
  assert.equal(shortWord('№12', lettersFit(2)), '№12');
});
