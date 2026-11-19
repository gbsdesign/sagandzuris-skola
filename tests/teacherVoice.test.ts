import test from 'node:test';
import assert from 'node:assert/strict';
import { READY_SENTENCES, afterTake, closingLine, openingLine } from '../src/utils/aiLesson';
import {
  VOICE_DEFAULT, VOICE_SENTENCES, clipId, isVoiceSentence, pcmToFloat, rateOf, readVoiceSettings, sentenceHash, splitSentences, trimQuiet,
  VOICE_SENTENCE_LIST, PHRASE_KINDS, PHRASE_MAX, applyPhrases, cleanPhraseTexts,
} from '../src/utils/teacherVoice';

test('a shown text splits into the sentences that are recorded', () => {
  assert.deepEqual(splitSentences('თითქმის ზუსტად! მესამე ნოტი ცოტა დაბლა იყო.  მოუსმინე მხოლოდ იმ ნოტს და კიდევ სცადე.'),
    ['თითქმის ზუსტად!', 'მესამე ნოტი ცოტა დაბლა იყო.', 'მოუსმინე მხოლოდ იმ ნოტს და კიდევ სცადე.']);
  // a question mark inside quotes does not cut
  assert.deepEqual(splitSentences('დღევანდელი გავლილია. ხვალ — „მაღლა თუ დაბლა?“.'), ['დღევანდელი გავლილია.', 'ხვალ — „მაღლა თუ დაბლა?“.']);
});

test('the list to record: about two hundred, none twice, the live words left out', () => {
  assert.ok(VOICE_SENTENCES.length >= 180 && VOICE_SENTENCES.length <= 260, String(VOICE_SENTENCES.length));
  assert.equal(new Set(VOICE_SENTENCES).size, VOICE_SENTENCES.length);
  assert.ok(!VOICE_SENTENCES.includes('ოდნავ მაღლა'));
  // every ready sentence's own sentences are on it
  for (const g of READY_SENTENCES.filter(x => x.title !== 'სიმღერისას')) {
    for (const l of g.lines) for (const s of splitSentences(l)) assert.ok(isVoiceSentence(s), s);
  }
});

test('what the lesson says is on the list', () => {
  for (const o of [{ review: true, fresh: true, back: false }, { review: false, fresh: false, back: false }, { review: false, fresh: true, back: true }]) {
    for (const s of splitSentences(openingLine(o))) assert.ok(isVoiceSentence(s), s);
  }
  for (const s of splitSentences(closingLine({ learned: 3, improved: false, nextPhrase: 5 }))) assert.ok(isVoiceSentence(s), s);
  const read = { heard: true, hits: 6, n: 8, notes: [], worst: 4, jump: -1, sag: false, shortEnd: false } as unknown as Parameters<typeof afterTake>[0];
  const notes = Array.from({ length: 8 }, (_, i) => ({ hit: i !== 4, dev: i === 4 ? -0.6 : 0 }));
  const said = afterTake({ ...read, notes } as Parameters<typeof afterTake>[0], { before: [], slow: false, slowGood: 0, split: false, pass: 0.8 });
  for (const s of splitSentences(said.say)) assert.ok(isVoiceSentence(s), s);
});

test('ids are stable and the voices apart', () => {
  assert.equal(sentenceHash('ზუსტად!'), sentenceHash(' ზუსტად! '));
  assert.notEqual(sentenceHash('ზუსტად!'), sentenceHash('თითქმის ზუსტად!'));
  assert.match(clipId('female', 'ზუსტად!'), /^female_[0-9a-z]{7}$/);
  assert.notEqual(clipId('female', 'ზუსტად!'), clipId('male', 'ზუსტად!'));
});

test('settings read safely', () => {
  assert.deepEqual(readVoiceSettings(null), VOICE_DEFAULT);
  assert.deepEqual(readVoiceSettings('{"on":false,"voice":"male","speed":"fast"}'), { on: false, voice: 'male', speed: 'fast' });
  assert.deepEqual(readVoiceSettings('x'), VOICE_DEFAULT);
});

test('the Live API\'s PCM: 16-bit little-endian, trimmed of its quiet', () => {
  const bytes = new Uint8Array([0, 0, 0, 64, 0, 192, 0, 0]);
  assert.deepEqual(Array.from(pcmToFloat([bytes])), [0, 0.5, -0.5, 0]);
  const x = new Float32Array(10000); x.fill(0.5, 4000, 6000);
  const t = trimQuiet(x, 1000);
  assert.ok(t.length > 2000 && t.length < 2400, String(t.length));
  assert.equal(rateOf('audio/pcm;rate=24000'), 24000);
  assert.equal(rateOf(undefined), 24000);
});

test('the school changes a ready sentence: only that sentence is shown in its words (board x-ai-prazebi)', () => {
  // every sentence once, each with a kind the list shows as a chip
  assert.deepEqual(VOICE_SENTENCE_LIST.map(x => x.text), VOICE_SENTENCES);
  const kinds = new Set(PHRASE_KINDS.map(k => k.id));
  assert.ok(VOICE_SENTENCE_LIST.every(x => kinds.has(x.kind) && x.group));
  assert.ok(PHRASE_KINDS.every(k => VOICE_SENTENCE_LIST.some(x => x.kind === k.id)));
  assert.equal(VOICE_SENTENCE_LIST.find(x => x.text === 'მესამე ნოტი ცოტა დაბლა იყო.')?.kind, 'fix');
  assert.equal(VOICE_SENTENCE_LIST.find(x => x.text === 'მეექვსე ნოტი ცოტა დაბლა იყო.')?.kind, 'fix');
  const low = 'მესამე ნოტი ცოტა დაბლა იყო.';
  const texts = { [sentenceHash(low)]: 'მესამე ნოტი ოდნავ მაღლა აიღე.' };
  assert.equal(applyPhrases('თითქმის ზუსტად! მესამე ნოტი ცოტა დაბლა იყო.', texts), 'თითქმის ზუსტად! მესამე ნოტი ოდნავ მაღლა აიღე.');
  // nothing changed: the text as it was, spaces and all
  assert.equal(applyPhrases('ზუსტად!  კიდევ სცადე.', texts), 'ზუსტად!  კიდევ სცადე.');
  assert.equal(applyPhrases('ზუსტად!', {}), 'ზუსტად!');
  // the stored map is kept clean
  assert.deepEqual(cleanPhraseTexts({ [sentenceHash(low)]: '  ახალი   სიტყვა. ', 'bad key!': 'x', abc: '', n: 5, long: 'ა'.repeat(PHRASE_MAX + 1) }),
    { [sentenceHash(low)]: 'ახალი სიტყვა.' });
  assert.deepEqual(cleanPhraseTexts(null), {});
});
