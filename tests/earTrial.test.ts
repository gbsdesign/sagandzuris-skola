import { test } from 'node:test';
import assert from 'node:assert/strict';
import { octaveNote, percent, sideLine, soundingOf, trialResult, trialTotal, trialVerdict } from '../src/utils/earTrial';

// four seconds, a look every 40 ms: half a second of room, three seconds of voice, half a second of room
const take = (midi: (i: number) => number | null) =>
  Array.from({ length: 100 }, (_, i) => {
    const voice = i >= 12 && i < 88;
    return { t: i * 40, rms: voice ? 0.08 : 0.002, midi: voice ? midi(i) : null };
  });

test('the looks with a voice are told from the room', () => {
  const s = soundingOf(take(() => 57).map(f => f.rms));
  assert.equal(s.filter(Boolean).length, 76);
  assert.equal(s[0], false);
  // a silent take has no voice in it, however the room hums
  assert.equal(soundingOf(Array(100).fill(0.003)).some(Boolean), false);
  assert.deepEqual(soundingOf([]), []);
});

test('both ears on one note: the new one whole, the first one with gaps and slips', () => {
  const frames = take(() => 45.1);
  const was = frames.map((f, i) => (f.midi === null ? null : i % 5 === 0 ? null : i % 11 === 0 ? 57.1 : 45.1));
  const r = trialResult(frames, was);
  assert.equal(r.quiet, false);
  assert.equal(Math.round(r.note!), 45);
  assert.deepEqual(r.now, { heard: 1, breaks: 0, slips: 0 });
  assert.ok(r.was.heard < 0.8 && r.was.breaks >= 10 && r.was.slips >= 3, JSON.stringify(r.was));
  assert.equal(percent(r.now.heard), '100%');
  assert.equal(sideLine(r.now), 'არ შეშლია');
  assert.match(sideLine(r.was), /^შეეშალა \d+-ჯერ · გაუწყდა \d+-ჯერ$/);
});

test('a take with almost no voice is not judged', () => {
  const frames = Array.from({ length: 100 }, (_, i) => ({ t: i * 40, rms: i > 40 && i < 50 ? 0.05 : 0.001, midi: null }));
  assert.equal(trialResult(frames, frames.map(() => null)).quiet, true);
  assert.equal(trialTotal([trialResult(frames, frames.map(() => null))]), null);
});

test('all the takes together, and the last word', () => {
  const good = trialResult(take(() => 60), take(() => 60).map(f => f.midi));
  const frames = take(() => 48);
  const poor = trialResult(frames, frames.map((f, i) => (i % 2 ? f.midi : null)));
  const total = trialTotal([good, poor])!;
  assert.equal(total.now.heard, 1);
  assert.ok(total.was.heard > 0.7 && total.was.heard < 0.8);
  assert.deepEqual(trialVerdict(total), { good: true, text: 'ახალ ყურს შენი ხმა კარგად ესმის — ძველზე უკეთ.' });
  assert.equal(trialVerdict({ now: total.now, was: total.now }).text, 'ახალ ყურს შენი ხმა კარგად ესმის.');
  assert.equal(trialVerdict({ now: total.was, was: { heard: 0.5, breaks: 9, slips: 2 } }).good, false);
  assert.match(trialVerdict({ now: total.was, was: total.was }).text, /მოგვწერე/);
});

test('a note is named with its octave', () => {
  assert.equal(octaveNote(57), 'მცირე ოქტავის ლა');
  assert.equal(octaveNote(60.3), 'პირველი ოქტავის დო');
  assert.equal(octaveNote(40), 'დიდი ოქტავის მი');
  assert.equal(octaveNote(72), 'მეორე ოქტავის დო');
});
