import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ManeraStep } from '../src/data/maneraLessons';
import { ALL_DRILLS } from '../src/data/vocalDrills';
import { foldedDiff, onsetsOf, parseScore, runPercent, scoreKindOf, scorePitchRound, scoreRhythmRound, scoredStep, targetAt } from '../src/utils/drillScore';

const look = (secs: number, at: (t: number) => number | null) =>
  Array.from({ length: Math.round(secs / 0.04) }, (_, i) => ({ t: i * 0.04, midi: at(i * 0.04) }));

test('every drill has a kind and the pitch and rhythm ones have scored rounds', () => {
  for (const d of ALL_DRILLS) {
    const kind = scoreKindOf(d);
    if (kind === 'ai') continue;
    assert.ok(d.exercise.steps.some(s => scoredStep(s, kind, 0)), d.id);
  }
  assert.equal(scoreKindOf(ALL_DRILLS.find(d => d.id === 'tip-1')!), 'ai');
  assert.equal(scoreKindOf(ALL_DRILLS.find(d => d.id === 'rhythm-five')!), 'rhythm');
});

test('octaves fold away', () => {
  assert.equal(foldedDiff(72, 60), 0);
  assert.equal(foldedDiff(61, 60), 1);
  assert.ok(Math.abs(foldedDiff(59.6, 60) + 0.4) < 1e-9);
});

test('a held note sung right scores full, a semitone off scores nothing, silence nothing', () => {
  const s: ManeraStep = { text: '', secs: 8, tones: [4] };
  assert.equal(scorePitchRound(look(8, () => 52), s, 0, 48), 1);
  assert.equal(scorePitchRound(look(8, () => 64), s, 0, 48), 1); // an octave up
  assert.equal(scorePitchRound(look(8, () => 53), s, 0, 48), 0);
  assert.equal(scorePitchRound(look(8, () => null), s, 0, 48), 0);
  // a quarter-tone flat: half
  assert.equal(scorePitchRound(look(8, () => 51.5), s, 0, 48), 0.5);
});

test('a scale follows its notes, a little late is still right', () => {
  const s: ManeraStep = { text: '', secs: 8, tones: [0, 2, 4, 5] };
  const late = look(8, t => 48 + s.tones![Math.min(3, Math.floor(Math.max(0, t - 0.2) / 2))]);
  assert.equal(scorePitchRound(late, s, 0, 48), 1);
  const stuck = look(8, () => 48);
  assert.ok(scorePitchRound(stuck, s, 0, 48) < 0.4);
});

test('singing only a quarter of the round scores under half', () => {
  const s: ManeraStep = { text: '', secs: 8, tones: [4] };
  const v = scorePitchRound(look(8, t => (t < 2 ? 52 : null)), s, 0, 48);
  assert.ok(v > 0.35 && v < 0.5, String(v));
});

test('my voice in three-voice steps, the sung interval over a drone', () => {
  const s: ManeraStep = { text: '', secs: 6, parts: [[12], [7], [0]] };
  assert.equal(targetAt(s, 1, 1), 7);
  const drone: ManeraStep = { text: '', secs: 8, tones: [0], sing: [7] };
  assert.equal(scorePitchRound(look(8, () => 55), drone, 0, 48), 1);
  assert.equal(scorePitchRound(look(8, () => 48), drone, 0, 48), 0);
});

test('claps are found as sudden loud starts', () => {
  const frames = Array.from({ length: 200 }, (_, i) => ({ t: i * 0.02, rms: i % 25 === 0 ? 0.3 : i % 25 === 1 ? 0.2 : 0.005 }));
  assert.deepEqual(onsetsOf(frames).map(t => Math.round(t * 100) / 100), [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]);
});

test('rhythm: on the beat scores full, off the beat and silence score nothing', () => {
  const s: ManeraStep = { text: '', secs: 10, bpm: 60, bar: 2 };
  const beats = Array.from({ length: 10 }, (_, i) => i);
  assert.equal(scoreRhythmRound(beats, s), 1);
  assert.equal(scoreRhythmRound(beats.map(t => t + 0.5), s), 0);
  assert.equal(scoreRhythmRound([], s), 0);
  // a little early everywhere is still close
  assert.ok(scoreRhythmRound(beats.map(t => t - 0.05), s) > 0.8);
});

test('rhythm: the „and“s, the accented beats with the weak ones heard too', () => {
  const off: ManeraStep = { text: '', secs: 10, bpm: 60, bar: 2, claps: 'off' };
  assert.equal(scoreRhythmRound(Array.from({ length: 10 }, (_, i) => i + 0.5), off), 1);
  assert.equal(scoreRhythmRound(Array.from({ length: 10 }, (_, i) => i), off), 0);
  const five: ManeraStep = { text: '', secs: 15, bpm: 60, bar: 5, accents: [0, 3], claps: 'accents' };
  const strong = Array.from({ length: 15 }, (_, i) => i).filter(i => [0, 3].includes(i % 5));
  assert.equal(scoreRhythmRound(strong, five), 1);
  assert.equal(scoreRhythmRound(Array.from({ length: 15 }, (_, i) => i), five), 1);
});

test('the run percent counts skipped rounds as zero', () => {
  assert.equal(runPercent([1, 1, 0.5], 4), 63);
  assert.equal(runPercent([], 0), 0);
  assert.equal(runPercent([1, 1], 2), 100);
});

test('the AI teacher\'s answer is read even when wrapped in words', () => {
  assert.deepEqual(parseScore('{"score": 72.4, "text": "კარგია"}'), { score: 72, text: 'კარგია' });
  assert.deepEqual(parseScore('აი: {"score": 140, "text": "**ძალიან** კარგი"}'), { score: 100, text: 'ძალიან კარგი' });
  assert.equal(parseScore('ვერ მოვისმინე'), null);
});
