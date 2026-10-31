import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHANT_STEPS, KHMEBI_RULES, KHMEBI_SECONDS, NOTEBI_RULES, NOTEBI_SECONDS, chantPoints, drawChantRounds, nameKey, rememberChants,
  type ChantRoundQ, type KnownChant,
} from '../src/utils/chantRounds';
import { cutPitches, lowerVoices, type Timed } from '../src/utils/chantClips';
import { knownChants } from '../src/data/chantGamePool';
import {
  answerRound, hybridNext, hybridStep, newHybrid, newRounds, nextStep, parseHybrid, parseRoundsState, publicView, roundKey,
} from '../src/utils/roundGames';
import { mulberry32 } from '../src/utils/otkheuli';

// „ხმა-ხმად“ and „სამ ნოტში!“ (utils/chantRounds.ts, utils/chantClips.ts): the points by step and time, the rounds drawn from
// the known chants, the pieces each step plays, the chants themselves, and a round of three steps in the room and on one phone.

test('the earlier the step, the more a right answer earns; a fifth less by the step\'s end', () => {
  const lim = 20_000;
  assert.equal(chantPoints({ right: 1 }, { pick: 1, ms: 0, step: 1 }, lim), 1000);
  assert.equal(chantPoints({ right: 1 }, { pick: 1, ms: lim, step: 1 }, lim), 800);
  assert.equal(chantPoints({ right: 1 }, { pick: 1, ms: 0, step: 2 }, lim), 650);
  assert.equal(chantPoints({ right: 1 }, { pick: 1, ms: lim / 2, step: 3 }, lim), 315);
  assert.equal(chantPoints({ right: 1 }, { pick: 1, ms: lim * 2, step: 9 }, lim), 280);
  assert.equal(chantPoints({ right: 1 }, { pick: 0, ms: 0, step: 1 }, lim), 0);
});

const chant = (id: string, title: string, service: string, num = 1): KnownChant => ({ id, title, service, book: 'book', num });
const POOL: KnownChant[] = [
  chant('w1', 'წმიდაო ღმერთო', 'წირვა', 62), chant('w2', 'რომელი ქერუბიმთა', 'წირვა', 64), chant('w3', 'მამაო ჩუენო', 'წირვა', 73),
  chant('w4', 'მხოლოდ-შობილი', 'წირვა', 59), chant('w5', 'წმიდაო ღმერთო', 'წირვა', 63),
  chant('m1', 'მოვედით, თაყუანის-ვსცეთ', 'მწუხრი', 2), chant('w6', 'მოვედით, თაყვანის-ვსცეთ', 'წირვა', 61),
  chant('m2', 'ნათელო მხიარულო', 'მწუხრი', 45),
];

test('a game\'s rounds: every name once, four different names with the right one among them, the same service first', () => {
  for (let seed = 1; seed < 25; seed++) {
    const rounds = drawChantRounds('khmebi', POOL, 10, [], mulberry32(seed));
    // „თაყუანის“ and „თაყვანის“ are one name, so are the two „წმიდაო ღმერთო“: six names
    assert.equal(rounds.length, 6);
    assert.equal(new Set(rounds.map(r => nameKey(r.options[r.right]))).size, 6);
    for (const r of rounds) {
      assert.equal(r.kind, 'khmebi');
      assert.equal(r.options.length, 4);
      assert.equal(new Set(r.options.map(nameKey)).size, 4);
      const c = POOL.find(x => x.id === r.id)!;
      assert.equal(r.options[r.right], c.title);
      assert.equal(r.book, c.book);
      assert.equal(r.num, c.num);
      assert.equal(r.service, c.service);
      assert.ok(KHMEBI_RULES.valid(r));
      assert.ok(!NOTEBI_RULES.valid(r));
      // the Liturgy has five other names: the wrong ones are all of it
      if (c.service === 'წირვა') {
        const liturgy = new Set(POOL.filter(x => x.service === 'წირვა').map(x => nameKey(x.title)));
        assert.ok(r.options.every(o => liturgy.has(nameKey(o))), r.options.join(' / '));
      }
    }
  }
  // the ones asked lately come last; three names are not a round
  const later = drawChantRounds('notebi', POOL, 2, ['w1', 'w5', 'w2', 'w3', 'w4', 'm1', 'w6'], mulberry32(3));
  assert.deepEqual(later.map(r => r.id), ['m2', later[1].id]);
  assert.notEqual(later[1].id, 'm2');
  assert.equal(drawChantRounds('khmebi', POOL.filter(c => c.service === 'მწუხრი').concat(POOL[0]), 5).length, 0);
});

test('the phone remembers the chants asked, the newest last', () => {
  assert.deepEqual(rememberChants(['a', 'b', 'c'], ['b', 'd']), ['a', 'c', 'b', 'd']);
  assert.deepEqual(rememberChants([], ['a', 'b', 'c'], 2), ['b', 'c']);
});

test('a round read back: only a whole one of its own game', () => {
  const r = drawChantRounds('notebi', POOL, 1, [], mulberry32(1))[0];
  assert.ok(NOTEBI_RULES.valid(r));
  const broken: unknown[] = [
    { ...r, kind: 'khmebi' }, { ...r, right: 4 }, { ...r, options: ['ერთი'], right: 0 }, { ...r, num: 0 }, { ...r, book: '' },
    { ...r, id: 'x'.repeat(121) }, { ...r, service: undefined }, null, 'text',
  ];
  for (const b of broken) assert.ok(!NOTEBI_RULES.valid(b), JSON.stringify(b));
  assert.equal(NOTEBI_RULES.steps(r), CHANT_STEPS);
  assert.deepEqual([1, 2, 3].map(s => NOTEBI_RULES.seconds(r, s)), NOTEBI_SECONDS);
  assert.deepEqual([1, 2, 3].map(s => KHMEBI_RULES.seconds({ ...r, kind: 'khmebi' }, s)), [KHMEBI_SECONDS, KHMEBI_SECONDS, KHMEBI_SECONDS]);
});

test('the pieces: the first different notes within their seconds; the lower voices from their first note', () => {
  const notes: Timed[] = [[0, 0.5, 60], [0.5, 0.3, 60], [0.8, 0.5, 62], [1.3, 0.5, 64], [1.8, 0.5, 64], [2.3, 0.5, 65], [8, 1, 67], [9, 1, 60]];
  assert.deepEqual(cutPitches(notes, 3).map(n => n[2]), [60, 60, 62, 64, 64]);
  assert.deepEqual(cutPitches(notes, 6).map(n => n[2]), [60, 60, 62, 64, 64, 65, 67, 60]);
  assert.deepEqual(cutPitches(notes, 6, 7).map(n => n[2]), [60, 60, 62, 64, 64, 65]);
  // a long recitation: at least its first note
  assert.deepEqual(cutPitches([[0, 9, 60], [9, 1, 62]], 3, 7).map(n => n[2]), [60]);
  assert.equal(cutPitches(notes, 0, 0).length, notes.length);
  const voices = { voices: [[[0, 2, 67]], [[1, 2, 64]], [[4, 2, 48], [3, 1, 50]]] as [number, number, number][][] };
  assert.deepEqual(lowerVoices(voices, 2), { first: 2, beat: 3 });
  assert.deepEqual(lowerVoices(voices, 1), { first: 1, beat: 1 });
  assert.deepEqual(lowerVoices(voices, 0), { first: 0, beat: 0 });
  // two voices: the bass is the lower one
  assert.deepEqual(lowerVoices({ voices: voices.voices.slice(0, 2) }, 2), { first: 1, beat: 1 });
});

test('the known chants: the pearls\' nameable ones with book notes, the class\'s program first and whole', () => {
  const all = knownChants();
  assert.ok(new Set(all.map(c => nameKey(c.title))).size >= 30);
  assert.ok(all.every(c => c.num > 0 && c.book && c.title && ['წირვა', 'მწუხრი', 'ცისკარი'].includes(c.service)));
  assert.ok(!all.some(c => nameKey(c.title).includes('კუერექსი') || nameKey(c.title) === 'ამინ'));
  assert.equal(new Set(all.map(c => c.id)).size, all.length);
  // a program's litany is the teacher's choice; an id without book notes, or unknown, is left out
  const withClass = knownChants(['mw-v-4-1', 'nope', 'v-5-x58']);
  assert.equal(withClass[0].id, 'mw-v-4-1');
  assert.equal(withClass[0].title, 'დიდი კუერექსი');
  assert.equal(withClass[1].id, 'v-5-x58');
  assert.equal(withClass.length, all.length + 1);
});

test('a round of three steps in the room: more of the piece each step, the earlier right answer earns more', () => {
  const rounds = drawChantRounds('khmebi', POOL, 2, [], mulberry32(4));
  const players = ['ა', 'ბ', 'გ'].map((name, i) => ({ uid: `u${i}`, name }));
  let s = newRounds(players, { game: 'khmebi', rounds, sound: 'all', now: 1000 })!;
  const v = publicView(s);
  const q = v.q as Partial<ChantRoundQ>;
  assert.equal(q.right, undefined);
  assert.equal(q.id, undefined);
  assert.equal(q.service, undefined);
  assert.equal(q.num, rounds[0].num);
  assert.equal(q.options?.length, 4);
  assert.equal(v.steps, 3);
  const right = rounds[0].right;
  const k1 = roundKey(s);
  s = answerRound(s, 0, { key: k1, pick: right, ms: 2000 });
  s = nextStep(s, 30_000);
  assert.equal(s.step, 2);
  const k2 = roundKey(s);
  assert.notEqual(k1, k2);
  s = answerRound(s, 1, { key: k2, pick: right, ms: 0 });
  s = nextStep(s, 60_000);
  assert.equal(s.step, 3);
  // the last answer reveals it
  s = answerRound(s, 2, { key: roundKey(s), pick: (right + 1) % 4, ms: 0 });
  assert.equal(s.phase, 'reveal');
  assert.deepEqual(s.gained, [980, 650, 0]);
  assert.deepEqual(publicView(s).pickSteps, [1, 2, 3]);
  assert.equal((publicView(s).q as Partial<ChantRoundQ>).right, right);
  assert.deepEqual(parseRoundsState(JSON.stringify(s)), s);
});

test('on one phone: the host moves the steps on, the answer after the last; a kept game comes back on its step', () => {
  const rounds = drawChantRounds('notebi', POOL, 2, [], mulberry32(5));
  let h = newHybrid('notebi', ['ა', 'ბ'], rounds)!;
  assert.equal(h.step, 1);
  h = hybridStep(h);
  assert.equal(h.step, 2);
  assert.deepEqual(parseHybrid(JSON.parse(JSON.stringify(h))), h);
  h = hybridStep(hybridStep(h));
  assert.equal(h.phase, 'reveal');
  h = hybridNext(h);
  assert.equal(h.at, 1);
  assert.equal(h.phase, 'ask');
  assert.equal(h.step, 1);
  // a game kept before steps came back: its first step
  const { step: _step, ...old } = h;
  assert.equal(parseHybrid(JSON.parse(JSON.stringify(old)))!.step, 1);
});
