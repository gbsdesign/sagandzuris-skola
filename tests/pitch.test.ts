import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPitch, freqToMidi, notesFromFrames, scoreSinging } from '../src/utils/pitch';

const RATE = 44100;
const tone = (hz: number, n = 2048, amp = 0.4, harmonics = false) => {
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    b[i] = amp * Math.sin(2 * Math.PI * hz * t) + (harmonics ? 0.2 * Math.sin(4 * Math.PI * hz * t) + 0.1 * Math.sin(6 * Math.PI * hz * t) : 0);
  }
  return b;
};

test('a pure tone is found to within a few cents', () => {
  for (const hz of [110, 196, 220, 330, 440, 587.33]) {
    const f = detectPitch(tone(hz), RATE);
    assert.ok(f !== null, `no pitch for ${hz}`);
    assert.ok(Math.abs(freqToMidi(f!) - freqToMidi(hz)) < 0.1, `${hz} → ${f}`);
  }
});

test('a voice-like tone with overtones keeps its fundamental', () => {
  const f = detectPitch(tone(196, 2048, 0.4, true), RATE);
  assert.ok(f !== null && Math.abs(freqToMidi(f) - freqToMidi(196)) < 0.15);
});

test('silence and noise give no pitch', () => {
  assert.equal(detectPitch(new Float32Array(2048), RATE), null);
  let seed = 7;
  const noise = new Float32Array(2048).map(() => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647 - 0.5) * 0.6; });
  assert.equal(detectPitch(noise, RATE), null);
});

test('readings become notes; short slides are dropped', () => {
  const frames = [
    ...Array.from({ length: 10 }, (_, i) => ({ t: i * 30, midi: 60.1 })),
    { t: 300, midi: 61.5 }, // a slide
    ...Array.from({ length: 10 }, (_, i) => ({ t: 330 + i * 30, midi: 62 })),
    { t: 640, midi: null },
    ...Array.from({ length: 8 }, (_, i) => ({ t: 670 + i * 30, midi: 62.2 })),
  ];
  const notes = notesFromFrames(frames);
  assert.equal(notes.length, 3);
  assert.ok(Math.abs(notes[0].midi - 60.1) < 0.01);
  assert.ok(Math.abs(notes[1].midi - 62) < 0.01);
});

test('a phrase sung in another key still counts; a wrong note does not', () => {
  const target = [62, 64, 65, 67, 65, 64, 62];
  const sung = target.map((m, i) => ({ midi: m - 5 + (i === 3 ? 2 : 0), start: i * 400, end: i * 400 + 300 }));
  const r = scoreSinging(target, sung);
  assert.equal(Math.round(r.offset), -5);
  assert.deepEqual(r.hits, [true, true, true, false, true, true, true]);
  assert.ok(Math.abs(r.share - 6 / 7) < 1e-9);
});

test('an extra note in the middle does not throw the rest off', () => {
  const target = [60, 62, 64, 65];
  const sung = [60, 62, 70, 64, 65].map((m, i) => ({ midi: m, start: i * 300, end: i * 300 + 200 }));
  assert.equal(scoreSinging(target, sung).share, 1);
});

test('a semitone off is a wrong note', () => {
  const target = [60, 62, 64];
  const sung = [60, 63, 64].map((m, i) => ({ midi: m, start: i * 300, end: i * 300 + 200 }));
  assert.deepEqual(scoreSinging(target, sung).hits, [true, false, true]);
});

test('a slightly flat singer is still in tune with themself', () => {
  const target = [60, 62, 64, 65];
  const sung = target.map((m, i) => ({ midi: m - 0.35, start: i * 300, end: i * 300 + 200 }));
  assert.equal(scoreSinging(target, sung).share, 1);
});

test('many syllables on one pitch count as one melody note', () => {
  const target = [60, 62, 64];
  const sung = [60, 60, 60, 60, 60, 62, 62, 62, 64].map((m, i) => ({ midi: m + 0.1, start: i * 300, end: i * 300 + 200 }));
  assert.equal(scoreSinging(target, sung).share, 1);
});

test('a wrong note early on does not pull the later ones out of line', () => {
  // the third note a semitone low: the next 61 must not be taken for it
  const target = [61, 62, 64, 62, 64, 66, 64, 62, 61, 64, 62];
  const sung = [61, 62, 63, 62, 64, 66, 64.75, 62, 61, 62].map((m, i) => ({ midi: m - 3, start: i * 400, end: i * 400 + 300 }));
  const r = scoreSinging(target, sung);
  assert.equal(Math.round(r.offset), -3);
  assert.deepEqual(r.hits.map(Number), [1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1]);
  assert.equal(r.matched[3]?.start, 1200);
});

test('nothing sung scores nothing', () => {
  assert.equal(scoreSinging([60, 62], []).share, 0);
});
