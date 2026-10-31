import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KUTKHE_NEAR, KUTKHE_REGIONS, KUTKHE_RULES, clipStart, drawKutkhe, isNear, kutkhePoints, kutkheSongOf, type KutkheSong } from '../src/utils/kutkhe';
import { mulberry32 } from '../src/utils/otkheuli';

// „საიდანაა სიმღერა?“ (utils/kutkhe.ts): the map's neighbours, the points, a game's rounds from the pool, the piece's start.

test('every region is listed with its neighbours, and a neighbour is so both ways', () => {
  assert.equal(KUTKHE_REGIONS.length, 13);
  for (const r of KUTKHE_REGIONS) {
    assert.ok(KUTKHE_NEAR[r].length > 0, r);
    for (const n of KUTKHE_NEAR[r]) assert.ok(KUTKHE_NEAR[n].includes(r), `${r} ↔ ${n}`);
  }
  assert.ok(isNear(KUTKHE_REGIONS.indexOf('guria'), KUTKHE_REGIONS.indexOf('achara')));
  assert.ok(!isNear(KUTKHE_REGIONS.indexOf('svaneti'), KUTKHE_REGIONS.indexOf('kakheti')));
});

test('the right region earns the most, the quicker the more; a neighbour a part; far away nothing', () => {
  const kakheti = KUTKHE_REGIONS.indexOf('kakheti');
  const limit = 40_000;
  assert.equal(kutkhePoints({ region: kakheti }, { pick: kakheti, ms: 0 }, limit), 1000);
  assert.equal(kutkhePoints({ region: kakheti }, { pick: kakheti, ms: limit }, limit), 700);
  assert.equal(kutkhePoints({ region: kakheti }, { pick: KUTKHE_REGIONS.indexOf('kalakuri'), ms: 0 }, limit), 400);
  assert.equal(kutkhePoints({ region: kakheti }, { pick: KUTKHE_REGIONS.indexOf('mtianeti'), ms: limit }, limit), 300);
  assert.equal(kutkhePoints({ region: kakheti }, { pick: KUTKHE_REGIONS.indexOf('abkhazeti'), ms: 0 }, limit), 0);
  assert.ok(KUTKHE_RULES.ok({} as never, 12));
  assert.ok(!KUTKHE_RULES.ok({} as never, 13));
  assert.ok(!KUTKHE_RULES.ok({} as never, -1));
});

const pool = (): KutkheSong[] => KUTKHE_REGIONS.flatMap((_, region) =>
  Array.from({ length: region === 7 ? 1 : 4 }, (__, k) => ({
    id: `r${region}s${k}`, song: `სიმღერა ${region}.${k}`, region, takes: [{ id: `t${region}.${k}`, url: `https://x/${region}/${k}`, who: 'გუნდი' }],
  })));

test('a game: a different song each round, never the same region twice running, a land with too few songs never', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const rounds = drawKutkhe(pool(), 12, [], mulberry32(seed));
    assert.equal(rounds.length, 12);
    assert.equal(new Set(rounds.map(kutkheSongOf)).size, 12);
    rounds.forEach((r, i) => { if (i) assert.notEqual(r.region, rounds[i - 1].region); });
    assert.ok(rounds.every(r => r.region !== 7));
    assert.ok(rounds.every(r => KUTKHE_RULES.valid(r)));
    assert.ok(rounds.every(r => r.from >= 0.05 && r.from <= 0.55));
  }
});

test('the songs asked lately come last', () => {
  const all = pool();
  const seen = all.filter(s => !s.id.endsWith('s0')).map(s => s.id);
  for (let seed = 1; seed <= 20; seed++) {
    // a region's first round takes its song not asked yet
    const firsts = new Map<number, string>();
    for (const r of drawKutkhe(all, 12, seen, mulberry32(seed))) if (!firsts.has(r.region)) firsts.set(r.region, kutkheSongOf(r));
    assert.ok([...firsts.values()].every(id => id.endsWith('s0')));
  }
  assert.deepEqual(drawKutkhe([], 5), []);
});

test('the piece starts where it was asked to, and always fits before the end', () => {
  assert.equal(clipStart(200, 0.5), 100);
  assert.equal(clipStart(200, 0.95), 165);
  assert.equal(clipStart(40, 0.5), 0);
  assert.equal(clipStart(Number.NaN, 0.5), 0);
});
