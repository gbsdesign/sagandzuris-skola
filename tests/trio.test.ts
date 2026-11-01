import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TRIO_RULES, drawTrio, fitDelay, foldNear, hitsOf, notesIn, openingEnd, partShares, pcOff, placeOf, scoreTrio, trioPoints,
  type TrioFrame, type TrioNote, type TrioQ,
} from '../src/utils/trio';
import type { KnownChant } from '../src/utils/chantRounds';
import { mulberry32 } from '../src/utils/otkheuli';

// „მესამე ხმა“ (utils/trio.ts): a round read back, a game's chants, and a take's score in the trio's key — octaves aside,
// late or early by the earphones, stopped half way.

const LINE: TrioNote[] = [[0, 1, 62], [1, 1, 64], [2, 0.5, 65], [2.5, 1.5, 64], [4, 2, 62]];

/** a take that sings `line` (moved by `shift` semitones), heard `delay` seconds after listening began, a frame each 40 ms */
const takeOf = (line: TrioNote[], { shift = 0, delay = 0.2, speed = 1, until = Infinity } = {}): TrioFrame[] => {
  const frames: TrioFrame[] = [];
  const end = Math.min(until, line[line.length - 1][0] + line[line.length - 1][1]);
  for (let t = 0; delay + t / speed <= delay + end / speed + 0.3; t += 0.04 * speed) {
    const n = line.find(([s, len]) => t >= s && t < s + len);
    frames.push({ t: delay + t / speed, midi: n && t < end ? n[2] + shift : null });
  }
  return frames;
};

test('a round read back: a round of a chant, nothing else', () => {
  const q: TrioQ = { kind: 'mesame', id: 'v-5-x58', title: 'კურთხეულ არს', service: 'წირვა', book: 'v9', num: 58 };
  assert.ok(TRIO_RULES.valid(q));
  assert.ok(!TRIO_RULES.valid({ ...q, kind: 'turniri' }));
  assert.ok(!TRIO_RULES.valid({ ...q, num: 0 }));
  assert.ok(!TRIO_RULES.valid({ ...q, title: '' }));
  assert.equal(TRIO_RULES.points(q, { pick: 87, ms: 1000, step: 0 }, 120000), 87);
  assert.equal(trioPoints({ pick: 140 }), 100);
  assert.ok(TRIO_RULES.ok(q, 0) && TRIO_RULES.ok(q, 100) && !TRIO_RULES.ok(q, 101) && !TRIO_RULES.ok(q, 2.5));
});

test('a game draws different chants, the unsung first', () => {
  const pool: KnownChant[] = ['ა', 'ბ', 'გ', 'დ'].map((n, i) => ({ id: `c${i}`, title: `საგალობელი ${n}`, service: 'წირვა', book: 'book', num: i + 1 }));
  const rounds = drawTrio(pool, 3, ['c0', 'c1'], mulberry32(4));
  assert.equal(rounds.length, 3);
  assert.ok(rounds.every(r => r.kind === 'mesame' && TRIO_RULES.valid(r)));
  assert.equal(new Set(rounds.map(r => r.id)).size, 3);
  assert.deepEqual(new Set(rounds.slice(0, 2).map(r => r.id)), new Set(['c2', 'c3']));
});

test('octaves aside: a pitch an octave up is the same note, a semitone is not', () => {
  assert.equal(pcOff(74, 62), 0);
  assert.equal(pcOff(63, 62), 1);
  assert.equal(pcOff(61, 74), -1);
  assert.equal(pcOff(68, 62), 6);
  assert.equal(foldNear(75.3, 62), 63.3);
  assert.equal(foldNear(50, 62), 62);
});

test('a take sung right scores 100, an octave up too; a semitone off or silence scores nothing', () => {
  const place = placeOf(0, 0.2, 1);
  assert.equal(scoreTrio(LINE, takeOf(LINE), place).pct, 100);
  assert.equal(scoreTrio(LINE, takeOf(LINE, { shift: 12 }), place).pct, 100);
  assert.equal(scoreTrio(LINE, takeOf(LINE, { shift: -24 }), place).pct, 100);
  assert.equal(scoreTrio(LINE, takeOf(LINE, { shift: 1 }), place).pct, 0);
  assert.equal(scoreTrio(LINE, takeOf(LINE).map(f => ({ ...f, midi: null })), place).pct, 0);
  assert.deepEqual(hitsOf(scoreTrio(LINE, takeOf(LINE), place)), [true, true, true, true, true]);
});

test('one wrong note costs its length; slower play is placed by the speed', () => {
  const wrong = takeOf(LINE).map(f => (f.t >= 4.25 ? { ...f, midi: f.midi == null ? null : 66 } : f));
  const s = scoreTrio(LINE, wrong, placeOf(0, 0.2, 1));
  assert.deepEqual(hitsOf(s), [true, true, true, true, false]);
  assert.equal(s.pct, 67); // the last note is 2 of 6 seconds
  assert.equal(scoreTrio(LINE, takeOf(LINE, { speed: 0.8 }), placeOf(0, 0.2, 0.8)).pct, 100);
});

test('the delay is found by the take: earphones a third of a second late', () => {
  const frames = takeOf(LINE, { delay: 0.55 });
  assert.ok(scoreTrio(LINE, frames, placeOf(0, 0.2, 1)).pct < 100);
  const d = fitDelay(LINE, frames, 0, 1, 0.2);
  assert.ok(Math.abs(d - 0.55) <= 0.03, `delay ${d}`);
  assert.equal(scoreTrio(LINE, frames, placeOf(0, d, 1)).pct, 100);
});

test('stopped half way: only the notes begun count', () => {
  const frames = takeOf(LINE, { until: 2.5 });
  const s = scoreTrio(LINE, frames, placeOf(0, 0.2, 1), 2.5);
  assert.equal(s.counted, 3);
  assert.equal(s.pct, 100);
  const parts = [{ s0: 0, s1: 2.5 }, { s0: 2.5, s1: 6 }];
  assert.deepEqual(partShares(LINE, s.credits, parts, 2.5), [100, null]);
});

test('the section: the opening is the first lines to about 12 s, the notes of a line are cut at its end', () => {
  assert.equal(openingEnd([{ s0: 0, s1: 5 }, { s0: 5, s1: 9 }, { s0: 9, s1: 14 }, { s0: 14, s1: 20 }]), 14);
  assert.equal(openingEnd([{ s0: 0, s1: 15 }, { s0: 15, s1: 30 }]), 15);
  assert.equal(openingEnd([]), 0);
  assert.deepEqual(notesIn(LINE, 1, 3), [[1, 1, 64], [2, 0.5, 65], [2.5, 0.5, 64]]);
  assert.deepEqual(notesIn(LINE, 2.5, 3), [[2.5, 0.5, 64]]);
});
