import test from 'node:test';
import assert from 'node:assert/strict';
import { TSINAPARI_STORIES, tsinapariStory } from '../src/data/tsinapariStories';
import { ANCESTORS } from '../src/data/ancestorsBios';
import {
  betterPath, choiceOrder, choiceText, isOver, isShown, newRun, newTable, nextStep, parseRun, parseTable, pickChoice, rightCount, starsOf,
  tableNext, tableOver, tablePick, tablePlaces, tableReveal,
} from '../src/utils/tsinapari';

const STORY = TSINAPARI_STORIES[0];
const N = STORY.steps.length;

test('every story: an ancestor of the app, forks with three different ways, words to tell', () => {
  assert.equal(new Set(TSINAPARI_STORIES.map(s => s.id)).size, TSINAPARI_STORIES.length);
  for (const s of TSINAPARI_STORIES) {
    assert.ok(ANCESTORS.some(a => a.id === s.ancestor), `${s.id}: ancestor ${s.ancestor}`);
    assert.ok(s.steps.length >= 5 && s.steps.length <= 8, `${s.id}: ${s.steps.length} forks`);
    assert.ok(s.intro && s.outro && s.fact && s.short, s.id);
    for (const [i, st] of s.steps.entries()) {
      const ways = [0, 1, 2].map(c => choiceText(st, c));
      assert.equal(new Set(ways).size, 3, `${s.id} ${i + 1}: three ways`);
      for (const w of ways) assert.ok(w.length > 3 && w.length <= 90, `${s.id} ${i + 1}: „${w}“`);
      for (const a of st.wrong) assert.ok(a.then.length > 20, `${s.id} ${i + 1}: where a what-if leads`);
      assert.ok(st.scene && st.ask && st.real && st.year && st.place, `${s.id} ${i + 1}`);
    }
  }
  assert.equal(tsinapariStory('erkomaishvili')?.ancestor, 13);
});

test('the ways are shuffled the same for a seed and a fork, and every order comes', () => {
  const seen = new Set<string>();
  for (let seed = 1; seed < 400; seed++) {
    const o = choiceOrder(seed, 3);
    assert.deepEqual([...o].sort(), [0, 1, 2]);
    assert.deepEqual(choiceOrder(seed, 3), o);
    seen.add(o.join(''));
  }
  assert.equal(seen.size, 6);
});

test('alone: a pick shows the story, then on to the next fork, to the end', () => {
  let r = newRun(STORY.id, 7);
  assert.equal(isShown(r), false);
  r = pickChoice(r, 0, N);
  assert.equal(isShown(r), true);
  assert.deepEqual(pickChoice(r, 1, N), r, 'one pick a fork');
  r = nextStep(r, N);
  assert.equal(r.step, 1);
  assert.deepEqual(nextStep(r, N), r, 'not before a pick');
  for (let i = 1; i < N; i++) r = nextStep(pickChoice(r, i % 3, N), N);
  assert.equal(isOver(r, N), true);
  assert.equal(r.picks.length, N);
  assert.deepEqual(pickChoice(r, 0, N), r);
  assert.equal(rightCount(r.picks), 1 + Math.floor((N - 1) / 3));
  assert.deepEqual(parseRun(JSON.parse(JSON.stringify(r)), tsinapariStory), r);
});

test('a kept run is read back sane', () => {
  assert.equal(parseRun({ story: 'nobody', step: 0, picks: [] }, tsinapariStory), null);
  assert.deepEqual(parseRun({ story: STORY.id, seed: 5, step: 4, picks: [0, 2] }, tsinapariStory), { story: STORY.id, seed: 5, step: 2, picks: [0, 2] });
  assert.deepEqual(parseRun({ story: STORY.id, seed: 5, step: 0, picks: [1, 9, 2, 0] }, tsinapariStory), { story: STORY.id, seed: 5, step: 0, picks: [1] });
  const all = Array.from({ length: N + 3 }, () => 0);
  assert.deepEqual(parseRun({ story: STORY.id, seed: 1, step: 99, picks: all }, tsinapariStory)?.picks.length, N);
});

test('stars: all but one = three, half = two, else one; a better path is more right ways', () => {
  assert.equal(starsOf(7, 7), 3);
  assert.equal(starsOf(6, 7), 3);
  assert.equal(starsOf(4, 7), 2);
  assert.equal(starsOf(3, 7), 1);
  assert.equal(starsOf(3, 5), 2);
  assert.equal(starsOf(2, 5), 1);
  assert.equal(starsOf(0, 8), 1);
  assert.equal(betterPath(undefined, { right: 0, total: 5 }), true);
  assert.equal(betterPath({ right: 4, total: 5 }, { right: 4, total: 5 }), false);
  assert.equal(betterPath({ right: 3, total: 5 }, { right: 4, total: 5 }), true);
});

test('the class: teams hold up a letter, the story gives a point to the ancestor’s way, the host may mend a slip', () => {
  let g = newTable(STORY.id, ['ა', 'ბ', 'გ'], 3);
  g = tablePick(g, 0, 0);
  g = tablePick(g, 1, 2);
  g = tablePick(g, 1, 2);
  assert.equal(g.teams[1].pick, -1, 'the same tap takes it back');
  g = tablePick(g, 2, 1);
  assert.deepEqual(tableNext(g, N), g, 'not before the story');
  g = tableReveal(g);
  assert.deepEqual(g.teams.map(t => t.points), [1, 0, 0]);
  assert.deepEqual(g.teams.map(t => t.picks), [[0], [-1], [1]]);
  assert.deepEqual(tableReveal(g), g);
  g = tablePick(g, 2, 0);
  assert.deepEqual(g.teams.map(t => t.points), [1, 0, 1], 'a mended slip');
  g = tablePick(g, 0, 2);
  assert.deepEqual(g.teams.map(t => t.points), [0, 0, 1]);
  assert.deepEqual(tablePlaces(g), [2, 2, 1]);
  g = tableNext(g, N);
  assert.equal(g.step, 1);
  assert.deepEqual(g.teams.map(t => t.pick), [-1, -1, -1]);
  for (let i = 1; i < N; i++) g = tableNext(tableReveal(tablePick(g, 1, 0)), N);
  assert.equal(tableOver(g, N), true);
  assert.equal(g.teams[1].points, N - 1);
  assert.deepEqual(parseTable(JSON.parse(JSON.stringify(g)), tsinapariStory), g);
});

test('a kept class game is read back sane: points from the picks, a story out keeps its pick', () => {
  assert.equal(parseTable({ story: STORY.id, teams: [] }, tsinapariStory), null);
  const g = parseTable({ story: STORY.id, seed: 2, step: 1, shown: true, teams: [{ name: 'წითლები', points: 40, pick: 2, picks: [0, 0, 1] }, { picks: [7] }] }, tsinapariStory);
  assert.ok(g);
  assert.equal(g.teams[0].points, 2);
  assert.deepEqual(g.teams[0].picks, [0, 0]);
  assert.equal(g.teams[0].pick, 0);
  assert.deepEqual(g.teams[1], { name: 'გუნდი 2', points: 0, pick: -1, picks: [-1, -1] });
});
