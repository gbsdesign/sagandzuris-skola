import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NAMES_A_REGION, RUKA_MARKS, RUKA_RULES, RUKA_TOPICS, drawRuka, rukaItemOf, rukaPoints, rukaSeconds, type RukaItem,
  type RukaQ,
} from '../src/utils/ruka';
import { RUKA_PLACES } from '../src/data/rukaPlaces';
import { KUTKHE_REGIONS } from '../src/utils/kutkhe';
import {
  answerRound, hybridScores, markTeam, newHybrid, newRounds, parseRoundsState, publicView, roundKey,
} from '../src/utils/roundGames';
import { mulberry32 } from '../src/utils/otkheuli';

// „რუკის ვიქტორინა“ (utils/ruka.ts): the places by region, the points by time, a game's rounds (the topics in turn, never a
// region twice running, a song by its tune alone), and a round in the room and on one phone.

test('the places: every region has its own, no name gives its region away, each name once', () => {
  for (const r of KUTKHE_REGIONS) assert.ok(RUKA_PLACES.filter(p => p.region === r).length >= 6, r);
  for (const p of RUKA_PLACES) {
    assert.ok(!NAMES_A_REGION.test(p.name), p.name);
    assert.ok(p.name.length <= 60 && p.note.length >= 15 && p.note.length <= 200, p.name);
    assert.ok(/[.!?]$/.test(p.note), p.name);
  }
  assert.equal(new Set(RUKA_PLACES.map(p => p.name)).size, RUKA_PLACES.length);
  for (const t of RUKA_TOPICS.filter(x => x.id !== 'song')) assert.ok(RUKA_PLACES.filter(p => p.topic === t.id).length >= 10, t.id);
});

test('points: the right region 1000 at once, 500 at the last moment; any other nothing', () => {
  const lim = 15_000;
  assert.equal(rukaPoints({ region: 3 }, { pick: 3, ms: 0 }, lim), 1000);
  assert.equal(rukaPoints({ region: 3 }, { pick: 3, ms: lim / 2 }, lim), 750);
  assert.equal(rukaPoints({ region: 3 }, { pick: 3, ms: lim }, lim), 500);
  assert.equal(rukaPoints({ region: 3 }, { pick: 4, ms: 0 }, lim), 0);
  assert.equal(rukaSeconds({}), 15);
  assert.equal(rukaSeconds({ url: 'x' }), 20);
  assert.deepEqual(RUKA_MARKS.map(m => m.points), [1, 0]);
});

const ITEMS: RukaItem[] = [
  ...RUKA_PLACES.map(p => ({ id: `p:${p.name}`, topic: p.topic, region: KUTKHE_REGIONS.indexOf(p.region), name: p.name, note: p.note })),
  ...KUTKHE_REGIONS.map((_, region) => ({
    id: `s:${region}`, topic: 'song' as const, region, name: `სიმღერა ${region}`, takes: [{ id: `t${region}`, url: `https://x/${region}`, who: 'ანსამბლი' }],
  })),
];

test('a game\'s rounds: the topics in turn, each item once, never one region twice running', () => {
  for (let seed = 1; seed < 15; seed++) {
    const rounds = drawRuka({ items: ITEMS, count: 12, rnd: mulberry32(seed) });
    assert.equal(rounds.length, 12);
    assert.equal(new Set(rounds.map(r => r.id)).size, 12);
    for (let i = 1; i < 12; i++) assert.notEqual(rounds[i].region, rounds[i - 1].region);
    // the regions spread over the map: twelve rounds ask eleven regions at least (a topic holds only some regions)
    assert.ok(new Set(rounds.map(r => r.region)).size >= 11);
    // six topics in twelve: each twice
    for (const t of RUKA_TOPICS) assert.equal(rounds.filter(r => r.topic === t.id).length, 2, t.id);
    for (const r of rounds) {
      assert.ok(RUKA_RULES.valid(r), JSON.stringify(r));
      assert.equal(r.ask, r.name);
      assert.equal(!!r.url, r.topic === 'song');
    }
  }
  // the topics chosen only
  const two = drawRuka({ items: ITEMS, topics: ['food', 'people'], count: 10, rnd: mulberry32(3) });
  assert.ok(two.every(r => r.topic === 'food' || r.topic === 'people'));
  // a song by its tune alone: no title asked, the title kept for the answer
  const tunes = drawRuka({ items: ITEMS, topics: ['song'], count: 5, hideTitles: true, rnd: mulberry32(5) });
  assert.ok(tunes.every(r => r.ask === undefined && r.url && r.name.startsWith('სიმღერა') && r.who === 'ანსამბლი'));
  assert.ok(tunes.every(r => RUKA_RULES.valid(r)));
  // a place keeps its name asked, even with the titles hidden
  assert.ok(drawRuka({ items: ITEMS, topics: ['town'], count: 3, hideTitles: true, rnd: mulberry32(5) }).every(r => r.ask === r.name));
  // the items not asked lately first: all of Tbilisi's but one seen — that one comes
  const tbilisi = ITEMS.filter(it => it.topic === 'town' && it.region === KUTKHE_REGIONS.indexOf('kalakuri'));
  const seen = tbilisi.slice(1).map(it => it.id);
  const town = ITEMS.filter(it => it.topic === 'town' && (it.region === KUTKHE_REGIONS.indexOf('kalakuri')));
  const r = drawRuka({ items: town, count: 1, seen, rnd: mulberry32(9) })[0];
  assert.equal(rukaItemOf(r), tbilisi[0].id);
  assert.deepEqual(drawRuka({ items: [], count: 5 }), []);
});

test('a round read back: wrong shapes are refused', () => {
  const r = drawRuka({ items: ITEMS, topics: ['song'], count: 1, rnd: mulberry32(2) })[0];
  assert.ok(RUKA_RULES.valid(JSON.parse(JSON.stringify(r))));
  const place = drawRuka({ items: ITEMS, topics: ['nature'], count: 1, rnd: mulberry32(2) })[0];
  assert.ok(RUKA_RULES.valid(place));
  const broken: unknown[] = [
    { ...r, kind: 'kutkhe' }, { ...r, topic: 'sport' }, { ...r, region: 13 }, { ...r, name: '' }, { ...r, from: 1 },
    { ...place, ask: undefined }, { ...place, from: 0.3 }, { ...r, note: 'x'.repeat(301) }, null,
  ];
  for (const b of broken) assert.ok(!RUKA_RULES.valid(b), JSON.stringify(b));
  assert.ok(RUKA_RULES.ok(r, 12) && !RUKA_RULES.ok(r, 13) && !RUKA_RULES.ok(r, -1));
});

test('a round in the room: the region and the answer stay hidden, the name is asked; on one phone the host marks each team', () => {
  const rounds = drawRuka({ items: ITEMS, topics: ['history'], count: 2, rnd: mulberry32(4) });
  const players = ['ა', 'ბ'].map((name, i) => ({ uid: `u${i}`, name }));
  let s = newRounds(players, { game: 'ruka', rounds, sound: 'all', now: 1000 })!;
  const q = publicView(s).q as Partial<RukaQ>;
  assert.equal(q.region, undefined);
  assert.equal(q.note, undefined);
  assert.equal(q.name, undefined);
  assert.equal(q.ask, rounds[0].ask);
  assert.equal(publicView(s).secs, 15);
  s = answerRound(s, 0, { key: roundKey(s), pick: rounds[0].region, ms: 0 });
  s = answerRound(s, 1, { key: roundKey(s), pick: (rounds[0].region + 1) % 13, ms: 0 });
  assert.equal(s.phase, 'reveal');
  assert.deepEqual(s.gained, [1000, 0]);
  assert.equal((publicView(s).q as Partial<RukaQ>).note, rounds[0].note);
  assert.deepEqual(parseRoundsState(JSON.stringify(s)), s);

  let h = newHybrid('ruka', ['ა', 'ბ'], rounds)!;
  assert.ok(h);
  h = markTeam(markTeam(h, 0, RUKA_MARKS[0].points), 1, RUKA_MARKS[1].points);
  assert.deepEqual(hybridScores(h), [1, 0]);
});
