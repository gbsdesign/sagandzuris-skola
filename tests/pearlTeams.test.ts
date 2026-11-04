import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/utils/otkheuli';
import { CHESTS } from '../src/data/pearls';
import {
  chestCounts, chestPatch, chestWith, isOver, newPearlTeams, parseClassChest, parsePearlTeams, polishedVoices, recordTake, standings, teamOf,
  teamPolished, teamScores, turnOf, undoTake, type ClassChest,
} from '../src/utils/pearlTeams';

const CHEST = CHESTS[0];

test('a game: a pearl a turn, the class’s least polished first, the teams in turn', () => {
  const have: ClassChest = Object.fromEntries(CHEST.pearls.slice(0, 15).map(id => [id, [90, 85, 80]]));
  const g = newPearlTeams({ chest: CHEST.id, teams: ['ა', 'ბ', 'გ'], perTeam: 2, have, rnd: mulberry32(5) })!;
  assert.equal(g.order.length, 6);
  assert.ok(g.order.slice(0, 5).every(id => !have[id]), 'the five never sung come first');
  assert.equal(new Set(g.order).size, 6);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(t => teamOf(g, t)), [0, 1, 2, 0, 1, 2]);
  assert.equal(newPearlTeams({ chest: 'nope', teams: ['ა'], perTeam: 2 }), null);
  const big = newPearlTeams({ chest: CHEST.id, teams: ['ა', 'ბ', 'გ', 'დ', 'ე', 'ვ'], perTeam: 4, rnd: mulberry32(1) })!;
  assert.equal(big.order.length, 24, 'more turns than pearls: the chest goes round again');
  assert.equal(new Set(big.order.slice(0, 20)).size, 20);
});

test('takes: points are the per cents, 80 % polishes, a skip scores nothing', () => {
  let g = newPearlTeams({ chest: CHEST.id, teams: ['ა', 'ბ'], perTeam: 2, rnd: mulberry32(2) })!;
  g = recordTake(g, 92, 1);
  g = recordTake(g, 64, 0);
  g = recordTake(g, null, 0);
  assert.equal(turnOf(g), 3);
  assert.deepEqual(teamScores(g), [92, 64]);
  assert.deepEqual(teamPolished(g), [1, 0]);
  g = recordTake(g, 81, 2);
  assert.ok(isOver(g));
  assert.equal(recordTake(g, 50, 0), g, 'no take after the end');
  assert.deepEqual(standings(g).map(r => [r.name, r.points, r.place]), [['ბ', 145, 1], ['ა', 92, 2]]);
  assert.equal(turnOf(undoTake(g)), 3);
  assert.equal(recordTake(newPearlTeams({ chest: CHEST.id, teams: ['ა'], perTeam: 1 })!, 130, 7).takes[0]!.pct, 100);
});

test('equal teams share a place', () => {
  let g = newPearlTeams({ chest: CHEST.id, teams: ['ა', 'ბ', 'გ'], perTeam: 1, rnd: mulberry32(3) })!;
  g = recordTake(recordTake(recordTake(g, 70, 0), 70, 1), 90, 2);
  assert.deepEqual(standings(g).map(r => [r.name, r.place]), [['გ', 1], ['ა', 2], ['ბ', 2]]);
});

test('the class’s chest keeps each voice’s best; golden in all three', () => {
  const id = CHEST.pearls[0];
  let c: ClassChest = {};
  c = chestPatch(c, id, { pct: 70, voice: 0 });
  c = chestPatch(c, id, { pct: 60, voice: 0 });
  assert.deepEqual(c[id], [70, -1, -1]);
  assert.equal(polishedVoices(c, id), 0);
  c = chestPatch(chestPatch(chestPatch(c, id, { pct: 85, voice: 0 }), id, { pct: 80, voice: 1 }), id, { pct: 99, voice: 2 });
  assert.equal(polishedVoices(c, id), 3);
  assert.equal(chestPatch(c, id, null), c);
  assert.deepEqual(chestCounts(c, CHEST.id), { polished: 1, golden: 1, total: 20 });
  // a game's takes go on the chest by their pearls; undone, they are gone from it
  let g = newPearlTeams({ chest: CHEST.id, teams: ['ა', 'ბ'], perTeam: 1, have: c, rnd: mulberry32(6) })!;
  g = recordTake(recordTake(g, 88, 1), 40, 0);
  const after = chestWith(c, g);
  assert.deepEqual(after[g.order[0]], [-1, 88, -1]);
  assert.deepEqual(after[g.order[1]], [40, -1, -1]);
  assert.equal(after[id], c[id]);
  assert.equal(chestWith(c, undoTake(g))[g.order[1]], undefined);
});

test('kept games and chests are read back only whole', () => {
  const g = recordTake(newPearlTeams({ chest: CHEST.id, teams: ['ა', 'ბ'], perTeam: 2, rnd: mulberry32(4) })!, 77, 2);
  assert.deepEqual(parsePearlTeams(JSON.parse(JSON.stringify(g))), g);
  assert.equal(parsePearlTeams({ ...g, order: ['x'] }), null);
  assert.equal(parsePearlTeams({ ...g, takes: [{ pct: 50, voice: 5 }] }), null);
  assert.equal(parsePearlTeams(null), null);
  const id = CHEST.pearls[1];
  assert.deepEqual(parseClassChest({ [id]: [80, -1, 12], nope: [1, 2, 3], [CHEST.pearls[2]]: [1, 2] }), { [id]: [80, -1, 12] });
});
