import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGrid, mulberry32, type OtkheuliGrid, type OtkheuliGroup } from '../src/utils/otkheuli';
import {
  BY_ITSELF, NOT_YET, OTK_FIND, OTK_LINK, newOtkTeams, otkLeft, otkLink, otkNext, otkPick, otkTime, otkTried, otkUsed, parseOtkTeams,
} from '../src/utils/otkheuliTeams';

const G: OtkheuliGroup[] = [
  { id: 'a', label: 'A', words: ['a1', 'a2', 'a3', 'a4'] },
  { id: 'b', label: 'B', words: ['b1', 'b2', 'b3', 'b4'] },
  { id: 'c', label: 'C', words: ['c1', 'c2', 'c3', 'c4'] },
  { id: 'd', label: 'D', words: ['d1', 'd2', 'd3', 'd4'] },
  { id: 'e', label: 'E', words: ['e1', 'e2', 'e3', 'e4'] },
];
const grid = (seed = 1): OtkheuliGrid => buildGrid(G, mulberry32(seed))!;
const words = (g: OtkheuliGrid, i: number) => g.groups[i].words;
const start = () => newOtkTeams(['ა', 'ბ', 'გ'], 2, 60, grid(), 1000);

test('a group found is the team’s and waits for its link; then the turn moves on', () => {
  let g = start();
  g = otkPick(g, words(g.grid, 0), 2000);
  assert.equal(g.owner[0], 0);
  assert.equal(g.scores[0], OTK_FIND);
  assert.deepEqual(g.ask, { group: 0, team: 0 });
  assert.equal(g.turn, 0, 'the turn waits for the host');
  assert.equal(otkPick(g, words(g.grid, 1), 2500), g, 'no pick while the link is asked');
  assert.equal(otkTime(g, 2500), g, 'the clock does not run while the link is asked');
  g = otkLink(g, true, 3000);
  assert.equal(g.scores[0], OTK_FIND + OTK_LINK);
  assert.equal(g.linked[0], true);
  assert.equal(g.ask, null);
  assert.equal(g.turn, 1);
  assert.equal(g.t0, 3000);
  assert.equal(otkLeft(g).length, 12);
});

test('a wrong four passes the turn and is remembered; one away says so', () => {
  let g = start();
  const near = [...words(g.grid, 0).slice(0, 3), words(g.grid, 1)[0]];
  g = otkPick(g, near, 2000);
  assert.deepEqual(g.last, { team: 0, kind: 'oneAway' });
  assert.equal(g.turn, 1);
  assert.ok(otkTried(g, [...near].reverse()));
  const wrong = [words(g.grid, 0)[0], words(g.grid, 1)[0], words(g.grid, 2)[0], words(g.grid, 3)[0]];
  g = otkPick(g, wrong, 3000);
  assert.deepEqual(g.last, { team: 1, kind: 'wrong' });
  assert.equal(g.turn, 2);
  assert.deepEqual(g.scores, [0, 0, 0]);
  g = otkTime(g, 4000);
  assert.deepEqual(g.last, { team: 2, kind: 'time' });
  assert.equal(g.turn, 0);
});

test('after the third group the last four join by themselves and the next team names their link', () => {
  let g = start();
  for (let i = 0; i < 3; i++) {
    g = otkPick(g, words(g.grid, i), 2000 + i);
    g = otkLink(g, false, 2000 + i);
  }
  // teams 0, 1, 2 found one each; the last four go to team 0's naming
  assert.deepEqual(g.owner, [0, 1, 2, BY_ITSELF]);
  assert.deepEqual(g.ask, { group: 3, team: 0 });
  assert.equal(g.phase, 'play');
  g = otkLink(g, true, 5000);
  assert.equal(g.phase, 'grid');
  assert.deepEqual(g.scores, [OTK_FIND + OTK_LINK, OTK_FIND, OTK_FIND]);
  assert.equal(otkLeft(g).length, 0);
});

test('the next grid is begun by the next team, with groups not asked yet; then the game ends', () => {
  let g = start();
  for (let i = 0; i < 3; i++) { g = otkPick(g, words(g.grid, i), 2000); g = otkLink(g, false, 2000); }
  g = otkLink(g, false, 2000);
  const used = otkUsed(g);
  assert.equal(used.length, 4);
  const fresh = buildGrid(G.filter(x => !used.includes(x.id)).concat(G), mulberry32(9))!;
  g = otkNext(g, fresh, 6000);
  assert.equal(g.at, 1);
  assert.equal(g.first, 1);
  assert.equal(g.turn, 1);
  assert.deepEqual(g.owner, [NOT_YET, NOT_YET, NOT_YET, NOT_YET]);
  assert.equal(g.moves.length, 0);
  assert.equal(g.used.length, 4);
  assert.equal(g.scores.reduce((a, b) => a + b, 0), 3 * OTK_FIND, 'the points stay');
  for (let i = 0; i < 3; i++) { g = otkPick(g, words(g.grid, i), 7000); g = otkLink(g, false, 7000); }
  g = otkLink(g, false, 7000);
  g = otkNext(g, grid(3), 8000);
  assert.equal(g.phase, 'over');
});

test('a kept game reads back; a broken one does not', () => {
  let g = start();
  g = otkPick(g, words(g.grid, 2), 2000);
  const back = parseOtkTeams(JSON.parse(JSON.stringify(g)));
  assert.deepEqual(back, g);
  assert.equal(parseOtkTeams({ ...g, owner: [0, 0, 0] }), null);
  assert.equal(parseOtkTeams({ ...g, names: ['ა'] }), null);
  assert.equal(parseOtkTeams({ ...g, grid: { ...g.grid, tiles: g.grid.tiles.slice(1) } }), null);
  assert.equal(parseOtkTeams({ ...g, turn: 5 }), null);
  assert.equal(parseOtkTeams(null), null);
});
