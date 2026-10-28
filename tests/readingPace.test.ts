import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PACE, lineSyllables, paceOf, paceZone, readableText, speechSpan, syllableCount, voicedSeconds } from '../src/utils/readingPace';

test('syllables: vowels, the old letters, and the old [v] spelled „უ“', () => {
  assert.equal(syllableCount('ნეტარ არს კაცი'), 5);
  assert.equal(syllableCount('უფალო'), 3);
  assert.equal(syllableCount('მოუწოდე'), 4);
  // ჩუენ = chven, თქუენ = tkven, სიტყუაჲ = sitqva(i): the „უ“ is a [v]; ჲ is no syllable
  assert.equal(syllableCount('ჩუენი'), 2);
  assert.equal(syllableCount('თქუენ'), 1);
  assert.equal(syllableCount('სიტყუაჲ'), 2);
  // before ი, ო, უ the „უ“ is a real [u] (old spelling writes [vi] as ჳ)
  assert.equal(syllableCount('ალილუია'), 5);
  assert.equal(syllableCount('ნუუკუე'), 3);
  assert.equal(syllableCount('ტყუილი'), 3);
  // ჳ = vi, ჱ = e, ჵ = o
  assert.equal(syllableCount('თჳსი'), 2);
  assert.equal(syllableCount('ქრისტჱს'), 2);
  assert.equal(syllableCount('ჵ'), 1);
  // numbers, Latin and punctuation are not read as syllables here
  assert.equal(syllableCount('1. 2: 16-20, abc'), 0);
});

test('a lesson line marked (3-ჯერ) / (3-გზის) is said three times, the mark not read', () => {
  assert.equal(lineSyllables('უფალო შეგვიწყალენ (3-ჯერ).'), 21);
  assert.equal(lineSyllables('უფალო, შეგვიწყალენ (3-გზის).'), 21);
  assert.equal(lineSyllables('უფალო, შეგვიწყალენ.'), 7);
});

test('readable text: no verse numbers, headings or marked lines', () => {
  const html = '<h3>ფსალმუნი 1</h3><p><sup class="x">1</sup>ნეტარ არს კაცი</p><p data-skip class="y">თავი 2</p><p>…</p>';
  assert.equal(syllableCount(readableText(html)), 5);
});

// a take: `parts` = [seconds, amplitude of a 180 Hz tone (0 = the room's hiss)]
const take = (rate: number, parts: [number, number][]) => {
  const total = parts.reduce((s, [d]) => s + d, 0);
  const out = new Float32Array(Math.round(total * rate));
  let i = 0;
  let seed = 1;
  const hiss = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 2e-4;
  for (const [d, amp] of parts) {
    const n = Math.round(d * rate);
    for (let k = 0; k < n; k++, i++) out[i] = amp * Math.sin((2 * Math.PI * 180 * i) / rate) + hiss();
  }
  return out;
};

test('speech span: the silence before the first word and after the last is left out, pauses inside kept', () => {
  const rate = 16000;
  const span = speechSpan(take(rate, [[1, 0], [2, 0.3], [0.5, 0], [1.5, 0.2], [1.2, 0]]), rate);
  assert.ok(span);
  assert.ok(Math.abs(span!.start - 0.9) < 0.06, `start ${span!.start}`);
  assert.ok(Math.abs(span!.end - 5.1) < 0.06, `end ${span!.end}`);
  assert.ok(Math.abs(voicedSeconds({ seconds: 6.2, speech: span }) - 4.2) < 0.1);
});

test('speech span: a short reading in a long take is still found', () => {
  const rate = 16000;
  const span = speechSpan(take(rate, [[1, 0], [8, 0.3], [100, 0]]), rate);
  assert.ok(span);
  assert.ok(Math.abs(span!.start - 0.9) < 0.06, `start ${span!.start}`);
  assert.ok(Math.abs(span!.end - 9.1) < 0.06, `end ${span!.end}`);
});

test('speech span: a click is not a word, and a take of room hiss has none', () => {
  const rate = 16000;
  const span = speechSpan(take(rate, [[0.5, 0], [0.02, 0.5], [1, 0], [2, 0.3], [1, 0]]), rate);
  assert.ok(span);
  assert.ok(Math.abs(span!.start - 1.42) < 0.06, `start ${span!.start}`);
  assert.equal(speechSpan(take(rate, [[3, 0]]), rate), null);
  assert.equal(speechSpan(new Float32Array(rate * 2), rate), null);
  // no voice heard: no pace, rather than a confident one over the whole take
  assert.equal(voicedSeconds({ seconds: 50, speech: null }), 0);
  assert.equal(paceOf(218, voicedSeconds({ seconds: 50, speech: null })), null);
  assert.equal(voicedSeconds({ seconds: 3 }), 3);
});

test('pace: zones, a text not read to the end, a take too short to tell', () => {
  assert.equal(paceOf(10, 5), null);
  assert.equal(paceOf(100, 3), null);
  const even = paceOf(200, 200 / ((PACE.slow + PACE.fast) / 2))!;
  assert.equal(even.zone, 'even');
  assert.equal(even.partial, false);
  assert.equal(paceOf(200, 200 / (PACE.slow - 0.5))!.zone, 'slow');
  assert.equal(paceOf(200, 200 / (PACE.fast + 0.5))!.zone, 'fast');
  assert.equal(paceOf(400, 400 / (PACE.unreal + 1))!.partial, true);
  assert.equal(paceZone(PACE.slow), 'even');
  assert.equal(paceZone(PACE.fast), 'even');
  // rounded once: the number shown, its zone and the teacher's score agree at the edges
  assert.deepEqual(paceOf(297, 100), { rate: 3, zone: 'even', partial: false });
  assert.equal(paceOf(504, 100)!.rate, 5);
  assert.equal(paceOf(504, 100)!.zone, 'even');
});
