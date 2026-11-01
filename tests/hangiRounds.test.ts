import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HANGI_MARKS, HANGI_RULES, HANGI_STEPS, drawHangiRounds, hangiPiece, hangiPoints, hangiSeconds, type HangiQ, type HangiTake,
} from '../src/utils/hangiRounds';
import { SNIPPETS } from '../src/utils/hangi';
import { nameKey } from '../src/utils/chantRounds';
import {
  answerRound, hybridNext, hybridScores, hybridStep, markTeam, newHybrid, newRounds, nextStep, parseHybrid, parseRoundsState, publicView,
  roundKey,
} from '../src/utils/roundGames';
import { mulberry32 } from '../src/utils/otkheuli';

// „დღის ჰანგი“ with the class (utils/hangiRounds.ts): the daily game's ladder as six steps of a round, the points by step
// and time, the rounds drawn from the recordings, and a round in the room and on one phone.

const W = 'https://sagandzuri-audio.mr-gabunia.workers.dev/';
const chant = (id: string, title: string, service: string): HangiTake => ({ id, title, sub: `${service} · გელათური`, url: W + id, kind: 'chant' });
const song = (id: string, title: string, region: string): HangiTake => ({ id, title, sub: `ხალხური სიმღერა · ${region}`, url: W + id, kind: 'song' });
const POOL: HangiTake[] = [
  chant('v1', 'წმიდაო ღმერთო', 'წირვა'), chant('v2', 'წმიდაო ღმერთო', 'წირვა'), chant('v3', 'მამაო ჩუენო', 'წირვა'),
  chant('v4', 'რომელი ქერუბიმთა', 'წირვა'), chant('v5', 'მხოლოდ-შობილი', 'წირვა'), chant('v6', 'ნათელო მხიარულო', 'მწუხრი'),
  song('s1', 'ჩაკრულო', 'კახეთი'), song('s2', 'მრავალჟამიერი', 'კახეთი'), song('s3', 'ურმული', 'კახეთი'),
  song('s4', 'ხასანბეგურა', 'გურია'), song('s5', 'ლილე', 'სვანეთი'),
];

test('the ladder: the daily game\'s seconds, the earlier the step the more a right answer earns', () => {
  assert.equal(HANGI_STEPS, 6);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(hangiPiece), [...SNIPPETS]);
  assert.equal(hangiSeconds(1), 9);
  assert.equal(hangiSeconds(6), 24);
  assert.equal(hangiPiece(9), 16);
  const lim = 10_000;
  assert.equal(hangiPoints({ right: 2 }, { pick: 2, ms: 0, step: 1 }, lim), 1000);
  assert.equal(hangiPoints({ right: 2 }, { pick: 2, ms: lim, step: 1 }, lim), 800);
  assert.equal(hangiPoints({ right: 2 }, { pick: 2, ms: 0, step: 4 }, lim), 550);
  assert.equal(hangiPoints({ right: 2 }, { pick: 2, ms: lim * 3, step: 6 }, lim), 200);
  assert.equal(hangiPoints({ right: 2 }, { pick: 1, ms: 0, step: 1 }, lim), 0);
  // the host's marks on one phone: 6 for a second … 1 for sixteen, then none
  assert.deepEqual(HANGI_MARKS.map(m => m.points), [6, 5, 4, 3, 2, 1, 0]);
  assert.equal(HANGI_MARKS[0].label, '1 წმ');
});

test('a game\'s rounds: every name once, four names of the same kind, the same service or region first', () => {
  for (let seed = 1; seed < 30; seed++) {
    const rounds = drawHangiRounds(POOL, 20, [], 'all', mulberry32(seed));
    // the two „წმიდაო ღმერთო“ are one name: ten names
    assert.equal(rounds.length, 10);
    assert.equal(new Set(rounds.map(r => nameKey(r.options[r.right]))).size, 10);
    for (const r of rounds) {
      const t = POOL.find(x => x.id === r.id)!;
      assert.equal(r.options[r.right], t.title);
      assert.equal(r.url, t.url);
      assert.equal(r.sub, t.sub);
      assert.equal(r.song, t.kind === 'song');
      assert.equal(new Set(r.options.map(nameKey)).size, 4);
      const kind = new Set(POOL.filter(x => x.kind === t.kind).map(x => nameKey(x.title)));
      assert.ok(r.options.every(o => kind.has(nameKey(o))), r.options.join(' / '));
      // the Liturgy has four other names, Kakheti only two: a Liturgy chant's wrong names are the Liturgy's
      if (t.sub.startsWith('წირვა')) {
        const liturgy = new Set(POOL.filter(x => x.sub.startsWith('წირვა')).map(x => nameKey(x.title)));
        assert.ok(r.options.every(o => liturgy.has(nameKey(o))), r.options.join(' / '));
      }
      assert.ok(HANGI_RULES.valid(r));
    }
  }
  // only songs; the ones asked lately come last; three names are no round
  const songs = drawHangiRounds(POOL, 9, [], 'song', mulberry32(2));
  assert.equal(songs.length, 5);
  assert.ok(songs.every(r => r.song));
  const later = drawHangiRounds(POOL, 1, POOL.filter(t => t.id !== 's5').map(t => t.id), 'all', mulberry32(3));
  assert.equal(later[0].id, 's5');
  assert.deepEqual(drawHangiRounds(POOL.slice(6, 9), 5), []);
});

test('a round read back: only a whole one of its own game', () => {
  const r = drawHangiRounds(POOL, 1, [], 'all', mulberry32(1))[0];
  const broken: unknown[] = [
    { ...r, kind: 'khmebi' }, { ...r, right: 4 }, { ...r, options: ['ერთი'], right: 0 }, { ...r, url: 'http://x.ge/a' }, { ...r, url: '' },
    { ...r, song: 'yes' }, { ...r, sub: 'x'.repeat(201) }, { ...r, id: '' }, null, 'text',
  ];
  for (const b of broken) assert.ok(!HANGI_RULES.valid(b), JSON.stringify(b));
});

test('a round of six steps in the room: the name stays hidden, the earlier right answer earns more', () => {
  const rounds = drawHangiRounds(POOL, 2, [], 'all', mulberry32(4));
  const players = ['ა', 'ბ', 'გ'].map((name, i) => ({ uid: `u${i}`, name }));
  let s = newRounds(players, { game: 'hangi', rounds, sound: 'all', now: 1000 })!;
  const q = publicView(s).q as Partial<HangiQ>;
  assert.equal(q.right, undefined);
  assert.equal(q.id, undefined);
  assert.equal(q.sub, undefined);
  assert.equal(q.song, undefined);
  assert.equal(q.url, rounds[0].url);
  assert.equal(publicView(s).steps, 6);
  assert.equal(publicView(s).secs, 9);
  const right = rounds[0].right;
  s = answerRound(s, 0, { key: roundKey(s), pick: right, ms: 0 });
  for (let i = 0; i < 3; i++) s = nextStep(s, 2000 + i);
  assert.equal(s.step, 4);
  assert.equal(publicView(s).secs, 15);
  s = answerRound(s, 1, { key: roundKey(s), pick: right, ms: 0 });
  s = answerRound(s, 2, { key: roundKey(s), pick: (right + 1) % 4, ms: 0 });
  assert.equal(s.phase, 'reveal');
  assert.deepEqual(s.gained, [1000, 550, 0]);
  assert.equal((publicView(s).q as Partial<HangiQ>).sub, rounds[0].sub);
  assert.deepEqual(parseRoundsState(JSON.stringify(s)), s);
});

test('on one phone: six steps, then the answer; the host marks each team by the seconds it wrote', () => {
  const rounds = drawHangiRounds(POOL, 2, [], 'all', mulberry32(5));
  let h = newHybrid('hangi', ['ა', 'ბ'], rounds)!;
  for (let i = 1; i < 6; i++) h = hybridStep(h);
  assert.equal(h.step, 6);
  assert.deepEqual(parseHybrid(JSON.parse(JSON.stringify(h))), h);
  h = hybridStep(h);
  assert.equal(h.phase, 'reveal');
  h = markTeam(markTeam(h, 0, HANGI_MARKS[1].points), 1, 0);
  assert.deepEqual(hybridScores(h), [5, 0]);
  h = hybridNext(h);
  assert.equal(h.at, 1);
  assert.equal(h.step, 1);
});
