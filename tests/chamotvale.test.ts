import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAMO_RULES, MAX_ITEMS, chamoPoints, chamoSeconds, continuesForm, countOf, drawChamotvale, editDistance, foundOf, formsOf, maskOf, newTeams,
  normName, parseTeams, teamCounts, teamFind, teamPass, toQ, tryName,
} from '../src/utils/chamotvale';
import { CHAMO_LISTS, chamoListById } from '../src/data/chamotvaleLists';
import { KUTKHE_REGIONS } from '../src/utils/kutkhe';

const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const list = (id: string) => chamoListById(id)!;
const none = (n: number) => Array.from({ length: n }, () => false);

test('a name’s key drops spaces, hyphens and a last „ი“', () => {
  assert.equal(normName('რაჭა-ლეჩხუმი'), 'რაჭალეჩხუმ');
  assert.equal(normName('დავით'), normName('დავითი'));
  assert.equal(normName(' შიდა ქართლი '), normName('შიდაქართლი'));
  assert.equal(normName('ისე'), 'ისე');
  assert.equal(normName('სი'), 'სი');
});

test('the edit distance counts a swap of neighbours as one step', () => {
  assert.equal(editDistance('კახეთ', 'კახეთ'), 0);
  assert.equal(editDistance('კახეთ', 'კაეხთ'), 1);
  assert.equal(editDistance('კახეთ', 'კახთ'), 1);
  assert.equal(editDistance('იმერეთ', 'იმერთე'), 1);
  assert.equal(editDistance('ა', 'ბგ'), 2);
});

test('a whole name fills its box while typing, never a half-typed one', () => {
  const l = list('kutkheebi');
  assert.deepEqual(tryName(l, none(13), 'კახეთი', false), { kind: 'found', item: 11 });
  assert.deepEqual(tryName(l, none(13), 'კახე', false), { kind: 'none' });
  // the last „ი“ not typed yet: wait (on „Enter“ it counts)
  assert.deepEqual(tryName(l, none(13), 'კახეთ', false), { kind: 'none' });
  assert.deepEqual(tryName(l, none(13), 'კახეთ', true), { kind: 'found', item: 11 });
  // a short form of its own member is taken at once; the long one typed on goes through
  assert.deepEqual(tryName(l, none(13), 'რაჭა', false), { kind: 'found', item: 3 });
  assert.equal(continuesForm(l.items, 3, 'რაჭა-ლეჩ'), true);
  assert.equal(continuesForm(l.items, 3, 'რაჭაი'), false);
  assert.equal(continuesForm(l.items, 3, 'რაჭა '), true);
  assert.deepEqual(tryName(l, none(13), 'ლეჩხუმი', false), { kind: 'found', item: 3 });
});

test('a name that may still grow into another waits for „Enter“', () => {
  const l = list('dghesastsaulebi');
  const n = l.items.length;
  // „შობა“ may become „შობა ღვთისმშობლისა“
  assert.deepEqual(tryName(l, none(n), 'შობა', false), { kind: 'none' });
  assert.deepEqual(tryName(l, none(n), 'შობა', true), { kind: 'found', item: 3 });
  assert.deepEqual(tryName(l, none(n), 'შობა ღვთისმშობლისა', false), { kind: 'found', item: 0 });
  // once the other is found, nothing is left to wait for
  const f = none(n);
  f[0] = true;
  assert.deepEqual(tryName(l, f, 'შობა', false), { kind: 'found', item: 3 });
  assert.deepEqual(tryName(l, f, 'შობა ქრისტესი', false), { kind: 'found', item: 3 });
});

test('two members sharing a name: the first not found takes it', () => {
  const l = list('motsiqulebi');
  const f = none(l.items.length);
  const first = tryName(l, f, 'იაკობი', true);
  assert.deepEqual(first, { kind: 'found', item: 2 });
  f[2] = true;
  assert.deepEqual(tryName(l, f, 'იაკობი', true), { kind: 'found', item: 8 });
  f[8] = true;
  assert.deepEqual(tryName(l, f, 'იაკობი', true), { kind: 'again', item: 2 });
});

test('on „Enter“ a slip is forgiven when only one member is that near', () => {
  const l = list('kutkheebi');
  assert.deepEqual(tryName(l, none(13), 'კახთი', true), { kind: 'found', item: 11 });
  assert.deepEqual(tryName(l, none(13), 'კახთი', false), { kind: 'none' });
  assert.deepEqual(tryName(l, none(13), 'სამეგრლო', true), { kind: 'found', item: 2 });
  // too far
  assert.deepEqual(tryName(l, none(13), 'კაკაო', true), { kind: 'none' });
  // a short word is not guessed at
  assert.deepEqual(tryName(list('notebi'), none(7), 'დი', true), { kind: 'none' });
});

test('a found one says so; a word near the list brings its line', () => {
  const l = list('motsiqulebi');
  const f = none(l.items.length);
  f[6] = true;
  assert.deepEqual(tryName(l, f, 'თომა', true), { kind: 'again', item: 6 });
  assert.deepEqual(tryName(l, f, 'თომა', false), { kind: 'none' });
  const paul = tryName(l, f, 'პავლე', true);
  assert.equal(paul.kind, 'also');
});

test('every list can be finished and no two members are written alike', () => {
  const ids = new Set<string>();
  for (const l of CHAMO_LISTS) {
    assert.ok(!ids.has(l.id), l.id);
    ids.add(l.id);
    assert.ok(l.items.length >= 4 && l.items.length <= MAX_ITEMS, l.id);
    assert.ok(CHAMO_RULES.valid(toQ(l)), l.id);
    // each member's own name finds it, on „Enter“ and (unless it may grow) while typing
    const found = none(l.items.length);
    l.items.forEach((it, i) => {
      const t = tryName(l, found, it.name, true);
      assert.deepEqual(t, { kind: 'found', item: i }, `${l.id}: ${it.name}`);
    });
    // a name may be shared only by members that are the same kind of name (the two Jameses), never by a member's own name
    const forms = formsOf(l.items);
    l.items.forEach((it, i) => assert.deepEqual(forms.get(normName(it.name)), [i], `${l.id}: ${it.name} is someone else's too`));
    // the `also` words are not members
    for (const w of Object.keys(l.also ?? {})) assert.equal(forms.has(normName(w)), false, `${l.id}: ${w}`);
    // finding the whole list in any order works
    const f2 = none(l.items.length);
    [...l.items.keys()].reverse().forEach(i => {
      const t = tryName(l, f2, l.items[i].name, true);
      assert.equal(t.kind, 'found');
      if (t.kind === 'found') f2[t.item] = true;
    });
    assert.ok(f2.every(Boolean), l.id);
  }
});

test('the map list keeps the map’s order of regions', () => {
  const l = list('kutkheebi');
  assert.equal(l.map, true);
  assert.equal(l.items.length, KUTKHE_REGIONS.length);
  assert.equal(CHAMO_LISTS.filter(x => x.map).length, 1);
});

test('the found members as one int', () => {
  const f = [true, false, true, true];
  const m = maskOf(f);
  assert.equal(m, 13);
  assert.deepEqual(foundOf(m, 4), f);
  assert.equal(countOf(m, 4), 3);
  assert.equal(countOf(maskOf(Array(30).fill(true)), 30), 30);
});

test('points: 100 a member, the whole list more by the time left', () => {
  const q = toQ(list('makhareblebi'));
  const limit = chamoSeconds(4) * 1000;
  assert.equal(chamoPoints(q, { pick: 0, ms: 1000 }, limit), 0);
  assert.equal(chamoPoints(q, { pick: 0b0111, ms: 1000 }, limit), 300);
  const quick = chamoPoints(q, { pick: 0b1111, ms: 0 }, limit);
  const slow = chamoPoints(q, { pick: 0b1111, ms: limit }, limit);
  assert.equal(quick, 400 + 100 + 300);
  assert.equal(slow, 400 + 100);
  assert.equal(chamoSeconds(4), 47);
  assert.equal(chamoSeconds(13), 119);
  assert.equal(chamoSeconds(30), 150);
});

test('a room’s answers and rounds are checked', () => {
  const q = toQ(list('makhareblebi'));
  assert.equal(CHAMO_RULES.ok(q, 15), true);
  assert.equal(CHAMO_RULES.ok(q, 16), false);
  assert.equal(CHAMO_RULES.ok(q, -1), false);
  assert.equal(CHAMO_RULES.ok(q, 1.5), false);
  assert.equal(CHAMO_RULES.valid({ ...q, items: [q.items[0]] }), false);
  assert.equal(CHAMO_RULES.valid({ ...q, kind: 'otkhi' }), false);
  assert.equal(CHAMO_RULES.valid({ ...q, also: { a: 5 } }), false);
  assert.equal(CHAMO_RULES.valid({ ...q, items: [...q.items, { name: '' }] }), false);
});

test('a room’s lists: of the topics chosen, the unplayed first, no list twice', () => {
  const rounds = drawChamotvale({ lists: CHAMO_LISTS, count: 9, topics: ['rtsmena'], rnd: seeded(5) });
  assert.equal(rounds.length, CHAMO_LISTS.filter(l => l.topic === 'rtsmena').length);
  assert.ok(rounds.every(q => list(q.id).topic === 'rtsmena'));
  assert.equal(new Set(rounds.map(q => q.id)).size, rounds.length);
  const seen = CHAMO_LISTS.map(l => l.id).filter(id => id !== 'planetebi');
  const [first] = drawChamotvale({ lists: CHAMO_LISTS, count: 1, seen, rnd: seeded(9) });
  assert.equal(first.id, 'planetebi');
});

test('teams in turn: a name is the team’s, a pass moves on, everyone passing ends it', () => {
  const q = toQ(list('makhareblebi'));
  let g = newTeams(q, ['ა', 'ბ', 'გ'], 15, 0, 0);
  g = teamFind(g, 1, 10);
  assert.equal(g.owner[1], 0);
  assert.equal(g.turn, 1);
  assert.equal(teamFind(g, 1, 11), g);
  g = teamPass(g, 20);
  g = teamPass(g, 30);
  assert.equal(g.over, false);
  assert.equal(g.turn, 0);
  g = teamFind(g, 0, 40);
  assert.equal(g.passes, 0);
  g = teamPass(g, 50); g = teamPass(g, 60); g = teamPass(g, 70);
  assert.equal(g.over, true);
  assert.deepEqual(teamCounts(g), [2, 0, 0]);
  // the whole list ends it too
  let h = newTeams(q, ['ა', 'ბ'], 10, 1, 0);
  [0, 1, 2, 3].forEach(i => { h = teamFind(h, i, 1); });
  assert.equal(h.over, true);
  assert.deepEqual(teamCounts(h), [2, 2]);
});

test('a paused teams’ game is read back', () => {
  const q = toQ(list('notebi'));
  const g = teamFind(newTeams(q, ['ა', 'ბ'], 20, 0, 0), 3, 5);
  const back = parseTeams(JSON.parse(JSON.stringify(g)));
  assert.ok(back);
  assert.deepEqual(back!.owner, g.owner);
  assert.equal(back!.secs, 20);
  assert.equal(parseTeams({ ...g, names: ['ა'] }), null);
  assert.equal(parseTeams({ ...g, owner: [5, -1, -1, -1, -1, -1, -1] }), null);
  assert.equal(parseTeams({ ...g, over: true }), null);
});
