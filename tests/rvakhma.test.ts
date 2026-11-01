import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  RVAKHMA_MARKS, RVAKHMA_RULES, TONE_LETTERS, drawRvakhmaRounds, modelOf, rememberHeirmoi, rvakhmaPiece, rvakhmaPoints, toneName,
  type RvakhmaQ,
} from '../src/utils/rvakhma';
import { HEIRMOI } from '../src/data/rvakhmaPool';
import {
  answerRound, hybridScores, hybridStep, markTeam, newHybrid, newRounds, nextStep, parseRoundsState, publicView, roundKey,
} from '../src/utils/roundGames';
import { mulberry32 } from '../src/utils/otkheuli';

// „რვა ხმა“ (utils/rvakhma.ts): vol. VIII's heirmoi by tone, the rounds with the tones spread, the points by step and time,
// the tone's model to compare, and a round in the room and on one phone.

test('the pool: the book\'s eight tones in its file order, but a heirmos whose opening another tone shares', () => {
  const shared = [2, 4, 9, 10, 41];
  assert.equal(HEIRMOI.length, 64 - shared.length);
  for (let t = 0; t < 8; t++) {
    const mine = HEIRMOI.filter(h => h.tone === t).map(h => h.num);
    assert.deepEqual(mine, Array.from({ length: 8 }, (_, i) => t * 8 + i + 1).filter(n => !shared.includes(n)), toneName(t));
  }
  assert.ok(HEIRMOI.every(h => h.book === 'v8' && h.name.startsWith('ძლისპირი') && h.words && h.page > 0));
  assert.equal(toneName(0), 'ხმა ა');
  assert.equal(toneName(7), 'ხმა ჱ');
  assert.equal(TONE_LETTERS.length, 8);
});

// the top voice as the synthesizer plays it: in time order, the upper note where it splits
const opening = (num: number, count: number) => {
  const file = path.join(process.cwd(), 'public', 'notes', 'v8', `${String(num).padStart(3, '0')}.json`);
  const top: [number, number, number][] = JSON.parse(fs.readFileSync(file, 'utf8')).voices[0];
  const list = [...top].sort((a, b) => a[0] - b[0] || b[2] - a[2]).filter((n, i, all) => i === 0 || n[0] !== all[i - 1][0]);
  return list.slice(0, count).map(n => n[2]).join(',');
};

test('the book notes: no two heirmoi of different tones begin with the same eight notes', () => {
  for (const a of HEIRMOI) {
    for (const b of HEIRMOI) {
      if (a.tone < b.tone) assert.notEqual(opening(a.num, 8), opening(b.num, 8), `${a.num} ${b.num}`);
    }
  }
  // the ones left out do
  assert.equal(opening(2, 12), opening(9, 12));
  assert.equal(opening(4, 8), opening(41, 8));
});

test('the rounds: eight in a game are the eight tones, twelve never one tone twice running; heirmoi not asked lately first', () => {
  const eight = drawRvakhmaRounds(HEIRMOI, 8, [], mulberry32(1));
  assert.deepEqual(eight.map(r => r.right).sort(), [0, 1, 2, 3, 4, 5, 6, 7]);
  for (let seed = 1; seed < 20; seed++) {
    const twelve = drawRvakhmaRounds(HEIRMOI, 12, [], mulberry32(seed));
    assert.equal(twelve.length, 12);
    for (let i = 1; i < 12; i++) assert.notEqual(twelve[i].right, twelve[i - 1].right);
    assert.equal(new Set(twelve.map(r => r.num)).size, 12);
    for (const r of twelve) {
      assert.equal(Math.floor((r.num - 1) / 8), r.right);
      assert.ok(RVAKHMA_RULES.valid(r));
    }
  }
  // all of tone I but its last asked lately: the last one comes
  const seen = [1, 2, 3, 4, 5, 6, 7];
  for (let seed = 1; seed < 10; seed++) {
    const r = drawRvakhmaRounds(HEIRMOI, 8, seen, mulberry32(seed)).find(x => x.right === 0)!;
    assert.equal(r.num, 8);
  }
  assert.deepEqual(rememberHeirmoi([1, 2], [2, 3], 2), [2, 3]);
  assert.deepEqual(drawRvakhmaRounds(HEIRMOI.filter(h => h.tone < 3), 5), []);
});

test('the model to compare: the tone\'s first heirmos, its second when the round\'s own is the first', () => {
  assert.equal(modelOf(HEIRMOI, 2)?.num, 17);
  assert.equal(modelOf(HEIRMOI, 2, 17)?.num, 18);
  assert.equal(modelOf(HEIRMOI, 2, 20)?.num, 17);
});

test('points and pieces: the first phrase earns more than more of it', () => {
  assert.equal(rvakhmaPiece(1), 12);
  assert.equal(rvakhmaPiece(2), 26);
  const lim = 18_000;
  assert.equal(rvakhmaPoints({ right: 3 }, { pick: 3, ms: 0, step: 1 }, lim), 1000);
  assert.equal(rvakhmaPoints({ right: 3 }, { pick: 3, ms: lim, step: 1 }, lim), 800);
  assert.equal(rvakhmaPoints({ right: 3 }, { pick: 3, ms: 0, step: 2 }, lim), 500);
  assert.equal(rvakhmaPoints({ right: 3 }, { pick: 4, ms: 0, step: 1 }, lim), 0);
  assert.deepEqual(RVAKHMA_MARKS.map(m => m.points), [2, 1, 0]);
});

test('a round read back: wrong shapes are refused', () => {
  const r = drawRvakhmaRounds(HEIRMOI, 1, [], mulberry32(2))[0];
  assert.ok(RVAKHMA_RULES.valid(JSON.parse(JSON.stringify(r))));
  assert.ok(RVAKHMA_RULES.ok(r, 7) && !RVAKHMA_RULES.ok(r, 8) && !RVAKHMA_RULES.ok(r, -1));
  const broken: unknown[] = [
    { ...r, kind: 'akordi' }, { ...r, right: 8 }, { ...r, num: 0 }, { ...r, book: '' }, { ...r, name: '' }, { ...r, page: 1.5 }, null,
  ];
  for (const b of broken) assert.ok(!RVAKHMA_RULES.valid(b), JSON.stringify(b));
});

test('a round in the room: the tone and the words stay hidden, the notes sound; on one phone the host marks each team', () => {
  const rounds = drawRvakhmaRounds(HEIRMOI, 2, [], mulberry32(4));
  const players = ['ა', 'ბ'].map((name, i) => ({ uid: `u${i}`, name }));
  let s = newRounds(players, { game: 'rvakhma', rounds, sound: 'all', now: 1000 })!;
  const q = publicView(s).q as Partial<RvakhmaQ>;
  assert.equal(q.right, undefined);
  assert.equal(q.words, undefined);
  assert.equal(q.num, rounds[0].num);
  assert.equal(publicView(s).secs, 18);
  const right = rounds[0].right;
  s = answerRound(s, 0, { key: roundKey(s), pick: right, ms: 0 });
  s = nextStep(s, 2000);
  assert.equal(publicView(s).secs, 30);
  s = answerRound(s, 1, { key: roundKey(s), pick: (right + 1) % 8, ms: 0 });
  assert.equal(s.phase, 'reveal');
  assert.deepEqual(s.gained, [1000, 0]);
  assert.equal((publicView(s).q as Partial<RvakhmaQ>).words, rounds[0].words);
  assert.deepEqual(parseRoundsState(JSON.stringify(s)), s);

  let h = newHybrid('rvakhma', ['ა', 'ბ'], rounds)!;
  h = hybridStep(h);
  h = hybridStep(h);
  assert.equal(h.phase, 'reveal');
  h = markTeam(markTeam(h, 0, RVAKHMA_MARKS[0].points), 1, RVAKHMA_MARKS[2].points);
  assert.deepEqual(hybridScores(h), [2, 0]);
});
