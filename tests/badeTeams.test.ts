import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBade, type BadeTheme } from '../src/utils/bade';
import { mulberry32 } from '../src/utils/otkheuli';
import {
  NOBODY, badeFind, badeLeft, badeMissed, badeNext, badePause, badeResume, badeStart, badeTime, badeUndo, newBadeTeams, parseBadeTeams,
} from '../src/utils/badeTeams';

const T: BadeTheme = { id: 'ckh', title: 'ცხოველები', words: ['მგელი', 'დათვი', 'ირემი', 'ჯიხვი', 'არჩვი', 'შველი', 'ტურა', 'მელა', 'ზღარბი', 'ციყვი'] };
const T2: BadeTheme = { id: 'kh', title: 'ხეები', words: ['მუხა', 'წიფელი', 'ნაძვი', 'ფიჭვი', 'ცაცხვი', 'წაბლი', 'კაკალი', 'ურთხელი'] };
const grid = (t = T) => buildBade(t, 'easy', mulberry32(9))!;
const start = () => newBadeTeams(['ა', 'ბ'], 2, 'easy', 'nuskhuri', true, 120, grid(), 1000);

test('a word goes to the team that found it, once; the last one closes the grid', () => {
  let g = start();
  g = badeFind(g, 0, 1, 5000);
  assert.equal(g.owner[0], 1);
  assert.deepEqual(g.scores, [0, 1]);
  assert.equal(badeFind(g, 0, 0, 6000), g, 'a word found stays found');
  assert.equal(badeFind(g, 1, 7, 6000), g, 'no such team');
  for (let i = 1; i < g.owner.length; i++) g = badeFind(g, i, i % 2, 6000 + i);
  assert.equal(g.phase, 'grid');
  assert.equal(g.t0, 0, 'the clock stops');
  assert.equal(badeMissed(g), 0);
  assert.equal(g.scores[0] + g.scores[1], g.owner.length);
});

test('the clock pauses while the screen is closed and runs on from where it was', () => {
  let g = start();
  assert.equal(badeLeft(g, 31_000), 90_000);
  g = badePause(g, 31_000);
  assert.equal(badeLeft(g, 500_000), 90_000, 'paused');
  g = badeResume(g, 600_000);
  assert.equal(badeLeft(g, 610_000), 80_000);
  assert.equal(badeStart(g), 600_000 - 30_000);
  g = badeFind(g, 0, 0, 620_000);
  assert.equal(badeStart(g), 570_000, 'a word keeps the clock where it is');
  assert.equal(badeLeft(g, 620_000), 70_000);
  g = badeTime(g, 700_000);
  assert.equal(g.phase, 'grid');
  assert.equal(badeLeft(g, 900_000), 0);
  assert.ok(badeMissed(g) > 0);
});

test('a wrong team’s word is given back; the next grid starts at once, the last one ends the game', () => {
  let g = badeFind(start(), 2, 0, 2000);
  g = badeUndo(g);
  assert.equal(g.owner[2], NOBODY);
  assert.deepEqual(g.scores, [0, 0]);
  assert.equal(badeUndo(g), g, 'only once');
  g = badeTime(g, 3000);
  const g2 = grid(T2);
  g = badeNext(g, g2, 4000);
  assert.equal(g.at, 1);
  assert.equal(g.phase, 'play');
  assert.equal(g.grid, g2);
  assert.deepEqual(g.used, ['ckh', 'kh']);
  assert.equal(g.owner.length, g2.placed.length);
  assert.equal(badeLeft(g, 4000), 120_000);
  g = badeNext(badeTime(g, 5000), grid(), 6000);
  assert.equal(g.phase, 'over');
});

test('a kept game reads back; a broken one does not', () => {
  const g = badeFind(start(), 1, 0, 3000);
  assert.deepEqual(parseBadeTeams(JSON.parse(JSON.stringify(g))), g);
  assert.equal(parseBadeTeams({ ...g, owner: [] }), null);
  assert.equal(parseBadeTeams({ ...g, script: 'latin' }), null);
  assert.equal(parseBadeTeams(null), null);
});
