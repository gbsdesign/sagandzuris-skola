import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GAGRDZELE_MARKS, GAGRDZELE_RULES, HEARD_FROM, alike, cutsOf, drawGagrdzele, gagrdzelePoints, gagrdzeleSeconds, gagrdzeleSongOf,
  type GagrdzeleQ, type LyricSong,
} from '../src/utils/gagrdzele';
import { fullLine, lineKey, lyricLines } from '../src/utils/lyricLines';
import { LYRICS_POOL } from '../src/data/lyricsPool';
import {
  answerRound, hybridScores, markTeam, newHybrid, newRounds, parseRoundsState, publicView, roundKey,
} from '../src/utils/roundGames';
import { mulberry32 } from '../src/utils/otkheuli';

// „გააგრძელე!“ (utils/gagrdzele.ts): a song's text cut into its sung lines, the songs' pool, the points by time, a game's rounds
// (the right line is the one after the lines shown, four lines none alike, a song with its recording asked from the fourth line
// on), and a round in the room and on one phone.

test('a song\'s text: labels, numbers and repeat marks go, a bracketed letter is sung', () => {
  const t = `1 სოლისტი: ჰე მუმლი მუხასა
სოლისტი:
I სოლისტი (2 ხმა)
გუნდი: ოვ დელიე ნანინავდა ო
1. ჩავუხტეთ და ჩავუხტეთ
რომ მტერი დაგიმარცხოსა (ბანი) (2-ჯერ)
ნაინინაო, სქან(ი) თოლების ჭირიმა, და

ცანგალა გოგონა-ა (2)
გულამოსკვნილი ვტიროდი:`;
  assert.deepEqual(lyricLines(t), [
    'ჰე მუმლი მუხასა', 'ოვ დელიე ნანინავდა ო', 'ჩავუხტეთ და ჩავუხტეთ', 'რომ მტერი დაგიმარცხოსა',
    'ნაინინაო, სქანი თოლების ჭირიმა, და', 'ცანგალა გოგონა-ა', 'გულამოსკვნილი ვტიროდი:',
  ]);
  assert.equal(lineKey('ჰე, მუმლი   მუხასა!'), 'ჰე მუმლი მუხასა');
  assert.ok(fullLine('ცანგალა ქალაქს წავიდა') && !fullLine('ჰარალალო') && !fullLine('ო ო ო'));
});

test('the pool: clean lines, and every song can be asked', () => {
  assert.ok(LYRICS_POOL.length >= 60);
  assert.equal(new Set(LYRICS_POOL.map(s => s.id)).size, LYRICS_POOL.length);
  for (const s of LYRICS_POOL) {
    for (const l of s.lines) {
      assert.ok(!/[\d()[\]]/.test(l) && !/^(სოლისტი|გუნდი|მისამღერი)/.test(l) && l.length <= 160 && l === l.trim(), `${s.id}: ${l}`);
    }
    const { cuts, offers } = cutsOf(s.lines);
    assert.ok(cuts.length > 0 && offers.length >= 4, s.id);
  }
});

test('points: the right line 1000 at once, 500 at the last moment; any other nothing', () => {
  const lim = 20_000;
  assert.equal(gagrdzelePoints({ right: 2 }, { pick: 2, ms: 0 }, lim), 1000);
  assert.equal(gagrdzelePoints({ right: 2 }, { pick: 2, ms: lim / 2 }, lim), 750);
  assert.equal(gagrdzelePoints({ right: 2 }, { pick: 2, ms: lim }, lim), 500);
  assert.equal(gagrdzelePoints({ right: 2 }, { pick: 1, ms: 0 }, lim), 0);
  assert.equal(gagrdzeleSeconds({}), 20);
  assert.equal(gagrdzeleSeconds({ url: 'x' }), 32);
  assert.deepEqual(GAGRDZELE_MARKS.map(m => m.points), [2, 1, 0]);
});

const SONGS: LyricSong[] = LYRICS_POOL.map(s => ({ id: s.id, title: `სიმღერა ${s.id}`, where: 'გურია', lines: s.lines }));
const linesOf = new Map(LYRICS_POOL.map(s => [s.id, s.lines]));

test('a game\'s rounds: a different song each, the right line follows the lines shown, four lines none alike', () => {
  for (let seed = 1; seed < 12; seed++) {
    const rounds = drawGagrdzele({ songs: SONGS, count: 10, rnd: mulberry32(seed) });
    assert.equal(rounds.length, 10);
    assert.equal(new Set(rounds.map(gagrdzeleSongOf)).size, 10);
    for (const r of rounds) {
      assert.ok(GAGRDZELE_RULES.valid(r), JSON.stringify(r));
      const lines = linesOf.get(gagrdzeleSongOf(r))!;
      const i = Number(r.id.split('#')[1]);
      assert.equal(r.options[r.right], lines[i]);
      assert.deepEqual(r.lines, lines.slice(Math.max(0, i - 2), i));
      assert.equal(r.after, lines[i + 1]);
      // the line before the gap is sung once, so the next one is sure
      assert.equal(lines.filter(l => lineKey(l) === lineKey(lines[i - 1])).length, 1);
      for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) assert.ok(!alike(r.options[a], r.options[b]), `${r.options[a]} ~ ${r.options[b]}`);
      assert.ok(r.options.every(o => !r.lines.includes(o)));
      assert.equal(r.url, undefined);
    }
  }
  // the songs asked lately come last, the oldest of them first
  const seen = SONGS.slice(0, SONGS.length - 3).map(s => s.id);
  const fresh = drawGagrdzele({ songs: SONGS, count: 4, seen, rnd: mulberry32(3) }).map(gagrdzeleSongOf);
  assert.deepEqual(fresh.slice(0, 3).sort(), SONGS.slice(-3).map(s => s.id).sort());
  assert.equal(fresh[3], seen[0]);
  assert.deepEqual(drawGagrdzele({ songs: [], count: 5 }), []);
});

test('with a recording: its beginning plays first, so the line asked comes from the fourth on', () => {
  const heard = SONGS.map(s => ({ ...s, takes: [{ url: `https://x/${s.id}` }] }));
  const rounds = drawGagrdzele({ songs: heard, count: 30, rnd: mulberry32(8) });
  const withPiece = rounds.filter(r => r.url);
  assert.ok(withPiece.length >= 25);
  for (const r of withPiece) {
    assert.ok(Number(r.id.split('#')[1]) >= HEARD_FROM);
    assert.equal(r.from, 0);
    assert.ok(GAGRDZELE_RULES.valid(r));
  }
});

test('a round read back: wrong shapes are refused', () => {
  const r = drawGagrdzele({ songs: SONGS, count: 1, rnd: mulberry32(2) })[0];
  assert.ok(GAGRDZELE_RULES.valid(JSON.parse(JSON.stringify(r))));
  const broken: unknown[] = [
    { ...r, kind: 'otkhi' }, { ...r, lines: [] }, { ...r, lines: ['a', 'b', 'c'] }, { ...r, options: r.options.slice(0, 3) },
    { ...r, options: [r.options[0], r.options[0], r.options[1], r.options[2]] }, { ...r, right: 4 }, { ...r, from: 0.2 },
    { ...r, url: 'u' }, { ...r, song: '' }, null,
  ];
  for (const b of broken) assert.ok(!GAGRDZELE_RULES.valid(b), JSON.stringify(b));
  assert.ok(GAGRDZELE_RULES.ok(r, 3) && !GAGRDZELE_RULES.ok(r, 4) && !GAGRDZELE_RULES.ok(r, -1));
});

test('a round in the room: the right line stays hidden, the lines and options show; on one phone the host marks each team', () => {
  const rounds = drawGagrdzele({ songs: SONGS, count: 2, rnd: mulberry32(4) });
  const players = ['ა', 'ბ'].map((name, i) => ({ uid: `u${i}`, name }));
  let s = newRounds(players, { game: 'gagrdzele', rounds, sound: 'all', now: 1000 })!;
  const q = publicView(s).q as Partial<GagrdzeleQ>;
  assert.equal(q.right, undefined);
  assert.equal(q.after, undefined);
  assert.deepEqual(q.options, rounds[0].options);
  assert.deepEqual(q.lines, rounds[0].lines);
  assert.equal(publicView(s).secs, 20);
  s = answerRound(s, 0, { key: roundKey(s), pick: rounds[0].right, ms: 0 });
  s = answerRound(s, 1, { key: roundKey(s), pick: (rounds[0].right + 1) % 4, ms: 0 });
  assert.equal(s.phase, 'reveal');
  assert.deepEqual(s.gained, [1000, 0]);
  assert.equal((publicView(s).q as Partial<GagrdzeleQ>).right, rounds[0].right);
  assert.deepEqual(parseRoundsState(JSON.stringify(s)), s);

  let h = newHybrid('gagrdzele', ['ა', 'ბ', 'გ'], rounds)!;
  h = markTeam(markTeam(markTeam(h, 0, 2), 1, 1), 2, 0);
  assert.deepEqual(hybridScores(h), [2, 1, 0]);
});
