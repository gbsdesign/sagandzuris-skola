import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  afterPick, buildGrid, checkPick, gridOfDay, mulberry32, otkheuliMeta, otkheuliShareText, otkheuliStats, replay, wasTried, type OtkheuliGroup,
} from '../src/utils/otkheuli';
import { OTKHEULI_GROUPS } from '../src/data/otkheuliGroups';
import { emptyDay } from '../src/utils/hangi';

const G: OtkheuliGroup[] = [
  { id: 'a', label: 'A', words: ['a1', 'a2', 'a3', 'a4', 'a5'] },
  { id: 'b', label: 'B', words: ['b1', 'b2', 'b3', 'b4'] },
  { id: 'c', label: 'C', words: ['c1', 'c2', 'c3', 'c4', 'a1'] },
  { id: 'd', label: 'D', words: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'] },
  { id: 'e', label: 'E', words: ['e1', 'e2', 'e3', 'e4'] },
];

test('buildGrid takes four groups of four, every word once', () => {
  for (let seed = 1; seed < 40; seed++) {
    const grid = buildGrid(G, mulberry32(seed));
    assert.ok(grid);
    assert.equal(grid.groups.length, 4);
    assert.equal(grid.tiles.length, 16);
    assert.equal(new Set(grid.tiles).size, 16);
    for (const g of grid.groups) {
      assert.equal(g.words.length, 4);
      const full = G.find(x => x.id === g.id)!;
      assert.ok(g.words.every(w => full.words.includes(w)));
    }
  }
  assert.equal(buildGrid(G.slice(0, 3), mulberry32(1)), undefined);
  // a group left with fewer than four free words is skipped
  const tight: OtkheuliGroup[] = [
    { id: 'x', label: 'X', words: ['1', '2', '3', '4'] },
    { id: 'y', label: 'Y', words: ['1', '5', '6', '7'] },
    { id: 'z', label: 'Z', words: ['8', '9', '10', '11'] },
    { id: 'w', label: 'W', words: ['12', '13', '14', '15'] },
  ];
  assert.equal(buildGrid(tight, mulberry32(1)), undefined);
  // one group of a family per grid
  const fam: OtkheuliGroup[] = [
    ...G.slice(0, 3),
    { id: 'f1', label: 'F1', words: ['f1', 'f2', 'f3', 'f4'], family: 'f' },
    { id: 'f2', label: 'F2', words: ['f5', 'f6', 'f7', 'f8'], family: 'f' },
  ];
  for (let seed = 1; seed < 20; seed++) {
    const grid = buildGrid(fam, mulberry32(seed))!;
    assert.equal(grid.groups.filter(g => g.family === 'f').length, 1);
  }
});

test('gridOfDay is the same grid for the same day', () => {
  const a = gridOfDay(G, '2026-10-28');
  const b = gridOfDay(G, '2026-10-28');
  assert.deepEqual(a, b);
});

test('the app\'s groups build a grid on every day of a year', () => {
  assert.ok(OTKHEULI_GROUPS.length >= 30);
  for (const g of OTKHEULI_GROUPS) {
    assert.ok(g.words.length >= 4, g.id);
    assert.equal(new Set(g.words).size, g.words.length, g.id);
    assert.ok(g.words.every(w => w.length <= 11), `${g.id}: ${g.words.filter(w => w.length > 11).join(', ')}`);
  }
  const d = new Date(Date.UTC(2026, 9, 28));
  for (let i = 0; i < 366; i++, d.setUTCDate(d.getUTCDate() + 1)) {
    const grid = gridOfDay(OTKHEULI_GROUPS, d.toISOString().slice(0, 10));
    assert.ok(grid && grid.tiles.length === 16 && new Set(grid.tiles).size === 16);
    assert.ok(grid.groups.filter(g => g.family === 'songs').length <= 1);
  }
});

test('checkPick, replay and afterPick', () => {
  const grid = buildGrid(G, mulberry32(7))!;
  const [g0, g1] = grid.groups;
  assert.deepEqual(checkPick(grid, g0.words), { kind: 'solved', group: g0 });
  assert.deepEqual(checkPick(grid, [...g0.words.slice(0, 3), g1.words[0]]), { kind: 'oneAway' });
  assert.deepEqual(checkPick(grid, [...g0.words.slice(0, 2), ...g1.words.slice(0, 2)]), { kind: 'wrong' });

  let day = emptyDay(grid.key);
  const wrong = [...g0.words.slice(0, 2), ...g1.words.slice(0, 2)];
  let r = afterPick(day, grid, wrong);
  assert.equal(r.verdict.kind, 'wrong');
  day = r.day;
  assert.ok(wasTried(day.guesses, [...wrong].reverse()));
  assert.ok(!wasTried(day.guesses, g0.words));
  r = afterPick(day, grid, [...g0.words].reverse());
  assert.equal(r.verdict.kind, 'solved');
  day = r.day;
  let st = replay(grid, day.guesses);
  assert.equal(st.mistakes, 1);
  assert.deepEqual(st.solved, [g0]);
  assert.equal(st.left.length, 12);
  assert.equal(st.done, false);
  for (const g of grid.groups.slice(1)) day = afterPick(day, grid, g.words).day;
  st = replay(grid, day.guesses);
  assert.equal(st.won, true);
  assert.equal(st.done, true);
  assert.equal(day.won, true);

  let lost = emptyDay(grid.key);
  for (let i = 0; i < 4; i++) lost = afterPick(lost, grid, [g0.words[i], ...g1.words.slice(0, 3)]).day;
  assert.equal(lost.done, true);
  assert.equal(lost.won, false);
  assert.equal(replay(grid, lost.guesses).mistakes, 4);
});

test('share text, statistics and the hub line', () => {
  const grid = buildGrid(G, mulberry32(3))!;
  const [g0, g1, g2, g3] = grid.groups;
  let day = emptyDay(grid.key);
  day = afterPick(day, grid, [...g0.words.slice(0, 3), g1.words[0]]).day;
  for (const g of grid.groups) day = afterPick(day, grid, g.words).day;
  const text = otkheuliShareText(2, grid, day.guesses, 'x.ge');
  assert.equal(text.split('\n')[0], 'ოთხეული №2 · 1 შეცდომით');
  assert.equal(text.split('\n')[1], '🟨🟨🟨🟩');
  assert.equal(text.split('\n')[5], '🟪🟪🟪🟪');
  void g2; void g3;

  const days = { '2026-10-28': day, '2026-10-27': { ...day, guesses: day.guesses.slice(1) } };
  const stats = otkheuliStats(days, '2026-10-28');
  assert.equal(stats.played, 2);
  assert.equal(stats.won, 2);
  assert.equal(stats.streak, 2);
  assert.deepEqual(stats.dist, [1, 1, 0, 0, 0]);
  assert.equal(otkheuliMeta(days, '2026-10-28'), 'დღეს იპოვე 1 შეცდომით');
  assert.equal(otkheuliMeta({ '2026-10-27': days['2026-10-27'] }, '2026-10-28'), 'სერია: 1 დღე');
  assert.equal(otkheuliMeta({}, '2026-10-28'), undefined);
});
