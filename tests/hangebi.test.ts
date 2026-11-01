import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EAR_SECONDS, HANGEBI_MARKS, HANGEBI_REGION_COUNT, HANGEBI_RULES, HANGEBI_WORDS, WORD_SECONDS, cluesOf, drawHangebi,
  hangebiPoints, hangebiPuzzleOf, hangebiSeconds, lettersOf, shapeOf, stemOf, tilesOf, wordIndex, type HangebiPuzzle, type HangebiQ,
} from '../src/utils/hangebi';
import { hangebiWordPuzzles } from '../src/data/hangebiWords';
import { KUTKHE_REGIONS } from '../src/utils/kutkhe';
import {
  answerRound, hybridScores, markTeam, newHybrid, newRounds, parseRoundsState, publicView, roundKey,
} from '../src/utils/roundGames';
import { mulberry32 } from '../src/utils/otkheuli';

// „ოთხი ჰანგი, ერთი სიტყვა“ (utils/hangebi.ts): the answers and their shapes, the puzzles by word (the groups of „ოთხეული“
// under the word that names them), the bank of letters, the points by time, a game's rounds (by word: four clues no other
// answer shares; by ear: four songs of a region), and a round in the room and on one phone.

const letters = (w: string) => lettersOf(w).join('');

test('the answers: each once, their letters apart, the regions first in the map\'s order', () => {
  assert.equal(new Set(HANGEBI_WORDS).size, HANGEBI_WORDS.length);
  assert.equal(new Set(HANGEBI_WORDS.map(letters)).size, HANGEBI_WORDS.length);
  assert.equal(HANGEBI_REGION_COUNT, KUTKHE_REGIONS.length);
  assert.equal(HANGEBI_WORDS[KUTKHE_REGIONS.indexOf('racha')], 'რაჭა-ლეჩხუმი');
  assert.equal(HANGEBI_WORDS[KUTKHE_REGIONS.indexOf('kalakuri')], 'ქალაქური');
  assert.equal(shapeOf('რაჭა-ლეჩხუმი'), '____-_______');
  assert.equal(shapeOf('შიდა ქართლი'), '____ ______');
  assert.equal(wordIndex('შიდაქართლი'), HANGEBI_WORDS.indexOf('შიდა ქართლი'));
  assert.equal(wordIndex('მდინარე'), HANGEBI_WORDS.indexOf('მდინარე'));
  assert.equal(wordIndex('მდინარა'), -1);
  assert.equal(stemOf('მდინარე'), 'მდინარ');
  assert.equal(stemOf('ტბა'), 'ტბა');
  assert.deepEqual(cluesOf('ტბა', ['რიწა', 'კუს ტბა', 'ლისი']), ['რიწა', 'ლისი']);
  assert.deepEqual(cluesOf('გურია', ['გურიანთულა', 'ხასანბეგურა', 'ბახმარო'], ['გურ']), ['ბახმარო']);
});

test('the puzzles by word: every answer but three regions has one, four clues or more, none holds its answer', () => {
  const puzzles = hangebiWordPuzzles();
  const answers = new Set(puzzles.map(p => p.answer));
  for (const w of HANGEBI_WORDS.slice(HANGEBI_REGION_COUNT)) assert.ok(answers.has(w), w);
  assert.ok(puzzles.length >= 60);
  assert.equal(new Set(puzzles.map(p => p.id)).size, puzzles.length);
  for (const p of puzzles) {
    assert.ok((HANGEBI_WORDS as readonly string[]).includes(p.answer), p.id);
    assert.ok(p.words!.length >= 4, p.id);
    const stem = stemOf(p.answer);
    for (const c of p.words!) assert.ok(!letters(c).includes(stem) && c.length <= 40, `${p.id}: ${c}`);
  }
  // a region's song titles never name it
  const guria = puzzles.find(p => p.id === 'w:songs-guria')!;
  assert.ok(guria.words!.every(t => !t.includes('გურ')));
});

test('the bank: the answer\'s letters and a few more, twelve at least, twenty-four at most', () => {
  for (const [w, seed] of [['ხე', 1], ['მდინარე', 2], ['წინასწარმეტყველი', 3], ['სამცხე-ჯავახეთი', 4]] as const) {
    const t = tilesOf(w, mulberry32(seed));
    const own = lettersOf(w);
    assert.equal([...t].length, Math.min(24, Math.max(12, own.length + 4)), w);
    const bank = [...t];
    for (const ch of own) { const i = bank.indexOf(ch); assert.ok(i >= 0, `${w}: ${ch}`); bank.splice(i, 1); }
    assert.ok([...t].every(ch => /\p{L}/u.test(ch)));
  }
});

test('points: the right word 1000 at once, 500 at the last moment; the time by level', () => {
  const lim = 40_000;
  assert.equal(hangebiPoints({ answer: 5 }, { pick: 5, ms: 0 }, lim), 1000);
  assert.equal(hangebiPoints({ answer: 5 }, { pick: 5, ms: lim / 2 }, lim), 750);
  assert.equal(hangebiPoints({ answer: 5 }, { pick: 5, ms: lim }, lim), 500);
  assert.equal(hangebiPoints({ answer: 5 }, { pick: 6, ms: 0 }, lim), 0);
  assert.equal(hangebiSeconds({ level: 'word' }), WORD_SECONDS);
  assert.equal(hangebiSeconds({ level: 'ear' }), EAR_SECONDS);
  assert.deepEqual(HANGEBI_MARKS.map(m => m.points), [1, 0]);
});

const WORDS = hangebiWordPuzzles();

test('a game\'s rounds by word: a different answer each, four of its clues, none that another answer\'s group holds three of', () => {
  for (let seed = 1; seed < 15; seed++) {
    const rounds = drawHangebi({ puzzles: WORDS, count: 10, rnd: mulberry32(seed) });
    assert.equal(rounds.length, 10);
    assert.equal(new Set(rounds.map(r => r.answer)).size, 10);
    for (const r of rounds) {
      assert.ok(HANGEBI_RULES.valid(r), JSON.stringify(r));
      assert.equal(r.level, 'word');
      const p = WORDS.find(x => x.id === hangebiPuzzleOf(r))!;
      assert.equal(HANGEBI_WORDS[r.answer], p.answer);
      assert.equal(r.shape, shapeOf(p.answer));
      assert.equal(new Set(r.clues).size, 4);
      assert.ok(r.clues!.every(c => p.words!.includes(c)));
      for (const o of WORDS) if (o.answer !== p.answer) assert.ok(r.clues!.filter(c => o.words!.includes(c)).length < 3, `${r.id} ~ ${o.id}`);
    }
  }
  // the puzzles asked lately come last, the oldest of them first
  const seen = WORDS.slice(0, WORDS.length - 2).map(p => p.id);
  const fresh = drawHangebi({ puzzles: WORDS, count: 3, seen, rnd: mulberry32(5) }).map(hangebiPuzzleOf);
  assert.deepEqual(fresh.slice(0, 2).sort(), WORDS.slice(-2).map(p => p.id).sort());
  assert.deepEqual(drawHangebi({ puzzles: [], count: 5 }), []);
});

const EAR: HangebiPuzzle[] = [0, 1, 4, 5, 11].map(region => ({
  id: `e:${region}`, level: 'ear', answer: HANGEBI_WORDS[region],
  songs: Array.from({ length: 6 }, (_, i) => ({ title: `სიმღერა ${region}-${i}`, takes: [{ url: `https://x/${region}/${i}` }] })),
}));

test('by ear: four songs of the region, a piece of each from a tenth to two thirds in; both levels in turn', () => {
  const rounds = drawHangebi({ puzzles: EAR, count: 5, levels: ['ear'], rnd: mulberry32(7) });
  assert.equal(rounds.length, 5);
  for (const r of rounds) {
    assert.ok(HANGEBI_RULES.valid(r), JSON.stringify(r));
    const region = Number(hangebiPuzzleOf(r).slice(2));
    assert.equal(r.answer, region);
    assert.equal(r.clips!.length, 4);
    assert.equal(new Set(r.clips!.map(c => c.url)).size, 4);
    assert.ok(r.clips!.every(c => c.url.startsWith(`https://x/${region}/`) && c.from >= 0.1 && c.from <= 0.66));
    assert.deepEqual(r.names, r.clips!.map(c => `სიმღერა ${region}-${c.url.split('/').pop()}`));
  }
  const both = drawHangebi({ puzzles: [...WORDS, ...EAR], count: 8, rnd: mulberry32(3) });
  assert.equal(both.filter(r => r.level === 'ear').length, 4);
  assert.equal(new Set(both.map(r => r.answer)).size, 8);
  // one level only, when asked
  assert.ok(drawHangebi({ puzzles: [...WORDS, ...EAR], count: 6, levels: ['word'], rnd: mulberry32(4) }).every(r => r.level === 'word'));
  // a region without four songs heard gives none
  const thin = [{ ...EAR[0], songs: EAR[0].songs!.slice(0, 3) }];
  assert.deepEqual(drawHangebi({ puzzles: thin, count: 2 }), []);
});

test('a round read back: wrong shapes are refused', () => {
  const r = drawHangebi({ puzzles: WORDS, count: 1, rnd: mulberry32(2) })[0];
  const e = drawHangebi({ puzzles: EAR, count: 1, rnd: mulberry32(2) })[0];
  assert.ok(HANGEBI_RULES.valid(JSON.parse(JSON.stringify(r))) && HANGEBI_RULES.valid(JSON.parse(JSON.stringify(e))));
  const other = (r.answer + 1) % HANGEBI_WORDS.length;
  const broken: unknown[] = [
    { ...r, kind: 'otkhi' }, { ...r, answer: HANGEBI_WORDS.length }, { ...r, answer: other }, { ...r, shape: '__' },
    { ...r, tiles: r.tiles.slice(0, 3) }, { ...r, tiles: 'ა'.repeat(25) }, { ...r, tiles: `${r.tiles.slice(1)}1` },
    { ...r, clues: r.clues!.slice(0, 3) }, { ...r, clips: e.clips }, { ...r, level: 'ear' },
    { ...e, clips: e.clips!.slice(0, 3) }, { ...e, clips: e.clips!.map(c => ({ ...c, from: 1 })) }, { ...e, names: ['ა'] }, null,
  ];
  for (const b of broken) assert.ok(!HANGEBI_RULES.valid(b), JSON.stringify(b));
  assert.ok(HANGEBI_RULES.ok(r, 0) && HANGEBI_RULES.ok(r, HANGEBI_WORDS.length - 1) && !HANGEBI_RULES.ok(r, HANGEBI_WORDS.length) && !HANGEBI_RULES.ok(r, -1));
});

test('a round in the room: the word and the songs\' names stay hidden; on one phone the host marks each team', () => {
  const rounds = [...drawHangebi({ puzzles: WORDS, count: 1, rnd: mulberry32(6) }), ...drawHangebi({ puzzles: EAR, count: 1, rnd: mulberry32(6) })];
  const players = ['ა', 'ბ'].map((name, i) => ({ uid: `u${i}`, name }));
  let s = newRounds(players, { game: 'hangebi', rounds, sound: 'all', now: 1000 })!;
  const q = publicView(s).q as Partial<HangebiQ>;
  assert.equal(q.answer, undefined);
  assert.deepEqual(q.clues, rounds[0].clues);
  assert.equal(q.shape, rounds[0].shape);
  assert.equal(publicView(s).secs, WORD_SECONDS);
  s = answerRound(s, 0, { key: roundKey(s), pick: rounds[0].answer, ms: 0 });
  s = answerRound(s, 1, { key: roundKey(s), pick: (rounds[0].answer + 1) % HANGEBI_WORDS.length, ms: 0 });
  assert.equal(s.phase, 'reveal');
  assert.deepEqual(s.gained, [1000, 0]);
  assert.equal((publicView(s).q as Partial<HangebiQ>).answer, rounds[0].answer);
  assert.deepEqual(parseRoundsState(JSON.stringify(s)), s);

  let h = newHybrid('hangebi', ['ა', 'ბ'], rounds)!;
  h = markTeam(markTeam(h, 0, 1), 1, 0);
  assert.deepEqual(hybridScores(h), [1, 0]);
});
