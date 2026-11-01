import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AKORDI_MARKS, AKORDI_RULES, BASIC_KINDS, CHORD_KINDS, akordiDemo, akordiNotes, akordiPoints, chordKey, drawAkordiRounds, kindLabel,
  kindOfChord, rememberChords, type AkordiQ, type ChordSample,
} from '../src/utils/akordi';
import { CHORD_POOL } from '../src/data/chordPool';
import {
  answerRound, hybridScores, hybridStep, markTeam, newHybrid, newRounds, nextStep, parseHybrid, parseRoundsState, publicView, roundKey,
} from '../src/utils/roundGames';
import { mulberry32 } from '../src/utils/otkheuli';

// „ქართული აკორდი“ (utils/akordi.ts): the kinds by their exact spacing over the bass, the pool made from the book notes, the
// rounds of a level, the points by step and time, and a round in the room and on one phone.

test('a chord\'s kind is its exact spacing over the bass, the voices in order', () => {
  assert.equal(kindOfChord([62, 57, 50]), 'fifth'); // რე · ლა · რე — 1-5-8
  assert.equal(kindOfChord([57, 57, 57]), 'unison');
  assert.equal(kindOfChord([57, 54, 50]), 'triad'); // major 1-3-5
  assert.equal(kindOfChord([57, 53, 50]), 'triad'); // minor
  assert.equal(kindOfChord([62, 59, 50]), 'sixth'); // 1-6-8, the Gelati school's
  assert.equal(kindOfChord([57, 55, 50]), 'sus'); // 1-4-5
  assert.equal(kindOfChord([60, 57, 50]), 'seventh'); // 1-5-7
  assert.equal(kindOfChord([64, 57, 50]), 'ninth'); // 1-5-9
  assert.equal(kindOfChord([57, 52, 50]), 'second'); // 1-2-5
  assert.equal(kindOfChord([62, 64, 50]), null); // the middle voice over the top
  assert.equal(kindOfChord([69, 57, 50]), null); // 1-5-12: not a kind of the game
  assert.equal(kindLabel(CHORD_KINDS[1]), '1-5-8 · კვინტა და ოქტავა');
  assert.ok(BASIC_KINDS.every(id => CHORD_KINDS.some(k => k.id === id)));
});

test('the pool: every chord is of its own kind, every kind has chords enough', () => {
  for (const s of CHORD_POOL) assert.equal(kindOfChord([s[1], s[2], s[3]]), s[0], JSON.stringify(s));
  for (const k of CHORD_KINDS) assert.ok(CHORD_POOL.filter(s => s[0] === k.id).length >= 10, k.id);
  assert.ok(CHORD_POOL.some(s => s[5].startsWith('ხალხური სიმღერა')));
  assert.equal(new Set(CHORD_POOL.map(s => `${s[0]}|${s[4]}|${s[5]}`)).size, CHORD_POOL.length);
});

test('what sounds: the chord at once, then voice by voice from the bass up', () => {
  assert.deepEqual(akordiNotes([62, 57, 50], 1).map(n => n[2]), [62, 57, 50]);
  assert.ok(akordiNotes([62, 57, 50], 1).every(n => n[0] === 0));
  const up = akordiNotes([62, 57, 50], 2);
  assert.deepEqual(up.map(n => n[2]), [50, 57, 62]);
  assert.ok(up[0][0] < up[1][0] && up[1][0] < up[2][0]);
  // they end together
  assert.equal(new Set(up.map(([at, len]) => Math.round((at + len) * 10))).size, 1);
  assert.equal(akordiDemo([62, 57, 50]).length, 6);
});

test('points: the step at once earns more than voice by voice; a fifth less by the step\'s end', () => {
  const lim = 12_000;
  assert.equal(akordiPoints({ right: 1 }, { pick: 1, ms: 0, step: 1 }, lim), 1000);
  assert.equal(akordiPoints({ right: 1 }, { pick: 1, ms: lim, step: 1 }, lim), 800);
  assert.equal(akordiPoints({ right: 1 }, { pick: 1, ms: 0, step: 2 }, lim), 500);
  assert.equal(akordiPoints({ right: 1 }, { pick: 0, ms: 0, step: 1 }, lim), 0);
  assert.deepEqual(AKORDI_MARKS.map(m => m.points), [2, 1, 0]);
});

const POOL: ChordSample[] = [
  ['unison', 57, 57, 57, 'ა', 'I ტომი · №1'], ['unison', 60, 60, 60, 'ბ', 'I ტომი · №2'],
  ['fifth', 62, 57, 50, 'გ', 'I ტომი · №3'], ['fifth', 64, 59, 52, 'დ', 'I ტომი · №4'],
  ['triad', 57, 54, 50, 'ე', 'I ტომი · №5'], ['triad', 57, 53, 50, 'ვ', 'I ტომი · №6'],
  ['seventh', 60, 57, 50, 'ზ', 'I ტომი · №7'], ['seventh', 62, 59, 52, 'თ', 'I ტომი · №8'],
  ['sus', 57, 55, 50, 'ი', 'I ტომი · №9'], ['sixth', 62, 59, 50, 'კ', 'I ტომი · №10'],
];

test('the first level: always the same four answers in their order, the kinds in turn, never one twice running', () => {
  const rounds = drawAkordiRounds(POOL, 12, 'basic', [], mulberry32(3));
  assert.equal(rounds.length, 12);
  const labels = BASIC_KINDS.map(id => kindLabel(CHORD_KINDS.find(k => k.id === id)!));
  for (const r of rounds) {
    assert.deepEqual(r.options, labels);
    assert.equal(r.options[r.right], kindLabel(CHORD_KINDS.find(k => k.id === kindOfChord(r.notes))!));
    assert.ok(AKORDI_RULES.valid(r));
  }
  for (let i = 1; i < rounds.length; i++) assert.notEqual(kindOfChord(rounds[i].notes), kindOfChord(rounds[i - 1].notes));
  // each kind three times in twelve
  const count = new Map<string, number>();
  rounds.forEach(r => count.set(kindOfChord(r.notes)!, (count.get(kindOfChord(r.notes)!) ?? 0) + 1));
  assert.deepEqual([...count.values()], [3, 3, 3, 3]);
});

test('all kinds: four answers a round, the right one among them, in the kinds\' order; chords not asked lately first', () => {
  const rounds = drawAkordiRounds(POOL, 6, 'all', [], mulberry32(8));
  const order = CHORD_KINDS.map(kindLabel);
  for (const r of rounds) {
    assert.equal(r.options.length, 4);
    assert.deepEqual([...r.options].sort((a, b) => order.indexOf(a) - order.indexOf(b)), r.options);
    assert.equal(r.options[r.right], kindLabel(CHORD_KINDS.find(k => k.id === kindOfChord(r.notes))!));
  }
  // seen: of a kind with two chords the other one comes
  const seen = [chordKey('unison', [57, 57, 57])];
  for (let seed = 1; seed < 8; seed++) {
    const r = drawAkordiRounds(POOL, 6, 'basic', seen, mulberry32(seed)).find(x => kindOfChord(x.notes) === 'unison')!;
    assert.deepEqual(r.notes, [60, 60, 60]);
  }
  assert.deepEqual(rememberChords(['a', 'b'], ['b', 'c'], 2), ['b', 'c']);
  // a level that has fewer than four kinds in the pool plays nothing
  assert.deepEqual(drawAkordiRounds(POOL.slice(0, 4), 5, 'basic'), []);
});

test('a round read back: wrong shapes are refused', () => {
  const r = drawAkordiRounds(POOL, 1, 'basic', [], mulberry32(2))[0];
  assert.ok(AKORDI_RULES.valid(JSON.parse(JSON.stringify(r))));
  const broken: unknown[] = [
    { ...r, kind: 'otkhi' }, { ...r, notes: [60, 57] }, { ...r, notes: [60, 57, 'x'] }, { ...r, notes: [200, 57, 50] },
    { ...r, options: [] }, { ...r, right: 4 }, { ...r, title: '' }, { ...r, ref: 'x'.repeat(121) }, null,
  ];
  for (const b of broken) assert.ok(!AKORDI_RULES.valid(b), JSON.stringify(b));
});

test('a round in the room: the kind stays hidden, the notes sound; on one phone the host marks each team', () => {
  const rounds = drawAkordiRounds(POOL, 2, 'basic', [], mulberry32(4));
  const players = ['ა', 'ბ'].map((name, i) => ({ uid: `u${i}`, name }));
  let s = newRounds(players, { game: 'akordi', rounds, sound: 'all', now: 1000 })!;
  const q = publicView(s).q as Partial<AkordiQ>;
  assert.equal(q.right, undefined);
  assert.equal(q.title, undefined);
  assert.deepEqual(q.notes, rounds[0].notes);
  assert.equal(publicView(s).steps, 2);
  const right = rounds[0].right;
  s = answerRound(s, 0, { key: roundKey(s), pick: right, ms: 0 });
  s = nextStep(s, 2000);
  s = answerRound(s, 1, { key: roundKey(s), pick: right, ms: 0 });
  assert.equal(s.phase, 'reveal');
  assert.deepEqual(s.gained, [1000, 500]);
  assert.deepEqual(parseRoundsState(JSON.stringify(s)), s);

  let h = newHybrid('akordi', ['ა', 'ბ'], rounds)!;
  h = hybridStep(h);
  assert.equal(h.step, 2);
  assert.deepEqual(parseHybrid(JSON.parse(JSON.stringify(h))), h);
  h = hybridStep(h);
  assert.equal(h.phase, 'reveal');
  h = markTeam(markTeam(h, 0, AKORDI_MARKS[0].points), 1, AKORDI_MARKS[1].points);
  assert.deepEqual(hybridScores(h), [2, 1]);
});
