import test from 'node:test';
import assert from 'node:assert/strict';
import { hummedNotes, matchHum, similarity, stepsOf } from '../src/utils/humMatch';

const INDEX = [
  { id: 'a', m: [58, 60, 62, 63, 62, 60, 58, 55, 57, 58, 60, 62, 60, 58, 62, 60] },
  { id: 'b', m: [62, 62, 67, 65, 64, 62, 60, 62, 64, 67, 65, 64, 62, 60, 59, 60] },
  { id: 'c', m: [55, 59, 55, 60, 57, 62, 58, 64, 60, 65, 62, 67, 63, 69, 65, 71] },
];
const shift = (m: number[], by: number) => m.map(x => x + by);

test('steps fold into −6…+6', () => {
  assert.deepEqual(stepsOf([60, 62, 59, 71, 60]), [2, -3, 0, 1]);
});

test('the same tune in another key and octave is found first', () => {
  for (const by of [-12, -5, 7, 12]) {
    const hits = matchHum(shift(INDEX[0].m.slice(0, 10), by), INDEX);
    assert.equal(hits[0].entry.id, 'a');
    assert.equal(hits[0].label, 'ძალიან');
  }
});

test('one wrong note still finds it', () => {
  const sung = INDEX[1].m.slice(0, 10).slice();
  sung[4] += 2;
  const hits = matchHum(sung, INDEX);
  assert.equal(hits[0].entry.id, 'b');
  assert.ok(hits[0].score >= 0.5);
});

test('extra notes between the right ones do not hide it', () => {
  const m = INDEX[2].m;
  const sung = [m[0], m[1], 56, m[2], m[3], m[4], m[5], m[6], m[7]];
  assert.equal(matchHum(sung, INDEX)[0].entry.id, 'c');
});

test('a tune taken up from the second note is found', () => {
  assert.equal(matchHum(INDEX[0].m.slice(1, 11), INDEX)[0].entry.id, 'a');
});

test('too few notes or an unlike tune: nothing', () => {
  assert.equal(similarity([60, 62, 64], INDEX[0].m), 0);
  assert.deepEqual(matchHum([60, 66, 60, 66, 60, 66, 60, 66, 60], INDEX.slice(0, 2)), []);
});

test('at most three, best first', () => {
  const hits = matchHum(INDEX[0].m.slice(0, 8), [...INDEX, ...INDEX, ...INDEX], 3);
  assert.ok(hits.length <= 3);
  assert.ok(hits.every((h, i) => i === 0 || hits[i - 1].score >= h.score));
});

test('frames become notes, a held pitch once', () => {
  const frames: { t: number; midi: number | null }[] = [];
  [[60, 0], [60, 400], [62, 800], [null, 1200], [64, 1300]].forEach(([m, t]) => {
    for (let k = 0; k < 10; k++) frames.push({ t: (t as number) + k * 35, midi: m as number | null });
  });
  assert.deepEqual(hummedNotes(frames), [60, 62, 64]);
});

test('against the real index: made-up tunes rarely look alike, a chant sung a semitone off is found', async () => {
  const { HUM_INDEX } = await import('../src/data/humIndex');
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tune = () => {
    const a = [60];
    for (let i = 0; i < 12; i++) a.push(a[a.length - 1] + (rnd() < 0.5 ? 1 : -1) * (1 + Math.floor(rnd() * 5)));
    return a;
  };
  const strong = Array.from({ length: 30 }, tune).filter(t => matchHum(t, HUM_INDEX, 1)[0]?.label === 'ძალიან').length;
  assert.ok(strong <= 1, `${strong} made-up tunes looked very alike`);
  let found = 0;
  for (let k = 0; k < 30; k++) {
    const e = HUM_INDEX[Math.floor(rnd() * HUM_INDEX.length)];
    const sung = e.m.slice(0, 11).map(x => x + 5);
    sung[4] += 1;
    const same = stepsOf(e.m.slice(0, 11)).join();
    const hits = matchHum(sung, HUM_INDEX, 3);
    // a chant whose opening another shares counts as found when one of them is shown
    if (hits.some(h => h.entry === e || stepsOf(h.entry.m.slice(0, 11)).join() === same)) found++;
  }
  assert.ok(found >= 22, `found ${found} of 30`);
});
