import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DRAW_POINTS, KLASI, QUIZ_SIZE, WIN_POINTS, addPoint, dropLast, endMatch, keepTeams, kickOff, leftMs, matchRound, matchWinner,
  movePlayer, newMatch, newSeason, newSeek, parseMatch, parseSeason, parseTurns, pauseMatch, placesOfRows, quizDeal, quizStars,
  recordRound, resumeMatch, runMs, scoreOf, seaStop, seekResult, splitTeams, standings, strengthOf, tapHider, teamWins, turnsMove,
  turnsUndo, turnsView, undoPoint, figureOf, SEA_MAX, SEA_MIN, type EzoRound, type EzoSeason,
} from '../src/utils/ezo';
import { EZO_FIGURES, EZO_GAMES, EZO_QUIZ_MORE } from '../src/data/ezoGames';
import { mulberry32 } from '../src/utils/otkheuli';

const round = (id: string, players: string[], winners: string[], draw = false): EzoRound => ({ id, game: 'ordrosha', at: 1, players, winners, ...(draw ? { draw } : {}) });

test('the games: ids unique, every quiz answer unlike its wrong ones', () => {
  assert.equal(new Set(EZO_GAMES.map(g => g.id)).size, EZO_GAMES.length);
  const all = [...EZO_GAMES.flatMap(g => g.quiz), ...EZO_QUIZ_MORE];
  assert.equal(new Set(all.map(q => q.id)).size, all.length);
  for (const q of all) {
    assert.equal(new Set([q.a, ...q.wrong]).size, 4, q.id);
    assert.ok(q.q.length > 10 && q.q.length <= 120, q.id);
  }
  for (const g of EZO_GAMES) {
    assert.ok(g.steps.length >= 3 && g.quiz.length >= 3, g.id);
    assert.ok(g.players[0] >= 2 && g.players[0] < g.players[1], g.id);
    if (g.kind === 'teams') assert.ok(g.point && g.minutes.length, g.id);
  }
  assert.ok(new Set(EZO_FIGURES).size === EZO_FIGURES.length && EZO_FIGURES.length >= 12);
});

test('the season: a win 3, a draw 1, the order by points then wins then fewer games', () => {
  let s = newSeason(0);
  s = recordRound(s, round('1', ['ა', 'ბ', 'გ', 'დ'], ['ა', 'ბ']));
  s = recordRound(s, round('2', ['ა', 'ბ', 'გ', 'დ'], [], true));
  s = recordRound(s, round('3', ['გ', 'ე'], ['გ']));
  const st = standings(s);
  const by = Object.fromEntries(st.map(x => [x.name, x]));
  assert.deepEqual(by['ა'], { name: 'ა', played: 2, wins: 1, draws: 1, points: WIN_POINTS + DRAW_POINTS });
  assert.equal(by['გ'].points, WIN_POINTS + DRAW_POINTS);
  assert.equal(by['გ'].played, 3);
  assert.equal(by['ე'].points, 0);
  // ა and ბ (4 points, two games) before გ (4 points, three games)
  assert.deepEqual(st.slice(0, 3).map(x => x.name), ['ა', 'ბ', 'გ']);
  assert.deepEqual(placesOfRows(st).slice(0, 4), [1, 1, 1, 4]);
  assert.equal(standings(dropLast(s)).find(x => x.name === 'გ')!.points, DRAW_POINTS);
});

test('strength: unknown ½, a winner above, a loser below', () => {
  assert.equal(strengthOf(undefined), 0.5);
  assert.ok(strengthOf({ name: 'x', played: 4, wins: 4, draws: 0, points: 12 }) > 0.5);
  assert.ok(strengthOf({ name: 'x', played: 4, wins: 0, draws: 0, points: 0 }) < 0.5);
});

test('the split: everybody once, sizes within one, the strong spread, the same seed the same teams', () => {
  const names = Array.from({ length: 13 }, (_, i) => `მოთამაშე ${i + 1}`);
  let s: EzoSeason = newSeason(0);
  // four strong ones who always win
  const strong = names.slice(0, 4);
  for (let r = 0; r < 5; r++) s = recordRound(s, round(`r${r}`, names, strong));
  const [a, b] = splitTeams(names, s, 7);
  assert.deepEqual([...a, ...b].sort(), [...names].sort());
  assert.ok(Math.abs(a.length - b.length) <= 1);
  assert.equal(a.filter(n => strong.includes(n)).length, 2);
  assert.equal(b.filter(n => strong.includes(n)).length, 2);
  assert.equal(teamWins(a, s), teamWins(b, s));
  assert.deepEqual(splitTeams(names, s, 7), [a, b]);
  // another seed — another split of the same balance
  const other = Array.from({ length: 8 }, (_, i) => splitTeams(names, s, 100 + i).map(t => t.join()).join('|'));
  assert.ok(new Set(other).size > 1);
});

test('moving and keeping names', () => {
  const t: [string[], string[]] = [['ა', 'ბ'], ['გ']];
  assert.deepEqual(movePlayer(t, 'ა'), [['ბ'], ['გ', 'ა']]);
  assert.deepEqual(movePlayer(t, 'გ'), [['ა', 'ბ', 'გ'], []]);
  assert.deepEqual(movePlayer(t, 'ზ'), t);
  assert.deepEqual(keepTeams(t, ['ბ', 'გ', 'დ', 'ე']), [['ბ', 'დ'], ['გ', 'ე']]);
});

test('a match: the clock runs only while kicked off and not paused; points, undo, the winner', () => {
  let m = newMatch('ordrosha', [['ა', 'ბ'], ['გ', 'დ']], 10);
  assert.equal(leftMs(m, 5000), 600_000);
  assert.equal(addPoint(m, 0, 10).points.length, 0, 'no point before the start');
  m = kickOff(m, 1000);
  assert.equal(runMs(m, 61_000), 60_000);
  m = addPoint(m, 0, 61_000);
  m = pauseMatch(m, 121_000);
  assert.equal(runMs(m, 999_999), 120_000);
  m = resumeMatch(m, 200_000);
  m = addPoint(m, 1, 230_000);
  m = addPoint(m, 1, 240_000);
  assert.deepEqual(scoreOf(m), [1, 2]);
  assert.equal(m.points[1].at, 150_000);
  assert.equal(matchWinner(m), 1);
  assert.equal(matchWinner(undoPoint(m)), null);
  assert.equal(leftMs(m, 10_000_000), 0);
  m = endMatch(m, 300_000);
  assert.equal(addPoint(m, 0, 300_001).points.length, 3, 'no point after the end');
  const r = matchRound(m, 1, 'x');
  assert.deepEqual(r.winners, ['გ', 'დ']);
  assert.deepEqual(r.score, [1, 2]);
  assert.equal(r.draw, false);
  const draw = matchRound(undoPoint(m), 1, 'y');
  assert.equal(draw.draw, true);
  assert.deepEqual(draw.winners, []);
  assert.deepEqual(parseMatch(JSON.parse(JSON.stringify(m))), m);
  assert.equal(parseMatch({ game: 'nope' }), null);
});

test('hopscotch: a pass goes on, a miss passes the turn, the tenth class wins, undo', () => {
  let t = { players: ['ა', 'ბ', 'გ'], moves: [] as ('ok' | 'miss')[] };
  t = turnsMove(t, 'ok');
  t = turnsMove(t, 'ok');
  t = turnsMove(t, 'miss');
  let v = turnsView(t);
  assert.deepEqual(v.level, [2, 0, 0]);
  assert.equal(v.turn, 1);
  t = turnsMove(t, 'miss');
  t = turnsMove(t, 'miss');
  assert.equal(turnsView(t).turn, 0, 'round the circle');
  for (let i = 0; i < KLASI; i++) t = turnsMove(t, 'ok');
  v = turnsView(t);
  assert.equal(v.winner, 0);
  assert.equal(turnsMove(t, 'ok'), t, 'nothing after the winner');
  assert.equal(turnsView(turnsUndo(t)).winner, null);
  assert.deepEqual(parseTurns(JSON.parse(JSON.stringify(t))), t);
  assert.equal(parseTurns({ players: [] }), null);
});

test('hide and seek: tap cycles, the not found win, the first found seeks next', () => {
  let s = newSeek('ა', ['ა', 'ბ', 'გ', 'დ']);
  assert.deepEqual(s.hiders, ['ბ', 'გ', 'დ']);
  s = tapHider(s, 'გ');
  s = tapHider(s, 'ბ');
  assert.deepEqual(s.found, ['გ', 'ბ']);
  s = tapHider(s, 'ბ');
  assert.equal(s.marks['ბ'], 'safe');
  assert.deepEqual(s.found, ['გ']);
  assert.deepEqual(seekResult(s), { winners: ['ბ', 'დ'], nextSeeker: 'გ' });
  assert.deepEqual(seekResult(newSeek('ა', ['ა', 'ბ'])), { winners: ['ბ'], nextSeeker: 'ა' });
  assert.equal(tapHider(s, 'ა'), s, 'the seeker is no hider');
});

test('the sea stops between 6 and 18 seconds, never the same theme twice running', () => {
  const rnd = mulberry32(3);
  let last: string | null = null;
  for (let i = 0; i < 200; i++) {
    const at = seaStop(rnd);
    assert.ok(at >= SEA_MIN && at <= SEA_MAX);
    const f = figureOf(rnd, last);
    assert.notEqual(f, last);
    last = f;
  }
});

test('the quiz: ten, every game once at least, the right answer where it says', () => {
  for (let seed = 1; seed < 40; seed++) {
    const d = quizDeal(seed);
    assert.equal(d.length, QUIZ_SIZE);
    assert.equal(new Set(d.map(q => q.id)).size, QUIZ_SIZE);
    for (const g of EZO_GAMES) assert.ok(d.some(q => q.game === g.id), `${seed} ${g.id}`);
    for (const q of d) {
      const src = [...EZO_GAMES.flatMap(g => g.quiz), ...EZO_QUIZ_MORE].find(x => x.id === q.id)!;
      assert.equal(q.options[q.right], src.a);
      assert.equal(q.options.length, 4);
    }
  }
  assert.deepEqual(quizDeal(5), quizDeal(5));
  assert.deepEqual([10, 9, 8, 7, 6, 5].map(r => quizStars(r, 10)), [3, 2, 2, 1, 1, 0]);
});

test('the season read back: bad lines dropped, a broken store a new season', () => {
  const s = recordRound(newSeason(5), { ...round('1', ['ა'], ['ა']), teams: [['ა'], ['ბ']], score: [2, 1] });
  assert.deepEqual(parseSeason(JSON.parse(JSON.stringify(s)), 9), s);
  assert.deepEqual(parseSeason(null, 9), newSeason(9));
  const bad = parseSeason({ start: 1, log: [{ id: 'x', game: 'chess', at: 1 }, { id: 'y', game: 'lelo', at: 2, players: ['ა', 3], winners: [] }] }, 9);
  assert.equal(bad.log.length, 1);
  assert.deepEqual(bad.log[0].players, ['ა']);
});
